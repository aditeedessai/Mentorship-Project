import { useState, useEffect } from 'react'
import { PenLine, Maximize2, Trash2, Calculator, Sigma, Percent } from 'lucide-react'

export default function RoughWorkPanel({ value, onChange, onClear }) {
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
    <aside className="w-[230px] min-w-[230px] bg-white border-l border-[#E5E5E5] flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <PenLine className="w-[14px] h-[14px] text-[#555]" strokeWidth={2} />
          <span className="text-[13px] font-semibold text-[#333]">Rough Work</span>
        </div>
        <button
          type="button"
          className="p-1 rounded hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
          aria-label="Expand rough work panel"
        >
          <Maximize2 className="w-[14px] h-[14px] text-[#999]" strokeWidth={1.8} />
        </button>
      </div>

      {/* Textarea */}
      <div className="flex-1 px-4 pb-2 flex flex-col min-h-0">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your scratchpad notes here..."
          className="flex-1 w-full p-3 bg-[#FAFAFA] border border-[#DADADA] rounded-[10px] text-[12.5px] text-[#444] leading-[1.55] placeholder-[#AAAAAA] resize-none focus:outline-none focus:border-[#087C7B] focus:ring-1 focus:ring-[#087C7B]/20 transition-colors duration-150"
          aria-label="Scratchpad notes"
        />

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 pb-1">
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-[10.5px] text-[#999] hover:text-[#666] transition-colors duration-150 cursor-pointer"
            aria-label="Clear scratchpad"
          >
            <Trash2 className="w-[11px] h-[11px]" strokeWidth={1.8} />
            Clear All
          </button>
          <span className="text-[9.5px] font-medium text-[#BBBBBB] tracking-[0.06em] uppercase">
            {saveStatus}
          </span>
        </div>
      </div>

      {/* Quick Tools */}
      <div className="px-4 pb-4 pt-1 flex-shrink-0">
        <div className="text-[9.5px] font-bold text-[#999] tracking-[0.1em] uppercase mb-2">Quick Tools</div>
        <div className="flex gap-2">
          <button
            type="button"
            className="w-[32px] h-[32px] rounded-[6px] border border-[#DDDDDD] bg-[#FAFAFA] flex items-center justify-center hover:bg-[#F0F0F0] hover:border-[#CCCCCC] transition-colors duration-150 cursor-pointer"
            aria-label="Calculator"
          >
            <Calculator className="w-[14px] h-[14px] text-[#666]" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className="w-[32px] h-[32px] rounded-[6px] border border-[#DDDDDD] bg-[#FAFAFA] flex items-center justify-center hover:bg-[#F0F0F0] hover:border-[#CCCCCC] transition-colors duration-150 cursor-pointer"
            aria-label="Sigma tool"
          >
            <Sigma className="w-[14px] h-[14px] text-[#666]" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className="w-[32px] h-[32px] rounded-[6px] border border-[#DDDDDD] bg-[#FAFAFA] flex items-center justify-center hover:bg-[#F0F0F0] hover:border-[#CCCCCC] transition-colors duration-150 cursor-pointer"
            aria-label="Percentage tool"
          >
            <Percent className="w-[14px] h-[14px] text-[#666]" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </aside>
  )
}
