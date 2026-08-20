import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import ModuleBadge from '../components/ModuleBadge'
import QuestionTypeCard from '../components/QuestionTypeCard'
import SessionActionBar from '../components/SessionActionBar'
import { ListChecks, FileText, Lightbulb } from 'lucide-react'
import { fetchQuestions, createAttempt } from '../services/api'

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
]

export default function ConfigureSession({ studySetId: propStudySetId }) {
  const [selectedType, setSelectedType] = useState('short-answer')
  const [questionCount, setQuestionCount] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  const studySetId = propStudySetId || location.state?.studySetId

  const handleStart = async () => {
    const selected = questionTypes.find((t) => t.id === selectedType)
    if (!selected) return

    if (!studySetId) {
      setError('No study set selected. Please select a study set from the Dashboard first.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Fetch questions for the selected type using the chosen studySetId
      const questions = await fetchQuestions(studySetId, selectedType)
      if (!questions || questions.length === 0) {
        throw new Error(`No ${selected.title} questions found for this study set.`)
      }

      // 2. Create a new attempt for the chosen studySetId
      const attempt = await createAttempt(studySetId)

      // 3. Use the actual number of returned questions (may be fewer than requested count)
      const actualCount = Math.min(questionCount, questions.length)

      // 4. Navigate to the quiz page with all data
      navigate(selected.route, {
        state: {
          questionCount: actualCount,
          questionType: selectedType,
          questions: questions.slice(0, actualCount),
          attemptId: attempt.attempt_id,
          studySetId,
        },
      })
    } catch (err) {
      console.error('Failed to start session:', err)
      setError(err.message || 'Failed to start session. Is the backend running?')
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

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
              {error}
            </div>
          )}

          {/* Question Type Cards */}
          <div className="mt-[28px] flex gap-[17px]">
            {questionTypes.map((type) => (
              <QuestionTypeCard
                key={type.id}
                type={type}
                isSelected={selectedType === type.id}
                onSelect={() => setSelectedType(type.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <SessionActionBar
        questionCount={questionCount}
        onQuestionCountChange={setQuestionCount}
        onStart={handleStart}
        loading={loading}
      />
    </div>
  )
}
