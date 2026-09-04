import { useState } from "react";
import { Sparkles, Sun, Moon, ChevronDown, Loader2 } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import {
  EDUCATION_LEVELS,
  GRADES_BY_LEVEL,
  FIELDS_BY_LEVEL,
  CURRICULUM_OPTIONS,
} from "../data/academicOptions";
import jojoWorking from "../assets/jojo-working.png";

/**
 * StudentProfilePage
 * -------------------
 * Mandatory academic-profile form shown once after signup/login
 * when the user has no record in `student_profiles`.
 *
 * - No skip / close / back button — this is a hard gate.
 * - Visual language mirrors LoginPage / SignUpPage (glass card,
 *   purple gradient left panel, ambient glow orbs, theme toggle).
 * - Cascading dropdowns: changing education level resets and
 *   repopulates grade/year and field/stream.
 * - Saves to `student_profiles` via upsert.
 *
 * Props
 *   onProfileComplete – called after a successful DB write so
 *                       App.jsx can flip `hasProfile → true`.
 *   user             – { id, name, email } from App state.
 */
function StudentProfilePage({ onProfileComplete, user }) {
  const { isDarkMode, toggleDarkMode } = useTheme();

  // ─── Form state ──────────────────────────────────────
  const [educationLevel, setEducationLevel] = useState("");
  const [gradeOrYear, setGradeOrYear] = useState("");
  const [fieldStream, setFieldStream] = useState("");
  const [curriculumType, setCurriculumType] = useState("");
  const [competitiveExams, setCompetitiveExams] = useState("");

  // ─── UI state ────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  // ─── Derived option lists ────────────────────────────
  const gradeOptions = GRADES_BY_LEVEL[educationLevel] || [];
  const fieldOptions = FIELDS_BY_LEVEL[educationLevel] || [];

  // ─── Handlers ────────────────────────────────────────

  /** When education level changes, reset dependent fields. */
  const handleEducationLevelChange = (value) => {
    setEducationLevel(value);
    setGradeOrYear("");
    setFieldStream("");

    // Clear any stale validation errors for the cascaded fields
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next.gradeOrYear;
      delete next.fieldStream;
      return next;
    });
  };

  /** Frontend validation — returns true if form is valid. */
  const validate = () => {
    const errs = {};

    if (!educationLevel) {
      errs.educationLevel = "Please select your level of study.";
    }

    if (!gradeOrYear) {
      errs.gradeOrYear = "Please select your grade or year.";
    }

    if (!fieldStream) {
      errs.fieldStream = "Please select your field or stream.";
    }

    if (!curriculumType) {
      errs.curriculumType = "Please select your curriculum type.";
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /** Convert the competitive-exams text input to a jsonb array. */
  const parseCompetitiveExams = (text) => {
    const trimmed = text.trim();

    if (!trimmed || trimmed.toLowerCase() === "none") {
      return [];
    }

    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  /** Submit the profile to Supabase. */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    setLoading(true);

    try {
      // Get the authenticated user's ID directly from the session
      // (never trust a client-supplied id for ownership).
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        setError("Unable to verify your session. Please log in again.");
        setLoading(false);
        return;
      }

      const payload = {
        user_id: authUser.id,
        education_level: educationLevel,
        grade_or_year: gradeOrYear,
        field_stream: fieldStream,
        curriculum_type: curriculumType,
        competitive_exams: parseCompetitiveExams(competitiveExams),
      };

      // Upsert so we never create duplicates if the user somehow
      // submits twice or hits a race condition.
      const { error: dbError } = await supabase
        .from("student_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (dbError) {
        console.error("student_profiles upsert failed:", dbError);

        setError(
          dbError.message || "Failed to save your profile. Please try again."
        );

        setLoading(false);
        return;
      }

      // Success — let the parent know so it can unlock the main app.
      if (onProfileComplete) {
        onProfileComplete();
      }
    } catch (err) {
      console.error("Unexpected error saving profile:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Reusable class strings ──────────────────────────

  const selectClasses = (hasError) =>
    `w-full appearance-none rounded-xl border px-4 py-3 pr-10 text-sm outline-none transition-all cursor-pointer ${
      isDarkMode
        ? `border-white/10 bg-[#161220] text-[#F5F2FA] [color-scheme:dark] focus:border-[#8064C7] focus:bg-[#1C1728] ${
            hasError ? "border-red-500/50" : ""
          }`
        : `border-gray-200 bg-white/90 text-[#292530] [color-scheme:light] focus:border-[#8064C7] focus:bg-white ${
            hasError ? "border-red-400" : ""
          }`
    }`;

  const optionClasses = isDarkMode
    ? "bg-[#161220] text-[#F5F2FA]"
    : "bg-white text-[#292530]";

  const placeholderOptionClasses = isDarkMode
    ? "bg-[#161220] text-white/40"
    : "bg-white text-gray-400";

  const inputClasses = `w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
    isDarkMode
      ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7] focus:bg-white/10"
      : "border-gray-200 bg-white/80 text-[#292530] placeholder:text-gray-400 focus:border-[#8064C7] focus:bg-white"
  }`;

  const labelClasses = `mb-2 block text-xs font-bold uppercase tracking-wider ${
    isDarkMode ? "text-white/70" : "text-[#292530]"
  }`;

  // ─── Render ──────────────────────────────────────────

  return (
    <div
      className={`relative flex min-h-screen items-center justify-center p-4 sm:p-6 transition-colors duration-500 font-sans ${
        isDarkMode
          ? "bg-[#0E0B15] text-[#F5F2FA]"
          : "bg-[#F6F3FC] text-[#292530]"
      }`}
    >
      {/* ── Background Glow Orbs ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className={`absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full blur-[130px] transition-colors duration-700 ${
            isDarkMode ? "bg-[#6D45B8]/25" : "bg-[#D9CEF5]/60"
          }`}
        />

        <div
          className={`absolute -right-40 top-[20%] h-[500px] w-[500px] rounded-full blur-[130px] ${
            isDarkMode ? "bg-[#8B5CF6]/15" : "bg-[#E9DDF5]/70"
          }`}
        />
      </div>

      {/* ── Theme Toggle (top-right) ── */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-3">
        <button
          onClick={toggleDarkMode}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
            isDarkMode
              ? "border-white/10 bg-white/10 text-yellow-300 hover:bg-white/20"
              : "border-white/80 bg-white/70 text-purple-600 hover:bg-white shadow-sm"
          }`}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* ── Glass Card ── */}
      <div
        className={`grid w-full max-w-5xl overflow-hidden rounded-[24px] sm:rounded-[32px] border backdrop-blur-2xl transition-all duration-500 shadow-2xl lg:grid-cols-2 mt-12 sm:mt-0 ${
          isDarkMode
            ? "border-white/10 bg-[#17131F]/80 shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            : "border-white/80 bg-white/60 shadow-[0_18px_50px_rgba(70,55,110,0.12)]"
        }`}
      >
        {/* ════════ LEFT PANEL (purple gradient) ════════ */}
        <div className="relative hidden flex-col overflow-hidden bg-gradient-to-br from-[#8064C7] via-[#7455B8] to-[#5D4298] p-12 text-white lg:flex">
          {/* Decorative glow circles */}
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          {/* Main content */}
          <div className="relative z-10">
            {/* Brand */}
            <div className="mb-10 flex items-center gap-3">
              <div className="text-4xl font-black tracking-[-0.08em] text-white">
                Jot<span className="text-purple-200">.</span>
              </div>

              <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                your study buddy
              </span>
            </div>

            {/* Heading */}
            <h1 className="max-w-md text-4xl font-black leading-tight tracking-tight">
              One last thing
              <br />
              <span className="text-purple-200">before we begin.</span>
            </h1>

            {/* Description */}
            <p className="mt-6 max-w-md text-sm leading-6 text-purple-100/90">
              Tell us a bit about your academic background so Jojo can tailor
              your study sessions, quizzes, and revision materials to exactly
              what you need.
            </p>

            {/* Jojo Working */}
            <div className="mt-8 flex justify-center">
              <img
                src={jojoWorking}
                alt="Jojo helping with your profile"
                className="h-48 w-auto object-contain drop-shadow-xl"
              />
            </div>
          </div>

          {/* Bottom tagline */}
          <div className="relative z-10 mt-auto flex items-center gap-2 text-xs font-semibold text-purple-200">
            <Sparkles size={16} />
            <span>Jot it. Organise it. Top it.</span>
          </div>
        </div>

        {/* ════════ RIGHT PANEL (form) ════════ */}
        <div className="p-6 sm:p-10 lg:p-12 overflow-y-auto max-h-[90vh]">
          {/* Mobile brand */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="text-3xl font-black tracking-[-0.08em]">
              Jot<span className="text-[#8064C7]">.</span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-3xl font-black tracking-tight">
              Tell us more...
            </h2>

            <p
              className={`mt-2 text-sm ${
                isDarkMode ? "text-white/55" : "text-[#706A78]"
              }`}
            >
              Help us better understand you so we can curate your study
              sessions.
            </p>
          </div>

          {/* ════════ FORM ════════ */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ── 1. Current Level of Study ── */}
            <div>
              <label className={labelClasses}>Current Level of Study</label>

              <div className="relative">
                <select
                  id="education-level"
                  value={educationLevel}
                  onChange={(e) =>
                    handleEducationLevelChange(e.target.value)
                  }
                  className={selectClasses(
                    validationErrors.educationLevel
                  )}
                >
                  <option
                    value=""
                    disabled
                    className={placeholderOptionClasses}
                  >
                    Select your level
                  </option>

                  {EDUCATION_LEVELS.map((lvl) => (
                    <option
                      key={lvl.label}
                      value={lvl.value}
                      className={optionClasses}
                    >
                      {lvl.label}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={16}
                  className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${
                    isDarkMode ? "text-white/40" : "text-gray-400"
                  }`}
                />
              </div>

              {validationErrors.educationLevel && (
                <p className="mt-1 text-xs font-semibold text-red-400">
                  {validationErrors.educationLevel}
                </p>
              )}
            </div>

            {/* ── 2. Current Grade / Year of Study ── */}
            <div>
              <label className={labelClasses}>
                Current Grade / Year of Study
              </label>

              <div className="relative">
                <select
                  id="grade-or-year"
                  value={gradeOrYear}
                  onChange={(e) => {
                    setGradeOrYear(e.target.value);

                    setValidationErrors((prev) => {
                      const next = { ...prev };
                      delete next.gradeOrYear;
                      return next;
                    });
                  }}
                  disabled={!educationLevel}
                  className={`${selectClasses(
                    validationErrors.gradeOrYear
                  )} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <option
                    value=""
                    disabled
                    className={placeholderOptionClasses}
                  >
                    {educationLevel
                      ? "Select your grade / year"
                      : "Select level first"}
                  </option>

                  {gradeOptions.map((g) => (
                    <option key={g} value={g} className={optionClasses}>
                      {g}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={16}
                  className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${
                    isDarkMode ? "text-white/40" : "text-gray-400"
                  }`}
                />
              </div>

              {validationErrors.gradeOrYear && (
                <p className="mt-1 text-xs font-semibold text-red-400">
                  {validationErrors.gradeOrYear}
                </p>
              )}
            </div>

            {/* ── 3. Field / Stream / Major ── */}
            <div>
              <label className={labelClasses}>Field / Stream / Major</label>

              <div className="relative">
                <select
                  id="field-stream"
                  value={fieldStream}
                  onChange={(e) => {
                    setFieldStream(e.target.value);

                    setValidationErrors((prev) => {
                      const next = { ...prev };
                      delete next.fieldStream;
                      return next;
                    });
                  }}
                  disabled={!educationLevel}
                  className={`${selectClasses(
                    validationErrors.fieldStream
                  )} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <option
                    value=""
                    disabled
                    className={placeholderOptionClasses}
                  >
                    {educationLevel
                      ? "Select your field / stream"
                      : "Select level first"}
                  </option>

                  {fieldOptions.map((f) => (
                    <option key={f} value={f} className={optionClasses}>
                      {f}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={16}
                  className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${
                    isDarkMode ? "text-white/40" : "text-gray-400"
                  }`}
                />
              </div>

              {validationErrors.fieldStream && (
                <p className="mt-1 text-xs font-semibold text-red-400">
                  {validationErrors.fieldStream}
                </p>
              )}
            </div>

            {/* ── 4. Type of Curriculum ── */}
            <div>
              <label className={labelClasses}>Type of Curriculum</label>

              <div className="relative">
                <select
                  id="curriculum-type"
                  value={curriculumType}
                  onChange={(e) => {
                    setCurriculumType(e.target.value);

                    setValidationErrors((prev) => {
                      const next = { ...prev };
                      delete next.curriculumType;
                      return next;
                    });
                  }}
                  className={selectClasses(
                    validationErrors.curriculumType
                  )}
                >
                  <option
                    value=""
                    disabled
                    className={placeholderOptionClasses}
                  >
                    Select your curriculum
                  </option>

                  {CURRICULUM_OPTIONS.map((c) => (
                    <option key={c} value={c} className={optionClasses}>
                      {c}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={16}
                  className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${
                    isDarkMode ? "text-white/40" : "text-gray-400"
                  }`}
                />
              </div>

              {validationErrors.curriculumType && (
                <p className="mt-1 text-xs font-semibold text-red-400">
                  {validationErrors.curriculumType}
                </p>
              )}
            </div>

            {/* ── 5. Competitive Exams ── */}
            <div>
              <label className={labelClasses}>
                Preparing for any competitive exams?
              </label>

              <input
                id="competitive-exams"
                type="text"
                placeholder="e.g. JEE, NEET, CAT or None"
                value={competitiveExams}
                onChange={(e) => setCompetitiveExams(e.target.value)}
                className={inputClasses}
              />
            </div>

            {/* ── Error Banner ── */}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs font-semibold text-red-400">
                {error}
              </div>
            )}

            {/* ── Submit Button ── */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#8064C7] py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8B6DD4] shadow-[0_15px_35px_rgba(128,100,199,0.35)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving your profile...
                </>
              ) : (
                "Continue →"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default StudentProfilePage;