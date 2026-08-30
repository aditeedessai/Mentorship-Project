import { AlertTriangle, ShieldAlert, ShieldX } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

/**
 * Anti-cheating warning system for quiz pages.
 *
 * Renders two types of warnings:
 *
 * 1. **Non-blocking banners** — clipboard/copy-paste violations.
 *    Displayed at the top, auto-dismissed after a timeout.
 *
 * 2. **Blocking security overlay** — DevTools, tab-switch, fullscreen-exit, focus-loss.
 *    Full-screen overlay that blocks all quiz interaction.
 *    - DevTools violations: auto-dismiss only when DevTools is no longer detected.
 *    - Transient violations (tab switch, focus loss): user can acknowledge via button.
 *
 * @param {{
 *   warnings: Array,
 *   activeViolation: { reason: string, message: string, isBlocking: boolean, warningNumber: number } | null,
 *   isViolationActive: boolean,
 *   warningCount: number,
 *   maxWarnings: number,
 *   onDismissViolation: () => void,
 * }} props
 */
export default function AntiCheatingWarning({
  warnings,
  activeViolation,
  isViolationActive,
  warningCount,
  maxWarnings,
  onDismissViolation,
}) {
  const { isDarkMode } = useTheme()

  const isFinalWarning = warningCount >= maxWarnings
  const isDevTools = activeViolation?.reason === 'devtools'

  // Violation-type-specific student-friendly descriptions
  const getViolationDescription = (reason) => {
    switch (reason) {
      case 'devtools':
        return 'Developer Tools activity has been detected.'
      case 'tab_switch':
        return 'You left the controlled quiz environment.'
      case 'fullscreen':
        return 'You exited the fullscreen exam environment.'
      case 'focus_loss':
        return 'The quiz window lost focus.'
      default:
        return 'An unauthorized action was detected.'
    }
  }

  // What the student needs to do to fix it
  const getResolutionInstruction = (reason) => {
    switch (reason) {
      case 'devtools':
        return 'Close Developer Tools before continuing. Your quiz will remain paused until the restricted environment is restored.'
      case 'fullscreen':
        return 'Please return to the quiz and follow all quiz restrictions.'
      default:
        return 'Please return to the quiz and follow all quiz restrictions.'
    }
  }

  return (
    <>
      {/* ── Non-blocking banners (clipboard warnings) ─────────── */}
      {warnings && warnings.length > 0 && (
        <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col items-center pointer-events-none">
          {warnings.map((warning) => (
            <div
              key={warning.type}
              role="alert"
              className="pointer-events-auto w-full max-w-[640px] mt-3 mx-auto px-4"
            >
              <div
                className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-[#1A1625]/95 border-[#E5C07B]/40 shadow-[#E5C07B]/10'
                    : 'bg-white/95 border-[#E5C07B]/60 shadow-[#E5C07B]/10'
                }`}
              >
                <div className="flex-shrink-0">
                  <div className="w-[28px] h-[28px] rounded-full flex items-center justify-center bg-[#FFF3E0]">
                    <AlertTriangle className="w-[14px] h-[14px] text-[#E6A23C]" strokeWidth={2.2} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-[13px] font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {warning.title}:
                  </span>
                  <span className={`text-[12.5px] ml-1.5 ${isDarkMode ? 'text-white/70' : 'text-gray-700'}`}>
                    {warning.message}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Blocking security overlay ─────────────────────────── */}
      {isViolationActive && activeViolation && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{ pointerEvents: 'all' }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="ac-warning-title"
          aria-describedby="ac-warning-desc"
        >
          {/* Backdrop */}
          <div className={`absolute inset-0 backdrop-blur-md ${
            isDarkMode ? 'bg-black/80' : 'bg-black/60'
          }`} />

          {/* Warning card */}
          <div className={`relative w-full max-w-md mx-4 rounded-2xl border-2 shadow-2xl overflow-hidden ${
            isFinalWarning
              ? isDarkMode
                ? 'border-red-500/60 bg-[#1A1015]/98 shadow-red-900/30'
                : 'border-red-400/80 bg-white shadow-red-200/40'
              : isDarkMode
                ? 'border-amber-500/50 bg-[#1A1620]/98 shadow-amber-900/20'
                : 'border-amber-400/70 bg-white shadow-amber-200/30'
          }`}>
            {/* Top accent bar */}
            <div className={`h-1.5 w-full ${
              isFinalWarning
                ? 'bg-gradient-to-r from-red-500 via-red-400 to-red-600'
                : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600'
            }`} />

            <div className="p-6 sm:p-8">
              {/* Icon */}
              <div className="flex justify-center mb-5">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  isFinalWarning
                    ? isDarkMode
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-red-100 text-red-500'
                    : isDarkMode
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-amber-100 text-amber-500'
                }`}>
                  {isFinalWarning
                    ? <ShieldX className="w-8 h-8" strokeWidth={1.8} />
                    : <ShieldAlert className="w-8 h-8" strokeWidth={1.8} />
                  }
                </div>
              </div>

              {/* Title */}
              <h2
                id="ac-warning-title"
                className={`text-center text-lg sm:text-xl font-black tracking-tight mb-1.5 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                {isFinalWarning ? 'Final Security Warning' : 'Security Warning'}
              </h2>

              {/* Warning counter badge */}
              <div className="flex justify-center mb-5">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
                  isFinalWarning
                    ? isDarkMode
                      ? 'border-red-500/40 bg-red-500/15 text-red-300'
                      : 'border-red-300 bg-red-50 text-red-600'
                    : isDarkMode
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                      : 'border-amber-300 bg-amber-50 text-amber-700'
                }`}>
                  Warning {warningCount} of {maxWarnings}
                </span>
              </div>

              {/* Violation description */}
              <div id="ac-warning-desc" className="space-y-3 mb-6">
                <p className={`text-sm font-semibold text-center ${
                  isDarkMode ? 'text-white/90' : 'text-gray-800'
                }`}>
                  {getViolationDescription(activeViolation.reason)}
                </p>

                {/* Resolution instruction */}
                <p className={`text-xs text-center leading-relaxed ${
                  isDarkMode ? 'text-white/60' : 'text-gray-500'
                }`}>
                  {getResolutionInstruction(activeViolation.reason)}
                </p>
              </div>

              {/* Consequence warning */}
              <div className={`text-center p-3 rounded-xl border text-xs font-bold ${
                isFinalWarning
                  ? isDarkMode
                    ? 'border-red-500/30 bg-red-500/10 text-red-300'
                    : 'border-red-200 bg-red-50 text-red-600'
                  : isDarkMode
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}>
                {isFinalWarning
                  ? 'This is your final warning. Any further prohibited action will immediately terminate your quiz.'
                  : 'One more violation may result in your quiz being terminated.'
                }
              </div>

              {/* DevTools: pulsing indicator instead of button */}
              {isDevTools && (
                <div className="mt-5 flex items-center justify-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    isDarkMode ? 'bg-amber-400' : 'bg-amber-500'
                  }`} />
                  <span className={`text-xs font-medium ${
                    isDarkMode ? 'text-white/50' : 'text-gray-400'
                  }`}>
                    Waiting for Developer Tools to be closed…
                  </span>
                </div>
              )}

              {/* Non-DevTools: acknowledge/return button */}
              {!isDevTools && (
                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    onClick={onDismissViolation}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                      isFinalWarning
                        ? isDarkMode
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                          : 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200/50'
                        : isDarkMode
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                          : 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200/50'
                    }`}
                  >
                    Return to Quiz
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
