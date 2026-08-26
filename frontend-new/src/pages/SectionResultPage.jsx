import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchEvaluations, finishAttempt } from '../services/api';
import { CheckCircle2, ChevronRight, XCircle, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';

export default function SectionResultPage({ onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();

  
  // Retrieved state passed from the section submission
  const {
    attemptId,
    studySetId,
    currentSection = 'MCQ',
    nextSection = null,
    sectionTitle = 'Section Evaluation',
    remainingSections = [],
  } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [evaluations, setEvaluations] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!attemptId) {
      setLoading(false);
      return;
    }

    async function loadSectionResults() {
      try {
        setLoading(true);
        const data = await fetchEvaluations(attemptId);
        const allEvals = Array.isArray(data) ? data : data.evaluations || [];
        
        // Filter evaluations for the current section type if present
        const filtered = currentSection
          ? allEvals.filter(
              (item) =>
                item.question_type?.toLowerCase() === currentSection.toLowerCase() ||
                item.type?.toLowerCase() === currentSection.toLowerCase()
            )
          : allEvals;

        setEvaluations(filtered.length > 0 ? filtered : allEvals);
      } catch (err) {
        setError(err.message || 'Failed to load section evaluations');
      } finally {
        setLoading(false);
      }
    }

    loadSectionResults();
  }, [attemptId, currentSection]);

  // Section Score Calculation
  const totalQuestions = evaluations.length;
  const totalScore = evaluations.reduce((acc, curr) => acc + (Number(curr.score) || (curr.is_correct ? 1 : 0)), 0);
  const maxPossibleMarks = evaluations.reduce((acc, curr) => acc + (Number(curr.max_marks) || 1), 0);

  const handleContinue = () => {
    const nextSec = nextSection || (remainingSections.length > 0 ? remainingSections[0] : null);
    const updatedRemaining = remainingSections.filter((s) => s !== nextSec);

    if (nextSec) {
      const targetRoute = nextSec.toLowerCase().includes('mcq')
        ? '/quiz/mcq'
        : nextSec.toLowerCase().includes('qna') || nextSec.toLowerCase().includes('short')
        ? '/quiz/qna'
        : '/quiz';

      navigate(targetRoute, {
        state: {
          attemptId,
          studySetId,
          sectionType: nextSec,
          remainingSections: updatedRemaining,
        },
      });
    } else {
      handleEndTest();
    }
  };

  const handleEndTest = async () => {
    try {
      if (attemptId) {
        await finishAttempt(attemptId);
      }
    } catch (err) {
      console.warn('Finish attempt notice:', err);
    } finally {
      if (onNavigate) {
        onNavigate('results');
      } else {
        navigate('/results', { state: { attemptId, studySetId } });
      }
    }
  };

  if (!attemptId) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl shadow-sm border border-gray-100 text-center">
        <h2 className="text-xl font-bold text-[#3E3E75] mb-2">No Section Active</h2>
        <p className="text-gray-500 mb-6 text-sm">Please launch a quiz section first.</p>
        <button
          onClick={() => (onNavigate ? onNavigate('dashboard') : navigate('/'))}
          className="rounded-xl bg-[#4E1F6E] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3E3E75]"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="p-12 text-center text-gray-500 font-medium">Evaluating section responses...</div>;
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-center">
        <AlertCircle className="mx-auto mb-2 text-red-500" size={26} />
        <p className="font-semibold text-sm">Error Loading Section Results</p>
        <p className="text-xs text-red-600 mt-1">{error}</p>
        <button
          onClick={handleEndTest}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700"
        >
          View Overall Results
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Banner with Section Score */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#98E8DE]/40 px-3 py-1 text-xs font-bold text-[#136a6a]">
            Section Complete
          </span>
          <h1 className="text-2xl font-bold text-[#3E3E75] mt-1.5 capitalize">
            {sectionTitle || `${currentSection} Results`}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Total Questions Evaluated: {totalQuestions}
          </p>
        </div>

        {/* Section Score Badge */}
        <div className="flex items-center gap-4 bg-[#F8FAFA] px-5 py-3 rounded-xl border border-[#98E8DE]/60">
          <div className="text-right">
            <span className="text-xs text-gray-400 font-semibold block uppercase">Section Score</span>
            <span className="text-2xl font-black text-[#4E1F6E]">
              {totalScore} <span className="text-sm font-medium text-gray-500">/ {maxPossibleMarks}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Questions Breakdown List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-[#3E3E75]">Question Breakdown & Feedback</h2>
        {evaluations.map((item, idx) => {
          const isPassed = item.is_correct || item.score >= (item.max_marks || 1) * 0.7;

          return (
            <div key={idx} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex justify-between items-start gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4E1F6E]">
                  Question {idx + 1}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    isPassed ? 'bg-[#98E8DE]/40 text-[#136a6a]' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {isPassed ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  {item.score !== undefined
                    ? `${item.score} / ${item.max_marks || 1} Marks`
                    : item.is_correct
                    ? 'Correct'
                    : 'Needs Improvement'}
                </span>
              </div>

              {/* Prompt */}
              <p className="text-[#3E3E75] font-semibold text-base">
                {item.question_text || item.question || item.prompt}
              </p>

              {/* User Answer */}
              <div className="rounded-xl bg-[#F8FAFA] border border-gray-100 p-4 text-sm space-y-1">
                <div className="text-xs font-semibold text-gray-400 uppercase">Your Answer:</div>
                <p className="text-[#3E3E75] font-medium">
                  {item.student_answer || item.answer || item.user_response || 'No answer submitted'}
                </p>
              </div>

              {/* AI Feedback / Model Explanation */}
              {(item.feedback || item.model_answer || item.explanation) && (
                <div className="rounded-xl border-l-4 border-[#4E1F6E] bg-[#98E8DE]/15 p-4 text-sm text-[#3E3E75] space-y-1">
                  <div className="font-bold text-[#4E1F6E] flex items-center gap-1.5">
                    <BookOpen size={14} /> AI Evaluation Feedback:
                  </div>
                  <p className="text-xs leading-relaxed">
                    {item.feedback || item.model_answer || item.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Navigation Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-gray-200/60">
        <button
          type="button"
          onClick={handleEndTest}
          className="w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-[#3E3E75] hover:bg-gray-50 transition"
        >
          End Test & View Final Report
        </button>

        {nextSection || remainingSections.length > 0 ? (
          <button
            type="button"
            onClick={handleContinue}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#4E1F6E] px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#3E3E75] transition"
          >
            Continue to Next Section <ChevronRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleEndTest}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#4E1F6E] px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#3E3E75] transition"
          >
            Finish & View Results <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}