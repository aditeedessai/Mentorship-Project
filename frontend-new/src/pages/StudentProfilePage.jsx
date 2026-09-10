import { useState, useEffect } from "react";
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

/* =========================================================
   STUDENT PROFILE ANIMATIONS
   ========================================================= */

const profileAnimationStyles = `
  @keyframes profileCardEntrance {
    0% {
      opacity: 0;
      transform: translateY(24px) scale(0.98);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes profileLeftEntrance {
    0% {
      opacity: 0;
      transform: translateX(-35px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes profileRightEntrance {
    0% {
      opacity: 0;
      transform: translateX(35px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes profileBrandEntrance {
    0% {
      opacity: 0;
      transform: translateY(-15px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes profileTextEntrance {
    0% {
      opacity: 0;
      transform: translateY(18px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes profileJojoEntrance {
    0% {
      opacity: 0;
      transform: translateY(35px) scale(0.88);
    }
    70% {
      opacity: 1;
      transform: translateY(-5px) scale(1.02);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes profileJojoFloat {
    0%, 100% {
      transform: translateY(0) rotate(0deg);
    }
    50% {
      transform: translateY(-9px) rotate(1deg);
    }
  }

  @keyframes profileJojoGlow {
    0%, 100% {
      opacity: 0.35;
      transform: scale(0.92);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.08);
    }
  }

  @keyframes profileGlowDriftOne {
    0%, 100% {
      transform: translate(0, 0) scale(1);
    }
    50% {
      transform: translate(25px, 18px) scale(1.08);
    }
  }

  @keyframes profileGlowDriftTwo {
    0%, 100% {
      transform: translate(0, 0) scale(1);
    }
    50% {
      transform: translate(-22px, 20px) scale(1.06);
    }
  }

  @keyframes profileSparkle {
    0%, 100% {
      opacity: 0.35;
      transform: scale(0.8) rotate(0deg);
    }
    50% {
      opacity: 1;
      transform: scale(1.15) rotate(20deg);
    }
  }

  @keyframes profileSparkleFloat {
    0%, 100% {
      transform: translateY(0) rotate(0deg);
    }
    50% {
      transform: translateY(-10px) rotate(12deg);
    }
  }

  @keyframes profileFieldEntrance {
    0% {
      opacity: 0;
      transform: translateX(18px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes profileButtonEntrance {
    0% {
      opacity: 0;
      transform: translateY(12px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes profileButtonShine {
    0% {
      transform: translateX(-130%);
    }
    100% {
      transform: translateX(130%);
    }
  }

  @keyframes profileBadgePulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.04);
    }
  }

  @keyframes profileIconFloat {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-3px);
    }
  }

  .profile-card-entrance {
    animation: profileCardEntrance 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .profile-left-entrance {
    animation: profileLeftEntrance 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both;
  }

  .profile-right-entrance {
    animation: profileRightEntrance 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.18s both;
  }

  .profile-brand-entrance {
    animation: profileBrandEntrance 0.55s ease-out 0.3s both;
  }

  .profile-text-entrance {
    animation: profileTextEntrance 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both;
  }

  .profile-jojo-entrance {
    animation: profileJojoEntrance 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.55s both;
  }

  .profile-jojo-float {
    animation: profileJojoFloat 4.5s ease-in-out 1.4s infinite;
  }

  .profile-jojo-glow {
    animation: profileJojoGlow 3.5s ease-in-out infinite;
  }

  .profile-glow-one {
    animation: profileGlowDriftOne 8s ease-in-out infinite;
  }

  .profile-glow-two {
    animation: profileGlowDriftTwo 10s ease-in-out infinite;
  }

  .profile-sparkle {
    animation: profileSparkle 2.5s ease-in-out infinite;
  }

  .profile-sparkle-float {
    animation: profileSparkleFloat 4s ease-in-out infinite;
  }

  .profile-field-1 {
    animation: profileFieldEntrance 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.45s both;
  }

  .profile-field-2 {
    animation: profileFieldEntrance 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.53s both;
  }

  .profile-field-3 {
    animation: profileFieldEntrance 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.61s both;
  }

  .profile-field-4 {
    animation: profileFieldEntrance 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.69s both;
  }

  .profile-field-5 {
    animation: profileFieldEntrance 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.77s both;
  }

  .profile-button-entrance {
    animation: profileButtonEntrance 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.87s both;
  }

  .profile-badge-pulse {
    animation: profileBadgePulse 3s ease-in-out infinite;
  }

  .profile-icon-float {
    animation: profileIconFloat 2.5s ease-in-out infinite;
  }

  .profile-field-hover {
    transition:
      transform 0.25s ease,
      filter 0.25s ease;
  }

  .profile-field-hover:focus-within {
    transform: translateX(3px);
  }

  .profile-field-hover:hover {
    transform: translateX(2px);
  }

  .profile-submit {
    position: relative;
    overflow: hidden;
  }

  .profile-submit::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 45%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255,255,255,0.18),
      transparent
    );
    transform: translateX(-130%);
  }

  .profile-submit:hover::after {
    animation: profileButtonShine 0.8s ease;
  }

  .profile-theme-button,
  .profile-back-button {
    transition:
      transform 0.25s ease,
      box-shadow 0.25s ease,
      background-color 0.25s ease;
  }

  .profile-theme-button:hover,
  .profile-back-button:hover {
    transform: translateY(-2px);
  }

  .profile-theme-button:active,
  .profile-back-button:active {
    transform: scale(0.96);
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-card-entrance,
    .profile-left-entrance,
    .profile-right-entrance,
    .profile-brand-entrance,
    .profile-text-entrance,
    .profile-jojo-entrance,
    .profile-jojo-float,
    .profile-jojo-glow,
    .profile-glow-one,
    .profile-glow-two,
    .profile-sparkle,
    .profile-sparkle-float,
    .profile-field-1,
    .profile-field-2,
    .profile-field-3,
    .profile-field-4,
    .profile-field-5,
    .profile-button-entrance,
    .profile-badge-pulse,
    .profile-icon-float {
      animation: none !important;
    }
  }
`;

/**
 * StudentProfilePage
 * -------------------
 * Mandatory academic-profile form shown once after signup/login
 * when the user has no record in `student_profiles`.
 */
function StudentProfilePage({ onProfileComplete, onBack, user }) {
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

  // ─── Pre-fill existing profile data if available ─────
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id || user?.id;

        if (!userId) return;

        const { data } = await supabase
          .from("student_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (data && isMounted) {
          if (data.education_level) {
            setEducationLevel(data.education_level);
          }

          if (data.grade_or_year) {
            setGradeOrYear(data.grade_or_year);
          }

          if (data.field_stream) {
            setFieldStream(data.field_stream);
          }

          if (data.curriculum_type) {
            setCurriculumType(data.curriculum_type);
          }

          if (data.competitive_exams) {
            const exams = Array.isArray(data.competitive_exams)
              ? data.competitive_exams.join(", ")
              : String(data.competitive_exams);

            setCompetitiveExams(exams);
          }
        }
      } catch (err) {
        console.error("Error loading student profile:", err);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // ─── Derived option lists ────────────────────────────
  const gradeOptions = GRADES_BY_LEVEL[educationLevel] || [];
  const fieldOptions = FIELDS_BY_LEVEL[educationLevel] || [];

  // ─── Handlers ────────────────────────────────────────

  const handleEducationLevelChange = (value) => {
    setEducationLevel(value);
    setGradeOrYear("");
    setFieldStream("");

    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next.gradeOrYear;
      delete next.fieldStream;
      return next;
    });
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    setLoading(true);

    try {
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

      if (onProfileComplete) {
        onProfileComplete();
      }
    } catch (err) {
      console.error("Unexpected error saving student profile:", err);
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
    <>
      <style>{profileAnimationStyles}</style>

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
            className={`profile-glow-one absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full blur-[130px] transition-colors duration-700 ${
              isDarkMode ? "bg-[#6D45B8]/25" : "bg-[#D9CEF5]/60"
            }`}
          />

          <div
            className={`profile-glow-two absolute -right-40 top-[20%] h-[500px] w-[500px] rounded-full blur-[130px] ${
              isDarkMode ? "bg-[#8B5CF6]/15" : "bg-[#E9DDF5]/70"
            }`}
          />
        </div>

        {/* ── Theme Toggle & Back Button ── */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-3 z-30">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className={`profile-back-button rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                isDarkMode
                  ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                  : "border-white/80 bg-white/70 text-[#292530] hover:bg-white shadow-sm"
              }`}
            >
              ← Back to Settings
            </button>
          )}

          <button
            type="button"
            onClick={toggleDarkMode}
            className={`profile-theme-button flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
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
          className={`profile-card-entrance grid w-full max-w-5xl overflow-hidden rounded-[24px] sm:rounded-[32px] border backdrop-blur-2xl transition-all duration-500 shadow-2xl lg:grid-cols-2 mt-12 sm:mt-0 ${
            isDarkMode
              ? "border-white/10 bg-[#17131F]/80 shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
              : "border-white/80 bg-white/60 shadow-[0_18px_50px_rgba(70,55,110,0.12)]"
          }`}
        >
          {/* ════════ LEFT PANEL ════════ */}
          <div className="relative hidden flex-col overflow-hidden bg-gradient-to-br from-[#8064C7] via-[#7455B8] to-[#5D4298] p-12 text-white lg:flex">
            {/* Decorative glow circles */}
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl profile-glow-one" />

            <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl profile-glow-two" />

            {/* Decorative sparkles */}
            <Sparkles
              size={20}
              className="profile-sparkle absolute right-16 top-24 text-purple-200/80"
            />

            <Sparkles
              size={14}
              className="profile-sparkle-float absolute left-20 top-52 text-white/60"
            />

            <Sparkles
              size={16}
              className="profile-sparkle absolute bottom-32 right-24 text-purple-200/70"
            />

            {/* Main content */}
            <div className="relative z-10 profile-left-entrance">
              {/* Brand */}
              <div className="profile-brand-entrance mb-10 flex items-center gap-3">
                <div className="text-4xl font-black tracking-[-0.08em] text-white">
                  Jot<span className="text-purple-200">.</span>
                </div>

                <span className="profile-badge-pulse rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                  your study buddy
                </span>
              </div>

              {/* Heading */}
              <div className="profile-text-entrance">
                <h1 className="max-w-md text-4xl font-black leading-tight tracking-tight">
                  {onBack ? "Update your" : "One last thing"}
                  <br />
                  <span className="text-purple-200">
                    {onBack ? "academic profile." : "before we begin."}
                  </span>
                </h1>

                <p className="mt-6 max-w-md text-sm leading-6 text-purple-100/90">
                  Tell us a bit about your academic background so Jojo can
                  tailor your study sessions, quizzes, and revision materials
                  to exactly what you need.
                </p>
              </div>

              {/* Jojo */}
              <div className="relative mt-8 flex h-52 items-center justify-center">
                {/* Jojo glow */}
                <div className="profile-jojo-glow absolute h-44 w-44 rounded-full bg-white/20 blur-3xl" />

                {/* Decorative sparkle */}
                <Sparkles
                  size={18}
                  className="profile-sparkle absolute left-[18%] top-[25%] text-purple-200"
                />

                <Sparkles
                  size={13}
                  className="profile-sparkle-float absolute right-[18%] bottom-[25%] text-white/70"
                />

                {/* Jojo */}
                <div className="profile-jojo-entrance relative z-10">
                  <div className="profile-jojo-float">
                    <img
                      src={jojoWorking}
                      alt="Jojo helping with your profile"
                      className="h-48 w-auto object-contain drop-shadow-xl"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom tagline */}
            <div className="relative z-10 mt-auto flex items-center gap-2 text-xs font-semibold text-purple-200 profile-text-entrance">
              <Sparkles size={16} className="profile-icon-float" />
              <span>Jot it. Organise it. Top it.</span>
            </div>
          </div>

          {/* ════════ RIGHT PANEL ════════ */}
          <div className="profile-right-entrance p-6 sm:p-10 lg:p-12 overflow-y-auto max-h-[90vh]">
            {/* Mobile brand */}
            <div className="mb-6 flex items-center gap-2 lg:hidden profile-brand-entrance">
              <div className="text-3xl font-black tracking-[-0.08em]">
                Jot<span className="text-[#8064C7]">.</span>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-6 profile-text-entrance">
              <h2 className="text-3xl font-black tracking-tight">
                {onBack ? "Update Student Profile" : "Tell us more..."}
              </h2>

              <p
                className={`mt-2 text-sm ${
                  isDarkMode ? "text-white/55" : "text-[#706A78]"
                }`}
              >
                {onBack
                  ? "Update your academic details to keep your study sessions personalized."
                  : "Help us better understand you so we can curate your study sessions."}
              </p>
            </div>

            {/* ════════ FORM ════════ */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ── 1. Current Level of Study ── */}
              <div className="profile-field-1 profile-field-hover">
                <label className={labelClasses}>
                  Current Level of Study
                </label>

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
              <div className="profile-field-2 profile-field-hover">
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
              <div className="profile-field-3 profile-field-hover">
                <label className={labelClasses}>
                  Field / Stream / Major
                </label>

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
              <div className="profile-field-4 profile-field-hover">
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
              <div className="profile-field-5 profile-field-hover">
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
              <div className="profile-button-entrance">
                <button
                  type="submit"
                  disabled={loading}
                  className="profile-submit w-full rounded-xl bg-[#8064C7] py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8B6DD4] shadow-[0_15px_35px_rgba(128,100,199,0.35)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving your profile...
                    </>
                  ) : onBack ? (
                    "Save Profile →"
                  ) : (
                    "Continue →"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default StudentProfilePage;