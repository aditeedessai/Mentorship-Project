import {
  Home,
  Upload,
  ClipboardList,
  CalendarDays,
  TrendingUp,
  Settings,
  Sparkles,
} from "lucide-react";

const menuItems = [
  { name: "Home", page: "dashboard", icon: Home },
  { name: "Upload", page: "upload", icon: Upload },
  { name: "Quiz", page: "quiz", icon: ClipboardList },
  { name: "Planner", page: "planner", icon: CalendarDays },
  { name: "Progress", page: "progress", icon: TrendingUp },
  { name: "Settings", page: "settings", icon: Settings },
];

import { LogOut } from "lucide-react";
import { supabase } from "../services/supabase";

function Sidebar({ onNavigate, currentPage = "dashboard", user }) {
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  };

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-6">
        <Sparkles size={22} className="text-[#4E1F6E]" />
        <div className="text-lg font-bold leading-tight text-[#4E1F6E]">
          AI STUDY
          <br />
          ENGINE
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentPage === item.page ||
              (item.page === "progress" && currentPage === "results");

            return (
              <button
                key={item.name}
                onClick={() => onNavigate(item.page)}
                className={`group flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[#98E8DE] text-[#4E1F6E]"
                    : "text-[#3E3E75] hover:bg-[#98E8DE]/40 hover:text-[#4E1F6E]"
                }`}
              >
                <Icon
                  size={18}
                  className="transition-transform duration-200 group-hover:scale-110"
                />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Profile & Logout */}
      <div className="border-t border-gray-200 p-4 space-y-2">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4E1F6E] text-sm font-semibold text-white">
            {user?.name ? user.name[0].toUpperCase() : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold text-[#3E3E75]">
              {user?.name || "Student User"}
            </p>
            <p className="truncate text-xs text-gray-500">{user?.email || "Authenticated"}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;