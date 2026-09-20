/**
 * Error Classification Helper for Question Generation & Session Configuration
 *
 * Classifies raw API/LLM/backend errors into structured, user-friendly error objects.
 * Guarantees that raw exception text, stack traces, localhost URLs, HTTP status codes,
 * and Gemini/Google internal metric strings are NEVER displayed directly to the end user.
 *
 * @param {Error|Object|string} err - The error caught during session init or question generation
 * @returns {{ type: string, title: string, message: string, secondaryMessage?: string, showRetry: boolean }}
 */
export function classifyQuestionGenerationError(err) {
  if (!err) return null;

  // If already a classified error object, return it directly
  if (typeof err === "object" && err !== null && err.title && err.message) {
    return err;
  }

  const rawMsg = typeof err === "string" ? err : (err?.message || err?.detail || String(err));
  const rawLower = rawMsg.toLowerCase();

  // Classify on the HTTP status + response BODY only - never on the full
  // message. The message also embeds the request URL (which contains
  // study-set / attempt UUIDs), and a UUID that happens to contain "429",
  // "401" or "403" used to be misread as a quota / auth error no matter
  // what actually went wrong.
  const status =
    typeof err?.status === "number"
      ? err.status
      : Number((rawMsg.match(/\u2192\s*(\d{3})\s*:/) || [])[1]) || null;
  const body = (
    typeof err?.body === "string"
      ? err.body
      : rawMsg.includes("\u2192")
      ? rawMsg.slice(rawMsg.indexOf("\u2192"))
      : rawMsg
  ).toLowerCase();

  // CATEGORY 0 - OUR OWN backend rate limiter (api/rate_limiter.py):
  // 429 + "Rate limit exceeded". This is NOT a Gemini quota problem, so it
  // must not say "the AI generation limit has been reached".
  if (
    status === 429 &&
    body.includes("rate limit exceeded") &&
    !body.includes("resource_exhausted")
  ) {
    return {
      type: "rate_limit",
      title: "Too Many Requests",
      message:
        "You've started several question generations in a short time. Please wait a minute or two, then try again.",
      secondaryMessage: "Your study set and selected options are still saved.",
      showRetry: true,
    };
  }

  // CATEGORY 1 - Gemini quota exhausted (429 / RESOURCE_EXHAUSTED)
  if (
    body.includes("resource_exhausted") ||
    body.includes("quota") ||
    body.includes("generaterequestsperday") ||
    /\b429\b/.test(body)
  ) {
    return {
      type: "quota",
      title: "Question Generation Temporarily Unavailable",
      message:
        "We couldn't generate your questions right now because the AI generation limit has been reached. Please try again later.",
      secondaryMessage: "Your study set and selected options are still saved.",
      showRetry: true,
    };
  }

  // CATEGORY 1b - Gemini temporarily overloaded / timed out (503 / 504).
  // Transient: the backend already retried, so a manual retry is
  // reasonable but the cause is not the user's quota.
  if (
    status === 503 ||
    status === 504 ||
    body.includes("unavailable") ||
    body.includes("overloaded") ||
    body.includes("deadline_exceeded")
  ) {
    return {
      type: "busy",
      title: "AI Service Is Busy",
      message:
        "The AI service is under heavy load right now. Please try again in a moment.",
      secondaryMessage: "Your study set and selected options are still saved.",
      showRetry: true,
    };
  }

  // CATEGORY 4 - Authentication / Session Expired (401 / 403)
  if (
    status === 401 ||
    status === 403 ||
    rawLower.includes("unauthorized") ||
    rawLower.includes("session expired")
  ) {
    return {
      type: "auth",
      title: "Session Expired",
      message: "Your session has expired. Please sign in again to continue.",
      showRetry: true,
    };
  }

  // CATEGORY 3 — Network / Server Connection Issue
  if (
    rawLower.includes("failed to fetch") ||
    rawLower.includes("networkerror") ||
    rawLower.includes("connection refused") ||
    rawLower.includes("is the backend server running") ||
    rawLower.includes("unreachable")
  ) {
    return {
      type: "network",
      title: "Connection Problem",
      message:
        "We couldn't connect to the study engine. Please check your connection and try again.",
      showRetry: true,
    };
  }

  // CATEGORY — Document upload pre-condition validation
  if (
    rawLower.includes("processing is incomplete") ||
    rawLower.includes("no text could be extracted")
  ) {
    return {
      type: "processing_incomplete",
      title: "Document Processing Incomplete",
      message:
        "The uploaded study material has not finished processing or could not be retrieved. Please wait a moment and try again.",
      showRetry: true,
    };
  }

  if (
    rawLower.includes("no study material") ||
    rawLower.includes("upload a document") ||
    rawLower.includes("upload a study material") ||
    rawLower.includes("upload documents first")
  ) {
    return {
      type: "validation",
      title: "Upload Required",
      message: "Please upload a study material document before starting a quiz session.",
      showRetry: false,
    };
  }

  // CATEGORY — Attempt creation failure
  if (
    rawLower.includes("could not establish an active attempt") ||
    rawLower.includes("failed to create quiz attempt")
  ) {
    return {
      type: "attempt_creation",
      title: "Session Initialization Failed",
      message: "Could not initialize the quiz session. Please refresh and try again.",
      showRetry: true,
    };
  }

  // CATEGORY — Section/Attempt pre-condition validation
  if (
    rawLower.includes("already completed") ||
    rawLower.includes("all 4 question sections") ||
    rawLower.includes("no study set selected")
  ) {
    return {
      type: "validation",
      title: "Action Needed",
      message: rawMsg,
      showRetry: false,
    };
  }

  // CATEGORY 2 — Generic Question Generation Failure (500 internal server error / parsing failure)
  return {
    type: "generic",
    title: "Unable to Generate Questions",
    message:
      "We couldn't generate questions for this study set right now. Please try again.",
    showRetry: true,
  };
}
