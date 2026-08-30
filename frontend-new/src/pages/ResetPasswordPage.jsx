import { useState } from "react";
import { Eye, EyeOff, Sparkles, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import { hashPasswordClient } from "../services/crypto";

function ResetPasswordPage({ onComplete }) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      // 1. Get the authenticated user from the active recovery session
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        setError("Password reset session is invalid or has expired. Please request a new link.");
        setLoading(false);
        return;
      }

      const normalizedEmail = user.email.trim().toLowerCase();

      // 2. Pre-hash the new password with the user's normalized email salt
      const clientHashedPassword = await hashPasswordClient(password, normalizedEmail);

      // 3. Update the password on Supabase
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: clientHashedPassword,
      });

      if (updateError) {
        setError(updateError.message || "Failed to update password.");
        setLoading(false);
        return;
      }

      if (onComplete) {
        onComplete(data);
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
              Set a new
              <br />
              <span className="text-purple-200">password.</span>
            </h1>

            <p className="mt-6 max-w-md text-sm leading-6 text-purple-100/90">
              Choose a strong, memorable password to secure your JOT account and continue studying.
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
            <h2 className="text-3xl font-black tracking-tight">Create a new password</h2>
            <p className={`mt-2 text-sm ${isDarkMode ? "text-white/55" : "text-[#706A78]"}`}>
              Your identity is verified. Enter a new password for your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div>
              <label className={`mb-2 block text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-white/70" : "text-[#292530]"}`}>
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter a new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`w-full rounded-xl border px-4 py-3 pr-11 text-sm outline-none transition-all ${
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
              <label className={`mb-2 block text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-white/70" : "text-[#292530]"}`}>
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`w-full rounded-xl border px-4 py-3 pr-11 text-sm outline-none transition-all ${
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

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs font-semibold text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#8064C7] py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8B6DD4] shadow-[0_15px_35px_rgba(128,100,199,0.35)] disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;