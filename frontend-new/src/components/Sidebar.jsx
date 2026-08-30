import {
  Home,
  Upload,
  BookOpen,
  CalendarDays,
  Settings,
  LogOut,
  Sun,
  Moon,
  X,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";

const menuItems = [
  { name: "Home", page: "dashboard", icon: Home },
  { name: "Upload", page: "upload", icon: Upload },
  { name: "Study Sets", page: "study-sets", icon: BookOpen },
  { name: "Planner", page: "planner", icon: CalendarDays },
  { name: "Settings", page: "settings", icon: Settings },
];

function Sidebar({ onNavigate, currentPage = "dashboard", user, isOpen = false, onClose }) {
  const { isDarkMode, toggleDarkMode } = useTheme();

  const handleLogout = async () => {
    try {
      if (onClose) onClose();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  };

  const handleNavClick = (page) => {
    if (onClose) onClose();
    onNavigate(page);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r transition-transform duration-300 backdrop-blur-2xl lg:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        } ${
          isDarkMode
            ? "border-white/8 bg-[#13101A]/95 text-[#F3F0F8] shadow-[0_15px_50px_rgba(0,0,0,0.30)]"
            : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_30px_rgba(0,0,0,0.03)]"
        }`}
      >
        {/* Logo & Header */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-inherit">
          <div className="flex items-center gap-2">
            <div className="text-3xl font-black tracking-[-0.08em]">
              Jot
              <span className="text-[#8064C7]">.</span>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                isDarkMode
                  ? "bg-[#8064C7]/20 text-[#A78BFA]"
                  : "bg-[#8064C7]/10 text-[#8064C7]"
              }`}
            >
              Study
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleDarkMode}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition-all duration-300 ${
                isDarkMode
                  ? "border-white/10 bg-white/10 text-yellow-300 hover:bg-white/20"
                  : "border-white/80 bg-white/80 text-purple-600 hover:bg-white shadow-sm"
              }`}
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all lg:hidden ${
                isDarkMode
                  ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
              }`}
              aria-label="Close Mobile Navigation"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;

              return (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.page)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? isDarkMode
                        ? "bg-[#8064C7]/25 text-[#A78BFA] border border-[#8064C7]/30 shadow-sm"
                        : "bg-[#8064C7]/15 text-[#8064C7] border border-[#8064C7]/20 shadow-sm"
                      : isDarkMode
                      ? "text-white/70 hover:bg-white/10 hover:text-white"
                      : "text-[#706A78] hover:bg-[#8064C7]/10 hover:text-[#292530]"
                  }`}
                >
                  <Icon
                    size={19}
                    className={`transition-transform duration-200 group-hover:scale-110 ${
                      isActive
                        ? isDarkMode
                          ? "text-[#A78BFA]"
                          : "text-[#8064C7]"
                        : "opacity-70 group-hover:opacity-100"
                    }`}
                  />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t border-inherit p-4 space-y-3">
          <div
            className={`flex items-center gap-3 rounded-2xl p-3 border backdrop-blur-xl ${
              isDarkMode
                ? "border-white/10 bg-white/5 text-white"
                : "border-white/80 bg-white/60 text-[#292530]"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8064C7] text-sm font-bold text-white shadow-md">
              {user?.name ? user.name[0].toUpperCase() : "J"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-bold">
                {user?.name || "Student User"}
              </p>
              <p
                className={`truncate text-xs ${
                  isDarkMode ? "text-white/40" : "text-gray-500"
                }`}
              >
                {user?.email || "Authenticated"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors ${
              isDarkMode
                ? "text-red-400 hover:bg-red-500/15"
                : "text-red-600 hover:bg-red-50"
            }`}
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;

