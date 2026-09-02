import { useState } from "react";
import {
  Sparkles,
  X,
  FileCheck,
  Presentation,
  FileText,
  Upload,
  Image as ImageIcon,
  Camera,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { createStudySet, uploadDocuments } from "../services/api";
import jojoReading from "../assets/jojo-reading.png";

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
];

const getFileIcon = (fileName) => {
  const ext = "." + fileName.toLowerCase().split(".").pop();

  if (ext === ".pdf") {
    return <FileText size={22} className="text-[#8064C7]" />;
  }

  if (ext === ".docx") {
    return <FileCheck size={22} className="text-[#8064C7]" />;
  }

  if (ext === ".pptx") {
    return <Presentation size={22} className="text-[#8064C7]" />;
  }

  if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    return <ImageIcon size={22} className="text-[#8064C7]" />;
  }

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

      if (
        ALLOWED_EXTENSIONS.includes(ext) ||
        file.type.startsWith("image/")
      ) {
        validFiles.push(file);
      } else {
        invalidFileNames.push(file.name);
      }
    });

    if (invalidFileNames.length > 0) {
      setUploadError(
        `Unsupported file format: ${invalidFileNames.join(
          ", "
        )}. Allowed formats: PDF, DOCX, PPTX, PNG, JPG, JPEG, WEBP`
      );
    } else {
      setUploadError("");
    }

    if (validFiles.length > 0) {
      setUploadSuccess("");

      setSelectedFiles((prev) => {
        const existingKeys = new Set(
          prev.map((f) => `${f.name}-${f.size}`)
        );

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

    if (
      event.dataTransfer.files &&
      event.dataTransfer.files.length > 0
    ) {
      processIncomingFiles(event.dataTransfer.files);
    }
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles((prev) =>
      prev.filter((_, idx) => idx !== indexToRemove)
    );

    setUploadError("");
    setUploadSuccess("");
  };

  const handleCreateAndUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadError(
        "Please select or snap at least one document or image file."
      );
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

      const hasImages = selectedFiles.some(
        (f) =>
          f.type.startsWith("image/") ||
          [".png", ".jpg", ".jpeg", ".webp"].some((ext) =>
            f.name.toLowerCase().endsWith(ext)
          )
      );

      setStatusMessage(
        hasImages
          ? `Running Grayscale + OCR on ${fileCount} file${
              fileCount > 1 ? "s" : ""
            }...`
          : `Processing and embedding ${fileCount} document${
              fileCount > 1 ? "s" : ""
            }...`
      );

      await uploadDocuments(newStudySetId, selectedFiles);

      setSelectedFiles([]);
      setStudySetName("");

      if (onStudySetCreated) {
        onStudySetCreated(newSet);
      }

      if (onNavigate) {
        onNavigate("study-set", {
          studySetId: newStudySetId,
        });
      }
    } catch (error) {
      console.error(
        "Failed to create study set or upload documents:",
        error
      );

      if (newSet) {
        setUploadError(
          `Study set "${studySetName.trim()}" was created, but document upload failed: ${
            error.message || "Upload error"
          }.`
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

  /* =========================================================
     JOJO READING LOADING UI
  ========================================================= */

  if (uploading) {
    return (
      <div
        className={`min-h-[70vh] flex items-center justify-center rounded-3xl transition-all duration-500 ${
          isDarkMode
            ? "bg-[#0E131F] text-white"
            : "bg-[#F8F8FC] text-[#231B33]"
        }`}
      >
        <div className="flex w-full max-w-xl flex-col items-center px-6 py-12 text-center">
          {/* JOJO */}
          <div className="relative mb-8 flex h-56 w-56 items-center justify-center">
            <div
              className={`absolute inset-0 rounded-full blur-3xl ${
                isDarkMode
                  ? "bg-[#8064C7]/20"
                  : "bg-[#8064C7]/15"
              }`}
            />

            <img
              src={jojoReading}
              alt="Jojo is reading your study material"
              className="relative z-10 h-52 w-52 object-contain"
            />
          </div>

          {/* HEADING */}
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            Jojo is reading...
          </h2>

          {/* STATUS */}
          <p
            className={`mt-3 max-w-md text-sm leading-relaxed ${
              isDarkMode ? "text-white/55" : "text-gray-500"
            }`}
          >
            {statusMessage ||
              "Going through your study material..."}
          </p>

          {/* LOADING DOTS */}
          <div className="mt-7 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#8064C7]"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#8064C7]"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#8064C7]"
              style={{ animationDelay: "300ms" }}
            />
          </div>

          {/* INFORMATION CARD */}
          <div
            className={`mt-8 w-full max-w-sm rounded-2xl border px-5 py-4 backdrop-blur-xl ${
              isDarkMode
                ? "border-white/10 bg-white/5"
                : "border-[#8064C7]/10 bg-white/70"
            }`}
          >
            <div className="flex items-start gap-3 text-left">
              <Sparkles
                size={18}
                className="mt-0.5 shrink-0 text-[#8064C7]"
              />

              <p
                className={`text-xs font-semibold leading-relaxed ${
                  isDarkMode
                    ? "text-white/50"
                    : "text-gray-500"
                }`}
              >
                Jojo is analyzing your materials and preparing
                your personalized study set.
              </p>
            </div>
          </div>

          {/* DON'T CLOSE MESSAGE */}
          <p
            className={`mt-5 text-[11px] ${
              isDarkMode
                ? "text-white/30"
                : "text-gray-400"
            }`}
          >
            Please don't close this page while your materials
            are being processed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* =====================================================
          HEADER
      ===================================================== */}
      <div
        className={`relative mb-8 overflow-visible rounded-3xl border p-5 backdrop-blur-2xl transition-all duration-500 sm:p-8 ${
          isDarkMode
            ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            : "border-[#8064C7]/20 bg-gradient-to-r from-[#E5DCF8] to-[#F1EAFA] text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.06)]"
        }`}
      >
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          {/* LEFT CONTENT */}
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
              Create Study Set
            </h1>

            <p
              className={`mt-2 text-xs font-medium sm:text-sm ${
                isDarkMode
                  ? "text-white/50"
                  : "text-[#706A78]"
              }`}
            >
              Upload study documents or snap photos of handwritten
              notes & images.
            </p>
          </div>

          {/* =================================================
              JOJO HEADER MASCOT
          ================================================= */}
          <div className="relative flex h-[145px] w-[320px] shrink-0 items-end">
            {/* Soft glow */}
            <div className="pointer-events-none absolute bottom-0 left-8 h-28 w-28 rounded-full bg-[#8064C7]/10 blur-3xl" />

            {/* Jojo */}
            <img
              src={jojoReading}
              alt="Jojo reading"
              className="absolute bottom-0 left-0 z-10 h-[135px] w-[135px] object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,0.13)] sm:h-[145px] sm:w-[145px]"
            />

            {/* Speech Bubble */}
            <div className="absolute left-[145px] top-[18px] z-20">
              <div className="relative w-[175px] rounded-2xl border border-[#8064C7]/15 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(70,55,110,0.12)]">
                <p className="whitespace-nowrap text-[11px] font-black leading-tight text-[#4F3A7D] sm:text-xs">
                  Ready when you are! 📖
                </p>

                <p className="mt-1 text-[10px] font-semibold leading-4 text-[#75678E]">
                  Send me your notes.
                </p>

                {/* Bubble tail */}
                <div className="absolute left-[-7px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-45 border-b border-l border-[#8064C7]/15 bg-white" />
              </div>
            </div>
          </div>
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
      <div className="grid items-stretch gap-6 lg:grid-cols-3">
        {/* ================= UPLOAD CARD ================= */}
        <div
          className={`flex h-full flex-col rounded-3xl border p-4 backdrop-blur-2xl transition-all duration-500 lg:col-span-2 sm:p-6 ${
            isDarkMode
              ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
              : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
          }`}
        >
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex min-h-[300px] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300 sm:p-8 ${
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
                  Drop your files or snap a photo
                </h2>

                <p
                  className={`mt-2 max-w-md text-sm ${
                    isDarkMode
                      ? "text-white/60"
                      : "text-gray-500"
                  }`}
                >
                  Drag and drop documents, scanned notes, or use
                  your phone camera.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <label className="cursor-pointer rounded-xl bg-[#8064C7] px-6 py-3 text-sm font-bold text-white shadow-[0_15px_35px_rgba(128,100,199,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8B6DD4]">
                    Browse Files

                    <input
                      type="file"
                      accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg,.webp"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 ${
                      isDarkMode
                        ? "border-white/10 bg-white/5 text-[#A78BFA] hover:border-[#8064C7]/50 hover:bg-white/10"
                        : "border-[#8064C7]/30 bg-white text-[#8064C7] shadow-sm hover:border-[#8064C7] hover:bg-[#8064C7]/5"
                    }`}
                  >
                    <Camera size={18} />
                    Take Photo

                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <p
                  className={`mt-4 text-xs ${
                    isDarkMode
                      ? "text-white/40"
                      : "text-gray-400"
                  }`}
                >
                  PDF, DOCX, PPTX, PNG, JPG, JPEG, WEBP (up to 20 MB)
                </p>
              </>
            ) : (
              <div className="my-auto w-full max-w-lg">
                <div
                  className={`rounded-2xl border p-5 shadow-sm backdrop-blur-xl ${
                    isDarkMode
                      ? "border-white/10 bg-[#211D2B]/90"
                      : "border-white/80 bg-white/85"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between border-b border-inherit pb-3">
                    <p className="text-sm font-bold">
                      Selected Files ({selectedFiles.length})
                    </p>

                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer text-xs font-bold text-[#8064C7] transition hover:underline dark:text-[#A78BFA]">
                        + Add files

                        <input
                          type="file"
                          accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg,.webp"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>

                      <span className="text-xs text-gray-400">|</span>

                      <label className="flex cursor-pointer items-center gap-1 text-xs font-bold text-[#8064C7] transition hover:underline dark:text-[#A78BFA]">
                        <Camera size={14} />
                        photo

                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="max-h-60 space-y-2.5 overflow-y-auto pr-1">
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

                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm font-bold">
                            {file.name}
                          </p>

                          <p
                            className={`mt-0.5 text-xs ${
                              isDarkMode
                                ? "text-white/40"
                                : "text-gray-500"
                            }`}
                          >
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          disabled={uploading}
                          className="rounded-lg p-1.5 opacity-60 transition hover:text-red-400 hover:opacity-100 disabled:opacity-50"
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

        {/* STUDY SET NAME & ACTIONS */}
        <div
          className={`flex h-full flex-col justify-between rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-500 lg:col-span-1 ${
            isDarkMode
              ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
              : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
          }`}
        >
          <div>
            <h2 className="text-xl font-black tracking-tight">
              Study Set Name
            </h2>

            <p
              className={`mt-1 text-sm ${
                isDarkMode
                  ? "text-white/60"
                  : "text-gray-500"
              }`}
            >
              Give your new study set a name to organize your
              learning materials.
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
                ? statusMessage || "Creating..."
                : "Create Study Set →"}
            </button>

            <button
              type="button"
              onClick={() => {
                onNavigate?.("study-sets");
              }}
              disabled={uploading}
              className={`w-full rounded-xl border px-5 py-2.5 text-center text-sm font-semibold transition ${
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
        <h2 className="text-base font-black tracking-tight sm:text-lg">
          Supported Formats
        </h2>

        <p
          className={`mt-0.5 text-xs sm:text-sm ${
            isDarkMode
              ? "text-white/60"
              : "text-gray-500"
          }`}
        >
          Upload study materials, scanned documents, or
          handwritten notes in any of these formats.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* PDF */}
          <div
            className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all ${
              isDarkMode
                ? "border-white/5 bg-white/5"
                : "border-white/80 bg-white/70"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8064C7]/15">
              <FileText
                size={20}
                className="text-[#8064C7] dark:text-[#A78BFA]"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-bold sm:text-sm">
                PDF
              </p>

              <p
                className={`truncate text-[11px] sm:text-xs ${
                  isDarkMode
                    ? "text-white/50"
                    : "text-gray-500"
                }`}
              >
                Notes & textbooks
              </p>
            </div>
          </div>

          {/* DOCX */}
          <div
            className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all ${
              isDarkMode
                ? "border-white/5 bg-white/5"
                : "border-white/80 bg-white/70"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8064C7]/15">
              <FileCheck
                size={20}
                className="text-[#8064C7] dark:text-[#A78BFA]"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-bold sm:text-sm">
                DOCX
              </p>

              <p
                className={`truncate text-[11px] sm:text-xs ${
                  isDarkMode
                    ? "text-white/50"
                    : "text-gray-500"
                }`}
              >
                Documents & notes
              </p>
            </div>
          </div>

          {/* PPTX */}
          <div
            className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all ${
              isDarkMode
                ? "border-white/5 bg-white/5"
                : "border-white/80 bg-white/70"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8064C7]/15">
              <Presentation
                size={20}
                className="text-[#8064C7] dark:text-[#A78BFA]"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-bold sm:text-sm">
                PPTX
              </p>

              <p
                className={`truncate text-[11px] sm:text-xs ${
                  isDarkMode
                    ? "text-white/50"
                    : "text-gray-500"
                }`}
              >
                Presentations
              </p>
            </div>
          </div>

          {/* CAMERA / OCR */}
          <div
            className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all ${
              isDarkMode
                ? "border-white/5 bg-white/5"
                : "border-white/80 bg-white/70"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8064C7]/15">
              <Camera
                size={20}
                className="text-[#8064C7] dark:text-[#A78BFA]"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-bold sm:text-sm">
                Camera / OCR
              </p>

              <p
                className={`truncate text-[11px] sm:text-xs ${
                  isDarkMode
                    ? "text-white/50"
                    : "text-gray-500"
                }`}
              >
                Snap handwritten notes
              </p>
            </div>
          </div>
        </div>

        {/* INFO */}
        <div
          className={`mt-5 rounded-2xl border p-4 ${
            isDarkMode
              ? "border-[#8064C7]/30 bg-[#8064C7]/15 text-purple-200"
              : "border-[#8064C7]/20 bg-[#8064C7]/10 text-[#8064C7]"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <Sparkles size={18} className="mt-0.5 shrink-0" />

            <p className="text-xs font-semibold leading-relaxed">
              Photos and scans of handwritten notes are
              preprocessed with Grayscale + Adaptive
              Thresholding and parsed via OCR for question
              generation and flashcards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadPage;