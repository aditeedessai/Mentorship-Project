import { Check } from 'lucide-react'

export default function QuestionTypeCard({ type, isSelected, onSelect }) {
  const { title, description, badge, icon: Icon } = type

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`Select ${title} question type`}
      className={`relative flex-1 min-w-[205px] max-w-[280px] h-[235px] rounded-[9px] border-2 bg-white text-left p-5 flex flex-col cursor-pointer
        transition-all duration-[180ms] ease-in-out
        hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68CECC]
        ${
          isSelected
            ? 'border-[#68CECC] shadow-[0_2px_8px_rgba(104,206,204,0.12)]'
            : 'border-[#A5DDDC] hover:border-[#7DD4D2]'
        }`}
    >
      {/* Selected check indicator */}
      {isSelected && (
        <div className="absolute top-[13px] right-[13px] w-[20px] h-[20px] rounded-full bg-[#65CECC] flex items-center justify-center">
          <Check className="w-[12px] h-[12px] text-white" strokeWidth={3} />
        </div>
      )}

      {/* Icon container */}
      <div className="w-9 h-9 rounded-[7px] bg-[#F1F2F3] flex items-center justify-center mb-[14px]">
        <Icon className="w-[18px] h-[18px] text-[#4A4A4A]" strokeWidth={1.8} />
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-semibold text-[#222222] mb-[8px]">{title}</h3>

      {/* Description */}
      <p className="text-[11.5px] leading-[1.5] text-[#555555] flex-1">{description}</p>

      {/* Badge */}
      <div className="mt-auto pt-[8px]">
        <span className="inline-block text-[10px] font-medium text-[#3D8584] bg-[#EFFBFA] border border-[#C5E8E7] rounded-[4px] px-[7px] py-[3px]">
          {badge}
        </span>
      </div>
    </button>
  )
}
