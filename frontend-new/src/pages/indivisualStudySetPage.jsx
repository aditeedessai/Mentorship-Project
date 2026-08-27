import { useState, useEffect, useRef } from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";
import {
  fetchStudySet,
  fetchStudySetDocuments,
  generateStudySetSummary,
} from "../services/api";

import StudySetHeroHeaderCard from "../components/study-set/StudySetHeroHeaderCard";
import StudySetTabNav from "../components/study-set/StudySetTabNav";
import StudySetSummaryCard from "../components/study-set/StudySetSummaryCard";
import StudySetFlashcardsCard from "../components/study-set/StudySetFlashcardsCard";
import StudySetMnemonicsCard from "../components/study-set/StudySetMnemonicsCard";
import StudySetDocumentsCard from "../components/study-set/StudySetDocumentsCard";
import StudySetQuestionProgressCard from "../components/study-set/StudySetQuestionProgressCard";

// TODO: Replace mock mnemonic generation with backend API integration.
const MOCK_MNEMONICS = {
  acronym: {
    title: "Remember the OSI Layers",
    mnemonic: "Please Do Not Throw Sausage Pizza Away",
    breakdown: [
      "P — Physical",
      "D — Data Link",
      "N — Network",
      "T — Transport",
      "S — Session",
      "P — Presentation",
      "A — Application",
    ],
  },
  rhyme: {
    title: "Remember the TCP Handshake",
    mnemonic: "SYN goes first, SYN-ACK replies, ACK arrives — connection ties.",
    breakdown: [
      "SYN — Start the connection",
      "SYN-ACK — Server acknowledges",
      "ACK — Client confirms",
    ],
  },
  story: {
    title: "Remember the Process",
    mnemonic:
      "Imagine three friends knocking on a door: one knocks, one answers, and the first friend says 'Got it!'",
    breakdown: [
      "Knock → SYN",
      "Answer → SYN-ACK",
      "Got it → ACK",
    ],
  },
  surprise: {
    title: "Your Memory Trick",
    mnemonic: "Please Do Not Throw Sausage Pizza Away!",
    breakdown: [
      "P — Physical",
      "D — Data Link",
      "N — Network",
      "T — Transport",
      "S — Session",
      "P — Presentation",
      "A — Application",
    ],
  },
};

const FLASHCARD_COUNT = 3;

function IndivisualStudySetPage({ studySetId, studySets = [], onNavigate }) {
  const [studySet, setStudySet] = useState(null);
  const [documents, setDocuments] = useState([]);
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

    setMnemonicError("");
    setMnemonicLoading(true);

    setTimeout(() => {
      const selectedResult =
        MOCK_MNEMONICS[mnemonicStyle] || MOCK_MNEMONICS.acronym;
      setMnemonic(selectedResult);
      setMnemonicLoading(false);
    }, 700);
  };

  const handleCopyMnemonic = () => {
    if (!mnemonic) return;
    const textToCopy = `${mnemonic.title}\n\n"${mnemonic.mnemonic}"\n\nBreakdown:\n${mnemonic.breakdown.join("\n")}`;
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
    setPracticeMode(false);

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
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % FLASHCARD_COUNT);
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
              practiceMode={practiceMode}
              setPracticeMode={setPracticeMode}
              currentCardIndex={currentCardIndex}
              isFlipped={isFlipped}
              studySetName={studySetName}
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
            <StudySetQuestionProgressCard />
          </div>
        </div>
      </div>
    </div>
  );
}

export default IndivisualStudySetPage;
