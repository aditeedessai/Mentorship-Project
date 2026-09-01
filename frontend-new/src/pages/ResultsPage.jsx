import { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  fetchResults,
  fetchPerformance,
  fetchEvaluations,
  finishAttempt,
} from '../services/api';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Target,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import jojoEvaluating from '../assets/jojo-evaluating.png';

const normalizeTypeName = (typeStr) => {
  const s = (typeStr || '').toUpperCase().trim();

  if (s.includes('MCQ') || s === 'MCQ') return 'MCQ';
  if (s.includes('LONG') || s === 'LONG') return 'LONG ANSWER';
  if (s.includes('APP') || s === 'APPLICATION') return 'APPLICATION';
  if (
    s.includes('SHORT') ||
    s === 'SHORT-ANSWER' ||
    s === 'SHORT'
  ) {
    return 'SHORT ANSWER';
  }

  return s || 'MCQ';
};

export default function ResultsPage({
  onNavigate,
  studySetId: propStudySetId,
}) {
  const { isDarkMode } = useTheme();
  const { attemptId: paramAttemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const passedAttemptId =
    paramAttemptId || location.state?.attemptId;

  const studySetId =
    location.state?.studySetId ||
    propStudySetId ||
    'default-set';

  const [loading, setLoading] = useState(false);
  const [resultsData, setResultsData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState(null);

  const finishedAttemptRef = useRef(null);

  const handleGoDashboard = () => {
    if (typeof onNavigate === 'function') {
      onNavigate('dashboard');
    }

    navigate('/');
  };

  const handleRetakeQuiz = () => {
    if (typeof onNavigate === 'function') {
      onNavigate('quiz', { studySetId });
    }

    navigate('/quiz', {
      state: { studySetId },
    });
  };

  const handleContinueQuiz = () => {
    if (typeof onNavigate === 'function') {
      onNavigate('quiz', {
        studySetId,
        attemptId: passedAttemptId,
      });
    }

    navigate('/quiz', {
      state: {
        studySetId,
        attemptId: passedAttemptId,
      },
    });
  };

  const handleToggleSection = (sectionName) => {
    setActiveSection((prev) =>
      prev === sectionName ? null : sectionName
    );
  };

  useEffect(() => {
    if (!passedAttemptId) return;

    localStorage.setItem(
      'last_attempt_id',
      passedAttemptId
    );

    async function loadAllResults() {
      try {
        setLoading(true);
        setError(null);

        const [
          resData,
          perfData,
          evalsData,
        ] = await Promise.all([
          fetchResults(passedAttemptId).catch(
            () => null
          ),
          fetchPerformance(passedAttemptId).catch(
            () => null
          ),
          fetchEvaluations(passedAttemptId).catch(
            () => []
          ),
        ]);

        setResultsData(resData);
        setPerformanceData(perfData);

        let rawList = [];

        if (Array.isArray(evalsData)) {
          rawList = evalsData;
        } else if (
          Array.isArray(evalsData?.results)
        ) {
          rawList = evalsData.results;
        } else if (
          Array.isArray(evalsData?.evaluations)
        ) {
          rawList = evalsData.evaluations;
        }

        setEvaluations(rawList);

        const submittedType =
          location.state?.questionType
            ? normalizeTypeName(
                location.state.questionType
              )
            : null;

        if (submittedType) {
          setActiveSection(submittedType);
        } else if (rawList.length > 0) {
          setActiveSection(
            normalizeTypeName(
              rawList[0].question_type ||
                rawList[0].type
            )
          );
        } else if (
          perfData?.completed_sections?.length > 0
        ) {
          setActiveSection(
            normalizeTypeName(
              perfData.completed_sections[0]
            )
          );
        }
      } catch (err) {
        console.error(
          'Error loading results:',
          err
        );

        setError(
          err.message ||
            'Failed to load evaluation'
        );
      } finally {
        setLoading(false);
      }
    }

    loadAllResults();
  }, [
    passedAttemptId,
    location.state?.questionType,
  ]);

  const isAttemptComplete = useMemo(() => {
    if (
      performanceData?.is_attempt_complete !==
      undefined
    ) {
      return Boolean(
        performanceData.is_attempt_complete
      );
    }

    if (
      resultsData?.is_attempt_complete !==
      undefined
    ) {
      return Boolean(
        resultsData.is_attempt_complete
      );
    }

    if (performanceData?.completed_sections) {
      return (
        performanceData.completed_sections
          .length >= 4
      );
    }

    return false;
  }, [performanceData, resultsData]);

  useEffect(() => {
    if (
      isAttemptComplete &&
      passedAttemptId &&
      finishedAttemptRef.current !==
        passedAttemptId
    ) {
      finishedAttemptRef.current =
        passedAttemptId;

      finishAttempt(passedAttemptId).catch(
        (err) => {
          console.warn(
            'finishAttempt notice (attempt may already be finalized):',
            err
          );
        }
      );
    }
  }, [
    isAttemptComplete,
    passedAttemptId,
  ]);

  const cumulativeData = useMemo(() => {
    const perf =
      performanceData || resultsData;

    return perf?.cumulative || null;
  }, [performanceData, resultsData]);

  const totalScore = useMemo(() => {
    if (
      cumulativeData?.total_marks_obtained !==
      undefined
    ) {
      return (
        Math.round(
          Number(
            cumulativeData.total_marks_obtained
          ) * 100
        ) / 100
      );
    }

    return 0;
  }, [cumulativeData]);

  const maxScore = useMemo(() => {
    if (
      cumulativeData?.total_maximum_marks !==
      undefined
    ) {
      return Number(
        cumulativeData.total_maximum_marks
      );
    }

    return 0;
  }, [cumulativeData]);

  const overallPercentage = useMemo(() => {
    if (
      cumulativeData?.overall_percentage !==
      undefined
    ) {
      return Math.round(
        Number(
          cumulativeData.overall_percentage
        )
      );
    }

    return maxScore > 0
      ? Math.round(
          (totalScore / maxScore) * 100
        )
      : 0;
  }, [
    cumulativeData,
    totalScore,
    maxScore,
  ]);

  const overallRemark = useMemo(() => {
    return (
      cumulativeData?.overall_remark ||
      null
    );
  }, [cumulativeData]);

  const sectionsList = useMemo(() => {
    const perf =
      performanceData || resultsData;

    const rawSections = perf?.sections || [];

    if (rawSections.length > 0) {
      return rawSections.map((sp) => {
        const uiName = normalizeTypeName(
          sp.section_name
        );

        const marksObtained = Number(
          sp.marks_obtained ?? 0
        );

        const maximumMarks = Number(
          sp.maximum_marks ?? 0
        );

        const percentage =
          sp.percentage !== undefined
            ? Math.round(sp.percentage)
            : maximumMarks > 0
            ? Math.round(
                (marksObtained /
                  maximumMarks) *
                  100
              )
            : 0;

        return {
          name: uiName,
          rawName: sp.section_name,
          marksObtained:
            Math.round(
              marksObtained * 100
            ) / 100,
          maximumMarks:
            Math.round(
              maximumMarks * 100
            ) / 100,
          percentage,
          remark: sp.remark || null,
        };
      });
    }

    if (
      evaluations &&
      evaluations.length > 0
    ) {
      const grouped = {};

      evaluations.forEach((item) => {
        const typeKey =
          normalizeTypeName(
            item.question_type ||
              item.type
          );

        if (!grouped[typeKey]) {
          grouped[typeKey] = {
            name: typeKey,
            marksObtained: 0,
            maximumMarks: 0,
          };
        }

        const rawAns =
          item.student_answer ??
          item.user_answer ??
          item.answer;

        const isSkipped =
          rawAns === null ||
          rawAns === undefined ||
          String(rawAns).trim() === '';

        const earned = isSkipped
          ? 0
          : Number(
              item.marks_awarded ??
                item.score ??
                0
            );

        const maxM = Number(
          item.max_marks ?? 0
        );

        grouped[typeKey].marksObtained +=
          earned;

        grouped[typeKey].maximumMarks +=
          maxM;
      });

      return Object.values(grouped).map(
        (g) => ({
          name: g.name,
          rawName:
            g.name.toLowerCase(),
          marksObtained:
            Math.round(
              g.marksObtained * 100
            ) / 100,
          maximumMarks:
            Math.round(
              g.maximumMarks * 100
            ) / 100,
          percentage:
            g.maximumMarks > 0
              ? Math.round(
                  (g.marksObtained /
                    g.maximumMarks) *
                    100
                )
              : 0,
          remark: null,
        })
      );
    }

    return [];
  }, [
    performanceData,
    resultsData,
    evaluations,
  ]);

  const activeQuestions = useMemo(() => {
    if (
      !activeSection ||
      !evaluations ||
      evaluations.length === 0
    ) {
      return [];
    }

    const filtered =
      evaluations.filter((item) => {
        const t =
          normalizeTypeName(
            item.question_type ||
              item.type
          );

        return t === activeSection;
      });

    return filtered.map((item, idx) => {
      const rawAns =
        item.student_answer ??
        item.user_answer ??
        item.answer;

      const isSkipped =
        rawAns === null ||
        rawAns === undefined ||
        String(rawAns).trim() === '';

      const awardedMarks = Number(
        item.marks_awarded ??
          item.score ??
          0
      );

      const maxMarks = Number(
        item.max_marks ?? 1
      );

      const isCorrect =
        typeof item.is_correct ===
        'boolean'
          ? item.is_correct
          : null;

      const feedbackText =
        item.feedback &&
        String(item.feedback).trim() !== ''
          ? item.feedback
          : 'No feedback available.';

      return {
        id: idx + 1,
        question_id:
          item.question_id,
        prompt:
          item.question_text ||
          item.question ||
          item.prompt ||
          `Question ${idx + 1}`,
        userAnswer: isSkipped
          ? 'Skipped'
          : rawAns,
        correctAnswer:
          item.correct_answer ||
          item.model_answer ||
          item.expected_answer ||
          'N/A',
        feedback: feedbackText,
        awardedMarks:
          Math.round(
            awardedMarks * 100
          ) / 100,
        maxMarks:
          Math.round(
            maxMarks * 100
          ) / 100,
        isCorrect,
        isSkipped,
      };
    });
  }, [
    activeSection,
    evaluations,
  ]);

  const activeCorrect = useMemo(() => {
    return activeQuestions.filter(
      (q) => q.isCorrect === true
    ).length;
  }, [activeQuestions]);

  const activeSkipped = useMemo(() => {
    return activeQuestions.filter(
      (q) => q.isSkipped
    ).length;
  }, [activeQuestions]);

  const activeWrong = useMemo(() => {
    return activeQuestions.filter(
      (q) =>
        q.isCorrect === false &&
        !q.isSkipped
    ).length;
  }, [activeQuestions]);

  const totalCorrect = useMemo(() => {
    if (
      !evaluations ||
      evaluations.length === 0
    ) {
      return 0;
    }

    return evaluations.filter(
      (item) => item.is_correct === true
    ).length;
  }, [evaluations]);

  const totalSkipped = useMemo(() => {
    if (
      !evaluations ||
      evaluations.length === 0
    ) {
      return 0;
    }

    return evaluations.filter((item) => {
      const rawAns =
        item.student_answer ??
        item.user_answer ??
        item.answer;

      return (
        rawAns === null ||
        rawAns === undefined ||
        String(rawAns).trim() === ''
      );
    }).length;
  }, [evaluations]);

  const totalWrong = useMemo(() => {
    if (
      !evaluations ||
      evaluations.length === 0
    ) {
      return 0;
    }

    return evaluations.filter((item) => {
      const rawAns =
        item.student_answer ??
        item.user_answer ??
        item.answer;

      const isSkipped =
        rawAns === null ||
        rawAns === undefined ||
        String(rawAns).trim() === '';

      return (
        !isSkipped &&
        item.is_correct === false
      );
    }).length;
  }, [evaluations]);

  const strengths = useMemo(() => {
    const list = [];

    const perf =
      performanceData || resultsData;

    const strongestSecName =
      perf?.cumulative
        ?.strongest_section;

    if (strongestSecName) {
      const formattedName =
        normalizeTypeName(
          strongestSecName
        );

      const match =
        sectionsList.find(
          (s) =>
            s.rawName ===
              strongestSecName ||
            s.name === formattedName
        );

      if (match && match.remark) {
        list.push(
          `Strongest Section: ${match.name} — ${match.marksObtained}/${match.maximumMarks} Marks (${match.percentage}%, Remark: ${match.remark})`
        );
      } else if (match) {
        list.push(
          `Strongest Section: ${match.name} — ${match.marksObtained}/${match.maximumMarks} Marks (${match.percentage}%)`
        );
      } else {
        list.push(
          `Strongest Section: ${formattedName}`
        );
      }
    }

    if (
      list.length === 0 &&
      overallRemark
    ) {
      list.push(
        `Overall Performance Remark: ${overallRemark}`
      );
    }

    if (list.length === 0) {
      list.push(
        'No backend section strength details available.'
      );
    }

    return list;
  }, [
    performanceData,
    resultsData,
    sectionsList,
    overallRemark,
  ]);

  const improvements = useMemo(() => {
    const list = [];

    const perf =
      performanceData || resultsData;

    const weakestSecName =
      perf?.cumulative
        ?.weakest_section;

    const remaining =
      perf?.remaining_sections || [];

    if (weakestSecName) {
      const formattedName =
        normalizeTypeName(
          weakestSecName
        );

      const match =
        sectionsList.find(
          (s) =>
            s.rawName ===
              weakestSecName ||
            s.name === formattedName
        );

      if (match && match.remark) {
        list.push(
          `Weakest Section: ${match.name} — ${match.marksObtained}/${match.maximumMarks} Marks (${match.percentage}%, Remark: ${match.remark})`
        );
      } else if (match) {
        list.push(
          `Weakest Section: ${match.name} — ${match.marksObtained}/${match.maximumMarks} Marks (${match.percentage}%)`
        );
      } else {
        list.push(
          `Weakest Section: ${formattedName}`
        );
      }
    }

    if (remaining.length > 0) {
      const formattedRem =
        remaining
          .map(normalizeTypeName)
          .join(', ');

      list.push(
        `Remaining section(s) to complete: ${formattedRem}`
      );
    }

    if (list.length === 0) {
      list.push(
        'No backend improvement recommendations available.'
      );
    }

    return list;
  }, [
    performanceData,
    resultsData,
    sectionsList,
  ]);

  /* =========================================================
     JOJO EVALUATING LOADING UI
  ========================================================= */

  if (loading) {
    return (
      <div
        className={`relative flex min-h-[70vh] items-center justify-center overflow-hidden rounded-3xl transition-all duration-500 ${
          isDarkMode
            ? 'bg-[#0E0B15] text-white'
            : 'bg-[#F6F3FC] text-[#292530]'
        }`}
      >
        {/* Background glow */}
        <div
          className={`absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[110px] ${
            isDarkMode
              ? 'bg-[#8064C7]/20'
              : 'bg-[#8064C7]/15'
          }`}
        />

        <div className="relative z-10 flex w-full max-w-xl flex-col items-center px-6 py-12 text-center">

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
              src={jojoEvaluating}
              alt="Jojo is evaluating your performance"
              className="relative z-10 h-52 w-52 object-contain animate-[jojoFloat_3s_ease-in-out_infinite]"
            />
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            Jojo is evaluating...
          </h2>

          {/* Description */}
          <p
            className={`mt-3 max-w-md text-sm leading-relaxed ${
              isDarkMode
                ? 'text-white/55'
                : 'text-gray-500'
            }`}
          >
            Jojo is reviewing your answers and preparing
            your performance insights.
          </p>

          {/* Animated dots */}
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

          {/* Information Card */}
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
                Your performance data is being analyzed
                to identify strengths, weak areas, and
                progress.
              </p>
            </div>
          </div>

          {/* Don't close message */}
          <p
            className={`mt-5 text-[11px] ${
              isDarkMode
                ? 'text-white/30'
                : 'text-gray-400'
            }`}
          >
            Please don't close this page while Jojo
            reviews your performance.
          </p>
        </div>
      </div>
    );
  }

  if (
    error &&
    !performanceData &&
    evaluations.length === 0
  ) {
    return (
      <div className="mx-auto mt-20 max-w-md rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
        <AlertCircle
          className="mx-auto mb-2 text-red-400"
          size={28}
        />

        <p className="text-base font-black">
          Failed to load evaluation
        </p>

        <p className="mt-1 text-xs text-red-300">
          {error}
        </p>

        <button
          type="button"
          onClick={handleGoDashboard}
          className="mt-4 rounded-xl bg-red-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-red-600"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const completedSectionsCount =
    performanceData?.completed_sections
      ?.length || sectionsList.length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12 transition-all duration-300">

      {/* 1. Header Banner */}
      <div className="space-y-3">
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-bold ${
            isDarkMode
              ? 'border-[#8064C7]/30 bg-[#8064C7]/20 text-[#A78BFA]'
              : 'border-[#8064C7]/20 bg-[#8064C7]/10 text-[#8064C7]'
          }`}
        >
          <span className="flex h-2 w-2 animate-pulse rounded-full bg-[#8064C7]" />

          <span>
            {isAttemptComplete
              ? 'Evaluation Completed • Final Assessment'
              : `Section Completed (${completedSectionsCount}/4 Sections Done)`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
            <Sparkles size={22} />
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight">
              {isAttemptComplete
                ? 'Overall Performance'
                : 'Section Evaluation Snapshot'}
            </h1>

            <p
              className={`text-sm ${
                isDarkMode
                  ? 'text-white/60'
                  : 'text-gray-500'
              }`}
            >
              {isAttemptComplete
                ? 'Detailed breakdown of questions answered right vs wrong across all completed sections.'
                : 'Performance snapshot for your recent section submission and cumulative quiz progress.'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Hero Overall Performance Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#8064C7] p-5 text-white shadow-xl sm:p-8">
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                <CheckCircle2 size={14} />

                {isAttemptComplete
                  ? 'Attempt Completed'
                  : `In-Progress Attempt (${completedSectionsCount}/4 Sections)`}
              </span>

              {overallRemark && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/30 px-3 py-1 text-xs font-bold text-white">
                  <Sparkles size={14} />
                  Overall Remark: {overallRemark}
                </span>
              )}
            </div>

            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              {isAttemptComplete
                ? 'Overall Performance'
                : 'Cumulative Performance'}
            </h1>

            <p className="mt-1 text-xs text-purple-100 sm:text-sm">
              {isAttemptComplete
                ? 'Combined score evaluated across all 4 mandatory sections in this study set.'
                : 'Cumulative score evaluated so far across completed question sections.'}
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center justify-around gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md sm:justify-center sm:gap-4 sm:p-5 lg:w-auto">
            <div className="px-2 text-center sm:px-3">
              <div className="text-2xl font-black text-white sm:text-3xl">
                {overallPercentage}%
              </div>

              <div className="mt-0.5 text-[10px] font-bold text-purple-200 sm:text-xs">
                Overall %
              </div>
            </div>

            <div className="hidden h-8 w-px bg-white/20 sm:block" />

            <div className="px-2 text-center sm:px-3">
              <div className="text-2xl font-black text-emerald-300 sm:text-3xl">
                {totalCorrect}
              </div>

              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200 sm:text-xs">
                Correct
              </div>
            </div>

            <div className="hidden h-8 w-px bg-white/20 sm:block" />

            <div className="px-2 text-center sm:px-3">
              <div className="text-2xl font-black text-rose-300 sm:text-3xl">
                {totalWrong}
              </div>

              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-200 sm:text-xs">
                Wrong
              </div>
            </div>

            {totalSkipped > 0 && (
              <>
                <div className="hidden h-8 w-px bg-white/20 sm:block" />

                <div className="px-2 text-center sm:px-3">
                  <div className="text-2xl font-black text-amber-300 sm:text-3xl">
                    {totalSkipped}
                  </div>

                  <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200 sm:text-xs">
                    Skipped
                  </div>
                </div>
              </>
            )}

            <div className="hidden h-8 w-px bg-white/20 sm:block" />

            <div className="px-2 text-center sm:px-3">
              <div className="text-2xl font-black sm:text-3xl">
                {totalScore}{' '}
                <span className="text-xs font-normal text-purple-200">
                  / {maxScore}
                </span>
              </div>

              <div className="mt-0.5 text-[10px] font-bold text-purple-200 sm:text-xs">
                Total Marks
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section-Wise Breakdown */}
      {sectionsList.length > 0 && (
        <div
          className={`space-y-4 rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
            isDarkMode
              ? 'border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]'
              : 'border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black tracking-tight">
              Section-Wise Breakdown
            </h2>

            <span
              className={`text-xs ${
                isDarkMode
                  ? 'text-white/50'
                  : 'text-gray-400'
              }`}
            >
              {activeSection
                ? 'Click section card again to collapse'
                : 'Click a section card below to view its question breakdown'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {sectionsList.map((sec, idx) => {
              const isSelected =
                activeSection === sec.name;

              return (
                <div
                  key={idx}
                  onClick={() =>
                    handleToggleSection(
                      sec.name
                    )
                  }
                  className={`group cursor-pointer rounded-2xl border p-5 transition-all duration-300 ${
                    isSelected
                      ? 'border-[#8064C7] bg-[#8064C7]/15 shadow-md ring-2 ring-[#8064C7]/50'
                      : isDarkMode
                      ? 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'
                      : 'border-gray-200/80 bg-white hover:border-[#8064C7] hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[#8064C7] dark:text-[#A78BFA]">
                      {sec.name}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        isDarkMode
                          ? 'bg-[#8064C7]/30 text-[#A78BFA]'
                          : 'bg-[#8064C7]/10 text-[#8064C7]'
                      }`}
                    >
                      {sec.percentage}%
                    </span>
                  </div>

                  <div className="mt-3 text-2xl font-black tracking-tight">
                    {sec.marksObtained}{' '}
                    <span
                      className={`text-xs font-semibold ${
                        isDarkMode
                          ? 'text-white/50'
                          : 'text-gray-500'
                      }`}
                    >
                      / {sec.maximumMarks} Marks
                    </span>
                  </div>

                  {sec.remark && (
                    <div className="mt-1 text-xs font-bold text-[#8064C7] dark:text-[#A78BFA]">
                      Remark:{' '}
                      <span>
                        {sec.remark}
                      </span>
                    </div>
                  )}

                  <div className="mt-3">
                    <div
                      className={`h-1.5 w-full overflow-hidden rounded-full ${
                        isDarkMode
                          ? 'bg-white/10'
                          : 'bg-black/10'
                      }`}
                    >
                      <div
                        className="h-full rounded-full bg-[#8064C7] transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            Math.max(
                              sec.percentage,
                              0
                            ),
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-[#8064C7] dark:text-[#A78BFA]">
                    <span>
                      {isSelected
                        ? 'Viewing Questions'
                        : 'Switch to this Section'}
                    </span>

                    {isSelected ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4. Active Section Review Drawer */}
          {activeSection &&
            activeQuestions.length > 0 && (
              <div
                className={`mt-6 space-y-4 rounded-2xl border p-6 backdrop-blur-xl animate-fade-in ${
                  isDarkMode
                    ? 'border-white/10 bg-white/5'
                    : 'border-gray-200 bg-gray-50/50'
                }`}
              >
                <div className="flex items-center justify-between border-b border-inherit pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#8064C7] dark:text-[#A78BFA]">
                      Section Review
                    </span>

                    <h3 className="text-lg font-black tracking-tight">
                      {activeSection}{' '}
                      Questions
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400">
                      {activeCorrect} Right
                    </span>

                    <span className="rounded-lg border border-rose-500/30 bg-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-400">
                      {activeWrong} Wrong
                    </span>

                    {activeSkipped > 0 && (
                      <span className="rounded-lg border border-amber-500/30 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-400">
                        {activeSkipped}{' '}
                        Skipped
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setActiveSection(null)
                      }
                      className="ml-2 cursor-pointer text-xs font-bold opacity-60 transition hover:opacity-100"
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {activeQuestions.map(
                    (q) => (
                      <div
                        key={q.id}
                        className={`space-y-3 rounded-2xl border p-5 backdrop-blur-xl ${
                          q.isSkipped
                            ? 'border-amber-500/30 bg-amber-500/10'
                            : q.isCorrect ===
                              true
                            ? isDarkMode
                              ? 'border-white/5 bg-white/5'
                              : 'border-gray-100 bg-white'
                            : q.isCorrect ===
                              false
                            ? 'border-rose-500/30 bg-rose-500/10'
                            : isDarkMode
                            ? 'border-white/5 bg-white/5'
                            : 'border-gray-100 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#8064C7] dark:text-[#A78BFA]">
                            Question {q.id}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
                              q.isSkipped
                                ? 'border-amber-500/30 bg-amber-500/20 text-amber-400'
                                : q.isCorrect ===
                                  true
                                ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                                : q.isCorrect ===
                                  false
                                ? 'border-rose-500/30 bg-rose-500/20 text-rose-400'
                                : 'border-white/20 bg-white/10 text-white/70'
                            }`}
                          >
                            {q.isSkipped ? (
                              <AlertCircle size={13} />
                            ) : q.isCorrect ===
                              true ? (
                              <CheckCircle2 size={13} />
                            ) : q.isCorrect ===
                              false ? (
                              <XCircle size={13} />
                            ) : null}

                            {q.isSkipped
                              ? `Skipped (0/${q.maxMarks} Marks)`
                              : q.isCorrect ===
                                true
                              ? `Correct (+${q.awardedMarks}/${q.maxMarks} Marks)`
                              : q.isCorrect ===
                                false
                              ? `Incorrect (${q.awardedMarks}/${q.maxMarks} Marks)`
                              : `${q.awardedMarks}/${q.maxMarks} Marks`}
                          </span>
                        </div>

                        <p className="text-sm font-bold tracking-tight">
                          {q.prompt}
                        </p>

                        <div className="grid grid-cols-1 gap-3 pt-1 text-xs font-medium sm:grid-cols-2">
                          <div
                            className={`rounded-xl border p-3 ${
                              isDarkMode
                                ? 'border-white/5 bg-white/5'
                                : 'border-gray-100 bg-gray-50'
                            }`}
                          >
                            <span className="mb-1 block text-[10px] font-bold uppercase opacity-40">
                              Your Submitted
                              Answer
                            </span>

                            <span
                              className={
                                q.isSkipped
                                  ? 'font-bold italic text-amber-400'
                                  : q.isCorrect ===
                                    true
                                  ? 'font-bold'
                                  : q.isCorrect ===
                                    false
                                  ? 'font-bold text-rose-400'
                                  : 'font-bold'
                              }
                            >
                              {q.userAnswer}
                            </span>
                          </div>

                          <div
                            className={`rounded-xl border p-3 ${
                              isDarkMode
                                ? 'border-[#8064C7]/30 bg-[#8064C7]/15'
                                : 'border-[#8064C7]/20 bg-purple-50'
                            }`}
                          >
                            <span className="mb-1 block text-[10px] font-bold uppercase text-[#8064C7] dark:text-[#A78BFA]">
                              Correct /
                              Expected
                              Solution
                            </span>

                            <span className="font-bold">
                              {q.correctAnswer}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`rounded-xl border-l-4 border-l-[#8064C7] p-3 text-xs ${
                            isDarkMode
                              ? 'bg-white/5'
                              : 'bg-purple-50/50'
                          }`}
                        >
                          <span className="font-bold text-[#8064C7] dark:text-[#A78BFA]">
                            Explanation &
                            Feedback:{' '}
                          </span>

                          {q.feedback}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
        </div>
      )}

      {/* 5. Key Strengths & Areas for Improvement */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div
          className={`space-y-3 rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
            isDarkMode
              ? 'border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]'
              : 'border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]'
          }`}
        >
          <div className="flex items-center gap-2 text-emerald-400">
            <TrendingUp size={18} />
            <h3 className="text-sm font-black tracking-tight">
              Key Strengths
            </h3>
          </div>

          <ul className="space-y-2">
            {strengths.map(
              (item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-xs font-semibold leading-relaxed"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[9px] font-bold text-emerald-400">
                    ✓
                  </span>

                  <span>{item}</span>
                </li>
              )
            )}
          </ul>
        </div>

        <div
          className={`space-y-3 rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
            isDarkMode
              ? 'border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]'
              : 'border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]'
          }`}
        >
          <div className="flex items-center gap-2 text-[#8064C7] dark:text-[#A78BFA]">
            <Target size={18} />

            <h3 className="text-sm font-black tracking-tight">
              Areas for Improvement
            </h3>
          </div>

          <ul className="space-y-2">
            {improvements.map(
              (item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-xs font-semibold leading-relaxed"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-[9px] font-bold text-rose-400">
                    !
                  </span>

                  <span>{item}</span>
                </li>
              )
            )}
          </ul>
        </div>
      </div>

      {/* 6. Navigation Controls */}
      <div
        className={`flex flex-col items-center justify-between gap-4 rounded-3xl border p-5 backdrop-blur-2xl transition-all duration-300 sm:flex-row ${
          isDarkMode
            ? 'border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]'
            : 'border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]'
        }`}
      >
        {isAttemptComplete ? (
          <>
            <button
              type="button"
              onClick={handleRetakeQuiz}
              className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-6 py-3 text-xs font-bold transition sm:w-auto ${
                isDarkMode
                  ? 'border-white/10 bg-white/5 hover:bg-white/10'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <RotateCcw size={16} />
              Retake Quiz / Study
              Sets
            </button>

            <button
              type="button"
              onClick={handleGoDashboard}
              className="group inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#8064C7] px-8 py-3 text-xs font-bold text-white shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition hover:bg-[#8B6DD4] sm:w-auto"
            >
              Return to Dashboard

              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleGoDashboard}
              className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-6 py-3 text-xs font-bold transition sm:w-auto ${
                isDarkMode
                  ? 'border-white/10 bg-white/5 hover:bg-white/10'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              Return to Dashboard
            </button>

            <button
              type="button"
              onClick={handleContinueQuiz}
              className="group inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#8064C7] px-8 py-3 text-xs font-bold text-white shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition hover:bg-[#8B6DD4] sm:w-auto"
            >
              Continue Quiz Session

              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>
          </>
        )}
      </div>
    </div>
  );
}