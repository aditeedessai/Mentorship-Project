import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import QuizHeader from '../components/quiz/QuizHeader'
import QuestionNavigator from '../components/quiz/QuestionNavigator'
import RoughWorkPanel from '../components/quiz/RoughWorkPanel'
import AbortQuizModal from '../components/quiz/AbortQuizModal'
import AntiCheatingWarning from '../components/quiz/AntiCheatingWarning'
import { submitAnswers, finishAttempt } from '../services/api'
import useQuizAntiCheating from '../hooks/useQuizAntiCheating'
import { ArrowLeft, ArrowRight, Lightbulb, PenLine } from 'lucide-react'

export default function QnAPage() {
  const location = useLocation()
  const navigate = useNavigate()

  // Pull data from route state (set by ConfigureSession)
  const questions = useMemo(() => location.state?.questions || [], [location.state?.questions])
  const attemptId = location.state?.attemptId
  const questionType = location.state?.questionType || 'short-answer'
  const questionCount = questions.length || location.state?.questionCount || 0

  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [answers, setAnswers] = useState({})
  const [questionStatuses, setQuestionStatuses] = useState(() => {
    const statuses = {}
    for (let i = 1; i <= questionCount; i++) {
      statuses[i] = 'unvisited'
    }
    return statuses
  })
  const [scratchpad, setScratchpad] = useState({})
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState({})
  const [remainingSeconds, setRemainingSeconds] = useState(questionCount * 180) // 3 min per question
  const [showAbortModal, setShowAbortModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── Anti-Cheating ──────────────────────────────────────────────
  const {
    isFullscreenReady,
    quizTerminated,
    warnings,
    cleanup: antiCheatCleanup,
  } = useQuizAntiCheating({
    enabled: questionCount > 0,
    onTerminate: () => navigate('/'),
  })

  // Redirect if no questions were loaded
  useEffect(() => {
    if (questionCount === 0) {
      navigate('/quiz')
    }
  }, [questionCount, navigate])

  // Timer — only ticks when fullscreen is established
  useEffect(() => {
    if (remainingSeconds <= 0 || !isFullscreenReady) return
    const interval = setInterval(() => {
      setRemainingSeconds(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [remainingSeconds, isFullscreenReady])

  const goToQuestion = useCallback((num) => {
    if (num < 1 || num > questionCount || num === currentQuestion) return
    setQuestionStatuses(prev => {
      const next = { ...prev }
      if (prev[currentQuestion] !== 'attempted') {
        next[currentQuestion] = (answers[currentQuestion] && answers[currentQuestion].trim()) ? 'attempted' : 'skipped'
      }
      return next
    })
    setCurrentQuestion(num)
  }, [currentQuestion, questionCount, answers])

  const handleAnswerChange = useCallback((value) => {
    setAnswers(prev => ({ ...prev, [currentQuestion]: value }))
  }, [currentQuestion])

  const handleSubmitNext = useCallback(() => {
    const hasAnswer = answers[currentQuestion] && answers[currentQuestion].trim()
    setQuestionStatuses(prev => ({
      ...prev,
      [currentQuestion]: hasAnswer ? 'attempted' : 'skipped'
    }))
    if (currentQuestion < questionCount) {
      setCurrentQuestion(prev => prev + 1)
    }
  }, [currentQuestion, questionCount, answers])

  const handlePrevious = useCallback(() => {
    if (currentQuestion > 1) {
      const hasAnswer = answers[currentQuestion] && answers[currentQuestion].trim()
      setQuestionStatuses(prev => ({
        ...prev,
        [currentQuestion]: hasAnswer ? 'attempted' :
          (prev[currentQuestion] === 'attempted' ? 'attempted' : 'skipped')
      }))
      setCurrentQuestion(prev => prev - 1)
    }
  }, [currentQuestion, answers])

  const handleFinishQuiz = useCallback(async () => {
    if (isSubmitting || !attemptId) return
    setIsSubmitting(true)

    try {
      // Build answers array from typed answers
      const answersPayload = []
      for (let i = 1; i <= questionCount; i++) {
        const q = questions[i - 1]
        if (answers[i] && answers[i].trim() && q) {
          answersPayload.push({
            question_id: q.question_id,
            student_answer: answers[i].trim(),
          })
        }
      }

      // 1. Submit answers if any
      if (answersPayload.length > 0) {
        await submitAnswers(attemptId, questionType, answersPayload)
      }

      // 2. Finish the attempt
      await finishAttempt(attemptId)

      // 3. Cleanup anti-cheating before navigating away
      antiCheatCleanup()

      // 4. Navigate to results
      const studySetId = location.state?.studySetId
      navigate('/results', {
        state: {
          attemptId,
          studySetId,
          questionType,
        },
      })
    } catch (err) {
      console.error('Failed to submit quiz:', err)
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, attemptId, questionCount, questions, answers, questionType, navigate, location.state, antiCheatCleanup])

  const toggleBookmark = useCallback(() => {
    setBookmarkedQuestions(prev => ({
      ...prev,
      [currentQuestion]: !prev[currentQuestion]
    }))
  }, [currentQuestion])

  const handleScratchpadChange = useCallback((value) => {
    setScratchpad(prev => ({ ...prev, [currentQuestion]: value }))
  }, [currentQuestion])

  const handleClearScratchpad = useCallback(() => {
    setScratchpad(prev => ({ ...prev, [currentQuestion]: '' }))
  }, [currentQuestion])

  const handleAbortConfirm = useCallback(() => {
    antiCheatCleanup()
    navigate('/')
  }, [navigate, antiCheatCleanup])

  // Don't render if no questions or quiz was terminated by anti-cheat
  if (questionCount === 0 || quizTerminated) return null

  const currentQ = questions[currentQuestion - 1] || questions[0]
  const progress = (currentQuestion / questionCount) * 100
  const isFirstQuestion = currentQuestion === 1
  const isLastQuestion = currentQuestion === questionCount

  const typeLabel =
    questionType === 'application'
      ? 'Application Based'
      : questionType === 'long'
      ? 'Long Answer'
      : 'Short Answer'

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden font-sans select-none">
      {/* Fullscreen gate — blocks quiz until fullscreen is confirmed */}
      {!isFullscreenReady && (
        <div className="fixed inset-0 z-[200] bg-white flex items-center justify-center">
          <div className="text-center max-w-sm px-6">
            <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-[#F0EAF5] flex items-center justify-center animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#542078" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                <path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-[#3E3E75] mb-2">Entering Secure Mode</h2>
            <p className="text-[13px] text-[#888] leading-relaxed">
              This quiz requires fullscreen mode for a secure exam environment.
              Click anywhere or press any key to continue.
            </p>
          </div>
        </div>
      )}

      {/* Clipboard warning overlay */}
      <AntiCheatingWarning warnings={warnings} />

      <QuizHeader
        remainingSeconds={remainingSeconds}
        isBookmarked={!!bookmarkedQuestions[currentQuestion]}
        onToggleBookmark={toggleBookmark}
        onAbort={() => setShowAbortModal(true)}
      />
      <div className="flex-1 flex overflow-hidden">
        <QuestionNavigator
          questionCount={questionCount}
          currentQuestion={currentQuestion}
          questionStatuses={questionStatuses}
          onSelectQuestion={goToQuestion}
        />

        {/* Center QnA Content */}
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
              />
            </div>
          </div>

          {/* Question Card */}
          <div className="flex-1 overflow-y-auto px-8 py-5 min-h-0">
            <div className="bg-white rounded-xl border border-[#E3E3E3] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-7 flex flex-col h-full">
              {/* Question Type Badge */}
              <div className="mb-4">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#55217A] bg-[#F5F0F8] border border-[#D8CBE0] rounded-full px-3 py-[3px]">
                  <PenLine className="w-[12px] h-[12px]" strokeWidth={2.2} />
                  {typeLabel}
                </span>
              </div>

              {/* Question Text */}
              <h2 className="text-[18px] font-semibold text-[#222222] leading-[1.4] mb-5">
                {currentQ.question}
              </h2>

              {/* AI Hint */}
              <div className="flex gap-3 p-4 bg-[#F7F3F9] border border-[#DDD1E2] rounded-lg mb-5">
                <Lightbulb className="w-[16px] h-[16px] text-[#8B5FB0] mt-0.5 flex-shrink-0" strokeWidth={2} />
                <p className="text-[12.5px] text-[#666666] leading-[1.55]">
                  <span className="font-semibold text-[#7B6190]">AI Hint: </span>
                  {currentQ.hint}
                </p>
              </div>

              {/* Answer Textarea – marked as editable so anti-cheat allows typing */}
              <div className="flex-1 min-h-[180px]" data-ac-editable="true">
                <textarea
                  value={answers[currentQuestion] || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full h-full min-h-[180px] p-4 bg-white border border-[#D8D8D8] rounded-[10px] text-[14px] text-[#333] leading-[1.6] placeholder-[#AAAAAA] resize-none focus:outline-none focus:border-[#087C7B] focus:ring-1 focus:ring-[#087C7B]/20 transition-colors duration-150 select-text"
                  aria-label={`Answer for question ${currentQuestion}`}
                  data-ac-editable="true"
                />
              </div>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="flex items-center justify-between px-8 py-4 flex-shrink-0 bg-[#FAFAFA]">
            <button
              type="button"
              onClick={handlePrevious}
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
              onClick={isLastQuestion ? handleFinishQuiz : handleSubmitNext}
              disabled={isSubmitting}
              className="flex items-center gap-2 h-[38px] px-5 bg-[#542078] text-white text-[13.5px] font-semibold rounded-[8px] cursor-pointer
                hover:bg-[#462066] hover:-translate-y-[1px] hover:shadow-[0_3px_10px_rgba(84,32,122,0.25)]
                active:translate-y-0 transition-all duration-150"
              aria-label={isLastQuestion ? 'Finish quiz' : 'Submit answer and go to next question'}
            >
              {isSubmitting ? 'Submitting...' : (isLastQuestion ? 'Finish Quiz' : 'Submit Answer')}
              <ArrowRight className="w-[15px] h-[15px]" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <RoughWorkPanel
          value={scratchpad[currentQuestion] || ''}
          onChange={handleScratchpadChange}
          onClear={handleClearScratchpad}
        />
      </div>

      {showAbortModal && (
        <AbortQuizModal
          onCancel={() => setShowAbortModal(false)}
          onConfirm={handleAbortConfirm}
        />
      )}
    </div>
  )
}
