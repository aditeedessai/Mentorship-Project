import { AlertTriangle } from 'lucide-react'

/**
 * Anti-cheating warning overlay for quiz pages.
 *
 * Only shows non-fatal warnings (clipboard blocking).
 * Violation-level events (fullscreen exit, tab switch, focus loss, DevTools)
 * now terminate the quiz immediately — no warning/dismiss UI for those.
 *
 * @param {{ warnings: Array }} props
 */
export default function AntiCheatingWarning({ warnings }) {
  if (!warnings || warnings.length === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col items-center pointer-events-none">
      {warnings.map((warning) => (
        <div
          key={warning.type}
          role="alert"
          className="pointer-events-auto w-full max-w-[640px] mt-3 mx-auto"
        >
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-lg bg-white/95 backdrop-blur-sm border-[#E5C07B]/60 shadow-[#E5C07B]/10">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-[28px] h-[28px] rounded-full bg-[#FFF3E0] flex items-center justify-center">
                <AlertTriangle className="w-[13px] h-[13px] text-[#E6A23C]" strokeWidth={2.2} />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-bold text-[#333]">
                {warning.title}
              </span>
              <span className="text-[12.5px] text-[#666] ml-1.5">
                {warning.message}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
