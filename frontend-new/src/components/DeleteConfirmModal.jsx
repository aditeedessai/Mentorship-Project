import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function DeleteConfirmModal({
  isOpen,
  title = "Delete Study Set?",
  itemName,
  warningText = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  isLoading = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  const { isDarkMode } = useTheme();
  const cancelRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();

      const handleKeyDown = (e) => {
        if (e.key === "Escape" && !isLoading) {
          onCancel();
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isLoading) onCancel();
        }}
        aria-hidden="true"
      />

      <div
        className={`relative w-[92vw] sm:w-[440px] max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 shadow-2xl border z-10 transition-all backdrop-blur-2xl ${
          isDarkMode
            ? "border-white/10 bg-[#17131F] text-white"
            : "border-white/80 bg-white text-[#292530]"
        }`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-desc"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className={`absolute top-5 right-5 rounded-xl p-1.5 transition disabled:opacity-50 ${
            isDarkMode ? "hover:bg-white/10 text-white/60" : "hover:bg-gray-100 text-gray-400"
          }`}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-red-500/20 text-red-400">
            <AlertTriangle size={22} aria-hidden="true" />
          </div>
          <h2 id="delete-modal-title" className="text-lg sm:text-xl font-black tracking-tight">
            {title}
          </h2>
        </div>

        <div id="delete-modal-desc" className="mb-5 space-y-1.5 text-xs font-semibold">
          <p className="leading-relaxed">
            Are you sure you want to delete{" "}
            <span className="font-bold text-[#8064C7] dark:text-[#A78BFA] break-words">
              "{itemName}"
            </span>
            ?
          </p>
          {warningText && (
            <p className={`text-xs ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>{warningText}</p>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className={`w-full sm:w-auto rounded-xl border px-5 py-2.5 text-xs font-bold transition text-center ${
              isDarkMode ? "border-white/10 bg-white/5 hover:bg-white/10 text-white" : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
            }`}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-red-500 hover:bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-50 text-center"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

