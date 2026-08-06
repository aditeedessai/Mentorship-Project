import Navbar from "../components/Navbar";
import FileUpload from "../components/FileUpload";

function UploadPage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gray-100 flex justify-center items-center px-6">
        <div className="bg-white rounded-xl shadow-lg p-10 w-full max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Upload Your Study Material
          </h2>

          <p className="text-gray-600 mb-8">
            Upload your PDF or PowerPoint presentation to generate
            personalized study material.
          </p>

          <FileUpload />
        </div>
      </main>
    </>
  );
}

export default UploadPage;