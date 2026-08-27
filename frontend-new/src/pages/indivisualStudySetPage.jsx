import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Sparkles,
  BookOpen,
  FileText,
  FileCheck,
  Presentation,
  Layers,
  File,
  Loader2,
  RefreshCw,
  Tag,
  AlertCircle,
} from "lucide-react";
import {
  fetchStudySet,
  fetchStudySetDocuments,
  generateStudySetSummary,
} from "../services/api";

const getFileIcon = (fileName) => {
  if (!fileName) return <File size={20} className="text-[#4E1F6E]" />;
  const ext = "." + fileName.toLowerCase().split(".").pop();
  if (ext === ".pdf") return <FileText size={20} className="text-[#4E1F6E]" />;
  if (ext === ".docx") return <FileCheck size={20} className="text-[#4E1F6E]" />;
  if (ext === ".pptx") return <Presentation size={20} className="text-[#4E1F6E]" />;
  return <FileText size={20} className="text-[#4E1F6E]" />;
};

function IndivisualStudySetPage({ studySetId, studySets = [], onNavigate }) {
  const [studySet, setStudySet] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Summary state scoped to selected studySetId
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  useEffect(() => {
    // Reset summary state whenever studySetId changes to prevent mixing Study Sets
    setSummary(null);
    setSummaryError("");
    setSummaryLoading(false);

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

  return (
    <div className="min-h-screen bg-[#F8FAFA] pb-12">
      {/* ================= BACK BUTTON ================= */}
      <button
        type="button"
        onClick={() => onNavigate?.("study-sets")}
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#4E1F6E] transition hover:text-[#3E3E75]"
      >
        <ArrowLeft size={18} />
        Back to Study Sets
      </button>

      {/* ================= HEADER & GENERATE QUIZ ACTION ================= */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#98E8DE]/50">
              <BookOpen size={19} className="text-[#4E1F6E]" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#4E1F6E]">
              Study Set
            </span>
          </div>

          <h1 className="text-3xl font-bold text-[#3E3E75]">
            {studySetName}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            View documents, practice flashcards, or generate a customized study quiz.
          </p>
        </div>

        {/* GENERATE QUIZ BUTTON */}
        <button
          type="button"
          onClick={() => onNavigate?.("quiz", { studySetId })}
          className="shrink-0 flex items-center justify-center gap-2.5 rounded-xl bg-[#4E1F6E] px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3E3E75] hover:shadow-md"
        >
          <Sparkles size={18} />
          Generate Quiz
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ================= MAIN CONTENT GRID ================= */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ================= LEFT COLUMN: UPLOADED DOCUMENTS & SUMMARY ================= */}
        <div className="lg:col-span-2 space-y-6">
          {/* UPLOADED DOCUMENTS CARD */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#3E3E75]">
                  Uploaded Documents
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Materials attached to this study set.
                </p>
              </div>

              <span className="rounded-full bg-[#98E8DE]/40 px-3 py-1 text-xs font-semibold text-[#4E1F6E]">
                {documents.length} File{documents.length === 1 ? "" : "s"}
              </span>
            </div>

            {loading && (
              <p className="py-6 text-center text-sm text-gray-500">
                Loading documents...
              </p>
            )}

            {!loading && documents.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
                <FileText size={28} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium text-[#3E3E75]">
                  No documents attached
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Upload study material to generate questions for this set.
                </p>
              </div>
            )}

            {!loading && documents.length > 0 && (
              <div className="space-y-3">
                {documents.map((doc) => {
                  const fileName = doc.filename || doc.name || "Study Document";
                  return (
                    <div
                      key={doc.document_id || doc.id}
                      className="flex items-center gap-3.5 rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:border-[#98E8DE] hover:bg-white"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#98E8DE]/40">
                        {getFileIcon(fileName)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-[#3E3E75]">
                          {fileName}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-500">
                          {doc.created_at
                            ? `Uploaded ${new Date(doc.created_at).toLocaleDateString()}`
                            : "Uploaded material"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ================= SUMMARY SECTION ================= */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#98E8DE]/40">
                  <FileText size={17} className="text-[#4E1F6E]" />
                </div>
                <h2 className="text-xl font-bold text-[#3E3E75]">
                  Summary
                </h2>
              </div>

              {summary && !summaryLoading && (
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#4E1F6E] transition hover:bg-gray-50 hover:border-[#98E8DE]"
                >
                  <RefreshCw size={13} />
                  Regenerate
                </button>
              )}
            </div>

            {/* STATE 1: GENERATING / LOADING */}
            {summaryLoading && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 py-12 px-6 text-center">
                <Loader2 size={32} className="mx-auto mb-3 animate-spin text-[#4E1F6E]" />
                <p className="text-sm font-semibold text-[#3E3E75]">
                  Generating Study Set Summary...
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  AI is analyzing your study materials and building a quick overview.
                </p>
              </div>
            )}

            {/* STATE 2: ERROR */}
            {!summaryLoading && summaryError && (
              <div className="rounded-xl border border-red-200 bg-red-50/70 p-5 text-center">
                <AlertCircle size={28} className="mx-auto mb-2 text-red-500" />
                <p className="text-sm font-semibold text-red-700">
                  Failed to generate summary
                </p>
                <p className="mt-1 text-xs text-red-600 max-w-md mx-auto">
                  {summaryError}
                </p>
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                >
                  <RefreshCw size={14} />
                  Try Again
                </button>
              </div>
            )}

            {/* STATE 3: NOT GENERATED YET */}
            {!summaryLoading && !summaryError && !summary && (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-10 px-6 text-center">
                <FileText size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-semibold text-[#3E3E75]">
                  No summary generated yet.
                </p>
                <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                  Generate an AI overview of all documents in this study set to review key concepts quickly.
                </p>
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  disabled={documents.length === 0}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#4E1F6E] px-5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#3E3E75] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles size={15} />
                  Generate Summary
                </button>
                {documents.length === 0 && (
                  <p className="mt-2 text-[11px] text-gray-400">
                    Upload at least one document first to generate a summary.
                  </p>
                )}
              </div>
            )}

            {/* STATE 4: SUCCESSFULLY GENERATED */}
            {!summaryLoading && !summaryError && summary && (
              <div className="space-y-5">
                {summary.title && (
                  <div className="rounded-xl bg-[#98E8DE]/20 p-4 border border-[#98E8DE]/40">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#4E1F6E]">
                      Overview Title
                    </span>
                    <h3 className="mt-1 text-lg font-bold text-[#3E3E75]">
                      {summary.title}
                    </h3>
                  </div>
                )}

                {summary.overview_paragraphs && summary.overview_paragraphs.length > 0 && (
                  <div className="space-y-3 text-sm leading-relaxed text-gray-700">
                    {summary.overview_paragraphs.map((para, idx) => (
                      <p key={idx} className="rounded-lg bg-gray-50/70 p-3.5 border border-gray-100">
                        {para}
                      </p>
                    ))}
                  </div>
                )}

                {summary.key_topics && summary.key_topics.length > 0 && (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Tag size={14} className="text-[#4E1F6E]" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#3E3E75]">
                        Key Topics Covered
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {summary.key_topics.map((topic, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-[#98E8DE]/40 px-3 py-1 text-xs font-medium text-[#4E1F6E] border border-[#98E8DE]/60"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: FLASHCARDS (PLACEHOLDER) ================= */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#98E8DE]/40">
                <Layers size={17} className="text-[#4E1F6E]" />
              </div>
              <h2 className="text-xl font-bold text-[#3E3E75]">
                Flashcards
              </h2>
            </div>

            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-12 px-6 text-center">
              <p className="text-sm font-medium text-gray-500">
                Flashcards will appear here.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Interactive flashcard decks will be available in a future update.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IndivisualStudySetPage;

