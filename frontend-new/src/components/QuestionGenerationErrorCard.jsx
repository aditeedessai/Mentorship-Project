import { AlertTriangle, WifiOff, ShieldAlert, RefreshCw, AlertCircle } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function QuestionGenerationErrorCard({ errorObj, onRetry, isLoading }) {
  const { isDarkMode } = useTheme();

  if (!errorObj) return null;

  const { type, title, message, secondaryMessage, showRetry = true } = errorObj;

  const renderIcon = () => {
    switch (type) {
      case "quota":
        return <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" aria-hidden="true" />;
      case "network":
        return <WifiOff className="h-5 w-5 flex-shrink-0 text-rose-500" aria-hidden="true" />;
      case "auth":
        return <ShieldAlert className="h-5 w-5 flex-shrink-0 text-[#8064C7]" aria-hidden="true" />;
      default:
        return <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-500" aria-hidden="true" />;
    }
  };

  const getCardStyle = () => {
    if (type === "quota") {
      return isDarkMode
        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
        : "border-amber-200 bg-amber-50 text-amber-900";
    }
    if (type === "auth") {
      return isDarkMode
        ? "border-[#8064C7]/30 bg-[#8064C7]/15 text-purple-200"
        : "border-[#8064C7]/20 bg-[#8064C7]/10 text-purple-900";
    }
    return isDarkMode
      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
      : "border-rose-200 bg-rose-50 text-rose-900";
  };

  return (
    <div className={`mt-5 rounded-2xl border p-5 transition-all backdrop-blur-xl ${getCardStyle()}`}>
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5">{renderIcon()}</div>

        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold leading-snug">
            {title}
          </h3>

          <p className={`mt-1 text-xs leading-relaxed ${isDarkMode ? "opacity-80" : "opacity-90"}`}>
            {message}
          </p>

          {secondaryMessage && (
            <p className="mt-1.5 text-xs font-semibold opacity-60">
              {secondaryMessage}
            </p>
          )}

          {showRetry && onRetry && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onRetry}
                disabled={isLoading}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#8064C7] px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-[#8B6DD4] disabled:cursor-not-allowed disabled:opacity-50"
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

