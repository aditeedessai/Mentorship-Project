import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="bg-indigo-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

        <h1 className="text-2xl font-bold">
          AI Study Engine
        </h1>

        <ul className="flex gap-6 font-medium">

          <li>
            <Link
              to="/"
              className="hover:text-indigo-200 transition"
            >
              Upload
            </Link>
          </li>

          <li>
            <Link
              to="/quiz"
              className="hover:text-indigo-200 transition"
            >
              Quiz
            </Link>
          </li>

          <li>
            <Link
              to="/answer"
              className="hover:text-indigo-200 transition"
            >
              Answer
            </Link>
          </li>

          <li>
            <Link
              to="/dashboard"
              className="hover:text-indigo-200 transition"
            >
              Dashboard
            </Link>
          </li>

        </ul>

      </div>
    </nav>
  );
}

export default Navbar;