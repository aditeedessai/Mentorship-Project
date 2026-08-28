import { useState } from "react";
import { Sparkles, X, FileCheck, Presentation, FileText, Upload } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { createStudySet, uploadDocuments } from "../services/api";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".pptx"];

const getFileIcon = (fileName) => {
  const ext = "." + fileName.toLowerCase().split(".").pop();
  if (ext === ".pdf") return <FileText size={22} className="text-[#8064C7]" />;
  if (ext === ".docx") return <FileCheck size={22} className="text-[#8064C7]" />;
  if (ext === ".pptx") return <Presentation size={22} className="text-[#8064C7]" />;
  return <FileText size={22} className="text-[#8064C7]" />;
};

function UploadPage({ studySetId, onNavigate, onStudySetCreated }) {
  const { isDarkMode } = useTheme();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [studySetName, setStudySetName] = useState("");

  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

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

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      processIncomingFiles(event.target.files);
      event.target.value = "";
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      processIncomingFiles(event.dataTransfer.files);
    }
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setUploadError("");
    setUploadSuccess("");
  };

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

      setStatusMessage("Creating study set...");
      newSet = await createStudySet(studySetName.trim());

      const newStudySetId = newSet.study_set_id;

      const fileCount = selectedFiles.length;
      setStatusMessage(
        `Uploading and processing ${fileCount} document${fileCount > 1 ? "s" : ""}...`
      );

      await uploadDocuments(newStudySetId, selectedFiles);

      setSelectedFiles([]);
      setStudySetName("");

      if (onStudySetCreated) {
        onStudySetCreated(newSet);
      }

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
    <div>
      {/* ================= HEADER ================= */}
      <div
        className={`mb-8 flex flex-col items-start justify-between gap-6 rounded-3xl border p-8 backdrop-blur-2xl transition-all duration-500 sm:flex-row sm:items-center ${
          isDarkMode
            ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            : "border-[#8064C7]/20 bg-gradient-to-r from-[#E5DCF8] to-[#F1EAFA] text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.06)]"
        }`}
      >
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
            Create Study Set
          </h1>
          <p
            className={`mt-2 text-sm font-medium ${
              isDarkMode ? "text-white/50" : "text-[#706A78]"
            }`}
          >
            Upload your study materials and give your set a name to get started.
          </p>
        </div>

        <div
          className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border backdrop-blur-xl ${
            isDarkMode
              ? "border-white/10 bg-white/5 text-[#A78BFA]"
              : "border-[#8064C7]/20 bg-white/60 text-[#8064C7] shadow-xs"
          }`}
        >
          <Upload size={40} />
        </div>
      </div>

      {/* ================= SUCCESS MESSAGE ================= */}
      {uploadSuccess && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm font-semibold text-emerald-400">
            {uploadSuccess}
          </p>
        </div>
      )}

      {/* ================= ERROR MESSAGE ================= */}
      {uploadError && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm font-semibold text-red-400">
            {uploadError}
          </p>
        </div>
      )}

      {/* ================= MAIN UPLOAD AREA ================= */}
      <div className="grid gap-6 lg:grid-cols-3 items-stretch">
        {/* ================= UPLOAD CARD ================= */}
        <div
          className={`rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-500 lg:col-span-2 flex flex-col h-full ${
            isDarkMode
              ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
              : "border-[#8064C7]/15 bg-[#F0ECF8]/95 text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.05)]"
          }`}
        >
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-1 min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all duration-300 ${
              isDragging
                ? "border-[#8064C7] bg-[#8064C7]/15"
                : isDarkMode
                ? "border-white/10 bg-white/5 hover:border-[#8064C7]/50 hover:bg-white/10"
                : "border-gray-200 bg-white/50 hover:border-[#8064C7]/40 hover:bg-white/80"
            }`}
          >
            {selectedFiles.length === 0 ? (
              <>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
                  <Upload size={30} />
                </div>

                <h2 className="text-xl font-black tracking-tight">
                  Drop your files here
                </h2>

                <p className={`mt-2 max-w-md text-sm ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>
                  Drag and drop your study materials here, or browse your computer to select files.
                </p>

                <label className="mt-6 cursor-pointer rounded-xl bg-[#8064C7] px-7 py-3.5 text-sm font-bold text-white shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8B6DD4]">
                  Browse Files
                  <input
                    type="file"
                    accept=".pdf,.docx,.pptx"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                <p className={`mt-4 text-xs ${isDarkMode ? "text-white/40" : "text-gray-400"}`}>
                  Maximum file size: 20 MB (.pdf, .docx, .pptx)
                </p>
              </>
            ) : (
              <div className="w-full max-w-lg my-auto">
                <div className={`rounded-2xl border p-5 shadow-sm backdrop-blur-xl ${
                  isDarkMode ? "border-white/10 bg-[#211D2B]/90" : "border-white/80 bg-white/85"
                }`}>
                  <div className="mb-4 flex items-center justify-between border-b border-inherit pb-3">
                    <p className="text-sm font-bold">
                      Selected Files ({selectedFiles.length})
                    </p>

                    <label className="cursor-pointer text-xs font-bold text-[#8064C7] dark:text-[#A78BFA] transition hover:underline">
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
                        className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                          isDarkMode
                            ? "border-white/5 bg-white/5 hover:border-white/10"
                            : "border-gray-100 bg-white/70 hover:border-purple-200"
                        }`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8064C7]/15">
                          {getFileIcon(file.name)}
                        </div>

                        <div className="flex-1 text-left min-w-0">
                          <p className="truncate text-sm font-bold">
                            {file.name}
                          </p>

                          <p className={`mt-0.5 text-xs ${isDarkMode ? "text-white/40" : "text-gray-500"}`}>
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          disabled={uploading}
                          className="rounded-lg p-1.5 opacity-60 transition hover:opacity-100 hover:text-red-400 disabled:opacity-50"
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

        {/* ================= STUDY SET NAME & ACTIONS ================= */}
        <div
          className={`rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-500 flex flex-col justify-between h-full lg:col-span-1 ${
            isDarkMode
              ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
              : "border-[#8064C7]/15 bg-[#F0ECF8]/95 text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.05)]"
          }`}
        >
          <div>
            <h2 className="text-xl font-black tracking-tight">
              Study Set Name
            </h2>

            <p className={`mt-1 text-sm ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>
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
              className={`mt-5 w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                isDarkMode
                  ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#8064C7]"
                  : "border-gray-200 bg-white text-[#292530] placeholder:text-gray-400 focus:border-[#8064C7]"
              }`}
            />
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleCreateAndUpload}
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8064C7] px-6 py-3.5 text-sm font-bold text-white shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8B6DD4] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload size={17} />
              {uploading
                ? (statusMessage || "Creating...")
                : "Create Study Set →"}
            </button>

            <button
              type="button"
              onClick={() => {
                onNavigate?.("study-sets");
              }}
              disabled={uploading}
              className={`w-full rounded-xl border px-5 py-2.5 text-sm font-semibold transition text-center ${
                isDarkMode
                  ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  : "border-gray-200 bg-white/70 text-gray-600 hover:bg-white"
              } disabled:opacity-50`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* ================= SUPPORTED FORMATS ================= */}
      <div
        className={`mt-6 rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-500 ${
          isDarkMode
            ? "border-white/10 bg-[#17131F]/80 text-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            : "border-white/80 bg-white/60 text-[#292530] shadow-[0_18px_50px_rgba(70,55,110,0.1)]"
        }`}
      >
        <h2 className="text-base sm:text-lg font-black tracking-tight">
          Supported Formats
        </h2>

        <p className={`mt-0.5 text-xs sm:text-sm ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>
          Upload your study materials in any of these formats.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all ${
            isDarkMode ? "border-white/5 bg-white/5" : "border-white/80 bg-white/70"
          }`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8064C7]/15">
              <FileText size={20} className="text-[#8064C7] dark:text-[#A78BFA]" />
            </div>

            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold truncate">PDF</p>
              <p className={`text-[11px] sm:text-xs truncate ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>Notes & textbooks</p>
            </div>
          </div>

          <div className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all ${
            isDarkMode ? "border-white/5 bg-white/5" : "border-white/80 bg-white/70"
          }`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8064C7]/15">
              <FileCheck size={20} className="text-[#8064C7] dark:text-[#A78BFA]" />
            </div>

            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold truncate">DOCX</p>
              <p className={`text-[11px] sm:text-xs truncate ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>Documents & notes</p>
            </div>
          </div>

          <div className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all ${
            isDarkMode ? "border-white/5 bg-white/5" : "border-white/80 bg-white/70"
          }`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8064C7]/15">
              <Presentation size={20} className="text-[#8064C7] dark:text-[#A78BFA]" />
            </div>

            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold truncate">PPTX</p>
              <p className={`text-[11px] sm:text-xs truncate ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>Presentations</p>
            </div>
          </div>
        </div>

        <div className={`mt-5 rounded-2xl border p-4 ${
          isDarkMode ? "border-[#8064C7]/30 bg-[#8064C7]/15 text-purple-200" : "border-[#8064C7]/20 bg-[#8064C7]/10 text-[#8064C7]"
        }`}>
          <div className="flex gap-2.5 items-start">
            <Sparkles size={18} className="mt-0.5 shrink-0" />
            <p className="text-xs font-semibold leading-relaxed">
              Your material will be analyzed by Jojo to create summaries, quizzes, flashcards, and personalized study recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadPage;