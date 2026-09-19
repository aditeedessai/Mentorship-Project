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

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB limit in bytes

/* =========================================================
   ANIMATION STYLES
   ONLY ANIMATIONS — NO UI / COLOR CHANGES
========================================================= */

const uploadAnimationStyles = `
  @keyframes uploadPageEnter {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes uploadHeaderEnter {
    from {
      opacity: 0;
      transform: translateY(-18px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes uploadCardEnter {
    from {
      opacity: 0;
      transform: translateY(25px) scale(0.985);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes jojoFloat {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25% { transform: translateY(-7px) rotate(-1.5deg); }
    50% { transform: translateY(-12px) rotate(1deg); }
    75% { transform: translateY(-5px) rotate(-0.8deg); }
  }

  @keyframes jojoGlow {
    0%, 100% { opacity: 0.35; transform: scale(0.9); }
    50% { opacity: 0.7; transform: scale(1.12); }
  }

  @keyframes speechPop {
    0% { opacity: 0; transform: scale(0.7) translateX(-12px); }
    70% { transform: scale(1.05) translateX(2px); }
    100% { opacity: 1; transform: scale(1) translateX(0); }
  }

  @keyframes uploadOrbitClockwise {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes uploadOrbitCounter {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }

  @keyframes uploadOrbitBubble {
    0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.75; }
    50% { transform: scale(1.25) rotate(20deg); opacity: 1; }
  }

  @keyframes uploadOrbitSparkle {
    0%, 100% { transform: scale(0.85) rotate(0deg); opacity: 0.55; }
    50% { transform: scale(1.2) rotate(90deg); opacity: 1; }
  }

  @keyframes uploadOrbitGlow {
    0%, 100% { opacity: 0.12; transform: scale(0.96); }
    50% { opacity: 0.28; transform: scale(1.03); }
  }

  .upload-orbit-clockwise { animation: uploadOrbitClockwise 13s linear infinite; }
  .upload-orbit-counter { animation: uploadOrbitCounter 18s linear infinite; }
  .upload-orbit-bubble { animation: uploadOrbitBubble 2.7s ease-in-out infinite; }
  .upload-orbit-sparkle { animation: uploadOrbitSparkle 3s ease-in-out infinite; }
  .upload-orbit-glow { animation: uploadOrbitGlow 4s ease-in-out infinite; }

  @keyframes uploadIconFloat {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-8px) rotate(-4deg); }
  }

  @keyframes uploadIconPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(128, 100, 199, 0); }
    50% { box-shadow: 0 0 0 12px rgba(128, 100, 199, 0.08); }
  }

  @keyframes borderGlow {
    0% { background-position: 0% 50%; opacity: 0.15; }
    50% { background-position: 100% 50%; opacity: 0.5; }
    100% { background-position: 0% 50%; opacity: 0.15; }
  }

  @keyframes buttonShine {
    0% { transform: translateX(-140%); }
    35%, 100% { transform: translateX(140%); }
  }

  @keyframes buttonIconBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  @keyframes fileEnter {
    from { opacity: 0; transform: translateX(-18px) scale(0.96); }
    to { opacity: 1; transform: translateX(0) scale(1); }
  }

  @keyframes fileIconPop {
    0% { transform: scale(0.7) rotate(-12deg); }
    70% { transform: scale(1.08) rotate(3deg); }
    100% { transform: scale(1) rotate(0); }
  }

  @keyframes formatEnter {
    from { opacity: 0; transform: translateY(20px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes formatIconFloat {
    0%, 100% { transform: translateY(0) rotate(0); }
    50% { transform: translateY(-3px) rotate(3deg); }
  }

  @keyframes infoShimmer {
    0% { transform: translateX(-120%); }
    100% { transform: translateX(120%); }
  }

  @keyframes loadingJojo {
    0%, 100% { transform: translateY(0) rotate(0); }
    50% { transform: translateY(-14px) rotate(2deg); }
  }

  @keyframes loadingGlow {
    0%, 100% { transform: scale(0.85); opacity: 0.25; }
    50% { transform: scale(1.15); opacity: 0.55; }
  }

  @keyframes sparkleSpin {
    0% { transform: rotate(0deg) scale(1); }
    50% { transform: rotate(12deg) scale(1.15); }
    100% { transform: rotate(0deg) scale(1); }
  }

  .upload-page-animation { animation: uploadPageEnter 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
  .upload-header-animation { animation: uploadHeaderEnter 0.75s cubic-bezier(0.22, 1, 0.36, 1) both; }
  .upload-main-card-animation { animation: uploadCardEnter 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both; }
  .upload-name-card-animation { animation: uploadCardEnter 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.22s both; }
  .upload-formats-animation { animation: uploadCardEnter 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.32s both; }
  .jojo-upload-float { animation: jojoFloat 4.5s ease-in-out infinite; transform-origin: bottom center; }
  .jojo-upload-glow { animation: jojoGlow 3.5s ease-in-out infinite; }
  .speech-bubble-animation { animation: speechPop 0.75s cubic-bezier(0.16, 1, 0.3, 1) 0.55s both; transform-origin: left center; }
  .upload-icon-animation { animation: uploadIconFloat 3s ease-in-out infinite, uploadIconPulse 2.5s ease-in-out infinite; }

  .upload-zone-animation { position: relative; overflow: hidden; }
  .upload-zone-animation::before {
    content: ""; position: absolute; inset: 0; pointer-events: none; border-radius: inherit; padding: 1px;
    background: linear-gradient(110deg, transparent, rgba(128, 100, 199, 0.05), rgba(128, 100, 199, 0.35), rgba(128, 100, 199, 0.05), transparent);
    background-size: 250% 100%; animation: borderGlow 4s ease-in-out infinite;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
  }
  .upload-zone-animation > * { position: relative; z-index: 1; }

  .animated-shine { position: relative; overflow: hidden; }
  .animated-shine::after {
    content: ""; position: absolute; top: 0; left: 0; width: 35%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.18), transparent);
    transform: translateX(-140%); pointer-events: none;
  }
  .animated-shine:hover::after { animation: buttonShine 0.75s ease-out; }
  .browse-icon-animation { transition: transform 0.3s ease; }
  .animated-shine:hover .browse-icon-animation { animation: buttonIconBounce 0.6s ease-in-out; }
  .camera-icon-animation { transition: transform 0.3s ease; }
  .animated-shine:hover .camera-icon-animation { transform: rotate(-8deg) scale(1.1); }

  .selected-file-animation { animation: fileEnter 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
  .selected-file-icon-animation { animation: fileIconPop 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .selected-file-animation:hover .selected-file-icon-animation { transform: scale(1.08) rotate(3deg); }

  .format-card-animation { animation: formatEnter 0.65s cubic-bezier(0.22, 1, 0.36, 1) both; }
  .format-card-animation:hover { transform: translateY(-5px) scale(1.015); }
  .format-card-animation:hover .format-icon-animation { animation: formatIconFloat 0.7s ease-in-out; }
  .format-icon-animation { transition: transform 0.3s ease; }

  .info-card-animation { position: relative; overflow: hidden; }
  .info-card-animation::after {
    content: ""; position: absolute; top: 0; left: 0; width: 35%; height: 100%; pointer-events: none;
    background: linear-gradient(90deg, transparent, rgba(128, 100, 199, 0.08), transparent);
    transform: translateX(-120%);
  }
  .info-card-animation:hover::after { animation: infoShimmer 0.9s ease-out; }

  .sparkle-animation { animation: sparkleSpin 2.5s ease-in-out infinite; }
  .loading-jojo-animation { animation: loadingJojo 3.5s ease-in-out infinite; }
  .loading-glow-animation { animation: loadingGlow 3s ease-in-out infinite; }

  .create-button-animation { position: relative; overflow: hidden; }
  .create-button-animation::after {
    content: ""; position: absolute; top: 0; left: 0; width: 30%; height: 100%; pointer-events: none;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.18), transparent);
    transform: translateX(-140%);
  }
  .create-button-animation:hover::after { animation: buttonShine 0.8s ease-out; }
  .create-button-animation svg { transition: transform 0.3s ease; }
  .create-button-animation:hover svg { transform: translateY(-3px); }

  .cancel-button-animation:hover { transform: translateY(-2px); }
  .remove-button-animation:hover svg { transform: rotate(8deg) scale(1.15); }
  .remove-button-animation svg { transition: transform 0.25s ease; }

  @media (max-width: 768px) {
    .upload-orbit-outer { width: 150px !important; height: 150px !important; margin-left: -75px !important; margin-top: -75px !important; }
    .upload-orbit-inner { width: 115px !important; height: 115px !important; margin-left: -57.5px !important; margin-top: -57.5px !important; }
  }

  @media (prefers-reduced-motion: reduce) {
    .upload-page-animation, .upload-header-animation, .upload-main-card-animation,
    .upload-name-card-animation, .upload-formats-animation, .jojo-upload-float,
    .jojo-upload-glow, .speech-bubble-animation, .upload-icon-animation, .format-card-animation,
    .selected-file-animation, .selected-file-icon-animation, .sparkle-animation,
    .loading-jojo-animation, .loading-glow-animation, .upload-orbit-clockwise,
    .upload-orbit-counter, .upload-orbit-bubble, .upload-orbit-sparkle, .upload-orbit-glow {
      animation: none !important;
    }
    .format-card-animation:hover, .cancel-button-animation:hover { transform: none !important; }
  }
`;

const getFileIcon = (fileName) => {
  const ext = "." + fileName.toLowerCase().split(".").pop();

  if (ext === ".pdf") return <FileText size={22} className="text-[#8064C7]" />;
  if (ext === ".docx") return <FileCheck size={22} className="text-[#8064C7]" />;
  if (ext === ".pptx") return <Presentation size={22} className="text-[#8064C7]" />;
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) return <ImageIcon size={22} className="text-[#8064C7]" />;

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
    const oversizedFileNames = [];

    incoming.forEach((file) => {
      const ext = "." + file.name.toLowerCase().split(".").pop();
      const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);

      // DF006 Fix: Check if file format is supported
      if (!isAllowedExt) {
        invalidFileNames.push(file.name);
        return;
      }

      // DF010 Fix: Check if file size exceeds 20 MB limit
      if (file.size > MAX_FILE_SIZE) {
        oversizedFileNames.push(file.name);
        return;
      }

      validFiles.push(file);
    });

    // Handle error messages for invalid formats or oversized files
    const errorMessages = [];

    if (invalidFileNames.length > 0) {
      errorMessages.push(
        `Unsupported file format: ${invalidFileNames.join(
          ", "
        )}. Allowed formats: PDF, DOCX, PPTX, PNG, JPG, JPEG, WEBP`
      );
    }

    if (oversizedFileNames.length > 0) {
      errorMessages.push(
        `File size exceeds 20 MB limit: ${oversizedFileNames.join(", ")}`
      );
    }

    if (errorMessages.length > 0) {
      setUploadError(errorMessages.join(" | "));
    } else {
      setUploadError("");
    }

    // DF006 & DF010 Fix: Only add strictly valid files to selected files state
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
        const errorMessage = error.message || "";
        const normalizedError = errorMessage.toLowerCase();

        if (
          normalizedError.includes("not a valid pdf") ||
          normalizedError.includes("genuine pdf")
        ) {
          setUploadError(
            "The uploaded file is not a valid PDF. Please upload a genuine PDF file and try again."
          );
        } else {
          setUploadError(
            "The document could not be uploaded. Please check the file and try again."
          );
        }
      } else {
        setUploadError(
          "The study set could not be created. Please try again."
        );
      }
    } finally {
      setUploading(false);
      setStatusMessage("");
    }
  };

  if (uploading) {
    return (
      <div
        className={`min-h-[70vh] flex items-center justify-center rounded-3xl transition-all duration-500 ${
          isDarkMode
            ? "bg-[#0E131F] text-white"
            : "bg-[#F8F8FC] text-[#231B33]"
        }`}
      >
        <style>{uploadAnimationStyles}</style>

        <div className="flex w-full max-w-xl flex-col items-center px-6 py-12 text-center upload-page-animation">
          <div className="relative mb-8 flex h-56 w-56 items-center justify-center">
            <div
              className={`absolute inset-0 rounded-full blur-3xl loading-glow-animation ${
                isDarkMode ? "bg-[#8064C7]/20" : "bg-[#8064C7]/15"
              }`}
            />
            <img
              src={jojoReading}
              alt="Jojo is reading your study material"
              className="relative z-10 h-52 w-52 object-contain loading-jojo-animation"
            />
          </div>

          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            Jojo is reading...
          </h2>

          <p
            className={`mt-3 max-w-md text-sm leading-relaxed ${
              isDarkMode ? "text-white/55" : "text-gray-500"
            }`}
          >
            {statusMessage || "Going through your study material..."}
          </p>

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
                className="mt-0.5 shrink-0 text-[#8064C7] sparkle-animation"
              />
              <p
                className={`text-xs font-semibold leading-relaxed ${
                  isDarkMode ? "text-white/50" : "text-gray-500"
                }`}
              >
                Jojo is analyzing your materials and preparing your personalized study set.
              </p>
            </div>
          </div>

          <p
            className={`mt-5 text-[11px] ${
              isDarkMode ? "text-white/30" : "text-gray-400"
            }`}
          >
            Please don't close this page while your materials are being processed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-page-animation">
      <style>{uploadAnimationStyles}</style>

      {/* HEADER */}
      <div
        className={`relative mb-8 overflow-visible rounded-3xl border p-5 backdrop-blur-2xl transition-all duration-500 sm:p-8 upload-header-animation ${
          isDarkMode
            ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
            : "border-[#8064C7]/20 bg-gradient-to-r from-[#E5DCF8] to-[#F1EAFA] text-[#231B33] shadow-[0_4px_25px_rgba(128,100,199,0.06)]"
        }`}
      >
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
              Create Study Set
            </h1>
            <p
              className={`mt-2 text-xs font-medium sm:text-sm ${
                isDarkMode ? "text-white/50" : "text-[#706A78]"
              }`}
            >
              Upload study documents or snap photos of handwritten notes & images.
            </p>
          </div>

          <div className="relative flex h-[170px] w-[330px] shrink-0 items-center justify-center">
            <div className="upload-orbit-glow pointer-events-none absolute left-1/2 top-1/2 h-[205px] w-[205px] -ml-[102.5px] -mt-[102.5px] rounded-full bg-[#8064C7]/5 blur-xl" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[190px] w-[190px] -ml-[95px] -mt-[95px] rounded-full border border-[#8064C7]/15" />

            <div className="upload-orbit-clockwise upload-orbit-outer pointer-events-none absolute left-1/2 top-1/2 h-[190px] w-[190px] -ml-[95px] -mt-[95px]">
              <span className="upload-orbit-bubble absolute left-1/2 top-[-5px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#8064C7]/60" />
              <span className="upload-orbit-sparkle absolute right-[-7px] top-1/2 -translate-y-1/2 text-[#8064C7]" style={{ fontSize: "16px" }}>✦</span>
              <span className="upload-orbit-bubble absolute bottom-[-5px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#8064C7]/45" style={{ animationDelay: "0.8s" }} />
              <span className="upload-orbit-sparkle absolute left-[-7px] top-1/2 -translate-y-1/2 text-[#8064C7]" style={{ fontSize: "11px", animationDelay: "1.1s" }}>✦</span>
            </div>

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[145px] w-[145px] -ml-[72.5px] -mt-[72.5px] rounded-full border border-dashed border-[#8064C7]/15" />

            <div className="upload-orbit-counter upload-orbit-inner pointer-events-none absolute left-1/2 top-1/2 h-[145px] w-[145px] -ml-[72.5px] -mt-[72.5px]">
              <span className="upload-orbit-sparkle absolute left-[13px] top-[12px] text-[#8064C7]" style={{ fontSize: "10px" }}>✦</span>
              <span className="upload-orbit-bubble absolute right-[15px] top-[16px] h-1.5 w-1.5 rounded-full bg-[#8064C7]/40" style={{ animationDelay: "0.5s" }} />
              <span className="upload-orbit-bubble absolute bottom-[10px] right-[12px] h-2 w-2 rounded-full bg-[#8064C7]/50" style={{ animationDelay: "1.4s" }} />
            </div>

            <div className="relative z-10 flex h-[145px] w-[145px] items-end justify-center">
              <div className="pointer-events-none absolute bottom-0 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-[#8064C7]/10 blur-3xl jojo-upload-glow" />
              <img
                src={jojoReading}
                alt="Jojo reading"
                className="absolute bottom-0 left-1/2 z-10 h-[135px] w-[135px] -translate-x-1/2 object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,0.13)] sm:h-[145px] sm:w-[145px] jojo-upload-float"
              />
            </div>

            <div className="absolute left-[calc(50%+65px)] top-[3px] z-20 speech-bubble-animation">
              <div className="relative w-[175px] rounded-2xl border border-[#8064C7]/15 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(70,55,110,0.12)]">
                <p className="whitespace-nowrap text-[11px] font-black leading-tight text-[#4F3A7D] sm:text-xs">
                  Ready when you are! 📖
                </p>
                <p className="mt-1 text-[10px] font-semibold leading-4 text-[#75678E]">
                  Send me your notes.
                </p>
                <div className="absolute left-[-7px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-45 border-b border-l border-[#8064C7]/15 bg-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {uploadSuccess && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm font-semibold text-emerald-400">
            {uploadSuccess}
          </p>
        </div>
      )}

      {uploadError && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm font-semibold text-red-400">
            {uploadError}
          </p>
        </div>
      )}

      {/* MAIN UPLOAD AREA */}
      <div className="grid items-stretch gap-6 lg:grid-cols-3">
        <div
          className={`flex h-full flex-col rounded-3xl border p-4 backdrop-blur-2xl transition-all duration-500 lg:col-span-2 sm:p-6 upload-main-card-animation ${
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
            className={`flex min-h-[300px] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300 upload-zone-animation sm:p-8 ${
              isDragging
                ? "border-[#8064C7] bg-[#8064C7]/15"
                : isDarkMode
                ? "border-white/10 bg-white/5 hover:border-[#8064C7]/50 hover:bg-white/10"
                : "border-gray-200 bg-white/50 hover:border-[#8064C7]/40 hover:bg-white/80"
            }`}
          >
            {selectedFiles.length === 0 ? (
              <>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA] upload-icon-animation">
                  <Upload size={30} />
                </div>
                <h2 className="text-xl font-black tracking-tight">
                  Drag & Drop Study Material
                </h2>
                <p className={`mt-2 text-xs ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                  PDF, DOCX, PPTX, PNG, JPG, JPEG, WEBP (up to 20 MB)
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <label className="animated-shine flex cursor-pointer items-center gap-2 rounded-xl bg-[#8064C7] px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-all hover:bg-[#6e52b5]">
                    <Upload size={16} className="browse-icon-animation" />
                    Browse Files
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg,.webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </>
            ) : (
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8064C7]">
                    Selected Files ({selectedFiles.length})
                  </span>
                  <label className="cursor-pointer text-xs font-bold text-[#8064C7] hover:underline">
                    + Add More
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg,.webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className={`selected-file-animation flex items-center justify-between rounded-xl border p-3 ${
                        isDarkMode
                          ? "border-white/10 bg-white/5"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="selected-file-icon-animation shrink-0">
                          {getFileIcon(file.name)}
                        </div>
                        <div className="truncate text-left">
                          <p className="truncate text-xs font-bold">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(idx)}
                        className="remove-button-animation p-1 text-gray-400 hover:text-red-400"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR / FORM */}
        <div className="flex flex-col gap-6">
          <div
            className={`upload-name-card-animation flex flex-col rounded-3xl border p-6 backdrop-blur-2xl transition-all ${
              isDarkMode
                ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8]"
                : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33]"
            }`}
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#8064C7]">
              Study Set Details
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium">Study Set Title</label>
                <input
                  type="text"
                  placeholder="e.g., Operating Systems Chapter 3"
                  value={studySetName}
                  onChange={(e) => setStudySetName(e.target.value)}
                  className={`mt-1.5 w-full rounded-xl border px-4 py-3 text-xs outline-none transition-all ${
                    isDarkMode
                      ? "border-white/10 bg-white/5 text-white focus:border-[#8064C7]"
                      : "border-gray-200 bg-white text-[#231B33] focus:border-[#8064C7]"
                  }`}
                />
              </div>
              <button
                onClick={handleCreateAndUpload}
                disabled={selectedFiles.length === 0}
                className={`create-button-animation flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-bold text-white transition-all shadow-lg ${
                  selectedFiles.length === 0
                    ? "cursor-not-allowed bg-gray-400 opacity-50"
                    : "bg-[#8064C7] hover:bg-[#6e52b5]"
                }`}
              >
                <Sparkles size={16} />
                Create Study Set
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadPage;