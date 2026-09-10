import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  BookOpen,
  FileText,
  ArrowRight,
  Search,
  X,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import {
  fetchStudySetDocuments,
  fetchRevisionStatus,
} from "../services/api";
import jojoWaving from "../assets/jojo-waving.png";

function StudySetsPage({
  studySets,
  studySetsLoading,
  studySetsError,
  onCreateClick,
  onDeleteStudySet,
  onContinueStudying,
}) {
  const { isDarkMode } = useTheme();

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [cardMeta, setCardMeta] = useState({});

  const loadCardMeta = useCallback(async (sets) => {
    const results = {};

    await Promise.allSettled(
      sets.map(async (ss) => {
        const id = ss.study_set_id;

        try {
          const [docs, revStatus] = await Promise.allSettled([
            fetchStudySetDocuments(id),
            fetchRevisionStatus(id),
          ]);

          const docList =
            docs.status === "fulfilled"
              ? docs.value || []
              : [];

          const statuses =
            revStatus.status === "fulfilled"
              ? revStatus.value?.statuses || []
              : [];

          results[id] = {
            docCount: docList.length,
            hasProgress: statuses.some(
              (s) => s.attempts_taken > 0
            ),
            statuses,
            loaded: true,
          };
        } catch {
          results[id] = {
            docCount: 0,
            hasProgress: false,
            statuses: [],
            loaded: true,
          };
        }
      })
    );

    setCardMeta((prev) => ({
      ...prev,
      ...results,
    }));
  }, []);

  useEffect(() => {
    if (studySets.length > 0) {
      loadCardMeta(studySets);
    }
  }, [studySets, loadCardMeta]);

  const getPriority = (docCount) => {
    if (docCount >= 11) {
      return {
        label: "High",
        color: isDarkMode
          ? "bg-red-500/20 text-red-300 border border-red-500/30"
          : "bg-red-100 text-red-700",
      };
    }

    if (docCount >= 6) {
      return {
        label: "Mid",
        color: isDarkMode
          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
          : "bg-amber-100 text-amber-700",
      };
    }

    return {
      label: "Low",
      color: isDarkMode
        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
        : "bg-emerald-100 text-emerald-700",
    };
  };

  const getProgress = (id) => {
    const meta = cardMeta[id];

    if (!meta || !meta.loaded) return 0;

    const statuses = meta.statuses || [];

    const touchedCount = statuses.filter(
      (s) => s.attempts_taken > 0
    ).length;

    return Math.min(touchedCount * 25, 100);
  };

  const getCtaLabel = (id) => {
    const meta = cardMeta[id];

    if (meta && meta.hasProgress) {
      return "Continue";
    }

    return "Start";
  };

  const getDescription = (studySet) => {
    const meta = cardMeta[studySet.study_set_id];

    if (meta && meta.docCount > 0) {
      return `${meta.docCount} study material${
        meta.docCount > 1 ? "s" : ""
      }`;
    }

    return "Study materials";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Recently";

    const d = new Date(dateStr);

    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  };

  const handleDeleteClick = (studySet) => {
    setDeleteError(null);
    setDeleteTarget(studySet);
  };

  const handleCancelDelete = () => {
    if (deletingId) return;

    setDeleteTarget(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeletingId(deleteTarget.study_set_id);
      setDeleteError(null);

      await onDeleteStudySet(deleteTarget.study_set_id);

      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete study set:", error);

      setDeleteError(
        "Failed to delete study set. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredStudySets = studySets.filter((studySet) => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return true;

    const nameMatch = studySet.name
      ?.toLowerCase()
      .includes(query);

    const descMatch = getDescription(studySet)
      ?.toLowerCase()
      .includes(query);

    return nameMatch || descMatch;
  });

  return (
    <div className="study-sets-page-animated">
      {/* =====================================================
          ANIMATION STYLES
      ===================================================== */}
      <style>{`
        @keyframes studyPageEnter {
          0% {
            opacity: 0;
            transform: translateY(22px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes studyHeaderEnter {
          0% {
            opacity: 0;
            transform: translateX(-28px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes studyButtonEnter {
          0% {
            opacity: 0;
            transform: translateY(16px) scale(0.94);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes jojoStudyFloat {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }

          25% {
            transform: translateY(-7px) rotate(-1.5deg);
          }

          50% {
            transform: translateY(-11px) rotate(1deg);
          }

          75% {
            transform: translateY(-5px) rotate(-1deg);
          }
        }

        @keyframes jojoStudyGlow {
          0%,
          100% {
            opacity: 0.35;
            transform: scale(0.92);
          }

          50% {
            opacity: 0.7;
            transform: scale(1.08);
          }
        }

        @keyframes speechBubbleStudy {
          0% {
            opacity: 0;
            transform: translateX(15px) scale(0.75);
          }

          70% {
            transform: translateX(-3px) scale(1.04);
          }

          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes buttonShineStudy {
          0% {
            transform: translateX(-130%) skewX(-18deg);
          }

          45%,
          100% {
            transform: translateX(160%) skewX(-18deg);
          }
        }

        @keyframes sectionEnterStudy {
          0% {
            opacity: 0;
            transform: translateY(25px);
          }

          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes cardEnterStudy {
          0% {
            opacity: 0;
            transform: translateY(35px) scale(0.94);
          }

          65% {
            opacity: 1;
            transform: translateY(-4px) scale(1.01);
          }

          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes badgePopStudy {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }

          70% {
            transform: scale(1.12);
          }

          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes emptyFloatStudy {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-7px);
          }
        }

        @keyframes searchGlowStudy {
          0% {
            box-shadow: 0 0 0 rgba(128, 100, 199, 0);
          }

          100% {
            box-shadow: 0 0 0 4px rgba(128, 100, 199, 0.08);
          }
        }

        @keyframes shimmerStudy {
          0% {
            transform: translateX(-120%);
          }

          100% {
            transform: translateX(120%);
          }
        }

        @keyframes deleteShakeStudy {
          0%,
          100% {
            transform: rotate(0deg);
          }

          25% {
            transform: rotate(-8deg);
          }

          75% {
            transform: rotate(8deg);
          }
        }

        @keyframes arrowStudy {
          0%,
          100% {
            transform: translateX(0);
          }

          50% {
            transform: translateX(5px);
          }
        }

        /* =====================================================
           JOJO ORBIT ANIMATIONS
        ===================================================== */

        @keyframes studyOrbitClockwise {
          0% {
            transform: rotate(0deg);
          }

          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes studyOrbitCounter {
          0% {
            transform: rotate(360deg);
          }

          100% {
            transform: rotate(0deg);
          }
        }

        @keyframes studyOrbitBubble {
          0%,
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 0.8;
          }

          50% {
            transform: scale(1.25) rotate(12deg);
            opacity: 1;
          }
        }

        @keyframes studyOrbitSparkle {
          0%,
          100% {
            transform: scale(0.75) rotate(0deg);
            opacity: 0.45;
          }

          50% {
            transform: scale(1.25) rotate(90deg);
            opacity: 1;
          }
        }

        @keyframes studyOrbitGlow {
          0%,
          100% {
            opacity: 0.25;
            transform: scale(0.92);
          }

          50% {
            opacity: 0.55;
            transform: scale(1.08);
          }
        }

        .study-page-enter {
          animation: studyPageEnter 0.7s
            cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .study-header-content {
          animation: studyHeaderEnter 0.75s
            cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .study-create-button {
          position: relative;
          overflow: hidden;
          animation: studyButtonEnter 0.7s
            cubic-bezier(0.22, 1, 0.36, 1) 0.25s both;
        }

        .study-create-button::after {
          content: "";
          position: absolute;
          top: -30%;
          left: 0;
          width: 35%;
          height: 160%;
          background: rgba(255, 255, 255, 0.18);
          transform: translateX(-130%) skewX(-18deg);
          animation: buttonShineStudy 4.5s
            ease-in-out 1.5s infinite;
          pointer-events: none;
        }

        .study-jojo {
          animation: jojoStudyFloat 4.2s ease-in-out infinite;
          transform-origin: center bottom;
        }

        .study-jojo-glow {
          animation: jojoStudyGlow 3.5s ease-in-out infinite;
        }

        .study-speech {
          transform-origin: left center;
          animation: speechBubbleStudy 0.65s
            cubic-bezier(0.22, 1, 0.36, 1) 0.65s both;
        }

        /* =====================================================
           ORBIT CLASSES
        ===================================================== */

        .study-orbit-clockwise {
          animation: studyOrbitClockwise 13s linear infinite;
        }

        .study-orbit-counter {
          animation: studyOrbitCounter 18s linear infinite;
        }

        .study-orbit-bubble {
          animation: studyOrbitBubble 2.8s ease-in-out infinite;
        }

        .study-orbit-sparkle {
          animation: studyOrbitSparkle 2.4s ease-in-out infinite;
        }

        .study-orbit-glow {
          animation: studyOrbitGlow 3.5s ease-in-out infinite;
        }

        .study-section-enter {
          animation: sectionEnterStudy 0.75s
            cubic-bezier(0.22, 1, 0.36, 1) 0.35s both;
        }

        .study-search:focus-within {
          animation: searchGlowStudy 0.25s ease-out forwards;
        }

        .study-card {
          animation: cardEnterStudy 0.7s
            cubic-bezier(0.22, 1, 0.36, 1) both;
          transform-origin: center center;
        }

        .study-card:hover {
          transform: translateY(-7px) scale(1.015);
        }

        .study-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.35s ease;
          box-shadow:
            0 18px 45px rgba(128, 100, 199, 0.14);
        }

        .study-card:hover::before {
          opacity: 1;
        }

        .study-card-icon {
          transition: transform 0.3s ease;
        }

        .study-card:hover .study-card-icon {
          transform: translateY(-3px) rotate(-3deg) scale(1.05);
        }

        .study-count-badge {
          animation: badgePopStudy 0.5s
            cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .study-card:hover .study-count-badge {
          transform: scale(1.06);
        }

        .study-delete:hover svg {
          animation: deleteShakeStudy 0.35s ease-in-out;
        }

        .study-cta-arrow {
          transition: transform 0.25s ease;
        }

        .study-card:hover .study-cta-arrow {
          animation: arrowStudy 0.7s ease-in-out infinite;
        }

        .study-empty-icon {
          animation: emptyFloatStudy 2.8s ease-in-out infinite;
        }

        .study-loading-card {
          position: relative;
          overflow: hidden;
        }

        .study-loading-card::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 45%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.06),
            transparent
          );
          transform: translateX(-120%);
          animation: shimmerStudy 1.8s ease-in-out infinite;
          pointer-events: none;
        }

        .study-card,
        .study-create-button,
        .study-search,
        .study-delete {
          will-change: transform;
        }

        /* =====================================================
           REDUCED MOTION
        ===================================================== */

        @media (prefers-reduced-motion: reduce) {
          .study-page-enter,
          .study-header-content,
          .study-create-button,
          .study-jojo,
          .study-jojo-glow,
          .study-speech,
          .study-section-enter,
          .study-card,
          .study-count-badge,
          .study-empty-icon,
          .study-loading-card::after,
          .study-orbit-clockwise,
          .study-orbit-counter,
          .study-orbit-bubble,
          .study-orbit-sparkle,
          .study-orbit-glow {
            animation: none !important;
          }

          .study-card:hover {
            transform: none !important;
          }
        }

        /* =====================================================
           MOBILE ORBIT SIZING
        ===================================================== */

        @media (max-width: 640px) {
          .study-orbit-outer {
            width: 155px !important;
            height: 155px !important;
            margin-left: -77.5px !important;
            margin-top: -77.5px !important;
          }

          .study-orbit-inner {
            width: 118px !important;
            height: 118px !important;
            margin-left: -59px !important;
            margin-top: -59px !important;
          }
        }
      `}</style>

      <div className="study-page-enter">
        {/* =====================================================
            HEADER
        ===================================================== */}
        <div
          className={`mb-8 overflow-visible rounded-3xl border p-5 backdrop-blur-2xl transition-all duration-500 sm:p-8 ${
            isDarkMode
              ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
              : "border-[#8064C7]/20 bg-gradient-to-r from-[#E5DCF8] to-[#F1EAFA] text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.06)]"
          }`}
        >
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            {/* =================================================
                LEFT CONTENT
            ================================================= */}
            <div className="study-header-content min-w-0">
              <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
                Study Sets
              </h1>

              <p
                className={`mt-2 text-xs font-medium sm:text-sm ${
                  isDarkMode
                    ? "text-white/50"
                    : "text-[#706A78]"
                }`}
              >
                Create and manage your study sets.
              </p>

              <button
                type="button"
                onClick={onCreateClick}
                className="study-create-button mt-6 flex items-center gap-2 rounded-xl bg-[#8064C7] px-5 py-3 text-xs font-bold text-white shadow-[0_8px_20px_rgba(128,100,199,0.20)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#7357B9] sm:px-6"
              >
                <BookOpen
                  size={17}
                  className="transition-transform duration-300 group-hover:rotate-[-8deg]"
                />

                Create Study Set
              </button>
            </div>

            {/* =================================================
                JOJO HEADER + ORBITS
            ================================================= */}
            <div className="relative flex h-[170px] w-[330px] shrink-0 items-center justify-center">
              {/* Soft ambient glow */}
              <div className="study-orbit-glow pointer-events-none absolute left-1/2 top-1/2 h-[210px] w-[210px] -ml-[105px] -mt-[105px] rounded-full bg-[#8064C7]/10 blur-3xl" />

              {/* Static outer ring */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[190px] w-[190px] -ml-[95px] -mt-[95px] rounded-full border border-[#8064C7]/15" />

              {/* =================================================
                  OUTER ROTATING ORBIT
              ================================================= */}
              <div className="study-orbit-clockwise study-orbit-outer pointer-events-none absolute left-1/2 top-1/2 h-[190px] w-[190px] -ml-[95px] -mt-[95px]">
                {/* Top dot */}
                <span className="absolute left-1/2 top-[-4px] h-2 w-2 -translate-x-1/2 rounded-full bg-[#8064C7]/60 shadow-[0_0_12px_rgba(128,100,199,0.35)]" />

                {/* Right sparkle */}
                <span className="study-orbit-sparkle absolute right-[-5px] top-1/2 -translate-y-1/2 text-sm font-black text-[#8064C7]/70">
                  ✦
                </span>

                {/* Bottom dot */}
                <span className="absolute bottom-[-4px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#8064C7]/45" />

                {/* Left sparkle */}
                <span className="study-orbit-sparkle absolute left-[-5px] top-1/2 -translate-y-1/2 text-xs font-black text-[#8064C7]/60">
                  ✦
                </span>
              </div>

              {/* Static inner dashed ring */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[145px] w-[145px] -ml-[72.5px] -mt-[72.5px] rounded-full border border-dashed border-[#8064C7]/15" />

              {/* =================================================
                  INNER COUNTER-ROTATING ORBIT
              ================================================= */}
              <div className="study-orbit-counter study-orbit-inner pointer-events-none absolute left-1/2 top-1/2 h-[145px] w-[145px] -ml-[72.5px] -mt-[72.5px]">
                {/* Top-left sparkle */}
                <span className="study-orbit-sparkle absolute left-[8px] top-[4px] text-[10px] font-black text-[#8064C7]/55">
                  ✦
                </span>

                {/* Top-right dot */}
                <span className="study-orbit-bubble absolute right-[8px] top-[6px] h-2 w-2 rounded-full bg-[#8064C7]/55" />

                {/* Bottom-right dot */}
                <span className="absolute bottom-[10px] right-[13px] h-1.5 w-1.5 rounded-full bg-[#8064C7]/40" />

                {/* Bottom-left sparkle */}
                <span className="study-orbit-sparkle absolute bottom-[7px] left-[15px] text-[9px] font-black text-[#8064C7]/45">
                  ✦
                </span>
              </div>

              {/* =================================================
                  JOJO
              ================================================= */}
              <div className="relative z-10 flex h-[150px] w-[150px] items-end justify-center">
                {/* Jojo glow */}
                <div className="study-jojo-glow pointer-events-none absolute bottom-1 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-[#8064C7]/15 blur-3xl" />

                <img
                  src={jojoWaving}
                  alt="Jojo waving"
                  className="study-jojo relative z-10 h-[135px] w-[135px] object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,0.13)] sm:h-[145px] sm:w-[145px]"
                />
              </div>

              {/* =================================================
                  SPEECH BUBBLE
              ================================================= */}
              <div className="study-speech absolute left-[calc(50%+72px)] top-[4px] z-20">
                <div
                  className={`relative w-[175px] rounded-2xl border px-4 py-3 shadow-[0_10px_24px_rgba(70,55,110,0.12)] ${
                    isDarkMode
                      ? "border-[#8064C7]/20 bg-[#211D2B] text-[#F3F0F8]"
                      : "border-[#8064C7]/15 bg-white"
                  }`}
                >
                  <p
                    className={`whitespace-nowrap text-[11px] font-black leading-tight sm:text-xs ${
                      isDarkMode
                        ? "text-[#CFC4EA]"
                        : "text-[#4F3A7D]"
                    }`}
                  >
                    Ready to study? 👋
                  </p>

                  {/* Bubble tail */}
                  <div
                    className={`absolute left-[-7px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-45 border-b border-l ${
                      isDarkMode
                        ? "border-[#8064C7]/20 bg-[#211D2B]"
                        : "border-[#8064C7]/15 bg-white"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            STUDY SETS CONTAINER
        ===================================================== */}
        <div
          className={`study-section-enter rounded-3xl border p-4 backdrop-blur-2xl transition-all duration-500 sm:p-6 ${
            isDarkMode
              ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
              : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
          }`}
        >
          {/* =================================================
              SECTION HEADER
          ================================================= */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight sm:text-xl">
                Your Study Sets
              </h2>

              <p
                className={`mt-0.5 text-xs ${
                  isDarkMode
                    ? "text-white/50"
                    : "text-gray-500"
                }`}
              >
                Continue learning from your uploaded materials.
              </p>
            </div>

            {!studySetsLoading &&
              studySets.length > 0 && (
                <div className="study-search relative w-full sm:w-64 md:w-72">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 transition-transform duration-300"
                  />

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) =>
                      setSearchQuery(e.target.value)
                    }
                    placeholder="Search study sets..."
                    className={`w-full rounded-xl border py-2.5 pl-10 pr-9 text-xs outline-none transition-all ${
                      isDarkMode
                        ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7]"
                        : "border-gray-200 bg-white text-[#292530] placeholder:text-gray-400 focus:border-[#8064C7]"
                    }`}
                  />

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 transition-opacity hover:opacity-100"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}
          </div>

          {/* =================================================
              LOADING
          ================================================= */}
          {studySetsLoading && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    animationDelay: `${i * 100}ms`,
                  }}
                  className={`study-loading-card animate-pulse rounded-2xl border p-4 ${
                    isDarkMode
                      ? "border-white/5 bg-white/5"
                      : "border-gray-100 bg-white/50"
                  }`}
                >
                  <div className="mb-3 flex justify-between">
                    <div className="h-6 w-14 rounded-lg bg-current opacity-10" />
                    <div className="h-5 w-12 rounded-lg bg-current opacity-10" />
                  </div>

                  <div className="mb-2 h-5 w-3/4 rounded-lg bg-current opacity-10" />

                  <div className="mb-4 h-3 w-1/2 rounded-lg bg-current opacity-10" />

                  <div className="h-4 w-1/3 rounded-lg bg-current opacity-10" />
                </div>
              ))}
            </div>
          )}

          {/* =================================================
              ERROR
          ================================================= */}
          {studySetsError && (
            <p className="text-sm font-semibold text-red-400">
              {studySetsError}
            </p>
          )}

          {/* =================================================
              EMPTY STATE
          ================================================= */}
          {!studySetsLoading &&
            !studySetsError &&
            studySets.length === 0 && (
              <div
                className={`rounded-2xl border border-dashed py-12 text-center ${
                  isDarkMode
                    ? "border-white/10 bg-white/5"
                    : "border-gray-200 bg-white/50"
                }`}
              >
                <div className="study-empty-icon">
                  <BookOpen
                    size={36}
                    className="mx-auto mb-3 opacity-30"
                  />
                </div>

                <p className="text-sm font-bold">
                  No study sets yet
                </p>

                <p
                  className={`mt-1 text-xs ${
                    isDarkMode
                      ? "text-white/50"
                      : "text-gray-500"
                  }`}
                >
                  Create your first study set to get started.
                </p>

                <button
                  type="button"
                  onClick={onCreateClick}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#8064C7] px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#8B6DD4]"
                >
                  <Plus size={15} />
                  Create Study Set
                </button>
              </div>
            )}

          {/* =================================================
              NO SEARCH RESULTS
          ================================================= */}
          {!studySetsLoading &&
            !studySetsError &&
            studySets.length > 0 &&
            filteredStudySets.length === 0 && (
              <div
                className={`rounded-2xl border border-dashed py-10 text-center ${
                  isDarkMode
                    ? "border-white/10 bg-white/5"
                    : "border-gray-200 bg-white/50"
                }`}
              >
                <div className="study-empty-icon">
                  <Search
                    size={30}
                    className="mx-auto mb-2 opacity-30"
                  />
                </div>

                <p className="text-sm font-bold">
                  No study sets matching "{searchQuery}"
                </p>

                <p
                  className={`mt-1 text-xs ${
                    isDarkMode
                      ? "text-white/50"
                      : "text-gray-500"
                  }`}
                >
                  Try searching with a different term.
                </p>

                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-3 text-xs font-bold text-[#8064C7] hover:underline dark:text-[#A78BFA]"
                >
                  Clear search
                </button>
              </div>
            )}

          {/* =================================================
              STUDY SET CARDS
          ================================================= */}
          {!studySetsLoading &&
            !studySetsError &&
            filteredStudySets.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {filteredStudySets.map((studySet, index) => {
                  const id = studySet.study_set_id;
                  const meta = cardMeta[id] || {};
                  const docCount = meta.docCount || 0;
                  const priority = getPriority(docCount);
                  const progress = getProgress(id);
                  const ctaLabel = getCtaLabel(id);

                  return (
                    <div
                      key={id}
                      style={{
                        animationDelay: `${0.12 + index * 0.11}s`,
                      }}
                      className={`study-card relative flex flex-col rounded-2xl border p-4 backdrop-blur-xl transition-all duration-300 ${
                        isDarkMode
                          ? "border-white/10 bg-[#211D2B]/80 hover:border-[#8064C7]/50 hover:bg-[#252033]"
                          : "border-black/5 bg-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-[#8064C7]/30 hover:bg-white"
                      }`}
                    >
                      {/* CARD TOP */}
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`study-count-badge flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold ${
                              isDarkMode
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                            style={{
                              animationDelay: `${0.35 + index * 0.11}s`,
                            }}
                          >
                            <FileText
                              size={13}
                              className="study-card-icon"
                            />

                            <span>{docCount}</span>
                          </div>

                          {docCount > 0 && (
                            <span
                              className={`study-count-badge rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isDarkMode
                                  ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                              style={{
                                animationDelay: `${0.42 + index * 0.11}s`,
                              }}
                            >
                              Ready
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Priority Badge - kept unchanged/commented
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${priority.color}`}
                          >
                            {priority.label}
                          </span>
                          */}

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteClick(studySet)
                            }
                            disabled={Boolean(deletingId)}
                            title="Delete study set"
                            aria-label={`Delete ${studySet.name}`}
                            className="study-delete flex h-7 w-7 items-center justify-center rounded-lg opacity-40 transition-opacity hover:text-red-400 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* CARD TITLE */}
                      <h3 className="mt-1 min-h-[44px] line-clamp-2 text-lg font-black leading-snug tracking-tight">
                        {studySet.name}
                      </h3>

                      <p
                        className={`mb-4 text-xs ${
                          isDarkMode
                            ? "text-white/50"
                            : "text-gray-500"
                        }`}
                      >
                        {getDescription(studySet)}
                      </p>

                      {/* CARD BOTTOM & CTA */}
                      <div className="mt-auto pt-2">
                        <div className="flex items-end justify-between">
                          <div className="text-[11px] leading-tight opacity-60">
                            <span className="block">
                              Created
                            </span>

                            <span className="block font-bold">
                              {formatDate(
                                studySet.created_at
                              )}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              onContinueStudying(id)
                            }
                            className="group flex items-center gap-1 text-xs font-black text-[#8064C7] transition hover:text-[#8B6DD4] dark:text-[#A78BFA]"
                          >
                            <span>
                              {ctaLabel} Studying
                            </span>

                            <ArrowRight
                              size={15}
                              className="study-cta-arrow shrink-0"
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>

        {/* =====================================================
            DELETE MODAL
        ===================================================== */}
        <DeleteConfirmModal
          isOpen={Boolean(deleteTarget)}
          title="Delete study set?"
          itemName={deleteTarget?.name || ""}
          warningText="This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          isLoading={Boolean(deletingId)}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      </div>
    </div>
  );
}

export default StudySetsPage;