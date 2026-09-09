import { useEffect, useRef } from 'react'
import { X, HelpCircle, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export default function QuizInstructionsModal({ isOpen, onClose, quizType = 'mcq' }) {
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border p-6 sm:p-7 shadow-2xl z-10 backdrop-blur-2xl transition-all duration-300 ${
          isDarkMode
            ? "border-white/10 bg-[#17131F] text-white"
            : "border-white/80 bg-white text-[#292530]"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="instructions-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-inherit mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
              <HelpCircle size={20} />
            </div>
            <div>
              <h2 id="instructions-modal-title" className="text-lg sm:text-xl font-black tracking-tight">
                Quiz Instructions
              </h2>
              <p className={`text-xs font-medium ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                Rules & guidelines for taking this assessment
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
        <div className="space-y-6">
          {/* Section 1: General Quiz Instructions */}
          <div>
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8064C7] dark:text-[#A78BFA] mb-3">
              <CheckCircle2 size={15} />
              General Quiz Instructions
            </h3>

            <ul className={`space-y-2.5 text-xs leading-relaxed font-medium ${isDarkMode ? "text-white/80" : "text-gray-700"}`}>
              <li className="flex items-start gap-2.5">
                <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#8064C7]" />
                <span>Read each question carefully before answering.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#8064C7]" />
                <span>Navigate through questions using the Question Navigator or Next/Previous buttons.</span>
              </li>
              {quizType === 'mcq' ? (
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#8064C7]" />
                  <span>Select the best answer option (A, B, C, or D) for each question. You can change your selection anytime before finishing.</span>
                </li>
              ) : (
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#8064C7]" />
                  <span>Type a clear and complete answer into the text area provided for each question.</span>
                </li>
              )}
              <li className="flex items-start gap-2.5">
                <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#8064C7]" />
                <span>Your responses are saved automatically as you navigate through the quiz.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#8064C7]" />
                <span>Complete all questions you intend to answer before clicking <strong>Finish Quiz</strong>.</span>
              </li>
            </ul>
          </div>

          {/* Section 2: Anti-Cheating & Exam Rules */}
          <div className={`rounded-2xl border p-4 sm:p-5 ${
            isDarkMode ? "border-amber-500/20 bg-amber-500/10 text-amber-200" : "border-amber-500/30 bg-amber-50/80 text-amber-900"
          }`}>
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2.5">
              <ShieldAlert size={16} />
              Anti-Cheating & Security Rules
            </h3>

            <p className="text-xs leading-relaxed font-semibold mb-3">
              This quiz is monitored in a secure examination environment to maintain academic integrity.
            </p>

            <ul className="space-y-2 text-xs leading-relaxed font-medium">
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span><strong>Fullscreen Mode:</strong> The quiz runs in fullscreen mode. Exiting fullscreen mode registers a security warning.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span><strong>Tab & Window Focus:</strong> Leaving the quiz tab or switching to another application window triggers a security violation.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span><strong>Developer Tools:</strong> Opening Developer Tools is strictly prohibited and will block the exam until closed.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span><strong>Copy/Paste & Context Menu:</strong> Copying, pasting, cutting, and right-clicking are disabled.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span><strong>Warning Limit:</strong> A maximum of 2 warnings are allowed. Reaching 3 violations will automatically terminate your session.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-inherit flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-6 rounded-xl bg-[#8064C7] hover:bg-[#8B6DD4] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  )
}
