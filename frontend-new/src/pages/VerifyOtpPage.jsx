import { useEffect, useState } from "react";
import { Eye, EyeOff, Sparkles, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";

const OTP_LENGTH = 8;
const OTP_VALIDITY_SECONDS = 120;

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function VerifyOtpPage({ email, type, onVerified, onBack }) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_VALIDITY_SECONDS);
  const [resendKey, setResendKey] = useState(0);

  const isRecovery = type === "recovery";
  const isExpired = secondsLeft <= 0;

  useEffect(() => {
    const intervalId = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [resendKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!code.trim()) {
      setError("Please enter the verification code.");
      return;
    }

    if (isExpired) {
      setError("This code has expired. Please request a new one.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type,
      });

      if (verifyError) {
        setError(verifyError.message || "Invalid or expired code.");
        setLoading(false);
        return;
      }

      if (onVerified) {
        onVerified(data);
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    setResending(true);

    try {
      const { error: resendError } = isRecovery
        ? await supabase.auth.resetPasswordForEmail(email)
        : await supabase.auth.resend({ type: "signup", email });

      if (resendError) {
        setError(resendError.message || "Failed to resend the code.");
        return;
      }

      setCode("");
      setInfo("A new code has been sent to your email.");
      setSecondsLeft(OTP_VALIDITY_SECONDS);
      setResendKey((prev) => prev + 1);
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      className={`relative flex min-h-screen items-center justify-center p-6 transition-colors duration-500 font-sans ${
        isDarkMode ? "bg-[#0E0B15] text-[#F5F2FA]" : "bg-[#F6F3FC] text-[#292530]"
      }`}
    >
      {/* Background Glows */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className={`absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full blur-[130px] transition-colors duration-700 ${
            isDarkMode ? "bg-[#6D45B8]/25" : "bg-[#D9CEF5]/60"
          }`}
        />
        <div
          className={`absolute -right-40 top-[20%] h-[500px] w-[500px] rounded-full blur-[130px] ${
            isDarkMode ? "bg-[#8B5CF6]/15" : "bg-[#E9DDF5]/70"
          }`}
        />
      </div>

      {/* Top Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
              isDarkMode
                ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                : "border-white/80 bg-white/70 text-[#292530] hover:bg-white"
            }`}
          >
            ← Back
          </button>
        )}
        <button
          onClick={toggleDarkMode}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
            isDarkMode
              ? "border-white/10 bg-white/10 text-yellow-300 hover:bg-white/20"
              : "border-white/80 bg-white/70 text-purple-600 hover:bg-white shadow-sm"
          }`}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Glass Card Container */}
      <div
        className={`grid w-full max-w-5xl overflow-hidden rounded-[32px] border backdrop-blur-2xl transition-all duration-500 shadow-2xl lg:grid-cols-2 ${
          isDarkMode
            ? "border-white/10 bg-[#17131F]/80 shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            : "border-white/80 bg-white/60 shadow-[0_18px_50px_rgba(70,55,110,0.12)]"
        }`}
      >
        {/* ================= LEFT SECTION ================= */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#8064C7] via-[#7455B8] to-[#5D4298] p-12 text-white lg:flex">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10">
            <div className="mb-10 flex items-center gap-3">
              <div className="text-4xl font-black tracking-[-0.08em] text-white">
                Jot<span className="text-purple-200">.</span>
              </div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                your study buddy
              </span>
            </div>

            <h1 className="max-w-md text-4xl font-black leading-tight tracking-tight">
              Almost there.
              <br />
              <span className="text-purple-200">Just one more step.</span>
            </h1>

            <p className="mt-6 max-w-md text-sm leading-6 text-purple-100/90">
              {isRecovery
                ? "Enter the verification code sent to your email to securely reset your password."
                : "Enter the verification code sent to your email to activate your JOT account."}
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-xs font-semibold text-purple-200">
            <Sparkles size={16} />
            <span>Jot it. Organise it. Top it.</span>
          </div>
        </div>

        {/* ================= RIGHT SECTION ================= */}
        <div className="p-8 sm:p-12 lg:p-14">
          <div className="mb-7 flex items-center gap-2 lg:hidden">
            <div className="text-3xl font-black tracking-[-0.08em]">
              Jot<span className="text-[#8064C7]">.</span>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="text-3xl font-black tracking-tight">
              {isRecovery ? "Verify your identity" : "Verify your email"}
            </h2>
            <p className={`mt-2 text-sm ${isDarkMode ? "text-white/55" : "text-[#706A78]"}`}>
              Enter the verification code sent to{" "}
              <span className="font-bold underline decoration-[#8064C7] text-inherit">{email}</span>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-white/70" : "text-[#292530]"}`}>
                  Verification Code
                </label>
                <span
                  className={`text-xs font-bold ${
                    isExpired ? "text-red-400" : isDarkMode ? "text-[#A78BFA]" : "text-[#8064C7]"
                  }`}
                >
                  {isExpired
                    ? "Code expired"
                    : `Expires in ${formatTime(secondsLeft)}`}
                </span>
              </div>

              <div className="relative">
                <input
                  type={showCode ? "text" : "password"}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={OTP_LENGTH}
                  placeholder="12345678"
                  value={code}
                  onChange={(e) =>
                    setCode(
                      e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH)
                    )
                  }
                  disabled={isExpired}
                  required
                  className={`w-full rounded-xl border px-4 py-3 pr-11 text-center text-lg font-black tracking-[0.35em] outline-none transition-all ${
                    isDarkMode
                      ? "border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[#8064C7] focus:bg-white/10"
                      : "border-gray-200 bg-white/80 text-[#292530] placeholder:text-gray-300 focus:border-[#8064C7] focus:bg-white"
                  } disabled:opacity-50`}
                />

                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  disabled={isExpired}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                    isDarkMode ? "text-white/40 hover:text-white" : "text-gray-400 hover:text-[#292530]"
                  } disabled:opacity-50`}
                >
                  {showCode ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs font-semibold text-red-400">
                {error}
              </div>
            )}

            {info && (
              <div className="rounded-xl border border-[#8064C7]/30 bg-[#8064C7]/15 p-3.5 text-xs font-semibold text-[#8064C7] dark:text-[#A78BFA]">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isExpired}
              className="w-full rounded-xl bg-[#8064C7] py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8B6DD4] shadow-[0_15px_35px_rgba(128,100,199,0.35)] disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Code →"}
            </button>
          </form>

          <div className="mt-7 flex items-center justify-between text-xs font-semibold">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-[#8064C7] hover:underline disabled:opacity-50"
            >
              {resending ? "Resending..." : "Resend code"}
            </button>

            <button
              type="button"
              onClick={onBack}
              className={`hover:underline ${isDarkMode ? "text-white/50" : "text-gray-500"}`}
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyOtpPage;

