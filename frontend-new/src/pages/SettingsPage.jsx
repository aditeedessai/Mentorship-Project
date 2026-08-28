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
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");

  // 'all-study-sets' | 'account' | null
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
        // Signing out here flips `user` to null via App.jsx's
        // onAuthStateChange listener, which already resets app state and
        // sends the user back to the landing/login screen - nothing else
        // to do on this page after this succeeds.
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
    <div className="min-h-screen bg-[#F8FAFA]">
      {/* Header Banner */}
      <div className="mb-8 flex flex-col items-start justify-between gap-6 rounded-2xl bg-[#98E8DE]/25 p-8 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-[#4E1F6E]">
            Settings
          </h1>
          <p className="mt-2 text-sm text-[#3E3E75]/70">
            Manage your account and application preferences.
          </p>
        </div>

        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white/60">
          <Settings size={44} className="text-[#4E1F6E]" />
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {notice && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#1D9E75]/30 bg-[#1D9E75]/10 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[#1D9E75]">
              <CheckCircle2 size={18} />
              {notice}
            </div>
            <button
              type="button"
              onClick={onDismissNotice}
              className="text-[#1D9E75] transition hover:opacity-70"
              aria-label="Dismiss notice"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ================= PROFILE ================= */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0E8F5]">
              <User size={20} className="text-[#4E1F6E]" />
            </div>

            <div>
              <h2 className="font-semibold text-[#3E3E75]">Profile</h2>
              <p className="text-sm text-gray-500">
                Manage your personal information
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {/* Avatar */}
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#4E1F6E] text-2xl font-semibold text-white">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <button
                type="button"
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#98E8DE] text-[#3E3E75] shadow-sm transition hover:scale-105"
              >
                <Camera size={14} />
              </button>
            </div>

            {/* User details */}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#3E3E75]">
                {user?.name || "Student User"}
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                {user?.email || "No email available"}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Your account information
              </p>
            </div>

            <button
              type="button"
              className="rounded-xl bg-[#4E1F6E] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#3E1857] hover:shadow-md"
            >
              Edit Profile
            </button>
          </div>
        </section>

        {/* ================= APPEARANCE ================= */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0E8F5]">
              <Palette size={20} className="text-[#4E1F6E]" />
            </div>

            <div>
              <h2 className="font-semibold text-[#3E3E75]">Appearance</h2>
              <p className="text-sm text-gray-500">
                Choose how AI Study Engine looks
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-[#F8FAFA] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                <Sun size={19} className="text-[#4E1F6E]" />
              </div>

              <div>
                <p className="text-sm font-medium text-[#3E3E75]">
                  Theme
                </p>
                <p className="text-xs text-gray-500">
                  Switch between light and dark mode
                </p>
              </div>
            </div>

            {/* Light / Dark Toggle */}
            <button
              type="button"
              aria-label="Toggle dark mode"
              className="relative flex h-9 w-[68px] items-center rounded-full bg-[#E6E0EA] p-1 transition-all duration-300"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md transition-all duration-300">
                <Sun size={15} className="text-[#4E1F6E]" />
              </span>

              <Moon
                size={15}
                className="absolute right-2 text-gray-500"
              />
            </button>
          </div>
        </section>

        {/* ================= SECURITY ================= */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0E8F5]">
              <Shield size={20} className="text-[#4E1F6E]" />
            </div>

            <div>
              <h2 className="font-semibold text-[#3E3E75]">
                Security & Privacy
              </h2>
              <p className="text-sm text-gray-500">
                Manage your account security
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            <button
              type="button"
              onClick={handleChangePasswordClick}
              disabled={isSendingResetEmail}
              className="flex w-full items-center justify-between py-4 text-left transition hover:bg-[#F8FAFA] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div>
                <p className="text-sm font-medium text-[#3E3E75]">
                  Change Password
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {isSendingResetEmail
                    ? "Sending verification code..."
                    : "Update your account password"}
                </p>
              </div>

              {isSendingResetEmail ? (
                <Loader2 size={18} className="animate-spin text-gray-400" />
              ) : (
                <ChevronRight size={18} className="text-gray-400" />
              )}
            </button>

            {changePasswordError && (
              <p className="py-2 text-xs font-medium text-red-500">
                {changePasswordError}
              </p>
            )}

            <button
              type="button"
              className="flex w-full items-center justify-between py-4 text-left transition hover:bg-[#F8FAFA]"
            >
              <div>
                <p className="text-sm font-medium text-[#3E3E75]">
                  Active Sessions
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Manage devices where you're signed in
                </p>
              </div>

              <ChevronRight size={18} className="text-gray-400" />
            </button>

            <button
              type="button"
              className="flex w-full items-center justify-between py-4 text-left transition hover:bg-[#F8FAFA]"
            >
              <div>
                <p className="text-sm font-medium text-[#3E3E75]">
                  Privacy
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Learn how your information is handled
                </p>
              </div>

              <ChevronRight size={18} className="text-gray-400" />
            </button>

            <button
              type="button"
              className="flex w-full items-center justify-between py-4 text-left transition hover:bg-[#F8FAFA]"
            >
              <div>
                <p className="text-sm font-medium text-[#3E3E75]">
                  Sign out of all devices
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  End all active sessions
                </p>
              </div>

              <ChevronRight size={18} className="text-gray-400" />
            </button>
          </div>
        </section>

        {/* ================= DANGER ZONE ================= */}
        <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <Trash2 size={20} className="text-red-500" />
            </div>

            <div>
              <h2 className="font-semibold text-red-600">Danger Zone</h2>
              <p className="text-sm text-gray-500">
                These actions cannot be easily undone
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {studySetsDeletedMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-[#1D9E75]/30 bg-[#1D9E75]/10 px-4 py-3 text-sm font-medium text-[#1D9E75]">
                <CheckCircle2 size={16} />
                {studySetsDeletedMessage}
              </div>
            )}

            <button
              type="button"
              onClick={() => openConfirm("all-study-sets")}
              className="flex w-full items-center justify-between rounded-xl border border-red-100 px-4 py-3 text-left transition hover:bg-red-50"
            >
              <div>
                <p className="text-sm font-medium text-red-600">
                  Delete all study sets
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Permanently remove all your study sets
                </p>
              </div>

              <Trash2 size={17} className="text-red-400" />
            </button>

            <button
              type="button"
              onClick={() => openConfirm("account")}
              className="flex w-full items-center justify-between rounded-xl border border-red-100 px-4 py-3 text-left transition hover:bg-red-50"
            >
              <div>
                <p className="text-sm font-medium text-red-600">
                  Delete account
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Permanently delete your account and data
                </p>
              </div>

              <Trash2 size={17} className="text-red-400" />
            </button>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
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
