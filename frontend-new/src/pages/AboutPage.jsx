import React from "react";
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
  Zap,
  CheckCircle2,
  Moon,
  Sun,
  Brain,
  BookOpen,
  Trophy,
  Rocket,
} from "lucide-react";

import { useTheme } from "../context/ThemeContext";

import jojoWaving from "../assets/jojo-waving.png";
import shanePic from "../assets/team/shane.png";
import riyaPic from "../assets/team/riya.png";
import shanalliePic from "../assets/team/shanallie.png";
import nylaPic from "../assets/team/nyla.png";
import aditeePic from "../assets/team/aditee.png";
import sandraPic from "../assets/team/sandra.png";

import JotFooter from "../components/JotFooter";

/* =========================================================
   INLINE BRAND SVGs
========================================================= */

function GithubIcon({ size = 15, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedinIcon({ size = 15, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

/* =========================================================
   ABOUT PAGE
========================================================= */

export default function AboutPage({ onNavigate }) {
  const { isDarkMode, toggleDarkMode } = useTheme();

  React.useEffect(() => {
    window.scrollTo(0, 0);

    const mainElement = document.querySelector("main");

    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  }, []);

  /* =======================================================
     SCROLL REVEAL
  ======================================================= */

  React.useEffect(() => {
    const elements = document.querySelectorAll(".about-reveal");

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("about-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  /* =======================================================
     TEXT COLORS
  ======================================================= */

  const textPrimary = isDarkMode ? "text-white" : "text-[#171326]";
  const textSecondary = isDarkMode ? "text-slate-400" : "text-slate-600";

  /* =======================================================
     CARD STYLING
  ======================================================= */

  const card = isDarkMode
    ? "bg-white/[0.035] border-white/10 hover:border-[#9B7BFF]/40"
    : "bg-white border-[#E6E0F2] hover:border-[#8064C7]/40";

  /* =======================================================
     ASSESSMENT TIERS
  ======================================================= */

  const tiers = [
    {
      tier: "Tier 01",
      title: "Foundational Recall",
      badge: "MCQs",
      icon: Brain,
      desc: "Quick-fire questions that help you lock in definitions, formulas, important terms, and the basics you absolutely need to know.",
    },
    {
      tier: "Tier 02",
      title: "Concise Articulation",
      badge: "Short Answers",
      icon: BookOpen,
      desc: "Explain concepts in your own words and build the confidence to answer without hiding behind multiple-choice options.",
    },
    {
      tier: "Tier 03",
      title: "Structured Synthesis",
      badge: "Long Answers",
      icon: Lightbulb,
      desc: "Go deeper with detailed questions that test how well you can connect ideas, explain concepts, and build strong answers.",
    },
    {
      tier: "Tier 04",
      title: "Contextual Application",
      badge: "Case Scenarios",
      icon: Trophy,
      desc: "Take what you learned into realistic situations and prove that you can actually apply the concepts — not just memorize them.",
    },
  ];

  /* =======================================================
     HOW JOT WORKS
  ======================================================= */

  const steps = [
    {
      num: "01",
      icon: FolderPlus,
      title: "Create a Study Set",
      desc: "Start by giving your subject its own little home. Keep chapters, topics, and revision material organized.",
    },
    {
      num: "02",
      icon: FileUp,
      title: "Drop Your Notes",
      desc: "Upload your PDFs, slides, or study material. No more hunting through folders five minutes before an exam.",
    },
    {
      num: "03",
      icon: Sliders,
      title: "Choose Your Challenge",
      desc: "Pick the question types you want — from quick MCQs to longer answers and case-based questions.",
    },
    {
      num: "04",
      icon: CheckSquare,
      title: "Take the Test",
      desc: "Put your knowledge to work and answer questions generated around the material you actually uploaded.",
    },
    {
      num: "05",
      icon: Sparkles,
      title: "Get AI Feedback",
      desc: "See what you got right, where you slipped up, and what important points you may have missed.",
    },
    {
      num: "06",
      icon: BarChart2,
      title: "Track Your Progress",
      desc: "Watch your performance improve and discover which topics deserve another round of revision.",
    },
  ];

  /* =======================================================
     CORE FEATURES
  ======================================================= */

  const values = [
    {
      icon: Target,
      title: "Precision Evaluation",
      desc: "JOT looks beyond simple right-or-wrong answers and evaluates explanations using relevant concepts, terminology, and study material.",
    },
    {
      icon: Lightbulb,
      title: "Context-Aware Questions",
      desc: "Questions are created around your uploaded learning material, helping you practice what actually matters for your subject.",
    },
    {
      icon: Award,
      title: "Actionable Insights",
      desc: "Instead of simply giving you a score, JOT helps you understand your strengths, weak areas, and what to revise next.",
    },
  ];

  /* =======================================================
     TEAM
  ======================================================= */

  const teamMembers = [
    {
      id: "shane",
      name: "Shane Furtado",
      initials: "SF",
      role: "Mentor",
      focus: "Project Guidance",
      image: shanePic,
      imagePos: "object-center",
      github: "https://github.com/ShaneRayFurtado",
      linkedin: "https://www.linkedin.com/in/shane-furtado-1883aa244/",
    },
    {
      id: "aditee",
      name: "Aditee",
      initials: "AD",
      role: "Full-Stack Engineer",
      focus: "Service Integration",
      image: aditeePic,
      imagePos: "object-center",
      github: "https://github.com/aditeedessai",
      linkedin: "https://www.linkedin.com/in/aditee-dessai",
    },
    {
      id: "sandra",
      name: "Sandra",
      initials: "SD",
      role: "Platform Engineer",
      focus: "Architecture & CI/CD",
      image: sandraPic,
      imagePos: "object-center",
      github: "https://github.com/sandferns20",
      linkedin: "https://www.linkedin.com/in/sandra-fernandes-607b6431a",
    },
    {
      id: "shanallie",
      name: "Shanallie",
      initials: "SN",
      role: "RAG & Vector Lead",
      focus: "Embedding & PgVector",
      image: shanalliePic,
      imagePos: "object-[center_32%]",
      github: "https://github.com/ShanallieBraganza",
      linkedin:
        "https://www.linkedin.com/in/shanallie-braganza-bba840326",
    },
    {
      id: "riya",
      name: "Riya",
      initials: "RY",
      role: "Evaluation Architect",
      focus: "Semantic Rubrics",
      image: riyaPic,
      imagePos: "object-[center_20%]",
      github: "https://github.com/RiyaShetgaonkar",
      linkedin:
        "https://www.linkedin.com/in/riya-shetgaonkar",
    },
    {
      id: "nyla",
      name: "Nyla",
      initials: "NY",
      role: "Frontend Engineer",
      focus: "UI/UX & Experience",
      image: nylaPic,
      imagePos: "object-[center_20%]",
      github: "https://github.com/nylalobo",
      linkedin:
        "https://www.linkedin.com/in/nyla-lobo-631616299",
    },
  ];

  return (
    <div
      className={`about-page min-h-screen overflow-x-hidden transition-colors duration-500 ${
        isDarkMode
          ? "bg-[#0B0910] text-[#F3F0F8]"
          : "bg-[#F7F5FA] text-[#231B33]"
      }`}
    >
      {/* ===================================================
          ANIMATION STYLES
      =================================================== */}

      <style>{`
        @keyframes aboutHeroLeft {
          0% {
            opacity: 0;
            transform: translate3d(-45px, 20px, 0);
          }

          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes aboutHeroRight {
          0% {
            opacity: 0;
            transform: translate3d(45px, 10px, 0) scale(.94);
          }

          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @keyframes aboutHeroBadge {
          0% {
            opacity: 0;
            transform: translateY(15px) scale(.92);
          }

          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes aboutJojoFloat {
          0%, 100% {
            transform: translateY(0) rotate(-1deg);
          }

          50% {
            transform: translateY(-10px) rotate(1deg);
          }
        }

        @keyframes aboutJojoGlow {
          0%, 100% {
            transform: scale(.92);
            opacity: .35;
          }

          50% {
            transform: scale(1.08);
            opacity: .6;
          }
        }

        @keyframes aboutOrbitClockwise {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes aboutOrbitCounterClockwise {
          from {
            transform: rotate(360deg);
          }

          to {
            transform: rotate(0deg);
          }
        }

        @keyframes aboutOrbitBubble {
          0%, 100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.18);
          }
        }

        @keyframes aboutOrbFloatOne {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(12px, -18px, 0);
          }
        }

        @keyframes aboutOrbFloatTwo {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(-14px, 15px, 0);
          }
        }

        @keyframes aboutOrbFloatThree {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(15px, 10px, 0);
          }
        }

        @keyframes aboutSparkle {
          0%, 100% {
            opacity: .25;
            transform: scale(.8) rotate(0deg);
          }

          50% {
            opacity: 1;
            transform: scale(1.15) rotate(90deg);
          }
        }

        @keyframes aboutBadgePulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(128, 100, 199, 0);
          }

          50% {
            box-shadow: 0 0 0 7px rgba(128, 100, 199, 0.06);
          }
        }

        @keyframes aboutIconFloat {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }

          50% {
            transform: translateY(-4px) rotate(3deg);
          }
        }

        @keyframes aboutNumberPulse {
          0%, 100% {
            opacity: .1;
          }

          50% {
            opacity: .22;
          }
        }

        @keyframes aboutCtaFloat {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-7px);
          }
        }

        @keyframes aboutAvatarGlow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(128, 100, 199, 0);
          }

          50% {
            box-shadow: 0 0 24px rgba(128, 100, 199, 0.12);
          }
        }

        @keyframes aboutShimmer {
          0% {
            transform: translateX(-120%);
          }

          100% {
            transform: translateX(120%);
          }
        }

        @keyframes aboutLineGrow {
          0% {
            transform: scaleX(0);
            transform-origin: left;
          }

          100% {
            transform: scaleX(1);
            transform-origin: left;
          }
        }

        .about-hero-left {
          animation: aboutHeroLeft .8s cubic-bezier(.22, 1, .36, 1) both;
        }

        .about-hero-right {
          animation: aboutHeroRight 1s cubic-bezier(.22, 1, .36, 1) .12s both;
        }

        .about-hero-badge {
          animation:
            aboutHeroBadge .7s cubic-bezier(.22, 1, .36, 1) .1s both,
            aboutBadgePulse 3s ease-in-out 1s infinite;
        }

        .about-jojo-float {
          animation: aboutJojoFloat 4s ease-in-out infinite;
        }

        .about-jojo-glow {
          animation: aboutJojoGlow 4s ease-in-out infinite;
        }

        .about-orbit-clockwise {
          animation: aboutOrbitClockwise 14s linear infinite;
        }

        .about-orbit-counter {
          animation: aboutOrbitCounterClockwise 20s linear infinite;
        }

        .about-orbit-bubble {
          animation: aboutOrbitBubble 2.5s ease-in-out infinite;
        }

        .about-orb-one {
          animation: aboutOrbFloatOne 5s ease-in-out infinite;
        }

        .about-orb-two {
          animation: aboutOrbFloatTwo 6s ease-in-out infinite;
        }

        .about-orb-three {
          animation: aboutOrbFloatThree 7s ease-in-out infinite;
        }

        .about-sparkle {
          animation: aboutSparkle 2.8s ease-in-out infinite;
        }

        .about-icon-float {
          animation: aboutIconFloat 3s ease-in-out infinite;
        }

        .about-number-pulse {
          animation: aboutNumberPulse 3s ease-in-out infinite;
        }

        .about-cta-float {
          animation: aboutCtaFloat 3.5s ease-in-out infinite;
        }

        .about-avatar-glow {
          animation: aboutAvatarGlow 3s ease-in-out infinite;
        }

        .about-shimmer {
          position: relative;
          overflow: hidden;
        }

        .about-shimmer::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 45%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,.12),
            transparent
          );
          transform: translateX(-120%);
          animation: aboutShimmer 4.5s ease-in-out infinite;
          pointer-events: none;
        }

        .about-line-grow {
          animation: aboutLineGrow .9s cubic-bezier(.22, 1, .36, 1) .25s both;
        }

        .about-reveal {
          opacity: 0;
          transform: translateY(35px) scale(.985);
          transition:
            opacity .75s cubic-bezier(.22, 1, .36, 1),
            transform .75s cubic-bezier(.22, 1, .36, 1);
        }

        .about-reveal.about-visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .about-stagger-1 {
          transition-delay: .05s;
        }

        .about-stagger-2 {
          transition-delay: .12s;
        }

        .about-stagger-3 {
          transition-delay: .19s;
        }

        .about-stagger-4 {
          transition-delay: .26s;
        }

        .about-stagger-5 {
          transition-delay: .33s;
        }

        .about-stagger-6 {
          transition-delay: .40s;
        }

        .about-card-hover {
          transition:
            transform .45s cubic-bezier(.22, 1, .36, 1),
            box-shadow .45s ease,
            border-color .3s ease;
        }

        .about-card-hover:hover {
          transform: translateY(-7px);
        }

        .about-card-hover:hover .about-card-icon {
          transform: translateY(-3px) rotate(-4deg) scale(1.06);
        }

        .about-card-icon {
          transition: transform .4s cubic-bezier(.22, 1, .36, 1);
        }

        .about-team-card {
          transition:
            transform .5s cubic-bezier(.22, 1, .36, 1),
            box-shadow .5s ease,
            border-color .3s ease;
        }

        .about-team-card:hover {
          transform: translateY(-9px);
        }

        .about-team-avatar {
          transition:
            transform .5s cubic-bezier(.22, 1, .36, 1),
            box-shadow .5s ease;
        }

        .about-team-card:hover .about-team-avatar {
          transform: scale(1.08) translateY(-3px);
        }

        .about-social {
          transition:
            transform .25s ease,
            box-shadow .25s ease,
            background-color .25s ease;
        }

        .about-social:hover {
          transform: translateY(-3px) scale(1.1);
        }

        .about-back-button {
          position: relative;
          overflow: hidden;
        }

        .about-back-button svg {
          transition: transform .3s ease;
        }

        .about-back-button:hover svg {
          transform: translateX(-4px);
        }

        .about-theme-button svg {
          transition:
            transform .5s cubic-bezier(.22, 1, .36, 1);
        }

        .about-theme-button:hover svg {
          transform: rotate(25deg) scale(1.1);
        }

        .about-pill {
          transition:
            transform .3s ease,
            box-shadow .3s ease;
        }

        .about-pill:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(128, 100, 199, .08);
        }

        .about-cta-button {
          transition:
            transform .3s cubic-bezier(.22, 1, .36, 1),
            box-shadow .3s ease,
            background-color .3s ease;
        }

        .about-cta-button:hover {
          transform: translateY(-3px) scale(1.025);
        }

        .about-cta-button:active {
          transform: translateY(0) scale(.98);
        }

        @media (prefers-reduced-motion: reduce) {
          .about-page *,
          .about-page *::before,
          .about-page *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
            scroll-behavior: auto !important;
          }

          .about-reveal {
            opacity: 1;
            transform: none;
          }
        }

        @media (max-width: 640px) {
          .about-orbit-outer {
            width: 285px !important;
            height: 285px !important;
            margin-left: -142.5px !important;
            margin-top: -142.5px !important;
          }

          .about-orbit-inner {
            width: 215px !important;
            height: 215px !important;
            margin-left: -107.5px !important;
            margin-top: -107.5px !important;
          }
        }
      `}</style>

      {/* ===================================================
          BACKGROUND AMBIENCE
      =================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className={`absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full blur-[150px] ${
            isDarkMode ? "bg-[#8064C7]/15" : "bg-[#8064C7]/10"
          }`}
        />

        <div
          className={`absolute -left-40 top-[40%] h-[500px] w-[500px] rounded-full blur-[150px] ${
            isDarkMode ? "bg-[#6D45B8]/10" : "bg-[#A78BFA]/10"
          }`}
        />

        <div
          className={`absolute bottom-[-250px] right-[15%] h-[450px] w-[450px] rounded-full blur-[150px] ${
            isDarkMode ? "bg-[#8B5CF6]/8" : "bg-[#C084FC]/8"
          }`}
        />

        <div className="about-orb-one absolute left-[8%] top-[28%] h-3 w-3 rounded-full bg-[#8064C7]/30" />

        <div className="about-orb-two absolute right-[9%] top-[42%] h-2 w-2 rounded-full bg-[#98E8DE]/50" />

        <div className="about-orb-three absolute bottom-[25%] left-[17%] h-2.5 w-2.5 rounded-full bg-[#45A9A9]/30" />

        <Sparkles
          size={18}
          className="about-sparkle absolute right-[18%] top-[20%] text-[#8064C7]/30"
        />

        <Sparkles
          size={13}
          className="about-sparkle absolute left-[11%] top-[62%] text-[#C084FC]/30"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* ===================================================
          NAVBAR
      =================================================== */}

      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
          isDarkMode
            ? "border-white/10 bg-[#0B0910]/85"
            : "border-[#E8E3EF] bg-white/85"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate("landing")}
            className={`about-back-button flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition ${
              isDarkMode
                ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                : "border-[#E5DFEE] bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl">
              <img
                src={jojoWaving}
                alt="Jojo the JOT pencil"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <div
                className={`font-black tracking-tight ${
                  isDarkMode ? "text-white" : "text-[#231B33]"
                }`}
              >
                JOT
              </div>

              <div
                className={`text-[9px] font-bold tracking-wider ${
                  isDarkMode ? "text-purple-300" : "text-purple-600"
                }`}
              >
                JOT IT • ORGANISE IT • TOP IT
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleDarkMode}
            className={`about-theme-button flex h-11 w-11 items-center justify-center rounded-xl border text-lg transition-all duration-300 ${
              isDarkMode
                ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                : "border-[#E5DFEE] bg-white text-[#231B33] hover:bg-purple-50"
            }`}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </header>

      {/* ===================================================
          MAIN CONTAINER
      =================================================== */}

      <main className="relative z-10 mx-auto max-w-6xl space-y-24 px-6 py-14">

        {/* =================================================
            HERO SECTION
        ================================================= */}

        <section className="relative flex min-h-[470px] items-center">
          <div className="grid w-full items-center gap-14 lg:grid-cols-2">

            <div className="about-hero-left space-y-7">
              <div
                className={`about-hero-badge inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black ${
                  isDarkMode
                    ? "border-purple-400/20 bg-purple-500/10 text-purple-300"
                    : "border-purple-200 bg-purple-50 text-purple-700"
                }`}
              >
                <Sparkles size={14} />
                A LITTLE ABOUT JOT
              </div>

              <h1
                className={`text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl ${textPrimary}`}
              >
                Studying doesn't
                <br />
                have to feel like
                <br />
                <span className="about-line-grow inline-block bg-gradient-to-r from-[#A78BFA] via-[#8B5CF6] to-[#C084FC] bg-clip-text text-transparent">
                  chaos.
                </span>
              </h1>

              <p
                className={`max-w-xl text-base leading-8 sm:text-lg ${textSecondary}`}
              >
                JOT turns your ordinary study material into something you can
                actually work with — from summaries and questions to practice
                and progress tracking.
              </p>

              <div className="flex flex-wrap gap-3">
                <div
                  className={`about-pill rounded-xl border px-4 py-2 text-xs font-bold ${
                    isDarkMode
                      ? "border-purple-400/20 bg-purple-500/10 text-purple-200"
                      : "border-purple-200 bg-purple-50 text-purple-700"
                  }`}
                >
                  ✨ Jot It.
                </div>

                <div
                  className={`about-pill rounded-xl border px-4 py-2 text-xs font-bold ${
                    isDarkMode
                      ? "border-purple-400/20 bg-purple-500/10 text-purple-200"
                      : "border-purple-200 bg-purple-50 text-purple-700"
                  }`}
                >
                  📚 Organise It.
                </div>

                <div
                  className={`about-pill rounded-xl border px-4 py-2 text-xs font-bold ${
                    isDarkMode
                      ? "border-purple-400/20 bg-purple-500/10 text-purple-200"
                      : "border-purple-200 bg-purple-50 text-purple-700"
                  }`}
                >
                  🚀 Top It.
                </div>
              </div>
            </div>

            {/* =================================================
                JOJO + ORBITS
            ================================================= */}

            <div className="about-hero-right relative flex min-h-[430px] items-center justify-center overflow-visible">

              {/* Soft Jojo glow */}
              <div
                className={`about-jojo-glow absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px] ${
                  isDarkMode ? "bg-purple-500/20" : "bg-purple-400/20"
                }`}
              />

              {/* =================================================
                  OUTER ORBIT RING
              ================================================= */}

              <div
                className={`pointer-events-none absolute left-1/2 top-1/2 z-10 h-[350px] w-[350px] -ml-[175px] -mt-[175px] rounded-full border ${
                  isDarkMode
                    ? "border-purple-300/15"
                    : "border-purple-300/40"
                }`}
              />

              {/* =================================================
                  INNER ORBIT RING
              ================================================= */}

              <div
                className={`pointer-events-none absolute left-1/2 top-1/2 z-10 h-[285px] w-[285px] -ml-[142.5px] -mt-[142.5px] rounded-full border border-dashed ${
                  isDarkMode
                    ? "border-purple-300/15"
                    : "border-purple-300/35"
                }`}
              />

              {/* =================================================
                  OUTER ORBIT

                  IMPORTANT:
                  Negative margins are intentional.
                  The animation changes transform, so using
                  translate here would fight with the rotation.
              ================================================= */}

              <div className="about-orbit-clockwise about-orbit-outer absolute left-1/2 top-1/2 z-20 h-[350px] w-[350px] -ml-[175px] -mt-[175px]">

                {/* Top */}
                <div className="about-orbit-bubble absolute left-1/2 top-[-7px] h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-[#8064C7] shadow-[0_0_15px_rgba(128,100,199,0.45)]" />

                {/* Right */}
                <div
                  className="about-orbit-bubble absolute right-[-7px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[#98E8DE] shadow-[0_0_14px_rgba(152,232,222,0.4)]"
                  style={{ animationDelay: ".5s" }}
                />

                {/* Bottom */}
                <div
                  className="about-orbit-bubble absolute bottom-[-7px] left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-[#A78BFA] shadow-[0_0_16px_rgba(167,139,250,0.4)]"
                  style={{ animationDelay: "1s" }}
                />

                {/* Left */}
                <div
                  className="about-orbit-bubble absolute left-[-6px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#45A9A9] shadow-[0_0_12px_rgba(69,169,169,0.35)]"
                  style={{ animationDelay: "1.5s" }}
                />
              </div>

              {/* =================================================
                  INNER ORBIT
              ================================================= */}

              <div className="about-orbit-counter about-orbit-inner absolute left-1/2 top-1/2 z-20 h-[285px] w-[285px] -ml-[142.5px] -mt-[142.5px]">

                {/* Top-right sparkle */}
                <div className="absolute right-[32px] top-[7px] flex h-6 w-6 items-center justify-center rounded-full border border-purple-300/20 bg-purple-500/10">
                  <Sparkles
                    size={11}
                    className="about-sparkle text-[#C084FC]"
                  />
                </div>

                {/* Bottom-left bubble */}
                <div
                  className="absolute bottom-[8px] left-[27px] h-3 w-3 rounded-full bg-[#8064C7] shadow-[0_0_12px_rgba(128,100,199,0.35)]"
                  style={{
                    animation:
                      "aboutOrbitBubble 2.2s ease-in-out infinite",
                  }}
                />

                {/* Left bubble */}
                <div
                  className="absolute left-[4px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#98E8DE]"
                  style={{
                    animation:
                      "aboutOrbitBubble 2.8s ease-in-out infinite",
                  }}
                />
              </div>

              {/* =================================================
                  JOJO

                  This is a completely separate centered layer.
                  Therefore the orbit rotation cannot move Jojo.
              ================================================= */}

              <div className="absolute left-1/2 top-1/2 z-30 flex h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 items-center justify-center">

                <div className="about-jojo-float flex h-[220px] w-[220px] items-center justify-center">
                  <img
                    src={jojoWaving}
                    alt="Jojo the JOT pencil mascot"
                    className="h-[220px] w-[220px] object-contain drop-shadow-[0_18px_25px_rgba(0,0,0,0.16)]"
                  />
                </div>

              </div>

              {/* =================================================
                  NO SPEECH BUBBLE
              ================================================= */}

              {/* Extra static sparkles */}

              <Sparkles
                size={17}
                className="about-sparkle absolute right-[9%] top-[20%] z-20 text-[#8064C7]/50"
              />

              <Sparkles
                size={12}
                className="about-sparkle absolute bottom-[17%] left-[8%] z-20 text-[#C084FC]/50"
                style={{ animationDelay: "1.2s" }}
              />
            </div>
          </div>
        </section>

        {/* =================================================
            MISSION SECTION
        ================================================= */}

        <section
          className={`about-reveal rounded-[36px] border p-8 sm:p-12 ${
            isDarkMode
              ? "border-white/10 bg-white/[0.035]"
              : "border-[#E7E0F0] bg-white shadow-sm"
          }`}
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="about-card-icon flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <Rocket size={20} />
            </div>

            <span className="text-xs font-black uppercase tracking-widest text-purple-400">
              Our Mission
            </span>
          </div>

          <h2
            className={`mb-7 text-3xl font-black sm:text-4xl ${textPrimary}`}
          >
            Make studying feel less
            <br />
            overwhelming.
          </h2>

          <div
            className={`max-w-4xl space-y-5 text-sm leading-8 sm:text-base ${textSecondary}`}
          >
            <p>
              We've all been there — a giant PDF, twenty lecture slides, a
              notebook full of half-finished notes, and an exam that somehow
              feels way too close.
            </p>

            <p>
              JOT was created to make that process simpler. Instead of staring
              at a mountain of material and wondering where to begin, you can
              give your material to JOT and turn it into something structured,
              interactive, and easier to learn from.
            </p>

            <p>
              The goal isn't to study more.
              <strong
                className={isDarkMode ? "text-white" : "text-[#231B33]"}
              >
                {" "}
                It's to study smarter.
              </strong>
            </p>
          </div>

          <div
            className={`mt-9 grid gap-4 border-t pt-7 sm:grid-cols-3 ${
              isDarkMode ? "border-white/10" : "border-slate-200"
            }`}
          >
            {[
              "Less Scrolling",
              "More Active Recall",
              "Smarter Revision",
            ].map((item, index) => (
              <div
                key={item}
                className={`about-reveal about-stagger-${
                  index + 1
                } flex items-center gap-2 text-xs font-bold ${textSecondary}`}
              >
                <CheckCircle2
                  size={16}
                  className="shrink-0 text-purple-400"
                />
                {item}
              </div>
            ))}
          </div>
        </section>

        {/* =================================================
            ASSESSMENT TIERS
        ================================================= */}

        <section className="space-y-9">
          <div className="about-reveal text-center">
            <span className="text-xs font-black uppercase tracking-widest text-purple-400">
              How JOT Thinks
            </span>

            <h2
              className={`mt-3 text-3xl font-black sm:text-4xl ${textPrimary}`}
            >
              From "I know this"
              <br />
              to "I can actually use this."
            </h2>

            <p
              className={`mx-auto mt-4 max-w-2xl text-sm ${textSecondary}`}
            >
              JOT helps you move through different levels of understanding
              instead of stopping at memorization.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {tiers.map((tier, index) => {
              const Icon = tier.icon;

              return (
                <div
                  key={tier.tier}
                  className={`about-reveal about-card-hover about-stagger-${
                    index + 1
                  } rounded-3xl border p-7 ${card}`}
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="text-xs font-black text-purple-400">
                      {tier.tier}
                    </span>

                    <span
                      className={`rounded-lg px-3 py-1 text-xs font-bold ${
                        isDarkMode
                          ? "bg-white/10 text-slate-300"
                          : "bg-purple-50 text-purple-700"
                      }`}
                    >
                      {tier.badge}
                    </span>
                  </div>

                  <div className="about-card-icon mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
                    <Icon size={22} />
                  </div>

                  <h3 className={`mb-2 text-xl font-black ${textPrimary}`}>
                    {tier.title}
                  </h3>

                  <p className={`text-sm leading-7 ${textSecondary}`}>
                    {tier.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* =================================================
            HOW TO USE STEPS
        ================================================= */}

        <section className="space-y-9">
          <div className="about-reveal text-center">
            <span className="text-xs font-black uppercase tracking-widest text-purple-400">
              Your JOT Journey
            </span>

            <h2
              className={`mt-3 text-3xl font-black sm:text-4xl ${textPrimary}`}
            >
              Six steps from notes
              <br />
              to "I've got this."
            </h2>

            <p className={`mt-4 text-sm ${textSecondary}`}>
              No complicated setup. Just upload, practise, learn, and keep
              improving.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.num}
                  className={`about-reveal about-card-hover about-stagger-${
                    (index % 6) + 1
                  } rounded-3xl border p-6 ${card}`}
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div
                      className={`about-card-icon flex h-12 w-12 items-center justify-center rounded-2xl ${
                        isDarkMode
                          ? "bg-purple-500/10 text-purple-300"
                          : "bg-purple-50 text-purple-600"
                      }`}
                    >
                      <Icon size={22} />
                    </div>

                    <span
                      className={`about-number-pulse text-2xl font-black ${
                        isDarkMode
                          ? "text-white/10"
                          : "text-slate-200"
                      }`}
                    >
                      {step.num}
                    </span>
                  </div>

                  <h3 className={`mb-2 font-black ${textPrimary}`}>
                    {step.title}
                  </h3>

                  <p className={`text-xs leading-7 ${textSecondary}`}>
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* =================================================
            CORE VALUES
        ================================================= */}

        <section className="space-y-9">
          <div className="about-reveal">
            <span className="text-xs font-black uppercase tracking-widest text-purple-400">
              What Makes JOT Different
            </span>

            <h2
              className={`mt-3 text-3xl font-black sm:text-4xl ${textPrimary}`}
            >
              More than just
              <br />
              question generation.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {values.map((value, index) => {
              const Icon = value.icon;

              return (
                <div
                  key={value.title}
                  className={`about-reveal about-card-hover about-stagger-${
                    index + 1
                  } rounded-3xl border p-7 ${card}`}
                >
                  <div className="about-card-icon mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
                    <Icon size={22} />
                  </div>

                  <h3 className={`mb-3 font-black ${textPrimary}`}>
                    {value.title}
                  </h3>

                  <p className={`text-sm leading-7 ${textSecondary}`}>
                    {value.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* =================================================
            CTA SECTION
        ================================================= */}

        <section
          className={`about-reveal relative overflow-hidden rounded-[36px] border p-8 text-center sm:p-12 ${
            isDarkMode
              ? "border-purple-400/20 bg-gradient-to-br from-[#24163A] via-[#181329] to-[#100D17]"
              : "border-purple-100 bg-gradient-to-br from-purple-50 via-white to-indigo-50"
          }`}
        >
          <div
            className={`about-orb-one absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl ${
              isDarkMode
                ? "bg-purple-500/15"
                : "bg-purple-300/20"
            }`}
          />

          <div
            className={`about-orb-two absolute -bottom-20 -left-20 h-64 w-64 rounded-full blur-3xl ${
              isDarkMode
                ? "bg-purple-500/10"
                : "bg-purple-200/20"
            }`}
          />

          <div className="relative">
            <div className="about-cta-float mb-5 flex justify-center">
              <div
                className={`flex h-28 w-28 items-center justify-center rounded-full ${
                  isDarkMode
                    ? "bg-white/5"
                    : "bg-white shadow-sm"
                }`}
              >
                <img
                  src={jojoWaving}
                  alt="Jojo"
                  className="h-24 w-24 object-contain"
                />
              </div>
            </div>

            <h2
              className={`text-3xl font-black sm:text-4xl ${textPrimary}`}
            >
              Ready to JOT?
            </h2>

            <p
              className={`mx-auto mt-4 max-w-lg text-sm leading-7 ${textSecondary}`}
            >
              Your notes are waiting. Give Jojo something to work with and
              turn that study chaos into something a little more manageable.
            </p>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate("signup")}
              className="about-cta-button mt-7 rounded-2xl bg-[#8064C7] px-8 py-4 text-sm font-black text-white shadow-lg shadow-purple-500/20 transition hover:bg-[#9275D8]"
            >
              Create Free Account ✨
            </button>
          </div>
        </section>

        {/* =================================================
            TEAM SECTION
        ================================================= */}

        <section className="space-y-12">
          <div className="about-reveal text-center">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-wider ${
                isDarkMode
                  ? "border-purple-400/20 bg-purple-500/10 text-purple-300"
                  : "border-purple-200 bg-purple-50 text-purple-700"
              }`}
            >
              <Sparkles size={13} />
              THE PEOPLE BEHIND JOT
            </div>

            <h2
              className={`mt-3 text-3xl font-black tracking-tight sm:text-4xl ${textPrimary}`}
            >
              Meet the Team
            </h2>

            <p
              className={`mx-auto mt-2 max-w-xl text-sm ${textSecondary}`}
            >
              Six minds building one ambitious AI study companion.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {teamMembers.map((member, index) => (
              <div
                key={member.id}
                className={`about-reveal about-team-card about-stagger-${
                  (index % 6) + 1
                } group relative flex flex-col justify-between overflow-hidden rounded-[30px] border ${
                  isDarkMode
                    ? "border-white/10 bg-[#120F1D]/90 hover:border-purple-500/50 hover:shadow-[0_20px_40px_rgba(128,100,199,0.15)]"
                    : "border-[#E7E2EE] bg-white hover:border-purple-400/60 hover:shadow-[0_20px_40px_rgba(128,100,199,0.12)]"
                }`}
              >
                <div
                  className={`relative h-20 w-full transition-colors ${
                    isDarkMode
                      ? "bg-gradient-to-b from-purple-900/30 via-purple-950/10 to-transparent"
                      : "bg-gradient-to-b from-purple-100/70 via-purple-50/20 to-transparent"
                  }`}
                >
                  <div
                    className={`absolute -top-12 left-1/2 h-24 w-32 -translate-x-1/2 rounded-full blur-2xl transition-opacity duration-500 group-hover:opacity-100 ${
                      isDarkMode
                        ? "bg-purple-500/25 opacity-40"
                        : "bg-purple-300/40 opacity-50"
                    }`}
                  />
                </div>

                <div className="-mt-12 flex flex-col items-center px-4">
                  <div
                    className={`about-team-avatar about-avatar-glow flex h-24 w-24 items-center justify-center overflow-hidden rounded-full ring-4 shadow-lg ${
                      isDarkMode
                        ? "bg-[#181325] ring-[#120F1D] group-hover:ring-purple-400/50"
                        : "bg-white ring-white group-hover:ring-purple-200"
                    }`}
                  >
                    {member.image ? (
                      <img
                        src={member.image}
                        alt={member.name}
                        loading="eager"
                        decoding="sync"
                        className={`h-full w-full object-cover ${
                          member.imagePos || "object-center"
                        } brightness-[0.96] contrast-[1.08] transition-transform duration-500 ease-out group-hover:scale-115`}
                        style={{
                          imageRendering: "-webkit-optimize-contrast",
                          transform: "translateZ(0)",
                        }}
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center font-black ${
                          isDarkMode
                            ? "bg-gradient-to-br from-purple-900/50 to-purple-950/70 text-purple-300"
                            : "bg-gradient-to-br from-purple-100 to-purple-200 text-purple-800"
                        }`}
                      >
                        <span className="text-2xl font-black tracking-wider">
                          {member.initials}
                        </span>
                      </div>
                    )}
                  </div>

                  <h3
                    className={`mt-3.5 text-base font-black tracking-tight ${textPrimary}`}
                  >
                    {member.name}
                  </h3>

                  <p
                    className={`mt-0.5 text-xs font-semibold ${textSecondary}`}
                  >
                    {member.role}
                  </p>

                  <div
                    className={`about-pill mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[10px] font-bold ${
                      isDarkMode
                        ? "border-purple-500/20 bg-purple-500/10 text-purple-300 group-hover:border-purple-500/40"
                        : "border-purple-200/80 bg-purple-50 text-purple-700 group-hover:border-purple-300"
                    }`}
                  >
                    <Zap
                      size={10}
                      className="shrink-0 text-purple-400"
                    />

                    <span className="max-w-[125px] truncate">
                      {member.focus}
                    </span>
                  </div>
                </div>

                <div
                  className={`mt-5 flex items-center justify-center gap-3 border-t px-4 py-3.5 ${
                    isDarkMode
                      ? "border-white/5"
                      : "border-slate-100"
                  }`}
                >
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="GitHub"
                    className={`about-social flex h-8 w-8 items-center justify-center rounded-full border ${
                      isDarkMode
                        ? "border-white/10 bg-white/5 text-slate-300 hover:border-purple-400/50 hover:bg-purple-500/10 hover:text-white"
                        : "border-slate-200 bg-slate-50/80 text-slate-600 shadow-sm hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
                    }`}
                  >
                    <GithubIcon size={14} />
                  </a>

                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="LinkedIn"
                    className={`about-social flex h-8 w-8 items-center justify-center rounded-full border ${
                      isDarkMode
                        ? "border-white/10 bg-white/5 text-slate-300 hover:border-purple-400/50 hover:bg-purple-500/10 hover:text-white"
                        : "border-slate-200 bg-slate-50/80 text-slate-600 shadow-sm hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
                    }`}
                  >
                    <LinkedinIcon size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <JotFooter />
    </div>
  );
}