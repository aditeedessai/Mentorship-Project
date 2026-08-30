import { LayoutGrid, X } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export default function QuestionNavigator({
  questionCount,
  currentQuestion,
  questionStatuses,
  onSelectQuestion,
  isOpen = false,
  onClose,
}) {
  const { isDarkMode } = useTheme()

  const getStatusClass = (num) => {
    const status = questionStatuses[num] || 'unvisited'
    const isCurrent = num === currentQuestion

    if (isCurrent && status === 'attempted') {
      return "border-2 border-[#8064C7] dark:border-[#A78BFA] bg-emerald-500 text-white font-black shadow-md ring-2 ring-emerald-500/30"
    }
    if (isCurrent) {
      return "border-2 border-[#8064C7] bg-[#8064C7]/20 text-[#8064C7] dark:text-[#A78BFA] font-black"
    }
    if (status === 'attempted') {
      return "bg-emerald-500 text-white font-bold shadow-sm"
    }
    if (status === 'skipped') {
      return "border-2 border-amber-400 text-amber-400 bg-amber-400/10 font-bold"
    }
    return isDarkMode ? "bg-white/5 text-white/40 border border-white/5" : "bg-gray-100 text-gray-400"
  }

  const handleSelect = (num) => {
    onSelectQuestion(num)
    if (onClose) onClose()
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          ${isOpen ? "fixed inset-y-0 left-0 z-50 w-72 shadow-2xl flex" : "hidden lg:flex"}
          lg:static lg:z-auto lg:w-60 lg:min-w-[240px] lg:shadow-none
          border-r backdrop-blur-2xl transition-colors duration-300 flex-col overflow-y-auto flex-shrink-0 ${
            isDarkMode ? "border-white/10 bg-[#17131F]/95 text-white" : "border-gray-200/80 bg-white/95 text-[#292530]"
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b lg:border-none border-inherit">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-[#8064C7]" strokeWidth={2} />
            <span className="text-xs font-black tracking-tight">Question Navigator</span>
          </div>

          {/* Mobile Close Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg border transition-colors lg:hidden ${
                isDarkMode ? "border-white/10 text-white/70 hover:bg-white/10" : "border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
              aria-label="Close Navigator"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Question Grid */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-4 gap-2.5">
            {Array.from({ length: questionCount }, (_, i) => {
              const num = i + 1
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleSelect(num)}
                  className={`aspect-square rounded-xl text-xs flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 ${getStatusClass(num)}`}
                  aria-label={`Question ${num}`}
                >
                  {num}
                </button>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="px-5 pt-7 pb-4 mt-auto">
          <div className={`text-[10px] font-mono font-bold tracking-wider uppercase mb-3 ${isDarkMode ? "text-white/40" : "text-gray-400"}`}>
            Legend
          </div>
          <div className="space-y-2.5 text-xs font-bold">
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-md bg-emerald-500" />
              <span className={isDarkMode ? "text-white/70" : "text-gray-600"}>Attempted</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-md border-2 border-amber-400 bg-amber-400/10" />
              <span className={isDarkMode ? "text-white/70" : "text-gray-600"}>Skipped</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-md border-2 border-[#8064C7] bg-[#8064C7]/20" />
              <span className={isDarkMode ? "text-white/70" : "text-gray-600"}>Current</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className={`w-3.5 h-3.5 rounded-md ${isDarkMode ? "bg-white/10" : "bg-gray-200"}`} />
              <span className={isDarkMode ? "text-white/70" : "text-gray-600"}>Unvisited</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}


