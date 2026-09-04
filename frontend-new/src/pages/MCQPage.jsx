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
import jojoCelebration from '../assets/jojo-celebration.png'

const confettiPieces = [
  { left: '8%', top: '12%', rotate: '-18deg', delay: '0ms' },
  { left: '17%', top: '28%', rotate: '14deg', delay: '120ms' },
  { left: '28%', top: '8%', rotate: '32deg', delay: '240ms' },
  { left: '39%', top: '18%', rotate: '-12deg', delay: '80ms' },
  { left: '51%', top: '6%', rotate: '22deg', delay: '180ms' },
  { left: '63%', top: '16%', rotate: '-28deg', delay: '300ms' },
  { left: '75%', top: '10%', rotate: '12deg', delay: '140ms' },
  { left: '86%', top: '26%', rotate: '-20deg', delay: '260ms' },

  { left: '5%', top: '46%', rotate: '28deg', delay: '180ms' },
  { left: '13%', top: '62%', rotate: '-14deg', delay: '320ms' },
  { left: '84%', top: '48%', rotate: '18deg', delay: '100ms' },
  { left: '92%', top: '65%', rotate: '-26deg', delay: '220ms' },

  { left: '22%', top: '80%', rotate: '18deg', delay: '280ms' },
  { left: '35%', top: '88%', rotate: '-22deg', delay: '160ms' },
  { left: '49%', top: '82%', rotate: '14deg', delay: '40ms' },
  { left: '64%', top: '90%', rotate: '-18deg', delay: '240ms' },
  { left: '78%', top: '78%', rotate: '26deg', delay: '120ms' },
]

export default function MCQPage({ onNavigate } = {}) {
  const { isDarkMode } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  // Pull data from route state (set by ConfigureSession)
  const questions = useMemo(
    () => location.state?.questions || [],
    [location.state?.questions]
  )

  const attemptId = location.state?.attemptId

  const questionCount =
    questions.length || location.state?.questionCount || 0

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
  const [remainingSeconds, setRemainingSeconds] = useState(
    questionCount * 90
  )

  const [showAbortModal, setShowAbortModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showNavDrawer, setShowNavDrawer] = useState(false)
  const [showRoughWorkDrawer, setShowRoughWorkDrawer] = useState(false)

  // Controls the celebration screen
  const [showCelebration, setShowCelebration] = useState(false)

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
    onTerminate: () => {
      onNavigate?.('dashboard')
      navigate('/')
    },
  })

  // Redirect if no questions were loaded
  useEffect(() => {
    if (questionCount === 0) {
      onNavigate?.('quiz', { studySetId: location.state?.studySetId })
      navigate('/quiz')
    }
  }, [questionCount, navigate, onNavigate, location.state?.studySetId])

  // Timer — only ticks when fullscreen is established and no active violation
  useEffect(() => {
    if (
      remainingSeconds <= 0 ||
      !isFullscreenReady ||
      isViolationActive ||
      showCelebration
    ) {
      return
    }

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [
    remainingSeconds,
    isFullscreenReady,
    isViolationActive,
    showCelebration,
  ])

  const goToQuestion = useCallback(
    (num) => {
      if (
        num < 1 ||
        num > questionCount ||
        num === currentQuestion
      ) {
        return
      }

      setQuestionStatuses((prev) => {
        const next = { ...prev }

        if (prev[currentQuestion] !== 'attempted') {
          next[currentQuestion] =
            selectedAnswers[currentQuestion] !== undefined
              ? 'attempted'
              : 'skipped'
        }

        return next
      })

      setCurrentQuestion(num)
    },
    [
      currentQuestion,
      questionCount,
      selectedAnswers,
    ]
  )

  const handleSelectAnswer = useCallback(
    (optionIndex) => {
      setSelectedAnswers((prev) => ({
        ...prev,
        [currentQuestion]: optionIndex,
      }))

      setQuestionStatuses((prev) => ({
        ...prev,
        [currentQuestion]: 'attempted',
      }))
    },
    [currentQuestion]
  )

  const handleConfirmNext = useCallback(() => {
    setQuestionStatuses((prev) => ({
      ...prev,
      [currentQuestion]:
        selectedAnswers[currentQuestion] !== undefined
          ? 'attempted'
          : 'skipped',
    }))

    if (currentQuestion < questionCount) {
      setCurrentQuestion((prev) => prev + 1)
    }
  }, [
    currentQuestion,
    questionCount,
    selectedAnswers,
  ])

  const handlePrevious = useCallback(() => {
    if (currentQuestion > 1) {
      setQuestionStatuses((prev) => ({
        ...prev,
        [currentQuestion]:
          selectedAnswers[currentQuestion] !== undefined
            ? 'attempted'
            : prev[currentQuestion] === 'attempted'
            ? 'attempted'
            : 'skipped',
      }))

      setCurrentQuestion((prev) => prev - 1)
    }
  }, [currentQuestion, selectedAnswers])

  const handleFinishQuiz = useCallback(async () => {
    if (isSubmitting || !attemptId) return

    setIsSubmitting(true)

    try {
      const answersPayload = []

      for (let i = 1; i <= questionCount; i++) {
        const q = questions[i - 1]

        if (q) {
          const isAnswered =
            selectedAnswers[i] !== undefined

          const selectedOption = isAnswered
            ? q.options[selectedAnswers[i]]
            : null

          answersPayload.push({
            question_id: q.question_id,
            student_answer: selectedOption
              ? selectedOption.letter
              : '',
          })
        }
      }

      if (answersPayload.length > 0) {
        await submitAnswers(
          attemptId,
          'mcq',
          answersPayload
        )
      }

      antiCheatCleanup()
      setShowCelebration(true)

      const studySetId = location.state?.studySetId

      setTimeout(() => {
        onNavigate?.('results', {
          attemptId,
          studySetId,
          questionType: 'mcq',
          questions,
        })
        navigate('/results', {
          state: {
            attemptId,
            studySetId,
            questionType: 'mcq',
            questions,
          },
        })
      }, 2500)
    } catch (err) {
      console.error('Failed to submit quiz:', err)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    isSubmitting,
    attemptId,
    questionCount,
    questions,
    selectedAnswers,
    navigate,
    onNavigate,
    location.state,
    antiCheatCleanup,
  ])

  const handleAbortConfirm = useCallback(() => {
    antiCheatCleanup()
    onNavigate?.('dashboard')
    navigate('/')
  }, [navigate, onNavigate, antiCheatCleanup])

  const toggleBookmark = useCallback(() => {
    setBookmarkedQuestions((prev) => ({
      ...prev,
      [currentQuestion]: !prev[currentQuestion],
    }))
  }, [currentQuestion])

  const handleScratchpadChange = useCallback(
    (value) => {
      setScratchpad((prev) => ({
        ...prev,
        [currentQuestion]: value,
      }))
    },
    [currentQuestion]
  )

  const handleClearScratchpad = useCallback(() => {
    setScratchpad((prev) => ({
      ...prev,
      [currentQuestion]: '',
    }))
  }, [currentQuestion])

  if (questionCount === 0 || quizTerminated) return null

  /* =========================================================
      JOJO CELEBRATION SCREEN
  ========================================================= */

  if (showCelebration) {
    return (
      <div
        className={`relative flex h-screen w-screen items-center justify-center overflow-hidden font-sans ${
          isDarkMode
            ? 'bg-[#0E0B15] text-white'
            : 'bg-[#F6F3FC] text-[#292530]'
        }`}
      >
        <div
          className={`absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] ${
            isDarkMode
              ? 'bg-[#8064C7]/20'
              : 'bg-[#8064C7]/15'
          }`}
        />

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {confettiPieces.map((piece, index) => (
            <span
              key={index}
              className="absolute h-3 w-2 rounded-sm bg-[#8064C7] animate-[confettiPop_1.8s_ease-out_infinite]"
              style={{
                left: piece.left,
                top: piece.top,
                transform: `rotate(${piece.rotate})`,
                animationDelay: piece.delay,
              }}
            />
          ))}

          {confettiPieces.slice(0, 12).map((piece, index) => (
            <span
              key={`small-${index}`}
              className="absolute h-2.5 w-2.5 rounded-full bg-purple-300 animate-[confettiPop_1.6s_ease-out_infinite]"
              style={{
                left: piece.left,
                top: piece.top,
                animationDelay: piece.delay,
                transform: `translateY(8px)`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex w-full max-w-xl flex-col items-center px-6 text-center">
          <div className="relative mb-7 flex h-64 w-64 items-center justify-center">
            <div
              className={`absolute inset-0 rounded-full blur-3xl ${
                isDarkMode
                  ? 'bg-[#8064C7]/20'
                  : 'bg-[#8064C7]/15'
              }`}
            />

            <img
              src={jojoCelebration}
              alt="Jojo celebrating"
              className="relative z-10 h-60 w-60 object-contain animate-[jojoCelebrate_1s_ease-in-out_infinite]"
            />
          </div>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Quiz completed! 🎉
          </h1>

          <p
            className={`mt-3 max-w-md text-sm leading-relaxed ${
              isDarkMode
                ? 'text-white/55'
                : 'text-gray-500'
            }`}
          >
            Great job! Jojo is celebrating your progress.
          </p>

          <div
            className={`mt-7 rounded-2xl border px-6 py-4 backdrop-blur-xl ${
              isDarkMode
                ? 'border-white/10 bg-white/5'
                : 'border-[#8064C7]/10 bg-white/70'
            }`}
          >
            <p
              className={`text-sm font-bold ${
                isDarkMode
                  ? 'text-white/80'
                  : 'text-[#514863]'
              }`}
            >
              Your answers have been submitted successfully.
            </p>

            <p
              className={`mt-1 text-xs ${
                isDarkMode
                  ? 'text-white/35'
                  : 'text-gray-400'
              }`}
            >
              Taking you to your results...
            </p>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#8064C7]"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#8064C7]"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#8064C7]"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>
      </div>
    )
  }

  const currentQ =
    questions[currentQuestion - 1] || questions[0]

  return (
    <div
      className={`flex h-screen w-screen select-none flex-col overflow-hidden font-sans ${
        isDarkMode
          ? 'bg-[#0E0B15] text-white'
          : 'bg-[#F6F3FC] text-[#292530]'
      }`}
    >
      {!isFullscreenReady && (
        <div
          className={`fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-2xl ${
            isDarkMode
              ? 'bg-[#0E0B15]/90 text-white'
              : 'bg-white/90 text-[#292530]'
          }`}
        >
          <div className="max-w-sm px-6 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8064C7]/20 text-[#8064C7]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            </div>

            <h2 className="mb-2 text-xl font-black tracking-tight">
              Entering Secure Mode
            </h2>

            <p
              className={`text-xs leading-relaxed ${
                isDarkMode
                  ? 'text-white/60'
                  : 'text-gray-500'
              }`}
            >
              This quiz requires fullscreen mode for a secure
              exam environment. Click anywhere or press any
              key to continue.
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
        onToggleNavigator={() =>
          setShowNavDrawer((prev) => !prev)
        }
        onToggleRoughWork={() =>
          setShowRoughWorkDrawer((prev) => !prev)
        }
      />

      <div className="relative flex flex-1 overflow-hidden">
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
          onNext={
            currentQuestion === questionCount
              ? handleFinishQuiz
              : handleConfirmNext
          }
          isFirstQuestion={currentQuestion === 1}
          isLastQuestion={currentQuestion === questionCount}
          disabled={isViolationActive || isSubmitting}
        />

        <RoughWorkPanel
          value={scratchpad[currentQuestion] || ''}
          onChange={handleScratchpadChange}
          onClear={handleClearScratchpad}
          isOpen={showRoughWorkDrawer}
          onClose={() =>
            setShowRoughWorkDrawer(false)
          }
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