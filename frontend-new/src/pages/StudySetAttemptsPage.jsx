import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  History,
  CheckCircle2,
  Clock,
  ChevronRight,
  AlertCircle,
  BookOpen,
  FileQuestion,
  Sparkles,
  Eye,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { fetchAttemptsForStudySet, fetchStudySet } from "../services/api";

const SECTIONS = [
  { id: "mcq", label: "MCQ", types: ["mcq"] },
  { id: "short", label: "Short Answer", types: ["short", "short-answer"] },
  { id: "long", label: "Long Answer", types: ["long", "long-answer"] },
  { id: "application", label: "Applicative", types: ["application", "applicative"] },
];

function StudySetAttemptsPage({ studySetId, studySets = [], onNavigate }) {
  const { isDarkMode } = useTheme();
  const [activeType, setActiveType] = useState("mcq");
  const [attempts, setAttempts] = useState([]);
  const [studySet, setStudySet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!studySetId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // Find existing study set details or fetch
        const foundSet = studySets.find((s) => s.study_set_id === studySetId);
        if (foundSet) {
          setStudySet(foundSet);
        } else {
          try {
            const setDetail = await fetchStudySet(studySetId);
            if (isMounted && setDetail) {
              setStudySet(setDetail);
            }
          } catch (err) {
            console.warn("Could not fetch study set detail:", err);
          }
        }

        // Fetch attempts
        const attemptsData = await fetchAttemptsForStudySet(studySetId);
        if (isMounted) {
          setAttempts(attemptsData || []);
        }
      } catch (err) {
        console.error("Failed to load attempt history:", err);
        if (isMounted) {
          setError("Unable to load attempt history. Please try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [studySetId, studySets]);

  const studySetName = studySet?.name || "Study Set";

  // Calculate per-section attempts mapping with chronological attempt numbers (#1, #2, ...)
  const sectionAttemptsMap = useMemo(() => {
    const map = {};

    SECTIONS.forEach((sec) => {
      const matched = attempts.filter((att) => {
        const rawType =
          att.question_type ||
          att.type ||
          att.section ||
          att.questionType ||
          "";
        const t = String(rawType).toLowerCase().trim();
        return sec.types.includes(t);
      });

      // Sort oldest -> newest to assign Attempt #1, #2...
      const sortedAsc = [...matched].sort(
        (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
      );

      const numbered = sortedAsc.map((att, idx) => ({
        ...att,
        attemptNumber: idx + 1,
      }));

      // Store newest first for display
      map[sec.id] = numbered.reverse();
    });

    return map;
  }, [attempts]);

  const currentSectionAttempts = sectionAttemptsMap[activeType] || [];

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    const dateFormatted = d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const timeFormatted = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateFormatted} • ${timeFormatted}`;
  };

  return (
    <div className="pb-12 min-h-screen">
      {/* Top Back Navigation Bar */}
      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate?.("study-set", { studySetId })}
          className={`group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all backdrop-blur-xl ${
            isDarkMode
              ? "border-white/10 bg-white/5 text-[#A78BFA] hover:bg-white/10"
              : "border-white/80 bg-white/70 text-[#8064C7] hover:bg-white shadow-sm"
          }`}
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <span>Back to Study Set</span>
        </button>
      </header>

      {/* Main Container */}
      <div className="max-w-[1280px] mx-auto space-y-6">
        {/* Hero Header Card */}
        <div
          className={`relative overflow-hidden rounded-3xl border p-5 sm:p-6 lg:p-8 backdrop-blur-2xl transition-all duration-500 ${
            isDarkMode
              ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
              : "border-[#8064C7]/20 bg-gradient-to-r from-[#E5DCF8] to-[#F1EAFA] text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.06)]"
          }`}
        >
          <div className="absolute -top-12 -right-12 w-56 h-56 bg-[#8064C7]/8 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-bold uppercase tracking-wider ${
                    isDarkMode
                      ? "bg-[#8064C7]/20 border border-[#8064C7]/30 text-[#A78BFA]"
                      : "bg-[#8064C7]/10 border border-[#8064C7]/20 text-[#8064C7]"
                  }`}
                >
                  <History size={14} />
                  ATTEMPT HISTORY
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight overflow-wrap-anywhere">
                {studySetName}
              </h1>
              <p
                className={`text-xs sm:text-sm mt-1 leading-relaxed ${
                  isDarkMode ? "text-white/60" : "text-gray-500"
                }`}
              >
                Review your past quiz attempts and historical scores broken down by question type.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-400 flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter Bubble Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {SECTIONS.map((sec) => {
            const count = (sectionAttemptsMap[sec.id] || []).length;
            const isActive = activeType === sec.id;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveType(sec.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-300 shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-[#8064C7] text-white shadow-lg shadow-[#8064C7]/30 scale-105"
                    : isDarkMode
                    ? "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-xs"
                }`}
              >
                <span>{sec.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-extrabold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : isDarkMode
                      ? "bg-white/10 text-white/60"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        {loading ? (
          <div
            className={`rounded-3xl border p-12 flex flex-col items-center justify-center gap-3 transition-colors ${
              isDarkMode ? "border-white/10 bg-[#14101D]/75" : "border-gray-200 bg-white/80"
            }`}
          >
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8064C7] border-t-transparent" />
            <span className={`text-sm font-semibold ${isDarkMode ? "text-white/50" : "text-gray-400"}`}>
              Loading attempt history...
            </span>
          </div>
        ) : currentSectionAttempts.length === 0 ? (
          /* Empty State for Section / Zero Attempts */
          <div
            className={`rounded-3xl border p-10 sm:p-14 text-center flex flex-col items-center justify-center transition-all ${
              isDarkMode
                ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.2)]"
                : "border-[#8064C7]/15 bg-white/80 text-[#231B33] shadow-sm"
            }`}
          >
            <div
              className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-4 ${
                isDarkMode ? "bg-[#8064C7]/20 text-[#A78BFA]" : "bg-[#8064C7]/10 text-[#8064C7]"
              }`}
            >
              <FileQuestion size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">No attempts yet</h3>
            <p
              className={`text-sm max-w-md leading-relaxed mb-6 ${
                isDarkMode ? "text-white/60" : "text-gray-500"
              }`}
            >
              Answer the quiz first to see your attempts here.
            </p>
            <button
              type="button"
              onClick={() => onNavigate?.("quiz", { studySetId, preselectType: activeType })}
              className="inline-flex items-center gap-2 bg-[#8064C7] hover:bg-[#8B6DD4] text-white rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold shadow-md transition-all hover:-translate-y-0.5"
            >
              <Sparkles size={16} />
              <span>Take Quiz Now</span>
            </button>
          </div>
        ) : (
          /* Attempt Cards List */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {currentSectionAttempts.map((att) => {
              const totalMarks = Number(att.total_marks || 0);
              const marksAwarded = Number(att.marks_awarded || 0);
              const percentage =
                totalMarks > 0 ? Math.round((marksAwarded / totalMarks) * 100) : 0;

              const isCompleted = att.status === "completed";

              return (
                <div
                  key={att.attempt_id}
                  className={`group relative overflow-hidden rounded-3xl border p-5 sm:p-6 backdrop-blur-2xl transition-all duration-300 hover:shadow-lg flex flex-col justify-between gap-5 ${
                    isDarkMode
                      ? "border-white/10 bg-[#14101D]/80 text-[#F3F0F8] hover:border-[#8064C7]/40"
                      : "border-gray-200/80 bg-white/90 text-[#231B33] hover:border-[#8064C7]/30 shadow-xs"
                  }`}
                >
                  {/* Card Top Row */}
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg sm:text-xl tracking-tight">
                          Attempt #{att.attemptNumber}
                        </span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          isCompleted
                            ? isDarkMode
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isDarkMode
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle2 size={12} />
                            Completed
                          </>
                        ) : (
                          <>
                            <Clock size={12} />
                            In Progress
                          </>
                        )}
                      </span>
                    </div>

                    {/* Date and Time */}
                    <p
                      className={`text-xs font-medium flex items-center gap-1.5 ${
                        isDarkMode ? "text-white/50" : "text-gray-400"
                      }`}
                    >
                      <Clock size={13} className="shrink-0" />
                      <span>{formatDateTime(att.created_at)}</span>
                    </p>
                  </div>

                  {/* Card Stats Grid */}
                  <div
                    className={`grid grid-cols-2 gap-3 p-3.5 rounded-2xl border ${
                      isDarkMode
                        ? "bg-white/5 border-white/5"
                        : "bg-gray-50/80 border-gray-100"
                    }`}
                  >
                    <div>
                      <span
                        className={`block text-[11px] font-bold uppercase tracking-wider mb-0.5 ${
                          isDarkMode ? "text-white/40" : "text-gray-400"
                        }`}
                      >
                        Score
                      </span>
                      <span className="font-extrabold text-base sm:text-lg">
                        {marksAwarded} / {totalMarks}
                      </span>
                    </div>

                    <div>
                      <span
                        className={`block text-[11px] font-bold uppercase tracking-wider mb-0.5 ${
                          isDarkMode ? "text-white/40" : "text-gray-400"
                        }`}
                      >
                        Percentage
                      </span>
                      <span
                        className={`font-black text-base sm:text-lg ${
                          percentage >= 70
                            ? "text-emerald-500"
                            : percentage >= 50
                            ? "text-amber-500"
                            : "text-red-400"
                        }`}
                      >
                        {percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div className="pt-1 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate?.("results", {
                          studySetId,
                          attemptId: att.attempt_id,
                        })
                      }
                      className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold border transition-all duration-300 cursor-pointer ${
                        isDarkMode
                          ? "border-white/10 bg-white/5 text-white hover:bg-[#8064C7] hover:border-[#8064C7]"
                          : "border-gray-200 bg-white text-[#231B33] hover:bg-[#8064C7] hover:text-white hover:border-[#8064C7] shadow-xs"
                      }`}
                    >
                      <Eye size={16} />
                      <span>View Results</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudySetAttemptsPage;
