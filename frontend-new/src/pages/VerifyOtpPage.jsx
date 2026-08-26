import { useEffect, useState } from "react";
import { BookOpen, Eye, EyeOff } from "lucide-react";
import { supabase } from "../services/supabase";

// Matches the OTP length configured in the Supabase project's auth settings.
const OTP_LENGTH = 8;

// Matches the OTP expiry configured in the Supabase project's auth settings
// (supabase/config.toml -> [auth.email] otp_expiry). This only drives the
// countdown UI here — the code's real expiry is enforced server-side by
// Supabase when verifyOtp() is called.
const OTP_VALIDITY_SECONDS = 120;

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function VerifyOtpPage({ email, type, onVerified, onBack }) {
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

  // Ticks the countdown down every second. Restarts (via the resendKey
  // dependency and the setSecondsLeft call in handleResend) whenever a
  // fresh code is sent. The interval stops itself once it hits zero.
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
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFA] px-6">

      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl lg:grid-cols-2">

        {/* ================= LEFT SECTION ================= */}
        <div className="hidden flex-col justify-between bg-[#4E1F6E] p-10 text-white lg:flex">

          <div>

            <div className="mb-8 flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#98E8DE]">

                <BookOpen
                  size={24}
                  className="text-[#4E1F6E]"
                />

              </div>

              <span className="text-xl font-bold">
                AI STUDY ENGINE
              </span>

            </div>


            <h1 className="max-w-md text-4xl font-bold leading-tight">
              Almost there.
              <br />
              Just one more step.
            </h1>


            <p className="mt-6 max-w-md text-sm leading-6 text-purple-100">
              {isRecovery
                ? "Enter the verification code we sent you to securely reset your password."
                : "Enter the verification code we sent you to activate your account."}
            </p>

          </div>


          <p className="text-xs text-purple-200">
            AI-powered personalized learning
          </p>

        </div>


        {/* ================= RIGHT SECTION ================= */}
        <div className="p-8 sm:p-12 lg:p-14">

          {/* Mobile Logo */}
          <div className="mb-7 flex items-center gap-3 lg:hidden">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#98E8DE]">

              <BookOpen
                size={21}
                className="text-[#4E1F6E]"
              />

            </div>

            <span className="font-bold text-[#4E1F6E]">
              AI STUDY ENGINE
            </span>

          </div>


          {/* Heading */}
          <div className="mb-7">

            <h2 className="text-3xl font-bold text-[#3E3E75]">
              {isRecovery ? "Verify your identity" : "Verify your email"}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Enter the verification code we sent to{" "}
              <span className="font-semibold text-[#3E3E75]">{email}</span>.
            </p>

          </div>


          {/* ================= OTP FORM ================= */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Code Input */}
            <div>

              <div className="mb-2 flex items-center justify-between">

                <label className="text-sm font-medium text-[#3E3E75]">
                  Verification Code
                </label>

                <span
                  className={`text-xs font-semibold ${
                    isExpired ? "text-red-500" : "text-gray-400"
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
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-11 text-center text-lg
                             font-semibold tracking-[0.35em] outline-none transition-all
                             focus:border-[#45A9A9] focus:bg-white
                             focus:ring-2 focus:ring-[#98E8DE]/40
                             disabled:cursor-not-allowed disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  disabled={isExpired}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-[#4E1F6E] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showCode ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>

              </div>

            </div>


            {/* Error Banner */}
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-200">
                {error}
              </div>
            )}

            {/* Info Banner */}
            {info && (
              <div className="rounded-xl bg-[#98E8DE]/20 p-3 text-xs font-medium text-[#3E3E75] border border-[#98E8DE]/40">
                {info}
              </div>
            )}

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || isExpired}
              className="w-full rounded-xl bg-[#4E1F6E] py-3.5 text-sm font-semibold text-white
                         transition-all duration-200
                         hover:-translate-y-0.5 hover:bg-[#3E3E75]
                         hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>

          </form>


          {/* Resend / Back */}
          <div className="mt-7 flex items-center justify-between text-sm">

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="font-semibold text-[#4E1F6E] hover:underline disabled:opacity-50"
            >
              {resending ? "Resending..." : "Resend code"}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="text-gray-500 hover:underline"
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
