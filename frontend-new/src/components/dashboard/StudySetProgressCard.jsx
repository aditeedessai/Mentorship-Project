import { useEffect, useState } from "react";
import { Layers, Loader2, AlertCircle } from "lucide-react";
import { fetchStudySetProgress } from "../../services/api";

function StudySetProgressCard() {
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
    <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <Layers size={20} className="text-[#4E1F6E]" />
        <h2 className="text-xl font-semibold text-[#3E3E75]">
          Study Set Progress
        </h2>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 py-6 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          Loading progress...
        </div>
      ) : loadError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <div className="flex items-center gap-1.5 text-sm font-medium text-red-500">
            <AlertCircle size={16} />
            {loadError}
          </div>
          <button
            type="button"
            onClick={loadProgress}
            className="text-xs font-semibold text-[#4E1F6E] underline underline-offset-2 hover:text-[#3E3E75]"
          >
            Retry
          </button>
        </div>
      ) : progress.length === 0 ? (
        <p className="flex-1 py-6 text-center text-sm text-gray-400">
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
                  <span className="truncate text-sm font-medium text-[#3E3E75]">
                    {set.name}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-gray-500">
                    {set.sections_completed}/{set.total_sections} sections
                  </span>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: isComplete ? "#1D9E75" : "#4E1F6E",
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
