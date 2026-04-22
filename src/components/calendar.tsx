'use client';

import { useState, useCallback } from 'react';

export default function CalendarPicker({
  dates,
  selectedDate,
  onSelectDate,
}: {
  dates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  const dateSet = new Set(dates);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  // Convert to Mon=0
  const startOffset = (firstDayOfWeek + 6) % 7;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const isSelected = (day: number) => {
    const d = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return d === selectedDate;
  };

  const hasArticles = (day: number) => {
    const d = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateSet.has(d);
  };

  const isToday = (day: number) => {
    return day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  };

  // Collect all days for the whole month grid, then check if any day has articles
  const allDays: number[] = [];
  for (let i = 1; i <= daysInMonth; i++) allDays.push(i);
  const monthHasArticles = dates.some((d) => {
    const parts = d.split('-');
    return parseInt(parts[0]) === viewYear && parseInt(parts[1]) === viewMonth + 1;
  });

  return (
    <div className="w-full bg-white rounded-2xl border border-zinc-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-800">
            {monthNames[viewMonth]} {viewYear}
          </span>
          {monthHasArticles && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              has records
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={goToday}
            className="text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-2 py-1 rounded-lg"
          >
            Today
          </button>
          <button
            onClick={goToNextMonth}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="text-center text-xs text-zinc-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {allDays.map((day) => {
          const d = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const sel = isSelected(day);
          const art = hasArticles(day);
          const td = isToday(day);
          return (
            <button
              key={day}
              onClick={() => onSelectDate(d)}
              className={`
                relative h-9 rounded-lg text-sm font-medium transition-colors
                ${sel
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : td
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    : 'hover:bg-zinc-100 text-zinc-700'
                }
              `}
            >
              {day}
              {art && !sel && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
