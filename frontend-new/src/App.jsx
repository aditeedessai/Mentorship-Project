import { useEffect, useState } from "react";
import UploadPage from "./pages/UploadPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ResultsPage from "./pages/ResultsPage";
import ConfigureSession from "./pages/ConfigureSession";
import MCQPage from "./pages/MCQPage";
import QnAPage from "./pages/QnAPage";
import Sidebar from "./components/Sidebar";
import api from "./api/api";

import {
  CheckCircle,
  CalendarDays,
  Clock,
  Circle,
  BookOpen,
  X,
} from "lucide-react";

function App() {
  // ================= AUTH STATE =================
  const [authPage, setAuthPage] = useState("login");

  // ================= USER STATE =================
  const [user, setUser] = useState(null);

  // ================= PAGE STATE =================
  const [currentPage, setCurrentPage] = useState("dashboard");

  // ================= STUDY SET STATE =================
  const [studySets, setStudySets] = useState([]);
  const [studySetsLoading, setStudySetsLoading] = useState(false);
  const [studySetsError, setStudySetsError] = useState("");
  const [showCreateStudySet, setShowCreateStudySet] = useState(false);
  const [studySetName, setStudySetName] = useState("");

  // ================= SELECTED STUDY SET =================
  const [selectedStudySetId, setSelectedStudySetId] = useState(null);

  // ================= FETCH STUDY SETS =================
  useEffect(() => {
    const fetchStudySets = async () => {
      try {
        setStudySetsLoading(true);
        setStudySetsError("");

        const data = await api.get("/api/study-sets");

        setStudySets(data.study_sets || []);
      } catch (error) {
        console.error("Failed to fetch study sets:", error);
        setStudySetsError("Unable to load study sets.");
      } finally {
        setStudySetsLoading(false);
      }
    };

    fetchStudySets();
  }, []);

  // ================= CREATE STUDY SET =================
  const handleCreateStudySet = async () => {
    if (!studySetName.trim()) {
      setStudySetsError("Please enter a study set name.");
      return;
    }

    try {
      setStudySetsLoading(true);
      setStudySetsError("");

      const response = await api.post("/api/study-sets", {
        name: studySetName.trim(),
      });

      console.log("Study set created:", response);

      setStudySets((prev) => [...prev, response]);

      setStudySetName("");
      setShowCreateStudySet(false);
    } catch (error) {
      console.error("Error creating study set:", error);

      setStudySetsError(
        error.response?.data?.detail ||
          "Failed to create study set."
      );
    } finally {
      setStudySetsLoading(false);
    }
  };

  // ================= SIGN UP =================
  const handleSignUp = (userData) => {
    setUser(userData);
    setAuthPage("dashboard");
  };

  // ================= LOGIN =================
  const handleLogin = () => {
    setUser({
      name: "Alex",
      email: "student@example.com",
    });

    setAuthPage("dashboard");
  };

  // ================= AUTH =================
  if (authPage === "login") {
    return (
      <LoginPage
        onLogin={handleLogin}
        onSignUp={() => setAuthPage("signup")}
      />
    );
  }

  if (authPage === "signup") {
    return (
      <SignUpPage
        onSignUp={handleSignUp}
        onLogin={() => setAuthPage("login")}
      />
    );
  }

  // ================= QUIZ PAGES =================
  if (currentPage === "quiz-configure") {
    return (
      <ConfigureSession />
    );
  }

  if (currentPage === "quiz-mcq") {
    return (
      <MCQPage />
    );
  }

  if (currentPage === "quiz-qna") {
    return (
      <QnAPage />
    );
  }

  // ================= MAIN APP =================
  return (
    <div className="flex min-h-screen bg-[#F8FAFA]">

      {/* ================= SIDEBAR ================= */}
      <Sidebar
        onNavigate={setCurrentPage}
        currentPage={currentPage}
      />

      {/* ================= MAIN CONTENT ================= */}
      <main className="ml-64 flex-1 overflow-y-auto p-8">

        {/* ================= UPLOAD ================= */}
        {currentPage === "upload" && (
          <UploadPage
            studySetId={selectedStudySetId}
          />
        )}

        {/* ================= RESULTS / PROGRESS ================= */}
        {(currentPage === "results" ||
          currentPage === "progress") && (
          <ResultsPage />
        )}

        {/* ================= QUIZ CONFIGURATION ================= */}
        {currentPage === "quiz" && (
          <ConfigureSession />
        )}

        {/* ================= DASHBOARD ================= */}
        {currentPage === "dashboard" && (
          <>
            {/* ================= HEADER ================= */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#3E3E75]">
                Good morning, {user?.name || "Alex"}
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Let's optimize your study session today.
              </p>
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

            {/* ================= STUDY SETS ================= */}
            <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

              <div className="mb-6 flex items-center justify-between">

                <div>
                  <h2 className="text-xl font-semibold text-[#3E3E75]">
                    Your Study Sets
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Continue learning from your uploaded materials.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowCreateStudySet(true);
                    setStudySetsError("");
                  }}
                  className="rounded-lg bg-[#4E1F6E] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3E3E75] hover:shadow-md"
                >
                  + Create Study Set
                </button>

              </div>

              {/* CREATE STUDY SET FORM */}
              {showCreateStudySet && (
                <div className="mb-6 rounded-xl border border-[#98E8DE] bg-[#F8FAFA] p-5">

                  <div className="mb-4 flex items-center justify-between">

                    <div>
                      <h3 className="text-lg font-semibold text-[#3E3E75]">
                        Create Study Set
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Give your new study set a name.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setShowCreateStudySet(false);
                        setStudySetName("");
                        setStudySetsError("");
                      }}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>

                  </div>

                  <input
                    type="text"
                    placeholder="Enter study set name"
                    value={studySetName}
                    onChange={(e) => {
                      setStudySetName(e.target.value);
                      setStudySetsError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateStudySet();
                      }
                    }}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-[#3E3E75] outline-none transition focus:border-[#45A9A9] focus:ring-2 focus:ring-[#98E8DE]/40"
                  />

                  {studySetsError && (
                    <p className="mt-2 text-sm text-red-500">
                      {studySetsError}
                    </p>
                  )}

                  <div className="mt-4 flex justify-end gap-3">

                    <button
                      onClick={() => {
                        setShowCreateStudySet(false);
                        setStudySetName("");
                        setStudySetsError("");
                      }}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleCreateStudySet}
                      disabled={studySetsLoading}
                      className="rounded-lg bg-[#4E1F6E] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#3E3E75] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {studySetsLoading ? "Creating..." : "Create"}
                    </button>

                  </div>
                </div>
              )}

              {/* STUDY SETS */}
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

                {studySetsLoading && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <p className="text-sm text-gray-500">
                      Loading study sets...
                    </p>
                  </div>
                )}

                {studySetsError && !showCreateStudySet && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <p className="text-sm text-red-500">
                      {studySetsError}
                    </p>
                  </div>
                )}

                {!studySetsLoading &&
                  !studySetsError &&
                  studySets.length === 0 && (
                    <div className="md:col-span-2 lg:col-span-3">
                      <p className="text-sm text-gray-500">
                        No study sets found.
                      </p>
                    </div>
                  )}

                {!studySetsLoading &&
                  !studySetsError &&
                  studySets.map((studySet) => (
                    <div
                      key={studySet.study_set_id}
                      className="group rounded-xl border border-gray-100 bg-gray-50 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#98E8DE] hover:bg-white hover:shadow-md"
                    >

                      <div className="mb-4 flex items-start justify-between">

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#98E8DE]/50">
                          <BookOpen
                            size={21}
                            className="text-[#4E1F6E]"
                          />
                        </div>

                        <span className="rounded-full bg-[#98E8DE] px-3 py-1 text-xs font-medium text-[#3E3E75]">
                          Ready
                        </span>

                      </div>

                      <h3 className="text-base font-semibold text-[#3E3E75]">
                        {studySet.name}
                      </h3>

                      <p className="mt-2 text-xs text-gray-500">
                        Study materials
                      </p>

                      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">

                        <span>Study Set</span>

                        <span>
                          {studySet.created_at
                            ? new Date(
                                studySet.created_at
                              ).toLocaleDateString()
                            : "Recently created"}
                        </span>

                      </div>

                      <button
                        onClick={() => {
                          setSelectedStudySetId(
                            studySet.study_set_id
                          );
                          setCurrentPage("upload");
                        }}
                        className="mt-5 flex items-center gap-1 text-sm font-semibold text-[#4E1F6E] transition-all duration-200 group-hover:gap-2"
                      >
                        Continue Studying
                        <span>→</span>
                      </button>

                    </div>
                  ))}

              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;