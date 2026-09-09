import { useEffect, useRef } from 'react'
import { X, Keyboard } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export default function KeyboardShortcutsModal({ isOpen, onClose, quizType = 'mcq' }) {
  const { isDarkMode } = useTheme()
  const closeBtnRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    closeBtnRef.current?.focus()
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const mcqShortcuts = [
    { keys: ['←', '→'], description: 'Previous / Next question' },
    { keys: ['1', '2', '3', '4'], description: 'Select option A, B, C, or D' },
    { keys: ['A', 'B', 'C', 'D'], description: 'Select option A, B, C, or D' },
    { keys: ['Enter'], description: 'Confirm answer & go to next question' },
    { keys: ['Esc'], description: 'Close dialog / modal' },
  ]

  const qnaShortcuts = [
    { keys: ['←', '→'], description: 'Previous / Next question (when answer input is not focused)' },
    { keys: ['Esc'], description: 'Close dialog / modal' },
  ]

  const shortcuts = quizType === 'mcq' ? mcqShortcuts : qnaShortcuts

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border p-6 sm:p-7 shadow-2xl z-10 backdrop-blur-2xl transition-all duration-300 ${
          isDarkMode
            ? "border-white/10 bg-[#17131F] text-white"
            : "border-white/80 bg-white text-[#292530]"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-inherit mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
              <Keyboard size={20} />
            </div>
            <div>
              <h2 id="shortcuts-modal-title" className="text-lg sm:text-xl font-black tracking-tight">
                Keyboard Shortcuts
              </h2>
              <p className={`text-xs font-medium ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                Quick navigation for {quizType === 'mcq' ? 'MCQ Quiz' : 'QnA Quiz'}
              </p>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all cursor-pointer ${
              isDarkMode
                ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            }`}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                isDarkMode ? "border-white/5 bg-white/5" : "border-gray-200/80 bg-gray-50/80"
              }`}
            >
              <span className={`text-xs font-semibold ${isDarkMode ? "text-white/80" : "text-gray-700"}`}>
                {shortcut.description}
              </span>

              <div className="flex items-center gap-1.5 shrink-0">
                {shortcut.keys.map((k, kIdx) => (
                  <kbd
                    key={kIdx}
                    className={`min-w-7 h-7 px-2 flex items-center justify-center rounded-lg border text-xs font-mono font-bold shadow-xs ${
                      isDarkMode
                        ? "border-white/15 bg-white/10 text-white"
                        : "border-gray-300 bg-white text-gray-800"
                    }`}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}

          {quizType === 'qna' && (
            <p className={`text-[11px] font-medium pt-2 italic ${isDarkMode ? "text-white/40" : "text-gray-400"}`}>
              Note: Number and letter shortcuts are disabled during QnA quizzes so you can type freely in the answer box.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-inherit flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-6 rounded-xl bg-[#8064C7] hover:bg-[#8B6DD4] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
