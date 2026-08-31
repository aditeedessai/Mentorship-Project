import React from "react";
import { CalendarRange, CheckCircle2, Circle } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

function getWeekDates(referenceDateStr) {
  const refDate = referenceDateStr ? new Date(`${referenceDateStr}T00:00:00`) : new Date();
  const dayOfWeek = refDate.getDay(); // 0 is Sun, 1 is Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(refDate);
  monday.setDate(refDate.getDate() + mondayOffset);

  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum = d.getDate();
    const monthName = d.toLocaleDateString("en-US", { month: "short" });
    week.push({ dateStr, dayName, dayNum, monthName });
  }
  return week;
}

export default function WeeklyPlan({
  selectedDate,
  tasks = [],
  onSelectDate,
  onToggleTaskComplete,
}) {
  const { isDarkMode } = useTheme();

  const weekDays = getWeekDates(selectedDate);
  const tasksByDate = {};
  tasks.forEach((t) => {
    if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
    tasksByDate[t.date].push(t);
  });

  return (
    <div
      className={`rounded-3xl border p-4 sm:p-6 backdrop-blur-2xl transition-all duration-300 ${isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
        }`}
    >
      <div className="flex items-center gap-2 mb-6">
        <CalendarRange size={20} className={isDarkMode ? "text-[#A78BFA]" : "text-[#8064C7]"} />
        <div>
          <h3 className="text-lg sm:text-xl font-black tracking-tight">This Week's Plan</h3>
          <p className={`text-xs ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
            Chronological overview of scheduled tasks
          </p>
        </div>
      </div>

      {/* 7 Days Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const dayTasks = tasksByDate[day.dateStr] || [];
          const isSelected = day.dateStr === selectedDate;
          const isToday = day.dateStr === new Date().toISOString().split("T")[0];

          return (
            <div
              key={day.dateStr}
              onClick={() => onSelectDate(day.dateStr)}
              className={`rounded-2xl border p-3 flex flex-col justify-between min-h-[140px] transition-all cursor-pointer ${isSelected
                  ? isDarkMode
                    ? "border-[#8064C7] bg-[#8064C7]/25 shadow-md"
                    : "border-[#8064C7] bg-[#8064C7]/15 shadow-sm"
                  : isToday
                    ? isDarkMode
                      ? "border-white/20 bg-white/10"
                      : "border-gray-300 bg-white"
                    : isDarkMode
                      ? "border-white/5 bg-white/5 hover:bg-white/10"
                      : "border-gray-100 bg-white hover:bg-gray-50 shadow-xs"
                }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between border-b border-inherit pb-2 mb-2">
                <span className="text-xs font-black uppercase tracking-wider">
                  {day.dayName}
                </span>
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${isToday
                      ? "bg-[#8064C7] text-white"
                      : isDarkMode
                        ? "text-white/50"
                        : "text-gray-400"
                    }`}
                >
                  {day.monthName} {day.dayNum}
                </span>
              </div>

              {/* Tasks List for Day */}
              <div className="flex-1 space-y-1.5 overflow-hidden">
                {dayTasks.length === 0 ? (
                  <p
                    className={`text-[11px] italic mt-2 ${isDarkMode ? "text-white/30" : "text-gray-400"
                      }`}
                  >
                    No tasks
                  </p>
                ) : (
                  dayTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-start gap-1.5 text-[11px] font-semibold leading-tight p-1 rounded-lg ${task.completed ? "opacity-50 line-through" : ""
                        }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTaskComplete(task.id);
                        }}
                        className="mt-0.5 shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle2 size={12} className="text-emerald-500" />
                        ) : (
                          <Circle size={12} className="opacity-50" />
                        )}
                      </button>
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
