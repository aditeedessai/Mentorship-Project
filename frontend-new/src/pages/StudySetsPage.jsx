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
import { useTheme } from "../context/ThemeContext";
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

  const getPriority = (docCount) => {
    if (docCount >= 11) return { label: "High", color: isDarkMode ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-red-100 text-red-700" };
    if (docCount >= 6) return { label: "Mid", color: isDarkMode ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-amber-100 text-amber-700" };
    return { label: "Low", color: isDarkMode ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-emerald-100 text-emerald-700" };
  };

  const getProgress = (id) => {
    const meta = cardMeta[id];
    if (!meta || !meta.loaded) return 0;
    if (meta.hasProgress) {
      return meta.docCount > 0 ? Math.min(meta.docCount * 10, 75) : 0;
    }
    return 0;
  };

  const getCtaLabel = (id) => {
    const meta = cardMeta[id];
    if (meta && meta.hasProgress) return "Continue";
    return "Start";
  };

  const getDescription = (studySet) => {
    const meta = cardMeta[studySet.study_set_id];
    if (meta && meta.docCount > 0) {
      return `${meta.docCount} study material${meta.docCount > 1 ? "s" : ""}`;
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
      setDeleteError("Failed to delete study set. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredStudySets = studySets.filter((studySet) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const nameMatch = studySet.name?.toLowerCase().includes(query);
    const descMatch = getDescription(studySet)?.toLowerCase().includes(query);
    return nameMatch || descMatch;
  });

  return (
    <div>
      {/* ================= GREETING BANNER ================= */}
      <div
        className={`mb-8 flex flex-col items-start justify-between gap-6 rounded-3xl border p-8 backdrop-blur-2xl transition-all duration-500 sm:flex-row sm:items-center ${
          isDarkMode
            ? "border-white/10 bg-[#17131F]/80 text-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            : "border-white/80 bg-white/60 text-[#292530] shadow-[0_18px_50px_rgba(70,55,110,0.1)]"
        }`}
      >
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
            Study Sets
          </h1>
          <p
            className={`mt-2 text-sm font-medium ${
              isDarkMode ? "text-white/60" : "text-[#706A78]"
            }`}
          >
            Create and manage your study sets.
          </p>
          <button
            onClick={onCreateClick}
            className="mt-6 flex items-center gap-2 rounded-xl bg-[#8064C7] px-6 py-3.5 text-sm font-bold text-white shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8B6DD4]"
          >
            <BookOpen size={18} />
            Create Study Set
          </button>
        </div>

        <div
          className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border backdrop-blur-xl ${
            isDarkMode
              ? "border-white/10 bg-white/5 text-[#A78BFA]"
              : "border-white/80 bg-white/80 text-[#8064C7] shadow-sm"
          }`}
        >
          <BookCopy size={44} />
        </div>
      </div>

      {/* ================= STUDY SETS CONTAINER ================= */}
      <div
        className={`rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-500 ${
          isDarkMode
            ? "border-white/10 bg-[#17131F]/80 text-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            : "border-white/80 bg-white/60 text-[#292530] shadow-[0_18px_50px_rgba(70,55,110,0.1)]"
        }`}
      >
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">
              Your Study Sets
            </h2>
            <p className={`mt-0.5 text-xs ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
              Continue learning from your uploaded materials.
            </p>
          </div>

          {!studySetsLoading && studySets.length > 0 && (
            <div className="relative w-full sm:w-64 md:w-72">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search study sets..."
                className={`w-full rounded-xl border pl-10 pr-9 py-2.5 text-xs outline-none transition-all ${
                  isDarkMode
                    ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7]"
                    : "border-gray-200 bg-white text-[#292530] placeholder:text-gray-400 focus:border-[#8064C7]"
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {studySetsLoading && (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`rounded-2xl border p-4 animate-pulse ${
                  isDarkMode ? "border-white/5 bg-white/5" : "border-gray-100 bg-white/50"
                }`}
              >
                <div className="flex justify-between mb-3">
                  <div className="h-6 w-14 rounded-lg bg-current opacity-10" />
                  <div className="h-5 w-12 rounded-lg bg-current opacity-10" />
                </div>
                <div className="h-5 w-3/4 rounded-lg bg-current opacity-10 mb-2" />
                <div className="h-3 w-1/2 rounded-lg bg-current opacity-10 mb-4" />
                <div className="h-2 w-full rounded-full bg-current opacity-10 mb-4" />
                <div className="h-4 w-1/3 rounded-lg bg-current opacity-10" />
              </div>
            ))}
          </div>
        )}

        {studySetsError && (
          <p className="text-sm font-semibold text-red-400">{studySetsError}</p>
        )}

        {!studySetsLoading &&
          !studySetsError &&
          studySets.length === 0 && (
            <div className={`rounded-2xl border border-dashed py-12 text-center ${
              isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-white/50"
            }`}>
              <BookOpen
                size={36}
                className="mx-auto mb-3 opacity-30"
              />
              <p className="text-sm font-bold">
                No study sets yet
              </p>
              <p className={`mt-1 text-xs ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                Create your first study set to get started.
              </p>
              <button
                onClick={onCreateClick}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#8064C7] px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#8B6DD4]"
              >
                <Plus size={15} />
                Create Study Set
              </button>
            </div>
          )}

        {!studySetsLoading &&
          !studySetsError &&
          studySets.length > 0 &&
          filteredStudySets.length === 0 && (
            <div className={`rounded-2xl border border-dashed py-10 text-center ${
              isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-white/50"
            }`}>
              <Search size={30} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold">
                No study sets matching "{searchQuery}"
              </p>
              <p className={`mt-1 text-xs ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                Try searching with a different term.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 text-xs font-bold text-[#8064C7] dark:text-[#A78BFA] hover:underline"
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
                    className={`rounded-2xl border p-4 transition-all duration-300 flex flex-col backdrop-blur-xl ${
                      isDarkMode
                        ? "border-white/10 bg-[#211D2B]/80 hover:border-[#8064C7]/50 hover:bg-[#252033]"
                        : "border-white/80 bg-white/70 hover:border-[#8064C7]/40 hover:bg-white shadow-[0_10px_30px_rgba(70,55,110,0.05)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold ${
                          isDarkMode ? "border-white/10 bg-white/5 text-[#A78BFA]" : "border-purple-100 bg-[#8064C7]/10 text-[#8064C7]"
                        }`}>
                          <FileText size={13} />
                          <span>{docCount}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${priority.color}`}>
                          {priority.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(studySet)}
                          disabled={Boolean(deletingId)}
                          title="Delete study set"
                          aria-label={`Delete ${studySet.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg opacity-40 transition-opacity hover:opacity-100 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-lg font-black leading-snug line-clamp-2 min-h-[44px] mt-1 tracking-tight">
                      {studySet.name}
                    </h3>

                    <p className={`text-xs mb-4 ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                      {getDescription(studySet)}
                    </p>

                    <div className="mt-auto">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-[#8064C7] dark:text-[#A78BFA]">
                          Progress
                        </span>
                        <span className="text-xs font-bold">
                          {progress}%
                        </span>
                      </div>
                      <div className={`h-2 w-full rounded-full overflow-hidden ${isDarkMode ? "bg-white/10" : "bg-black/10"}`}>
                        <div
                          className="h-full rounded-full bg-[#8064C7] transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="flex items-end justify-between mt-4">
                        <div className="text-[11px] opacity-60 leading-tight">
                          <span className="block">Created</span>
                          <span className="block font-bold">
                            {formatDate(studySet.created_at)}
                          </span>
                        </div>

                        <button
                          onClick={() => onContinueStudying(id)}
                          className="flex items-center gap-1 text-xs font-black text-[#8064C7] dark:text-[#A78BFA] transition hover:text-[#8B6DD4] group"
                        >
                          <span>{ctaLabel} Studying</span>
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