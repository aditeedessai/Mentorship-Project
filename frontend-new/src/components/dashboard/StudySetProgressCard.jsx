import { useEffect, useState } from "react";
import { Layers, Loader2, AlertCircle, BookOpen, ChevronRight } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { fetchStudySets } from "../../services/api";

function StudySetProgressCard({ onNavigate }) {
  const { isDarkMode } = useTheme();
  const [studySets, setStudySets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadSets = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await fetchStudySets();
      setStudySets(data || []);
    } catch {
      setLoadError("Couldn't load study sets. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSets();
  }, []);

  const handleSeeAll = () => {
    if (onNavigate) {
      onNavigate("study-sets");
    }
  };

  const handleSetClick = (setId) => {
    if (onNavigate && setId) {
      onNavigate("study-set", { studySetId: setId });
    } else if (onNavigate) {
      onNavigate("study-sets");
    }
  };

  return (
    <div
      className={`flex flex-col rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-500 ${
        isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
      }`}
    >
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={22} className="text-[#8064C7]" />
          <h2 className="text-xl font-bold tracking-tight">
            Study Sets
          </h2>
        </div>

        <button
          type="button"
          onClick={handleSeeAll}
          className={`rounded-full border px-3.5 py-1 text-xs font-bold transition-all cursor-pointer ${
            isDarkMode
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-xs"
          }`}
        >
          See all
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 py-6 text-sm opacity-50">
          <Loader2 size={16} className="animate-spin" />
          Loading study sets...
        </div>
      ) : loadError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <div className="flex items-center gap-1.5 text-sm font-medium text-red-400">
            <AlertCircle size={16} />
            {loadError}
          </div>
          <button
            type="button"
            onClick={loadSets}
            className="text-xs font-bold text-[#8064C7] underline underline-offset-2 hover:text-[#8B6DD4]"
          >
            Retry
          </button>
        </div>
      ) : studySets.length === 0 ? (
        <p className={`flex-1 py-6 text-center text-sm ${isDarkMode ? "text-white/40" : "text-gray-400"}`}>
          No study sets yet.
        </p>
      ) : (
        <div className="flex-1 space-y-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
          {studySets.map((set) => {
            const setId = set.study_set_id || set.id;
            const name = set.name || "Untitled Study Set";

            return (
              <div
                key={setId || name}
                onClick={() => handleSetClick(setId)}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all cursor-pointer ${
                  isDarkMode
                    ? "border-white/5 bg-white/5 hover:bg-white/10 text-white"
                    : "border-white/80 bg-white/70 hover:bg-white text-[#231B33]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      isDarkMode ? "bg-[#8064C7]/20 text-[#A78BFA]" : "bg-[#8064C7]/10 text-[#8064C7]"
                    }`}
                  >
                    <BookOpen size={16} />
                  </div>
                  <span className="truncate text-sm font-bold">
                    {name}
                  </span>
                </div>

                <ChevronRight
                  size={16}
                  className={`shrink-0 ${isDarkMode ? "text-white/30" : "text-gray-400"}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StudySetProgressCard;

