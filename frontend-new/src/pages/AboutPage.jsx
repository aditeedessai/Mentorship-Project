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

import jojo from "../assets/jojo.png";
import jojoDark from "../assets/jojo-dark.jpg";

import JotFooter from "../components/JotFooter";

/* =========================================================
   ABOUT PAGE
========================================================= */

export default function AboutPage({ onNavigate }) {
  const { isDarkMode, toggleDarkMode } = useTheme();

  /* =======================================================
     THEME-BASED JOJO
  ======================================================= */

  const currentJojo = isDarkMode ? jojoDark : jojo;

  /* =======================================================
     TEXT COLORS
  ======================================================= */

  const textPrimary = isDarkMode
    ? "text-white"
    : "text-[#171326]";

  const textSecondary = isDarkMode
    ? "text-slate-400"
    : "text-slate-600";

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
      name: "Aditee",
      initials: "AD",
      role: "Full-Stack Engineer",
      focus: "Service Integration",
    },
    {
      name: "Sandra",
      initials: "SD",
      role: "Platform Engineer",
      focus: "Architecture & CI/CD",
    },
    {
      name: "Shanallie",
      initials: "SN",
      role: "RAG & Vector Lead",
      focus: "Embedding & ChromaDB",
    },
    {
      name: "Riya",
      initials: "RY",
      role: "Evaluation Architect",
      focus: "Semantic Rubrics",
    },
    {
      name: "Nyla",
      initials: "NY",
      role: "Frontend Experience",
      focus: "UI/UX & Experience",
    },
  ];

  return (
    <div
      className={`
        min-h-screen
        overflow-x-hidden
        transition-colors
        duration-500
        ${
          isDarkMode
            ? "bg-[#0B0910] text-[#F3F0F8]"
            : "bg-[#F7F5FA] text-[#231B33]"
        }
      `}
    >
      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className={`
            absolute
            -right-40
            -top-40
            h-[600px]
            w-[600px]
            rounded-full
            blur-[150px]
            ${
              isDarkMode
                ? "bg-[#8064C7]/15"
                : "bg-[#8064C7]/10"
            }
          `}
        />

        <div
          className={`
            absolute
            -left-40
            top-[40%]
            h-[500px]
            w-[500px]
            rounded-full
            blur-[150px]
            ${
              isDarkMode
                ? "bg-[#6D45B8]/10"
                : "bg-[#A78BFA]/10"
            }
          `}
        />

        <div
          className={`
            absolute
            bottom-[-250px]
            right-[15%]
            h-[450px]
            w-[450px]
            rounded-full
            blur-[150px]
            ${
              isDarkMode
                ? "bg-[#8B5CF6]/8"
                : "bg-[#C084FC]/8"
            }
          `}
        />
      </div>

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header
        className={`
          sticky
          top-0
          z-50
          border-b
          backdrop-blur-xl
          ${
            isDarkMode
              ? "border-white/10 bg-[#0B0910]/85"
              : "border-[#E8E3EF] bg-white/85"
          }
        `}
      >
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">

          {/* Back Button */}

          <button
            type="button"
            onClick={() =>
              onNavigate && onNavigate("landing")
            }
            className={`
              flex
              items-center
              gap-2
              rounded-xl
              border
              px-4
              py-2
              text-sm
              font-bold
              transition
              ${
                isDarkMode
                  ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                  : "border-[#E5DFEE] bg-white text-slate-600 hover:bg-slate-50"
              }
            `}
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>

          {/* Logo */}

          <div className="hidden items-center gap-3 sm:flex">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl">
              <img
                src={currentJojo}
                alt="Jojo the JOT pencil"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <div
                className={`
                  font-black
                  tracking-tight
                  ${
                    isDarkMode
                      ? "text-white"
                      : "text-[#231B33]"
                  }
                `}
              >
                JOT
              </div>

              <div
                className={`
                  text-[9px]
                  font-bold
                  tracking-wider
                  ${
                    isDarkMode
                      ? "text-purple-300"
                      : "text-purple-600"
                  }
                `}
              >
                JOT IT • ORGANISE IT • TOP IT
              </div>
            </div>
          </div>

          {/* Theme Toggle */}

          <button
            type="button"
            onClick={toggleDarkMode}
            className={`
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              border
              text-lg
              transition-all
              duration-300
              ${
                isDarkMode
                  ? "border-white/10 bg-white/5 hover:bg-white/10"
                  : "border-[#E5DFEE] bg-white hover:bg-purple-50"
              }
            `}
            aria-label="Toggle theme"
            title={
              isDarkMode
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
          >
            {isDarkMode ? (
              <Sun size={19} />
            ) : (
              <Moon size={19} />
            )}
          </button>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="relative z-10 mx-auto max-w-6xl space-y-24 px-6 py-14">

        {/* ===================================================
            HERO
        =================================================== */}

        <section className="relative flex min-h-[470px] items-center">

          <div className="grid w-full items-center gap-14 lg:grid-cols-2">

            {/* LEFT */}

            <div className="space-y-7">

              <div
                className={`
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  px-4
                  py-2
                  text-xs
                  font-black
                  ${
                    isDarkMode
                      ? "border-purple-400/20 bg-purple-500/10 text-purple-300"
                      : "border-purple-200 bg-purple-50 text-purple-700"
                  }
                `}
              >
                <Sparkles size={14} />
                A LITTLE ABOUT JOT
              </div>

              <h1
                className={`
                  text-5xl
                  font-black
                  leading-[1.02]
                  tracking-tight
                  sm:text-6xl
                  ${textPrimary}
                `}
              >
                Studying doesn't
                <br />
                have to feel like
                <br />

                <span className="bg-gradient-to-r from-[#A78BFA] via-[#8B5CF6] to-[#C084FC] bg-clip-text text-transparent">
                  chaos.
                </span>
              </h1>

              <p
                className={`
                  max-w-xl
                  text-base
                  leading-8
                  sm:text-lg
                  ${textSecondary}
                `}
              >
                JOT turns your ordinary study material into
                something you can actually work with — from
                summaries and questions to practice and
                progress tracking.
              </p>

              <div className="flex flex-wrap gap-3">

                <div
                  className={`
                    rounded-xl
                    border
                    px-4
                    py-2
                    text-xs
                    font-bold
                    ${
                      isDarkMode
                        ? "border-purple-400/20 bg-purple-500/10 text-purple-200"
                        : "border-purple-200 bg-purple-50 text-purple-700"
                    }
                  `}
                >
                  ✨ Jot It.
                </div>

                <div
                  className={`
                    rounded-xl
                    border
                    px-4
                    py-2
                    text-xs
                    font-bold
                    ${
                      isDarkMode
                        ? "border-purple-400/20 bg-purple-500/10 text-purple-200"
                        : "border-purple-200 bg-purple-50 text-purple-700"
                    }
                  `}
                >
                  📚 Organise It.
                </div>

                <div
                  className={`
                    rounded-xl
                    border
                    px-4
                    py-2
                    text-xs
                    font-bold
                    ${
                      isDarkMode
                        ? "border-purple-400/20 bg-purple-500/10 text-purple-200"
                        : "border-purple-200 bg-purple-50 text-purple-700"
                    }
                  `}
                >
                  🚀 Top It.
                </div>

              </div>
            </div>

            {/* RIGHT — JOJO */}

            <div className="relative flex items-center justify-center">

              <div
                className={`
                  absolute
                  h-[340px]
                  w-[340px]
                  rounded-full
                  blur-[80px]
                  ${
                    isDarkMode
                      ? "bg-purple-500/20"
                      : "bg-purple-400/20"
                  }
                `}
              />

              <div
                className={`
                  relative
                  flex
                  h-[350px]
                  w-[350px]
                  items-center
                  justify-center
                  rounded-[44px]
                  border
                  ${
                    isDarkMode
                      ? "border-white/10 bg-white/[0.035] shadow-[0_30px_80px_rgba(0,0,0,0.25)]"
                      : "border-purple-100 bg-white shadow-[0_25px_70px_rgba(80,60,120,0.10)]"
                  }
                `}
              >

                <img
                  src={currentJojo}
                  alt="Jojo the JOT pencil mascot"
                  className="h-[270px] w-[270px] object-contain"
                />

                <div
                  className={`
                    absolute
                    bottom-5
                    rounded-2xl
                    border
                    px-5
                    py-2.5
                    text-xs
                    font-black
                    ${
                      isDarkMode
                        ? "border-white/10 bg-[#181321] text-purple-200"
                        : "border-purple-100 bg-white text-purple-700 shadow-sm"
                    }
                  `}
                >
                  Hi! I'm Jojo ✨
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ===================================================
            MISSION
        =================================================== */}

        <section
          className={`
            rounded-[36px]
            border
            p-8
            sm:p-12
            ${
              isDarkMode
                ? "border-white/10 bg-white/[0.035]"
                : "border-[#E7E0F0] bg-white shadow-sm"
            }
          `}
        >

          <div className="mb-6 flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <Rocket size={20} />
            </div>

            <span className="text-xs font-black uppercase tracking-widest text-purple-400">
              Our Mission
            </span>

          </div>

          <h2
            className={`
              mb-7
              text-3xl
              font-black
              sm:text-4xl
              ${textPrimary}
            `}
          >
            Make studying feel less
            <br />
            overwhelming.
          </h2>

          <div
            className={`
              max-w-4xl
              space-y-5
              text-sm
              leading-8
              sm:text-base
              ${textSecondary}
            `}
          >
            <p>
              We've all been there — a giant PDF, twenty
              lecture slides, a notebook full of half-finished
              notes, and an exam that somehow feels way too
              close.
            </p>

            <p>
              JOT was created to make that process simpler.
              Instead of staring at a mountain of material and
              wondering where to begin, you can give your
              material to JOT and turn it into something
              structured, interactive, and easier to learn from.
            </p>

            <p>
              The goal isn't to study more.
              <strong
                className={
                  isDarkMode
                    ? "text-white"
                    : "text-[#231B33]"
                }
              >
                {" "}
                It's to study smarter.
              </strong>
            </p>
          </div>

          <div
            className={`
              mt-9
              grid
              gap-4
              border-t
              pt-7
              sm:grid-cols-3
              ${
                isDarkMode
                  ? "border-white/10"
                  : "border-slate-200"
              }
            `}
          >
            {[
              "Less Scrolling",
              "More Active Recall",
              "Smarter Revision",
            ].map((item) => (
              <div
                key={item}
                className={`
                  flex
                  items-center
                  gap-2
                  text-xs
                  font-bold
                  ${textSecondary}
                `}
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

        {/* ===================================================
            ASSESSMENT FRAMEWORK
        =================================================== */}

        <section className="space-y-9">

          <div className="text-center">

            <span className="text-xs font-black uppercase tracking-widest text-purple-400">
              How JOT Thinks
            </span>

            <h2
              className={`
                mt-3
                text-3xl
                font-black
                sm:text-4xl
                ${textPrimary}
              `}
            >
              From "I know this"
              <br />
              to "I can actually use this."
            </h2>

            <p
              className={`
                mx-auto
                mt-4
                max-w-2xl
                text-sm
                ${textSecondary}
              `}
            >
              JOT helps you move through different levels of
              understanding instead of stopping at memorization.
            </p>

          </div>

          <div className="grid gap-5 md:grid-cols-2">

            {tiers.map((tier) => {
              const Icon = tier.icon;

              return (
                <div
                  key={tier.tier}
                  className={`
                    rounded-3xl
                    border
                    p-7
                    transition-all
                    duration-300
                    hover:-translate-y-1
                    ${card}
                  `}
                >

                  <div className="mb-5 flex items-center justify-between">

                    <span className="text-xs font-black text-purple-400">
                      {tier.tier}
                    </span>

                    <span
                      className={`
                        rounded-lg
                        px-3
                        py-1
                        text-xs
                        font-bold
                        ${
                          isDarkMode
                            ? "bg-white/10 text-slate-300"
                            : "bg-purple-50 text-purple-700"
                        }
                      `}
                    >
                      {tier.badge}
                    </span>

                  </div>

                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
                    <Icon size={22} />
                  </div>

                  <h3
                    className={`
                      mb-2
                      text-xl
                      font-black
                      ${textPrimary}
                    `}
                  >
                    {tier.title}
                  </h3>

                  <p
                    className={`
                      text-sm
                      leading-7
                      ${textSecondary}
                    `}
                  >
                    {tier.desc}
                  </p>

                </div>
              );
            })}

          </div>
        </section>

        {/* ===================================================
            HOW TO USE
        =================================================== */}

        <section className="space-y-9">

          <div className="text-center">

            <span className="text-xs font-black uppercase tracking-widest text-purple-400">
              Your JOT Journey
            </span>

            <h2
              className={`
                mt-3
                text-3xl
                font-black
                sm:text-4xl
                ${textPrimary}
              `}
            >
              Six steps from notes
              <br />
              to "I've got this."
            </h2>

            <p
              className={`
                mt-4
                text-sm
                ${textSecondary}
              `}
            >
              No complicated setup. Just upload, practise,
              learn, and keep improving.
            </p>

          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.num}
                  className={`
                    rounded-3xl
                    border
                    p-6
                    transition-all
                    duration-300
                    hover:-translate-y-1
                    ${card}
                  `}
                >

                  <div className="mb-5 flex items-center justify-between">

                    <div
                      className={`
                        flex
                        h-12
                        w-12
                        items-center
                        justify-center
                        rounded-2xl
                        ${
                          isDarkMode
                            ? "bg-purple-500/10 text-purple-300"
                            : "bg-purple-50 text-purple-600"
                        }
                      `}
                    >
                      <Icon size={22} />
                    </div>

                    <span
                      className={`
                        text-2xl
                        font-black
                        ${
                          isDarkMode
                            ? "text-white/10"
                            : "text-slate-200"
                        }
                      `}
                    >
                      {step.num}
                    </span>

                  </div>

                  <h3
                    className={`
                      mb-2
                      font-black
                      ${textPrimary}
                    `}
                  >
                    {step.title}
                  </h3>

                  <p
                    className={`
                      text-xs
                      leading-7
                      ${textSecondary}
                    `}
                  >
                    {step.desc}
                  </p>

                </div>
              );
            })}

          </div>
        </section>

        {/* ===================================================
            CORE FEATURES
        =================================================== */}

        <section className="space-y-9">

          <div>

            <span className="text-xs font-black uppercase tracking-widest text-purple-400">
              What Makes JOT Different
            </span>

            <h2
              className={`
                mt-3
                text-3xl
                font-black
                sm:text-4xl
                ${textPrimary}
              `}
            >
              More than just
              <br />
              question generation.
            </h2>

          </div>

          <div className="grid gap-5 md:grid-cols-3">

            {values.map((value) => {
              const Icon = value.icon;

              return (
                <div
                  key={value.title}
                  className={`
                    rounded-3xl
                    border
                    p-7
                    transition-all
                    duration-300
                    hover:-translate-y-1
                    ${card}
                  `}
                >

                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
                    <Icon size={22} />
                  </div>

                  <h3
                    className={`
                      mb-3
                      font-black
                      ${textPrimary}
                    `}
                  >
                    {value.title}
                  </h3>

                  <p
                    className={`
                      text-sm
                      leading-7
                      ${textSecondary}
                    `}
                  >
                    {value.desc}
                  </p>

                </div>
              );
            })}

          </div>
        </section>

        {/* ===================================================
            JOJO CTA
        =================================================== */}

        <section
          className={`
            relative
            overflow-hidden
            rounded-[36px]
            border
            p-8
            text-center
            sm:p-12
            ${
              isDarkMode
                ? "border-purple-400/20 bg-gradient-to-br from-[#24163A] via-[#181329] to-[#100D17]"
                : "border-purple-100 bg-gradient-to-br from-purple-50 via-white to-indigo-50"
            }
          `}
        >

          <div
            className={`
              absolute
              -right-20
              -top-20
              h-64
              w-64
              rounded-full
              blur-3xl
              ${
                isDarkMode
                  ? "bg-purple-500/15"
                  : "bg-purple-300/20"
              }
            `}
          />

          <div
            className={`
              absolute
              -bottom-20
              -left-20
              h-64
              w-64
              rounded-full
              blur-3xl
              ${
                isDarkMode
                  ? "bg-purple-500/10"
                  : "bg-purple-200/20"
              }
            `}
          />

          <div className="relative">

            <div className="mb-5 flex justify-center">

              <div
                className={`
                  flex
                  h-28
                  w-28
                  items-center
                  justify-center
                  rounded-full
                  ${
                    isDarkMode
                      ? "bg-white/5"
                      : "bg-white shadow-sm"
                  }
                `}
              >
                <img
                  src={currentJojo}
                  alt="Jojo"
                  className="h-24 w-24 object-contain"
                />
              </div>

            </div>

            <h2
              className={`
                text-3xl
                font-black
                sm:text-4xl
                ${textPrimary}
              `}
            >
              Ready to JOT?
            </h2>

            <p
              className={`
                mx-auto
                mt-4
                max-w-lg
                text-sm
                leading-7
                ${textSecondary}
              `}
            >
              Your notes are waiting. Give Jojo something
              to work with and turn that study chaos into
              something a little more manageable.
            </p>

            <button
              type="button"
              onClick={() =>
                onNavigate && onNavigate("signup")
              }
              className="
                mt-7
                rounded-2xl
                bg-[#8064C7]
                px-8
                py-4
                text-sm
                font-black
                text-white
                shadow-lg
                shadow-purple-500/20
                transition
                hover:scale-105
                hover:bg-[#9275D8]
              "
            >
              Create Free Account ✨
            </button>

          </div>

        </section>

        {/* ===================================================
            TEAM
        =================================================== */}

        <section className="space-y-9">

          <div className="text-center">

            <span className="text-xs font-black uppercase tracking-widest text-purple-400">
              The People Behind JOT
            </span>

            <h2
              className={`
                mt-3
                text-3xl
                font-black
                sm:text-4xl
                ${textPrimary}
              `}
            >
              Meet the Team
            </h2>

            <p
              className={`
                mx-auto
                mt-4
                max-w-2xl
                text-sm
                ${textSecondary}
              `}
            >
              Five people, different strengths, one very
              ambitious study buddy.
            </p>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

            {teamMembers.map((member, index) => (
              <div
                key={member.name}
                className={`
                  rounded-3xl
                  border
                  p-5
                  transition-all
                  duration-300
                  hover:-translate-y-2
                  ${card}
                `}
              >

                <div className="mb-5 flex justify-between">

                  <div
                    className={`
                      flex
                      h-12
                      w-12
                      items-center
                      justify-center
                      rounded-2xl
                      font-black
                      ${
                        isDarkMode
                          ? "bg-purple-500/10 text-purple-300"
                          : "bg-purple-50 text-purple-700"
                      }
                    `}
                  >
                    {member.initials}
                  </div>

                  <span
                    className={`
                      text-xs
                      font-black
                      ${
                        isDarkMode
                          ? "text-white/20"
                          : "text-slate-300"
                      }
                    `}
                  >
                    0{index + 1}
                  </span>

                </div>

                <h3
                  className={`
                    font-black
                    ${textPrimary}
                  `}
                >
                  {member.name}
                </h3>

                <p
                  className={`
                    mt-1
                    text-xs
                    font-bold
                    ${textSecondary}
                  `}
                >
                  {member.role}
                </p>

                <div className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-purple-500/10 px-2.5 py-1 text-[10px] font-black text-purple-400">
                  <Zap size={10} />
                  {member.focus}
                </div>

                <div
                  className={`
                    mt-5
                    flex
                    gap-2
                    border-t
                    pt-4
                    ${
                      isDarkMode
                        ? "border-white/10"
                        : "border-slate-200"
                    }
                  `}
                >

                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                    className={`
                      flex
                      flex-1
                      items-center
                      justify-center
                      rounded-xl
                      border
                      py-2
                      text-xs
                      font-bold
                      ${
                        isDarkMode
                          ? "border-white/10 hover:bg-white/5"
                          : "border-slate-200 hover:bg-slate-50"
                      }
                    `}
                  >
                    GitHub
                  </a>

                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noreferrer"
                    className={`
                      flex
                      items-center
                      justify-center
                      rounded-xl
                      border
                      px-3
                      ${
                        isDarkMode
                          ? "border-white/10 hover:bg-white/5"
                          : "border-slate-200 hover:bg-slate-50"
                      }
                    `}
                  >
                    LinkedIn
                  </a>

                </div>

              </div>
            ))}

          </div>
        </section>

      </main>

      {/* =====================================================
          SHARED FOOTER
      ===================================================== */}

      <JotFooter />
    </div>
  );
}