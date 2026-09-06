import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlarmClock,
  AlarmClockCheck,
  BellRing,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Pin,
  PinOff,
  Plus,
  RefreshCcw,
  Sparkles,
  Tag,
  Timer,
  Trash2,
  X
} from 'lucide-react';
import { ReminderEvent, ReminderPriority } from '../types';
import {
  calendarModeStorage,
  formatCalendarMonthYear,
  getCalendarWeekDays,
  getPersianMonthDays,
  storage,
  toISODate,
  toPersianDate
} from '../utils';

type ReminderFormState = {
  title: string;
  date: string;
  time: string;
  description: string;
  priority: ReminderPriority;
  location: string;
  tags: string;
};

const priorityStyles: Record<
  ReminderPriority,
  {
    label: string;
    dot: string;
    pill: string;
  }
> = {
  low: {
    label: 'آرام',
    dot: 'bg-emerald-300',
    pill: 'bg-emerald-500/10 border-emerald-400/30 text-emerald-100'
  },
  normal: {
    label: 'معمولی',
    dot: 'bg-cyan-300',
    pill: 'bg-cyan-500/10 border-cyan-400/30 text-cyan-100'
  },
  high: {
    label: 'فوری',
    dot: 'bg-amber-300',
    pill: 'bg-amber-500/10 border-amber-400/30 text-amber-100'
  }
};

const timeStringFromDate = (d: Date) => {
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

const buildIsoFromParts = (dateStr: string, timeStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  const safeYear = Number.isFinite(year) ? year : new Date().getFullYear();
  const safeMonth = Number.isFinite(month) ? month - 1 : new Date().getMonth();
  const safeDay = Number.isFinite(day) ? day : new Date().getDate();
  const safeHours = Number.isFinite(h) ? h : 0;
  const safeMinutes = Number.isFinite(m) ? m : 0;
  const local = new Date(safeYear, safeMonth, safeDay, safeHours, safeMinutes, 0, 0);
  return local.toISOString();
};

const normalizeReminders = (items: ReminderEvent[]): ReminderEvent[] => {
  const valid = (items || []).filter(item => {
    const d = new Date(item.startAt);
    return item && item.title && !Number.isNaN(d.getTime());
  });
  return valid
    .map(item => ({
      ...item,
      tags: Array.isArray(item.tags) ? item.tags.map(t => String(t)).filter(Boolean) : [],
      priority: item.priority || 'normal',
      title: item.title.trim()
    }))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
};

const countdownParts = (target: Date, now: Date) => {
  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const totalDays = Math.floor(totalHours / 24);
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = totalDays - years * 365 - months * 30;
  return { years, months, days, hours, minutes, seconds, totalDays };
};

const formatTime = (date: Date) =>
  new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(date);

export const ReminderSection: React.FC = () => {
  const [calendarMode, setCalendarMode] = useState(() => calendarModeStorage.get());
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarData, setCalendarData] = useState(() => getPersianMonthDays(new Date()));
  const [reminders, setReminders] = useState<ReminderEvent[]>([]);
  const [detailModal, setDetailModal] = useState<{ open: boolean; reminder: ReminderEvent | null }>({
    open: false,
    reminder: null
  });
  const [formState, setFormState] = useState<ReminderFormState>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return {
      title: '',
      date: toISODate(new Date()),
      time: timeStringFromDate(now),
      description: '',
      priority: 'normal',
      location: '',
      tags: ''
    };
  });
  const [now, setNow] = useState<Date>(new Date());
  const [hydrated, setHydrated] = useState(false);
  const [filterPinned, setFilterPinned] = useState(false);

  useEffect(() => {
    const stored = storage.get<ReminderEvent[]>(storage.keys.REMINDERS, []);
    setReminders(normalizeReminders(Array.isArray(stored) ? stored : []));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        const data = await storage.syncFromServer([storage.keys.REMINDERS]);
        const remote = data?.[storage.keys.REMINDERS];
        if (!cancelled && Array.isArray(remote)) {
          const normalized = normalizeReminders(remote as ReminderEvent[]);
          setReminders(normalized);
          try {
            localStorage.setItem(storage.keys.REMINDERS, JSON.stringify(normalized));
          } catch {}
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setCalendarData(getPersianMonthDays(viewDate));
  }, [viewDate, calendarMode]);

  useEffect(() => {
    const handler = (event: Event) => {
      const mode = (event as CustomEvent).detail;
      if (mode === 'jalali' || mode === 'gregorian') setCalendarMode(mode);
    };
    window.addEventListener('planner-calendar-mode-change', handler);
    return () => window.removeEventListener('planner-calendar-mode-change', handler);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const remindersByDay = useMemo(() => {
    const map: Record<string, ReminderEvent[]> = {};
    reminders.forEach(rem => {
      const iso = toISODate(new Date(rem.startAt));
      if (!map[iso]) map[iso] = [];
      map[iso].push(rem);
    });
    Object.values(map).forEach(list =>
      list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    );
    return map;
  }, [reminders]);

  const selectedIso = toISODate(selectedDate);
  const dayReminders = remindersByDay[selectedIso] || [];

  const upcomingReminders = useMemo(() => {
    const future = reminders.filter(rem => new Date(rem.startAt).getTime() >= now.getTime() - 60000);
    const sorted = future.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    const pinned = sorted.filter(r => r.pinned);
    const rest = sorted.filter(r => !r.pinned);
    return filterPinned ? pinned : [...pinned, ...rest];
  }, [reminders, now, filterPinned]);

  const visibleUpcoming = useMemo(() => {
    const base: (ReminderEvent | null)[] = [...upcomingReminders];
    while (base.length < 9) {
      base.push(null);
    }
    return base;
  }, [upcomingReminders]);

  const earliest = upcomingReminders[0];
  const detailReminder = detailModal.reminder;
  const detailDate = detailReminder ? new Date(detailReminder.startAt) : null;
  const detailCountdown = detailDate ? countdownParts(detailDate, now) : null;

  const saveReminders = (next: ReminderEvent[]) => {
    const normalized = normalizeReminders(next);
    setReminders(normalized);
    storage.set(storage.keys.REMINDERS, normalized);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.title.trim()) return;
    const startAt = buildIsoFromParts(formState.date, formState.time);
    const tags = formState.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    const newReminder: ReminderEvent = {
      id: crypto.randomUUID(),
      title: formState.title.trim(),
      description: formState.description.trim(),
      startAt,
      createdAt: new Date().toISOString(),
      priority: formState.priority,
      location: formState.location.trim(),
      tags,
      pinned: false
    };
    saveReminders([...reminders, newReminder]);
    setFormState(prev => ({
      ...prev,
      title: '',
      description: '',
      tags: '',
      time: prev.time,
      date: formState.date
    }));
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setFormState(prev => ({ ...prev, date: toISODate(date) }));
  };

  const deleteReminder = (id: string) => {
    const next = reminders.filter(rem => rem.id !== id);
    saveReminders(next);
  };

  const togglePin = (id: string) => {
    const next = reminders.map(rem => (rem.id === id ? { ...rem, pinned: !rem.pinned } : rem));
    saveReminders(next);
  };

  const changeMonth = (offset: number) => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + offset);
    setViewDate(d);
    setSelectedDate(d);
    setFormState(prev => ({ ...prev, date: toISODate(d) }));
  };

  const openDetailModal = (reminder: ReminderEvent) => {
    setDetailModal({ open: true, reminder });
  };

  const closeDetailModal = () => {
    setDetailModal({ open: false, reminder: null });
  };

  const monthLabel = formatCalendarMonthYear(viewDate, calendarMode);
  const weekDays = getCalendarWeekDays(calendarMode);

  return (
    <>
      <div className="space-y-4 md:space-y-6">
        <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6 shadow-[0_25px_70px_-35px_rgba(34,211,238,0.45)] relative overflow-hidden">
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute -left-16 -top-16 w-48 h-48 rounded-full bg-cyan-500/15 blur-[120px]"></div>
            <div className="absolute right-0 bottom-0 w-72 h-72 rounded-full bg-purple-500/15 blur-[140px]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.12),transparent_32%),radial-gradient(circle_at_50%_85%,rgba(16,185,129,0.12),transparent_32%)]"></div>
          </div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-stretch">
            <div className="flex flex-col items-center text-center gap-3 rounded-2xl border border-cyan-400/25 bg-white/5 px-4 py-5 shadow-[0_18px_45px_-28px_rgba(34,211,238,0.55)]">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                <BellRing className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm text-cyan-200/80">تعداد یادآوری‌ها</div>
                <div className="text-3xl md:text-4xl font-black text-white leading-tight">{reminders.length}</div>
              </div>
            </div>
            <div className="flex flex-col items-center text-center gap-3 rounded-2xl border border-emerald-400/25 bg-white/5 px-4 py-5 shadow-[0_18px_45px_-28px_rgba(16,185,129,0.55)]">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                <AlarmClockCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm text-emerald-200/80">نزدیک‌ترین یادآوری</div>
                <div className="text-lg font-bold text-white leading-tight">
                  {earliest ? earliest.title : 'هنوز یادآوری ثبت نشده'}
                </div>
                {earliest && (
                  <div className="text-xs text-emerald-200/70">
                    {toPersianDate(new Date(earliest.startAt))} • {formatTime(new Date(earliest.startAt))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-center text-center gap-3 rounded-2xl border border-amber-400/25 bg-white/5 px-4 py-5 shadow-[0_18px_45px_-28px_rgba(245,158,11,0.45)]">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <Timer className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm text-amber-200/80">وضعیت همگام‌سازی</div>
                <div className="text-lg font-bold text-white leading-tight">
                  {upcomingReminders.length > 0 ? 'یادآوری‌های پیشِ رو آماده‌اند' : 'یادآوری فعالی ثبت نشده'}
                </div>
                <div className="text-[11px] text-amber-200/60">
                  {hydrated ? 'همگام با سرور' : 'در حال همگام‌سازی با سرور'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4 md:gap-6 items-stretch">
          <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6 shadow-[0_20px_55px_-35px_rgba(0,0,0,0.75)] min-h-[620px] h-full flex flex-col">
            <div className="absolute inset-0 opacity-50 pointer-events-none">
              <div className="absolute -left-16 -top-12 w-44 h-44 bg-cyan-500/15 rounded-full blur-[110px]"></div>
              <div className="absolute right-2 -bottom-10 w-52 h-52 bg-emerald-500/14 rounded-full blur-[120px]"></div>
            </div>
            <div className="relative flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-white">
                <CalendarClock className="w-5 h-5 text-cyan-300" />
                <span className="font-bold">تقویم یادآوری</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeMonth(-1)}
                  className="p-2 rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:border-cyan-400/40 transition"
                  aria-label="ماه قبل"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-white font-bold">
                  {monthLabel}
                </div>
                <button
                  onClick={() => changeMonth(1)}
                  className="p-2 rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:border-cyan-400/40 transition"
                  aria-label="ماه بعد"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative z-10 flex flex-col gap-4 flex-1">
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-[10px] sm:text-[11px] text-cyan-200/80 font-bold">
                {weekDays.map(d => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="flex-1 pr-1">
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {calendarData.days.map(day => {
                    const iso = toISODate(day.date);
                    const hasReminder = (remindersByDay[iso]?.length || 0) > 0;
                    const isSelected = selectedIso === iso;
                    const isToday = toISODate(new Date()) === iso;
                    return (
                      <div
                        key={iso + day.dayNum}
                        onClick={() => handleDayClick(day.date)}
                        className={`relative aspect-[4/5] sm:aspect-[5/6] rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300 group overflow-hidden border ${
                          isSelected
                            ? 'border-emerald-400/50 shadow-[0_0_35px_-12px_rgba(16,185,129,0.8)] scale-105'
                            : 'border-white/10 hover:border-emerald-300/30 hover:scale-105'
                        } ${!day.isCurrentMonth ? 'opacity-50' : 'opacity-100'} ${
                          isToday ? 'ring-2 ring-cyan-400/70 ring-offset-[2px] ring-offset-slate-900' : ''
                        }`}
                    style={{
                      background: `linear-gradient(145deg, rgba(15,23,42,0.82) 0%, rgba(15,23,42,0.62) 50%, rgba(15,23,42,0.9) 100%)`
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/20 to-slate-900/10 opacity-0 group-hover:opacity-80 transition-opacity duration-500"></div>
                    {hasReminder && (
                      <div className="absolute top-1 left-1">
                        <BellRing className="w-4 h-4 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]" />
                      </div>
                    )}
                    <div className="relative z-10 h-full w-full flex flex-col items-center justify-between p-1.5 sm:p-2">
                          <div className="w-full flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400">
                            {isToday ? <span className="text-cyan-200 font-semibold">امروز</span> : <span className="opacity-70">روز</span>}
                            <span className="font-mono text-[8px] sm:text-[9px] text-slate-500">{hasReminder ? 'فعال' : ''}</span>
                          </div>

                          <div className="flex-1 flex items-center justify-center">
                            <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border border-white/10 bg-slate-900/60 flex items-center justify-center text-white font-black text-sm sm:text-base shadow-inner">
                              {day.dayNum}
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full blur-sm bg-white/15"></div>
                            </div>
                          </div>

                          <div className="w-full flex items-center justify-between text-[8px] sm:text-[9px] text-slate-400">
                            <div className="flex items-center gap-1">
                              {hasReminder && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]"></span>}
                            </div>
                            <span className="text-right text-slate-500">{day.isCurrentMonth ? '' : 'ماه دیگر'}</span>
                          </div>
                        </div>
                        {hasReminder && remindersByDay[iso]?.[0]?.title && (
                          <div className="absolute inset-x-1 bottom-1 px-1 py-0.5 rounded-md bg-emerald-500/10 text-[10px] text-emerald-200 line-clamp-1 text-center">
                            {remindersByDay[iso]?.[0]?.title}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-5 shadow-[0_20px_55px_-35px_rgba(16,185,129,0.35)] min-h-[620px] h-full flex flex-col">
            <div className="absolute inset-0 pointer-events-none opacity-50">
              <div className="absolute -right-10 -top-10 w-36 h-36 bg-emerald-500/14 rounded-full blur-[90px]"></div>
              <div className="absolute left-4 bottom-0 w-48 h-48 bg-cyan-500/12 rounded-full blur-[110px]"></div>
            </div>

            <div className="relative flex items-center justify-between text-white mb-3">
              <div className="flex items-center gap-2">
                <AlarmClock className="w-5 h-5 text-purple-300" />
                <span className="font-bold">رویدادهای روز انتخابی</span>
              </div>
              <span className="text-xs text-slate-300">{dayReminders.length} مورد</span>
            </div>
            <div className="relative flex-1 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-white/0 opacity-20 pointer-events-none"></div>
              <div className="relative space-y-2 h-full overflow-y-auto pr-1 custom-scrollbar">
                {dayReminders.length === 0 ? (
                  <div className="text-sm text-slate-500 border border-dashed border-white/10 rounded-xl px-3 py-4 text-center">
                    رویدادی برای این روز ثبت نشده است.
                  </div>
                ) : (
                  dayReminders.map(rem => {
                    const d = new Date(rem.startAt);
                    return (
                      <div
                        key={rem.id}
                        className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white flex items-start gap-3 justify-between"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-lg text-[11px] border ${priorityStyles[rem.priority || 'normal'].pill}`}>
                              {priorityStyles[rem.priority || 'normal'].label}
                            </span>
                            {rem.pinned && <span className="text-[10px] text-amber-200 bg-amber-500/10 border border-amber-400/30 rounded-md px-2 py-0.5">پین شده</span>}
                          </div>
                          <div className="font-bold leading-tight">{rem.title}</div>
                          {rem.description && <div className="text-xs text-slate-300 leading-relaxed">{rem.description}</div>}
                          <div className="text-[11px] text-cyan-200 flex items-center gap-2">
                            <Clock3 className="w-3 h-3" />
                            <span>{formatTime(d)}</span>
                            {rem.location && (
                              <>
                                <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                                <span className="text-slate-300">{rem.location}</span>
                              </>
                            )}
                          </div>
                          {rem.tags && rem.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {rem.tags.map(tag => (
                                <span key={tag} className="text-[10px] px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-white/5">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => togglePin(rem.id)}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-amber-300 hover:border-amber-400/40 transition"
                            title={rem.pinned ? 'برداشتن پین' : 'پین کردن'}
                          >
                            {rem.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => openDetailModal(rem)}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:text-white hover:border-cyan-400/50 transition flex items-center gap-1"
                            title="نمایش جزئیات"
                          >
                            <Sparkles className="w-4 h-4 text-cyan-200" />
                            <span className="text-[11px]">جزئیات</span>
                          </button>
                          <button
                            onClick={() => deleteReminder(rem.id)}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-rose-300 hover:border-rose-400/40 transition"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/90 p-4 md:p-5 shadow-[0_20px_55px_-35px_rgba(16,185,129,0.4)] space-y-3">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-300" />
              <span className="font-bold">ثبت سریع یادآوری</span>
            </div>
            <div className="text-xs text-slate-400">{toPersianDate(selectedDate)}</div>
          </div>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">عنوان رویداد</label>
              <input
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/70"
                placeholder="مثال: جلسه آنلاین، تحویل پروژه..."
                value={formState.title}
                onChange={e => setFormState(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">تاریخ</label>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/70"
                    value={formState.date}
                    onChange={e => setFormState(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs text-slate-400">ساعت</label>
                <input
                  type="time"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/70"
                  value={formState.time}
                  onChange={e => setFormState(prev => ({ ...prev, time: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">توضیحات</label>
              <textarea
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/70 min-h-[72px]"
                placeholder="چیزی که باید یادت بماند..."
                value={formState.description}
                onChange={e => setFormState(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">اهمیت</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'normal', 'high'] as ReminderPriority[]).map(p => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setFormState(prev => ({ ...prev, priority: p }))}
                      className={`px-2 py-2 rounded-xl border text-xs font-bold transition ${
                        formState.priority === p ? priorityStyles[p].pill : 'border-white/10 bg-white/5 text-slate-300'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${priorityStyles[p].dot}`}></span>
                        {priorityStyles[p].label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs text-slate-400">مکان/لینک</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    className="w-full rounded-xl bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/70"
                    placeholder="آدرس، لینک جلسه، نام کلاس..."
                    value={formState.location}
                    onChange={e => setFormState(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">تگ‌ها</label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  className="w-full rounded-xl bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/70"
                  placeholder="با ویرگول جدا کن (مثلا: درس، کار، خانواده)"
                  value={formState.tags}
                  onChange={e => setFormState(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Clock3 className="w-4 h-4 text-cyan-300" />
                <span>به دیتابیس ذخیره می‌شود</span>
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-bold shadow-[0_12px_32px_-18px_rgba(16,185,129,0.8)] hover:scale-[1.01] transition"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت یادآوری</span>
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-4 md:p-6 shadow-[0_18px_60px_-32px_rgba(34,211,238,0.45)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-white">
              <AlarmClock className="w-5 h-5 text-cyan-300" />
              <span className="font-bold">همه رویدادهای آینده با شمارش معکوس</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox rounded bg-slate-800 border-white/20"
                  checked={filterPinned}
                  onChange={e => setFilterPinned(e.target.checked)}
                />
                فقط پین‌شده‌ها
              </label>
              <button
                onClick={() => setFilterPinned(false)}
                className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-200 text-xs hover:border-cyan-400/40 transition flex items-center gap-2"
              >
                <RefreshCcw className="w-3 h-3" />
                همه رویدادها
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-[1fr] min-h-[660px] max-h-[660px] overflow-y-auto pr-1 custom-scrollbar">
            {visibleUpcoming.map((rem, idx) => {
              if (!rem) {
                return (
                  <div
                    key={`placeholder-${idx}`}
                    className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-slate-500 flex items-center justify-center min-h-[210px]"
                  >
                    رویداد آینده‌ای ثبت نشده
                  </div>
                );
              }
              const target = new Date(rem.startAt);
              const parts = countdownParts(target, now);
              return (
                <div
                  key={rem.id}
                  className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950 p-4 text-white shadow-[0_16px_50px_-32px_rgba(0,0,0,0.85)] flex flex-col gap-3 min-h-[210px]"
                >
                  <div className="flex items-start gap-2 justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-bold leading-tight">{rem.title}</div>
                      {rem.description && <div className="text-xs text-slate-300 leading-relaxed line-clamp-2">{rem.description}</div>}
                      <div className="text-[11px] text-cyan-200 flex items-center gap-2 mt-1">
                        <CalendarClock className="w-3 h-3" />
                        <span>{toPersianDate(target)}</span>
                        <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                        <span>{formatTime(target)}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[10px] border ${priorityStyles[rem.priority || 'normal'].pill}`}>
                      {priorityStyles[rem.priority || 'normal'].label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="rounded-xl bg-white/5 border border-white/10 py-2">
                      <div className="text-xs text-slate-300">روز</div>
                      <div className="text-lg font-black">{parts.days + parts.months * 30 + parts.years * 365}</div>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/10 py-2">
                      <div className="text-xs text-slate-300">ساعت</div>
                      <div className="text-lg font-black">{parts.hours}</div>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/10 py-2">
                      <div className="text-xs text-slate-300">دقیقه</div>
                      <div className="text-lg font-black">{parts.minutes}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                    <div className="flex items-center gap-1">
                      <Clock3 className="w-3 h-3" />
                      <span>{parts.seconds} ثانیه</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlarmClock className="w-3 h-3" />
                      <span>{parts.months} ماه • {parts.years} سال</span>
                    </div>
                    {rem.pinned && <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-200 border border-amber-400/30">پین شده</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {detailModal.open && detailReminder && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur">
          <div className="relative w-full max-w-2xl rounded-3xl border border-cyan-400/40 bg-slate-950/90 shadow-[0_24px_70px_-35px_rgba(34,211,238,0.6)] overflow-hidden">
            <div className="absolute inset-0 opacity-60 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900"></div>
            <div className="relative p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-cyan-200/80">Reminder details for {detailReminder.date ? detailReminder.date : toISODate(new Date(detailReminder.startAt))}</p>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <BellRing className="w-5 h-5 text-amber-300" />
                    {detailReminder.title}
                  </h3>
                  {detailDate && (
                    <div className="flex items-center gap-2 text-[12px] text-emerald-200">
                      <CalendarClock className="w-4 h-4" />
                      <span>{toPersianDate(detailDate)}</span>
                      <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                      <span>{formatTime(detailDate)}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={closeDetailModal}
                  className="p-2 rounded-xl border border-white/10 bg-slate-800 text-slate-200 hover:text-white hover:border-cyan-300/60 transition"
                  aria-label="Close reminder details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {detailReminder.description && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {detailReminder.description}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-300">
                <Clock3 className="w-4 h-4 text-cyan-300" />
                <span>Time: {detailDate ? formatTime(detailDate) : ''}</span>
                {detailReminder.location && (
                  <>
                    <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                    <MapPin className="w-4 h-4 text-emerald-300" />
                    <span>{detailReminder.location}</span>
                  </>
                )}
                {detailReminder.priority && (
                  <>
                    <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                    <span className={`px-2 py-1 rounded-lg text-[11px] border ${priorityStyles[detailReminder.priority || 'normal'].pill}`}>
                      {priorityStyles[detailReminder.priority || 'normal'].label}
                    </span>
                  </>
                )}
              </div>

              {detailReminder.tags && detailReminder.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {detailReminder.tags.map(tag => (
                    <span key={tag} className="text-[11px] px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-white/5">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
