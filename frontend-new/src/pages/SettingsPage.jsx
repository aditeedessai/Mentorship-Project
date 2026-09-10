import { useState, useEffect } from "react";
import {
  User,
  Palette,
  Shield,
  Trash2,
  ChevronRight,
  Moon,
  Sun,
  LogOut,
  Loader2,
  CheckCircle2,
  X,
  Settings,
  Calendar,
  GraduationCap,
} from "lucide-react";
import { EDUCATION_LEVELS } from "../data/academicOptions";

import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import {
  deleteAccount,
  getGoogleCalendarStatus,
  getGoogleCalendarConnectUrl,
  disconnectGoogleCalendar,
} from "../services/api";

import DeleteConfirmModal from "../components/DeleteConfirmModal";
import PrivacyPolicyModal from "../components/PrivacyPolicyModal";

import jojoThinking from "../assets/jojo-thinking.png";

const SettingsPage = ({
  user,
  onNavigate,
  notice,
  onDismissNotice,
  onDeleteAllStudySets,
}) => {
  const { isDarkMode, toggleDarkMode } = useTheme();

  // =========================================================
  // STUDENT PROFILE
  // =========================================================
  const [studentProfile, setStudentProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStudentProfile = async () => {
      if (!user?.id) return;
      setLoadingProfile(true);
      try {
        const { data, error } = await supabase
          .from("student_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!error && data && isMounted) {
          setStudentProfile(data);
        }
      } catch (err) {
        console.error("Error fetching student profile in Settings:", err);
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    };

    fetchStudentProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // =========================================================
  // CHANGE PASSWORD
  // =========================================================
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");

  // =========================================================
  // PRIVACY POLICY
  // =========================================================
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // =========================================================
  // DELETE CONFIRMATION
  // =========================================================
  const [confirmAction, setConfirmAction] = useState(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState(null);
  const [studySetsDeletedMessage, setStudySetsDeletedMessage] = useState("");

  // =========================================================
  // GOOGLE CALENDAR
  // =========================================================
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalEmail, setGcalEmail] = useState(null);
  const [gcalLoading, setGcalLoading] = useState(true);
  const [gcalActionLoading, setGcalActionLoading] = useState(false);
  const [gcalError, setGcalError] = useState("");
  const [gcalSuccess, setGcalSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    getGoogleCalendarStatus()
      .then((data) => {
        if (mounted) {
          setGcalConnected(data.connected);
          setGcalEmail(data.email || null);
        }
      })
      .catch(() => {
        if (mounted) setGcalConnected(false);
      })
      .finally(() => {
        if (mounted) setGcalLoading(false);
      });

    // Check for OAuth redirect params
    const params = new URLSearchParams(window.location.search);
    if (params.get("gcal_connected") === "true") {
      setGcalSuccess("Google Calendar connected successfully!");
      setGcalConnected(true);
      // Re-fetch to get email
      getGoogleCalendarStatus()
        .then((data) => {
          if (mounted) {
            setGcalConnected(data.connected);
            setGcalEmail(data.email || null);
          }
        })
        .catch(() => {});
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("gcal_error")) {
      setGcalError("Could not connect Google Calendar. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }

    return () => {
      mounted = false;
    };
  }, []);

  const handleConnectGcal = async () => {
    setGcalActionLoading(true);
    setGcalError("");
    try {
      const data = await getGoogleCalendarConnectUrl();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (err) {
      setGcalError("Failed to start Google Calendar connection.");
      setGcalActionLoading(false);
    }
  };

  const handleDisconnectGcal = async () => {
    setGcalActionLoading(true);
    setGcalError("");
    try {
      await disconnectGoogleCalendar();
      setGcalConnected(false);
      setGcalEmail(null);
      setGcalSuccess("");
    } catch (err) {
      setGcalError("Failed to disconnect. Please try again.");
    } finally {
      setGcalActionLoading(false);
    }
  };

  // =========================================================
  // CHANGE PASSWORD
  // =========================================================
  const handleChangePasswordClick = async () => {
    if (!user?.email) {
      setChangePasswordError("No email on file for this account.");
      return;
    }

    setChangePasswordError("");
    setIsSendingResetEmail(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);

      if (error) {
        setChangePasswordError(
          error.message || "Failed to send verification code."
        );
        return;
      }

      onNavigate?.("change-password-otp");
    } catch (err) {
      setChangePasswordError(
        err.message || "An unexpected error occurred."
      );
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  // =========================================================
  // DELETE CONFIRMATION
  // =========================================================
  const openConfirm = (action) => {
    setConfirmAction(action);
    setConfirmError(null);
    setStudySetsDeletedMessage("");
  };

  const cancelConfirm = () => {
    if (isConfirmLoading) return;

    setConfirmAction(null);
    setConfirmError(null);
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;

    setIsConfirmLoading(true);
    setConfirmError(null);

    try {
      if (confirmAction === "all-study-sets") {
        await onDeleteAllStudySets();

        setConfirmAction(null);

        setStudySetsDeletedMessage(
          "All your study sets have been permanently deleted."
        );
      } else if (confirmAction === "account") {
        await deleteAccount();
        await supabase.auth.signOut();
      }
    } catch {
      setConfirmError(
        confirmAction === "account"
          ? "Couldn't delete your account. Please try again."
          : "Couldn't delete your study sets. Please try again."
      );
    } finally {
      setIsConfirmLoading(false);
    }
  };

  // =========================================================
  // DELETE MODAL CONFIG
  // =========================================================
  const confirmModalConfig =
    confirmAction === "account"
      ? {
          title: "Delete Account?",
          itemName: "your account",
          warningText:
            "This will permanently delete your account and all your data. This cannot be undone.",
          confirmText: "Delete Account",
        }
      : {
          title: "Delete All Study Sets?",
          itemName: "all your study sets",
          warningText:
            "This will permanently delete all your study sets and cannot be undone.",
          confirmText: "Delete All",
        };

  return (
    <>
      {/* =====================================================
          SETTINGS PAGE ANIMATION STYLES
      ===================================================== */}
      <style>{`
        /* -----------------------------------------------------
           PAGE INTRO
        ----------------------------------------------------- */

        @keyframes settingsPageEnter {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes settingsHeaderEnter {
          0% {
            opacity: 0;
            transform: translateY(-16px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes settingsSweep {
          0% {
            transform: translateX(-120%) rotate(8deg);
            opacity: 0;
          }
          20% {
            opacity: 0.35;
          }
          55% {
            opacity: 0.08;
          }
          100% {
            transform: translateX(180%) rotate(8deg);
            opacity: 0;
          }
        }

        /* -----------------------------------------------------
           JOJO
        ----------------------------------------------------- */

        @keyframes jojoThinkFloat {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          35% {
            transform: translateY(-7px) rotate(-1.5deg);
          }
          65% {
            transform: translateY(-3px) rotate(1deg);
          }
        }

        @keyframes jojoGlowPulse {
          0%,
          100% {
            transform: scale(0.92);
            opacity: 0.45;
          }
          50% {
            transform: scale(1.12);
            opacity: 0.75;
          }
        }

        @keyframes thoughtBubble {
          0% {
            opacity: 0;
            transform: translateY(7px) scale(0.92);
          }
          15%,
          80% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-4px) scale(0.98);
          }
        }

        @keyframes thoughtDots {
          0%,
          100% {
            opacity: 0.25;
            transform: scale(0.85);
          }
          50% {
            opacity: 0.8;
            transform: scale(1);
          }
        }

        /* -----------------------------------------------------
           SECTION ENTRANCE
        ----------------------------------------------------- */

        @keyframes settingsSectionProfile {
          from {
            opacity: 0;
            transform: translateX(-28px) rotate(-0.5deg);
          }
          to {
            opacity: 1;
            transform: translateX(0) rotate(0);
          }
        }

        @keyframes settingsSectionAppearance {
          from {
            opacity: 0;
            transform: translateY(28px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes settingsSectionSecurity {
          from {
            opacity: 0;
            transform: translateX(28px) rotate(0.5deg);
          }
          to {
            opacity: 1;
            transform: translateX(0) rotate(0);
          }
        }

        @keyframes settingsSectionDanger {
          from {
            opacity: 0;
            transform: translateY(32px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* -----------------------------------------------------
           ICONS
        ----------------------------------------------------- */

        @keyframes settingsIconReveal {
          0% {
            opacity: 0;
            transform: scale(0.65) rotate(-20deg);
          }
          70% {
            transform: scale(1.08) rotate(4deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0);
          }
        }

        @keyframes settingsIconFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        /* -----------------------------------------------------
           PROFILE AVATAR
        ----------------------------------------------------- */

        @keyframes avatarEnter {
          0% {
            opacity: 0;
            transform: scale(0.65) rotate(-8deg);
          }
          75% {
            transform: scale(1.05) rotate(2deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0);
          }
        }

        @keyframes avatarRing {
          0% {
            transform: scale(0.88);
            opacity: 0;
          }
          40% {
            opacity: 0.35;
          }
          100% {
            transform: scale(1.28);
            opacity: 0;
          }
        }

        /* -----------------------------------------------------
           THEME SWITCH
        ----------------------------------------------------- */

        @keyframes themeIconEntrance {
          from {
            opacity: 0;
            transform: rotate(-90deg) scale(0.5);
          }
          to {
            opacity: 1;
            transform: rotate(0) scale(1);
          }
        }

        @keyframes themeGlow {
          0%,
          100% {
            box-shadow: 0 0 0 rgba(128, 100, 199, 0);
          }
          50% {
            box-shadow: 0 0 22px rgba(128, 100, 199, 0.22);
          }
        }

        /* -----------------------------------------------------
           SECURITY ROW
        ----------------------------------------------------- */

        @keyframes securityLine {
          from {
            transform: scaleX(0);
            transform-origin: left;
          }
          to {
            transform: scaleX(1);
            transform-origin: left;
          }
        }

        /* -----------------------------------------------------
           SUCCESS
        ----------------------------------------------------- */

        @keyframes successPop {
          0% {
            opacity: 0;
            transform: translateY(-8px) scale(0.97);
          }
          70% {
            transform: translateY(2px) scale(1.01);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* -----------------------------------------------------
           DANGER ZONE
        ----------------------------------------------------- */

        @keyframes dangerGlow {
          0%,
          100% {
            box-shadow: 0 0 0 rgba(239, 68, 68, 0);
          }
          50% {
            box-shadow: 0 0 28px rgba(239, 68, 68, 0.06);
          }
        }

        @keyframes dangerIconPulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.06);
          }
        }

        /* -----------------------------------------------------
           BUTTONS
        ----------------------------------------------------- */

        @keyframes buttonShimmer {
          0% {
            transform: translateX(-130%);
          }
          100% {
            transform: translateX(130%);
          }
        }

        @keyframes logoutIcon {
          0% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(4px);
          }
          100% {
            transform: translateX(0);
          }
        }

        /* -----------------------------------------------------
           ANIMATION CLASSES
        ----------------------------------------------------- */

        .settings-page-enter {
          animation: settingsPageEnter 0.65s cubic-bezier(0.22, 1, 0.36, 1)
            both;
        }

        .settings-header-enter {
          position: relative;
          animation: settingsHeaderEnter 0.75s
            cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-delay: 0.04s;
        }

        .settings-header-enter::after {
          content: "";
          pointer-events: none;
          position: absolute;
          top: -40%;
          left: 0;
          width: 35%;
          height: 180%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.14),
            transparent
          );
          filter: blur(12px);
          animation: settingsSweep 2.4s ease-in-out 0.8s both;
        }

        .jojo-thinking {
          animation: jojoThinkFloat 4.8s ease-in-out infinite;
          transform-origin: center bottom;
        }

        .jojo-glow {
          animation: jojoGlowPulse 3.8s ease-in-out infinite;
        }

        .thought-bubble {
          animation: thoughtBubble 5.5s ease-in-out 0.8s infinite;
          transform-origin: left center;
        }

        .thought-dot {
          animation: thoughtDots 1.4s ease-in-out infinite;
        }

        .thought-dot:nth-child(2) {
          animation-delay: 0.18s;
        }

        .thought-dot:nth-child(3) {
          animation-delay: 0.36s;
        }

        .settings-profile-section {
          animation: settingsSectionProfile 0.75s
            cubic-bezier(0.22, 1, 0.36, 1) 0.18s both;
        }

        .settings-appearance-section {
          animation: settingsSectionAppearance 0.75s
            cubic-bezier(0.22, 1, 0.36, 1) 0.30s both;
        }

        .settings-security-section {
          animation: settingsSectionSecurity 0.75s
            cubic-bezier(0.22, 1, 0.36, 1) 0.42s both;
        }

        .settings-danger-section {
          animation: settingsSectionDanger 0.75s
            cubic-bezier(0.22, 1, 0.36, 1) 0.54s both;
          animation-fill-mode: both;
          animation-iteration-count: 1;
        }

        .settings-section-icon {
          animation: settingsIconReveal 0.7s
            cubic-bezier(0.22, 1, 0.36, 1) 0.55s both;
        }

        .settings-profile-section:hover .settings-section-icon,
        .settings-appearance-section:hover .settings-section-icon,
        .settings-security-section:hover .settings-section-icon {
          animation: settingsIconFloat 1.3s ease-in-out infinite;
        }

        .settings-avatar {
          position: relative;
          animation: avatarEnter 0.75s
            cubic-bezier(0.22, 1, 0.36, 1) 0.55s both;
        }

        .settings-avatar::after {
          content: "";
          position: absolute;
          inset: -5px;
          border: 2px solid rgba(128, 100, 199, 0.25);
          border-radius: 1rem;
          pointer-events: none;
          animation: avatarRing 2.8s ease-out 1.2s infinite;
        }

        .theme-toggle {
          animation: themeGlow 3s ease-in-out 1.2s infinite;
        }

        .theme-toggle span {
          transition:
            transform 0.45s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.3s ease;
        }

        .theme-toggle:hover span {
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
        }

        .theme-toggle:active span {
          transform: scale(0.92);
        }

        .theme-icon-animated {
          animation: themeIconEntrance 0.45s
            cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .security-action {
          position: relative;
          overflow: hidden;
          transition:
            padding-left 0.3s ease,
            opacity 0.3s ease,
            background 0.3s ease;
        }

        .security-action::before {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 1px;
          background: currentColor;
          opacity: 0.08;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.35s ease;
        }

        .security-action:hover {
          padding-left: 8px;
        }

        .security-action:hover::before {
          transform: scaleX(1);
        }

        .security-action:hover .security-arrow {
          transform: translateX(5px);
          opacity: 0.8;
        }

        .security-arrow {
          transition:
            transform 0.3s ease,
            opacity 0.3s ease;
        }

        .success-message {
          animation: successPop 0.5s
            cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .danger-section-animated {
          animation:
            settingsSectionDanger 0.75s
              cubic-bezier(0.22, 1, 0.36, 1) 0.54s both,
            dangerGlow 4s ease-in-out 1.5s infinite;
        }

        .danger-icon {
          animation: dangerIconPulse 2.8s ease-in-out 1.5s infinite;
        }

        .danger-action {
          transition:
            transform 0.3s ease,
            box-shadow 0.3s ease,
            background 0.3s ease;
        }

        .danger-action:hover {
          transform: translateX(4px);
        }

        .danger-action:hover svg {
          transform: scale(1.12) rotate(-6deg);
        }

        .danger-action svg {
          transition: transform 0.3s ease;
        }

        .create-action-button {
          position: relative;
          overflow: hidden;
        }

        .logout-button:hover svg {
          animation: logoutIcon 0.5s ease;
        }

        /* -----------------------------------------------------
           REDUCED MOTION
        ----------------------------------------------------- */

        @media (prefers-reduced-motion: reduce) {
          .settings-page-enter,
          .settings-header-enter,
          .jojo-thinking,
          .jojo-glow,
          .thought-bubble,
          .thought-dot,
          .settings-profile-section,
          .settings-appearance-section,
          .settings-security-section,
          .settings-danger-section,
          .settings-section-icon,
          .settings-avatar,
          .theme-toggle,
          .theme-icon-animated,
          .success-message,
          .danger-section-animated,
          .danger-icon {
            animation: none !important;
          }

          .settings-header-enter::after {
            display: none;
          }

          .security-action,
          .theme-toggle span,
          .danger-action {
            transition: none !important;
          }
        }
      `}</style>

      {/* =====================================================
          PAGE
      ===================================================== */}
      <div className="settings-page-enter max-w-4xl space-y-6 pb-12">
        {/* =====================================================
            1. HEADER / JOJO
        ===================================================== */}
        <div
          className={`settings-header-enter mb-8 overflow-visible rounded-3xl border p-5 backdrop-blur-2xl transition-all duration-500 sm:p-8 ${
            isDarkMode
              ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
              : "border-[#8064C7]/20 bg-gradient-to-r from-[#E5DCF8] to-[#F1EAFA] text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.06)]"
          }`}
        >
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            {/* LEFT CONTENT */}
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
                Settings
              </h1>

              <p
                className={`mt-2 text-xs font-medium sm:text-sm ${
                  isDarkMode ? "text-white/50" : "text-[#706A78]"
                }`}
              >
                Manage your account and application preferences.
              </p>
            </div>

            {/* JOJO */}
            <div className="relative flex h-[150px] w-[330px] shrink-0 items-end">
              {/* Glow */}
              <div className="jojo-glow pointer-events-none absolute bottom-0 left-8 h-28 w-28 rounded-full bg-[#8064C7]/10 blur-3xl" />

              {/* Jojo */}
              <img
                src={jojoThinking}
                alt="Jojo thinking"
                className="jojo-thinking absolute bottom-0 left-0 z-10 h-[135px] w-[135px] object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,0.13)] sm:h-[145px] sm:w-[145px]"
              />

              {/* Thought bubble */}
              <div className="thought-bubble absolute left-[145px] top-[18px] z-20">
                <div className="relative w-[175px] rounded-2xl border border-[#8064C7]/15 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(70,55,110,0.12)]">
                  <p className="whitespace-nowrap text-[11px] font-black leading-tight text-[#4F3A7D] sm:text-xs">
                    Need a hand? 🤔
                  </p>

                  {/* Tiny thinking dots */}
                  <div className="mt-1 flex items-center gap-1">
                    <span className="thought-dot h-1 w-1 rounded-full bg-[#8064C7]" />
                    <span className="thought-dot h-1 w-1 rounded-full bg-[#8064C7]" />
                    <span className="thought-dot h-1 w-1 rounded-full bg-[#8064C7]" />
                  </div>

                  {/* Bubble tail */}
                  <div className="absolute left-[-7px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-45 border-b border-l border-[#8064C7]/15 bg-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            MAIN SETTINGS CONTENT
        ===================================================== */}
        <div className="space-y-6">
          {/* NOTICE */}
          {notice && (
            <div className="success-message flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <CheckCircle2 size={18} />
                {notice}
              </div>

              <button
                type="button"
                onClick={onDismissNotice}
                className="cursor-pointer text-emerald-400 transition hover:opacity-70"
                aria-label="Dismiss notice"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* =================================================
              2. PROFILE
          ================================================= */}
          <section
            className={`settings-profile-section rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 ${
              isDarkMode
                ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
                : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
            }`}
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="settings-section-icon flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
                <User size={20} />
              </div>

              <div>
                <h2 className="font-black tracking-tight">Profile</h2>

                <p
                  className={`text-xs ${
                    isDarkMode ? "text-white/50" : "text-gray-500"
                  }`}
                >
                  Manage your personal information
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              {/* Avatar */}
              <div className="settings-avatar">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#8064C7] text-2xl font-black text-[#F3F0F8] shadow-md transition-transform duration-300 hover:scale-[1.04]">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              </div>

              {/* User information */}
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black tracking-tight">
                  {user?.name || "Student User"}
                </h3>

                <p
                  className={`mt-0.5 break-all text-xs font-semibold ${
                    isDarkMode ? "text-white/60" : "text-gray-500"
                  }`}
                >
                  {user?.email || "No email available"}
                </p>

                <p
                  className={`mt-1 text-[11px] ${
                    isDarkMode ? "text-white/40" : "text-gray-400"
                  }`}
                >
                  Your account information
                </p>
              </div>
            </div>
          </section>

          {/* =================================================
              STUDENT PROFILE
          ================================================= */}
          <section
            className={`settings-student-profile-section rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 ${
              isDarkMode
                ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
                : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
            }`}
          >
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="settings-section-icon flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
                  <GraduationCap size={20} />
                </div>

                <div>
                  <h2 className="font-black tracking-tight">Student Profile</h2>

                  <p
                    className={`text-xs ${
                      isDarkMode ? "text-white/50" : "text-gray-500"
                    }`}
                  >
                    Keep your academic information up to date to personalize your learning experience.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate && onNavigate("student-profile")}
                className="w-full cursor-pointer rounded-xl bg-[#8064C7] px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8B6DD4] hover:shadow-lg sm:w-auto"
              >
                Edit Student Profile
              </button>
            </div>

            {loadingProfile ? (
              <div className="flex items-center gap-2 py-4 text-xs font-semibold opacity-60">
                <Loader2 size={16} className="animate-spin" />
                Loading academic information...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                <div
                  className={`rounded-2xl border p-4 transition-all ${
                    isDarkMode
                      ? "border-white/5 bg-white/5"
                      : "border-gray-200/80 bg-white/70 shadow-sm"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8064C7]">
                    Education Level
                  </span>
                  <p className="mt-1 text-xs font-bold">
                    {EDUCATION_LEVELS.find(
                      (l) => l.value === studentProfile?.education_level
                    )?.label ||
                      studentProfile?.education_level ||
                      "Not specified"}
                  </p>
                </div>

                <div
                  className={`rounded-2xl border p-4 transition-all ${
                    isDarkMode
                      ? "border-white/5 bg-white/5"
                      : "border-gray-200/80 bg-white/70 shadow-sm"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8064C7]">
                    Grade / Year
                  </span>
                  <p className="mt-1 text-xs font-bold">
                    {studentProfile?.grade_or_year || "Not specified"}
                  </p>
                </div>

                <div
                  className={`rounded-2xl border p-4 transition-all ${
                    isDarkMode
                      ? "border-white/5 bg-white/5"
                      : "border-gray-200/80 bg-white/70 shadow-sm"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8064C7]">
                    Field / Stream
                  </span>
                  <p className="mt-1 text-xs font-bold">
                    {studentProfile?.field_stream || "Not specified"}
                  </p>
                </div>

                <div
                  className={`rounded-2xl border p-4 transition-all ${
                    isDarkMode
                      ? "border-white/5 bg-white/5"
                      : "border-gray-200/80 bg-white/70 shadow-sm"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8064C7]">
                    Curriculum
                  </span>
                  <p className="mt-1 text-xs font-bold">
                    {studentProfile?.curriculum_type || "Not specified"}
                  </p>
                </div>

                <div
                  className={`rounded-2xl border p-4 transition-all sm:col-span-2 ${
                    isDarkMode
                      ? "border-white/5 bg-white/5"
                      : "border-gray-200/80 bg-white/70 shadow-sm"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8064C7]">
                    Competitive Exams
                  </span>
                  <p className="mt-1 text-xs font-bold">
                    {Array.isArray(studentProfile?.competitive_exams) &&
                    studentProfile.competitive_exams.length > 0
                      ? studentProfile.competitive_exams.join(", ")
                      : "None"}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* =================================================
              3. APPEARANCE
          ================================================= */}
          <section
            className={`settings-appearance-section rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 ${
              isDarkMode
                ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
                : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
            }`}
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="settings-section-icon flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
                <Palette size={20} />
              </div>

              <div>
                <h2 className="font-black tracking-tight">Appearance</h2>

                <p
                  className={`text-xs ${
                    isDarkMode ? "text-white/50" : "text-gray-500"
                  }`}
                >
                  Choose how Jot looks
                </p>
              </div>
            </div>

            <div
              className={`flex items-center justify-between rounded-2xl border p-4 transition-all duration-300 hover:scale-[1.005] ${
                isDarkMode
                  ? "border-white/5 bg-white/5"
                  : "border-gray-200/80 bg-white"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
                  {isDarkMode ? (
                    <Moon size={19} className="theme-icon-animated" />
                  ) : (
                    <Sun size={19} className="theme-icon-animated" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold">Theme</p>

                  <p
                    className={`text-[11px] ${
                      isDarkMode ? "text-white/50" : "text-gray-500"
                    }`}
                  >
                    Switch between light and dark mode
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleDarkMode}
                aria-label="Toggle dark mode"
                className={`theme-toggle relative ml-4 flex h-9 w-[68px] shrink-0 cursor-pointer items-center rounded-full p-1 transition-all duration-300 ${
                  isDarkMode ? "bg-[#8064C7]" : "bg-gray-200"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#8064C7] shadow-md ${
                    isDarkMode ? "translate-x-[32px]" : "translate-x-0"
                  }`}
                >
                  {isDarkMode ? <Moon size={15} /> : <Sun size={15} />}
                </span>
              </button>
            </div>
          </section>

          {/* =================================================
              4. GOOGLE CALENDAR
          ================================================= */}
          <section
            className={`rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
              isDarkMode
                ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
                : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
            }`}
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
                <Calendar size={20} />
              </div>

              <div>
                <h2 className="font-black tracking-tight">Google Calendar</h2>

                <p
                  className={`text-xs ${
                    isDarkMode ? "text-white/50" : "text-gray-500"
                  }`}
                >
                  Manage your Google Calendar integration
                </p>
              </div>
            </div>

            <p
              className={`mb-4 text-xs leading-relaxed ${
                isDarkMode ? "text-white/60" : "text-gray-500"
              }`}
            >
              Connect your Google Calendar to sync your Jot planner tasks and exams
              and receive Google Calendar reminders.
            </p>

            {/* Success message */}
            {gcalSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-400">
                <CheckCircle2 size={16} />
                {gcalSuccess}
              </div>
            )}

            {/* Error message */}
            {gcalError && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-400">
                {gcalError}
              </div>
            )}

            <div
              className={`flex items-center justify-between rounded-2xl border p-4 ${
                isDarkMode
                  ? "border-white/5 bg-white/5"
                  : "border-gray-200/80 bg-white"
              }`}
            >
              {gcalLoading ? (
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Loader2 size={16} className="animate-spin text-[#8064C7]" />
                  Checking connection...
                </div>
              ) : gcalConnected ? (
                <>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                      <CheckCircle2 size={19} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold">
                        Google Calendar connected
                      </p>

                      {gcalEmail && (
                        <p
                          className={`truncate text-[11px] ${
                            isDarkMode ? "text-white/50" : "text-gray-500"
                          }`}
                        >
                          {gcalEmail}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDisconnectGcal}
                    disabled={gcalActionLoading}
                    className={`ml-4 shrink-0 cursor-pointer rounded-xl px-4 py-2 text-xs font-bold transition disabled:opacity-50 ${
                      isDarkMode
                        ? "bg-white/10 text-white/80 hover:bg-white/20"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {gcalActionLoading ? "Disconnecting..." : "Disconnect"}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
                      <Calendar size={19} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold">Not connected</p>

                      <p
                        className={`text-[11px] ${
                          isDarkMode ? "text-white/50" : "text-gray-500"
                        }`}
                      >
                        Sync tasks and exams to your calendar
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConnectGcal}
                    disabled={gcalActionLoading}
                    className="ml-4 shrink-0 cursor-pointer rounded-xl bg-[#8064C7] px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-[#8B6DD4] disabled:opacity-50"
                  >
                    {gcalActionLoading
                      ? "Connecting..."
                      : "Connect Google Calendar"}
                  </button>
                </>
              )}
            </div>
          </section>

          {/* =================================================
              5. SECURITY & PRIVACY
          ================================================= */}
          <section
            className={`settings-security-section rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 ${
              isDarkMode
                ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
                : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
            }`}
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="settings-section-icon flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
                <Shield size={20} />
              </div>

              <div>
                <h2 className="font-black tracking-tight">
                  Security & Privacy
                </h2>

                <p
                  className={`text-xs ${
                    isDarkMode ? "text-white/50" : "text-gray-500"
                  }`}
                >
                  Manage your account security
                </p>
              </div>
            </div>

            <div className="divide-y divide-inherit">
              {/* CHANGE PASSWORD */}
              <button
                type="button"
                onClick={handleChangePasswordClick}
                disabled={isSendingResetEmail}
                className="security-action flex w-full cursor-pointer items-center justify-between py-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div>
                  <p className="text-xs font-bold">Change Password</p>

                  <p
                    className={`mt-0.5 text-[11px] ${
                      isDarkMode ? "text-white/50" : "text-gray-500"
                    }`}
                  >
                    {isSendingResetEmail
                      ? "Sending verification code..."
                      : "Update your account password"}
                  </p>
                </div>

                {isSendingResetEmail ? (
                  <Loader2
                    size={18}
                    className="animate-spin text-[#8064C7]"
                  />
                ) : (
                  <ChevronRight
                    size={18}
                    className="security-arrow opacity-40"
                  />
                )}
              </button>

              {/* Password error */}
              {changePasswordError && (
                <p className="py-2 text-xs font-bold text-rose-400">
                  {changePasswordError}
                </p>
              )}

              {/* PRIVACY POLICY */}
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(true)}
                className="security-action flex w-full cursor-pointer items-center justify-between py-4 text-left"
              >
                <div>
                  <p className="text-xs font-bold">Privacy Policy</p>

                  <p
                    className={`mt-0.5 text-[11px] ${
                      isDarkMode ? "text-white/50" : "text-gray-500"
                    }`}
                  >
                    Learn how your information is handled
                  </p>
                </div>

                <ChevronRight
                  size={18}
                  className="security-arrow opacity-40"
                />
              </button>
            </div>
          </section>

          {/* =================================================
              6. DANGER ZONE
          ================================================= */}
          <section
            className={`danger-section-animated space-y-4 rounded-3xl border p-6 backdrop-blur-2xl ${
              isDarkMode
                ? "border-red-500/30 bg-red-500/10"
                : "border-red-200/80 bg-red-50/30 shadow-[0_4px_25px_rgba(239,68,68,0.02)]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`danger-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  isDarkMode
                    ? "bg-red-500/20 text-red-400"
                    : "bg-red-100/80 text-red-500"
                }`}
              >
                <Trash2 size={20} />
              </div>

              <div>
                <h2
                  className={`font-black tracking-tight ${
                    isDarkMode ? "text-red-400" : "text-red-600"
                  }`}
                >
                  Danger Zone
                </h2>

                <p
                  className={`text-xs font-semibold ${
                    isDarkMode ? "text-red-300/70" : "text-red-600/60"
                  }`}
                >
                  These actions cannot be easily undone
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {/* SUCCESS MESSAGE */}
              {studySetsDeletedMessage && (
                <div className="success-message flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-400">
                  <CheckCircle2 size={16} />
                  {studySetsDeletedMessage}
                </div>
              )}

              {/* DELETE ALL STUDY SETS */}
              <button
                type="button"
                onClick={() => openConfirm("all-study-sets")}
                className={`danger-action flex w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-left ${
                  isDarkMode
                    ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/20"
                    : "border-red-200/60 bg-white/80 shadow-xs hover:bg-red-50/80"
                }`}
              >
                <div>
                  <p
                    className={`text-xs font-bold ${
                      isDarkMode ? "text-red-400" : "text-red-600"
                    }`}
                  >
                    Delete all study sets
                  </p>

                  <p
                    className={`mt-0.5 text-[11px] ${
                      isDarkMode ? "text-red-300/70" : "text-gray-500"
                    }`}
                  >
                    Permanently remove all your study sets
                  </p>
                </div>

                <Trash2
                  size={17}
                  className={
                    isDarkMode ? "text-red-400" : "text-red-500"
                  }
                />
              </button>

              {/* DELETE ACCOUNT */}
              <button
                type="button"
                onClick={() => openConfirm("account")}
                className={`danger-action flex w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-left ${
                  isDarkMode
                    ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/20"
                    : "border-red-200/60 bg-white/80 shadow-xs hover:bg-red-50/80"
                }`}
              >
                <div>
                  <p
                    className={`text-xs font-bold ${
                      isDarkMode ? "text-red-400" : "text-red-600"
                    }`}
                  >
                    Delete account
                  </p>

                  <p
                    className={`mt-0.5 text-[11px] ${
                      isDarkMode ? "text-red-300/70" : "text-gray-500"
                    }`}
                  >
                    Permanently delete your account and data
                  </p>
                </div>

                <Trash2
                  size={17}
                  className={
                    isDarkMode ? "text-red-400" : "text-red-500"
                  }
                />
              </button>

              {/* LOG OUT */}
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                className={`logout-button flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold transition-all duration-300 hover:-translate-y-0.5 ${
                  isDarkMode
                    ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    : "border-red-200 bg-red-50/70 text-red-600 shadow-xs hover:bg-red-100/70"
                }`}
              >
                <LogOut size={17} />
                Log Out
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* =====================================================
          7. DELETE CONFIRMATION MODAL
      ===================================================== */}
      <DeleteConfirmModal
        isOpen={!!confirmAction}
        title={confirmModalConfig.title}
        itemName={confirmModalConfig.itemName}
        warningText={confirmModalConfig.warningText}
        confirmText={confirmModalConfig.confirmText}
        cancelText="Cancel"
        isLoading={isConfirmLoading}
        error={confirmError}
        onConfirm={handleConfirm}
        onCancel={cancelConfirm}
      />

      {/* =====================================================
          8. PRIVACY POLICY MODAL
      ===================================================== */}
      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </>
  );
};

export default SettingsPage;