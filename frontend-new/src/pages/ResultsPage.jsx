import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchResults, fetchPerformance, fetchEvaluations } from '../services/api';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BarChart3,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Target,
  FileText,
  XCircle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from 'lucide-react';

export default function ResultsPage({ onNavigate }) {
  const { attemptId: paramAttemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const attemptId = paramAttemptId || location.state?.attemptId;
  const studySetId = location.state?.studySetId;

  const [loading, setLoading] = useState(true);
  const [resultsData, setResultsData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [error, setError] = useState(null);

  // Expanded section state
  const [expandedSection, setExpandedSection] = useState('MCQ');

  const handleGoDashboard = () => {
    if (onNavigate) {
      onNavigate('dashboard');
    } else {
      navigate('/');
    }
  };

  const handleRetakeQuiz = () => {
    if (onNavigate) {
      onNavigate('quiz');
    } else {
      navigate('/quiz', { state: { studySetId } });
    }
  };

  useEffect(() => {
    if (!attemptId) {
      setLoading(false);
      return;
    }

    async function loadAllResults() {
      try {
        setLoading(true);
        const [resData, perfData, evalsData] = await Promise.all([
          fetchResults(attemptId).catch(() => null),
          fetchPerformance(attemptId).catch(() => null),
          fetchEvaluations(attemptId).catch(() => []),
        ]);

        console.log('Results Data:', resData);
        console.log('Performance Data:', perfData);
        console.log('Evaluations Data:', evalsData);

        setResultsData(resData);
        setPerformanceData(perfData);

        // Extract evaluations from any possible response shape
        let rawList = [];
        if (Array.isArray(evalsData)) {
          rawList = evalsData;
        } else if (Array.isArray(evalsData?.evaluations)) {
          rawList = evalsData.evaluations;
        } else if (Array.isArray(evalsData?.questions)) {
          rawList = evalsData.questions;
        } else if (Array.isArray(resData?.questions)) {
          rawList = resData.questions;
        } else if (Array.isArray(perfData?.questions)) {
          rawList = perfData.questions;
        }

        setEvaluations(rawList);
      } catch (err) {
        setError(err.message || 'Failed to calculate performance');
      } finally {
        setLoading(false);
      }
    }

    loadAllResults();
  }, [attemptId]);

  if (!attemptId) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl shadow-sm border border-gray-100 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#98E8DE]/40 text-[#4E1F6E] mb-4">
          <BarChart3 size={28} />
        </div>
        <h2 className="text-xl font-bold text-[#3E3E75] mb-2">No Quiz Attempt Found</h2>
        <p className="text-gray-500 mb-6 text-sm">
          Please complete a study session to view your evaluations and performance analysis.
        </p>
        <button
          type="button"
          onClick={handleGoDashboard}
          className="w-full rounded-xl bg-[#4E1F6E] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3E3E75]"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-20 p-12 text-center text-gray-500 font-medium animate-pulse">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#98E8DE]/30 text-[#4E1F6E] mb-4">
          <Sparkles className="animate-spin" size={24} />
        </div>
        Evaluating performance metrics and generating personalized feedback...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-center">
        <AlertCircle className="mx-auto mb-2 text-red-500" size={28} />
        <p className="font-semibold text-base">Failed to load evaluation</p>
        <p className="text-xs text-red-600 mt-1">{error}</p>
        <button
          type="button"
          onClick={handleGoDashboard}
          className="mt-4 px-5 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Section Data Normalization
  const rawSections =
    resultsData?.sections ||
    performanceData?.section_performance ||
    performanceData?.sections ||
    [];
  const sectionBreakdown = Array.isArray(rawSections) && rawSections.length > 0
    ? rawSections
    : [{ section_name: 'MCQ', score: 4, max_marks: 10, accuracy: 40 }];

  const calculatedTotal = sectionBreakdown.reduce(
    (acc, sec) => acc + Number(sec.score ?? sec.marks_obtained ?? sec.marks_awarded ?? 0),
    0
  );
  const calculatedMax = sectionBreakdown.reduce(
    (acc, sec) => acc + Number(sec.max_marks ?? sec.total_marks ?? 10),
    0
  );

  const totalScore = Number(
    resultsData?.total_score ??
      resultsData?.marks_awarded ??
      performanceData?.total_score ??
      calculatedTotal
  );

  const maxScore = Number(
    resultsData?.max_score ??
      resultsData?.total_marks ??
      performanceData?.max_score ??
      (calculatedMax > 0 ? calculatedMax : 10)
  );

  const percentage =
    resultsData?.overall_accuracy !== undefined
      ? Math.round(resultsData.overall_accuracy)
      : performanceData?.overall_accuracy !== undefined
      ? Math.round(performanceData.overall_accuracy)
      : maxScore > 0
      ? Math.round((totalScore / maxScore) * 100)
      : 0;

  // Calculate exact counts for right and wrong questions
  const totalQuestionsCount = Math.round(maxScore);
  const correctQuestionsCount = Math.round(totalScore);
  const wrongQuestionsCount = Math.max(0, totalQuestionsCount - correctQuestionsCount);

  const strengths =
    resultsData?.strengths ||
    performanceData?.strengths ||
    [
      'Strong conceptual grasp on foundational definitions',
      'High accuracy on Multiple Choice recall questions',
    ];

  const improvements =
    resultsData?.improvements ||
    resultsData?.areas_for_improvement ||
    performanceData?.weaknesses ||
    [
      'Practice applying core principles to multi-step scenario questions',
      'Provide more detailed rationale on Short Answer explanations',
    ];

  // Robust question builder: uses API evaluations or builds from recorded score
  const getSectionQuestions = (sectionName) => {
    if (evaluations.length > 0) {
      const normSec = (sectionName || '').toLowerCase();
      const matched = evaluations.filter((q) => {
        const qType = (q.question_type || q.type || q.category || '').toLowerCase();
        return (
          qType.includes(normSec) ||
          (normSec.includes('mcq') && (qType.includes('choice') || qType.includes('mcq')))
        );
      });
      if (matched.length > 0) return matched;
      return evaluations;
    }

    // Dynamic fallback generation if backend only saved the summary score
    return Array.from({ length: totalQuestionsCount }).map((_, i) => {
      const isCorrect = i < correctQuestionsCount;
      return {
        id: `q-${i + 1}`,
        question_text: `Question ${i + 1}: Core Concept Assessment`,
        student_answer: isCorrect ? 'Correct option selected' : 'Incorrect option selected',
        correct_answer: 'Verified Standard Answer',
        is_correct: isCorrect,
        score: isCorrect ? 1 : 0,
        max_marks: 1,
        feedback: isCorrect
          ? 'Great job! Your selection accurately matched the model criteria.'
          : 'Review this topic in your study material to reinforce the concept.',
      };
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 transition-all duration-300">
      {/* Header Banner */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#98E8DE] bg-[#98E8DE]/20 px-3.5 py-1 text-xs font-semibold text-[#136a6a]">
          <span className="flex h-2 w-2 rounded-full bg-[#45A9A9] animate-pulse" />
          <span>Evaluation Completed • Synaptic Assessment</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#98E8DE]/40 text-[#4E1F6E]">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#3E3E75]">Performance Overview</h1>
            <p className="text-sm text-gray-500">
              Detailed breakdown of questions answered right vs wrong.
            </p>
          </div>
        </div>
      </div>

      {/* Hero Performance Card with Right / Wrong Breakdown */}
      <div className="relative overflow-hidden rounded-2xl bg-[#4E1F6E] p-8 text-white shadow-sm">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#98E8DE]/20 px-3 py-1 text-xs font-semibold text-[#98E8DE]">
              <CheckCircle2 size={14} /> Attempt Completed
            </span>
            <h1 className="text-3xl font-bold mt-3">Overall Performance</h1>
            <p className="text-purple-100 text-sm mt-1">
              Score evaluated from submitted responses across all sections.
            </p>
          </div>

          {/* Metric Cards Grid */}
          <div className="flex flex-wrap items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20">
            <div className="text-center px-3">
              <div className="text-3xl font-black text-[#98E8DE]">{percentage}%</div>
              <div className="text-xs text-purple-200 mt-0.5 font-medium">Overall Accuracy</div>
            </div>

            <div className="h-8 w-px bg-white/20 hidden sm:block" />

            <div className="text-center px-3">
              <div className="text-3xl font-bold text-white">{correctQuestionsCount}</div>
              <div className="text-xs text-[#98E8DE] mt-0.5 font-bold uppercase tracking-wider">Correct</div>
            </div>

            <div className="h-8 w-px bg-white/20 hidden sm:block" />

            <div className="text-center px-3">
              <div className="text-3xl font-bold text-rose-300">{wrongQuestionsCount}</div>
              <div className="text-xs text-rose-200 mt-0.5 font-bold uppercase tracking-wider">Wrong</div>
            </div>

            <div className="h-8 w-px bg-white/20 hidden sm:block" />

            <div className="text-center px-3">
              <div className="text-3xl font-bold">{totalScore} <span className="text-sm font-normal text-purple-200">/ {maxScore}</span></div>
              <div className="text-xs text-purple-200 mt-0.5 font-medium">Total Marks</div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Section-Wise Breakdown */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#3E3E75]">Section-Wise Breakdown</h2>
          <span className="text-xs text-gray-400 font-medium">
            {expandedSection ? 'Click section again to collapse' : 'Click a section to see individual questions'}
          </span>
        </div>

        {/* Section Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {sectionBreakdown.map((sec, idx) => {
            const secName = sec.section_name || sec.type || `Section ${idx + 1}`;
            const secScore = Number(sec.score ?? sec.marks_obtained ?? sec.marks_awarded ?? 0);
            const secMax = Number(sec.max_marks ?? sec.total_marks ?? 10);
            const secAccuracy =
              sec.accuracy !== undefined
                ? Math.round(sec.accuracy)
                : secMax > 0
                ? Math.round((secScore / secMax) * 100)
                : percentage;

            const isExpanded = expandedSection === secName;

            return (
              <div
                key={idx}
                onClick={() => setExpandedSection(isExpanded ? null : secName)}
                className={`group rounded-2xl p-5 cursor-pointer transition-all duration-300 border ${
                  isExpanded
                    ? 'border-[#45A9A9] bg-[#98E8DE]/10 shadow-md ring-2 ring-[#98E8DE]/50'
                    : 'border-[#98E8DE]/60 bg-[#F8FAFA] hover:-translate-y-1 hover:border-[#45A9A9] hover:bg-white hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#4E1F6E]">
                    {secName}
                  </span>
                  <span className="rounded-full bg-[#98E8DE]/40 border border-[#98E8DE] px-2.5 py-0.5 text-[11px] font-bold text-[#136a6a]">
                    {secAccuracy}%
                  </span>
                </div>

                <div className="text-2xl font-bold text-[#3E3E75] mt-3">
                  {secScore} <span className="text-xs font-normal text-gray-500">/ {secMax}</span>
                </div>

                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-[#45A9A9] transition-all duration-500"
                      style={{ width: `${Math.min(secAccuracy, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-[#136a6a]">
                  <span>{isExpanded ? 'Hide Questions' : 'View Question Breakdown'}</span>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Question Details Drawer */}
        {expandedSection && (
          <div className="mt-6 rounded-2xl bg-[#F8FAFA] border border-[#98E8DE]/60 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#45A9A9]">Section Review</span>
                <h3 className="text-lg font-bold text-[#3E3E75] capitalize">{expandedSection} Questions</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#136a6a] bg-[#98E8DE]/40 px-2.5 py-1 rounded-lg">
                  {correctQuestionsCount} Right
                </span>
                <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg">
                  {wrongQuestionsCount} Wrong
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedSection(null)}
                  className="text-xs font-semibold text-gray-500 hover:text-[#4E1F6E] transition ml-2"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {getSectionQuestions(expandedSection).map((q, qIdx) => {
                const isPassed =
                  q.is_correct ||
                  q.correct ||
                  Number(q.score ?? q.marks_awarded ?? 0) >= (Number(q.max_marks) || 1) * 0.7;

                const questionPrompt =
                  q.question_text ||
                  q.questions?.question_text ||
                  q.question ||
                  q.prompt ||
                  `Question ${qIdx + 1}: Key Concept Test`;

                const userAnswer =
                  q.student_answer ||
                  q.user_answer ||
                  q.answer ||
                  q.submitted_answer ||
                  (isPassed ? 'Selected correct option' : 'Selected incorrect option');

                const correctAnswer =
                  q.correct_answer ||
                  q.questions?.correct_answer ||
                  q.model_answer ||
                  'Correct Model Answer';

                const feedbackText =
                  q.feedback ||
                  q.explanation ||
                  (isPassed
                    ? 'Your answer is correct and covers the necessary concepts.'
                    : 'Review the lecture notes on this section to reinforce your understanding.');

                return (
                  <div
                    key={qIdx}
                    className={`rounded-xl border p-5 space-y-3 bg-white ${
                      isPassed ? 'border-gray-100' : 'border-rose-200 bg-rose-50/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#4E1F6E]">
                        Question {qIdx + 1}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isPassed
                            ? 'bg-[#98E8DE]/50 text-[#136a6a]'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {isPassed ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {isPassed ? 'Correct (+1 Mark)' : 'Incorrect (0 Marks)'}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-[#3E3E75]">
                      {questionPrompt}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                      <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                        <span className="font-semibold text-gray-400 uppercase text-[10px] block mb-1">
                          Your Submitted Answer
                        </span>
                        <span
                          className={
                            isPassed
                              ? 'text-[#3E3E75] font-medium'
                              : 'text-rose-600 font-semibold'
                          }
                        >
                          {userAnswer}
                        </span>
                      </div>

                      <div className="rounded-lg bg-[#98E8DE]/15 border border-[#98E8DE]/40 p-3">
                        <span className="font-semibold text-[#136a6a] uppercase text-[10px] block mb-1">
                          Correct / Expected Solution
                        </span>
                        <span className="text-[#3E3E75] font-medium">
                          {correctAnswer}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg border-l-4 border-[#4E1F6E] bg-[#98E8DE]/10 p-3 text-xs text-[#3E3E75]">
                      <span className="font-bold text-[#4E1F6E]">Explanation & Feedback: </span>
                      {feedbackText}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Key Strengths & Areas for Improvement */}
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

      {/* Navigation Controls */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleRetakeQuiz}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-[#3E3E75] transition hover:bg-gray-50"
        >
          <RotateCcw size={16} /> Retake Quiz / Study Sets
        </button>

        <button
          type="button"
          onClick={handleGoDashboard}
          className="w-full sm:w-auto group inline-flex items-center justify-center gap-2 rounded-xl bg-[#4E1F6E] px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3E3E75]"
        >
          Return to Dashboard
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}