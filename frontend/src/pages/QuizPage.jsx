import Navbar from "../components/Navbar";
import PrimaryButton from "../components/PrimaryButton";

function QuizPage() {
  const question = {
    id: 1,
    question: "What does AI stand for?",
    options: [
      "Artificial Intelligence",
      "Automated Internet",
      "Artificial Internet",
      "Automatic Intelligence",
    ],
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gray-100 flex justify-center items-center px-6">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl">

          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            AI Quiz
          </h2>

          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">
              Question {question.id}
            </h3>

            <p className="text-gray-700 mb-6">
              {question.question}
            </p>

            <div className="space-y-4">
              {question.options.map((option, index) => (
                <label
                  key={index}
                  className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-100"
                >
                  <input
                    type="radio"
                    name="question1"
                    value={option}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>

          <PrimaryButton text="Submit Answer" />
        </div>
      </main>
    </>
  );
}

export default QuizPage;