import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

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

import JotLandingTest from "./pages/JotLandingTest";
import LandingPage from "./pages/LandingPage";
import AboutPage from "./pages/AboutPage";
import SettingsPage from "./pages/SettingsPage";
import PlannerPage from "./pages/PlannerPage";

import Sidebar from "./components/Sidebar";
import BackToTop from "./components/BackToTop";


import {
  fetchStudySets,
  deleteStudySet,
  deleteAllStudySets,
} from "./services/api";

import { supabase } from "./services/supabase";

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

  // ================= AUTH STATE =================
  const [authPage, setAuthPage] = useState("landing");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpType, setOtpType] = useState("signup");
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");

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
    } else if (state?.studySetId) {
      setSelectedStudySetId(state.studySetId);
    }

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
        setStudySets([]);
        setSelectedStudySetId(null);
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
      <ResetPasswordPage
        onComplete={() => {
          setNeedsPasswordReset(false);
          setAuthPage("login");
        }}
      />
    );
  }

  // ================= PUBLIC / AUTH PAGES =================
  // 1. Jot Landing Page ALWAYS opens first when launching the app
  if (authPage === "landing") {
    return (
      <JotLandingTest
        onNavigate={(page) => {
          if (page === "login" && user) {
            setAuthPage("app");
          } else {
            setAuthPage(page);
          }
        }}
      />
    );
  }

  if (!user || authPage !== "app") {
    // About Us
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

  if (currentPage === "change-password-otp" && user) {
    return (
      <VerifyOtpPage
        email={user.email}
        type="recovery"
        onVerified={() => handleNavigate("change-password-new")}
        onBack={() => handleNavigate("settings")}
      />
    );
  }

  if (currentPage === "change-password-new" && user) {
    return (
      <ResetPasswordPage
        onComplete={() => {
          setSettingsNotice("Your password has been changed successfully.");
          handleNavigate("settings");
        }}
      />
    );
  }

  // ================= MAIN AUTHENTICATED APP =================
  return (
    <MainAppLayout
      onNavigate={handleNavigate}
      currentPage={currentPage}
      user={user}
    >
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
    </MainAppLayout>
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

