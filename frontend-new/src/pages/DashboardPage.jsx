import { BookOpen, Sparkles } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import TodaysTasksCard from "../components/dashboard/TodaysTasksCard";
import UpcomingExamsCard from "../components/dashboard/UpcomingExamsCard";
import StudySetProgressCard from "../components/dashboard/StudySetProgressCard";
import ActivityCalendarCard from "../components/dashboard/ActivityCalendarCard";
import MotivationalTaglineCard from "../components/dashboard/MotivationalTaglineCard";
import jojoImage from "../assets/jojo-transparent-clean.png";

function DashboardPage({ user, onNavigate }) {
  const { isDarkMode } = useTheme();

  return (
    <div>
      {/* ================= GREETING BANNER ================= */}
      <div
        className={`mb-8 flex flex-col items-start justify-between gap-6 rounded-3xl border p-5 sm:p-8 backdrop-blur-2xl transition-all duration-500 sm:flex-row sm:items-center ${isDarkMode
            ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            : "border-[#8064C7]/20 bg-gradient-to-r from-[#E5DCF8] to-[#F1EAFA] text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.06)]"
          }`}
      >
        {/* LEFT SIDE */}
        <div>
          <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-black tracking-tight">
            Hi {user?.name || "Alex"}!
            <Sparkles size={24} className="text-[#8064C7]" />
          </h1>

          <p
            className={`mt-2 text-xs sm:text-sm font-medium ${isDarkMode ? "text-white/50" : "text-[#706A78]"
              }`}
          >
            Learn something new. Master something more.
          </p>

          <button
            onClick={() => onNavigate?.("upload")}
            className="mt-6 flex items-center gap-2 rounded-xl bg-[#8064C7] px-5 sm:px-6 py-3 text-xs font-bold text-white shadow-[0_8px_20px_rgba(128,100,199,0.20)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#7357B9]"
          >
            <BookOpen size={17} />
            Create Study Set
          </button>
        </div>

        {/* ================= JOJO ================= */}
        <div className="relative flex h-32 w-32 sm:h-40 sm:w-40 shrink-0 items-end justify-center">
          {/* Soft Jojo glow */}
          <div
            className={`absolute bottom-4 h-24 w-24 rounded-full blur-3xl ${isDarkMode ? "bg-[#8064C7]/20" : "bg-[#8064C7]/15"
              }`}
          />

          <img
            src={jojoImage}
            alt="Jojo - JOT study buddy"
            className="relative z-10 h-full w-full object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.12)] transition-transform duration-300 hover:-translate-y-1"
          />
        </div>
      </div>

      {/* ================= DASHBOARD CARDS ================= */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-1 min-w-0 flex-col gap-6">
          <TodaysTasksCard onNavigate={onNavigate} />
          <StudySetProgressCard />
          <MotivationalTaglineCard />
        </div>

        <div className="flex flex-1 min-w-0 flex-col gap-6">
          <UpcomingExamsCard onNavigate={onNavigate} onSeeAll={() => onNavigate("planner")} />
          <ActivityCalendarCard />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;