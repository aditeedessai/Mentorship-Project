import { useEffect, useRef } from 'react'

export default function AbortQuizModal({ onCancel, onConfirm }) {
  const cancelRef = useRef(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const handleEsc = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-xl shadow-xl w-[400px] p-7 z-10"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="abort-title"
        aria-describedby="abort-desc"
      >
        <h2 id="abort-title" className="text-[20px] font-bold text-[#171717] mb-2">
          Abort Quiz?
        </h2>
        <p id="abort-desc" className="text-[14px] text-[#666666] leading-[1.55] mb-7">
          Are you sure you want to leave this quiz? Your current progress will be lost.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="h-[38px] px-5 rounded-[8px] border border-[#D0D0D0] text-[13.5px] font-medium text-[#555] bg-white hover:bg-[#F5F5F5] transition-colors duration-150 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-[38px] px-5 rounded-[8px] bg-[#D44444] text-white text-[13.5px] font-semibold hover:bg-[#C03333] transition-colors duration-150 cursor-pointer"
          >
            Abort Quiz
          </button>
        </div>
      </div>
    </div>
  )
}
