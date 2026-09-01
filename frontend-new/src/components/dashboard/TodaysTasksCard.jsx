import { useEffect, useState } from "react";
import { Plus, CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import DeleteConfirmModal from "../DeleteConfirmModal";
import { fetchTodaysTasks, deleteTask } from "../../services/api";

const COMPLETED_HOLD_MS = 500;
const COLLAPSE_DURATION_MS = 300;

function TodaysTasksCard({ onNavigate }) {
  const { isDarkMode } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [confirmTask, setConfirmTask] = useState(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  const [completingId, setCompletingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const loadTasks = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await fetchTodaysTasks();
      setTasks(data);
    } catch {
      setLoadError("Couldn't load today's tasks. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const openConfirm = (task) => {
    setConfirmTask(task);
    setConfirmError(null);
  };

  const cancelConfirm = () => {
    if (isConfirmLoading) return;
    setConfirmTask(null);
    setConfirmError(null);
  };

  const confirmComplete = async () => {
    if (!confirmTask) return;

    setIsConfirmLoading(true);
    setConfirmError(null);
    try {
      await deleteTask(confirmTask.id);

      const taskId = confirmTask.id;
      setIsConfirmLoading(false);
      setConfirmTask(null);
      setCompletingId(taskId);

      setTimeout(() => {
        setRemovingId(taskId);
        setTimeout(() => {
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          setCompletingId(null);
          setRemovingId(null);
        }, COLLAPSE_DURATION_MS);
      }, COMPLETED_HOLD_MS);
    } catch {
      setConfirmError("Couldn't mark task complete. Please try again.");
      setIsConfirmLoading(false);
    }
  };

  return (
    <>
      <div
        className={`rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-500 ${
          isDarkMode
            ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight">
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
        ) : tasks.length === 0 ? (
          <p className={`py-6 text-center text-sm ${isDarkMode ? "text-white/40" : "text-gray-400"}`}>
            No tasks scheduled for today. Click + to open Study Planner.
          </p>
        ) : (
          <div className="scrollbar-thin max-h-[224px] overflow-y-auto pr-1">
            {tasks.map((task) => {
              const isCompleting = completingId === task.id;
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
                  <button
                    type="button"
                    onClick={() => openConfirm(task)}
                    disabled={isCompleting || isRemoving}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                      isDarkMode
                        ? "border-white/5 bg-white/5 hover:bg-white/10 text-white"
                        : "border-white/80 bg-white/70 hover:bg-white text-[#292530]"
                    } disabled:cursor-default`}
                  >
                    {isCompleting ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8064C7]">
                        <CheckCircle2 size={14} className="text-white" />
                      </span>
                    ) : (
                      <Circle
                        size={20}
                        className={`shrink-0 transition-colors ${
                          isDarkMode ? "text-white/30" : "text-gray-300"
                        }`}
                      />
                    )}

                    <span
                      className={`text-sm font-semibold transition-all duration-300 ${
                        isCompleting
                          ? "opacity-40 line-through"
                          : "opacity-90"
                      }`}
                    >
                      {task.name}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={!!confirmTask}
        title="Mark Task Complete?"
        itemName={confirmTask?.name || ""}
        warningText="Completed tasks aren't kept — this will permanently remove it from your list."
        confirmText="Mark Complete"
        cancelText="Cancel"
        isLoading={isConfirmLoading}
        error={confirmError}
        onConfirm={confirmComplete}
        onCancel={cancelConfirm}
      />
    </>
  );
}

export default TodaysTasksCard;
