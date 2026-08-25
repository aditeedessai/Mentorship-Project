import { AlertTriangle, WifiOff, ShieldAlert, RefreshCw, AlertCircle } from "lucide-react";

/**
 * QuestionGenerationErrorCard
 *
 * Renders a clean, structured application-level error card for question generation
 * and session configuration failures.
 *
 * @param {Object} props
 * @param {Object} props.errorObj - Classified error object from classifyQuestionGenerationError
 * @param {Function} [props.onRetry] - Function to trigger when clicking "Try Again"
 * @param {boolean} [props.isLoading] - Whether a retry is currently in progress
 */
export default function QuestionGenerationErrorCard({ errorObj, onRetry, isLoading }) {
  if (!errorObj) return null;

  const { type, title, message, secondaryMessage, showRetry = true } = errorObj;

  // Icon based on error classification
  const renderIcon = () => {
    switch (type) {
      case "quota":
        return <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden="true" />;
      case "network":
        return <WifiOff className="h-5 w-5 flex-shrink-0 text-rose-600" aria-hidden="true" />;
      case "auth":
        return <ShieldAlert className="h-5 w-5 flex-shrink-0 text-purple-600" aria-hidden="true" />;
      default:
        return <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600" aria-hidden="true" />;
    }
  };

  // Card container styling based on error classification
  const getCardStyle = () => {
    if (type === "quota") {
      return "border-amber-200/80 bg-amber-50/90 text-amber-900";
    }
    if (type === "auth") {
      return "border-purple-200/80 bg-purple-50/90 text-purple-900";
    }
    return "border-rose-200/80 bg-rose-50/90 text-rose-900";
  };

  return (
    <div className={`mt-5 rounded-2xl border p-5 shadow-xs transition-all ${getCardStyle()}`}>
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5">{renderIcon()}</div>

        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold leading-snug text-[#171717]">
            {title}
          </h3>

          <p className="mt-1 text-[13px] leading-relaxed text-[#4A4A4A]">
            {message}
          </p>

          {secondaryMessage && (
            <p className="mt-1.5 text-[12px] font-medium text-gray-500">
              {secondaryMessage}
            </p>
          )}

          {showRetry && onRetry && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onRetry}
                disabled={isLoading}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#4E1F6E] px-4 py-2 text-[13px] font-semibold text-white shadow-xs transition-all hover:bg-[#3E3E75] focus:outline-none focus:ring-2 focus:ring-[#98E8DE] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Retrying..." : "Try Again"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
