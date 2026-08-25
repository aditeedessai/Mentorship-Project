import { Check } from 'lucide-react'

export default function QuestionTypeCard({ type, isSelected, isCompleted, onSelect }) {
  const { title, description, badge, icon: Icon } = type

  const handleClick = () => {
    if (!isCompleted && onSelect) {
      onSelect()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isCompleted}
      aria-pressed={isSelected && !isCompleted}
      aria-disabled={isCompleted}
      aria-label={`${title} question type${isCompleted ? ' (Completed)' : ''}`}
      className={`relative flex-1 min-w-[205px] max-w-[280px] h-[235px] rounded-[9px] border-2 text-left p-5 flex flex-col transition-all duration-[180ms] ease-in-out ${
        isCompleted
          ? 'border-emerald-300 bg-emerald-50/50 cursor-not-allowed opacity-90'
          : isSelected
          ? 'border-[#68CECC] bg-white cursor-pointer hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] shadow-[0_2px_8px_rgba(104,206,204,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68CECC]'
          : 'border-[#A5DDDC] bg-white cursor-pointer hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-[#7DD4D2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68CECC]'
      }`}
    >
      {/* Completed indicator badge */}
      {isCompleted ? (
        <div className="absolute top-[13px] right-[13px] px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
          <Check className="w-[12px] h-[12px] text-emerald-600" strokeWidth={3} />
          Completed
        </div>
      ) : (
        /* Selected check indicator (when not completed) */
        isSelected && (
          <div className="absolute top-[13px] right-[13px] w-[20px] h-[20px] rounded-full bg-[#65CECC] flex items-center justify-center">
            <Check className="w-[12px] h-[12px] text-white" strokeWidth={3} />
          </div>
        )
      )}

      {/* Icon container */}
      <div className={`w-9 h-9 rounded-[7px] flex items-center justify-center mb-[14px] ${isCompleted ? 'bg-emerald-100' : 'bg-[#F1F2F3]'}`}>
        <Icon className={`w-[18px] h-[18px] ${isCompleted ? 'text-emerald-700' : 'text-[#4A4A4A]'}`} strokeWidth={1.8} />
      </div>

      {/* Title */}
      <h3 className={`text-[15px] font-semibold mb-[8px] ${isCompleted ? 'text-emerald-950' : 'text-[#222222]'}`}>{title}</h3>

      {/* Description */}
      <p className={`text-[11.5px] leading-[1.5] flex-1 ${isCompleted ? 'text-emerald-800' : 'text-[#555555]'}`}>{description}</p>

      {/* Badge */}
      <div className="mt-auto pt-[8px]">
        {isCompleted ? (
          <span className="inline-block text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-[4px] px-[7px] py-[3px]">
            Section Done
          </span>
        ) : (
          <span className="inline-block text-[10px] font-medium text-[#3D8584] bg-[#EFFBFA] border border-[#C5E8E7] rounded-[4px] px-[7px] py-[3px]">
            {badge}
          </span>
        )}
      </div>
    </button>
  )
}
