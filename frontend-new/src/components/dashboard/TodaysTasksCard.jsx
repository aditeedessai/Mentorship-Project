import { useState } from "react";
import { Plus, CheckCircle2, Circle } from "lucide-react";

const INITIAL_TASKS = [
  { id: 1, name: "Review Calculus notes", completed: true },
  { id: 2, name: "Complete Physics quiz", completed: false },
  { id: 3, name: "Revise Psychology", completed: false },
];

function TodaysTasksCard() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [addError, setAddError] = useState("");

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

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

  const confirmAdd = () => {
    const trimmedName = newTaskName.trim();

    if (!trimmedName) {
      setAddError("Please enter a task name.");
      return;
    }

    setTasks((prev) => [
      ...prev,
      { id: Date.now(), name: trimmedName, completed: false },
    ]);
    setNewTaskName("");
    setAddError("");
    setIsAdding(false);
  };

  return (
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
              placeholder="Task name"
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#3E3E75] outline-none transition focus:border-[#4E1F6E] focus:ring-2 focus:ring-[#98E8DE]/40"
            />
            <button
              type="button"
              onClick={confirmAdd}
              className="rounded-lg bg-[#4E1F6E] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#3E3E75]"
            >
              Add
            </button>
          </div>
          {addError && (
            <p className="mt-1.5 text-xs font-medium text-red-500">
              {addError}
            </p>
          )}
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          No tasks yet — add one to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => toggleTask(task.id)}
              className="flex w-full items-center gap-3 rounded-xl bg-gray-50 p-3 text-left transition hover:bg-gray-100"
            >
              {task.completed ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4E1F6E]">
                  <CheckCircle2 size={14} className="text-white" />
                </span>
              ) : (
                <Circle size={20} className="shrink-0 text-gray-300" />
              )}

              <span
                className={`text-sm font-medium ${
                  task.completed
                    ? "text-gray-400 line-through"
                    : "text-[#3E3E75]"
                }`}
              >
                {task.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default TodaysTasksCard;
