import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { fetchStudiedDays } from "../../services/api";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const getStartWeekday = (year, month) => {
  const jsDay = new Date(year, month, 1).getDay();
  return (jsDay + 6) % 7;
};

function ActivityCalendarCard() {
  const { isDarkMode } = useTheme();
  const today = useMemo(() => new Date(), []);

  const [viewedYear, setViewedYear] = useState(today.getFullYear());
  const [viewedMonth, setViewedMonth] = useState(today.getMonth());

  const [studiedDays, setStudiedDays] = useState([]);
  const [isLoadingDays, setIsLoadingDays] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStudiedDays() {
      setIsLoadingDays(true);
      try {
        const days = await fetchStudiedDays(viewedYear, viewedMonth + 1);
        if (!cancelled) setStudiedDays(days);
      } catch {
        if (!cancelled) setStudiedDays([]);
      } finally {
        if (!cancelled) setIsLoadingDays(false);
      }
    }

    loadStudiedDays();

    return () => {
      cancelled = true;
    };
  }, [viewedYear, viewedMonth]);

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
    <div
      className={`flex flex-1 flex-col rounded-3xl border p-4 sm:p-6 backdrop-blur-2xl transition-all duration-500 ${
        isDarkMode
          ? "border-white/8 bg-[#14101D]/75 text-[#F3F0F8] shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          : "border-black/5 bg-[#F8F8FC]/95 text-[#231B33] shadow-[0_4px_25px_rgba(0,0,0,0.03)]"
      }`}
    >
      <h2 className="mb-4 text-xl font-black tracking-tight">Activity</h2>

      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={goToPrevMonth}
          className={`rounded-xl p-1.5 transition ${
            isDarkMode
              ? "text-[#A78BFA] hover:bg-white/10"
              : "text-[#8064C7] hover:bg-[#8064C7]/10"
          }`}
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>

        <span className="text-xs sm:text-sm font-bold">
          {MONTH_NAMES[viewedMonth]} {viewedYear}
        </span>

        <button
          type="button"
          onClick={goToNextMonth}
          className={`rounded-xl p-1.5 transition ${
            isDarkMode
              ? "text-[#A78BFA] hover:bg-white/10"
              : "text-[#8064C7] hover:bg-[#8064C7]/10"
          }`}
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="relative">
        {isLoadingDays && (
          <div
            className={`absolute inset-0 z-10 flex items-center justify-center rounded-2xl backdrop-blur-sm ${
              isDarkMode ? "bg-[#17131F]/60" : "bg-white/60"
            }`}
          >
            <Loader2 size={18} className="animate-spin text-[#8064C7]" />
          </div>
        )}

        <div className="grid grid-cols-7 gap-y-1.5 text-center">
          {WEEKDAY_LABELS.map((label) => (
            <span
              key={label}
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isDarkMode ? "text-white/40" : "text-gray-400"
              }`}
            >
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
                  className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                    isToday
                      ? "bg-[#8064C7] text-white shadow-md"
                      : isStudied
                      ? "bg-emerald-500 text-white shadow-sm"
                      : isDarkMode
                      ? "text-white/70 hover:bg-white/10"
                      : "text-[#292530] hover:bg-black/5"
                  }`}
                >
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </div>


      <div className="mt-5 flex items-center justify-center gap-5 text-xs font-semibold">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Studied
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#8064C7]" />
          Today
        </span>
      </div>
    </div>
  );
}

export default ActivityCalendarCard;

