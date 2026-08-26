import { useState } from "react";
import { BookOpen, Plus, X, Trash2, CheckCircle } from "lucide-react";

function StudySetsPage({
  studySets,
  studySetsLoading,
  studySetsError,
  onCreateClick,
  onDeleteStudySet,
  onContinueStudying,
}) {
  const [deletingStudySetId, setDeletingStudySetId] = useState(null);

  // Delete confirmation and success message
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState("");

  // Open the in-dashboard confirmation
  const handleDeleteClick = (studySet) => {
    setDeleteSuccess("");
    setDeleteConfirmation(studySet);
  };

  // Cancel deletion
  const handleCancelDelete = () => {
    if (deletingStudySetId) {
      return;
    }

    setDeleteConfirmation(null);
  };

  // Confirm deletion
  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) {
      return;
    }

    const studySet = deleteConfirmation;

    try {
      setDeletingStudySetId(studySet.study_set_id);

      await onDeleteStudySet(studySet.study_set_id);

      // Close confirmation after successful deletion
      setDeleteConfirmation(null);

      // Show success message on dashboard
      setDeleteSuccess(
        `Study set "${studySet.name}" deleted successfully.`
      );

      // Automatically hide success message after 4 seconds
      setTimeout(() => {
        setDeleteSuccess("");
      }, 4000);
    } catch (error) {
      console.error("Failed to delete study set:", error);
    } finally {
      setDeletingStudySetId(null);
    }
  };

  return (
    <div>
      {/* ================= HEADER ================= */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#3E3E75]">
            Study Sets
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Create and manage your study sets.
          </p>
        </div>

        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 rounded-lg bg-[#4E1F6E] px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3E3E75] hover:shadow-md"
        >
          <Plus size={18} />
          Create Study Set
        </button>
      </div>

      {/* ================= DELETE SUCCESS MESSAGE ================= */}
      {deleteSuccess && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#98E8DE] bg-[#98E8DE]/20 px-5 py-4 text-sm text-[#3E3E75] shadow-sm">
          <CheckCircle
            size={20}
            className="shrink-0 text-[#4E1F6E]"
          />

          <span className="font-medium">
            {deleteSuccess}
          </span>

          <button
            type="button"
            onClick={() => setDeleteSuccess("")}
            className="ml-auto rounded-md p-1 text-gray-400 transition hover:bg-white hover:text-gray-600"
            aria-label="Close success message"
          >
            <X size={16} />
          </button>
        </div>
      )}



      {/* ================= STUDY SETS ================= */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[#3E3E75]">
            Your Study Sets
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Continue learning from your uploaded materials.
          </p>
        </div>

        {/* ================= DELETE CONFIRMATION ================= */}
        {deleteConfirmation && (
          <div className="mb-6 rounded-2xl border border-red-100 bg-red-50/60 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
                <Trash2
                  size={19}
                  className="text-red-500"
                />
              </div>

              <div className="flex-1">
                <h3 className="text-base font-semibold text-[#3E3E75]">
                  Delete Study Set?
                </h3>

                <p className="mt-1 text-sm text-gray-600">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-[#3E3E75]">
                    "{deleteConfirmation.name}"
                  </span>
                  ?
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  This action cannot be undone.
                </p>

                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCancelDelete}
                    disabled={Boolean(deletingStudySetId)}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={Boolean(deletingStudySetId)}
                    className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={15} />

                    {deletingStudySetId
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {studySetsLoading && (
          <p className="text-sm text-gray-500">
            Loading study sets...
          </p>
        )}

        {studySetsError && (
          <p className="text-sm text-red-500">
            {studySetsError}
          </p>
        )}

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
            </div>
          )}

        {!studySetsLoading &&
          !studySetsError &&
          studySets.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {studySets.map((studySet) => {
                const isDeleting =
                  deletingStudySetId === studySet.study_set_id;

                return (
                  <div
                    key={studySet.study_set_id}
                    className="group rounded-xl border border-gray-100 bg-gray-50 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#98E8DE] hover:bg-white hover:shadow-md"
                  >
                    {/* ================= CARD HEADER ================= */}
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#98E8DE]/50">
                        <BookOpen
                          size={21}
                          className="text-[#4E1F6E]"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#98E8DE] px-3 py-1 text-xs font-medium text-[#3E3E75]">
                          Ready
                        </span>

                        {/* DELETE BUTTON */}
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteClick(studySet)
                          }
                          disabled={
                            isDeleting ||
                            Boolean(deletingStudySetId)
                          }
                          title="Delete study set"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>

                    {/* ================= STUDY SET INFO ================= */}
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

                    {/* ================= CONTINUE BUTTON ================= */}
                    <button
                      onClick={() =>
                        onContinueStudying(studySet.study_set_id)
                      }
                      disabled={isDeleting}
                      className="mt-5 flex items-center gap-1 text-sm font-semibold text-[#4E1F6E] transition-all duration-200 group-hover:gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isDeleting
                        ? "Deleting..."
                        : "Continue Studying"}

                      {!isDeleting && <span>→</span>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}

export default StudySetsPage;
