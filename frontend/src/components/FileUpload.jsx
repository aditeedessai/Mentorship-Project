import { useState } from "react";
import PrimaryButton from "./PrimaryButton";
import api from "../api/api";

function FileUpload() {
  const [selectedFile, setSelectedFile] = useState(null);

  function handleFileChange(event) {
    const file = event.target.files[0];
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // Backend integration will be added later.
      // await api.post("/upload", formData);

      alert("Frontend is ready for backend integration!");
    } catch (error) {
      console.error(error);
      alert("Upload failed.");
    }
  }

  return (
    <div className="border-2 border-dashed border-indigo-400 rounded-lg p-8 text-center">
      <input
        type="file"
        accept=".pdf,.ppt,.pptx"
        onChange={handleFileChange}
        className="mb-4"
      />

      {selectedFile && (
        <p className="text-green-600 mb-4">
          Selected File: {selectedFile.name}
        </p>
      )}

      <PrimaryButton
        text="Upload File"
        onClick={handleUpload}
      />
    </div>
  );
}

export default FileUpload;