import { useState } from "react";
import Navbar from "../components/Navbar";
import PrimaryButton from "../components/PrimaryButton";

function QuestionAnswerPage() {
  const [answer, setAnswer] = useState("");

  const question =
    "Explain the difference between Machine Learning and Deep Learning.";

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gray-100 flex justify-center items-center px-6">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl">

          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            Answer Evaluation
          </h2>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">
              Question
            </h3>

            <p className="bg-gray-100 p-4 rounded-lg">
              {question}
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-lg font-semibold mb-3">
              Your Answer
            </label>

            <textarea
              rows="10"
              placeholder="Write your answer here..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full border rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <PrimaryButton text="Submit Answer" />

        </div>
      </main>
    </>
  );
}

export default QuestionAnswerPage;