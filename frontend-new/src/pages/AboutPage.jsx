import React from 'react';
import {
  Sparkles,
  ArrowLeft,
  FolderPlus,
  FileUp,
  Sliders,
  CheckSquare,
  BarChart2,
  Award,
  Target,
  Lightbulb,
  Code2,
  ExternalLink,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Terminal,
  BookOpen,
  ArrowUpRight,
  Lock,
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

export default function AboutPage({ onNavigate, isDarkMode = true }) {
  const tiers = [
    {
      tier: 'Tier 01',
      title: 'Foundational Recall',
      badge: 'MCQs',
      desc: 'Rapid-fire verification of key definitions, core formulas, and fundamental vocabulary to build active retrieval speed and eliminate cognitive hesitation.',
    },
    {
      tier: 'Tier 02',
      title: 'Concise Articulation',
      badge: 'Short Answers',
      desc: 'Targeted prompts that evaluate precision, ensuring you can explain core principles concisely without relying on multiple-choice process of elimination.',
    },
    {
      tier: 'Tier 03',
      title: 'Structured Synthesis',
      badge: 'Long Essays',
      desc: 'In-depth descriptive questions graded against strict rubric criteria, checking for comprehensive domain terminology, logical flow, and theoretical proofs.',
    },
    {
      tier: 'Tier 04',
      title: 'Contextual Application',
      badge: 'Case Scenarios',
      desc: 'Complex, situational problem sets that test your ability to diagnose scenarios, apply multi-step reasoning, and solve real exam-grade challenges.',
    },
  ];

  const steps = [
    {
      num: '01',
      icon: FolderPlus,
      title: 'Create a Study Set',
      desc: 'Organize your subjects by creating dedicated sets for midterms, finals, or individual course chapters.',
    },
    {
      num: '02',
      icon: FileUp,
      title: 'Upload Your Notes',
      desc: 'Drop in your PDF notes, slides, or textbook excerpts to build your custom syllabus knowledge base.',
    },
    {
      num: '03',
      icon: Sliders,
      title: 'Customize Your Test',
      desc: 'Pick your question types (MCQs, Short Answers, Long Essays, or Case Scenarios) and set your pace.',
    },
    {
      num: '04',
      icon: CheckSquare,
      title: 'Take the Assessment',
      desc: 'Solve questions under real exam conditions with clean formatting and dedicated response fields.',
    },
    {
      num: '05',
      icon: Sparkles,
      title: 'Get Instant AI Grading',
      desc: 'Receive side-by-side answer comparisons, score breakdowns, and constructive keyword feedback.',
    },
    {
      num: '06',
      icon: BarChart2,
      title: 'Track Performance',
      desc: 'Check your Progress tab to see section accuracy, historical attempts, and targeted revision tips.',
    },
  ];

  const values = [
    {
      icon: Target,
      title: 'Precision Evaluation',
      desc: 'Evaluates long-form explanations and technical terminology against study materials, not just basic multiple choice.',
    },
    {
      icon: Lightbulb,
      title: 'Context-Aware Generation',
      desc: 'Synthesizes course materials to test both direct definitions and high-level critical thinking scenarios.',
    },
    {
      icon: Award,
      title: 'Actionable Insights',
      desc: 'Provides section-by-section accuracy, time-relative reviews, and identified strengths to prioritize revision.',
    },
  ];

  const teamMembers = [
    {
      name: 'Aditee',
      initials: 'AD',
      role: 'Full-Stack Engineer',
      focus: 'Service Integration',
      badgeColor: isDarkMode ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-200',
      glowColor: 'from-cyan-500/30 to-blue-500/10',
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
    },
    {
      name: 'Sandra',
      initials: 'SD',
      role: 'Platform Engineer',
      focus: 'Architecture & CI/CD',
      badgeColor: isDarkMode ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200',
      glowColor: 'from-indigo-500/30 to-purple-500/10',
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
    },
    {
      name: 'Shanallie',
      initials: 'SN',
      role: 'RAG & Vector Lead',
      focus: 'Embedding & ChromaDB',
      badgeColor: isDarkMode ? 'bg-purple-950/80 text-purple-300 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200',
      glowColor: 'from-purple-500/30 to-pink-500/10',
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
    },
    {
      name: 'Riya',
      initials: 'RY',
      role: 'Evaluation Architect',
      focus: 'Semantic Rubrics',
      badgeColor: isDarkMode ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      glowColor: 'from-emerald-500/30 to-teal-500/10',
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
    },
    {
      name: 'Nyla',
      initials: 'NY',
      role: 'Frontend Experience',
      focus: '3D Simulation HUD',
      badgeColor: isDarkMode ? 'bg-amber-950/80 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200',
      glowColor: 'from-amber-500/30 to-orange-500/10',
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
    },
  ];

  return (
    <div
      className={`relative min-h-screen flex flex-col justify-between overflow-x-hidden transition-colors duration-500 ${
        isDarkMode
          ? 'bg-[#0E131F] text-[#E2E8F0] selection:bg-[#38BDF8] selection:text-[#0E131F]'
          : 'bg-[#F8FAFC] text-[#1E293B] selection:bg-[#4F46E5] selection:text-white'
      }`}
    >
      <style>{`
        /* Mission Slabs */
        .mission-slab-dark {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
          backdrop-filter: blur(28px);
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          box-shadow: 
            -20px 30px 60px -10px rgba(0, 0, 0, 0.7),
            0 0 35px rgba(56, 189, 248, 0.08),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.25),
            inset 0 -1.5px 2px rgba(0, 0, 0, 0.4);
        }

        .mission-slab-light {
          background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 50%, #EEF2FF 100%);
          border: 1.5px solid rgba(255, 255, 255, 0.95);
          box-shadow: 
            0 25px 50px -12px rgba(79, 70, 229, 0.12),
            0 10px 25px -5px rgba(15, 23, 42, 0.04),
            inset 0 2px 4px rgba(255, 255, 255, 1);
        }

        /* Card Elevations */
        .card-elevated-dark {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(16px);
          box-shadow: 
            0 14px 28px -6px rgba(0, 0, 0, 0.5),
            inset 0 1px 1px rgba(255, 255, 255, 0.1);
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .card-elevated-dark:hover {
          transform: translateY(-5px);
          border-color: rgba(56, 189, 248, 0.45);
          box-shadow: 
            0 20px 40px -8px rgba(0, 0, 0, 0.7),
            0 0 20px rgba(56, 189, 248, 0.2),
            inset 0 1px 1px rgba(255, 255, 255, 0.2);
        }

        .card-elevated-light {
          background: #FFFFFF;
          border: 1.5px solid rgba(255, 255, 255, 0.95);
          box-shadow: 
            0 14px 28px -6px rgba(15, 23, 42, 0.05),
            0 4px 10px -2px rgba(15, 23, 42, 0.02),
            inset 0 1.5px 2px rgba(255, 255, 255, 1);
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .card-elevated-light:hover {
          transform: translateY(-5px);
          border-color: rgba(99, 102, 241, 0.35);
          box-shadow: 
            0 24px 45px -8px rgba(79, 70, 229, 0.14),
            0 8px 18px -4px rgba(79, 70, 229, 0.06),
            inset 0 1.5px 2px #FFFFFF;
        }
      `}</style>

      {/* Atmospheric Background Meshes */}
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
          isDarkMode
            ? 'border-white/10 bg-[#0E131F]/80'
            : 'border-slate-200/80 bg-white/80'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <button
            onClick={() => onNavigate && onNavigate('landing')}
            className={`inline-flex items-center gap-2 text-sm font-bold transition cursor-pointer px-4 py-2 rounded-xl border ${
              isDarkMode
                ? 'bg-white/5 border-white/10 text-slate-300 hover:text-[#38BDF8] hover:bg-white/10'
                : 'bg-white border-slate-200/80 text-slate-600 hover:text-[#4F46E5] shadow-2xs hover:bg-slate-50'
            }`}
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>

          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-md ${
                isDarkMode
                  ? 'bg-gradient-to-br from-[#38BDF8] to-[#4F46E5] text-white shadow-cyan-500/20'
                  : 'bg-[#4F46E5] text-white shadow-[#4F46E5]/25'
              }`}
            >
              <Sparkles size={18} className="stroke-[2.2]" />
            </div>
            <span
              className={`font-black text-lg tracking-tight ${
                isDarkMode ? 'text-white' : 'text-[#0F172A]'
              }`}
            >
              AI STUDY ENGINE
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 space-y-16 flex-1">
        
        {/* Header Section */}
        <div className="space-y-4 text-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold border ${
              isDarkMode
                ? 'bg-cyan-950/60 border-cyan-500/30 text-[#38BDF8]'
                : 'bg-[#EEF2FF] border-[#C7D2FE] text-[#4338CA]'
            }`}
          >
            <span
              className={`flex h-2 w-2 rounded-full animate-pulse ${
                isDarkMode ? 'bg-[#38BDF8]' : 'bg-[#4F46E5]'
              }`}
            />
            About the Platform
          </div>

          <h1
            className={`text-3xl sm:text-5xl font-black tracking-tight leading-[1.12] ${
              isDarkMode ? 'text-white' : 'text-[#0F172A]'
            }`}
          >
            Bridging Curriculum Ingestion &amp;{' '}
            <span className="bg-gradient-to-r from-[#38BDF8] via-[#818CF8] to-[#C084FC] bg-clip-text text-transparent">
              Cognitive Assessment
            </span>
          </h1>

          <p
            className={`text-sm sm:text-base max-w-2xl mx-auto font-medium leading-relaxed ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            AI Study Engine transforms unstructured study documents into rigorous, interactive assessments that replicate real examination environments.
          </p>
        </div>

        {/* Comprehensive Mission & Cognitive Depth Slab */}
        <div
          className={`rounded-[36px] p-8 sm:p-12 relative overflow-hidden text-left space-y-6 ${
            isDarkMode ? 'mission-slab-dark' : 'mission-slab-light'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                isDarkMode
                  ? 'bg-cyan-950/80 text-[#38BDF8] border-cyan-500/30'
                  : 'bg-indigo-50 text-[#4F46E5] border-indigo-100'
              }`}
            >
              <Zap size={16} />
            </div>
            <span
              className={`text-xs font-black uppercase tracking-widest ${
                isDarkMode ? 'text-[#38BDF8]' : 'text-[#4F46E5]'
              }`}
            >
              Our Mission
            </span>
          </div>

          <h2
            className={`text-2xl sm:text-3xl font-black tracking-tight max-w-2xl leading-snug ${
              isDarkMode ? 'text-white' : 'text-[#0F172A]'
            }`}
          >
            Empowering Efficient, Measurable Learning
          </h2>

          <div
            className={`space-y-4 text-sm sm:text-base leading-relaxed font-normal max-w-4xl ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            <p>
              Rote memorization only scratches the surface of true comprehension. Most conventional study tools reward surface-level pattern recognition, leaving students underprepared for high-stakes examinations that demand critical synthesis.
            </p>
            <p>
              AI Study Engine bridges this gap by transforming raw course materials into a dynamic cognitive benchmark. By dissecting complex syllabi into progressive evaluation tiers, our platform ensures you don't just recognize terms—you master the underlying mechanics, formulate coherent technical arguments, and apply concepts across real-world problem scenarios.
            </p>
          </div>

          {/* Quick Advantage Indicators */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t ${
              isDarkMode ? 'border-white/10' : 'border-slate-200/70'
            }`}
          >
            <div
              className={`flex items-center gap-2 text-xs font-bold ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              <CheckCircle2 size={16} className={isDarkMode ? 'text-[#38BDF8]' : 'text-[#4F46E5]'} /> Automated Keyword &amp; Rubrics
            </div>
            <div
              className={`flex items-center gap-2 text-xs font-bold ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              <CheckCircle2 size={16} className={isDarkMode ? 'text-[#38BDF8]' : 'text-[#4F46E5]'} /> Targeted Knowledge Gap Profiling
            </div>
            <div
              className={`flex items-center gap-2 text-xs font-bold ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              <CheckCircle2 size={16} className={isDarkMode ? 'text-[#38BDF8]' : 'text-[#4F46E5]'} /> Exam-Simulated Constraint Practice
            </div>
          </div>
        </div>

        {/* 4-Tier Cognitive Mastery Hierarchy */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full border ${
                isDarkMode
                  ? 'text-[#38BDF8] bg-cyan-950/60 border-cyan-500/30'
                  : 'text-indigo-600 bg-indigo-50 border-indigo-100/60'
              }`}
            >
              Assessment Framework
            </span>
            <h2
              className={`text-2xl sm:text-3xl font-black tracking-tight ${
                isDarkMode ? 'text-white' : 'text-[#0F172A]'
              }`}
            >
              The 4-Tier Cognitive Mastery Hierarchy
            </h2>
            <p
              className={`text-xs sm:text-sm max-w-md mx-auto ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Progressive evaluation levels designed to move students from basic recall to advanced application.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {tiers.map((t, idx) => (
              <div
                key={idx}
                className={`rounded-3xl p-7 text-left space-y-3 flex flex-col justify-between ${
                  isDarkMode ? 'card-elevated-dark' : 'card-elevated-light'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                      isDarkMode
                        ? 'text-[#38BDF8] bg-cyan-950/80 border-cyan-500/30'
                        : 'text-[#4F46E5] bg-indigo-50 border-indigo-100'
                    }`}
                  >
                    {t.tier}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                      isDarkMode
                        ? 'text-slate-300 bg-white/10'
                        : 'text-slate-500 bg-slate-100'
                    }`}
                  >
                    {t.badge}
                  </span>
                </div>
                <div>
                  <h3
                    className={`text-lg font-bold ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {t.title}
                  </h3>
                  <p
                    className={`text-xs sm:text-sm leading-relaxed mt-1.5 font-normal ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    {t.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How to Use Section */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full border ${
                isDarkMode
                  ? 'text-[#38BDF8] bg-cyan-950/60 border-cyan-500/30'
                  : 'text-indigo-600 bg-indigo-50 border-indigo-100/60'
              }`}
            >
              User Guide
            </span>
            <h2
              className={`text-2xl sm:text-3xl font-black tracking-tight ${
                isDarkMode ? 'text-white' : 'text-[#0F172A]'
              }`}
            >
              How to Use the Platform
            </h2>
            <p
              className={`text-xs sm:text-sm max-w-md mx-auto ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Follow these simple steps from uploading your materials to reviewing your test results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {steps.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className={`rounded-3xl p-6 space-y-4 text-left flex flex-col justify-between ${
                    isDarkMode ? 'card-elevated-dark' : 'card-elevated-light'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                        isDarkMode
                          ? 'bg-cyan-950/80 text-[#38BDF8] border-cyan-500/30'
                          : 'bg-indigo-50 text-indigo-600 border-white shadow-xs'
                      }`}
                    >
                      <Icon size={22} className="stroke-[2.2]" />
                    </div>
                    <span
                      className={`text-2xl font-black ${
                        isDarkMode ? 'text-slate-600' : 'text-slate-300'
                      }`}
                    >
                      {item.num}
                    </span>
                  </div>
                  <div>
                    <h3
                      className={`text-base font-bold ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {item.title}
                    </h3>
                    <p
                      className={`text-xs leading-relaxed font-normal mt-1 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Core Engine Features */}
        <div className="space-y-6">
          <h3
            className={`text-xl font-black text-center sm:text-left ${
              isDarkMode ? 'text-white' : 'text-[#0F172A]'
            }`}
          >
            Core Engine Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {values.map((val, idx) => {
              const Icon = val.icon;
              return (
                <div
                  key={idx}
                  className={`rounded-3xl p-6 space-y-3 text-left ${
                    isDarkMode ? 'card-elevated-dark' : 'card-elevated-light'
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                      isDarkMode
                        ? 'bg-cyan-950/80 text-[#38BDF8] border-cyan-500/30'
                        : 'bg-indigo-50 text-indigo-600 border-white shadow-xs'
                    }`}
                  >
                    <Icon size={20} className="stroke-[2.2]" />
                  </div>
                  <h4
                    className={`text-sm font-bold ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {val.title}
                  </h4>
                  <p
                    className={`text-xs leading-relaxed font-normal ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {val.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Banner */}
        <div
          className={`rounded-3xl p-8 sm:p-12 text-center text-white shadow-xl space-y-6 ${
            isDarkMode
              ? 'bg-gradient-to-r from-cyan-950 via-[#1E1B4B] to-slate-900 border border-cyan-500/30'
              : 'bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] shadow-[#4F46E5]/20'
          }`}
        >
          <h3 className="text-2xl sm:text-4xl font-black tracking-tight">
            Ready to start your first session?
          </h3>
          <p
            className={`text-xs sm:text-sm max-w-md mx-auto leading-relaxed ${
              isDarkMode ? 'text-cyan-100/80' : 'text-indigo-100'
            }`}
          >
            Upload your lecture slides and test yourself with multi-tier adaptive assessments.
          </p>
          <button
            onClick={() => onNavigate && onNavigate('signup')}
            className={`rounded-2xl px-8 py-4 text-sm font-black shadow-lg transition hover:scale-105 cursor-pointer ${
              isDarkMode
                ? 'bg-[#38BDF8] text-[#0E131F] shadow-cyan-500/30 hover:bg-[#7DD3FC]'
                : 'bg-white text-[#4F46E5] hover:bg-slate-50'
            }`}
          >
            Create Free Account
          </button>
        </div>

        {/* Team Section */}
        <div className="space-y-6 pt-4 text-left">
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${
              isDarkMode ? 'border-white/10' : 'border-slate-200'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span
                  className={`text-xs font-black uppercase tracking-widest ${
                    isDarkMode ? 'text-[#38BDF8]' : 'text-indigo-600'
                  }`}
                >
                  Engineering &amp; Research Group
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Architects of the synaptic evaluation models, vector indexing pipelines, and real-time simulator.
              </p>
            </div>

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition duration-300 border self-start sm:self-auto cursor-pointer ${
                isDarkMode
                  ? 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:border-cyan-500/50 hover:text-cyan-300 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 shadow-xs'
              }`}
            >
              <Code2 size={15} className={isDarkMode ? 'text-cyan-400' : 'text-indigo-600'} />
              <span>View Main Repository</span>
              <ExternalLink size={12} className="opacity-70" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {teamMembers.map((member, idx) => (
              <div
                key={idx}
                className={`group relative rounded-[28px] p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 border overflow-hidden ${
                  isDarkMode
                    ? 'bg-[#131B2E]/90 border-white/10 hover:border-cyan-400/50 hover:shadow-[0_15px_30px_rgba(56,189,248,0.15)]'
                    : 'bg-white border-slate-200/80 hover:border-indigo-400 hover:shadow-[0_20px_35px_rgba(79,70,229,0.12)]'
                }`}
              >
                <div
                  className={`absolute -top-12 -right-12 w-28 h-28 rounded-full bg-gradient-to-br ${member.glowColor} blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="relative">
                      <div
                        className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-sm tracking-wider transition-transform duration-300 group-hover:scale-105 border ${
                          isDarkMode
                            ? 'bg-gradient-to-br from-cyan-950 to-slate-900 border-cyan-500/40 text-[#38BDF8] shadow-inner'
                            : 'bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 text-[#4F46E5] shadow-xs'
                        }`}
                      >
                        {member.initials}
                      </div>
                      <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 border border-slate-900" />
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-md ${
                        isDarkMode ? 'text-slate-500 bg-white/5' : 'text-slate-400 bg-slate-100'
                      }`}
                    >
                      0{idx + 1}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4
                      className={`text-sm font-black tracking-tight ${
                        isDarkMode ? 'text-white' : 'text-[#0F172A]'
                      }`}
                    >
                      {member.name}
                    </h4>
                    <span
                      className={`text-[11px] font-bold block leading-tight ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {member.role}
                    </span>
                  </div>

                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9.5px] font-extrabold border ${member.badgeColor}`}
                  >
                    <Zap size={10} />
                    {member.focus}
                  </div>
                </div>

                <div
                  className={`pt-4 mt-4 border-t flex items-center justify-between gap-2 ${
                    isDarkMode ? 'border-white/5' : 'border-slate-100'
                  }`}
                >
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-bold transition border cursor-pointer ${
                      isDarkMode
                        ? 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-cyan-300 hover:border-cyan-500/30'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
                    }`}
                  >
                    <GithubIcon size={12} /> GitHub
                  </a>

                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className={`p-1.5 rounded-xl transition border cursor-pointer flex items-center justify-center ${
                      isDarkMode
                        ? 'bg-white/5 border-white/5 text-slate-400 hover:text-cyan-300 hover:bg-white/10 hover:border-cyan-500/30'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200'
                    }`}
                    aria-label="LinkedIn"
                  >
                    <LinkedinIcon size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Streamlined Footer */}
      <footer
        className={`relative z-20 border-t transition-colors duration-500 overflow-hidden text-left ${
          isDarkMode ? 'border-white/10 bg-[#070A12] text-[#94A3B8]' : 'border-slate-200 bg-[#F8FAFC] text-[#64748B]'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
          
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