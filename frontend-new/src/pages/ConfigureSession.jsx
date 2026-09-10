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
import jojoWorking from '../assets/jojo-working.png'


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

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}


export default function ConfigureSession({
  studySetId: propStudySetId,
  studySetName: propStudySetName,
  preselectType,
}) {
  const { isDarkMode } = useTheme()

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


  /* =========================================================
     FETCH STUDY SET NAME
  ========================================================= */

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


  /* =========================================================
     LOAD REVISION STATUS
  ========================================================= */

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

        const preselected =
          preselectType &&
          byType[preselectType]?.available &&
          !byType[preselectType]?.needs_attention
            ? preselectType
            : null

        if (preselected) {
          setSelectedType(preselected)
        } else {
          const firstAvailable = questionTypes.find((t) => {
            const s = byType[t.id]

            return (
              s &&
              s.available &&
              !s.needs_attention
            )
          })

          setSelectedType(
            firstAvailable
              ? firstAvailable.id
              : null
          )
        }
      } catch (err) {
        console.error(
          'Failed to load revision status:',
          err
        )

        if (isMounted) {
          setError(
            classifyQuestionGenerationError(err)
          )
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


  /* =========================================================
     START SESSION
  ========================================================= */

  const handleStart = async () => {
    if (
      loading ||
      loadingStatus ||
      !selectedType
    ) {
      return
    }

    const selected = questionTypes.find(
      (t) => t.id === selectedType
    )

    if (!selected) return

    const selectedStatus =
      statusByType[selectedType]

    if (
      !selectedStatus?.available ||
      selectedStatus?.needs_attention
    ) {
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
      const currentAttempt =
        await getOrCreateAttempt(
          studySetId,
          selectedType
        )

      if (!currentAttempt?.attempt_id) {
        throw new Error(
          'Could not establish an active attempt for this question type.'
        )
      }

      let questions =
        await fetchQuestions(
          studySetId,
          selectedType,
          currentAttempt.attempt_id
        )

      if (
        !questions ||
        questions.length === 0
      ) {
        await generateQuestions(
          studySetId,
          selectedType,
          documentId,
          currentAttempt.attempt_id
        )

        questions =
          await fetchQuestions(
            studySetId,
            selectedType,
            currentAttempt.attempt_id
          )
      }

      if (
        !questions ||
        questions.length === 0
      ) {
        throw new Error(
          `No ${selected.title} questions could be generated for this study set.`
        )
      }

      navigate(selected.route, {
        state: {
          questionCount: questions.length,
          questionType: selectedType,
          questions: questions,
          attemptId:
            currentAttempt.attempt_id,
          studySetId,
        },
      })
    } catch (err) {
      console.error(
        'Failed to start session:',
        err
      )

      setError(
        classifyQuestionGenerationError(err)
      )
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

            {/* Soft glow */}
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

          {/* DOTS */}
          <div className="mt-7 flex items-center gap-2">

            <span
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#8064C7]"
              style={{
                animationDelay: '0ms',
              }}
            />

            <span
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#8064C7]"
              style={{
                animationDelay: '150ms',
              }}
            />

            <span
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#8064C7]"
              style={{
                animationDelay: '300ms',
              }}
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

          {/* DON'T CLOSE */}
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


  /* =========================================================
     MAIN CONFIGURE SESSION PAGE
  ========================================================= */

  return (
    <div className="flex h-full flex-col">

      {/* =====================================================
          JOJO ANIMATION STYLES
      ===================================================== */}

      <style>{`

        @keyframes configureJojoFloat {
          0%, 100% {
            transform: translateY(0px) rotate(-2deg);
          }

          50% {
            transform: translateY(-7px) rotate(2deg);
          }
        }

        @keyframes configureJojoGlow {
          0%, 100% {
            opacity: 0.35;
            transform: scale(0.92);
          }

          50% {
            opacity: 0.65;
            transform: scale(1.04);
          }
        }

        @keyframes configureOrbit {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes configureOrbitReverse {
          from {
            transform: rotate(360deg);
          }

          to {
            transform: rotate(0deg);
          }
        }

        @keyframes configureSparkle {
          0%, 100% {
            transform: scale(0.85);
            opacity: 0.5;
          }

          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        .configure-jojo {
          animation: configureJojoFloat 4s ease-in-out infinite;
        }

        .configure-jojo-glow {
          animation: configureJojoGlow 3s ease-in-out infinite;
        }

        .configure-orbit {
          animation: configureOrbit 18s linear infinite;
        }

        .configure-orbit-reverse {
          animation: configureOrbitReverse 13s linear infinite;
        }

        .configure-orbit-sparkle {
          animation: configureSparkle 2.4s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .configure-jojo,
          .configure-jojo-glow,
          .configure-orbit,
          .configure-orbit-reverse,
          .configure-orbit-sparkle {
            animation: none !important;
          }
        }

      `}</style>


      {/* =====================================================
          SCROLLABLE CONTENT
      ===================================================== */}

      <div className="flex-1 overflow-y-auto">

        <div className="px-4 pb-6 pt-4 sm:px-8 sm:pb-6 sm:pt-8">

          {/* MODULE BADGE */}
          <ModuleBadge
            text={
              studySetName
                ? `Study Set: ${studySetName}`
                : 'Study Set'
            }
          />

          {/* TITLE */}
          <h1 className="mt-4 text-2xl font-black leading-none tracking-tight sm:text-3xl">
            Configure Session
          </h1>

          {/* DESCRIPTION */}
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


          {/* =================================================
              QUESTION CARDS + JOJO
          ================================================= */}

          <div className="relative mt-7">

            {/* =================================================
                JOJO
                Positioned ABOVE the Long Answer card
            ================================================= */}

            <div
              className="
                pointer-events-none
                absolute
                right-[-10px]
                top-[-225px]
                z-20
                hidden
                h-[280px]
                w-[280px]
                items-center
                justify-center
                lg:flex
              "
            >

              {/* OUTER SOFT GLOW */}
              <div
                className={`configure-jojo-glow absolute inset-[20px] rounded-full blur-3xl ${
                  isDarkMode
                    ? 'bg-[#8064C7]/25'
                    : 'bg-[#8064C7]/20'
                }`}
              />


              {/* STATIC OUTER RING */}
              <div
                className={`absolute inset-[8px] rounded-full border ${
                  isDarkMode
                    ? 'border-white/10'
                    : 'border-[#8064C7]/15'
                }`}
              />


              {/* ROTATING OUTER ORBIT */}
              <div className="configure-orbit absolute inset-[8px]">

                {/* Top dot */}
                <span
                  className="absolute left-1/2 top-[-4px] h-3 w-3 -translate-x-1/2 rounded-full bg-[#45A9A9]"
                />

                {/* Right dot */}
                <span
                  className="absolute right-[-4px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#8064C7]"
                />

                {/* Bottom dot */}
                <span
                  className="absolute bottom-[-4px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#98E8DE]"
                />

                {/* Left sparkle */}
                <span
                  className="configure-orbit-sparkle absolute left-[-3px] top-1/2 -translate-y-1/2 text-lg text-[#8064C7]"
                >
                  ✦
                </span>

              </div>


              {/* INNER DASHED ORBIT */}
              <div
                className={`absolute inset-[30px] rounded-full border border-dashed ${
                  isDarkMode
                    ? 'border-white/15'
                    : 'border-[#8064C7]/20'
                }`}
              />


              {/* COUNTER ROTATING INNER ORBIT */}
              <div className="configure-orbit-reverse absolute inset-[30px]">

                <span
                  className="configure-orbit-sparkle absolute right-[1px] top-[10px] text-sm text-[#8064C7]"
                >
                  ✦
                </span>

                <span
                  className="absolute bottom-[7px] left-[4px] h-2 w-2 rounded-full bg-[#45A9A9]"
                />

                <span
                  className="absolute left-[10px] top-[4px] h-2 w-2 rounded-full bg-[#8064C7]"
                />

              </div>


              {/* JOJO */}
              <img
                src={jojoWorking}
                alt="Jojo is ready to help"
                className="
                  configure-jojo
                  relative
                  z-10
                  h-[220px]
                  w-[220px]
                  object-contain
                  drop-shadow-[0_12px_18px_rgba(93,66,152,0.25)]
                "
              />

            </div>


            {/* =================================================
                ERROR MESSAGE
            ================================================= */}

            {error && (
              <QuestionGenerationErrorCard
                errorObj={classifyQuestionGenerationError(error)}
                onRetry={handleStart}
                isLoading={loading}
              />
            )}


            {/* =================================================
                QUESTION TYPE CARDS
            ================================================= */}

            <div className="flex flex-wrap gap-4">

              {questionTypes.map((type) => {

                const s =
                  statusByType[type.id]

                const needsAttention =
                  Boolean(s?.needs_attention)

                const isMastered =
                  !needsAttention &&
                  s?.reason === 'attempts_exhausted'

                const isLocked =
                  !needsAttention &&
                  !isMastered &&
                  s?.available === false


                let statusLabel

                if (isLocked) {

                  const dueText =
                    formatDueDate(
                      s?.next_due_date
                    )

                  statusLabel =
                    dueText
                      ? `Due ${dueText}`
                      : 'Not yet due'

                } else if (
                  s &&
                  s.attempts_taken > 0 &&
                  !needsAttention &&
                  !isMastered
                ) {

                  statusLabel =
                    `Attempt ${s.attempts_taken + 1} of 4`

                }


                const explanation =
                  needsAttention
                    ? `${s.attempts_taken} attempt${
                        s.attempts_taken === 1
                          ? ''
                          : 's'
                      }, still below 50% - let's try a different approach.`
                    : null


                return (
                  <QuestionTypeCard
                    key={type.id}
                    type={type}
                    isSelected={
                      selectedType === type.id
                    }
                    isLocked={isLocked}
                    isMastered={isMastered}
                    needsAttention={
                      needsAttention
                    }
                    statusLabel={statusLabel}
                    explanation={explanation}
                    onSelect={() =>
                      setSelectedType(type.id)
                    }
                  />
                )
              })}

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          BOTTOM ACTION BAR
      ===================================================== */}

      <SessionActionBar
        onStart={handleStart}
        loading={
          loading ||
          loadingStatus ||
          !selectedType
        }
      />

    </div>
  )
}