import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, BookOpen, AlertCircle, Plus } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { TASK_TYPES, PRIORITIES, DEFAULT_STUDY_SETS } from "../../data/plannerData";

export default function AddTaskModal({ isOpen, onClose, onAddTask, defaultDate, studySets = [] }) {
  const { isDarkMode } = useTheme();

  const availableStudySets =
    studySets && studySets.length > 0
      ? studySets.map((s) => (typeof s === "object" ? s.name : s))
      : DEFAULT_STUDY_SETS;

  const [title, setTitle] = useState("");
  const [studySet, setStudySet] = useState(availableStudySets[0] || "Biology Fundamentals");
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("10:00");
  const [type, setType] = useState("Study");
  const [priority, setPriority] = useState("Medium");

  const [error, setError] = useState("");

  useEffect(() => {
    if (defaultDate) {
      setDate(defaultDate);
    }
  }, [defaultDate]);

  useEffect(() => {
    if (availableStudySets.length > 0 && !availableStudySets.includes(studySet)) {
      setStudySet(availableStudySets[0]);
    }
  }, [studySets]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Please enter a task name.");
      return;
    }

    if (!date) {
      setError("Please select a date.");
      return;
    }

    onAddTask({
      title: trimmedTitle,
      studySet,
      subject: studySet,
      date,
      time,
      type,
      priority,
    });

    // Reset form
    setTitle("");
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
            <h3 className="text-xl font-bold tracking-tight">Add New Study Task</h3>
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
          {/* Task Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
              Task Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Revise Physics Chapter 3"
              className={`w-full rounded-2xl border px-4 py-3 text-xs sm:text-sm font-semibold focus:outline-none transition ${
                isDarkMode
                  ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7]"
                  : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#8064C7]"
              }`}
            />
          </div>

          {/* Study Set & Task Type (Row) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                Study Set <span className="text-rose-500">*</span>
              </label>
              <select
                value={studySet}
                onChange={(e) => setStudySet(e.target.value)}
                className={`w-full rounded-2xl border px-3.5 py-3 text-xs sm:text-sm font-semibold focus:outline-none transition ${
                  isDarkMode
                    ? "border-white/10 bg-[#14101D] text-white focus:border-[#8064C7]"
                    : "border-gray-200 bg-white text-gray-900 focus:border-[#8064C7]"
                }`}
              >
                {availableStudySets.map((setName) => (
                  <option key={setName} value={setName}>
                    {setName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                Task Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={`w-full rounded-2xl border px-3.5 py-3 text-xs sm:text-sm font-semibold focus:outline-none transition ${
                  isDarkMode
                    ? "border-white/10 bg-[#14101D] text-white focus:border-[#8064C7]"
                    : "border-gray-200 bg-white text-gray-900 focus:border-[#8064C7]"
                }`}
              >
                {Object.keys(TASK_TYPES).map((typeKey) => (
                  <option key={typeKey} value={typeKey}>
                    {typeKey}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time (Row) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full rounded-2xl border px-3.5 py-3 text-xs sm:text-sm font-semibold focus:outline-none transition ${
                  isDarkMode
                    ? "border-white/10 bg-white/5 text-white focus:border-[#8064C7]"
                    : "border-gray-200 bg-white text-gray-900 focus:border-[#8064C7]"
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
                Time (Optional)
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={`w-full rounded-2xl border px-3.5 py-3 text-xs sm:text-sm font-semibold focus:outline-none transition ${
                  isDarkMode
                    ? "border-white/10 bg-white/5 text-white focus:border-[#8064C7]"
                    : "border-gray-200 bg-white text-gray-900 focus:border-[#8064C7]"
                }`}
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 opacity-80">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(PRIORITIES).map((pKey) => {
                const isSelected = priority === pKey;
                return (
                  <button
                    key={pKey}
                    type="button"
                    onClick={() => setPriority(pKey)}
                    className={`rounded-2xl py-2.5 text-xs font-bold border transition ${
                      isSelected
                        ? "bg-[#8064C7] text-white border-[#8064C7] shadow-xs"
                        : isDarkMode
                        ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {pKey}
                  </button>
                );
              })}
            </div>
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
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
