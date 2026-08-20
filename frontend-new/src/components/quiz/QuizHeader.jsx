import { useState, useRef, useEffect } from 'react'
import { Clock, Star, MoreVertical, Sparkles } from 'lucide-react'

export default function QuizHeader({ remainingSeconds, isBookmarked, onToggleBookmark, onAbort }) {
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
    <header className="flex items-center justify-between h-[52px] px-5 bg-white border-b border-[#E5E5E5] flex-shrink-0 z-10">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-[#54207A] to-[#68CECC] flex items-center justify-center">
          <Sparkles className="w-[13px] h-[13px] text-white" strokeWidth={2.2} />
        </div>
        <span className="text-[15px] font-bold text-[#1a1145]">AI Study Engine</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Timer */}
        <div className="flex items-center gap-1.5 h-[27px] px-3 rounded-full bg-[#EFFAF8] text-[#438887]">
          <Clock className="w-[13px] h-[13px]" strokeWidth={2.2} />
          <span className="text-[12px] font-medium tracking-wide">
            {formatTime(remainingSeconds)} remaining
          </span>
        </div>

        {/* Bookmark */}
        <button
          type="button"
          onClick={onToggleBookmark}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
        >
          <Star
            className={`w-[18px] h-[18px] ${isBookmarked ? 'fill-[#F5A623] text-[#F5A623]' : 'text-[#999999]'}`}
            strokeWidth={1.8}
          />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-[#E0E0E0]" />

        {/* Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="w-[18px] h-[18px] text-[#666666]" strokeWidth={2} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-[#E5E5E5] py-1 z-50">
              <button className="w-full text-left px-4 py-2.5 text-[13px] text-[#333] hover:bg-gray-50 transition-colors cursor-pointer">
                Quiz Instructions
              </button>
              <button className="w-full text-left px-4 py-2.5 text-[13px] text-[#333] hover:bg-gray-50 transition-colors cursor-pointer">
                Keyboard Shortcuts
              </button>
              <button className="w-full text-left px-4 py-2.5 text-[13px] text-[#333] hover:bg-gray-50 transition-colors cursor-pointer">
                Exit Fullscreen
              </button>
            </div>
          )}
        </div>

        {/* Abort Quiz */}
        <button
          type="button"
          onClick={onAbort}
          className="flex items-center gap-1.5 h-[32px] px-3.5 rounded-[7px] border border-[#D9BABA] text-[#8D5555] text-[12.5px] font-medium bg-white hover:bg-[#FFF5F5] transition-colors duration-150 cursor-pointer"
          aria-label="Abort quiz"
        >
          <Clock className="w-[13px] h-[13px]" strokeWidth={2} />
          Abort Quiz
        </button>
      </div>
    </header>
  )
}
