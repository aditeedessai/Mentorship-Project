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

/* =========================================================
   SIDEBAR ANIMATIONS
   Existing colours are preserved.
========================================================= */

const sidebarAnimationStyles = `
  /* =======================================================
     SIDEBAR ITEM ENTRANCE
  ======================================================= */

  @keyframes sidebarItemEnter {
    0% {
      opacity: 0;
      transform: translateX(-24px);
    }

    70% {
      opacity: 1;
      transform: translateX(3px);
    }

    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* =======================================================
     LOGO ENTRANCE
  ======================================================= */

  @keyframes logoEnter {
    0% {
      opacity: 0;
      transform: translateY(-10px) scale(0.94);
    }

    70% {
      opacity: 1;
      transform: translateY(2px) scale(1.02);
    }

    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* =======================================================
     ACTIVE INDICATOR
  ======================================================= */

  @keyframes activeIndicator {
    0% {
      height: 0;
      opacity: 0;
    }

    100% {
      height: 55%;
      opacity: 1;
    }
  }

  /* =======================================================
     ACTIVE ICON
  ======================================================= */

  @keyframes activeIconFloat {
    0%,
    100% {
      transform: translateY(0);
    }

    50% {
      transform: translateY(-2px);
    }
  }

  /* =======================================================
     THEME ICON
  ======================================================= */

  @keyframes themeIconIn {
    0% {
      opacity: 0;
      transform: rotate(-90deg) scale(0.5);
    }

    100% {
      opacity: 1;
      transform: rotate(0deg) scale(1);
    }
  }

  /* =======================================================
     AVATAR
  ======================================================= */

  @keyframes avatarPulse {
    0%,
    100% {
      box-shadow:
        0 0 0 0 rgba(128, 100, 199, 0);
    }

    50% {
      box-shadow:
        0 0 0 5px rgba(128, 100, 199, 0.10);
    }
  }

  /* =======================================================
     NAV ITEM
  ======================================================= */

  .sidebar-nav-item {
    position: relative;
    overflow: hidden;

    transform: translateZ(0);

    transition:
      transform 300ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 300ms ease;
  }

  .sidebar-nav-item:hover {
    transform: translateX(5px);
  }

  /* Moving hover shine */
  .sidebar-nav-item::after {
    content: "";

    position: absolute;
    top: 0;
    left: -100%;

    width: 55%;
    height: 100%;

    transform: skewX(-20deg);

    background: rgba(255, 255, 255, 0.08);

    pointer-events: none;
  }

  .sidebar-nav-item:hover::after {
    animation: sidebarShine 650ms ease;
  }

  @keyframes sidebarShine {
    0% {
      left: -100%;
    }

    100% {
      left: 150%;
    }
  }

  /* =======================================================
     ICON
  ======================================================= */

  .sidebar-nav-icon {
    transition:
      transform 350ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 250ms ease;
  }

  .sidebar-nav-item:hover .sidebar-nav-icon {
    transform: scale(1.12) rotate(-4deg);
  }

  .sidebar-nav-item:active .sidebar-nav-icon {
    transform: scale(0.9);
  }

  /* =======================================================
     ACTIVE ITEM INDICATOR
  ======================================================= */

  .sidebar-active-indicator {
    position: absolute;

    left: 0;
    top: 50%;

    width: 3px;

    transform: translateY(-50%);

    border-radius: 999px;

    animation: activeIndicator 450ms
      cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  /* =======================================================
     ACTIVE ICON ANIMATION
  ======================================================= */

  .sidebar-active-icon {
    animation: activeIconFloat 2.8s ease-in-out infinite;
  }

  /* =======================================================
     THEME BUTTON
  ======================================================= */

  .sidebar-theme-button {
    transition:
      transform 300ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 300ms ease;
  }

  .sidebar-theme-button:hover {
    transform: translateY(-2px) rotate(4deg) scale(1.06);
  }

  .sidebar-theme-button:active {
    transform: scale(0.9);
  }

  .sidebar-theme-icon {
    animation: themeIconIn 400ms
      cubic-bezier(0.22, 1, 0.36, 1);
  }

  /* =======================================================
     CLOSE BUTTON
  ======================================================= */

  .sidebar-close-button {
    transition:
      transform 300ms cubic-bezier(0.22, 1, 0.36, 1),
      background-color 250ms ease;
  }

  .sidebar-close-button:hover {
    transform: rotate(90deg) scale(1.05);
  }

  .sidebar-close-button:active {
    transform: rotate(90deg) scale(0.88);
  }

  /* =======================================================
     PROFILE
  ======================================================= */

  .sidebar-profile {
    transition:
      transform 350ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 350ms ease;
  }

  .sidebar-profile:hover {
    transform: translateY(-3px);
  }

  .sidebar-avatar {
    transition:
      transform 350ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .sidebar-profile:hover .sidebar-avatar {
    transform: scale(1.08) rotate(-3deg);
    animation: avatarPulse 1.5s ease-in-out infinite;
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  .sidebar-logout {
    transition:
      transform 300ms cubic-bezier(0.22, 1, 0.36, 1),
      padding-left 300ms ease;
  }

  .sidebar-logout:hover {
    transform: translateX(4px);
  }

  .sidebar-logout-icon {
    transition:
      transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .sidebar-logout:hover .sidebar-logout-icon {
    transform: translateX(3px) rotate(-8deg);
  }

  /* =======================================================
     REDUCED MOTION
  ======================================================= */

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

function Sidebar({
  onNavigate,
  currentPage = "dashboard",
  user,
  isOpen = false,
  onClose,
}) {
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
      <style>{sidebarAnimationStyles}</style>

      {/* ===================================================
          MOBILE BACKDROP
      =================================================== */}

      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r transition-transform duration-300 backdrop-blur-2xl lg:translate-x-0 ${
          isOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full"
        } ${
          isDarkMode
            ? "border-white/8 bg-[#13101A]/95 text-[#F3F0F8] shadow-[0_15px_50px_rgba(0,0,0,0.30)]"
            : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_30px_rgba(0,0,0,0.03)]"
        }`}
      >
        {/* =================================================
            LOGO & HEADER
        ================================================= */}

        <div className="flex items-center justify-between border-b border-inherit px-6 py-6">
          <div
            className="flex items-center gap-2"
            style={{
              animation:
                "logoEnter 650ms cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          >
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
            {/* Theme Toggle */}

            <button
              onClick={toggleDarkMode}
              title={
                isDarkMode
                  ? "Switch to Light Mode"
                  : "Switch to Dark Mode"
              }
              className={`sidebar-theme-button flex h-9 w-9 items-center justify-center rounded-xl border text-sm ${
                isDarkMode
                  ? "border-white/10 bg-white/10 text-yellow-300 hover:bg-white/20"
                  : "border-white/80 bg-white/80 text-purple-600 hover:bg-white shadow-sm"
              }`}
              aria-label="Toggle Theme"
            >
              {isDarkMode ? (
                <Sun
                  key="sun"
                  size={16}
                  className="sidebar-theme-icon"
                />
              ) : (
                <Moon
                  key="moon"
                  size={16}
                  className="sidebar-theme-icon"
                />
              )}
            </button>

            {/* Mobile Close */}

            <button
              onClick={onClose}
              className={`sidebar-close-button flex h-9 w-9 items-center justify-center rounded-xl border lg:hidden ${
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

        {/* =================================================
            NAVIGATION
        ================================================= */}

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <div className="space-y-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;

              return (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.page)}
                  className={`sidebar-nav-item group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${
                    isActive
                      ? isDarkMode
                        ? "bg-[#8064C7]/25 text-[#A78BFA] border border-[#8064C7]/30 shadow-sm"
                        : "bg-[#8064C7]/15 text-[#8064C7] border border-[#8064C7]/20 shadow-sm"
                      : isDarkMode
                      ? "text-white/70 hover:bg-white/10 hover:text-white"
                      : "text-[#706A78] hover:bg-[#8064C7]/10 hover:text-[#292530]"
                  }`}
                  style={{
                    animation: `sidebarItemEnter 600ms cubic-bezier(0.22, 1, 0.36, 1) ${
                      120 + index * 80
                    }ms both`,
                  }}
                >
                  {/* Active indicator */}

                  {isActive && (
                    <span
                      className={`sidebar-active-indicator ${
                        isDarkMode
                          ? "bg-[#A78BFA]"
                          : "bg-[#8064C7]"
                      }`}
                    />
                  )}

                  <Icon
                    size={19}
                    className={`sidebar-nav-icon ${
                      isActive
                        ? `${
                            isDarkMode
                              ? "text-[#A78BFA]"
                              : "text-[#8064C7]"
                          } sidebar-active-icon`
                        : "opacity-70 group-hover:opacity-100"
                    }`}
                  />

                  <span className="relative z-10">
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* =================================================
            USER PROFILE & LOGOUT
        ================================================= */}

        <div
          className="space-y-3 border-t border-inherit p-4"
          style={{
            animation:
              "dashboardEnter 700ms cubic-bezier(0.22, 1, 0.36, 1) 550ms both",
          }}
        >
          {/* Profile */}

          <div
            className={`sidebar-profile flex items-center gap-3 rounded-2xl border p-3 backdrop-blur-xl ${
              isDarkMode
                ? "border-white/10 bg-white/5 text-white"
                : "border-white/80 bg-white/60 text-[#292530]"
            }`}
          >
            <div className="sidebar-avatar flex h-10 w-10 items-center justify-center rounded-xl bg-[#8064C7] text-sm font-bold text-white shadow-md">
              {user?.name
                ? user.name[0].toUpperCase()
                : "J"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">
                {user?.name || "Student User"}
              </p>

              <p
                className={`truncate text-xs ${
                  isDarkMode
                    ? "text-white/40"
                    : "text-gray-500"
                }`}
              >
                {user?.email || "Authenticated"}
              </p>
            </div>
          </div>

          {/* Logout */}

          <button
            onClick={handleLogout}
            className={`sidebar-logout flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
              isDarkMode
                ? "text-red-400 hover:bg-red-500/15"
                : "text-red-600 hover:bg-red-50"
            }`}
          >
            <LogOut
              size={16}
              className="sidebar-logout-icon"
            />

            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;