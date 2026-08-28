import {
  Loader2,
  FileText,
  FileCheck,
  Presentation,
  FileSpreadsheet,
  File,
  FolderOpen,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const getFileExtension = (fileName) => {
  if (!fileName) return "DOC";
  const ext = fileName.toLowerCase().split(".").pop();
  return ext.toUpperCase();
};

const getFileIcon = (fileName) => {
  if (!fileName) return <File size={22} className="text-[#8064C7]" />;
  const ext = "." + fileName.toLowerCase().split(".").pop();
  if (ext === ".pdf") return <FileText size={22} className="text-[#8064C7]" />;
  if (ext === ".docx" || ext === ".doc") return <FileCheck size={22} className="text-[#8064C7]" />;
  if (ext === ".pptx" || ext === ".ppt") return <Presentation size={22} className="text-[#8064C7]" />;
  if (ext === ".xlsx" || ext === ".csv") return <FileSpreadsheet size={22} className="text-[#8064C7]" />;
  return <FileText size={22} className="text-[#8064C7]" />;
};

function StudySetDocumentsCard({ documents = [], loading = false }) {
  const { isDarkMode } = useTheme();

  return (
    <section
      className={`rounded-3xl border p-6 sm:p-7 backdrop-blur-2xl transition-all duration-500 flex flex-col ${
        isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="bg-[#8064C7]/15 text-[#8064C7] dark:text-[#A78BFA] p-2.5 rounded-2xl shrink-0">
            <FolderOpen size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black leading-tight truncate">
              Uploaded Documents
            </h2>
            <p className={`text-xs truncate ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
              Source files for this set
            </p>
          </div>
        </div>
        <span className={`shrink-0 whitespace-nowrap font-mono text-xs font-bold px-3 py-1 rounded-full ${
          isDarkMode ? "bg-[#8064C7]/20 border border-[#8064C7]/30 text-[#A78BFA]" : "bg-[#8064C7]/10 border border-[#8064C7]/20 text-[#8064C7]"
        }`}>
          {documents.length} File{documents.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className={`flex flex-col gap-3 p-5 border rounded-2xl backdrop-blur-xl relative overflow-hidden ${
        isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200/80 bg-white/50"
      }`}>
        {loading && (
          <div className="py-8 text-center">
            <Loader2 size={30} className="mx-auto mb-2 animate-spin text-[#8064C7]" />
            <p className={`text-xs font-bold ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>
              Loading documents...
            </p>
          </div>
        )}

        {!loading && documents.length === 0 && (
          <div className={`rounded-2xl border border-dashed p-6 text-center ${
            isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-white/80"
          }`}>
            <FileText size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold">
              No documents attached
            </p>
            <p className={`mt-1 text-xs ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
              Upload study material to generate questions for this set.
            </p>
          </div>
        )}

        {!loading && documents.length > 0 && (
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {documents.map((doc, index) => {
              const fileName =
                doc.file_name ||
                doc.filename ||
                doc.name ||
                `Document ${index + 1}`;
              const extTag = getFileExtension(fileName);
              return (
                <div
                  key={doc.document_id || doc.id || index}
                  className={`p-3.5 border rounded-2xl transition-all cursor-pointer group flex items-center justify-between backdrop-blur-xl ${
                    isDarkMode
                      ? "border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10"
                      : "border-gray-200/80 bg-white hover:border-[#8064C7] hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-xl bg-[#8064C7]/15 flex items-center justify-center text-[#8064C7] dark:text-[#A78BFA] group-hover:scale-110 transition-transform shrink-0">
                      {getFileIcon(fileName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4
                        className="truncate text-sm font-bold group-hover:text-[#8064C7] dark:group-hover:text-[#A78BFA] transition-colors"
                        title={fileName}
                      >
                        {fileName}
                      </h4>
                      <p className={`text-xs mt-0.5 font-semibold ${isDarkMode ? "text-white/50" : "text-gray-500"}`}>
                        {doc.created_at
                          ? new Date(doc.created_at).toLocaleDateString()
                          : "Uploaded material"}
                      </p>
                    </div>
                  </div>

                  <span className={`font-mono text-[10px] font-bold px-2.5 py-1 rounded-lg ml-2 shrink-0 border ${
                    isDarkMode ? "bg-[#8064C7]/20 border-[#8064C7]/30 text-[#A78BFA]" : "bg-[#8064C7]/10 border-[#8064C7]/20 text-[#8064C7]"
                  }`}>
                    {extTag}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default StudySetDocumentsCard;

