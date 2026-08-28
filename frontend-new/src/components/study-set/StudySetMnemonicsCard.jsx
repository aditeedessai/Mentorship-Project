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
import { useTheme } from "../../context/ThemeContext";

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
  const { isDarkMode } = useTheme();

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
            <Brain size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">
              Contextual Mnemonic Creator
            </h2>
            <p className={`text-xs ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
              Turn complex concepts, lists, and sequences into memorable tricks.
            </p>
          </div>
        </div>
        <span className={`shrink-0 whitespace-nowrap font-mono text-xs font-bold px-3.5 py-1 rounded-full ${
          isDarkMode ? "bg-[#8064C7]/20 border border-[#8064C7]/30 text-[#A78BFA]" : "bg-[#8064C7]/10 border border-[#8064C7]/20 text-[#8064C7]"
        }`}>
          AI MEMORY TOOL
        </span>
      </div>

      <div className={`flex-1 flex flex-col gap-5 p-6 border rounded-2xl backdrop-blur-xl relative overflow-hidden ${
        isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200/80 bg-white/50"
      }`}>
        {mnemonicLoading && (
          <div className="py-12 text-center">
            <Loader2 size={38} className="mx-auto mb-3 animate-spin text-[#8064C7]" />
            <p className="text-base font-bold">
              Creating your memory trick...
            </p>
            <p className={`mt-1 text-xs ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>
              Analyzing topic and crafting a memorable mnemonic.
            </p>
          </div>
        )}

        {!mnemonicLoading && mnemonic && (
          <div className="space-y-5">
            <div className={`p-6 border border-l-4 border-l-[#8064C7] rounded-2xl ${
              isDarkMode ? "border-white/10 bg-[#17131F]" : "border-gray-100 bg-white"
            }`}>
              <div className="flex justify-between items-center mb-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                  isDarkMode ? "bg-[#8064C7]/20 border border-[#8064C7]/30 text-[#A78BFA]" : "bg-[#8064C7]/10 border border-[#8064C7]/20 text-[#8064C7]"
                }`}>
                  <Sparkles size={13} />
                  YOUR MEMORY TRICK
                </span>
                <span className="text-xs font-bold text-emerald-400 capitalize">
                  Style: {mnemonicStyle}
                </span>
              </div>

              <h3 className="text-lg font-black mb-3 tracking-tight">
                {mnemonic.title}
              </h3>

              <div className={`p-4 border rounded-2xl mb-4 ${
                isDarkMode ? "border-white/5 bg-white/5 text-[#A78BFA]" : "border-gray-100 bg-purple-50/50 text-[#8064C7]"
              }`}>
                <p className="text-base sm:text-lg font-black italic">
                  "{mnemonic.mnemonic}"
                </p>
              </div>

              <div className="pt-3 border-t border-inherit">
                <p className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                  BREAKDOWN
                </p>
                <ul className="space-y-1.5">
                  {mnemonic.breakdown.map((item, idx) => (
                    <li
                      key={idx}
                      className={`text-xs sm:text-sm font-bold flex items-center gap-2 p-2.5 rounded-xl border ${
                        isDarkMode ? "border-white/5 bg-white/5" : "border-gray-100 bg-gray-50"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onCopyMnemonic}
                className="flex items-center justify-center gap-2 bg-[#8064C7] hover:bg-[#8B6DD4] text-white rounded-xl px-5 py-2.5 font-bold text-xs shadow-md transition-all"
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
                className={`flex items-center justify-center gap-2 rounded-xl border px-5 py-2.5 font-bold text-xs transition-all ${
                  isDarkMode ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <RotateCw size={15} />
                <span>Create Another</span>
              </button>
            </div>
          </div>
        )}

        {!mnemonicLoading && !mnemonic && (
          <div className="space-y-5">
            <div className={`flex items-start gap-3 p-4 border rounded-2xl backdrop-blur-xl ${
              isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200/90 bg-white/90"
            }`}>
              <div className="p-2.5 rounded-xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA] shrink-0">
                <Lightbulb size={20} />
              </div>
              <p className={`text-xs sm:text-sm leading-relaxed font-semibold ${isDarkMode ? "text-white/70" : "text-gray-600"}`}>
                Turn hard-to-remember information into something your brain will love.
                Create an acronym, rhyme, or funny story based on your study material.
              </p>
            </div>

            {mnemonicError && (
              <div className="p-3 border border-red-500/30 bg-red-500/10 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{mnemonicError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                What do you want to remember?
              </label>
              <input
                type="text"
                value={mnemonicTopic}
                onChange={(e) => setMnemonicTopic(e.target.value)}
                placeholder="e.g. OSI model layers, stages of mitosis, TCP handshake..."
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                  isDarkMode
                    ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7]"
                    : "border-gray-200 bg-white text-[#292530] placeholder:text-gray-400 focus:border-[#8064C7]"
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2">
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
                      className={`p-3.5 rounded-2xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
                        isSelected
                          ? "bg-[#8064C7] text-white border-[#8064C7] shadow-md scale-[1.03]"
                          : isDarkMode
                          ? "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                          : "bg-white border-gray-200 text-[#292530] hover:bg-gray-50"
                      }`}
                    >
                      <div>
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

            <button
              type="button"
              onClick={onGenerateMnemonic}
              className="w-full flex items-center justify-center gap-2 bg-[#8064C7] hover:bg-[#8B6DD4] text-white rounded-xl px-6 py-3.5 font-bold text-sm shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition-all duration-300 hover:-translate-y-0.5"
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

