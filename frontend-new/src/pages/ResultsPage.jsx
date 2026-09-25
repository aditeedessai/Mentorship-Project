import { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams, matchPath } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  fetchResults,
  fetchPerformance,
  fetchEvaluations,
  fetchRevisionStatus,
  fetchQuestions,
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
import { formatScore } from '../utils/scoreFormat';

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

  const match = matchPath("/results/:attemptId", location.pathname);
  const urlAttemptId = match?.params?.attemptId || paramAttemptId || null;

  const passedAttemptId =
    urlAttemptId ||
    location.state?.attemptId ||
    propAttemptId;
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
  const [reviewFilter, setReviewFilter] = useState('all');
  const [fallbackOptionQuestions, setFallbackOptionQuestions] = useState([]);

  const isPracticeRetake = location.state?.isPracticeRetake || false;
  const temporaryResults = location.state?.temporaryResults;
  const finishedAttemptIdsRef = useRef(new Set());

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
          fetchRevisionStatus(studySetId, true).then((revStatus) => {
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

        let resError = null;
        let perfError = null;

        const [resData, perfData, evalsData] = await Promise.all([
          fetchResults(passedAttemptId).catch((err) => {
            resError = err;
            return null;
          }),
          fetchPerformance(passedAttemptId).catch((err) => {
            perfError = err;
            return null;
          }),
          fetchEvaluations(passedAttemptId),
        ]);

        const targetData = perfData || resData;

        if (!targetData) {
          throw perfError || resError || new Error(`Attempt with ID '${passedAttemptId}' not found`);
        }

        if (targetData.status === 'in_progress' && !targetData.is_attempt_complete) {
          setError('This attempt is currently in progress. Please complete the quiz before viewing its results.');
          setEvaluations([]);
          return;
        }

        setPerformanceData(targetData);

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

        // --- Bug fix: MCQ submitted-answer option text on revisit ---
        // `passedQuestions` only exists when this page was reached via an
        // in-app navigation that explicitly forwarded `questions` in router
        // state (e.g. straight after submitting a quiz). Revisiting this page
        // later (e.g. "View Results" from Attempt History) never carries that
        // state, so `questionOptionsMap` below would be empty and the
        // submitted-answer text would silently fall back to just the raw
        // letter. When that state is missing, re-fetch the exact same
        // persisted question set (with options) straight from the backend,
        // scoped to this attempt, via the same fetchQuestions() helper already
        // used elsewhere (StudySetAttemptsPage's practice-retake flow) for
        // this exact purpose.
        if (passedQuestions.length === 0 && studySetId && passedAttemptId) {
          const derivedTypeForOptions =
            targetData?.question_type ||
            (rawList[0] && (rawList[0].question_type || rawList[0].type)) ||
            location.state?.questionType ||
            'mcq';

          if (toBackendType(derivedTypeForOptions) === 'mcq') {
            try {
              const fetchedQs = await fetchQuestions(studySetId, derivedTypeForOptions, passedAttemptId);
              if (isMounted && Array.isArray(fetchedQs)) {
                setFallbackOptionQuestions(fetchedQs);
              }
            } catch (_e) {
              // Best-effort only: if this fails, the submitted answer simply
              // falls back to the raw letter, exactly as it did before this
              // fix - it must never block or error the results page.
            }
          }
        }

        let finalizedAttempt = null;
        if (
          targetData.status === 'in_progress' &&
          targetData.is_attempt_complete &&
          passedAttemptId &&
          !finishedAttemptIdsRef.current.has(passedAttemptId)
        ) {
          finishedAttemptIdsRef.current.add(passedAttemptId);
          try {
            finalizedAttempt = await finishAttempt(passedAttemptId);
            if (isMounted) {
              setPerformanceData((prev) => (prev ? { ...prev, status: 'completed' } : prev));
            }
          } catch (finishErr) {
            if (finishErr?.status !== 400 && !finishErr?.message?.toLowerCase().includes('already completed')) {
              console.error('Failed to finalize attempt:', finishErr);
              finishedAttemptIdsRef.current.delete(passedAttemptId);
            }
          }
        }

        const effectiveStudySetId = studySetId || targetData?.study_set_id || finalizedAttempt?.study_set_id;
        if (effectiveStudySetId) {
          try {
            const revStatus = await fetchRevisionStatus(effectiveStudySetId, true);
            if (isMounted && revStatus?.statuses) {
              setRevisionStatuses(revStatus.statuses);
            }
          } catch (revErr) {
            console.error('Failed to fetch revision status:', revErr);
          }
        }
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

  // Map question IDs to their options for MCQ correct answer resolution (Bug 4).
  // Prefers questions passed in via router state (present right after
  // submitting a quiz); falls back to the persisted set fetched above when
  // that state isn't available (e.g. revisiting from Attempt History).
  const questionOptionsMap = useMemo(() => {
    const map = new Map();
    const optionSourceQuestions =
      passedQuestions.length > 0 ? passedQuestions : fallbackOptionQuestions;
    optionSourceQuestions.forEach((q, idx) => {
      if (q.options && Array.isArray(q.options)) {
        if (q.question_id) map.set(String(q.question_id), q.options);
        if (q.id) map.set(String(q.id), q.options);
        map.set(`index_${idx}`, q.options);
      }
    });
    return map;
  }, [passedQuestions, fallbackOptionQuestions]);

  const processedQuestions = useMemo(() => {
    const isMcq = toBackendType(rawQuestionType) === 'mcq';

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

      const rawMissedList = Array.isArray(item.missed_concepts)
        ? item.missed_concepts
        : Array.isArray(item.missed)
        ? item.missed
        : [];

      const cleanedMissedConcepts = rawMissedList.filter(
        (concept) =>
          typeof concept === 'string' &&
          concept.trim() !== '' &&
          !concept.toLowerCase().includes('skipped')
      );

      const uniqueConceptMap = new Map();
      cleanedMissedConcepts.forEach((c) => {
        const key = c.trim().toLowerCase();
        if (!uniqueConceptMap.has(key)) {
          uniqueConceptMap.set(key, c.trim());
        }
      });
      const uniqueConcepts = Array.from(uniqueConceptMap.values());

      const multiWordConcepts = uniqueConcepts.filter((c) => c.split(/\s+/).length > 1);
      const singleWordConcepts = uniqueConcepts.filter((c) => c.split(/\s+/).length === 1);

      const multiWordTokensSet = new Set();
      multiWordConcepts.forEach((m) => {
        const tokens = m.toLowerCase().match(/[a-z0-9\-]+/gi) || [];
        tokens.forEach((t) => multiWordTokensSet.add(t));
      });

      const filteredSingleWord = singleWordConcepts.filter(
        (s) => !multiWordTokensSet.has(s.toLowerCase())
      );

      const filteredMultiWord = multiWordConcepts.filter((p) => {
        const pTokens = p.toLowerCase().match(/[a-z0-9\-]+/gi) || [];
        return !multiWordConcepts.some((other) => {
          if (other.toLowerCase() === p.toLowerCase()) return false;
          const otherTokens = other.toLowerCase().match(/[a-z0-9\-]+/gi) || [];
          if (pTokens.length >= otherTokens.length) return false;
          for (let i = 0; i <= otherTokens.length - pTokens.length; i++) {
            let match = true;
            for (let j = 0; j < pTokens.length; j++) {
              if (otherTokens[i + j] !== pTokens[j]) {
                match = false;
                break;
              }
            }
            if (match) return true;
          }
          return false;
        });
      });

      const validMissedConcepts = [...filteredMultiWord, ...filteredSingleWord].slice(0, 5);

      let computedFeedback = '';
      if (isSkipped) {
        computedFeedback = 'Question skipped. Review this topic in your study material to reinforce the concept.';
      } else if (isCorrect) {
        computedFeedback = 'Great job! Your answer is correct.';
      } else {
        computedFeedback = 'Your answer is incorrect. Review this topic in your study material and compare it with the expected solution.';
        if (validMissedConcepts.length > 0) {
          computedFeedback += `\nMissed key concepts: ${validMissedConcepts.join(', ')}`;
        }
      }

      // Resolve correct answer — for MCQ, format as "Letter. OptionText"
      let resolvedCorrectAnswer = item.correct_answer || item.model_answer || item.expected_answer || 'N/A';
      if (isMcq && resolvedCorrectAnswer && resolvedCorrectAnswer !== 'N/A') {
        const correctLetter = String(resolvedCorrectAnswer).trim().toUpperCase();
        // Try to find options for this question
        const options =
          questionOptionsMap.get(String(questionId)) ||
          questionOptionsMap.get(`index_${idx}`) ||
          null;
        if (options && Array.isArray(options)) {
          const matchedOption = options.find(
            (opt) => opt.letter && opt.letter.toUpperCase() === correctLetter
          );
          if (matchedOption && matchedOption.text) {
            resolvedCorrectAnswer = `${matchedOption.letter}. ${matchedOption.text}`;
          }
          // If no match found, keep the raw correct answer value as fallback
        }
      }

      // Resolve user answer — for MCQ, format as "Option {Letter}: {OptionText}"
      // (matches the same convention the backend already uses for
      // correct_answer, per the requested display format).
      let resolvedUserAnswer = isSkipped ? 'Skipped' : rawAns;
      if (isMcq && !isSkipped && rawAns) {
        const userLetter = String(rawAns).trim().toUpperCase();
        const options =
          questionOptionsMap.get(String(questionId)) ||
          questionOptionsMap.get(`index_${idx}`) ||
          null;
        if (options && Array.isArray(options)) {
          const matchedOption = options.find(
            (opt) => opt.letter && opt.letter.toUpperCase() === userLetter
          );
          if (matchedOption && matchedOption.text) {
            resolvedUserAnswer = `Option ${matchedOption.letter}: ${matchedOption.text}`;
          }
        }
      }

      return {
        id: idx + 1,
        question_id: questionId,
        prompt: promptText,
        userAnswer: resolvedUserAnswer,
        correctAnswer: resolvedCorrectAnswer,
        feedback: computedFeedback,
        awardedMarks: Math.round(awardedMarks * 100) / 100,
        maxMarks: Math.round(maxMarks * 100) / 100,
        isCorrect,
        isSkipped,
        topic: associatedTopic,
        rawTopic: rawTopic || associatedTopic,
      };
    });
  }, [evaluations, questionHintMap, questionOptionsMap, rawQuestionType]);

  const correctCount = useMemo(() => processedQuestions.filter((q) => q.isCorrect === true).length, [processedQuestions]);
  const skippedCount = useMemo(() => processedQuestions.filter((q) => q.isSkipped).length, [processedQuestions]);
  const wrongCount = useMemo(() => processedQuestions.filter((q) => q.isCorrect === false && !q.isSkipped).length, [processedQuestions]);

  const filteredQuestions = useMemo(() => {
    if (reviewFilter === 'right') {
      return processedQuestions.filter(
        (q) => q.isCorrect === true && !q.isSkipped
      );
    }

    if (reviewFilter === 'wrong') {
      return processedQuestions.filter(
        (q) => q.isCorrect === false && !q.isSkipped
      );
    }

    if (reviewFilter === 'skipped') {
      return processedQuestions.filter(
        (q) => q.isSkipped === true
      );
    }

    return processedQuestions;
  }, [processedQuestions, reviewFilter]);

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
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#8064C7] p-4 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col items-start justify-between gap-4 sm:gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 sm:px-3.5 sm:py-1 font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider text-white">
                <Sparkles size={14} />
                {questionTypeName} RESULTS
              </span>

              {isPracticeRetake && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/30 px-3 py-0.5 sm:px-3.5 sm:py-1 font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-100 shadow-xs">
                  <RotateCcw size={13} />
                  Practice Retake
                </span>
              )}

              {overallRemark && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/30 px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-xs font-bold text-white">
                  Remark: {overallRemark}
                </span>
              )}
            </div>

            <h1 className="text-xl font-black tracking-tight sm:text-3xl lg:text-4xl">
              {questionTypeName} Quiz Evaluation
            </h1>

            <p className="mt-1 text-xs text-purple-100 sm:text-sm">
              Performance breakdown and question evaluation for this attempt.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center justify-around gap-2.5 sm:gap-5 rounded-xl sm:rounded-2xl border border-white/20 bg-white/10 p-3 sm:p-5 backdrop-blur-md sm:justify-center lg:w-auto">
            <div className="px-2 text-center sm:px-3">
              <div className="text-xl font-black text-white sm:text-3xl">
                {percentage}%
              </div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-200 sm:text-xs">
                Accuracy
              </div>
            </div>

            <div className="hidden h-8 w-px bg-white/20 sm:block" />

            <div className="px-2 text-center sm:px-3">
              <div className="text-xl font-black text-emerald-300 sm:text-3xl">
                {correctCount}
              </div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200 sm:text-xs">
                Correct
              </div>
            </div>

            <div className="hidden h-8 w-px bg-white/20 sm:block" />

            <div className="px-2 text-center sm:px-3">
              <div className="text-xl font-black text-rose-300 sm:text-3xl">
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
                  <div className="text-xl font-black text-amber-300 sm:text-3xl">
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
              <div className="text-xl font-black sm:text-3xl">
                {formatScore(totalScore)}{' '}
                <span className="text-xs font-normal text-purple-200">
                  / {formatScore(maxScore)}
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setReviewFilter('all')}
              className={`cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-bold transition-all ${
                reviewFilter === 'all'
                  ? isDarkMode
                    ? 'border-[#8064C7] bg-[#8064C7]/30 text-white shadow-xs'
                    : 'border-[#8064C7] bg-[#8064C7] text-white shadow-xs'
                  : isDarkMode
                  ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  : 'border-gray-200 bg-white/80 text-gray-700 hover:bg-white hover:text-gray-900'
              }`}
            >
              All
            </button>

            <button
              type="button"
              onClick={() => setReviewFilter('right')}
              className={`cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-bold transition-all ${
                reviewFilter === 'right'
                  ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                  : isDarkMode
                  ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {correctCount} Right
            </button>

            <button
              type="button"
              onClick={() => setReviewFilter('wrong')}
              className={`cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-bold transition-all ${
                reviewFilter === 'wrong'
                  ? 'border-rose-500 bg-rose-500 text-white shadow-xs'
                  : isDarkMode
                  ? 'border-rose-500/30 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                  : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              {wrongCount} Wrong
            </button>

            {skippedCount > 0 && (
              <button
                type="button"
                onClick={() => setReviewFilter('skipped')}
                className={`cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-bold transition-all ${
                  reviewFilter === 'skipped'
                    ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                    : 'border-amber-500/30 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                }`}
              >
                {skippedCount} Skipped
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {processedQuestions.length === 0 ? (
            <div
              className={`rounded-2xl border p-8 text-center text-xs font-semibold ${
                isDarkMode ? 'border-white/10 bg-white/5 text-white/60' : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}
            >
              No detailed question evaluations available.
            </div>
          ) : filteredQuestions.length > 0 ? (
            filteredQuestions.map((q) => (
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
                    ? `Skipped (${formatScore(0)}/${formatScore(q.maxMarks)} Marks)`
                    : q.isCorrect === true
                    ? `Correct (+${formatScore(q.awardedMarks)}/${formatScore(q.maxMarks)} Marks)`
                    : `Incorrect (${formatScore(q.awardedMarks)}/${formatScore(q.maxMarks)} Marks)`}
                </span>
              </div>

              <p className="text-sm font-bold tracking-tight">{q.prompt}</p>

              <div className="grid grid-cols-1 gap-3 pt-1 text-xs font-medium sm:grid-cols-2">
                <div
                  className={`min-w-0 rounded-xl border p-3 ${
                    isDarkMode ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <span className="mb-1 block text-[10px] font-bold uppercase opacity-40">
                    Your Submitted Answer
                  </span>
                  <span
                    className={`block break-words ${
                      q.isSkipped
                        ? 'font-bold italic text-amber-400'
                        : q.isCorrect === true
                        ? 'font-bold'
                        : isDarkMode
                        ? 'font-bold text-rose-400'
                        : 'font-bold text-red-600'
                    }`}
                  >
                    {q.userAnswer}
                  </span>
                </div>

                <div
                  className={`min-w-0 rounded-xl border p-3 ${
                    isDarkMode
                      ? 'border-[#8064C7]/30 bg-[#8064C7]/15'
                      : 'border-[#8064C7]/20 bg-purple-50'
                  }`}
                >
                  <span className="mb-1 block text-[10px] font-bold uppercase text-[#8064C7] dark:text-[#A78BFA]">
                    Correct / Expected Solution
                  </span>
                  <span className="block break-words font-bold">{q.correctAnswer}</span>
                </div>
              </div>

              <div
                className={`min-w-0 rounded-xl border-l-4 border-l-[#8064C7] p-3 text-xs break-words whitespace-pre-line ${
                  isDarkMode ? 'bg-white/5' : 'bg-purple-50/50'
                }`}
              >
                <span className="font-bold text-[#8064C7] dark:text-[#A78BFA]">
                  Feedback:{' '}
                </span>
                {q.feedback}
              </div>
            </div>
          ))
          ) : (
            <div
              className={`rounded-2xl border p-8 text-center text-xs font-semibold ${
                isDarkMode ? 'border-white/10 bg-white/5 text-white/60' : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}
            >
              No questions match this filter.
            </div>
          )}
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
              ) : (currentRevisionStatus?.next_due_date && currentRevisionStatus.next_due_date > new Date().toLocaleDateString('en-CA')) ? (
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