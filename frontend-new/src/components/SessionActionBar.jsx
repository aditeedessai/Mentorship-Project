import { ArrowRight } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function SessionActionBar({ onStart, loading }) {
  const { isDarkMode } = useTheme()

  return (
    <div className={`flex items-center justify-end h-16 px-8 border-t backdrop-blur-2xl transition-colors duration-300 flex-shrink-0 ${
      isDarkMode ? "border-white/10 bg-[#17131F]/90 text-white" : "border-gray-200/80 bg-white/80 text-[#292530]"
    }`}>
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

