import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Sparkles,
  BookOpen,
  FileText,
  FileCheck,
  Presentation,
  File,
  Loader2,
  RefreshCw,
  AlertCircle,
  Eye,
  CheckCircle2,
  Layers,
  RotateCw,
  Play,
  Copy,
  Check,
  Brain,
  ChevronRight,
  FileSpreadsheet,
  Target,
  CheckSquare,
  HelpCircle,
  Lightbulb,
  FileQuestion,
  Type,
  Music,
  Smile,
} from "lucide-react";
import {
  fetchStudySet,
  fetchStudySetDocuments,
  generateStudySetSummary,
} from "../services/api";

const QUESTION_TYPE_PROGRESS = [
  {
    id: "mcq",
    title: "Multiple Choice (MCQ)",
    answered: 10,
    total: 10,
    percentage: 100,
    status: "Completed",
    icon: <CheckSquare size={16} />,
    colorClass: "bg-[#006B5F]",
    barClass: "bg-gradient-to-r from-[#006B5F] to-[#62FAE3]",
  },
  {
    id: "short",
    title: "Short Answer",
    answered: 5,
    total: 8,
    percentage: 62,
    status: "In Progress",
    icon: <HelpCircle size={16} />,
    colorClass: "bg-[#4E1F6E]",
    barClass: "bg-gradient-to-r from-[#4E1F6E] to-[#BB89DF]",
  },
  {
    id: "application",
    title: "Application Questions",
    answered: 0,
    total: 5,
    percentage: 0,
    status: "Pending",
    icon: <Lightbulb size={16} />,
    colorClass: "bg-gray-400",
    barClass: "bg-gray-300",
  },
  {
    id: "qna",
    title: "Q&A / Essay",
    answered: 0,
    total: 5,
    percentage: 0,
    status: "Pending",
    icon: <FileQuestion size={16} />,
    colorClass: "bg-gray-400",
    barClass: "bg-gray-300",
  },
];

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

const STYLE_OPTIONS = [
  { id: "acronym", label: "Acronym", icon: <Type size={18} /> },
  { id: "rhyme", label: "Rhyme", icon: <Music size={18} /> },
  { id: "story", label: "Funny Story", icon: <Smile size={18} /> },
  { id: "surprise", label: "Surprise Me", icon: <Sparkles size={18} /> },
];

const getFileExtension = (fileName) => {
  if (!fileName) return "DOC";
  const ext = fileName.toLowerCase().split(".").pop();
  return ext.toUpperCase();
};

const getFileIcon = (fileName) => {
  if (!fileName) return <File size={20} className="text-[#006B5F]" />;
  const ext = "." + fileName.toLowerCase().split(".").pop();
  if (ext === ".pdf") return <FileText size={20} className="text-[#006B5F]" />;
  if (ext === ".docx" || ext === ".doc") return <FileCheck size={20} className="text-[#006B5F]" />;
  if (ext === ".pptx" || ext === ".ppt") return <Presentation size={20} className="text-[#006B5F]" />;
  if (ext === ".xlsx" || ext === ".csv") return <FileSpreadsheet size={20} className="text-[#006B5F]" />;
  return <FileText size={20} className="text-[#006B5F]" />;
};

const SUMMARY_ILLUSTRATION_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAouo3QtCCo7QifKWkDxrxAsJZU4tNXEJ-10uNYJWyxAXKf100yjk9uni0q2p_0Yn8M8enbgmj3qqwz7gQxHnvMKC5kEQCh5lJtP5iNruT0eKFVxY9ipaj1ypR2QWo0BVTecbDunMXuknVl6PiMzKaTnqKuXl9ecuTz9VNw4IgvACNaQl_RhYFQfWXmQqCs9ar8ZSCaNE9WttpJoFbZAj5PWcbCOP6mY00x-srcnWLxBNS2SQSBjkEe";

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
    // TODO: Replace mock generation with backend API call (POST /api/study-sets/{studySetId}/mnemonics).
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

  // Summary content formatting
  const summaryParagraphs = summary
    ? summary.overview_paragraphs ||
    (summary.overview
      ? [summary.overview]
      : typeof summary === "string"
        ? [summary]
        : [JSON.stringify(summary)])
    : [];

  const keyTakeaways = summary
    ? summary.key_takeaways || summary.key_topics || []
    : [];

  const handleCopySummary = () => {
    if (!summary) return;
    const titleText = summary.title || `${studySetName} Summary`;
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
    setCurrentCardIndex((prev) => (prev + 1) % MOCK_CARDS.length);
  };

  const currentCard = MOCK_CARDS[currentCardIndex];

  return (
    <div className="min-h-screen bg-[#F9F9FF] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#F2DAFF]/20 via-[#F9F9FF] to-[#E7EEFF]/30 text-[#111C2D] pb-12">
      {/* Top Back Navigation Bar */}
      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate?.("study-sets")}
          className="group inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#CEC3D1]/40 hover:border-[#4E1F6E]/40 px-4 py-2 rounded-full text-xs font-semibold text-[#4E1F6E] transition-all shadow-xs hover:shadow-sm cursor-pointer"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <span>Back to Study Sets</span>
        </button>
      </header>

      {/* Main Layout Container */}
      <div className="max-w-[1280px] mx-auto space-y-6">
        {/* Study Set Hero Header Card */}
        <div className="bg-white border border-[#CEC3D1]/50 rounded-[24px] p-6 lg:p-8 shadow-[0_10px_35px_rgba(78,31,110,0.05)] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative overflow-hidden backdrop-blur-sm">
          {/* Left Vertical Multi-Color Accent Bar */}
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#4E1F6E] via-[#006B5F] to-[#62FAE3]" />

          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-2 bg-[#4E1F6E]/10 border border-[#4E1F6E]/20 text-[#4E1F6E] px-3.5 py-1 rounded-full font-mono text-xs font-bold uppercase tracking-wider shadow-xs">
                <BookOpen size={14} className="text-[#4E1F6E]" />
                STUDY SET
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111C2D] tracking-tight mb-2">
              {studySetName}
            </h1>
            <p className="text-sm sm:text-base text-[#4C444F] font-normal max-w-xl">
              View documents, practice flashcards, or generate a customized study quiz.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate?.("quiz", { studySetId })}
              className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#4E1F6E] via-[#340056] to-[#4E1F6E] hover:from-[#340056] hover:to-[#4E1F6E] text-white rounded-[16px] px-6 py-3 font-semibold text-sm shadow-md hover:shadow-lg hover:shadow-[#4E1F6E]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              <Sparkles size={18} />
              <span>Generate Quiz</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate?.("results", { studySetId })}
              className="flex items-center justify-center gap-2.5 bg-white/90 border border-[#CEC3D1] hover:border-[#4E1F6E]/60 text-[#340056] font-semibold text-sm rounded-[16px] px-6 py-3 shadow-xs hover:bg-[#F2DAFF]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              <Eye size={18} />
              <span>View Results</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-600 shadow-xs flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (8 cols): Summary & Flashcards */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Quick Section Navigation Pills */}
            <div className="inline-flex flex-wrap items-center gap-1.5 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border border-[#CEC3D1]/50 shadow-sm w-fit sticky top-4 z-20">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("summary");
                  summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${activeTab === "summary"
                    ? "bg-gradient-to-r from-[#4E1F6E] to-[#340056] text-white shadow-xs"
                    : "text-[#4C444F] hover:text-[#340056] hover:bg-[#F2DAFF]/30"
                  }`}
              >
                <Brain size={15} />
                <span>Summary</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("flashcards");
                  flashcardsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${activeTab === "flashcards"
                    ? "bg-gradient-to-r from-[#4E1F6E] to-[#340056] text-white shadow-xs"
                    : "text-[#4C444F] hover:text-[#340056] hover:bg-[#F2DAFF]/30"
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
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${activeTab === "mnemonics"
                    ? "bg-gradient-to-r from-[#4E1F6E] to-[#340056] text-white shadow-xs"
                    : "text-[#4C444F] hover:text-[#340056] hover:bg-[#F2DAFF]/30"
                  }`}
              >
                <Sparkles size={15} />
                <span>Mnemonics</span>
              </button>
            </div>

            {/* SUMMARY SECTION */}
            <section ref={summaryRef} className="bg-white border border-[#CEC3D1]/40 rounded-[24px] p-6 sm:p-7 shadow-[0_10px_35px_rgba(78,31,110,0.04)] flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-gradient-to-br from-[#E7EEFF] via-[#F2DAFF] to-white p-2.5 rounded-xl border border-[#CEC3D1]/40 text-[#4E1F6E] shadow-xs">
                  <Brain size={20} />
                </div>
                <h2 className="text-xl font-bold text-[#340056]">Summary</h2>
              </div>

              {/* STATE 1: LOADING */}
              {summaryLoading && (
                <div className="flex-1 flex flex-col justify-center items-center p-12 border border-[#CEC3D1]/40 rounded-[20px] bg-[#F9F9FF] text-center shadow-xs">
                  <Loader2
                    size={38}
                    className="mb-3 animate-spin text-[#4E1F6E]"
                  />
                  <p className="text-base font-semibold text-[#111C2D]">
                    Generating Study Set Summary...
                  </p>
                  <p className="mt-1 text-xs text-[#4C444F] max-w-sm">
                    AI is analyzing your study materials and building a structured breakdown.
                  </p>
                </div>
              )}

              {/* STATE 2: ERROR */}
              {!summaryLoading && summaryError && (
                <div className="flex-1 p-6 border border-red-200 rounded-[20px] bg-red-50/50 text-center shadow-xs">
                  <AlertCircle size={32} className="mx-auto mb-2 text-red-500" />
                  <p className="text-sm font-semibold text-red-700">
                    Failed to generate summary
                  </p>
                  <p className="mt-1 text-xs text-red-600 mb-4">{summaryError}</p>
                  <button
                    type="button"
                    onClick={handleGenerateSummary}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 cursor-pointer shadow-xs"
                  >
                    <RefreshCw size={14} /> Try Again
                  </button>
                </div>
              )}

              {/* STATE 3: PRE-GENERATED / INITIAL STITCH UI */}
              {!summaryLoading && !summaryError && !summary && (
                <div className="flex-1 flex flex-col lg:flex-row items-center gap-6 p-6 border border-[#CEC3D1]/40 rounded-[20px] bg-gradient-to-br from-white via-[#F9F9FF] to-[#E7EEFF]/30 shadow-xs relative overflow-hidden">
                  <div className="w-full lg:w-1/2 shrink-0">
                    <div className="rounded-xl overflow-hidden border border-[#CEC3D1]/40 shadow-sm group">
                      <img
                        src={SUMMARY_ILLUSTRATION_URL}
                        alt="AI Summary Illustration"
                        className="w-full h-auto max-h-[220px] object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1 text-left w-full">
                    <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#4E1F6E]/10 to-[#006B5F]/10 border border-[#006B5F]/20 text-[#006B5F] px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider mb-2 shadow-xs">
                      <Sparkles size={13} className="text-[#006B5F]" />
                      AI SYNTHESIS
                    </span>
                    <h3 className="text-xl font-extrabold text-[#111C2D] mb-1">
                      AI-powered synthesis
                    </h3>
                    <p className="text-xs text-[#4C444F] mb-4 leading-relaxed">
                      A comprehensive overview of your documents is ready to be generated.
                    </p>

                    <div className="space-y-2 mb-6">
                      <p className="font-mono text-[11px] font-bold text-[#4E1F6E] uppercase tracking-wider mb-2">
                        KEY TOPICS PREVIEW
                      </p>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-[#111C2D]">
                        <CheckCircle2 size={18} className="text-[#006B5F] shrink-0" />
                        <span className="font-medium">Core Concepts</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-[#111C2D]">
                        <CheckCircle2 size={18} className="text-[#006B5F] shrink-0" />
                        <span className="font-medium">Historical Context</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-[#111C2D]">
                        <CheckCircle2 size={18} className="text-[#006B5F] shrink-0" />
                        <span className="font-medium">Critical Analysis</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateSummary}
                      disabled={documents.length === 0}
                      className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#4E1F6E] via-[#340056] to-[#006B5F] text-white rounded-[16px] px-6 py-3.5 font-semibold text-sm shadow-md hover:shadow-lg hover:shadow-[#006B5F]/20 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles size={18} />
                      <span>Generate Summary</span>
                    </button>
                    {documents.length === 0 && (
                      <p className="mt-2 text-[11px] text-gray-400 text-center">
                        Upload at least one document first to generate a summary.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* STATE 4: GENERATED SUMMARY CONTENT */}
              {!summaryLoading && !summaryError && summary && (
                <div className="flex-1 flex flex-col justify-between gap-4 p-6 border border-[#CEC3D1]/40 rounded-[20px] bg-gradient-to-br from-white via-[#F9F9FF] to-[#E7EEFF]/30 shadow-xs relative overflow-hidden">
                  <div>
                    <h3 className="text-xl font-extrabold text-[#111C2D] mb-3">
                      {summary.title || `${studySetName}: Overview`}
                    </h3>

                    <div className="space-y-3.5 text-sm text-[#4C444F] leading-relaxed">
                      {summaryParagraphs.map((para, idx) => (
                        <p key={idx} className="p-3.5 bg-white border border-[#CEC3D1]/30 rounded-xl shadow-xs">
                          {para}
                        </p>
                      ))}
                    </div>

                    {/* Key Takeaways */}
                    {keyTakeaways.length > 0 && (
                      <div className="mt-6 pt-5 border-t border-[#CEC3D1]/40">
                        <p className="font-mono text-xs font-bold text-[#006B5F] uppercase tracking-wider mb-3">
                          KEY TAKEAWAYS
                        </p>
                        <ul className="space-y-2.5">
                          {keyTakeaways.map((takeaway, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2.5 text-xs sm:text-sm text-[#111C2D] bg-white p-3 rounded-xl border border-[#CEC3D1]/30 shadow-xs"
                            >
                              <div className="p-1 rounded-full bg-[#006B5F]/10 text-[#006B5F] shrink-0 mt-0.5">
                                <CheckCircle2 size={16} />
                              </div>
                              <span className="font-medium">{takeaway}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#CEC3D1]/40">
                    <button
                      type="button"
                      onClick={handleGenerateSummary}
                      disabled={summaryLoading}
                      className="flex items-center justify-center gap-2 bg-[#4E1F6E] hover:bg-[#340056] text-white rounded-xl px-5 py-2.5 font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={15} />
                      Regenerate Summary
                    </button>

                    <button
                      type="button"
                      onClick={handleCopySummary}
                      className="p-2.5 rounded-xl border border-[#CEC3D1] text-[#4C444F] hover:bg-gray-100 transition-colors cursor-pointer shadow-xs"
                      title="Copy Summary"
                    >
                      {copied ? (
                        <Check size={16} className="text-emerald-600" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* FLASHCARDS SECTION */}
            <section ref={flashcardsRef} className="bg-white border border-[#CEC3D1]/40 rounded-[24px] p-6 sm:p-7 shadow-[0_10px_35px_rgba(78,31,110,0.04)] flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-[#E7EEFF] via-[#62FAE3]/20 to-white p-2.5 rounded-xl border border-[#CEC3D1]/40 text-[#006B5F] shadow-xs">
                    <Layers size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-[#340056]">Flashcards</h2>
                </div>

                {practiceMode && (
                  <button
                    type="button"
                    onClick={() => setPracticeMode(false)}
                    className="text-xs font-semibold text-[#006B5F] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>View Deck Preview</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>

              {/* STATE A: PRE-GENERATED / DECK PREVIEW STITCH UI */}
              {!practiceMode && (
                <div className="flex-1 flex flex-col lg:flex-row items-center gap-6 p-6 border border-[#CEC3D1]/40 rounded-[20px] bg-gradient-to-br from-white via-[#F9F9FF] to-[#E7EEFF]/30 shadow-xs">
                  <div className="w-full lg:w-1/3 shrink-0">
                    <div className="rounded-xl overflow-hidden border border-[#CEC3D1]/40 shadow-sm group">
                      <img
                        src={FLASHCARDS_ILLUSTRATION_URL}
                        alt="Flashcards Preview"
                        className="w-full h-auto max-h-[180px] object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex-1 text-left w-full">
                    <h3 className="text-xl font-extrabold text-[#111C2D] mb-1">
                      Deck Preview
                    </h3>
                    <p className="text-xs text-[#4C444F] mb-4">
                      Master key terms with interactive study cards.
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gradient-to-br from-[#F2DAFF]/40 via-white to-[#E7EEFF]/60 p-4 rounded-xl border border-[#4E1F6E]/20 shadow-xs">
                        <p className="font-mono text-xs font-bold text-[#4E1F6E]">
                          CARDS
                        </p>
                        <p className="text-xl font-extrabold text-[#111C2D]">42</p>
                      </div>
                      <div className="bg-gradient-to-br from-[#E7EEFF] via-white to-[#62FAE3]/20 p-4 rounded-xl border border-[#006B5F]/20 shadow-xs">
                        <p className="font-mono text-xs font-bold text-[#006B5F]">
                          CATEGORIES
                        </p>
                        <p className="text-xl font-extrabold text-[#111C2D]">3</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-mono text-xs font-semibold text-[#4C444F]">
                          Mastery Progress
                        </span>
                        <span className="font-mono text-xs font-semibold text-[#006B5F]">
                          0/42
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-[#E7EEFF] rounded-full overflow-hidden p-0.5 border border-[#CEC3D1]/30">
                        <div className="w-0 h-full bg-gradient-to-r from-[#006B5F] to-[#62FAE3] rounded-full transition-all duration-500" />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPracticeMode(true)}
                      className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#4E1F6E] via-[#340056] to-[#006B5F] text-white rounded-[16px] px-6 py-3 font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                    >
                      <Play size={18} />
                      <span>Start Practice</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STATE B: INTERACTIVE PRACTICE MODE */}
              {practiceMode && (
                <div className="flex-1 flex flex-col gap-6 p-6 border border-[#CEC3D1]/40 rounded-[20px] bg-gradient-to-br from-white via-[#F9F9FF] to-[#E7EEFF]/30 shadow-xs">
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    {/* Interactive Flip Card with Vibrant Design System Colors & 3D Animation */}
                    <div
                      className="w-full md:w-1/2 min-h-[230px] select-none"
                      style={{ perspective: "1000px" }}
                    >
                      <div
                        onClick={handleFlipCard}
                        className={`relative w-full h-full min-h-[230px] rounded-xl border-2 cursor-pointer shadow-md transition-all duration-500 hover:shadow-lg ${isFlipped
                            ? "border-[#4E1F6E]/50 shadow-[#4E1F6E]/10"
                            : "border-[#006B5F]/40 hover:border-[#006B5F] shadow-[#006B5F]/10"
                          }`}
                        style={{
                          transformStyle: "preserve-3d",
                          transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                        }}
                      >
                        {/* FRONT SIDE (TERM) */}
                        <div
                          className="absolute inset-0 w-full h-full bg-gradient-to-br from-white via-[#F9F9FF] to-[#E7EEFF]/60 rounded-xl p-6 border-l-4 border-l-[#006B5F] flex flex-col items-center justify-center text-center shadow-xs"
                          style={{
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                          }}
                        >
                          <div className="bg-[#006B5F]/10 border border-[#006B5F]/20 text-[#006B5F] px-3.5 py-1 rounded-full font-mono text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#006B5F] animate-pulse" />
                            TERM ({currentCardIndex + 1}/{MOCK_CARDS.length})
                          </div>
                          <h3 className="text-xl font-extrabold text-[#340056] mb-5 tracking-tight">
                            {currentCard.term}
                          </h3>
                          <button
                            type="button"
                            className="bg-[#006B5F] hover:bg-[#005047] text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all hover:scale-105 cursor-pointer"
                          >
                            <RotateCw size={14} />
                            <span>Flip to Reveal</span>
                          </button>
                        </div>

                        {/* BACK SIDE (DEFINITION) */}
                        <div
                          className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#F2DAFF]/40 via-white to-[#E7EEFF]/80 rounded-xl p-6 border-l-4 border-l-[#4E1F6E] flex flex-col items-center justify-center text-center shadow-xs"
                          style={{
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                            transform: "rotateY(180deg)",
                          }}
                        >
                          <div className="bg-[#4E1F6E]/10 border border-[#4E1F6E]/20 text-[#4E1F6E] px-3.5 py-1 rounded-full font-mono text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4E1F6E] animate-pulse" />
                            DEFINITION
                          </div>
                          <p className="text-sm font-semibold text-[#111C2D] mb-5 leading-relaxed max-w-xs">
                            {currentCard.definition}
                          </p>
                          <button
                            type="button"
                            className="bg-[#4E1F6E] hover:bg-[#340056] text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all hover:scale-105 cursor-pointer"
                          >
                            <RotateCw size={14} />
                            <span>Flip Back</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Deck Info & Progress */}
                    <div className="flex-1 w-full">
                      <h3 className="text-lg font-bold text-[#111C2D] mb-1">
                        Current Deck
                      </h3>
                      <p className="text-xs text-[#4C444F] mb-4">
                        Mastering {studySetName} Fundamentals
                      </p>

                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-mono text-xs font-semibold text-[#4C444F]">
                            Mastery Progress
                          </span>
                          <span className="font-mono text-xs font-semibold text-[#006B5F]">
                            12/45 Cards Mastered
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-[#E7EEFF] rounded-full overflow-hidden p-0.5 border border-[#CEC3D1]/30">
                          <div className="w-[27%] h-full bg-gradient-to-r from-[#006B5F] to-[#62FAE3] rounded-full transition-all duration-500" />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleNextCard}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#4E1F6E] via-[#340056] to-[#006B5F] text-white rounded-[16px] px-6 py-3.5 font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                      >
                        <Play size={16} />
                        <span>Next Flashcard</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* CONTEXTUAL MNEMONIC CREATOR SECTION */}
            <section ref={mnemonicsRef} className="bg-white border border-[#CEC3D1]/40 rounded-[24px] p-6 sm:p-7 shadow-[0_10px_35px_rgba(78,31,110,0.04)] flex flex-col">
              {/* Section Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-[#E7EEFF] via-[#F2DAFF] to-white p-2.5 rounded-xl border border-[#CEC3D1]/40 text-[#4E1F6E] shadow-xs">
                    <Brain size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#340056] flex items-center gap-2">
                      <span>Contextual Mnemonic Creator</span>
                      <span className="text-base"></span>
                    </h2>
                    <p className="text-xs text-[#4C444F]">
                      Turn complex concepts, lists, and sequences into memorable tricks.
                    </p>
                  </div>
                </div>
                <span className="bg-[#4E1F6E]/10 border border-[#4E1F6E]/20 text-[#4E1F6E] font-mono text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                  AI MEMORY TOOL
                </span>
              </div>

              {/* Main Card Body */}
              <div className="flex-1 flex flex-col gap-5 p-6 border border-[#CEC3D1]/40 rounded-[20px] bg-gradient-to-br from-white via-[#F9F9FF] to-[#E7EEFF]/30 shadow-xs relative overflow-hidden">
                {/* STATE 1: GENERATING / LOADING */}
                {mnemonicLoading && (
                  <div className="py-12 text-center">
                    <Loader2 size={36} className="mx-auto mb-3 animate-spin text-[#4E1F6E]" />
                    <p className="text-base font-semibold text-[#111C2D]">
                      Creating your memory trick...
                    </p>
                    <p className="mt-1 text-xs text-[#4C444F]">
                      Analyzing topic and crafting a memorable mnemonic.
                    </p>
                  </div>
                )}

                {/* STATE 2: GENERATED RESULT CARD */}
                {!mnemonicLoading && mnemonic && (
                  <div className="space-y-5">
                    <div className="p-5 border border-[#4E1F6E]/20 rounded-2xl bg-gradient-to-br from-[#F2DAFF]/30 via-white to-[#E7EEFF]/50 shadow-xs">
                      <div className="flex justify-between items-center mb-3">
                        <span className="inline-flex items-center gap-1.5 bg-[#4E1F6E]/10 border border-[#4E1F6E]/20 text-[#4E1F6E] px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider">
                          <Sparkles size={13} />
                          YOUR MEMORY TRICK
                        </span>
                        <span className="text-xs font-semibold text-[#006B5F] capitalize">
                          Style: {mnemonicStyle}
                        </span>
                      </div>

                      <h3 className="text-lg font-extrabold text-[#111C2D] mb-3">
                        {mnemonic.title}
                      </h3>

                      {/* Highlighted Phrase */}
                      <div className="p-4 bg-white border-l-4 border-l-[#4E1F6E] border border-[#CEC3D1]/40 rounded-xl shadow-xs mb-4">
                        <p className="text-base sm:text-lg font-extrabold text-[#340056] italic">
                          "{mnemonic.mnemonic}"
                        </p>
                      </div>

                      {/* Breakdown */}
                      <div className="pt-3 border-t border-[#CEC3D1]/40">
                        <p className="font-mono text-xs font-bold text-[#006B5F] uppercase tracking-wider mb-2">
                          BREAKDOWN
                        </p>
                        <ul className="space-y-1.5">
                          {mnemonic.breakdown.map((item, idx) => (
                            <li
                              key={idx}
                              className="text-xs sm:text-sm font-semibold text-[#111C2D] flex items-center gap-2 bg-white/80 p-2 rounded-lg border border-[#CEC3D1]/30"
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
                        onClick={handleCopyMnemonic}
                        className="flex items-center justify-center gap-2 bg-[#4E1F6E] hover:bg-[#340056] text-white rounded-xl px-5 py-2.5 font-semibold text-xs shadow-xs transition-all cursor-pointer"
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
                        onClick={handleResetMnemonic}
                        className="flex items-center justify-center gap-2 border border-[#CEC3D1] text-[#340056] hover:bg-gray-100 rounded-xl px-5 py-2.5 font-semibold text-xs shadow-xs transition-all cursor-pointer"
                      >
                        <RotateCw size={15} />
                        <span>Create Another</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* STATE 3: INPUT / CREATION FORM (when mnemonic is null) */}
                {!mnemonicLoading && !mnemonic && (
                  <div className="space-y-5">
                    {/* Intro Explanation */}
                    <div className="flex items-start gap-3 p-4 bg-white border border-[#CEC3D1]/40 rounded-2xl shadow-xs">
                      <div className="p-2 rounded-xl bg-[#E7EEFF] text-[#006B5F] shrink-0">
                        <Lightbulb size={20} />
                      </div>
                      <p className="text-xs sm:text-sm text-[#4C444F] leading-relaxed">
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
                      <label className="block text-xs font-bold text-[#111C2D] uppercase tracking-wider mb-2">
                        What do you want to remember?
                      </label>
                      <input
                        type="text"
                        value={mnemonicTopic}
                        onChange={(e) => {
                          setMnemonicTopic(e.target.value);
                          if (mnemonicError) setMnemonicError("");
                        }}
                        placeholder="e.g. OSI model layers, stages of mitosis, TCP handshake..."
                        className="w-full px-4 py-3 rounded-xl border border-[#CEC3D1] bg-white text-sm text-[#111C2D] placeholder-gray-400 focus:outline-none focus:border-[#4E1F6E] focus:ring-2 focus:ring-[#4E1F6E]/20 transition-all shadow-xs"
                      />
                    </div>

                    {/* Choose Style Options */}
                    <div>
                      <label className="block text-xs font-bold text-[#111C2D] uppercase tracking-wider mb-2">
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
                              className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${isSelected
                                  ? "bg-gradient-to-br from-[#4E1F6E] to-[#340056] text-white border-[#4E1F6E] shadow-sm scale-[1.02]"
                                  : "bg-white border-[#CEC3D1] text-[#4C444F] hover:border-[#006B5F] hover:bg-[#F9F9FF]"
                                }`}
                            >
                              <div className={isSelected ? "text-white" : "text-[#006B5F]"}>
                                {opt.icon}
                              </div>
                              <span className="text-xs font-semibold text-center">
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
                      onClick={handleGenerateMnemonic}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#4E1F6E] via-[#340056] to-[#006B5F] text-white rounded-[16px] px-6 py-3.5 font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                    >
                      <Sparkles size={18} />
                      <span>Create Memory Trick</span>
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column (4 cols): Documents & Question Progress */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* DOCUMENTS SECTION (Dynamic height based on content) */}
            <section className="bg-white border border-[#CEC3D1]/40 rounded-[24px] p-6 sm:p-7 shadow-[0_10px_35px_rgba(78,31,110,0.04)] flex flex-col transition-all duration-300">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-[#340056]">Documents Uploaded</h2>
                <span className="bg-[#006B5F]/10 border border-[#006B5F]/20 text-[#006B5F] font-mono text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                  {documents.length} File{documents.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="flex flex-col gap-3 p-5 border border-[#CEC3D1]/40 rounded-[20px] bg-gradient-to-br from-white via-[#F9F9FF] to-[#E7EEFF]/30 shadow-xs relative overflow-hidden transition-all duration-300">
                {loading && (
                  <div className="py-8 text-center">
                    <Loader2 size={28} className="mx-auto mb-2 animate-spin text-[#006B5F]" />
                    <p className="text-xs font-semibold text-[#4C444F]">
                      Loading documents...
                    </p>
                  </div>
                )}

                {!loading && documents.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#CEC3D1] p-6 text-center bg-white/60">
                    <FileText size={32} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm font-semibold text-[#111C2D]">
                      No documents attached
                    </p>
                    <p className="mt-1 text-xs text-[#4C444F]">
                      Upload study material to generate questions for this set.
                    </p>
                  </div>
                )}

                {!loading && documents.length > 0 && (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {documents.map((doc) => {
                      const fileName = doc.filename || doc.name || "Study Document";
                      const extTag = getFileExtension(fileName);
                      return (
                        <div
                          key={doc.document_id || doc.id}
                          className="p-3.5 border border-[#CEC3D1]/40 rounded-2xl bg-white hover:border-[#006B5F] hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex items-center justify-between shadow-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#E7EEFF] to-[#62FAE3]/30 flex items-center justify-center text-[#006B5F] group-hover:scale-105 transition-transform shrink-0 shadow-xs">
                              {getFileIcon(fileName)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="truncate text-sm font-bold text-[#111C2D] group-hover:text-[#006B5F] transition-colors">
                                {fileName}
                              </h4>
                              <p className="text-xs text-[#4C444F] mt-0.5">
                                {doc.created_at
                                  ? new Date(doc.created_at).toLocaleDateString()
                                  : "Uploaded material"}
                              </p>
                            </div>
                          </div>

                          <span className="font-mono text-[10px] font-extrabold text-[#006B5F] bg-[#006B5F]/10 px-2 py-1 rounded-md ml-2 shrink-0 border border-[#006B5F]/20">
                            {extTag}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* QUESTION PROGRESS SECTION (4 Question Types) */}
            <section className="bg-white border border-[#CEC3D1]/40 rounded-[24px] p-6 sm:p-7 shadow-[0_10px_35px_rgba(78,31,110,0.04)] flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-[#E7EEFF] via-[#F2DAFF] to-white p-2.5 rounded-xl border border-[#CEC3D1]/40 text-[#4E1F6E] shadow-xs">
                    <Target size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#340056]">Question Progress</h2>
                    <p className="text-xs text-[#4C444F]">Answered vs. Pending Questions</p>
                  </div>
                </div>
                <span className="bg-[#4E1F6E]/10 border border-[#4E1F6E]/20 text-[#4E1F6E] font-mono text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                  4 Types
                </span>
              </div>

              <div className="space-y-3.5">
                {QUESTION_TYPE_PROGRESS.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 border border-[#CEC3D1]/40 rounded-2xl bg-gradient-to-r from-white via-[#F9F9FF] to-[#E7EEFF]/30 shadow-xs hover:border-[#006B5F] hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl text-white shrink-0 shadow-xs ${item.colorClass}`}>
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-[#111C2D] truncate group-hover:text-[#006B5F] transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-xs text-[#4C444F] mt-0.5 font-mono">
                            {item.answered}/{item.total} Answered
                          </p>
                        </div>
                      </div>

                      <span
                        className={`font-mono text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-xs shrink-0 ml-2 ${item.status === "Completed"
                            ? "bg-[#006B5F]/10 border-[#006B5F]/30 text-[#006B5F]"
                            : item.status === "In Progress"
                              ? "bg-[#4E1F6E]/10 border-[#4E1F6E]/30 text-[#4E1F6E]"
                              : "bg-gray-100 border-gray-200 text-gray-500"
                          }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-[#E7EEFF] rounded-full overflow-hidden p-0.5 border border-[#CEC3D1]/30 mt-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${item.barClass}`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IndivisualStudySetPage;
