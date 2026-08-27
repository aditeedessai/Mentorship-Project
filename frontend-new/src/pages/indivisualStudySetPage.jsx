import { useState, useEffect, useRef } from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";
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
  const [studySet, setStudySet] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [completedSections, setCompletedSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Section navigation refs & active tab state
  const summaryRef = useRef(null);
  const flashcardsRef = useRef(null);
  const mnemonicsRef = useRef(null);
  const [activeTab, setActiveTab] = useState("summary");

  // Summary state
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [copied, setCopied] = useState(false);

  // Flashcards state
  const [flashcards, setFlashcards] = useState(null);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [flashcardsError, setFlashcardsError] = useState("");
  const [practiceMode, setPracticeMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Contextual Mnemonic Creator State
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

        // 1. Find or fetch study set details
        const foundSet = studySets.find((s) => s.study_set_id === studySetId);
        if (foundSet) {
          setStudySet(foundSet);
        } else {
          const setDetail = await fetchStudySet(studySetId);
          if (isMounted && setDetail) {
            setStudySet(setDetail);
          }
        }

        // 2. Fetch documents belonging to this study set
        const docsList = await fetchStudySetDocuments(studySetId);
        if (isMounted) {
          setDocuments(docsList || []);
        }

        // 3. Fetch active attempt for question section completion status
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
    <div className="min-h-screen text-[#3E3E75] pb-12">
      {/* Top Back Navigation Bar */}
      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate?.("study-sets")}
          className="group inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-gray-200/80 hover:border-[#4E1F6E]/40 hover:bg-[#98E8DE]/20 px-4 py-2 rounded-full text-xs font-semibold text-[#4E1F6E] transition-all shadow-xs hover:shadow-sm cursor-pointer"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <span>Back to Study Sets</span>
        </button>
      </header>

      {/* Main Layout Container */}
      <div className="max-w-[1280px] mx-auto space-y-6">
        {/* Hero Header Card */}
        <StudySetHeroHeaderCard
          studySetName={studySetName}
          studySetId={studySetId}
          onNavigate={onNavigate}
        />

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-600 shadow-xs flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (8 cols): Summary, Flashcards, & Mnemonics */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Quick Section Navigation Pills */}
            <StudySetTabNav
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              summaryRef={summaryRef}
              flashcardsRef={flashcardsRef}
              mnemonicsRef={mnemonicsRef}
            />

            {/* SUMMARY SECTION CARD */}
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

            {/* FLASHCARDS SECTION CARD */}
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

            {/* MNEMONICS SECTION CARD */}
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

          {/* Right Column (4 cols): Documents & Question Progress */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* DOCUMENTS SECTION CARD */}
            <StudySetDocumentsCard
              documents={documents}
              loading={loading}
            />

            {/* QUESTION PROGRESS SECTION CARD */}
            <StudySetQuestionProgressCard
              completedSections={completedSections}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default IndivisualStudySetPage;
