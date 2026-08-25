import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X, FileCheck, Presentation, FileText, Upload } from "lucide-react";
import { uploadDocuments } from "../services/api";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".pptx"];

const getFileIcon = (fileName) => {
  const ext = "." + fileName.toLowerCase().split(".").pop();
  if (ext === ".pdf") return <FileText size={22} className="text-[#4E1F6E]" />;
  if (ext === ".docx") return <FileCheck size={22} className="text-[#4E1F6E]" />;
  if (ext === ".pptx") return <Presentation size={22} className="text-[#4E1F6E]" />;
  return <FileText size={22} className="text-[#4E1F6E]" />;
};

function UploadPage({ studySetId, onNavigate }) {
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedDocId, setUploadedDocId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // ================= UPLOAD DOCUMENTS =================
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadError("Please select at least one file first.");
      return;
    }

    if (!studySetId) {
      setUploadError(
        "No study set selected. Please create a study set first."
      );
      return;
    }

    try {
      setUploading(true);
      const fileCount = selectedFiles.length;
      setStatusMessage(
        `Uploading and processing ${fileCount} document${fileCount > 1 ? "s" : ""}...`
      );
      setUploadError("");
      setUploadSuccess("");

      const uploadResponse = await uploadDocuments(studySetId, selectedFiles);
      console.log("Documents uploaded successfully:", uploadResponse);

      const docs = uploadResponse?.documents || [];
      const processedCount = docs.length || fileCount;
      const docId = docs.length > 0 ? docs[0].document_id : null;

      setUploadedDocId(docId);
      setUploadSuccess(
        `${processedCount} document${processedCount > 1 ? "s" : ""} uploaded and processed into study set successfully!`
      );
      setSelectedFiles([]);
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError(
        error.message || "Failed to upload and process document(s)."
      );
    } finally {
      setUploading(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFA]">

      {/* ================= HEADER ================= */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#98E8DE]/50">
            <Sparkles
              size={21}
              className="text-[#4E1F6E]"
            />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-[#3E3E75]">
              Upload Study Material
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Upload your study material and let AI create a
              personalized learning experience.
            </p>
          </div>
        </div>
      </div>

      {/* ================= STUDY SET WARNING ================= */}
      {!studySetId && (
        <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm font-medium text-yellow-800">
            Please create a study set first, then select
            <strong> Continue Studying </strong>
            to upload documents.
          </p>
        </div>
      )}

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
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ================= UPLOAD CARD ================= */}
        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex min-h-[360px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
              isDragging
                ? "border-[#4E1F6E] bg-[#98E8DE]/20"
                : "border-gray-200 bg-gray-50 hover:border-[#98E8DE] hover:bg-[#98E8DE]/10"
            }`}
          >
            {selectedFiles.length === 0 ? (
              <>
                {/* Upload Icon */}
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#98E8DE]/40">
                  <Upload
                    size={34}
                    className="text-[#4E1F6E]"
                  />
                </div>

                <h2 className="text-xl font-semibold text-[#3E3E75]">
                  Drop your files here
                </h2>

                <p className="mt-2 max-w-md text-sm text-gray-500">
                  Drag and drop your study materials here, or
                  browse your computer to select files.
                </p>

                {/* Browse Files */}
                <label className="mt-6 cursor-pointer rounded-xl bg-[#4E1F6E] px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3E3E75] hover:shadow-md">
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
              <div className="w-full max-w-lg">
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

                  {/* ================= UPLOAD BUTTON ================= */}
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading || !studySetId || selectedFiles.length === 0}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4E1F6E] px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3E3E75] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload size={17} />
                    {uploading
                      ? (statusMessage || "Processing...")
                      : `Upload & Process ${selectedFiles.length} Document${selectedFiles.length > 1 ? "s" : ""}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= SUPPORTED FORMATS ================= */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#3E3E75]">
            Supported Formats
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Upload your study materials in any of these formats.
          </p>

          <div className="mt-6 space-y-4">
            {/* ================= PDF ================= */}
            <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4 transition hover:bg-[#98E8DE]/20">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#98E8DE]/40">
                <FileText
                  size={20}
                  className="text-[#4E1F6E]"
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-[#3E3E75]">
                  PDF
                </p>

                <p className="text-xs text-gray-500">
                  Lecture notes & textbooks
                </p>
              </div>
            </div>

            {/* ================= DOCX ================= */}
            <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4 transition hover:bg-[#98E8DE]/20">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#98E8DE]/40">
                <FileCheck
                  size={20}
                  className="text-[#4E1F6E]"
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-[#3E3E75]">
                  DOCX
                </p>

                <p className="text-xs text-gray-500">
                  Documents & notes
                </p>
              </div>
            </div>

            {/* ================= PPTX ================= */}
            <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4 transition hover:bg-[#98E8DE]/20">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#98E8DE]/40">
                <Presentation
                  size={20}
                  className="text-[#4E1F6E]"
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-[#3E3E75]">
                  PPTX
                </p>

                <p className="text-xs text-gray-500">
                  Lecture presentations
                </p>
              </div>
            </div>
          </div>

          {/* ================= AI INFORMATION ================= */}
          <div className="mt-6 rounded-xl bg-[#98E8DE]/20 p-4">
            <div className="flex gap-3">
              <Sparkles
                size={18}
                className="mt-0.5 shrink-0 text-[#4E1F6E]"
              />

              <p className="text-xs leading-relaxed text-[#3E3E75]">
                Your material will be analyzed by AI to create
                summaries, quizzes, flashcards, and personalized
                study recommendations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= GENERATE & ANSWER QUIZ ACTION ================= */}
      {uploadedDocId && (
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#3E3E75]">
              Documents Ready for Quiz
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Your documents have been processed. Continue to configure and generate your personalized study questions.
            </p>
          </div>

          <button
            onClick={() => {
              onNavigate?.("quiz");
              navigate("/quiz", {
                state: {
                  studySetId,
                  documentId: uploadedDocId,
                },
              });
            }}
            disabled={!uploadedDocId || uploading}
            className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-[#4E1F6E] px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3E3E75] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles size={17} />
            Generate and Answer Quiz →
          </button>
        </div>
      )}
    </div>
  );
}

export default UploadPage;