import {
  Loader2,
  FileText,
  FileCheck,
  Presentation,
  FileSpreadsheet,
  File,
} from "lucide-react";

const getFileExtension = (fileName) => {
  if (!fileName) return "DOC";
  const ext = fileName.toLowerCase().split(".").pop();
  return ext.toUpperCase();
};

const getFileIcon = (fileName) => {
  if (!fileName) return <File size={22} className="text-[#4E1F6E]" />;
  const ext = "." + fileName.toLowerCase().split(".").pop();
  if (ext === ".pdf") return <FileText size={22} className="text-[#4E1F6E]" />;
  if (ext === ".docx" || ext === ".doc") return <FileCheck size={22} className="text-[#4E1F6E]" />;
  if (ext === ".pptx" || ext === ".ppt") return <Presentation size={22} className="text-[#4E1F6E]" />;
  if (ext === ".xlsx" || ext === ".csv") return <FileSpreadsheet size={22} className="text-[#4E1F6E]" />;
  return <FileText size={22} className="text-[#4E1F6E]" />;
};

function StudySetDocumentsCard({ documents = [], loading = false }) {
  return (
    <section className="rounded-2xl bg-white/95 backdrop-blur-md p-6 sm:p-7 shadow-[0_4px_25px_rgba(78,31,110,0.06)] hover:shadow-[0_8px_30px_rgba(78,31,110,0.09)] border border-gray-100/90 flex flex-col transition-all duration-300">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-extrabold text-[#3E3E75]">Documents Uploaded</h2>
        <span className="bg-[#98E8DE]/35 border border-[#98E8DE]/70 text-[#4E1F6E] font-mono text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
          {documents.length} File{documents.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-5 border border-gray-200/80 rounded-2xl bg-gradient-to-br from-white via-gray-50/40 to-[#98E8DE]/15 shadow-xs relative overflow-hidden transition-all duration-300">
        {loading && (
          <div className="py-8 text-center">
            <Loader2 size={30} className="mx-auto mb-2 animate-spin text-[#4E1F6E]" />
            <p className="text-xs font-semibold text-gray-500">
              Loading documents...
            </p>
          </div>
        )}

        {!loading && documents.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center bg-white/80">
            <FileText size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-bold text-[#3E3E75]">
              No documents attached
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Upload study material to generate questions for this set.
            </p>
          </div>
        )}

        {!loading && documents.length > 0 && (
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {documents.map((doc) => {
              const fileName = doc.filename || doc.name || "Study Document";
              const extTag = getFileExtension(fileName);
              return (
                <div
                  key={doc.document_id || doc.id}
                  className="p-3.5 border border-gray-200/80 rounded-xl bg-white hover:border-[#4E1F6E] hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#98E8DE]/40 via-[#98E8DE]/20 to-[#4E1F6E]/10 border border-[#98E8DE]/60 flex items-center justify-center text-[#4E1F6E] group-hover:scale-110 transition-transform shrink-0 shadow-2xs">
                      {getFileIcon(fileName)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-bold text-[#3E3E75] group-hover:text-[#4E1F6E] transition-colors">
                        {fileName}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5 font-medium">
                        {doc.created_at
                          ? new Date(doc.created_at).toLocaleDateString()
                          : "Uploaded material"}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-[10px] font-bold text-[#4E1F6E] bg-[#4E1F6E]/10 px-2.5 py-1 rounded-md ml-2 shrink-0 border border-[#4E1F6E]/20 shadow-2xs">
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
