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
 * Delete a study set.
 * DELETE /api/study-sets/{studySetId}
 */
export async function deleteStudySet(studySetId) {
  return request(`/api/study-sets/${studySetId}`, {
    method: "DELETE",
  });
}

// ── Documents ────────────────────────────────────────────────────────

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