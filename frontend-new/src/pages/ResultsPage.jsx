import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  fetchResults,
  fetchPerformance,
  fetchEvaluations,
  fetchRevisionStatus,
  finishAttempt,
} from '../services/api';
import {
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Target,
  XCircle,
  Clock,
  History,
  Calendar,
} from 'lucide-react';

import jojoEvaluating from '../assets/jojo-evaluating.png';

const normalizeTypeName = (typeStr) => {
  const s = (typeStr || '').toLowerCase().trim();
  if (s === 'mcq') return 'MCQ';
  if (s === 'short' || s === 'short-answer') return 'Short Answer';
  if (s === 'long' || s === 'long-answer') return 'Long Answer';
  if (s === 'application' || s === 'applicative') return 'Application';
  return 'Quiz';
};

const toBackendType = (typeStr) => {
  const s = (typeStr || '').toLowerCase().trim();
  if (s.includes('short')) return 'short';
  if (s.includes('long')) return 'long';
  if (s.includes('app')) return 'application';
  return 'mcq';
};

const formatTopicName = (topic) => {
  if (!topic || typeof topic !== 'string') return 'General';
  const trimmed = topic.trim();
  if (!trimmed) return 'General';

  // Format snake_case topics (e.g. static_methods -> Static Methods)
  if (trimmed.includes('_') && !trimmed.includes(' ')) {
    return trimmed
      .split('_')
      .map((w) => {
        const u = w.toUpperCase();
        if (['OCP', 'SOLID', 'API', 'SQL', 'JVM', 'OOP', 'CPU', 'RAM', 'DB', 'HTTP', 'URL', 'REST', 'LLM', 'AI', 'MCQ'].includes(u)) {
          return u;
        }
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(' ');
  }
  return trimmed;
};

export default function ResultsPage({ onNavigate, studySetId: propStudySetId, attemptId: propAttemptId }) {
  const { isDarkMode } = useTheme();
  const { attemptId: paramAttemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const passedAttemptId = paramAttemptId || location.state?.attemptId || propAttemptId;
  const passedQuestions = useMemo(
    () => location.state?.questions || [],
    [location.state?.questions]
  );
  const studySetId = location.state?.studySetId || propStudySetId;

  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [revisionStatuses, setRevisionStatuses] = useState([]);
  const [error, setError] = useState(null);

  const isPracticeRetake = location.state?.isPracticeRetake || false;
  const temporaryResults = location.state?.temporaryResults;

  useEffect(() => {
    if (!passedAttemptId && !isPracticeRetake) {
      if (studySetId) {
        if (typeof onNavigate === 'function') {
          onNavigate('study-set-attempts', { studySetId });
        } else {
          navigate('/study-sets');
        }
      } else {
        if (typeof onNavigate === 'function') {
          onNavigate('study-sets');
        } else {
          navigate('/study-sets');
        }
      }
    }
  }, [passedAttemptId, isPracticeRetake, studySetId, onNavigate, navigate]);

  useEffect(() => {
    let isMounted = true;

    async function loadAttemptData() {
      if (isPracticeRetake && temporaryResults) {
        setPerformanceData({
          earned_marks: temporaryResults.earned_marks,
          total_marks: temporaryResults.total_marks,
          overall_percentage: temporaryResults.percentage,
          question_type: location.state?.questionType || 'mcq',
        });
        setEvaluations(temporaryResults.results || []);
        if (studySetId) {
          fetchRevisionStatus(studySetId).then((revStatus) => {
            if (isMounted && revStatus?.statuses) {
              setRevisionStatuses(revStatus.statuses);
            }
          }).catch(() => {});
        }
        setLoading(false);
        return;
      }

      if (!passedAttemptId) return;

      try {
        setLoading(true);
        setError(null);

        const [resData, perfData, evalsData, revStatus] = await Promise.all([
          fetchResults(passedAttemptId).catch(() => null),
          fetchPerformance(passedAttemptId).catch(() => null),
          fetchEvaluations(passedAttemptId).catch(() => []),
          studySetId ? fetchRevisionStatus(studySetId).catch(() => null) : Promise.resolve(null),
        ]);

        if (!isMounted) return;

        setPerformanceData(perfData || resData);

        let rawList = [];
        if (Array.isArray(evalsData)) {
          rawList = evalsData;
        } else if (Array.isArray(evalsData?.results)) {
          rawList = evalsData.results;
        } else if (Array.isArray(evalsData?.evaluations)) {
          rawList = evalsData.evaluations;
        } else if (Array.isArray(resData?.evaluations)) {
          rawList = resData.evaluations;
        } else if (Array.isArray(resData?.results)) {
          rawList = resData.results;
        }
        setEvaluations(rawList);

        if (revStatus?.statuses) {
          setRevisionStatuses(revStatus.statuses);
        }

        finishAttempt(passedAttemptId).catch(() => {});
      } catch (err) {
        console.error('Error loading attempt results:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load attempt evaluation');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadAttemptData();

    return () => {
      isMounted = false;
    };
  }, [passedAttemptId, isPracticeRetake, temporaryResults, studySetId]);

  const rawQuestionType = useMemo(() => {
    if (performanceData?.question_type) return performanceData.question_type;
    if (evaluations.length > 0 && (evaluations[0].question_type || evaluations[0].type)) {
      return evaluations[0].question_type || evaluations[0].type;
    }
    if (location.state?.questionType) return location.state.questionType;
    return 'mcq';
  }, [performanceData, evaluations, location.state?.questionType]);

  const questionTypeName = useMemo(() => normalizeTypeName(rawQuestionType), [rawQuestionType]);
  const backendType = useMemo(() => toBackendType(rawQuestionType), [rawQuestionType]);

  const totalScore = useMemo(() => {
    if (performanceData?.earned_marks !== undefined) {
      return Math.round(Number(performanceData.earned_marks) * 100) / 100;
    }
    if (performanceData?.cumulative?.total_marks_obtained !== undefined) {
      return Math.round(Number(performanceData.cumulative.total_marks_obtained) * 100) / 100;
    }
    return evaluations.reduce((sum, item) => sum + Number(item.marks_awarded ?? item.score ?? 0), 0);
  }, [performanceData, evaluations]);

  const maxScore = useMemo(() => {
    if (performanceData?.total_marks !== undefined) {
      return Math.round(Number(performanceData.total_marks) * 100) / 100;
    }
    if (performanceData?.cumulative?.total_maximum_marks !== undefined) {
      return Math.round(Number(performanceData.cumulative.total_maximum_marks) * 100) / 100;
    }
    return evaluations.reduce((sum, item) => sum + Number(item.max_marks ?? (rawQuestionType === 'mcq' ? 2 : 10)), 0);
  }, [performanceData, evaluations, rawQuestionType]);

  const percentage = useMemo(() => {
    if (performanceData?.overall_percentage !== undefined) {
      return Math.round(Number(performanceData.overall_percentage));
    }
    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  }, [performanceData, totalScore, maxScore]);

  const overallRemark = useMemo(() => {
    return performanceData?.overall_remark || performanceData?.cumulative?.overall_remark || null;
  }, [performanceData]);

  const questionHintMap = useMemo(() => {
    const map = new Map();
    passedQuestions.forEach((q, idx) => {
      const cleaned =
        q.topic ||
        q.subtopic ||
        q.concept ||
        q.hint;
      if (cleaned) {
        if (q.question_id) map.set(String(q.question_id), cleaned);
        if (q.id) map.set(String(q.id), cleaned);
        map.set(`index_${idx}`, cleaned);
      }
    });
    return map;
  }, [passedQuestions]);

  const processedQuestions = useMemo(() => {
    return evaluations.map((item, idx) => {
      const rawAns = item.student_answer ?? item.user_answer ?? item.answer;
      const isSkipped = rawAns === null || rawAns === undefined || String(rawAns).trim() === '';
      const awardedMarks = Number(item.marks_awarded ?? item.score ?? 0);
      const maxMarks = Number(item.max_marks ?? (rawQuestionType === 'mcq' ? 2 : 10));

      const isCorrect =
        typeof item.is_correct === 'boolean'
          ? item.is_correct
          : maxMarks > 0
          ? awardedMarks >= maxMarks * 0.55
          : false;

      const questionId = item.question_id || item.id;
      const promptText = item.question_text || item.question || item.prompt || `Question ${idx + 1}`;

      const rawTopic =
        item.topic ||
        item.subtopic ||
        item.concept ||
        item.concept_tested ||
        item.topic_name ||
        questionHintMap.get(String(questionId)) ||
        questionHintMap.get(`index_${idx}`) ||
        null;

      const associatedTopic = formatTopicName(rawTopic);

      return {
        id: idx + 1,
        question_id: questionId,
        prompt: promptText,
        userAnswer: isSkipped ? 'Skipped' : rawAns,
        correctAnswer: item.correct_answer || item.model_answer || item.expected_answer || 'N/A',
        feedback: item.feedback && String(item.feedback).trim() !== '' ? item.feedback : 'No feedback available.',
        awardedMarks: Math.round(awardedMarks * 100) / 100,
        maxMarks: Math.round(maxMarks * 100) / 100,
        isCorrect,
        isSkipped,
        topic: associatedTopic,
        rawTopic: rawTopic || associatedTopic,
      };
    });
  }, [evaluations, questionHintMap, rawQuestionType]);

  const correctCount = useMemo(() => processedQuestions.filter((q) => q.isCorrect === true).length, [processedQuestions]);
  const skippedCount = useMemo(() => processedQuestions.filter((q) => q.isSkipped).length, [processedQuestions]);
  const wrongCount = useMemo(() => processedQuestions.filter((q) => q.isCorrect === false && !q.isSkipped).length, [processedQuestions]);

  const weakTopics = useMemo(() => {
    const perfTopics = performanceData?.topics || [];
    const weakPerfTopicsSet = new Set();
    perfTopics.forEach((t) => {
      if (t.topic_name && typeof t.percentage === 'number' && t.percentage < 51) {
        weakPerfTopicsSet.add(t.topic_name.toLowerCase().trim());
      }
    });

    const topicMap = new Map();

    processedQuestions.forEach((q) => {
      const rawT = q.rawTopic || q.topic;
      const formattedT = formatTopicName(rawT);
      const key = (rawT || formattedT || 'General').toLowerCase().trim();

      const isWeakByQuestion = q.isCorrect === false || q.isSkipped;
      let isWeak = false;

      if (perfTopics.length > 0) {
        isWeak = weakPerfTopicsSet.has(key) || weakPerfTopicsSet.has(formattedT.toLowerCase().trim());
      } else {
        isWeak = isWeakByQuestion;
      }

      if (isWeak && isWeakByQuestion) {
        if (!topicMap.has(key)) {
          topicMap.set(key, {
            title: formattedT,
            questionNums: [],
          });
        }
        const entry = topicMap.get(key);
        if (!entry.questionNums.includes(q.id)) {
          entry.questionNums.push(q.id);
        }
      }
    });

    // Fallback: If backend reported weak topics via performanceData.topics that weren't mapped above
    if (perfTopics.length > 0) {
      perfTopics.forEach((t) => {
        if (t.topic_name && typeof t.percentage === 'number' && t.percentage < 51) {
          const key = t.topic_name.toLowerCase().trim();
          if (!topicMap.has(key)) {
            const formattedT = formatTopicName(t.topic_name);
            const qNums = processedQuestions
              .filter((q) => {
                const rawT = q.rawTopic || q.topic;
                return (
                  (rawT && rawT.toLowerCase().trim() === key) ||
                  q.topic.toLowerCase().trim() === formattedT.toLowerCase().trim()
                ) && (q.isCorrect === false || q.isSkipped);
              })
              .map((q) => q.id);

            topicMap.set(key, {
              title: formattedT,
              questionNums: qNums,
            });
          }
        }
      });
    }

    return Array.from(topicMap.values()).map((item) => {
      const qStr = item.questionNums.length > 0
        ? item.questionNums.map((n) => `Q${n}`).join(', ')
        : 'Q1';
      return {
        title: item.title,
        questionDisplay: qStr,
        questionNum: item.questionNums[0] || 1,
      };
    });
  }, [performanceData, processedQuestions]);

  const currentRevisionStatus = useMemo(() => {
    return revisionStatuses.find((s) => s.question_type === backendType) || null;
  }, [revisionStatuses, backendType]);

  const handleGoDashboard = () => {
    if (typeof onNavigate === 'function') onNavigate('dashboard');
    else navigate('/');
  };

  const handleBackToStudySet = () => {
    if (studySetId && typeof onNavigate === 'function') {
      onNavigate('study-set', { studySetId });
    } else if (typeof onNavigate === 'function') {
      onNavigate('study-sets');
    } else {
      navigate('/study-sets');
    }
  };

  const handleViewAttempts = () => {
    if (studySetId && typeof onNavigate === 'function') {
      onNavigate('study-set-attempts', { studySetId });
    } else {
      handleBackToStudySet();
    }
  };

  const handleRetakeQuiz = () => {
    if (studySetId && typeof onNavigate === 'function') {
      onNavigate('quiz', { studySetId, preselectType: rawQuestionType });
    } else {
      navigate('/quiz', { state: { studySetId, preselectType: rawQuestionType } });
    }
  };

  if (loading) {
    return (
      <div
        className={`relative flex min-h-[70vh] items-center justify-center overflow-hidden rounded-3xl transition-all duration-500 ${
          isDarkMode ? 'bg-[#0E0B15] text-white' : 'bg-[#F6F3FC] text-[#292530]'
        }`}
      >
        <div
          className={`absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[110px] ${
            isDarkMode ? 'bg-[#8064C7]/20' : 'bg-[#8064C7]/15'
          }`}
        />

        <div className="relative z-10 flex w-full max-w-xl flex-col items-center px-6 py-12 text-center">
          <div className="relative mb-8 flex h-56 w-56 items-center justify-center">
            <div
              className={`absolute inset-0 rounded-full blur-3xl ${
                isDarkMode ? 'bg-[#8064C7]/20' : 'bg-[#8064C7]/15'
              }`}
            />
            <img
              src={jojoEvaluating}
              alt="Jojo is evaluating your performance"
              className="relative z-10 h-52 w-52 object-contain animate-[jojoFloat_3s_ease-in-out_infinite]"
            />
          </div>

          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            Jojo is evaluating your {questionTypeName} Quiz...
          </h2>

          <p
            className={`mt-3 max-w-md text-sm leading-relaxed ${
              isDarkMode ? 'text-white/55' : 'text-gray-500'
            }`}
          >
            Reviewing your answers and retrieving evaluation feedback for this attempt.
          </p>

          <div className="mt-7 flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#8064C7]" style={{ animationDelay: '0ms' }} />
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#8064C7]" style={{ animationDelay: '150ms' }} />
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#8064C7]" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error && evaluations.length === 0) {
    return (
      <div
        className={`mx-auto mt-20 max-w-md rounded-3xl border p-6 text-center ${
          isDarkMode
            ? "border-red-500/30 bg-red-500/10 text-red-400"
            : "border-red-200/80 bg-red-50/70 text-red-600 shadow-sm"
        }`}
      >
        <AlertCircle className={`mx-auto mb-2 ${isDarkMode ? "text-red-400" : "text-red-500"}`} size={28} />
        <p className="text-base font-black">Failed to load attempt evaluation</p>
        <p className={`mt-1 text-xs ${isDarkMode ? "text-red-300" : "text-red-600/80"}`}>{error}</p>
        <button
          type="button"
          onClick={handleGoDashboard}
          className="mt-4 rounded-xl bg-red-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-red-600 cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12 transition-all duration-300">
      {/* 1. Top Header Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleBackToStudySet}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition ${
            isDarkMode
              ? 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
              : 'border-gray-200 bg-white/80 text-[#292530] hover:bg-white'
          }`}
        >
          <ArrowLeft size={16} />
          <span>Back to Study Set</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleViewAttempts}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition ${
              isDarkMode
                ? 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                : 'border-gray-200 bg-white/80 text-[#292530] hover:bg-white'
            }`}
          >
            <History size={16} />
            <span>Attempt History</span>
          </button>
        </div>
      </div>

      {/* 2. Hero Performance Summary Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#8064C7] p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 font-mono text-xs font-black uppercase tracking-wider text-white">
                <Sparkles size={14} />
                {questionTypeName} RESULTS
              </span>

              {isPracticeRetake && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/30 px-3.5 py-1 font-mono text-xs font-black uppercase tracking-wider text-amber-100 shadow-xs">
                  <RotateCcw size={13} />
                  Practice Retake
                </span>
              )}

              {overallRemark && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/30 px-3.5 py-1 text-xs font-bold text-white">
                  Remark: {overallRemark}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
              {questionTypeName} Quiz Evaluation
            </h1>

            <p className="mt-1 text-xs text-purple-100 sm:text-sm">
              Performance breakdown and question evaluation for this attempt.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center justify-around gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md sm:justify-center sm:gap-5 sm:p-5 lg:w-auto">
            <div className="px-2 text-center sm:px-3">
              <div className="text-2xl font-black text-white sm:text-3xl">
                {percentage}%
              </div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-200 sm:text-xs">
                Accuracy
              </div>
            </div>

            <div className="hidden h-8 w-px bg-white/20 sm:block" />

            <div className="px-2 text-center sm:px-3">
              <div className="text-2xl font-black text-emerald-300 sm:text-3xl">
                {correctCount}
              </div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200 sm:text-xs">
                Correct
              </div>
            </div>

            <div className="hidden h-8 w-px bg-white/20 sm:block" />

            <div className="px-2 text-center sm:px-3">
              <div className="text-2xl font-black text-rose-300 sm:text-3xl">
                {wrongCount}
              </div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-200 sm:text-xs">
                Incorrect
              </div>
            </div>

            {skippedCount > 0 && (
              <>
                <div className="hidden h-8 w-px bg-white/20 sm:block" />

                <div className="px-2 text-center sm:px-3">
                  <div className="text-2xl font-black text-amber-300 sm:text-3xl">
                    {skippedCount}
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
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-200 sm:text-xs">
                Total Marks
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Question Review List */}
      <div
        className={`space-y-4 rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
          isDarkMode
            ? 'border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]'
            : 'border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]'
        }`}
      >
        <div className="flex items-center justify-between border-b border-inherit pb-4">
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#8064C7] dark:text-[#A78BFA]">
              Question Review
            </span>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">
              {questionTypeName} Questions ({correctCount} / {processedQuestions.length} Correct)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400">
              {correctCount} Right
            </span>
            <span
              className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                isDarkMode
                  ? "border-rose-500/30 bg-rose-500/20 text-rose-400"
                  : "border-red-200 bg-red-50 text-red-600"
              }`}
            >
              {wrongCount} Wrong
            </span>
            {skippedCount > 0 && (
              <span className="rounded-lg border border-amber-500/30 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-400">
                {skippedCount} Skipped
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {processedQuestions.map((q) => (
            <div
              key={q.id}
              className={`space-y-3 rounded-2xl border p-5 backdrop-blur-xl transition-all ${
                q.isSkipped
                  ? 'border-amber-500/30 bg-amber-500/10'
                  : q.isCorrect === true
                  ? isDarkMode
                    ? 'border-white/5 bg-white/5'
                    : 'border-gray-100 bg-white'
                  : isDarkMode
                  ? 'border-rose-500/30 bg-rose-500/10'
                  : 'border-red-200/80 bg-red-50/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#8064C7] dark:text-[#A78BFA]">
                  Question {q.id}
                </span>

                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${
                    q.isSkipped
                      ? 'border-amber-500/30 bg-amber-500/20 text-amber-400'
                      : q.isCorrect === true
                      ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                      : isDarkMode
                      ? 'border-rose-500/30 bg-rose-500/20 text-rose-400'
                      : 'border-red-200 bg-red-50 text-red-600 font-semibold'
                  }`}
                >
                  {q.isSkipped ? (
                    <AlertCircle size={13} />
                  ) : q.isCorrect === true ? (
                    <CheckCircle2 size={13} />
                  ) : (
                    <XCircle size={13} />
                  )}

                  {q.isSkipped
                    ? `Skipped (0/${q.maxMarks} Marks)`
                    : q.isCorrect === true
                    ? `Correct (+${q.awardedMarks}/${q.maxMarks} Marks)`
                    : `Incorrect (${q.awardedMarks}/${q.maxMarks} Marks)`}
                </span>
              </div>

              <p className="text-sm font-bold tracking-tight">{q.prompt}</p>

              <div className="grid grid-cols-1 gap-3 pt-1 text-xs font-medium sm:grid-cols-2">
                <div
                  className={`rounded-xl border p-3 ${
                    isDarkMode ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <span className="mb-1 block text-[10px] font-bold uppercase opacity-40">
                    Your Submitted Answer
                  </span>
                  <span
                    className={
                      q.isSkipped
                        ? 'font-bold italic text-amber-400'
                        : q.isCorrect === true
                        ? 'font-bold'
                        : isDarkMode
                        ? 'font-bold text-rose-400'
                        : 'font-bold text-red-600'
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
                    Correct / Expected Solution
                  </span>
                  <span className="font-bold">{q.correctAnswer}</span>
                </div>
              </div>

              <div
                className={`rounded-xl border-l-4 border-l-[#8064C7] p-3 text-xs ${
                  isDarkMode ? 'bg-white/5' : 'bg-purple-50/50'
                }`}
              >
                <span className="font-bold text-[#8064C7] dark:text-[#A78BFA]">
                  Explanation & Feedback:{' '}
                </span>
                {q.feedback}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Weak Topics & Revision Status Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Card 1: Weak Topics Identified (Only place weak topics are displayed) */}
        <div
          className={`space-y-4 rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
            isDarkMode
              ? 'border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]'
              : 'border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]'
          }`}
        >
          <div className={`flex items-center gap-2 ${isDarkMode ? 'text-rose-400' : 'text-red-600'}`}>
            <Target size={18} />
            <h3 className="text-sm font-black tracking-tight">
              Weak Topics Identified ({weakTopics.length})
            </h3>
          </div>

          {weakTopics.length > 0 ? (
            <div className="space-y-2 pt-1">
              {weakTopics.map((topicItem, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all ${
                    isDarkMode
                      ? 'border-rose-500/25 bg-rose-500/10'
                      : 'border-red-200/80 bg-red-50/60 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${isDarkMode ? 'bg-rose-400' : 'bg-red-500'}`} />
                    <h4 className={`text-xs font-black truncate ${isDarkMode ? 'text-rose-200' : 'text-red-700'}`}>
                      {topicItem.title}
                    </h4>
                  </div>

                  <span
                    className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      isDarkMode
                        ? 'border-rose-500/30 bg-rose-500/20 text-rose-300'
                        : 'border-red-200 bg-white/80 text-red-600'
                    }`}
                  >
                    {topicItem.questionDisplay || `Q${topicItem.questionNum}`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-xs font-semibold text-emerald-400 pt-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                ✓
              </span>
              <span>Excellent work! No weak topics detected in this quiz attempt.</span>
            </div>
          )}
        </div>

        {/* Card 2: Revision & Retest Status */}
        <div
          className={`space-y-4 rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
            isDarkMode
              ? 'border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]'
              : 'border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]'
          }`}
        >
          <div className="flex items-center gap-2 text-[#8064C7] dark:text-[#A78BFA]">
            <TrendingUp size={18} />
            <h3 className="text-sm font-black tracking-tight">
              Spaced Revision Status
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-semibold ${
                  isDarkMode ? 'text-white/60' : 'text-gray-500'
                }`}
              >
                Section Type:
              </span>
              <span className="font-bold text-xs uppercase tracking-wider text-[#8064C7] dark:text-[#A78BFA]">
                {questionTypeName}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-semibold ${
                  isDarkMode ? 'text-white/60' : 'text-gray-500'
                }`}
              >
                Attempts Taken:
              </span>
              <span className="font-bold text-xs">
                {currentRevisionStatus?.attempts_taken ?? 1} / 4 Slots
              </span>
            </div>

            <div className="pt-2">
              {currentRevisionStatus?.needs_attention ? (
                <div
                  className={`rounded-xl border p-3 text-xs font-bold flex items-center gap-2 ${
                    isDarkMode
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                      : 'border-red-200 bg-red-50 text-red-600'
                  }`}
                >
                  <AlertCircle size={16} className={`shrink-0 ${isDarkMode ? 'text-rose-400' : 'text-red-500'}`} />
                  <span>Needs Attention: Your score was below 50% after 4 attempts. Review your materials carefully.</span>
                </div>
              ) : currentRevisionStatus?.reason === 'attempts_exhausted' || (currentRevisionStatus?.attempts_taken || 0) >= 4 ? (
                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs font-bold text-purple-300 flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-purple-400" />
                  <span>Section Mastered: All 4 revision slots have been completed for {questionTypeName}.</span>
                </div>
              ) : currentRevisionStatus?.available ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <Clock size={16} className="shrink-0" />
                  <span>Revision Due Now! Practice to reinforce your active recall.</span>
                </div>
              ) : currentRevisionStatus?.next_due_date ? (
                <div className="rounded-xl border border-[#8064C7]/30 bg-[#8064C7]/15 p-3 text-xs font-bold text-[#A78BFA] flex items-center gap-2">
                  <Calendar size={16} className="shrink-0 text-[#8064C7]" />
                  <span>
                    Next Revision Due:{' '}
                    {new Date(`${currentRevisionStatus.next_due_date}T00:00:00`).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-semibold opacity-70">
                  Revision schedule will update automatically.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Navigation Actions */}
      <div
        className={`flex flex-col items-center justify-between gap-4 rounded-3xl border p-5 backdrop-blur-2xl transition-all duration-300 sm:flex-row ${
          isDarkMode
            ? 'border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]'
            : 'border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]'
        }`}
      >
        <button
          type="button"
          onClick={handleRetakeQuiz}
          disabled={currentRevisionStatus?.needs_attention || currentRevisionStatus?.reason === 'attempts_exhausted'}
          className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-6 py-3 text-xs font-bold transition sm:w-auto ${
            currentRevisionStatus?.needs_attention || currentRevisionStatus?.reason === 'attempts_exhausted'
              ? 'opacity-50 cursor-not-allowed border-gray-500/20 bg-gray-500/10'
              : isDarkMode
              ? 'border-white/10 bg-white/5 hover:bg-white/10'
              : 'border-gray-200 bg-white hover:bg-gray-50'
          }`}
        >
          <RotateCcw size={16} />
          <span>Retake {questionTypeName} Quiz</span>
        </button>

        <div className="flex w-full flex-col sm:flex-row items-center gap-3 sm:w-auto">
          <button
            type="button"
            onClick={handleViewAttempts}
            className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-6 py-3 text-xs font-bold transition sm:w-auto ${
              isDarkMode
                ? 'border-white/10 bg-white/5 hover:bg-white/10'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <History size={16} />
            <span>Attempt History</span>
          </button>

          <button
            type="button"
            onClick={handleGoDashboard}
            className="group inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#8064C7] px-8 py-3 text-xs font-bold text-white shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition hover:bg-[#8B6DD4] sm:w-auto"
          >
            <span>Return to Dashboard</span>
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}