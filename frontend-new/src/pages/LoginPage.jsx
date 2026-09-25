import { useState } from "react";
import { Eye, EyeOff, Sparkles, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import { hashPasswordClient } from "../services/crypto";
import { createAuditLog } from "../services/api";
import jojoWaving from "../assets/jojo-waving.png";
import JojoLogo from "../components/JojoLogo";

function LoginPage({ onLogin, onSignUp, onForgotPassword, onBack }) {
  const { isDarkMode, toggleDarkMode } = useTheme();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const clientHashedPassword = await hashPasswordClient(
        password,
        normalizedEmail
      );

      const { data, error: authError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: clientHashedPassword,
        });

      if (authError) {
        setError(
          authError.message ||
            "Failed to sign in. Please check your credentials."
        );
        setLoading(false);
        return;
      }

      // Create an application-level audit record after successful login.
      try {
        await createAuditLog("LOGIN");
      } catch (auditError) {
        console.error(
          "Failed to create login audit log:",
          auditError
        );
      }

      if (onLogin && data?.user) {
        console.log("[TOUR DEBUG] Login successful. User ID:", data.user.id, "Email:", normalizedEmail);
        onLogin({
          id: data.user.id,
          name:
            data.user.user_metadata?.full_name ||
            normalizedEmail.split("@")[0],
          email: data.user.email,
          createdAt: data.user.created_at,
        });
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* =========================================================
          ANIMATION STYLES
      ========================================================= */}
      <style>{`
        @keyframes loginAmbientFloat {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(20px, -18px, 0) scale(1.05);
          }
        }

        @keyframes loginAmbientFloatReverse {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-22px, 18px, 0) scale(1.06);
          }
        }

        @keyframes particleFloat {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.35;
          }
          50% {
            transform: translateY(-18px) scale(1.15);
            opacity: 0.75;
          }
        }

        @keyframes cardEntrance {
          0% {
            opacity: 0;
            transform: translateY(28px) scale(0.97);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes logoEntrance {
          0% {
            opacity: 0;
            transform: translateY(-18px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes jojoSlideIn {
          0% {
            opacity: 0;
            transform: translateX(-100px) translateY(12px) rotate(-8deg);
          }
          65% {
            opacity: 1;
            transform: translateX(12px) translateY(-4px) rotate(2deg);
          }
          100% {
            opacity: 1;
            transform: translateX(0) translateY(0) rotate(0deg);
          }
        }

        @keyframes jojoFloat {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-9px) rotate(1.5deg);
          }
        }

        @keyframes jojoGlow {
          0%, 100% {
            opacity: 0.18;
            transform: scale(0.95);
          }
          50% {
            opacity: 0.34;
            transform: scale(1.08);
          }
        }

        @keyframes speechSlideIn {
          0% {
            opacity: 0;
            transform: translateX(45px) scale(0.82);
          }
          65% {
            opacity: 1;
            transform: translateX(-5px) scale(1.03);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes speechFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        @keyframes orbitRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes orbitRotateReverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        @keyframes orbitDot {
          0% {
            transform: rotate(0deg) translateX(118px) rotate(0deg);
          }
          100% {
            transform: rotate(360deg) translateX(118px) rotate(-360deg);
          }
        }

        @keyframes orbitDotReverse {
          0% {
            transform: rotate(360deg) translateX(88px) rotate(-360deg);
          }
          100% {
            transform: rotate(0deg) translateX(88px) rotate(0deg);
          }
        }

        @keyframes sparkleFloat {
          0%, 100% {
            opacity: 0.45;
            transform: translateY(0) rotate(0deg) scale(0.9);
          }
          50% {
            opacity: 1;
            transform: translateY(-12px) rotate(20deg) scale(1.12);
          }
        }

        @keyframes sparkleFloatReverse {
          0%, 100% {
            opacity: 0.4;
            transform: translateY(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: translateY(10px) rotate(-18deg);
          }
        }

        @keyframes textReveal {
          0% {
            opacity: 0;
            transform: translateY(24px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes formReveal {
          0% {
            opacity: 0;
            transform: translateX(28px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes headingReveal {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes buttonShine {
          0% {
            transform: translateX(-120%);
          }
          45%, 100% {
            transform: translateX(120%);
          }
        }

        @keyframes iconSpin {
          0% {
            transform: rotate(-20deg) scale(0.8);
          }
          70% {
            transform: rotate(8deg) scale(1.08);
          }
          100% {
            transform: rotate(0deg) scale(1);
          }
        }

        .login-card-entrance {
          animation: cardEntrance 0.75s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .login-logo-entrance {
          animation: logoEntrance 0.65s ease-out 0.25s both;
        }

        .login-jojo {
          animation:
            jojoSlideIn 1s cubic-bezier(0.22, 1, 0.36, 1) 0.35s both,
            jojoFloat 4s ease-in-out 1.55s infinite;
        }

        .login-jojo-glow {
          animation: jojoGlow 3s ease-in-out 1.5s infinite;
        }

        .login-speech {
          animation:
            speechSlideIn 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.95s both,
            speechFloat 3.5s ease-in-out 1.8s infinite;
        }

        .login-orbit {
          animation: orbitRotate 18s linear infinite;
        }

        .login-orbit-reverse {
          animation: orbitRotateReverse 13s linear infinite;
        }

        .login-orbit-dot {
          animation: orbitDot 8s linear infinite;
        }

        .login-orbit-dot-reverse {
          animation: orbitDotReverse 6s linear infinite;
        }

        .login-sparkle-1 {
          animation: sparkleFloat 3s ease-in-out 1.3s infinite;
        }

        .login-sparkle-2 {
          animation: sparkleFloatReverse 3.5s ease-in-out 1.6s infinite;
        }

        .login-sparkle-3 {
          animation: sparkleFloat 4s ease-in-out 1.9s infinite;
        }

        .login-left-text {
          animation: textReveal 0.75s cubic-bezier(0.22, 1, 0.36, 1) 1.15s both;
        }

        .login-left-description {
          animation: textReveal 0.7s ease-out 1.35s both;
        }

        .login-left-tagline {
          animation: textReveal 0.7s ease-out 1.5s both;
        }

        .login-heading {
          animation: headingReveal 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both;
        }

        .login-form-item-1 {
          animation: formReveal 0.55s ease-out 0.45s both;
        }

        .login-form-item-2 {
          animation: formReveal 0.55s ease-out 0.55s both;
        }

        .login-form-item-3 {
          animation: formReveal 0.55s ease-out 0.65s both;
        }

        .login-form-item-4 {
          animation: formReveal 0.55s ease-out 0.75s both;
        }

        .login-form-item-5 {
          animation: formReveal 0.55s ease-out 0.85s both;
        }

        .login-theme-icon {
          animation: iconSpin 0.65s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .login-button-shine {
          animation: buttonShine 4.5s ease-in-out 2s infinite;
        }

        .login-input {
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            border-color 0.25s ease;
        }

        .login-input:focus {
          transform: translateY(-1px);
        }

        .login-main-button {
          position: relative;
          overflow: hidden;
        }

        .login-main-button:hover {
          transform: translateY(-3px);
        }

        .login-main-button:active {
          transform: translateY(-1px) scale(0.99);
        }

        .login-main-button .shine {
          position: absolute;
          inset: 0 auto 0 0;
          width: 35%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,0.22),
            transparent
          );
          transform: translateX(-120%);
          pointer-events: none;
        }

        .login-back:hover {
          transform: translateX(-3px);
        }

        @media (prefers-reduced-motion: reduce) {
          .login-card-entrance,
          .login-logo-entrance,
          .login-jojo,
          .login-jojo-glow,
          .login-speech,
          .login-orbit,
          .login-orbit-reverse,
          .login-orbit-dot,
          .login-orbit-dot-reverse,
          .login-sparkle-1,
          .login-sparkle-2,
          .login-sparkle-3,
          .login-left-text,
          .login-left-description,
          .login-left-tagline,
          .login-heading,
          .login-form-item-1,
          .login-form-item-2,
          .login-form-item-3,
          .login-form-item-4,
          .login-form-item-5 {
            animation: none !important;
          }
        }
      `}</style>

      <div
        className={`relative flex min-h-screen items-center justify-center overflow-hidden p-3 font-sans transition-colors duration-500 sm:p-6 ${
          isDarkMode
            ? "bg-[#0E0B15] text-[#F5F2FA]"
            : "bg-[#F6F3FC] text-[#292530]"
        }`}
      >
        {/* ================= BACKGROUND ================= */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div
            className={`absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full blur-[130px] transition-colors duration-700 ${
              isDarkMode
                ? "bg-[#6D45B8]/25"
                : "bg-[#D9CEF5]/60"
            }`}
            style={{
              animation: "loginAmbientFloat 8s ease-in-out infinite",
            }}
          />

          <div
            className={`absolute -right-40 top-[20%] h-[500px] w-[500px] rounded-full blur-[130px] ${
              isDarkMode
                ? "bg-[#8B5CF6]/15"
                : "bg-[#E9DDF5]/70"
            }`}
            style={{
              animation:
                "loginAmbientFloatReverse 10s ease-in-out infinite",
            }}
          />

          <div
            className={`absolute left-[9%] top-[32%] h-3 w-3 rounded-full ${
              isDarkMode
                ? "bg-[#8064C7]/30"
                : "bg-[#8064C7]/35"
            }`}
            style={{
              animation: "particleFloat 4s ease-in-out infinite",
            }}
          />

          <div
            className={`absolute right-[10%] top-[70%] h-2.5 w-2.5 rounded-full ${
              isDarkMode
                ? "bg-[#45A9A9]/35"
                : "bg-[#45A9A9]/45"
            }`}
            style={{
              animation: "particleFloat 5s ease-in-out 1s infinite",
            }}
          />

          <div
            className={`absolute left-[4%] bottom-[20%] h-2 w-2 rounded-full ${
              isDarkMode
                ? "bg-[#A58CDD]/35"
                : "bg-[#A58CDD]/45"
            }`}
            style={{
              animation: "particleFloat 4.5s ease-in-out 0.5s infinite",
            }}
          />
        </div>

        {/* ================= TOP CONTROLS ================= */}
        <div className="absolute right-3 top-3 z-50 flex items-center gap-2.5 sm:right-6 sm:top-6 sm:gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className={`login-back rounded-xl border px-3.5 py-2 text-xs font-bold transition-all duration-300 ${
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
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 hover:-translate-y-1 ${
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
            <span className="login-theme-icon block">
              {isDarkMode ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </span>
          </button>
        </div>

        {/* ================= MAIN CARD ================= */}
        <div
          className={`login-card-entrance mx-auto mt-4 grid w-full max-w-[480px] overflow-hidden rounded-2xl border backdrop-blur-2xl transition-all duration-500 sm:mt-10 sm:max-w-[520px] sm:rounded-[32px] lg:mt-0 lg:max-w-5xl lg:grid-cols-2 ${
            isDarkMode
              ? "border-white/10 bg-[#17131F]/80 shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
              : "border-white/80 bg-white/60 shadow-[0_18px_50px_rgba(70,55,110,0.12)]"
          }`}
        >
          {/* ================= LEFT SECTION ================= */}
          <div className="relative hidden min-h-[650px] flex-col overflow-hidden bg-gradient-to-br from-[#8064C7] via-[#7455B8] to-[#5D4298] p-10 text-white sm:p-12 lg:flex">

            {/* Decorative glows */}
            <div
              className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
              style={{
                animation:
                  "loginAmbientFloat 7s ease-in-out infinite",
              }}
            />

            <div
              className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
              style={{
                animation:
                  "loginAmbientFloatReverse 8s ease-in-out infinite",
              }}
            />

            {/* Logo */}
            <div className="login-logo-entrance relative z-30 flex items-center gap-3">
              <JojoLogo className="h-9 w-auto" />
              <div className="text-4xl font-black tracking-[-0.08em] text-white">
                Jot<span className="text-purple-200">.</span>
              </div>

              <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                your study buddy
              </span>
            </div>

            {/* ================= JOJO AREA ================= */}
            <div className="relative z-20 flex flex-1 flex-col items-center justify-center text-center">

              <div className="relative mb-5 h-[280px] w-[460px]">

                {/* Outer Orbit */}
                <div className="login-orbit absolute left-1/2 top-1/2 h-[245px] w-[245px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />

                {/* Inner Orbit */}
                <div className="login-orbit-reverse absolute left-1/2 top-1/2 h-[185px] w-[185px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/15" />

                {/* Orbit Dot 1 */}
                <div className="login-orbit-dot absolute left-1/2 top-1/2 z-[2] h-3 w-3 -translate-x-1/2 -translate-y-1/2">
                  <div className="h-3 w-3 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.8)]" />
                </div>

                {/* Orbit Dot 2 */}
                <div className="login-orbit-dot-reverse absolute left-1/2 top-1/2 z-[2] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2">
                  <div className="h-2.5 w-2.5 rounded-full bg-purple-200 shadow-[0_0_12px_rgba(255,255,255,0.5)]" />
                </div>

                {/* Sparkles */}
                <div className="login-sparkle-1 absolute left-[30px] top-[70px] z-10 text-purple-200">
                  <Sparkles size={18} />
                </div>

                <div className="login-sparkle-2 absolute right-[45px] top-[42px] z-10 text-white/80">
                  <Sparkles size={20} />
                </div>

                <div className="login-sparkle-3 absolute bottom-[42px] right-[78px] z-10 text-purple-200">
                  <Sparkles size={16} />
                </div>

                {/* ================= JOJO ================= */}
                <div className="login-jojo absolute left-[52px] top-[32px] z-20 flex h-[220px] w-[220px] items-center justify-center">

                  <div className="login-jojo-glow absolute inset-4 rounded-full bg-white/15 blur-3xl" />

                  <img
                    src={jojoWaving}
                    alt="Jojo waving"
                    className="relative h-[210px] w-[210px] object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.18)]"
                  />
                </div>

                {/* ================= SPEECH BUBBLE ================= */}
                <div className="login-speech absolute left-[255px] top-[82px] z-30 w-[175px]">

                  <div className="relative rounded-2xl border border-white/30 bg-white px-4 py-3 text-left shadow-[0_12px_30px_rgba(0,0,0,0.16)]">

                    <p className="text-sm font-black leading-tight text-[#4F3A7D]">
                      Hey! I'm Jojo ✨
                    </p>

                    <p className="mt-1 text-xs font-semibold leading-4 text-[#75678E]">
                      Ready to study with me?
                    </p>

                    <div className="absolute left-[-7px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-45 border-b border-l border-white/30 bg-white" />
                  </div>
                </div>
              </div>

              {/* Main Heading */}
              <h1 className="login-left-text text-4xl font-black leading-tight tracking-tight">
                Study without
                <br />
                <span className="text-purple-200">
                  the chaos.
                </span>
              </h1>

              {/* Description */}
              <p className="login-left-description mt-6 max-w-md text-sm leading-6 text-purple-100/90">
                Drop your notes into JOT and let Jojo turn
                them into smart summaries, quizzes, flashcards
                and quick revision material.
              </p>
            </div>

            {/* Bottom Tagline */}
            <div className="login-left-tagline relative z-10 flex items-center gap-2 text-xs font-semibold text-purple-200">
              <Sparkles size={16} />
              <span>Jot it. Organise it. Top it.</span>
            </div>
          </div>

          {/* ================= RIGHT SECTION ================= */}
          <div className="p-4 sm:p-8 md:p-10 lg:p-14">

            {/* Mobile Brand */}
            <div className="mb-2.5 flex items-center justify-between sm:mb-6 lg:mb-8">
              <div className="flex items-center gap-2 text-2xl font-black tracking-[-0.08em] sm:text-3xl lg:hidden">
                <JojoLogo className="h-7 w-auto" />
                <span>Jot<span className="text-[#8064C7]">.</span></span>
              </div>
            </div>

            {/* ================= MOBILE JOJO ================= */}
            <div className="mb-3 flex justify-center sm:mb-6 lg:hidden">
              <div className="relative flex max-w-[300px] items-center justify-center gap-3 sm:gap-4">
                <div className="relative flex h-[60px] w-[60px] shrink-0 items-center justify-center sm:h-[84px] sm:w-[84px]">
                  <div
                    className="absolute inset-0 rounded-full border border-[#8064C7]/20 dark:border-white/10"
                    style={{
                      animation: "orbitRotate 12s linear infinite",
                    }}
                  />
                  <img
                    src={jojoWaving}
                    alt="Jojo waving"
                    className="login-jojo relative z-10 h-[50px] w-[50px] object-contain drop-shadow-[0_8px_16px_rgba(128,100,199,0.2)] sm:h-[72px] sm:w-[72px]"
                  />
                </div>

                <div className="login-speech rounded-2xl border border-[#8064C7]/15 bg-white/90 px-3 py-1.5 sm:px-3.5 sm:py-2 text-left shadow-md dark:border-white/10 dark:bg-[#1E192B]">
                  <p className="text-[11px] font-black leading-tight text-[#4F3A7D] dark:text-[#C4B5FD]">
                    Hey! I'm Jojo 👋
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold leading-3 text-[#75678E] dark:text-white/60">
                    Ready to study?
                  </p>
                </div>
              </div>
            </div>

            {/* Heading */}
            <div className="login-heading mb-3 sm:mb-6 lg:mb-8">
              <h2 className="text-xl font-black tracking-tight sm:text-3xl">
                Welcome back
              </h2>

              <p
                className={`mt-1 sm:mt-2 text-xs sm:text-sm ${
                  isDarkMode
                    ? "text-white/55"
                    : "text-[#706A78]"
                }`}
              >
                Sign in to continue your study journey.
              </p>
            </div>

            {/* ================= LOGIN FORM ================= */}
            <form
              onSubmit={handleSubmit}
              className="space-y-3 sm:space-y-4 lg:space-y-5"
            >
              {/* Email */}
              <div className="login-form-item-1">
                <label
                  className={`mb-1.5 sm:mb-2 block text-xs font-bold uppercase tracking-wider ${
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
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`login-input w-full rounded-xl border px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm outline-none ${
                    isDarkMode
                      ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7] focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(128,100,199,0.10)]"
                      : "border-gray-200 bg-white/80 text-[#292530] placeholder:text-gray-400 focus:border-[#8064C7] focus:bg-white focus:shadow-[0_0_0_4px_rgba(128,100,199,0.10)]"
                  }`}
                />
              </div>

              {/* Password */}
              <div className="login-form-item-2">
                <div className="mb-1.5 sm:mb-2 flex items-center justify-between">
                  <label
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isDarkMode
                        ? "text-white/70"
                        : "text-[#292530]"
                    }`}
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-xs font-semibold text-[#8064C7] transition-all duration-200 hover:translate-x-0.5 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`login-input w-full rounded-xl border px-3.5 py-2.5 pr-11 sm:px-4 sm:py-3 text-sm outline-none ${
                      isDarkMode
                        ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7] focus:bg-white/10 focus:shadow-[0_0_0_4px_rgba(128,100,199,0.10)]"
                        : "border-gray-200 bg-white/80 text-[#292530] placeholder:text-gray-400 focus:border-[#8064C7] focus:bg-white focus:shadow-[0_0_0_4px_rgba(128,100,199,0.10)]"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-200 hover:scale-110 ${
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

              {/* Remember Me */}
              <div className="login-form-item-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 accent-[#8064C7]"
                />

                <span
                  className={`text-xs ${
                    isDarkMode
                      ? "text-white/60"
                      : "text-gray-500"
                  }`}
                >
                  Remember me
                </span>
              </div>

              {/* Error */}
              {error && (
                <div className="login-form-item-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs font-semibold text-red-400">
                  {error}
                </div>
              )}

              {/* Login Button */}
              <div className="login-form-item-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="login-main-button w-full rounded-xl bg-[#8064C7] py-2.5 sm:py-3.5 text-sm font-bold text-white shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition-all duration-300 hover:bg-[#8B6DD4] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="relative z-10">
                    {loading
                      ? "Logging in..."
                      : "Login →"}
                  </span>

                  <span className="shine login-button-shine" />
                </button>
              </div>
            </form>

            {/* ================= SIGN UP ================= */}
            <div className="login-form-item-5 mt-4 sm:mt-6 lg:mt-8 text-center">
              <p
                className={`text-sm ${
                  isDarkMode
                    ? "text-white/60"
                    : "text-gray-500"
                }`}
              >
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={onSignUp}
                  className="font-bold text-[#8064C7] transition-all duration-200 hover:translate-x-0.5 hover:underline"
                >
                  Sign Up
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default LoginPage;