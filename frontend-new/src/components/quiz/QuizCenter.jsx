import { ArrowLeft, ArrowRight, Lightbulb } from 'lucide-react'

export default function QuizCenter({
  question,
  currentQuestion,
  questionCount,
  selectedAnswer,
  onSelectAnswer,
  onPrevious,
  onNext,
  isFirstQuestion,
  isLastQuestion,
}) {
  const progress = (currentQuestion / questionCount) * 100

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#FAFAFA]">
      {/* Question Header + Progress */}
      <div className="px-8 pt-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-[7px] h-[7px] rounded-full bg-[#087C7B]" />
            <span className="text-[11px] font-bold text-[#087C7B] tracking-[0.12em] uppercase">
              Question {currentQuestion} of {questionCount}
            </span>
          </div>
          <div className="text-[11px] text-[#888] bg-[#F0F0F0] px-3 py-1 rounded-full font-medium">
            Module 4: Neural Networks
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-[3px] bg-[#E5E5E5] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#087C7B] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Quiz progress: ${Math.round(progress)}%`}
          />
        </div>
      </div>

      {/* Question Card - scrollable area */}
      <div className="flex-1 overflow-y-auto px-8 py-5 min-h-0">
        <div className="bg-white rounded-xl border border-[#E3E3E3] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-7">
          {/* Question Text */}
          <h2 className="text-[18px] font-semibold text-[#171717] leading-[1.4] mb-5">
            {question.question}
          </h2>

          {/* AI Hint */}
          <div className="flex gap-3 p-4 bg-[#F7F3F9] border border-[#DDD1E2] rounded-lg mb-6">
            <Lightbulb className="w-[16px] h-[16px] text-[#8B5FB0] mt-0.5 flex-shrink-0" strokeWidth={2} />
            <p className="text-[12.5px] text-[#666666] leading-[1.55]">
              <span className="font-semibold text-[#7B6190]">AI Hint: </span>
              {question.hint}
            </p>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {question.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectAnswer(idx)}
                  className={`w-full flex items-start gap-3.5 py-[14px] px-4 rounded-xl border-2 text-left transition-all duration-150 cursor-pointer
                    ${isSelected
                      ? 'bg-[#EAF8F7] border-[#087C7B]'
                      : 'bg-white border-[#E8E8E8] hover:border-[#CCCCCC] hover:bg-[#FCFCFC]'
                    }`}
                  aria-pressed={isSelected}
                >
                  {/* Radio indicator */}
                  <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-[1px]
                    ${isSelected ? 'border-[#087C7B]' : 'border-[#CCCCCC]'}`}
                  >
                    {isSelected && <div className="w-[8px] h-[8px] rounded-full bg-[#087C7B]" />}
                  </div>

                  {/* Letter */}
                  <span className={`text-[14px] font-semibold flex-shrink-0 mt-[1px] ${isSelected ? 'text-[#087C7B]' : 'text-[#AAAAAA]'}`}>
                    {option.letter}
                  </span>

                  {/* Text */}
                  <span className={`text-[13.5px] leading-[1.45] ${isSelected ? 'text-[#087C7B]' : 'text-[#444444]'}`}>
                    {option.text}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between px-8 py-4 flex-shrink-0 bg-[#FAFAFA]">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirstQuestion}
          className={`flex items-center gap-1.5 text-[13.5px] font-semibold transition-colors duration-150
            ${isFirstQuestion ? 'text-[#CCCCCC] cursor-not-allowed' : 'text-[#087C7B] hover:text-[#065E5D] cursor-pointer'}`}
          aria-label="Previous question"
        >
          <ArrowLeft className="w-[15px] h-[15px]" strokeWidth={2.2} />
          Previous
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 h-[38px] px-5 bg-[#542078] text-white text-[13.5px] font-semibold rounded-[8px] cursor-pointer
            hover:bg-[#462066] hover:-translate-y-[1px] hover:shadow-[0_3px_10px_rgba(84,32,122,0.25)]
            active:translate-y-0 transition-all duration-150"
          aria-label={isLastQuestion ? 'Finish quiz' : 'Confirm and go to next question'}
        >
          {isLastQuestion ? 'Finish Quiz' : 'Confirm & Next'}
          <ArrowRight className="w-[15px] h-[15px]" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}
