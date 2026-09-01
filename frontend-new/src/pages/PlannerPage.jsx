import React, { useState, useEffect, useMemo } from "react";
import PlannerHeader from "../components/planner/PlannerHeader";
import PlannerSummary from "../components/planner/PlannerSummary";
import PlannerCalendar from "../components/planner/PlannerCalendar";
import DailySchedule from "../components/planner/DailySchedule";
import UpcomingExams from "../components/planner/UpcomingExams";
import WeeklyPlan from "../components/planner/WeeklyPlan";
import AddTaskModal from "../components/planner/AddTaskModal";
import AddExamModal from "../components/planner/AddExamModal";

import {
  fetchExams,
  createExam,
  deleteExam,
  fetchStudySets,
  fetchTodaysTasks,
  createTask,
  deleteTask,
  fetchStudiedDays,
} from "../services/api";

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

    // 3. Fetch tasks due today
    setIsLoadingTasks(true);
    fetchTodaysTasks()
      .then((backendTasks) => {
        if (isMounted && Array.isArray(backendTasks)) {
          const mappedTasks = backendTasks.map((t) => ({
            id: t.id,
            title: t.name,
            subject: t.subject || "General Study",
            studySet: t.subject || "General Study",
            date: t.due_date || todayStr,
            time: "10:00",
            type: "Study",
            priority: t.priority || "Medium",
            completed: false,
          }));
          setTasks(mappedTasks);
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
      // Call backend delete task if completing persistent backend task
      try {
        await deleteTask(taskId);
      } catch (err) {
        console.warn("Backend deleteTask failed:", err);
      }
    } else {
      setCompletedTodayCount((prev) => Math.max(0, prev - 1));
    }
  };

  // Add new task via Backend API
  const handleAddTask = async (newTaskData) => {
    try {
      const created = await createTask(
        newTaskData.title,
        newTaskData.priority || "Medium",
        newTaskData.date || todayStr
      );

      const formattedTask = {
        id: created.id || `task-${Date.now()}`,
        title: created.name || newTaskData.title,
        subject: newTaskData.studySet || newTaskData.subject || "General Study",
        studySet: newTaskData.studySet || newTaskData.subject || "General Study",
        date: created.due_date || newTaskData.date || todayStr,
        time: newTaskData.time || "10:00",
        type: newTaskData.type || "Study",
        priority: created.priority || newTaskData.priority || "Medium",
        completed: false,
      };

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
    </div>
  );
}
