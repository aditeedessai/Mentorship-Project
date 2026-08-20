import { LayoutGrid, Copy } from 'lucide-react'

const statusClasses = {
  attempted: 'bg-[#087C7B] text-white',
  skipped: 'bg-white text-[#D99A35] border-2 border-[#D99A35]',
  current: 'bg-white text-[#542078] border-2 border-[#542078] ring-2 ring-[#542078]/25 ring-offset-1',
  unvisited: 'bg-[#E9E9E9] text-[#888888]',
}

export default function QuestionNavigator({ questionCount, currentQuestion, questionStatuses, onSelectQuestion }) {
  const getStatus = (num) => {
    if (num === currentQuestion) return 'current'
    return questionStatuses[num] || 'unvisited'
  }

  return (
    <aside className="w-[230px] min-w-[230px] bg-white border-r border-[#E5E5E5] flex flex-col overflow-y-auto flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-[15px] h-[15px] text-[#555]" strokeWidth={2} />
          <span className="text-[13px] font-semibold text-[#333]">Question Navigator</span>
        </div>
        <button
          type="button"
          className="p-1 rounded hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
          aria-label="Collapse navigator"
        >
          <Copy className="w-[14px] h-[14px] text-[#999]" strokeWidth={1.8} />
        </button>
      </div>

      {/* Question Grid */}
      <div className="px-5 pt-2">
        <div className="grid grid-cols-4 gap-[9px]">
          {Array.from({ length: questionCount }, (_, i) => {
            const num = i + 1
            const status = getStatus(num)
            return (
              <button
                key={num}
                type="button"
                onClick={() => onSelectQuestion(num)}
                className={`aspect-square rounded-[8px] text-[13px] font-semibold flex items-center justify-center cursor-pointer transition-all duration-150 hover:opacity-85 ${
                  status === 'attempted' || status === 'unvisited' ? '' : ''
                } ${statusClasses[status]}`}
                aria-label={`Question ${num}, ${status}`}
                aria-current={num === currentQuestion ? 'true' : undefined}
              >
                {num}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-5 pt-7 pb-4">
        <div className="text-[10px] font-bold text-[#999] tracking-[0.1em] uppercase mb-3">Legend</div>
        <div className="space-y-[10px]">
          <div className="flex items-center gap-2.5">
            <div className="w-[14px] h-[14px] rounded-[3px] bg-[#087C7B]" />
            <span className="text-[12px] text-[#555]">Attempted</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-[14px] h-[14px] rounded-[3px] bg-white border-2 border-[#D99A35]" />
            <span className="text-[12px] text-[#555]">Skipped</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-[14px] h-[14px] rounded-[3px] bg-white border-2 border-[#542078]" />
            <span className="text-[12px] text-[#555]">Current</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-[14px] h-[14px] rounded-[3px] bg-[#E9E9E9]" />
            <span className="text-[12px] text-[#555]">Unvisited</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
