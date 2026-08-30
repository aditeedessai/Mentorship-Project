import { BookOpen, Sparkles, Eye } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

function StudySetHeroHeaderCard({ studySetName, studySetId, onNavigate }) {
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-6 lg:p-8 backdrop-blur-2xl transition-all duration-500 ${
        isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          : "border-[#8064C7]/20 bg-gradient-to-r from-[#E5DCF8] to-[#F1EAFA] text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.06)]"
      }`}
    >
      <div className="absolute -top-12 -right-12 w-56 h-56 bg-[#8064C7]/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full font-mono text-xs font-bold uppercase tracking-wider ${
              isDarkMode
                ? "bg-[#8064C7]/20 border border-[#8064C7]/30 text-[#A78BFA]"
                : "bg-[#8064C7]/10 border border-[#8064C7]/20 text-[#8064C7]"
            }`}>
              <BookOpen size={14} />
              STUDY SET
            </span>

            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isDarkMode
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-emerald-100 text-emerald-700"
            }`}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
            {studySetName}
          </h1>
          <p className={`text-sm max-w-xl leading-relaxed ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>
            View documents, practice flashcards, or generate a customized study quiz.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate?.("quiz", { studySetId })}
            className="flex items-center justify-center gap-2.5 bg-[#8064C7] hover:bg-[#8B6DD4] text-white rounded-xl px-6 py-3.5 font-bold text-sm shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition-all duration-300 hover:-translate-y-0.5"
          >
            <Sparkles size={18} />
            <span>Generate Quiz</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.("results", { studySetId })}
            className={`flex items-center justify-center gap-2.5 rounded-xl border px-5 py-3.5 font-bold text-sm transition-all duration-300 ${
              isDarkMode
                ? "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                : "border-gray-200 bg-white/80 text-[#292530] hover:bg-white"
            }`}
          >
            <Eye size={18} />
            <span>View Results</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default StudySetHeroHeaderCard;

