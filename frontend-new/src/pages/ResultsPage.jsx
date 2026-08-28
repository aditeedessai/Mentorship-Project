import { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
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
} from 'lucide-react';

const normalizeTypeName = (typeStr) => {
  const s = (typeStr || '').toUpperCase().trim();
  if (s.includes('MCQ') || s === 'MCQ') return 'MCQ';
  if (s.includes('LONG') || s === 'LONG') return 'LONG ANSWER';
  if (s.includes('APP') || s === 'APPLICATION') return 'APPLICATION';
  if (s.includes('SHORT') || s === 'SHORT-ANSWER' || s === 'SHORT') return 'SHORT ANSWER';
  return s || 'MCQ';
};

export default function ResultsPage({ onNavigate, studySetId: propStudySetId }) {
  const { isDarkMode } = useTheme();
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

        setEvaluations(rawList);

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

  const cumulativeData = useMemo(() => {
    const perf = performanceData || resultsData;
    return perf?.cumulative || null;
  }, [performanceData, resultsData]);

  const totalScore = useMemo(() => {
    if (cumulativeData?.total_marks_obtained !== undefined) {
      return Math.round(Number(cumulativeData.total_marks_obtained) * 100) / 100;
    }
    return 0;
  }, [cumulativeData]);

  const maxScore = useMemo(() => {
    if (cumulativeData?.total_maximum_marks !== undefined) {
      return Number(cumulativeData.total_maximum_marks);
    }
    return 0;
  }, [cumulativeData]);

  const overallPercentage = useMemo(() => {
    if (cumulativeData?.overall_percentage !== undefined) {
      return Math.round(Number(cumulativeData.overall_percentage));
    }
    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  }, [cumulativeData, totalScore, maxScore]);

  const overallRemark = useMemo(() => {
    return cumulativeData?.overall_remark || null;
  }, [cumulativeData]);

  const sectionsList = useMemo(() => {
    const perf = performanceData || resultsData;
    const rawSections = perf?.sections || [];

    if (rawSections.length > 0) {
      return rawSections.map((sp) => {
        const uiName = normalizeTypeName(sp.section_name);
        const marksObtained = Number(sp.marks_obtained ?? 0);
        const maximumMarks = Number(sp.maximum_marks ?? 0);
        const percentage = sp.percentage !== undefined
          ? Math.round(sp.percentage)
          : (maximumMarks > 0 ? Math.round((marksObtained / maximumMarks) * 100) : 0);

        return {
          name: uiName,
          rawName: sp.section_name,
          marksObtained: Math.round(marksObtained * 100) / 100,
          maximumMarks: Math.round(maximumMarks * 100) / 100,
          percentage,
          remark: sp.remark || null,
        };
      });
    }

    if (evaluations && evaluations.length > 0) {
      const grouped = {};
      evaluations.forEach((item) => {
        const typeKey = normalizeTypeName(item.question_type || item.type);
        if (!grouped[typeKey]) {
          grouped[typeKey] = { name: typeKey, marksObtained: 0, maximumMarks: 0 };
        }
        const rawAns = item.student_answer ?? item.user_answer ?? item.answer;
        const isSkipped = rawAns === null || rawAns === undefined || String(rawAns).trim() === '';
        const earned = isSkipped ? 0 : Number(item.marks_awarded ?? item.score ?? 0);
        const maxM = Number(item.max_marks ?? 0);
        grouped[typeKey].marksObtained += earned;
        grouped[typeKey].maximumMarks += maxM;
      });

      return Object.values(grouped).map((g) => ({
        name: g.name,
        rawName: g.name.toLowerCase(),
        marksObtained: Math.round(g.marksObtained * 100) / 100,
        maximumMarks: Math.round(g.maximumMarks * 100) / 100,
        percentage: g.maximumMarks > 0 ? Math.round((g.marksObtained / g.maximumMarks) * 100) : 0,
        remark: null,
      }));
    }

    return [];
  }, [performanceData, resultsData, evaluations]);

  const activeQuestions = useMemo(() => {
    if (!activeSection || !evaluations || evaluations.length === 0) return [];

    const filtered = evaluations.filter((item) => {
      const t = normalizeTypeName(item.question_type || item.type);
      return t === activeSection;
    });

    return filtered.map((item, idx) => {
      const rawAns = item.student_answer ?? item.user_answer ?? item.answer;
      const isSkipped = rawAns === null || rawAns === undefined || String(rawAns).trim() === '';
      const awardedMarks = Number(item.marks_awarded ?? item.score ?? 0);
      const maxMarks = Number(item.max_marks ?? 1);

      const isCorrect = typeof item.is_correct === 'boolean' ? item.is_correct : null;

      const feedbackText = item.feedback && String(item.feedback).trim() !== ''
        ? item.feedback
        : 'No feedback available.';

      return {
        id: idx + 1,
        question_id: item.question_id,
        prompt: item.question_text || item.question || item.prompt || `Question ${idx + 1}`,
        userAnswer: isSkipped ? 'Skipped' : rawAns,
        correctAnswer: item.correct_answer || item.model_answer || item.expected_answer || 'N/A',
        feedback: feedbackText,
        awardedMarks: Math.round(awardedMarks * 100) / 100,
        maxMarks: Math.round(maxMarks * 100) / 100,
        isCorrect,
        isSkipped,
      };
    });
  }, [activeSection, evaluations]);

  const activeCorrect = useMemo(() => {
    return activeQuestions.filter((q) => q.isCorrect === true).length;
  }, [activeQuestions]);

  const activeSkipped = useMemo(() => {
    return activeQuestions.filter((q) => q.isSkipped).length;
  }, [activeQuestions]);

  const activeWrong = useMemo(() => {
    return activeQuestions.filter((q) => q.isCorrect === false && !q.isSkipped).length;
  }, [activeQuestions]);

  const totalCorrect = useMemo(() => {
    if (!evaluations || evaluations.length === 0) return 0;
    return evaluations.filter((item) => item.is_correct === true).length;
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
      return !isSkipped && item.is_correct === false;
    }).length;
  }, [evaluations]);

  const strengths = useMemo(() => {
    const list = [];
    const perf = performanceData || resultsData;
    const strongestSecName = perf?.cumulative?.strongest_section;

    if (strongestSecName) {
      const formattedName = normalizeTypeName(strongestSecName);
      const match = sectionsList.find((s) => s.rawName === strongestSecName || s.name === formattedName);
      if (match && match.remark) {
        list.push(`Strongest Section: ${match.name} — ${match.marksObtained}/${match.maximumMarks} Marks (${match.percentage}%, Remark: ${match.remark})`);
      } else if (match) {
        list.push(`Strongest Section: ${match.name} — ${match.marksObtained}/${match.maximumMarks} Marks (${match.percentage}%)`);
      } else {
        list.push(`Strongest Section: ${formattedName}`);
      }
    }

    if (list.length === 0 && overallRemark) {
      list.push(`Overall Performance Remark: ${overallRemark}`);
    }

    if (list.length === 0) {
      list.push('No backend section strength details available.');
    }

    return list;
  }, [performanceData, resultsData, sectionsList, overallRemark]);

  const improvements = useMemo(() => {
    const list = [];
    const perf = performanceData || resultsData;
    const weakestSecName = perf?.cumulative?.weakest_section;
    const remaining = perf?.remaining_sections || [];

    if (weakestSecName) {
      const formattedName = normalizeTypeName(weakestSecName);
      const match = sectionsList.find((s) => s.rawName === weakestSecName || s.name === formattedName);
      if (match && match.remark) {
        list.push(`Weakest Section: ${match.name} — ${match.marksObtained}/${match.maximumMarks} Marks (${match.percentage}%, Remark: ${match.remark})`);
      } else if (match) {
        list.push(`Weakest Section: ${match.name} — ${match.marksObtained}/${match.maximumMarks} Marks (${match.percentage}%)`);
      } else {
        list.push(`Weakest Section: ${formattedName}`);
      }
    }

    if (remaining.length > 0) {
      const formattedRem = remaining.map(normalizeTypeName).join(', ');
      list.push(`Remaining section(s) to complete: ${formattedRem}`);
    }

    if (list.length === 0) {
      list.push('No backend improvement recommendations available.');
    }

    return list;
  }, [performanceData, resultsData, sectionsList]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-20 p-12 text-center text-gray-500 font-medium animate-pulse">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8064C7]/20 text-[#8064C7] mb-4">
          <Sparkles className="animate-spin" size={24} />
        </div>
        Evaluating performance metrics...
      </div>
    );
  }

  if (error && !performanceData && evaluations.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-red-500/10 text-red-400 rounded-3xl border border-red-500/30 text-center">
        <AlertCircle className="mx-auto mb-2 text-red-400" size={28} />
        <p className="font-black text-base">Failed to load evaluation</p>
        <p className="text-xs text-red-300 mt-1">{error}</p>
        <button
          type="button"
          onClick={handleGoDashboard}
          className="mt-4 px-5 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition shadow-md"
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
        <div className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-bold ${
          isDarkMode ? "border-[#8064C7]/30 bg-[#8064C7]/20 text-[#A78BFA]" : "border-[#8064C7]/20 bg-[#8064C7]/10 text-[#8064C7]"
        }`}>
          <span className="flex h-2 w-2 rounded-full bg-[#8064C7] animate-pulse" />
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
              {isAttemptComplete ? 'Overall Performance' : 'Section Evaluation Snapshot'}
            </h1>
            <p className={`text-sm ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>
              {isAttemptComplete
                ? 'Detailed breakdown of questions answered right vs wrong across all completed sections.'
                : 'Performance snapshot for your recent section submission and cumulative quiz progress.'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Hero Overall Performance Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#8064C7] p-8 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                <CheckCircle2 size={14} />
                {isAttemptComplete ? 'Attempt Completed' : `In-Progress Attempt (${completedSectionsCount}/4 Sections)`}
              </span>
              {overallRemark && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/30 px-3 py-1 text-xs font-bold text-white border border-white/40">
                  <Sparkles size={14} />
                  Overall Remark: {overallRemark}
                </span>
              )}
            </div>

            <h1 className="text-3xl font-black mt-3 tracking-tight">
              {isAttemptComplete ? 'Overall Performance' : 'Cumulative Performance'}
            </h1>
            <p className="text-purple-100 text-sm mt-1">
              {isAttemptComplete
                ? 'Combined score evaluated across all 4 mandatory sections in this study set.'
                : 'Cumulative score evaluated so far across completed question sections.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-white/10 p-5 rounded-2xl backdrop-blur-md border border-white/20">
            <div className="text-center px-3">
              <div className="text-3xl font-black text-white">{overallPercentage}%</div>
              <div className="text-xs text-purple-200 mt-0.5 font-bold">Overall Percentage</div>
            </div>

            <div className="h-8 w-px bg-white/20 hidden sm:block" />

            <div className="text-center px-3">
              <div className="text-3xl font-black text-emerald-300">{totalCorrect}</div>
              <div className="text-xs text-emerald-200 mt-0.5 font-bold uppercase tracking-wider">Correct</div>
            </div>

            <div className="h-8 w-px bg-white/20 hidden sm:block" />

            <div className="text-center px-3">
              <div className="text-3xl font-black text-rose-300">{totalWrong}</div>
              <div className="text-xs text-rose-200 mt-0.5 font-bold uppercase tracking-wider">Wrong</div>
            </div>

            {totalSkipped > 0 && (
              <>
                <div className="h-8 w-px bg-white/20 hidden sm:block" />

                <div className="text-center px-3">
                  <div className="text-3xl font-black text-amber-300">{totalSkipped}</div>
                  <div className="text-xs text-amber-200 mt-0.5 font-bold uppercase tracking-wider">Skipped</div>
                </div>
              </>
            )}

            <div className="h-8 w-px bg-white/20 hidden sm:block" />

            <div className="text-center px-3">
              <div className="text-3xl font-black">
                {totalScore} <span className="text-sm font-normal text-purple-200">/ {maxScore}</span>
              </div>
              <div className="text-xs text-purple-200 mt-0.5 font-bold">Total Marks</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section-Wise Breakdown */}
      {sectionsList.length > 0 && (
        <div className={`rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 space-y-4 ${
          isDarkMode
            ? "border-white/10 bg-[#17131F]/80 text-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            : "border-white/80 bg-white/60 text-[#292530] shadow-[0_18px_50px_rgba(70,55,110,0.1)]"
        }`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black tracking-tight">Section-Wise Breakdown</h2>
            <span className={`text-xs ${isDarkMode ? "text-white/50" : "text-gray-400"}`}>
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
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      isDarkMode ? "bg-[#8064C7]/30 text-[#A78BFA]" : "bg-[#8064C7]/10 text-[#8064C7]"
                    }`}>
                      {sec.percentage}%
                    </span>
                  </div>

                  <div className="text-2xl font-black mt-3 tracking-tight">
                    {sec.marksObtained} <span className={`text-xs font-semibold ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>/ {sec.maximumMarks} Marks</span>
                  </div>

                  {sec.remark && (
                    <div className="mt-1 text-xs font-bold text-[#8064C7] dark:text-[#A78BFA]">
                      Remark: <span>{sec.remark}</span>
                    </div>
                  )}

                  <div className="mt-3">
                    <div className={`h-1.5 w-full overflow-hidden rounded-full ${isDarkMode ? "bg-white/10" : "bg-black/10"}`}>
                      <div
                        className="h-full rounded-full bg-[#8064C7] transition-all duration-500"
                        style={{ width: `${Math.min(Math.max(sec.percentage, 0), 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-[#8064C7] dark:text-[#A78BFA]">
                    <span>{isSelected ? 'Viewing Questions' : 'Switch to this Section'}</span>
                    {isSelected ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4. Active Section Review Drawer */}
          {activeSection && activeQuestions.length > 0 && (
            <div className={`mt-6 rounded-2xl border p-6 space-y-4 backdrop-blur-xl animate-fade-in ${
              isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50/50"
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-inherit">
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#8064C7] dark:text-[#A78BFA]">Section Review</span>
                  <h3 className="text-lg font-black tracking-tight">
                    {activeSection} Questions
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    {activeCorrect} Right
                  </span>
                  <span className="text-xs font-bold text-rose-400 bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/30">
                    {activeWrong} Wrong
                  </span>
                  {activeSkipped > 0 && (
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30">
                      {activeSkipped} Skipped
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSection(null)}
                    className="text-xs font-bold opacity-60 hover:opacity-100 transition ml-2 cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {activeQuestions.map((q) => (
                  <div
                    key={q.id}
                    className={`rounded-2xl border p-5 space-y-3 backdrop-blur-xl ${
                      q.isSkipped
                        ? 'border-amber-500/30 bg-amber-500/10'
                        : q.isCorrect === true
                        ? isDarkMode ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-white'
                        : q.isCorrect === false
                        ? 'border-rose-500/30 bg-rose-500/10'
                        : isDarkMode ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#8064C7] dark:text-[#A78BFA]">
                        Question {q.id}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          q.isSkipped
                            ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                            : q.isCorrect === true
                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                            : q.isCorrect === false
                            ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                            : 'bg-white/10 border-white/20 text-white/70'
                        }`}
                      >
                        {q.isSkipped ? (
                          <AlertCircle size={13} />
                        ) : q.isCorrect === true ? (
                          <CheckCircle2 size={13} />
                        ) : q.isCorrect === false ? (
                          <XCircle size={13} />
                        ) : null}
                        {q.isSkipped
                          ? `Skipped (0/${q.maxMarks} Marks)`
                          : q.isCorrect === true
                          ? `Correct (+${q.awardedMarks}/${q.maxMarks} Marks)`
                          : q.isCorrect === false
                          ? `Incorrect (${q.awardedMarks}/${q.maxMarks} Marks)`
                          : `${q.awardedMarks}/${q.maxMarks} Marks`}
                      </span>
                    </div>

                    <p className="text-sm font-bold tracking-tight">
                      {q.prompt}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs font-medium">
                      <div className={`rounded-xl border p-3 ${isDarkMode ? "border-white/5 bg-white/5" : "border-gray-100 bg-gray-50"}`}>
                        <span className="font-bold opacity-40 uppercase text-[10px] block mb-1">
                          Your Submitted Answer
                        </span>
                        <span
                          className={
                            q.isSkipped
                              ? 'text-amber-400 font-bold italic'
                              : q.isCorrect === true
                              ? 'font-bold'
                              : q.isCorrect === false
                              ? 'text-rose-400 font-bold'
                              : 'font-bold'
                          }
                        >
                          {q.userAnswer}
                        </span>
                      </div>

                      <div className={`rounded-xl border p-3 ${isDarkMode ? "border-[#8064C7]/30 bg-[#8064C7]/15" : "border-[#8064C7]/20 bg-purple-50"}`}>
                        <span className="font-bold text-[#8064C7] dark:text-[#A78BFA] uppercase text-[10px] block mb-1">
                          Correct / Expected Solution
                        </span>
                        <span className="font-bold">
                          {q.correctAnswer}
                        </span>
                      </div>
                    </div>

                    <div className={`rounded-xl border-l-4 border-l-[#8064C7] p-3 text-xs ${
                      isDarkMode ? "bg-white/5" : "bg-purple-50/50"
                    }`}>
                      <span className="font-bold text-[#8064C7] dark:text-[#A78BFA]">Explanation & Feedback: </span>
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
        <div className={`rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 space-y-3 ${
          isDarkMode ? "border-white/10 bg-[#17131F]/80 text-white" : "border-white/80 bg-white/60 text-[#292530]"
        }`}>
          <div className="flex items-center gap-2 text-emerald-400">
            <TrendingUp size={18} />
            <h3 className="font-black text-sm tracking-tight">Key Strengths</h3>
          </div>
          <ul className="space-y-2">
            {strengths.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs font-semibold leading-relaxed"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[9px]">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 space-y-3 ${
          isDarkMode ? "border-white/10 bg-[#17131F]/80 text-white" : "border-white/80 bg-white/60 text-[#292530]"
        }`}>
          <div className="flex items-center gap-2 text-[#8064C7] dark:text-[#A78BFA]">
            <Target size={18} />
            <h3 className="font-black text-sm tracking-tight">Areas for Improvement</h3>
          </div>
          <ul className="space-y-2">
            {improvements.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs font-semibold leading-relaxed"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 font-bold text-[9px]">
                  !
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 6. Navigation Controls */}
      <div className={`rounded-3xl border p-5 backdrop-blur-2xl transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-4 ${
        isDarkMode ? "border-white/10 bg-[#17131F]/80 text-white" : "border-white/80 bg-white/60 text-[#292530]"
      }`}>
        {isAttemptComplete ? (
          <>
            <button
              type="button"
              onClick={handleRetakeQuiz}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3 text-xs font-bold transition cursor-pointer ${
                isDarkMode ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <RotateCcw size={16} /> Retake Quiz / Study Sets
            </button>

            <button
              type="button"
              onClick={handleGoDashboard}
              className="w-full sm:w-auto group inline-flex items-center justify-center gap-2 rounded-xl bg-[#8064C7] hover:bg-[#8B6DD4] px-8 py-3 text-xs font-bold text-white shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition cursor-pointer"
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
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3 text-xs font-bold transition cursor-pointer ${
                isDarkMode ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              Return to Dashboard
            </button>

            <button
              type="button"
              onClick={handleContinueQuiz}
              className="w-full sm:w-auto group inline-flex items-center justify-center gap-2 rounded-xl bg-[#8064C7] hover:bg-[#8B6DD4] px-8 py-3 text-xs font-bold text-white shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition cursor-pointer"
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