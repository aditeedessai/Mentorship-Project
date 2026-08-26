import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import StudySetsPage from "./pages/StudySetsPage";
import ResultsPage from "./pages/ResultsPage";
import ConfigureSession from "./pages/ConfigureSession";
import MCQPage from "./pages/MCQPage";
import QnAPage from "./pages/QnAPage";
import Sidebar from "./components/Sidebar";

import {
  fetchStudySets,
  createStudySet,
  deleteStudySet,
} from "./services/api";

import { supabase } from "./services/supabase";

import {
  CheckCircle,
  CalendarDays,
  Clock,
  Circle,
  BookOpen,
} from "lucide-react";

function App() {
  const location = useLocation();

  // ================= AUTH STATE =================
  const [authPage, setAuthPage] = useState("login");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpType, setOtpType] = useState("signup");
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);

  // ================= USER STATE =================
  const [user, setUser] = useState(null);

  // ================= PAGE STATE =================
  const [currentPage, setCurrentPage] = useState("dashboard");

  // ================= STUDY SET STATE =================
  const [studySets, setStudySets] = useState([]);
  const [studySetsLoading, setStudySetsLoading] = useState(false);
  const [studySetsError, setStudySetsError] = useState("");

  // ================= SELECTED STUDY SET =================
  const [selectedStudySetId, setSelectedStudySetId] = useState(null);

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
        setStudySets([]);
        setSelectedStudySetId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ================= FETCH STUDY SETS =================
  useEffect(() => {
    if (!user) return;

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
  }, [user]);

  // ================= CREATE STUDY SET =================
  const handleCreateStudySet = async (name) => {
    if (!name?.trim()) {
      setStudySetsError("Please enter a study set name.");
      return false;
    }

    try {
      setStudySetsLoading(true);
      setStudySetsError("");

      const newSet = await createStudySet(name.trim());

      setStudySets((prev) => [newSet, ...prev]);
      setSelectedStudySetId(newSet.study_set_id);

      return true;
    } catch (error) {
      console.error("Failed to create study set:", error);
      setStudySetsError("Failed to create study set.");
      return false;
    } finally {
      setStudySetsLoading(false);
    }
  };

  // ================= DELETE STUDY SET =================
  const handleDeleteStudySet = async (studySetId) => {
    try {
      setStudySetsError("");

      await deleteStudySet(studySetId);

      // Remove the deleted study set from the UI immediately
      setStudySets((prev) =>
        prev.filter(
          (studySet) => studySet.study_set_id !== studySetId
        )
      );

      // If the deleted set was selected, clear the selection
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

  // ================= PASSWORD RESET CHECK =================
  // Takes priority over the auth gate below: verifying a recovery OTP
  // establishes a real Supabase session, but the user must set a new
  // password before being allowed into the app.
  if (needsPasswordReset) {
    return (
      <ResetPasswordPage
        onComplete={() => {
          setNeedsPasswordReset(false);
          setAuthPage("login");
        }}
      />
    );
  }

  // ================= AUTH CHECK =================
  if (!user) {
    if (authPage === "login") {
      return (
        <LoginPage
          onLogin={setUser}
          onSignUp={() => setAuthPage("signup")}
          onForgotPassword={() => setAuthPage("forgot-password")}
        />
      );
    }

    if (authPage === "signup") {
      return (
        <SignUpPage
          onSignUpSuccess={(email) => {
            setPendingEmail(email);
            setOtpType("signup");
            setAuthPage("verify-otp");
          }}
          onLogin={() => setAuthPage("login")}
        />
      );
    }

    if (authPage === "forgot-password") {
      return (
        <ForgotPasswordPage
          onCodeSent={(email) => {
            setPendingEmail(email);
            setOtpType("recovery");
            setAuthPage("verify-otp");
          }}
          onBack={() => setAuthPage("login")}
        />
      );
    }

    if (authPage === "verify-otp") {
      return (
        <VerifyOtpPage
          email={pendingEmail}
          type={otpType}
          onVerified={() => {
            if (otpType === "recovery") {
              setNeedsPasswordReset(true);
            }
            // For signup, the onAuthStateChange listener above picks up
            // the new session and sets `user`, which moves the app past
            // this auth gate into the dashboard automatically.
          }}
          onBack={() => setAuthPage("login")}
        />
      );
    }
  }

  // ================= QUIZ PAGES =================
  if (
    location.pathname === "/quiz/mcq" ||
    currentPage === "quiz-mcq"
  ) {
    return <MCQPage />;
  }

  if (
    location.pathname === "/quiz/qna" ||
    currentPage === "quiz-qna"
  ) {
    return <QnAPage />;
  }

  // ================= MAIN APP =================
  return (
    <div className="flex min-h-screen bg-[#F8FAFA]">

      {/* ================= SIDEBAR ================= */}
      <Sidebar
        onNavigate={setCurrentPage}
        currentPage={currentPage}
        user={user}
      />

      {/* ================= MAIN CONTENT ================= */}
      <main className="ml-64 flex-1 overflow-y-auto p-8">

        {/* ================= UPLOAD ================= */}
        {currentPage === "upload" && (
          <UploadPage
            studySetId={selectedStudySetId}
            onNavigate={setCurrentPage}
          />
        )}

        {/* ================= STUDY SETS ================= */}
        {currentPage === "study-sets" && (
          <StudySetsPage
            studySets={studySets}
            studySetsLoading={studySetsLoading}
            studySetsError={studySetsError}
            onCreateStudySet={handleCreateStudySet}
            onDeleteStudySet={handleDeleteStudySet}
            onContinueStudying={(studySetId) => {
              setSelectedStudySetId(studySetId);
              setCurrentPage("upload");
            }}
          />
        )}

        {/* ================= RESULTS / PROGRESS ================= */}
        {(currentPage === "results" ||
          currentPage === "progress") && (
          <ResultsPage
            onNavigate={(page, state) => {
              if (state?.studySetId) {
                setSelectedStudySetId(state.studySetId);
              }
              setCurrentPage(page);
            }}
          />
        )}

        {/* ================= QUIZ CONFIGURATION ================= */}
        {currentPage === "quiz" && (
          <ConfigureSession
            studySetId={selectedStudySetId}
            studySetName={
              studySets.find((s) => s.study_set_id === selectedStudySetId)?.name
            }
          />
        )}

        {/* ================= DASHBOARD ================= */}
        {currentPage === "dashboard" && (
          <>
            {/* ================= HEADER ================= */}
            <div className="mb-8 flex items-start justify-between">

              <div>
                <h1 className="text-3xl font-bold text-[#3E3E75]">
                  Good morning, {user?.name || "Alex"}
                </h1>

                <p className="mt-2 text-sm text-gray-500">
                  Let's optimize your study session today.
                </p>
              </div>

              {/* CREATE STUDY SET */}
              <button
                onClick={() => {
                  setStudySetsError("");
                  setCurrentPage("study-sets");
                }}
                className="flex items-center gap-2 rounded-lg bg-[#4E1F6E] px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3E3E75] hover:shadow-md"
              >
                <BookOpen size={18} />
                Create Study Set
              </button>

            </div>

            {/* ================= TOP ROW ================= */}
            <div className="grid gap-6 lg:grid-cols-3">

              {/* ---------- EXAM READINESS ---------- */}
              <div className="rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md lg:col-span-2">

                <div className="mb-5 flex items-start justify-between">

                  <div>
                    <h2 className="text-xl font-semibold text-[#3E3E75]">
                      Exam Readiness
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Based on recent performance and AI analysis.
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#98E8DE]/40">
                    <CheckCircle
                      size={20}
                      className="text-[#4E1F6E]"
                    />
                  </div>

                </div>

                <div className="flex items-center gap-8">

                  <div className="flex h-28 w-28 items-center justify-center rounded-full border-[8px] border-[#45A9A9]">

                    <span className="text-3xl font-bold text-[#4E1F6E]">
                      85
                      <span className="text-lg">%</span>
                    </span>

                  </div>

                  <div className="flex-1">

                    <div className="rounded-xl bg-gray-50 p-4">

                      <div className="flex items-center gap-2">

                        <CheckCircle
                          size={16}
                          className="text-[#45A9A9]"
                        />

                        <span className="text-sm font-semibold text-[#3E3E75]">
                          Calculus Midterm
                        </span>

                      </div>

                      <p className="mt-1 text-xs text-gray-500">
                        Projected score: A-
                      </p>

                    </div>

                    <div className="mt-4 flex gap-2">

                      <span className="rounded-full bg-[#98E8DE] px-3 py-1 text-xs font-medium text-[#3E3E75]">
                        On Track
                      </span>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-[#3E3E75]">
                        Focus: Integrals
                      </span>

                    </div>

                  </div>

                </div>

              </div>

              {/* ---------- UPCOMING EXAMS ---------- */}
              <div className="rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">

                <div className="mb-5 flex items-center gap-2">

                  <CalendarDays
                    size={18}
                    className="text-[#4E1F6E]"
                  />

                  <h2 className="text-sm font-bold uppercase tracking-wide text-[#4E1F6E]">
                    Upcoming Exams
                  </h2>

                </div>

                <div className="space-y-4">

                  <div className="border-l-4 border-[#4E1F6E] pl-3">

                    <div className="flex justify-between">

                      <span className="text-sm font-semibold text-[#3E3E75]">
                        Calculus II
                      </span>

                      <span className="text-xs font-bold text-[#4E1F6E]">
                        Oct 15
                      </span>

                    </div>

                    <p className="text-xs text-gray-500">
                      Midterm • 3 days
                    </p>

                  </div>

                  <div className="border-l-4 border-[#45A9A9] pl-3">

                    <div className="flex justify-between">

                      <span className="text-sm font-semibold text-[#3E3E75]">
                        Physics 101
                      </span>

                      <span className="text-xs font-bold text-[#4E1F6E]">
                        Oct 18
                      </span>

                    </div>

                    <p className="text-xs text-gray-500">
                      Quiz • 6 days
                    </p>

                  </div>

                  <div className="border-l-4 border-gray-300 pl-3">

                    <div className="flex justify-between">

                      <span className="text-sm font-semibold text-[#3E3E75]">
                        Psychology
                      </span>

                      <span className="text-xs font-bold text-[#4E1F6E]">
                        Oct 25
                      </span>

                    </div>

                    <p className="text-xs text-gray-500">
                      Final Paper • 13 days
                    </p>

                  </div>

                </div>

              </div>

            </div>

            {/* ================= SECOND ROW ================= */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">

              {/* ---------- TODAY'S TASKS ---------- */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">

                <div className="mb-6 flex items-center justify-between">

                  <div>

                    <h2 className="text-xl font-semibold text-[#3E3E75]">
                      Today's Tasks
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Stay on top of your study goals.
                    </p>

                  </div>

                  <Clock
                    size={20}
                    className="text-[#4E1F6E]"
                  />

                </div>

                <div className="space-y-4">

                  <div className="flex items-center gap-3 rounded-xl bg-[#98E8DE]/30 p-4">

                    <CheckCircle
                      size={20}
                      className="text-[#45A9A9]"
                    />

                    <div className="flex-1">

                      <p className="text-sm font-semibold text-[#3E3E75]">
                        Review Calculus notes
                      </p>

                      <p className="text-xs text-gray-500">
                        30 minutes
                      </p>

                    </div>

                    <span className="text-xs font-medium text-[#45A9A9]">
                      Done
                    </span>

                  </div>

                  <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">

                    <Circle
                      size={20}
                      className="text-[#3E3E75]"
                    />

                    <div className="flex-1">

                      <p className="text-sm font-semibold text-[#3E3E75]">
                        Complete Physics quiz
                      </p>

                      <p className="text-xs text-gray-500">
                        20 minutes
                      </p>

                    </div>

                    <span className="text-xs font-medium text-gray-500">
                      Pending
                    </span>

                  </div>

                  <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">

                    <Circle
                      size={20}
                      className="text-[#3E3E75]"
                    />

                    <div className="flex-1">

                      <p className="text-sm font-semibold text-[#3E3E75]">
                        Revise Psychology
                      </p>

                      <p className="text-xs text-gray-500">
                        25 minutes
                      </p>

                    </div>

                    <span className="text-xs font-medium text-gray-500">
                      Pending
                    </span>

                  </div>

                </div>

              </div>

              {/* ---------- TOPIC MASTERY ---------- */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">

                <div className="mb-6">

                  <h2 className="text-xl font-semibold text-[#3E3E75]">
                    Topic Mastery
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Your current understanding by subject.
                  </p>

                </div>

                <div className="space-y-6">

                  <div>

                    <div className="mb-2 flex justify-between">

                      <span className="text-sm font-medium text-[#3E3E75]">
                        Calculus
                      </span>

                      <span className="text-sm font-bold text-[#4E1F6E]">
                        92%
                      </span>

                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">

                      <div
                        className="h-full rounded-full bg-[#45A9A9]"
                        style={{ width: "92%" }}
                      />

                    </div>

                  </div>

                  <div>

                    <div className="mb-2 flex justify-between">

                      <span className="text-sm font-medium text-[#3E3E75]">
                        Physics
                      </span>

                      <span className="text-sm font-bold text-[#4E1F6E]">
                        88%
                      </span>

                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">

                      <div
                        className="h-full rounded-full bg-[#4E1F6E]"
                        style={{ width: "88%" }}
                      />

                    </div>

                  </div>

                  <div>

                    <div className="mb-2 flex justify-between">

                      <span className="text-sm font-medium text-[#3E3E75]">
                        Psychology
                      </span>

                      <span className="text-sm font-bold text-[#4E1F6E]">
                        85%
                      </span>

                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">

                      <div
                        className="h-full rounded-full bg-[#98E8DE]"
                        style={{ width: "85%" }}
                      />

                    </div>

                  </div>

                </div>

              </div>

            </div>
          </>
        )}

      </main>
    </div>
  );
}

export default App;