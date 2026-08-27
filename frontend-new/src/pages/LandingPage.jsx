import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  BrainCircuit,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Clock,
  Award,
  ChevronRight,
  ChevronDown,
  Layers,
  Check,
  Bell,
  Zap,
  Activity,
  Sun,
  Moon,
  Code2,
  ExternalLink,
  Cpu,
  FileText,
  RotateCcw,
} from 'lucide-react';

const GithubIcon = ({ size = 15, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon = ({ size = 15, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const TwitterIcon = ({ size = 15, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const DiscordIcon = ({ size = 15, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6h0a14.5 14.5 0 0 0-4-1.2 12.3 12.3 0 0 0-.6 1.3 13.6 13.6 0 0 0-4.8 0 12.3 12.3 0 0 0-.6-1.3A14.5 14.5 0 0 0 4 6a15.8 15.8 0 0 0-2 11.7A14.8 14.8 0 0 0 6.8 20a10.9 10.9 0 0 0 1-1.6 9.6 9.6 0 0 1-1.5-.7c.1-.1.3-.2.4-.3a10.6 10.6 0 0 0 10.6 0c.1.1.3.2.4.3-.5.3-1 .5-1.5.7.3.5.6 1.1 1 1.6a14.8 14.8 0 0 0 4.8-2.3A15.8 15.8 0 0 0 18 6ZM8.5 15.5c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
  </svg>
);

export default function LandingPage({ onNavigate }) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Simulation Intro States
  const [isIntroRunning, setIsIntroRunning] = useState(true);
  const [introProgress, setIntroProgress] = useState(0);
  const [introPhase, setIntroPhase] = useState(0);

  // UI Interactive States
  const [openFaq, setOpenFaq] = useState(null);
  const [taskDone, setTaskDone] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [selectedEval, setSelectedEval] = useState('mcq');

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  const toggleFaq = (idx) => setOpenFaq(openFaq === idx ? null : idx);

  const evalTiers = [
    { id: 'mcq', label: '=', title: 'Direct Recall (MCQs)' },
    { id: 'short', label: '•|', title: 'Concise Short Form' },
    { id: 'long', label: '≡', title: 'Long Form Synthesis' },
    { id: 'case', label: '+', title: 'Scenario Application' },
  ];

  const teamMembers = [
    { name: 'Aditee', initials: 'AD', github: 'https://github.com' },
    { name: 'Sandra', initials: 'SD', github: 'https://github.com' },
    { name: 'Shanallie', initials: 'SN', github: 'https://github.com' },
    { name: 'Riya', initials: 'RY', github: 'https://github.com' },
    { name: 'Nyla', initials: 'NY', github: 'https://github.com' },
  ];

  const features = [
    {
      icon: BookOpen,
      title: 'Study Set Ingestion',
      desc: 'Upload notes, textbook PDFs, or syllabus materials to automatically structure your curriculum.',
    },
    {
      icon: BrainCircuit,
      title: 'Adaptive Multi-Tier Quizzes',
      desc: 'Test your understanding across MCQs, Short Answers, Long Answers, and Application-based questions.',
    },
    {
      icon: TrendingUp,
      title: 'Synaptic Performance Tracking',
      desc: 'Get precise scoring breakdown, correct vs. incorrect analytics, and actionable improvement feedback.',
    },
    {
      icon: Clock,
      title: 'Exam Simulation Timers',
      desc: 'Practice under real exam constraints with section-wise countdowns and auto-submit validation.',
    },
    {
      icon: ShieldCheck,
      title: 'Rubric Criteria Matching',
      desc: 'Descriptive essays are evaluated against required technical keywords, laws, and proofs.',
    },
    {
      icon: Award,
      title: 'Concept Retention Curves',
      desc: 'Track historical attempts and section-by-section mastery before walking into your test room.',
    },
  ];

  const faqs = [
    {
      q: 'What files can I upload?',
      a: 'You can upload lecture slides (PPTX/PDF), textbook chapters (PDF), raw markdown documents, and course syllabus outlines. Our parser automatically extracts, cleans, and indexes content into retrieval-ready vectors.',
    },
    {
      q: 'How are essays graded?',
      a: 'Descriptive answers are evaluated against a rubric generated directly from your uploaded materials. The system verifies essential technical keywords, scientific laws, logical proofs, and structured explanations rather than relying on shallow exact-string matching.',
    },
    {
      q: 'Can I simulate a real exam?',
      a: 'Yes. You can configure section-wise time constraints, strict per-question limits, and auto-submit timers that accurately replicate midterm and final exam environments without distracting answer previews.',
    },
    {
      q: 'Is there a free plan?',
      a: 'Yes. The Free tier allows you to create active study sets, ingest course documents, and run adaptive 4-tier assessments with instant criteria-based scoring.',
    },
  ];

  // Simulation Sequencer
  useEffect(() => {
    if (!isIntroRunning) return;

    const interval = setInterval(() => {
      setIntroProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsIntroRunning(false), 900);
          return 100;
        }
        const nextVal = prev + 1;
        if (nextVal > 25 && nextVal <= 55) setIntroPhase(1);
        else if (nextVal > 55 && nextVal <= 85) setIntroPhase(2);
        else if (nextVal > 85) setIntroPhase(3);
        return nextVal;
      });
    }, 55);

    return () => clearInterval(interval);
  }, [isIntroRunning]);

  const triggerReplay = () => {
    setIntroProgress(0);
    setIntroPhase(0);
    setIsIntroRunning(true);
  };

  return (
    <div
      className={`relative min-h-screen flex flex-col justify-between overflow-x-hidden transition-colors duration-500 font-sans selection:bg-[#38BDF8] selection:text-[#0E131F] ${
        isDarkMode ? 'bg-[#0E131F] text-[#E2E8F0]' : 'bg-[#F8FAFC] text-[#1E293B]'
      }`}
    >
      <style>{`
        @keyframes laserFlowSmooth {
          0% { stroke-dashoffset: 1200; }
          100% { stroke-dashoffset: 0; }
        }

        @keyframes corePulseCalm {
          0%, 100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 25px rgba(56, 189, 248, 0.7)); }
          50% { transform: scale(1.05) rotate(180deg); filter: drop-shadow(0 0 55px rgba(56, 189, 248, 1)); }
        }

        @keyframes floatSymbol {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-14px) rotate(8deg); opacity: 0.9; }
        }

        @keyframes floatHeroSmooth {
          0%, 100% { transform: perspective(1600px) rotateY(-8deg) rotateX(4deg) translateY(0px); }
          50% { transform: perspective(1600px) rotateY(-2deg) rotateX(1deg) translateY(-8px); }
        }

        @keyframes cyanSpinner {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .hero-dashboard-entrance {
          animation: floatHeroSmooth 8s ease-in-out infinite;
        }

        .laser-smooth-stream {
          stroke-dasharray: 600;
          animation: laserFlowSmooth 5s linear infinite;
        }

        .engine-core-smooth {
          animation: corePulseCalm 6s ease-in-out infinite;
        }

        .sym-float-1 { animation: floatSymbol 4.5s ease-in-out infinite; }
        .sym-float-2 { animation: floatSymbol 5.5s ease-in-out infinite 1s; }
        .sym-float-3 { animation: floatSymbol 5s ease-in-out infinite 2s; }

        .frosted-backplate-dark {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
          backdrop-filter: blur(28px);
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          box-shadow: 
            -25px 35px 70px -10px rgba(0, 0, 0, 0.7),
            0 0 40px rgba(56, 189, 248, 0.08),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.3),
            inset 0 -1.5px 2px rgba(0, 0, 0, 0.4);
        }

        .frosted-backplate-light {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%);
          backdrop-filter: blur(28px);
          border: 1.5px solid rgba(255, 255, 255, 0.9);
          box-shadow: 
            -25px 35px 70px -10px rgba(79, 70, 229, 0.15),
            0 10px 30px -5px rgba(15, 23, 42, 0.05),
            inset 0 2px 3px rgba(255, 255, 255, 1),
            inset 0 -2px 3px rgba(203, 213, 225, 0.4);
        }

        .porcelain-slab-raised {
          background: #EAF0F6;
          border: 1.5px solid #FFFFFF;
          box-shadow: 
            8px 12px 24px -4px rgba(0, 0, 0, 0.3),
            -2px -2px 6px rgba(255, 255, 255, 0.12),
            inset 0 2px 3px #FFFFFF,
            inset 0 -2px 3px rgba(148, 163, 184, 0.4);
        }

        .porcelain-slab-raised-light {
          background: #FFFFFF;
          border: 1.5px solid #FFFFFF;
          box-shadow: 
            0 10px 22px -3px rgba(15, 23, 42, 0.06),
            0 2px 6px -1px rgba(15, 23, 42, 0.02),
            inset 0 1.5px 2px #FFFFFF;
        }

        .dark-control-bar {
          background: linear-gradient(145deg, #1E2536 0%, #151B2A 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 
            0 10px 20px -3px rgba(0, 0, 0, 0.6),
            inset 0 1px 1.5px rgba(255, 255, 255, 0.15),
            inset 0 -1.5px 2px rgba(0, 0, 0, 0.8);
        }

        .cyan-ring-active {
          border: 3px solid transparent;
          border-top-color: #38BDF8;
          border-right-color: #38BDF8;
          animation: cyanSpinner 3s linear infinite;
        }

        .glow-neon-cyan {
          box-shadow: 0 0 18px rgba(56, 189, 248, 0.7);
        }

        .theme-switch-capsule {
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(255, 255, 255, 0.1);
        }
        .theme-switch-thumb {
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35), inset 0 1px 1.5px rgba(255, 255, 255, 0.8);
        }
      `}</style>

      {/* ================= PRE-LAUNCH SIMULATION OVERLAY ================= */}
      {isIntroRunning && (
        <div className="fixed inset-0 z-50 bg-[#070A13] flex flex-col items-center justify-center p-6 select-none overflow-hidden animate-in fade-in duration-500">
          
          <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:28px_28px] opacity-40 pointer-events-none" />
          <div className="absolute w-[800px] h-[800px] rounded-full bg-cyan-500/10 blur-[160px] pointer-events-none" />

          {/* Skip Button */}
          <button
            onClick={() => setIsIntroRunning(false)}
            className="absolute top-8 right-8 px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-cyan-400 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>Skip Calibration</span>
            <ArrowRight size={13} />
          </button>

          {/* Kinetic Stage */}
          <div className="relative w-full max-w-5xl h-[380px] flex items-center justify-center">
            
            {/* Mathematical Tokens */}
            <div className="sym-float-1 absolute left-[28%] top-16 text-cyan-300/80 font-mono text-xs font-bold pointer-events-none">
              ∇·E = ρ/ε₀
            </div>
            <div className="sym-float-2 absolute left-[34%] bottom-20 text-indigo-300/80 font-mono text-xs font-bold pointer-events-none">
              ∮ B·dl = μ₀I
            </div>
            <div className="sym-float-3 absolute right-[32%] top-20 text-cyan-300/80 font-mono text-xs font-bold pointer-events-none">
              λ_retention = 0.94
            </div>

            {/* 1. Left: Floating Syllabus Document Hologram */}
            <div
              className={`absolute left-2 sm:left-10 top-1/2 -translate-y-1/2 w-52 h-72 rounded-3xl bg-cyan-950/40 border border-cyan-500/40 p-4 shadow-[0_0_40px_rgba(56,189,248,0.25)] transition-all duration-700 backdrop-blur-md ${
                introPhase >= 1 ? 'scale-105 border-cyan-400 bg-cyan-950/60' : 'opacity-80'
              }`}
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-cyan-500/30">
                <div className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-cyan-300 uppercase">
                  <FileText size={13} /> SYLLABUS
                </div>
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              
              <div className="space-y-2 pt-3 text-[8.5px] font-mono text-cyan-200/80">
                <div className="h-2 w-full bg-cyan-500/20 rounded-sm" />
                <div className="h-2 w-4/5 bg-cyan-500/20 rounded-sm" />
                <div className="h-2 w-full bg-cyan-500/20 rounded-sm" />
                <div className="h-2 w-2/3 bg-cyan-500/20 rounded-sm" />
                
                <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mt-4 space-y-1">
                  <div className="flex justify-between text-[9px] font-bold text-cyan-300">
                    <span>Vector Ingestion</span>
                    <span className="font-mono">SBERT-384</span>
                  </div>
                  <p className="text-[8px] text-cyan-100/70">Segmenting Ch 4: Bioenergetics &amp; Thermodynamics...</p>
                </div>
              </div>
            </div>

            {/* 2. Middle: Dual Laser Particle Conduits */}
            <svg className="w-full h-full absolute inset-0 pointer-events-none" viewBox="0 0 900 400">
              <defs>
                <linearGradient id="streamGradSmooth" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#38BDF8" stopOpacity="1" />
                  <stop offset="100%" stopColor="#818CF8" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              
              <path
                d="M 270 200 C 370 120, 400 200, 450 200"
                fill="none"
                stroke="url(#streamGradSmooth)"
                strokeWidth="4"
                className="laser-smooth-stream"
              />
              <path
                d="M 270 200 C 360 280, 410 200, 450 200"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2.5"
                strokeDasharray="8 8"
                className="laser-smooth-stream"
              />
              <path
                d="M 450 200 C 510 200, 560 140, 630 200"
                fill="none"
                stroke="url(#streamGradSmooth)"
                strokeWidth="3.5"
                className="laser-smooth-stream"
              />
            </svg>

            {/* 3. Center: Holographic Turbine Reactor Core */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="engine-core-smooth relative h-32 w-32 rounded-full bg-gradient-to-tr from-cyan-950 via-slate-900 to-indigo-950 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_60px_rgba(56,189,248,0.8)]">
                <div className="absolute inset-2 rounded-full border border-dashed border-cyan-300 animate-spin" />
                <div className="absolute inset-4 rounded-full border border-dotted border-indigo-400 animate-ping" />
                <Cpu size={42} className="text-cyan-300 animate-pulse" />
              </div>
              <span className="text-[9.5px] font-mono font-black tracking-widest text-cyan-400 uppercase mt-3.5 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/40">
                SYNAPTIC EVALUATION ENGINE
              </span>
            </div>

            {/* 4. Right: Compiled HUD Deck Hologram */}
            <div
              className={`absolute right-2 sm:right-10 top-1/2 -translate-y-1/2 w-52 h-72 rounded-3xl bg-slate-900/85 border border-indigo-500/40 p-4 shadow-[0_0_40px_rgba(99,102,241,0.35)] transition-all duration-700 backdrop-blur-md ${
                introPhase >= 2 ? 'scale-105 border-cyan-400 opacity-100 bg-slate-900' : 'opacity-60'
              }`}
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10 text-[10px] font-bold text-slate-300">
                <span>COMPILED HUD</span>
                <span className="text-cyan-400 font-mono text-[9px]">READY</span>
              </div>
              <div className="space-y-2 pt-3">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[9px] text-slate-300 font-bold flex items-center justify-between">
                  <span>Adaptive MCQs</span>
                  <span className="text-emerald-400">4/4 OK</span>
                </div>
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[9px] text-slate-300 font-bold flex items-center justify-between">
                  <span>Rubrics Synthesis</span>
                  <span className="text-emerald-400">100%</span>
                </div>
                <div className="p-2 rounded-xl bg-cyan-950/70 border border-cyan-500/30 text-[9px] text-cyan-300 font-bold flex items-center justify-between">
                  <span>Evaluation Ready</span>
                  <span className="text-cyan-400 font-mono">ACTIVE</span>
                </div>
              </div>
            </div>

          </div>

          {/* Progress Bar & Phase Status */}
          <div className="w-full max-w-md space-y-3.5 text-center mt-4 z-10">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
              <span className="flex items-center gap-2">
                <Zap size={14} className="text-cyan-400 animate-bounce" />
                {introPhase === 0 && 'Ingesting Syllabus Structure...'}
                {introPhase === 1 && 'Synthesizing ChromaDB Semantic Vectors...'}
                {introPhase === 2 && 'Calibrating Multi-Tier Evaluation Rubrics...'}
                {introPhase === 3 && 'Launching Cognitive HUD Study Deck...'}
              </span>
              <span className="text-cyan-400 font-black text-sm">{introProgress}%</span>
            </div>

            <div className="h-2.5 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-cyan-500/30">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full transition-all duration-150 shadow-[0_0_15px_rgba(56,189,248,0.9)]"
                style={{ width: `${introProgress}%` }}
              />
            </div>
          </div>

        </div>
      )}

      {/* Atmospheric Background Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {isDarkMode ? (
          <>
            <div className="absolute top-[-10%] right-[-5%] h-[800px] w-[800px] rounded-full bg-gradient-to-bl from-[#38BDF8]/15 via-[#6366F1]/15 to-transparent blur-[140px]" />
            <div className="absolute top-[35%] left-[-15%] h-[700px] w-[700px] rounded-full bg-gradient-to-tr from-[#3B82F6]/15 via-transparent to-transparent blur-[140px]" />
          </>
        ) : (
          <>
            <div className="absolute top-[-10%] right-[-5%] h-[750px] w-[750px] rounded-full bg-gradient-to-bl from-[#6366F1]/15 via-[#A855F7]/10 to-transparent blur-[130px]" />
            <div className="absolute top-[35%] left-[-15%] h-[680px] w-[680px] rounded-full bg-gradient-to-tr from-[#38BDF8]/15 via-[#818CF8]/10 to-transparent blur-[130px]" />
          </>
        )}
      </div>

      {/* Top Navbar */}
      <header
        className={`relative z-30 sticky top-0 border-b backdrop-blur-xl transition-colors duration-300 ${
          isDarkMode ? 'border-white/10 bg-[#0E131F]/80' : 'border-slate-200/80 bg-white/80'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg ${
                isDarkMode
                  ? 'bg-gradient-to-br from-[#38BDF8] to-[#4F46E5] text-white shadow-cyan-500/20'
                  : 'bg-[#4F46E5] text-white shadow-[#4F46E5]/25'
              }`}
            >
              <Sparkles size={22} className="stroke-[2.2]" />
            </div>
            <span className={`font-black text-xl tracking-tight ${isDarkMode ? 'text-white' : 'text-[#0F172A]'}`}>
              AI STUDY ENGINE
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Replay Simulation Trigger */}
            <button
              onClick={triggerReplay}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                isDarkMode
                  ? 'bg-white/5 border-white/10 text-slate-300 hover:text-cyan-400 hover:bg-white/10'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 shadow-2xs'
              }`}
              title="Replay Pre-Launch Simulation"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Simulation</span>
            </button>

            {/* Custom Neumorphic Day/Night Capsule Switch */}
            <div
              onClick={toggleTheme}
              className={`theme-switch-capsule relative flex items-center w-20 h-10 p-1 rounded-full cursor-pointer transition-all duration-300 select-none ${
                isDarkMode ? 'bg-[#151D2F] border border-cyan-500/30' : 'bg-[#E2E8F0] border border-slate-300'
              }`}
              title={isDarkMode ? 'Switch to Day Mode' : 'Switch to Night Mode'}
            >
              <div
                className={`theme-switch-thumb absolute w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ease-out z-10 ${
                  isDarkMode
                    ? 'translate-x-10 bg-gradient-to-tr from-[#1E293B] to-[#0F172A] text-cyan-400 border border-cyan-400/40 shadow-[0_0_12px_rgba(56,189,248,0.5)]'
                    : 'translate-x-0 bg-white text-amber-500 border border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                }`}
              >
                {isDarkMode ? <Moon size={15} /> : <Sun size={15} />}
              </div>

              <div className="w-full flex justify-between items-center px-2 text-[10px] font-black pointer-events-none">
                <Sun size={13} className={`${!isDarkMode ? 'opacity-0' : 'text-slate-500'}`} />
                <Moon size={13} className={`${isDarkMode ? 'opacity-0' : 'text-slate-400'}`} />
              </div>
            </div>

            <button
              onClick={() => onNavigate && onNavigate('about')}
              className={`text-sm font-bold transition cursor-pointer px-4 py-2 ${
                isDarkMode ? 'text-slate-300 hover:text-[#38BDF8]' : 'text-slate-600 hover:text-[#4F46E5]'
              }`}
            >
              About Us
            </button>
            <button
              onClick={() => onNavigate && onNavigate('login')}
              className={`rounded-2xl px-6 py-2.5 text-sm font-black transition hover:-translate-y-0.5 cursor-pointer shadow-md ${
                isDarkMode
                  ? 'bg-[#38BDF8] text-[#0E131F] shadow-cyan-500/25 hover:bg-[#7DD3FC]'
                  : 'bg-[#4F46E5] text-white shadow-[#4F46E5]/25 hover:bg-[#4338CA]'
              }`}
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Headline & Actions */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold border ${
                isDarkMode ? 'bg-cyan-950/60 border-cyan-500/30 text-[#38BDF8]' : 'bg-[#EEF2FF] border-[#C7D2FE] text-[#4338CA]'
              }`}
            >
              <span className={`flex h-2 w-2 rounded-full animate-pulse ${isDarkMode ? 'bg-[#38BDF8]' : 'bg-[#4F46E5]'}`} />
              Next-Gen Cognitive Study HUD
            </div>

            <h1 className={`text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] ${isDarkMode ? 'text-white' : 'text-[#0F172A]'}`}>
              Turn your course material into{' '}
              <span className="bg-gradient-to-r from-[#38BDF8] via-[#818CF8] to-[#C084FC] bg-clip-text text-transparent">
                instant mastery.
              </span>
            </h1>

            <p className={`text-base sm:text-lg font-medium leading-relaxed max-w-lg ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Structured study sets, multi-tier exam simulation, and automated criteria evaluation with real-time retention tracking.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => onNavigate && onNavigate('signup')}
                className={`rounded-2xl px-8 py-4 text-sm font-black shadow-lg transition hover:shadow-xl hover:-translate-y-0.5 cursor-pointer inline-flex items-center gap-2 ${
                  isDarkMode ? 'bg-[#38BDF8] text-[#0E131F] shadow-cyan-500/30 hover:bg-[#7DD3FC]' : 'bg-[#4F46E5] text-white shadow-[#4F46E5]/30 hover:bg-[#4338CA]'
                }`}
              >
                Launch Study Engine
                <ArrowRight size={17} />
              </button>
              <button
                onClick={() => onNavigate && onNavigate('about')}
                className={`rounded-2xl border px-8 py-4 text-sm font-bold shadow-xs transition hover:-translate-y-0.5 cursor-pointer ${
                  isDarkMode ? 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10' : 'bg-white border-slate-200 text-[#0F172A] hover:bg-slate-50'
                }`}
              >
                Learn How It Works
              </button>
            </div>

            <div className={`flex items-center gap-6 pt-2 text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className={isDarkMode ? 'text-[#38BDF8]' : 'text-emerald-600'} /> Multi-Tier Synthesis
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className={isDarkMode ? 'text-[#38BDF8]' : 'text-emerald-600'} /> Instant Rubric Grading
              </span>
            </div>
          </div>

          {/* 3D Glass HUD Dashboard Deck */}
          <div className="lg:col-span-7 relative [perspective:1600px] flex justify-center py-4">
            <div
              className={`hero-dashboard-entrance w-full max-w-[650px] rounded-[44px] p-7 grid grid-cols-12 gap-6 items-start ${
                isDarkMode ? 'frosted-backplate-dark' : 'frosted-backplate-light'
              }`}
            >
              {/* Left Column Controls */}
              <div className="col-span-7 space-y-4 text-left">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setActiveTab('default')}
                    className={`px-4 py-1.5 rounded-2xl text-[11px] font-black transition cursor-pointer ${
                      activeTab === 'default'
                        ? isDarkMode
                          ? 'porcelain-slab-raised text-[#0E131F]'
                          : 'bg-white text-[#4F46E5] shadow-xs'
                        : isDarkMode
                        ? 'text-slate-400 hover:text-white bg-white/5'
                        : 'text-slate-500 hover:text-slate-900 bg-slate-100'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-1.5 rounded-2xl text-[11px] font-black transition cursor-pointer ${
                      activeTab === 'active'
                        ? isDarkMode
                          ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/40 border border-blue-400'
                          : 'bg-[#4F46E5] text-white shadow-md shadow-[#4F46E5]/30'
                        : isDarkMode
                        ? 'text-slate-400 hover:text-white bg-white/5'
                        : 'text-slate-500 hover:text-slate-900 bg-slate-100'
                    }`}
                  >
                    Active Session
                  </button>
                </div>

                {/* 1. Today's Tasks */}
                <div className={`rounded-3xl p-4 text-[#0E131F] space-y-2.5 ${isDarkMode ? 'porcelain-slab-raised' : 'porcelain-slab-raised-light'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black">Today's Tasks</h4>
                      <p className="text-[9px] text-slate-500">Stay on top of your study goals</p>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  <div
                    onClick={() => setTaskDone(!taskDone)}
                    className="bg-[#D8E2EC]/70 rounded-2xl p-2.5 flex items-center justify-between cursor-pointer transition hover:bg-[#D8E2EC]"
                  >
                    <div>
                      <span className={`text-[11px] font-black block ${taskDone ? 'line-through text-slate-400' : 'text-[#0F172A]'}`}>
                        Review Calculus notes
                      </span>
                      <span className="text-[9px] text-slate-500">30 minutes</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl text-[10px] font-bold text-emerald-700 shadow-2xs">
                      <Check size={11} className="stroke-[3]" /> Done
                    </div>
                  </div>
                </div>

                {/* 2. Study Set Progress */}
                <div className={`rounded-3xl p-4 text-[#0E131F] space-y-3 ${isDarkMode ? 'porcelain-slab-raised' : 'porcelain-slab-raised-light'}`}>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                      <Layers size={13} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black">Study Set Progress</h4>
                      <p className="text-[9px] text-slate-500">How far you've gotten through each set</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-700">
                        <span>Calculus II</span>
                        <span>4/4</span>
                      </div>
                      <div className="h-2 w-full bg-[#D8E2EC] rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full w-full" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-700">
                        <span>Physics 101</span>
                        <span>2/4</span>
                      </div>
                      <div className="h-2 w-full bg-[#D8E2EC] rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-[#0F172A] rounded-full w-1/2" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-700">
                        <span>Psychology</span>
                        <span>1/4</span>
                      </div>
                      <div className="h-2 w-full bg-[#D8E2EC] rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-amber-600 rounded-full w-1/4" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Control Strip with Cyan Animated Progress Ring (Numbers Removed) */}
                <div className="dark-control-bar rounded-3xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {evalTiers.map((tier) => (
                      <button
                        key={tier.id}
                        onClick={() => setSelectedEval(tier.id)}
                        className={`h-7 w-7 rounded-xl flex items-center justify-center text-xs font-black cursor-pointer transition ${
                          selectedEval === tier.id
                            ? 'bg-[#38BDF8] text-[#0E131F] shadow-sm shadow-cyan-400/40'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        {tier.label}
                      </button>
                    ))}
                  </div>

                  {/* Clean Animated Progress Ring Indicator without Numbers */}
                  <div className="relative h-9 w-9 rounded-full border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.35)] shrink-0">
                    <div className="absolute inset-0 rounded-full cyan-ring-active" />
                    <div className="h-3 w-3 rounded-full bg-cyan-400/40 blur-xs" />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className={`col-span-5 space-y-4 text-left border-l pl-5 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                {/* Upcoming Exams */}
                <div className="space-y-2">
                  <span className={`text-[9px] font-black uppercase tracking-wider block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Upcoming Exams
                  </span>

                  <div className="space-y-2">
                    <div className="border-l-2 border-slate-400 pl-2.5 py-0.5 flex justify-between items-start">
                      <div>
                        <span className={`text-[11px] font-bold block leading-tight ${isDarkMode ? 'text-slate-200' : 'text-[#0F172A]'}`}>
                          Calculus II
                        </span>
                        <span className="text-[8.5px] text-slate-400">Midterm • 3 days</span>
                      </div>
                      <span className="text-[8.5px] font-bold text-slate-400">Oct 15</span>
                    </div>

                    <div className="border-l-2 border-slate-400 pl-2.5 py-0.5 flex justify-between items-start">
                      <div>
                        <span className={`text-[11px] font-bold block leading-tight ${isDarkMode ? 'text-slate-200' : 'text-[#0F172A]'}`}>
                          Physics 101
                        </span>
                        <span className="text-[8.5px] text-slate-400">Quiz • 6 days</span>
                      </div>
                      <span className="text-[8.5px] font-bold text-slate-400">Oct 18</span>
                    </div>
                  </div>
                </div>

                {/* Activity Calendar Matrix */}
                <div className={`pt-2 border-t space-y-2 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="h-4 w-4 rounded-md bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                        <Activity size={10} />
                      </div>
                      <span className={`text-[10px] font-black ${isDarkMode ? 'text-slate-200' : 'text-[#0F172A]'}`}>
                        Activity
                      </span>
                    </div>
                    <span className="text-[8px] text-slate-400 font-semibold">Current Schedule</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-[7px] font-bold text-slate-400">
                    <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-bold text-slate-500">
                    <span className="opacity-0">0</span><span className="opacity-0">0</span><span className="opacity-0">0</span><span className="opacity-0">0</span><span className="opacity-0">0</span>
                    <span>1</span><span>2</span>
                    <span>3</span>
                    <span className="h-4 w-4 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center text-[7.5px] shadow-2xs">4</span>
                    <span className="h-4 w-4 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center text-[7.5px] shadow-2xs">5</span>
                    <span>6</span>
                    <span className="h-4 w-4 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center text-[7.5px] shadow-2xs">7</span>
                    <span>8</span><span>9</span>
                    <span className="h-4 w-4 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center text-[7.5px] shadow-2xs">10</span>
                    <span className="h-4 w-4 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center text-[7.5px] shadow-2xs">11</span>
                    <span>12</span><span>13</span>
                    <span className="h-4 w-4 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center text-[7.5px] shadow-2xs">14</span>
                    <span>15</span>
                    <span className="h-4 w-4 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center text-[7.5px] shadow-2xs">16</span>
                    <span>17</span><span>18</span>
                    <span className="h-4 w-4 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center text-[7.5px] shadow-2xs">19</span>
                    <span className="h-4 w-4 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center text-[7.5px] shadow-2xs">20</span>
                    <span>21</span><span>22</span>
                    <span className="h-4 w-4 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center text-[7.5px] shadow-2xs">23</span>
                    <span>24</span><span>25</span>
                    <span className="h-4 w-4 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center text-[7.5px] shadow-2xs">26</span>
                    <span className="h-4 w-4 mx-auto rounded-full bg-[#1E293B] text-white flex items-center justify-center text-[7.5px] border border-slate-500">27</span>
                    <span>28</span><span>29</span><span>30</span>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-1 text-[7.5px] font-bold text-slate-400">
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Studied
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#1E293B] border border-slate-500" /> Today
                    </div>
                  </div>
                </div>

                {/* Micro Ingestion */}
                <div className={`pt-2 border-t space-y-1.5 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                  <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest block">
                    Micro Ingestion
                  </span>
                  <div className={`rounded-2xl px-3 py-1.5 flex items-center justify-between text-[10px] font-black ${isDarkMode ? 'porcelain-slab-raised text-[#0E131F]' : 'porcelain-slab-raised-light text-[#0F172A]'}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-[#3B82F6] flex items-center justify-center text-white text-[8px]">
                        +
                      </span>
                      <span>Syllabus Chunk</span>
                    </div>
                    <ChevronDown size={12} className="text-slate-500" />
                  </div>
                </div>

                {/* Notification Tile */}
                <div className="dark-control-bar rounded-2xl px-3 py-1.5 flex items-center justify-between text-[9.5px] font-bold text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#38BDF8] glow-neon-cyan" />
                    <span>Evaluation Ready</span>
                  </div>
                  <Bell size={11} className="text-slate-400" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-8 w-full">
        <div className="text-center space-y-2 mb-8">
          <span
            className={`text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full border ${
              isDarkMode ? 'text-[#38BDF8] bg-cyan-950/60 border-cyan-500/30' : 'text-indigo-600 bg-indigo-50 border-indigo-200'
            }`}
          >
            Comprehensive Study Suite
          </span>
          <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-[#0F172A]'}`}>
            Everything You Need to Ace Your Exams
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className={`rounded-3xl p-7 shadow-xs hover:-translate-y-1.5 transition-all duration-300 space-y-4 text-left flex flex-col justify-between ${
                  isDarkMode
                    ? 'bg-white/[0.03] border border-white/10 hover:border-cyan-500/40 backdrop-blur-md'
                    : 'bg-white border border-slate-200/80 hover:border-indigo-300 shadow-sm'
                }`}
              >
                <div className="space-y-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                      isDarkMode ? 'bg-cyan-950/80 border border-cyan-500/30 text-[#38BDF8]' : 'bg-indigo-50 text-[#4F46E5]'
                    }`}
                  >
                    <Icon size={24} className="stroke-[2.2]" />
                  </div>
                  <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {feat.title}
                  </h3>
                  <p className={`text-xs leading-relaxed font-normal ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {feat.desc}
                  </p>
                </div>

                <div className={`pt-2 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                  <button
                    onClick={() => onNavigate && onNavigate('about')}
                    className={`inline-flex items-center gap-1 text-xs font-bold transition cursor-pointer ${
                      isDarkMode ? 'text-[#38BDF8] hover:text-cyan-300' : 'text-indigo-600 hover:text-indigo-800'
                    }`}
                  >
                    Learn more <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-16 w-full text-center space-y-10">
        <div className="space-y-2">
          <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-[#0F172A]'}`}>
            Questions, answered
          </h2>
          <p className={`text-sm max-w-md mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Everything you need to know about our syllabus ingestion, testing tiers, and criteria rubrics.
          </p>
        </div>

        <div className={`divide-y text-left border-t border-b ${isDarkMode ? 'divide-white/10 border-white/10' : 'divide-slate-200 border-slate-200'}`}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="py-5 transition-colors">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between gap-4 text-left group cursor-pointer focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`text-base sm:text-lg font-extrabold tracking-tight transition-colors ${
                      isOpen
                        ? isDarkMode
                          ? 'text-[#38BDF8]'
                          : 'text-[#4F46E5]'
                        : isDarkMode
                        ? 'text-slate-200 group-hover:text-[#38BDF8]'
                        : 'text-[#0F172A] group-hover:text-[#4F46E5]'
                    }`}
                  >
                    {faq.q}
                  </span>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-300 ${
                      isOpen
                        ? isDarkMode
                          ? 'rotate-180 bg-cyan-950 text-[#38BDF8]'
                          : 'rotate-180 bg-indigo-50 text-[#4F46E5]'
                        : isDarkMode
                        ? 'text-slate-400 group-hover:text-white'
                        : 'text-slate-400 group-hover:text-[#0F172A]'
                    }`}
                  >
                    <ChevronDown size={18} />
                  </div>
                </button>

                {isOpen && (
                  <div className={`pt-3 pb-1 text-sm font-normal leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <div
          className={`rounded-3xl p-8 sm:p-12 text-center text-white shadow-xl space-y-6 ${
            isDarkMode
              ? 'bg-gradient-to-r from-cyan-950 via-[#1E1B4B] to-slate-900 border border-cyan-500/30'
              : 'bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] shadow-[#4F46E5]/20'
          }`}
        >
          <h3 className="text-2xl sm:text-4xl font-black tracking-tight">
            Ready to start your next study session?
          </h3>
          <p className={`text-xs sm:text-sm max-w-md mx-auto leading-relaxed ${isDarkMode ? 'text-cyan-100/80' : 'text-indigo-100'}`}>
            Upload your lecture slides and test yourself with multi-tier adaptive assessments.
          </p>
          <button
            onClick={() => onNavigate && onNavigate('signup')}
            className={`rounded-2xl px-8 py-4 text-sm font-black shadow-lg transition hover:scale-105 cursor-pointer ${
              isDarkMode ? 'bg-[#38BDF8] text-[#0E131F] shadow-cyan-500/30 hover:bg-[#7DD3FC]' : 'bg-white text-[#4F46E5] hover:bg-slate-50'
            }`}
          >
            Create Free Account
          </button>
        </div>
      </section>

      {/* ================= STREAMLINED MODERN FOOTER ================= */}
      <footer
        className={`relative z-20 border-t transition-colors duration-500 overflow-hidden text-left ${
          isDarkMode ? 'border-white/10 bg-[#070A12] text-[#94A3B8]' : 'border-slate-200 bg-[#F8FAFC] text-[#64748B]'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
          
          {/* Top Section: Logo, Quote, and Repo Badge */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-md ${
                    isDarkMode
                      ? 'bg-gradient-to-br from-[#38BDF8] to-[#4F46E5] text-white shadow-cyan-500/20'
                      : 'bg-[#4F46E5] text-white shadow-[#4F46E5]/25'
                  }`}
                >
                  <Sparkles size={16} className="stroke-[2.2]" />
                </div>
                <span className={`font-black text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-[#0F172A]'}`}>
                  AI STUDY ENGINE
                </span>
              </div>
              
              <p className="text-xs text-slate-400 italic">
                "Empowering deep conceptual recall through intelligent curriculum synthesis."
              </p>
            </div>

            {/* GitHub Repository Quick Link */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                isDarkMode
                  ? 'bg-white/5 border-white/10 text-slate-300 hover:text-cyan-300 hover:bg-white/10 hover:border-cyan-500/30'
                  : 'bg-white border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              <Code2 size={14} className={isDarkMode ? 'text-cyan-400' : 'text-indigo-600'} />
              <span>GitHub Repository</span>
              <ExternalLink size={11} className="opacity-60" />
            </a>
          </div>

          {/* Middle Section: Contributors Placeholders */}
          <div className="space-y-3">
            <span className={`text-[11px] font-black uppercase tracking-wider block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Engineering Contributors
            </span>

            <div className="flex flex-wrap items-center gap-2.5">
              {teamMembers.map((member, idx) => (
                <a
                  key={idx}
                  href={member.github}
                  target="_blank"
                  rel="noreferrer"
                  className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition duration-200 cursor-pointer ${
                    isDarkMode
                      ? 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:border-cyan-500/40 hover:text-cyan-300'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 shadow-2xs'
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-md flex items-center justify-center text-[9px] font-black ${
                      isDarkMode ? 'bg-cyan-950 text-cyan-400' : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {member.initials}
                  </span>
                  <span>{member.name}</span>
                  <GithubIcon size={11} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </div>

          {/* Bottom Section: Copyright & Social Channels */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs text-slate-400 font-medium">
            <p>© {new Date().getFullYear()} AI Study Engine Research Group.</p>

            <div className="flex items-center gap-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isDarkMode
                    ? 'bg-white/5 border-white/10 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 hover:bg-white/10'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-[#4F46E5] hover:bg-slate-50 shadow-2xs'
                }`}
                aria-label="GitHub"
              >
                <GithubIcon size={13} />
              </a>

              <a
                href="https://discord.com"
                target="_blank"
                rel="noreferrer"
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isDarkMode
                    ? 'bg-white/5 border-white/10 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 hover:bg-white/10'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-[#4F46E5] hover:bg-slate-50 shadow-2xs'
                }`}
                aria-label="Discord"
              >
                <DiscordIcon size={13} />
              </a>

              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isDarkMode
                    ? 'bg-white/5 border-white/10 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 hover:bg-white/10'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-[#4F46E5] hover:bg-slate-50 shadow-2xs'
                }`}
                aria-label="LinkedIn"
              >
                <LinkedinIcon size={13} />
              </a>

              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isDarkMode
                    ? 'bg-white/5 border-white/10 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 hover:bg-white/10'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-[#4F46E5] hover:bg-slate-50 shadow-2xs'
                }`}
                aria-label="Twitter"
              >
                <TwitterIcon size={13} />
              </a>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}