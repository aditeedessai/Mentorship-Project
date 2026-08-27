import React from 'react';
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
  Layers,
  Code2,
  ExternalLink,
} from 'lucide-react';

// Safe inline SVG Social Icons
const GithubIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const TwitterIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const GlobeIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

export default function LandingPage({ onNavigate }) {
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

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col justify-between overflow-x-hidden selection:bg-[#4F46E5] selection:text-white">
      <style>{`
        .board-3d-perspective {
          perspective: 2000px;
        }
        .board-3d-body {
          transform: rotateX(18deg) rotateY(-18deg) rotateZ(6deg);
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .board-3d-body:hover {
          transform: rotateX(8deg) rotateY(-8deg) rotateZ(2deg) translateY(-8px);
        }
        .slab-3d-extruded {
          background: linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 100%);
          border: 2.5px solid #FFFFFF;
          box-shadow: 
            -45px 55px 90px -15px rgba(79, 70, 229, 0.22),
            -20px 25px 45px -8px rgba(15, 23, 42, 0.1),
            -8px 10px 20px 0px rgba(79, 70, 229, 0.08),
            inset 0 3px 6px rgba(255, 255, 255, 1),
            inset 0 -3px 6px rgba(203, 213, 225, 0.4);
        }
        .tile-3d-elevated {
          background: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.95);
          box-shadow: 
            -6px 10px 20px -3px rgba(79, 70, 229, 0.08),
            -2px 4px 8px -2px rgba(15, 23, 42, 0.04),
            inset 0 2px 3px rgba(255, 255, 255, 1),
            inset 0 -1.5px 2px rgba(226, 232, 240, 0.6);
        }
        .trench-3d-carved {
          background: #F1F5F9;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 
            inset -4px 5px 8px rgba(79, 70, 229, 0.08),
            inset 3px -3px 6px rgba(255, 255, 255, 0.9);
        }
        .card-feature-3d {
          background: #FFFFFF;
          border: 1.5px solid rgba(255, 255, 255, 0.9);
          box-shadow: 
            0 14px 28px -6px rgba(15, 23, 42, 0.06),
            0 4px 10px -2px rgba(15, 23, 42, 0.02),
            inset 0 1.5px 2px rgba(255, 255, 255, 1);
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .card-feature-3d:hover {
          transform: translateY(-6px);
          border-color: rgba(99, 102, 241, 0.4);
          box-shadow: 
            0 24px 45px -8px rgba(79, 70, 229, 0.16),
            0 8px 18px -4px rgba(79, 70, 229, 0.1),
            inset 0 1.5px 2px #FFFFFF;
        }
      `}</style>

      {/* Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 right-[-10%] h-[680px] w-[680px] rounded-full bg-gradient-to-bl from-[#6366F1]/20 via-[#A855F7]/15 to-transparent blur-[120px]" />
        <div className="absolute top-[35%] -left-32 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-[#38BDF8]/20 via-[#818CF8]/15 to-transparent blur-[120px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-30 sticky top-0 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4F46E5] text-white shadow-md shadow-[#4F46E5]/30">
              <Sparkles size={22} className="stroke-[2.2]" />
            </div>
            <span className="font-black text-xl text-[#0F172A] tracking-tight">
              AI STUDY ENGINE
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('about')}
              className="text-sm font-bold text-slate-600 hover:text-[#4F46E5] transition cursor-pointer px-4 py-2"
            >
              About Us
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="rounded-2xl bg-[#4F46E5] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-[#4F46E5]/25 transition hover:bg-[#4338CA] hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] px-4 py-1.5 text-xs font-bold text-[#4338CA]">
              <span className="flex h-2 w-2 rounded-full bg-[#4F46E5] animate-pulse" />
              Intelligent Exam Mastery Platform
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-[#0F172A] tracking-tight leading-[1.12]">
              Turn your course material into{' '}
              <span className="bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#EC4899] bg-clip-text text-transparent">
                instant mastery.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed max-w-lg">
              Generate targeted multi-tier assessments, get automated grading with detailed criteria feedback, and track your conceptual strengths in real time.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => onNavigate('signup')}
                className="rounded-2xl bg-[#4F46E5] px-8 py-4 text-sm font-bold text-white shadow-lg shadow-[#4F46E5]/30 transition hover:bg-[#4338CA] hover:shadow-xl hover:-translate-y-0.5 cursor-pointer inline-flex items-center gap-2"
              >
                Get Started Free
                <ArrowRight size={17} />
              </button>
              <button
                onClick={() => onNavigate('about')}
                className="rounded-2xl bg-white border border-slate-200 px-8 py-4 text-sm font-bold text-[#0F172A] shadow-xs hover:bg-slate-50 transition hover:-translate-y-0.5 cursor-pointer"
              >
                Learn How It Works
              </button>
            </div>

            <div className="flex items-center gap-6 pt-2 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" /> PDF & Slides Ingestion
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" /> Instant Criteria Feedback
              </span>
            </div>
          </div>

          {/* 3D Dashboard Board */}
          <div className="lg:col-span-7 board-3d-perspective flex justify-center py-6">
            <div className="board-3d-body w-full max-w-[650px] rounded-[44px] slab-3d-extruded p-6 sm:p-7 space-y-5">
              <div className="grid grid-cols-12 gap-4">
                
                {/* Left Mini Sidebar */}
                <div className="col-span-3 border-r border-slate-200/80 pr-3 space-y-4 hidden sm:block text-left">
                  <div className="flex items-center gap-2 pb-1">
                    <div className="h-7 w-7 rounded-lg bg-[#4F46E5] flex items-center justify-center text-white shadow-xs">
                      <Sparkles size={14} />
                    </div>
                    <span className="text-xs font-extrabold text-[#0F172A]">AI Engine</span>
                  </div>

                  <div className="space-y-1">
                    <div className="rounded-xl bg-[#4F46E5] text-white px-3 py-2 text-[11px] font-bold flex items-center gap-2 shadow-sm shadow-[#4F46E5]/25">
                      <Layers size={13} /> Dashboard
                    </div>
                    <div className="rounded-xl hover:bg-slate-100 text-slate-600 px-3 py-2 text-[11px] font-semibold flex items-center gap-2 transition">
                      <BookOpen size={13} /> Study Sets
                    </div>
                    <div className="rounded-xl hover:bg-slate-100 text-slate-600 px-3 py-2 text-[11px] font-semibold flex items-center gap-2 transition">
                      <BrainCircuit size={13} /> AI Quizzes
                    </div>
                    <div className="rounded-xl hover:bg-slate-100 text-slate-600 px-3 py-2 text-[11px] font-semibold flex items-center gap-2 transition">
                      <TrendingUp size={13} /> Analytics
                    </div>
                  </div>

                  <div className="rounded-2xl tile-3d-elevated bg-gradient-to-br from-indigo-50/70 to-purple-50/70 p-3 border border-indigo-100/60 text-left space-y-1 mt-6">
                    <span className="text-[10px] font-bold text-indigo-700 block">Current Course</span>
                    <span className="text-[11px] font-extrabold text-[#0F172A] block leading-tight">Cell Biology 101</span>
                    <span className="text-[9px] text-slate-500 block">4 Tiers Ingested</span>
                  </div>
                </div>

                {/* Main Dashboard Canvas */}
                <div className="col-span-12 sm:col-span-9 space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-[#0F172A]">Welcome back, Alex! 👋</h4>
                      <p className="text-[10px] text-slate-400">Exam preparation overview for this week</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200/80 shadow-2xs px-2.5 py-1 rounded-full">
                        Live Session
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="rounded-2xl tile-3d-elevated p-2.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Total MCQs</span>
                      <span className="text-xs font-black text-[#0F172A]">128 Solved</span>
                      <span className="text-[9px] font-bold text-emerald-600 block mt-0.5">+14% vs avg</span>
                    </div>
                    <div className="rounded-2xl tile-3d-elevated p-2.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Short Form</span>
                      <span className="text-xs font-black text-[#0F172A]">42 Passed</span>
                      <span className="text-[9px] font-bold text-emerald-600 block mt-0.5">92% score</span>
                    </div>
                    <div className="rounded-2xl tile-3d-elevated p-2.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Essay Rubrics</span>
                      <span className="text-xs font-black text-[#0F172A]">18 Graded</span>
                      <span className="text-[9px] font-bold text-indigo-600 block mt-0.5">100% matched</span>
                    </div>
                    <div className="rounded-2xl tile-3d-elevated p-2.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Retention</span>
                      <span className="text-xs font-black text-purple-600">96.4%</span>
                      <span className="text-[9px] font-bold text-emerald-600 block mt-0.5">Grade A+</span>
                    </div>
                  </div>

                  <div className="rounded-2xl trench-3d-carved p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#0F172A]">Cognitive Retention Curve</span>
                      <span className="text-[10px] font-semibold text-indigo-600 cursor-pointer">This Week ▾</span>
                    </div>
                    <div className="h-16 w-full flex items-end justify-between gap-2 px-1 pt-1">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 300 60">
                        <defs>
                          <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0,45 Q 40,55 80,30 T 160,20 T 240,10 T 300,5 L 300,60 L 0,60 Z"
                          fill="url(#curveGradient)"
                        />
                        <path
                          d="M 0,45 Q 40,55 80,30 T 160,20 T 240,10 T 300,5"
                          fill="none"
                          stroke="#4F46E5"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <circle cx="240" cy="10" r="3.5" fill="#4F46E5" stroke="#FFFFFF" strokeWidth="1.5" />
                      </svg>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-[#0F172A] block">Active Study Sets</span>
                    <div className="space-y-2">
                      <div className="rounded-2xl tile-3d-elevated p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold border border-white">
                            Ch4
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#0F172A] block leading-none">Cellular Respiration</span>
                            <span className="text-[9px] text-slate-400">24 Chunks Indexed • In Progress</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/60">88% Mastery</span>
                          <span className="text-[9px] text-slate-400 font-medium">Aug 2026</span>
                        </div>
                      </div>

                      <div className="rounded-2xl tile-3d-elevated p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-[10px] font-bold border border-white">
                            Ch5
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#0F172A] block leading-none">Photosynthesis & ATP Synthesis</span>
                            <span className="text-[9px] text-slate-400">18 Chunks Indexed • Ready</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/60">96% Mastery</span>
                          <span className="text-[9px] text-slate-400 font-medium">Aug 2026</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="card-feature-3d rounded-3xl p-7 text-left flex flex-col justify-between space-y-4"
              >
                <div className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-white shadow-xs">
                    <Icon size={24} className="stroke-[2.2]" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{feat.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">{feat.desc}</p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onNavigate('about')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                  >
                    Learn more <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <div className="rounded-3xl bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] p-8 sm:p-12 text-center text-white shadow-2xl space-y-6 border border-white/20">
          <h3 className="text-2xl sm:text-4xl font-black tracking-tight">
            Ready to start your next study session?
          </h3>
          <p className="text-xs sm:text-sm text-indigo-100 max-w-md mx-auto leading-relaxed font-medium">
            Upload your lecture slides and test yourself with multi-tier adaptive assessments.
          </p>
          <button
            onClick={() => onNavigate('signup')}
            className="rounded-2xl bg-white px-8 py-4 text-sm font-black text-indigo-700 shadow-lg hover:bg-slate-50 transition hover:scale-105 cursor-pointer"
          >
            Create Free Account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white/80 backdrop-blur-xl py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-medium gap-4">
          <p>© {new Date().getFullYear()} AI Study Engine. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('about')} className="hover:text-indigo-600 transition cursor-pointer font-semibold">
              About
            </button>
            <button onClick={() => onNavigate('login')} className="hover:text-indigo-600 transition cursor-pointer font-semibold">
              Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}