import React, { useState } from "react";
import { Award, Clock, ArrowRight, BookOpen, Calculator, Atom, Brain, Plus, Trash2, Loader2 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import DeleteConfirmModal from "../DeleteConfirmModal";

const getSubjectIcon = (subject) => {
  const name = (subject || "").toLowerCase();
  if (name.includes("calc") || name.includes("math")) return Calculator;
  if (name.includes("phys") || name.includes("atom") || name.includes("chem")) return Atom;
  if (name.includes("psych") || name.includes("brain")) return Brain;
  return BookOpen;
};

function getDaysRemaining(examDateStr) {
  if (!examDateStr) return "Upcoming";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${examDateStr}T00:00:00`);
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  return `${diffDays} day${diffDays === 1 ? "" : "s"} left`;
}

function formatDate(examDateStr) {
  if (!examDateStr) return "N/A";
  return new Date(`${examDateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function UpcomingExams({ exams = [], studySets = [], onAddExamClick, onDeleteExam, onNavigate, isLoading = false }) {
  const { isDarkMode } = useTheme();

  const [confirmExam, setConfirmExam] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirmExam || !onDeleteExam) return;
    setIsDeleting(true);
    try {
      await onDeleteExam(confirmExam.id);
      setConfirmExam(null);
    } catch (err) {
      console.error("Delete exam error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        className={`rounded-3xl border p-4 sm:p-6 backdrop-blur-2xl transition-all duration-300 ${
          isDarkMode
            ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
        }`}
      >
        {/* Header with Title and Plus Add Button */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                isDarkMode ? "bg-white/5 text-[#A78BFA]" : "bg-[#8064C7]/10 text-[#8064C7]"
              }`}
            >
              <Award size={20} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight">Upcoming Exams</h3>
              <p className={`text-xs ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                Target dates & prep status
              </p>
            </div>
          </div>

          {/* Plus Button to open Add Exam Modal */}
          <button
            type="button"
            onClick={onAddExamClick}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8064C7] text-white shadow-[0_10px_25px_rgba(128,100,199,0.3)] transition-all duration-300 hover:bg-[#8B6DD4] hover:scale-105 active:scale-95 cursor-pointer"
            aria-label="Add exam"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs font-semibold opacity-60">
            <Loader2 size={16} className="animate-spin text-[#8064C7]" />
            Loading upcoming exams...
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-8">
            <p className={`text-xs font-semibold ${isDarkMode ? "text-white/40" : "text-gray-400"}`}>
              No upcoming exams scheduled. Click + to add your first exam!
            </p>
          </div>
        ) : (
          /* Exam Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exams.map((exam) => {
              // Look up study set name if study_set_id is present
              const linkedSet = studySets.find((s) => (s.study_set_id || s.id) === exam.study_set_id);
              const studySetName = linkedSet
                ? (typeof linkedSet === "object" ? linkedSet.name : linkedSet)
                : null;
              const badgeText = studySetName || exam.subject || "General Study";

              const Icon = getSubjectIcon(badgeText);
              const daysLeftText = getDaysRemaining(exam.exam_date);
              const displayName = exam.name || (exam.exam_type ? `${exam.subject || badgeText} ${exam.exam_type}` : (exam.subject || badgeText));

              return (
                <div
                  key={exam.id}
                  className={`rounded-2xl border p-4 sm:p-5 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between space-y-4 ${
                    isDarkMode
                      ? "border-white/8 bg-white/5 hover:border-white/15"
                      : "border-gray-200/80 bg-white hover:border-gray-300 shadow-xs"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      {/* Purple Study Set Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
                          isDarkMode
                            ? "bg-[#8064C7]/20 text-[#A78BFA] border border-[#8064C7]/30"
                            : "bg-[#8064C7]/10 text-[#8064C7] border border-[#8064C7]/20"
                        }`}
                        title="Study Set"
                      >
                        <Icon size={13} />
                        <span>{badgeText}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <Clock size={11} />
                          <span>{daysLeftText}</span>
                        </span>

                        {onDeleteExam && (
                          <button
                            type="button"
                            onClick={() => setConfirmExam(exam)}
                            className="p-1 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                            aria-label="Delete exam"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="font-bold text-base tracking-tight leading-snug">
                      {displayName}
                    </h4>

                    <p className={`text-xs ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                      Date: {formatDate(exam.exam_date)}
                    </p>
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate("study-sets")}
                    className={`w-full inline-flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition cursor-pointer ${
                      isDarkMode
                        ? "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>View Study Set</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={!!confirmExam}
        title="Delete Exam?"
        itemName={confirmExam?.subject || confirmExam?.name || "this exam"}
        warningText="This exam will be permanently removed."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmExam(null)}
      />
    </>
  );
}
