import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import QuizHeader from '../components/quiz/QuizHeader'
import QuestionNavigator from '../components/quiz/QuestionNavigator'
import RoughWorkPanel from '../components/quiz/RoughWorkPanel'
import AbortQuizModal from '../components/quiz/AbortQuizModal'
import AntiCheatingWarning from '../components/quiz/AntiCheatingWarning'
import { submitAnswers } from '../services/api'
import useQuizAntiCheating from '../hooks/useQuizAntiCheating'
import { ArrowLeft, ArrowRight, Lightbulb, PenLine } from 'lucide-react'

export default function QnAPage({ onNavigate } = {}) {
  const { isDarkMode } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

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
  const [remainingSeconds, setRemainingSeconds] = useState(questionCount * 180)
  const [showAbortModal, setShowAbortModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showNavDrawer, setShowNavDrawer] = useState(false)
  const [showRoughWorkDrawer, setShowRoughWorkDrawer] = useState(false)

  // Controls the timeout screen
  const [isTimedOut, setIsTimedOut] = useState(false)

  // Holds the live countdown interval so it can be cleared imperatively
  // (from a click handler, not just effect cleanup) the instant the quiz ends.
  const timerIntervalRef = useRef(null)

  // Guards manual submission, abort, and timer-expiry from all firing —
  // whichever reaches this first "wins" and the others become no-ops.
  const quizEndedRef = useRef(false)

  const clearQuizTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }, [])

  const {
    isFullscreenReady,
    quizTerminated,
    warnings,
    warningCount,
    maxWarnings,
    activeViolation,
    isViolationActive,
    dismissViolation,
    cleanup: antiCheatCleanup,
  } = useQuizAntiCheating({
    enabled: questionCount > 0,
    onTerminate: () => {
      onNavigate?.('dashboard')
      navigate('/')
    },
  })

  useEffect(() => {
    if (questionCount === 0) {
      onNavigate?.('quiz', { studySetId: location.state?.studySetId })
      navigate('/quiz')
    }
  }, [questionCount, navigate, onNavigate, location.state?.studySetId])

  // Auto-abort triggered when the countdown reaches zero. Guarded by
  // quizEndedRef so a manual submit/abort that lands in the same tick wins
  // instead of both handlers running.
  const handleTimeExpired = useCallback(() => {
    if (quizEndedRef.current) return
    quizEndedRef.current = true

    clearQuizTimer()
    antiCheatCleanup()
    setIsTimedOut(true)

    setTimeout(() => {
      onNavigate?.('dashboard')
      navigate('/')
    }, 2500)
  }, [antiCheatCleanup, clearQuizTimer, navigate, onNavigate])

  useEffect(() => {
    if (remainingSeconds <= 0 || !isFullscreenReady || isViolationActive || quizEndedRef.current) return
    timerIntervalRef.current = setInterval(() => {
      setRemainingSeconds(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearQuizTimer()
  }, [remainingSeconds, isFullscreenReady, isViolationActive, clearQuizTimer])

  // Auto-abort the instant the countdown reaches zero — races against a
  // manual submit/abort via quizEndedRef, so only one of the two can win.
  useEffect(() => {
    if (questionCount > 0 && remainingSeconds === 0) {
      handleTimeExpired()
    }
  }, [questionCount, remainingSeconds, handleTimeExpired])

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
    if (quizEndedRef.current || isSubmitting || !attemptId) return
    quizEndedRef.current = true
    clearQuizTimer()

    setIsSubmitting(true)

    try {
      const answersPayload = []
      for (let i = 1; i <= questionCount; i++) {
        const q = questions[i - 1]
        if (q) {
          const hasAnswer = answers[i] && answers[i].trim()
          answersPayload.push({
            question_id: q.question_id,
            student_answer: hasAnswer ? answers[i].trim() : '',
          })
        }
      }

      if (answersPayload.length > 0) {
        await submitAnswers(attemptId, questionType, answersPayload)
      }

      antiCheatCleanup()

      const studySetId = location.state?.studySetId
      onNavigate?.('results', {
        attemptId,
        studySetId,
        questionType,
      })
      navigate('/results', {
        state: {
          attemptId,
          studySetId,
          questionType,
        },
      })
    } catch (err) {
      console.error('Failed to submit quiz:', err)
      // Submission failed — allow the user to retry rather than stranding
      // them on a dead "Submit" button (the timer stays stopped either way).
      quizEndedRef.current = false
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, attemptId, questionCount, questions, answers, questionType, navigate, onNavigate, location.state, antiCheatCleanup, clearQuizTimer])

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
    if (quizEndedRef.current) return
    quizEndedRef.current = true
    clearQuizTimer()

    antiCheatCleanup()
    onNavigate?.('dashboard')
    navigate('/')
  }, [navigate, onNavigate, antiCheatCleanup, clearQuizTimer])

  if (questionCount === 0 || quizTerminated) return null

  if (isTimedOut) {
    return (
      <div className={`relative flex h-screen w-screen items-center justify-center overflow-hidden font-sans ${
        isDarkMode ? 'bg-[#0E0B15] text-white' : 'bg-[#F6F3FC] text-[#292530]'
      }`}>
        <div className={`absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] ${
          isDarkMode ? 'bg-red-500/15' : 'bg-red-500/10'
        }`} />

        <div className="relative z-10 flex w-full max-w-xl flex-col items-center px-6 text-center">
          <div className="relative mb-7 flex h-24 w-24 items-center justify-center rounded-3xl bg-red-500/15 text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Time&apos;s up!
          </h1>

          <p className={`mt-3 max-w-md text-sm leading-relaxed ${isDarkMode ? 'text-white/55' : 'text-gray-500'}`}>
            The countdown reached 00:00 before you submitted, so this quiz
            session has been automatically aborted.
          </p>

          <div className={`mt-7 rounded-2xl border px-6 py-4 backdrop-blur-xl ${
            isDarkMode ? 'border-white/10 bg-white/5' : 'border-red-500/10 bg-white/70'
          }`}>
            <p className={`text-sm font-bold ${isDarkMode ? 'text-white/80' : 'text-[#514863]'}`}>
              Your progress on this attempt was not saved.
            </p>

            <p className={`mt-1 text-xs ${isDarkMode ? 'text-white/35' : 'text-gray-400'}`}>
              Taking you back to your dashboard...
            </p>
          </div>
        </div>
      </div>
    )
  }

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
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans select-none ${
      isDarkMode ? "bg-[#0E0B15] text-white" : "bg-[#F6F3FC] text-[#292530]"
    }`}>
      {!isFullscreenReady && (
        <div className={`fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-2xl ${
          isDarkMode ? "bg-[#0E0B15]/90 text-white" : "bg-white/90 text-[#292530]"
        }`}>
          <div className="text-center max-w-sm px-6">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[#8064C7]/20 flex items-center justify-center animate-pulse text-[#8064C7]">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                <path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            </div>
            <h2 className="text-xl font-black mb-2 tracking-tight">Entering Secure Mode</h2>
            <p className={`text-xs leading-relaxed ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>
              This quiz requires fullscreen mode for a secure exam environment.
              Click anywhere or press any key to continue.
            </p>
          </div>
        </div>
      )}

      <AntiCheatingWarning
        warnings={warnings}
        activeViolation={activeViolation}
        isViolationActive={isViolationActive}
        warningCount={warningCount}
        maxWarnings={maxWarnings}
        onDismissViolation={dismissViolation}
      />

      <QuizHeader
        remainingSeconds={remainingSeconds}
        isBookmarked={!!bookmarkedQuestions[currentQuestion]}
        onToggleBookmark={toggleBookmark}
        onAbort={() => setShowAbortModal(true)}
        onToggleNavigator={() => setShowNavDrawer((prev) => !prev)}
        onToggleRoughWork={() => setShowRoughWorkDrawer((prev) => !prev)}
      />
      <div className="flex-1 flex overflow-hidden relative">
        <QuestionNavigator
          questionCount={questionCount}
          currentQuestion={currentQuestion}
          questionStatuses={questionStatuses}
          onSelectQuestion={goToQuestion}
          isOpen={showNavDrawer}
          onClose={() => setShowNavDrawer(false)}
          disabled={isViolationActive}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="px-4 sm:px-8 pt-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#8064C7]" />
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#8064C7] dark:text-[#A78BFA]">
                  Question {currentQuestion} of {questionCount}
                </span>
              </div>
            </div>
            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? "bg-white/10" : "bg-black/10"}`}>
              <div
                className="h-full bg-[#8064C7] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-5 min-h-0">
            <div className={`rounded-3xl border p-5 sm:p-7 flex flex-col h-full backdrop-blur-2xl ${
              isDarkMode ? "border-white/10 bg-[#17131F]/80 text-white" : "border-white/80 bg-white/70 text-[#292530]"
            }`}>
              <div className="mb-4">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
                  isDarkMode ? "border-[#8064C7]/30 bg-[#8064C7]/20 text-[#A78BFA]" : "border-[#8064C7]/20 bg-[#8064C7]/10 text-[#8064C7]"
                }`}>
                  <PenLine className="w-3.5 h-3.5" strokeWidth={2.2} />
                  {typeLabel}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold leading-snug mb-5 tracking-tight overflow-wrap-anywhere">
                {currentQ.question}
              </h2>

              {/* AI Hint */}
              {currentQ?.hint && (
                <div
                  className={`mb-5 flex gap-3 rounded-2xl border p-3.5 sm:p-4 ${
                    isDarkMode
                      ? "border-[#8064C7]/30 bg-[#8064C7]/15 text-purple-200"
                      : "border-[#8064C7]/20 bg-[#8064C7]/10 text-[#8064C7]"
                  }`}
                >
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                  <p className="overflow-wrap-anywhere text-xs font-semibold leading-relaxed">
                    <span className="font-black">AI Hint: </span>
                    {currentQ.hint}
                  </p>
                </div>
              )}

              <div className={`flex-1 min-h-[160px] sm:min-h-[180px] ${isViolationActive ? 'opacity-50 pointer-events-none' : ''}`} data-ac-editable="true">
                <textarea
                  value={answers[currentQuestion] || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="Type your answer here..."
                  disabled={isViolationActive}
                  className={`w-full h-full min-h-[160px] sm:min-h-[180px] p-4 rounded-2xl border text-sm leading-relaxed outline-none transition-all resize-none ${
                    isDarkMode
                      ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7]"
                      : "border-gray-200 bg-white text-[#292530] placeholder:text-gray-400 focus:border-[#8064C7]"
                  }`}
                  aria-label={`Answer for question ${currentQuestion}`}
                  data-ac-editable="true"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 sm:px-8 py-4 flex-shrink-0">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={isFirstQuestion || isViolationActive}
              className={`flex items-center gap-1.5 text-xs font-bold transition-opacity
                ${(isFirstQuestion || isViolationActive) ? 'opacity-30 cursor-not-allowed' : 'text-[#8064C7] dark:text-[#A78BFA] hover:opacity-80 cursor-pointer'}`}
              aria-label="Previous question"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.2} />
              Previous
            </button>

            <button
              type="button"
              onClick={isLastQuestion ? handleFinishQuiz : handleSubmitNext}
              disabled={isSubmitting || isViolationActive}
              className={`flex items-center gap-2 h-10 px-5 sm:px-6 bg-[#8064C7] text-white text-xs font-bold rounded-xl shadow-[0_10px_25px_rgba(128,100,199,0.3)] transition-all ${
                isViolationActive ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#8B6DD4] cursor-pointer hover:-translate-y-0.5'
              }`}
              aria-label={isLastQuestion ? 'Finish quiz' : 'Submit answer and go to next question'}
            >
              {isSubmitting ? 'Submitting...' : (isLastQuestion ? 'Finish Quiz' : 'Submit Answer')}
              <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <RoughWorkPanel
          value={scratchpad[currentQuestion] || ''}
          onChange={handleScratchpadChange}
          onClear={handleClearScratchpad}
          isOpen={showRoughWorkDrawer}
          onClose={() => setShowRoughWorkDrawer(false)}
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

