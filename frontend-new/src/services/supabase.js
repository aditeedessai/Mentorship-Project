import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
  "https://hfwdvnnhoxjuwdjnwoer.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof process !== "undefined" && process.env?.SUPABASE_PUBLISHABLE_KEY) ||
  "sb_publishable_eol7NhkvRN-mLTtQhEk5WQ_fTrRTu8F";

/**
 * Custom fetch transport interceptor that handles both concurrent and sequential
 * duplicate-email signups cleanly.
 *
 * 1. Concurrent duplicate signup:
 *    When two concurrent requests sign up with the exact same email, both pass
 *    GoTrue's preliminary check. The losing request hits PostgreSQL's unique constraint
 *    `users_email_partial_key` (SQLSTATE 23505). GoTrue catches this unhandled DB error
 *    and returns HTTP 500 ("Database error saving new user" / code "unexpected_failure" / "23505").
 *    This interceptor converts that specific duplicate collision on POST /auth/v1/signup into HTTP 409 Conflict.
 *
 * 2. Sequential duplicate signup:
 *    When a user attempts to sign up with an already-registered email, Supabase GoTrue
 *    returns HTTP 200 with an empty identities array (`identities: []`) without sending any OTP.
 *    This interceptor detects this existing-account signature on POST /auth/v1/signup and converts
 *    it into HTTP 409 Conflict.
 *
 * All other unexpected 500 errors (database down, other endpoints, server errors) and valid
 * signups (identities.length > 0) are preserved as-is.
 */
export const customFetch = async (url, options) => {
  const response = await fetch(url, options);

  const urlString = typeof url === "string" ? url : url?.toString?.() || "";

  if (urlString.includes("/auth/v1/signup")) {
    // Case 1: Concurrent collision returning HTTP 500 on 23505 / users_email_partial_key
    if (response.status === 500) {
      try {
        const clone = response.clone();
        const body = await clone.json();

        // Narrowly identify the PostgreSQL 23505 / users_email_partial_key signup failure
        const isDuplicateEmailViolation =
          body?.code === "23505" ||
          (typeof body?.message === "string" &&
            (body.message.includes("users_email_partial_key") ||
              body.message.includes("duplicate key value") ||
              body.message.includes("Database error saving new user"))) ||
          (typeof body?.msg === "string" &&
            (body.msg.includes("users_email_partial_key") ||
              body.msg.includes("duplicate key value") ||
              body.msg.includes("Database error saving new user")));

        if (isDuplicateEmailViolation) {
          return new Response(
            JSON.stringify({
              code: 409,
              error_code: "user_already_exists",
              msg: "An account with this email already exists.",
            }),
            {
              status: 409,
              statusText: "Conflict",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
        }
      } catch {
        // If parsing fails (e.g. gateway HTML 500), pass through original response
      }
    }

    // Case 2: Sequential duplicate signup returning HTTP 200 with empty identities array
    if (response.status === 200) {
      try {
        const clone = response.clone();
        const body = await clone.json();

        // Supabase returns identities: [] when the email is already registered
        if (
          body?.identities &&
          Array.isArray(body.identities) &&
          body.identities.length === 0
        ) {
          return new Response(
            JSON.stringify({
              code: 409,
              error_code: "user_already_exists",
              msg: "An account with this email already exists.",
            }),
            {
              status: 409,
              statusText: "Conflict",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
        }
      } catch {
        // Pass through original response
      }
    }

    // Case 3: GoTrue returning HTTP 422 with "already registered"
    if (response.status === 422) {
      try {
        const clone = response.clone();
        const body = await clone.json();
        const msg = body?.message || body?.msg || "";
        if (typeof msg === "string" && msg.toLowerCase().includes("already registered")) {
          return new Response(
            JSON.stringify({
              code: 409,
              error_code: "user_already_exists",
              msg: "An account with this email already exists.",
            }),
            {
              status: 409,
              statusText: "Conflict",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
        }
      } catch {
        // Pass through original response
      }
    }
  }

  return response;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: {
    fetch: customFetch,
  },
});

