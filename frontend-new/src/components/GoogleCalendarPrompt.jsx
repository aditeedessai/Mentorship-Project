import { useState, useEffect } from "react";
import { Calendar, X } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { getGoogleCalendarConnectUrl } from "../services/api";

/**
 * GoogleCalendarPrompt
 * --------------------
 * Optional, dismissible modal shown once after a new user completes
 * their mandatory student profile. Offers to connect Google Calendar.
 *
 * - Stored in localStorage so it only appears once per browser.
 * - "Maybe later" dismisses without connecting.
 * - "Connect Google Calendar" navigates to the backend OAuth URL.
 * - Does NOT block any application functionality.
 */
const STORAGE_KEY = "jot_gcal_prompt_dismissed";

export default function GoogleCalendarPrompt({ onDismiss }) {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);

  // If already dismissed, render nothing
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    setDismissed(true);
    onDismiss?.();
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const data = await getGoogleCalendarConnectUrl();
      if (data.auth_url) {
        // Mark as dismissed so the prompt doesn't re-appear on redirect back
        try {
          localStorage.setItem(STORAGE_KEY, "true");
        } catch {}
        window.location.href = data.auth_url;
      }
    } catch (err) {
      console.warn("Failed to get Google Calendar connect URL:", err);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className={`relative mx-4 w-full max-w-md overflow-hidden rounded-3xl border p-6 shadow-2xl transition-all sm:p-8 ${
          isDarkMode
            ? "border-white/10 bg-[#17131F] text-[#F3F0F8]"
            : "border-gray-200 bg-white text-[#231B33]"
        }`}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleDismiss}
          className={`absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg transition ${
            isDarkMode
              ? "text-white/40 hover:bg-white/10 hover:text-white"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          }`}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7]">
          <Calendar size={28} />
        </div>

        {/* Heading */}
        <h2 className="mb-2 text-xl font-black tracking-tight">
          Connect your Google Calendar?
        </h2>

        {/* Description */}
        <p
          className={`mb-6 text-sm leading-relaxed ${
            isDarkMode ? "text-white/60" : "text-gray-500"
          }`}
        >
          Sync your planner tasks and exams to Google Calendar and get
          reminders so you never miss a study session.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            onClick={handleConnect}
            disabled={loading}
            className="flex-1 cursor-pointer rounded-xl bg-[#8064C7] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#8B6DD4] disabled:opacity-50"
          >
            {loading ? "Connecting..." : "Connect Google Calendar"}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className={`flex-1 cursor-pointer rounded-xl py-3 text-sm font-bold transition ${
              isDarkMode
                ? "bg-white/10 text-white/80 hover:bg-white/20"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
