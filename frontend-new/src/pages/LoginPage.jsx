import { useState } from "react";
import { Eye, EyeOff, BookOpen } from "lucide-react";
import { supabase } from "../services/supabase";
import { hashPasswordClient } from "../services/crypto";

function LoginPage({ onLogin, onSignUp, onForgotPassword }) {
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

      // 1. Derive the identical deterministic client hash using normalized email
      const clientHashedPassword = await hashPasswordClient(password, normalizedEmail);

      // 2. Sign in with Supabase Auth using the pre-hashed password
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: clientHashedPassword,
      });

      if (authError) {
        setError(authError.message || "Failed to sign in. Please check your credentials.");
        setLoading(false);
        return;
      }

      if (onLogin && data?.user) {
        onLogin({
          id: data.user.id,
          name: data.user.user_metadata?.full_name || normalizedEmail.split("@")[0],
          email: data.user.email,
        });
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
                <BookOpen size={24} className="text-[#4E1F6E]" />
              </div>
              <span className="text-xl font-bold">AI STUDY ENGINE</span>
            </div>

            <h1 className="max-w-md text-4xl font-bold leading-tight">
              Study smarter.
              <br />
              Learn better.
              <br />
              Achieve more.
            </h1>

            <p className="mt-6 max-w-md text-sm leading-6 text-purple-100">
              Your personalized AI-powered study companion designed to
              help you understand, practice, and prepare with confidence.
            </p>
          </div>

          <p className="text-xs text-purple-200">
            AI-powered personalized learning
          </p>
        </div>

        {/* ================= RIGHT SECTION ================= */}
        <div className="p-8 sm:p-12 lg:p-14">
          {/* Mobile Logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#98E8DE]">
              <BookOpen size={21} className="text-[#4E1F6E]" />
            </div>
            <span className="font-bold text-[#4E1F6E]">AI STUDY ENGINE</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#3E3E75]">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Sign in to continue your personalized learning journey.
            </p>
          </div>

          {/* ================= LOGIN FORM ================= */}
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

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-[#3E3E75]">
                  Password
                </label>

                {/* Forgot Password */}
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-xs font-medium text-[#4E1F6E] hover:underline"
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
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-11 text-sm
                             outline-none transition-all
                             focus:border-[#45A9A9] focus:bg-white
                             focus:ring-2 focus:ring-[#98E8DE]/40"
                />

                {/* Show / Hide Password */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-[#4E1F6E]"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 accent-[#4E1F6E]"
              />
              <span className="text-xs text-gray-500">
                Remember me
              </span>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-200">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#4E1F6E] py-3.5 text-sm font-semibold text-white
                         transition-all duration-200
                         hover:-translate-y-0.5 hover:bg-[#3E3E75]
                         hover:shadow-lg disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* ================= SIGN UP ================= */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={onSignUp}
                className="font-semibold text-[#4E1F6E] hover:underline"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;