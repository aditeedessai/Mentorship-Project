import { useEffect, useState } from "react";
import { Layers, Loader2, AlertCircle } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { fetchStudySetProgress } from "../../services/api";

function StudySetProgressCard() {
  const { isDarkMode } = useTheme();
  const [progress, setProgress] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadProgress = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await fetchStudySetProgress();
      setProgress(data);
    } catch {
      setLoadError("Couldn't load study set progress. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProgress();
  }, []);

  return (
    <div
      className={`flex flex-col rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-500 ${
        isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
      }`}
    >
      <div className="mb-5 flex items-center gap-2">
        <Layers size={22} className="text-[#8064C7]" />
        <h2 className="text-xl font-black tracking-tight">
          Study Set Progress
        </h2>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 py-6 text-sm opacity-50">
          <Loader2 size={16} className="animate-spin" />
          Loading progress...
        </div>
      ) : loadError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <div className="flex items-center gap-1.5 text-sm font-medium text-red-400">
            <AlertCircle size={16} />
            {loadError}
          </div>
          <button
            type="button"
            onClick={loadProgress}
            className="text-xs font-bold text-[#8064C7] underline underline-offset-2 hover:text-[#8B6DD4]"
          >
            Retry
          </button>
        </div>
      ) : progress.length === 0 ? (
        <p className={`flex-1 py-6 text-center text-sm ${isDarkMode ? "text-white/40" : "text-gray-400"}`}>
          No study sets yet.
        </p>
      ) : (
        <div className="flex-1 space-y-5">
          {progress.map((set) => {
            const isComplete = set.sections_completed >= set.total_sections;
            const percent = Math.min(
              100,
              (set.sections_completed / set.total_sections) * 100
            );

            return (
              <div key={set.study_set_id}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="truncate text-sm font-bold">
                    {set.name}
                  </span>
                  <span className={`shrink-0 text-xs font-semibold ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                    {set.sections_completed}/{set.total_sections} sections
                  </span>
                </div>

                <div className={`h-3 w-full overflow-hidden rounded-full ${isDarkMode ? "bg-white/10" : "bg-black/10"}`}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: isComplete ? "#10B981" : "#8064C7",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StudySetProgressCard;

