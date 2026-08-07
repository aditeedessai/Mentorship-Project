import { BrowserRouter, Routes, Route } from "react-router-dom";

import UploadPage from "./pages/UploadPage";
import QuizPage from "./pages/QuizPage";
import QuestionAnswerPage from "./pages/QuestionAnswerPage";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/answer" element={<QuestionAnswerPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;