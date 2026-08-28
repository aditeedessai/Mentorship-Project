import { CircleDot } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function ModuleBadge({ text = 'Study Set' }) {
  const { isDarkMode } = useTheme()

  return (
    <div className={`inline-flex items-center gap-1.5 h-7 px-3.5 rounded-full border text-xs font-bold transition-all ${
      isDarkMode
        ? "border-[#8064C7]/30 bg-[#8064C7]/20 text-[#A78BFA]"
        : "border-[#8064C7]/20 bg-[#8064C7]/10 text-[#8064C7]"
    }`}>
      <CircleDot className="w-3.5 h-3.5 text-[#8064C7] dark:text-[#A78BFA]" strokeWidth={2.5} />
      <span>
        {text}
      </span>
    </div>
  )
}

