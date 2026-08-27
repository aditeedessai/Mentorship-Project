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
} from "lucide-react";

const SettingsPage = ({ user }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFA] px-6 py-8 md:px-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#3E3E75]">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account and application preferences.
        </p>
      </div>

      <div className="max-w-4xl space-y-6">
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
              className="flex w-full items-center justify-between py-4 text-left transition hover:bg-[#F8FAFA]"
            >
              <div>
                <p className="text-sm font-medium text-[#3E3E75]">
                  Change Password
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Update your account password
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
            <button
              type="button"
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
    </div>
  );
};

export default SettingsPage;