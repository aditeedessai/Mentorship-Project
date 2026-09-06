import { RotateCcw, ChevronRight, Clock, CheckCircle2 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

// Mirrors backend/services/evaluation_service.py's SECTION_TITLE_MAP -
// the same "section title" the Results page's cross-attempt breakdown
// uses for these types, kept consistent rather than inventing a second
// label set just for the planner.
const SECTION_TITLE_MAP = {
  mcq: "MCQ",
  application: "Application",
  short: "Short Answer",
  long: "Long Answer",
};

const formatDueDate = (isoDate) => {
  if (!isoDate) return null;
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function RevisionDueItem({ revision, onStart, isCompleted = false }) {
  const { isDarkMode } = useTheme();
  const sectionTitle = SECTION_TITLE_MAP[revision.question_type] || revision.question_type;
  const dueDateLabel = formatDueDate(revision.next_due_date);

  const completed = isCompleted || revision.isCompleted;

  return (
    <button
      type="button"
      onClick={() => onStart && onStart(revision)}
      className={`w-full text-left rounded-2xl border p-4 backdrop-blur-xl transition-all duration-300 flex items-start gap-3 sm:gap-4 cursor-pointer ${
        completed
          ? isDarkMode
            ? "border-emerald-500/20 bg-emerald-500/[0.03] opacity-75 hover:opacity-90"
            : "border-emerald-300/40 bg-emerald-50/40 opacity-80 hover:opacity-100"
          : isDarkMode
          ? "border-dashed border-emerald-500/30 bg-emerald-500/[0.06] text-[#F3F0F8] hover:border-emerald-500/50 hover:bg-emerald-500/10"
          : "border-dashed border-emerald-400/50 bg-emerald-50/60 text-[#231B33] hover:border-emerald-500/70 hover:bg-emerald-50"
      }`}
    >
      <div
        className={`mt-0.5 shrink-0 flex h-[22px] w-[22px] items-center justify-center rounded-full ${
          completed
            ? "bg-emerald-500/20 text-emerald-500"
            : isDarkMode
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-emerald-500/15 text-emerald-600"
        }`}
      >
        {completed ? <CheckCircle2 size={16} className="text-emerald-500 fill-emerald-500/20" /> : <RotateCcw size={13} />}
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4
            className={`font-semibold text-sm sm:text-base tracking-tight leading-snug break-words ${
              completed ? "line-through opacity-70" : ""
            }`}
          >
            Revision: {sectionTitle} &ndash; {revision.study_set_name}
          </h4>
          <ChevronRight size={16} className={isDarkMode ? "text-white/30 shrink-0" : "text-gray-400 shrink-0"} />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold border ${
              completed
                ? isDarkMode
                  ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                : isDarkMode
                ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
            }`}
          >
            {completed ? <CheckCircle2 size={12} /> : <RotateCcw size={12} />}
            <span>{completed ? "Completed Revision" : "Revision"}</span>
          </span>

          {!completed && dueDateLabel && (
            <span
              className={`inline-flex items-center gap-1 ${
                isDarkMode ? "text-white/50" : "text-gray-500"
              }`}
            >
              <Clock size={11} />
              Due {dueDateLabel}
            </span>
          )}

          {completed ? (
            <span className={isDarkMode ? "text-white/60 font-medium" : "text-gray-600 font-medium"}>
              Attempt {revision.attempts_taken} of 4
              {revision.last_accuracy != null ? ` · ${Math.round(revision.last_accuracy)}% score` : ""}
            </span>
          ) : (
            revision.attempts_taken > 0 && (
              <span className={isDarkMode ? "text-white/50" : "text-gray-500"}>
                Attempt {revision.attempts_taken + 1} of 4
                {revision.last_accuracy != null ? ` · last ${Math.round(revision.last_accuracy)}%` : ""}
              </span>
            )
          )}
        </div>
      </div>
    </button>
  );
}
