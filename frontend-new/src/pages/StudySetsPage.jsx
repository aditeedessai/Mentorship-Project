import { useState } from "react";
import { BookOpen, Plus, X, Trash2 } from "lucide-react";

function StudySetsPage({
  studySets,
  studySetsLoading,
  studySetsError,
  onCreateStudySet,
  onDeleteStudySet,
  onContinueStudying,
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [studySetName, setStudySetName] = useState("");
  const [formError, setFormError] = useState("");

  const [deletingStudySetId, setDeletingStudySetId] = useState(null);

  const handleCreate = async () => {
    if (!studySetName.trim()) {
      setFormError("Please enter a study set name.");
      return;
    }

    setFormError("");

    const success = await onCreateStudySet(studySetName.trim());

    if (success) {
      setStudySetName("");
      setShowCreateForm(false);
    }
  };

  const handleDelete = async (studySet) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${studySet.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingStudySetId(studySet.study_set_id);

      await onDeleteStudySet(studySet.study_set_id);
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
          onClick={() => {
            setShowCreateForm(true);
            setFormError("");
          }}
          className="flex items-center gap-2 rounded-lg bg-[#4E1F6E] px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3E3E75] hover:shadow-md"
        >
          <Plus size={18} />
          Create Study Set
        </button>
      </div>

      {/* ================= CREATE FORM ================= */}
      {showCreateForm && (
        <div className="mb-6 rounded-2xl border border-[#98E8DE] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#3E3E75]">
                Create Study Set
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Give your new study set a name.
              </p>
            </div>

            <button
              onClick={() => {
                setShowCreateForm(false);
                setStudySetName("");
                setFormError("");
              }}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
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
              setFormError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreate();
              }
            }}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-[#3E3E75] outline-none transition focus:border-[#45A9A9] focus:ring-2 focus:ring-[#98E8DE]/40"
          />

          {formError && (
            <p className="mt-2 text-sm text-red-500">
              {formError}
            </p>
          )}

          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowCreateForm(false);
                setStudySetName("");
                setFormError("");
              }}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              onClick={handleCreate}
              disabled={studySetsLoading}
              className="rounded-lg bg-[#4E1F6E] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#3E3E75] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {studySetsLoading ? "Creating..." : "Create"}
            </button>
          </div>
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
                          onClick={() => handleDelete(studySet)}
                          disabled={isDeleting}
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