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
  Layers,
  BrainCircuit,
  BookOpen,
  FileText,
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

const GlobeIcon = ({ size = 15, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

export default function AboutPage({ onNavigate }) {
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
    { name: 'Member 1', initials: 'M1', role: 'Developer', github: 'https://github.com' },
    { name: 'Member 2', initials: 'M2', role: 'Developer', github: 'https://github.com' },
    { name: 'Member 3', initials: 'M3', role: 'Developer', github: 'https://github.com' },
    { name: 'Member 4', initials: 'M4', role: 'Developer', github: 'https://github.com' },
    { name: 'Member 5', initials: 'M5', role: 'EDevelop', github: 'https://github.com' },
  ];

  return (
    <div className="relative min-h-screen bg-[#F4F7FA] text-[#1E293B] flex flex-col justify-between overflow-x-hidden selection:bg-[#4F46E5] selection:text-white">
      <style>{`
        .mission-slab-elevated {
          background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 50%, #EEF2FF 100%);
          border: 1.5px solid rgba(255, 255, 255, 0.95);
          box-shadow: 
            0 25px 50px -12px rgba(79, 70, 229, 0.12),
            0 10px 25px -5px rgba(15, 23, 42, 0.04),
            inset 0 2px 4px rgba(255, 255, 255, 1);
        }

        .card-elevated-3d {
          background: #FFFFFF;
          border: 1.5px solid rgba(255, 255, 255, 0.95);
          box-shadow: 
            0 14px 28px -6px rgba(15, 23, 42, 0.05),
            0 4px 10px -2px rgba(15, 23, 42, 0.02),
            inset 0 1.5px 2px rgba(255, 255, 255, 1);
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .card-elevated-3d:hover {
          transform: translateY(-5px);
          border-color: rgba(99, 102, 241, 0.35);
          box-shadow: 
            0 24px 45px -8px rgba(79, 70, 229, 0.14),
            0 8px 18px -4px rgba(79, 70, 229, 0.06),
            inset 0 1.5px 2px #FFFFFF;
        }
      `}</style>

      {/* Ambient Lighting */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 right-[-10%] h-[680px] w-[680px] rounded-full bg-gradient-to-bl from-[#6366F1]/15 via-[#A855F7]/10 to-transparent blur-[120px]" />
        <div className="absolute top-[35%] -left-32 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-[#38BDF8]/15 via-[#818CF8]/10 to-transparent blur-[120px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-30 sticky top-0 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <button
            onClick={() => onNavigate('landing')}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#4F46E5] transition cursor-pointer px-4 py-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>
          
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#4F46E5] text-white shadow-md shadow-[#4F46E5]/25">
              <Sparkles size={18} className="stroke-[2.2]" />
            </div>
            <span className="font-black text-lg text-[#0F172A] tracking-tight">AI STUDY ENGINE</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 space-y-16 flex-1">
        
        {/* Header Section */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] px-4 py-1.5 text-xs font-bold text-[#4338CA]">
            <span className="flex h-2 w-2 rounded-full bg-[#4F46E5] animate-pulse" />
            About the Platform
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#0F172A] tracking-tight leading-[1.12]">
            Bridging Curriculum Ingestion &amp;{' '}
            <span className="bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#EC4899] bg-clip-text text-transparent">
              Cognitive Assessment
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
            AI Study Engine transforms unstructured study documents into rigorous, interactive assessments that replicate real examination environments.
          </p>
        </div>

        {/* Comprehensive Mission & Cognitive Depth Slab */}
        <div className="mission-slab-elevated rounded-[36px] p-8 sm:p-12 relative overflow-hidden text-left space-y-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-100/70 via-purple-50/50 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-[#4F46E5] border border-indigo-100">
              <Zap size={16} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-[#4F46E5]">
              Our Mission
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight max-w-2xl leading-snug">
            Empowering Efficient, Measurable Learning
          </h2>

          <div className="space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed font-normal max-w-4xl">
            <p>
              Rote memorization only scratches the surface of true comprehension. Most conventional study tools reward surface-level pattern recognition, leaving students underprepared for high-stakes examinations that demand critical synthesis.
            </p>
            <p>
              AI Study Engine bridges this gap by transforming raw course materials into a dynamic cognitive benchmark. By dissecting complex syllabi into progressive evaluation tiers, our platform ensures you don't just recognize terms—you master the underlying mechanics, formulate coherent technical arguments, and apply concepts across real-world problem scenarios.
            </p>
          </div>

          {/* Quick Advantage Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-200/70">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <CheckCircle2 size={16} className="text-[#4F46E5]" /> Automated Keyword &amp; Rubrics
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <CheckCircle2 size={16} className="text-[#4F46E5]" /> Targeted Knowledge Gap Profiling
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <CheckCircle2 size={16} className="text-[#4F46E5]" /> Exam-Simulated Constraint Practice
            </div>
          </div>
        </div>

        {/* 4-Tier Cognitive Mastery Hierarchy */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-100/60 shadow-2xs">
              Assessment Framework
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
              The 4-Tier Cognitive Mastery Hierarchy
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Progressive evaluation levels designed to move students from basic recall to advanced application.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {tiers.map((t, idx) => (
              <div
                key={idx}
                className="card-elevated-3d rounded-3xl p-7 text-left space-y-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#4F46E5] bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    {t.tier}
                  </span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    {t.badge}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{t.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1.5 font-normal">
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
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-100/60 shadow-2xs">
              User Guide
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">How to Use the Platform</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Follow these simple steps from uploading your materials to reviewing your test results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {steps.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="card-elevated-3d rounded-3xl p-6 space-y-4 text-left flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-white shadow-xs">
                      <Icon size={22} className="stroke-[2.2]" />
                    </div>
                    <span className="text-2xl font-black text-slate-300">{item.num}</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-normal mt-1">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Core Engine Features */}
        <div className="space-y-6">
          <h3 className="text-xl font-black text-[#0F172A] text-center sm:text-left">Core Engine Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {values.map((val, idx) => {
              const Icon = val.icon;
              return (
                <div key={idx} className="card-elevated-3d rounded-3xl p-6 space-y-3 text-left">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-white shadow-xs">
                    <Icon size={20} className="stroke-[2.2]" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{val.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">{val.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="rounded-3xl bg-white border border-slate-200/80 p-8 sm:p-10 text-center space-y-4 shadow-sm">
          <h3 className="text-xl sm:text-2xl font-black text-[#0F172A]">Ready to start your first session?</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Upload your materials and begin your first adaptive synaptic assessment.
          </p>
          <button
            onClick={() => onNavigate('signup')}
            className="rounded-2xl bg-[#4F46E5] px-8 py-3.5 text-xs font-bold text-white shadow-md shadow-[#4F46E5]/25 hover:bg-[#4338CA] transition hover:scale-105 cursor-pointer"
          >
            Create Free Account
          </button>
        </div>

        {/* Team Members Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Engineering &amp; Research Team
            </span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#4F46E5] transition"
            >
              <Code2 size={14} />
              View Main Repository
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {teamMembers.map((member, idx) => (
              <div
                key={idx}
                className="card-elevated-3d rounded-2xl p-4 flex flex-col items-center text-center space-y-2.5"
              >
                <div className="h-11 w-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-black text-[#4F46E5]">
                  {member.initials}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{member.name}</h4>
                  <span className="text-[10px] text-slate-400 block">{member.role}</span>
                </div>
                <a
                  href={member.github}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition border border-indigo-100/60"
                >
                  GitHub <ExternalLink size={10} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white/80 backdrop-blur-xl py-8 mt-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-medium gap-4">
          <p>© {new Date().getFullYear()} AI Study Engine. All rights reserved.</p>
          
          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-[#4F46E5] transition"
              aria-label="GitHub"
            >
              <GithubIcon size={15} />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-[#4F46E5] transition"
              aria-label="LinkedIn"
            >
              <LinkedinIcon size={15} />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-[#4F46E5] transition"
              aria-label="Twitter"
            >
              <TwitterIcon size={15} />
            </a>
            <a
              href="https://example.com"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-[#4F46E5] transition"
              aria-label="Website"
            >
              <GlobeIcon size={15} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}