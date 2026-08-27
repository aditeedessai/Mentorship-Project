import { BookOpen, GraduationCap, Sparkles } from "lucide-react";
import TodaysTasksCard from "../components/dashboard/TodaysTasksCard";
import UpcomingExamsCard from "../components/dashboard/UpcomingExamsCard";
import StudySetProgressCard from "../components/dashboard/StudySetProgressCard";
import ActivityCalendarCard from "../components/dashboard/ActivityCalendarCard";
import MotivationalTaglineCard from "../components/dashboard/MotivationalTaglineCard";

function DashboardPage({ user, onNavigate }) {
  return (
    <div>
      {/* ================= GREETING BANNER ================= */}
      <div className="mb-8 flex flex-col items-start justify-between gap-6 rounded-2xl bg-[#98E8DE]/25 p-8 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-[#4E1F6E]">
            Hi {user?.name || "Alex"}!
            <Sparkles size={26} className="text-[#4E1F6E]" />
          </h1>
          <p className="mt-2 text-sm text-[#3E3E75]/70">
            Learn something new. Master something more.
          </p>

          <button
            onClick={() => onNavigate?.("upload")}
            className="mt-5 flex items-center gap-2 rounded-lg bg-[#4E1F6E] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3E3E75] hover:shadow-md"
          >
            <BookOpen size={18} />
            Create Study Set
          </button>
        </div>

        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white/60">
          <GraduationCap size={44} className="text-[#4E1F6E]" />
        </div>
      </div>

      {/* ================= DASHBOARD CARDS ================= */}
      {/* Two flex columns of independent height/content, stretched to an
          equal overall height; the last card in each column (tagline /
          activity) grows with flex-1 to absorb the leftover space so
          both columns' bottoms land on the same line. */}
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
