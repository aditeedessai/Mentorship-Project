import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sparkles, Tag, Loader2, ArrowRight } from "lucide-react";
import { fetchDocumentSummary } from "../services/api";

function SummaryPage({ studySetId: propStudySetId, onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();

  const studySetId = propStudySetId || location.state?.studySetId;
  const documentId = location.state?.documentId;

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ================= LOAD SUMMARY =================
  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      if (!documentId) {
        setError("No document selected. Please upload a document first.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const result = await fetchDocumentSummary(documentId);

        if (isMounted) {
          setSummary(result);
        }
      } catch (err) {
        console.error("Failed to load summary:", err);

        if (isMounted) {
          setError(err.message || "Failed to generate summary.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, [documentId]);

  // ================= CONTINUE TO QUIZ =================
  const handleContinue = () => {
    onNavigate?.("quiz");
    navigate("/quiz", {
      state: {
        studySetId,
        documentId,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFA]">

      {/* ================= HEADER ================= */}
      <div className="mb-8">

        <div className="flex items-center gap-2">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#98E8DE]/50">

            <Sparkles
              size={21}
              className="text-[#4E1F6E]"
            />

          </div>

          <div>

            <h1 className="text-3xl font-bold text-[#3E3E75]">
              Quick Summary
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              A quick overview to orient you before the quiz.
            </p>

          </div>

        </div>

      </div>


      {/* ================= ERROR MESSAGE ================= */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">

          <p className="text-sm font-medium text-red-600">
            {error}
          </p>

        </div>
      )}


      {/* ================= LOADING STATE ================= */}
      {loading && (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl bg-white p-8 text-center shadow-sm">

          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#98E8DE]/40">

            <Loader2
              size={28}
              className="animate-spin text-[#4E1F6E]"
            />

          </div>

          <h2 className="text-lg font-semibold text-[#3E3E75]">
            Generating your summary...
          </h2>

          <p className="mt-2 max-w-sm text-sm text-gray-500">
            AI Study Engine is skimming your material to give you a
            quick overview.
          </p>

        </div>
      )}


      {/* ================= SUMMARY CARD ================= */}
      {!loading && summary && (
        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">

          <h2 className="text-2xl font-bold text-[#3E3E75]">
            {summary.title}
          </h2>

          <div className="mt-4 max-w-2xl space-y-3">
            {(summary.overview_paragraphs || []).map((paragraph, index) => (
              <p
                key={index}
                className="text-sm leading-6 text-gray-600"
              >
                {paragraph}
              </p>
            ))}
          </div>

          {summary.key_topics && summary.key_topics.length > 0 && (
            <div className="mt-6">

              <div className="mb-3 flex items-center gap-2">

                <Tag
                  size={16}
                  className="text-[#4E1F6E]"
                />

                <h3 className="text-xs font-bold uppercase tracking-wide text-[#4E1F6E]">
                  Key Topics
                </h3>

              </div>

              <div className="flex flex-wrap gap-2">

                {summary.key_topics.map((topic, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-[#98E8DE]/30 px-3 py-1.5 text-xs font-medium text-[#3E3E75]"
                  >
                    {topic}
                  </span>
                ))}

              </div>

            </div>
          )}


          {/* ================= CONTINUE ACTION ================= */}
          <div className="mt-8 flex justify-end border-t border-gray-100 pt-6">

            <button
              onClick={handleContinue}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#4E1F6E] px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3E3E75] hover:shadow-md"
            >
              Continue to Generate Quiz
              <ArrowRight size={17} />
            </button>

          </div>

        </div>
      )}

    </div>
  );
}

export default SummaryPage;
