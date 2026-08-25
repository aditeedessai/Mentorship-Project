import { AlertTriangle } from 'lucide-react'

/**
 * Anti-cheating warning overlay for quiz pages.
 *
 * Displays warning banners for:
 * 1. Non-fatal clipboard operations (copy/cut/paste).
 * 2. 1st focus/session-loss violation (tab switch, window blur, fullscreen exit, DevTools).
 *
 * @param {{ warnings: Array }} props
 */
export default function AntiCheatingWarning({ warnings }) {
  if (!warnings || warnings.length === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col items-center pointer-events-none">
      {warnings.map((warning) => {
        const isFocusWarning = warning.type === 'focus_warning'
        return (
          <div
            key={warning.type}
            role="alert"
            className="pointer-events-auto w-full max-w-[640px] mt-3 mx-auto px-4"
          >
            <div
              className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-200 ${
                isFocusWarning
                  ? 'bg-amber-50/95 border-amber-300 shadow-amber-500/10'
                  : 'bg-white/95 border-[#E5C07B]/60 shadow-[#E5C07B]/10'
              }`}
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                <div
                  className={`w-[28px] h-[28px] rounded-full flex items-center justify-center ${
                    isFocusWarning ? 'bg-amber-100' : 'bg-[#FFF3E0]'
                  }`}
                >
                  <AlertTriangle
                    className={`w-[14px] h-[14px] ${
                      isFocusWarning ? 'text-amber-600' : 'text-[#E6A23C]'
                    }`}
                    strokeWidth={2.2}
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-bold text-gray-900">
                  {warning.title}:
                </span>
                <span className="text-[12.5px] text-gray-700 ml-1.5">
                  {warning.message}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
