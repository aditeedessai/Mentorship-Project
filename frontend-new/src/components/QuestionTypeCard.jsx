import { Check, Clock, AlertTriangle } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function QuestionTypeCard({
  type,
  isSelected,
  isLocked = false,
  isMastered = false,
  needsAttention = false,
  statusLabel,
  onSelect,
}) {
  const { isDarkMode } = useTheme()
  const { title, description, badge, icon: Icon } = type

  // Every attempt is independently scoped to one question type now - a
  // card is only ever non-clickable for one of these three reasons
  // (never all "isCompleted" the old single-flag way): not due yet
  // (isLocked), capped and still weak (needsAttention - the backend
  // gate blocks a new attempt outright for this case, so there's no
  // "Review Weak Areas" action to offer here yet), or capped and
  // mastered (isMastered - nothing left to attempt).
  const disabled = isLocked || isMastered || needsAttention

  const handleClick = () => {
    if (!disabled && onSelect) {
      onSelect()
    }
  }

  const variantClasses = needsAttention
    ? isDarkMode
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 cursor-not-allowed opacity-95'
      : 'border-amber-300 bg-amber-50/70 text-amber-800 cursor-not-allowed opacity-95'
    : isMastered
    ? isDarkMode
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 cursor-not-allowed opacity-90'
      : 'border-emerald-300 bg-emerald-50/70 text-emerald-800 cursor-not-allowed opacity-90'
    : isLocked
    ? isDarkMode
      ? 'border-white/8 bg-white/5 text-white/50 cursor-not-allowed opacity-70'
      : 'border-black/5 bg-black/5 text-[#706A78] cursor-not-allowed opacity-70'
    : isSelected
    ? isDarkMode
      ? 'border-[#8064C7] bg-[#8064C7]/20 text-white shadow-[0_15px_35px_rgba(128,100,199,0.25)]'
      : 'border-[#8064C7] bg-white text-[#292530] shadow-[0_15px_35px_rgba(128,100,199,0.15)]'
    : isDarkMode
    ? 'border-white/8 bg-[#14101D]/75 text-[#F3F0F8] hover:border-[#8064C7]/40 hover:bg-white/10'
    : 'border-black/5 bg-[#F8F8FC]/95 text-[#231B33] hover:border-[#8064C7]/30 hover:bg-white'

  const iconWrapClasses = needsAttention
    ? 'bg-amber-500/20 text-amber-400'
    : isMastered
    ? 'bg-emerald-500/20 text-emerald-400'
    : isLocked
    ? isDarkMode
      ? 'bg-white/10 text-white/40'
      : 'bg-black/5 text-[#706A78]'
    : isDarkMode
    ? 'bg-white/10 text-[#A78BFA]'
    : 'bg-[#8064C7]/15 text-[#8064C7]'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={isSelected && !disabled}
      aria-disabled={disabled}
      aria-label={`${title} question type${statusLabel ? ` (${statusLabel})` : ''}`}
      className={`relative w-full sm:w-auto flex-1 min-w-[200px] max-w-none sm:max-w-[280px] min-h-[220px] sm:h-[235px] rounded-2xl border-2 text-left p-4 sm:p-5 flex flex-col transition-all duration-300 backdrop-blur-xl ${variantClasses}`}
    >
      {/* Status indicator badge (top-right) */}
      {needsAttention ? (
        <div className="absolute top-[13px] right-[13px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center gap-1 text-[11px] font-bold text-amber-500">
          <AlertTriangle className="w-[12px] h-[12px]" strokeWidth={3} />
          Needs Review
        </div>
      ) : isMastered ? (
        <div className="absolute top-[13px] right-[13px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1 text-[11px] font-bold text-emerald-400">
          <Check className="w-[12px] h-[12px]" strokeWidth={3} />
          Mastered
        </div>
      ) : isLocked ? (
        <div className={`absolute top-[13px] right-[13px] px-2 py-0.5 rounded-full flex items-center gap-1 text-[11px] font-bold ${
          isDarkMode ? 'bg-white/10 text-white/50' : 'bg-black/5 text-[#706A78]'
        }`}>
          <Clock className="w-[12px] h-[12px]" strokeWidth={3} />
          Not Yet Due
        </div>
      ) : (
        isSelected && (
          <div className="absolute top-[13px] right-[13px] w-5 h-5 rounded-full bg-[#8064C7] flex items-center justify-center shadow-md">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        )
      )}

      {/* Icon container */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 ${iconWrapClasses}`}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>

      {/* Title */}
      <h3 className="text-base font-black mb-1.5 tracking-tight">{title}</h3>

      {/* Description */}
      <p className={`text-xs leading-relaxed flex-1 ${isDarkMode ? 'text-white/60' : 'text-[#706A78]'}`}>{description}</p>

      {/* Badge */}
      <div className="mt-auto pt-2">
        {needsAttention ? (
          <span className="inline-block text-[10px] font-bold text-amber-500 bg-amber-500/20 border border-amber-500/30 rounded-lg px-2.5 py-1">
            {statusLabel || 'Needs Review'}
          </span>
        ) : isMastered ? (
          <span className="inline-block text-[10px] font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-2.5 py-1">
            {statusLabel || 'Mastered · 4/4'}
          </span>
        ) : isLocked ? (
          <span className={`inline-block text-[10px] font-bold rounded-lg px-2.5 py-1 ${
            isDarkMode ? 'text-white/50 bg-white/5 border border-white/10' : 'text-[#706A78] bg-black/5 border border-black/10'
          }`}>
            {statusLabel || 'Not yet due'}
          </span>
        ) : (
          <span className={`inline-block text-[10px] font-bold rounded-lg px-2.5 py-1 ${
            isDarkMode
              ? 'text-[#A78BFA] bg-[#8064C7]/20 border border-[#8064C7]/30'
              : 'text-[#8064C7] bg-[#8064C7]/10 border border-[#8064C7]/20'
          }`}>
            {statusLabel || badge}
          </span>
        )}
      </div>
    </button>
  )
}
