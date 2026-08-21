import { useState } from "react";
import { Eye, EyeOff, BookOpen } from "lucide-react";
import { supabase } from "../services/supabase";

function SignUpPage({ onSignUp, onLogin }) {
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
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
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

      if (onSignUp && data?.user) {
        onSignUp({
          id: data.user.id,
          name,
          dob,
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
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFA] px-6 py-8">

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
              Your learning journey
              <br />
              starts here.
            </h1>


            <p className="mt-6 max-w-md text-sm leading-6 text-purple-100">
              Create your personalized student profile and let AI Study
              Engine help you learn smarter, practice better, and prepare
              with confidence.
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
              Create your account
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Set up your profile to start your personalized learning journey.
            </p>

          </div>


          {/* ================= SIGN UP FORM ================= */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full Name */}
            <div>

              <label className="mb-2 block text-sm font-medium text-[#3E3E75]">
                Full Name
              </label>

              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm
                           outline-none transition-all
                           focus:border-[#45A9A9] focus:bg-white
                           focus:ring-2 focus:ring-[#98E8DE]/40"
              />

            </div>


            {/* Date of Birth */}
            <div>

              <label className="mb-2 block text-sm font-medium text-[#3E3E75]">
                Date of Birth
              </label>

              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm
                           text-gray-600 outline-none transition-all
                           focus:border-[#45A9A9] focus:bg-white
                           focus:ring-2 focus:ring-[#98E8DE]/40"
              />

            </div>


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

              <label className="mb-2 block text-sm font-medium text-[#3E3E75]">
                Password
              </label>

              <div className="relative">

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
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
                Confirm Password
              </label>

              <div className="relative">

                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
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


            {/* Error Message */}
            {error && (
              <p className="text-sm font-medium text-red-500">
                {error}
              </p>
            )}


            {/* Terms */}
            <div className="flex items-start gap-2 pt-1">

              <input
                type="checkbox"
                required
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#4E1F6E]"
              />

              <p className="text-xs leading-5 text-gray-500">
                I agree to the Terms of Service and Privacy Policy.
              </p>

            </div>


            {/* Create Account */}
            <button
              type="submit"
              className="w-full rounded-xl bg-[#4E1F6E] py-3.5 text-sm font-semibold text-white
                         transition-all duration-200
                         hover:-translate-y-0.5 hover:bg-[#3E3E75]
                         hover:shadow-lg"
            >
              Create Account
            </button>

          </form>


          {/* Login */}
          <div className="mt-7 text-center">

            <p className="text-sm text-gray-500">

              Already have an account?{" "}

              <button
                type="button"
                onClick={onLogin}
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

export default SignUpPage;