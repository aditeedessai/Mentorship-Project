import React from "react";
import { CheckCircle2, Calendar, Award, Flame } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function PlannerSummary({
  tasksTodayCount = 0,
  completedTodayCount = 0,
  upcomingExamsCount = 0,
  studyStreakDays = 5,
}) {
  const { isDarkMode } = useTheme();

  const cards = [
    {
      title: "Tasks Today",
      value: tasksTodayCount,
      subtitle: "Scheduled for today",
      icon: Calendar,
      color: "purple",
    },
    {
      title: "Completed",
      value: completedTodayCount,
      subtitle: "Tasks done today",
      icon: CheckCircle2,
      color: "emerald",
    },
    {
      title: "Upcoming Exams",
      value: upcomingExamsCount,
      subtitle: "Next 30 days",
      icon: Award,
      color: "blue",
    },
    {
      title: "Study Streak",
      value: `${studyStreakDays} days`,
      subtitle: "Keep it going!",
      icon: Flame,
      color: "amber",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;

        return (
          <div
            key={idx}
            className={`rounded-2xl border p-4 sm:p-5 backdrop-blur-2xl transition-all duration-300 flex flex-col justify-between ${
              isDarkMode
                ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)] hover:border-white/15"
                : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)] hover:border-black/10"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span
                className={`text-xs font-bold ${
                  isDarkMode ? "text-white/60" : "text-[#706A78]"
                }`}
              >
                {card.title}
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  isDarkMode ? "bg-white/5" : "bg-[#8064C7]/10"
                }`}
              >
                <Icon
                  size={16}
                  className={isDarkMode ? "text-[#A78BFA]" : "text-[#8064C7]"}
                />
              </div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#8064C7] dark:text-[#A78BFA]">
                {card.value}
              </div>
              <p
                className={`text-[11px] mt-0.5 ${
                  isDarkMode ? "text-white/40" : "text-gray-400"
                }`}
              >
                {card.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
