import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import QuizHeader from '../components/quiz/QuizHeader'
import QuestionNavigator from '../components/quiz/QuestionNavigator'
import QuizCenter from '../components/quiz/QuizCenter'
import RoughWorkPanel from '../components/quiz/RoughWorkPanel'
import AbortQuizModal from '../components/quiz/AbortQuizModal'
import AntiCheatingWarning from '../components/quiz/AntiCheatingWarning'
import { submitAnswers, finishAttempt } from '../services/api'
import useQuizAntiCheating from '../hooks/useQuizAntiCheating'

export default function MCQPage() {
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
      // Build answers array from selectedAnswers
      const answersPayload = []
      for (let i = 1; i <= questionCount; i++) {
        const q = questions[i - 1]
        if (selectedAnswers[i] !== undefined && q) {
          const selectedOption = q.options[selectedAnswers[i]]
          answersPayload.push({
            question_id: q.question_id,
            student_answer: selectedOption ? selectedOption.letter : '',
          })
        }
      }

      // 1. Submit answers if any
      if (answersPayload.length > 0) {
        await submitAnswers(attemptId, 'mcq', answersPayload)
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
        />
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
