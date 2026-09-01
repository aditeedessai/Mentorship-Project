import React, { useState, useEffect, useMemo } from "react";
import PlannerHeader from "../components/planner/PlannerHeader";
import PlannerSummary from "../components/planner/PlannerSummary";
import PlannerCalendar from "../components/planner/PlannerCalendar";
import DailySchedule from "../components/planner/DailySchedule";
import UpcomingExams from "../components/planner/UpcomingExams";
import WeeklyPlan from "../components/planner/WeeklyPlan";
import AddTaskModal from "../components/planner/AddTaskModal";
import AddExamModal from "../components/planner/AddExamModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";

import {
  fetchExams,
  createExam,
  deleteExam,
  fetchStudySets,
  fetchTasks,
  createTask,
  toggleTaskCompletion,
  deleteTask,
  fetchStudiedDays,
} from "../services/api";

function formatBackendTask(t) {
  const priority = t.priority ? t.priority.charAt(0).toUpperCase() + t.priority.slice(1) : "Medium";
  const type = t.task_type ? t.task_type.charAt(0).toUpperCase() + t.task_type.slice(1) : "Study";
  const studySetName = t.study_set_name || "General Study";

  return {
    id: t.id,
    title: t.name,
    subject: studySetName,
    studySet: studySetName,
    studySetId: t.study_set_id || null,
    date: t.due_date,
    time: t.due_time ? t.due_time.substring(0, 5) : "10:00",
    type,
    priority,
    completed: !!t.completed,
  };
}

export default function PlannerPage({ onNavigate, studySets = [] }) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [tasks, setTasks] = useState([]);
  const [completedTodayCount, setCompletedTodayCount] = useState(0);
  const [studyStreakDays, setStudyStreakDays] = useState(0);

  const [exams, setExams] = useState([]);
  const [userStudySets, setUserStudySets] = useState(studySets);

  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [filterStatus, setFilterStatus] = useState("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddExamModalOpen, setIsAddExamModalOpen] = useState(false);

  const [deletingTask, setDeletingTask] = useState(null);
  const [isDeleteTaskLoading, setIsDeleteTaskLoading] = useState(false);
  const [deleteTaskError, setDeleteTaskError] = useState(null);

  // Single mount effect to fetch all initial page data safely without infinite loops
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch user study sets if not passed via props
    if (studySets && studySets.length > 0) {
      setUserStudySets(studySets);
    } else {
      fetchStudySets()
        .then((sets) => {
          if (isMounted) setUserStudySets(sets || []);
        })
        .catch((err) => console.warn("Could not fetch user study sets for planner:", err));
    }

    // 2. Fetch upcoming exams
    setIsLoadingExams(true);
    fetchExams()
      .then((data) => {
        if (isMounted && Array.isArray(data)) setExams(data);
      })
      .catch((err) => {
        console.warn("Could not load backend exams:", err);
        if (isMounted) setExams([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingExams(false);
      });

    // 3. Fetch all tasks for the user
    setIsLoadingTasks(true);
    fetchTasks()
      .then((backendTasks) => {
        if (isMounted && Array.isArray(backendTasks)) {
          setTasks(backendTasks.map(formatBackendTask));
        } else if (isMounted) {
          setTasks([]);
        }
      })
      .catch((err) => {
        console.warn("Could not load backend tasks:", err);
        if (isMounted) setTasks([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingTasks(false);
      });

    // 4. Fetch studied days for study streak
    const now = new Date();
    fetchStudiedDays(now.getFullYear(), now.getMonth() + 1)
      .then((studiedDays) => {
        if (isMounted && Array.isArray(studiedDays)) {
          setStudyStreakDays(studiedDays.length);
        }
      })
      .catch((err) => {
        console.warn("Could not load studied days:", err);
        if (isMounted) setStudyStreakDays(0);
      });

    return () => {
      isMounted = false;
    };
  }, []); // Run ONCE on mount

  // Compute dynamic summary counts strictly from live data
  const tasksToday = useMemo(() => {
    return tasks.filter((t) => t.date === todayStr);
  }, [tasks, todayStr]);

  const tasksTodayCount = tasksToday.length;
  const upcomingExamsCount = exams.length;

  // Toggle task completion
  const handleToggleTaskComplete = async (taskId) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const willBeCompleted = !targetTask.completed;

    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === taskId ? { ...t, completed: willBeCompleted } : t
      )
    );

    if (willBeCompleted) {
      setCompletedTodayCount((prev) => prev + 1);
    } else {
      setCompletedTodayCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await toggleTaskCompletion(taskId, willBeCompleted);
    } catch (err) {
      console.warn("Backend toggleTaskCompletion failed, reverting state:", err);
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === taskId ? { ...t, completed: targetTask.completed } : t
        )
      );
      if (willBeCompleted) {
        setCompletedTodayCount((prev) => Math.max(0, prev - 1));
      } else {
        setCompletedTodayCount((prev) => prev + 1);
      }
    }
  };

  // Add new task via Backend API
  const handleAddTask = async (newTaskData) => {
    try {
      let studySetId = newTaskData.studySetId || null;
      if (!studySetId && newTaskData.studySet && Array.isArray(userStudySets)) {
        const found = userStudySets.find(
          (s) => (typeof s === "object" ? s.name : s) === newTaskData.studySet
        );
        if (found && typeof found === "object") {
          studySetId = found.study_set_id || found.id;
        }
      }

      const created = await createTask({
        name: newTaskData.title,
        priority: newTaskData.priority || "Medium",
        dueDate: newTaskData.date || todayStr,
        dueTime: newTaskData.time || undefined,
        studySetId: studySetId || undefined,
        taskType: newTaskData.type || "Study",
      });

      const formattedTask = formatBackendTask(created);

      setTasks((prevTasks) => [formattedTask, ...prevTasks]);
      if (formattedTask.date) {
        setSelectedDate(formattedTask.date);
      }
    } catch (err) {
      console.warn("API createTask failed, adding to local state fallback:", err);
      const fallbackTask = {
        id: `task-${Date.now()}`,
        ...newTaskData,
        completed: false,
      };
      setTasks((prevTasks) => [fallbackTask, ...prevTasks]);
    }
  };

  // Add new exam via Backend API
  const handleAddExam = async (newExamData) => {
    try {
      const created = await createExam(
        newExamData.subject,
        newExamData.examType || "Exam",
        newExamData.examDate,
        newExamData.studySetId || undefined
      );

      setExams((prevExams) => {
        const next = [...prevExams];
        const insertAt = next.findIndex((e) => e.exam_date > created.exam_date);
        if (insertAt === -1) next.push(created);
        else next.splice(insertAt, 0, created);
        return next;
      });
    } catch (err) {
      console.warn("API createExam failed:", err);
    }
  };

  // Delete exam via Backend API
  const handleDeleteExam = async (examId) => {
    try {
      await deleteExam(examId);
    } catch (err) {
      console.warn("API deleteExam failed:", err);
    } finally {
      setExams((prevExams) => prevExams.filter((e) => e.id !== examId));
    }
  };

  // Open confirmation modal for deleting a task
  const handleOpenDeleteTaskConfirm = (taskId) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (targetTask) {
      setDeletingTask(targetTask);
      setDeleteTaskError(null);
    }
  };

  // Confirm delete task via Backend API
  const handleConfirmDeleteTask = async () => {
    if (!deletingTask) return;

    setIsDeleteTaskLoading(true);
    setDeleteTaskError(null);
    try {
      await deleteTask(deletingTask.id);
      setTasks((prevTasks) => prevTasks.filter((t) => t.id !== deletingTask.id));
      setDeletingTask(null);
    } catch (err) {
      console.warn("API deleteTask failed:", err);
      setDeleteTaskError("Could not delete task. Please try again.");
    } finally {
      setIsDeleteTaskLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 transition-all duration-300">
      {/* 1. Page Header */}
      <PlannerHeader
        onAddTask={() => setIsAddModalOpen(true)}
        onAddExam={() => setIsAddExamModalOpen(true)}
      />

      {/* 2. Summary Metric Cards (Pure Live Data Only) */}
      <PlannerSummary
        tasksTodayCount={tasksTodayCount}
        completedTodayCount={completedTodayCount}
        upcomingExamsCount={upcomingExamsCount}
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
            onDeleteTask={handleOpenDeleteTaskConfirm}
            onAddTaskClick={() => setIsAddModalOpen(true)}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
          />
        </div>
      </div>

      {/* 4. Upcoming Exams Connected to Backend (Actual Database Data Only) */}
      <UpcomingExams
        exams={exams}
        studySets={userStudySets}
        isLoading={isLoadingExams}
        onAddExamClick={() => setIsAddExamModalOpen(true)}
        onDeleteExam={handleDeleteExam}
        onNavigate={onNavigate}
      />

      {/* 5. This Week's Plan */}
      <WeeklyPlan
        selectedDate={selectedDate}
        tasks={tasks}
        exams={exams}
        onSelectDate={setSelectedDate}
        onToggleTaskComplete={handleToggleTaskComplete}
      />

      {/* Add Task Modal Dialog */}
      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTask={handleAddTask}
        defaultDate={selectedDate}
        studySets={userStudySets}
      />

      {/* Add Exam Modal Dialog */}
      <AddExamModal
        isOpen={isAddExamModalOpen}
        onClose={() => setIsAddExamModalOpen(false)}
        onAddExam={handleAddExam}
        studySets={userStudySets}
      />

      {/* Delete Task Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingTask}
        title="Delete Study Task?"
        itemName={deletingTask?.title || deletingTask?.name || ""}
        warningText="This action will permanently delete this task from your study schedule."
        confirmText="Delete Task"
        cancelText="Cancel"
        isLoading={isDeleteTaskLoading}
        error={deleteTaskError}
        onConfirm={handleConfirmDeleteTask}
        onCancel={() => {
          if (!isDeleteTaskLoading) {
            setDeletingTask(null);
            setDeleteTaskError(null);
          }
        }}
      />
    </div>
  );
}

