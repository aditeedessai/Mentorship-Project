import { useEffect, useState } from "react";
import {
  Calculator,
  Atom,
  Brain,
  BookOpen,
  Plus,
  Loader2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import DeleteConfirmModal from "../DeleteConfirmModal";
import { fetchExams, createExam, deleteExam, fetchStudySets } from "../../services/api";

// Time the collapse/fade-out transition takes when an exam is deleted.
// Kept in sync with the transition duration classes below.
const COLLAPSE_DURATION_MS = 300;

const EXAM_TYPE_OPTIONS = ["Exam", "Midterm", "Final", "Quiz", "Assignment"];

const getSubjectIcon = (subject) => {
  const name = subject.toLowerCase();
  if (name.includes("calc") || name.includes("math")) return Calculator;
  if (name.includes("phys") || name.includes("atom") || name.includes("chem")) return Atom;
  if (name.includes("psych") || name.includes("brain")) return Brain;
  return BookOpen;
};

function getDaysLabel(examDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${examDate}T00:00:00`);
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

function formatExamDate(examDate) {
  return new Date(`${examDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// Local (not UTC) today as "YYYY-MM-DD", matching the format <input type="date">
// uses - lets both the input's min and the past-date check use plain string
// comparison instead of parsing dates back out.
function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function UpcomingExamsCard({ onSeeAll }) {
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [studySets, setStudySets] = useState([]);

  const [isAdding, setIsAdding] = useState(false);
  const [subject, setSubject] = useState("");
  const [examType, setExamType] = useState(EXAM_TYPE_OPTIONS[0]);
  const [examDate, setExamDate] = useState("");
  const [studySetId, setStudySetId] = useState("");
  const [addError, setAddError] = useState("");
  const [isAddSubmitting, setIsAddSubmitting] = useState(false);

  const [confirmExam, setConfirmExam] = useState(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  const [removingId, setRemovingId] = useState(null);

  const loadExams = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await fetchExams();
      setExams(data);
    } catch {
      setLoadError("Couldn't load upcoming exams. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
    fetchStudySets()
      .then((data) => setStudySets(data))
      .catch(() => setStudySets([]));
  }, []);

  const openAddForm = () => {
    setIsAdding(true);
    setAddError("");
    setSubject("");
    setExamType(EXAM_TYPE_OPTIONS[0]);
    setExamDate("");
    setStudySetId("");
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setSubject("");
    setExamDate("");
    setStudySetId("");
    setAddError("");
  };

  const confirmAddExam = async () => {
    const trimmedSubject = subject.trim();

    if (!trimmedSubject || !examDate) {
      setAddError("Please enter a subject and exam date.");
      return;
    }

    if (examDate < getTodayIsoDate()) {
      setAddError("Exam date can't be in the past.");
      return;
    }

    setIsAddSubmitting(true);
    setAddError("");
    try {
      const created = await createExam(
        trimmedSubject,
        examType,
        examDate,
        studySetId || undefined
      );

      // Insert at its sorted position (exam_date is an ISO date string, so
      // string comparison sorts chronologically) rather than re-sorting
      // the whole list - the fetched order is otherwise left untouched.
      setExams((prev) => {
        const next = [...prev];
        const insertAt = next.findIndex((e) => e.exam_date > created.exam_date);
        if (insertAt === -1) next.push(created);
        else next.splice(insertAt, 0, created);
        return next;
      });

      setIsAdding(false);
      setSubject("");
      setExamDate("");
      setStudySetId("");
    } catch {
      setAddError("Couldn't add exam. Please try again.");
    } finally {
      setIsAddSubmitting(false);
    }
  };

  const openConfirm = (exam) => {
    setConfirmExam(exam);
    setConfirmError(null);
  };

  const cancelConfirm = () => {
    if (isConfirmLoading) return;
    setConfirmExam(null);
    setConfirmError(null);
  };

  const confirmDelete = async () => {
    if (!confirmExam) return;

    setIsConfirmLoading(true);
    setConfirmError(null);
    try {
      await deleteExam(confirmExam.id);

      const examId = confirmExam.id;
      setIsConfirmLoading(false);
      setConfirmExam(null);
      setRemovingId(examId);

      setTimeout(() => {
        setExams((prev) => prev.filter((e) => e.id !== examId));
        setRemovingId(null);
      }, COLLAPSE_DURATION_MS);
    } catch {
      setConfirmError("Couldn't delete exam. Please try again.");
      setIsConfirmLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#3E3E75]">
            Upcoming Exams
          </h2>

          <button
            type="button"
            onClick={openAddForm}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4E1F6E] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3E3E75] hover:shadow-md"
            aria-label="Add exam"
          >
            <Plus size={18} />
          </button>
        </div>

        {isAdding && (
          <div className="mb-4 space-y-2">
            <input
              type="text"
              autoFocus
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (addError) setAddError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") cancelAdd();
              }}
              disabled={isAddSubmitting}
              placeholder="Exam subject (e.g. Calculus II)"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#3E3E75] outline-none transition focus:border-[#4E1F6E] focus:ring-2 focus:ring-[#98E8DE]/40 disabled:opacity-60"
            />

            <div className="flex gap-2">
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                disabled={isAddSubmitting}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#3E3E75] outline-none transition focus:border-[#4E1F6E] focus:ring-2 focus:ring-[#98E8DE]/40 disabled:opacity-60"
              >
                {EXAM_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={examDate}
                min={getTodayIsoDate()}
                onChange={(e) => {
                  setExamDate(e.target.value);
                  if (addError) setAddError("");
                }}
                disabled={isAddSubmitting}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#3E3E75] outline-none transition focus:border-[#4E1F6E] focus:ring-2 focus:ring-[#98E8DE]/40 disabled:opacity-60"
              />
            </div>

            <select
              value={studySetId}
              onChange={(e) => setStudySetId(e.target.value)}
              disabled={isAddSubmitting}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#3E3E75] outline-none transition focus:border-[#4E1F6E] focus:ring-2 focus:ring-[#98E8DE]/40 disabled:opacity-60"
            >
              <option value="">No linked study set</option>
              {studySets.map((set) => (
                <option key={set.study_set_id} value={set.study_set_id}>
                  {set.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={confirmAddExam}
                disabled={isAddSubmitting}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-[#4E1F6E] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#3E3E75] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAddSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Add"
                )}
              </button>
              <button
                type="button"
                onClick={cancelAdd}
                disabled={isAddSubmitting}
                className="text-xs font-semibold text-gray-500 transition hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </div>

            {addError && (
              <p className="text-xs font-medium text-red-500">{addError}</p>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            Loading exams...
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <div className="flex items-center gap-1.5 text-sm font-medium text-red-500">
              <AlertCircle size={16} />
              {loadError}
            </div>
            <button
              type="button"
              onClick={loadExams}
              className="text-xs font-semibold text-[#4E1F6E] underline underline-offset-2 hover:text-[#3E3E75]"
            >
              Retry
            </button>
          </div>
        ) : exams.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            No upcoming exams.
          </p>
        ) : (
          <div className="scrollbar-thin max-h-[224px] overflow-y-auto pr-1">
            {exams.map((exam) => {
              const Icon = getSubjectIcon(exam.subject);
              const isRemoving = removingId === exam.id;

              return (
                <div
                  key={exam.id}
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isRemoving
                      ? "max-h-0 opacity-0 mb-0"
                      : "max-h-24 opacity-100 mb-4"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#98E8DE]">
                      <Icon size={18} className="text-[#4E1F6E]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#3E3E75]">
                        {exam.subject}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {exam.exam_type} • {getDaysLabel(exam.exam_date)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs font-semibold text-[#4E1F6E]">
                        {formatExamDate(exam.exam_date)}
                      </span>
                      <button
                        type="button"
                        onClick={() => openConfirm(exam)}
                        disabled={isRemoving}
                        aria-label="Delete exam"
                        className="text-gray-300 transition-colors hover:text-red-500 disabled:cursor-default disabled:hover:text-gray-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
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

      <DeleteConfirmModal
        isOpen={!!confirmExam}
        title="Delete Exam?"
        itemName={confirmExam?.subject || ""}
        warningText="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isConfirmLoading}
        error={confirmError}
        onConfirm={confirmDelete}
        onCancel={cancelConfirm}
      />
    </>
  );
}

export default UpcomingExamsCard;
