import { ArrowRight } from 'lucide-react'

const questionOptions = [5, 10, 15, 20, 25, 30, 40, 50]

export default function SessionActionBar({ questionCount, onQuestionCountChange, onStart, loading }) {
  return (
    <div className="flex items-center justify-between h-[62px] px-[48px] border-t border-[#E5E5E5] bg-white flex-shrink-0">
      {/* Question Count Selector */}
      <div className="flex items-center gap-3">
        <label htmlFor="question-count" className="text-[13px] font-medium text-[#4A4A4A]">
          Question Count:
        </label>
        <div className="relative">
          <select
            id="question-count"
            value={questionCount}
            onChange={(e) => onQuestionCountChange(Number(e.target.value))}
            disabled={loading}
            className="appearance-none h-[34px] pl-3 pr-8 rounded-[6px] border border-[#D0D0D0] bg-white text-[13px] text-[#333333] cursor-pointer hover:border-[#AAAAAA] focus:outline-none focus:border-[#68CECC] focus:ring-1 focus:ring-[#68CECC] transition-colors duration-150"
          >
            {questionOptions.map((n) => (
              <option key={n} value={n}>
                {n} Questions
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <button
        type="button"
        onClick={onStart}
        disabled={loading}
        className={`inline-flex items-center gap-2 h-[38px] px-5 bg-[#54207A] text-white text-[13.5px] font-semibold rounded-[7px]
          ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-[#472069] hover:-translate-y-[1px] hover:shadow-[0_3px_10px_rgba(84,32,122,0.25)] active:translate-y-0 active:shadow-none'}
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#54207A]
          transition-all duration-150 ease-in-out`}
        aria-label="Start study session"
      >
        {loading ? 'Loading...' : 'Start Study Session'}
        <ArrowRight className="w-[15px] h-[15px]" strokeWidth={2.2} />
      </button>
    </div>
  )
}
