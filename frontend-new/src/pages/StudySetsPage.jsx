import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  BookOpen,
  FileText,
  ArrowRight,
  Search,
  X,
  BookCopy,
} from "lucide-react";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import {
  fetchStudySetDocuments,
  fetchActiveAttempt,
} from "../services/api";

function StudySetsPage({
  studySets,
  studySetsLoading,
  studySetsError,
  onCreateClick,
  onDeleteStudySet,
  onContinueStudying,
}) {
  // ─── Delete modal state ──────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null); // study set object
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  // ─── Search state ───────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  // ─── Dynamic per-card data ───────────────────────────────────────
  // Maps: studySetId → { docCount, hasProgress, loaded }
  const [cardMeta, setCardMeta] = useState({});

  // Fetch document counts and active attempt info for each study set
  const loadCardMeta = useCallback(async (sets) => {
    const results = {};
    await Promise.allSettled(
      sets.map(async (ss) => {
        const id = ss.study_set_id;
        try {
          const [docs, attempt] = await Promise.allSettled([
            fetchStudySetDocuments(id),
            fetchActiveAttempt(id),
          ]);
          const docList =
            docs.status === "fulfilled" ? docs.value || [] : [];
          const activeAttempt =
            attempt.status === "fulfilled" ? attempt.value : null;
          results[id] = {
            docCount: docList.length,
            hasProgress: Boolean(activeAttempt),
            loaded: true,
          };
        } catch {
          results[id] = { docCount: 0, hasProgress: false, loaded: true };
        }
      })
    );
    setCardMeta((prev) => ({ ...prev, ...results }));
  }, []);

  useEffect(() => {
    if (studySets.length > 0) {
      loadCardMeta(studySets);
    }
  }, [studySets, loadCardMeta]);

  // ─── Priority badge logic ───────────────────────────────────────
  const getPriority = (docCount) => {
    if (docCount >= 11) return { label: "High", color: "bg-red-100 text-red-700" };
    if (docCount >= 6) return { label: "Mid", color: "bg-gray-100 text-gray-600" };
    return { label: "Low", color: "bg-green-100 text-green-700" };
  };

  // ─── Progress % derivation ──────────────────────────────────────
  const getProgress = (id) => {
    const meta = cardMeta[id];
    if (!meta || !meta.loaded) return 0;
    if (meta.hasProgress) {
      // Derive a reasonable progress estimate from doc count
      // Since we don't have actual quiz score data at card level,
      // show a modest progress for sets with active attempts
      return meta.docCount > 0 ? Math.min(meta.docCount * 10, 75) : 0;
    }
    return 0;
  };

  // ─── CTA label ──────────────────────────────────────────────────
  const getCtaLabel = (id) => {
    const meta = cardMeta[id];
    if (meta && meta.hasProgress) return "Continue";
    return "Start";
  };

  // ─── Description fallback ───────────────────────────────────────
  const getDescription = (studySet) => {
    // Backend doesn't provide descriptions — use sensible fallbacks
    const meta = cardMeta[studySet.study_set_id];
    if (meta && meta.docCount > 0) {
      return `${meta.docCount} study material${meta.docCount > 1 ? "s" : ""}`;
    }
    return "Study materials";
  };

  // ─── Date formatting ───────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return "Recently";
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  };

  // ─── Delete handlers ───────────────────────────────────────────
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
      setDeleteError("Failed to delete study set. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Filtered study sets ───────────────────────────────────────
  const filteredStudySets = studySets.filter((studySet) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const nameMatch = studySet.name?.toLowerCase().includes(query);
    const descMatch = getDescription(studySet)?.toLowerCase().includes(query);
    return nameMatch || descMatch;
  });

  return (
    <div>
      {/* ═══════════════════ GREETING BANNER ═══════════════════ */}
      <div className="mb-8 flex flex-col items-start justify-between gap-6 rounded-2xl bg-[#98E8DE]/25 p-8 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-[#4E1F6E]">
            Study Sets
          </h1>
          <p className="mt-2 text-sm text-[#3E3E75]/70">
            Create and manage your study sets.
          </p>
          <button
            onClick={onCreateClick}
            className="mt-5 flex items-center gap-2 rounded-lg bg-[#4E1F6E] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3E3E75] hover:shadow-md"
          >
            <BookOpen size={18} />
            Create Study Set
          </button>
        </div>

        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white/60">
          <BookCopy size={44} className="text-[#4E1F6E]" />
        </div>
      </div>

      {/* ═══════════════════ STUDY SETS CONTAINER ═══════════════════ */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        {/* Container header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-[#4A148C]">
              Your Study Sets
            </h2>
            <p className="mt-0.5 text-[13px] text-gray-400">
              Continue learning from your uploaded materials.
            </p>
          </div>

          {/* Search Bar */}
          {!studySetsLoading && studySets.length > 0 && (
            <div className="relative w-full sm:w-64 md:w-72">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search study sets..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50/70 pl-9 pr-8 py-2 text-xs text-[#3E3E75] placeholder-gray-400 transition focus:border-[#4E1F6E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4E1F6E]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Loading */}
        {studySetsLoading && (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-3 animate-pulse"
              >
                <div className="flex justify-between mb-3">
                  <div className="h-6 w-14 rounded bg-gray-200" />
                  <div className="h-5 w-12 rounded bg-gray-200" />
                </div>
                <div className="h-5 w-3/4 rounded bg-gray-200 mb-1.5" />
                <div className="h-3 w-1/2 rounded bg-gray-200 mb-4" />
                <div className="h-2 w-full rounded-full bg-gray-200 mb-4" />
                <div className="h-4 w-1/3 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {studySetsError && (
          <p className="text-sm text-red-500">{studySetsError}</p>
        )}

        {/* Empty state */}
        {!studySetsLoading &&
          !studySetsError &&
          studySets.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
              <BookOpen
                size={32}
                className="mx-auto mb-3 text-gray-300"
              />
              <p className="text-sm font-medium text-[#3E3E75]">
                No study sets yet
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Create your first study set to get started.
              </p>
              <button
                onClick={onCreateClick}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#4E1F6E] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#3E3E75]"
              >
                <Plus size={14} />
                Create Study Set
              </button>
            </div>
          )}

        {/* ═══════════════════ CARD GRID & NO MATCHES STATE ═══════════════════ */}
        {!studySetsLoading &&
          !studySetsError &&
          studySets.length > 0 &&
          filteredStudySets.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
              <Search size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium text-[#3E3E75]">
                No study sets matching "{searchQuery}"
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Try searching with a different term.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 text-xs font-semibold text-[#4E1F6E] hover:underline"
              >
                Clear search
              </button>
            </div>
          )}

        {!studySetsLoading &&
          !studySetsError &&
          filteredStudySets.length > 0 && (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
                    className="rounded-xl border border-[#4E1F6E]/20 bg-white px-3.5 pt-3 pb-3.5 transition-all duration-200 hover:shadow-md hover:border-[#4E1F6E]/40 flex flex-col"
                  >
                    {/* ── Top metadata row ── */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 rounded bg-gray-50 border border-gray-100 px-2 py-1">
                          <FileText
                            size={13}
                            className="text-[#4E1F6E]"
                          />
                          <span className="text-[12px] font-semibold text-[#3E3E75]">
                            {docCount}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${priority.color}`}
                        >
                          {priority.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(studySet)}
                          disabled={Boolean(deletingId)}
                          title="Delete study set"
                          aria-label={`Delete ${studySet.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* ── Title ── */}
                    <h3 className="text-lg font-bold text-[#3E3E75] leading-snug line-clamp-2 min-h-[44px] mt-1.5">
                      {studySet.name}
                    </h3>

                    {/* ── Description ── */}
                    <p className="text-xs text-gray-400 mb-3">
                      {getDescription(studySet)}
                    </p>

                    {/* ── Progress section ── */}
                    <div className="mt-auto">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-[#44DDC1]">
                          Progress
                        </span>
                        <span className="text-xs font-semibold text-[#3E3E75]">
                          {progress}%
                        </span>
                      </div>
                      <div className="h-[5px] w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#44DDC1] transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      {/* ── Footer ── */}
                      <div className="flex items-end justify-between mt-3">
                        <div className="text-[11px] text-gray-400 leading-tight">
                          <span className="block">Created</span>
                          <span className="block font-medium text-gray-500">
                            {formatDate(studySet.created_at)}
                          </span>
                        </div>

                        <button
                          onClick={() => onContinueStudying(id)}
                          className="flex items-center gap-0.5 text-[13px] font-bold text-[#4E1F6E] transition hover:text-[#3E3E75] group"
                        >
                          <span className="leading-tight text-left">
                            {ctaLabel}
                            <br />
                            Studying
                          </span>
                          <ArrowRight
                            size={15}
                            className="shrink-0 transition-transform group-hover:translate-x-0.5"
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

      {/* ═══════════════════ DELETE MODAL ═══════════════════ */}
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