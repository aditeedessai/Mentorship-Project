import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

/**
 * Reusable Confirmation Modal for Destructive Actions
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {string} props.title - Modal title (default: "Delete Study Set?")
 * @param {string} props.itemName - Name of the item to be deleted
 * @param {string} props.warningText - Secondary warning (default: "This action cannot be undone.")
 * @param {string} props.confirmText - Label for confirm button (default: "Delete")
 * @param {string} props.cancelText - Label for cancel button (default: "Cancel")
 * @param {boolean} props.isLoading - Whether the delete action is processing
 * @param {string|null} props.error - Error message if delete failed
 * @param {Function} props.onConfirm - Callback when user clicks confirm
 * @param {Function} props.onCancel - Callback when user clicks cancel / closes modal
 */
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
  const cancelRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Set focus on Cancel button for safety and keyboard accessibility
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
      {/* Semi-transparent backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isLoading) onCancel();
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100 z-10 transition-all"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-desc"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Warning Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
            <AlertTriangle size={22} aria-hidden="true" />
          </div>
          <h2 id="delete-modal-title" className="text-xl font-bold text-[#3E3E75]">
            {title}
          </h2>
        </div>

        {/* Description & Warning */}
        <div id="delete-modal-desc" className="mb-5 space-y-1.5 text-sm text-gray-600">
          <p className="leading-relaxed">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-[#3E3E75] break-words">
              "{itemName}"
            </span>
            ?
          </p>
          {warningText && (
            <p className="text-xs font-medium text-gray-500">{warningText}</p>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-600">
            {error}
          </div>
        )}

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#98E8DE] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:cursor-not-allowed disabled:opacity-50"
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
