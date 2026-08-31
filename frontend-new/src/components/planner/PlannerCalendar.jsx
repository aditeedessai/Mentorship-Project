import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeekOffset(year, month) {
  // Returns 0 for Mon, 1 for Tue, ..., 6 for Sun
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatDateKey(year, month, day) {
  const y = year;
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function PlannerCalendar({
  selectedDate,
  onSelectDate,
  tasks = [],
  exams = [],
}) {
  const { isDarkMode } = useTheme();

  // Initialize display month from selectedDate or today
  const today = new Date();
  const initialYear = selectedDate ? parseInt(selectedDate.split("-")[0], 10) : today.getFullYear();
  const initialMonth = selectedDate ? parseInt(selectedDate.split("-")[1], 10) - 1 : today.getMonth();

  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleTodayClick = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    onSelectDate(todayKey);
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const offsetDays = getFirstDayOfWeekOffset(currentYear, currentMonth);

  // Group tasks and exams by date key ("YYYY-MM-DD")
  const tasksByDate = {};
  tasks.forEach((task) => {
    if (!tasksByDate[task.date]) tasksByDate[task.date] = [];
    tasksByDate[task.date].push(task);
  });

  const examsByDate = {};
  exams.forEach((exam) => {
    if (!examsByDate[exam.exam_date]) examsByDate[exam.exam_date] = [];
    examsByDate[exam.exam_date].push(exam);
  });

  const monthName = new Date(currentYear, currentMonth, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className={`rounded-3xl border p-4 sm:p-6 backdrop-blur-2xl transition-all duration-300 ${
        isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
      }`}
    >
      {/* Calendar Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <CalendarIcon size={20} className={isDarkMode ? "text-[#A78BFA]" : "text-[#8064C7]"} />
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">{monthName}</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Color Legend */}
          <div className="hidden sm:flex items-center gap-3 mr-2 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#8064C7] dark:bg-[#A78BFA]" />
              <span className={isDarkMode ? "text-white/60" : "text-gray-500"}>Tasks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className={isDarkMode ? "text-white/60" : "text-gray-500"}>Exams</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTodayClick}
            className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
              isDarkMode
                ? "border-white/10 bg-white/5 text-[#A78BFA] hover:bg-white/10"
                : "border-gray-200 bg-white text-[#8064C7] hover:bg-gray-50 shadow-xs"
            }`}
          >
            Today
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className={`flex h-8 w-8 items-center justify-center rounded-xl border transition ${
                isDarkMode
                  ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
              aria-label="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className={`flex h-8 w-8 items-center justify-center rounded-xl border transition ${
                isDarkMode
                  ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
              aria-label="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Header: Weekdays */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className={`py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
              isDarkMode ? "text-white/40" : "text-gray-400"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid Body: Dates */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* Offset padding cells for first week */}
        {Array.from({ length: offsetDays }).map((_, idx) => (
          <div key={`offset-${idx}`} className="h-10 sm:h-14 rounded-2xl" />
        ))}

        {/* Days of current month */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const dateKey = formatDateKey(currentYear, currentMonth, dayNum);

          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedDate;

          const dayTasks = tasksByDate[dateKey] || [];
          const dayExams = examsByDate[dateKey] || [];
          const hasEvents = dayTasks.length > 0 || dayExams.length > 0;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              className={`relative flex flex-col items-center justify-between h-11 sm:h-14 p-1 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? "border-[#8064C7] bg-[#8064C7] text-white shadow-md scale-105 z-10 font-bold"
                  : isToday
                  ? isDarkMode
                    ? "border-[#8064C7]/50 bg-[#8064C7]/20 text-[#A78BFA] font-bold"
                    : "border-[#8064C7]/30 bg-[#8064C7]/10 text-[#8064C7] font-bold"
                  : isDarkMode
                  ? "border-white/5 bg-white/5 hover:bg-white/10 text-white/80"
                  : "border-gray-100 bg-white/70 hover:bg-white text-gray-800 shadow-xs"
              }`}
            >
              <span className="text-xs sm:text-sm">{dayNum}</span>

              {/* Event Dots (Purple = Tasks, Orange = Exams) */}
              {hasEvents && (
                <div className="flex items-center gap-1 mb-1">
                  {dayTasks.length > 0 && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isSelected ? "bg-white" : "bg-[#8064C7] dark:bg-[#A78BFA]"
                      }`}
                      title={`${dayTasks.length} task(s) (Purple)`}
                    />
                  )}
                  {dayExams.length > 0 && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isSelected ? "bg-amber-300" : "bg-amber-500"
                      }`}
                      title={`${dayExams.length} exam(s) (Orange)`}
                    />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile Legend Footer */}
      <div className="sm:hidden flex items-center justify-center gap-4 mt-3 pt-3 border-t border-inherit text-xs font-semibold">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#8064C7] dark:bg-[#A78BFA]" />
          <span className={isDarkMode ? "text-white/60" : "text-gray-500"}>Tasks (Purple)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className={isDarkMode ? "text-white/60" : "text-gray-500"}>Exams (Orange)</span>
        </div>
      </div>
    </div>
  );
}
