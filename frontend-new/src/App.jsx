import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

import Sidebar from "./components/Sidebar";
import BackToTop from "./components/BackToTop";
import GoogleCalendarPrompt from "./components/GoogleCalendarPrompt";

// Every page is loaded on demand (its own network chunk fetched the
// first time currentPage/authPage actually selects it) instead of all
// ~19 pages downloading upfront on first paint - see PageFallback below
// for what renders while a given page's chunk is in flight. Sidebar and
// BackToTop above stay as regular imports since they're part of the
// shell itself, rendered on every authenticated view, not a single page.
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const UploadPage = lazy(() => import("./pages/UploadPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const StudySetsPage = lazy(() => import("./pages/StudySetsPage"));
const IndivisualStudySetPage = lazy(() => import("./pages/indivisualStudySetPage"));
const StudySetAttemptsPage = lazy(() => import("./pages/StudySetAttemptsPage"));
const VerifyOtpPage = lazy(() => import("./pages/VerifyOtpPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const ResultsPage = lazy(() => import("./pages/ResultsPage"));
const ConfigureSession = lazy(() => import("./pages/ConfigureSession"));
const MCQPage = lazy(() => import("./pages/MCQPage"));
const QnAPage = lazy(() => import("./pages/QnAPage"));

const JotLandingTest = lazy(() => import("./pages/JotLandingTest"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const PlannerPage = lazy(() => import("./pages/PlannerPage"));
const StudentProfilePage = lazy(() => import("./pages/StudentProfilePage"));


import {
  fetchStudySets,
  deleteStudySet,
  deleteAllStudySets,
} from "./services/api";

import { supabase } from "./services/supabase";

// Shown while a lazy-loaded page's chunk is being fetched - same visual
// language as the existing "Loading your profile..." gate below, just
// without a fixed background/min-h-screen wrapper so it also reads
// correctly nested inside MainAppLayout's <main> (padded, sidebar
// already visible) rather than only full-screen pre-login.
function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8064C7] border-t-transparent" />
    </div>
  );
}

function MainAppLayout({ children, onNavigate, currentPage, user }) {
  const { isDarkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-500 overflow-x-hidden relative ${isDarkMode ? "bg-[#0B0910] text-[#F3F0F8]" : "bg-[#F2F1F6] text-[#231B33]"
        }`}
    >
      {/* Subtle Background Ambient Glow Orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className={`absolute -left-40 -top-40 h-[550px] w-[550px] rounded-full blur-[160px] transition-colors duration-700 ${isDarkMode ? "bg-[#8064C7]/8" : "bg-[#8064C7]/4"
            }`}
        />
        <div
          className={`absolute -right-40 top-[20%] h-[500px] w-[500px] rounded-full blur-[160px] ${isDarkMode ? "bg-[#8064C7]/6" : "bg-[#A78BFA]/5"
            }`}
        />
        <div
          className={`absolute bottom-[-250px] left-[20%] h-[550px] w-[550px] rounded-full blur-[160px] ${isDarkMode ? "bg-[#6D45B8]/8" : "bg-[#8064C7]/4"
            }`}
        />
      </div>

      {/* Top Header Bar for Mobile / Tablet (< 1024px) */}
      <header
        className={`lg:hidden fixed top-0 left-0 right-0 z-30 flex h-16 items-center justify-between px-4 border-b backdrop-blur-2xl transition-colors duration-300 ${isDarkMode
          ? "border-white/10 bg-[#13101A]/90 text-[#F3F0F8]"
          : "border-black/5 bg-[#F8F8FC]/90 text-[#231B33]"
          }`}
      >
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${isDarkMode
            ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
            : "border-gray-200 bg-white text-[#231B33] hover:bg-gray-50 shadow-xs"
            }`}
          aria-label="Open Mobile Menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-1.5 font-black text-xl tracking-tight">
          <span>Jot</span>
          <span className="text-[#8064C7]">.</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${isDarkMode
              ? "bg-[#8064C7]/20 text-[#A78BFA]"
              : "bg-[#8064C7]/10 text-[#8064C7]"
              }`}
          >
            Study
          </span>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8064C7] text-xs font-bold text-white shadow-md">
          {user?.name ? user.name[0].toUpperCase() : "J"}
        </div>
      </header>

      <div className="flex min-h-screen">
        <Sidebar
          onNavigate={onNavigate}
          currentPage={currentPage}
          user={user}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <main className="lg:ml-64 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}


function AppContent() {
  const location = useLocation();
  // Pre-existing bug, unrelated to the revision-scheduler work - the
  // mandatory profile-loading spinner below (hasProfile === null ||
  // profileLoading) references isDarkMode, but nothing in this
  // component ever called useTheme() to bring it into scope. This threw
  // a ReferenceError and crashed to a blank white screen on every login
  // (hasProfile starts null on every fresh session), discovered while
  // trying to browser-verify the actual scoped fix. Flagging separately
  // since it's a real, if trivial, unrelated fix.
  const { isDarkMode } = useTheme();

  // ================= AUTH STATE =================
  const [authPage, setAuthPage] = useState("landing");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpType, setOtpType] = useState("signup");
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");

  // ================= STUDENT PROFILE GATE =================
  // null  = not yet checked
  // true  = profile exists in student_profiles
  // false = no profile → must show mandatory form
  const [hasProfile, setHasProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // ================= USER STATE =================
  const [user, setUser] = useState(null);

  // ================= PAGE STATE =================
  const [currentPage, setCurrentPage] = useState("dashboard");

  // ================= STUDY SET STATE =================
  const [studySets, setStudySets] = useState([]);
  const [studySetsLoading, setStudySetsLoading] = useState(false);
  const [studySetsError, setStudySetsError] = useState("");

  // ================= SELECTED STUDY SET & ATTEMPT =================
  const [selectedStudySetId, setSelectedStudySetId] = useState(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);

  // Which question type ConfigureSession should land on already
  // selected - set only when a navigation explicitly asks for one (e.g.
  // clicking a "Revise: X - Y" item on the Planner), cleared on every
  // other navigation so it never leaks into an unrelated later visit to
  // Configure Session.
  const [preselectType, setPreselectType] = useState(null);

  // ================= GOOGLE CALENDAR PROMPT =================
  // Shown once after a new user completes the student profile.
  const [showGcalPrompt, setShowGcalPrompt] = useState(false);

  // ================= SCROLL TO TOP ON PAGE SWITCH =================
  useEffect(() => {
    window.scrollTo(0, 0);
    const mainElement = document.querySelector("main");
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  }, [currentPage, authPage]);

  // ================= CENTRAL NAVIGATION HANDLER =================
  const handleNavigate = (page, state) => {
    if (page === "upload") {
      setSelectedStudySetId(null);
      setSelectedAttemptId(null);
    } else if (state?.studySetId) {
      setSelectedStudySetId(state.studySetId);
    }

    if (state?.attemptId) {
      setSelectedAttemptId(state.attemptId);
    } else if (page !== "results") {
      setSelectedAttemptId(null);
    }

    setPreselectType(state?.preselectType || null);

    setCurrentPage(page);
    window.scrollTo(0, 0);
    const mainElement = document.querySelector("main");
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  };


  // ================= AUTH SESSION LISTENER =================
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name:
            session.user.user_metadata?.full_name ||
            session.user.email.split("@")[0],
          email: session.user.email,
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name:
            session.user.user_metadata?.full_name ||
            session.user.email.split("@")[0],
          email: session.user.email,
        });
      } else {
        setUser(null);
        setHasProfile(null);
        setStudySets([]);
        setSelectedStudySetId(null);
        setAuthPage("landing");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ================= CHECK STUDENT PROFILE =================
  // Runs whenever the user object changes (login / logout / refresh).
  // Sets `hasProfile` so the rendering gate knows whether to show
  // the mandatory profile form or the main application.
  useEffect(() => {
    if (!user) {
      setHasProfile(null);
      return;
    }

    const checkProfile = async () => {
      setProfileLoading(true);
      try {
        const { data, error: fetchErr } = await supabase
          .from("student_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (fetchErr) {
          console.error("Failed to check student profile:", fetchErr);
          // On error, assume no profile so the form stays visible
          // (safe default — never silently grant access).
          setHasProfile(false);
        } else {
          setHasProfile(!!data);
        }
      } catch (err) {
        console.error("Unexpected error checking profile:", err);
        setHasProfile(false);
      } finally {
        setProfileLoading(false);
      }
    };

    checkProfile();
  }, [user]);

  // ================= FETCH STUDY SETS =================
  // Only fetch study sets once we know the profile exists —
  // no point loading app data if the user is going to be
  // stuck on the profile form.
  useEffect(() => {
    if (!user || !hasProfile) return;

    const loadStudySets = async () => {
      try {
        setStudySetsLoading(true);
        setStudySetsError("");

        const sets = await fetchStudySets();

        setStudySets(sets || []);
      } catch (error) {
        console.error("Failed to fetch study sets:", error);
        setStudySetsError("Unable to load study sets.");
      } finally {
        setStudySetsLoading(false);
      }
    };

    loadStudySets();
  }, [user, hasProfile]);

  // ================= DELETE STUDY SET =================
  const handleDeleteStudySet = async (studySetId) => {
    try {
      setStudySetsError("");

      await deleteStudySet(studySetId);

      setStudySets((prev) =>
        prev.filter(
          (studySet) => studySet.study_set_id !== studySetId
        )
      );

      if (selectedStudySetId === studySetId) {
        setSelectedStudySetId(null);
      }
    } catch (error) {
      console.error("Failed to delete study set:", error);

      setStudySetsError(
        "Failed to delete study set. Please try again."
      );

      throw error;
    }
  };

  // ================= DELETE ALL STUDY SETS =================
  const handleDeleteAllStudySets = async () => {
    try {
      setStudySetsError("");

      await deleteAllStudySets();

      setStudySets([]);
      setSelectedStudySetId(null);
    } catch (error) {
      console.error("Failed to delete all study sets:", error);

      setStudySetsError(
        "Failed to delete all study sets. Please try again."
      );

      throw error;
    }
  };

  // ================= PASSWORD RESET =================
  if (needsPasswordReset) {
    return (
      <Suspense fallback={<PageFallback />}>
        <ResetPasswordPage
          onComplete={() => {
            setNeedsPasswordReset(false);
            setAuthPage("login");
          }}
        />
      </Suspense>
    );
  }

  // ================= PUBLIC / AUTH PAGES =================
  // 1. Jot Landing Page ALWAYS opens first when launching the app
  if (authPage === "landing") {
    return (
      <Suspense fallback={<PageFallback />}>
        <JotLandingTest
          onNavigate={(page) => {
            if (page === "login" && user) {
              setAuthPage("app");
            } else {
              setAuthPage(page);
            }
          }}
        />
      </Suspense>
    );
  }

  if (!user || authPage !== "app") {
    // About Us
    if (authPage === "about") {
      return (
        <Suspense fallback={<PageFallback />}>
          <AboutPage
            onNavigate={setAuthPage}
          />
        </Suspense>
      );
    }

    // Login
    if (authPage === "login") {
      return (
        <Suspense fallback={<PageFallback />}>
          <LoginPage
            onLogin={(userData) => {
              setUser(userData);
              setAuthPage("app");
            }}
            onSignUp={() => setAuthPage("signup")}
            onForgotPassword={() =>
              setAuthPage("forgot-password")
            }
            onBack={() => setAuthPage("landing")}
          />
        </Suspense>
      );
    }

    // Signup
    if (authPage === "signup") {
      return (
        <Suspense fallback={<PageFallback />}>
          <SignUpPage
            onSignUpSuccess={(email) => {
              setPendingEmail(email);
              setOtpType("signup");
              setAuthPage("verify-otp");
            }}
            onLogin={() => setAuthPage("login")}
            onBack={() => setAuthPage("landing")}
          />
        </Suspense>
      );
    }

    // Forgot Password
    if (authPage === "forgot-password") {
      return (
        <Suspense fallback={<PageFallback />}>
          <ForgotPasswordPage
            onCodeSent={(email) => {
              setPendingEmail(email);
              setOtpType("recovery");
              setAuthPage("verify-otp");
            }}
            onBack={() => setAuthPage("login")}
          />
        </Suspense>
      );
    }

    // OTP Verification
    if (authPage === "verify-otp") {
      return (
        <Suspense fallback={<PageFallback />}>
          <VerifyOtpPage
            email={pendingEmail}
            type={otpType}
            onVerified={() => {
              if (otpType === "recovery") {
                setNeedsPasswordReset(true);
              } else {
                setAuthPage("login");
              }
            }}
            onBack={() => setAuthPage("login")}
          />
        </Suspense>
      );
    }
  }

  // ================= MANDATORY PROFILE GATE =================
  // If the user is authenticated but we haven't finished checking
  // whether their profile exists, show a loading state — never
  // flash the dashboard only to redirect a moment later.
  if (hasProfile === null || profileLoading) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center font-sans transition-colors duration-500 ${isDarkMode ? "bg-[#0E0B15] text-[#F5F2FA]" : "bg-[#F6F3FC] text-[#292530]"
          }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8064C7] border-t-transparent" />
          <span className={`text-sm font-semibold ${isDarkMode ? "text-white/50" : "text-gray-400"}`}>
            Loading your profile...
          </span>
        </div>
      </div>
    );
  }

  // If the profile doesn't exist yet, show the mandatory form.
  // There is no skip, close, or back button — the user MUST
  // complete this before accessing any authenticated page.


  if (hasProfile === false) {
    return (
      <Suspense fallback={<PageFallback />}>
        <StudentProfilePage
          user={user}
          onProfileComplete={() => {
            setHasProfile(true);
            setShowGcalPrompt(true);
          }}
        />
      </Suspense>
    );
  }

  // ================= QUIZ PAGES =================
  // MCQPage/QnAPage are reached via react-router's own navigate() (not
  // handleNavigate), so they're rendered here via a location.pathname
  // check rather than currentPage - genuinely necessary, since nothing
  // else sets currentPage to a quiz-page value before landing here.
  // `onNavigate` is passed through so these pages can keep currentPage
  // in sync with wherever they navigate NEXT (finish -> results, abort
  // -> dashboard, anti-cheat terminate -> dashboard) - see the
  // corresponding fix inside each page for why this matters: without
  // it, currentPage stays "quiz" forever, and every page these quiz
  // pages navigate to via react-router alone (bypassing onNavigate)
  // would silently render whatever stale page currentPage still says,
  // not the real destination.
  if (
    location.pathname === "/quiz/mcq" ||
    currentPage === "quiz-mcq"
  ) {
    return (
      <Suspense fallback={<PageFallback />}>
        <MCQPage onNavigate={handleNavigate} />
      </Suspense>
    );
  }

  if (
    location.pathname === "/quiz/qna" ||
    currentPage === "quiz-qna"
  ) {
    return (
      <Suspense fallback={<PageFallback />}>
        <QnAPage onNavigate={handleNavigate} />
      </Suspense>
    );
  }

  if (currentPage === "change-password-otp" && user) {
    return (
      <Suspense fallback={<PageFallback />}>
        <VerifyOtpPage
          email={user.email}
          type="recovery"
          onVerified={() => handleNavigate("change-password-new")}
          onBack={() => handleNavigate("settings")}
        />
      </Suspense>
    );
  }

  if (currentPage === "change-password-new" && user) {
    return (
      <Suspense fallback={<PageFallback />}>
        <ResetPasswordPage
          onComplete={() => {
            setSettingsNotice("Your password has been changed successfully.");
            handleNavigate("settings");
          }}
        />
      </Suspense>
    );
  }

  if (currentPage === "student-profile" && user) {
    return (
      <Suspense fallback={<PageFallback />}>
        <StudentProfilePage
          user={user}
          onProfileComplete={() => {
            handleNavigate("settings");
          }}
          onBack={() => handleNavigate("settings")}
        />
      </Suspense>
    );
  }

  // ================= MAIN AUTHENTICATED APP =================
  const mainContent = (
    <MainAppLayout
      onNavigate={handleNavigate}
      currentPage={currentPage}
      user={user}
    >
      <Suspense fallback={<PageFallback />}>
        {/* ================= ABOUT US ================= */}
        {currentPage === "about" && (
          <AboutPage
            onNavigate={handleNavigate}
          />
        )}

        {/* ================= UPLOAD ================= */}
        {currentPage === "upload" && (
          <UploadPage
            studySetId={selectedStudySetId}
            onNavigate={handleNavigate}
            onStudySetCreated={(newStudySet) => {
              setStudySets((prev) => [
                newStudySet,
                ...prev,
              ]);

              setSelectedStudySetId(
                newStudySet.study_set_id
              );
            }}
          />
        )}

        {/* ================= STUDY SETS ================= */}
        {currentPage === "study-sets" && (
          <StudySetsPage
            studySets={studySets}
            studySetsLoading={studySetsLoading}
            studySetsError={studySetsError}
            onCreateClick={() => {
              handleNavigate("upload");
            }}
            onDeleteStudySet={handleDeleteStudySet}
            onContinueStudying={(studySetId) => {
              handleNavigate("study-set", {
                studySetId,
              });
            }}
          />
        )}

        {/* ================= INDIVIDUAL STUDY SET ================= */}
        {currentPage === "study-set" && (
          <IndivisualStudySetPage
            studySetId={selectedStudySetId}
            studySets={studySets}
            onNavigate={handleNavigate}
          />
        )}

        {/* ================= VIEW ATTEMPTS ================= */}
        {(currentPage === "study-set-attempts" || currentPage === "attempts") && (
          <StudySetAttemptsPage
            studySetId={selectedStudySetId}
            studySets={studySets}
            onNavigate={handleNavigate}
          />
        )}

        {/* ================= RESULTS / PROGRESS ================= */}
        {(currentPage === "results" ||
          currentPage === "progress") && (
            <ResultsPage
              onNavigate={handleNavigate}
              studySetId={selectedStudySetId}
              attemptId={selectedAttemptId}
            />
          )}

        {/* ================= QUIZ CONFIGURATION ================= */}
        {currentPage === "quiz" && (
          <ConfigureSession
            studySetId={selectedStudySetId}
            studySetName={
              studySets.find(
                (s) =>
                  s.study_set_id === selectedStudySetId
              )?.name
            }
            preselectType={preselectType}
          />
        )}

        {/* ================= SETTINGS ================= */}
        {currentPage === "settings" && (
          <SettingsPage
            onNavigate={handleNavigate}
            user={user}
            notice={settingsNotice}
            onDismissNotice={() => setSettingsNotice("")}
            onDeleteAllStudySets={handleDeleteAllStudySets}
          />
        )}

        {/* ================= PLANNER ================= */}
        {currentPage === "planner" && (
          <PlannerPage onNavigate={handleNavigate} />
        )}

        {/* ================= DASHBOARD ================= */}
        {currentPage === "dashboard" && (
          <DashboardPage
            user={user}
            onNavigate={handleNavigate}
          />
        )}
      </Suspense>
    </MainAppLayout>
  );

  // Wrap with optional GCal prompt overlay
  return (
    <>
      {mainContent}
      {showGcalPrompt && (
        <GoogleCalendarPrompt onDismiss={() => setShowGcalPrompt(false)} />
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
      <BackToTop />
    </ThemeProvider>
  );
}

