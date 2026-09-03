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
          // Every question type is independently scoped/scheduled now -
          // there is no single study-set-wide "active attempt" left to
          // ask about. revision-status gives real per-type progress
          // (has this type ever been completed) in one call instead.
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
            hasProgress: statuses.some((s) => s.attempts_taken > 0),
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
    const touchedCount = statuses.filter((s) => s.attempts_taken > 0).length;

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
    <div>
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
          {/* LEFT CONTENT */}
          <div className="min-w-0">
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
              className="mt-6 flex items-center gap-2 rounded-xl bg-[#8064C7] px-5 py-3 text-xs font-bold text-white shadow-[0_8px_20px_rgba(128,100,199,0.20)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#7357B9] sm:px-6"
            >
              <BookOpen size={17} />
              Create Study Set
            </button>
          </div>

          {/* =================================================
              JOJO HEADER
          ================================================= */}
          <div className="relative flex h-[150px] w-[330px] shrink-0 items-end">
            {/* Soft glow */}
            <div className="pointer-events-none absolute bottom-0 left-8 h-28 w-28 rounded-full bg-[#8064C7]/10 blur-3xl" />

            {/* Jojo */}
            <img
              src={jojoWaving}
              alt="Jojo waving"
              className="absolute bottom-0 left-0 z-10 h-[135px] w-[135px] object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,0.13)] sm:h-[145px] sm:w-[145px]"
            />

            {/* Speech bubble */}
            <div className="absolute left-[145px] top-[18px] z-20">
              <div className="relative w-[175px] rounded-2xl border border-[#8064C7]/15 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(70,55,110,0.12)]">
                <p className="whitespace-nowrap text-[11px] font-black leading-tight text-[#4F3A7D] sm:text-xs">
                  Ready to study? 👋
                </p>

                {/* Bubble tail */}
                <div className="absolute left-[-7px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-45 border-b border-l border-[#8064C7]/15 bg-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          STUDY SETS CONTAINER
      ===================================================== */}
      <div
        className={`rounded-3xl border p-4 backdrop-blur-2xl transition-all duration-500 sm:p-6 ${
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
              <div className="relative w-full sm:w-64 md:w-72">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"
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
                className={`animate-pulse rounded-2xl border p-4 ${
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

                <div className="mb-4 h-2 w-full rounded-full bg-current opacity-10" />

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
              <BookOpen
                size={36}
                className="mx-auto mb-3 opacity-30"
              />

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
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#8064C7] px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#8B6DD4]"
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
              <Search
                size={30}
                className="mx-auto mb-2 opacity-30"
              />

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
              {filteredStudySets.map((studySet) => {
                const id = studySet.study_set_id;
                const meta = cardMeta[id] || {};
                const docCount = meta.docCount || 0;
                const priority = getPriority(docCount);
                const progress = getProgress(id);
                const ctaLabel = getCtaLabel(id);

                return (
                  <div
                    key={id}
                    className={`flex flex-col rounded-2xl border p-4 backdrop-blur-xl transition-all duration-300 ${
                      isDarkMode
                        ? "border-white/10 bg-[#211D2B]/80 hover:border-[#8064C7]/50 hover:bg-[#252033]"
                        : "border-black/5 bg-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-[#8064C7]/30 hover:bg-white"
                    }`}
                  >
                    {/* CARD TOP */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold ${
                            isDarkMode
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          <FileText size={13} />
                          <span>{docCount}</span>
                        </div>

                        {docCount > 0 && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isDarkMode
                                ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            Ready
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${priority.color}`}
                        >
                          {priority.label}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteClick(studySet)
                          }
                          disabled={Boolean(deletingId)}
                          title="Delete study set"
                          aria-label={`Delete ${studySet.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg opacity-40 transition-opacity hover:text-red-400 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
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

                    {/* PROGRESS */}
                    <div className="mt-auto">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            progress >= 75
                              ? "text-emerald-500 dark:text-emerald-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          Progress
                        </span>

                        <span
                          className={`text-xs font-bold ${
                            meta.loaded && progress >= 75
                              ? "text-emerald-500 dark:text-emerald-400"
                              : !meta.loaded
                              ? "opacity-50"
                              : ""
                          }`}
                        >
                          {/* Distinct from "0%" - a real 0% (genuinely
                              untouched study set) and "still fetching
                              revision-status" must never render
                              identically, or a real user sees 0% for the
                              several real seconds a cold dev-server load
                              can take and reasonably concludes progress
                              isn't being tracked at all. */}
                          {meta.loaded ? `${progress}%` : "Loading…"}
                        </span>
                      </div>

                      <div
                        className={`h-2 w-full overflow-hidden rounded-full ${
                          isDarkMode
                            ? "bg-white/10"
                            : "bg-black/10"
                        }`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            !meta.loaded
                              ? "bg-white/20 animate-pulse"
                              : progress >= 75
                              ? "bg-emerald-500"
                              : "bg-emerald-500/80"
                          }`}
                          style={{
                            width: meta.loaded ? `${progress}%` : "100%",
                          }}
                        />
                      </div>

                      {/* CARD BOTTOM */}
                      <div className="mt-4 flex items-end justify-between">
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
                            className="shrink-0 transition-transform group-hover:translate-x-1"
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
  );
}

export default StudySetsPage;