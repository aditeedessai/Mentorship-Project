import { supabase } from "./supabase";

// ── Backend URL ──────────────────────────────────────────────────────
const API_BASE_URL = "http://127.0.0.1:8001";

// ── Helpers ──────────────────────────────────────────────────────────

async function request(url, options = {}) {
  const headers = { ...options.headers };

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  } catch (err) {
    console.warn("Could not retrieve Supabase session:", err);
  }

  // Don't set JSON content type for FormData uploads
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const fullUrl = `${API_BASE_URL}${url}`;

  const res = await fetch(fullUrl, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `API ${options.method || "GET"} ${fullUrl} → ${res.status}: ${body}`
    );
  }

  return res.json();
}

// ── Question-type mapping ────────────────────────────────────────────
// Frontend "short-answer" ↔ Backend "short"
// Frontend "mcq"         ↔ Backend "mcq"
// Frontend "application" ↔ Backend "application"

function toBackendType(frontendType) {
  if (frontendType === "short-answer") return "short";
  return frontendType;
}

function fromBackendType(backendType) {
  if (backendType === "short") return "short-answer";
  return backendType;
}

// ── Study Sets ───────────────────────────────────────────────────────

export async function fetchStudySets() {
  const data = await request("/api/study-sets");
  return data.study_sets;
}

/**
 * Fetch section-completion progress for all of the current user's study sets.
 * GET /api/study-sets/progress
 */
export async function fetchStudySetProgress() {
  const data = await request("/api/study-sets/progress");
  return data.progress;
}

/**
 * Create a new study set.
 * POST /api/study-sets
 */
export async function createStudySet(name) {
  return request("/api/study-sets", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

/**
 * Fetch a single study set by ID.
 * GET /api/study-sets/{studySetId}
 */
export async function fetchStudySet(studySetId) {
  return request(`/api/study-sets/${studySetId}`);
}
/**
 * Delete a study set.
 * DELETE /api/study-sets/{studySetId}
 */
export async function deleteStudySet(studySetId) {
  return request(`/api/study-sets/${studySetId}`, {
    method: "DELETE",
  });
}

/**
 * Delete every study set owned by the current user.
 * DELETE /api/study-sets/all
 */
export async function deleteAllStudySets() {
  return request("/api/study-sets/all", {
    method: "DELETE",
  });
}

/**
 * Generate summary for a study set.
 * POST /api/study-sets/{studySetId}/summary
 */
export async function generateStudySetSummary(studySetId) {
  return request(`/api/study-sets/${studySetId}/summary`, {
    method: "POST",
  });
}

/**
 * Fetch the previously saved summary for a study set, if one exists.
 * GET /api/study-sets/{studySetId}/summary
 * Returns null if no summary has been generated yet (404).
 */
export async function fetchStudySetSummary(studySetId) {
  try {
    return await request(`/api/study-sets/${studySetId}/summary`);
  } catch (err) {
    if (err.message && err.message.includes("404")) {
      return null;
    }
    throw err;
  }
}

/**
 * Generate flashcards for a study set.
 * POST /api/study-sets/{studySetId}/flashcards
 */
export async function generateStudySetFlashcards(studySetId) {
  return request(`/api/study-sets/${studySetId}/flashcards`, {
    method: "POST",
  });
}

/**
 * Fetch the previously saved flashcards for a study set, if any exist.
 * GET /api/study-sets/{studySetId}/flashcards
 * Returns an empty array if no flashcards have been generated yet (404).
 */
export async function fetchStudySetFlashcards(studySetId) {
  try {
    const data = await request(`/api/study-sets/${studySetId}/flashcards`);
    return data.flashcards || [];
  } catch (err) {
    if (err.message && err.message.includes("404")) {
      return [];
    }
    throw err;
  }
}

/**
 * Generate a contextual mnemonic for a study set.
 * POST /api/study-sets/{studySetId}/mnemonics
 */
export async function generateStudySetMnemonic(studySetId, topic, style = "acronym") {
  return request(`/api/study-sets/${studySetId}/mnemonics`, {
    method: "POST",
    body: JSON.stringify({ topic, style }),
  });
}

// ── Documents ────────────────────────────────────────────────────────

/**
 * Fetch documents for a specific study set.
 * GET /api/study-sets/{studySetId}/documents
 */
export async function fetchStudySetDocuments(studySetId) {
  const data = await request(`/api/study-sets/${studySetId}/documents`);
  return data.documents || [];
}

/**
 * Upload multiple document files to a study set in a single request.
 * POST /api/study-sets/{studySetId}/documents
 * @param {string} studySetId
 * @param {File[]} files
 */
export async function uploadDocuments(studySetId, files) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  return request(`/api/study-sets/${studySetId}/documents`, {
    method: "POST",
    body: formData,
  });
}

/**
 * Upload a single document file or FormData to a study set.
 * POST /api/study-sets/{studySetId}/documents
 */
export async function uploadDocument(studySetId, fileOrFormData) {
  if (Array.isArray(fileOrFormData)) {
    return uploadDocuments(studySetId, fileOrFormData);
  }

  let body = fileOrFormData;

  if (fileOrFormData instanceof File) {
    body = new FormData();
    body.append("files", fileOrFormData);
  }

  return request(`/api/study-sets/${studySetId}/documents`, {
    method: "POST",
    body,
  });
}

// ── Questions ────────────────────────────────────────────────────────

/**
 * Generate questions for a study set.
 * POST /api/study-sets/{studySetId}/questions/generate
 */
export async function generateQuestions(
  studySetId,
  frontendType,
  documentId = null
) {
  const backendType = toBackendType(frontendType);

  const payload = {
    question_type: backendType,
  };

  if (documentId) {
    payload.document_id = documentId;
  }

  return request(`/api/study-sets/${studySetId}/questions/generate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch questions for a study set.
 */
export async function fetchQuestions(studySetId, frontendType) {
  const backendType = toBackendType(frontendType);

  const url = `/api/study-sets/${studySetId}/questions?question_type=${backendType}`;

  const data = await request(url);

  return data.questions.map((q, idx) => {
    const normalized = {
      id: idx + 1,
      question_id: q.question_id,
      question: q.question,
      hint: q.topic
        ? `Think about the key concepts related to ${q.topic.replace(
            /_/g,
            " "
          )}.`
        : "Consider the fundamental principles involved.",
      question_type: fromBackendType(q.question_type),
      marks: q.marks,
    };

    if (
      q.question_type === "mcq" &&
      q.options &&
      typeof q.options === "object" &&
      !Array.isArray(q.options)
    ) {
      normalized.options = Object.entries(q.options).map(
        ([letter, text]) => ({
          letter,
          text,
        })
      );
    }

    return normalized;
  });
}

// ── Attempts ─────────────────────────────────────────────────────────

/**
 * Fetch the active in-progress attempt for a study set if one exists.
 * GET /api/attempts/study-sets/{studySetId}/active-attempt
 * Returns null if no active attempt exists (404).
 */
export async function fetchActiveAttempt(studySetId) {
  try {
    return await request(`/api/attempts/study-sets/${studySetId}/active-attempt`);
  } catch (err) {
    if (err.message && err.message.includes("404")) {
      return null;
    }
    throw err;
  }
}

/**
 * Get the active in-progress attempt for a study set, or create a new attempt if none exists.
 */
export async function getOrCreateAttempt(studySetId) {
  const active = await fetchActiveAttempt(studySetId);
  if (active) {
    return active;
  }
  return createAttempt(studySetId);
}

/**
 * Create a new attempt.
 * POST /api/attempts
 */
export async function createAttempt(studySetId) {
  return request("/api/attempts", {
    method: "POST",
    body: JSON.stringify({
      study_set_id: studySetId,
    }),
  });
}

// ── Answer Submission ────────────────────────────────────────────────

/**
 * Submit answers for one question-type section.
 * POST /api/attempts/{attemptId}/answers
 */
export async function submitAnswers(
  attemptId,
  frontendType,
  answers
) {
  const backendType = toBackendType(frontendType);

  return request(`/api/attempts/${attemptId}/answers`, {
    method: "POST",
    body: JSON.stringify({
      question_type: backendType,
      attempt_id: attemptId,
      answers,
    }),
  });
}

// ── Finish Attempt ───────────────────────────────────────────────────

/**
 * Finish an attempt.
 * POST /api/attempts/{attemptId}/finish
 */
export async function finishAttempt(attemptId) {
  return request(`/api/attempts/${attemptId}/finish`, {
    method: "POST",
  });
}

// ── Evaluations / Results ────────────────────────────────────────────

/**
 * Fetch evaluations for an attempt.
 * GET /api/attempts/{attemptId}/evaluations
 */
export async function fetchEvaluations(attemptId) {
  return request(`/api/attempts/${attemptId}/evaluations`);
}

/**
 * Fetch performance for an attempt.
 * GET /api/attempts/{attemptId}/performance
 */
export async function fetchPerformance(attemptId) {
  return request(`/api/attempts/${attemptId}/performance`);
}

/**
 * Fetch final results for an attempt.
 * GET /api/attempts/{attemptId}/results
 */
export async function fetchResults(attemptId) {
  return request(`/api/attempts/${attemptId}/results`);
}

// ── Tasks ────────────────────────────────────────────────────────────

/**
 * Fetch tasks for the current user, optionally filtered by date or date range.
 * GET /api/tasks
 */
export async function fetchTasks({ dueDate, startDate, endDate } = {}) {
  const params = new URLSearchParams();
  if (dueDate) params.append("due_date", dueDate);
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);

  const queryString = params.toString() ? `?${params.toString()}` : "";
  const data = await request(`/api/tasks${queryString}`);
  return data.tasks || [];
}

/**
 * Fetch today's tasks for the current user.
 * GET /api/tasks
 */
export async function fetchTodaysTasks() {
  return fetchTasks();
}

/**
 * Create a new task.
 * POST /api/tasks
 */
export async function createTask(
  nameOrObject,
  priorityArg,
  dueDateArg,
  studySetIdArg,
  taskTypeArg,
  dueTimeArg
) {
  let payload = {};

  if (typeof nameOrObject === "object" && nameOrObject !== null) {
    const { name, title, priority, dueDate, date, dueTime, time, studySetId, taskType, type } = nameOrObject;
    payload = {
      name: name || title,
      priority: (priority || "medium").toLowerCase(),
      due_date: dueDate || date || undefined,
      due_time: dueTime || time || undefined,
      study_set_id: studySetId || undefined,
      task_type: (taskType || type || "study").toLowerCase(),
    };
  } else {
    payload = {
      name: nameOrObject,
      priority: priorityArg ? priorityArg.toLowerCase() : "medium",
      due_date: dueDateArg || undefined,
      due_time: dueTimeArg || undefined,
      study_set_id: studySetIdArg || undefined,
      task_type: taskTypeArg ? taskTypeArg.toLowerCase() : "study",
    };
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  return request("/api/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Update an existing task.
 * PATCH /api/tasks/{taskId}
 */
export async function updateTask(taskId, updates) {
  const payload = { ...updates };
  if (payload.priority) payload.priority = payload.priority.toLowerCase();
  if (payload.taskType) {
    payload.task_type = payload.taskType.toLowerCase();
    delete payload.taskType;
  }
  if (payload.dueDate) {
    payload.due_date = payload.dueDate;
    delete payload.dueDate;
  }
  if (payload.dueTime) {
    payload.due_time = payload.dueTime;
    delete payload.dueTime;
  }
  if (payload.studySetId !== undefined) {
    payload.study_set_id = payload.studySetId;
    delete payload.studySetId;
  }

  return request(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/**
 * Toggle completion status of a task without deleting it.
 * PATCH /api/tasks/{taskId}/complete
 */
export async function toggleTaskCompletion(taskId, completed) {
  return request(`/api/tasks/${taskId}/complete`, {
    method: "PATCH",
    body: JSON.stringify({ completed }),
  });
}

/**
 * Delete a task.
 * DELETE /api/tasks/{taskId}
 */
export async function deleteTask(taskId) {
  return request(`/api/tasks/${taskId}`, {
    method: "DELETE",
  });
}

// ── Exams ────────────────────────────────────────────────────────────

/**
 * Fetch the current user's exams, nearest first.
 * GET /api/exams
 */
export async function fetchExams() {
  const data = await request("/api/exams");
  return data.exams;
}

/**
 * Create a new exam.
 * POST /api/exams
 */
export async function createExam(subject, examType, examDate, studySetId) {
  const payload = {
    subject,
    exam_type: examType,
    exam_date: examDate,
  };
  if (studySetId) payload.study_set_id = studySetId;

  return request("/api/exams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Delete an exam.
 * DELETE /api/exams/{examId}
 */
export async function deleteExam(examId) {
  return request(`/api/exams/${examId}`, {
    method: "DELETE",
  });
}

// ── Activity ─────────────────────────────────────────────────────────

/**
 * Fetch the distinct days in a given month the user answered at least
 * one question, across every study set and question type.
 * GET /api/activity/studied-days?year=YYYY&month=MM
 */
export async function fetchStudiedDays(year, month) {
  const data = await request(`/api/activity/studied-days?year=${year}&month=${month}`);
  return data.studied_days;
}

// ── Account ──────────────────────────────────────────────────────────

/**
 * Permanently delete the current user's account and all associated data.
 * DELETE /api/account
 */
export async function deleteAccount() {
  return request("/api/account", {
    method: "DELETE",
  });
}