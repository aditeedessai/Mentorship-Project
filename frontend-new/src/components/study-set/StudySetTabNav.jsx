import { FileText, Layers, Brain } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

function StudySetTabNav({
  activeTab,
  setActiveTab,
  summaryRef,
  flashcardsRef,
  mnemonicsRef,
}) {
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-1.5 backdrop-blur-2xl p-1.5 rounded-2xl border shadow-sm w-fit sticky top-4 z-20 transition-all duration-500 ${
        isDarkMode
          ? "border-white/10 bg-[#17131F]/90 text-white"
          : "border-white/80 bg-white/70 text-[#292530]"
      }`}
    >
      <button
        type="button"
        onClick={() => {
          setActiveTab("summary");
          summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer select-none ${
          activeTab === "summary"
            ? "bg-[#8064C7] text-white shadow-md scale-[1.02]"
            : isDarkMode
            ? "text-white/70 hover:bg-white/10"
            : "text-[#292530] hover:bg-black/5"
        }`}
      >
        <FileText size={15} />
        <span>Summary</span>
      </button>

      <button
        type="button"
        onClick={() => {
          setActiveTab("flashcards");
          flashcardsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer select-none ${
          activeTab === "flashcards"
            ? "bg-[#8064C7] text-white shadow-md scale-[1.02]"
            : isDarkMode
            ? "text-white/70 hover:bg-white/10"
            : "text-[#292530] hover:bg-black/5"
        }`}
      >
        <Layers size={15} />
        <span>Flashcards</span>
      </button>

      <button
        type="button"
        onClick={() => {
          setActiveTab("mnemonics");
          mnemonicsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer select-none ${
          activeTab === "mnemonics"
            ? "bg-[#8064C7] text-white shadow-md scale-[1.02]"
            : isDarkMode
            ? "text-white/70 hover:bg-white/10"
            : "text-[#292530] hover:bg-black/5"
        }`}
      >
        <Brain size={15} />
        <span>Mnemonics</span>
      </button>
    </div>
  );
}

export default StudySetTabNav;

