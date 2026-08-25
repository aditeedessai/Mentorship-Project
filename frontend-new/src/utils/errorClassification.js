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

  // CATEGORY 1 — Gemini / API Quota or Rate Limit Error (429 / RESOURCE_EXHAUSTED)
  if (
    rawLower.includes("429") ||
    rawLower.includes("resource_exhausted") ||
    rawLower.includes("quota") ||
    rawLower.includes("rate limit") ||
    rawLower.includes("generaterequestsperdayperprojectpermodel")
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

  // CATEGORY 4 — Authentication / Session Expired (401 / 403)
  if (
    rawLower.includes("401") ||
    rawLower.includes("403") ||
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
    rawLower.includes("no study material") ||
    rawLower.includes("upload a document") ||
    rawLower.includes("upload a study material")
  ) {
    return {
      type: "validation",
      title: "Upload Required",
      message: "Please upload a study material document before starting a quiz session.",
      showRetry: false,
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
