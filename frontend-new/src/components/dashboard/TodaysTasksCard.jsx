import { useEffect, useState } from "react";
import { Plus, CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";
import DeleteConfirmModal from "../DeleteConfirmModal";
import { fetchTodaysTasks, createTask, deleteTask } from "../../services/api";

// Time the "just completed" state (checked + strikethrough) is held before
// the task collapses out of the list. Keep in sync with the collapse
// transition's own duration below.
const COMPLETED_HOLD_MS = 500;
const COLLAPSE_DURATION_MS = 300;

function TodaysTasksCard() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [isAdding, setIsAdding] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [addError, setAddError] = useState("");
  const [isAddSubmitting, setIsAddSubmitting] = useState(false);

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

  const openAddInput = () => {
    setIsAdding(true);
    setAddError("");
    setNewTaskName("");
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setNewTaskName("");
    setAddError("");
  };

  const confirmAdd = async () => {
    const trimmedName = newTaskName.trim();

    if (!trimmedName) {
      setAddError("Please enter a task name.");
      return;
    }

    setIsAddSubmitting(true);
    setAddError("");
    try {
      const created = await createTask(trimmedName);
      setTasks((prev) => [created, ...prev]);
      setNewTaskName("");
      setIsAdding(false);
    } catch {
      setAddError("Couldn't add task. Please try again.");
    } finally {
      setIsAddSubmitting(false);
    }
  };

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
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#3E3E75]">
            Today's Tasks
          </h2>

          <button
            type="button"
            onClick={openAddInput}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4E1F6E] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3E3E75] hover:shadow-md"
            aria-label="Add task"
          >
            <Plus size={18} />
          </button>
        </div>

        {isAdding && (
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={newTaskName}
                onChange={(e) => {
                  setNewTaskName(e.target.value);
                  if (addError) setAddError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmAdd();
                  if (e.key === "Escape") cancelAdd();
                }}
                disabled={isAddSubmitting}
                placeholder="Task name"
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#3E3E75] outline-none transition focus:border-[#4E1F6E] focus:ring-2 focus:ring-[#98E8DE]/40 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={confirmAdd}
                disabled={isAddSubmitting}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-[#4E1F6E] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#3E3E75] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAddSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Add"
                )}
              </button>
            </div>
            {addError && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {addError}
              </p>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            Loading tasks...
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <div className="flex items-center gap-1.5 text-sm font-medium text-red-500">
              <AlertCircle size={16} />
              {loadError}
            </div>
            <button
              type="button"
              onClick={loadTasks}
              className="text-xs font-semibold text-[#4E1F6E] underline underline-offset-2 hover:text-[#3E3E75]"
            >
              Retry
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            No tasks yet — add one to get started.
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
                    className="flex w-full items-center gap-3 rounded-xl bg-gray-50 p-3 text-left transition hover:bg-gray-100 disabled:cursor-default disabled:hover:bg-gray-50"
                  >
                    {isCompleting ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4E1F6E] transition-colors duration-300">
                        <CheckCircle2 size={14} className="text-white" />
                      </span>
                    ) : (
                      <Circle
                        size={20}
                        className="shrink-0 text-gray-300 transition-colors duration-300"
                      />
                    )}

                    <span
                      className={`text-sm font-medium transition-all duration-300 ${
                        isCompleting
                          ? "text-gray-400 line-through"
                          : "text-[#3E3E75]"
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
