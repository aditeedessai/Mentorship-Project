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
} from "lucide-react";
import { fetchStudySet, fetchStudySetDocuments } from "../services/api";

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

  useEffect(() => {
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
        {/* ================= LEFT COLUMN: UPLOADED DOCUMENTS ================= */}
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

          {/* ================= SUMMARY SECTION (PLACEHOLDER) ================= */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#98E8DE]/40">
                <FileText size={17} className="text-[#4E1F6E]" />
              </div>
              <h2 className="text-xl font-bold text-[#3E3E75]">
                Summary
              </h2>
            </div>

            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-10 px-6 text-center">
              <p className="text-sm font-medium text-gray-500">
                Summary will appear here.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                AI-generated study summaries will be available in a future update.
              </p>
            </div>
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
