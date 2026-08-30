import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import jojoImage from "../assets/jojo.png";
import jojoDarkImage from "../assets/jojo-dark.jpg";
import JotFooter from "../components/JotFooter";

/* =========================================================
   GLASS CARD
========================================================= */

const GlassCard = ({
  children,
  className = "",
  isDarkMode: propDarkMode,
}) => {
  const { isDarkMode: themeDarkMode } = useTheme();

  const isDarkMode =
    propDarkMode !== undefined ? propDarkMode : themeDarkMode;

  return (
    <div
      className={`
        border
        backdrop-blur-2xl
        transition-colors
        duration-500
        ${
          isDarkMode
            ? "border-white/8 bg-[#14101D]/75 shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            : "border-black/5 bg-white/80 shadow-[0_4px_25px_rgba(0,0,0,0.03)] text-[#1E1B24]"
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
};

/* =========================================================
   JOJO MASCOT
========================================================= */

const Jojo = ({ isDarkMode: propDarkMode }) => {
  const { isDarkMode: themeDarkMode } = useTheme();

  const isDarkMode =
    propDarkMode !== undefined ? propDarkMode : themeDarkMode;

  return (
    <div className="relative flex items-center justify-center">
      {/* Glow */}
      <div
        className={`
          absolute
          h-[350px]
          w-[350px]
          rounded-full
          blur-[90px]
          transition-all
          duration-500
          ${
            isDarkMode
              ? "bg-[#8064C7]/12"
              : "bg-[#8064C7]/6"
          }
        `}
      />

      {/* Mascot container */}
      <div
        className={`
          relative
          flex
          h-[320px]
          w-[320px]
          items-center
          justify-center
          overflow-hidden
          rounded-full
          border
          backdrop-blur-xl
          transition-all
          duration-500
          md:h-[340px]
          md:w-[340px]
          ${
            isDarkMode
              ? "border-white/15 bg-[#17131F]/90 shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
              : "border-black/5 bg-white/90 shadow-[0_12px_45px_rgba(0,0,0,0.06)]"
          }
        `}
      >
        <img
          src={isDarkMode ? jojoDarkImage : jojoImage}
          alt="Jojo - JOT study buddy"
          className="h-full w-full object-contain p-5"
        />
      </div>
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

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isDarkMode =
    propDarkMode !== undefined ? propDarkMode : themeDarkMode;

  React.useEffect(() => {
    window.scrollTo(0, 0);
    const mainElement = document.querySelector("main");
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  }, []);



  /* =======================================================
     NAVIGATION
  ======================================================= */

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
            : "bg-[#F8F7FA] text-[#1E1B24]"
        }
      `}
    >
      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div
        className="
          pointer-events-none
          fixed
          inset-0
          -z-10
          overflow-hidden
        "
      >
        {/* Top-left glow */}
        <div
          className={`
            absolute
            -left-40
            -top-40
            h-[550px]
            w-[550px]
            rounded-full
            blur-[160px]
            transition-colors
            duration-700
            ${
              isDarkMode
                ? "bg-[#8064C7]/8"
                : "bg-[#8064C7]/4"
            }
          `}
        />

        {/* Right glow */}
        <div
          className={`
            absolute
            -right-40
            top-[20%]
            h-[500px]
            w-[500px]
            rounded-full
            blur-[160px]
            ${
              isDarkMode
                ? "bg-[#8064C7]/6"
                : "bg-[#A78BFA]/5"
            }
          `}
        />

        {/* Bottom glow */}
        <div
          className={`
            absolute
            bottom-[-250px]
            left-[20%]
            h-[550px]
            w-[550px]
            rounded-full
            blur-[160px]
            ${
              isDarkMode
                ? "bg-[#6D45B8]/8"
                : "bg-[#8064C7]/4"
            }
          `}
        />
      </div>

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav
        className={`
          fixed
          left-1/2
          top-3
          sm:top-4
          z-50
          flex
          w-[95%]
          max-w-6xl
          -translate-x-1/2
          items-center
          justify-between
          rounded-2xl
          border
          px-3.5
          sm:px-5
          py-2.5
          sm:py-3.5
          backdrop-blur-2xl
          transition-all
          duration-500
          ${
            isDarkMode
              ? "border-white/10 bg-[#17131F]/80 shadow-[0_15px_50px_rgba(0,0,0,0.35)]"
              : "border-white/80 bg-white/70 shadow-[0_12px_45px_rgba(70,55,110,0.10)]"
          }
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`
              text-2xl
              sm:text-3xl
              font-black
              tracking-[-0.08em]
              ${
                isDarkMode
                  ? "text-white"
                  : "text-[#292530]"
              }
            `}
          >
            Jot
            <span className="text-[#8064C7]">.</span>
          </div>

          <span
            className="
              hidden
              rounded-full
              bg-[#8064C7]/10
              px-2.5
              py-0.5
              text-[10px]
              font-bold
              uppercase
              tracking-widest
              text-[#A78BFA]
              sm:block
            "
          >
            your study buddy
          </span>
        </div>

        {/* Desktop Navigation */}
        <div
          className={`
            hidden
            items-center
            gap-5
            lg:gap-7
            text-xs
            lg:text-sm
            font-semibold
            md:flex
            ${
              isDarkMode
                ? "text-white/80"
                : "text-[#292530]"
            }
          `}
        >
          <a
            href="#home"
            className="transition hover:text-[#A78BFA]"
          >
            Home
          </a>

          <a
            href="#how"
            className="transition hover:text-[#A78BFA]"
          >
            How it works
          </a>

          <a
            href="#jojo"
            className="transition hover:text-[#A78BFA]"
          >
            Meet Jojo
          </a>

          <button
            type="button"
            onClick={handleAbout}
            className="
              cursor-pointer
              transition
              hover:text-[#A78BFA]"
          >
            About Us
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Dark / Light toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode || toggleDarkMode}
            className={`
              flex
              h-9
              w-9
              sm:h-11
              sm:w-11
              cursor-pointer
              items-center
              justify-center
              rounded-xl
              border
              text-base
              sm:text-lg
              transition
              duration-300
              ${
                isDarkMode
                  ? "border-white/10 bg-white/10 hover:bg-white/15"
                  : "border-white/70 bg-white/50 hover:bg-white/80"
              }
            `}
            aria-label="Toggle theme"
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>

          {/* Log In */}
          <button
            type="button"
            onClick={handleStart}
            className={`
              hidden
              cursor-pointer
              rounded-xl
              px-3.5
              py-2
              sm:px-4
              sm:py-2.5
              text-xs
              sm:text-sm
              font-bold
              transition
              duration-300
              md:block
              ${
                isDarkMode
                  ? "text-white/80 hover:bg-white/10 hover:text-white"
                  : "text-[#292530] hover:bg-black/5"
              }
            `}
          >
            Log In
          </button>

          {/* Get Started */}
          <button
            type="button"
            onClick={handleStart}
            className={`
              cursor-pointer
              rounded-xl
              px-3
              py-2
              sm:px-5
              sm:py-2.5
              text-xs
              sm:text-sm
              font-bold
              shadow-lg
              transition
              duration-300
              hover:-translate-y-0.5
              ${
                isDarkMode
                  ? "bg-white text-[#241E2C] hover:bg-purple-50"
                  : "bg-[#8064C7] text-white hover:bg-[#8B6DD4] hover:shadow-xl"
              }
            `}
          >
            Get Started →
          </button>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`
              flex
              h-9
              w-9
              sm:h-11
              sm:w-11
              items-center
              justify-center
              rounded-xl
              border
              transition
              duration-300
              md:hidden
              ${
                isDarkMode
                  ? "border-white/10 bg-white/10 text-white hover:bg-white/20"
                  : "border-gray-200 bg-white text-[#292530] hover:bg-gray-50"
              }
            `}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div
            className={`
              absolute
              top-full
              left-0
              right-0
              mt-2
              flex
              flex-col
              gap-2
              rounded-2xl
              border
              p-4
              backdrop-blur-2xl
              shadow-2xl
              md:hidden
              transition-all
              duration-300
              ${
                isDarkMode
                  ? "border-white/15 bg-[#14101D]/95 text-white shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                  : "border-white/90 bg-white/95 text-[#292530] shadow-[0_18px_50px_rgba(70,55,110,0.15)]"
              }
            `}
          >
            <a
              href="#home"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs sm:text-sm transition ${
                isDarkMode ? "hover:bg-white/10" : "hover:bg-black/5"
              }`}
            >
              Home
            </a>
            <a
              href="#how"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs sm:text-sm transition ${
                isDarkMode ? "hover:bg-white/10" : "hover:bg-black/5"
              }`}
            >
              How it works
            </a>
            <a
              href="#jojo"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs sm:text-sm transition ${
                isDarkMode ? "hover:bg-white/10" : "hover:bg-black/5"
              }`}
            >
              Meet Jojo
            </a>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleAbout();
              }}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs sm:text-sm text-left transition ${
                isDarkMode ? "hover:bg-white/10" : "hover:bg-black/5"
              }`}
            >
              About Us
            </button>

            <div className={`my-1 h-px w-full ${isDarkMode ? "bg-white/10" : "bg-black/5"}`} />

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleStart();
                }}
                className={`w-full py-2.5 rounded-xl font-bold text-xs text-center border transition ${
                  isDarkMode
                    ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                    : "border-gray-200 bg-white text-[#292530] hover:bg-gray-50"
                }`}
              >
                Log In
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section
        id="home"
        className="
          min-h-screen
          px-4
          sm:px-6
          pb-16
          pt-24
          sm:pt-32
          md:px-10
          lg:px-16
        "
      >
        <div
          className="
            mx-auto
            grid
            w-full
            max-w-6xl
            items-center
            gap-6
            sm:gap-6
            lg:gap-10
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-[0.9fr_1.1fr]
          "
        >
          {/* LEFT SIDE */}
          <div className="relative z-20 min-w-0">
            <div
              className={`
                mb-4
                sm:mb-6
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                px-3
                py-1
                sm:px-4
                sm:py-2
                text-xs
                sm:text-sm
                font-semibold
                backdrop-blur-xl
                ${
                  isDarkMode
                    ? "border-white/10 bg-white/5 text-white/80"
                    : "border-white/80 bg-white/50 text-[#292530] shadow-sm"
                }
              `}
            >
              <span
                className="
                  h-2.5
                  w-2.5
                  rounded-full
                  bg-[#8B5CF6]
                  shadow-[0_0_12px_rgba(139,92,246,0.7)]
                "
              />

              Meet your AI study buddy
            </div>

            <h1
              className={`
                max-w-xl
                text-3xl
                min-[400px]:text-4xl
                sm:text-4xl
                md:text-5xl
                lg:text-7xl
                xl:text-8xl
                font-black
                leading-[0.93]
                tracking-[-0.065em]
                ${
                  isDarkMode
                    ? "text-white"
                    : "text-[#292530]"
                }
              `}
            >

              Study
              <br />
              <span
                className="
                  bg-gradient-to-r
                  from-[#A78BFA]
                  via-[#8B5CF6]
                  to-[#C084FC]
                  bg-clip-text
                  text-transparent
                "
              >
                without
              </span>
              <br />
              the chaos.
            </h1>

            <div
              className="
                mt-4
                sm:mt-5
                h-2
                w-24
                sm:w-28
                rotate-[-2deg]
                rounded-full
                bg-[#8B5CF6]/50
              "
            />

            <p
              className={`
                mt-6
                sm:mt-8
                max-w-xl
                text-base
                sm:text-lg
                leading-relaxed
                sm:leading-8
                md:text-xl
                ${
                  isDarkMode
                    ? "text-white/55"
                    : "text-[#706A78]"
                }
              `}
            >
              Drop your notes into JOT and let Jojo
              turn them into smart summaries, quizzes,
              flashcards and quick revision material.
            </p>

            <div className="mt-7 sm:mt-9 flex flex-col sm:flex-row flex-wrap gap-3.5 sm:gap-4">
              <button
                type="button"
                onClick={handleStart}
                className="
                  w-full
                  sm:w-auto
                  cursor-pointer
                  rounded-xl
                  bg-[#8064C7]
                  px-7
                  py-3.5
                  sm:px-8
                  sm:py-4
                  text-center
                  font-bold
                  text-white
                  shadow-[0_15px_35px_rgba(128,100,199,0.35)]
                  transition
                  duration-300
                  hover:-translate-y-1
                  hover:bg-[#8B6DD4]
                "
              >
                Start Jotting ✏️
              </button>

              <a
                href="#how"
                className={`
                  w-full
                  sm:w-auto
                  text-center
                  rounded-xl
                  border
                  px-7
                  py-3.5
                  sm:px-8
                  sm:py-4
                  font-bold
                  backdrop-blur-xl
                  transition
                  ${
                    isDarkMode
                      ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                      : "border-white/80 bg-white/50 text-[#292530] shadow-sm hover:bg-white/80"
                  }
                `}
              >
                See how it works
              </a>
            </div>

            <div
              className={`
                mt-7
                sm:mt-8
                flex
                items-center
                gap-2.5
                text-xs
                sm:text-sm
                ${
                  isDarkMode
                    ? "text-white/40"
                    : "text-[#7A7382]"
                }
              `}
            >
              <span className="text-base sm:text-lg">✨</span>
              Jot it. Organise it. Top it.
            </div>
          </div>

          {/* RIGHT HERO Visual Composition */}
          <div className="relative h-[480px] min-[400px]:h-[520px] sm:h-[560px] md:h-[600px] lg:h-[680px] w-full max-w-[440px] sm:max-w-[480px] md:max-w-[540px] lg:max-w-[580px] mx-auto scale-[0.72] min-[400px]:scale-[0.8] sm:scale-[0.72] md:scale-[0.85] lg:scale-100 origin-center lg:origin-right my-[-30px] min-[400px]:my-[-20px] sm:my-0">

            <div
              className={`
                absolute
                left-[50%]
                top-[50%]
                h-[440px]
                w-[440px]
                sm:h-[520px]
                sm:w-[520px]
                -translate-x-1/2
                -translate-y-1/2
                rounded-full
                border
                backdrop-blur-xl
                transition-all
                duration-500
                ${
                  isDarkMode
                    ? "border-white/5 bg-white/[0.025] shadow-[0_30px_100px_rgba(0,0,0,0.25)]"
                    : "border-white/80 bg-white/25 shadow-[0_30px_100px_rgba(80,60,120,0.10)]"
                }
              `}
            />

            {/* STUDY NOTES */}
            <GlassCard
              isDarkMode={isDarkMode}
              className="
                absolute
                right-[1%]
                sm:right-[0%]
                top-[4%]
                z-10
                w-[245px]
                sm:w-[285px]
                rotate-[5deg]
                rounded-[28px]
                p-3.5
                sm:p-4
              "
            >
              <div
                className={`
                  rounded-[22px]
                  p-4
                  sm:p-5
                  ${
                    isDarkMode
                      ? "bg-[#292432]/90"
                      : "bg-white/85"
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p
                      className={`
                        font-mono
                        text-[8px]
                        font-bold
                        tracking-[0.18em]
                        ${
                          isDarkMode
                            ? "text-white/35"
                            : "text-gray-400"
                        }
                      `}
                    >
                      STUDY MATERIAL
                    </p>

                    <h3
                      className={`
                        mt-1.5
                        text-sm
                        sm:text-base
                        font-black
                        ${
                          isDarkMode
                            ? "text-white"
                            : "text-[#292530]"
                        }
                      `}
                    >
                      Operating Systems
                    </h3>
                  </div>

                  <span
                    className="
                      rounded-lg
                      bg-red-500/15
                      px-2
                      py-1
                      text-[8px]
                      font-bold
                      text-red-400
                    "
                  >
                    PDF
                  </span>
                </div>

                <div
                  className={`
                    my-4
                    sm:my-5
                    h-px
                    ${
                      isDarkMode
                        ? "bg-white/10"
                        : "bg-black/10"
                    }
                  `}
                />

                <div className="space-y-2">
                  <div
                    className={`
                      h-2
                      w-full
                      rounded-full
                      ${
                        isDarkMode
                          ? "bg-white/10"
                          : "bg-black/10"
                      }
                    `}
                  />

                  <div
                    className={`
                      h-2
                      w-[88%]
                      rounded-full
                      ${
                        isDarkMode
                          ? "bg-white/10"
                          : "bg-black/10"
                      }
                    `}
                  />

                  <div
                    className={`
                      h-2
                      w-[94%]
                      rounded-full
                      ${
                        isDarkMode
                          ? "bg-white/10"
                          : "bg-black/10"
                      }
                    `}
                  />

                  <div
                    className={`
                      h-2
                      w-[65%]
                      rounded-full
                      ${
                        isDarkMode
                          ? "bg-white/10"
                          : "bg-black/10"
                      }
                    `}
                  />
                </div>

                <div
                  className={`
                    mt-5
                    sm:mt-6
                    rounded-2xl
                    p-3.5
                    sm:p-4
                    ${
                      isDarkMode
                        ? "bg-[#8064C7]/20"
                        : "bg-[#8064C7]/15"
                    }
                  `}
                >
                  <p className="text-[9px] font-bold text-[#A78BFA]">
                    ✨ JOT GENERATED
                  </p>

                  <p
                    className={`
                      mt-1.5
                      text-[10px]
                      leading-4
                      sm:leading-5
                      ${
                        isDarkMode
                          ? "text-white/55"
                          : "text-gray-600"
                      }
                    `}
                  >
                    Virtual memory allows programs to
                    use more memory than physically
                    available.
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* SUMMARY */}
            <GlassCard
              isDarkMode={isDarkMode}
              className="
                absolute
                left-[1%]
                sm:left-[0%]
                top-[27%]
                z-40
                rounded-2xl
                px-4
                py-3
                sm:px-5
                sm:py-4
              "
            >
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span className="text-lg sm:text-xl">✨</span>

                <div>
                  <p
                    className={`
                      text-[9px]
                      sm:text-[10px]
                      ${
                        isDarkMode
                          ? "text-white/35"
                          : "text-gray-400"
                      }
                    `}
                  >
                    JOT
                  </p>

                  <p
                    className={`
                      text-xs
                      sm:text-sm
                      font-bold
                      ${
                        isDarkMode
                          ? "text-white"
                          : "text-[#292530]"
                      }
                    `}
                  >
                    Smart Summary
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* JOJO */}
            <div
              className="
                absolute
                left-[31%]
                top-[58%]
                z-30
                flex
                -translate-x-1/2
                -translate-y-1/2
                items-center
                justify-center
              "
            >
              <Jojo isDarkMode={isDarkMode} />
            </div>

            {/* JOJO MESSAGE */}
            <GlassCard
              isDarkMode={isDarkMode}
              className="
                absolute
                bottom-[8%]
                sm:bottom-[7%]
                left-[1%]
                sm:left-[0%]
                z-40
                rounded-2xl
                px-4
                py-3
                sm:px-5
                sm:py-4
              "
            >
              <div className="flex items-start gap-2.5 sm:gap-3">
                <span className="text-lg sm:text-xl">✏️</span>

                <div>
                  <p
                    className={`
                      text-xs
                      sm:text-sm
                      font-black
                      ${
                        isDarkMode
                          ? "text-white"
                          : "text-[#292530]"
                      }
                    `}
                  >
                    Hey! I'm Jojo 👋
                  </p>

                  <p
                    className={`
                      mt-0.5
                      text-[10px]
                      sm:text-xs
                      ${
                        isDarkMode
                          ? "text-white/40"
                          : "text-gray-500"
                      }
                    `}
                  >
                    Give me your notes!
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* QUIZ */}
            <GlassCard
              isDarkMode={isDarkMode}
              className="
                absolute
                bottom-[21%]
                sm:bottom-[20%]
                right-[1%]
                sm:right-[0%]
                z-40
                rounded-2xl
                px-3.5
                py-2.5
                sm:px-4
                sm:py-3
              "
            >
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg">🧠</span>

                <span
                  className={`
                    text-xs
                    sm:text-sm
                    font-bold
                    ${
                      isDarkMode
                        ? "text-white"
                        : "text-[#292530]"
                    }
                  `}
                >
                  Quiz
                </span>
              </div>
            </GlassCard>

            {/* FLASHCARDS */}
            <GlassCard
              isDarkMode={isDarkMode}
              className="
                absolute
                bottom-[1%]
                sm:bottom-[0%]
                left-[50%]
                z-40
                -translate-x-1/2
                rounded-2xl
                px-4
                py-2.5
                sm:px-5
                sm:py-3
              "
            >
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg">🃏</span>

                <span
                  className={`
                    text-xs
                    sm:text-sm
                    font-bold
                    ${
                      isDarkMode
                        ? "text-white"
                        : "text-[#292530]"
                    }
                  `}
                >
                  Flashcards
                </span>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>


      {/* =====================================================
          BEFORE / AFTER
      ===================================================== */}

      <section className="px-6 py-28 md:px-12 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-[#A78BFA]">
              The JOT difference
            </p>

            <h2 className="mt-5 text-5xl font-black leading-tight tracking-tight md:text-6xl">
              From messy notes
              <br />
              <span className="text-[#A78BFA]">
                to study-ready.
              </span>
            </h2>
          </div>

          <div className="grid gap-7 md:grid-cols-2">
            {/* BEFORE */}
            <GlassCard
              isDarkMode={isDarkMode}
              className="rounded-[32px] p-8"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`
                    font-mono
                    text-[10px]
                    font-bold
                    tracking-[0.2em]
                    ${
                      isDarkMode
                        ? "text-white/30"
                        : "text-gray-400"
                    }
                  `}
                >
                  BEFORE JOT
                </span>

                <span className="text-3xl">😵‍💫</span>
              </div>

              <h3 className="mt-6 text-3xl font-black">
                "Where do I even start?"
              </h3>

              <div className="mt-8 space-y-3">
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
                      shadow-sm
                      ${
                        isDarkMode
                          ? "bg-white/5 text-white/70"
                          : "bg-white/60"
                      }
                    `}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* AFTER */}
            <div
              className={`
                rounded-[32px]
                border
                p-8
                backdrop-blur-2xl
                ${
                  isDarkMode
                    ? "border-[#8B5CF6]/20 bg-[#8B5CF6]/10"
                    : "border-[#8064C7]/20 bg-[#8064C7]/10"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#A78BFA]">
                  AFTER JOT
                </span>

                <span className="text-3xl">✨</span>
              </div>

              <h3 className="mt-6 text-3xl font-black">
                "Okay. I got this."
              </h3>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  ["✨", "Smart Summary"],
                  ["🧠", "Practice Quiz"],
                  ["🃏", "Flashcards"],
                  ["🎯", "Quick Revision"],
                ].map(([icon, title]) => (
                  <div
                    key={title}
                    className={`
                      rounded-2xl
                      p-5
                      shadow-sm
                      ${
                        isDarkMode
                          ? "bg-white/5"
                          : "bg-white/65"
                      }
                    `}
                  >
                    <span className="text-2xl">{icon}</span>

                    <p className="mt-3 font-bold">
                      {title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          HOW IT WORKS
      ===================================================== */}

      <section
        id="how"
        className="px-6 py-28 md:px-12 lg:px-16"
      >
        <div className="mx-auto max-w-6xl">
          <div
            className={`
              relative
              overflow-hidden
              rounded-[40px]
              px-8
              py-16
              shadow-[0_30px_80px_rgba(0,0,0,0.18)]
              md:px-14
              md:py-20
              ${
                isDarkMode
                  ? "border border-white/10 bg-[#191520]"
                  : "bg-[#292530]"
              }
            `}
          >
            <div
              className="
                absolute
                right-[-100px]
                top-[-120px]
                h-[350px]
                w-[350px]
                rounded-full
                bg-[#8B5CF6]/20
                blur-[100px]
              "
            />

            <div className="relative">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-purple-300">
                How JOT works
              </p>

              <h2 className="mt-5 max-w-xl text-5xl font-black leading-tight text-white md:text-6xl">
                Three steps.
                <br />
                <span className="text-purple-300">
                  Zero chaos.
                </span>
              </h2>

              <div className="mt-16 grid gap-10 md:grid-cols-3">
                {[
                  [
                    "01",
                    "📄",
                    "Drop",
                    "Upload your PDF, PPT or study material.",
                  ],
                  [
                    "02",
                    "✏️",
                    "Jot",
                    "Jojo organises your material into useful study content.",
                  ],
                  [
                    "03",
                    "🎯",
                    "Learn",
                    "Practice, revise and feel ready for your exam.",
                  ],
                ].map(([number, icon, title, text]) => (
                  <div
                    key={number}
                    className="border-t border-white/15 pt-6"
                  >
                    <div className="flex justify-between">
                      <span className="font-mono text-sm text-purple-300">
                        {number}
                      </span>

                      <span className="text-2xl">
                        {icon}
                      </span>
                    </div>

                    <h3 className="mt-6 text-3xl font-black text-white">
                      {title}
                    </h3>

                    <p className="mt-4 leading-7 text-white/50">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          MEET JOJO
      ===================================================== */}

      <section
        id="jojo"
        className="px-6 py-28 md:px-12 lg:px-16"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-2">
          <div className="flex min-h-[450px] items-center justify-center">
            <Jojo isDarkMode={isDarkMode} />
          </div>

          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-[#A78BFA]">
              Meet your study buddy
            </p>

            <h2 className="mt-6 text-5xl font-black leading-tight tracking-tight md:text-6xl">
              Meet
              <br />
              <span className="text-[#A78BFA]">
                Jojo.
              </span>
            </h2>

            <p
              className={`
                mt-7
                text-lg
                leading-8
                ${
                  isDarkMode
                    ? "text-white/55"
                    : "text-gray-600"
                }
              `}
            >
              Jojo is the cheerful little pencil behind
              JOT — here to make studying feel less
              overwhelming and a little more fun.
            </p>

            <p
              className={`
                mt-5
                text-lg
                leading-8
                ${
                  isDarkMode
                    ? "text-white/55"
                    : "text-gray-600"
                }
              `}
            >
              Give Jojo your notes and he'll help turn
              them into summaries, quizzes, flashcards
              and revision material.
            </p>

            <GlassCard
              isDarkMode={isDarkMode}
              className="mt-8 rounded-2xl p-5"
            >
              <div className="flex items-center gap-4">
                <div
                  className="
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#8064C7]/15
                    text-2xl
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
                    Your study material, made simpler.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* =====================================================
          FINAL CTA
      ===================================================== */}

      <section className="px-6 pb-28 md:px-12 lg:px-16">
        <div
          className="
            relative
            mx-auto
            max-w-6xl
            overflow-hidden
            rounded-[40px]
            bg-gradient-to-br
            from-[#8064C7]
            via-[#7455B8]
            to-[#5D4298]
            px-8
            py-20
            text-center
            text-white
            shadow-[0_30px_80px_rgba(100,70,160,0.30)]
            md:px-20
          "
        >
          <div
            className="
              absolute
              -left-20
              -top-20
              h-64
              w-64
              rounded-full
              bg-white/10
              blur-3xl
            "
          />

          <div
            className="
              absolute
              -bottom-20
              -right-20
              h-64
              w-64
              rounded-full
              bg-white/10
              blur-3xl
            "
          />

          <div className="relative">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/60">
              Your notes are waiting
            </p>

            <h2 className="mt-5 text-5xl font-black md:text-7xl">
              Ready to JOT?
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-lg text-white/75">
              Turn those endless PDFs into something
              you can actually study.
            </p>

            <button
              type="button"
              onClick={handleStart}
              className="
                mt-10
                cursor-pointer
                rounded-xl
                bg-white
                px-9
                py-4
                font-bold
                text-[#6248A8]
                shadow-xl
                transition
                duration-300
                hover:-translate-y-1
              "
            >
              Start Jotting ✏️
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================
          SHARED FOOTER
      ===================================================== */}

      <JotFooter />
    </div>
  );
};

export default JotLandingTest;