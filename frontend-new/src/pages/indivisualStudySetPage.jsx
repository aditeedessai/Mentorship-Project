import { useState, useEffect, useRef } from "react";
import { ArrowLeft, AlertCircle, ArrowUp } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import {
  fetchStudySet,
  fetchStudySetDocuments,
  fetchActiveAttempt,
  generateStudySetSummary,
  generateStudySetFlashcards,
  generateStudySetMnemonic,
} from "../services/api";

import StudySetHeroHeaderCard from "../components/study-set/StudySetHeroHeaderCard";
import StudySetTabNav from "../components/study-set/StudySetTabNav";
import StudySetSummaryCard from "../components/study-set/StudySetSummaryCard";
import StudySetFlashcardsCard from "../components/study-set/StudySetFlashcardsCard";
import StudySetMnemonicsCard from "../components/study-set/StudySetMnemonicsCard";
import StudySetDocumentsCard from "../components/study-set/StudySetDocumentsCard";
import StudySetQuestionProgressCard from "../components/study-set/StudySetQuestionProgressCard";

function IndivisualStudySetPage({ studySetId, studySets = [], onNavigate }) {
  const { isDarkMode } = useTheme();
  const [studySet, setStudySet] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [completedSections, setCompletedSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const summaryRef = useRef(null);
  const flashcardsRef = useRef(null);
  const mnemonicsRef = useRef(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const mainEl = document.querySelector("main");
      const currentScroll = Math.max(
        mainEl ? mainEl.scrollTop : 0,
        window.scrollY || 0,
        document.documentElement?.scrollTop || 0
      );
      setShowBackToTop(currentScroll > 120);
    };

    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("scroll", handleScroll);

    handleScroll();

    return () => {
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (document.documentElement) {
      document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [copied, setCopied] = useState(false);

  const [flashcards, setFlashcards] = useState(null);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [flashcardsError, setFlashcardsError] = useState("");
  const [practiceMode, setPracticeMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const [mnemonicTopic, setMnemonicTopic] = useState("");
  const [mnemonicStyle, setMnemonicStyle] = useState("acronym");
  const [mnemonic, setMnemonic] = useState(null);
  const [mnemonicLoading, setMnemonicLoading] = useState(false);
  const [mnemonicError, setMnemonicError] = useState("");
  const [mnemonicCopied, setMnemonicCopied] = useState(false);

  const handleGenerateMnemonic = async () => {
    if (!mnemonicTopic.trim()) {
      setMnemonicError("Please enter a concept or topic first.");
      return;
    }
    if (!studySetId || mnemonicLoading) return;

    try {
      setMnemonicError("");
      setMnemonicLoading(true);
      const result = await generateStudySetMnemonic(
        studySetId,
        mnemonicTopic,
        mnemonicStyle
      );
      setMnemonic(result);
    } catch (err) {
      console.error("Failed to generate mnemonic:", err);
      setMnemonicError(
        err.message || "Failed to generate mnemonic for this topic."
      );
    } finally {
      setMnemonicLoading(false);
    }
  };

  const handleCopyMnemonic = () => {
    if (!mnemonic) return;
    const textToCopy = `${mnemonic.title}\n\n"${mnemonic.mnemonic}"\n\nBreakdown:\n${(mnemonic.breakdown || []).join("\n")}`;
    navigator.clipboard.writeText(textToCopy);
    setMnemonicCopied(true);
    setTimeout(() => setMnemonicCopied(false), 2000);
  };

  const handleResetMnemonic = () => {
    setMnemonic(null);
    setMnemonicError("");
    setMnemonicTopic("");
  };

  useEffect(() => {
    setSummary(null);
    setSummaryError("");
    setSummaryLoading(false);
    setFlashcards(null);
    setFlashcardsError("");
    setFlashcardsLoading(false);
    setPracticeMode(false);
    setMnemonic(null);
    setMnemonicError("");
    setCompletedSections([]);

    if (!studySetId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const foundSet = studySets.find((s) => s.study_set_id === studySetId);
        if (foundSet) {
          setStudySet(foundSet);
        } else {
          const setDetail = await fetchStudySet(studySetId);
          if (isMounted && setDetail) {
            setStudySet(setDetail);
          }
        }

        const docsList = await fetchStudySetDocuments(studySetId);
        if (isMounted) {
          setDocuments(docsList || []);
        }

        try {
          const activeAtt = await fetchActiveAttempt(studySetId);
          if (isMounted && activeAtt) {
            setCompletedSections(activeAtt.completed_sections || []);
          }
        } catch (err) {
          console.warn("Could not fetch active attempt for progress card:", err);
        }
      } catch (err) {
        console.error("Failed to load study set details/documents:", err);
        if (isMounted) {
          setError("Failed to load study set details or documents.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [studySetId, studySets]);

  const handleGenerateSummary = async () => {
    if (!studySetId || summaryLoading) return;

    try {
      setSummaryLoading(true);
      setSummaryError("");
      const result = await generateStudySetSummary(studySetId);
      setSummary(result);
    } catch (err) {
      console.error("Failed to generate summary:", err);
      setSummaryError(
        err.message || "Failed to generate summary for this study set."
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!studySetId || flashcardsLoading) return;

    try {
      setFlashcardsLoading(true);
      setFlashcardsError("");
      const result = await generateStudySetFlashcards(studySetId);
      setFlashcards(result.flashcards || []);
      setPracticeMode(true);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    } catch (err) {
      console.error("Failed to generate flashcards:", err);
      setFlashcardsError(
        err.message || "Failed to generate flashcards for this study set."
      );
    } finally {
      setFlashcardsLoading(false);
    }
  };

  const studySetName = studySet?.name || "Study Set";

  const handleCopySummary = () => {
    if (!summary) return;
    const titleText = summary.title || `${studySetName} Summary`;
    const summaryParagraphs = summary.overview_paragraphs ||
      (summary.overview
        ? [summary.overview]
        : typeof summary === "string"
        ? [summary]
        : [JSON.stringify(summary)]);
    const keyTakeaways = summary.key_takeaways || summary.key_topics || [];

    const textToCopy = `${titleText}\n\n${summaryParagraphs.join(
      "\n\n"
    )}\n\nKey Takeaways:\n${keyTakeaways.map((t) => `- ${t}`).join("\n")}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFlipCard = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleNextCard = () => {
    if (!flashcards || flashcards.length === 0) return;
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
  };

  return (
    <div className="pb-12">
      {/* Top Back Navigation Bar */}
      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate?.("study-sets")}
          className={`group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all backdrop-blur-xl ${
            isDarkMode
              ? "border-white/10 bg-white/5 text-[#A78BFA] hover:bg-white/10"
              : "border-white/80 bg-white/70 text-[#8064C7] hover:bg-white shadow-sm"
          }`}
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <span>Back to Study Sets</span>
        </button>
      </header>

      {/* Main Layout Container */}
      <div className="max-w-[1280px] mx-auto space-y-6">
        <StudySetHeroHeaderCard
          studySetName={studySetName}
          studySetId={studySetId}
          onNavigate={onNavigate}
        />

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-400 flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 flex flex-col gap-6">
            <StudySetTabNav
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              summaryRef={summaryRef}
              flashcardsRef={flashcardsRef}
              mnemonicsRef={mnemonicsRef}
            />

            <StudySetSummaryCard
              sectionRef={summaryRef}
              summary={summary}
              summaryLoading={summaryLoading}
              summaryError={summaryError}
              copied={copied}
              documentsCount={documents.length}
              studySetName={studySetName}
              onGenerateSummary={handleGenerateSummary}
              onCopySummary={handleCopySummary}
            />

            <StudySetFlashcardsCard
              sectionRef={flashcardsRef}
              flashcards={flashcards}
              flashcardsLoading={flashcardsLoading}
              flashcardsError={flashcardsError}
              practiceMode={practiceMode}
              setPracticeMode={setPracticeMode}
              currentCardIndex={currentCardIndex}
              isFlipped={isFlipped}
              studySetName={studySetName}
              documentsCount={documents.length}
              onGenerateFlashcards={handleGenerateFlashcards}
              onFlipCard={handleFlipCard}
              onNextCard={handleNextCard}
            />

            <StudySetMnemonicsCard
              sectionRef={mnemonicsRef}
              mnemonicTopic={mnemonicTopic}
              setMnemonicTopic={setMnemonicTopic}
              mnemonicStyle={mnemonicStyle}
              setMnemonicStyle={setMnemonicStyle}
              mnemonic={mnemonic}
              mnemonicLoading={mnemonicLoading}
              mnemonicError={mnemonicError}
              mnemonicCopied={mnemonicCopied}
              onGenerateMnemonic={handleGenerateMnemonic}
              onCopyMnemonic={handleCopyMnemonic}
              onResetMnemonic={handleResetMnemonic}
            />
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <StudySetDocumentsCard
              documents={documents}
              loading={loading}
            />

            <StudySetQuestionProgressCard
              completedSections={completedSections}
            />
          </div>
        </div>
      </div>

      {/* Floating Back to Top Button */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Back to top"
        title="Back to top"
        className={`fixed bottom-8 right-8 z-50 flex h-12 w-12 items-center justify-center rounded-2xl border backdrop-blur-xl transition-all duration-300 cursor-pointer ${
          showBackToTop
            ? "translate-y-0 opacity-100 scale-100 shadow-xl"
            : "translate-y-10 opacity-0 scale-90 pointer-events-none"
        } ${
          isDarkMode
            ? "border-white/20 bg-[#8064C7] hover:bg-[#8B6DD4] text-white shadow-[0_10px_30px_rgba(128,100,199,0.4)]"
            : "border-[#8064C7]/20 bg-[#8064C7] hover:bg-[#7357B9] text-white shadow-[0_10px_30px_rgba(128,100,199,0.35)]"
        }`}
      >
        <ArrowUp size={22} />
      </button>
    </div>
  );
}

export default IndivisualStudySetPage;

