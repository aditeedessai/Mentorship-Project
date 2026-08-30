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
      className={`flex flex-1 flex-col items-center justify-center rounded-3xl border p-6 text-center backdrop-blur-2xl transition-all duration-500 ${
        isDarkMode
          ? "border-[#8064C7]/20 bg-[#8064C7]/10 text-[#A78BFA]"
          : "border-[#8064C7]/15 bg-[#8064C7]/5 text-[#8064C7]"
      }`}
    >
      <p className="text-base font-bold tracking-tight">{tagline}</p>
    </div>
  );
}

export default MotivationalTaglineCard;

