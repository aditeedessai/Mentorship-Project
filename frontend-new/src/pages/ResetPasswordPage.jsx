import { useState } from "react";
import { Eye, EyeOff, BookOpen } from "lucide-react";
import { supabase } from "../services/supabase";

function ResetPasswordPage({ onComplete }) {
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
      const { data, error: updateError } = await supabase.auth.updateUser({
        password,
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
              Set a new
              <br />
              password.
            </h1>


            <p className="mt-6 max-w-md text-sm leading-6 text-purple-100">
              Choose a strong, new password to keep your account secure.
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
              Create a new password
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Your identity is verified. Set a new password for your account.
            </p>

          </div>


          {/* ================= FORM ================= */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* New Password */}
            <div>

              <label className="mb-2 block text-sm font-medium text-[#3E3E75]">
                New Password
              </label>

              <div className="relative">

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter a new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-11 text-sm
                             outline-none transition-all
                             focus:border-[#45A9A9] focus:bg-white
                             focus:ring-2 focus:ring-[#98E8DE]/40"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-[#4E1F6E]"
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>

              </div>

            </div>


            {/* Confirm Password */}
            <div>

              <label className="mb-2 block text-sm font-medium text-[#3E3E75]">
                Confirm New Password
              </label>

              <div className="relative">

                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-11 text-sm
                             outline-none transition-all
                             focus:border-[#45A9A9] focus:bg-white
                             focus:ring-2 focus:ring-[#98E8DE]/40"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-[#4E1F6E]"
                >
                  {showConfirmPassword ? (
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#4E1F6E] py-3.5 text-sm font-semibold text-white
                         transition-all duration-200
                         hover:-translate-y-0.5 hover:bg-[#3E3E75]
                         hover:shadow-lg disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>

          </form>

        </div>

      </div>

    </div>
  );
}

export default ResetPasswordPage;
