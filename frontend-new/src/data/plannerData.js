// Data constants for the Study Planner

export const TASK_TYPES = {
  Study: { label: "Study", color: "purple", iconName: "BookOpen" },
  Practice: { label: "Practice", color: "blue", iconName: "Target" },
  Revision: { label: "Revision", color: "emerald", iconName: "RotateCcw" },
  "Mock Test": { label: "Mock Test", color: "amber", iconName: "FileText" },
  Assignment: { label: "Assignment", color: "rose", iconName: "CheckSquare" },
};

// UI label <-> backend task_type value. Must stay in sync with TaskType in
// backend/api/schemas/task.py and the tasks.task_type CHECK constraint.
const TASK_TYPE_API_VALUES = {
  Study: "study",
  Practice: "practice",
  Revision: "revision",
  "Mock Test": "mock_test",
  Assignment: "assignment",
};

// Older values still accepted by the backend, shown under the closest UI type.
const LEGACY_API_TYPES = {
  review: "Revision",
  quiz: "Mock Test",
  other: "Study",
};

export function toApiTaskType(label) {
  return TASK_TYPE_API_VALUES[label] || "study";
}

export function fromApiTaskType(value) {
  const match = Object.keys(TASK_TYPE_API_VALUES).find(
    (label) => TASK_TYPE_API_VALUES[label] === value
  );
  return match || LEGACY_API_TYPES[value] || "Study";
}

export const PRIORITIES = {
  High: { label: "High", color: "rose" },
  Medium: { label: "Medium", color: "amber" },
  Low: { label: "Low", color: "emerald" },
};
