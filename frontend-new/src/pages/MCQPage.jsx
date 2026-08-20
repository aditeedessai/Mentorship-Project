import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import QuizHeader from '../components/quiz/QuizHeader'
import QuestionNavigator from '../components/quiz/QuestionNavigator'
import QuizCenter from '../components/quiz/QuizCenter'
import RoughWorkPanel from '../components/quiz/RoughWorkPanel'
import AbortQuizModal from '../components/quiz/AbortQuizModal'
import { submitAnswers, finishAttempt } from '../services/api'

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

  // Redirect if no questions were loaded
  useEffect(() => {
    if (questionCount === 0) {
      navigate('/quiz')
    }
  }, [questionCount, navigate])

  // Timer
  useEffect(() => {
    if (remainingSeconds <= 0) return
    const interval = setInterval(() => {
      setRemainingSeconds(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [remainingSeconds])

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

      // Submit answers if any
      if (answersPayload.length > 0) {
        await submitAnswers(attemptId, 'mcq', answersPayload)
      }

      // Finish the attempt
      await finishAttempt(attemptId)

      // Navigate back
      navigate('/quiz')
    } catch (err) {
      console.error('Failed to submit quiz:', err)
      // Still navigate back on error to avoid being stuck
      navigate('/quiz')
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, attemptId, questionCount, questions, selectedAnswers, navigate])

  const handleAbortConfirm = useCallback(() => {
    navigate('/')
  }, [navigate])

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

  if (questionCount === 0) return null

  const currentQ = questions[currentQuestion - 1] || questions[0]

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden font-sans">
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
