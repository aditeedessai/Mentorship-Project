import { useState } from "react";

const TAGLINES = [
  "✨ Small steps every day lead to big results ✨",
  "🌱 Consistency beats intensity — keep going 🌱",
  "📚 Every quiz you take makes the next one easier 📚",
  "🎯 You're closer to mastering this than you think 🎯",
  "💪 Today's effort is tomorrow's confidence 💪",
];

function MotivationalTaglineCard() {
  const [tagline] = useState(
    () => TAGLINES[Math.floor(Math.random() * TAGLINES.length)]
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-[#4E1F6E]/10 p-6 text-center">
      <p className="text-base font-semibold text-[#3E3E75]">{tagline}</p>
    </div>
  );
}

export default MotivationalTaglineCard;
