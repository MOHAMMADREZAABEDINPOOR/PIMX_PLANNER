import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Calendar, Check, RotateCcw, Sparkles, X } from 'lucide-react';
import { getPersianMonthDays, toISODate, toPersianDate } from '../utils';

interface DataResetModalProps {
  open: boolean;
  sectionLabel: string;
  onClose: () => void;
  onConfirm: (payload: { dates: string[]; clearAll: boolean }) => void;
}

const buildRange = (startIso: string, endIso: string) => {
  const ordered = startIso <= endIso ? [startIso, endIso] : [endIso, startIso];
  const [start, end] = ordered;
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00`);
  const target = new Date(`${end}T00:00:00`);

  while (cursor <= target) {
    dates.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};

export const DataResetModal: React.FC<DataResetModalProps> = ({ open, sectionLabel, onClose, onConfirm }) => {
  const todayIso = useMemo(() => toISODate(new Date()), []);
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [mode, setMode] = useState<'range' | 'multi'>('range');
  const [selected, setSelected] = useState<Set<string>>(new Set([todayIso]));
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setViewDate(new Date());
      setSelected(new Set([todayIso]));
      setRangeAnchor(null);
      setError(null);
      setMode('range');
    }
  }, [open, todayIso]);

  const calendar = useMemo(() => getPersianMonthDays(viewDate), [viewDate]);

  if (!open) return null;

  const toggleDay = (date: Date) => {
    const iso = toISODate(date);
    setError(null);

    if (mode === 'range') {
      if (!rangeAnchor) {
        setRangeAnchor(iso);
        setSelected(new Set([iso]));
        return;
      }
      const next = new Set(buildRange(rangeAnchor, iso));
      setSelected(next);
      setRangeAnchor(null);
      return;
    }

    const next = new Set(selected);
    if (next.has(iso)) {
      next.delete(iso);
    } else {
      next.add(iso);
    }
    setSelected(next);
  };

  const selectQuickRange = (days: number) => {
    const base = new Date();
    const start = new Date();
    start.setDate(base.getDate() - (days - 1));
    const quickDates = buildRange(toISODate(start), toISODate(base));
    setSelected(new Set(quickDates));
    setRangeAnchor(null);
    setMode('range');
  };

  const handleConfirm = () => {
    if (selected.size === 0) {
      setError('حداقل یک تاریخ را انتخاب کنید.');
      return;
    }
    onConfirm({ dates: Array.from(selected).sort(), clearAll: false });
  };

  const handleClearAll = () => {
    onConfirm({ dates: [], clearAll: true });
  };

  const summaryLabel = () => {
    if (selected.size === 0) return 'هیچ تاریخی انتخاب نشده است';
    if (selected.size === 1) {
      const iso = Array.from(selected)[0];
      const persianDate = toPersianDate(new Date(`${iso}T12:00:00`)).split(' ').slice(0, 3).join(' ');
      return `حذف داده‌های بخش ${sectionLabel} در ${persianDate}`;
    }
    return `حذف داده‌های بخش ${sectionLabel} در ${selected.size} روز انتخاب‌شده`;
  };

  const monthLabel = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    month: 'long',
    year: 'numeric'
  }).format(viewDate);

  const renderCalendar = () => (
    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <button
          className="p-2 rounded-xl hover:bg-white/5 transition"
          onClick={() => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          aria-label="ماه قبل"
        >
          <ArrowRight className="w-5 h-5 text-slate-300" />
        </button>
        <div className="flex items-center gap-2 text-slate-100 font-bold">
          <Calendar className="w-5 h-5 text-cyan-400" />
          <span>{monthLabel}</span>
        </div>
        <button
          className="p-2 rounded-xl hover:bg-white/5 transition"
          onClick={() => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          aria-label="ماه بعد"
        >
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-[11px] text-slate-400 mb-2">
        {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(day => (
          <div key={day} className="py-1 rounded-lg bg-white/5">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {calendar.days.map(({ date, dayNum, isCurrentMonth }) => {
          const iso = toISODate(date);
          const isSelected = selected.has(iso);
          const isToday = iso === todayIso;
          const isAnchor = rangeAnchor === iso;
          return (
            <button
              key={iso + isCurrentMonth}
              onClick={() => toggleDay(date)}
              className={`relative h-12 rounded-2xl border transition-all ${
                isSelected
                  ? 'border-cyan-400/70 bg-cyan-500/15 text-white shadow-[0_10px_40px_-15px_rgba(34,211,238,0.8)]'
                  : 'border-white/5 bg-white/5 hover:border-cyan-500/40 hover:bg-cyan-500/5 text-slate-200'
              } ${!isCurrentMonth ? 'opacity-50' : ''}`}
            >
              <div className="text-sm font-bold">{dayNum}</div>
              {isToday && <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-emerald-400"></div>}
              {isAnchor && <div className="absolute inset-0 rounded-2xl border border-amber-400/60 pointer-events-none"></div>}
            </button>
          );
        })}
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl" onClick={onClose}></div>
      <div className="relative w-full max-w-5xl rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.65)]">
        <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_20%_30%,rgba(34,211,238,0.12),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.1),transparent_35%)] pointer-events-none"></div>
        <div className="relative">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-cyan-300 font-mono text-xs">
                <Sparkles className="w-4 h-4" />
                <span>بازنشانی پایگاه داده</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white mt-2">پاکسازی بخش {sectionLabel}</h2>
              <p className="text-slate-300 mt-1 text-sm">روزهای مدنظر را روی تقویم انتخاب کنید یا بازه‌ای را مشخص کنید. داده‌های این بخش در روزهای انتخاب‌شده حذف می‌شوند.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-cyan-400/60 transition"
              aria-label="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-2">{renderCalendar()}</div>
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-200 font-semibold">حالت انتخاب</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMode('range')}
                      className={`px-3 py-1 rounded-xl text-xs border transition ${
                        mode === 'range'
                          ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-100'
                          : 'border-white/10 text-slate-300 hover:border-cyan-300/40 hover:text-white'
                      }`}
                    >
                      بازه
                    </button>
                    <button
                      onClick={() => setMode('multi')}
                      className={`px-3 py-1 rounded-xl text-xs border transition ${
                        mode === 'multi'
                          ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-100'
                          : 'border-white/10 text-slate-300 hover:border-cyan-300/40 hover:text-white'
                      }`}
                    >
                      چند روز
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelected(new Set([todayIso]));
                      setRangeAnchor(null);
                      setMode('range');
                    }}
                    className="px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-100 text-xs hover:bg-cyan-500/25 transition"
                  >
                    فقط امروز
                  </button>
                  <button
                    onClick={() => selectQuickRange(3)}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-xs hover:border-cyan-400/40 hover:text-white transition"
                  >
                    ۳ روز اخیر
                  </button>
                  <button
                    onClick={() => selectQuickRange(7)}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-xs hover:border-cyan-400/40 hover:text-white transition"
                  >
                    ۷ روز اخیر
                  </button>
                  <button
                    onClick={() => {
                      setSelected(new Set());
                      setRangeAnchor(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-xs hover:border-red-400/60 hover:text-red-100 transition"
                  >
                    پاک کردن انتخاب
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-400/40 flex items-center justify-center">
                    <Check className="w-5 h-5 text-cyan-300" />
                  </div>
                  <div className="text-slate-200 text-sm leading-relaxed">
                    <div className="font-semibold mb-1">خلاصه انتخاب</div>
                    <div className="text-cyan-100">{summaryLabel()}</div>
                    {selected.size > 0 && (
                      <div className="text-[11px] text-slate-400 mt-1">
                        {Array.from(selected)
                          .slice(0, 4)
                          .map(d => `${toPersianDate(new Date(`${d}T12:00:00`)).split(' ').slice(0, 3).join(' ')}`)
                          .join('، ')}
                        {selected.size > 4 && ' ...'}
                      </div>
                    )}
                  </div>
                </div>
                {error && <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</div>}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleConfirm}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-cyan-500 to-blue-500 text-white font-bold py-3 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/35 transition"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span>حذف داده‌های انتخاب‌شده</span>
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/10 text-slate-200 font-semibold py-3 hover:border-red-400/60 hover:text-red-100 transition"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>ریست کامل این بخش</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full text-center text-sm text-slate-400 hover:text-slate-100 transition py-2"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
