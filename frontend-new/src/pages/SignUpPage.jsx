import { useState } from "react";
import { Eye, EyeOff, Sparkles, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import { hashPasswordClient } from "../services/crypto";

function SignUpPage({ onSignUpSuccess, onLogin, onBack }) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // 1. Derive deterministic client-side hash using the normalized email as salt
      const clientHashedPassword = await hashPasswordClient(password, normalizedEmail);

      // 2. Submit the hashed password to Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
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
        setError(authError.message || "Failed to create account.");
        setLoading(false);
        return;
      }

      if (onSignUpSuccess && data?.user) {
        onSignUpSuccess(data.user.email);
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`relative flex min-h-screen items-center justify-center p-4 sm:p-6 transition-colors duration-500 font-sans ${
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
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
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

      {/* Main Glass Card */}
      <div
        className={`grid w-full max-w-5xl overflow-hidden rounded-[24px] sm:rounded-[32px] border backdrop-blur-2xl transition-all duration-500 shadow-2xl lg:grid-cols-2 mt-12 sm:mt-0 ${
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
              Your study journey
              <br />
              <span className="text-purple-200">starts here.</span>
            </h1>

            <p className="mt-6 max-w-md text-sm leading-6 text-purple-100/90">
              Create your profile and let Jojo turn your notes into smart summaries, practice quizzes, and interactive flashcards.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-xs font-semibold text-purple-200">
            <Sparkles size={16} />
            <span>Jot it. Organise it. Top it.</span>
          </div>
        </div>

        {/* ================= RIGHT SECTION ================= */}
        <div className="p-6 sm:p-12 lg:p-14">
          {/* Mobile Brand */}

          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="text-3xl font-black tracking-[-0.08em]">
              Jot<span className="text-[#8064C7]">.</span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-3xl font-black tracking-tight">Create your account</h2>
            <p className={`mt-2 text-sm ${isDarkMode ? "text-white/55" : "text-[#706A78]"}`}>
              Set up your profile to start studying without the chaos.
            </p>
          </div>

          {/* ================= SIGN UP FORM ================= */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-white/70" : "text-[#292530]"}`}>
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all ${
                  isDarkMode
                    ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7] focus:bg-white/10"
                    : "border-gray-200 bg-white/80 text-[#292530] placeholder:text-gray-400 focus:border-[#8064C7] focus:bg-white"
                }`}
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-white/70" : "text-[#292530]"}`}>
                Date of Birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all ${
                  isDarkMode
                    ? "border-white/10 bg-white/5 text-white focus:border-[#8064C7] focus:bg-white/10"
                    : "border-gray-200 bg-white/80 text-[#292530] focus:border-[#8064C7] focus:bg-white"
                }`}
              />
            </div>

            {/* Email */}
            <div>
              <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-white/70" : "text-[#292530]"}`}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all ${
                  isDarkMode
                    ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7] focus:bg-white/10"
                    : "border-gray-200 bg-white/80 text-[#292530] placeholder:text-gray-400 focus:border-[#8064C7] focus:bg-white"
                }`}
              />
            </div>

            {/* Password */}
            <div>
              <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-white/70" : "text-[#292530]"}`}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`w-full rounded-xl border px-4 py-2.5 pr-11 text-sm outline-none transition-all ${
                    isDarkMode
                      ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7] focus:bg-white/10"
                      : "border-gray-200 bg-white/80 text-[#292530] placeholder:text-gray-400 focus:border-[#8064C7] focus:bg-white"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                    isDarkMode ? "text-white/40 hover:text-white" : "text-gray-400 hover:text-[#292530]"
                  }`}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-white/70" : "text-[#292530]"}`}>
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`w-full rounded-xl border px-4 py-2.5 pr-11 text-sm outline-none transition-all ${
                    isDarkMode
                      ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7] focus:bg-white/10"
                      : "border-gray-200 bg-white/80 text-[#292530] placeholder:text-gray-400 focus:border-[#8064C7] focus:bg-white"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                    isDarkMode ? "text-white/40 hover:text-white" : "text-gray-400 hover:text-[#292530]"
                  }`}
                >
                  {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-400">
                {error}
              </div>
            )}

            {/* Terms */}
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                required
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#8064C7]"
              />
              <p className={`text-xs ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>
                I agree to the Terms of Service and Privacy Policy.
              </p>
            </div>

            {/* Create Account */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#8064C7] py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8B6DD4] shadow-[0_15px_35px_rgba(128,100,199,0.35)] disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Create Account →"}
            </button>
          </form>

          {/* Login */}
          <div className="mt-6 text-center">
            <p className={`text-sm ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={onLogin}
                className="font-bold text-[#8064C7] hover:underline"
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

export default SignUpPage;