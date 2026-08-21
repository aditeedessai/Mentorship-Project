import { supabase } from "./supabase";

// ── helpers ──────────────────────────────────────────────────────────

async function request(url, options = {}) {
  const headers = { ...options.headers };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  } catch (err) {
    console.warn("Could not retrieve Supabase session:", err);
  }

  // Only set application/json if body is NOT FormData and Content-Type isn't set yet
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${options.method || "GET"} ${url} → ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Question-type mapping ────────────────────────────────────────────
// Frontend "short-answer"  ↔  Backend "short"
// Frontend "mcq"           ↔  Backend "mcq"
// Frontend "application"   ↔  Backend "application"

/** Frontend type → backend query-param value */
function toBackendType(frontendType) {
  if (frontendType === 'short-answer') return 'short'
  return frontendType // mcq, application pass through
}

/** Backend question_type string → frontend type */
function fromBackendType(backendType) {
  if (backendType === 'short') return 'short-answer'
  return backendType
}

// ── Study Sets ───────────────────────────────────────────────────────

export async function fetchStudySets() {
  const data = await request('/api/study-sets')
  return data.study_sets // array of { study_set_id, name, ... }
}

/**
 * Create a new study set (POST /api/study-sets).
 * @param {string} name
 * @returns {Promise<{ study_set_id: string, name: string, created_at: string, updated_at: string }>}
 */
export async function createStudySet(name) {
  return request('/api/study-sets', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

// ── Documents ────────────────────────────────────────────────────────

/**
 * Upload a document file to a study set (POST /api/study-sets/{studySetId}/documents).
 * @param {string} studySetId
 * @param {File | FormData} fileOrFormData
 */
export async function uploadDocument(studySetId, fileOrFormData) {
  let body = fileOrFormData
  if (fileOrFormData instanceof File) {
    body = new FormData()
    body.append('files', fileOrFormData)
  }
  return request(`/api/study-sets/${studySetId}/documents`, {
    method: 'POST',
    body,
  })
}

// ── Questions ────────────────────────────────────────────────────────

/**
 * Generate questions for a study set using the backend AI engine.
 * (POST /api/study-sets/{studySetId}/questions/generate)
 *
 * @param {string} studySetId
 * @param {string} frontendType - 'mcq' | 'short-answer' | 'application' | 'short' | 'long'
 * @param {string} [documentId] - Optional document UUID
 */
export async function generateQuestions(studySetId, frontendType, documentId = null) {
  const backendType = toBackendType(frontendType)
  const payload = {
    question_type: backendType,
  }
  if (documentId) {
    payload.document_id = documentId
  }
  return request(`/api/study-sets/${studySetId}/questions/generate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Fetch questions for a study set, optionally filtered by type.
 * Normalizes the backend response into the shape the existing Quiz UI expects.
 *
 * Returns: Array of { id, question_id, question, hint, options (for mcq), question_type }
 */
export async function fetchQuestions(studySetId, frontendType) {
  const backendType = toBackendType(frontendType)
  const url = `/api/study-sets/${studySetId}/questions?question_type=${backendType}`
  const data = await request(url)

  return data.questions.map((q, idx) => {
    const normalized = {
      id: idx + 1,                     // 1-based display index
      question_id: q.question_id,      // real backend id – preserved for submission
      question: q.question,
      hint: q.topic
        ? `Think about the key concepts related to ${q.topic.replace(/_/g, ' ')}.`
        : 'Consider the fundamental principles involved.',
      question_type: fromBackendType(q.question_type),
      marks: q.marks,
    }

    // Convert MCQ options  { "A":"…", "B":"…" }  →  [{ letter, text }]
    if (q.question_type === 'mcq' && q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
      normalized.options = Object.entries(q.options).map(([letter, text]) => ({
        letter,
        text,
      }))
    }

    return normalized
  })
}

// ── Attempts ─────────────────────────────────────────────────────────

/**
 * Create a new attempt (POST /api/attempts).
 * Returns the full AttemptResponse including attempt_id.
 */
export async function createAttempt(studySetId) {
  return request('/api/attempts', {
    method: 'POST',
    body: JSON.stringify({ study_set_id: studySetId }),
  })
}

// ── Answer Submission ────────────────────────────────────────────────

/**
 * Submit answers for one question-type section.
 *
 * @param {string} attemptId
 * @param {string} frontendType  – 'mcq' | 'short-answer' | 'application'
 * @param {Array<{ question_id: string, student_answer: string }>} answers
 */
export async function submitAnswers(attemptId, frontendType, answers) {
  const backendType = toBackendType(frontendType)
  return request(`/api/attempts/${attemptId}/answers`, {
    method: 'POST',
    body: JSON.stringify({
      question_type: backendType,
      attempt_id: attemptId,
      answers,
    }),
  })
}

// ── Finish Attempt ───────────────────────────────────────────────────

export async function finishAttempt(attemptId) {
  return request(`/api/attempts/${attemptId}/finish`, {
    method: 'POST',
  })
}

// ── Evaluations / Results ─────────────────────────────────────────────

export async function fetchEvaluations(attemptId) {
  return request(`/api/attempts/${attemptId}/evaluations`)
}

export async function fetchPerformance(attemptId) {
  return request(`/api/attempts/${attemptId}/performance`)
}

export async function fetchResults(attemptId) {
  return request(`/api/attempts/${attemptId}/results`)
}
