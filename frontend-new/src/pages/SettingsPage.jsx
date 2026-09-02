import { useState } from "react";
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
} from "lucide-react";

import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import { deleteAccount } from "../services/api";

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
  // CHANGE PASSWORD
  // =========================================================
  const [isSendingResetEmail, setIsSendingResetEmail] =
    useState(false);

  const [changePasswordError, setChangePasswordError] =
    useState("");

  // =========================================================
  // PRIVACY POLICY
  // =========================================================
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] =
    useState(false);

  // =========================================================
  // DELETE CONFIRMATION
  // =========================================================
  const [confirmAction, setConfirmAction] = useState(null);

  const [isConfirmLoading, setIsConfirmLoading] =
    useState(false);

  const [confirmError, setConfirmError] = useState(null);

  const [studySetsDeletedMessage, setStudySetsDeletedMessage] =
    useState("");

  // =========================================================
  // CHANGE PASSWORD
  // =========================================================
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
        await supabase.auth.resetPasswordForEmail(user.email);

      if (error) {
        setChangePasswordError(
          error.message ||
            "Failed to send verification code."
        );
        return;
      }

      onNavigate?.("change-password-otp");
    } catch (err) {
      setChangePasswordError(
        err.message ||
          "An unexpected error occurred."
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
    <div className="max-w-4xl space-y-6 pb-12 transition-all duration-300">

      {/* =====================================================
          HEADER
      ===================================================== */}
      <div
        className={`mb-8 overflow-visible rounded-3xl border p-5 backdrop-blur-2xl transition-all duration-500 sm:p-8 ${
          isDarkMode
            ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            : "border-[#8064C7]/20 bg-gradient-to-r from-[#E5DCF8] to-[#F1EAFA] text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.06)]"
        }`}
      >
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">

          {/* LEFT CONTENT */}
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
              Settings
            </h1>

            <p
              className={`mt-2 text-xs sm:text-sm ${
                isDarkMode
                  ? "text-white/50"
                  : "text-[#706A78]"
              }`}
            >
              Manage your account and application preferences.
            </p>
          </div>

          {/* =================================================
              JOJO + SPEECH BUBBLE
          ================================================= */}
          <div className="relative flex h-[150px] w-[330px] shrink-0 items-end">

            {/* Soft glow */}
            <div className="pointer-events-none absolute bottom-1 left-[50px] h-28 w-28 rounded-full bg-[#8064C7]/10 blur-3xl" />

            {/* Jojo */}
            <img
              src={jojoThinking}
              alt="Jojo thinking"
              className="absolute bottom-0 left-0 z-10 h-[145px] w-[145px] object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,0.14)]"
            />

            {/* Speech bubble */}
            <div className="absolute left-[145px] top-[28px] z-20">
              <div className="relative w-[175px] rounded-2xl border border-[#8064C7]/15 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(70,55,110,0.12)]">
                <p className="whitespace-nowrap text-[11px] font-black leading-tight text-[#4F3A7D] sm:text-xs">
                  Need a hand? 🤔
                </p>

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

        {/* =====================================================
            NOTICE
        ===================================================== */}
        {notice && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
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
          className={`rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
            isDarkMode
              ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
              : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
          }`}
        >
          <div className="mb-6 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
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

            {/* Avatar */}
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#8064C7] text-2xl font-black text-[#F3F0F8] shadow-md">
                {user?.name?.charAt(0)?.toUpperCase() ||
                  "U"}
              </div>

              <button
                type="button"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl border-2 border-inherit bg-[#8064C7] text-white shadow-sm transition hover:scale-105"
                aria-label="Change profile picture"
              >
                <Camera size={14} />
              </button>
            </div>

            {/* User information */}
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

            {/* Edit Profile */}
            <button
              type="button"
              className="w-full cursor-pointer rounded-xl bg-[#8064C7] px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#8B6DD4] sm:w-auto"
            >
              Edit Profile
            </button>
          </div>
        </section>

        {/* =====================================================
            APPEARANCE
        ===================================================== */}
        <section
          className={`rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
            isDarkMode
              ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
              : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
          }`}
        >
          <div className="mb-6 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
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
            className={`flex items-center justify-between rounded-2xl border p-4 ${
              isDarkMode
                ? "border-white/5 bg-white/5"
                : "border-gray-200/80 bg-white"
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
                {isDarkMode ? (
                  <Moon size={19} />
                ) : (
                  <Sun size={19} />
                )}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold">
                  Theme
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
              className={`relative ml-4 flex h-9 w-[68px] shrink-0 cursor-pointer items-center rounded-full p-1 transition-all duration-300 ${
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
            SECURITY & PRIVACY
        ===================================================== */}
        <section
          className={`rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
            isDarkMode
              ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
              : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
          }`}
        >
          <div className="mb-5 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
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
              className="flex w-full cursor-pointer items-center justify-between py-4 text-left transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
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

            {/* Password error */}
            {changePasswordError && (
              <p className="py-2 text-xs font-bold text-rose-400">
                {changePasswordError}
              </p>
            )}

            {/* ACTIVE SESSIONS */}
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between py-4 text-left transition hover:opacity-80"
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
              onClick={() => setIsPrivacyModalOpen(true)}
              className="flex w-full cursor-pointer items-center justify-between py-4 text-left transition hover:opacity-80"
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
          className={`space-y-4 rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
            isDarkMode
              ? "border-red-500/30 bg-red-500/10"
              : "border-red-200/80 bg-red-50/30 shadow-[0_4px_25px_rgba(239,68,68,0.02)]"
          }`}
        >
          <div className="flex items-center gap-3">

            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
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

            {/* DELETED MESSAGE */}
            {studySetsDeletedMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-400">
                <CheckCircle2 size={16} />
                {studySetsDeletedMessage}
              </div>
            )}

            {/* DELETE ALL STUDY SETS */}
            <button
              type="button"
              onClick={() =>
                openConfirm("all-study-sets")
              }
              className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
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
              onClick={() => openConfirm("account")}
              className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
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
              onClick={() => supabase.auth.signOut()}
              className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold transition ${
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

      {/* =====================================================
          DELETE CONFIRMATION MODAL
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
          PRIVACY POLICY MODAL
      ===================================================== */}
      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
};

export default SettingsPage;