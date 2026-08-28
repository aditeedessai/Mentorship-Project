import { ArrowLeft, ArrowRight, Lightbulb } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

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
  const { isDarkMode } = useTheme()
  const progress = (currentQuestion / questionCount) * 100

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Question Header + Progress */}
      <div className="px-8 pt-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#8064C7]" />
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#8064C7] dark:text-[#A78BFA]">
              Question {currentQuestion} of {questionCount}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? "bg-white/10" : "bg-black/10"}`}>
          <div
            className="h-full bg-[#8064C7] rounded-full transition-all duration-300 ease-out"
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
        <div className={`rounded-3xl border p-7 backdrop-blur-2xl transition-all duration-300 ${
          isDarkMode ? "border-white/10 bg-[#17131F]/80 text-white" : "border-white/80 bg-white/70 text-[#292530]"
        }`}>
          {/* Question Text */}
          <h2 className="text-xl font-extrabold leading-snug mb-5 tracking-tight">
            {question.question}
          </h2>

          {/* AI Hint */}
          <div className={`flex gap-3 p-4 border rounded-2xl mb-6 ${
            isDarkMode ? "border-[#8064C7]/30 bg-[#8064C7]/15 text-purple-200" : "border-[#8064C7]/20 bg-[#8064C7]/10 text-[#8064C7]"
          }`}>
            <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <p className="text-xs leading-relaxed font-semibold">
              <span className="font-black">AI Hint: </span>
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
                  className={`w-full flex items-start gap-3.5 py-4 px-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-[#8064C7] bg-[#8064C7]/15 shadow-md scale-[1.01]'
                      : isDarkMode
                      ? 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'
                      : 'border-gray-200/80 bg-white hover:border-[#8064C7]/50 hover:bg-gray-50'
                  }`}
                  aria-pressed={isSelected}
                >
                  {/* Radio indicator */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSelected ? 'border-[#8064C7] bg-[#8064C7]' : isDarkMode ? 'border-white/30' : 'border-gray-300'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>

                  {/* Letter */}
                  <span className={`text-sm font-black flex-shrink-0 mt-0.5 ${
                    isSelected ? 'text-[#8064C7] dark:text-[#A78BFA]' : isDarkMode ? 'text-white/40' : 'text-gray-400'
                  }`}>
                    {option.letter}
                  </span>

                  {/* Text */}
                  <span className={`text-sm font-semibold leading-relaxed ${
                    isSelected ? 'text-[#8064C7] dark:text-white font-bold' : isDarkMode ? 'text-white/90' : 'text-gray-700'
                  }`}>
                    {option.text}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between px-8 py-4 flex-shrink-0">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirstQuestion}
          className={`flex items-center gap-1.5 text-xs font-bold transition-opacity ${
            isFirstQuestion ? 'opacity-30 cursor-not-allowed' : 'text-[#8064C7] dark:text-[#A78BFA] hover:opacity-80 cursor-pointer'
          }`}
          aria-label="Previous question"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2.2} />
          Previous
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 h-10 px-6 bg-[#8064C7] hover:bg-[#8B6DD4] text-white text-xs font-bold rounded-xl cursor-pointer shadow-[0_10px_25px_rgba(128,100,199,0.3)] transition-all hover:-translate-y-0.5"
          aria-label={isLastQuestion ? 'Finish quiz' : 'Confirm and go to next question'}
        >
          {isLastQuestion ? 'Finish Quiz' : 'Confirm & Next'}
          <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}

