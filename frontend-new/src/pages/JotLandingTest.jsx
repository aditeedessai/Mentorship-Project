import React, { useEffect, useState } from "react";
import {
  Menu,
  X,
  ArrowRight,
  Sparkles,
  FileText,
  Brain,
  Target,
  Layers,
  Check,
  Upload,
  ChevronDown,
  Wand2,
  GraduationCap,
} from "lucide-react";

import { useTheme } from "../context/ThemeContext";
import jojoImage from "../assets/jojo-waving.png";
import JotFooter from "../components/JotFooter";

/* =========================================================
   JOT BRAND COLORS
   SOURCE OF TRUTH — DO NOT CHANGE
========================================================= */

const COLORS = {
  primary: "#8064C7",
  primaryDark: "#6248A8",
  primaryLight: "#A58CDD",
  deep: "#5D4298",

  background: "#F2F1F6",
  surface: "#FFFFFF",
  lavender: "#E5DCF8",
  lavenderLight: "#F1EAFA",

  text: "#231B33",
  textMuted: "#706A78",

  mint: "#98E8DE",
  teal: "#45A9A9",

  darkBackground: "#0B0910",
  darkSurface: "#14101D",
  darkSurfaceTwo: "#181321",
};

/* =========================================================
   GLASS CARD
========================================================= */

const GlassCard = ({
  children,
  className = "",
  isDarkMode,
  style = {},
}) => {
  return (
    <div
      style={style}
      className={`
        border
        backdrop-blur-2xl
        transition-all
        duration-500
        ${
          isDarkMode
            ? `
              border-white/10
              bg-[#14101D]/75
              shadow-[0_12px_40px_rgba(0,0,0,0.25)]
              text-[#F3F0F8]
            `
            : `
              border-[#8064C7]/10
              bg-white/75
              shadow-[0_8px_30px_rgba(80,60,120,0.06)]
              text-[#231B33]
            `
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
};

/* =========================================================
   JOJO
========================================================= */

const Jojo = ({
  isDarkMode,
  scrollOffset = 0,
}) => {
  return (
    <div
      className="relative flex items-center justify-center jojo-float"
      style={{
        transform: `translateY(${scrollOffset}px)`,
      }}
    >
      {/* Glow */}

      <div
        className={`
          absolute
          h-[330px]
          w-[330px]
          rounded-full
          blur-[90px]
          animate-pulse-slow
          ${
            isDarkMode
              ? "bg-[#8064C7]/15"
              : "bg-[#8064C7]/12"
          }
        `}
      />

      {/* =================================================
          ROTATING ORBIT ELEMENTS
          These are attached directly to the orbit
          circumference so they rotate around Jojo.
      ================================================= */}

      {/* OUTER ORBIT */}

      <div
        className="
          pointer-events-none
          absolute
          left-1/2
          top-1/2
          h-[375px]
          w-[375px]
          -ml-[187.5px]
          -mt-[187.5px]
          rounded-full
          border
          border-[#8064C7]/10
          md:h-[415px]
          md:w-[415px]
          md:-ml-[207.5px]
          md:-mt-[207.5px]
        "
      >
        {/* Rotating wrapper */}

        <div
          className="
            absolute
            inset-0
            rounded-full
            orbit-animation
          "
        >
          {/* Top bubble */}

          <span
            className="
              absolute
              left-1/2
              top-[-6px]
              h-3.5
              w-3.5
              -translate-x-1/2
              rounded-full
              bg-[#8064C7]
              shadow-[0_0_18px_rgba(128,100,199,.45)]
            "
          />

          {/* Right bubble */}

          <span
            className="
              absolute
              right-[-6px]
              top-1/2
              h-3
              w-3
              -translate-y-1/2
              rounded-full
              bg-[#98E8DE]
              shadow-[0_0_16px_rgba(152,232,222,.45)]
            "
          />

          {/* Bottom bubble */}

          <span
            className="
              absolute
              bottom-[-6px]
              left-1/2
              h-2.5
              w-2.5
              -translate-x-1/2
              rounded-full
              bg-[#A58CDD]
              shadow-[0_0_16px_rgba(165,140,221,.4)]
            "
          />

          {/* Left sparkle */}

          <span
            className="
              absolute
              left-[-5px]
              top-1/2
              flex
              h-3
              w-3
              -translate-y-1/2
              items-center
              justify-center
              text-[#45A9A9]
            "
          >
            ✦
          </span>
        </div>
      </div>

      {/* INNER ORBIT */}

      <div
        className="
          pointer-events-none
          absolute
          left-1/2
          top-1/2
          h-[345px]
          w-[345px]
          -ml-[172.5px]
          -mt-[172.5px]
          rounded-full
          md:h-[385px]
          md:w-[385px]
          md:-ml-[192.5px]
          md:-mt-[192.5px]
        "
      >
        <div
          className="
            absolute
            inset-0
            rounded-full
            orbit-animation
          "
          style={{
            animationDirection: "reverse",
            animationDuration: "15s",
          }}
        >
          {/* Small lavender bubble */}

          <span
            className="
              absolute
              left-1/2
              top-[-4px]
              h-2
              w-2
              -translate-x-1/2
              rounded-full
              bg-[#A58CDD]
              shadow-[0_0_12px_rgba(165,140,221,.5)]
            "
          />

          {/* Small mint bubble */}

          <span
            className="
              absolute
              bottom-[-4px]
              left-1/2
              h-2
              w-2
              -translate-x-1/2
              rounded-full
              bg-[#98E8DE]
              shadow-[0_0_12px_rgba(152,232,222,.5)]
            "
          />
        </div>
      </div>

      {/* Circle */}

      <div
        className={`
          relative
          flex
          h-[290px]
          w-[290px]
          items-center
          justify-center
          overflow-hidden
          rounded-full
          border
          backdrop-blur-xl
          transition-all
          duration-500
          hover:scale-[1.025]
          md:h-[330px]
          md:w-[330px]
          ${
            isDarkMode
              ? "border-white/15 bg-[#181321]/90 shadow-[0_25px_70px_rgba(0,0,0,0.35)]"
              : "border-[#8064C7]/10 bg-white/80 shadow-[0_20px_60px_rgba(80,60,120,0.10)]"
          }
        `}
      >
        {/* Orbit ring */}

        <div
          className={`
            absolute
            inset-5
            rounded-full
            border
            border-dashed
            ${
              isDarkMode
                ? "border-white/10"
                : "border-[#8064C7]/15"
            }
            orbit-ring
          `}
        />

        <img
          src={jojoImage}
          alt="Jojo - JOT study buddy"
          className="
            relative
            z-10
            h-full
            w-full
            object-contain
            p-5
          "
        />
      </div>

      {/* Sparkle */}

      <Sparkles
        size={22}
        className="
          absolute
          right-[3%]
          top-[15%]
          text-[#8064C7]
          sparkle-one
        "
      />

      <Sparkles
        size={17}
        className="
          absolute
          bottom-[18%]
          left-[8%]
          text-[#98E8DE]
          sparkle-two
        "
      />
    </div>
  );
};

/* =========================================================
   LANDING PAGE
========================================================= */

const JotLandingTest = ({
  onNavigate,
  isDarkMode: propDarkMode,
  onToggleDarkMode,
}) => {
  const {
    isDarkMode: themeDarkMode,
    toggleDarkMode,
  } = useTheme();

  const isDarkMode =
    propDarkMode !== undefined
      ? propDarkMode
      : themeDarkMode;

  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  const [activeSection, setActiveSection] =
    useState("home");

  const [isNavScrolled, setIsNavScrolled] =
    useState(false);

  const [visibleElements, setVisibleElements] =
    useState(new Set());

  const [scrollY, setScrollY] = useState(0);

  const [workflowStep, setWorkflowStep] =
    useState(0);

  /* =======================================================
     SCROLL TOP
  ======================================================= */

  useEffect(() => {
    window.scrollTo(0, 0);

    const mainElement =
      document.querySelector("main");

    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  }, []);

  /* =======================================================
     SCROLL HANDLER
  ======================================================= */

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;

      window.requestAnimationFrame(() => {
        setScrollY(window.scrollY);

        setIsNavScrolled(
          window.scrollY > 35
        );

        ticking = false;
      });

      ticking = true;
    };

    window.addEventListener(
      "scroll",
      handleScroll,
      { passive: true }
    );

    handleScroll();

    return () =>
      window.removeEventListener(
        "scroll",
        handleScroll
      );
  }, []);

  /* =======================================================
     WORKFLOW AUTO ANIMATION
  ======================================================= */

  useEffect(() => {
    const interval = setInterval(() => {
      setWorkflowStep(
        (previous) => (previous + 1) % 4
      );
    }, 2400);

    return () => clearInterval(interval);
  }, []);

  /* =======================================================
     SCROLL REVEAL
  ======================================================= */

  useEffect(() => {
    const elements =
      document.querySelectorAll(
        "[data-reveal]"
      );

    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            setVisibleElements(
              (previous) => {
                const next =
                  new Set(previous);

                next.add(
                  entry.target.dataset.reveal
                );

                return next;
              }
            );
          });
        },
        {
          threshold: 0.12,
          rootMargin:
            "0px 0px -80px 0px",
        }
      );

    elements.forEach((element) =>
      observer.observe(element)
    );

    return () =>
      observer.disconnect();
  }, []);

  /* =======================================================
     ACTIVE NAV
  ======================================================= */

  useEffect(() => {
    const sections = [
      "home",
      "how",
      "jojo",
    ]
      .map((id) =>
        document.getElementById(id)
      )
      .filter(Boolean);

    const observer =
      new IntersectionObserver(
        (entries) => {
          const visible =
            entries
              .filter(
                (entry) =>
                  entry.isIntersecting
              )
              .sort(
                (a, b) =>
                  b.intersectionRatio -
                  a.intersectionRatio
              );

          if (visible.length > 0) {
            setActiveSection(
              visible[0].target.id
            );
          }
        },
        {
          rootMargin:
            "-20% 0px -65% 0px",
          threshold: [
            0.1,
            0.25,
            0.5,
          ],
        }
      );

    sections.forEach((section) =>
      observer.observe(section)
    );

    return () =>
      observer.disconnect();
  }, []);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const scrollToSection = (
    sectionId
  ) => {
    const section =
      document.getElementById(
        sectionId
      );

    if (!section) return;

    setIsMobileMenuOpen(false);

    const navbarOffset = 88;

    const targetPosition =
      section.getBoundingClientRect()
        .top +
      window.scrollY -
      navbarOffset;

    const reducedMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

    window.scrollTo({
      top: Math.max(
        0,
        targetPosition
      ),
      behavior: reducedMotion
        ? "auto"
        : "smooth",
    });
  };

  const handleStart = () => {
    if (onNavigate) {
      onNavigate("login");
    }
  };

  const handleAbout = () => {
    if (onNavigate) {
      onNavigate("about");
    }
  };

  /* =======================================================
     REVEAL HELPER
  ======================================================= */

  const revealClass = (
    id,
    animation = "reveal-up"
  ) => {
    return `
      ${animation}
      ${
        visibleElements.has(id)
          ? "reveal-visible"
          : ""
      }
    `;
  };

  /* =======================================================
     PARALLAX VALUES
  ======================================================= */

  const heroTextOffset =
    Math.min(
      scrollY * -0.045,
      45
    );

  const heroVisualOffset =
    Math.min(
      scrollY * -0.025,
      28
    );

  const workflowOffset =
    Math.min(
      Math.max(
        (scrollY - 450) * -0.025,
        -22
      ),
      22
    );

  const meetJojoOffset =
    Math.min(
      Math.max(
        (scrollY - 1500) * 0.02,
        -18
      ),
      18
    );

  /* =======================================================
     WORKFLOW DATA
  ======================================================= */

  const workflowItems = [
    {
      icon: Upload,
      number: "01",
      title: "Upload",
      text: "Drop in your notes, PDFs or slides.",
    },
    {
      icon: Brain,
      number: "02",
      title: "Understand",
      text: "Jojo analyzes the material intelligently.",
    },
    {
      icon: Layers,
      number: "03",
      title: "Transform",
      text: "Your material becomes useful study content.",
    },
    {
      icon: GraduationCap,
      number: "04",
      title: "Study",
      text: "Learn, practice and revise with confidence.",
    },
  ];

  return (
    <div
      className={`
        min-h-screen
        overflow-x-hidden
        font-sans
        transition-colors
        duration-500
        ${
          isDarkMode
            ? "bg-[#0B0910] text-[#F3F0F8]"
            : "bg-[#F2F1F6] text-[#231B33]"
        }
      `}
    >

      {/* ===================================================
          ANIMATION STYLES
      =================================================== */}

      <style>{`

        /* ===============================================
           AMBIENT GLOW
        =============================================== */

        @keyframes ambientGlow {
          0%, 100% {
            transform:
              translate3d(0,0,0)
              scale(1);
            opacity: .35;
          }

          50% {
            transform:
              translate3d(20px,-25px,0)
              scale(1.08);
            opacity: .55;
          }
        }

        @keyframes ambientGlowReverse {
          0%, 100% {
            transform:
              translate3d(0,0,0)
              scale(1);
            opacity: .25;
          }

          50% {
            transform:
              translate3d(-25px,20px,0)
              scale(1.12);
            opacity: .45;
          }
        }

        .ambient-glow {
          animation:
            ambientGlow
            9s
            ease-in-out
            infinite;
        }

        .ambient-glow-reverse {
          animation:
            ambientGlowReverse
            11s
            ease-in-out
            infinite;
        }

        /* ===============================================
           HERO ENTRANCE
        =============================================== */

        @keyframes heroEntrance {
          from {
            opacity: 0;
            transform:
              translateY(35px)
              scale(.98);
          }

          to {
            opacity: 1;
            transform:
              translateY(0)
              scale(1);
          }
        }

        .hero-entrance {
          opacity: 0;
          animation:
            heroEntrance
            .9s
            cubic-bezier(.22,1,.36,1)
            forwards;
        }

        .hero-delay-1 {
          animation-delay: .08s;
        }

        .hero-delay-2 {
          animation-delay: .18s;
        }

        .hero-delay-3 {
          animation-delay: .3s;
        }

        .hero-delay-4 {
          animation-delay: .44s;
        }

        .hero-delay-5 {
          animation-delay: .6s;
        }

        /* ===============================================
           HERO SPOTLIGHT
        =============================================== */

        @keyframes heroSpotlight {
          0%,100% {
            opacity: .2;
            transform:
              scale(.95)
              translateY(0);
          }

          50% {
            opacity: .4;
            transform:
              scale(1.05)
              translateY(-8px);
          }
        }

        .hero-spotlight {
          animation:
            heroSpotlight
            6s
            ease-in-out
            infinite;
        }

        /* ===============================================
           PARTICLES
        =============================================== */

        @keyframes particleA {
          0%,100% {
            transform:
              translate3d(0,0,0)
              scale(1);
            opacity: .35;
          }

          50% {
            transform:
              translate3d(0,-18px,0)
              scale(1.25);
            opacity: .9;
          }
        }

        @keyframes particleB {
          0%,100% {
            transform:
              translate3d(0,0,0);
            opacity: .3;
          }

          50% {
            transform:
              translate3d(12px,-12px,0);
            opacity: 1;
          }
        }

        @keyframes particleC {
          0%,100% {
            transform:
              translate3d(0,0,0)
              rotate(0deg);
          }

          50% {
            transform:
              translate3d(-10px,-15px,0)
              rotate(90deg);
          }
        }

        .particle-a {
          animation:
            particleA
            3.2s
            ease-in-out
            infinite;
        }

        .particle-b {
          animation:
            particleB
            4.1s
            ease-in-out
            infinite;
        }

        .particle-c {
          animation:
            particleC
            5s
            ease-in-out
            infinite;
        }

        /* ===============================================
           CARD FLOATING
        =============================================== */

        @keyframes cardFloatA {
          0%,100% {
            transform:
              rotate(5deg)
              translateY(0);
          }

          50% {
            transform:
              rotate(5deg)
              translateY(-10px);
          }
        }

        @keyframes cardFloatB {
          0%,100% {
            transform:
              translateY(0);
          }

          50% {
            transform:
              translateY(-8px);
          }
        }

        @keyframes cardFloatC {
          0%,100% {
            transform:
              translateY(0);
          }

          50% {
            transform:
              translateY(-11px);
          }
        }

        @keyframes cardFloatD {
          0%,100% {
            transform:
              translateX(-50%)
              translateY(0);
          }

          50% {
            transform:
              translateX(-50%)
              translateY(-8px);
          }
        }

        .card-float-a {
          animation:
            cardFloatA
            4.5s
            ease-in-out
            infinite;
        }

        .card-float-b {
          animation:
            cardFloatB
            3.7s
            ease-in-out
            infinite;
        }

        .card-float-c {
          animation:
            cardFloatC
            4.2s
            ease-in-out
            infinite;
        }

        .card-float-d {
          animation:
            cardFloatD
            4s
            ease-in-out
            infinite;
        }

        .float-card-notes {
          animation:
            cardFloatA
            4.5s
            ease-in-out
            infinite;
        }

        .float-card-summary {
          animation:
            cardFloatB
            3.7s
            ease-in-out
            infinite;
        }

        .float-card-quiz {
          animation:
            cardFloatC
            4.2s
            ease-in-out
            infinite;
        }

        /* ===============================================
           JOJO
        =============================================== */

        @keyframes jojoFloat {
          0%,100% {
            transform:
              translateY(0)
              rotate(0deg);
          }

          50% {
            transform:
              translateY(-12px)
              rotate(1deg);
          }
        }

        .jojo-float {
          animation:
            jojoFloat
            3.8s
            ease-in-out
            infinite;
        }

        @keyframes jojoGlow {
          0%,100% {
            opacity: .35;
            transform: scale(1);
          }

          50% {
            opacity: .75;
            transform: scale(1.08);
          }
        }

        .jojo-glow {
          animation:
            jojoGlow
            4s
            ease-in-out
            infinite;
        }

        /* ===============================================
           SPEECH
        =============================================== */

        @keyframes speechPop {
          0% {
            opacity: 0;
            transform:
              scale(.8)
              translateY(10px);
          }

          70% {
            transform:
              scale(1.04)
              translateY(-2px);
          }

          100% {
            opacity: 1;
            transform:
              scale(1)
              translateY(0);
          }
        }

        .speech-pop {
          animation:
            speechPop
            .8s
            cubic-bezier(.22,1,.36,1)
            .8s
            both;
        }

        /* ===============================================
           SLOW PULSE
        =============================================== */

        @keyframes slowPulse {
          0%,100% {
            opacity: .65;
            transform: scale(1);
          }

          50% {
            opacity: 1;
            transform: scale(1.08);
          }
        }

        .animate-pulse-slow {
          animation:
            slowPulse
            5s
            ease-in-out
            infinite;
        }

        /* ===============================================
           ORBIT
        =============================================== */

        @keyframes orbitSpin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        .orbit-ring {
          animation:
            orbitSpin
            22s
            linear
            infinite;
        }

        .orbit-animation {
          animation:
            orbitSpin
            22s
            linear
            infinite;
        }

        /* ===============================================
           SPARKLES
        =============================================== */

        @keyframes sparkleFloat {
          0%,100% {
            opacity: .45;
            transform:
              translateY(0)
              rotate(0deg)
              scale(1);
          }

          50% {
            opacity: 1;
            transform:
              translateY(-8px)
              rotate(12deg)
              scale(1.12);
          }
        }

        .sparkle-one {
          animation:
            sparkleFloat
            2.8s
            ease-in-out
            infinite;
        }

        .sparkle-two {
          animation:
            sparkleFloat
            3.4s
            ease-in-out
            infinite
            .5s;
        }

        .sparkle-animation {
          animation:
            sparkleFloat
            2.8s
            ease-in-out
            infinite;
        }

        /* ===============================================
           SHINE
        =============================================== */

        @keyframes buttonShine {
          0% {
            transform:
              translateX(-120%);
          }

          100% {
            transform:
              translateX(120%);
          }
        }

        .button-shine {
          position: relative;
          overflow: hidden;
        }

        .button-shine::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 40%;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255,255,255,.28),
              transparent
            );
          transform:
            translateX(-120%);
        }

        .button-shine:hover::after {
          animation:
            buttonShine
            .8s
            ease;
        }

        /* ===============================================
           SCAN
        =============================================== */

        @keyframes scanMove {
          0% {
            transform:
              translateY(-100%);
          }

          100% {
            transform:
              translateY(500%);
          }
        }

        .scan-line {
          animation:
            scanMove
            2.8s
            linear
            infinite;
        }

        /* ===============================================
           PROGRESS
        =============================================== */

        @keyframes progressMove {
          0% {
            width: 15%;
          }

          50% {
            width: 72%;
          }

          100% {
            width: 92%;
          }
        }

        .progress-moving,
        .progress-animation {
          animation:
            progressMove
            2.8s
            ease-in-out
            infinite;
        }

        /* ===============================================
           PULSE DOT
        =============================================== */

        @keyframes pulseDot {
          0%,100% {
            opacity: .35;
            transform: scale(.8);
          }

          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }

        .pulse-dot {
          animation:
            pulseDot
            1.4s
            ease-in-out
            infinite;
        }

        /* ===============================================
           ARROWS
        =============================================== */

        @keyframes arrowMove {
          0%,100% {
            transform:
              translateX(0);
          }

          50% {
            transform:
              translateX(5px);
          }
        }

        .arrow-move {
          animation:
            arrowMove
            1.5s
            ease-in-out
            infinite;
        }

        @keyframes bounceArrow {
          0%,100% {
            transform:
              translateY(0);
          }

          50% {
            transform:
              translateY(6px);
          }
        }

        .bounce-arrow {
          animation:
            bounceArrow
            1.8s
            ease-in-out
            infinite;
        }

        /* ===============================================
           SCROLL REVEAL
        =============================================== */

        .scroll-reveal,
        .scroll-left,
        .scroll-right,
        .scroll-scale,
        .reveal-up,
        .reveal-left,
        .reveal-right,
        .reveal-scale {
          opacity: 0;
          transition:
            opacity .8s ease,
            transform .8s ease;
        }

        .scroll-reveal,
        .reveal-up {
          transform:
            translateY(35px);
        }

        .scroll-left,
        .reveal-left {
          transform:
            translateX(-35px);
        }

        .scroll-right,
        .reveal-right {
          transform:
            translateX(35px);
        }

        .scroll-scale,
        .reveal-scale {
          transform:
            scale(.94);
        }

        .reveal-visible {
          opacity: 1;
          transform:
            translate(0)
            scale(1);
        }

        /* ===============================================
           STAGGER
        =============================================== */

        .stagger-1 {
          transition-delay: .08s;
        }

        .stagger-2 {
          transition-delay: .16s;
        }

        .stagger-3 {
          transition-delay: .24s;
        }

        .stagger-4 {
          transition-delay: .32s;
        }

        /* ===============================================
           INTERACTIVE CARDS
        =============================================== */

        .interactive-card {
          transition:
            transform .35s ease,
            box-shadow .35s ease,
            border-color .35s ease;
        }

        .interactive-card:hover {
          transform:
            translateY(-8px);
        }

        .feature-card {
          transition:
            transform .35s ease,
            box-shadow .35s ease;
        }

        .feature-card:hover {
          transform:
            translateY(-8px)
            scale(1.01);
        }

        .feature-arrow {
          transition:
            transform .3s ease;
        }

        .feature-card:hover
        .feature-arrow {
          transform:
            translateX(5px);
        }

        /* ===============================================
           NAV LINE
        =============================================== */

        .nav-line {
          position: relative;
        }

        .nav-line::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -5px;
          width: 0;
          height: 2px;
          border-radius: 999px;
          background:
            #8064C7;
          transform:
            translateX(-50%);
          transition:
            width .3s ease;
        }

        .nav-line:hover::after,
        .nav-line.active::after {
          width: 70%;
        }

        /* ===============================================
           MOBILE
        =============================================== */

        @media (max-width:640px) {
          .jojo-float {
            animation-duration:
              4.5s;
          }
        }

        /* ===============================================
           REDUCED MOTION
        =============================================== */

        @media (
          prefers-reduced-motion: reduce
        ) {
          *,
          *::before,
          *::after {
            animation-duration:
              .01ms !important;
            animation-iteration-count:
              1 !important;
            scroll-behavior:
              auto !important;
          }

          .reveal-up,
          .reveal-left,
          .reveal-right,
          .reveal-scale,
          .scroll-reveal,
          .scroll-left,
          .scroll-right,
          .scroll-scale {
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* ===================================================
          AMBIENT BACKGROUND
      =================================================== */}

      <div
        className="
          pointer-events-none
          fixed
          inset-0
          -z-10
          overflow-hidden
        "
      >
        <div
          className={`
            ambient-glow
            absolute
            -left-40
            -top-40
            h-[550px]
            w-[550px]
            rounded-full
            blur-[160px]
            ${
              isDarkMode
                ? "bg-[#8064C7]/10"
                : "bg-[#8064C7]/7"
            }
          `}
        />

        <div
          className={`
            ambient-glow-reverse
            absolute
            -right-40
            top-[20%]
            h-[500px]
            w-[500px]
            rounded-full
            blur-[160px]
            ${
              isDarkMode
                ? "bg-[#6248A8]/8"
                : "bg-[#E5DCF8]/80"
            }
          `}
        />

        <div
          className={`
            ambient-glow
            absolute
            bottom-[-250px]
            left-[25%]
            h-[500px]
            w-[500px]
            rounded-full
            blur-[170px]
            ${
              isDarkMode
                ? "bg-[#45A9A9]/5"
                : "bg-[#98E8DE]/10"
            }
          `}
        />
      </div>

      {/* ===================================================
          NAVBAR
      =================================================== */}

      <nav
        className={`
          fixed
          left-0
          right-0
          top-0
          z-[100]
          backdrop-blur-xl
          transition-all
          duration-500
          ${
            isNavScrolled
              ? isDarkMode
                ? "bg-[#0B0910]/80 shadow-[0_8px_35px_rgba(0,0,0,.25)]"
                : "bg-[#F2F1F6]/85 shadow-[0_8px_35px_rgba(80,60,120,.08)]"
              : "bg-transparent"
          }
        `}
      >
        <div
          className="
            mx-auto
            flex
            h-[76px]
            max-w-6xl
            items-center
            justify-between
            px-4
            sm:px-6
            lg:px-8
          "
        >
          {/* LOGO */}

          <button
            type="button"
            onClick={() =>
              scrollToSection("home")
            }
            className="
              flex
              cursor-pointer
              items-center
              gap-3
            "
          >
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-[#8064C7]
                text-lg
                font-black
                text-white
                shadow-[0_8px_20px_rgba(128,100,199,.25)]
                transition
                duration-300
                hover:-rotate-3
                hover:scale-105
              "
            >
              J
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`
                  text-lg
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
              </span>

              <span
                className="
                  hidden
                  rounded-full
                  bg-[#8064C7]/10
                  px-2.5
                  py-1
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-widest
                  text-[#8064C7]
                  sm:block
                "
              >
                study
              </span>
            </div>
          </button>

          {/* DESKTOP NAV */}

          <div
            className={`
              hidden
              items-center
              gap-7
              text-sm
              font-semibold
              md:flex
              ${
                isDarkMode
                  ? "text-white/80"
                  : "text-[#231B33]"
              }
            `}
          >
            {[
              ["home", "Home"],
              ["how", "How it works"],
              ["jojo", "Meet Jojo"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() =>
                  scrollToSection(id)
                }
                className={`
                  nav-line
                  cursor-pointer
                  transition
                  duration-300
                  hover:text-[#8064C7]
                  ${
                    activeSection === id
                      ? "active text-[#8064C7]"
                      : ""
                  }
                `}
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={handleAbout}
              className="
                cursor-pointer
                transition
                duration-300
                hover:text-[#8064C7]
              "
            >
              About Us
            </button>
          </div>

          {/* RIGHT */}

          <div
            className="
              flex
              items-center
              gap-2
              sm:gap-3
            "
          >
            {/* THEME */}

            <button
              type="button"
              onClick={
                onToggleDarkMode ||
                toggleDarkMode
              }
              aria-label="Toggle theme"
              className={`
                flex
                h-9
                w-9
                cursor-pointer
                items-center
                justify-center
                rounded-xl
                border
                text-sm
                transition
                duration-300
                hover:scale-105
                active:scale-95
                sm:h-10
                sm:w-10
                ${
                  isDarkMode
                    ? "border-white/10 bg-white/10 hover:bg-white/15"
                    : "border-[#8064C7]/10 bg-white/60 hover:bg-white"
                }
              `}
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>

            {/* LOGIN */}

            <button
              type="button"
              onClick={handleStart}
              className={`
                hidden
                cursor-pointer
                rounded-xl
                px-4
                py-2.5
                text-sm
                font-bold
                transition
                duration-300
                hover:-translate-y-0.5
                md:block
                ${
                  isDarkMode
                    ? "text-white/80 hover:bg-white/10 hover:text-white"
                    : "text-[#231B33] hover:bg-[#8064C7]/5"
                }
              `}
            >
              Log in
            </button>

            {/* GET STARTED */}

            <button
              type="button"
              onClick={handleStart}
              className="
                button-shine
                cursor-pointer
                rounded-xl
                bg-[#8064C7]
                px-3.5
                py-2.5
                text-xs
                font-bold
                text-white
                shadow-[0_10px_25px_rgba(128,100,199,.25)]
                transition
                duration-300
                hover:-translate-y-1
                hover:bg-[#6248A8]
                hover:shadow-[0_15px_35px_rgba(128,100,199,.35)]
                active:scale-95
                sm:px-5
                sm:text-sm
              "
            >
              <span className="relative z-10">
                Get Started
                <ArrowRight
                  size={15}
                  className="
                    ml-1
                    inline
                    arrow-move
                  "
                />
              </span>
            </button>

            {/* MOBILE */}

            <button
              type="button"
              onClick={() =>
                setIsMobileMenuOpen(
                  (previous) =>
                    !previous
                )
              }
              className={`
                flex
                h-9
                w-9
                cursor-pointer
                items-center
                justify-center
                rounded-xl
                border
                transition
                md:hidden
                ${
                  isDarkMode
                    ? "border-white/10 bg-white/5"
                    : "border-[#8064C7]/10 bg-white/60"
                }
              `}
              aria-label="Open menu"
            >
              {isMobileMenuOpen ? (
                <X size={18} />
              ) : (
                <Menu size={18} />
              )}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}

        {isMobileMenuOpen && (
          <div
            className={`
              mx-4
              mb-4
              rounded-2xl
              border
              p-3
              shadow-xl
              backdrop-blur-2xl
              md:hidden
              ${
                isDarkMode
                  ? "border-white/10 bg-[#14101D]/95"
                  : "border-[#8064C7]/10 bg-white/95"
              }
            `}
          >
            {[
              ["home", "Home"],
              ["how", "How it works"],
              ["jojo", "Meet Jojo"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() =>
                  scrollToSection(id)
                }
                className="
                  w-full
                  rounded-xl
                  px-3
                  py-3
                  text-left
                  text-sm
                  font-bold
                  transition
                  hover:bg-[#8064C7]/10
                "
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleAbout();
              }}
              className="
                w-full
                rounded-xl
                px-3
                py-3
                text-left
                text-sm
                font-bold
                transition
                hover:bg-[#8064C7]/10
              "
            >
              About Us
            </button>
          </div>
        )}
      </nav>

      {/* ===================================================
          HERO
      =================================================== */}

      <section
        id="home"
        className="
          relative
          min-h-screen
          scroll-mt-24
          overflow-hidden
          px-4
          pb-14
          pt-24
          sm:px-6
          sm:pt-28
          md:px-10
          lg:px-16
        "
      >
        {/* PARTICLES */}

        <div
          className="
            particle-a
            pointer-events-none
            absolute
            left-[8%]
            top-[32%]
            h-2
            w-2
            rounded-full
            bg-[#8064C7]/50
          "
        />

        <div
          className="
            particle-b
            pointer-events-none
            absolute
            left-[45%]
            top-[22%]
            h-2
            w-2
            rounded-full
            bg-[#98E8DE]
          "
        />

        <div
          className="
            particle-c
            pointer-events-none
            absolute
            right-[10%]
            top-[38%]
            h-2
            w-2
            rounded-full
            bg-[#8064C7]/40
          "
        />

        <div
          className="
            absolute
            left-[30%]
            top-[15%]
            h-1.5
            w-1.5
            rounded-full
            bg-[#A58CDD]
            particle-a
          "
        />

        <div
          className="
            absolute
            bottom-[22%]
            right-[28%]
            h-1.5
            w-1.5
            rounded-full
            bg-[#45A9A9]
            particle-b
          "
        />

        <div
          className="
            mx-auto
            grid
            min-h-[calc(100vh-110px)]
            max-w-6xl
            items-center
            gap-10
            lg:grid-cols-[.92fr_1.08fr]
          "
        >
          {/* LEFT */}

          <div
            className="relative z-20"
            style={{
              transform:
                `translateY(${heroTextOffset}px)`,
            }}
          >
            {/* BADGE */}

            <div
              className="
                hero-entrance
                hero-delay-1
                mb-5
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-[#8064C7]/15
                bg-[#E5DCF8]/60
                px-4
                py-2
                text-xs
                font-bold
                text-[#6248A8]
                shadow-sm
                backdrop-blur-xl
                sm:text-sm
              "
            >
              <Sparkles
                size={15}
                className="text-[#8064C7]"
              />

              Your AI-powered study companion
            </div>

            {/* HEADING */}

            <h1
              className={`
                hero-entrance
                hero-delay-2
                max-w-2xl
                text-4xl
                font-black
                leading-[.94]
                tracking-[-0.045em]
                sm:text-5xl
                md:text-6xl
                lg:text-7xl
                xl:text-8xl
                ${
                  isDarkMode
                    ? "text-white"
                    : "text-[#231B33]"
                }
              `}
            >
              <span className="tracking-[0.001em]">
                Turn your notes
              </span>
              <br />

              <span
                className="
                  bg-gradient-to-r
                  from-[#6248A8]
                  via-[#8064C7]
                  to-[#A58CDD]
                  bg-clip-text
                  text-transparent
                "
              >
                into smarter
              </span>

              <br />

              <span className="tracking-[0.001em]">
                study.
              </span>
            </h1>

            {/* UNDERLINE */}

            <div
              className="
                hero-entrance
                hero-delay-3
                mt-5
                h-2
                w-28
                rotate-[-2deg]
                rounded-full
                bg-[#8064C7]/40
              "
            />

            {/* DESCRIPTION */}

            <p
              className={`
                hero-entrance
                hero-delay-3
                mt-6
                max-w-xl
                text-base
                leading-7
                sm:text-lg
                md:text-xl
                md:leading-8
                ${
                  isDarkMode
                    ? "text-white/55"
                    : "text-[#706A78]"
                }
              `}
            >
              Upload your study material
              and let Jojo transform it into
              smart summaries, quizzes,
              flashcards and quick revision
              support — all in one place.
            </p>

            {/* BUTTONS */}

            <div
              className="
                hero-entrance
                hero-delay-4
                mt-8
                flex
                flex-col
                gap-3
                sm:flex-row
              "
            >
              <button
                type="button"
                onClick={handleStart}
                className="
                  button-shine
                  relative
                  overflow-hidden
                  rounded-xl
                  bg-[#8064C7]
                  px-7
                  py-3.5
                  font-bold
                  text-white
                  shadow-[0_15px_35px_rgba(128,100,199,.30)]
                  transition
                  duration-300
                  hover:-translate-y-1
                  hover:bg-[#6248A8]
                  hover:shadow-[0_20px_45px_rgba(128,100,199,.38)]
                  active:scale-95
                "
              >
                <span className="relative z-10">
                  Start studying
                  <ArrowRight
                    size={17}
                    className="
                      ml-2
                      inline
                      arrow-move
                    "
                  />
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  scrollToSection("how")
                }
                className={`
                  rounded-xl
                  border
                  px-7
                  py-3.5
                  font-bold
                  backdrop-blur-xl
                  transition
                  duration-300
                  hover:-translate-y-1
                  ${
                    isDarkMode
                      ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                      : "border-[#8064C7]/15 bg-white/60 text-[#231B33] hover:bg-[#E5DCF8]/50"
                  }
                `}
              >
                See how it works
              </button>
            </div>

            {/* TRUST */}

            <div
              className="
                hero-entrance
                hero-delay-5
                mt-7
                flex
                flex-wrap
                gap-x-5
                gap-y-2
                text-xs
                font-semibold
                sm:text-sm
              "
            >
              {[
                "No complicated setup",
                "AI-powered",
                "Built for students",
              ].map((item) => (
                <span
                  key={item}
                  className={
                    isDarkMode
                      ? "text-white/45"
                      : "text-[#8B8492]"
                  }
                >
                  <Check
                    size={14}
                    className="
                      mr-1
                      inline
                      text-[#8064C7]
                    "
                  />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* =================================================
              HERO VISUAL
          ================================================= */}

          <div
            className="
              hero-entrance
              hero-delay-5
              relative
              min-h-[520px]
              lg:min-h-[600px]
            "
            style={{
              transform:
                `translateY(${heroVisualOffset}px)`,
            }}
          >
            {/* BIG SPOTLIGHT */}

            <div
              className="
                hero-spotlight
                absolute
                left-1/2
                top-1/2
                h-[430px]
                w-[430px]
                -translate-x-1/2
                -translate-y-1/2
                rounded-full
                bg-[#8064C7]/7
                blur-3xl
              "
            />

            {/* NOTES */}

            <GlassCard
              isDarkMode={isDarkMode}
              className="
                float-card-notes
                absolute
                left-[2%]
                top-[13%]
                z-30
                w-[190px]
                rounded-2xl
                p-4
                shadow-[0_20px_45px_rgba(80,60,120,.12)]
                sm:w-[215px]
              "
            >
              <div className="flex items-start gap-3">
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#E5DCF8]
                    text-[#8064C7]
                  "
                >
                  <FileText size={20} />
                </div>

                <div className="min-w-0">
                  <p
                    className={`
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-wider
                      ${
                        isDarkMode
                          ? "text-white/40"
                          : "text-[#8B8492]"
                      }
                    `}
                  >
                    PDF
                  </p>

                  <p
                    className={`
                      mt-1
                      truncate
                      text-sm
                      font-black
                      ${
                        isDarkMode
                          ? "text-white"
                          : "text-[#231B33]"
                      }
                    `}
                  >
                    Lecture Notes.pdf
                  </p>

                  <p
                    className={`
                      mt-1
                      text-[10px]
                      ${
                        isDarkMode
                          ? "text-white/40"
                          : "text-gray-500"
                      }
                    `}
                  >
                    42 pages • 3.2 MB
                  </p>

                  <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-[#8064C7]">
                    <Upload size={12} />
                    Uploaded
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* AI PROCESSING */}

            <GlassCard
              isDarkMode={isDarkMode}
              className="
                float-card-summary
                absolute
                right-[1%]
                top-[22%]
                z-30
                w-[195px]
                rounded-2xl
                p-4
                shadow-[0_20px_45px_rgba(80,60,120,.12)]
                sm:w-[225px]
              "
            >
              <div
                className="
                  absolute
                  inset-x-0
                  top-0
                  h-1/3
                  overflow-hidden
                  rounded-t-2xl
                  opacity-40
                "
              >
                <div
                  className="
                    scan-line
                    h-1
                    w-full
                    bg-[#8064C7]/40
                  "
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-xl
                      bg-[#E5DCF8]
                      text-[#8064C7]
                    "
                  >
                    <Wand2 size={18} />
                  </div>

                  <div>
                    <p className="text-xs font-black">
                      Jojo is thinking...
                    </p>

                    <p
                      className={`
                        text-[9px]
                        ${
                          isDarkMode
                            ? "text-white/40"
                            : "text-gray-500"
                        }
                      `}
                    >
                      Understanding your notes
                    </p>
                  </div>
                </div>

                <span
                  className="
                    h-2
                    w-2
                    rounded-full
                    bg-[#8064C7]
                    pulse-dot
                  "
                />
              </div>

              <div
                className={`
                  mt-4
                  h-2
                  overflow-hidden
                  rounded-full
                  ${
                    isDarkMode
                      ? "bg-white/10"
                      : "bg-[#E5DCF8]"
                  }
                `}
              >
                <div
                  className="
                    progress-moving
                    h-full
                    rounded-full
                    bg-[#8064C7]
                  "
                />
              </div>

              <p
                className={`
                  mt-2
                  text-right
                  text-[9px]
                  font-bold
                  ${
                    isDarkMode
                      ? "text-white/35"
                      : "text-gray-400"
                  }
                `}
              >
                96%
              </p>
            </GlassCard>

            {/* JOJO */}

            <div
              className="
                absolute
                left-1/2
                top-[48%]
                z-20
                -translate-x-1/2
                -translate-y-1/2
              "
            >
              <Jojo
                isDarkMode={isDarkMode}
                scrollOffset={
                  scrollY * -0.025
                }
              />
            </div>

            {/* SPEECH */}

            <GlassCard
              isDarkMode={isDarkMode}
              className="
                speech-pop
                absolute
                right-[8%]
                top-[49%]
                z-40
                rounded-2xl
                px-4
                py-3
                shadow-[0_15px_35px_rgba(80,60,120,.15)]
              "
            >
              <div className="flex items-center gap-2">
                <Sparkles
                  size={14}
                  className="text-[#8064C7]"
                />

                <p className="text-xs font-bold">
                  Let's make studying easier! ✨
                </p>
              </div>
            </GlassCard>

            {/* SUMMARY */}

            <GlassCard
              isDarkMode={isDarkMode}
              className="
                float-card-summary
                absolute
                bottom-[10%]
                left-[2%]
                z-30
                w-[185px]
                rounded-2xl
                p-4
                shadow-[0_20px_45px_rgba(80,60,120,.12)]
                sm:w-[215px]
              "
            >
              <div className="flex items-center gap-3">
                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#E5DCF8]
                    text-[#8064C7]
                  "
                >
                  <Sparkles size={17} />
                </div>

                <div>
                  <p
                    className={`
                      text-[9px]
                      font-bold
                      ${
                        isDarkMode
                          ? "text-white/35"
                          : "text-gray-400"
                      }
                    `}
                  >
                    JOT
                  </p>

                  <p className="text-xs font-black">
                    Smart Summary
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {[70, 90, 55].map(
                  (width, index) => (
                    <div
                      key={index}
                      className={`
                        h-1.5
                        rounded-full
                        ${
                          isDarkMode
                            ? "bg-white/10"
                            : "bg-[#E5DCF8]"
                        }
                      `}
                      style={{
                        width: `${width}%`,
                      }}
                    >
                      <div
                        className="
                          h-full
                          rounded-full
                          bg-[#8064C7]/50
                        "
                        style={{
                          width: `${width}%`,
                        }}
                      />
                    </div>
                  )
                )}
              </div>
            </GlassCard>

            {/* QUIZ */}

            <GlassCard
              isDarkMode={isDarkMode}
              className="
                float-card-quiz
                absolute
                bottom-[7%]
                right-[4%]
                z-30
                w-[175px]
                rounded-2xl
                p-4
                shadow-[0_20px_45px_rgba(80,60,120,.12)]
                sm:w-[200px]
              "
            >
              <div className="flex items-center gap-3">
                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#98E8DE]/40
                    text-[#45A9A9]
                  "
                >
                  <Brain size={17} />
                </div>

                <div>
                  <p className="text-xs font-black">
                    Quiz ready!
                  </p>

                  <p
                    className={`
                      text-[9px]
                      ${
                        isDarkMode
                          ? "text-white/40"
                          : "text-gray-500"
                      }
                    `}
                  >
                    Test your understanding
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-1">
                {[1,2,3,4,5].map(
                  (item) => (
                    <span
                      key={item}
                      className="
                        h-1.5
                        flex-1
                        rounded-full
                        bg-[#8064C7]
                      "
                    />
                  )
                )}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* SCROLL */}

        <button
          type="button"
          onClick={() =>
            scrollToSection("how")
          }
          className="
            absolute
            bottom-5
            left-1/2
            z-30
            flex
            -translate-x-1/2
            cursor-pointer
            flex-col
            items-center
            gap-1
            text-xs
            font-semibold
            text-[#8064C7]/70
            transition
            hover:text-[#8064C7]
          "
        >
          Scroll to explore

          <ChevronDown
            size={17}
            className="bounce-arrow"
          />
        </button>
      </section>

      {/* ===================================================
          HOW IT WORKS
      =================================================== */}

      <section
        id="how"
        className="
          px-6
          py-24
          md:px-12
          lg:px-16
        "
      >
        <div className="mx-auto max-w-6xl">

          <div
            data-reveal="workflow-heading"
            className={revealClass(
              "workflow-heading",
              "reveal-up"
            )}
            style={{
              transform:
                visibleElements.has(
                  "workflow-heading"
                )
                  ? `translateY(${workflowOffset}px)`
                  : undefined,
            }}
          >
            <p className="font-mono text-xs font-bold uppercase tracking-[.3em] text-[#8064C7]">
              How it works
            </p>

            <h2
              className={`
                mt-4
                max-w-3xl
                text-4xl
                font-black
                leading-tight
                tracking-tight
                sm:text-5xl
                md:text-6xl
                ${
                  isDarkMode
                    ? "text-white"
                    : "text-[#231B33]"
                }
              `}
            >
              From notes
              <br />

              <span className="text-[#8064C7]">
                to study-ready.
              </span>
            </h2>

            <p
              className={`
                mt-5
                max-w-2xl
                text-base
                leading-7
                sm:text-lg
                ${
                  isDarkMode
                    ? "text-white/50"
                    : "text-[#706A78]"
                }
              `}
            >
              JOT takes the messy part out of
              studying so you can focus on
              actually learning.
            </p>
          </div>

          {/* WORKFLOW CARDS */}

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workflowItems.map(
              (item, index) => {
                const Icon = item.icon;
                const active =
                  workflowStep === index;

                return (
                  <div
                    key={item.number}
                    data-reveal={`workflow-${index}`}
                    className={`
                      ${revealClass(
                        `workflow-${index}`,
                        index % 2 === 0
                          ? "reveal-up"
                          : "reveal-scale"
                      )}
                      stagger-${index + 1}
                    `}
                  >
                    <GlassCard
                      isDarkMode={isDarkMode}
                      className={`
                        interactive-card
                        h-full
                        rounded-3xl
                        p-6
                        ${
                          active
                            ? isDarkMode
                              ? "border-[#8064C7]/40 bg-[#8064C7]/10"
                              : "border-[#8064C7]/25 bg-[#E5DCF8]/50"
                            : ""
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`
                            font-mono
                            text-xs
                            font-bold
                            ${
                              active
                                ? "text-[#8064C7]"
                                : isDarkMode
                                ? "text-white/25"
                                : "text-gray-400"
                            }
                          `}
                        >
                          {item.number}
                        </span>

                        <div
                          className={`
                            flex
                            h-11
                            w-11
                            items-center
                            justify-center
                            rounded-xl
                            transition
                            duration-500
                            ${
                              active
                                ? "scale-110 bg-[#8064C7] text-white"
                                : isDarkMode
                                ? "bg-white/5 text-[#A58CDD]"
                                : "bg-[#E5DCF8] text-[#8064C7]"
                            }
                          `}
                        >
                          <Icon size={20} />
                        </div>
                      </div>

                      <h3 className="mt-8 text-xl font-black">
                        {item.title}
                      </h3>

                      <p
                        className={`
                          mt-3
                          text-sm
                          leading-6
                          ${
                            isDarkMode
                              ? "text-white/45"
                              : "text-gray-500"
                          }
                        `}
                      >
                        {item.text}
                      </p>
                    </GlassCard>
                  </div>
                );
              }
            )}
          </div>

          {/* LIVE PROCESSING */}

          <div
            data-reveal="live-processing"
            className={`
              ${revealClass(
                "live-processing",
                "reveal-scale"
              )}
              mt-8
            `}
          >
            <div
              className={`
                relative
                overflow-hidden
                rounded-[32px]
                border
                p-7
                sm:p-9
                ${
                  isDarkMode
                    ? "border-white/10 bg-[#14101D]"
                    : "border-[#8064C7]/10 bg-white"
                }
              `}
            >
              <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="
                        pulse-dot
                        h-2
                        w-2
                        rounded-full
                        bg-[#8064C7]
                      "
                    />

                    <p className="font-mono text-[10px] font-bold uppercase tracking-[.25em] text-[#8064C7]">
                      Live AI processing
                    </p>
                  </div>

                  <h3 className="mt-3 text-2xl font-black sm:text-3xl">
                    Watch your study material transform.
                  </h3>
                </div>

                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {[
                    "PDF",
                    "Summary",
                    "Quiz",
                    "Cards",
                  ].map(
                    (label, index) => (
                      <div
                        key={label}
                        className={`
                          rounded-xl
                          px-3
                          py-3
                          text-center
                          text-[9px]
                          font-bold
                          transition
                          duration-500
                          sm:px-5
                          ${
                            workflowStep === index
                              ? "bg-[#8064C7] text-white shadow-lg"
                              : isDarkMode
                              ? "bg-white/5 text-white/40"
                              : "bg-[#F2F1F6] text-gray-400"
                          }
                        `}
                      >
                        {label}
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-4">
                {[
                  {
                    icon: FileText,
                    text: "Reading",
                  },
                  {
                    icon: Brain,
                    text: "Understanding",
                  },
                  {
                    icon: Wand2,
                    text: "Generating",
                  },
                  {
                    icon: Target,
                    text: "Ready",
                  },
                ].map(
                  (item, index) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.text}
                        className={`
                          rounded-2xl
                          border
                          p-4
                          transition
                          duration-500
                          ${
                            workflowStep === index
                              ? isDarkMode
                                ? "border-[#8064C7]/30 bg-[#8064C7]/10"
                                : "border-[#8064C7]/20 bg-[#E5DCF8]/40"
                              : isDarkMode
                              ? "border-white/5 bg-white/[.025]"
                              : "border-black/5 bg-[#F8F8FC]"
                          }
                        `}
                      >
                        <Icon
                          size={19}
                          className={
                            workflowStep === index
                              ? "text-[#8064C7]"
                              : isDarkMode
                              ? "text-white/25"
                              : "text-gray-400"
                          }
                        />

                        <p className="mt-3 text-xs font-bold">
                          {item.text}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          BEFORE / AFTER
      =================================================== */}

      <section
        id="difference"
        className="
          px-6
          py-24
          md:px-12
          lg:px-16
        "
      >
        <div className="mx-auto max-w-6xl">

          <div
            data-reveal="difference-heading"
            className={`
              ${revealClass(
                "difference-heading",
                "reveal-up"
              )}
              mx-auto
              mb-14
              max-w-3xl
              text-center
            `}
          >
            <p className="font-mono text-xs font-bold uppercase tracking-[.3em] text-[#8064C7]">
              The JOT difference
            </p>

            <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl md:text-6xl">
              From messy notes
              <br />

              <span className="text-[#8064C7]">
                to study-ready.
              </span>
            </h2>
          </div>

          <div className="grid gap-7 md:grid-cols-2">

            {/* BEFORE */}

            <div
              data-reveal="before"
              className={revealClass(
                "before",
                "reveal-left"
              )}
            >
              <GlassCard
                isDarkMode={isDarkMode}
                className="
                  interactive-card
                  rounded-[32px]
                  p-7
                  sm:p-8
                "
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`
                      font-mono
                      text-[10px]
                      font-bold
                      tracking-[.2em]
                      ${
                        isDarkMode
                          ? "text-white/25"
                          : "text-gray-400"
                      }
                    `}
                  >
                    BEFORE JOT
                  </span>

                  <span className="text-3xl">
                    😵‍💫
                  </span>
                </div>

                <h3 className="mt-6 text-2xl font-black sm:text-3xl">
                  "Where do I even start?"
                </h3>

                <div className="mt-7 space-y-3">
                  {[
                    "📄 238-page PDF",
                    "📊 47 lecture slides",
                    "📝 Notes everywhere",
                    "⏰ Exam tomorrow",
                  ].map((item) => (
                    <div
                      key={item}
                      className={`
                        rounded-xl
                        p-4
                        text-sm
                        transition
                        duration-300
                        hover:-translate-y-1
                        ${
                          isDarkMode
                            ? "bg-white/5 text-white/60"
                            : "bg-[#F2F1F6] text-[#706A78]"
                        }
                      `}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            {/* AFTER */}

            <div
              data-reveal="after"
              className={revealClass(
                "after",
                "reveal-right"
              )}
            >
              <div
                className={`
                  interactive-card
                  rounded-[32px]
                  border
                  p-7
                  backdrop-blur-2xl
                  sm:p-8
                  ${
                    isDarkMode
                      ? "border-[#8064C7]/25 bg-[#8064C7]/10"
                      : "border-[#8064C7]/20 bg-gradient-to-br from-[#E5DCF8]/70 to-white"
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold tracking-[.2em] text-[#8064C7]">
                    AFTER JOT
                  </span>

                  <span className="text-3xl">
                    ✨
                  </span>
                </div>

                <h3 className="mt-6 text-2xl font-black sm:text-3xl">
                  "Okay. I got this."
                </h3>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {[
                    ["✨", "Smart Summary"],
                    ["🧠", "Practice Quiz"],
                    ["🃏", "Flashcards"],
                    ["🎯", "Quick Revision"],
                  ].map(
                    ([icon, title]) => (
                      <div
                        key={title}
                        className={`
                          feature-card
                          rounded-2xl
                          p-5
                          shadow-sm
                          ${
                            isDarkMode
                              ? "bg-white/5"
                              : "bg-white/80"
                          }
                        `}
                      >
                        <span className="text-2xl">
                          {icon}
                        </span>

                        <p className="mt-3 text-sm font-bold">
                          {title}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          MEET JOJO
      =================================================== */}

      <section
        id="jojo"
        className="
          scroll-mt-24
          px-6
          py-24
          md:px-12
          lg:px-16
        "
      >
        <div className="mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-2">

          {/* IMAGE */}

          <div
            data-reveal="jojo-image"
            className={`
              ${revealClass(
                "jojo-image",
                "reveal-left"
              )}
              flex
              min-h-[450px]
              items-center
              justify-center
            `}
            style={{
              transform:
                visibleElements.has(
                  "jojo-image"
                )
                  ? `translateY(${meetJojoOffset}px)`
                  : undefined,
            }}
          >
            <Jojo
              isDarkMode={isDarkMode}
              scrollOffset={
                scrollY * -0.015
              }
            />
          </div>

          {/* TEXT */}

          <div
            data-reveal="jojo-text"
            className={revealClass(
              "jojo-text",
              "reveal-right"
            )}
          >
            <p className="font-mono text-xs font-bold uppercase tracking-[.3em] text-[#8064C7]">
              Meet your study buddy
            </p>

            <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Meet
              <br />

              <span className="text-[#8064C7]">
                Jojo.
              </span>
            </h2>

            <p
              className={`
                mt-6
                text-base
                leading-7
                sm:text-lg
                sm:leading-8
                ${
                  isDarkMode
                    ? "text-white/55"
                    : "text-gray-600"
                }
              `}
            >
              Jojo is the cheerful little
              pencil behind JOT — here to
              make studying feel less
              overwhelming and a little
              more fun.
            </p>

            <p
              className={`
                mt-5
                text-base
                leading-7
                sm:text-lg
                sm:leading-8
                ${
                  isDarkMode
                    ? "text-white/55"
                    : "text-gray-600"
                }
              `}
            >
              Give Jojo your notes and he'll
              help turn them into summaries,
              quizzes, flashcards and revision
              material.
            </p>

            <GlassCard
              isDarkMode={isDarkMode}
              className="
                interactive-card
                mt-8
                rounded-2xl
                p-5
              "
            >
              <div className="flex items-center gap-4">
                <div
                  className="
                    flex
                    h-12
                    w-12
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#E5DCF8]
                    text-2xl
                    transition
                    duration-300
                    hover:rotate-6
                  "
                >
                  ✏️
                </div>

                <div>
                  <p className="font-bold">
                    Jot it. Organise it. Top it.
                  </p>

                  <p
                    className={`
                      mt-1
                      text-sm
                      ${
                        isDarkMode
                          ? "text-white/40"
                          : "text-gray-500"
                      }
                    `}
                  >
                    Your study material,
                    made simpler.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* ===================================================
          FINAL CTA
      =================================================== */}

      <section
        className="
          px-6
          pb-24
          md:px-12
          lg:px-16
        "
      >
        <div
          data-reveal="final-cta"
          className={`
            ${revealClass(
              "final-cta",
              "reveal-scale"
            )}
            relative
            mx-auto
            max-w-6xl
            overflow-hidden
            rounded-[36px]
            bg-gradient-to-br
            from-[#8064C7]
            via-[#7455B8]
            to-[#5D4298]
            px-7
            py-16
            text-center
            text-white
            shadow-[0_30px_80px_rgba(100,70,160,.25)]
            sm:px-12
            sm:py-20
            md:px-20
          `}
        >
          {/* GLOWS */}

          <div
            className="
              pointer-events-none
              absolute
              -left-20
              -top-20
              h-64
              w-64
              rounded-full
              bg-white/10
              blur-3xl
              ambient-glow
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -bottom-20
              -right-20
              h-64
              w-64
              rounded-full
              bg-[#98E8DE]/15
              blur-3xl
              ambient-glow-reverse
            "
          />

          <div className="relative z-10">
            <p className="font-mono text-xs uppercase tracking-[.3em] text-white/60">
              Your notes are waiting
            </p>

            <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
              Ready to study smarter?
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/65 sm:text-base">
              Give your notes to Jojo and
              turn study material into
              something you can actually
              learn from.
            </p>

            <button
              type="button"
              onClick={handleStart}
              className="
                button-shine
                relative
                mt-8
                overflow-hidden
                rounded-xl
                bg-white
                px-7
                py-3.5
                font-bold
                text-[#6248A8]
                shadow-xl
                transition
                duration-300
                hover:-translate-y-1
                hover:shadow-2xl
                active:scale-95
              "
            >
              <span className="relative z-10">
                Get started with Jojo

                <ArrowRight
                  size={17}
                  className="
                    ml-2
                    inline
                    arrow-move
                  "
                />
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <JotFooter
        onNavigate={onNavigate}
      />
    </div>
  );
};

export default JotLandingTest;