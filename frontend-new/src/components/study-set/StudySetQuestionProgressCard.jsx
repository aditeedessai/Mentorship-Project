import {
  Target,
  ListChecks,
  FileText,
  Lightbulb,
  BookOpen,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const QUESTION_TYPES = [
  {
    id: "mcq",
    title: "Multiple Choice (MCQ)",
    defaultTotal: 5,
    icon: <ListChecks size={16} />,
  },
  {
    id: "short",
    title: "Short Answer",
    defaultTotal: 5,
    icon: <FileText size={16} />,
  },
  {
    id: "application",
    title: "Application Questions",
    defaultTotal: 5,
    icon: <Lightbulb size={16} />,
  },
  {
    id: "qna",
    title: "Long Answers",
    defaultTotal: 5,
    icon: <BookOpen size={16} />,
  },
];

function StudySetQuestionProgressCard({
  completedSections = [],
  questionCounts = {},
}) {
  const { isDarkMode } = useTheme();

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
    <section
      className={`rounded-3xl border p-6 sm:p-7 backdrop-blur-2xl transition-all duration-500 flex flex-col ${
        isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA] p-2.5 rounded-2xl shrink-0">
            <Target size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black leading-tight truncate">Question Progress</h2>
            <p className={`text-xs truncate ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>Answered vs. Pending Question Sets</p>
          </div>
        </div>
        <span className={`shrink-0 whitespace-nowrap font-mono text-xs font-bold px-3 py-1 rounded-full ${
          isDarkMode ? "bg-[#8064C7]/20 border border-[#8064C7]/30 text-[#A78BFA]" : "bg-[#8064C7]/10 border border-[#8064C7]/20 text-[#8064C7]"
        }`}>
          {progressItems.length} Types
        </span>
      </div>

      <div className="space-y-3.5">
        {progressItems.map((item) => (
          <div
            key={item.id}
            className={`p-4 border rounded-2xl transition-all backdrop-blur-xl group ${
              isDarkMode
                ? "border-white/5 bg-white/5 hover:border-white/10"
                : "border-gray-200/80 bg-white hover:border-[#8064C7]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA] shrink-0">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold truncate group-hover:text-[#8064C7] dark:group-hover:text-[#A78BFA] transition-colors">
                    {item.title}
                  </h4>
                  <p className={`text-xs mt-0.5 font-mono font-semibold ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                    {item.answered}/{item.total} Answered
                  </p>
                </div>
              </div>

              <span
                className={`font-mono text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ml-2 ${
                  item.status === "Completed"
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                    : isDarkMode
                    ? "bg-white/5 border-white/10 text-white/40"
                    : "bg-gray-100 border-gray-200 text-gray-400"
                }`}
              >
                {item.status}
              </span>
            </div>

            <div className={`w-full h-2 rounded-full overflow-hidden mt-3 ${isDarkMode ? "bg-white/10" : "bg-black/10"}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  item.status === "Completed" ? "bg-emerald-500" : "bg-[#8064C7]"
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

