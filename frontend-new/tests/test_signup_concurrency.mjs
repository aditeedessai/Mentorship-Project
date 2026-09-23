/**
 * Test Suite for TC153 - Signup Duplicate and Concurrency Handling
 *
 * Covers:
 * 1. New email -> successful signup -> OTP flow (identities.length > 0).
 * 2. Existing email -> controlled duplicate-email handling (HTTP 409 Conflict, no OTP flow).
 * 3. Concurrent same-email signup -> exactly one success and one controlled conflict.
 * 4. Unrelated HTTP 500 -> remains 500.
 */

import crypto from "crypto";
import path from "path";
import { supabase, customFetch } from "../src/services/supabase.js";

// Load environment variables from backend/.env if running under Node
if (typeof process !== "undefined" && process.loadEnvFile) {
  try {
    process.loadEnvFile(path.resolve("../backend/.env"));
  } catch (e) {
    try {
      process.loadEnvFile(path.resolve("backend/.env"));
    } catch (_) {}
  }
}

let allPassed = true;
const createdEmails = [];

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    allPassed = false;
    throw new Error(message);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

// 1. New email -> successful signup -> OTP flow
async function test1_new_email_successful_signup() {
  console.log("\n--- TEST 1: New Email -> Successful Signup -> OTP Flow ---");
  const testEmail = `tc153_new_${Date.now()}_${crypto.randomBytes(3).toString("hex")}@example.com`;
  const password = "SecurePassword123!";

  console.log(`Signing up new user with email: ${testEmail}`);
  const res = await supabase.auth.signUp({
    email: testEmail,
    password: password,
    options: { data: { full_name: "Brand New User" } },
  });

  assert(!res.error, `Signup succeeded without error (error: ${res.error?.message})`);
  assert(Boolean(res.data?.user?.id), `Created user has valid ID: ${res.data?.user?.id}`);
  assert(
    Array.isArray(res.data?.user?.identities) && res.data.user.identities.length > 0,
    `User has non-empty identities array (${res.data?.user?.identities?.length} identity) -> proceeds to OTP flow`
  );

  createdEmails.push(testEmail);
  return testEmail;
}

// 2. Existing email -> controlled duplicate-email handling
async function test2_existing_email_controlled_duplicate() {
  console.log("\n--- TEST 2: Existing Email -> Controlled Duplicate-Email Handling ---");

  // Use a known confirmed existing user
  const existingEmail = "23it48.nyla@pccegoa.edu.in";
  console.log(`Attempting sequential signup with existing email: ${existingEmail}`);

  const res = await supabase.auth.signUp({
    email: existingEmail,
    password: "AnyPassword123!",
    options: { data: { full_name: "Duplicate Attempt" } },
  });

  assert(Boolean(res.error), "Signup with existing email returned an error");
  assert(res.error?.status === 409, `Error status is 409 Conflict (got ${res.error?.status})`);
  assert(res.error?.status !== 500, "Error status is NOT 500 Internal Server Error");
  assert(
    res.error?.message === "An account with this email already exists.",
    `Error message is safe and controlled: "${res.error?.message}"`
  );
  assert(
    !res.data?.user,
    "res.data.user is null -> does not navigate to OTP verification"
  );
  assert(
    !res.error?.message?.includes("users_email_partial_key"),
    "Error does NOT leak PostgreSQL constraint name 'users_email_partial_key'"
  );
  assert(
    !JSON.stringify(res.error).includes("users_email_partial_key"),
    "Error object does NOT leak internal database details"
  );
}

// 3. Concurrent same-email signup -> exactly one success and one controlled conflict
async function test3_concurrent_same_email_signup() {
  console.log("\n--- TEST 3: Concurrent Same-Email Signup (Exact Same Moment) ---");
  const testEmail = `tc153_concurr_${Date.now()}_${crypto.randomBytes(3).toString("hex")}@example.com`;
  const password = "SecurePassword123!";

  console.log(`Sending 2 concurrent signups for email: ${testEmail}`);

  const [res0, res1] = await Promise.all([
    supabase.auth.signUp({
      email: testEmail,
      password: password,
      options: { data: { full_name: "Concurrent User A" } },
    }),
    supabase.auth.signUp({
      email: testEmail,
      password: password,
      options: { data: { full_name: "Concurrent User B" } },
    }),
  ]);

  const results = [res0, res1];
  const successes = results.filter((r) => r.data?.user && !r.error);
  const errors = results.filter((r) => r.error);

  assert(successes.length === 1, `Exactly one signup succeeded (got ${successes.length})`);
  assert(errors.length === 1, `Exactly one signup failed as conflict (got ${errors.length})`);

  const winningUser = successes[0].data.user;
  const losingError = errors[0].error;

  assert(Boolean(winningUser?.id), `Winning user has a valid user ID: ${winningUser?.id}`);
  assert(losingError.status === 409, `Losing request received HTTP 409 Conflict (got status ${losingError.status})`);
  assert(losingError.status !== 500, "Losing request did NOT receive HTTP 500");
  assert(
    losingError.message === "An account with this email already exists.",
    `Losing error message is controlled: "${losingError.message}"`
  );
  assert(
    !losingError.message.includes("users_email_partial_key"),
    "Losing error message does NOT expose PostgreSQL constraint name 'users_email_partial_key'"
  );

  createdEmails.push(testEmail);
}

// 4. Unrelated HTTP 500 -> remains 500
async function test4_unrelated_500_errors_not_converted() {
  console.log("\n--- TEST 4: Unrelated HTTP 500 Errors are NOT Converted ---");

  // Part A: 500 on an unrelated endpoint must not be converted
  const unrelatedUrl = "https://example.supabase.co/auth/v1/user";
  const fakeResponse1 = new Response(JSON.stringify({ code: 500, message: "Database connection failed" }), {
    status: 500,
    statusText: "Internal Server Error",
  });

  const origFetch = global.fetch;
  global.fetch = async () => fakeResponse1;

  try {
    const intercepted1 = await customFetch(unrelatedUrl, {});
    assert(intercepted1.status === 500, "Unrelated endpoint 500 error remains HTTP 500");
  } finally {
    global.fetch = origFetch;
  }

  // Part B: 500 on /signup that is NOT a duplicate-email error must not be converted
  const signupUrl = "https://example.supabase.co/auth/v1/signup";
  const fakeResponse2 = new Response(JSON.stringify({ code: 500, message: "SMTP service timeout" }), {
    status: 500,
    statusText: "Internal Server Error",
  });

  global.fetch = async () => fakeResponse2;

  try {
    const intercepted2 = await customFetch(signupUrl, {});
    assert(intercepted2.status === 500, "Unrelated signup 500 error (e.g. SMTP timeout) remains HTTP 500");
  } finally {
    global.fetch = origFetch;
  }
}

async function run() {
  try {
    await test1_new_email_successful_signup();
    await test2_existing_email_controlled_duplicate();
    await test3_concurrent_same_email_signup();
    await test4_unrelated_500_errors_not_converted();

    console.log("\n=========================================");
    console.log("✅ ALL 4 TC153 TESTS PASSED SUCCESSFULLY!");
    console.log("=========================================\n");
  } catch (err) {
    console.error("\n❌ TEST SUITE FAILED:", err);
    process.exitCode = 1;
  } finally {
    if (createdEmails.length > 0) {
      console.log(`Created test users for cleanup: ${createdEmails.join(", ")}`);
    }
  }
}

run();
