import { Layers } from "lucide-react";

const MOCK_STUDY_SET_PROGRESS = [
  { studySetName: "Calculus II", sectionsCompleted: 4, totalSections: 4 },
  { studySetName: "Physics 101", sectionsCompleted: 2, totalSections: 4 },
  { studySetName: "Psychology Basics", sectionsCompleted: 1, totalSections: 4 },
];

// TODO: replace MOCK_STUDY_SET_PROGRESS with a real query that counts
// completed quiz_attempts rows grouped by study set and question type
// (MCQ, Application, Long Answer, Short Answer) to derive sectionsCompleted.

function StudySetProgressCard() {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <Layers size={20} className="text-[#4E1F6E]" />
        <h2 className="text-xl font-semibold text-[#3E3E75]">
          Study Set Progress
        </h2>
      </div>

      {MOCK_STUDY_SET_PROGRESS.length === 0 ? (
        <p className="flex-1 py-6 text-center text-sm text-gray-400">
          No study sets yet.
        </p>
      ) : (
        <div className="flex-1 space-y-5">
          {MOCK_STUDY_SET_PROGRESS.map((set) => {
            const isComplete = set.sectionsCompleted >= set.totalSections;
            const percent = Math.min(
              100,
              (set.sectionsCompleted / set.totalSections) * 100
            );

            return (
              <div key={set.studySetName}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="truncate text-sm font-medium text-[#3E3E75]">
                    {set.studySetName}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-gray-500">
                    {set.sectionsCompleted}/{set.totalSections} sections
                  </span>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: isComplete ? "#1D9E75" : "#4E1F6E",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StudySetProgressCard;
