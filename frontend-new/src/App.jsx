import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import StudySetsPage from "./pages/StudySetsPage";
import IndivisualStudySetPage from "./pages/indivisualStudySetPage";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ResultsPage from "./pages/ResultsPage";
import ConfigureSession from "./pages/ConfigureSession";
import MCQPage from "./pages/MCQPage";
import QnAPage from "./pages/QnAPage";
import Sidebar from "./components/Sidebar";

import {
  fetchStudySets,
  deleteStudySet,
} from "./services/api";

import { supabase } from "./services/supabase";

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

  // ================= CENTRAL NAVIGATION HANDLER =================
  const handleNavigate = (page, state) => {
    if (page === "upload") {
      // When navigating to upload, start a fresh study set creation flow
      setSelectedStudySetId(null);
    } else if (state?.studySetId) {
      setSelectedStudySetId(state.studySetId);
    }
    setCurrentPage(page);
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
        onNavigate={handleNavigate}
        currentPage={currentPage}
        user={user}
      />

      {/* ================= MAIN CONTENT ================= */}
      <main className="ml-64 flex-1 overflow-y-auto p-8">
        {/* ================= UPLOAD ================= */}
        {currentPage === "upload" && (
          <UploadPage
            onNavigate={handleNavigate}
            onStudySetCreated={(newStudySet) => {
              setStudySets((prev) => [newStudySet, ...prev]);
              setSelectedStudySetId(newStudySet.study_set_id);
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
              handleNavigate("study-set", { studySetId });
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

        {/* ================= RESULTS / PROGRESS ================= */}
        {(currentPage === "results" ||
          currentPage === "progress") && (
            <ResultsPage
              onNavigate={handleNavigate}
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
          <DashboardPage user={user} onNavigate={handleNavigate} />
        )}
      </main>
    </div>
  );
}

export default App;
