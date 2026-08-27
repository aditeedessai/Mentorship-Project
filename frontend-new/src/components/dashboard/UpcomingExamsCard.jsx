import { Calculator, Atom, Brain, BookOpen } from "lucide-react";

const MOCK_EXAMS = [
  { subject: "Calculus II", examType: "Midterm", daysLeft: 3, date: "Oct 15" },
  { subject: "Physics 101", examType: "Quiz", daysLeft: 6, date: "Oct 18" },
  { subject: "Psychology", examType: "Final Paper", daysLeft: 13, date: "Oct 25" },
];

const getSubjectIcon = (subject) => {
  const name = subject.toLowerCase();
  if (name.includes("calc") || name.includes("math")) return Calculator;
  if (name.includes("phys") || name.includes("atom") || name.includes("chem")) return Atom;
  if (name.includes("psych") || name.includes("brain")) return Brain;
  return BookOpen;
};

function UpcomingExamsCard({ onSeeAll }) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-xl font-semibold text-[#3E3E75]">
        Upcoming Exams
      </h2>

      {MOCK_EXAMS.length === 0 ? (
        <p className="flex-1 py-6 text-center text-sm text-gray-400">
          No upcoming exams.
        </p>
      ) : (
        <div className="flex-1 space-y-4">
          {MOCK_EXAMS.map((exam) => {
            const Icon = getSubjectIcon(exam.subject);

            return (
              <div key={exam.subject} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#98E8DE]">
                  <Icon size={18} className="text-[#4E1F6E]" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#3E3E75]">
                    {exam.subject}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {exam.examType} • {exam.daysLeft} days
                  </p>
                </div>

                <span className="shrink-0 text-xs font-semibold text-[#4E1F6E]">
                  {exam.date}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={onSeeAll}
          className="rounded-full border border-[#98E8DE] bg-[#98E8DE]/20 px-5 py-2 text-xs font-semibold text-[#4E1F6E] transition hover:bg-[#98E8DE]/40"
        >
          See all
        </button>
      </div>
    </div>
  );
}

export default UpcomingExamsCard;
