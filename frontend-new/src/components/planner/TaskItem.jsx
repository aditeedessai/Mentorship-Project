import React from "react";
import { CheckCircle2, Circle, BookOpen, Target, RotateCcw, FileText, CheckSquare, Clock } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { TASK_TYPES, PRIORITIES } from "../../data/plannerData";

const TYPE_ICONS = {
  BookOpen: BookOpen,
  Target: Target,
  RotateCcw: RotateCcw,
  FileText: FileText,
  CheckSquare: CheckSquare,
};

export default function TaskItem({ task, onToggleComplete }) {
  const { isDarkMode } = useTheme();

  const typeConfig = TASK_TYPES[task.type] || TASK_TYPES.Study;
  const priorityConfig = PRIORITIES[task.priority] || PRIORITIES.Medium;
  const TypeIcon = TYPE_ICONS[typeConfig.iconName] || BookOpen;

  return (
    <div
      className={`rounded-2xl border p-4 backdrop-blur-xl transition-all duration-300 flex items-start gap-3 sm:gap-4 ${
        task.completed
          ? isDarkMode
            ? "border-white/5 bg-white/[0.02] opacity-60"
            : "border-gray-200/50 bg-gray-50/50 opacity-70"
          : isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] hover:border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
          : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] hover:border-black/10 shadow-[0_2px_15px_rgba(0,0,0,0.02)]"
      }`}
    >
      {/* Interactive Checkbox */}
      <button
        type="button"
        onClick={() => onToggleComplete(task.id)}
        className="mt-0.5 shrink-0 transition-transform active:scale-95 cursor-pointer"
        aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"}
      >
        {task.completed ? (
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

      {/* Task Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4
            className={`font-semibold text-sm sm:text-base tracking-tight leading-snug break-words ${
              task.completed ? "line-through opacity-70" : ""
            }`}
          >
            {task.title}
          </h4>

          {/* Priority Pill */}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              task.priority === "High"
                ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                : task.priority === "Medium"
                ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                : "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
            }`}
          >
            {task.priority}
          </span>
        </div>

        {/* Task Metadata row */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {/* Category Badge */}
          <span
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold border ${
              isDarkMode
                ? "border-[#8064C7]/30 bg-[#8064C7]/20 text-[#A78BFA]"
                : "border-[#8064C7]/20 bg-[#8064C7]/10 text-[#8064C7]"
            }`}
          >
            <TypeIcon size={12} />
            <span>{task.type}</span>
          </span>

          {/* Study Set Badge */}
          {(task.studySet || task.subject) && (
            <span
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ${
                isDarkMode ? "bg-white/10 text-white/80" : "bg-gray-200/80 text-gray-700"
              }`}
              title="Study Set"
            >
              <BookOpen size={11} className="opacity-70" />
              <span>{task.studySet || task.subject}</span>
            </span>
          )}

          {/* Time Badge */}
          {task.time && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] ${
                isDarkMode ? "text-white/50" : "text-gray-500"
              }`}
            >
              <Clock size={12} />
              <span>{task.time}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
