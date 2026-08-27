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


import LandingPage from "./pages/LandingPage";
import AboutPage from "./pages/AboutPage";
import SettingsPage from "./pages/SettingsPage";

import Sidebar from "./components/Sidebar";

import {
  fetchStudySets,
  deleteStudySet,
} from "./services/api";

import { supabase } from "./services/supabase";

function App() {
  const location = useLocation();

  // ================= AUTH STATE =================
  // Landing page is shown first when user is not authenticated
  const [authPage, setAuthPage] = useState("landing");
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
    // When starting a new upload/create-study-set flow,
    // make sure no previous study set remains selected.
    if (page === "upload") {
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

        // Return to landing page after logout
        setAuthPage("landing");
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

      // Remove deleted study set immediately from UI
      setStudySets((prev) =>
        prev.filter(
          (studySet) => studySet.study_set_id !== studySetId
        )
      );

      // Clear selection if deleted study set was selected
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

  // ================= PASSWORD RESET =================
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

  // ================= PUBLIC / AUTH PAGES =================
  if (!user) {
    // Landing Page — Shanallie's feature
    if (authPage === "landing") {
      return (
        <LandingPage
          onNavigate={setAuthPage}
        />
      );
    }

    // About Us — Shanallie's feature
    if (authPage === "about") {
      return (
        <AboutPage
          onNavigate={setAuthPage}
        />
      );
    }

    // Login
    if (authPage === "login") {
      return (
        <LoginPage
          onLogin={setUser}
          onSignUp={() => setAuthPage("signup")}
          onForgotPassword={() =>
            setAuthPage("forgot-password")
          }
          onBack={() => setAuthPage("landing")}
        />
      );
    }

    // Signup
    if (authPage === "signup") {
      return (
        <SignUpPage
          onSignUpSuccess={(email) => {
            setPendingEmail(email);
            setOtpType("signup");
            setAuthPage("verify-otp");
          }}
          onLogin={() => setAuthPage("login")}
          onBack={() => setAuthPage("landing")}
        />
      );
    }

    // Forgot Password
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

    // OTP Verification
    if (authPage === "verify-otp") {
      return (
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

  // ================= MAIN AUTHENTICATED APP =================
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
              studySets.find(
                (s) =>
                  s.study_set_id === selectedStudySetId
              )?.name
            }
          />
        )}

        {/* ================= SETTINGS ================= */}
        {currentPage === "settings" && (
          <SettingsPage
            onNavigate={handleNavigate}
            user={user}
          />
        )}

        {/* ================= DASHBOARD ================= */}
        {currentPage === "dashboard" && (
          <DashboardPage
            user={user}
            onNavigate={handleNavigate}
          />
        )}
      </main>
    </div>
  );
}

export default App;