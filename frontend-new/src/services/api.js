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

// ── Client-side response cache + in-flight de-duplication ─────────────
// Read-only GET calls (fetchStudySets, fetchExams, fetchTasks, etc.) route
// through cachedGet() below instead of calling request() directly. Two
// problems this solves:
//   1. Duplicate simultaneous calls (e.g. Dashboard's cards each calling
//      fetchStudySets() independently on mount) share one in-flight
//      network request instead of firing three.
//   2. Revisiting a page within CACHE_TTL_MS of the last fetch reuses the
//      cached response instead of re-fetching from scratch, so switching
//      between pages (e.g. Dashboard <-> Planner) feels instant on a
//      revisit instead of re-waiting on the network every time.
//
// Writes (POST/PATCH/DELETE) never go through cachedGet() - they always
// call request() directly, and invalidateCache()/clearCache() (called
// after every mutation below, keyed by the URL prefix it could affect)
// removes now-stale entries so a page you navigate back to after a write
// shows the fresh state instead of a cached stale one. A 404/error
// response is never cached (caching only happens after a successful
// response below), so e.g. fetchStudySetSummary() before a summary
// exists correctly keeps re-checking instead of caching "not found".

const CACHE_TTL_MS = 30_000;

const _cache = new Map(); // url -> { data, expiresAt }
const _inFlight = new Map(); // url -> Promise

async function cachedGet(url) {
  const cached = _cache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const pending = _inFlight.get(url);
  if (pending) {
    return pending;
  }

  const promise = request(url)
    .then((data) => {
      _cache.set(url, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return data;
    })
    .finally(() => {
      _inFlight.delete(url);
    });

  _inFlight.set(url, promise);
  return promise;
}

/**
 * Removes cached GET entries whose URL starts with `prefix`, e.g.
 * invalidateCache("/api/tasks") clears every cached fetchTasks() variant
 * (base + any due_date/date-range query strings) after a task is
 * created/updated/deleted, so the next fetchTasks() call anywhere in the
 * app goes to the network instead of returning outdated data.
 */
function invalidateCache(prefix) {
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) {
      _cache.delete(key);
    }
  }
}

/** Clears every cached entry - used by broad, everything-changes writes. */
function clearCache() {
  _cache.clear();
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
  const data = await cachedGet("/api/study-sets");
  return data.study_sets;
}

/**
 * Fetch section-completion progress for all of the current user's study sets.
 * GET /api/study-sets/progress
 */
export async function fetchStudySetProgress() {
  const data = await cachedGet("/api/study-sets/progress");
  return data.progress;
}

/**
 * Fetch chronological attempt progress history for one study set.
 * GET /api/progress/history?study_set_id={studySetId}
 */
export async function fetchProgressHistory(studySetId) {
  if (!studySetId) return null;
  return cachedGet(`/api/progress/history?study_set_id=${studySetId}`);
}

/**
 * Create a new study set.
 * POST /api/study-sets
 */
export async function createStudySet(name) {
  const result = await request("/api/study-sets", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  invalidateCache("/api/study-sets");
  return result;
}

/**
 * Fetch a single study set by ID.
 * GET /api/study-sets/{studySetId}
 */
export async function fetchStudySet(studySetId) {
  return cachedGet(`/api/study-sets/${studySetId}`);
}
/**
 * Delete a study set.
 * DELETE /api/study-sets/{studySetId}
 */
export async function deleteStudySet(studySetId) {
  const result = await request(`/api/study-sets/${studySetId}`, {
    method: "DELETE",
  });
  invalidateCache("/api/study-sets");
  return result;
}

/**
 * Delete every study set owned by the current user.
 * DELETE /api/study-sets/all
 */
export async function deleteAllStudySets() {
  const result = await request("/api/study-sets/all", {
    method: "DELETE",
  });
  clearCache();
  return result;
}

/**
 * Generate summary for a study set.
 * POST /api/study-sets/{studySetId}/summary
 */
export async function generateStudySetSummary(studySetId) {
  const result = await request(`/api/study-sets/${studySetId}/summary`, {
    method: "POST",
  });
  invalidateCache(`/api/study-sets/${studySetId}/summary`);
  return result;
}

/**
 * Fetch the previously saved summary for a study set, if one exists.
 * GET /api/study-sets/{studySetId}/summary
 * Returns null if no summary has been generated yet (404).
 */
export async function fetchStudySetSummary(studySetId) {
  try {
    return await cachedGet(`/api/study-sets/${studySetId}/summary`);
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
  const result = await request(`/api/study-sets/${studySetId}/flashcards`, {
    method: "POST",
  });
  invalidateCache(`/api/study-sets/${studySetId}/flashcards`);
  return result;
}

/**
 * Fetch the previously saved flashcards for a study set, if any exist.
 * GET /api/study-sets/{studySetId}/flashcards
 * Returns an empty array if no flashcards have been generated yet (404).
 */
export async function fetchStudySetFlashcards(studySetId) {
  try {
    const data = await cachedGet(`/api/study-sets/${studySetId}/flashcards`);
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
  const data = await cachedGet(`/api/study-sets/${studySetId}/documents`);
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

  const result = await request(`/api/study-sets/${studySetId}/documents`, {
    method: "POST",
    body: formData,
  });
  invalidateCache(`/api/study-sets/${studySetId}/documents`);
  return result;
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

  const result = await request(`/api/study-sets/${studySetId}/documents`, {
    method: "POST",
    body,
  });
  invalidateCache(`/api/study-sets/${studySetId}/documents`);
  return result;
}

// ── Questions ────────────────────────────────────────────────────────

/**
 * Generate questions for a study set.
 * POST /api/study-sets/{studySetId}/questions/generate
 *
 * `attemptId` (optional) tags the freshly-generated batch as belonging
 * to that specific attempt, so a revision attempt's questions never mix
 * with a prior attempt's - see fetchQuestions()'s own `attemptId` param.
 */
export async function generateQuestions(
  studySetId,
  frontendType,
  documentId = null,
  attemptId = null
) {
  const backendType = toBackendType(frontendType);

  const payload = {
    question_type: backendType,
  };

  if (documentId) {
    payload.document_id = documentId;
  }

  if (attemptId) {
    payload.attempt_id = attemptId;
  }

  const result = await request(`/api/study-sets/${studySetId}/questions/generate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  invalidateCache(`/api/study-sets/${studySetId}/questions`);
  return result;
}

/**
 * Fetch questions for a study set.
 *
 * `attemptId` (optional): when given, scopes the result to ONLY the
 * questions generated for that specific attempt, instead of every
 * question ever generated for this study set + type across every past
 * attempt - pass the current attempt's ID whenever fetching questions
 * to actually show/take (a resumed in-progress attempt reuses its own
 * ID and so still sees its own questions; a new revision attempt gets a
 * fresh ID and so correctly sees none until it generates its own).
 */
export async function fetchQuestions(studySetId, frontendType, attemptId = null) {
  const backendType = toBackendType(frontendType);

  let url = `/api/study-sets/${studySetId}/questions?question_type=${backendType}`;
  if (attemptId) {
    url += `&attempt_id=${encodeURIComponent(attemptId)}`;
  }

  const data = await cachedGet(url);

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
 * Fetch all quiz attempts for a study set from Supabase.
 */
export async function fetchAttemptsForStudySet(studySetId) {
  if (!studySetId) return [];
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    let query = supabase
      .from("quiz_attempts")
      .select("*")
      .eq("study_set_id", studySetId);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.warn("Could not fetch attempts from Supabase table:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Failed to fetch attempts for study set:", err);
    return [];
  }
}

/**
 * Fetch the active in-progress attempt for one (study set, question type)
 * pair if one exists. GET /api/attempts/study-sets/{studySetId}/active-attempt?question_type=
 * Returns null if no active attempt exists (404).
 *
 * `frontendType` is required now - every attempt is independently scoped
 * to exactly one question type from creation, so "the active attempt for
 * a study set" is no longer a well-formed question on its own (more than
 * one type can be genuinely in-progress at once).
 *
 * Deliberately NOT routed through cachedGet(): this call's result
 * directly decides whether getOrCreateAttempt() creates a new attempt,
 * so it always needs the true current state, not a value that could be
 * up to CACHE_TTL_MS stale.
 */
export async function fetchActiveAttempt(studySetId, frontendType) {
  const backendType = toBackendType(frontendType);
  try {
    return await request(
      `/api/attempts/study-sets/${studySetId}/active-attempt?question_type=${backendType}`
    );
  } catch (err) {
    if (err.message && err.message.includes("404")) {
      return null;
    }
    throw err;
  }
}

/**
 * Get the active in-progress attempt for one (study set, question type)
 * pair, or create a new attempt if none exists.
 */
export async function getOrCreateAttempt(studySetId, frontendType) {
  const active = await fetchActiveAttempt(studySetId, frontendType);
  if (active) {
    return active;
  }
  return createAttempt(studySetId, frontendType);
}

/**
 * Create a new attempt for one (study set, question type) pair.
 * POST /api/attempts
 */
export async function createAttempt(studySetId, frontendType) {
  const backendType = toBackendType(frontendType);
  const result = await request("/api/attempts", {
    method: "POST",
    body: JSON.stringify({
      study_set_id: studySetId,
      question_type: backendType,
    }),
  });
  invalidateCache(`/api/study-sets/${studySetId}/revision-status`);
  return result;
}

/**
 * Fetch per-question-type revision/attempt status for a study set -
 * available/attempts_taken/needs_attention/next_due_date/last_accuracy
 * for each of the 4 types. GET /api/study-sets/{studySetId}/revision-status
 */
export async function fetchRevisionStatus(studySetId) {
  return cachedGet(`/api/study-sets/${studySetId}/revision-status`);
}

/**
 * Fetch every (study_set, question_type) pair currently due for
 * revision across ALL of the current user's study sets, for the
 * Planner's daily schedule. One aggregated call, not one per study set.
 * GET /api/planner/revisions-due
 */
export async function fetchRevisionsDue() {
  const data = await cachedGet("/api/planner/revisions-due");
  return data.revisions_due || [];
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

  const result = await request(`/api/attempts/${attemptId}/answers`, {
    method: "POST",
    body: JSON.stringify({
      question_type: backendType,
      attempt_id: attemptId,
      answers,
    }),
  });
  invalidateCache(`/api/attempts/${attemptId}`);
  // Section completion affects progress + revision-status across study
  // sets, and we only have attemptId here (not studySetId), so this
  // invalidates broadly rather than guessing which set it belongs to.
  invalidateCache("/api/study-sets");
  return result;
}

/**
 * Statelessly evaluate answers for a historical attempt retake (practice mode).
 * POST /api/attempts/evaluate-practice
 */
export async function evaluatePracticeAnswers(
  studySetId,
  historicalAttemptId,
  frontendType,
  answers
) {
  const backendType = toBackendType(frontendType);

  return await request("/api/attempts/evaluate-practice", {
    method: "POST",
    body: JSON.stringify({
      study_set_id: studySetId,
      attempt_id: historicalAttemptId,
      question_type: backendType,
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
  const result = await request(`/api/attempts/${attemptId}/finish`, {
    method: "POST",
  });
  invalidateCache(`/api/attempts/${attemptId}`);
  invalidateCache("/api/study-sets");
  return result;
}

// ── Evaluations / Results ────────────────────────────────────────────

/**
 * Fetch evaluations for an attempt.
 * GET /api/attempts/{attemptId}/evaluations
 */
export async function fetchEvaluations(attemptId) {
  return cachedGet(`/api/attempts/${attemptId}/evaluations`);
}

/**
 * Fetch performance for an attempt.
 * GET /api/attempts/{attemptId}/performance
 */
export async function fetchPerformance(attemptId) {
  return cachedGet(`/api/attempts/${attemptId}/performance`);
}

/**
 * Fetch final results for an attempt.
 * GET /api/attempts/{attemptId}/results
 */
export async function fetchResults(attemptId) {
  return cachedGet(`/api/attempts/${attemptId}/results`);
}

/**
 * Fetch cumulative, cross-attempt results for a study set - every
 * attempt of every question type rolled into one summary row each, not
 * scoped to a single attempt_id. Backs the "View Results" entry point
 * reached from a study set's own page (no specific attempt in hand).
 * GET /api/study-sets/{studySetId}/results-summary
 */
export async function fetchStudySetResultsSummary(studySetId) {
  return cachedGet(`/api/study-sets/${studySetId}/results-summary`);
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
  const data = await cachedGet(`/api/tasks${queryString}`);
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

  const result = await request("/api/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  invalidateCache("/api/tasks");
  return result;
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

  const result = await request(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  invalidateCache("/api/tasks");
  return result;
}

/**
 * Toggle completion status of a task without deleting it.
 * PATCH /api/tasks/{taskId}/complete
 */
export async function toggleTaskCompletion(taskId, completed) {
  const result = await request(`/api/tasks/${taskId}/complete`, {
    method: "PATCH",
    body: JSON.stringify({ completed }),
  });
  invalidateCache("/api/tasks");
  return result;
}

/**
 * Delete a task.
 * DELETE /api/tasks/{taskId}
 */
export async function deleteTask(taskId) {
  const result = await request(`/api/tasks/${taskId}`, {
    method: "DELETE",
  });
  invalidateCache("/api/tasks");
  return result;
}

// ── Exams ────────────────────────────────────────────────────────────

/**
 * Fetch the current user's exams, nearest first.
 * GET /api/exams
 */
export async function fetchExams() {
  const data = await cachedGet("/api/exams");
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

  const result = await request("/api/exams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  invalidateCache("/api/exams");
  return result;
}

/**
 * Delete an exam.
 * DELETE /api/exams/{examId}
 */
export async function deleteExam(examId) {
  const result = await request(`/api/exams/${examId}`, {
    method: "DELETE",
  });
  invalidateCache("/api/exams");
  return result;
}

// ── Activity ─────────────────────────────────────────────────────────

/**
 * Fetch the distinct days in a given month the user answered at least
 * one question, across every study set and question type.
 * GET /api/activity/studied-days?year=YYYY&month=MM
 */
export async function fetchStudiedDays(year, month) {
  const data = await cachedGet(`/api/activity/studied-days?year=${year}&month=${month}`);
  return data.studied_days;
}

// ── Account ──────────────────────────────────────────────────────────

/**
 * Permanently delete the current user's account and all associated data.
 * DELETE /api/account
 */
export async function deleteAccount() {
  const result = await request("/api/account", {
    method: "DELETE",
  });
  clearCache();
  return result;
}


// ── Google Calendar ──────────────────────────────────────────────────

/**
 * Check whether the current user has an active Google Calendar connection.
 * GET /api/google-calendar/status
 */
export async function getGoogleCalendarStatus() {
  return request("/api/google-calendar/status");
}

/**
 * Get the Google OAuth authorization URL to start the connection flow.
 * GET /api/google-calendar/connect
 */
export async function getGoogleCalendarConnectUrl() {
  return request("/api/google-calendar/connect");
}

/**
 * Disconnect the current user's Google Calendar integration.
 * DELETE /api/google-calendar/disconnect
 */
export async function disconnectGoogleCalendar() {
  return request("/api/google-calendar/disconnect", {
    method: "DELETE",
  });
}
