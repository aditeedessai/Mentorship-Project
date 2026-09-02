import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import ModuleBadge from '../components/ModuleBadge'
import QuestionTypeCard from '../components/QuestionTypeCard'
import SessionActionBar from '../components/SessionActionBar'
import QuestionGenerationErrorCard from '../components/QuestionGenerationErrorCard'
import { ListChecks, FileText, Lightbulb, BookOpen, Sparkles } from 'lucide-react'
import {
  fetchQuestions,
  getOrCreateAttempt,
  generateQuestions,
  fetchStudySets,
} from '../services/api'
import { classifyQuestionGenerationError } from '../utils/errorClassification'
import jojoThinking from '../assets/jojo-thinking.png'

const questionTypes = [
  {
    id: 'mcq',
    title: 'Multiple Choice',
    description:
      'Test your recognition and recall with traditional 4-option questions designed to identify knowledge gaps quickly.',
    badge: 'High Accuracy',
    icon: ListChecks,
    route: '/quiz/mcq',
  },
  {
    id: 'short-answer',
    title: 'Short Answer',
    description:
      'Practice articulating concepts. AI Study Engine will evaluate your responses for key terminology and conceptual accuracy.',
    badge: 'Active Recall Focus',
    icon: FileText,
    route: '/quiz/qna',
  },
  {
    id: 'application',
    title: 'Application Based',
    description:
      'Scenario-driven problems that test your ability to apply concepts to realistic situations.',
    badge: 'Mastery Level',
    icon: Lightbulb,
    route: '/quiz/qna',
  },
  {
    id: 'long',
    title: 'Long Answer',
    description:
      'Deep conceptual questions testing synthesis, analysis, and comprehensive understanding.',
    badge: 'Comprehensive',
    icon: BookOpen,
    route: '/quiz/qna',
  },
]

const toFrontendTypeId = (bType) =>
  bType === 'short' ? 'short-answer' : bType

export default function ConfigureSession({
  studySetId: propStudySetId,
  studySetName: propStudySetName,
}) {
  const { isDarkMode } = useTheme()

  const [selectedType, setSelectedType] = useState('mcq')
  const [attempt, setAttempt] = useState(null)
  const [loadingAttempt, setLoadingAttempt] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const navigate = useNavigate()
  const location = useLocation()

  const studySetId =
    propStudySetId || location.state?.studySetId

  const documentId = location.state?.documentId

  const [fetchedStudySetName, setFetchedStudySetName] =
    useState('')

  const studySetName =
    propStudySetName ||
    location.state?.studySetName ||
    fetchedStudySetName

  useEffect(() => {
    if (!studySetName && studySetId) {
      fetchStudySets()
        .then((sets) => {
          const found = (sets || []).find(
            (s) => s.study_set_id === studySetId
          )

          if (found?.name) {
            setFetchedStudySetName(found.name)
          }
        })
        .catch(() => {})
    }
  }, [studySetName, studySetId])

  // Fetch or resume the active attempt for this study set on mount
  useEffect(() => {
    let isMounted = true

    async function initAttempt() {
      if (!studySetId) {
        setLoadingAttempt(false)
        return
      }

      try {
        setLoadingAttempt(true)

        const att = await getOrCreateAttempt(studySetId)

        if (isMounted && att) {
          setAttempt(att)

          const completedFrontend = (
            att.completed_sections || []
          ).map(toFrontendTypeId)

          // Auto-select first available (uncompleted) section type
          const available = questionTypes.find(
            (t) => !completedFrontend.includes(t.id)
          )

          if (available) {
            setSelectedType(available.id)
          }
        }
      } catch (err) {
        console.error('Failed to load active attempt:', err)

        if (isMounted) {
          setError(classifyQuestionGenerationError(err))
        }
      } finally {
        if (isMounted) {
          setLoadingAttempt(false)
        }
      }
    }

    initAttempt()

    return () => {
      isMounted = false
    }
  }, [studySetId])

  const completedFrontendSections = (
    attempt?.completed_sections || []
  ).map(toFrontendTypeId)

  const isAttemptComplete =
    attempt?.is_attempt_complete ||
    completedFrontendSections.length === 4

  const handleStart = async () => {
    if (loading || loadingAttempt) return

    if (isAttemptComplete) {
      setError(
        'All 4 question sections for this quiz attempt have been completed.'
      )
      return
    }

    const selected = questionTypes.find(
      (t) => t.id === selectedType
    )

    if (!selected) return

    if (completedFrontendSections.includes(selectedType)) {
      setError(
        `The ${selected.title} section is already completed and locked.`
      )
      return
    }

    if (!studySetId) {
      setError(
        'No study set selected. Please select a study set from the Dashboard first.'
      )
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Re-verify active attempt without creating a duplicate
      let currentAttempt = attempt

      if (!currentAttempt?.attempt_id) {
        currentAttempt = await getOrCreateAttempt(studySetId)
        setAttempt(currentAttempt)
      }

      if (!currentAttempt?.attempt_id) {
        throw new Error(
          'Could not establish an active attempt for this study set.'
        )
      }

      // 1. Check if questions already exist for the selected type and study set
      let questions = await fetchQuestions(
        studySetId,
        selectedType
      )

      // 2. Only generate new questions if none exist yet
      if (!questions || questions.length === 0) {
        await generateQuestions(
          studySetId,
          selectedType,
          documentId
        )

        questions = await fetchQuestions(
          studySetId,
          selectedType
        )
      }

      if (!questions || questions.length === 0) {
        throw new Error(
          `No ${selected.title} questions could be generated for this study set.`
        )
      }

      // 3. Navigate to the quiz page reusing the SAME attempt_id
      navigate(selected.route, {
        state: {
          questionCount: questions.length,
          questionType: selectedType,
          questions: questions,
          attemptId: currentAttempt.attempt_id,
          studySetId,
        },
      })
    } catch (err) {
      console.error('Failed to start session:', err)
      setError(classifyQuestionGenerationError(err))
    } finally {
      setLoading(false)
    }
  }

  /* =========================================================
     JOJO THINKING LOADING UI
  ========================================================= */

  if (loading) {
    return (
      <div
        className={`flex min-h-[70vh] items-center justify-center rounded-3xl transition-all duration-500 ${
          isDarkMode
            ? 'bg-[#0E131F] text-white'
            : 'bg-[#F8F8FC] text-[#231B33]'
        }`}
      >
        <div className="flex w-full max-w-xl flex-col items-center px-6 py-12 text-center">

          {/* JOJO */}
          <div className="relative mb-8 flex h-56 w-56 items-center justify-center">

            {/* Soft glow behind Jojo */}
            <div
              className={`absolute inset-0 rounded-full blur-3xl ${
                isDarkMode
                  ? 'bg-[#8064C7]/20'
                  : 'bg-[#8064C7]/15'
              }`}
            />

            <img
              src={jojoThinking}
              alt="Jojo is thinking"
              className="relative z-10 h-52 w-52 object-contain"
            />
          </div>

          {/* HEADING */}
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            Jojo is thinking...
          </h2>

          {/* DESCRIPTION */}
          <p
            className={`mt-3 max-w-md text-sm leading-relaxed ${
              isDarkMode
                ? 'text-white/55'
                : 'text-gray-500'
            }`}
          >
            Jojo is creating your personalized quiz from
            your study material.
          </p>

          {/* ANIMATED DOTS */}
          <div className="mt-7 flex items-center gap-2">
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

          {/* INFORMATION CARD */}
          <div
            className={`mt-8 w-full max-w-sm rounded-2xl border px-5 py-4 backdrop-blur-xl ${
              isDarkMode
                ? 'border-white/10 bg-white/5'
                : 'border-[#8064C7]/10 bg-white/70'
            }`}
          >
            <div className="flex items-start gap-3 text-left">

              <Sparkles
                size={18}
                className="mt-0.5 shrink-0 text-[#8064C7]"
              />

              <p
                className={`text-xs font-semibold leading-relaxed ${
                  isDarkMode
                    ? 'text-white/50'
                    : 'text-gray-500'
                }`}
              >
                Your questions are being generated around
                the material you uploaded.
              </p>
            </div>
          </div>

          {/* DON'T CLOSE MESSAGE */}
          <p
            className={`mt-5 text-[11px] ${
              isDarkMode
                ? 'text-white/30'
                : 'text-gray-400'
            }`}
          >
            Please don't close this page while Jojo prepares
            your quiz.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pb-6 pt-4 sm:px-8 sm:pb-6 sm:pt-8">

          <ModuleBadge
            text={
              studySetName
                ? `Study Set: ${studySetName}`
                : 'Study Set'
            }
          />

          <h1 className="mt-4 text-2xl font-black leading-none tracking-tight sm:text-3xl">
            Configure Session
          </h1>

          <p
            className={`mt-3 max-w-[600px] text-sm leading-relaxed ${
              isDarkMode
                ? 'text-white/60'
                : 'text-[#706A78]'
            }`}
          >
            Select the question formats you'd like to tackle
            in this study block. AI Study Engine will generate
            a tailored set based on your recent mastery levels.
          </p>

          {/* Attempt status notice */}
          {isAttemptComplete && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/20 p-3 text-xs font-bold text-emerald-400">
              <span>
                All 4 section types in this quiz attempt are
                completed!
              </span>
            </div>
          )}

          {/* Error message card */}
          {error && (
            <QuestionGenerationErrorCard
              errorObj={classifyQuestionGenerationError(error)}
              onRetry={handleStart}
              isLoading={loading}
            />
          )}

          {/* Question Type Cards */}
          <div className="mt-7 flex flex-wrap gap-4">
            {questionTypes.map((type) => {
              const isCompleted =
                completedFrontendSections.includes(type.id)

              return (
                <QuestionTypeCard
                  key={type.id}
                  type={type}
                  isSelected={selectedType === type.id}
                  isCompleted={isCompleted}
                  onSelect={() =>
                    !isCompleted &&
                    setSelectedType(type.id)
                  }
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <SessionActionBar
        onStart={handleStart}
        loading={loading || loadingAttempt}
      />
    </div>
  )
}