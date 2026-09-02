import { useEffect, useState } from "react";
import {
  Calculator,
  Atom,
  Brain,
  BookOpen,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { fetchExams, fetchStudySets } from "../../services/api";

const getSubjectIcon = (subject) => {
  const name = subject.toLowerCase();
  if (name.includes("calc") || name.includes("math")) return Calculator;
  if (name.includes("phys") || name.includes("atom") || name.includes("chem")) return Atom;
  if (name.includes("psych") || name.includes("brain")) return Brain;
  return BookOpen;
};

function getDaysLabel(examDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${examDate}T00:00:00`);
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

function formatExamDate(examDate) {
  return new Date(`${examDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function UpcomingExamsCard({ onSeeAll, onNavigate }) {
  const { isDarkMode } = useTheme();
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [studySets, setStudySets] = useState([]);

  const getStudySetName = (id) =>
    studySets.find((set) => set.study_set_id === id)?.name;

  const loadExams = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await fetchExams();
      setExams(data);
    } catch {
      setLoadError("Couldn't load upcoming exams. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
    fetchStudySets()
      .then((data) => setStudySets(data))
      .catch(() => setStudySets([]));
  }, []);

  return (
    <div
      className={`flex flex-col rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-500 ${
        isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
      }`}
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">
          Upcoming Exams
        </h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (onNavigate ? onNavigate("planner") : onSeeAll?.())}
            className={`rounded-full border px-3.5 py-1 text-xs font-bold transition-all cursor-pointer ${
              isDarkMode
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-xs"
            }`}
          >
            See all
          </button>

          <button
            type="button"
            onClick={() => (onNavigate ? onNavigate("planner") : onSeeAll?.())}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8064C7] text-white shadow-[0_10px_25px_rgba(128,100,199,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8B6DD4] cursor-pointer"
            aria-label="Go to Study Planner"
            title="Go to Study Planner to add exams"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm opacity-50">
          <Loader2 size={16} className="animate-spin" />
          Loading exams...
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <div className="flex items-center gap-1.5 text-sm font-medium text-red-400">
            <AlertCircle size={16} />
            {loadError}
          </div>
          <button
            type="button"
            onClick={loadExams}
            className="text-xs font-bold text-[#8064C7] underline underline-offset-2 hover:text-[#8B6DD4]"
          >
            Retry
          </button>
        </div>
      ) : exams.length === 0 ? (
        <p className={`py-6 text-center text-sm ${isDarkMode ? "text-white/40" : "text-gray-400"}`}>
          No upcoming exams. Click + to open Study Planner.
        </p>
      ) : (
        <div className="scrollbar-thin max-h-[224px] overflow-y-auto pr-1 space-y-3">
          {exams.map((exam) => {
            const Icon = getSubjectIcon(exam.subject);

            return (
              <div
                key={exam.id}
                className="overflow-hidden transition-all duration-300 ease-in-out"
              >
                <div
                  className={`flex items-center gap-3.5 rounded-2xl border p-3.5 transition-all ${
                    isDarkMode
                      ? "border-white/5 bg-white/5 text-white"
                      : "border-white/80 bg-white/70 text-[#231B33]"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
                    <Icon size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="truncate text-sm font-bold">
                        {exam.subject}
                      </p>
                      {exam.study_set_id && (
                        <span
                          title={getStudySetName(exam.study_set_id) || undefined}
                          className={`max-w-[110px] shrink-0 truncate rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            isDarkMode
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {getStudySetName(exam.study_set_id) || "Set Linked"}
                        </span>
                      )}
                    </div>
                    <p className={`truncate text-xs ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                      {exam.exam_type} • {getDaysLabel(exam.exam_date)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {formatExamDate(exam.exam_date)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default UpcomingExamsCard;
