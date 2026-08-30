import { useState, useEffect } from 'react'
import { PenLine, Trash2, Calculator, Sigma, Percent, X } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export default function RoughWorkPanel({ value, onChange, onClear, isOpen = false, onClose }) {
  const { isDarkMode } = useTheme()
  const [saveStatus, setSaveStatus] = useState('AUTO-SAVED')

  useEffect(() => {
    if (!value) return
    const timer1 = setTimeout(() => setSaveStatus('SAVING...'), 0)
    const timer2 = setTimeout(() => setSaveStatus('AUTO-SAVED'), 800)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [value])

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
          ${isOpen ? "fixed inset-y-0 right-0 z-50 w-80 max-w-[90vw] shadow-2xl flex" : "hidden lg:flex"}
          lg:static lg:z-auto lg:w-60 lg:min-w-[240px] lg:shadow-none
          border-l backdrop-blur-2xl transition-colors duration-300 flex-col flex-shrink-0 ${
            isDarkMode ? "border-white/10 bg-[#17131F]/95 text-white" : "border-gray-200/80 bg-white/95 text-[#292530]"
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b lg:border-none border-inherit">
          <div className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-[#8064C7]" strokeWidth={2} />
            <span className="text-xs font-black tracking-tight">Rough Work</span>
          </div>

          {/* Mobile Close Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg border transition-colors lg:hidden ${
                isDarkMode ? "border-white/10 text-white/70 hover:bg-white/10" : "border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
              aria-label="Close Rough Work Panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Textarea */}
        <div className="flex-1 px-5 pb-3 flex flex-col min-h-0">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your scratchpad notes here..."
            className={`flex-1 w-full p-3.5 rounded-2xl border text-xs leading-relaxed outline-none transition-all resize-none ${
              isDarkMode
                ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7]"
                : "border-gray-200 bg-white text-[#292530] placeholder:text-gray-400 focus:border-[#8064C7]"
            }`}
            aria-label="Scratchpad notes"
          />

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 pb-1">
            <button
              type="button"
              onClick={onClear}
              className={`flex items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer ${
                isDarkMode ? "text-white/40 hover:text-white" : "text-gray-400 hover:text-gray-600"
              }`}
              aria-label="Clear scratchpad"
            >
              <Trash2 className="w-3 h-3" strokeWidth={1.8} />
              Clear All
            </button>
            <span className="text-[9.5px] font-mono font-bold text-[#8064C7] dark:text-[#A78BFA] tracking-wider uppercase">
              {saveStatus}
            </span>
          </div>
        </div>

        {/* Quick Tools */}
        <div className="px-5 pb-5 pt-1 flex-shrink-0">
          <div className={`text-[10px] font-mono font-bold tracking-wider uppercase mb-2 ${isDarkMode ? "text-white/40" : "text-gray-400"}`}>
            Quick Tools
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                isDarkMode ? "border-white/10 bg-white/5 hover:bg-white/10 text-white/70" : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
              }`}
              aria-label="Calculator"
            >
              <Calculator className="w-4 h-4" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                isDarkMode ? "border-white/10 bg-white/5 hover:bg-white/10 text-white/70" : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
              }`}
              aria-label="Sigma tool"
            >
              <Sigma className="w-4 h-4" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                isDarkMode ? "border-white/10 bg-white/5 hover:bg-white/10 text-white/70" : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
              }`}
              aria-label="Percentage tool"
            >
              <Percent className="w-4 h-4" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

