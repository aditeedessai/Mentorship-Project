import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import ModuleBadge from '../components/ModuleBadge'
import QuestionTypeCard from '../components/QuestionTypeCard'
import SessionActionBar from '../components/SessionActionBar'
import { ListChecks, FileText, Lightbulb, BookOpen } from 'lucide-react'
import { fetchQuestions, getOrCreateAttempt, generateQuestions } from '../services/api'

const questionTypes = [
  {
    id: 'mcq',
    title: 'Multiple Choice',
    description: 'Test your recognition and recall with traditional 4-option questions designed to identify knowledge gaps quickly.',
    badge: 'High Accuracy',
    icon: ListChecks,
    route: '/quiz/mcq',
  },
  {
    id: 'short-answer',
    title: 'Short Answer',
    description: 'Practice articulating concepts. AI Study Engine will evaluate your responses for key terminology and conceptual accuracy.',
    badge: 'Active Recall Focus',
    icon: FileText,
    route: '/quiz/qna',
  },
  {
    id: 'application',
    title: 'Application Based',
    description: 'Scenario-driven problems that test your ability to apply concepts to realistic situations.',
    badge: 'Mastery Level',
    icon: Lightbulb,
    route: '/quiz/qna',
  },
  {
    id: 'long',
    title: 'Long Answer',
    description: 'Deep conceptual questions testing synthesis, analysis, and comprehensive understanding.',
    badge: 'Comprehensive',
    icon: BookOpen,
    route: '/quiz/qna',
  },
]

const toFrontendTypeId = (bType) => (bType === 'short' ? 'short-answer' : bType)

export default function ConfigureSession({ studySetId: propStudySetId }) {
  const [selectedType, setSelectedType] = useState('mcq')
  const [questionCount, setQuestionCount] = useState(20)
  const [attempt, setAttempt] = useState(null)
  const [loadingAttempt, setLoadingAttempt] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  const studySetId = propStudySetId || location.state?.studySetId
  const documentId = location.state?.documentId

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
          const completedFrontend = (att.completed_sections || []).map(toFrontendTypeId)
          
          // Auto-select first available (uncompleted) section type
          const available = questionTypes.find((t) => !completedFrontend.includes(t.id))
          if (available) {
            setSelectedType(available.id)
          }
        }
      } catch (err) {
        console.error('Failed to load active attempt:', err)
        if (isMounted) {
          setError('Failed to load active quiz attempt. Is the backend server running?')
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

  const completedFrontendSections = (attempt?.completed_sections || []).map(toFrontendTypeId)
  const isAttemptComplete = attempt?.is_attempt_complete || completedFrontendSections.length === 4

  const handleStart = async () => {
    if (loading || loadingAttempt) return

    if (isAttemptComplete) {
      setError('All 4 question sections for this quiz attempt have been completed.')
      return
    }

    const selected = questionTypes.find((t) => t.id === selectedType)
    if (!selected) return

    if (completedFrontendSections.includes(selectedType)) {
      setError(`The ${selected.title} section is already completed and locked.`)
      return
    }

    if (!studySetId) {
      setError('No study set selected. Please select a study set from the Dashboard first.')
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
        throw new Error('Could not establish an active attempt for this study set.')
      }

      // 1. Generate questions using AI engine for the selected type & study set
      await generateQuestions(studySetId, selectedType, documentId)

      // 2. Fetch questions for the selected type
      const questions = await fetchQuestions(studySetId, selectedType)
      if (!questions || questions.length === 0) {
        throw new Error(`No ${selected.title} questions could be generated for this study set.`)
      }

      // 3. Determine actual question count
      const actualCount = Math.min(questionCount, questions.length)

      // 4. Navigate to the quiz page reusing the SAME attempt_id (NO createAttempt call)
      navigate(selected.route, {
        state: {
          questionCount: actualCount,
          questionType: selectedType,
          questions: questions.slice(0, actualCount),
          attemptId: currentAttempt.attempt_id,
          studySetId,
        },
      })
    } catch (err) {
      console.error('Failed to start session:', err)
      const msg = err.message || ''
      if (msg.includes('No study material') || msg.includes('400')) {
        setError('Please upload a document before starting a quiz.')
      } else {
        setError(msg || 'Failed to start session. Is the backend running?')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-[48px] pt-[40px]">
          <ModuleBadge />

          <h1 className="mt-[18px] text-[32px] font-bold text-[#171717] leading-[1.1] tracking-[-0.01em]">
            Configure Session
          </h1>

          <p className="mt-[14px] text-[13.5px] leading-[1.55] text-[#4A4A4A] max-w-[600px]">
            Select the question formats you'd like to tackle in this study block. AI Study Engine will generate a
            tailored set based on your recent mastery levels.
          </p>

          {/* Attempt status notice when loading or completed */}
          {isAttemptComplete && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[13px] text-emerald-800 font-medium flex items-center justify-between">
              <span>All 4 section types in this quiz attempt are completed!</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
              {error}
            </div>
          )}

          {/* Question Type Cards */}
          <div className="mt-[28px] flex gap-[17px]">
            {questionTypes.map((type) => {
              const isCompleted = completedFrontendSections.includes(type.id)
              return (
                <QuestionTypeCard
                  key={type.id}
                  type={type}
                  isSelected={selectedType === type.id}
                  isCompleted={isCompleted}
                  onSelect={() => !isCompleted && setSelectedType(type.id)}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <SessionActionBar
        questionCount={questionCount}
        onQuestionCountChange={setQuestionCount}
        onStart={handleStart}
        loading={loading || loadingAttempt}
      />
    </div>
  )
}
