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
  Settings,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import { deleteAccount } from "../services/api";
import DeleteConfirmModal from "../components/DeleteConfirmModal";

const SettingsPage = ({
  user,
  onNavigate,
  notice,
  onDismissNotice,
  onDeleteAllStudySets,
}) => {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");

  const [confirmAction, setConfirmAction] = useState(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState(null);
  const [studySetsDeletedMessage, setStudySetsDeletedMessage] = useState("");

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
        setChangePasswordError(error.message || "Failed to send verification code.");
        return;
      }

      onNavigate?.("change-password-otp");
    } catch (err) {
      setChangePasswordError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSendingResetEmail(false);
    }
  };

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
        setStudySetsDeletedMessage("All your study sets have been permanently deleted.");
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
      {/* Header Banner */}
      <div className={`mb-8 flex flex-col items-start justify-between gap-6 rounded-3xl border p-8 sm:flex-row sm:items-center backdrop-blur-2xl ${
        isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          : "border-[#8064C7]/20 bg-gradient-to-r from-[#E5DCF8] to-[#F1EAFA] text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.06)]"
      }`}>
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
            Settings
          </h1>
          <p className={`mt-2 text-sm ${isDarkMode ? "text-white/50" : "text-[#706A78]"}`}>
            Manage your account and application preferences.
          </p>
        </div>

        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
          <Settings size={40} />
        </div>
      </div>

      <div className="space-y-6">
        {notice && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <CheckCircle2 size={18} />
              {notice}
            </div>
            <button
              type="button"
              onClick={onDismissNotice}
              className="text-emerald-400 transition hover:opacity-70 cursor-pointer"
              aria-label="Dismiss notice"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* PROFILE */}
        <section className={`rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
          isDarkMode
            ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            : "border-[#8064C7]/15 bg-[#F0ECF8]/95 text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.05)]"
        }`}>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
              <User size={20} />
            </div>

            <div>
              <h2 className="font-black tracking-tight">Profile</h2>
              <p className={`text-xs ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                Manage your personal information
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#8064C7] text-2xl font-black text-white shadow-md">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <button
                type="button"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl border-2 border-inherit bg-[#8064C7] text-white shadow-sm transition hover:scale-105"
              >
                <Camera size={14} />
              </button>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-black tracking-tight">
                {user?.name || "Student User"}
              </h3>

              <p className={`mt-0.5 text-xs font-semibold ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>
                {user?.email || "No email available"}
              </p>

              <p className={`mt-1 text-[11px] ${isDarkMode ? "text-white/40" : "text-gray-400"}`}>
                Your account information
              </p>
            </div>

            <button
              type="button"
              className="rounded-xl bg-[#8064C7] hover:bg-[#8B6DD4] px-5 py-2.5 text-xs font-bold text-white transition shadow-md cursor-pointer"
            >
              Edit Profile
            </button>
          </div>
        </section>

        {/* APPEARANCE */}
        <section className={`rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
          isDarkMode
            ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            : "border-[#8064C7]/15 bg-[#F0ECF8]/95 text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.05)]"
        }`}>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
              <Palette size={20} />
            </div>

            <div>
              <h2 className="font-black tracking-tight">Appearance</h2>
              <p className={`text-xs ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                Choose how Jot looks
              </p>
            </div>
          </div>

          <div className={`flex items-center justify-between rounded-2xl p-4 border ${
            isDarkMode ? "border-white/5 bg-white/5" : "border-gray-200/80 bg-white"
          }`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
                {isDarkMode ? <Moon size={19} /> : <Sun size={19} />}
              </div>

              <div>
                <p className="text-xs font-bold">
                  Theme
                </p>
                <p className={`text-[11px] ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                  Switch between light and dark mode
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className={`relative flex h-9 w-[68px] items-center rounded-full p-1 transition-all duration-300 cursor-pointer ${
                isDarkMode ? "bg-[#8064C7]" : "bg-gray-200"
              }`}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#8064C7] shadow-md transition-all duration-300 ${
                isDarkMode ? "translate-x-[32px]" : "translate-x-0"
              }`}>
                {isDarkMode ? <Moon size={15} /> : <Sun size={15} />}
              </span>
            </button>
          </div>
        </section>

        {/* SECURITY */}
        <section className={`rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-300 ${
          isDarkMode
            ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            : "border-[#8064C7]/15 bg-[#F0ECF8]/95 text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.05)]"
        }`}>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
              <Shield size={20} />
            </div>

            <div>
              <h2 className="font-black tracking-tight">
                Security & Privacy
              </h2>
              <p className={`text-xs ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                Manage your account security
              </p>
            </div>
          </div>

          <div className="divide-y divide-inherit">
            <button
              type="button"
              onClick={handleChangePasswordClick}
              disabled={isSendingResetEmail}
              className="flex w-full items-center justify-between py-4 text-left transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold">
                  Change Password
                </p>
                <p className={`mt-0.5 text-[11px] ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                  {isSendingResetEmail
                    ? "Sending verification code..."
                    : "Update your account password"}
                </p>
              </div>

              {isSendingResetEmail ? (
                <Loader2 size={18} className="animate-spin text-[#8064C7]" />
              ) : (
                <ChevronRight size={18} className="opacity-40" />
              )}
            </button>

            {changePasswordError && (
              <p className="py-2 text-xs font-bold text-rose-400">
                {changePasswordError}
              </p>
            )}

            <button
              type="button"
              className="flex w-full items-center justify-between py-4 text-left transition hover:opacity-80 cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold">
                  Active Sessions
                </p>
                <p className={`mt-0.5 text-[11px] ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                  Manage devices where you're signed in
                </p>
              </div>

              <ChevronRight size={18} className="opacity-40" />
            </button>

            <button
              type="button"
              className="flex w-full items-center justify-between py-4 text-left transition hover:opacity-80 cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold">
                  Privacy Policy
                </p>
                <p className={`mt-0.5 text-[11px] ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                  Learn how your information is handled
                </p>
              </div>

              <ChevronRight size={18} className="opacity-40" />
            </button>
          </div>
        </section>

        {/* DANGER ZONE */}
        <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 backdrop-blur-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/20 text-red-400">
              <Trash2 size={20} />
            </div>

            <div>
              <h2 className="font-black text-red-400 tracking-tight">Danger Zone</h2>
              <p className="text-xs text-red-300/70 font-semibold">
                These actions cannot be easily undone
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {studySetsDeletedMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-400">
                <CheckCircle2 size={16} />
                {studySetsDeletedMessage}
              </div>
            )}

            <button
              type="button"
              onClick={() => openConfirm("all-study-sets")}
              className="flex w-full items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-left transition hover:bg-red-500/20 cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold text-red-400">
                  Delete all study sets
                </p>
                <p className="mt-0.5 text-[11px] text-red-300/70">
                  Permanently remove all your study sets
                </p>
              </div>

              <Trash2 size={17} className="text-red-400" />
            </button>

            <button
              type="button"
              onClick={() => openConfirm("account")}
              className="flex w-full items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-left transition hover:bg-red-500/20 cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold text-red-400">
                  Delete account
                </p>
                <p className="mt-0.5 text-[11px] text-red-300/70">
                  Permanently delete your account and data
                </p>
              </div>

              <Trash2 size={17} className="text-red-400" />
            </button>

            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-400 transition hover:bg-red-500/20 cursor-pointer"
            >
              <LogOut size={17} />
              Log Out
            </button>
          </div>
        </section>
      </div>

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
    </div>
  );
};

export default SettingsPage;

