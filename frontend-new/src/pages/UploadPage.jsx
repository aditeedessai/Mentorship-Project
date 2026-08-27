import { useState } from "react";
import { Sparkles, X, FileCheck, Presentation, FileText, Upload } from "lucide-react";
import { createStudySet, uploadDocuments } from "../services/api";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".pptx"];

const getFileIcon = (fileName) => {
  const ext = "." + fileName.toLowerCase().split(".").pop();
  if (ext === ".pdf") return <FileText size={22} className="text-[#4E1F6E]" />;
  if (ext === ".docx") return <FileCheck size={22} className="text-[#4E1F6E]" />;
  if (ext === ".pptx") return <Presentation size={22} className="text-[#4E1F6E]" />;
  return <FileText size={22} className="text-[#4E1F6E]" />;
};

function UploadPage({ studySetId, onNavigate, onStudySetCreated }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [studySetName, setStudySetName] = useState("");

  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  // ================= PROCESS INCOMING FILES =================
  const processIncomingFiles = (incomingFileList) => {
    const incoming = Array.from(incomingFileList || []);
    if (incoming.length === 0) return;

    const validFiles = [];
    const invalidFileNames = [];

    incoming.forEach((file) => {
      const ext = "." + file.name.toLowerCase().split(".").pop();
      if (ALLOWED_EXTENSIONS.includes(ext)) {
        validFiles.push(file);
      } else {
        invalidFileNames.push(file.name);
      }
    });

    if (invalidFileNames.length > 0) {
      setUploadError(
        `Unsupported file format: ${invalidFileNames.join(", ")}. Allowed formats: .pdf, .docx, .pptx`
      );
    } else {
      setUploadError("");
    }

    if (validFiles.length > 0) {
      setUploadSuccess("");
      setSelectedFiles((prev) => {
        const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}`));
        const uniqueNew = validFiles.filter(
          (f) => !existingKeys.has(`${f.name}-${f.size}`)
        );
        return [...prev, ...uniqueNew];
      });
    }
  };

  // ================= SELECT FILES =================
  const handleFileChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      processIncomingFiles(event.target.files);
      event.target.value = "";
    }
  };

  // ================= DRAG & DROP =================
  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      processIncomingFiles(event.dataTransfer.files);
    }
  };

  // ================= REMOVE SPECIFIC FILE =================
  const removeFile = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setUploadError("");
    setUploadSuccess("");
  };

  // ================= CREATE STUDY SET & UPLOAD DOCUMENTS =================
  const handleCreateAndUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadError("Please select at least one document file.");
      return;
    }

    if (!studySetName.trim()) {
      setUploadError("Please enter a study set name.");
      return;
    }

    let newSet = null;

    try {
      setUploading(true);
      setUploadError("");
      setUploadSuccess("");

      // 1. Create Study Set via API
      setStatusMessage("Creating study set...");
      newSet = await createStudySet(studySetName.trim());

      const newStudySetId = newSet.study_set_id;

      // 2. Upload Documents to newly created study set via API
      const fileCount = selectedFiles.length;
      setStatusMessage(
        `Uploading and processing ${fileCount} document${fileCount > 1 ? "s" : ""}...`
      );

      await uploadDocuments(newStudySetId, selectedFiles);

      // 3. Clear state & notify parent
      setSelectedFiles([]);
      setStudySetName("");

      if (onStudySetCreated) {
        onStudySetCreated(newSet);
      }

      // 4. Navigate directly to the newly created study set page
      if (onNavigate) {
        onNavigate("study-set", { studySetId: newStudySetId });
      }
    } catch (error) {
      console.error("Failed to create study set or upload documents:", error);

      if (newSet) {
        setUploadError(
          `Study set "${studySetName.trim()}" was created, but document upload failed: ${error.message || "Upload error"}.`
        );
      } else {
        setUploadError(
          error.message || "Failed to create study set."
        );
      }
    } finally {
      setUploading(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFA]">
      {/* ================= HEADER ================= */}
      <div className="mb-8 flex flex-col items-start justify-between gap-6 rounded-2xl bg-[#98E8DE]/25 p-8 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-[#4E1F6E]">
            Create Study Set
          </h1>
          <p className="mt-2 text-sm text-[#3E3E75]/70">
            Upload your study materials and give your set a name to get started.
          </p>
        </div>

        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white/60">
          <Upload size={44} className="text-[#4E1F6E]" />
        </div>
      </div>

      {/* ================= SUCCESS MESSAGE ================= */}
      {uploadSuccess && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-700">
            {uploadSuccess}
          </p>
        </div>
      )}

      {/* ================= ERROR MESSAGE ================= */}
      {uploadError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-600">
            {uploadError}
          </p>
        </div>
      )}

      {/* ================= MAIN UPLOAD AREA ================= */}
      <div className="grid gap-6 lg:grid-cols-3 items-stretch">
        {/* ================= TOP LEFT (2 COLS): UPLOAD CARD ================= */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm border border-gray-100 lg:col-span-2 flex flex-col h-full">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-1 min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all duration-300 ${
              isDragging
                ? "border-[#4E1F6E] bg-[#98E8DE]/20"
                : "border-gray-200 bg-gray-50 hover:border-[#98E8DE] hover:bg-[#98E8DE]/10"
            }`}
          >
            {selectedFiles.length === 0 ? (
              <>
                {/* Upload Icon */}
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#98E8DE]/40">
                  <Upload size={30} className="text-[#4E1F6E]" />
                </div>

                <h2 className="text-xl font-semibold text-[#3E3E75]">
                  Drop your files here
                </h2>

                <p className="mt-2 max-w-md text-sm text-gray-500">
                  Drag and drop your study materials here, or browse your computer to select files.
                </p>

                {/* Browse Files */}
                <label className="mt-5 cursor-pointer rounded-xl bg-[#4E1F6E] px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3E3E75] hover:shadow-md">
                  Browse Files
                  <input
                    type="file"
                    accept=".pdf,.docx,.pptx"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                <p className="mt-4 text-xs text-gray-400">
                  Maximum file size: 20 MB
                </p>
              </>
            ) : (
              /* ================= SELECTED FILES LIST ================= */
              <div className="w-full max-w-lg my-auto">
                <div className="rounded-2xl border border-[#98E8DE] bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                    <p className="text-sm font-semibold text-[#3E3E75]">
                      Selected Files ({selectedFiles.length})
                    </p>

                    <label className="cursor-pointer text-xs font-semibold text-[#4E1F6E] transition hover:underline">
                      + Add more files
                      <input
                        type="file"
                        accept=".pdf,.docx,.pptx"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${file.size}-${index}`}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 transition hover:border-[#98E8DE]"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#98E8DE]/40">
                          {getFileIcon(file.name)}
                        </div>

                        <div className="flex-1 text-left min-w-0">
                          <p className="truncate text-sm font-semibold text-[#3E3E75]">
                            {file.name}
                          </p>

                          <p className="mt-0.5 text-xs text-gray-500">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          disabled={uploading}
                          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-200 hover:text-red-500 disabled:opacity-50"
                          title="Remove file"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= TOP RIGHT (1 COL): STUDY SET NAME & ACTIONS ================= */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-full lg:col-span-1">
          <div>
            <h2 className="text-xl font-semibold text-[#3E3E75]">
              Study Set Name
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Give your new study set a name to organize your learning materials.
            </p>

            <input
              type="text"
              placeholder="Enter study set name"
              value={studySetName}
              onChange={(e) => {
                setStudySetName(e.target.value);
                setUploadError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !uploading) {
                  handleCreateAndUpload();
                }
              }}
              className="mt-4 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-[#3E3E75] outline-none transition focus:border-[#45A9A9] focus:ring-2 focus:ring-[#98E8DE]/40"
            />
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleCreateAndUpload}
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#4E1F6E] px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3E3E75] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload size={17} />
              {uploading
                ? (statusMessage || "Creating...")
                : "Create Study Set"}
            </button>

            <button
              type="button"
              onClick={() => {
                onNavigate?.("study-sets");
              }}
              disabled={uploading}
              className="w-full rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM ROW: SUPPORTED FORMATS ================= */}
      <div className="mt-6 rounded-2xl bg-white p-5 sm:p-6 shadow-sm border border-gray-100">
        <h2 className="text-base sm:text-lg font-semibold text-[#3E3E75]">
          Supported Formats
        </h2>

        <p className="mt-0.5 text-xs sm:text-sm text-gray-500">
          Upload your study materials in any of these formats.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* ================= PDF ================= */}
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 sm:p-3.5 transition hover:bg-[#98E8DE]/20 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#98E8DE]/40">
              <FileText size={19} className="text-[#4E1F6E]" />
            </div>

            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-[#3E3E75] truncate">PDF</p>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate">Notes & textbooks</p>
            </div>
          </div>

          {/* ================= DOCX ================= */}
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 sm:p-3.5 transition hover:bg-[#98E8DE]/20 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#98E8DE]/40">
              <FileCheck size={19} className="text-[#4E1F6E]" />
            </div>

            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-[#3E3E75] truncate">DOCX</p>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate">Documents & notes</p>
            </div>
          </div>

          {/* ================= PPTX ================= */}
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 sm:p-3.5 transition hover:bg-[#98E8DE]/20 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#98E8DE]/40">
              <Presentation size={19} className="text-[#4E1F6E]" />
            </div>

            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-[#3E3E75] truncate">PPTX</p>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate">Presentations</p>
            </div>
          </div>
        </div>

        {/* ================= AI INFORMATION ================= */}
        <div className="mt-4 rounded-xl bg-[#98E8DE]/20 p-3.5">
          <div className="flex gap-2.5 items-start">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-[#4E1F6E]" />
            <p className="text-xs leading-relaxed text-[#3E3E75]">
              Your material will be analyzed by AI to create summaries, quizzes, flashcards, and personalized study recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadPage;