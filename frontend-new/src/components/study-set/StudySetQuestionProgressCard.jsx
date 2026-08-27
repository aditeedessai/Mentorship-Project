import {
  Target,
  CheckSquare,
  HelpCircle,
  Lightbulb,
  FileQuestion,
} from "lucide-react";

const QUESTION_TYPES = [
  {
    id: "mcq",
    title: "Multiple Choice (MCQ)",
    defaultTotal: 5,
    icon: <CheckSquare size={16} />,
    colorClass: "bg-gradient-to-r from-[#006B5F] to-[#1D9E75]",
    barClass: "bg-gradient-to-r from-[#006B5F] to-[#62FAE3]",
  },
  {
    id: "short",
    title: "Short Answer",
    defaultTotal: 5,
    icon: <HelpCircle size={16} />,
    colorClass: "bg-gradient-to-r from-[#4E1F6E] to-[#3E3E75]",
    barClass: "bg-gradient-to-r from-[#4E1F6E] to-[#98E8DE]",
  },
  {
    id: "application",
    title: "Application Questions",
    defaultTotal: 5,
    icon: <Lightbulb size={16} />,
    colorClass: "bg-gradient-to-r from-[#4E1F6E] to-[#3E3E75]",
    barClass: "bg-gradient-to-r from-[#4E1F6E] to-[#98E8DE]",
  },
  {
    id: "qna",
    title: "Q&A / Essay",
    defaultTotal: 5,
    icon: <FileQuestion size={16} />,
    colorClass: "bg-gradient-to-r from-[#4E1F6E] to-[#3E3E75]",
    barClass: "bg-gradient-to-r from-[#4E1F6E] to-[#98E8DE]",
  },
];

function StudySetQuestionProgressCard({
  completedSections = [],
  questionCounts = {},
}) {
  const progressItems = QUESTION_TYPES.map((typeMeta) => {
    const isCompleted =
      completedSections.includes(typeMeta.id) ||
      (typeMeta.id === "qna" && completedSections.includes("long"));

    const total = questionCounts[typeMeta.id] || typeMeta.defaultTotal;
    const answered = isCompleted ? total : 0;
    const percentage = isCompleted ? 100 : 0;
    const status = isCompleted ? "Completed" : "Pending";

    return {
      ...typeMeta,
      answered,
      total,
      percentage,
      status,
    };
  });

  return (
    <section className="rounded-2xl bg-white/95 backdrop-blur-md p-6 sm:p-7 shadow-[0_4px_25px_rgba(78,31,110,0.06)] hover:shadow-[0_8px_30px_rgba(78,31,110,0.09)] border border-gray-100/90 flex flex-col transition-all duration-300">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-[#98E8DE]/40 via-[#98E8DE]/20 to-[#4E1F6E]/10 border border-[#98E8DE]/60 text-[#4E1F6E] p-3 rounded-xl shadow-2xs ring-1 ring-[#98E8DE]/30">
            <Target size={22} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#3E3E75]">Question Progress</h2>
            <p className="text-xs text-gray-500">Answered vs. Pending Question Sets</p>
          </div>
        </div>
        <span className="bg-[#4E1F6E]/10 border border-[#4E1F6E]/20 text-[#4E1F6E] font-mono text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
          {progressItems.length} Types
        </span>
      </div>

      <div className="space-y-3.5">
        {progressItems.map((item) => (
          <div
            key={item.id}
            className="p-4 border border-gray-200/80 rounded-2xl bg-gradient-to-r from-white via-gray-50/40 to-[#98E8DE]/10 shadow-2xs hover:border-[#4E1F6E]/40 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2.5 rounded-xl text-white shrink-0 shadow-2xs ${item.colorClass}`}>
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-[#3E3E75] truncate group-hover:text-[#4E1F6E] transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono font-medium">
                    {item.answered}/{item.total} Answered
                  </p>
                </div>
              </div>

              <span
                className={`font-mono text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-2xs shrink-0 ml-2 ${
                  item.status === "Completed"
                    ? "bg-[#98E8DE]/35 border-[#98E8DE]/70 text-[#006B5F]"
                    : "bg-gray-100 border-gray-200 text-gray-500"
                }`}
              >
                {item.status}
              </span>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200 mt-2.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  item.status === "Completed" ? item.barClass : "bg-gray-200"
                }`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default StudySetQuestionProgressCard;
