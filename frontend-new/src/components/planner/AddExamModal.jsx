import React, { useState } from "react";
import { X, Award, AlertCircle, Plus } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const EXAM_TYPES = ["Exam", "Test", "Midterm", "Finals", "Quiz"];

export default function AddExamModal({ isOpen, onClose, onAddExam, studySets = [] }) {
  const { isDarkMode } = useTheme();

  const [subject, setSubject] = useState("");
  const [examType, setExamType] = useState("Exam");
  const [examDate, setExamDate] = useState("");
  const [studySetId, setStudySetId] = useState("");

  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedSubject = subject.trim();

    if (!trimmedSubject) {
      setError("Please enter an exam subject.");
      return;
    }

    if (!examDate) {
      setError("Please select an exam date.");
      return;
    }

    if (onAddExam) {
      onAddExam({
        subject: trimmedSubject,
        examType,
        examDate,
        studySetId,
      });
    }

    // Reset form
    setSubject("");
    setExamType("Exam");
    setExamDate("");
    setStudySetId("");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-lg rounded-3xl border p-6 sm:p-8 backdrop-blur-2xl shadow-2xl transition-all duration-300 ${
          isDarkMode
            ? "border-white/10 bg-[#17131F] text-[#F3F0F8]"
            : "border-white/80 bg-white text-[#292530]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-inherit pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8064C7] text-white">
              <Plus size={20} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-bold tracking-tight">Add Upcoming Exam</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`flex h-8 w-8 items-center justify-center rounded-xl border transition ${
              isDarkMode
                ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
            }`}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Error Banner */}
        {error && (
          <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-400 font-bold">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Exam Subject */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
              Exam Subject <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Calculus II"
              className={`w-full rounded-2xl border px-4 py-3 text-xs sm:text-sm font-semibold focus:outline-none transition ${
                isDarkMode
                  ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7]"
                  : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#8064C7]"
              }`}
            />
          </div>

          {/* Exam Type & Date (Row) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                Exam Type
              </label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className={`w-full rounded-2xl border px-3.5 py-3 text-xs sm:text-sm font-semibold focus:outline-none transition ${
                  isDarkMode
                    ? "border-white/10 bg-[#14101D] text-white focus:border-[#8064C7]"
                    : "border-gray-200 bg-white text-gray-900 focus:border-[#8064C7]"
                }`}
              >
                {EXAM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full rounded-2xl border px-3.5 py-3 text-xs sm:text-sm font-semibold focus:outline-none transition ${
                  isDarkMode
                    ? "border-white/10 bg-white/5 text-white focus:border-[#8064C7]"
                    : "border-gray-200 bg-white text-gray-900 focus:border-[#8064C7]"
                }`}
              />
            </div>
          </div>

          {/* Linked Study Set */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
              Linked Study Set (Optional)
            </label>
            <select
              value={studySetId}
              onChange={(e) => setStudySetId(e.target.value)}
              className={`w-full rounded-2xl border px-3.5 py-3 text-xs sm:text-sm font-semibold focus:outline-none transition ${
                isDarkMode
                  ? "border-white/10 bg-[#14101D] text-white focus:border-[#8064C7]"
                  : "border-gray-200 bg-white text-gray-900 focus:border-[#8064C7]"
              }`}
            >
              <option value="">No linked study set</option>
              {studySets.map((set) => (
                <option key={set.study_set_id || set.id} value={set.study_set_id || set.id}>
                  {typeof set === "object" ? set.name : set}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-inherit mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl border px-5 py-2.5 text-xs font-bold transition ${
                isDarkMode
                  ? "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#8064C7] hover:bg-[#8B6DD4] px-6 py-2.5 text-xs font-bold text-white shadow-md transition"
            >
              Add Exam
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
