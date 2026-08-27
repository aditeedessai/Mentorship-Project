import { BookOpen, Sparkles, Eye } from "lucide-react";

function StudySetHeroHeaderCard({ studySetName, studySetId, onNavigate }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-[#FDFCFE] to-[#98E8DE]/15 p-6 lg:p-8 border border-[#4E1F6E]/10 shadow-[0_4px_25px_rgba(78,31,110,0.06)] hover:shadow-[0_8px_35px_rgba(78,31,110,0.09)] transition-all duration-300 backdrop-blur-md">
      {/* Top Background Glow Orb Accent */}
      <div className="absolute -top-12 -right-12 w-56 h-56 bg-gradient-to-br from-[#98E8DE]/30 to-[#4E1F6E]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Left Accent Bar with Subtle Gradient Pill */}
      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#4E1F6E] via-[#3E3E75] to-[#98E8DE]" />

      <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-2 bg-[#98E8DE]/35 border border-[#98E8DE]/70 text-[#4E1F6E] px-3.5 py-1 rounded-full font-mono text-xs font-bold uppercase tracking-wider shadow-2xs">
              <BookOpen size={14} className="text-[#4E1F6E]" />
              STUDY SET
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#3E3E75] tracking-tight mb-2">
            {studySetName}
          </h1>
          <p className="text-sm text-gray-500 max-w-xl leading-relaxed">
            View documents, practice flashcards, or generate a customized study quiz.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate?.("quiz", { studySetId })}
            className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#4E1F6E] to-[#3E3E75] hover:from-[#3E3E75] hover:to-[#4E1F6E] text-white rounded-xl px-6 py-3.5 font-semibold text-sm shadow-md hover:shadow-lg hover:shadow-[#4E1F6E]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
          >
            <Sparkles size={18} />
            <span>Generate Quiz</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.("results", { studySetId })}
            className="flex items-center justify-center gap-2.5 bg-white/90 backdrop-blur-sm border border-gray-200/80 hover:border-[#4E1F6E]/50 text-[#3E3E75] hover:text-[#4E1F6E] font-semibold text-sm rounded-xl px-5 py-3.5 shadow-xs hover:bg-[#98E8DE]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
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
