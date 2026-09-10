import { useEffect, useRef } from "react";
import { BookOpen, Sparkles } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import TodaysTasksCard from "../components/dashboard/TodaysTasksCard";
import UpcomingExamsCard from "../components/dashboard/UpcomingExamsCard";
import StudySetProgressCard from "../components/dashboard/StudySetProgressCard";
import ActivityCalendarCard from "../components/dashboard/ActivityCalendarCard";
import MotivationalTaglineCard from "../components/dashboard/MotivationalTaglineCard";
import PerformanceGraphCard from "../components/dashboard/PerformanceGraphCard";
import jojoImage from "../assets/jojo-transparent-clean.png";

/* =========================================================
   DASHBOARD ANIMATIONS
   NOTE:
   No new colours have been introduced.
   Existing dashboard colours are preserved.
========================================================= */

const dashboardAnimationStyles = `
  /* =======================================================
     PAGE ENTRANCE
  ======================================================= */

  @keyframes dashboardEnter {
    0% {
      opacity: 0;
      transform: translateY(25px);
    }

    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* =======================================================
     HERO
  ======================================================= */

  @keyframes heroEnter {
    0% {
      opacity: 0;
      transform: translateY(30px) scale(0.97);
    }

    60% {
      opacity: 1;
      transform: translateY(-4px) scale(1.01);
    }

    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes heroGlowMove {
    0% {
      transform: translate(-25%, -10%) scale(0.9);
    }

    50% {
      transform: translate(25%, 10%) scale(1.15);
    }

    100% {
      transform: translate(-25%, -10%) scale(0.9);
    }
  }

  @keyframes sparkleDance {
    0%,
    100% {
      transform: rotate(0deg) scale(1);
    }

    25% {
      transform: rotate(15deg) scale(1.12);
    }

    50% {
      transform: rotate(-12deg) scale(0.9);
    }

    75% {
      transform: rotate(8deg) scale(1.08);
    }
  }

  /* =======================================================
     JOJO
  ======================================================= */

  @keyframes jojoFloat {
    0%,
    100% {
      transform: translate3d(0, 0, 0) rotate(0deg);
    }

    25% {
      transform: translate3d(-5px, -8px, 0) rotate(-1deg);
    }

    50% {
      transform: translate3d(3px, -14px, 0) rotate(1.5deg);
    }

    75% {
      transform: translate3d(6px, -6px, 0) rotate(-0.5deg);
    }
  }

  @keyframes jojoGlow {
    0%,
    100% {
      transform: scale(0.85);
      opacity: 0.25;
    }

    50% {
      transform: scale(1.2);
      opacity: 0.5;
    }
  }

  @keyframes jojoShadow {
    0%,
    100% {
      transform: scale(0.9);
      opacity: 0.15;
    }

    50% {
      transform: scale(0.65);
      opacity: 0.07;
    }
  }

  /* =======================================================
     JOJO ORBIT
  ======================================================= */

  @keyframes dashboardOrbitClockwise {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  @keyframes dashboardOrbitCounter {
    from {
      transform: rotate(360deg);
    }

    to {
      transform: rotate(0deg);
    }
  }

  @keyframes dashboardOrbitBubble {
    0%,
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 0.8;
    }

    50% {
      transform: scale(1.22) rotate(20deg);
      opacity: 1;
    }
  }

  @keyframes dashboardOrbitSparkle {
    0%,
    100% {
      transform: scale(0.8) rotate(0deg);
      opacity: 0.55;
    }

    50% {
      transform: scale(1.25) rotate(90deg);
      opacity: 1;
    }
  }

  @keyframes dashboardOrbitPulse {
    0%,
    100% {
      opacity: 0.18;
      transform: scale(0.96);
    }

    50% {
      opacity: 0.35;
      transform: scale(1.02);
    }
  }

  .dashboard-orbit-clockwise {
    animation: dashboardOrbitClockwise 14s linear infinite;
  }

  .dashboard-orbit-counter {
    animation: dashboardOrbitCounter 19s linear infinite;
  }

  .dashboard-orbit-bubble {
    animation: dashboardOrbitBubble 2.6s ease-in-out infinite;
  }

  .dashboard-orbit-sparkle {
    animation: dashboardOrbitSparkle 3s ease-in-out infinite;
  }

  .dashboard-orbit-pulse {
    animation: dashboardOrbitPulse 4s ease-in-out infinite;
  }

  /* =======================================================
     MOVING LIGHT
  ======================================================= */

  @keyframes lightTravel {
    0% {
      transform: translateX(-160%) rotate(18deg);
      opacity: 0;
    }

    15% {
      opacity: 0.25;
    }

    45% {
      opacity: 0.08;
    }

    70% {
      opacity: 0;
    }

    100% {
      transform: translateX(500%) rotate(18deg);
      opacity: 0;
    }
  }

  /* =======================================================
     CARD ENTRANCE
  ======================================================= */

  @keyframes cardReveal {
    0% {
      opacity: 0;
      transform: translateY(45px) scale(0.94);
    }

    65% {
      opacity: 1;
      transform: translateY(-5px) scale(1.015);
    }

    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .dashboard-card-reveal {
    opacity: 0;
  }

  .dashboard-card-reveal.is-visible {
    animation: cardReveal 850ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  .dashboard-delay-1.is-visible {
    animation-delay: 100ms;
  }

  .dashboard-delay-2.is-visible {
    animation-delay: 220ms;
  }

  .dashboard-delay-3.is-visible {
    animation-delay: 340ms;
  }

  .dashboard-delay-4.is-visible {
    animation-delay: 460ms;
  }

  /* =======================================================
     INTERACTIVE CARD
  ======================================================= */

  .dashboard-interactive-card {
    position: relative;
    transform-style: preserve-3d;
    will-change: transform;
    transition:
      transform 180ms ease-out,
      filter 300ms ease;
  }

  .dashboard-interactive-card:hover {
    filter: brightness(1.03);
  }

  /* Cursor-following spotlight */

  .dashboard-interactive-card::before {
    content: "";
    position: absolute;
    pointer-events: none;
    z-index: 20;

    width: 180px;
    height: 180px;

    left: var(--mouse-x, 50%);
    top: var(--mouse-y, 50%);

    transform: translate(-50%, -50%);

    border-radius: 9999px;

    background: radial-gradient(
      circle,
      rgba(128, 100, 199, 0.12) 0%,
      rgba(128, 100, 199, 0.05) 35%,
      transparent 70%
    );

    opacity: 0;
    transition: opacity 300ms ease;
  }

  .dashboard-interactive-card:hover::before {
    opacity: 1;
  }

  /* =======================================================
     BUTTON
  ======================================================= */

  .dashboard-main-button {
    position: relative;
    overflow: hidden;
    isolation: isolate;
    transform: translateZ(0);

    transition:
      transform 300ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 300ms ease;
  }

  .dashboard-main-button::before {
    content: "";

    position: absolute;
    top: 0;
    left: -120%;

    width: 70%;
    height: 100%;

    transform: skewX(-20deg);

    background: rgba(255, 255, 255, 0.2);

    transition: left 600ms ease;

    pointer-events: none;
  }

  .dashboard-main-button:hover::before {
    left: 150%;
  }

  .dashboard-main-button:hover {
    transform: translateY(-3px) scale(1.025);
  }

  .dashboard-main-button:active {
    transform: translateY(1px) scale(0.97);
  }

  .dashboard-main-button svg {
    transition:
      transform 350ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .dashboard-main-button:hover svg {
    transform: translateY(-2px) rotate(-5deg) scale(1.08);
  }

  /* =======================================================
     JOJO HOVER
  ======================================================= */

  .dashboard-jojo {
    cursor: pointer;

    transition:
      filter 300ms ease,
      transform 350ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .dashboard-jojo:hover {
    filter: drop-shadow(0 15px 25px rgba(128, 100, 199, 0.22));
  }

  /* =======================================================
     PLUS BUTTON
  ======================================================= */

  .dashboard-plus {
    transition:
      transform 300ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 300ms ease;
  }

  .dashboard-plus:hover {
    transform: translateY(-3px) rotate(8deg) scale(1.1);
    box-shadow: 0 12px 28px rgba(128, 100, 199, 0.3);
  }

  .dashboard-plus:active {
    transform: scale(0.88) rotate(-5deg);
  }

  /* =======================================================
     SEE ALL
  ======================================================= */

  .dashboard-see-all {
    transition:
      transform 250ms ease,
      letter-spacing 250ms ease;
  }

  .dashboard-see-all:hover {
    transform: translateX(3px);
    letter-spacing: 0.02em;
  }

  /* =======================================================
     MOBILE / ACCESSIBILITY
  ======================================================= */

  @media (max-width: 768px) {
    .dashboard-interactive-card:hover {
      transform: none !important;
    }

    .dashboard-orbit-outer {
      width: 150px !important;
      height: 150px !important;
      margin-left: -75px !important;
      margin-top: -75px !important;
    }

    .dashboard-orbit-inner {
      width: 120px !important;
      height: 120px !important;
      margin-left: -60px !important;
      margin-top: -60px !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }

    .dashboard-card-reveal {
      opacity: 1;
    }
  }
`;


/* =========================================================
   DASHBOARD PAGE
========================================================= */

function DashboardPage({ user, onNavigate }) {
  const { isDarkMode } = useTheme();

  const dashboardRef = useRef(null);

  /* =======================================================
     CARD MOUSE TILT
  ======================================================= */

  useEffect(() => {
    const cards = dashboardRef.current?.querySelectorAll(
      ".dashboard-interactive-card"
    );

    if (!cards?.length) return;

    const handleMouseMove = (event) => {
      const card = event.currentTarget;

      if (window.innerWidth <= 768) return;

      const rect = card.getBoundingClientRect();

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -2.5;
      const rotateY = ((x - centerX) / centerX) * 2.5;

      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);

      card.style.transform = `
        perspective(1000px)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
        translateY(-5px)
        scale(1.008)
      `;
    };

    const handleMouseLeave = (event) => {
      event.currentTarget.style.transform = "";
    };

    cards.forEach((card) => {
      card.addEventListener("mousemove", handleMouseMove);
      card.addEventListener("mouseleave", handleMouseLeave);
    });

    return () => {
      cards.forEach((card) => {
        card.removeEventListener("mousemove", handleMouseMove);
        card.removeEventListener("mouseleave", handleMouseLeave);
      });
    };
  }, []);

  /* =======================================================
     SCROLL REVEAL
  ======================================================= */

  useEffect(() => {
    const elements =
      dashboardRef.current?.querySelectorAll(".dashboard-card-reveal");

    if (!elements?.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{dashboardAnimationStyles}</style>

      <div ref={dashboardRef}>
        {/* =================================================
            GREETING BANNER
        ================================================= */}

        <div
          className={`dashboard-card-reveal is-visible dashboard-delay-1 dashboard-interactive-card relative mb-8 flex flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl border p-5 sm:p-8 backdrop-blur-2xl transition-all duration-500 sm:flex-row sm:items-center ${
            isDarkMode
              ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
              : "border-[#8064C7]/20 bg-gradient-to-r from-[#E5DCF8] to-[#F1EAFA] text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.06)]"
          }`}
        >
          {/* Moving background glow */}

          <div
            className="pointer-events-none absolute -left-24 top-0 h-48 w-72 rounded-full bg-[#8064C7]/10 blur-3xl"
            style={{
              animation: "heroGlowMove 7s ease-in-out infinite",
            }}
          />

          {/* Moving light streak */}

          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-24"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)",
              animation: "lightTravel 8s ease-in-out infinite",
            }}
          />

          {/* LEFT SIDE */}

          <div className="relative z-10">
            <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
              Hi {user?.name || "Alex"}!

              <Sparkles
                size={24}
                className="text-[#8064C7]"
                style={{
                  animation: "sparkleDance 2.8s ease-in-out infinite",
                }}
              />
            </h1>

            <p
              className={`mt-2 text-xs sm:text-sm font-medium ${
                isDarkMode ? "text-white/50" : "text-[#706A78]"
              }`}
            >
              Learn something new. Master something more.
            </p>

            <button
              onClick={() => onNavigate?.("upload")}
              className="dashboard-main-button mt-6 flex items-center gap-2 rounded-xl bg-[#8064C7] px-5 sm:px-6 py-3 text-xs font-bold text-white shadow-[0_8px_20px_rgba(128,100,199,0.20)] hover:bg-[#7357B9]"
            >
              <BookOpen size={17} />
              Create Study Set
            </button>
          </div>

          {/* =================================================
              JOJO + ROTATING ELEMENTS
          ================================================= */}

          <div className="relative z-10 flex h-40 w-40 sm:h-48 sm:w-48 shrink-0 items-center justify-center">

            {/* Outer soft orbit glow */}

            <div
              className="dashboard-orbit-pulse pointer-events-none absolute left-1/2 top-1/2 h-[210px] w-[210px] -ml-[105px] -mt-[105px] rounded-full bg-[#8064C7]/5 blur-xl"
            />

            {/* Outer orbit ring */}

            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-[190px] w-[190px] -ml-[95px] -mt-[95px] rounded-full border border-[#8064C7]/15"
            />

            {/* Outer rotating orbit */}

            <div
              className="dashboard-orbit-clockwise dashboard-orbit-outer pointer-events-none absolute left-1/2 top-1/2 h-[190px] w-[190px] -ml-[95px] -mt-[95px]"
            >
              {/* Top bubble */}

              <span
                className="dashboard-orbit-bubble absolute left-1/2 top-[-5px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#8064C7]/60"
              />

              {/* Right sparkle */}

              <span
                className="dashboard-orbit-sparkle absolute right-[-6px] top-1/2 text-[#8064C7]"
                style={{
                  fontSize: "15px",
                }}
              >
                ✦
              </span>

              {/* Bottom bubble */}

              <span
                className="dashboard-orbit-bubble absolute bottom-[-5px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#8064C7]/45"
                style={{
                  animationDelay: "0.8s",
                }}
              />

              {/* Left sparkle */}

              <span
                className="dashboard-orbit-sparkle absolute left-[-7px] top-1/2 text-[#8064C7]"
                style={{
                  fontSize: "11px",
                  animationDelay: "1.2s",
                }}
              >
                ✦
              </span>
            </div>

            {/* Inner dashed orbit */}

            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-[145px] w-[145px] -ml-[72.5px] -mt-[72.5px] rounded-full border border-dashed border-[#8064C7]/15"
            />

            {/* Inner counter-rotating orbit */}

            <div
              className="dashboard-orbit-counter dashboard-orbit-inner pointer-events-none absolute left-1/2 top-1/2 h-[145px] w-[145px] -ml-[72.5px] -mt-[72.5px]"
            >
              {/* Top-left sparkle */}

              <span
                className="dashboard-orbit-sparkle absolute left-[15px] top-[13px] text-[#8064C7]"
                style={{
                  fontSize: "10px",
                  animationDelay: "0.4s",
                }}
              >
                ✦
              </span>

              {/* Bottom-right dot */}

              <span
                className="dashboard-orbit-bubble absolute bottom-[11px] right-[13px] h-2 w-2 rounded-full bg-[#8064C7]/50"
                style={{
                  animationDelay: "1.5s",
                }}
              />

              {/* Small top-right dot */}

              <span
                className="dashboard-orbit-bubble absolute right-[17px] top-[18px] h-1.5 w-1.5 rounded-full bg-[#8064C7]/40"
                style={{
                  animationDelay: "0.5s",
                }}
              />
            </div>

            {/* Jojo glow */}

            <div
              className={`absolute bottom-4 h-24 w-24 rounded-full blur-3xl ${
                isDarkMode ? "bg-[#8064C7]/20" : "bg-[#8064C7]/15"
              }`}
              style={{
                animation: "jojoGlow 3.5s ease-in-out infinite",
              }}
            />

            {/* Jojo shadow */}

            <div
              className="absolute bottom-1 h-3 w-20 rounded-full bg-black/20 blur-md"
              style={{
                animation: "jojoShadow 3.5s ease-in-out infinite",
              }}
            />

            {/* Jojo */}

            <img
              src={jojoImage}
              alt="Jojo - JOT study buddy"
              className="dashboard-jojo relative z-10 h-full w-full object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.12)]"
              style={{
                animation: "jojoFloat 4s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        {/* =================================================
            DASHBOARD CARDS
        ================================================= */}

        <div className="flex flex-col gap-6 lg:flex-row">

          {/* LEFT COLUMN */}

          <div className="flex min-w-0 flex-1 flex-col gap-6">

            <div className="dashboard-card-reveal dashboard-delay-1 dashboard-interactive-card rounded-3xl">
              <TodaysTasksCard onNavigate={onNavigate} />
            </div>

            <div className="dashboard-card-reveal dashboard-delay-2 dashboard-interactive-card rounded-3xl">
              <PerformanceGraphCard onNavigate={onNavigate} />
            </div>

            <div className="dashboard-card-reveal dashboard-delay-2 dashboard-interactive-card rounded-3xl">
              <StudySetProgressCard onNavigate={onNavigate} />
            </div>

            <div className="dashboard-card-reveal dashboard-delay-3 dashboard-interactive-card rounded-3xl">
              <MotivationalTaglineCard />
            </div>
          </div>

          {/* RIGHT COLUMN */}

          <div className="flex min-w-0 flex-1 flex-col gap-6">

            <div className="dashboard-card-reveal dashboard-delay-2 dashboard-interactive-card rounded-3xl">
              <UpcomingExamsCard
                onNavigate={onNavigate}
                onSeeAll={() => onNavigate("planner")}
              />
            </div>

            <div className="dashboard-card-reveal dashboard-delay-3 dashboard-interactive-card rounded-3xl">
              <ActivityCalendarCard />
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default DashboardPage;