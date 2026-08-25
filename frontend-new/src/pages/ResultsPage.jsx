import { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchResults, fetchPerformance, fetchEvaluations, finishAttempt } from '../services/api';
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
  Clock,
} from 'lucide-react';

const normalizeTypeName = (typeStr) => {
  const s = (typeStr || '').toUpperCase().trim();
  if (s.includes('MCQ') || s === 'MCQ') return 'MCQ';
  if (s.includes('LONG') || s === 'LONG') return 'LONG ANSWER';
  if (s.includes('APP') || s === 'APPLICATION') return 'APPLICATION';
  if (s.includes('SHORT') || s === 'SHORT-ANSWER' || s === 'SHORT') return 'SHORT ANSWER';
  return s || 'MCQ';
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Just now';
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'min' : 'mins'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
};

export default function ResultsPage({ onNavigate, studySetId: propStudySetId }) {
  const { attemptId: paramAttemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const passedAttemptId = paramAttemptId || location.state?.attemptId;
  const studySetId = location.state?.studySetId || propStudySetId || 'default-set';

  const [loading, setLoading] = useState(false);
  const [resultsData, setResultsData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState(null);

  // Ref to protect finishAttempt from being called multiple times
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
    navigate('/quiz', { state: { studySetId } });
  };

  const handleContinueQuiz = () => {
    if (typeof onNavigate === 'function') {
      onNavigate('quiz', { studySetId, attemptId: passedAttemptId });
    }
    navigate('/quiz', { state: { studySetId, attemptId: passedAttemptId } });
  };

  const handleToggleSection = (sectionName) => {
    setActiveSection((prev) => (prev === sectionName ? null : sectionName));
  };

  // Fetch results & performance data on mount
  useEffect(() => {
    if (!passedAttemptId) return;

    localStorage.setItem('last_attempt_id', passedAttemptId);

    async function loadAllResults() {
      try {
        setLoading(true);
        setError(null);

        const [resData, perfData, evalsData] = await Promise.all([
          fetchResults(passedAttemptId).catch(() => null),
          fetchPerformance(passedAttemptId).catch(() => null),
          fetchEvaluations(passedAttemptId).catch(() => []),
        ]);

        setResultsData(resData);
        setPerformanceData(perfData);

        let rawList = [];
        if (Array.isArray(evalsData)) rawList = evalsData;
        else if (Array.isArray(evalsData?.results)) rawList = evalsData.results;
        else if (Array.isArray(evalsData?.evaluations)) rawList = evalsData.evaluations;
        else if (Array.isArray(evalsData?.questions)) rawList = evalsData.questions;
        else if (Array.isArray(resData?.questions)) rawList = resData.questions;
        else if (Array.isArray(perfData?.questions)) rawList = perfData.questions;

        setEvaluations(rawList);

        // Auto-set active section to recently submitted section or first completed section
        const submittedType = location.state?.questionType
          ? normalizeTypeName(location.state.questionType)
          : null;

        if (submittedType) {
          setActiveSection(submittedType);
        } else if (rawList.length > 0) {
          setActiveSection(normalizeTypeName(rawList[0].question_type || rawList[0].type));
        } else if (perfData?.completed_sections?.length > 0) {
          setActiveSection(normalizeTypeName(perfData.completed_sections[0]));
        }
      } catch (err) {
        console.error('Error loading results:', err);
        setError(err.message || 'Failed to load evaluation');
      } finally {
        setLoading(false);
      }
    }

    loadAllResults();
  }, [passedAttemptId, location.state?.questionType]);

  // Determine overall completion status from backend
  const isAttemptComplete = useMemo(() => {
    if (performanceData?.is_attempt_complete !== undefined) {
      return Boolean(performanceData.is_attempt_complete);
    }
    if (resultsData?.is_attempt_complete !== undefined) {
      return Boolean(resultsData.is_attempt_complete);
    }
    if (performanceData?.completed_sections) {
      return performanceData.completed_sections.length >= 4;
    }
    return false;
  }, [performanceData, resultsData]);

  // Call finishAttempt ONCE only when isAttemptComplete is true
  useEffect(() => {
    if (
      isAttemptComplete &&
      passedAttemptId &&
      finishedAttemptRef.current !== passedAttemptId
    ) {
      finishedAttemptRef.current = passedAttemptId;
      finishAttempt(passedAttemptId).catch((err) => {
        console.warn('finishAttempt notice (attempt may already be finalized):', err);
      });
    }
  }, [isAttemptComplete, passedAttemptId]);

  // Build section performance list from backend performance/evaluations
  const sectionsList = useMemo(() => {
    const perf = performanceData || resultsData;

    if (perf?.section_performances && perf.section_performances.length > 0) {
      return perf.section_performances.map((sp) => {
        const uiName = normalizeTypeName(sp.section_name || sp.question_type);
        const earned = Number(sp.marks_obtained ?? sp.earned_marks ?? sp.score ?? 0);
        const maxM = Number(sp.maximum_marks ?? sp.total_marks ?? sp.max_marks ?? 10);
        const acc = sp.percentage !== undefined ? Math.round(sp.percentage) : (maxM > 0 ? Math.round((earned / maxM) * 100) : 0);
        return {
          name: uiName,
          score: Math.round(earned * 100) / 100,
          maxMarks: maxM,
          accuracy: acc,
          timestamp: sp.completed_at || perf.completed_at || new Date().toISOString(),
        };
      });
    }

    if (perf?.sections && perf.sections.length > 0) {
      return perf.sections.map((sp) => {
        const uiName = normalizeTypeName(sp.section_name || sp.question_type);
        const earned = Number(sp.marks_obtained ?? sp.earned_marks ?? sp.score ?? 0);
        const maxM = Number(sp.maximum_marks ?? sp.total_marks ?? sp.max_marks ?? 10);
        const acc = sp.percentage !== undefined ? Math.round(sp.percentage) : (maxM > 0 ? Math.round((earned / maxM) * 100) : 0);
        return {
          name: uiName,
          score: Math.round(earned * 100) / 100,
          maxMarks: maxM,
          accuracy: acc,
          timestamp: sp.completed_at || perf.completed_at || new Date().toISOString(),
        };
      });
    }

    if (evaluations && evaluations.length > 0) {
      const grouped = {};
      evaluations.forEach((item) => {
        const typeKey = normalizeTypeName(item.question_type || item.type);
        if (!grouped[typeKey]) {
          grouped[typeKey] = { name: typeKey, score: 0, maxMarks: 0, timestamp: item.created_at || new Date().toISOString() };
        }
        const rawAns = item.student_answer ?? item.user_answer ?? item.answer;
        const isSkipped = rawAns === null || rawAns === undefined || String(rawAns).trim() === '';
        const earned = isSkipped ? 0 : Number(item.score ?? item.awarded_marks ?? (item.is_correct ? 1 : 0));
        const maxM = Number(item.max_marks ?? 1);
        grouped[typeKey].score += earned;
        grouped[typeKey].maxMarks += maxM;
      });

      return Object.values(grouped).map((g) => ({
        name: g.name,
        score: Math.round(g.score * 100) / 100,
        maxMarks: g.maxMarks,
        accuracy: g.maxMarks > 0 ? Math.round((g.score / g.maxMarks) * 100) : 0,
        timestamp: g.timestamp,
      }));
    }

    return [];
  }, [performanceData, resultsData, evaluations]);

  const totalScore = useMemo(() => {
    const perf = performanceData || resultsData;
    const val = perf?.cumulative?.total_marks_obtained ?? perf?.total_score ?? perf?.cumulative?.earned_marks;
    if (val !== undefined) {
      return Math.round(Number(val) * 100) / 100;
    }
    return Math.round(sectionsList.reduce((acc, s) => acc + s.score, 0) * 100) / 100;
  }, [performanceData, resultsData, sectionsList]);

  const maxScore = useMemo(() => {
    const perf = performanceData || resultsData;
    const val = perf?.cumulative?.total_maximum_marks ?? perf?.total_max_marks ?? perf?.cumulative?.total_marks;
    if (val !== undefined) {
      return Number(val);
    }
    return sectionsList.reduce((acc, s) => acc + s.maxMarks, 0);
  }, [performanceData, resultsData, sectionsList]);

  const percentage = useMemo(() => {
    const perf = performanceData || resultsData;
    const val = perf?.cumulative?.overall_percentage ?? perf?.overall_percentage;
    if (val !== undefined) {
      return Math.round(Number(val));
    }
    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  }, [performanceData, resultsData, totalScore, maxScore]);

  // Questions for active drawer filter
  const activeQuestions = useMemo(() => {
    if (!activeSection || !evaluations || evaluations.length === 0) return [];

    const filtered = evaluations.filter((item) => {
      const t = normalizeTypeName(item.question_type || item.type);
      return t === activeSection;
    });

    return filtered.map((item, idx) => {
      const rawAns = item.student_answer ?? item.user_answer ?? item.answer;
      const isSkipped = rawAns === null || rawAns === undefined || String(rawAns).trim() === '';
      const awardedMarks = Number(item.score ?? item.awarded_marks ?? (item.is_correct ? 1 : 0));
      const maxMarks = Number(item.max_marks ?? 1);
      const isPassed = !isSkipped && Boolean(item.is_correct ?? (awardedMarks >= maxMarks * 0.5));

      let feedbackText = item.feedback || item.explanation;
      if (isSkipped) {
        feedbackText = 'Question skipped by student.';
      } else if (!feedbackText) {
        feedbackText = isPassed ? 'Good response.' : 'Needs improvement.';
      }

      return {
        id: idx + 1,
        prompt: item.question_text || item.question || item.prompt || `Question ${idx + 1}`,
        userAnswer: isSkipped ? 'Skipped' : rawAns,
        correctAnswer: item.correct_answer || item.model_answer || item.expected_answer || 'N/A',
        feedback: feedbackText,
        awardedMarks: isSkipped ? 0 : Math.round(awardedMarks * 100) / 100,
        maxMarks,
        isPassed,
        isSkipped,
      };
    });
  }, [activeSection, evaluations]);

  const activeCorrect = useMemo(() => {
    return activeQuestions.filter((q) => q.isPassed).length;
  }, [activeQuestions]);

  const activeSkipped = useMemo(() => {
    return activeQuestions.filter((q) => q.isSkipped).length;
  }, [activeQuestions]);

  const activeWrong = useMemo(() => {
    return activeQuestions.filter((q) => !q.isPassed && !q.isSkipped).length;
  }, [activeQuestions]);

  const totalCorrect = useMemo(() => {
    if (!evaluations || evaluations.length === 0) return 0;
    return evaluations.filter((item) => {
      const rawAns = item.student_answer ?? item.user_answer ?? item.answer;
      const isSkipped = rawAns === null || rawAns === undefined || String(rawAns).trim() === '';
      if (isSkipped) return false;
      const earned = Number(item.score ?? item.awarded_marks ?? (item.is_correct ? 1 : 0));
      const maxM = Number(item.max_marks ?? 1);
      return item.is_correct || (earned >= maxM * 0.5);
    }).length;
  }, [evaluations]);

  const totalSkipped = useMemo(() => {
    if (!evaluations || evaluations.length === 0) return 0;
    return evaluations.filter((item) => {
      const rawAns = item.student_answer ?? item.user_answer ?? item.answer;
      return rawAns === null || rawAns === undefined || String(rawAns).trim() === '';
    }).length;
  }, [evaluations]);

  const totalWrong = useMemo(() => {
    if (!evaluations || evaluations.length === 0) return 0;
    return evaluations.filter((item) => {
      const rawAns = item.student_answer ?? item.user_answer ?? item.answer;
      const isSkipped = rawAns === null || rawAns === undefined || String(rawAns).trim() === '';
      if (isSkipped) return false;
      const earned = Number(item.score ?? item.awarded_marks ?? (item.is_correct ? 1 : 0));
      const maxM = Number(item.max_marks ?? 1);
      const isCorr = item.is_correct || (earned >= maxM * 0.5);
      return !isCorr;
    }).length;
  }, [evaluations]);

  const strengths = useMemo(() => {
    if (performanceData?.strengths && performanceData.strengths.length > 0) {
      return performanceData.strengths;
    }
    const highAcc = sectionsList.filter((s) => s.accuracy >= 60).map((s) => s.name);
    if (highAcc.length > 0) {
      return highAcc.map((name) => `Strong performance and conceptual accuracy in ${name} section.`);
    }
    if (sectionsList.length > 0) {
      return ['Demonstrated solid effort across submitted question types.'];
    }
    return ['Active study session started.'];
  }, [performanceData, sectionsList]);

  const improvements = useMemo(() => {
    if (performanceData?.improvements && performanceData.improvements.length > 0) {
      return performanceData.improvements;
    }
    const lowAcc = sectionsList.filter((s) => s.accuracy < 60).map((s) => s.name);
    const remaining = performanceData?.remaining_sections || [];

    const list = [];
    if (lowAcc.length > 0) {
      lowAcc.forEach((name) => list.push(`Review key terminology and core concepts in ${name}.`));
    }
    if (remaining.length > 0) {
      const formattedRem = remaining.map(normalizeTypeName).join(', ');
      list.push(`Complete remaining section(s): ${formattedRem} to finish the overall quiz attempt.`);
    }
    if (list.length === 0 && sectionsList.length > 0) {
      list.push('Keep practicing to maintain top accuracy across all topics.');
    }
    return list.length > 0 ? list : ['Complete all 4 question sections to unlock complete diagnostic insights.'];
  }, [performanceData, sectionsList]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-20 p-12 text-center text-gray-500 font-medium animate-pulse">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#98E8DE]/30 text-[#4E1F6E] mb-4">
          <Sparkles className="animate-spin" size={24} />
        </div>
        Evaluating performance metrics...
      </div>
    );
  }

  if (error && !performanceData && evaluations.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-center">
        <AlertCircle className="mx-auto mb-2 text-red-500" size={28} />
        <p className="font-semibold text-base">Failed to load evaluation</p>
        <p className="text-xs text-red-600 mt-1">{error}</p>
        <button
          type="button"
          onClick={handleGoDashboard}
          className="mt-4 px-5 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const completedSectionsCount = performanceData?.completed_sections?.length || sectionsList.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 transition-all duration-300">
      {/* 1. Header Banner */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#98E8DE] bg-[#98E8DE]/20 px-3.5 py-1 text-xs font-semibold text-[#136a6a]">
          <span className="flex h-2 w-2 rounded-full bg-[#45A9A9] animate-pulse" />
          <span>
            {isAttemptComplete
              ? 'Evaluation Completed • Final Assessment'
              : `Section Completed (${completedSectionsCount}/4 Sections Done)`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#98E8DE]/40 text-[#4E1F6E]">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#3E3E75]">
              {isAttemptComplete ? 'Overall Performance' : 'Section Evaluation Snapshot'}
            </h1>
            <p className="text-sm text-gray-500">
              {isAttemptComplete
                ? 'Detailed breakdown of questions answered right vs wrong across all completed sections.'
                : 'Performance snapshot for your recent section submission and cumulative quiz progress.'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Hero Overall Performance Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#4E1F6E] p-8 text-white shadow-sm">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#98E8DE]/20 px-3 py-1 text-xs font-semibold text-[#98E8DE]">
              <CheckCircle2 size={14} />
              {isAttemptComplete ? 'Attempt Completed' : `In-Progress Attempt (${completedSectionsCount}/4 Sections)`}
            </span>
            <h1 className="text-3xl font-bold mt-3">
              {isAttemptComplete ? 'Overall Performance' : 'Cumulative Performance'}
            </h1>
            <p className="text-purple-100 text-sm mt-1">
              {isAttemptComplete
                ? 'Combined score evaluated across all 4 mandatory sections in this study set.'
                : 'Cumulative score evaluated so far across completed question sections.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20">
            <div className="text-center px-3">
              <div className="text-3xl font-black text-[#98E8DE]">{percentage}%</div>
              <div className="text-xs text-purple-200 mt-0.5 font-medium">Accuracy</div>
            </div>

            <div className="h-8 w-px bg-white/20 hidden sm:block" />

            <div className="text-center px-3">
              <div className="text-3xl font-bold text-white">{totalCorrect}</div>
              <div className="text-xs text-[#98E8DE] mt-0.5 font-bold uppercase tracking-wider">Correct</div>
            </div>

            <div className="h-8 w-px bg-white/20 hidden sm:block" />

            <div className="text-center px-3">
              <div className="text-3xl font-bold text-rose-300">{totalWrong}</div>
              <div className="text-xs text-rose-200 mt-0.5 font-bold uppercase tracking-wider">Wrong</div>
            </div>

            {totalSkipped > 0 && (
              <>
                <div className="h-8 w-px bg-white/20 hidden sm:block" />

                <div className="text-center px-3">
                  <div className="text-3xl font-bold text-amber-300">{totalSkipped}</div>
                  <div className="text-xs text-amber-200 mt-0.5 font-bold uppercase tracking-wider">Skipped</div>
                </div>
              </>
            )}

            <div className="h-8 w-px bg-white/20 hidden sm:block" />

            <div className="text-center px-3">
              <div className="text-3xl font-bold">
                {totalScore} <span className="text-sm font-normal text-purple-200">/ {maxScore}</span>
              </div>
              <div className="text-xs text-purple-200 mt-0.5 font-medium">Total Marks</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section-Wise Breakdown */}
      {sectionsList.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#3E3E75]">Section-Wise Breakdown</h2>
            <span className="text-xs text-gray-400 font-medium">
              {activeSection ? 'Click section card again to collapse' : 'Click a section card below to view its question breakdown'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {sectionsList.map((sec, idx) => {
              const isSelected = activeSection === sec.name;

              return (
                <div
                  key={idx}
                  onClick={() => handleToggleSection(sec.name)}
                  className={`group rounded-2xl p-5 cursor-pointer transition-all duration-300 border ${
                    isSelected
                      ? 'border-[#45A9A9] bg-[#98E8DE]/10 shadow-md ring-2 ring-[#98E8DE]/50'
                      : 'border-[#98E8DE]/60 bg-[#F8FAFA] hover:-translate-y-1 hover:border-[#45A9A9] hover:bg-white hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4E1F6E]">
                      {sec.name}
                    </span>
                    <span className="rounded-full bg-[#98E8DE]/40 border border-[#98E8DE] px-2.5 py-0.5 text-[11px] font-bold text-[#136a6a]">
                      {sec.accuracy}%
                    </span>
                  </div>

                  <div className="text-2xl font-bold text-[#3E3E75] mt-3">
                    {sec.score} <span className="text-xs font-normal text-gray-500">/ {sec.maxMarks}</span>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                    <Clock size={12} className="text-[#45A9A9]" />
                    <span>Completed {formatTimeAgo(sec.timestamp)}</span>
                  </div>

                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-[#45A9A9] transition-all duration-500"
                        style={{ width: `${Math.min(sec.accuracy, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-[#136a6a]">
                    <span>{isSelected ? 'Viewing Questions' : 'Switch to this Section'}</span>
                    {isSelected ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4. Active Section Review Drawer */}
          {activeSection && activeQuestions.length > 0 && (
            <div className="mt-6 rounded-2xl bg-[#F8FAFA] border border-[#98E8DE]/60 p-6 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#45A9A9]">Section Review</span>
                  <h3 className="text-lg font-bold text-[#3E3E75]">
                    {activeSection} Questions
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#136a6a] bg-[#98E8DE]/40 px-2.5 py-1 rounded-lg">
                    {activeCorrect} Right
                  </span>
                  <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg">
                    {activeWrong} Wrong
                  </span>
                  {activeSkipped > 0 && (
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
                      {activeSkipped} Skipped
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSection(null)}
                    className="text-xs font-semibold text-gray-500 hover:text-[#4E1F6E] transition ml-2 cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {activeQuestions.map((q) => (
                  <div
                    key={q.id}
                    className={`rounded-xl border p-5 space-y-3 bg-white ${
                      q.isSkipped
                        ? 'border-amber-200 bg-amber-50/10'
                        : q.isPassed
                        ? 'border-gray-100'
                        : 'border-rose-200 bg-rose-50/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#4E1F6E]">
                        Question {q.id}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          q.isSkipped
                            ? 'bg-amber-100 text-amber-800'
                            : q.isPassed
                            ? 'bg-[#98E8DE]/50 text-[#136a6a]'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {q.isSkipped ? (
                          <AlertCircle size={13} />
                        ) : q.isPassed ? (
                          <CheckCircle2 size={13} />
                        ) : (
                          <XCircle size={13} />
                        )}
                        {q.isSkipped
                          ? `Skipped (0/${q.maxMarks} Marks)`
                          : q.isPassed
                          ? `Correct (+${q.awardedMarks} Marks)`
                          : `Incorrect (${q.awardedMarks}/${q.maxMarks} Marks)`}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-[#3E3E75]">
                      {q.prompt}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                      <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                        <span className="font-semibold text-gray-400 uppercase text-[10px] block mb-1">
                          Your Submitted Answer
                        </span>
                        <span
                          className={
                            q.isSkipped
                              ? 'text-amber-800 font-semibold italic'
                              : q.isPassed
                              ? 'text-[#3E3E75] font-medium'
                              : 'text-rose-600 font-semibold'
                          }
                        >
                          {q.userAnswer}
                        </span>
                      </div>

                      <div className="rounded-lg bg-[#98E8DE]/15 border border-[#98E8DE]/40 p-3">
                        <span className="font-semibold text-[#136a6a] uppercase text-[10px] block mb-1">
                          Correct / Expected Solution
                        </span>
                        <span className="text-[#3E3E75] font-medium">
                          {q.correctAnswer}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg border-l-4 border-[#4E1F6E] bg-[#98E8DE]/10 p-3 text-xs text-[#3E3E75]">
                      <span className="font-bold text-[#4E1F6E]">Explanation & Feedback: </span>
                      {q.feedback}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Key Strengths & Areas for Improvement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-center gap-2 text-[#136a6a]">
            <TrendingUp size={18} />
            <h3 className="font-bold text-sm text-[#3E3E75]">Key Strengths</h3>
          </div>
          <ul className="space-y-2">
            {strengths.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs text-[#3E3E75] font-medium leading-relaxed"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#98E8DE] text-[#136a6a] font-bold text-[9px]">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-center gap-2 text-[#4E1F6E]">
            <Target size={18} />
            <h3 className="font-bold text-sm text-[#3E3E75]">Areas for Improvement</h3>
          </div>
          <ul className="space-y-2">
            {improvements.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs text-[#3E3E75] font-medium leading-relaxed"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 font-bold text-[9px]">
                  !
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 6. Navigation Controls */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        {isAttemptComplete ? (
          <>
            <button
              type="button"
              onClick={handleRetakeQuiz}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-[#3E3E75] transition hover:bg-gray-50 cursor-pointer"
            >
              <RotateCcw size={16} /> Retake Quiz / Study Sets
            </button>

            <button
              type="button"
              onClick={handleGoDashboard}
              className="w-full sm:w-auto group inline-flex items-center justify-center gap-2 rounded-xl bg-[#4E1F6E] px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3E3E75] cursor-pointer"
            >
              Return to Dashboard
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleGoDashboard}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-[#3E3E75] transition hover:bg-gray-50 cursor-pointer"
            >
              Return to Dashboard
            </button>

            <button
              type="button"
              onClick={handleContinueQuiz}
              className="w-full sm:w-auto group inline-flex items-center justify-center gap-2 rounded-xl bg-[#4E1F6E] px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3E3E75] cursor-pointer"
            >
              Continue Quiz Session
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}