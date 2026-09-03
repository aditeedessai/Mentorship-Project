import { useEffect, useState } from "react";
import { Plus, CheckCircle2, Circle, Loader2, AlertCircle, RotateCcw, ChevronRight } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { fetchTodaysTasks, toggleTaskCompletion, fetchRevisionsDue } from "../../services/api";

const COMPLETED_HOLD_MS = 500;
const COLLAPSE_DURATION_MS = 300;

// Mirrors backend/services/evaluation_service.py's SECTION_TITLE_MAP -
// same "section title" used on the Planner and Results page, kept
// consistent rather than inventing a third label set here.
const SECTION_TITLE_MAP = {
  mcq: "MCQ",
  application: "Application",
  short: "Short Answer",
  long: "Long Answer",
};

const toFrontendQuestionTypeId = (backendType) =>
  backendType === "short" ? "short-answer" : backendType;

function TodaysTasksCard({ onNavigate }) {
  const { isDarkMode } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [revisionsDue, setRevisionsDue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [completingId, setCompletingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const loadTasks = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [tasksData, revisionsData] = await Promise.all([
        fetchTodaysTasks(),
        fetchRevisionsDue().catch(() => []),
      ]);
      // Filter out tasks that are already marked completed from Today's active tasks list
      setTasks((tasksData || []).filter((t) => !t.completed));
      // fetchRevisionsDue() now returns every scheduled pair's real
      // next_due_date (today, overdue, or future - see
      // revision_service.get_due_revisions_for_user()'s docstring), so
      // "Today's Tasks" filters down to today-or-overdue itself; a
      // future-dated pair belongs on the Planner calendar, not here.
      const todayStr = new Date().toISOString().split("T")[0];
      setRevisionsDue((revisionsData || []).filter((r) => r.next_due_date <= todayStr));
    } catch {
      setLoadError("Couldn't load today's tasks. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleStartRevision = (revision) => {
    onNavigate?.("quiz", {
      studySetId: revision.study_set_id,
      preselectType: toFrontendQuestionTypeId(revision.question_type),
    });
  };

  const handleToggleComplete = async (task) => {
    const taskId = task.id;
    const willBeCompleted = !task.completed;

    setCompletingId(taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: willBeCompleted } : t))
    );

    try {
      await toggleTaskCompletion(taskId, willBeCompleted);

      if (willBeCompleted) {
        setTimeout(() => {
          setRemovingId(taskId);
          setTimeout(() => {
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
            setCompletingId(null);
            setRemovingId(null);
          }, COLLAPSE_DURATION_MS);
        }, COMPLETED_HOLD_MS);
      } else {
        setCompletingId(null);
      }
    } catch (err) {
      console.warn("Could not toggle task completion:", err);
      // Revert state on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: !willBeCompleted } : t))
      );
      setCompletingId(null);
    }
  };

  return (
    <div
      className={`rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-500 ${
        isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
      }`}
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">
          Today's Tasks
        </h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate("planner")}
            className={`rounded-full border px-3.5 py-1 text-xs font-bold transition-all cursor-pointer ${
              isDarkMode
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-xs"
            }`}
          >
            See all
          </button>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate("planner")}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8064C7] text-white shadow-[0_10px_25px_rgba(128,100,199,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8B6DD4] cursor-pointer"
            aria-label="Go to Study Planner"
            title="Go to Study Planner to add tasks"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm opacity-50">
          <Loader2 size={16} className="animate-spin" />
          Loading tasks...
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <div className="flex items-center gap-1.5 text-sm font-medium text-red-400">
            <AlertCircle size={16} />
            {loadError}
          </div>
          <button
            type="button"
            onClick={loadTasks}
            className="text-xs font-bold text-[#8064C7] underline underline-offset-2 hover:text-[#8B6DD4]"
          >
            Retry
          </button>
        </div>
      ) : tasks.length === 0 && revisionsDue.length === 0 ? (
        <p className={`py-6 text-center text-sm ${isDarkMode ? "text-white/40" : "text-gray-400"}`}>
          No tasks scheduled for today. Click + to open Study Planner.
        </p>
      ) : (
        <div className="scrollbar-thin max-h-[224px] overflow-y-auto pr-1">
          {revisionsDue.map((revision) => {
            const sectionTitle =
              SECTION_TITLE_MAP[revision.question_type] || revision.question_type;

            return (
              <button
                key={`${revision.study_set_id}-${revision.question_type}`}
                type="button"
                onClick={() => handleStartRevision(revision)}
                className={`mb-3 flex w-full items-center gap-3 rounded-2xl border border-dashed p-3.5 text-left transition-all cursor-pointer ${
                  isDarkMode
                    ? "border-emerald-500/30 bg-emerald-500/[0.06] text-white hover:border-emerald-500/50 hover:bg-emerald-500/10"
                    : "border-emerald-400/50 bg-emerald-50/60 text-[#231B33] hover:border-emerald-500/70 hover:bg-emerald-50"
                }`}
              >
                <span
                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${
                    isDarkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-500/15 text-emerald-600"
                  }`}
                >
                  <RotateCcw size={13} />
                </span>

                <span className="min-w-0 flex-1 text-sm font-semibold opacity-90">
                  Revision: {sectionTitle} &ndash; {revision.study_set_name}
                </span>

                <ChevronRight
                  size={16}
                  className={`shrink-0 ${isDarkMode ? "text-white/30" : "text-gray-400"}`}
                />
              </button>
            );
          })}

          {tasks.map((task) => {
            const isCompleting = completingId === task.id || task.completed;
            const isRemoving = removingId === task.id;

            return (
              <div
                key={task.id}
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isRemoving
                    ? "max-h-0 opacity-0 mb-0"
                    : "max-h-24 opacity-100 mb-3"
                }`}
              >
                <div
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                    isDarkMode
                      ? "border-white/5 bg-white/5 hover:bg-white/10 text-white"
                      : "border-white/80 bg-white/70 hover:bg-white text-[#231B33]"
                  }`}
                >
                  {/* Interactive Ticking Checkbox (Direct toggle like PlannerPage TaskItem) */}
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(task)}
                    disabled={isRemoving}
                    className="shrink-0 transition-transform active:scale-95 cursor-pointer disabled:cursor-default"
                    aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"}
                  >
                    {isCompleting ? (
                      <CheckCircle2 size={22} className="text-emerald-500 fill-emerald-500/20" />
                    ) : (
                      <Circle
                        size={22}
                        className={`transition-colors ${
                          isDarkMode
                            ? "text-white/30 hover:text-[#A78BFA]"
                            : "text-gray-300 hover:text-[#8064C7]"
                        }`}
                      />
                    )}
                  </button>

                  <span
                    className={`text-sm font-semibold transition-all duration-300 ${
                      isCompleting
                        ? "opacity-40 line-through"
                        : "opacity-90"
                    }`}
                  >
                    {task.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TodaysTasksCard;

