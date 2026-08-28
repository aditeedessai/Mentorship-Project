import { Layers, ChevronRight, Play, RotateCw, Loader2, AlertCircle, Sparkles, RefreshCw } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const FLASHCARDS_ILLUSTRATION_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBRLn_TAXppwrrg_JVtLm7N45-XtfRArub02OTHvS-kvSMVIRh5_NUqrmtS_JCtHWqp8x0xIs7mVEDfTYQf7o4JisxMkkJJPT2CR_tIjIRqXPIrhh6TBG5c21UVGqXJs2dFZvzZ3WH-is2aK2eJHeX2DgSWa2WOqN-w_WdzFFtCay93wFHpAAVq73KJrVVtDwPTO4WGTHHfHBZxpKytQqwwlwEbeor1RVfEX6gF4ZimFukgQDR9kcvB";

function StudySetFlashcardsCard({
  flashcards = null,
  flashcardsLoading = false,
  flashcardsError = "",
  practiceMode = false,
  setPracticeMode,
  currentCardIndex = 0,
  isFlipped = false,
  studySetName = "Study Set",
  documentsCount = 0,
  onGenerateFlashcards,
  onFlipCard,
  onNextCard,
  sectionRef,
}) {
  const { isDarkMode } = useTheme();
  const cardList = flashcards || [];
  const currentCard = cardList[currentCardIndex] || cardList[0];

  return (
    <section
      ref={sectionRef}
      className={`rounded-3xl border p-6 sm:p-7 backdrop-blur-2xl transition-all duration-500 flex flex-col ${
        isDarkMode
          ? "border-white/10 bg-[#17131F]/80 text-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
          : "border-white/80 bg-white/60 text-[#292530] shadow-[0_18px_50px_rgba(70,55,110,0.1)]"
      }`}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA] p-3 rounded-2xl">
            <Layers size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Flashcards</h2>
            <p className={`text-xs ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>Interactive study deck & memory practice</p>
          </div>
        </div>

        {practiceMode && cardList.length > 0 && (
          <button
            type="button"
            onClick={() => setPracticeMode(false)}
            className={`text-xs font-bold transition-all flex items-center gap-1 border px-3.5 py-1.5 rounded-full ${
              isDarkMode
                ? "border-white/10 bg-white/5 text-[#A78BFA] hover:bg-white/10"
                : "border-[#8064C7]/30 bg-[#8064C7]/10 text-[#8064C7] hover:bg-[#8064C7]/20"
            }`}
          >
            <span>View Study Deck</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {flashcardsLoading && (
        <div className={`flex-1 flex flex-col justify-center items-center p-12 border rounded-2xl backdrop-blur-xl text-center ${
          isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200/80 bg-white/50"
        }`}>
          <Loader2 size={40} className="mb-3 animate-spin text-[#8064C7]" />
          <p className="text-base font-bold">
            Generating Study Set Flashcards...
          </p>
          <p className={`mt-1 text-xs max-w-sm ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>
            AI is analyzing your study materials and generating active recall cards.
          </p>
        </div>
      )}

      {!flashcardsLoading && flashcardsError && (
        <div className="flex-1 p-6 border border-red-500/30 rounded-2xl bg-red-500/10 text-center">
          <AlertCircle size={32} className="mx-auto mb-2 text-red-400" />
          <p className="text-sm font-bold text-red-400">
            Failed to generate flashcards
          </p>
          <p className="mt-1 text-xs text-red-300 mb-4">{flashcardsError}</p>
          <button
            type="button"
            onClick={onGenerateFlashcards}
            className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4.5 py-2.5 text-xs font-bold text-white transition hover:bg-red-600 shadow-md"
          >
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      )}

      {!flashcardsLoading && !flashcardsError && (!flashcards || cardList.length === 0) && (
        <div className={`flex-1 flex flex-col lg:flex-row items-center gap-6 p-6 border rounded-2xl backdrop-blur-xl ${
          isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200/80 bg-white/50"
        }`}>
          <div className="w-full lg:w-1/3 shrink-0">
            <div className="rounded-2xl overflow-hidden border border-inherit shadow-sm group">
              <img
                src={FLASHCARDS_ILLUSTRATION_URL}
                alt="Flashcards Preview"
                className="w-full h-auto max-h-[180px] object-cover group-hover:scale-[1.03] transition-transform duration-500"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
          </div>

          <div className="flex-1 text-left w-full">
            <h3 className="text-xl font-black tracking-tight mb-1">
              Study Deck
            </h3>
            <p className={`text-xs mb-4 ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>
              Master key terms with interactive AI flashcards.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className={`p-4 rounded-2xl border ${isDarkMode ? "border-white/5 bg-white/5" : "border-gray-100 bg-white"}`}>
                <p className="font-mono text-xs font-bold text-[#8064C7] dark:text-[#A78BFA]">
                  CARDS
                </p>
                <p className="text-2xl font-black">0</p>
              </div>
              <div className={`p-4 rounded-2xl border ${isDarkMode ? "border-white/5 bg-white/5" : "border-gray-100 bg-white"}`}>
                <p className="font-mono text-xs font-bold text-emerald-400">
                  CATEGORIES
                </p>
                <p className="text-2xl font-black">0</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onGenerateFlashcards}
              disabled={documentsCount === 0}
              className="w-full flex items-center justify-center gap-2.5 bg-[#8064C7] hover:bg-[#8B6DD4] text-white rounded-xl px-6 py-3.5 font-bold text-sm shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={18} />
              <span>Generate Flashcards</span>
            </button>
            {documentsCount === 0 && (
              <p className={`mt-2 text-[11px] text-center ${isDarkMode ? "text-white/40" : "text-gray-400"}`}>
                Upload at least one document first to generate flashcards.
              </p>
            )}
          </div>
        </div>
      )}

      {!flashcardsLoading && !flashcardsError && flashcards && cardList.length > 0 && !practiceMode && (
        <div className={`flex-1 flex flex-col lg:flex-row items-center gap-6 p-6 border rounded-2xl backdrop-blur-xl ${
          isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200/80 bg-white/50"
        }`}>
          <div className="w-full lg:w-1/3 shrink-0">
            <div className="rounded-2xl overflow-hidden border border-inherit shadow-sm group">
              <img
                src={FLASHCARDS_ILLUSTRATION_URL}
                alt="Flashcards Preview"
                className="w-full h-auto max-h-[180px] object-cover group-hover:scale-[1.03] transition-transform duration-500"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
          </div>

          <div className="flex-1 text-left w-full">
            <h3 className="text-xl font-black tracking-tight mb-1">
              Study Deck
            </h3>
            <p className={`text-xs mb-4 ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>
              {cardList.length} flashcards generated from your study material.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className={`p-4 rounded-2xl border ${isDarkMode ? "border-white/5 bg-white/5" : "border-gray-100 bg-white"}`}>
                <p className="font-mono text-xs font-bold text-[#8064C7] dark:text-[#A78BFA]">
                  CARDS
                </p>
                <p className="text-2xl font-black">{cardList.length}</p>
              </div>
              <div className={`p-4 rounded-2xl border ${isDarkMode ? "border-white/5 bg-white/5" : "border-gray-100 bg-white"}`}>
                <p className="font-mono text-xs font-bold text-emerald-400">
                  CATEGORIES
                </p>
                <p className="text-2xl font-black">{Math.min(3, cardList.length)}</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-1.5">
                <span className={`font-mono text-xs font-semibold ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                  Mastery Progress
                </span>
                <span className="font-mono text-xs font-bold text-[#8064C7] dark:text-[#A78BFA]">
                  0/{cardList.length} Cards Mastered
                </span>
              </div>
              <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDarkMode ? "bg-white/10" : "bg-black/10"}`}>
                <div className="w-0 h-full bg-[#8064C7] rounded-full transition-all duration-500" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPracticeMode(true)}
                className="flex-1 flex items-center justify-center gap-2.5 bg-[#8064C7] hover:bg-[#8B6DD4] text-white rounded-xl px-6 py-3.5 font-bold text-sm shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition-all duration-300 hover:-translate-y-0.5"
              >
                <Play size={18} />
                <span>Start Practice</span>
              </button>

              <button
                type="button"
                onClick={onGenerateFlashcards}
                className={`p-3.5 rounded-xl border transition-colors ${
                  isDarkMode ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
                title="Regenerate Flashcards"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {!flashcardsLoading && !flashcardsError && flashcards && cardList.length > 0 && practiceMode && currentCard && (
        <div className={`flex-1 flex flex-col gap-6 p-6 border rounded-2xl backdrop-blur-xl ${
          isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200/80 bg-white/50"
        }`}>
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div
              className="w-full md:w-1/2 min-h-[240px] select-none"
              style={{ perspective: "1000px" }}
            >
              <div
                onClick={onFlipCard}
                className={`relative w-full h-full min-h-[240px] rounded-2xl border-2 cursor-pointer shadow-md transition-all duration-500 hover:shadow-lg ${
                  isFlipped
                    ? "border-emerald-500/60 shadow-emerald-500/10"
                    : "border-[#8064C7]/40 hover:border-[#8064C7]"
                }`}
                style={{
                  transformStyle: "preserve-3d",
                  transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* FRONT SIDE */}
                <div
                  className={`absolute inset-0 w-full h-full rounded-2xl p-7 border-l-4 border-l-[#8064C7] flex flex-col items-center justify-center text-center shadow-xs backdrop-blur-xl ${
                    isDarkMode ? "bg-[#17131F] text-white" : "bg-white text-[#292530]"
                  }`}
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                  }}
                >
                  <div className={`px-3.5 py-1 rounded-full font-mono text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${
                    isDarkMode ? "bg-[#8064C7]/20 text-[#A78BFA]" : "bg-[#8064C7]/10 text-[#8064C7]"
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8064C7] animate-pulse" />
                    CARD ({currentCardIndex + 1}/{cardList.length})
                  </div>
                  <h3 className="text-2xl font-black mb-6 tracking-tight">
                    {currentCard.term}
                  </h3>
                  <button
                    type="button"
                    className="bg-[#8064C7] hover:bg-[#8B6DD4] text-white px-4.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all hover:scale-105"
                  >
                    <RotateCw size={14} />
                    <span>Flip to Reveal</span>
                  </button>
                </div>

                {/* BACK SIDE */}
                <div
                  className={`absolute inset-0 w-full h-full rounded-2xl p-7 border-l-4 border-l-emerald-500 flex flex-col items-center justify-center text-center shadow-xs backdrop-blur-xl ${
                    isDarkMode ? "bg-[#17131F] text-white" : "bg-white text-[#292530]"
                  }`}
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <div className="bg-emerald-500/20 text-emerald-400 px-3.5 py-1 rounded-full font-mono text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    DEFINITION
                  </div>
                  <p className="text-sm font-bold mb-6 leading-relaxed max-w-xs">
                    {currentCard.definition}
                  </p>
                  <button
                    type="button"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all hover:scale-105"
                  >
                    <RotateCw size={14} />
                    <span>Flip Back</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full">
              <h3 className="text-lg font-black mb-1 tracking-tight">
                Current Deck
              </h3>
              <p className={`text-xs mb-4 ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                Mastering {studySetName} Fundamentals
              </p>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-1.5">
                  <span className={`font-mono text-xs font-semibold ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                    Deck Progress
                  </span>
                  <span className="font-mono text-xs font-bold text-[#8064C7] dark:text-[#A78BFA]">
                    {currentCardIndex + 1}/{cardList.length} Cards
                  </span>
                </div>
                <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDarkMode ? "bg-white/10" : "bg-black/10"}`}>
                  <div
                    className="h-full bg-[#8064C7] rounded-full transition-all duration-500"
                    style={{ width: `${((currentCardIndex + 1) / cardList.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onNextCard}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#8064C7] hover:bg-[#8B6DD4] text-white rounded-xl px-6 py-3.5 font-bold text-sm shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Play size={16} />
                  <span>Next Flashcard</span>
                </button>

                <button
                  type="button"
                  onClick={onGenerateFlashcards}
                  className={`p-3.5 rounded-xl border transition-colors ${
                    isDarkMode ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                  title="Regenerate Flashcards"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default StudySetFlashcardsCard;

