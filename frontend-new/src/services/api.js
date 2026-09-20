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
    const error = new Error(
      `API ${options.method || "GET"} ${fullUrl} → ${res.status}: ${body}`
    );
    // Structured fields so callers never have to substring-match the
    // message (which also contains the URL/UUIDs - e.g. a study-set id
    // containing "404" or "429" used to be mistaken for that status).
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return res.json();
}

// ── Client-side response cache + in-flight de-duplication ─────────────

const CACHE_TTL_MS = 30_000;

const _cache = new Map();
const _inFlight = new Map();

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
      _cache.set(url, {
        data,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      return data;
    })
    .finally(() => {
      _inFlight.delete(url);
    });

  _inFlight.set(url, promise);

  return promise;
}

/**
 * Removes cached GET entries whose URL starts with `prefix`.
 */
function invalidateCache(prefix) {
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) {
      _cache.delete(key);
    }
  }
}

/**
 * Clears every cached entry.
 */
function clearCache() {
  _cache.clear();
}

// ── Question-type mapping ────────────────────────────────────────────

export function toBackendType(frontendType) {
  if (!frontendType) return "mcq";
  const s = String(frontendType).toLowerCase().trim().replace(/_/g, "-");
  if (s === "short" || s === "short-ans" || s.startsWith("short")) {
    return "short";
  }
  if (s === "long" || s === "long-ans" || s.startsWith("long")) {
    return "long";
  }
  if (s === "application" || s === "applicative" || s.startsWith("app")) {
    return "application";
  }
  return "mcq";
}

export function fromBackendType(backendType) {
  const b = toBackendType(backendType);
  if (b === "short") return "short-answer";
  return b;
}

// ── Study Sets ───────────────────────────────────────────────────────

export async function fetchStudySets() {
  const data = await cachedGet("/api/study-sets");
  return data.study_sets;
}

export async function fetchStudySetProgress() {
  const data = await cachedGet("/api/study-sets/progress");
  return data.progress;
}

export async function fetchProgressHistory(studySetId) {
  if (!studySetId) return null;

  return cachedGet(
    `/api/progress/history?study_set_id=${studySetId}`
  );
}

export async function createStudySet(name) {
  const result = await request("/api/study-sets", {
    method: "POST",
    body: JSON.stringify({ name }),
  });

  invalidateCache("/api/study-sets");

  return result;
}

export async function fetchStudySet(studySetId) {
  return cachedGet(`/api/study-sets/${studySetId}`);
}

export async function deleteStudySet(studySetId) {
  const result = await request(`/api/study-sets/${studySetId}`, {
    method: "DELETE",
  });

  invalidateCache("/api/study-sets");

  return result;
}

export async function deleteAllStudySets() {
  const result = await request("/api/study-sets/all", {
    method: "DELETE",
  });

  clearCache();

  return result;
}

export async function generateStudySetSummary(studySetId) {
  const result = await request(
    `/api/study-sets/${studySetId}/summary`,
    {
      method: "POST",
    }
  );

  invalidateCache(
    `/api/study-sets/${studySetId}/summary`
  );

  return result;
}

export async function fetchStudySetSummary(studySetId) {
  try {
    return await cachedGet(
      `/api/study-sets/${studySetId}/summary`
    );
  } catch (err) {
    if (err.status === 404) {
      return null;
    }

    throw err;
  }
}

export async function generateStudySetFlashcards(studySetId) {
  const result = await request(
    `/api/study-sets/${studySetId}/flashcards`,
    {
      method: "POST",
    }
  );

  invalidateCache(
    `/api/study-sets/${studySetId}/flashcards`
  );

  return result;
}

export async function fetchStudySetFlashcards(studySetId) {
  try {
    const data = await cachedGet(
      `/api/study-sets/${studySetId}/flashcards`
    );

    return data.flashcards || [];
  } catch (err) {
    if (err.status === 404) {
      return [];
    }

    throw err;
  }
}

export async function generateStudySetMnemonic(
  studySetId,
  topic,
  style = "acronym"
) {
  return request(
    `/api/study-sets/${studySetId}/mnemonics`,
    {
      method: "POST",
      body: JSON.stringify({
        topic,
        style,
      }),
    }
  );
}

// ── Documents ────────────────────────────────────────────────────────

export async function fetchStudySetDocuments(studySetId) {
  const data = await cachedGet(
    `/api/study-sets/${studySetId}/documents`
  );

  return data.documents || [];
}

/**
 * Upload multiple document files to a study set.
 */
export async function uploadDocuments(studySetId, files) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  const result = await request(
    `/api/study-sets/${studySetId}/documents`,
    {
      method: "POST",
      body: formData,
    }
  );

  invalidateCache(
    `/api/study-sets/${studySetId}/documents`
  );

  return result;
}

/**
 * Upload a single document file or FormData to a study set.
 */
export async function uploadDocument(
  studySetId,
  fileOrFormData
) {
  if (Array.isArray(fileOrFormData)) {
    return uploadDocuments(studySetId, fileOrFormData);
  }

  let body = fileOrFormData;

  if (fileOrFormData instanceof File) {
    body = new FormData();
    body.append("files", fileOrFormData);
  }

  const result = await request(
    `/api/study-sets/${studySetId}/documents`,
    {
      method: "POST",
      body,
    }
  );

  invalidateCache(
    `/api/study-sets/${studySetId}/documents`
  );

  return result;
}

// ── Questions ────────────────────────────────────────────────────────

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

  const result = await request(
    `/api/study-sets/${studySetId}/questions/generate`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  invalidateCache(
    `/api/study-sets/${studySetId}/questions`
  );

  return result;
}

export async function fetchQuestions(
  studySetId,
  frontendType,
  attemptId = null
) {
  const backendType = toBackendType(frontendType);

  let url =
    `/api/study-sets/${studySetId}/questions?` +
    `question_type=${backendType}`;

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
            /\_/g,
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

    const { data, error } = await query.order(
      "created_at",
      {
        ascending: false,
      }
    );

    if (error) {
      console.warn(
        "Could not fetch attempts from Supabase table:",
        error
      );

      return [];
    }

    return data || [];
  } catch (err) {
    console.error(
      "Failed to fetch attempts for study set:",
      err
    );

    return [];
  }
}

export async function fetchActiveAttempt(
  studySetId,
  frontendType
) {
  const backendType = toBackendType(frontendType);

  try {
    const res = await request(
      `/api/attempts/study-sets/${studySetId}/active-attempt?question_type=${backendType}`
    );
    return res || null;
  } catch (err) {
    if (err.status === 404) {
      return null;
    }

    throw err;
  }
}

export async function getOrCreateAttempt(
  studySetId,
  frontendType
) {
  const active = await fetchActiveAttempt(
    studySetId,
    frontendType
  );

  if (active) {
    return active;
  }

  return createAttempt(studySetId, frontendType);
}

export async function createAttempt(
  studySetId,
  frontendType
) {
  const backendType = toBackendType(frontendType);

  const result = await request("/api/attempts", {
    method: "POST",
    body: JSON.stringify({
      study_set_id: studySetId,
      question_type: backendType,
    }),
  });

  invalidateCache(
    `/api/study-sets/${studySetId}/revision-status`
  );

  return result;
}

export async function fetchRevisionStatus(studySetId) {
  return cachedGet(
    `/api/study-sets/${studySetId}/revision-status`
  );
}

export async function fetchRevisionsDue() {
  const data = await cachedGet(
    "/api/planner/revisions-due"
  );

  return data.revisions_due || [];
}

// ── Answer Submission ────────────────────────────────────────────────

export async function submitAnswers(
  attemptId,
  frontendType,
  answers
) {
  const backendType = toBackendType(frontendType);

  const result = await request(
    `/api/attempts/${attemptId}/answers`,
    {
      method: "POST",
      body: JSON.stringify({
        question_type: backendType,
        attempt_id: attemptId,
        answers,
      }),
    }
  );

  invalidateCache(`/api/attempts/${attemptId}`);
  invalidateCache("/api/study-sets");

  return result;
}

export async function evaluatePracticeAnswers(
  studySetId,
  historicalAttemptId,
  frontendType,
  answers
) {
  const backendType = toBackendType(frontendType);

  return await request(
    "/api/attempts/evaluate-practice",
    {
      method: "POST",
      body: JSON.stringify({
        study_set_id: studySetId,
        attempt_id: historicalAttemptId,
        question_type: backendType,
        answers,
      }),
    }
  );
}

// ── Finish Attempt ───────────────────────────────────────────────────

export async function finishAttempt(attemptId) {
  const result = await request(
    `/api/attempts/${attemptId}/finish`,
    {
      method: "POST",
    }
  );

  invalidateCache(`/api/attempts/${attemptId}`);
  invalidateCache("/api/study-sets");

  return result;
}

// ── Evaluations / Results ────────────────────────────────────────────

export async function fetchEvaluations(attemptId) {
  return cachedGet(
    `/api/attempts/${attemptId}/evaluations`
  );
}

export async function fetchPerformance(attemptId) {
  return cachedGet(
    `/api/attempts/${attemptId}/performance`
  );
}

export async function fetchResults(attemptId) {
  return cachedGet(
    `/api/attempts/${attemptId}/results`
  );
}

export async function fetchStudySetResultsSummary(
  studySetId
) {
  return cachedGet(
    `/api/study-sets/${studySetId}/results-summary`
  );
}

// ── Tasks ────────────────────────────────────────────────────────────

export async function fetchTasks({
  dueDate,
  startDate,
  endDate,
} = {}) {
  const params = new URLSearchParams();

  if (dueDate) params.append("due_date", dueDate);
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);

  const queryString = params.toString()
    ? `?${params.toString()}`
    : "";

  const data = await cachedGet(
    `/api/tasks${queryString}`
  );

  return data.tasks || [];
}

export async function fetchTodaysTasks() {
  return fetchTasks();
}

export async function createTask(
  nameOrObject,
  priorityArg,
  dueDateArg,
  studySetIdArg,
  taskTypeArg,
  dueTimeArg
) {
  let payload = {};

  if (
    typeof nameOrObject === "object" &&
    nameOrObject !== null
  ) {
    const {
      name,
      title,
      priority,
      dueDate,
      date,
      dueTime,
      time,
      studySetId,
      taskType,
      type,
    } = nameOrObject;

    payload = {
      name: name || title,
      priority: (priority || "medium").toLowerCase(),
      due_date: dueDate || date || undefined,
      due_time: dueTime || time || undefined,
      study_set_id: studySetId || undefined,
      task_type: (
        taskType ||
        type ||
        "study"
      ).toLowerCase(),
    };
  } else {
    payload = {
      name: nameOrObject,
      priority: priorityArg
        ? priorityArg.toLowerCase()
        : "medium",
      due_date: dueDateArg || undefined,
      due_time: dueTimeArg || undefined,
      study_set_id: studySetIdArg || undefined,
      task_type: taskTypeArg
        ? taskTypeArg.toLowerCase()
        : "study",
    };
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  const result = await request("/api/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  invalidateCache("/api/tasks");

  return result;
}

export async function updateTask(
  taskId,
  updates
) {
  const payload = { ...updates };

  if (payload.priority) {
    payload.priority = payload.priority.toLowerCase();
  }

  if (payload.taskType) {
    payload.task_type =
      payload.taskType.toLowerCase();

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

  const result = await request(
    `/api/tasks/${taskId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );

  invalidateCache("/api/tasks");

  return result;
}

export async function toggleTaskCompletion(
  taskId,
  completed
) {
  const result = await request(
    `/api/tasks/${taskId}/complete`,
    {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    }
  );

  invalidateCache("/api/tasks");

  return result;
}

export async function deleteTask(taskId) {
  const result = await request(
    `/api/tasks/${taskId}`,
    {
      method: "DELETE",
    }
  );

  invalidateCache("/api/tasks");

  return result;
}

// ── Exams ────────────────────────────────────────────────────────────

export async function fetchExams() {
  const data = await cachedGet("/api/exams");
  return data.exams;
}

export async function createExam(
  subject,
  examType,
  examDate,
  studySetId
) {
  const payload = {
    subject,
    exam_type: examType,
    exam_date: examDate,
  };

  if (studySetId) {
    payload.study_set_id = studySetId;
  }

  const result = await request("/api/exams", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  invalidateCache("/api/exams");

  return result;
}

export async function deleteExam(examId) {
  const result = await request(
    `/api/exams/${examId}`,
    {
      method: "DELETE",
    }
  );

  invalidateCache("/api/exams");

  return result;
}

// ── Activity ─────────────────────────────────────────────────────────

export async function fetchStudiedDays(
  year,
  month
) {
  const data = await cachedGet(
    `/api/activity/studied-days?year=${year}&month=${month}`
  );

  return data.studied_days;
}

// ── Account ──────────────────────────────────────────────────────────

export async function deleteAccount() {
  const result = await request("/api/account", {
    method: "DELETE",
  });

  clearCache();

  return result;
}

// ── Google Calendar ──────────────────────────────────────────────────

export async function getGoogleCalendarStatus() {
  return request("/api/google-calendar/status");
}

export async function getGoogleCalendarConnectUrl() {
  return request("/api/google-calendar/connect");
}

export async function disconnectGoogleCalendar() {
  return request(
    "/api/google-calendar/disconnect",
    {
      method: "DELETE",
    }
  );
}

// ── Audit Logs ───────────────────────────────────────────────────────

export const createAuditLog = async (action) => {
  return request("/api/audit/log", {
    method: "POST",
    body: JSON.stringify({ action }),
  });
};