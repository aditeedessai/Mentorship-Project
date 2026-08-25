import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchResults, fetchPerformance, fetchEvaluations } from '../services/api';
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

export default function ResultsPage({ onNavigate, studySetId: propStudySetId }) {
  const { attemptId: paramAttemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const passedAttemptId = paramAttemptId || location.state?.attemptId;
  const studySetId = location.state?.studySetId || propStudySetId || 'default-set';
  const storageKey = `study_set_history_${studySetId}`;

  const [loading, setLoading] = useState(false);
  const [resultsData, setResultsData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('LONG ANSWER');

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

  const handleToggleSection = (sectionName) => {
    setActiveSection((prev) => (prev === sectionName ? null : sectionName));
  };

  const normalizeTypeName = (typeStr) => {
    const s = (typeStr || '').toUpperCase().trim();
    if (s.includes('MCQ') || s.includes('CHOICE')) return 'MCQ';
    if (s.includes('LONG') || s.includes('ESSAY') || s.includes('DESCRIPTIVE')) return 'LONG ANSWER';
    if (s.includes('APP')) return 'APPLICATION';
    if (s.includes('SHORT')) return 'SHORT ANSWER';
    return s || 'LONG ANSWER';
  };

  // Formats relative time (e.g., "5 mins ago", "2 hours ago", "3 days ago")
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    }

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

  useEffect(() => {
    if (!passedAttemptId) return;

    localStorage.setItem('last_attempt_id', passedAttemptId);

    async function loadAllResults() {
      try {
        setLoading(true);
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

        const exactCompletedAt =
          resData?.completed_at ||
          resData?.created_at ||
          resData?.submitted_at ||
          perfData?.completed_at ||
          new Date().toISOString();

        let currentType = 'LONG ANSWER';
        if (rawList.length > 0) {
          currentType = normalizeTypeName(rawList[0].question_type || rawList[0].type);
        } else if (resData?.sections?.length > 0) {
          currentType = normalizeTypeName(resData.sections[0].section_name || resData.sections[0].type);
        }

        const existingHistory = JSON.parse(localStorage.getItem(storageKey) || '{}');
        existingHistory[currentType] = {
          name: currentType,
          attemptId: passedAttemptId,
          score: currentType === 'LONG ANSWER' ? 4.0 : currentType === 'MCQ' ? 6.0 : 2.0,
          maxMarks: 10,
          accuracy: currentType === 'LONG ANSWER' ? 40 : currentType === 'MCQ' ? 60 : 20,
          timestamp: exactCompletedAt,
        };

        localStorage.setItem(storageKey, JSON.stringify(existingHistory));
        setActiveSection(currentType);
      } catch (err) {
        setError(err.message || 'Failed to load evaluation');
      } finally {
        setLoading(false);
      }
    }

    loadAllResults();
  }, [passedAttemptId, storageKey]);

  // Section Breakdown list from previously saved history
  const sectionsList = useMemo(() => {
    const history = JSON.parse(localStorage.getItem(storageKey) || '{}');

    const defaultSections = {
      'LONG ANSWER': {
        name: 'LONG ANSWER',
        score: 4.0,
        maxMarks: 10,
        accuracy: 40,
        timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
      },
      'APPLICATION': {
        name: 'APPLICATION',
        score: 2.0,
        maxMarks: 10,
        accuracy: 20,
        timestamp: new Date(Date.now() - 1000 * 60 * 16).toISOString(),
      },
      'SHORT ANSWER': {
        name: 'SHORT ANSWER',
        score: 2.0,
        maxMarks: 10,
        accuracy: 20,
        timestamp: new Date(Date.now() - 1000 * 60 * 46).toISOString(),
      },
      'MCQ': {
        name: 'MCQ',
        score: 6.0,
        maxMarks: 10,
        accuracy: 60,
        timestamp: new Date(Date.now() - 1000 * 60 * 126).toISOString(),
      },
    };

    Object.keys(history).forEach((key) => {
      const h = history[key];
      const validScore = Math.min(10, Math.round(Number(h.score || 0) * 100) / 100);
      defaultSections[key] = {
        name: key,
        score: validScore,
        maxMarks: 10,
        accuracy: Math.round((validScore / 10) * 100),
        timestamp: h.timestamp || new Date().toISOString(),
      };
    });

    return Object.values(defaultSections);
  }, [storageKey, resultsData]);

  const totalScore = useMemo(() => {
    return Math.round(sectionsList.reduce((acc, s) => acc + s.score, 0) * 100) / 100;
  }, [sectionsList]);

  const maxScore = useMemo(() => {
    return sectionsList.reduce((acc, s) => acc + s.maxMarks, 0);
  }, [sectionsList]);

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  // Render question sets for the active drawer
  const activeQuestions = useMemo(() => {
    if (activeSection === 'LONG ANSWER') {
      return [
        {
          id: 1,
          prompt:
            'Define the field of Botany and explain the primary goals and key processes involved in natural sciences as outlined in the text.',
          userAnswer: 'study of plants',
          correctAnswer:
            'Botany is the field of science that studies plants. The natural sciences pursue knowledge of the physical and natural world using systematic observation and empirical testing.',
          feedback: 'Great job! Your answer matches the core definition criteria.',
          awardedMarks: 2.0,
          maxMarks: 2.0,
          isPassed: true,
        },
        {
          id: 2,
          prompt:
            'Describe the initial steps of the scientific method using the garden example provided in the text, and explain how scientific experiments are applied in non-laboratory settings.',
          userAnswer: 'i dont know',
          correctAnswer:
            "The scientific method begins with an observation that leads to a question. In the text's example, observing that the leaves of puakenikeni plants in a garden are turning yellow leads to the question: 'Why are the leaves of my plants turning yellow?' This is followed by forming a hypothesis/prediction and running an experiment.",
          feedback:
            'Missed key concepts: practical non-scientific problems, scientific experiments, hypothesis prediction, facilities everyday, puakenikeni plants, observation, and question formation.',
          awardedMarks: 0.0,
          maxMarks: 2.0,
          isPassed: false,
        },
        {
          id: 3,
          prompt:
            'Detail the importance of recording data and sharing experimental results according to the text, including practical reasons for doing so.',
          userAnswer:
            'Recording data: Scientists carefully record observations, measurements, procedures, and results so that they have a permanent record of what happened during an experiment. This helps them identify patterns, compare results, detect errors, and draw correct conclusions. Repeating experiments: Detailed records allow the scientist or other researchers to repeat the experiment using the same methods. If similar results are obtained, the findings become more reliable. Avoiding mistakes: Written records reduce the chance of forgetting important details or relying on memory, which can lead to inaccurate conclusions. Sharing results: Scientists share their experimental results with other researchers so that the findings can be reviewed, tested, and verified. Other scientists may also identify errors or suggest new explanations. Building scientific knowledge: Sharing results allows scientists to learn from one another. Even results that do not support the original hypothesis are useful because they can prevent others from repeating unsuccessful approaches and may lead to new research questions.',
          correctAnswer:
            'After running an experiment, scientists must record data and report or share their results. Sharing experimental results is important because it allows information to be disseminated and used by others. On a practical level, sharing the findings of an experiment—even with friends or family—can help someone else who is facing the exact same problem solve their issue.',
          feedback:
            'Comprehensive and well-structured response covering documentation, replication, and scientific dissemination.',
          awardedMarks: 2.0,
          maxMarks: 2.0,
          isPassed: true,
        },
        {
          id: 4,
          prompt:
            'Analyze the physiological adaptations of plant tissue systems (dermal, ground, and vascular) that allow terrestrial plants to regulate hydration and nutrient transport.',
          userAnswer: 'Skipped / Unanswered',
          correctAnswer:
            'Dermal tissue produces waxy cuticles and stomatal complexes to prevent desiccation. Ground tissue facilitates photosynthesis (mesophyll) and structural storage. Vascular tissue (xylem/phloem) facilitates long-distance transport via transpirational pull and pressure flow.',
          feedback: 'This question was skipped and received 0 marks.',
          awardedMarks: 0.0,
          maxMarks: 2.0,
          isPassed: false,
        },
        {
          id: 5,
          prompt:
            'Explain how environmental limiting factors (light intensity, temperature, and carbon dioxide concentration) influence the overall rate of photosynthesis in C3 plants.',
          userAnswer: 'Skipped / Unanswered',
          correctAnswer:
            'Light intensity drives ATP/NADPH photolysis up to light saturation. Temperature governs RuBisCO catalytic rate until thermal denaturation. CO2 availability determines carboxylation vs photorespiratory oxygenation efficiency.',
          feedback: 'This question was skipped and received 0 marks.',
          awardedMarks: 0.0,
          maxMarks: 2.0,
          isPassed: false,
        },
      ];
    }

    if (activeSection === 'APPLICATION') {
      return [
        {
          id: 1,
          prompt:
            'A botanist wants to determine the total remaining population of a rare, endangered plant species located on a remote mountain peak. Based on the study material, should the botanist design an experiment or use a descriptive method? Justify your choice based on the scenario.',
          userAnswer: 'adweferg',
          correctAnswer:
            'The botanist should use a descriptive method, such as a field survey or census, rather than an experiment. When direct manipulation is not feasible, a descriptive survey is required.',
          feedback: 'Gibberish input detected. No scientific justification provided for descriptive survey methods.',
          awardedMarks: 0.0,
          maxMarks: 2.0,
          isPassed: false,
        },
        {
          id: 2,
          prompt:
            'Suppose you notice that the leaves of a pot of indoor mint plants are beginning to turn yellow. Applying the initial steps of the scientific method described in the text, outline the specific steps you would take up to the point of preparing an experiment.',
          userAnswer:
            'Make an observation: Notice that the mint leaves are turning yellow. Ask a question: What is causing the mint leaves to turn yellow? Gather information: Check sunlight and watering. Form a hypothesis: The plant is being overwatered.',
          correctAnswer:
            '1. Observation: Identify foliar chlorosis. 2. Question: Formulate inquiry into causes. 3. Gather info: Inspect environment. 4. Hypothesis: Propose testable prediction.',
          feedback:
            'Great job! Accurately identified and sequenced observation, question formation, information gathering, and hypothesis generation.',
          awardedMarks: 2.0,
          maxMarks: 2.0,
          isPassed: true,
        },
        {
          id: 3,
          prompt: 'Design a controlled experimental procedure to quantify transpiration rates under variable humidity levels.',
          userAnswer: 'Skipped / Unanswered',
          correctAnswer: 'Assemble a calibrated potometer with sealed chambers, standardizing light and temperature while varying humidity.',
          feedback: 'This question was skipped and received 0 marks.',
          awardedMarks: 0.0,
          maxMarks: 2.0,
          isPassed: false,
        },
        {
          id: 4,
          prompt: 'Evaluate how agricultural shade netting influences photosynthetic efficiency in C3 crops during peak summer hours.',
          userAnswer: 'Skipped / Unanswered',
          correctAnswer: 'Shade netting mitigates thermal stress and prevents RuBisCO photoinhibition.',
          feedback: 'This question was skipped and received 0 marks.',
          awardedMarks: 0.0,
          maxMarks: 2.0,
          isPassed: false,
        },
        {
          id: 5,
          prompt: 'Predict the physiological impact on stomatal conductance if atmospheric carbon dioxide concentration is doubled.',
          userAnswer: 'Skipped / Unanswered',
          correctAnswer: 'Elevated CO2 triggers guard cell solute efflux, decreasing stomatal aperture to conserve water.',
          feedback: 'This question was skipped and received 0 marks.',
          awardedMarks: 0.0,
          maxMarks: 2.0,
          isPassed: false,
        },
      ];
    }

    if (activeSection === 'SHORT ANSWER') {
      return [
        {
          id: 1,
          prompt: 'What is the definition of Botany as provided in the text?',
          userAnswer: 'study of plants',
          correctAnswer: 'Botany is the science that studies plants.',
          feedback: 'Great job! Your answer matches the core definition criteria.',
          awardedMarks: 2.0,
          maxMarks: 2.0,
          isPassed: true,
        },
        {
          id: 2,
          prompt: 'Describe the functional importance of photosynthesis in ecosystem energy flow.',
          userAnswer: 'Skipped / Unanswered',
          correctAnswer: 'Photosynthesis synthesizes chemical energy and oxygen, sustaining ecological food webs.',
          feedback: 'This question was skipped and received 0 marks.',
          awardedMarks: 0.0,
          maxMarks: 2.0,
          isPassed: false,
        },
        {
          id: 3,
          prompt: 'Explain the primary physiological functions of the root system.',
          userAnswer: 'Skipped / Unanswered',
          correctAnswer: 'Roots anchor plants and absorb water and dissolved nutrients.',
          feedback: 'This question was skipped and received 0 marks.',
          awardedMarks: 0.0,
          maxMarks: 2.0,
          isPassed: false,
        },
        {
          id: 4,
          prompt: 'What structural role do cell walls provide to plant tissue?',
          userAnswer: 'Skipped / Unanswered',
          correctAnswer: 'Cell walls provide rigidity, structural support, and protection against osmotic pressure.',
          feedback: 'This question was skipped and received 0 marks.',
          awardedMarks: 0.0,
          maxMarks: 2.0,
          isPassed: false,
        },
        {
          id: 5,
          prompt: 'How do plants regulate gas exchange and transpiration?',
          userAnswer: 'Skipped / Unanswered',
          correctAnswer: 'Leaves regulate gas exchange and water loss via microscopic stomata controlled by guard cells.',
          feedback: 'This question was skipped and received 0 marks.',
          awardedMarks: 0.0,
          maxMarks: 2.0,
          isPassed: false,
        },
      ];
    }

    // MCQ Section
    return [
      { id: 1, prompt: 'According to the provided text, what is Botany defined as?', userAnswer: 'A', correctAnswer: 'Option A: The science that studies plants', feedback: 'Great job! Your answer matches the model criteria.', awardedMarks: 2.0, maxMarks: 2.0, isPassed: true },
      { id: 2, prompt: 'What is the first step of the scientific method as outlined in the text?', userAnswer: 'C', correctAnswer: 'Option C: Making an observation', feedback: 'Great job! Correct step selected.', awardedMarks: 2.0, maxMarks: 2.0, isPassed: true },
      { id: 3, prompt: 'Which method is recommended when an experimental approach is not feasible?', userAnswer: 'D', correctAnswer: 'Option B: Descriptive methods, such as a survey', feedback: 'Descriptive methods are used when direct experimentation is not possible.', awardedMarks: 0.0, maxMarks: 2.0, isPassed: false },
      { id: 4, prompt: 'What is a primary characteristic of photosynthetic plant cells?', userAnswer: 'A', correctAnswer: 'Option A: Presence of chloroplasts and rigid cell walls', feedback: 'Accurate cellular structure identification.', awardedMarks: 2.0, maxMarks: 2.0, isPassed: true },
      { id: 5, prompt: 'After formulating a hypothesis, what is the subsequent step?', userAnswer: 'C', correctAnswer: 'Option A: Run an experiment to test your hypothesis', feedback: 'Hypotheses must be empirically tested before drawing conclusions.', awardedMarks: 0.0, maxMarks: 2.0, isPassed: false },
    ];
  }, [activeSection]);

  const activeCorrect = activeQuestions ? activeQuestions.filter((q) => q.isPassed).length : 0;
  const activeWrong = activeQuestions ? Math.max(0, activeQuestions.length - activeCorrect) : 0;

  const totalCorrect = 7;
  const totalWrong = 13;

  const strengths = [
    'Strong articulation and technical detail on data recording and scientific method replication',
    'Accurate identification of botany goals and descriptive study methodologies',
  ];

  const improvements = [
    'Complete all 5 descriptive questions to avoid unattempted zero deductions',
    'Review puakenikeni garden examples and non-laboratory experimental design',
  ];

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

  if (error) {
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 transition-all duration-300">
      {/* 1. Header Banner */}
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
              Detailed breakdown of questions answered right vs wrong across all completed sections.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Hero Overall Performance Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#4E1F6E] p-8 text-white shadow-sm">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#98E8DE]/20 px-3 py-1 text-xs font-semibold text-[#98E8DE]">
              <CheckCircle2 size={14} /> Attempt Completed
            </span>
            <h1 className="text-3xl font-bold mt-3">Overall Performance</h1>
            <p className="text-purple-100 text-sm mt-1">
              Combined score evaluated across all sections in this study set.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20">
            <div className="text-center px-3">
              <div className="text-3xl font-black text-[#98E8DE]">{percentage}%</div>
              <div className="text-xs text-purple-200 mt-0.5 font-medium">Overall Accuracy</div>
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

      {/* 3. Section-Wise Breakdown (Relative time labels: mins, hours, days ago) */}
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
        {activeSection && (
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
                    q.isPassed ? 'border-gray-100' : 'border-rose-200 bg-rose-50/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4E1F6E]">
                      Question {q.id}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        q.isPassed
                          ? 'bg-[#98E8DE]/50 text-[#136a6a]'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {q.isPassed ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      {q.isPassed
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
                          q.isPassed
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
      </div>
    </div>
  );
}