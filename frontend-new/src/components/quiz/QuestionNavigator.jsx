import { LayoutGrid } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export default function QuestionNavigator({ questionCount, currentQuestion, questionStatuses, onSelectQuestion }) {
  const { isDarkMode } = useTheme()

  const getStatusClass = (num) => {
    if (num === currentQuestion) {
      return "border-2 border-[#8064C7] bg-[#8064C7]/20 text-[#8064C7] dark:text-[#A78BFA] font-black"
    }
    const status = questionStatuses[num] || 'unvisited'
    if (status === 'attempted') {
      return "bg-[#8064C7] text-white font-bold shadow-sm"
    }
    if (status === 'skipped') {
      return "border-2 border-amber-400 text-amber-400 bg-amber-400/10 font-bold"
    }
    return isDarkMode ? "bg-white/5 text-white/40 border border-white/5" : "bg-gray-100 text-gray-400"
  }

  return (
    <aside className={`w-60 min-w-[240px] border-r backdrop-blur-2xl transition-colors duration-300 flex flex-col overflow-y-auto flex-shrink-0 ${
      isDarkMode ? "border-white/10 bg-[#17131F]/90 text-white" : "border-gray-200/80 bg-white/80 text-[#292530]"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-[#8064C7]" strokeWidth={2} />
          <span className="text-xs font-black tracking-tight">Question Navigator</span>
        </div>
      </div>

      {/* Question Grid */}
      <div className="px-5 pt-2">
        <div className="grid grid-cols-4 gap-2.5">
          {Array.from({ length: questionCount }, (_, i) => {
            const num = i + 1
            return (
              <button
                key={num}
                type="button"
                onClick={() => onSelectQuestion(num)}
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
            <div className="w-3.5 h-3.5 rounded-md bg-[#8064C7]" />
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
  )
}

