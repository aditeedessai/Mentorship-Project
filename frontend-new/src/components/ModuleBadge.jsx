import { CircleDot } from 'lucide-react'

export default function ModuleBadge({ text = 'Study Set' }) {
  return (
    <div className="inline-flex items-center gap-[6px] h-[26px] px-3 rounded-full bg-[#EFFBFA] border border-[#B9E4E3]">
      <CircleDot className="w-[12px] h-[12px] text-[#5ABFBD]" strokeWidth={2.5} />
      <span className="text-[11px] text-[#4B7778] tracking-[0.03em] font-medium">
        {text}
      </span>
    </div>
  )
}
