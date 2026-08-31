import React, { useState } from "react";
import { CalendarCheck, Plus, ChevronDown } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import TaskItem from "./TaskItem";

function formatHeaderDate(dateKey) {
  const todayStr = new Date().toISOString().split("T")[0];
  if (dateKey === todayStr) return "Today";

  const parts = dateKey.split("-");
  if (parts.length !== 3) return dateKey;
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DailySchedule({
  selectedDate,
  tasks = [],
  onToggleTaskComplete,
  onAddTaskClick,
  filterStatus = "all",
  onFilterStatusChange,
}) {
  const { isDarkMode } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter tasks for the selected date first or globally based on status filter
  const todayStr = new Date().toISOString().split("T")[0];

  const dateTasks = tasks.filter((t) => {
    // Apply status filter
    if (filterStatus === "today" && t.date !== todayStr) return false;
    if (filterStatus === "upcoming" && t.date <= todayStr) return false;
    if (filterStatus === "completed" && !t.completed) return false;

    // Apply default date selection if status is 'all'
    if (filterStatus === "all" && t.date !== selectedDate) return false;

    return true;
  });

  const formattedDateTitle = formatHeaderDate(selectedDate);

  return (
    <div
      className={`rounded-3xl border p-4 sm:p-6 backdrop-blur-2xl transition-all duration-300 flex flex-col h-full ${
        isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
      }`}
    >
      {/* Schedule Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <span
            className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${
              isDarkMode ? "text-white/40" : "text-gray-400"
            }`}
          >
            Daily Schedule
          </span>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight mt-0.5">
            Schedule for {formattedDateTitle}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Collapse/Expand Toggle Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`flex h-8 w-8 items-center justify-center rounded-xl border transition cursor-pointer ${
              isDarkMode
                ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
            aria-label={isCollapsed ? "Expand schedule" : "Collapse schedule"}
            title={isCollapsed ? "Expand schedule" : "Collapse schedule"}
          >
            <ChevronDown
              size={16}
              className={`transition-transform duration-300 ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
            />
          </button>

          <button
            type="button"
            onClick={onAddTaskClick}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
              isDarkMode
                ? "border-white/10 bg-white/5 text-[#A78BFA] hover:bg-white/10"
                : "border-gray-200 bg-white text-[#8064C7] hover:bg-gray-50 shadow-xs"
            }`}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Expandable / Collapsible Schedule Content */}
      <div
        className={`transition-all duration-300 overflow-hidden ${
          isCollapsed ? "max-h-0 opacity-0 hidden" : "max-h-[2000px] opacity-100"
        }`}
      >
        {/* Filter Toolbar (Status Tabs only) */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-inherit">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {[
              { id: "all", label: "Selected Date" },
              { id: "today", label: "Today" },
              { id: "upcoming", label: "Upcoming" },
              { id: "completed", label: "Completed" },
            ].map((tab) => {
              const isActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onFilterStatusChange(tab.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-[#8064C7] text-white shadow-xs"
                      : isDarkMode
                      ? "text-white/60 hover:bg-white/10 hover:text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Task List Container */}
        <div className="flex-1 space-y-3 overflow-y-auto max-h-[420px] pr-1 scrollbar-thin">
          {dateTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  isDarkMode ? "bg-white/5 text-white/30" : "bg-gray-100 text-gray-400"
                }`}
              >
                <CalendarCheck size={24} />
              </div>
              <div>
                <p
                  className={`font-bold text-sm ${
                    isDarkMode ? "text-white/70" : "text-gray-700"
                  }`}
                >
                  No tasks found for this view
                </p>
                <p
                  className={`text-xs mt-0.5 ${
                    isDarkMode ? "text-white/40" : "text-gray-400"
                  }`}
                >
                  Click "+ Add Task" to schedule a study session.
                </p>
              </div>
            </div>
          ) : (
            dateTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={onToggleTaskComplete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
