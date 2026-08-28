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
import { useTheme } from "../../context/ThemeContext";

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
  const { isDarkMode } = useTheme();

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
      className={`rounded-3xl border p-6 sm:p-7 backdrop-blur-2xl transition-all duration-500 flex flex-col ${
        isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
      }`}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA] p-3 rounded-2xl">
          <FileText size={22} />
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tight">Summary</h2>
          <p className={`text-xs ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>AI-generated comprehensive document synthesis</p>
        </div>
      </div>

      {summaryLoading && (
        <div className={`flex-1 flex flex-col justify-center items-center p-12 border rounded-2xl backdrop-blur-xl text-center ${
          isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200/80 bg-white/50"
        }`}>
          <Loader2 size={40} className="mb-3 animate-spin text-[#8064C7]" />
          <p className="text-base font-bold">
            Generating Study Set Summary...
          </p>
          <p className={`mt-1 text-xs max-w-sm ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>
            AI is analyzing your study materials and building a structured breakdown.
          </p>
        </div>
      )}

      {!summaryLoading && summaryError && (
        <div className="flex-1 p-6 border border-red-500/30 rounded-2xl bg-red-500/10 text-center">
          <AlertCircle size={32} className="mx-auto mb-2 text-red-400" />
          <p className="text-sm font-bold text-red-400">
            Failed to generate summary
          </p>
          <p className="mt-1 text-xs text-red-300 mb-4">{summaryError}</p>
          <button
            type="button"
            onClick={onGenerateSummary}
            className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4.5 py-2.5 text-xs font-bold text-white transition hover:bg-red-600 shadow-md"
          >
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      )}

      {!summaryLoading && !summaryError && !summary && (
        <div className={`flex-1 flex flex-col lg:flex-row items-center gap-6 p-6 border rounded-2xl backdrop-blur-xl relative overflow-hidden ${
          isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200/80 bg-white/50"
        }`}>
          <div className="w-full lg:w-1/2 shrink-0">
            <div className="rounded-2xl overflow-hidden border border-inherit shadow-sm group">
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
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider mb-2.5 ${
              isDarkMode ? "bg-[#8064C7]/20 border border-[#8064C7]/30 text-[#A78BFA]" : "bg-[#8064C7]/10 border border-[#8064C7]/20 text-[#8064C7]"
            }`}>
              <Sparkles size={13} />
              AI SYNTHESIS
            </span>
            <h3 className="text-xl font-black tracking-tight mb-1">
              AI-powered synthesis
            </h3>
            <p className={`text-xs mb-4 leading-relaxed ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>
              A comprehensive overview of your documents is ready to be generated.
            </p>

            <button
              type="button"
              onClick={onGenerateSummary}
              disabled={documentsCount === 0}
              className="w-full flex items-center justify-center gap-2.5 bg-[#8064C7] hover:bg-[#8B6DD4] text-white rounded-xl px-6 py-3.5 font-bold text-sm shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={18} />
              <span>Generate Summary</span>
            </button>
            {documentsCount === 0 && (
              <p className={`mt-2 text-[11px] text-center ${isDarkMode ? "text-white/40" : "text-gray-400"}`}>
                Upload at least one document first to generate a summary.
              </p>
            )}
          </div>
        </div>
      )}

      {!summaryLoading && !summaryError && summary && (
        <div className={`flex-1 flex flex-col justify-between gap-4 p-6 border rounded-2xl backdrop-blur-xl relative overflow-hidden ${
          isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200/80 bg-white/50"
        }`}>
          <div>
            <h3 className="text-xl font-black tracking-tight mb-3">
              {summary.title || `${studySetName}: Overview`}
            </h3>

            <div className="space-y-3.5 text-sm leading-relaxed">
              {summaryParagraphs.map((para, idx) => (
                <p
                  key={idx}
                  className={`p-4 border rounded-2xl backdrop-blur-xl ${
                    isDarkMode ? "border-white/5 bg-white/5" : "border-gray-100 bg-white/90 text-[#292530]"
                  }`}
                >
                  {para}
                </p>
              ))}
            </div>

            {keyTakeaways.length > 0 && (
              <div className="mt-6 pt-5 border-t border-inherit">
                <p className="font-mono text-xs font-bold text-[#8064C7] dark:text-[#A78BFA] uppercase tracking-wider mb-3">
                  KEY TAKEAWAYS
                </p>
                <ul className="space-y-2.5">
                  {keyTakeaways.map((takeaway, idx) => (
                    <li
                      key={idx}
                      className={`flex items-start gap-3 text-xs sm:text-sm p-3.5 rounded-2xl border transition-all ${
                        isDarkMode ? "border-white/5 bg-white/5" : "border-gray-100 bg-white text-[#292530]"
                      }`}
                    >
                      <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                        <CheckCircle2 size={16} />
                      </div>
                      <span className="font-bold leading-relaxed">{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-inherit">
            <button
              type="button"
              onClick={onGenerateSummary}
              disabled={summaryLoading}
              className="flex items-center justify-center gap-2 bg-[#8064C7] hover:bg-[#8B6DD4] text-white rounded-xl px-5 py-2.5 font-bold text-xs shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              <RefreshCw size={15} />
              Regenerate Summary
            </button>

            <button
              type="button"
              onClick={onCopySummary}
              className={`p-2.5 rounded-xl border transition-all ${
                isDarkMode ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
              title="Copy Summary"
            >
              {copied ? (
                <Check size={16} className="text-emerald-400" />
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

