import React, { useState } from "react";
import { CalendarRange, CheckCircle2, Circle, Award, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

function formatLocalIsoDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekDates(referenceDateStr, weekOffset = 0) {
  let refDate;
  if (referenceDateStr && referenceDateStr.split("-").length === 3) {
    const parts = referenceDateStr.split("-");
    refDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else {
    refDate = new Date();
  }
  refDate.setHours(0, 0, 0, 0);

  // Apply week offset (+7 or -7 days per weekOffset)
  if (weekOffset !== 0) {
    refDate.setDate(refDate.getDate() + weekOffset * 7);
  }

  const dayOfWeek = refDate.getDay(); // 0 is Sun, 1 is Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(refDate);
  monday.setDate(refDate.getDate() + mondayOffset);

  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = formatLocalIsoDate(d);
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
  exams = [],
  onSelectDate,
  onToggleTaskComplete,
}) {
  const { isDarkMode } = useTheme();
  const [weekOffset, setWeekOffset] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const weekDays = getWeekDates(selectedDate, weekOffset);
  const todayStr = formatLocalIsoDate(new Date());

  const tasksByDate = {};
  tasks.forEach((t) => {
    if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
    tasksByDate[t.date].push(t);
  });

  const examsByDate = {};
  exams.forEach((e) => {
    const dateKey = String(e.exam_date || "").split("T")[0];
    if (!examsByDate[dateKey]) examsByDate[dateKey] = [];
    examsByDate[dateKey].push(e);
  });

  return (
    <div
      className={`rounded-3xl border p-4 sm:p-6 backdrop-blur-2xl transition-all duration-300 ${
        isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
      }`}
    >
      {/* Header with Title and Week Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <CalendarRange size={20} className={isDarkMode ? "text-[#A78BFA]" : "text-[#8064C7]"} />
          <div>
            <h3 className="text-lg sm:text-xl font-black tracking-tight">This Week's Plan</h3>
            <p className={`text-xs ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
              Chronological overview of scheduled tasks & upcoming exams
            </p>
          </div>
        </div>

        {/* Week Navigation & Collapse Controls */}
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
            aria-label={isCollapsed ? "Expand weekly plan" : "Collapse weekly plan"}
            title={isCollapsed ? "Expand section" : "Collapse section"}
          >
            <ChevronDown
              size={16}
              className={`transition-transform duration-300 ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
            />
          </button>

          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                isDarkMode
                  ? "border-white/10 bg-white/5 text-[#A78BFA] hover:bg-white/10"
                  : "border-gray-200 bg-white text-[#8064C7] hover:bg-gray-50 shadow-xs"
              }`}
            >
              This Week
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className={`flex h-8 w-8 items-center justify-center rounded-xl border transition cursor-pointer ${
                isDarkMode
                  ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
              aria-label="Previous Week"
              title="Previous Week"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className={`flex h-8 w-8 items-center justify-center rounded-xl border transition cursor-pointer ${
                isDarkMode
                  ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
              aria-label="Next Week"
              title="Next Week"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable / Collapsible Section Content */}
      <div
        className={`transition-all duration-300 overflow-hidden ${
          isCollapsed ? "max-h-0 opacity-0 hidden" : "max-h-[2000px] opacity-100"
        }`}
      >
        {/* 7 Days Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayTasks = tasksByDate[day.dateStr] || [];
            const dayExams = examsByDate[day.dateStr] || [];
            const hasItems = dayTasks.length > 0 || dayExams.length > 0;

            const isSelected = day.dateStr === selectedDate;
            const isToday = day.dateStr === todayStr;

            return (
              <div
                key={day.dateStr}
                onClick={() => onSelectDate(day.dateStr)}
                className={`rounded-2xl border p-3 flex flex-col justify-between min-h-[150px] transition-all cursor-pointer ${
                  isSelected
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
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                      isToday
                        ? "bg-[#8064C7] text-white"
                        : isDarkMode
                        ? "text-white/50"
                        : "text-gray-400"
                    }`}
                  >
                    {day.monthName} {day.dayNum}
                  </span>
                </div>

                {/* Items List for Day (Tasks + Exams) */}
                <div className="flex-1 space-y-1.5 overflow-hidden">
                  {!hasItems ? (
                    <p
                      className={`text-[11px] italic mt-2 ${
                        isDarkMode ? "text-white/30" : "text-gray-400"
                      }`}
                    >
                      No items
                    </p>
                  ) : (
                    <>
                      {/* Exams */}
                      {dayExams.map((exam) => {
                        const examName = exam.subject || exam.name || "Exam";
                        return (
                          <div
                            key={`exam-${exam.id}`}
                            className={`flex items-start gap-1 text-[11px] font-bold p-1 rounded-lg ${
                              isDarkMode
                                ? "bg-amber-500/15 text-amber-300"
                                : "bg-amber-100 text-amber-800"
                            }`}
                            title={`Exam: ${examName}`}
                          >
                            <Award size={12} className="mt-0.5 shrink-0 text-amber-500" />
                            <span className="truncate">{examName}</span>
                          </div>
                        );
                      })}

                      {/* Tasks */}
                      {dayTasks.map((task) => (
                        <div
                          key={`task-${task.id}`}
                          className={`flex items-start gap-1.5 text-[11px] font-semibold leading-tight p-1 rounded-lg ${
                            task.completed ? "opacity-50 line-through" : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onToggleTaskComplete) onToggleTaskComplete(task.id);
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
                      ))}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
