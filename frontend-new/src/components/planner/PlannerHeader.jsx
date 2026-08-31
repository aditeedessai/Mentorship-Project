import React from "react";
import { Plus, CalendarDays } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function PlannerHeader({ onAddTask }) {
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`mb-8 flex flex-col items-start justify-between gap-6 rounded-3xl border p-5 sm:p-8 backdrop-blur-2xl transition-all duration-500 sm:flex-row sm:items-center ${
        isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          : "border-[#8064C7]/20 bg-gradient-to-r from-[#E5DCF8] to-[#F1EAFA] text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.06)]"
      }`}
    >
      <div>
        <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-bold tracking-tight">
          Study Planner
        </h1>
        <p
          className={`mt-2 text-xs sm:text-sm font-medium ${
            isDarkMode ? "text-white/60" : "text-[#706A78]"
          }`}
        >
          Plan your study sessions, track your tasks, and stay prepared for upcoming exams.
        </p>
        <button
          type="button"
          onClick={onAddTask}
          className="mt-6 flex items-center gap-2 rounded-xl bg-[#8064C7] px-5 sm:px-6 py-3 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(128,100,199,0.20)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#7357B9] cursor-pointer"
        >
          <Plus size={17} />
          Add Task
        </button>
      </div>

      <div
        className={`flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl border backdrop-blur-xl ${
          isDarkMode
            ? "border-white/10 bg-white/5 text-[#A78BFA]"
            : "border-black/5 bg-white/80 text-[#8064C7] shadow-xs"
        }`}
      >
        <CalendarDays size={36} />
      </div>
    </div>
  );
}
