import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { fetchEvaluations, finishAttempt } from '../services/api';
import { CheckCircle2, ChevronRight, XCircle, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';

export default function SectionResultPage({ onNavigate }) {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    attemptId,
    studySetId,
    currentSection = 'MCQ',
    nextSection = null,
    sectionTitle = 'Section Evaluation',
    remainingSections = [],
  } = location.state || {};

  const [loading, setLoading] = useState(!!attemptId);
  const [evaluations, setEvaluations] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!attemptId) return;

    async function loadSectionResults() {
      try {
        setLoading(true);
        const data = await fetchEvaluations(attemptId);
        const allEvals = Array.isArray(data) ? data : data.evaluations || [];
        
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
      <div className={`max-w-md mx-auto mt-20 p-8 rounded-3xl border shadow-xl text-center backdrop-blur-2xl ${
        isDarkMode ? "border-white/10 bg-[#17131F] text-white" : "border-white/80 bg-white text-[#292530]"
      }`}>
        <h2 className="text-xl font-black mb-2 tracking-tight">No Section Active</h2>
        <p className={`mb-6 text-xs ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>Please launch a quiz section first.</p>
        <button
          onClick={() => (onNavigate ? onNavigate('dashboard') : navigate('/'))}
          className="rounded-xl bg-[#8064C7] hover:bg-[#8B6DD4] px-6 py-2.5 text-xs font-bold text-white shadow-md transition cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="p-12 text-center text-gray-500 font-bold">Evaluating section responses...</div>;
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-red-500/10 text-red-400 rounded-3xl border border-red-500/30 text-center">
        <AlertCircle className="mx-auto mb-2 text-red-400" size={26} />
        <p className="font-black text-sm">Error Loading Section Results</p>
        <p className="text-xs text-red-300 mt-1">{error}</p>
        <button
          onClick={handleEndTest}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 shadow-md"
        >
          View Overall Results
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Banner with Section Score */}
      <div className={`rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
        isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          : "border-[#8064C7]/15 bg-[#F0ECF8]/95 text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.05)]"
      }`}>
        <div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            isDarkMode ? "bg-[#8064C7]/20 border border-[#8064C7]/30 text-[#A78BFA]" : "bg-[#8064C7]/10 border border-[#8064C7]/20 text-[#8064C7]"
          }`}>
            Section Complete
          </span>
          <h1 className="text-2xl font-black tracking-tight mt-1.5 capitalize">
            {sectionTitle || `${currentSection} Results`}
          </h1>
          <p className={`text-xs mt-0.5 ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
            Total Questions Evaluated: {totalQuestions}
          </p>
        </div>

        <div className={`flex items-center gap-4 px-5 py-3 rounded-2xl border ${
          isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200/80 bg-gray-50/50"
        }`}>
          <div className="text-right">
            <span className={`text-[10px] font-mono font-bold block uppercase tracking-wider ${isDarkMode ? "text-white/40" : "text-gray-400"}`}>Section Score</span>
            <span className="text-2xl font-black text-[#8064C7] dark:text-[#A78BFA]">
              {totalScore} <span className={`text-sm font-medium ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>/ {maxPossibleMarks}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Questions Breakdown List */}
      <div className="space-y-4">
        <h2 className="text-base font-black tracking-tight">Question Breakdown & Feedback</h2>
        {evaluations.map((item, idx) => {
          const isPassed = item.is_correct || item.score >= (item.max_marks || 1) * 0.7;

          return (
            <div key={idx} className={`rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 space-y-4 ${
              isDarkMode
                ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
                : "border-[#8064C7]/15 bg-[#F0ECF8]/95 text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.05)]"
            }`}>
              <div className="flex justify-between items-start gap-4">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#8064C7] dark:text-[#A78BFA]">
                  Question {idx + 1}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    isPassed
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/20 border-rose-500/30 text-rose-400'
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

              <p className="font-extrabold text-base tracking-tight">
                {item.question_text || item.question || item.prompt}
              </p>

              <div className={`rounded-2xl border p-4 text-xs space-y-1 ${
                isDarkMode ? "border-white/5 bg-white/5" : "border-gray-200/80 bg-gray-50/50"
              }`}>
                <div className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDarkMode ? "text-white/40" : "text-gray-400"}`}>Your Answer:</div>
                <p className="font-semibold">
                  {item.student_answer || item.answer || item.user_response || 'No answer submitted'}
                </p>
              </div>

              {(item.feedback || item.model_answer || item.explanation) && (
                <div className={`rounded-2xl border-l-4 border-l-[#8064C7] p-4 text-xs space-y-1 ${
                  isDarkMode ? "bg-white/5" : "bg-purple-50/50"
                }`}>
                  <div className="font-bold text-[#8064C7] dark:text-[#A78BFA] flex items-center gap-1.5">
                    <BookOpen size={14} /> AI Evaluation Feedback:
                  </div>
                  <p className="leading-relaxed font-medium">
                    {item.feedback || item.model_answer || item.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Navigation Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4">
        <button
          type="button"
          onClick={handleEndTest}
          className={`w-full sm:w-auto rounded-xl border px-6 py-3 text-xs font-bold transition ${
            isDarkMode ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          End Test & View Final Report
        </button>

        {nextSection || remainingSections.length > 0 ? (
          <button
            type="button"
            onClick={handleContinue}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#8064C7] hover:bg-[#8B6DD4] px-8 py-3 text-xs font-bold text-white shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition"
          >
            Continue to Next Section <ChevronRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleEndTest}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#8064C7] hover:bg-[#8B6DD4] px-8 py-3 text-xs font-bold text-white shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition"
          >
            Finish & View Results <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}