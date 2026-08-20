import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { fetchResults } from "../services/api";
import {
  CheckCircle,
  TrendingUp,
  Award,
  Clock,
  Target,
  FileQuestion,
  BookOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";

// Format section labels nicely for the UI
const formatSectionName = (name) => {
  const map = {
    mcq: "Multiple Choice Questions (MCQ)",
    application: "Application & Scenario Problems",
    long: "Long Answer & Conceptual",
    short: "Short Answer & Definitions",
  };
  return map[name?.toLowerCase()] || name?.toUpperCase() || "General Section";
};

// Format topic labels nicely
const formatTopicName = (name) => {
  return (
    name
      ?.split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || "General Topic"
  );
};

export default function ResultsPage({ attemptId: propAttemptId }) {
  const location = useLocation();
  const attemptId = propAttemptId || location.state?.attemptId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadResults() {
      try {
        setLoading(true);
        setError(null);

        const json = await fetchResults(attemptId);
        setData(json);
      } catch (err) {
        console.warn("Backend API fetch notice:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, [attemptId]);

  // Loading State
  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-[#4E1F6E]" size={36} />
        <p className="text-sm font-medium text-[#3E3E75]">
          Fetching evaluation results from server...
        </p>
      </div>
    );
  }

  // Error State - Do NOT display fake/mock results
  if (error) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl bg-white p-8 shadow-sm">
        <AlertCircle className="text-red-500" size={36} />
        <p className="text-base font-semibold text-[#3E3E75]">
          Failed to load evaluation results
        </p>
        <p className="text-xs text-gray-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl bg-white p-8 shadow-sm">
        <AlertCircle className="text-amber-500" size={36} />
        <p className="text-base font-semibold text-[#3E3E75]">
          No results data found for this attempt.
        </p>
      </div>
    );
  }

  const cumulative = data.cumulative || {
    total_marks_obtained: 0,
    total_maximum_marks: 0,
    overall_percentage: 0,
    overall_remark: "N/A",
    strongest_section: null,
    weakest_section: null,
  };
  const sections = data.sections || [];
  const topics = data.topics || [];

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#3E3E75]">Performance & Results</h1>
          <p className="mt-2 text-sm text-gray-500">
            Attempt ID: <span className="font-mono text-xs font-semibold text-[#4E1F6E]">{data.attempt_id}</span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-[#3E3E75] shadow-sm">
          Status: {data.status ? data.status.toUpperCase() : "COMPLETED"}
        </div>
      </div>

      {/* Top Row: Overall Score & AI Study Insights */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md lg:col-span-2">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#3E3E75]">Evaluation Summary</h2>
              <p className="mt-1 text-sm text-gray-500">AI evaluation score based on submitted answers.</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#98E8DE]/40">
              <Award size={20} className="text-[#4E1F6E]" />
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-[8px] border-[#45A9A9]">
              <span className="text-3xl font-bold text-[#4E1F6E]">
                {Math.round(cumulative.overall_percentage)}
                <span className="text-lg">%</span>
              </span>
            </div>

            <div className="flex-1 space-y-3">
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-[#45A9A9]" />
                    <span className="text-sm font-semibold text-[#3E3E75]">
                      {cumulative.total_marks_obtained} / {cumulative.total_maximum_marks} marks scored
                    </span>
                  </div>
                  <span className="rounded-full bg-[#98E8DE] px-3 py-1 text-xs font-medium text-[#3E3E75]">
                    {cumulative.overall_remark}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-[#3E3E75]">
                  <Clock size={13} className="text-gray-500" /> Evaluation completed
                </span>
                <span className="flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-[#4E1F6E]">
                  <Target size={13} /> Score: {cumulative.overall_percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="mb-5 flex items-center gap-2">
            <TrendingUp size={18} className="text-[#4E1F6E]" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#4E1F6E]">
              AI Study Insights
            </h2>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-[#45A9A9] pl-3">
              <span className="text-sm font-semibold text-[#3E3E75]">Strongest Section</span>
              <p className="text-xs text-gray-500">
                High accuracy achieved in <strong className="text-[#4E1F6E]">{formatSectionName(cumulative.strongest_section)}</strong>.
              </p>
            </div>
            <div className="border-l-4 border-[#4E1F6E] pl-3">
              <span className="text-sm font-semibold text-[#3E3E75]">Suggested Revision</span>
              <p className="text-xs text-gray-500">
                Focus on reviewing concepts in <strong className="text-[#4E1F6E]">{formatSectionName(cumulative.weakest_section)}</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row: Section Breakdown & Topic Mastery */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Sections */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#3E3E75]">Section-Wise Breakdown</h2>
              <p className="mt-1 text-sm text-gray-500">Performance across question formats.</p>
            </div>
            <FileQuestion size={20} className="text-[#4E1F6E]" />
          </div>

          <div className="space-y-4">
            {sections.map((sec, idx) => (
              <div
                key={idx}
                className="group rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all duration-200 hover:border-[#98E8DE] hover:bg-white hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#3E3E75]">{formatSectionName(sec.section_name)}</span>
                  <span className="rounded-full bg-[#98E8DE] px-3 py-0.5 text-xs font-semibold text-[#3E3E75]">
                    {Math.round(sec.percentage)}%
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>Remark: <strong className="text-[#4E1F6E]">{sec.remark}</strong></span>
                  <span className="font-medium text-gray-400">{sec.marks_obtained} / {sec.maximum_marks} marks</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Topic Mastery */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#3E3E75]">Topic Mastery</h2>
              <p className="mt-1 text-sm text-gray-500">Mastery breakdown for this attempt.</p>
            </div>
            <BookOpen size={20} className="text-[#4E1F6E]" />
          </div>

          <div className="space-y-6">
            {topics.map((item, idx) => (
              <div key={idx}>
                <div className="mb-2 flex justify-between">
                  <span className="text-sm font-medium text-[#3E3E75]">{formatTopicName(item.topic_name)}</span>
                  <span className="text-sm font-bold text-[#4E1F6E]">{Math.round(item.percentage)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${idx % 2 === 0 ? "bg-[#45A9A9]" : "bg-[#4E1F6E]"}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <div className="mt-1 text-right text-[11px] text-gray-400">
                  {item.marks_obtained} / {item.maximum_marks} marks ({item.remark})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}