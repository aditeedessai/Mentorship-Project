import React, { useState, useMemo } from "react";
import PlannerHeader from "../components/planner/PlannerHeader";
import PlannerSummary from "../components/planner/PlannerSummary";
import PlannerCalendar from "../components/planner/PlannerCalendar";
import DailySchedule from "../components/planner/DailySchedule";
import UpcomingExams from "../components/planner/UpcomingExams";
import WeeklyPlan from "../components/planner/WeeklyPlan";
import AddTaskModal from "../components/planner/AddTaskModal";
import AddExamModal from "../components/planner/AddExamModal";

import { INITIAL_TASKS, INITIAL_EXAMS } from "../data/plannerData";

export default function PlannerPage({ onNavigate, studySets = [] }) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [exams, setExams] = useState(INITIAL_EXAMS);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddExamModalOpen, setIsAddExamModalOpen] = useState(false);

  // Compute dynamic summary counts
  const tasksToday = useMemo(() => {
    return tasks.filter((t) => t.date === todayStr);
  }, [tasks, todayStr]);

  const tasksTodayCount = tasksToday.length;
  const completedTodayCount = tasksToday.filter((t) => t.completed).length;
  const upcomingExamsCount = exams.length;
  const studyStreakDays = 5;

  // Toggle task completion
  const handleToggleTaskComplete = (taskId) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      )
    );
  };

  // Add new task
  const handleAddTask = (newTaskData) => {
    const newTask = {
      id: `task-${Date.now()}`,
      ...newTaskData,
      completed: false,
    };
    setTasks((prevTasks) => [newTask, ...prevTasks]);
    if (newTaskData.date) {
      setSelectedDate(newTaskData.date);
    }
  };

  // Add new exam
  const handleAddExam = (newExamData) => {
    const newExam = {
      id: `exam-${Date.now()}`,
      name: `${newExamData.subject} ${newExamData.examType || "Exam"}`,
      subject: newExamData.subject,
      exam_date: newExamData.examDate,
      preparation_pct: 0,
      study_set_id: newExamData.studySetId || null,
    };
    setExams((prevExams) => [newExam, ...prevExams]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 transition-all duration-300">
      {/* 1. Page Header */}
      <PlannerHeader onAddTask={() => setIsAddModalOpen(true)} />

      {/* 2. Summary Metric Cards */}
      <PlannerSummary
        tasksTodayCount={tasksTodayCount}
        completedTodayCount={completedTodayCount}
        upcomingExamsCount={upcomingExamsCount}
        studyStreakDays={studyStreakDays}
      />

      {/* 3. Main Grid: Monthly Calendar + Daily Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Monthly Calendar (7 cols on desktop) */}
        <div className="lg:col-span-7 w-full">
          <PlannerCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            tasks={tasks}
            exams={exams}
          />
        </div>

        {/* Selected Date Schedule (5 cols on desktop) */}
        <div className="lg:col-span-5 w-full">
          <DailySchedule
            selectedDate={selectedDate}
            tasks={tasks}
            onToggleTaskComplete={handleToggleTaskComplete}
            onAddTaskClick={() => setIsAddModalOpen(true)}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
            filterSubject={filterSubject}
            onFilterSubjectChange={setFilterSubject}
          />
        </div>
      </div>

      {/* 4. Upcoming Exams */}
      <UpcomingExams
        exams={exams}
        onAddExamClick={() => setIsAddExamModalOpen(true)}
        onNavigate={onNavigate}
      />

      {/* 5. This Week's Plan */}
      <WeeklyPlan
        selectedDate={selectedDate}
        tasks={tasks}
        onSelectDate={setSelectedDate}
        onToggleTaskComplete={handleToggleTaskComplete}
      />

      {/* Add Task Modal Dialog */}
      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTask={handleAddTask}
        defaultDate={selectedDate}
        studySets={studySets}
      />

      {/* Add Exam Modal Dialog */}
      <AddExamModal
        isOpen={isAddExamModalOpen}
        onClose={() => setIsAddExamModalOpen(false)}
        onAddExam={handleAddExam}
        studySets={studySets}
      />
    </div>
  );
}
