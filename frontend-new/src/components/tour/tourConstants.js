export const PENDING_FIRST_TOUR_PREFIX = "jot_pending_first_tour_";
export const PENDING_FIRST_TOUR_EMAIL_PREFIX = "jot_pending_first_tour_email_";
export const FIRST_TOUR_HANDLED_PREFIX = "jot_first_tour_handled_";
export const TOUR_STEP_SESSION_KEY = "jot_tour_current_step";

/**
 * Marks a newly created account as eligible for its automatic first-login tour.
 * Called immediately upon successful signup or signup OTP verification.
 */
export function markPendingFirstTour(userId, email) {
  console.log("[TOUR DEBUG] markPendingFirstTour called:", { userId, email });
  if (userId) {
    localStorage.setItem(`${PENDING_FIRST_TOUR_PREFIX}${userId}`, "true");
    sessionStorage.setItem("jot_pending_first_tour", userId);
  }
  if (email) {
    const normalized = email.trim().toLowerCase();
    localStorage.setItem(
      `${PENDING_FIRST_TOUR_EMAIL_PREFIX}${normalized}`,
      userId || "true"
    );
  }
}

/**
 * Checks whether an account has already completed or skipped its first automatic tour.
 */
export function isFirstTourHandled(userId) {
  if (!userId) return false;
  const handled = localStorage.getItem(`${FIRST_TOUR_HANDLED_PREFIX}${userId}`) === "true";
  return handled;
}

/**
 * Checks whether an account is pending its first automatic tour.
 * ONLY returns true for genuinely new accounts that were marked on creation/verification
 * and have not yet completed or skipped the tour.
 * Existing users whose accounts were created without this marker return false.
 */
export function isPendingFirstTour(userId, email) {
  if (!userId) return false;
  if (isFirstTourHandled(userId)) return false;

  const hasUserKey = localStorage.getItem(`${PENDING_FIRST_TOUR_PREFIX}${userId}`) === "true";
  if (hasUserKey) {
    return true;
  }
  const hasSessionKey = sessionStorage.getItem("jot_pending_first_tour") === userId;
  if (hasSessionKey) {
    return true;
  }
  if (email) {
    const emailKey = `${PENDING_FIRST_TOUR_EMAIL_PREFIX}${email.trim().toLowerCase()}`;
    if (localStorage.getItem(emailKey)) {
      return true;
    }
  }
  return false;
}

/**
 * Marks the first automatic tour as handled (completed or skipped) for this user.
 * Cleans up pending flags so the automatic tour never appears again.
 */
export function markFirstTourHandled(userId, email) {
  console.log("[TOUR DEBUG] markFirstTourHandled called for:", { userId, email });
  if (userId) {
    localStorage.setItem(`${FIRST_TOUR_HANDLED_PREFIX}${userId}`, "true");
    localStorage.removeItem(`${PENDING_FIRST_TOUR_PREFIX}${userId}`);
  }
  if (email) {
    localStorage.removeItem(
      `${PENDING_FIRST_TOUR_EMAIL_PREFIX}${email.trim().toLowerCase()}`
    );
  }
  sessionStorage.removeItem("jot_pending_first_tour");
}

/**
 * Polls the DOM until target element exists or timeout expires.
 */
export function waitForElement(selector, timeoutMs = 6000) {
  return new Promise((resolve) => {
    if (!selector) {
      return resolve(null);
    }
    const immediate = document.querySelector(selector);
    if (immediate) {
      return resolve(immediate);
    }

    const start = Date.now();
    let resolved = false;

    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) {
        resolved = true;
        observer.disconnect();
        resolve(found);
      } else if (Date.now() - start > timeoutMs) {
        resolved = true;
        observer.disconnect();
        resolve(document.querySelector(selector) || null);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    setTimeout(() => {
      if (!resolved) {
        observer.disconnect();
        resolve(document.querySelector(selector) || null);
      }
    }, timeoutMs);
  });
}

export const TOUR_STEPS = [
  {
    stepIndex: 0,
    page: "dashboard",
    selector: '[data-tour="dashboard"], [data-tour="dashboard-overview"]',
    title: "Dashboard Overview",
    description:
      "Welcome to Jot! This is your main dashboard overview where you can check today's tasks, upcoming exams, and your study activity at a glance.",
    side: "bottom",
    align: "start",
  },
  {
    stepIndex: 1,
    page: "upload",
    selector: '[data-tour="upload-area"]',
    title: "Upload & Create Study Sets",
    description:
      "Upload your lecture notes, textbook PDFs, or slides here. Jot automatically extracts the key concepts to generate smart summaries and flashcards.",
    side: "bottom",
    align: "start",
  },
  {
    stepIndex: 2,
    page: "study-sets",
    selector: '[data-tour="study-sets-area"]',
    title: "Your Study Sets",
    description:
      "All your study materials are organized into Study Sets. Open any set to study AI-crafted summaries, practice interactive flashcards, and create mnemonics.",
    side: "bottom",
    align: "start",
  },
  {
    stepIndex: 3,
    page: "quiz",
    selector: '[data-tour="quiz-area"]',
    title: "Quiz & Practice",
    description:
      "Test yourself using generated questions! Choose from Multiple Choice, Short Answer, Application-based, or Long Answer formats to master any topic.",
    side: "bottom",
    align: "start",
  },
  {
    stepIndex: 4,
    page: "planner",
    selector: '[data-tour="planner-area"]',
    title: "Study Planner & Calendar",
    description:
      "Organize your study and revision schedule here. Plan daily study sessions, track exam countdowns, and sync seamlessly with Google Calendar.",
    side: "bottom",
    align: "start",
  },
  {
    stepIndex: 5,
    page: "dashboard",
    selector: undefined, // Centered modal
    title: "You're All Set!",
    description:
      "You're all set! Jot it, organise it, and start learning 🚀",
    side: "over",
    align: "center",
  },
];
