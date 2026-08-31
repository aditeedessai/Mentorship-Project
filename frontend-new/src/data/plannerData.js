// Centralized mock data structure for the Study Planner

export const TASK_TYPES = {
  Study: { label: "Study", color: "purple", iconName: "BookOpen" },
  Practice: { label: "Practice", color: "blue", iconName: "Target" },
  Revision: { label: "Revision", color: "emerald", iconName: "RotateCcw" },
  "Mock Test": { label: "Mock Test", color: "amber", iconName: "FileText" },
  Assignment: { label: "Assignment", color: "rose", iconName: "CheckSquare" },
};

export const PRIORITIES = {
  High: { label: "High", color: "rose" },
  Medium: { label: "Medium", color: "amber" },
  Low: { label: "Low", color: "emerald" },
};

export const DEFAULT_STUDY_SETS = [
  "Biology Fundamentals",
  "Physics Mechanics",
  "Organic Chemistry",
  "Calculus & Algebra",
  "Computer Science & Algos",
  "General Science",
];

// Fallback alias for backward compatibility
export const SUBJECT_OPTIONS = DEFAULT_STUDY_SETS;

export const INITIAL_EXAMS = [
  {
    id: "exam-1",
    name: "Physics Mid-Term",
    subject: "Physics Mechanics",
    exam_date: "2026-09-12",
    preparation_pct: 70,
  },
  {
    id: "exam-2",
    name: "Mathematics Final",
    subject: "Calculus & Algebra",
    exam_date: "2026-09-21",
    preparation_pct: 25,
  },
  {
    id: "exam-3",
    name: "Organic Chemistry Quiz",
    subject: "Organic Chemistry",
    exam_date: "2026-09-04",
    preparation_pct: 85,
  },
];

export const INITIAL_TASKS = [
  {
    id: "task-1",
    title: "Revise Biology – Cell Division",
    studySet: "Biology Fundamentals",
    subject: "Biology Fundamentals",
    date: "2026-08-31",
    time: "09:00",
    type: "Revision",
    priority: "High",
    completed: false,
  },
  {
    id: "task-2",
    title: "Complete Physics MCQs",
    studySet: "Physics Mechanics",
    subject: "Physics Mechanics",
    date: "2026-08-31",
    time: "11:30",
    type: "Practice",
    priority: "Medium",
    completed: true,
  },
  {
    id: "task-3",
    title: "Review Chapter 4 Organic Chemistry",
    studySet: "Organic Chemistry",
    subject: "Organic Chemistry",
    date: "2026-08-31",
    time: "16:00",
    type: "Study",
    priority: "High",
    completed: false,
  },
  {
    id: "task-4",
    title: "Solve Calculus Integration Problems",
    studySet: "Calculus & Algebra",
    subject: "Calculus & Algebra",
    date: "2026-08-31",
    time: "18:30",
    type: "Practice",
    priority: "Low",
    completed: false,
  },
  {
    id: "task-5",
    title: "Physics Kinematics Mock Test",
    studySet: "Physics Mechanics",
    subject: "Physics Mechanics",
    date: "2026-09-01",
    time: "10:00",
    type: "Mock Test",
    priority: "High",
    completed: false,
  },
  {
    id: "task-6",
    title: "Chemistry Lab Report Assignment",
    studySet: "Organic Chemistry",
    subject: "Organic Chemistry",
    date: "2026-09-02",
    time: "14:00",
    type: "Assignment",
    priority: "Medium",
    completed: false,
  },
  {
    id: "task-7",
    title: "Biology Plant Physiology Reading",
    studySet: "Biology Fundamentals",
    subject: "Biology Fundamentals",
    date: "2026-09-04",
    time: "11:00",
    type: "Study",
    priority: "Medium",
    completed: false,
  },
  {
    id: "task-8",
    title: "Data Structures Sorting Algorithms Revision",
    studySet: "Computer Science & Algos",
    subject: "Computer Science & Algos",
    date: "2026-08-30",
    time: "15:00",
    type: "Revision",
    priority: "High",
    completed: true,
  },
  {
    id: "task-9",
    title: "Math Trigonometry Practice Sheet",
    studySet: "Calculus & Algebra",
    subject: "Calculus & Algebra",
    date: "2026-08-30",
    time: "17:00",
    type: "Practice",
    priority: "Low",
    completed: true,
  },
];
