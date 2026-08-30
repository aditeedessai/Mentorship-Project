import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import QuizHeader from '../components/quiz/QuizHeader'
import QuestionNavigator from '../components/quiz/QuestionNavigator'
import QuizCenter from '../components/quiz/QuizCenter'
import RoughWorkPanel from '../components/quiz/RoughWorkPanel'
import AbortQuizModal from '../components/quiz/AbortQuizModal'
import AntiCheatingWarning from '../components/quiz/AntiCheatingWarning'
import { submitAnswers } from '../services/api'
import useQuizAntiCheating from '../hooks/useQuizAntiCheating'

export default function MCQPage() {
  const { isDarkMode } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  // Pull data from route state (set by ConfigureSession)
  const questions = useMemo(() => location.state?.questions || [], [location.state?.questions])
  const attemptId = location.state?.attemptId
  const questionCount = questions.length || location.state?.questionCount || 0

  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [questionStatuses, setQuestionStatuses] = useState(() => {
    const statuses = {}
    for (let i = 1; i <= questionCount; i++) {
      statuses[i] = 'unvisited'
    }
    return statuses
  })
  const [scratchpad, setScratchpad] = useState({})
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState({})
  const [remainingSeconds, setRemainingSeconds] = useState(questionCount * 90) // 1.5 min per question
  const [showAbortModal, setShowAbortModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showNavDrawer, setShowNavDrawer] = useState(false)
  const [showRoughWorkDrawer, setShowRoughWorkDrawer] = useState(false)


  // ── Anti-Cheating ──────────────────────────────────────────────
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
    onTerminate: () => navigate('/'),
  })

  // Redirect if no questions were loaded
  useEffect(() => {
    if (questionCount === 0) {
      navigate('/quiz')
    }
  }, [questionCount, navigate])

  // Timer — only ticks when fullscreen is established and no active violation
  useEffect(() => {
    if (remainingSeconds <= 0 || !isFullscreenReady || isViolationActive) return
    const interval = setInterval(() => {
      setRemainingSeconds(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [remainingSeconds, isFullscreenReady, isViolationActive])

  const goToQuestion = useCallback((num) => {
    if (num < 1 || num > questionCount || num === currentQuestion) return
    setQuestionStatuses(prev => {
      const next = { ...prev }
      if (prev[currentQuestion] !== 'attempted') {
        next[currentQuestion] = selectedAnswers[currentQuestion] !== undefined ? 'attempted' : 'skipped'
      }
      return next
    })
    setCurrentQuestion(num)
  }, [currentQuestion, questionCount, selectedAnswers])

  const handleSelectAnswer = useCallback((optionIndex) => {
    setSelectedAnswers(prev => ({ ...prev, [currentQuestion]: optionIndex }))
    setQuestionStatuses(prev => ({ ...prev, [currentQuestion]: 'attempted' }))
  }, [currentQuestion])

  const handleConfirmNext = useCallback(() => {
    setQuestionStatuses(prev => ({
      ...prev,
      [currentQuestion]: selectedAnswers[currentQuestion] !== undefined ? 'attempted' : 'skipped'
    }))
    if (currentQuestion < questionCount) {
      setCurrentQuestion(prev => prev + 1)
    }
  }, [currentQuestion, questionCount, selectedAnswers])

  const handlePrevious = useCallback(() => {
    if (currentQuestion > 1) {
      setQuestionStatuses(prev => ({
        ...prev,
        [currentQuestion]: selectedAnswers[currentQuestion] !== undefined ? 'attempted' :
          (prev[currentQuestion] === 'attempted' ? 'attempted' : 'skipped')
      }))
      setCurrentQuestion(prev => prev - 1)
    }
  }, [currentQuestion, selectedAnswers])

  const handleFinishQuiz = useCallback(async () => {
    if (isSubmitting || !attemptId) return
    setIsSubmitting(true)

    try {
      // Build answers array for ALL section questions (answered + skipped)
      const answersPayload = []
      for (let i = 1; i <= questionCount; i++) {
        const q = questions[i - 1]
        if (q) {
          const isAnswered = selectedAnswers[i] !== undefined
          const selectedOption = isAnswered ? q.options[selectedAnswers[i]] : null
          answersPayload.push({
            question_id: q.question_id,
            student_answer: selectedOption ? selectedOption.letter : '',
          })
        }
      }

      // 1. Submit section answers
      if (answersPayload.length > 0) {
        await submitAnswers(attemptId, 'mcq', answersPayload)
      }

      // 2. Cleanup anti-cheating before navigating away
      antiCheatCleanup()

      // 3. Navigate to results
      const studySetId = location.state?.studySetId
      navigate('/results', {
        state: {
          attemptId,
          studySetId,
          questionType: 'mcq',
        },
      })
    } catch (err) {
      console.error('Failed to submit quiz:', err)
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, attemptId, questionCount, questions, selectedAnswers, navigate, location.state, antiCheatCleanup])

  const handleAbortConfirm = useCallback(() => {
    antiCheatCleanup()
    navigate('/')
  }, [navigate, antiCheatCleanup])

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

  // Don't render if no questions or quiz was terminated by anti-cheat
  if (questionCount === 0 || quizTerminated) return null

  const currentQ = questions[currentQuestion - 1] || questions[0]

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans select-none ${
      isDarkMode ? "bg-[#0E0B15] text-white" : "bg-[#F6F3FC] text-[#292530]"
    }`}>
      {/* Fullscreen gate — blocks quiz until fullscreen is confirmed */}
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

      {/* Anti-cheating warning system */}
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
        <QuizCenter
          question={currentQ}
          currentQuestion={currentQuestion}
          questionCount={questionCount}
          selectedAnswer={selectedAnswers[currentQuestion]}
          onSelectAnswer={handleSelectAnswer}
          onPrevious={handlePrevious}
          onNext={currentQuestion === questionCount ? handleFinishQuiz : handleConfirmNext}
          isFirstQuestion={currentQuestion === 1}
          isLastQuestion={currentQuestion === questionCount}
          disabled={isViolationActive}
        />
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
