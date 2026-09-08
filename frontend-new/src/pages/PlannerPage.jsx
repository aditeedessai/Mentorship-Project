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
  fetchRevisionsDue,
} from "../services/api";

// Backend question_type -> frontend type id
function toFrontendQuestionTypeId(backendType) {
  return backendType === "short" ? "short-answer" : backendType;
}

function formatBackendTask(t) {
  const priority = t.priority
    ? t.priority.charAt(0).toUpperCase() + t.priority.slice(1)
    : "Medium";

  const type = t.task_type
    ? t.task_type.charAt(0).toUpperCase() + t.task_type.slice(1)
    : "Study";

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
  const [revisionsDue, setRevisionsDue] = useState([]);

  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [filterStatus, setFilterStatus] = useState("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddExamModalOpen, setIsAddExamModalOpen] = useState(false);

  const [deletingTask, setDeletingTask] = useState(null);
  const [isDeleteTaskLoading, setIsDeleteTaskLoading] = useState(false);
  const [deleteTaskError, setDeleteTaskError] = useState(null);

  // =========================================================
  // FETCH DATA
  // =========================================================

  useEffect(() => {
    let isMounted = true;

    if (studySets && studySets.length > 0) {
      setUserStudySets(studySets);
    } else {
      fetchStudySets()
        .then((sets) => {
          if (isMounted) setUserStudySets(sets || []);
        })
        .catch((err) =>
          console.warn(
            "Could not fetch user study sets for planner:",
            err
          )
        );
    }

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

    fetchRevisionsDue()
      .then((due) => {
        if (isMounted) setRevisionsDue(due);
      })
      .catch((err) => {
        console.warn("Could not load revisions due:", err);
        if (isMounted) setRevisionsDue([]);
      });

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
  }, []);

  // =========================================================
  // SUMMARY
  // =========================================================

  const tasksToday = useMemo(() => {
    return tasks.filter((t) => t.date === todayStr);
  }, [tasks, todayStr]);

  const tasksTodayCount = tasksToday.length;
  const upcomingExamsCount = exams.length;

  // =========================================================
  // TASK COMPLETION
  // =========================================================

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
      console.warn(
        "Backend toggleTaskCompletion failed, reverting state:",
        err
      );

      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === taskId
            ? { ...t, completed: targetTask.completed }
            : t
        )
      );

      if (willBeCompleted) {
        setCompletedTodayCount((prev) => Math.max(0, prev - 1));
      } else {
        setCompletedTodayCount((prev) => prev + 1);
      }
    }
  };

  // =========================================================
  // ADD TASK
  // =========================================================

  const handleAddTask = async (newTaskData) => {
    try {
      let studySetId = newTaskData.studySetId || null;

      if (
        !studySetId &&
        newTaskData.studySet &&
        Array.isArray(userStudySets)
      ) {
        const found = userStudySets.find(
          (s) =>
            (typeof s === "object" ? s.name : s) ===
            newTaskData.studySet
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
      console.warn(
        "API createTask failed, adding to local state fallback:",
        err
      );

      const fallbackTask = {
        id: `task-${Date.now()}`,
        ...newTaskData,
        completed: false,
      };

      setTasks((prevTasks) => [fallbackTask, ...prevTasks]);
    }
  };

  // =========================================================
  // ADD EXAM
  // =========================================================

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

        const insertAt = next.findIndex(
          (e) => e.exam_date > created.exam_date
        );

        if (insertAt === -1) {
          next.push(created);
        } else {
          next.splice(insertAt, 0, created);
        }

        return next;
      });
    } catch (err) {
      console.warn("API createExam failed:", err);
    }
  };

  // =========================================================
  // DELETE EXAM
  // =========================================================

  const handleDeleteExam = async (examId) => {
    try {
      await deleteExam(examId);
    } catch (err) {
      console.warn("API deleteExam failed:", err);
    } finally {
      setExams((prevExams) =>
        prevExams.filter((e) => e.id !== examId)
      );
    }
  };

  // =========================================================
  // REVISION
  // =========================================================

  const handleStartRevision = (revision) => {
    onNavigate?.("quiz", {
      studySetId: revision.study_set_id,
      preselectType: toFrontendQuestionTypeId(
        revision.question_type
      ),
    });
  };

  // =========================================================
  // DELETE TASK
  // =========================================================

  const handleOpenDeleteTaskConfirm = (taskId) => {
    const targetTask = tasks.find((t) => t.id === taskId);

    if (targetTask) {
      setDeletingTask(targetTask);
      setDeleteTaskError(null);
    }
  };

  const handleConfirmDeleteTask = async () => {
    if (!deletingTask) return;

    setIsDeleteTaskLoading(true);
    setDeleteTaskError(null);

    try {
      await deleteTask(deletingTask.id);

      setTasks((prevTasks) =>
        prevTasks.filter((t) => t.id !== deletingTask.id)
      );

      setDeletingTask(null);
    } catch (err) {
      console.warn("API deleteTask failed:", err);
      setDeleteTaskError(
        "Could not delete task. Please try again."
      );
    } finally {
      setIsDeleteTaskLoading(false);
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <>
      {/* =====================================================
          PLANNER ANIMATION SYSTEM
          Only animation CSS — no colors/layout/functionality changed.
      ===================================================== */}
      <style>{`
        /* ================================
           PAGE ENTRANCE
        ================================= */

        .planner-page {
          animation: plannerPageIn 0.7s cubic-bezier(.22,1,.36,1) both;
        }

        @keyframes plannerPageIn {
          from {
            opacity: 0;
            transform: scale(0.985);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* ================================
           HEADER
        ================================= */

        .planner-header-animated {
          animation:
            plannerHeaderIn 0.85s cubic-bezier(.16,1,.3,1) both;
          transform-origin: center top;
        }

        @keyframes plannerHeaderIn {
          0% {
            opacity: 0;
            transform: translateY(-28px) scale(.97);
            filter: blur(5px);
          }

          70% {
            opacity: 1;
            transform: translateY(4px) scale(1.01);
            filter: blur(0);
          }

          100% {
            transform: translateY(0) scale(1);
          }
        }

        /* ================================
           SUMMARY = POPPING METRICS
        ================================= */

        .planner-summary-animated > * {
          animation: metricPop .65s cubic-bezier(.34,1.56,.64,1) both;
        }

        .planner-summary-animated > *:nth-child(1) {
          animation-delay: .18s;
        }

        .planner-summary-animated > *:nth-child(2) {
          animation-delay: .30s;
        }

        .planner-summary-animated > *:nth-child(3) {
          animation-delay: .42s;
        }

        @keyframes metricPop {
          from {
            opacity: 0;
            transform: translateY(24px) scale(.82);
          }

          70% {
            transform: translateY(-5px) scale(1.025);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* ================================
           MAIN PLANNER GRID
        ================================= */

        .planner-main-grid {
          perspective: 1200px;
        }

        /* CALENDAR enters like a planning board */

        .planner-calendar-animated {
          animation:
            calendarReveal .9s cubic-bezier(.16,1,.3,1) .45s both;
          transform-origin: left center;
        }

        @keyframes calendarReveal {
          from {
            opacity: 0;
            transform:
              translateX(-45px)
              rotateY(7deg)
              scale(.96);
          }

          to {
            opacity: 1;
            transform:
              translateX(0)
              rotateY(0)
              scale(1);
          }
        }

        /* SCHEDULE enters independently from right */

        .planner-schedule-animated {
          animation:
            scheduleReveal .9s cubic-bezier(.16,1,.3,1) .58s both;
          transform-origin: right center;
        }

        @keyframes scheduleReveal {
          from {
            opacity: 0;
            transform:
              translateX(45px)
              rotateY(-7deg)
              scale(.96);
          }

          to {
            opacity: 1;
            transform:
              translateX(0)
              rotateY(0)
              scale(1);
          }
        }

        /* ================================
           CALENDAR SPECIAL EFFECT
        ================================= */

        .planner-calendar-animated {
          position: relative;
        }

        .planner-calendar-animated::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          opacity: 0;
          box-shadow:
            0 0 0 1px rgba(128,100,199,.12),
            0 0 35px rgba(128,100,199,.08);
          animation: calendarGlow 2.8s ease-in-out 1.2s infinite;
        }

        @keyframes calendarGlow {
          0%, 100% {
            opacity: 0;
          }

          50% {
            opacity: 1;
          }
        }

        /* ================================
           UPCOMING EXAMS
        ================================= */

        .planner-exams-animated {
          animation:
            sectionRise .8s cubic-bezier(.16,1,.3,1) .7s both;
        }

        @keyframes sectionRise {
          from {
            opacity: 0;
            transform: translateY(35px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ================================
           WEEKLY PLAN
        ================================= */

        .planner-weekly-animated {
          animation:
            weeklyReveal .9s cubic-bezier(.16,1,.3,1) .82s both;
          transform-origin: center bottom;
        }

        @keyframes weeklyReveal {
          from {
            opacity: 0;
            transform: translateY(45px) scale(.97);
          }

          70% {
            transform: translateY(-3px) scale(1.005);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* ================================
           HOVER EFFECTS
           Different from dashboard/cards.
        ================================= */

        .planner-interactive {
          transition:
            transform .3s cubic-bezier(.22,1,.36,1),
            filter .3s ease;
        }

        .planner-interactive:hover {
          transform: translateY(-3px);
        }

        /* ================================
           LITTLE CALENDAR ENERGY
        ================================= */

        .planner-calendar-animated:hover::after {
          animation-duration: 1.4s;
        }

        /* ================================
           REDUCED MOTION
        ================================= */

        @media (prefers-reduced-motion: reduce) {
          .planner-page,
          .planner-header-animated,
          .planner-summary-animated > *,
          .planner-calendar-animated,
          .planner-schedule-animated,
          .planner-exams-animated,
          .planner-weekly-animated {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
          }

          .planner-calendar-animated::after {
            animation: none !important;
          }
        }
      `}</style>

      <div className="planner-page max-w-7xl mx-auto space-y-6 pb-12 transition-all duration-300">

        {/* =====================================================
            1. HEADER
        ===================================================== */}
        <div className="planner-header-animated">
          <PlannerHeader
            onAddTask={() => setIsAddModalOpen(true)}
            onAddExam={() => setIsAddExamModalOpen(true)}
          />
        </div>

        {/* =====================================================
            2. SUMMARY
        ===================================================== */}
        <div className="planner-summary-animated">
          <PlannerSummary
            tasksTodayCount={tasksTodayCount}
            completedTodayCount={completedTodayCount}
            upcomingExamsCount={upcomingExamsCount}
          />
        </div>

        {/* =====================================================
            3. CALENDAR + DAILY SCHEDULE
        ===================================================== */}
        <div className="planner-main-grid grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* CALENDAR */}
          <div className="planner-calendar-animated lg:col-span-7 w-full planner-interactive">
            <PlannerCalendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              tasks={tasks}
              exams={exams}
              revisionsDue={revisionsDue}
            />
          </div>

          {/* DAILY SCHEDULE */}
          <div className="planner-schedule-animated lg:col-span-5 w-full planner-interactive">
            <DailySchedule
              selectedDate={selectedDate}
              tasks={tasks}
              revisionsDue={revisionsDue}
              onToggleTaskComplete={handleToggleTaskComplete}
              onDeleteTask={handleOpenDeleteTaskConfirm}
              onStartRevision={handleStartRevision}
              onAddTaskClick={() => setIsAddModalOpen(true)}
              filterStatus={filterStatus}
              onFilterStatusChange={setFilterStatus}
            />
          </div>
        </div>

        {/* =====================================================
            4. UPCOMING EXAMS
        ===================================================== */}
        <div className="planner-exams-animated">
          <UpcomingExams
            exams={exams}
            studySets={userStudySets}
            isLoading={isLoadingExams}
            onAddExamClick={() => setIsAddExamModalOpen(true)}
            onDeleteExam={handleDeleteExam}
            onNavigate={onNavigate}
          />
        </div>

        {/* =====================================================
            5. WEEKLY PLAN
        ===================================================== */}
        <div className="planner-weekly-animated">
          <WeeklyPlan
            selectedDate={selectedDate}
            tasks={tasks}
            exams={exams}
            revisionsDue={revisionsDue}
            onSelectDate={setSelectedDate}
            onToggleTaskComplete={handleToggleTaskComplete}
            onStartRevision={handleStartRevision}
          />
        </div>

        {/* =====================================================
            MODALS
        ===================================================== */}

        <AddTaskModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddTask={handleAddTask}
          defaultDate={selectedDate}
          studySets={userStudySets}
        />

        <AddExamModal
          isOpen={isAddExamModalOpen}
          onClose={() => setIsAddExamModalOpen(false)}
          onAddExam={handleAddExam}
          studySets={userStudySets}
        />

        <DeleteConfirmModal
          isOpen={!!deletingTask}
          title="Delete Study Task?"
          itemName={
            deletingTask?.title ||
            deletingTask?.name ||
            ""
          }
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
    </>
  );
}