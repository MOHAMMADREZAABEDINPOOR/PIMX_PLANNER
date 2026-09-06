import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, BellRing, Calendar as CalendarIcon, CheckCircle2, Clock3, NotebookPen, Save, Sparkles, Trash2, X } from 'lucide-react';
import { DiaryEntry, ReminderEvent } from '../types';
import { getPersianMonthDays, storage, toISODate, toPersianDate } from '../utils';

const toPersianDigits = (value: number | string) =>
  value
    .toString()
    .replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d, 10)]);

const toEnglishDigits = (value: number | string) =>
  value
    .toString()
    .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660));

const safeDateFromString = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatPersianDateSafe = (value: string) => {
  const d = safeDateFromString(value);
  return d ? toPersianDate(d) : '';
};

const isNonEmpty = (entry?: DiaryEntry) => !!entry?.text && entry.text.trim().length > 0;

export const DiarySection: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toISODate(today), [today]);
  const [viewDate, setViewDate] = useState<Date>(today);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [entries, setEntries] = useState<Record<string, DiaryEntry>>({});
  const [remindersByDate, setRemindersByDate] = useState<Record<string, ReminderEvent[]>>({});
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'saved' | 'cleared'>('idle');
  const [noteModal, setNoteModal] = useState<{ open: boolean; entry: DiaryEntry | null }>({ open: false, entry: null });

  const selectedIso = useMemo(() => toISODate(selectedDate), [selectedDate]);
  const calendarData = useMemo(() => getPersianMonthDays(viewDate), [viewDate]);

  const daysWithEntries = useMemo(() => {
    const days = new Set<string>();
    Object.values(entries || {}).forEach((entry) => {
      if (
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as DiaryEntry).date === 'string' &&
        isNonEmpty(entry as DiaryEntry)
      ) {
        days.add((entry as DiaryEntry).date);
      }
    });
    return days;
  }, [entries]);

  const persistEntries = (nextEntries: Record<string, DiaryEntry>) => {
    const keys = Object.keys(nextEntries || {});
    if (keys.length === 0) {
      storage.remove(storage.keys.DIARY_ENTRIES);
    } else {
      storage.set(storage.keys.DIARY_ENTRIES, nextEntries);
    }
  };

  useEffect(() => {
    const stored = storage.get<Record<string, DiaryEntry>>(storage.keys.DIARY_ENTRIES, {});
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      setEntries(stored);
    }

    const reminderList = storage.get<ReminderEvent[]>(storage.keys.REMINDERS, []);
    if (Array.isArray(reminderList)) {
      const byDate: Record<string, ReminderEvent[]> = {};
      reminderList.forEach(rem => {
        const iso = toISODate(new Date(rem.startAt));
        if (!byDate[iso]) byDate[iso] = [];
        byDate[iso].push(rem);
      });
      Object.values(byDate).forEach(list =>
        list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      );
      setRemindersByDate(byDate);
    }
  }, []);

  useEffect(() => {
    const entry = entries[selectedIso];
    setText(entry?.text ?? '');
  }, [entries, selectedIso]);

  useEffect(() => {
    setStatus('idle');
  }, [selectedIso]);

  useEffect(() => {
    if (status === 'saved' || status === 'cleared') {
      const timer = setTimeout(() => setStatus('idle'), 1800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [status]);

  const changeMonth = (delta: number) => {
    const next = new Date(viewDate);
    next.setMonth(next.getMonth() + delta);
    setViewDate(next);
  };

  const handleDayPick = (date: Date) => {
    setSelectedDate(date);
    setViewDate(date);
  };

  const handleSave = () => {
    const iso = selectedIso;
    const cleaned = text.trim();
    const nextEntries = { ...entries };

    if (cleaned.length === 0) {
      if (nextEntries[iso]) {
        delete nextEntries[iso];
      }
      setEntries(nextEntries);
      persistEntries(nextEntries);
      setStatus('cleared');
      return;
    }

    const nextEntry: DiaryEntry = {
      date: iso,
      text,
      updatedAt: new Date().toISOString()
    };

    nextEntries[iso] = nextEntry;
    setEntries(nextEntries);
    persistEntries(nextEntries);
    setStatus('saved');
  };

  const handleClear = () => {
    const iso = selectedIso;
    const nextEntries = { ...entries };
    if (nextEntries[iso]) {
      delete nextEntries[iso];
    }
    setEntries(nextEntries);
    persistEntries(nextEntries);
    setText('');
    setStatus('cleared');
  };

  const monthLabel = useMemo(
    () => toEnglishDigits(new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', year: 'numeric' }).format(viewDate)),
    [viewDate]
  );

  const selectedLabel = useMemo(() => formatPersianDateSafe(`${selectedIso}T12:00:00`) || selectedIso, [selectedIso]);
  const selectedEntry = entries[selectedIso];
  const charCount = text.length;
  const wordCount = text.trim().length > 0 ? text.trim().split(/\s+/).length : 0;
  const selectedText = selectedEntry?.text?.trim() || '';
  const shouldShowDetails = selectedText.length > 180;

  const recentEntries = useMemo(() => {
    const list = Object.values(entries as Record<string, DiaryEntry>).filter(isNonEmpty);
    return list
      .sort((a, b) => (b.updatedAt || b.date).localeCompare(a.updatedAt || a.date))
      .slice(0, 4);
  }, [entries]);

  const remindersDays = useMemo(() => new Set(Object.keys(remindersByDate || {})), [remindersByDate]);

  const currentMonthNoteCount = useMemo(
    () => calendarData.days.filter(day => day.isCurrentMonth && daysWithEntries.has(toISODate(day.date))).length,
    [calendarData, daysWithEntries]
  );

  const todayLabel = useMemo(() => formatPersianDateSafe(`${todayIso}T12:00:00`) || todayIso, [todayIso]);
  const hasEntry = daysWithEntries.has(selectedIso);
  const openNoteModal = () => {
    if (selectedEntry) {
      setNoteModal({ open: true, entry: selectedEntry });
    }
  };
  const closeNoteModal = () => setNoteModal({ open: false, entry: null });

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 text-cyan-100 shadow-[0_10px_40px_-20px_rgba(34,211,238,0.9)]">
          <NotebookPen className="w-5 h-5" />
          <span className="font-bold text-sm">یادداشت‌های روزانه</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-200 text-sm">
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <span>یادداشت‌های ثبت‌شده این ماه: {toPersianDigits(currentMonthNoteCount)}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-200 text-sm">
          <CalendarIcon className="w-4 h-4 text-emerald-300" />
          <span>امروز: {todayLabel}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-5 items-stretch">
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 shadow-[0_20px_70px_-30px_rgba(0,0,0,0.7)] min-h-[713px] max-h-[713px] flex flex-col lg:order-1 overflow-hidden h-full">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(168,85,247,0.1),transparent_35%)] pointer-events-none"></div>
          <div className="relative flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <NotebookPen className="w-5 h-5 text-cyan-300" />
                <h3 className="text-lg font-black">یادداشت‌های من</h3>
              </div>
              <div className="text-xs text-slate-300">
                {hasEntry ? 'برای این روز یادداشت داری' : 'برای این روز هنوز چیزی ثبت نکرده‌ای'}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-xl shadow-inner flex-1 flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between text-sm text-slate-200">
                <span className="font-bold">{toEnglishDigits(selectedLabel)}</span>
                <span className="flex items-center gap-2 text-cyan-200">
                  <CalendarIcon className="w-4 h-4" />
                  روز {toEnglishDigits(selectedDate.getDate())}
                </span>
              </div>
              {selectedText ? (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>آخرین ویرایش: {formatPersianDateSafe(`${selectedEntry?.updatedAt || selectedIso}T12:00:00`).split(' ').slice(0, 3).join(' ')}</span>
                    {shouldShowDetails && (
                      <button
                        onClick={openNoteModal}
                        className="px-3 py-1 rounded-lg border border-cyan-400/60 text-cyan-100 hover:text-white hover:border-cyan-300/80 transition"
                      >
                        نمایش کامل
                      </button>
                    )}
                  </div>
                  <div className="relative flex-1 w-full overflow-hidden rounded-xl border border-white/5 bg-slate-950/40">
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/0 via-white/0 to-slate-950/60"></div>
                    <div className="relative max-h-[500px] overflow-y-auto custom-scrollbar pr-2 text-sm leading-relaxed text-slate-100 whitespace-pre-wrap break-words">
                      {selectedText}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 text-center">
                  <div className="w-16 h-16 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                    <NotebookPen className="w-8 h-8 text-cyan-300" />
                  </div>
                  <p className="text-sm">برای این روز هنوز یادداشتی ننوشته‌ای.</p>
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 shadow-[0_20px_55px_-35px_rgba(0,0,0,0.8)] min-h-[670px] flex flex-col lg:order-2 h-full">
          <div className="absolute inset-0 pointer-events-none opacity-50">
            <div className="absolute -left-16 top-8 w-44 h-44 bg-cyan-500/12 rounded-full blur-[110px]"></div>
            <div className="absolute right-0 -bottom-10 w-56 h-56 bg-purple-500/12 rounded-full blur-[120px]"></div>
          </div>

          <div className="relative flex items-center justify-between mb-4 gap-3">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/60 hover:bg-cyan-500/10 transition"
              aria-label="prev-month"
            >
              <ArrowRight className="w-4 h-4 text-slate-200" />
            </button>

            <div className="flex items-center gap-2 text-slate-100 flex-1 justify-center">
              <CalendarIcon className="w-5 h-5 text-cyan-300" />
              <div className="text-center">
                <p className="text-xs text-cyan-200 font-mono">تقویم شخصی</p>
                <h4 className="text-lg font-black">{monthLabel}</h4>
              </div>
            </div>

            <button
              onClick={() => changeMonth(1)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/60 hover:bg-cyan-500/10 transition"
              aria-label="next-month"
            >
              <ArrowLeft className="w-4 h-4 text-slate-200" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-[10px] sm:text-[11px] text-cyan-200/80 font-bold mb-3">
            {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(day => (
              <div key={day} className="py-1 rounded-xl bg-white/5 border border-white/5">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 flex-1">
            {calendarData.days.map(({ date, dayNum, isCurrentMonth }) => {
              const iso = toISODate(date);
              const isSelected = iso === selectedIso;
              const isToday = iso === todayIso;
              const hasNote = daysWithEntries.has(iso);
              const notePreviewRaw = entries[iso]?.text?.trim() || '';
              const notePreview = notePreviewRaw.split('\n')[0];
              const noteLabel = notePreview ? notePreview.slice(0, 18) : 'یادداشت';
              return (
                <button
                  key={`${iso}-${isCurrentMonth}`}
                  onClick={() => handleDayPick(date)}
                  className={`relative aspect-[4/5] sm:aspect-[5/6] rounded-[18px] border transition-all overflow-hidden
                    ${isSelected ? 'border-emerald-400/60 shadow-[0_0_30px_-14px_rgba(16,185,129,0.8)] scale-[1.03]' : 'border-white/5 bg-slate-900/40 hover:border-emerald-300/30 hover:bg-cyan-500/5 hover:scale-[1.02]'}
                    ${!isCurrentMonth ? 'opacity-45' : ''}
                  `}
                  style={{
                    background: 'linear-gradient(145deg, rgba(15,23,42,0.82) 0%, rgba(15,23,42,0.62) 50%, rgba(15,23,42,0.9) 100%)'
                  }}
                >
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,0.12),transparent_35%)]"></div>
                  {hasNote && (
                    <div className="absolute inset-0 rounded-[18px] border border-emerald-400/35 shadow-[0_0_22px_rgba(16,185,129,0.35)] pointer-events-none"></div>
                  )}
                  <div className="absolute top-1.5 right-1.5 left-1.5 flex items-center justify-end gap-1">
                    {isToday && (
                      <span className="px-1.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-100 text-[10px] font-bold leading-none">
                        امروز
                      </span>
                    )}
                    {hasNote && (
                      <BellRing className="w-4 h-4 text-amber-200 drop-shadow-[0_0_10px_rgba(251,191,36,0.25)]" />
                    )}
                  </div>
                  {isSelected && (
                    <div className="absolute inset-1 rounded-[14px] border border-cyan-400/50 pointer-events-none"></div>
                  )}
                  <div className="relative z-10 h-full flex flex-col items-center justify-center gap-1">
                    <span className="text-[10px] text-slate-400 -mt-1">روز</span>
                    <span className="text-xl font-black text-white">{toEnglishDigits(dayNum)}</span>
                  </div>
                  {hasNote && (
                    <div className="absolute inset-x-1 bottom-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-[10px] text-emerald-200 line-clamp-1 text-center">
                      {noteLabel}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 shadow-[0_20px_80px_-30px_rgba(0,0,0,0.7)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(168,85,247,0.1),transparent_35%)] pointer-events-none"></div>
        <div className="relative space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-cyan-200 font-mono">
                <Sparkles className="w-4 h-4" />
                <span>مرور سریع یادداشت</span>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white mt-1">{selectedLabel}</h3>
              <p className="text-slate-400 text-sm mt-1">
                در این بخش می‌توانی نوشته‌های روزانه را اضافه، مرور و ویرایش کنی. برای هر روز نکات مهم، هدف‌ها یا هر چیزی که ذهنت را مشغول کرده ثبت کن تا مسیر رشد شخصی‌ات واضح بماند.
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-200">
              <Clock3 className="w-4 h-4 text-cyan-300" />
              {isNonEmpty(selectedEntry) ? (
                <span>
                  آخرین ویرایش:{' '}
                  {formatPersianDateSafe(`${selectedEntry.updatedAt}`).split(' ').slice(0, 3).join(' ')}
                </span>
              ) : (
                <span>هنوز چیزی برای این روز ننوشته‌ای</span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-inner">
            <textarea
              className="w-full min-h-[320px] md:min-h-[360px] resize-y rounded-2xl bg-transparent p-4 text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-400/60"
              placeholder="یادداشتت را بنویس... هر چه در ذهن داری را ثبت کن."
              value={text}
              dir="auto"
              onChange={e => setText(e.target.value)}
            ></textarea>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 px-4 py-3 text-sm text-slate-300">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-1 rounded-full bg-white/5 text-xs text-slate-200">
                  {toPersianDigits(wordCount)} کلمه
                </span>
                <span className="px-2 py-1 rounded-full bg-white/5 text-xs text-slate-200">
                  {toPersianDigits(charCount)} کاراکتر
                </span>
                {hasEntry && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-200 text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    یادداشت ثبت شد
                  </span>
                )}
                {status === 'cleared' && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-200 text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    حذف شد
                  </span>
                )}
                {status === 'saved' && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-200 text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    ذخیره شد
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClear}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:text-red-200 hover:border-red-400/50 hover:bg-red-500/10 transition"
                  title="حذف یادداشت این روز"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">پاک کردن</span>
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-l from-cyan-500 to-blue-500 text-white font-bold shadow-[0_10px_30px_-12px_rgba(14,165,233,0.7)] hover:from-cyan-400 hover:to-blue-500 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>ذخیره یادداشت</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {noteModal.open && noteModal.entry &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur">
            <div className="relative w-full max-w-4xl max-h-[80vh] rounded-3xl border border-cyan-400/40 bg-slate-950/90 shadow-[0_24px_70px_-35px_rgba(34,211,238,0.6)] overflow-hidden">
              <div className="absolute inset-0 opacity-60 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900"></div>
              <div className="relative flex flex-col max-h-[80vh]">
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 pt-6 pb-4 text-white border-b border-white/5 bg-slate-950/95 backdrop-blur">
                  <div>
                    <p className="text-xs text-cyan-200/80">نمایش یادداشت {toEnglishDigits(selectedLabel)}</p>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <NotebookPen className="w-5 h-5 text-emerald-300" />
                      یادداشت روزانه
                    </h3>
                  </div>
                  <button
                    onClick={closeNoteModal}
                    className="p-2 rounded-xl border border-white/10 bg-slate-800 text-slate-200 hover:text-white hover:border-cyan-300/60 transition"
                    aria-label="بستن نمایش یادداشت"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="px-6 pb-6 pt-2 overflow-y-auto custom-scrollbar">
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">{noteModal.entry.text}</p>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

