import { ArrowRight } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const questionOptions = [5, 10, 15, 20, 25, 30, 40, 50]

export default function SessionActionBar({ questionCount, onQuestionCountChange, onStart, loading }) {
  const { isDarkMode } = useTheme()

  return (
    <div className={`flex items-center justify-between h-16 px-8 border-t backdrop-blur-2xl transition-colors duration-300 flex-shrink-0 ${
      isDarkMode ? "border-white/10 bg-[#17131F]/90 text-white" : "border-gray-200/80 bg-white/80 text-[#292530]"
    }`}>
      {/* Question Count Selector */}
      <div className="flex items-center gap-3">
        <label htmlFor="question-count" className={`text-xs font-bold ${isDarkMode ? "text-white/60" : "text-gray-600"}`}>
          Question Count:
        </label>
        <div className="relative">
          <select
            id="question-count"
            value={questionCount}
            onChange={(e) => onQuestionCountChange(Number(e.target.value))}
            disabled={loading}
            className={`appearance-none h-9 pl-3 pr-8 rounded-xl border text-xs font-bold cursor-pointer outline-none transition-colors ${
              isDarkMode
                ? "border-white/10 bg-white/5 text-white focus:border-[#8064C7]"
                : "border-gray-200 bg-white text-[#292530] focus:border-[#8064C7]"
            }`}
          >
            {questionOptions.map((n) => (
              <option key={n} value={n} className={isDarkMode ? "bg-[#17131F] text-white" : "bg-white text-[#292530]"}>
                {n} Questions
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50" />
            </svg>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <button
        type="button"
        onClick={onStart}
        disabled={loading}
        className={`inline-flex items-center gap-2 h-10 px-6 bg-[#8064C7] hover:bg-[#8B6DD4] text-white text-xs font-bold rounded-xl shadow-[0_10px_25px_rgba(128,100,199,0.3)] transition-all duration-300 hover:-translate-y-0.5
          ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        aria-label="Start study session"
      >
        {loading ? 'Loading...' : 'Start Study Session'}
        <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
      </button>
    </div>
  )
}

