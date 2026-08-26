import { useState } from "react";
import { BookOpen } from "lucide-react";
import { supabase } from "../services/supabase";

function ForgotPasswordPage({ onCodeSent, onBack }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email
      );

      if (resetError) {
        setError(resetError.message || "Failed to send reset code.");
        setLoading(false);
        return;
      }

      if (onCodeSent) {
        onCodeSent(email);
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
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
              Forgot your
              <br />
              password?
            </h1>


            <p className="mt-6 max-w-md text-sm leading-6 text-purple-100">
              No worries. Enter your email and we'll send you a code to
              reset it and get you back to studying.
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
              Reset your password
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Enter your email address and we'll send you a verification code.
            </p>

          </div>


          {/* ================= FORM ================= */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>

              <label className="mb-2 block text-sm font-medium text-[#3E3E75]">
                Email Address
              </label>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm
                           outline-none transition-all
                           focus:border-[#45A9A9] focus:bg-white
                           focus:ring-2 focus:ring-[#98E8DE]/40"
              />

            </div>


            {/* Error Banner */}
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-200">
                {error}
              </div>
            )}

            {/* Send Code */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#4E1F6E] py-3.5 text-sm font-semibold text-white
                         transition-all duration-200
                         hover:-translate-y-0.5 hover:bg-[#3E3E75]
                         hover:shadow-lg disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Code"}
            </button>

          </form>


          {/* Back to Login */}
          <div className="mt-7 text-center">

            <p className="text-sm text-gray-500">

              Remembered your password?{" "}

              <button
                type="button"
                onClick={onBack}
                className="font-semibold text-[#4E1F6E] hover:underline"
              >
                Login
              </button>

            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

export default ForgotPasswordPage;
