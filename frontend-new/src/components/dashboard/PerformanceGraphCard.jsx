import { useEffect, useState, useMemo } from "react";
import { TrendingUp, Loader2, AlertCircle, BookOpen } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { fetchStudySets, fetchProgressHistory } from "../../services/api";

const TYPE_CONFIG = {
  mcq: { label: "MCQ", color: "#10B981", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
  short: { label: "Short", color: "#F59E0B", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" },
  application: { label: "Application", color: "#3B82F6", bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" },
  long: { label: "Long", color: "#EC4899", bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400" },
};

function PerformanceGraphCard({ onNavigate }) {
  const { isDarkMode } = useTheme();

  const [studySets, setStudySets] = useState([]);
  const [selectedStudySetId, setSelectedStudySetId] = useState("");
  const [setsLoading, setSetsLoading] = useState(true);

  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // 1. Fetch study sets on mount
  useEffect(() => {
    let isMounted = true;
    setSetsLoading(true);
    fetchStudySets()
      .then((sets) => {
        if (!isMounted) return;
        setStudySets(sets || []);
        if (sets && sets.length > 0) {
          setSelectedStudySetId(sets[0].study_set_id || sets[0].id);
        }
      })
      .catch(() => {
        if (isMounted) setError("Failed to load study sets.");
      })
      .finally(() => {
        if (isMounted) setSetsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch attempt progress history when selected study set changes
  useEffect(() => {
    if (!selectedStudySetId) {
      setHistoryData(null);
      return;
    }

    let isMounted = true;
    setHistoryLoading(true);
    setError("");

    fetchProgressHistory(selectedStudySetId)
      .then((data) => {
        if (!isMounted) return;
        setHistoryData(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError("Couldn't load performance graph. Please try again.");
      })
      .finally(() => {
        if (isMounted) setHistoryLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedStudySetId]);

  const attempts = historyData?.attempts || [];
  const availableTypes = historyData?.available_question_types || [];

  // Dimensions for SVG rendering
  const width = 460;
  const height = 180;
  const padding = { top: 20, right: 30, bottom: 35, left: 40 };

  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Calculate coordinates for SVG
  const chartSeries = useMemo(() => {
    if (attempts.length === 0 || availableTypes.length === 0) return [];

    return availableTypes.map((qType) => {
      const config = TYPE_CONFIG[qType] || { label: qType, color: "#8064C7" };

      const points = [];
      attempts.forEach((att, idx) => {
        const score = att.by_type?.[qType];
        if (score !== undefined && score !== null) {
          // X-coordinate based on attempt position (0 to attempts.length - 1)
          const xDiv = Math.max(1, attempts.length - 1);
          const x = attempts.length === 1
            ? padding.left + graphWidth / 2
            : padding.left + (idx / xDiv) * graphWidth;

          // Y-coordinate (0% at bottom, 100% at top)
          const y = padding.top + graphHeight - (score / 100) * graphHeight;

          points.push({
            attemptNumber: att.attempt_number,
            score,
            x,
            y,
            qType,
            typeLabel: config.label,
            color: config.color,
          });
        }
      });

      return {
        qType,
        label: config.label,
        color: config.color,
        points,
      };
    });
  }, [attempts, availableTypes, graphWidth, graphHeight, padding.left, padding.top]);

  return (
    <div
      className={`flex flex-col rounded-3xl border p-6 backdrop-blur-2xl transition-all duration-500 ${
        isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
      }`}
    >
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={22} className="text-[#8064C7]" />
          <h2 className="text-xl font-bold tracking-tight">
            Attempt Performance
          </h2>
        </div>

        {/* Study Set Selector */}
        {studySets.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="study-set-select" className="text-xs font-semibold opacity-60 shrink-0">
              Study Set:
            </label>
            <select
              id="study-set-select"
              value={selectedStudySetId}
              onChange={(e) => setSelectedStudySetId(e.target.value)}
              className={`max-w-[200px] truncate rounded-xl border px-3 py-1.5 text-xs font-bold transition outline-none cursor-pointer ${
                isDarkMode
                  ? "border-white/10 bg-[#1F192C] text-white focus:border-[#8064C7]"
                  : "border-gray-200 bg-white text-[#231B33] shadow-xs focus:border-[#8064C7]"
              }`}
            >
              {studySets.map((set) => (
                <option key={set.study_set_id || set.id} value={set.study_set_id || set.id}>
                  {set.name || "Untitled Study Set"}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {setsLoading || historyLoading ? (
        <div className="flex h-56 flex-col items-center justify-center gap-2 text-sm opacity-50">
          <Loader2 size={22} className="animate-spin text-[#8064C7]" />
          Loading progress graph...
        </div>
      ) : error ? (
        <div className="flex h-56 flex-col items-center justify-center gap-2 text-center">
          <div className="flex items-center gap-1.5 text-sm font-medium text-red-400">
            <AlertCircle size={18} />
            {error}
          </div>
        </div>
      ) : studySets.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-3 text-center">
          <p className={`text-sm ${isDarkMode ? "text-white/40" : "text-gray-400"}`}>
            No study sets created yet.
          </p>
          <button
            type="button"
            onClick={() => onNavigate?.("upload")}
            className="flex items-center gap-2 rounded-xl bg-[#8064C7] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#7357B9]"
          >
            <BookOpen size={15} />
            Create Study Set
          </button>
        </div>
      ) : attempts.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm font-bold opacity-80">
            No completed attempts yet.
          </p>
          <p className={`text-xs max-w-xs ${isDarkMode ? "text-white/40" : "text-gray-500"}`}>
            Take your first test for this study set to start tracking your performance.
          </p>
          <button
            type="button"
            onClick={() => onNavigate?.("study-sets")}
            className="mt-1 rounded-xl bg-[#8064C7] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#7357B9]"
          >
            Go to Study Sets
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Series Legend (Only displaying active question types) */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
            {chartSeries.map((series) => (
              <div key={series.qType} className="flex items-center gap-1.5">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: series.color }}
                />
                <span className={isDarkMode ? "text-white/80" : "text-gray-700"}>
                  {series.label}
                </span>
              </div>
            ))}
          </div>

          {/* Graph Render */}
          <div className="relative w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto overflow-visible select-none"
            >
              {/* Y-Axis Gridlines & Labels (0%, 25%, 50%, 75%, 100%) */}
              {[0, 25, 50, 75, 100].map((val) => {
                const y = padding.top + graphHeight - (val / 100) * graphHeight;
                return (
                  <g key={val}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke={isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fontWeight="600"
                      fill={isDarkMode ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)"}
                    >
                      {val}%
                    </text>
                  </g>
                );
              })}

              {/* X-Axis Labels (Attempt 1 to Attempt N) */}
              {attempts.map((att, idx) => {
                const xDiv = Math.max(1, attempts.length - 1);
                const x = attempts.length === 1
                  ? padding.left + graphWidth / 2
                  : padding.left + (idx / xDiv) * graphWidth;

                return (
                  <text
                    key={att.attempt_number}
                    x={x}
                    y={height - 8}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill={isDarkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"}
                  >
                    Attempt {att.attempt_number}
                  </text>
                );
              })}

              {/* Draw Series Paths */}
              {chartSeries.map((series) => {
                if (series.points.length === 0) return null;

                // Path d string
                const d = series.points.reduce((acc, pt, i) => {
                  return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
                }, "");

                return (
                  <g key={series.qType}>
                    {/* Line */}
                    {series.points.length > 1 && (
                      <path
                        d={d}
                        fill="none"
                        stroke={series.color}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-all duration-500"
                      />
                    )}

                    {/* Dots */}
                    {series.points.map((pt, pIdx) => (
                      <circle
                        key={pIdx}
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredPoint?.qType === pt.qType && hoveredPoint?.attemptNumber === pt.attemptNumber ? "6" : "4.5"}
                        fill={series.color}
                        stroke={isDarkMode ? "#14101D" : "#ffffff"}
                        strokeWidth="2"
                        className="cursor-pointer transition-all duration-200 hover:scale-125"
                        onMouseEnter={() => setHoveredPoint(pt)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    ))}
                  </g>
                );
              })}
            </svg>

            {/* Tooltip */}
            {hoveredPoint && (
              <div
                className={`pointer-events-none absolute z-30 transform -translate-x-1/2 -translate-y-full rounded-xl border px-3 py-1.5 text-xs shadow-lg transition-all ${
                  isDarkMode
                    ? "border-white/10 bg-[#1F192C] text-white"
                    : "border-gray-200 bg-white text-[#231B33]"
                }`}
                style={{
                  left: `${(hoveredPoint.x / width) * 100}%`,
                  top: `${(hoveredPoint.y / height) * 100 - 8}%`,
                }}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: hoveredPoint.color }}
                  />
                  <span>{hoveredPoint.typeLabel}</span>
                  <span className="opacity-60">(Attempt {hoveredPoint.attemptNumber})</span>
                </div>
                <div className="mt-0.5 text-sm font-black text-[#8064C7]">
                  {hoveredPoint.score}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PerformanceGraphCard;
