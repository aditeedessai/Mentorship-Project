import { useEffect, useState } from "react";

import {
  User,
  Palette,
  Shield,
  Trash2,
  ChevronRight,
  Camera,
  Moon,
  Sun,
  LogOut,
  Loader2,
  CheckCircle2,
  X,
  Calendar,
  GraduationCap,
  Sparkles,
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

  /* =====================================================
     STATES
  ===================================================== */

  const [isSendingResetEmail, setIsSendingResetEmail] =
    useState(false);

  const [changePasswordError, setChangePasswordError] =
    useState("");

  const [isPrivacyModalOpen, setIsPrivacyModalOpen] =
    useState(false);

  const [confirmAction, setConfirmAction] =
    useState(null);

  const [isConfirmLoading, setIsConfirmLoading] =
    useState(false);

  const [confirmError, setConfirmError] =
    useState(null);

  const [studySetsDeletedMessage, setStudySetsDeletedMessage] =
    useState("");

  const [studentProfile, setStudentProfile] =
    useState(null);

  const [profileLoading, setProfileLoading] =
    useState(true);

  const [googleCalendarConnected, setGoogleCalendarConnected] =
    useState(false);

  const [googleCalendarLoading, setGoogleCalendarLoading] =
    useState(false);

  const [googleCalendarError, setGoogleCalendarError] =
    useState("");

  const [googleCalendarSuccess, setGoogleCalendarSuccess] =
    useState("");


  /* =====================================================
     LOAD STUDENT PROFILE
  ===================================================== */

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!user?.id) {
        if (isMounted) {
          setProfileLoading(false);
        }
        return;
      }

      try {
        setProfileLoading(true);

        const { data, error } = await supabase
          .from("student_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error(
            "Failed to load student profile:",
            error
          );
          return;
        }

        if (isMounted) {
          setStudentProfile(data || null);
        }
      } catch (error) {
        console.error(
          "Unexpected error loading student profile:",
          error
        );
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);


  /* =====================================================
     GOOGLE CALENDAR STATUS
  ===================================================== */

  useEffect(() => {
    let isMounted = true;

    const loadGoogleCalendarStatus = async () => {
      if (!user?.id) return;

      try {
        const status = await getGoogleCalendarStatus();

        if (!isMounted) return;

        if (typeof status === "boolean") {
          setGoogleCalendarConnected(status);
        } else {
          setGoogleCalendarConnected(
            Boolean(
              status?.connected ??
                status?.is_connected ??
                status?.google_calendar_connected
            )
          );
        }
      } catch (error) {
        console.warn(
          "Could not load Google Calendar status:",
          error
        );
      }
    };

    loadGoogleCalendarStatus();

    return () => {
      isMounted = false;
    };
  }, [user]);


  /* =====================================================
     GOOGLE CALENDAR CALLBACK
  ===================================================== */

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const connected =
      params.get("gcal_connected");

    const calendarError =
      params.get("gcal_error");

    if (connected === "true") {
      setGoogleCalendarConnected(true);

      setGoogleCalendarSuccess(
        "Google Calendar connected successfully."
      );

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }

    if (calendarError) {
      setGoogleCalendarError(
        decodeURIComponent(calendarError)
      );

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }
  }, []);


  /* =====================================================
     CHANGE PASSWORD
  ===================================================== */

  const handleChangePasswordClick = async () => {
    if (!user?.email) {
      setChangePasswordError(
        "No email on file for this account."
      );
      return;
    }

    setChangePasswordError("");
    setIsSendingResetEmail(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          user.email
        );

      if (error) {
        setChangePasswordError(
          error.message ||
            "Failed to send verification code."
        );
        return;
      }

      onNavigate?.("change-password-otp");
    } catch (error) {
      setChangePasswordError(
        error.message ||
          "An unexpected error occurred."
      );
    } finally {
      setIsSendingResetEmail(false);
    }
  };


  /* =====================================================
     DELETE MODAL
  ===================================================== */

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
      }

      if (confirmAction === "account") {
        await deleteAccount();
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error(
        "Settings destructive action failed:",
        error
      );

      setConfirmError(
        confirmAction === "account"
          ? "Couldn't delete your account. Please try again."
          : "Couldn't delete your study sets. Please try again."
      );
    } finally {
      setIsConfirmLoading(false);
    }
  };


  /* =====================================================
     DELETE MODAL CONFIG
  ===================================================== */

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


  /* =====================================================
     GOOGLE CALENDAR CONNECT
  ===================================================== */

  const handleConnectGoogleCalendar = async () => {
    try {
      setGoogleCalendarError("");
      setGoogleCalendarSuccess("");
      setGoogleCalendarLoading(true);

      const url =
        await getGoogleCalendarConnectUrl();

      if (!url) {
        throw new Error(
          "Could not generate Google Calendar connection URL."
        );
      }

      window.location.href = url;
    } catch (error) {
      console.error(
        "Google Calendar connection failed:",
        error
      );

      setGoogleCalendarError(
        error.message ||
          "Could not connect Google Calendar."
      );

      setGoogleCalendarLoading(false);
    }
  };


  /* =====================================================
     GOOGLE CALENDAR DISCONNECT
  ===================================================== */

  const handleDisconnectGoogleCalendar = async () => {
    try {
      setGoogleCalendarError("");
      setGoogleCalendarSuccess("");
      setGoogleCalendarLoading(true);

      await disconnectGoogleCalendar();

      setGoogleCalendarConnected(false);

      setGoogleCalendarSuccess(
        "Google Calendar disconnected successfully."
      );
    } catch (error) {
      console.error(
        "Google Calendar disconnect failed:",
        error
      );

      setGoogleCalendarError(
        error.message ||
          "Could not disconnect Google Calendar."
      );
    } finally {
      setGoogleCalendarLoading(false);
    }
  };


  /* =====================================================
     EDUCATION LABEL
  ===================================================== */

  const getEducationLabel = () => {
    if (!studentProfile?.education_level) {
      return "Not provided";
    }

    const found = EDUCATION_LEVELS?.find(
      (level) =>
        level.value ===
        studentProfile.education_level
    );

    return (
      found?.label ||
      studentProfile.education_level
    );
  };


  /* =====================================================
     COMPETITIVE EXAMS
  ===================================================== */

  const getCompetitiveExams = () => {
    const exams =
      studentProfile?.competitive_exams;

    if (!exams) {
      return "None";
    }

    if (Array.isArray(exams)) {
      if (exams.length === 0) {
        return "None";
      }

      return exams.join(", ");
    }

    if (String(exams).trim() === "") {
      return "None";
    }

    return String(exams);
  };


  return (
    <div className="settings-page-enter w-full max-w-none space-y-6 pb-12">

      {/* =====================================================
          ANIMATIONS
      ===================================================== */}

      <style>{`

        @keyframes settingsPageEnter {
          from {
            opacity: 0;
            transform: translateY(14px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes settingsHeaderEnter {
          from {
            opacity: 0;
            transform: translateY(-16px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes settingsSweep {
          0% {
            transform: translateX(-120%);
            opacity: 0;
          }

          20% {
            opacity: 0.7;
          }

          50% {
            opacity: 0.25;
          }

          100% {
            transform: translateX(120%);
            opacity: 0;
          }
        }

        @keyframes jojoThinkingFloat {
          0%,
          100% {
            transform: translateY(0) rotate(-1deg);
          }

          50% {
            transform: translateY(-9px) rotate(1deg);
          }
        }

        @keyframes jojoGlowPulse {
          0%,
          100% {
            opacity: 0.35;
            transform: scale(0.92);
          }

          50% {
            opacity: 0.65;
            transform: scale(1.08);
          }
        }

        @keyframes thoughtBubble {
          0%,
          100% {
            opacity: 0;
            transform: translateY(5px) scale(0.94);
          }

          12%,
          82% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }

          92% {
            opacity: 0;
            transform: translateY(-3px) scale(0.98);
          }
        }

        @keyframes thoughtDots {
          0%,
          100% {
            opacity: 0.35;
            transform: translateY(0);
          }

          50% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }

        @keyframes settingsOrbitClockwise {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes settingsOrbitCounter {
          from {
            transform: rotate(360deg);
          }

          to {
            transform: rotate(0deg);
          }
        }

        @keyframes settingsOrbitBubble {
          0%,
          100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.35);
          }
        }

        @keyframes settingsOrbitSparkle {
          0%,
          100% {
            opacity: 0.45;
            transform: rotate(0deg) scale(0.8);
          }

          50% {
            opacity: 1;
            transform: rotate(18deg) scale(1.15);
          }
        }

        @keyframes settingsOrbitPulse {
          0%,
          100% {
            opacity: 0.45;
          }

          50% {
            opacity: 1;
          }
        }

        @keyframes settingsSectionReveal {
          from {
            opacity: 0;
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes settingsIconFloat {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-3px);
          }
        }

        @keyframes avatarEnter {
          from {
            opacity: 0;
            transform: scale(0.8);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes buttonShimmer {
          0% {
            transform: translateX(-130%);
          }

          100% {
            transform: translateX(130%);
          }
        }

        @keyframes successPop {
          0% {
            opacity: 0;
            transform: scale(0.96);
          }

          100% {
            opacity: 1;
            transform: scale(1);
          }
        }


        /* ===================================================
           PAGE
        =================================================== */

        .settings-page-enter {
          animation: settingsPageEnter 0.65s ease-out both;
        }


        /* ===================================================
           HEADER
        =================================================== */

        .settings-header-enter {
          animation:
            settingsHeaderEnter
            0.75s
            cubic-bezier(.2,.8,.2,1)
            both;
        }

        .settings-header-enter::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 38%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,0.28),
            transparent
          );
          transform: translateX(-130%);
          animation:
            settingsSweep
            4.5s
            ease-in-out
            infinite;
          pointer-events: none;
        }


        /* ===================================================
           JOJO
        =================================================== */

        .jojo-thinking {
          animation:
            jojoThinkingFloat
            3.6s
            ease-in-out
            infinite;
        }

        .jojo-glow {
          animation:
            jojoGlowPulse
            3.4s
            ease-in-out
            infinite;
        }


        /* ===================================================
           SPEECH BUBBLE
        =================================================== */

        .thought-bubble {
          animation:
            thoughtBubble
            5s
            ease-in-out
            infinite;
        }

        .thought-dot {
          animation:
            thoughtDots
            1.4s
            ease-in-out
            infinite;
        }


        /* ===================================================
           ORBITS
        =================================================== */

        .settings-orbit-clockwise {
          animation:
            settingsOrbitClockwise
            12s
            linear
            infinite;
        }

        .settings-orbit-counter {
          animation:
            settingsOrbitCounter
            8s
            linear
            infinite;
        }

        .settings-orbit-bubble {
          animation:
            settingsOrbitBubble
            2.3s
            ease-in-out
            infinite;
        }

        .settings-orbit-sparkle {
          animation:
            settingsOrbitSparkle
            2.8s
            ease-in-out
            infinite;
        }

        .settings-orbit-pulse {
          animation:
            settingsOrbitPulse
            2s
            ease-in-out
            infinite;
        }


        /* ===================================================
           SECTIONS
        =================================================== */

        .settings-section {
          animation:
            settingsSectionReveal
            0.65s
            ease-out
            both;
        }

        .settings-section:nth-child(1) {
          animation-delay: 0.08s;
        }

        .settings-section:nth-child(2) {
          animation-delay: 0.16s;
        }

        .settings-section:nth-child(3) {
          animation-delay: 0.24s;
        }

        .settings-section:nth-child(4) {
          animation-delay: 0.32s;
        }

        .settings-section:nth-child(5) {
          animation-delay: 0.40s;
        }

        .settings-icon-float {
          animation:
            settingsIconFloat
            3s
            ease-in-out
            infinite;
        }

        .settings-avatar {
          animation:
            avatarEnter
            0.7s
            cubic-bezier(.2,.8,.2,1)
            both;
        }


        /* ===================================================
           BUTTON SHIMMER
        =================================================== */

        .settings-shimmer {
          position: relative;
          overflow: hidden;
        }

        .settings-shimmer::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 35%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,0.25),
            transparent
          );
          transform: translateX(-130%);
          animation:
            buttonShimmer
            3.5s
            ease-in-out
            infinite;
          pointer-events: none;
        }


        /* ===================================================
           SUCCESS
        =================================================== */

        .settings-success {
          animation:
            successPop
            0.35s
            ease-out
            both;
        }


        /* ===================================================
           ACTIONS
        =================================================== */

        .settings-action {
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            opacity 0.25s ease;
        }

        .settings-action:hover {
          transform: translateY(-2px);
        }

        .settings-action:active {
          transform: translateY(0);
        }

        .settings-action:hover svg {
          transform: translateX(3px);
        }

        .settings-action svg {
          transition:
            transform 0.25s ease;
        }


        /* ===================================================
           MOBILE
        =================================================== */

        @media (max-width: 640px) {

          .settings-jojo-area {
            width: 270px !important;
            height: 145px !important;
          }

          .settings-jojo-wrapper {
            right: 10px !important;
            bottom: 0 !important;
          }

          .settings-orbit-center {
            right: 0 !important;
          }

          .settings-speech {
            right: 115px !important;
          }

        }


        /* ===================================================
           REDUCED MOTION
        =================================================== */

        @media (prefers-reduced-motion: reduce) {

          .settings-page-enter,
          .settings-header-enter,
          .jojo-thinking,
          .jojo-glow,
          .thought-bubble,
          .thought-dot,
          .settings-orbit-clockwise,
          .settings-orbit-counter,
          .settings-orbit-bubble,
          .settings-orbit-sparkle,
          .settings-orbit-pulse,
          .settings-section,
          .settings-icon-float,
          .settings-avatar,
          .settings-success {
            animation: none !important;
          }

          .settings-action,
          .settings-action svg {
            transition: none !important;
          }

        }

      `}</style>


      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className={`settings-header-enter relative mb-8 overflow-hidden rounded-3xl border p-5 backdrop-blur-2xl sm:p-8 ${
          isDarkMode
            ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            : "border-[#8064C7]/20 bg-gradient-to-r from-[#E5DCF8] to-[#F1EAFA] text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.06)]"
        }`}
      >

        <div className="flex min-h-[190px] flex-col items-start justify-between gap-6 sm:min-h-[205px] sm:flex-row sm:items-center">

          {/* =================================================
              TITLE
          ================================================= */}

          <div className="relative z-10 min-w-0">

            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Settings
            </h1>

            <p
              className={`mt-2 text-xs font-medium sm:text-sm ${
                isDarkMode
                  ? "text-white/50"
                  : "text-[#706A78]"
              }`}
            >
              Manage your account and application preferences.
            </p>

          </div>


          {/* =================================================
              JOJO AREA
          ================================================= */}

          <div className="settings-jojo-area relative h-[175px] w-[380px] shrink-0">


            {/* =================================================
                JOJO GLOW
            ================================================= */}

            <div
              className={`jojo-glow pointer-events-none absolute right-[20px] top-1/2 h-[175px] w-[175px] -translate-y-1/2 rounded-full blur-3xl ${
                isDarkMode
                  ? "bg-[#8064C7]/20"
                  : "bg-[#8064C7]/14"
              }`}
            />


            {/* =================================================
                OUTER STATIC ORBIT
                CENTER = SAME AS JOJO
            ================================================= */}

            <div
              className="settings-orbit-center pointer-events-none absolute right-[10px] top-1/2 h-[175px] w-[175px] -translate-y-1/2 rounded-full border border-[#8064C7]/15"
            />


            {/* =================================================
                OUTER ROTATING ORBIT
            ================================================= */}

            <div
              className="settings-orbit-center settings-orbit-clockwise pointer-events-none absolute right-[10px] top-1/2 h-[175px] w-[175px] -translate-y-1/2"
            >

              {/* TOP */}

              <span className="settings-orbit-pulse absolute left-1/2 top-[-5px] h-3 w-3 -translate-x-1/2 rounded-full bg-[#45A9A9]" />


              {/* RIGHT */}

              <span className="settings-orbit-bubble absolute right-[-5px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[#8064C7]" />


              {/* BOTTOM */}

              <span className="settings-orbit-pulse absolute bottom-[-5px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#45A9A9]" />


              {/* LEFT */}

              <span className="absolute left-[-5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#A58CDD]" />

            </div>


            {/* =================================================
                INNER STATIC ORBIT
            ================================================= */}

            <div
              className="settings-orbit-center pointer-events-none absolute right-[35px] top-1/2 h-[130px] w-[130px] -translate-y-1/2 rounded-full border border-dashed border-[#8064C7]/20"
            />


            {/* =================================================
                INNER ROTATING ORBIT
            ================================================= */}

            <div
              className="settings-orbit-center settings-orbit-counter pointer-events-none absolute right-[35px] top-1/2 h-[130px] w-[130px] -translate-y-1/2"
            >

              <Sparkles
                size={15}
                className="settings-orbit-sparkle absolute left-[-7px] top-1/2 -translate-y-1/2 text-[#8064C7]"
              />

              <span className="settings-orbit-pulse absolute right-[-4px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#45A9A9]" />

              <span className="settings-orbit-bubble absolute bottom-[-4px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#8064C7]" />

            </div>


            {/* =================================================
                JOJO — CENTERED INSIDE ORBIT
            ================================================= */}

            <div className="settings-jojo-wrapper jojo-thinking absolute bottom-[10px] right-[20px] z-20">

              <img
                src={jojoThinking}
                alt="Jojo thinking"
                className="h-[155px] w-[155px] object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.18)]"
              />

            </div>


            {/* =================================================
                SPEECH BUBBLE
                LEFT OF JOJO
            ================================================= */}

            <div className="settings-speech thought-bubble absolute right-[175px] top-[18px] z-30">

              <div className="relative w-[175px] rounded-2xl border border-[#8064C7]/15 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(70,55,110,0.12)]">

                <p className="whitespace-nowrap text-[11px] font-black leading-tight text-[#4F3A7D] sm:text-xs">
                  Need a hand? 🤔
                </p>

                <div className="mt-1 flex gap-1">

                  <span className="thought-dot h-1 w-1 rounded-full bg-[#8064C7]" />

                  <span
                    className="thought-dot h-1 w-1 rounded-full bg-[#8064C7]"
                    style={{ animationDelay: "0.15s" }}
                  />

                  <span
                    className="thought-dot h-1 w-1 rounded-full bg-[#8064C7]"
                    style={{ animationDelay: "0.3s" }}
                  />

                </div>


                {/* BUBBLE TAIL */}

                <div className="absolute right-[-7px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-45 border-r border-t border-[#8064C7]/15 bg-white" />

              </div>

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          NOTICE
      ===================================================== */}

      {notice && (
        <div className="settings-success flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">

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


      {/* =====================================================
          PROFILE
      ===================================================== */}

      <section
        className={`settings-section rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
          isDarkMode
            ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
        }`}
      >

        <div className="mb-6 flex items-center gap-3">

          <div className="settings-icon-float flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
            <User size={20} />
          </div>

          <div>

            <h2 className="font-black tracking-tight">
              Profile
            </h2>

            <p
              className={`text-xs ${
                isDarkMode
                  ? "text-white/50"
                  : "text-gray-500"
              }`}
            >
              Manage your personal information
            </p>

          </div>

        </div>


        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">

          <div className="settings-avatar relative">

            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#8064C7] text-2xl font-black text-[#F3F0F8] shadow-md">

              {user?.name?.charAt(0)?.toUpperCase() ||
                "U"}

            </div>

            <button
              type="button"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border-2 border-inherit bg-[#8064C7] text-white shadow-sm transition hover:scale-105"
              aria-label="Change profile picture"
            >
              <Camera size={14} />
            </button>

          </div>


          <div className="min-w-0 flex-1">

            <h3 className="text-lg font-black tracking-tight">
              {user?.name || "Student User"}
            </h3>

            <p
              className={`mt-0.5 break-all text-xs font-semibold ${
                isDarkMode
                  ? "text-white/60"
                  : "text-gray-500"
              }`}
            >
              {user?.email || "No email available"}
            </p>

            <p
              className={`mt-1 text-[11px] ${
                isDarkMode
                  ? "text-white/40"
                  : "text-gray-400"
              }`}
            >
              Your account information
            </p>

          </div>


          <button
            type="button"
            onClick={() =>
              onNavigate?.("student-profile")
            }
            className="settings-shimmer w-full cursor-pointer rounded-xl bg-[#8064C7] px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#8B6DD4] sm:w-auto"
          >
            Edit Profile
          </button>

        </div>

      </section>


      {/* =====================================================
          STUDENT PROFILE
      ===================================================== */}

      <section
        className={`settings-section rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
          isDarkMode
            ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
        }`}
      >

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="settings-icon-float flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
              <GraduationCap size={20} />
            </div>

            <div>

              <h2 className="font-black tracking-tight">
                Student Profile
              </h2>

              <p
                className={`text-xs ${
                  isDarkMode
                    ? "text-white/50"
                    : "text-gray-500"
                }`}
              >
                Keep your academic information up to date to personalize your learning experience.
              </p>

            </div>

          </div>


          <button
            type="button"
            onClick={() =>
              onNavigate?.("student-profile")
            }
            className="settings-shimmer cursor-pointer rounded-xl bg-[#8064C7] px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#8B6DD4]"
          >
            Edit Student Profile
          </button>

        </div>


        {profileLoading ? (

          <div className="flex items-center justify-center rounded-2xl border border-dashed border-[#8064C7]/20 p-10">

            <Loader2
              size={24}
              className="animate-spin text-[#8064C7]"
            />

          </div>

        ) : (

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

            <div
              className={`rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 ${
                isDarkMode
                  ? "border-white/8 bg-white/[0.035]"
                  : "border-gray-200/80 bg-white shadow-sm"
              }`}
            >

              <p className="text-[11px] font-black uppercase tracking-wider text-[#8064C7]">
                Education Level
              </p>

              <p className="mt-2 text-sm font-black">
                {getEducationLabel()}
              </p>

            </div>


            <div
              className={`rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 ${
                isDarkMode
                  ? "border-white/8 bg-white/[0.035]"
                  : "border-gray-200/80 bg-white shadow-sm"
              }`}
            >

              <p className="text-[11px] font-black uppercase tracking-wider text-[#8064C7]">
                Grade / Year
              </p>

              <p className="mt-2 text-sm font-black">
                {studentProfile?.grade_or_year ||
                  "Not provided"}
              </p>

            </div>


            <div
              className={`rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 ${
                isDarkMode
                  ? "border-white/8 bg-white/[0.035]"
                  : "border-gray-200/80 bg-white shadow-sm"
              }`}
            >

              <p className="text-[11px] font-black uppercase tracking-wider text-[#8064C7]">
                Field / Stream
              </p>

              <p className="mt-2 text-sm font-black">
                {studentProfile?.field_stream ||
                  "Not provided"}
              </p>

            </div>


            <div
              className={`rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 ${
                isDarkMode
                  ? "border-white/8 bg-white/[0.035]"
                  : "border-gray-200/80 bg-white shadow-sm"
              }`}
            >

              <p className="text-[11px] font-black uppercase tracking-wider text-[#8064C7]">
                Curriculum
              </p>

              <p className="mt-2 text-sm font-black">
                {studentProfile?.curriculum_type ||
                  "Not provided"}
              </p>

            </div>


            <div
              className={`rounded-2xl border p-4 md:col-span-2 transition-all duration-300 hover:-translate-y-1 ${
                isDarkMode
                  ? "border-white/8 bg-white/[0.035]"
                  : "border-gray-200/80 bg-white shadow-sm"
              }`}
            >

              <p className="text-[11px] font-black uppercase tracking-wider text-[#8064C7]">
                Competitive Exams
              </p>

              <p className="mt-2 text-sm font-black">
                {getCompetitiveExams()}
              </p>

            </div>

          </div>

        )}

      </section>


      {/* =====================================================
          APPEARANCE
      ===================================================== */}

      <section
        className={`settings-section rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
          isDarkMode
            ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
        }`}
      >

        <div className="mb-6 flex items-center gap-3">

          <div className="settings-icon-float flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
            <Palette size={20} />
          </div>

          <div>

            <h2 className="font-black tracking-tight">
              Appearance
            </h2>

            <p
              className={`text-xs ${
                isDarkMode
                  ? "text-white/50"
                  : "text-gray-500"
              }`}
            >
              Choose how Jot looks
            </p>

          </div>

        </div>


        <div
          className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${
            isDarkMode
              ? "border-white/5 bg-white/5"
              : "border-gray-200/80 bg-white"
          }`}
        >

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">

              {isDarkMode ? (
                <Moon size={19} />
              ) : (
                <Sun size={19} />
              )}

            </div>

            <div>

              <p className="text-xs font-bold">
                Dark Mode
              </p>

              <p
                className={`text-[11px] ${
                  isDarkMode
                    ? "text-white/50"
                    : "text-gray-500"
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
            className={`relative flex h-9 w-[68px] shrink-0 cursor-pointer items-center rounded-full p-1 transition-all duration-300 ${
              isDarkMode
                ? "bg-[#8064C7]"
                : "bg-gray-200"
            }`}
          >

            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#8064C7] shadow-md transition-all duration-300 ${
                isDarkMode
                  ? "translate-x-[32px]"
                  : "translate-x-0"
              }`}
            >

              {isDarkMode ? (
                <Moon size={15} />
              ) : (
                <Sun size={15} />
              )}

            </span>

          </button>

        </div>

      </section>


      {/* =====================================================
          GOOGLE CALENDAR
      ===================================================== */}

      <section
        className={`settings-section rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
          isDarkMode
            ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
        }`}
      >

        <div className="mb-5 flex items-center gap-3">

          <div className="settings-icon-float flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
            <Calendar size={20} />
          </div>

          <div>

            <h2 className="font-black tracking-tight">
              Google Calendar
            </h2>

            <p
              className={`text-xs ${
                isDarkMode
                  ? "text-white/50"
                  : "text-gray-500"
              }`}
            >
              Connect your calendar to keep your study schedule organized.
            </p>

          </div>

        </div>


        {googleCalendarSuccess && (
          <div className="settings-success mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-400">

            <CheckCircle2 size={16} />

            {googleCalendarSuccess}

          </div>
        )}


        {googleCalendarError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-400">

            <X size={16} />

            {googleCalendarError}

          </div>
        )}


        <div
          className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
            isDarkMode
              ? "border-white/5 bg-white/5"
              : "border-gray-200/80 bg-white"
          }`}
        >

          <div className="flex items-center gap-3">

            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                googleCalendarConnected
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-[#8064C7]/10 text-[#8064C7]"
              }`}
            >
              <Calendar size={18} />
            </div>

            <div>

              <p className="text-xs font-bold">
                {googleCalendarConnected
                  ? "Google Calendar Connected"
                  : "Connect Google Calendar"}
              </p>

              <p
                className={`mt-0.5 text-[11px] ${
                  isDarkMode
                    ? "text-white/50"
                    : "text-gray-500"
                }`}
              >
                {googleCalendarConnected
                  ? "Your study schedule can sync with your calendar."
                  : "Connect your calendar for easier study planning."}
              </p>

            </div>

          </div>


          {googleCalendarConnected ? (

            <button
              type="button"
              onClick={handleDisconnectGoogleCalendar}
              disabled={googleCalendarLoading}
              className="settings-action flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {googleCalendarLoading ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <X size={15} />
              )}

              Disconnect

            </button>

          ) : (

            <button
              type="button"
              onClick={handleConnectGoogleCalendar}
              disabled={googleCalendarLoading}
              className="settings-shimmer settings-action flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#8064C7] px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#8B6DD4] disabled:cursor-not-allowed disabled:opacity-60"
            >

              {googleCalendarLoading ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <Calendar size={15} />
              )}

              Connect Calendar

            </button>

          )}

        </div>

      </section>


      {/* =====================================================
          SECURITY & PRIVACY
      ===================================================== */}

      <section
        className={`settings-section rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
          isDarkMode
            ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
        }`}
      >

        <div className="mb-5 flex items-center gap-3">

          <div className="settings-icon-float flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
            <Shield size={20} />
          </div>

          <div>

            <h2 className="font-black tracking-tight">
              Security & Privacy
            </h2>

            <p
              className={`text-xs ${
                isDarkMode
                  ? "text-white/50"
                  : "text-gray-500"
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
            className="settings-action flex w-full cursor-pointer items-center justify-between py-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
          >

            <div>

              <p className="text-xs font-bold">
                Change Password
              </p>

              <p
                className={`mt-0.5 text-[11px] ${
                  isDarkMode
                    ? "text-white/50"
                    : "text-gray-500"
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
                className="opacity-40"
              />
            )}

          </button>


          {changePasswordError && (
            <p className="py-2 text-xs font-bold text-rose-400">
              {changePasswordError}
            </p>
          )}


          {/* ACTIVE SESSIONS */}

          <button
            type="button"
            className="settings-action flex w-full cursor-pointer items-center justify-between py-4 text-left"
          >

            <div>

              <p className="text-xs font-bold">
                Active Sessions
              </p>

              <p
                className={`mt-0.5 text-[11px] ${
                  isDarkMode
                    ? "text-white/50"
                    : "text-gray-500"
                }`}
              >
                Manage devices where you're signed in
              </p>

            </div>

            <ChevronRight
              size={18}
              className="opacity-40"
            />

          </button>


          {/* PRIVACY POLICY */}

          <button
            type="button"
            onClick={() =>
              setIsPrivacyModalOpen(true)
            }
            className="settings-action flex w-full cursor-pointer items-center justify-between py-4 text-left"
          >

            <div>

              <p className="text-xs font-bold">
                Privacy Policy
              </p>

              <p
                className={`mt-0.5 text-[11px] ${
                  isDarkMode
                    ? "text-white/50"
                    : "text-gray-500"
                }`}
              >
                Learn how your information is handled
              </p>

            </div>

            <ChevronRight
              size={18}
              className="opacity-40"
            />

          </button>

        </div>

      </section>


      {/* =====================================================
          DANGER ZONE
      ===================================================== */}

      <section
        className={`settings-section space-y-4 rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
          isDarkMode
            ? "border-red-500/30 bg-red-500/10"
            : "border-red-200/80 bg-red-50/30 shadow-[0_4px_25px_rgba(239,68,68,0.02)]"
        }`}
      >

        <div className="flex items-center gap-3">

          <div
            className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
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
                isDarkMode
                  ? "text-red-400"
                  : "text-red-600"
              }`}
            >
              Danger Zone
            </h2>

            <p
              className={`text-xs font-semibold ${
                isDarkMode
                  ? "text-red-300/70"
                  : "text-red-600/60"
              }`}
            >
              These actions cannot be easily undone
            </p>

          </div>

        </div>


        <div className="space-y-3 pt-2">

          {studySetsDeletedMessage && (
            <div className="settings-success flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-400">

              <CheckCircle2 size={16} />

              {studySetsDeletedMessage}

            </div>
          )}


          {/* DELETE STUDY SETS */}

          <button
            type="button"
            onClick={() =>
              openConfirm("all-study-sets")
            }
            className={`settings-action flex w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
              isDarkMode
                ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/20"
                : "border-red-200/60 bg-white/80 shadow-xs hover:bg-red-50/80"
            }`}
          >

            <div>

              <p
                className={`text-xs font-bold ${
                  isDarkMode
                    ? "text-red-400"
                    : "text-red-600"
                }`}
              >
                Delete all study sets
              </p>

              <p
                className={`mt-0.5 text-[11px] ${
                  isDarkMode
                    ? "text-red-300/70"
                    : "text-gray-500"
                }`}
              >
                Permanently remove all your study sets
              </p>

            </div>

            <Trash2
              size={17}
              className={
                isDarkMode
                  ? "text-red-400"
                  : "text-red-500"
              }
            />

          </button>


          {/* DELETE ACCOUNT */}

          <button
            type="button"
            onClick={() =>
              openConfirm("account")
            }
            className={`settings-action flex w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
              isDarkMode
                ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/20"
                : "border-red-200/60 bg-white/80 shadow-xs hover:bg-red-50/80"
            }`}
          >

            <div>

              <p
                className={`text-xs font-bold ${
                  isDarkMode
                    ? "text-red-400"
                    : "text-red-600"
                }`}
              >
                Delete account
              </p>

              <p
                className={`mt-0.5 text-[11px] ${
                  isDarkMode
                    ? "text-red-300/70"
                    : "text-gray-500"
                }`}
              >
                Permanently delete your account and data
              </p>

            </div>

            <Trash2
              size={17}
              className={
                isDarkMode
                  ? "text-red-400"
                  : "text-red-500"
              }
            />

          </button>


          {/* LOG OUT */}

          <button
            type="button"
            onClick={() =>
              supabase.auth.signOut()
            }
            className={`settings-action flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold transition ${
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


      {/* =====================================================
          DELETE MODAL
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
          PRIVACY MODAL
      ===================================================== */}

      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() =>
          setIsPrivacyModalOpen(false)
        }
      />

    </div>
  );
};

export default SettingsPage;