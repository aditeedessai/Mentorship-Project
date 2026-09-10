import React from "react";
import { Plus, Sparkles } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import jojoCalendar from "../../assets/jojo-calendar.png";

const plannerAnimationStyles = `
@keyframes plannerOrbitClockwise {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes plannerOrbitCounter {
  from {
    transform: rotate(360deg);
  }
  to {
    transform: rotate(0deg);
  }
}

@keyframes plannerOrbitBubble {
  0%, 100% {
    transform: scale(1) translateY(0);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.2) translateY(-4px);
    opacity: 1;
  }
}

@keyframes plannerOrbitSparkle {
  0%, 100% {
    transform: rotate(0deg) scale(0.85);
    opacity: 0.5;
  }
  50% {
    transform: rotate(90deg) scale(1.15);
    opacity: 1;
  }
}

@keyframes plannerJojoFloat {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-7px) rotate(1deg);
  }
}

@keyframes plannerJojoGlow {
  0%, 100% {
    filter: drop-shadow(0 10px 16px rgba(128, 100, 199, 0.15));
  }
  50% {
    filter: drop-shadow(0 14px 24px rgba(128, 100, 199, 0.30));
  }
}

@keyframes plannerSoftPulse {
  0%, 100% {
    opacity: 0.35;
    transform: scale(0.95);
  }
  50% {
    opacity: 0.65;
    transform: scale(1.05);
  }
}

.planner-orbit-outer {
  animation: plannerOrbitClockwise 18s linear infinite;
}

.planner-orbit-inner {
  animation: plannerOrbitCounter 11s linear infinite;
}

.planner-orbit-bubble {
  animation: plannerOrbitBubble 2.4s ease-in-out infinite;
}

.planner-orbit-sparkle {
  animation: plannerOrbitSparkle 2s ease-in-out infinite;
}

.planner-jojo-float {
  animation:
    plannerJojoFloat 4s ease-in-out infinite,
    plannerJojoGlow 3.5s ease-in-out infinite;
}

.planner-soft-pulse {
  animation: plannerSoftPulse 3s ease-in-out infinite;
}

@media (max-width: 640px) {
  .planner-mascot-orbit {
    width: 190px;
    height: 190px;
  }

  .planner-orbit-outer {
    width: 175px;
    height: 175px;
  }

  .planner-orbit-inner {
    width: 130px;
    height: 130px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .planner-orbit-outer,
  .planner-orbit-inner,
  .planner-orbit-bubble,
  .planner-orbit-sparkle,
  .planner-jojo-float,
  .planner-soft-pulse {
    animation: none !important;
  }
}
`;

export default function PlannerHeader({ onAddTask, onAddExam }) {
  const { isDarkMode } = useTheme();

  return (
    <>
      <style>{plannerAnimationStyles}</style>

      <div
        className={`mb-8 flex flex-col items-start justify-between gap-6 rounded-3xl border p-5 sm:p-8 backdrop-blur-2xl transition-all duration-500 sm:flex-row sm:items-center ${
          isDarkMode
            ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            : "border-[#8064C7]/20 bg-gradient-to-r from-[#E5DCF8] to-[#F1EAFA] text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.06)]"
        }`}
      >
        {/* LEFT CONTENT */}
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

          {/* ACTION BUTTONS */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onAddTask}
              className="group flex items-center gap-2 rounded-xl bg-[#8064C7] px-5 sm:px-6 py-3 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(128,100,199,0.20)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#7357B9] cursor-pointer"
            >
              <Plus
                size={17}
                className="transition-transform duration-300 group-hover:rotate-90"
              />
              Add Task
            </button>

            <button
              type="button"
              onClick={onAddExam}
              className={`group flex items-center gap-2 rounded-xl border px-5 sm:px-6 py-3 text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5 cursor-pointer ${
                isDarkMode
                  ? "border-[#8064C7]/40 bg-[#8064C7]/20 text-[#A78BFA] hover:bg-[#8064C7]/30"
                  : "border-[#8064C7]/30 bg-white text-[#8064C7] hover:bg-[#8064C7]/10 shadow-xs"
              }`}
            >
              <Plus
                size={17}
                className="transition-transform duration-300 group-hover:rotate-90"
              />
              Add Exam
            </button>
          </div>
        </div>

        {/* JOJO + ORBIT */}
        <div className="relative flex h-40 w-40 sm:h-44 sm:w-44 md:h-52 md:w-52 shrink-0 items-center justify-center planner-mascot-orbit">

          {/* Soft glow behind Jojo */}
          <div
            className={`planner-soft-pulse absolute left-1/2 top-1/2 h-36 w-36 sm:h-40 sm:w-40 -ml-[72px] -mt-[72px] sm:-ml-[80px] sm:-mt-[80px] rounded-full blur-2xl ${
              isDarkMode ? "bg-[#8064C7]/20" : "bg-[#8064C7]/15"
            }`}
          />

          {/* Static outer ring */}
          <div
            className={`absolute left-1/2 top-1/2 h-[190px] w-[190px] -ml-[95px] -mt-[95px] rounded-full border ${
              isDarkMode
                ? "border-[#8064C7]/15"
                : "border-[#8064C7]/15"
            }`}
          />

          {/* OUTER ROTATING ORBIT */}
          <div className="planner-orbit-outer absolute left-1/2 top-1/2 h-[190px] w-[190px] -ml-[95px] -mt-[95px] rounded-full">

            {/* Top bubble */}
            <div
              className={`planner-orbit-bubble absolute left-1/2 top-0 -ml-2 h-4 w-4 rounded-full ${
                isDarkMode ? "bg-[#A58CDD]" : "bg-[#8064C7]"
              }`}
            />

            {/* Right sparkle */}
            <div className="planner-orbit-sparkle absolute right-1 top-1/2 -mt-2">
              <Sparkles
                size={15}
                className={isDarkMode ? "text-[#A58CDD]" : "text-[#8064C7]"}
              />
            </div>

            {/* Bottom bubble */}
            <div
              className={`planner-orbit-bubble absolute bottom-0 left-1/2 -ml-1.5 h-3 w-3 rounded-full ${
                isDarkMode ? "bg-[#45A9A9]" : "bg-[#45A9A9]"
              }`}
              style={{ animationDelay: "0.8s" }}
            />

            {/* Left sparkle */}
            <div className="planner-orbit-sparkle absolute left-1 top-1/2 -mt-2">
              <Sparkles
                size={13}
                className={isDarkMode ? "text-[#45A9A9]" : "text-[#45A9A9]"}
              />
            </div>
          </div>

          {/* INNER DASHED ORBIT */}
          <div
            className={`absolute left-1/2 top-1/2 h-[145px] w-[145px] -ml-[72.5px] -mt-[72.5px] rounded-full border border-dashed ${
              isDarkMode
                ? "border-[#A58CDD]/20"
                : "border-[#8064C7]/20"
            }`}
          />

          {/* INNER COUNTER ROTATING ORBIT */}
          <div className="planner-orbit-inner absolute left-1/2 top-1/2 h-[145px] w-[145px] -ml-[72.5px] -mt-[72.5px] rounded-full">

            {/* Small top sparkle */}
            <div className="planner-orbit-sparkle absolute left-1/2 top-0 -ml-2">
              <Sparkles
                size={11}
                className={isDarkMode ? "text-[#A58CDD]" : "text-[#8064C7]"}
              />
            </div>

            {/* Small right dot */}
            <div
              className={`planner-orbit-bubble absolute right-0 top-1/2 -mt-1.5 h-3 w-3 rounded-full ${
                isDarkMode ? "bg-[#8064C7]" : "bg-[#8064C7]"
              }`}
              style={{ animationDelay: "0.4s" }}
            />

            {/* Small bottom dot */}
            <div
              className={`planner-orbit-bubble absolute bottom-0 left-1/2 -ml-1 h-2 w-2 rounded-full ${
                isDarkMode ? "bg-[#45A9A9]" : "bg-[#45A9A9]"
              }`}
              style={{ animationDelay: "1.1s" }}
            />
          </div>

          {/* JOJO */}
          <div className="planner-jojo-float relative z-10 h-40 w-40 sm:h-44 sm:w-44 md:h-52 md:w-52">
            <img
              src={jojoCalendar}
              alt="Jojo planning your study schedule"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      </div>
    </>
  );
}