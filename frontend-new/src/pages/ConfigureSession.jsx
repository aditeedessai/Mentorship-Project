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
  fetchRevisionStatus,
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

const formatDueDate = (isoDate) => {
  if (!isoDate) return null
  const d = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function ConfigureSession({
  studySetId: propStudySetId,
  studySetName: propStudySetName,
  preselectType,
}) {
  const { isDarkMode } = useTheme()

  // Per-type status (available/attempts_taken/needs_attention/
  // next_due_date/last_accuracy), keyed by FRONTEND type id - every
  // type is independently scoped from its very first attempt now, so
  // there is no single study-set-wide "the attempt" left to track. This
  // replaces the old `attempt` state entirely.
  const [statusByType, setStatusByType] = useState({})
  const [selectedType, setSelectedType] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
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

  // Load per-type status on mount (and whenever the study set changes) -
  // replaces the old single "fetch or create the one active attempt"
  // effect. Nothing is created here; starting an attempt only happens
  // when the student actually picks a type and presses Start.
  useEffect(() => {
    let isMounted = true

    async function loadStatus() {
      if (!studySetId) {
        setLoadingStatus(false)
        return
      }

      try {
        setLoadingStatus(true)

        const result = await fetchRevisionStatus(studySetId)
        const statuses = result?.statuses || []

        if (!isMounted) return

        const byType = {}
        for (const s of statuses) {
          byType[toFrontendTypeId(s.question_type)] = s
        }
        setStatusByType(byType)

        // A caller can ask for one specific type to land pre-selected
        // (e.g. clicking a "Revise: X - Y" item on the Planner) - honor
        // it as long as that type is actually startable right now,
        // otherwise fall back to the normal first-available pick below
        // rather than landing on a disabled card.
        const preselected =
          preselectType &&
          byType[preselectType]?.available &&
          !byType[preselectType]?.needs_attention
            ? preselectType
            : null

        if (preselected) {
          setSelectedType(preselected)
        } else {
          // Auto-select the first genuinely startable type, mirroring the
          // old auto-select-first-uncompleted behavior.
          const firstAvailable = questionTypes.find((t) => {
            const s = byType[t.id]
            return s && s.available && !s.needs_attention
          })

          setSelectedType(firstAvailable ? firstAvailable.id : null)
        }
      } catch (err) {
        console.error('Failed to load revision status:', err)

        if (isMounted) {
          setError(classifyQuestionGenerationError(err))
        }
      } finally {
        if (isMounted) {
          setLoadingStatus(false)
        }
      }
    }

    loadStatus()

    return () => {
      isMounted = false
    }
  }, [studySetId, preselectType])

  const handleStart = async () => {
    if (loading || loadingStatus || !selectedType) return

    const selected = questionTypes.find(
      (t) => t.id === selectedType
    )

    if (!selected) return

    const selectedStatus = statusByType[selectedType]

    if (!selectedStatus?.available || selectedStatus?.needs_attention) {
      setError(
        `${selected.title} isn't available to start right now.`
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
      // Resolve (or create) the attempt for THIS type only - every type
      // resolves independently now, there is no shared attempt to reuse
      // across types.
      const currentAttempt = await getOrCreateAttempt(
        studySetId,
        selectedType
      )

      if (!currentAttempt?.attempt_id) {
        throw new Error(
          'Could not establish an active attempt for this question type.'
        )
      }

      // 1. Check if questions already exist for THIS SPECIFIC ATTEMPT -
      // not "does this study set + type have any questions ever
      // generated", which used to silently serve a revision attempt
      // every question left over from a prior (already-completed)
      // attempt instead of a fresh set. A resumed in_progress attempt
      // reuses the same attempt_id (see getOrCreateAttempt ->
      // start_attempt's resume path) and so still finds its own
      // questions here; a new revision attempt gets a brand-new
      // attempt_id and so correctly finds none yet.
      let questions = await fetchQuestions(
        studySetId,
        selectedType,
        currentAttempt.attempt_id
      )

      // 2. Only generate new questions if this attempt doesn't have its
      // own set yet.
      if (!questions || questions.length === 0) {
        await generateQuestions(
          studySetId,
          selectedType,
          documentId,
          currentAttempt.attempt_id
        )

        questions = await fetchQuestions(
          studySetId,
          selectedType,
          currentAttempt.attempt_id
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
            Select the question format you'd like to tackle
            next. Each type keeps its own independent schedule -
            AI Study Engine will generate a tailored set based
            on your recent mastery level for that type.
          </p>

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
              const s = statusByType[type.id]

              const needsAttention = Boolean(s?.needs_attention)
              const isMastered =
                !needsAttention && s?.reason === 'attempts_exhausted'
              const isLocked =
                !needsAttention && !isMastered && s?.available === false

              let statusLabel
              if (isLocked) {
                const dueText = formatDueDate(s?.next_due_date)
                statusLabel = dueText ? `Due ${dueText}` : 'Not yet due'
              } else if (s && s.attempts_taken > 0 && !needsAttention && !isMastered) {
                statusLabel = `Attempt ${s.attempts_taken + 1} of 4`
              }

              // Plain-language, real-numbers explanation for a capped-
              // and-still-weak type - attempts_taken comes straight off
              // this same status entry, never restated/recomputed.
              const explanation = needsAttention
                ? `${s.attempts_taken} attempt${s.attempts_taken === 1 ? '' : 's'}, still below 50% - let's try a different approach.`
                : null

              return (
                <QuestionTypeCard
                  key={type.id}
                  type={type}
                  isSelected={selectedType === type.id}
                  isLocked={isLocked}
                  isMastered={isMastered}
                  needsAttention={needsAttention}
                  statusLabel={statusLabel}
                  explanation={explanation}
                  onSelect={() => setSelectedType(type.id)}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <SessionActionBar
        onStart={handleStart}
        loading={loading || loadingStatus || !selectedType}
      />
    </div>
  )
}
