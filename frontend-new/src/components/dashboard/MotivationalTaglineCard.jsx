import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";

const TAGLINES = [
  "✨ Small steps every day lead to big results ✨",
  "🌱 Consistency beats intensity — keep going 🌱",
  "📚 Every quiz you take makes the next one easier 📚",
  "🎯 You're closer to mastering this than you think 🎯",
  "💪 Today's effort is tomorrow's confidence 💪",
];

function MotivationalTaglineCard() {
  const { isDarkMode } = useTheme();
  const [tagline] = useState(
    () => TAGLINES[Math.floor(Math.random() * TAGLINES.length)]
  );

  return (
    <div
      className={`flex w-full flex-col items-center justify-center rounded-2xl sm:rounded-3xl border p-3.5 sm:p-6 text-center backdrop-blur-2xl transition-all duration-500 ${
        isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#A78BFA] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          : "border-black/5 bg-[#F8F8FC]/95 text-[#8064C7] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
      }`}
    >
      <p className="text-xs sm:text-base font-bold tracking-tight">{tagline}</p>
    </div>
  );
}

export default MotivationalTaglineCard;

