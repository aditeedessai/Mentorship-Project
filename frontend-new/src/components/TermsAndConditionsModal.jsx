import { useEffect, useRef } from "react";
import { FileText, X } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function TermsAndConditionsModal({ isOpen, onClose }) {
  const { isDarkMode } = useTheme();
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      closeBtnRef.current?.focus();

      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          onClose();
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <div
        className={`relative w-[92vw] sm:w-[540px] max-h-[85vh] flex flex-col rounded-3xl p-5 sm:p-7 shadow-2xl border z-10 transition-all backdrop-blur-2xl ${
          isDarkMode
            ? "border-white/10 bg-[#17131F] text-[#F3F0F8]"
            : "border-white/80 bg-white text-[#231B33]"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-inherit shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA]">
              <FileText size={20} />
            </div>
            <h2 id="terms-modal-title" className="text-lg sm:text-xl font-black tracking-tight">
              Terms & Conditions
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl p-1.5 transition cursor-pointer ${
              isDarkMode ? "hover:bg-white/10 text-white/60" : "hover:bg-gray-100 text-gray-400"
            }`}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin pr-1.5 space-y-5 text-xs font-semibold">
          {/* Introductory Callout */}
          <div
            className={`rounded-2xl border p-4 ${
              isDarkMode
                ? "border-[#8064C7]/20 bg-[#8064C7]/5 text-white/90"
                : "border-[#8064C7]/15 bg-[#8064C7]/5 text-gray-800"
            }`}
          >
            <p className="leading-relaxed">
              Welcome to Jot. By creating an account or using our learning platform, you agree to comply with and be bound by the following Terms & Conditions.
            </p>
          </div>

          {/* Section 1: Account Creation & Responsibilities */}
          <div className="space-y-2">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-[#A78BFA]/80" : "text-[#6B51B3]"}`}>
              Account Registration & Responsibilities
            </h3>
            <ul className={`list-disc list-inside space-y-1 ${isDarkMode ? "text-white/70" : "text-gray-600"}`}>
              <li>You must provide accurate information when creating your account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must notify us immediately of any unauthorized use or security breach.</li>
            </ul>
          </div>

          {/* Section 2: Acceptable Use */}
          <div className="space-y-2">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-[#A78BFA]/80" : "text-[#6B51B3]"}`}>
              Acceptable Use & Study Materials
            </h3>
            <ul className={`list-disc list-inside space-y-1 ${isDarkMode ? "text-white/70" : "text-gray-600"}`}>
              <li>Jot is designed solely for academic study, learning, and productivity.</li>
              <li>You may upload study sets, notes, and documents owned by or licensed to you.</li>
              <li>You agree not to upload content that violates intellectual property or privacy laws.</li>
            </ul>
          </div>

          {/* Section 3: AI Features & Content */}
          <div className="space-y-1.5">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-[#A78BFA]/80" : "text-[#6B51B3]"}`}>
              AI Features & Generated Content
            </h3>
            <p className={`leading-relaxed ${isDarkMode ? "text-white/70" : "text-gray-600"}`}>
              AI-generated flashcards, summaries, and practice quizzes are provided as study aids. Users are encouraged to verify key concepts against primary course materials.
            </p>
          </div>

          {/* Section 4: Service Modifications & Termination */}
          <div className="space-y-1.5">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-[#A78BFA]/80" : "text-[#6B51B3]"}`}>
              Service Modifications & Account Deletion
            </h3>
            <p className={`leading-relaxed ${isDarkMode ? "text-white/70" : "text-gray-600"}`}>
              We reserve the right to update these terms at any time. You can delete your account and all associated learning data whenever you choose via Account Settings.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-inherit shrink-0 mt-4">
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#8064C7] hover:bg-[#8B6DD4] px-6 py-2.5 text-xs font-bold text-white shadow-md transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
