import { RotateCcw, ChevronRight, Clock } from "lucide-react";
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

// Distinct from a manually-created task on purpose: dashed emerald
// border (reusing TASK_TYPES.Revision's existing color), no checkbox
// (nothing to manually tick - completing the quiz is what advances
// this), no delete (it's derived from revision_schedules, not a row
// the student owns). The whole card is the "Start" affordance.
export default function RevisionDueItem({ revision, onStart }) {
  const { isDarkMode } = useTheme();
  const sectionTitle = SECTION_TITLE_MAP[revision.question_type] || revision.question_type;
  const dueDateLabel = formatDueDate(revision.next_due_date);

  return (
    <button
      type="button"
      onClick={() => onStart(revision)}
      className={`w-full text-left rounded-2xl border border-dashed p-4 backdrop-blur-xl transition-all duration-300 flex items-start gap-3 sm:gap-4 cursor-pointer ${
        isDarkMode
          ? "border-emerald-500/30 bg-emerald-500/[0.06] text-[#F3F0F8] hover:border-emerald-500/50 hover:bg-emerald-500/10"
          : "border-emerald-400/50 bg-emerald-50/60 text-[#231B33] hover:border-emerald-500/70 hover:bg-emerald-50"
      }`}
    >
      <div
        className={`mt-0.5 shrink-0 flex h-[22px] w-[22px] items-center justify-center rounded-full ${
          isDarkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-500/15 text-emerald-600"
        }`}
      >
        <RotateCcw size={13} />
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-semibold text-sm sm:text-base tracking-tight leading-snug break-words">
            Revision: {sectionTitle} &ndash; {revision.study_set_name}
          </h4>
          <ChevronRight size={16} className={isDarkMode ? "text-white/30 shrink-0" : "text-gray-400 shrink-0"} />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold border ${
              isDarkMode
                ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
            }`}
          >
            <RotateCcw size={12} />
            <span>Revision</span>
          </span>

          {dueDateLabel && (
            <span
              className={`inline-flex items-center gap-1 ${
                isDarkMode ? "text-white/50" : "text-gray-500"
              }`}
            >
              <Clock size={11} />
              Due {dueDateLabel}
            </span>
          )}

          {revision.attempts_taken > 0 && (
            <span className={isDarkMode ? "text-white/50" : "text-gray-500"}>
              Attempt {revision.attempts_taken + 1} of 4
              {revision.last_accuracy != null ? ` · last ${Math.round(revision.last_accuracy)}%` : ""}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
