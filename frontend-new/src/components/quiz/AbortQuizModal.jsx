import { useEffect, useRef } from 'react'
import { useTheme } from '../../context/ThemeContext'

export default function AbortQuizModal({ onCancel, onConfirm }) {
  const { isDarkMode } = useTheme()
  const cancelRef = useRef(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const handleEsc = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onCancel} aria-hidden="true" />

      <div
        className={`relative rounded-3xl border p-7 shadow-2xl w-[400px] z-10 backdrop-blur-2xl transition-all duration-300 ${
          isDarkMode
            ? "border-white/10 bg-[#17131F] text-white"
            : "border-white/80 bg-white text-[#292530]"
        }`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="abort-title"
        aria-describedby="abort-desc"
      >
        <h2 id="abort-title" className="text-xl font-black mb-2 tracking-tight">
          Abort Quiz?
        </h2>
        <p id="abort-desc" className={`text-xs leading-relaxed mb-7 font-semibold ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>
          Are you sure you want to leave this quiz? Your current progress will be lost.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className={`h-10 px-5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isDarkMode ? "border-white/10 bg-white/5 hover:bg-white/10 text-white" : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 px-5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            Abort Quiz
          </button>
        </div>
      </div>
    </div>
  )
}

