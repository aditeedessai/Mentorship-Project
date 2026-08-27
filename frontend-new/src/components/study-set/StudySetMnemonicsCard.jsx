import {
  Brain,
  Loader2,
  Sparkles,
  Check,
  Copy,
  RotateCw,
  Lightbulb,
  AlertCircle,
  Type,
  Music,
  Smile,
} from "lucide-react";

const STYLE_OPTIONS = [
  { id: "acronym", label: "Acronym", icon: <Type size={18} /> },
  { id: "rhyme", label: "Rhyme", icon: <Music size={18} /> },
  { id: "story", label: "Funny Story", icon: <Smile size={18} /> },
  { id: "surprise", label: "Surprise Me", icon: <Sparkles size={18} /> },
];

function StudySetMnemonicsCard({
  mnemonicTopic,
  setMnemonicTopic,
  mnemonicStyle,
  setMnemonicStyle,
  mnemonic,
  mnemonicLoading,
  mnemonicError,
  mnemonicCopied,
  onGenerateMnemonic,
  onCopyMnemonic,
  onResetMnemonic,
  sectionRef,
}) {
  return (
    <section
      ref={sectionRef}
      className="rounded-2xl bg-white/95 backdrop-blur-md p-6 sm:p-7 shadow-[0_4px_25px_rgba(78,31,110,0.06)] hover:shadow-[0_8px_30px_rgba(78,31,110,0.09)] border border-gray-100/90 flex flex-col transition-all duration-300"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-[#98E8DE]/40 via-[#98E8DE]/20 to-[#4E1F6E]/10 border border-[#98E8DE]/60 text-[#4E1F6E] p-3 rounded-xl shadow-2xs ring-1 ring-[#98E8DE]/30">
            <Brain size={22} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#3E3E75]">
              Contextual Mnemonic Creator
            </h2>
            <p className="text-xs text-gray-500">
              Turn complex concepts, lists, and sequences into memorable tricks.
            </p>
          </div>
        </div>
        <span className="bg-[#4E1F6E]/10 border border-[#4E1F6E]/20 text-[#4E1F6E] font-mono text-xs font-bold px-3.5 py-1 rounded-full shadow-2xs">
          AI MEMORY TOOL
        </span>
      </div>

      {/* Main Card Body */}
      <div className="flex-1 flex flex-col gap-5 p-6 border border-gray-200/80 rounded-2xl bg-gradient-to-br from-white via-gray-50/40 to-[#98E8DE]/15 shadow-xs relative overflow-hidden">
        {/* STATE 1: GENERATING / LOADING */}
        {mnemonicLoading && (
          <div className="py-12 text-center">
            <Loader2 size={38} className="mx-auto mb-3 animate-spin text-[#4E1F6E]" />
            <p className="text-base font-bold text-[#3E3E75]">
              Creating your memory trick...
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Analyzing topic and crafting a memorable mnemonic.
            </p>
          </div>
        )}

        {/* STATE 2: GENERATED RESULT CARD */}
        {!mnemonicLoading && mnemonic && (
          <div className="space-y-5">
            <div className="p-6 border border-[#4E1F6E]/20 border-l-4 border-l-[#4E1F6E] rounded-2xl bg-white shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="inline-flex items-center gap-1.5 bg-[#4E1F6E]/10 border border-[#4E1F6E]/20 text-[#4E1F6E] px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider shadow-2xs">
                  <Sparkles size={13} />
                  YOUR MEMORY TRICK
                </span>
                <span className="text-xs font-bold text-[#006B5F] capitalize">
                  Style: {mnemonicStyle}
                </span>
              </div>

              <h3 className="text-lg font-extrabold text-[#3E3E75] mb-3">
                {mnemonic.title}
              </h3>

              {/* Highlighted Phrase */}
              <div className="p-4 bg-gradient-to-r from-gray-50 to-[#98E8DE]/10 border border-gray-200 rounded-xl shadow-2xs mb-4">
                <p className="text-base sm:text-lg font-extrabold text-[#4E1F6E] italic">
                  "{mnemonic.mnemonic}"
                </p>
              </div>

              {/* Breakdown */}
              <div className="pt-3 border-t border-gray-200">
                <p className="font-mono text-xs font-bold text-[#006B5F] uppercase tracking-wider mb-2">
                  BREAKDOWN
                </p>
                <ul className="space-y-1.5">
                  {mnemonic.breakdown.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-xs sm:text-sm font-semibold text-[#3E3E75] flex items-center gap-2 bg-gray-50/80 p-2.5 rounded-lg border border-gray-200/80"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#006B5F]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Result Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onCopyMnemonic}
                className="flex items-center justify-center gap-2 bg-[#4E1F6E] hover:bg-[#3E3E75] text-white rounded-xl px-5 py-2.5 font-semibold text-xs shadow-xs transition-all cursor-pointer"
              >
                {mnemonicCopied ? (
                  <>
                    <Check size={15} className="text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={15} />
                    <span>Copy Mnemonic</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onResetMnemonic}
                className="flex items-center justify-center gap-2 border border-gray-200 bg-white text-[#3E3E75] hover:bg-gray-100 rounded-xl px-5 py-2.5 font-semibold text-xs shadow-xs transition-all cursor-pointer"
              >
                <RotateCw size={15} />
                <span>Create Another</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE 3: INPUT / CREATION FORM */}
        {!mnemonicLoading && !mnemonic && (
          <div className="space-y-5">
            {/* Intro Explanation */}
            <div className="flex items-start gap-3 p-4 bg-white/90 backdrop-blur-xs border border-gray-200/90 rounded-2xl shadow-2xs">
              <div className="p-2.5 rounded-xl bg-[#98E8DE]/40 text-[#006B5F] shrink-0 shadow-2xs">
                <Lightbulb size={20} />
              </div>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-medium">
                Turn hard-to-remember information into something your brain will love.
                Create an acronym, rhyme, or funny story based on your study material.
              </p>
            </div>

            {mnemonicError && (
              <div className="p-3 border border-red-200 bg-red-50 text-red-600 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{mnemonicError}</span>
              </div>
            )}

            {/* Topic Input */}
            <div>
              <label className="block text-xs font-bold text-[#3E3E75] uppercase tracking-wider mb-2">
                What do you want to remember?
              </label>
              <input
                type="text"
                value={mnemonicTopic}
                onChange={(e) => setMnemonicTopic(e.target.value)}
                placeholder="e.g. OSI model layers, stages of mitosis, TCP handshake..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-[#3E3E75] placeholder-gray-400 outline-none focus:border-[#4E1F6E] focus:ring-2 focus:ring-[#98E8DE]/50 shadow-2xs transition-all"
              />
            </div>

            {/* Choose Style Options */}
            <div>
              <label className="block text-xs font-bold text-[#3E3E75] uppercase tracking-wider mb-2">
                Choose a memory style
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {STYLE_OPTIONS.map((opt) => {
                  const isSelected = mnemonicStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMnemonicStyle(opt.id)}
                      className={`p-3.5 rounded-xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
                        isSelected
                          ? "bg-gradient-to-br from-[#4E1F6E] to-[#3E3E75] text-white border-[#4E1F6E] shadow-md scale-[1.03]"
                          : "bg-white border-gray-200 text-[#3E3E75] hover:border-[#4E1F6E]/50 hover:bg-[#98E8DE]/20"
                      }`}
                    >
                      <div className={isSelected ? "text-white" : "text-[#4E1F6E]"}>
                        {opt.icon}
                      </div>
                      <span className="text-xs font-bold text-center">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generate Action Button */}
            <button
              type="button"
              onClick={onGenerateMnemonic}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#4E1F6E] to-[#3E3E75] hover:from-[#3E3E75] hover:to-[#4E1F6E] text-white rounded-xl px-6 py-3.5 font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <Sparkles size={18} />
              <span>Create Memory Trick</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default StudySetMnemonicsCard;
