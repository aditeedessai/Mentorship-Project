import { FileText, Layers, Brain } from "lucide-react";

function StudySetTabNav({
  activeTab,
  setActiveTab,
  summaryRef,
  flashcardsRef,
  mnemonicsRef,
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border border-gray-200/80 shadow-sm w-fit sticky top-4 z-20">
      <button
        type="button"
        onClick={() => {
          setActiveTab("summary");
          summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer select-none ${
          activeTab === "summary"
            ? "bg-gradient-to-r from-[#98E8DE] to-[#62FAE3] text-[#4E1F6E] shadow-sm scale-[1.02]"
            : "text-[#3E3E75] hover:text-[#4E1F6E] hover:bg-[#98E8DE]/25"
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
        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer select-none ${
          activeTab === "flashcards"
            ? "bg-gradient-to-r from-[#98E8DE] to-[#62FAE3] text-[#4E1F6E] shadow-sm scale-[1.02]"
            : "text-[#3E3E75] hover:text-[#4E1F6E] hover:bg-[#98E8DE]/25"
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
        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer select-none ${
          activeTab === "mnemonics"
            ? "bg-gradient-to-r from-[#98E8DE] to-[#62FAE3] text-[#4E1F6E] shadow-sm scale-[1.02]"
            : "text-[#3E3E75] hover:text-[#4E1F6E] hover:bg-[#98E8DE]/25"
        }`}
      >
        <Brain size={15} />
        <span>Mnemonics</span>
      </button>
    </div>
  );
}

export default StudySetTabNav;
