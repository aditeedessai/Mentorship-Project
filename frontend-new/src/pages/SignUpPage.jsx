import { useState } from "react";
import { Eye, EyeOff, Sparkles, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import { hashPasswordClient } from "../services/crypto";
import jojoWaving from "../assets/jojo-waving.png";

function SignUpPage({ onSignUpSuccess, onLogin, onBack }) {
  const { isDarkMode, toggleDarkMode } = useTheme();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const now = new Date();

  const today = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (dob && dob > today) {
      setError("Date of Birth cannot be in the future.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const clientHashedPassword =
        await hashPasswordClient(
          password,
          normalizedEmail
        );

      const { data, error: authError } =
        await supabase.auth.signUp({
          email: normalizedEmail,
          password: clientHashedPassword,
          options: {
            data: {
              full_name: name,
              date_of_birth: dob,
            },
          },
        });

      if (authError) {
        setError(
          authError.message ||
            "Failed to create account."
        );
        setLoading(false);
        return;
      }

      if (onSignUpSuccess && data?.user) {
        onSignUpSuccess(data.user.email);
      }
    } catch (err) {
      setError(
        err.message ||
          "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`

        /* ==========================================
           CARD ENTRANCE
        ========================================== */

        @keyframes signupCardEntrance {
          0% {
            opacity: 0;
            transform: translateY(25px) scale(0.98);
          }

          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* ==========================================
           LOGO ENTRANCE
        ========================================== */

        @keyframes signupLogoEntrance {
          0% {
            opacity: 0;
            transform: translateY(-15px);
          }

          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ==========================================
           FORM ENTRANCE
        ========================================== */

        @keyframes signupFieldEntrance {
          0% {
            opacity: 0;
            transform: translateX(18px);
          }

          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* ==========================================
           JOJO ENTRANCE
        ========================================== */

        @keyframes signupJojoEntrance {
          0% {
            opacity: 0;
            transform: translateX(-45px) scale(0.88);
          }

          70% {
            opacity: 1;
            transform: translateX(5px) scale(1.03);
          }

          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        /* ==========================================
           JOJO FLOAT
        ========================================== */

        @keyframes signupJojoFloat {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }

          50% {
            transform: translateY(-7px) rotate(-1deg);
          }
        }

        /* ==========================================
           TRUE CIRCULAR ORBIT
        ========================================== */

        @keyframes signupOrbitClockwise {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes signupOrbitCounter {
          from {
            transform: rotate(360deg);
          }

          to {
            transform: rotate(0deg);
          }
        }

        /* ==========================================
           SPEECH BUBBLE
        ========================================== */

        @keyframes signupSpeechPop {
          0% {
            opacity: 0;
            transform:
              translateX(18px)
              translateY(-50%)
              scale(0.78);
          }

          70% {
            opacity: 1;
            transform:
              translateX(-3px)
              translateY(-50%)
              scale(1.03);
          }

          100% {
            opacity: 1;
            transform:
              translateX(0)
              translateY(-50%)
              scale(1);
          }
        }

        /* ==========================================
           SPARKLES
        ========================================== */

        @keyframes signupSparkle {
          0%,
          100% {
            opacity: 0.45;
            transform: scale(1) rotate(0deg);
          }

          50% {
            opacity: 1;
            transform: scale(1.25) rotate(18deg);
          }
        }

        /* ==========================================
           GLOW
        ========================================== */

        @keyframes signupGlowPulse {
          0%,
          100% {
            transform: scale(0.95);
            opacity: 0.3;
          }

          50% {
            transform: scale(1.08);
            opacity: 0.6;
          }
        }

        @keyframes signupGlowMove {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }

          50% {
            transform: translate(18px, 14px) scale(1.07);
          }
        }

        /* ==========================================
           ANIMATION CLASSES
        ========================================== */

        .signup-card-animation {
          animation:
            signupCardEntrance
            0.8s
            ease-out
            both;
        }

        .signup-logo-animation {
          animation:
            signupLogoEntrance
            0.7s
            ease-out
            0.15s
            both;
        }

        .signup-field-animation {
          animation:
            signupFieldEntrance
            0.55s
            ease-out
            both;
        }

        .signup-jojo-entrance {
          animation:
            signupJojoEntrance
            0.9s
            cubic-bezier(0.22, 1, 0.36, 1)
            both;
        }

        .signup-jojo-float {
          animation:
            signupJojoFloat
            4s
            ease-in-out
            1s
            infinite;
        }

        .signup-speech-animation {
          animation:
            signupSpeechPop
            0.8s
            cubic-bezier(0.22, 1, 0.36, 1)
            0.55s
            both;
        }

        .signup-sparkle-one {
          animation:
            signupSparkle
            3s
            ease-in-out
            infinite;
        }

        .signup-sparkle-two {
          animation:
            signupSparkle
            3.7s
            ease-in-out
            0.7s
            infinite;
        }

        .signup-sparkle-three {
          animation:
            signupSparkle
            4.2s
            ease-in-out
            1.1s
            infinite;
        }

        .signup-glow-pulse {
          animation:
            signupGlowPulse
            4s
            ease-in-out
            infinite;
        }

        .signup-glow-move {
          animation:
            signupGlowMove
            7s
            ease-in-out
            infinite;
        }

        .signup-field-1 {
          animation-delay: 0.15s;
        }

        .signup-field-2 {
          animation-delay: 0.22s;
        }

        .signup-field-3 {
          animation-delay: 0.29s;
        }

        .signup-field-4 {
          animation-delay: 0.36s;
        }

        .signup-field-5 {
          animation-delay: 0.43s;
        }

        .signup-field-6 {
          animation-delay: 0.50s;
        }

        .signup-button-animation {
          animation:
            signupFieldEntrance
            0.6s
            ease-out
            0.57s
            both;
        }

        @media (prefers-reduced-motion: reduce) {
          .signup-card-animation,
          .signup-logo-animation,
          .signup-field-animation,
          .signup-jojo-entrance,
          .signup-jojo-float,
          .signup-speech-animation,
          .signup-sparkle-one,
          .signup-sparkle-two,
          .signup-sparkle-three,
          .signup-glow-pulse,
          .signup-glow-move {
            animation: none !important;
          }
        }

      `}</style>

      <div
        className={`relative flex min-h-screen items-center justify-center p-4 font-sans transition-colors duration-500 sm:p-6 ${
          isDarkMode
            ? "bg-[#0E0B15] text-[#F5F2FA]"
            : "bg-[#F6F3FC] text-[#292530]"
        }`}
      >

        {/* ==========================================
            BACKGROUND GLOWS
        ========================================== */}

        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">

          <div
            className={`signup-glow-move absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full blur-[130px] transition-colors duration-700 ${
              isDarkMode
                ? "bg-[#6D45B8]/25"
                : "bg-[#D9CEF5]/60"
            }`}
          />

          <div
            className={`signup-glow-move absolute -right-40 top-[20%] h-[500px] w-[500px] rounded-full blur-[130px] ${
              isDarkMode
                ? "bg-[#8B5CF6]/15"
                : "bg-[#E9DDF5]/70"
            }`}
            style={{
              animationDelay: "-3s",
            }}
          />

        </div>

        {/* ==========================================
            TOP CONTROLS
        ========================================== */}

        <div className="absolute right-4 top-4 flex items-center gap-3 sm:right-6 sm:top-6">

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition-all hover:-translate-y-0.5 ${
                isDarkMode
                  ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                  : "border-white/80 bg-white/70 text-[#292530] hover:bg-white"
              }`}
            >
              ← Back
            </button>
          )}

          <button
            type="button"
            onClick={toggleDarkMode}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5 hover:rotate-6 ${
              isDarkMode
                ? "border-white/10 bg-white/10 text-yellow-300 hover:bg-white/20"
                : "border-white/80 bg-white/70 text-purple-600 shadow-sm hover:bg-white"
            }`}
            aria-label="Toggle theme"
            title={
              isDarkMode
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
          >
            {isDarkMode ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </button>

        </div>

        {/* ==========================================
            MAIN CARD
        ========================================== */}

        <div
          className={`signup-card-animation mt-12 grid w-full max-w-5xl overflow-hidden rounded-[24px] border backdrop-blur-2xl transition-all duration-500 sm:rounded-[32px] lg:mt-0 lg:grid-cols-2 ${
            isDarkMode
              ? "border-white/10 bg-[#17131F]/80 shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
              : "border-white/80 bg-white/60 shadow-[0_18px_50px_rgba(70,55,110,0.12)]"
          }`}
        >

          {/* ==========================================
              LEFT PANEL
          ========================================== */}

          <div className="relative hidden min-h-[700px] flex-col overflow-hidden bg-gradient-to-br from-[#8064C7] via-[#7455B8] to-[#5D4298] p-10 text-white sm:p-12 lg:flex">

            {/* BACKGROUND GLOW 1 */}

            <div className="signup-glow-pulse absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

            {/* BACKGROUND GLOW 2 */}

            <div
              className="signup-glow-pulse absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
              style={{
                animationDelay: "-2s",
              }}
            />

            {/* ======================================
                LOGO
            ====================================== */}

            <div className="signup-logo-animation relative z-10 flex items-center gap-3">

              <div className="text-4xl font-black tracking-[-0.08em] text-white">
                Jot<span className="text-purple-200">.</span>
              </div>

              <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                your study buddy
              </span>

            </div>

            {/* ======================================
                JOJO AREA
            ====================================== */}

            <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">

              <div className="relative mb-5 flex h-[280px] w-[420px] items-center justify-center">

                {/* =================================
                    VISIBLE OUTER ORBIT
                ================================= */}

                <div
                  className="absolute left-1/2 top-1/2 h-[250px] w-[250px] -ml-[125px] -mt-[125px] rounded-full border border-white/15"
                />

                {/* =================================
                    VISIBLE INNER ORBIT
                ================================= */}

                <div
                  className="absolute left-1/2 top-1/2 h-[190px] w-[190px] -ml-[95px] -mt-[95px] rounded-full border border-dashed border-white/20"
                />

                {/* =================================
                    OUTER ORBIT — BUBBLE 1
                    ATTACHED TO CIRCUMFERENCE
                ================================= */}

                <div
                  className="absolute left-1/2 top-1/2 h-[250px] w-[250px] -ml-[125px] -mt-[125px]"
                  style={{
                    animation:
                      "signupOrbitClockwise 8s linear infinite",
                  }}
                >
                  <span className="absolute left-1/2 top-[-6px] h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.95)]" />
                </div>

                {/* =================================
                    OUTER ORBIT — BUBBLE 2
                ================================= */}

                <div
                  className="absolute left-1/2 top-1/2 h-[250px] w-[250px] -ml-[125px] -mt-[125px]"
                  style={{
                    animation:
                      "signupOrbitClockwise 11s linear infinite",
                    animationDelay: "-3s",
                  }}
                >
                  <span className="absolute right-[-6px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white/90 shadow-[0_0_14px_rgba(255,255,255,0.8)]" />
                </div>

                {/* =================================
                    OUTER ORBIT — BUBBLE 3
                ================================= */}

                <div
                  className="absolute left-1/2 top-1/2 h-[250px] w-[250px] -ml-[125px] -mt-[125px]"
                  style={{
                    animation:
                      "signupOrbitClockwise 13s linear infinite",
                    animationDelay: "-6s",
                  }}
                >
                  <span className="absolute bottom-[-6px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.7)]" />
                </div>

                {/* =================================
                    INNER ORBIT — BUBBLE 1
                ================================= */}

                <div
                  className="absolute left-1/2 top-1/2 h-[190px] w-[190px] -ml-[95px] -mt-[95px]"
                  style={{
                    animation:
                      "signupOrbitCounter 6s linear infinite",
                  }}
                >
                  <span className="absolute left-1/2 top-[-5px] h-3 w-3 -translate-x-1/2 rounded-full bg-purple-200 shadow-[0_0_15px_rgba(229,220,248,0.9)]" />
                </div>

                {/* =================================
                    INNER ORBIT — BUBBLE 2
                ================================= */}

                <div
                  className="absolute left-1/2 top-1/2 h-[190px] w-[190px] -ml-[95px] -mt-[95px]"
                  style={{
                    animation:
                      "signupOrbitCounter 9s linear infinite",
                    animationDelay: "-2s",
                  }}
                >
                  <span className="absolute right-[-5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-purple-200/90 shadow-[0_0_12px_rgba(229,220,248,0.8)]" />
                </div>

                {/* =================================
                    OUTER ORBIT — SPARKLE
                ================================= */}

                <div
                  className="absolute left-1/2 top-1/2 h-[250px] w-[250px] -ml-[125px] -mt-[125px]"
                  style={{
                    animation:
                      "signupOrbitClockwise 15s linear infinite",
                    animationDelay: "-5s",
                  }}
                >
                  <span className="absolute left-[-5px] top-1/2 text-lg text-white/80">
                    ✦
                  </span>
                </div>

                {/* =================================
                    INNER ORBIT — SPARKLE
                ================================= */}

                <div
                  className="absolute left-1/2 top-1/2 h-[190px] w-[190px] -ml-[95px] -mt-[95px]"
                  style={{
                    animation:
                      "signupOrbitCounter 10s linear infinite",
                    animationDelay: "-4s",
                  }}
                >
                  <span className="absolute bottom-[-5px] left-1/2 text-sm text-purple-200">
                    ✦
                  </span>
                </div>

                {/* =================================
                    EXTRA STATIC SPARKLES
                ================================= */}

                <div className="signup-sparkle-one absolute left-[13%] top-[16%] text-xl text-white/70">
                  ✧
                </div>

                <div className="signup-sparkle-two absolute right-[13%] top-[15%] text-sm text-purple-200">
                  ✦
                </div>

                <div className="signup-sparkle-three absolute bottom-[13%] right-[17%] text-lg text-white/60">
                  ✧
                </div>

                {/* =================================
                    JOJO
                    FIXED IN THE CENTRE
                ================================= */}

                <div className="signup-jojo-entrance relative z-10 flex h-[220px] w-[220px] items-center justify-center">

                  {/* JOJO GLOW */}

                  <div className="signup-glow-pulse absolute inset-6 rounded-full bg-white/10 blur-3xl" />

                  <div className="signup-jojo-float relative flex h-full w-full items-center justify-center">

                    <img
                      src={jojoWaving}
                      alt="Jojo waving"
                      className="h-[215px] w-[215px] object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.18)]"
                    />

                  </div>

                </div>

                {/* =================================
                    SPEECH BUBBLE
                ================================= */}

                <div className="signup-speech-animation absolute left-[250px] top-1/2 z-20 -translate-y-1/2">

                  <div className="relative w-[175px] rounded-2xl border border-white/30 bg-white px-4 py-3 text-left shadow-[0_12px_30px_rgba(0,0,0,0.14)]">

                    <p className="text-sm font-black leading-tight text-[#4F3A7D]">
                      Hey! I'm Jojo 👋
                    </p>

                    <p className="mt-1 text-xs font-semibold leading-4 text-[#75678E]">
                      Let's get you started!
                    </p>

                    {/* SPEECH POINTER */}

                    <div className="absolute left-[-7px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-45 border-b border-l border-white/30 bg-white" />

                  </div>

                </div>

              </div>

              {/* ======================================
                  LEFT HEADING
              ====================================== */}

              <h1 className="signup-field-animation text-4xl font-black leading-tight tracking-tight">

                Your study journey

                <br />

                <span className="text-purple-200">
                  starts here.
                </span>

              </h1>

              {/* ======================================
                  LEFT DESCRIPTION
              ====================================== */}

              <p className="signup-field-animation signup-field-2 mt-6 max-w-md text-sm leading-6 text-purple-100/90">

                Create your profile and let Jojo turn your
                notes into smart summaries, practice quizzes,
                and interactive flashcards.

              </p>

            </div>

            {/* ======================================
                FOOTER
            ====================================== */}

            <div className="signup-logo-animation relative z-10 flex items-center gap-2 text-xs font-semibold text-purple-200">

              <Sparkles
                size={16}
                className="animate-pulse"
              />

              <span>
                Jot it. Organise it. Top it.
              </span>

            </div>

          </div>

          {/* ==========================================
              RIGHT SIDE — FORM
          ========================================== */}

          <div className="p-6 sm:p-12 lg:p-14">

            {/* MOBILE LOGO */}

            <div className="signup-logo-animation mb-6 flex items-center justify-between lg:mb-8">

              <div className="text-3xl font-black tracking-[-0.08em] lg:hidden">
                Jot<span className="text-[#8064C7]">.</span>
              </div>

            </div>

            {/* ======================================
                MOBILE JOJO
            ====================================== */}

            <div className="mb-6 flex justify-center lg:hidden">

              <div className="relative flex h-[155px] w-[280px] items-center justify-center">

                {/* MOBILE OUTER CIRCLE */}

                <div className="absolute left-1/2 top-1/2 h-[145px] w-[145px] -ml-[72.5px] -mt-[72.5px] rounded-full border border-[#8064C7]/15" />

                {/* MOBILE INNER CIRCLE */}

                <div className="absolute left-1/2 top-1/2 h-[105px] w-[105px] -ml-[52.5px] -mt-[52.5px] rounded-full border border-dashed border-[#8064C7]/15" />

                {/* MOBILE OUTER BUBBLE */}

                <div
                  className="absolute left-1/2 top-1/2 h-[145px] w-[145px] -ml-[72.5px] -mt-[72.5px]"
                  style={{
                    animation:
                      "signupOrbitClockwise 7s linear infinite",
                  }}
                >
                  <span className="absolute left-1/2 top-[-5px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#8064C7] shadow-[0_0_12px_rgba(128,100,199,0.7)]" />
                </div>

                {/* MOBILE INNER BUBBLE */}

                <div
                  className="absolute left-1/2 top-1/2 h-[105px] w-[105px] -ml-[52.5px] -mt-[52.5px]"
                  style={{
                    animation:
                      "signupOrbitCounter 5s linear infinite",
                  }}
                >
                  <span className="absolute right-[-4px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#A58CDD]" />
                </div>

                {/* MOBILE JOJO */}

                <div className="signup-jojo-entrance relative z-10">

                  <div className="signup-jojo-float">

                    <img
                      src={jojoWaving}
                      alt="Jojo waving"
                      className="h-[115px] w-[115px] object-contain"
                    />

                  </div>

                </div>

                {/* MOBILE SPEECH */}

                <div className="signup-speech-animation absolute right-[-5px] top-[-5px] z-20 w-[145px]">

                  <div className="relative rounded-2xl border border-[#8064C7]/15 bg-white px-3 py-2.5 text-left shadow-lg">

                    <p className="text-[11px] font-black leading-tight text-[#4F3A7D]">
                      Hey! I'm Jojo 👋
                    </p>

                    <p className="mt-0.5 text-[10px] font-semibold leading-4 text-[#75678E]">
                      Let's get started!
                    </p>

                    <div className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 border-b border-r border-[#8064C7]/15 bg-white" />

                  </div>

                </div>

              </div>

            </div>

            {/* ======================================
                FORM HEADER
            ====================================== */}

            <div className="signup-field-animation mb-6">

              <h2 className="text-3xl font-black tracking-tight">
                Create your account
              </h2>

              <p
                className={`mt-2 text-sm ${
                  isDarkMode
                    ? "text-white/55"
                    : "text-[#706A78]"
                }`}
              >
                Set up your profile to start studying
                without the chaos.
              </p>

            </div>

            {/* ======================================
                FORM
            ====================================== */}

            <form
              onSubmit={handleSubmit}
              className="space-y-3.5"
            >

              {/* FULL NAME */}

              <div className="signup-field-animation signup-field-1">

                <label
                  className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${
                    isDarkMode
                      ? "text-white/70"
                      : "text-[#292530]"
                  }`}
                >
                  Full Name
                </label>

                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  required
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all duration-300 focus:-translate-y-0.5 ${
                    isDarkMode
                      ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7] focus:bg-white/10"
                      : "border-gray-200 bg-white/80 text-[#292530] placeholder:text-gray-400 focus:border-[#8064C7] focus:bg-white"
                  }`}
                />

              </div>

              {/* DATE OF BIRTH */}

              <div className="signup-field-animation signup-field-2">

                <label
                  className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${
                    isDarkMode
                      ? "text-white/70"
                      : "text-[#292530]"
                  }`}
                >
                  Date of Birth
                </label>

                <input
                  type="date"
                  max={today}
                  value={dob}
                  onChange={(e) =>
                    setDob(e.target.value)
                  }
                  required
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all duration-300 focus:-translate-y-0.5 ${
                    isDarkMode
                      ? "border-white/10 bg-white/5 text-white focus:border-[#8064C7] focus:bg-white/10"
                      : "border-gray-200 bg-white/80 text-[#292530] focus:border-[#8064C7] focus:bg-white"
                  }`}
                />

              </div>

              {/* EMAIL */}

              <div className="signup-field-animation signup-field-3">

                <label
                  className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${
                    isDarkMode
                      ? "text-white/70"
                      : "text-[#292530]"
                  }`}
                >
                  Email Address
                </label>

                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all duration-300 focus:-translate-y-0.5 ${
                    isDarkMode
                      ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7] focus:bg-white/10"
                      : "border-gray-200 bg-white/80 text-[#292530] placeholder:text-gray-400 focus:border-[#8064C7] focus:bg-white"
                  }`}
                />

              </div>

              {/* PASSWORD */}

              <div className="signup-field-animation signup-field-4">

                <label
                  className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${
                    isDarkMode
                      ? "text-white/70"
                      : "text-[#292530]"
                  }`}
                >
                  Password
                </label>

                <div className="relative">

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    required
                    className={`w-full rounded-xl border px-4 py-2.5 pr-11 text-sm outline-none transition-all duration-300 focus:-translate-y-0.5 ${
                      isDarkMode
                        ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7] focus:bg-white/10"
                        : "border-gray-200 bg-white/80 text-[#292530] placeholder:text-gray-400 focus:border-[#8064C7] focus:bg-white"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-300 hover:scale-110 ${
                      isDarkMode
                        ? "text-white/40 hover:text-white"
                        : "text-gray-400 hover:text-[#292530]"
                    }`}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>

                </div>

              </div>

              {/* CONFIRM PASSWORD */}

              <div className="signup-field-animation signup-field-5">

                <label
                  className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${
                    isDarkMode
                      ? "text-white/70"
                      : "text-[#292530]"
                  }`}
                >
                  Confirm Password
                </label>

                <div className="relative">

                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value
                      )
                    }
                    required
                    className={`w-full rounded-xl border px-4 py-2.5 pr-11 text-sm outline-none transition-all duration-300 focus:-translate-y-0.5 ${
                      isDarkMode
                        ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7] focus:bg-white/10"
                        : "border-gray-200 bg-white/80 text-[#292530] placeholder:text-gray-400 focus:border-[#8064C7] focus:bg-white"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-300 hover:scale-110 ${
                      isDarkMode
                        ? "text-white/40 hover:text-white"
                        : "text-gray-400 hover:text-[#292530]"
                    }`}
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>

                </div>

              </div>

              {/* ERROR */}

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-400">
                  {error}
                </div>
              )}

              {/* TERMS */}

              <div className="signup-field-animation signup-field-6 flex items-start gap-2 pt-1">

                <input
                  type="checkbox"
                  required
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#8064C7]"
                />

                <p
                  className={`text-xs ${
                    isDarkMode
                      ? "text-white/60"
                      : "text-gray-500"
                  }`}
                >
                  I agree to the Terms of Service and
                  Privacy Policy.
                </p>

              </div>

              {/* CREATE ACCOUNT BUTTON */}

              <button
                type="submit"
                disabled={loading}
                className="signup-button-animation w-full rounded-xl bg-[#8064C7] py-3.5 text-sm font-bold text-white shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#8B6DD4] hover:shadow-[0_18px_40px_rgba(128,100,199,0.45)] disabled:opacity-50"
              >
                {loading
                  ? "Creating Account..."
                  : "Create Account →"}
              </button>

            </form>

            {/* ======================================
                LOGIN LINK
            ====================================== */}

            <div className="signup-field-animation signup-field-6 mt-6 text-center">

              <p
                className={`text-sm ${
                  isDarkMode
                    ? "text-white/60"
                    : "text-gray-500"
                }`}
              >
                Already have an account?{" "}

                <button
                  type="button"
                  onClick={onLogin}
                  className="font-bold text-[#8064C7] transition-all duration-300 hover:underline hover:tracking-wide"
                >
                  Login
                </button>

              </p>

            </div>

          </div>

        </div>
      </div>
    </>
  );
}

export default SignUpPage;