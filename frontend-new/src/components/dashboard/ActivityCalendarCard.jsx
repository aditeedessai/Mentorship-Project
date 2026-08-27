import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// Monday-first weekday index (0 = Mon ... 6 = Sun) for the 1st of the month.
const getStartWeekday = (year, month) => {
  const jsDay = new Date(year, month, 1).getDay(); // 0 = Sun ... 6 = Sat
  return (jsDay + 6) % 7;
};

function ActivityCalendarCard() {
  const today = useMemo(() => new Date(), []);

  const [viewedYear, setViewedYear] = useState(today.getFullYear());
  const [viewedMonth, setViewedMonth] = useState(today.getMonth());

  // TODO: replace this placeholder with the real studied-dates query —
  // distinct dates that have a completed or in_progress quiz_attempts row.
  const studiedDays = useMemo(() => {
    const isCurrentMonth =
      viewedYear === today.getFullYear() && viewedMonth === today.getMonth();
    if (!isCurrentMonth) return [];

    return [today.getDate() - 2, today.getDate() - 5, today.getDate() - 9]
      .filter((day) => day >= 1);
  }, [viewedYear, viewedMonth, today]);

  const goToPrevMonth = () => {
    if (viewedMonth === 0) {
      setViewedMonth(11);
      setViewedYear((y) => y - 1);
    } else {
      setViewedMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewedMonth === 11) {
      setViewedMonth(0);
      setViewedYear((y) => y + 1);
    } else {
      setViewedMonth((m) => m + 1);
    }
  };

  const daysInMonth = getDaysInMonth(viewedYear, viewedMonth);
  const startWeekday = getStartWeekday(viewedYear, viewedMonth);
  const isViewingCurrentMonth =
    viewedYear === today.getFullYear() && viewedMonth === today.getMonth();

  const cells = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="flex flex-1 flex-col rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-[#3E3E75]">Activity</h2>

      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="rounded-lg p-1.5 text-[#4E1F6E] transition hover:bg-[#98E8DE]/30"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>

        <span className="text-sm font-semibold text-[#3E3E75]">
          {MONTH_NAMES[viewedMonth]} {viewedYear}
        </span>

        <button
          type="button"
          onClick={goToNextMonth}
          className="rounded-lg p-1.5 text-[#4E1F6E] transition hover:bg-[#98E8DE]/30"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="text-[10px] font-semibold text-gray-400">
            {label}
          </span>
        ))}

        {cells.map((day, idx) => {
          if (day === null) return <span key={`blank-${idx}`} />;

          const isToday = isViewingCurrentMonth && day === today.getDate();
          const isStudied = studiedDays.includes(day);

          return (
            <div key={day} className="flex items-center justify-center py-0.5">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  isToday
                    ? "bg-[#4E1F6E] text-white"
                    : isStudied
                    ? "bg-[#1D9E75] text-white"
                    : "text-[#3E3E75]"
                }`}
              >
                {day}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#1D9E75]" />
          Studied
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#4E1F6E]" />
          Today
        </span>
      </div>
    </div>
  );
}

export default ActivityCalendarCard;
