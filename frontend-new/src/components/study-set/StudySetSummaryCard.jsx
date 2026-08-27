import {
  FileText,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Check,
  Copy,
} from "lucide-react";

const SUMMARY_ILLUSTRATION_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAouo3QtCCo7QifKWkDxrxAsJZU4tNXEJ-10uNYJWyxAXKf100yjk9uni0q2p_0Yn8M8enbgmj3qqwz7gQxHnvMKC5kEQCh5lJtP5iNruT0eKFVxY9ipaj1ypR2QWo0BVTecbDunMXuknVl6PiMzKaTnqKuXl9ecuTz9VNw4IgvACNaQl_RhYFQfWXmQqCs9ar8ZSCaNE9WttpJoFbZAj5PWcbCOP6mY00x-srcnWLxBNS2SQSBjkEe";

function StudySetSummaryCard({
  summary,
  summaryLoading,
  summaryError,
  copied,
  documentsCount = 0,
  studySetName = "Study Set",
  onGenerateSummary,
  onCopySummary,
  sectionRef,
}) {
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

  return (
    <section
      ref={sectionRef}
      className="rounded-2xl bg-white/95 backdrop-blur-md p-6 sm:p-7 shadow-[0_4px_25px_rgba(78,31,110,0.06)] hover:shadow-[0_8px_30px_rgba(78,31,110,0.09)] border border-gray-100/90 flex flex-col transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-gradient-to-br from-[#98E8DE]/40 via-[#98E8DE]/20 to-[#4E1F6E]/10 border border-[#98E8DE]/60 text-[#4E1F6E] p-3 rounded-xl shadow-2xs ring-1 ring-[#98E8DE]/30">
          <FileText size={22} />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-[#3E3E75]">Summary</h2>
          <p className="text-xs text-gray-500">AI-generated comprehensive document synthesis</p>
        </div>
      </div>

      {/* STATE 1: LOADING */}
      {summaryLoading && (
        <div className="flex-1 flex flex-col justify-center items-center p-12 border border-gray-200/80 rounded-2xl bg-gradient-to-br from-white via-gray-50/50 to-[#98E8DE]/10 text-center shadow-xs">
          <Loader2 size={40} className="mb-3 animate-spin text-[#4E1F6E]" />
          <p className="text-base font-bold text-[#3E3E75]">
            Generating Study Set Summary...
          </p>
          <p className="mt-1 text-xs text-gray-500 max-w-sm">
            AI is analyzing your study materials and building a structured breakdown.
          </p>
        </div>
      )}

      {/* STATE 2: ERROR */}
      {!summaryLoading && summaryError && (
        <div className="flex-1 p-6 border border-red-200 rounded-2xl bg-red-50/60 text-center shadow-xs">
          <AlertCircle size={32} className="mx-auto mb-2 text-red-500" />
          <p className="text-sm font-bold text-red-700">
            Failed to generate summary
          </p>
          <p className="mt-1 text-xs text-red-600 mb-4">{summaryError}</p>
          <button
            type="button"
            onClick={onGenerateSummary}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4.5 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700 cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      )}

      {/* STATE 3: PRE-GENERATED / INITIAL UI */}
      {!summaryLoading && !summaryError && !summary && (
        <div className="flex-1 flex flex-col lg:flex-row items-center gap-6 p-6 border border-gray-200/80 rounded-2xl bg-gradient-to-br from-white via-gray-50/40 to-[#98E8DE]/15 relative overflow-hidden shadow-xs">
          <div className="w-full lg:w-1/2 shrink-0">
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm group">
              <img
                src={SUMMARY_ILLUSTRATION_URL}
                alt="AI Summary Illustration"
                className="w-full h-auto max-h-[220px] object-cover group-hover:scale-[1.03] transition-transform duration-500"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
          </div>
          <div className="flex-1 text-left w-full">
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#98E8DE]/40 to-[#4E1F6E]/10 border border-[#98E8DE]/70 text-[#4E1F6E] px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider mb-2.5 shadow-2xs">
              <Sparkles size={13} className="text-[#4E1F6E]" />
              AI SYNTHESIS
            </span>
            <h3 className="text-xl font-extrabold text-[#3E3E75] mb-1">
              AI-powered synthesis
            </h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              A comprehensive overview of your documents is ready to be generated.
            </p>



            <button
              type="button"
              onClick={onGenerateSummary}
              disabled={documentsCount === 0}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#4E1F6E] to-[#3E3E75] hover:from-[#3E3E75] hover:to-[#4E1F6E] text-white rounded-xl px-6 py-3.5 font-semibold text-sm shadow-md hover:shadow-lg hover:shadow-[#4E1F6E]/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={18} />
              <span>Generate Summary</span>
            </button>
            {documentsCount === 0 && (
              <p className="mt-2 text-[11px] text-gray-400 text-center">
                Upload at least one document first to generate a summary.
              </p>
            )}
          </div>
        </div>
      )}

      {/* STATE 4: GENERATED SUMMARY CONTENT */}
      {!summaryLoading && !summaryError && summary && (
        <div className="flex-1 flex flex-col justify-between gap-4 p-6 border border-gray-200/80 rounded-2xl bg-gradient-to-br from-white via-gray-50/40 to-[#98E8DE]/10 shadow-xs relative overflow-hidden">
          <div>
            <h3 className="text-xl font-extrabold text-[#3E3E75] mb-3">
              {summary.title || `${studySetName}: Overview`}
            </h3>

            <div className="space-y-3.5 text-sm text-gray-700 leading-relaxed">
              {summaryParagraphs.map((para, idx) => (
                <p
                  key={idx}
                  className="p-4 bg-white/90 backdrop-blur-xs border border-gray-100 rounded-xl shadow-2xs text-[#3E3E75]"
                >
                  {para}
                </p>
              ))}
            </div>

            {/* Key Takeaways */}
            {keyTakeaways.length > 0 && (
              <div className="mt-6 pt-5 border-t border-gray-200">
                <p className="font-mono text-xs font-bold text-[#006B5F] uppercase tracking-wider mb-3">
                  KEY TAKEAWAYS
                </p>
                <ul className="space-y-2.5">
                  {keyTakeaways.map((takeaway, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-xs sm:text-sm text-[#3E3E75] bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs hover:border-[#98E8DE] hover:shadow-xs transition-all"
                    >
                      <div className="p-1.5 rounded-full bg-[#98E8DE]/40 text-[#006B5F] shrink-0 mt-0.5 shadow-2xs">
                        <CheckCircle2 size={16} />
                      </div>
                      <span className="font-semibold leading-relaxed">{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onGenerateSummary}
              disabled={summaryLoading}
              className="flex items-center justify-center gap-2 bg-[#4E1F6E] hover:bg-[#3E3E75] text-white rounded-xl px-5 py-2.5 font-semibold text-xs shadow-sm hover:shadow transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={15} />
              Regenerate Summary
            </button>

            <button
              type="button"
              onClick={onCopySummary}
              className="p-2.5 rounded-xl border border-gray-200/80 bg-white text-[#3E3E75] hover:bg-gray-100 transition-colors cursor-pointer shadow-2xs"
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
  );
}

export default StudySetSummaryCard;
