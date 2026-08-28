import { BookOpen, GraduationCap, Sparkles } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import TodaysTasksCard from "../components/dashboard/TodaysTasksCard";
import UpcomingExamsCard from "../components/dashboard/UpcomingExamsCard";
import StudySetProgressCard from "../components/dashboard/StudySetProgressCard";
import ActivityCalendarCard from "../components/dashboard/ActivityCalendarCard";
import MotivationalTaglineCard from "../components/dashboard/MotivationalTaglineCard";

function DashboardPage({ user, onNavigate }) {
  const { isDarkMode } = useTheme();

  return (
    <div>
      {/* ================= GREETING BANNER ================= */}
      <div
        className={`mb-8 flex flex-col items-start justify-between gap-6 rounded-3xl border p-8 backdrop-blur-2xl transition-all duration-500 sm:flex-row sm:items-center ${
          isDarkMode
            ? "border-white/10 bg-[#17131F]/80 text-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            : "border-white/80 bg-white/60 text-[#292530] shadow-[0_18px_50px_rgba(70,55,110,0.1)]"
        }`}
      >
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
            Hi {user?.name || "Alex"}!
            <Sparkles size={26} className="text-[#8064C7]" />
          </h1>
          <p
            className={`mt-2 text-sm font-medium ${
              isDarkMode ? "text-white/60" : "text-[#706A78]"
            }`}
          >
            Learn something new. Master something more.
          </p>

          <button
            onClick={() => onNavigate?.("upload")}
            className="mt-6 flex items-center gap-2 rounded-xl bg-[#8064C7] px-6 py-3.5 text-sm font-bold text-white shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8B6DD4]"
          >
            <BookOpen size={18} />
            Create Study Set
          </button>
        </div>

        <div
          className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border backdrop-blur-xl ${
            isDarkMode
              ? "border-white/10 bg-white/5 text-[#A78BFA]"
              : "border-white/80 bg-white/80 text-[#8064C7] shadow-sm"
          }`}
        >
          <GraduationCap size={48} />
        </div>
      </div>

      {/* ================= DASHBOARD CARDS ================= */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col gap-6">
          <TodaysTasksCard />
          <StudySetProgressCard />
          <MotivationalTaglineCard />
        </div>

        <div className="flex flex-1 flex-col gap-6">
          <UpcomingExamsCard />
          <ActivityCalendarCard />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;

