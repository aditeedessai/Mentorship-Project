import React from "react";
import { useTheme } from "../context/ThemeContext";

import jojo from "../assets/jojo.png";
import jojoDark from "../assets/jojo-dark.jpg";

/* =========================================================
   GITHUB ICON
========================================================= */

const GithubIcon = ({ size = 15 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

/* =========================================================
   LINKEDIN ICON
========================================================= */

const LinkedinIcon = ({ size = 15 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

/* =========================================================
   JOT FOOTER
========================================================= */

export default function JotFooter() {
  const { isDarkMode } = useTheme();

  /* Light mode → jojo.png
     Dark mode  → jojo-dark.jpg
  */
  const currentJojo = isDarkMode ? jojoDark : jojo;

  return (
    <footer
      className={`mt-10 border-t ${
        isDarkMode
          ? "border-white/10 bg-[#08070C]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">

          {/* =================================================
              LOGO + JOJO
          ================================================= */}

          <div className="flex items-center gap-3">

            {/* Jojo instead of J */}
            <div
              className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl ${
                isDarkMode
                  ? "bg-purple-500/10"
                  : "bg-purple-100"
              }`}
            >
              <img
                src={currentJojo}
                alt="Jojo"
                className="h-10 w-10 object-contain"
              />
            </div>

            {/* JOT text */}
            <div>
              <div
                className={`font-black ${
                  isDarkMode
                    ? "text-white"
                    : "text-[#231B33]"
                }`}
              >
                JOT
              </div>

              <div
                className={`text-[9px] font-bold ${
                  isDarkMode
                    ? "text-slate-400"
                    : "text-slate-600"
                }`}
              >
                Jot it. Organise it. Top it.
              </div>
            </div>

          </div>

          {/* =================================================
              COPYRIGHT
          ================================================= */}

          <div
            className={`text-xs ${
              isDarkMode
                ? "text-slate-400"
                : "text-slate-600"
            }`}
          >
            © {new Date().getFullYear()} JOT Research Group.
          </div>

          {/* =================================================
              SOCIAL ICONS
          ================================================= */}

          <div className="flex gap-2">

            {/* GitHub */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className={`rounded-xl border p-2 transition ${
                isDarkMode
                  ? "border-white/10 text-slate-300 hover:bg-white/5"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <GithubIcon size={14} />
            </a>

            {/* LinkedIn */}
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className={`rounded-xl border p-2 transition ${
                isDarkMode
                  ? "border-white/10 text-slate-300 hover:bg-white/5"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <LinkedinIcon size={14} />
            </a>

          </div>

        </div>
      </div>
    </footer>
  );
}