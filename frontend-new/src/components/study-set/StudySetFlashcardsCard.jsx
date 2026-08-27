import { Layers, ChevronRight, Play, RotateCw } from "lucide-react";

const FLASHCARDS_ILLUSTRATION_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBRLn_TAXppwrrg_JVtLm7N45-XtfRArub02OTHvS-kvSMVIRh5_NUqrmtS_JCtHWqp8x0xIs7mVEDfTYQf7o4JisxMkkJJPT2CR_tIjIRqXPIrhh6TBG5c21UVGqXJs2dFZvzZ3WH-is2aK2eJHeX2DgSWa2WOqN-w_WdzFFtCay93wFHpAAVq73KJrVVtDwPTO4WGTHHfHBZxpKytQqwwlwEbeor1RVfEX6gF4ZimFukgQDR9kcvB";

const MOCK_CARDS = [
  {
    term: "Mitochondria",
    definition:
      "The powerhouse of the cell, generating ATP through cellular respiration.",
  },
  {
    term: "Plasma Membrane",
    definition:
      "A selective phospholipid bilayer that regulates the entry and exit of molecules.",
  },
  {
    term: "Ribosomes",
    definition:
      "Molecular machines composed of RNA and proteins that synthesize proteins.",
  },
];

function StudySetFlashcardsCard({
  practiceMode,
  setPracticeMode,
  currentCardIndex = 0,
  isFlipped = false,
  studySetName = "Study Set",
  onFlipCard,
  onNextCard,
  sectionRef,
}) {
  const currentCard = MOCK_CARDS[currentCardIndex] || MOCK_CARDS[0];

  return (
    <section
      ref={sectionRef}
      className="rounded-2xl bg-white/95 backdrop-blur-md p-6 sm:p-7 shadow-[0_4px_25px_rgba(78,31,110,0.06)] hover:shadow-[0_8px_30px_rgba(78,31,110,0.09)] border border-gray-100/90 flex flex-col transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-[#98E8DE]/40 via-[#98E8DE]/20 to-[#4E1F6E]/10 border border-[#98E8DE]/60 text-[#4E1F6E] p-3 rounded-xl shadow-2xs ring-1 ring-[#98E8DE]/30">
            <Layers size={22} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#3E3E75]">Flashcards</h2>
            <p className="text-xs text-gray-500">Interactive study deck & memory practice</p>
          </div>
        </div>

        {practiceMode && (
          <button
            type="button"
            onClick={() => setPracticeMode(false)}
            className="text-xs font-bold text-[#4E1F6E] hover:text-[#3E3E75] cursor-pointer flex items-center gap-1 bg-[#98E8DE]/20 border border-[#98E8DE]/60 px-3 py-1 rounded-full transition-all"
          >
            <span>View Deck Preview</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* STATE A: DECK PREVIEW UI */}
      {!practiceMode && (
        <div className="flex-1 flex flex-col lg:flex-row items-center gap-6 p-6 border border-gray-200/80 rounded-2xl bg-gradient-to-br from-white via-gray-50/40 to-[#98E8DE]/15 shadow-xs">
          <div className="w-full lg:w-1/3 shrink-0">
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm group">
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
            <h3 className="text-xl font-extrabold text-[#3E3E75] mb-1">
              Deck Preview
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Master key terms with interactive study cards.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gradient-to-br from-white to-[#98E8DE]/15 p-4 rounded-xl border border-gray-100 shadow-2xs hover:scale-[1.02] transition-transform">
                <p className="font-mono text-xs font-bold text-[#4E1F6E]">
                  CARDS
                </p>
                <p className="text-2xl font-extrabold text-[#3E3E75]">42</p>
              </div>
              <div className="bg-gradient-to-br from-white to-[#98E8DE]/15 p-4 rounded-xl border border-gray-100 shadow-2xs hover:scale-[1.02] transition-transform">
                <p className="font-mono text-xs font-bold text-[#006B5F]">
                  CATEGORIES
                </p>
                <p className="text-2xl font-extrabold text-[#3E3E75]">3</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-mono text-xs font-semibold text-gray-500">
                  Mastery Progress
                </span>
                <span className="font-mono text-xs font-bold text-[#4E1F6E]">
                  0/42
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200">
                <div className="w-0 h-full bg-gradient-to-r from-[#4E1F6E] to-[#98E8DE] rounded-full transition-all duration-500" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPracticeMode(true)}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#4E1F6E] to-[#3E3E75] hover:from-[#3E3E75] hover:to-[#4E1F6E] text-white rounded-xl px-6 py-3.5 font-semibold text-sm shadow-md hover:shadow-lg hover:shadow-[#4E1F6E]/20 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <Play size={18} />
              <span>Start Practice</span>
            </button>
          </div>
        </div>
      )}

      {/* STATE B: INTERACTIVE PRACTICE MODE */}
      {practiceMode && (
        <div className="flex-1 flex flex-col gap-6 p-6 border border-gray-200/80 rounded-2xl bg-gradient-to-br from-white via-gray-50/40 to-[#98E8DE]/15 shadow-xs">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {/* Interactive Flip Card */}
            <div
              className="w-full md:w-1/2 min-h-[240px] select-none"
              style={{ perspective: "1000px" }}
            >
              <div
                onClick={onFlipCard}
                className={`relative w-full h-full min-h-[240px] rounded-2xl border-2 cursor-pointer shadow-md transition-all duration-500 hover:shadow-lg ${
                  isFlipped
                    ? "border-[#006B5F]/60 shadow-[#006B5F]/10"
                    : "border-[#4E1F6E]/40 hover:border-[#4E1F6E]"
                }`}
                style={{
                  transformStyle: "preserve-3d",
                  transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* FRONT SIDE (TERM) */}
                <div
                  className="absolute inset-0 w-full h-full bg-gradient-to-br from-white via-[#FDFBFD] to-[#98E8DE]/10 rounded-2xl p-7 border-l-4 border-l-[#4E1F6E] flex flex-col items-center justify-center text-center shadow-xs"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                  }}
                >
                  <div className="bg-[#4E1F6E]/10 border border-[#4E1F6E]/20 text-[#4E1F6E] px-3.5 py-1 rounded-full font-mono text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4E1F6E] animate-pulse" />
                    TERM ({currentCardIndex + 1}/{MOCK_CARDS.length})
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#3E3E75] mb-6 tracking-tight">
                    {currentCard.term}
                  </h3>
                  <button
                    type="button"
                    className="bg-[#4E1F6E] hover:bg-[#3E3E75] text-white px-4.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <RotateCw size={14} />
                    <span>Flip to Reveal</span>
                  </button>
                </div>

                {/* BACK SIDE (DEFINITION) */}
                <div
                  className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#98E8DE]/20 via-white to-white rounded-2xl p-7 border-l-4 border-l-[#006B5F] flex flex-col items-center justify-center text-center shadow-xs"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <div className="bg-[#006B5F]/10 border border-[#006B5F]/20 text-[#006B5F] px-3.5 py-1 rounded-full font-mono text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006B5F] animate-pulse" />
                    DEFINITION
                  </div>
                  <p className="text-sm font-semibold text-[#3E3E75] mb-6 leading-relaxed max-w-xs">
                    {currentCard.definition}
                  </p>
                  <button
                    type="button"
                    className="bg-[#006B5F] hover:bg-[#005047] text-white px-4.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <RotateCw size={14} />
                    <span>Flip Back</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Deck Info & Progress */}
            <div className="flex-1 w-full">
              <h3 className="text-lg font-extrabold text-[#3E3E75] mb-1">
                Current Deck
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Mastering {studySetName} Fundamentals
              </p>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-mono text-xs font-semibold text-gray-500">
                    Mastery Progress
                  </span>
                  <span className="font-mono text-xs font-bold text-[#4E1F6E]">
                    12/45 Cards Mastered
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200">
                  <div className="w-[27%] h-full bg-gradient-to-r from-[#4E1F6E] to-[#98E8DE] rounded-full transition-all duration-500" />
                </div>
              </div>

              <button
                type="button"
                onClick={onNextCard}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#4E1F6E] to-[#3E3E75] text-white rounded-xl px-6 py-3.5 font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <Play size={16} />
                <span>Next Flashcard</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default StudySetFlashcardsCard;
