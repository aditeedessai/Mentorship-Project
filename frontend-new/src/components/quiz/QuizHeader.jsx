import { useState, useRef, useEffect } from 'react'
import { Clock, Star, MoreVertical, Sparkles, LayoutGrid, PenLine } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export default function QuizHeader({
  remainingSeconds,
  isBookmarked,
  onToggleBookmark,
  onAbort,
  onToggleNavigator,
  onToggleRoughWork,
}) {
  const { isDarkMode } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <header className={`flex items-center justify-between h-14 px-3 sm:px-6 border-b backdrop-blur-2xl transition-colors duration-300 z-10 ${
      isDarkMode ? "border-white/10 bg-[#17131F]/90 text-white" : "border-gray-200/80 bg-white/80 text-[#292530]"
    }`}>
      {/* Left section: Brand & Mobile Nav Toggle */}
      <div className="flex items-center gap-2">
        {/* Mobile Navigator Drawer Toggle */}
        {onToggleNavigator && (
          <button
            type="button"
            onClick={onToggleNavigator}
            className={`p-2 rounded-xl border transition-colors lg:hidden cursor-pointer ${
              isDarkMode ? "border-white/10 bg-white/5 text-white/80 hover:bg-white/10" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            title="Questions Navigator"
            aria-label="Toggle Questions Navigator"
          >
            <LayoutGrid className="w-4 h-4" strokeWidth={2} />
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#8064C7] flex items-center justify-center shadow-md">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-sm sm:text-base font-black tracking-tight">Jot<span className="text-[#8064C7]">.</span></span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Mobile Rough Work Drawer Toggle */}
        {onToggleRoughWork && (
          <button
            type="button"
            onClick={onToggleRoughWork}
            className={`p-2 rounded-xl border transition-colors lg:hidden cursor-pointer ${
              isDarkMode ? "border-white/10 bg-white/5 text-[#A78BFA] hover:bg-white/10" : "border-gray-200 bg-white text-[#8064C7] hover:bg-gray-50"
            }`}
            title="Rough Work Notes"
            aria-label="Toggle Rough Work Panel"
          >
            <PenLine className="w-4 h-4" strokeWidth={2} />
          </button>
        )}

        {/* Timer */}
        <div className={`flex items-center gap-1.5 h-8 px-2.5 sm:px-3.5 rounded-full font-mono text-[11px] sm:text-xs font-bold ${
          isDarkMode ? "bg-[#8064C7]/20 border border-[#8064C7]/30 text-[#A78BFA]" : "bg-[#8064C7]/10 border border-[#8064C7]/20 text-[#8064C7]"
        }`}>
          <Clock className="w-3.5 h-3.5" strokeWidth={2.2} />
          <span>{formatTime(remainingSeconds)}<span className="hidden sm:inline"> remaining</span></span>
        </div>

        {/* Bookmark */}
        <button
          type="button"
          onClick={onToggleBookmark}
          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
            isDarkMode ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-gray-200 bg-white hover:bg-gray-50"
          }`}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
        >
          <Star
            className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400 text-amber-400' : isDarkMode ? 'text-white/40' : 'text-gray-400'}`}
            strokeWidth={1.8}
          />
        </button>

        <div className={`hidden sm:block w-px h-5 ${isDarkMode ? "bg-white/10" : "bg-gray-200"}`} />

        {/* Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDarkMode ? "border-white/10 bg-white/5 hover:bg-white/10 text-white/70" : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
            }`}
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="w-4 h-4" strokeWidth={2} />
          </button>
          {menuOpen && (
            <div className={`absolute right-0 top-full mt-2 w-48 rounded-2xl shadow-2xl border p-1.5 z-50 backdrop-blur-2xl ${
              isDarkMode ? "border-white/10 bg-[#17131F] text-white" : "border-gray-200 bg-white text-[#292530]"
            }`}>
              <button className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"
              }`}>
                Quiz Instructions
              </button>
              <button className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"
              }`}>
                Keyboard Shortcuts
              </button>
            </div>
          )}
        </div>

        {/* Abort Quiz */}
        <button
          type="button"
          onClick={onAbort}
          className="flex items-center gap-1.5 h-8 px-2.5 sm:px-3.5 rounded-xl border border-red-500/30 text-red-400 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer"
          aria-label="Abort quiz"
        >
          <Clock className="w-3.5 h-3.5" strokeWidth={2} />
          <span className="hidden sm:inline">Abort Quiz</span>
          <span className="sm:hidden">Abort</span>
        </button>
      </div>
    </header>
  )
}


