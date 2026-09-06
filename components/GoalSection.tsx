
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Goal, GoalType, DayNote, NoteTargetType, GoalStatus, StudyLog, StudySubject } from '../types';
import { storage, toISODate, toPersianDate, getRelativeDate } from '../utils';
import {
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Target,
  TrendingUp,
  CalendarCheck,
  Sparkles,
  Flame,
  Activity,
  ArrowRight,
  ArrowLeft,
  Calendar,
  BellRing,
  NotebookPen
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RangeProgressRow, RANGE_WINDOWS, RangeProgressItem, clampRangePercent } from './RangeProgressRow';
import { chartCategoryClass } from './chartCategoryStyles';

const typeLabels: Record<GoalType, string> = {
  daily: 'روزانه',
  'short-term': 'کوتاه‌مدت',
  'long-term': 'بلندمدت'
};
const typeOrder: GoalType[] = ['long-term', 'short-term', 'daily'];

const chartRanges = [7, 14, 30, 60, 90, 120, 365, 730];

export const GoalSection: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeType, setActiveType] = useState<GoalType>('daily');
  const [input, setInput] = useState('');
  const [activeDate, setActiveDate] = useState<Date>(new Date());
  const [chartRange, setChartRange] = useState<number>(30);
  const [viewEndDate, setViewEndDate] = useState<Date>(new Date());
  const [todayIso, setTodayIso] = useState<string>(() => toISODate(new Date()));
  const [notesByDate, setNotesByDate] = useState<Record<string, DayNote[]>>({});
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([]);
  const [noteModal, setNoteModal] = useState<{
    open: boolean;
    targetId: string;
    targetType: NoteTargetType;
    targetTitle: string;
    date: string;
  }>({ open: false, targetId: '', targetType: 'goal', targetTitle: '', date: '' });
  const [noteText, setNoteText] = useState('');
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; text: string; title: string }>({
    open: false,
    text: '',
    title: ''
  });
  const activeIso = useMemo(() => toISODate(activeDate), [activeDate]);
  const activeDayShortLabel = useMemo(
    () => toPersianDate(activeDate).split(' ').slice(1, 3).join(' '),
    [activeDate]
  );
  const activeDayFullLabel = useMemo(
    () => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(activeDate),
    [activeDate]
  );
  const activeDayGregorian = useMemo(
    () => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(activeDate),
    [activeDate]
  );
  const isViewingToday = useMemo(() => activeIso === todayIso, [activeIso, todayIso]);
  const dayNotes = notesByDate[activeIso] || [];

  const normalizeGoal = (goal: Goal): Goal => {
    const scheduleIso = goal.scheduledFor ? toISODate(new Date(goal.scheduledFor)) : toISODate(new Date(goal.createdAt));
    const status: GoalStatus = goal.status ?? (goal.completed ? 'done' : 'pending');
    if (status === 'done' && !goal.completedAt) {
      // فقط برای اهداف کوتاه‌مدت و بلندمدت تاریخ تکمیل ثبت می‌شود
      if (goal.type !== 'daily') {
        const completionStamp = new Date(`${scheduleIso}T12:00:00`).toISOString();
        return { ...goal, status, completed: true, completedAt: completionStamp };
      }
      return { ...goal, status, completed: true, completedAt: undefined };
    }
    if (status === 'missed' && !goal.missedAt) {
      const missedStamp = new Date(`${scheduleIso}T12:00:00`).toISOString();
      return { ...goal, status, completed: false, missedAt: missedStamp, completedAt: undefined };
    }
    return { ...goal, status, completed: status === 'done' };
  };

  const getStatus = (goal: Goal): GoalStatus => goal.status ?? (goal.completed ? 'done' : 'pending');
  const isDone = (goal: Goal) => getStatus(goal) === 'done';
  const isMissed = (goal: Goal) => getStatus(goal) === 'missed';
  const isPending = (goal: Goal) => getStatus(goal) === 'pending';
  const statusDate = (goal: Goal): string | null => {
    if (isDone(goal) && goal.completedAt) return toISODate(new Date(goal.completedAt));
    if (isMissed(goal) && goal.missedAt) return toISODate(new Date(goal.missedAt));
    return null;
  };
  const resolvedOnDate = (goal: Goal, iso: string) => statusDate(goal) === iso;
  const getScheduleDate = (goal: Goal) =>
    goal.scheduledFor ? toISODate(new Date(goal.scheduledFor)) : toISODate(new Date(goal.createdAt));

  useEffect(() => {
    const stored = storage.get(storage.keys.GOALS, []);
    const normalized = stored.map(normalizeGoal);
    setGoals(normalized);
    if (stored.some(g => g.status === undefined)) {
      storage.set(storage.keys.GOALS, normalized);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const now = toISODate(new Date());
      setTodayIso(prev => (prev === now ? prev : now));
    }, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const rawNotes = storage.get(storage.keys.NOTES, {});
    const normalizedNotes = rawNotes && typeof rawNotes === 'object' ? rawNotes : {};
    const rawLogs = storage.get<StudyLog[]>(storage.keys.STUDY_LOGS, []);
    const normalizedLogs = Array.isArray(rawLogs) ? rawLogs : [];
    setNotesByDate(normalizedNotes);
    setStudyLogs(normalizedLogs);
  }, []);

  useEffect(() => {
    if (!goals.length) return;
    let hasChange = false;
    const next = goals.map(goal => {
      if (goal.type !== 'daily' || !isPending(goal)) return goal;
      const scheduleIso = getScheduleDate(goal);
      if (scheduleIso < todayIso) {
        hasChange = true;
        const missedStamp = new Date(`${scheduleIso}T12:00:00`).toISOString();
        return { ...goal, status: 'missed', completed: false, completedAt: undefined, missedAt: missedStamp };
      }
      return goal;
    });

    if (hasChange) {
      persistGoals(next);
    }
  }, [todayIso, goals]);

  const persistGoals = (next: Goal[]) => {
    setGoals(next);
    storage.set(storage.keys.GOALS, next);
  };

  const persistNotes = (next: Record<string, DayNote[]>) => {
    setNotesByDate(next);
    storage.set(storage.keys.NOTES, next);
  };

  const getExistingNote = (date: string, targetType: NoteTargetType, targetId: string) =>
    (notesByDate[date] || []).find(n => n.targetType === targetType && n.targetId === targetId);

  const openNoteModal = (targetId: string, targetTitle: string) => {
    const date = activeIso;
    const existing = getExistingNote(date, 'goal', targetId);
    setNoteText(existing?.text || '');
    setNoteModal({
      open: true,
      targetId,
      targetType: 'goal',
      targetTitle,
      date
    });
  };

  const closeNoteModal = () => {
    setNoteModal(prev => ({ ...prev, open: false }));
    setNoteText('');
  };

  const saveNote = () => {
    if (!noteModal.open) return;
    const trimmed = noteText.trim();
    const { date, targetId, targetType, targetTitle } = noteModal;
    const existing = getExistingNote(date, targetType, targetId);
    const nextEntry: DayNote = {
      id: existing?.id || `${targetType}-${targetId}-${Date.now()}`,
      date,
      targetId,
      targetType,
      targetTitle,
      text: trimmed,
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    const currentForDay = notesByDate[date] || [];
    const filtered = currentForDay.filter(n => !(n.targetId === targetId && n.targetType === targetType));
    const nextDayNotes = trimmed ? [...filtered, nextEntry] : filtered;
    const next = { ...notesByDate, [date]: nextDayNotes };
    persistNotes(next);
    closeNoteModal();
  };

  const isCompletedOnActiveDay = (goal: Goal) => resolvedOnDate(goal, activeIso) && isDone(goal);
  const isVisibleOnActiveDay = (goal: Goal) => {
    if (goal.type === 'daily') {
      return getScheduleDate(goal) === activeIso;
    }
    return true;
  };

  const addGoal = () => {
    if (!input.trim()) return;
    const scheduleIso = activeIso;
    const newGoal: Goal = {
      id: Date.now().toString(),
      text: input.trim(),
      type: activeType,
      completed: false,
      status: 'pending',
      createdAt: new Date().toISOString(),
      scheduledFor: scheduleIso
    };
    const next = [...goals, newGoal];
    persistGoals(next);
    setInput('');
  };

  const setGoalStatus = (id: string, status: GoalStatus, forcedDate?: string) => {
    let changed = false;
    const next = goals.map(g => {
      if (g.id !== id) return g;
      changed = true;
      const currentStatus = getStatus(g);
      
      // اگر روی همان دکمه‌ای که وضعیت فعلی است کلیک شد، نظر را برمی‌داریم (به pending برمی‌گردیم)
      if ((status === 'done' && currentStatus === 'done') || (status === 'missed' && currentStatus === 'missed')) {
        return { ...g, status: 'pending', completed: false, completedAt: undefined, missedAt: undefined };
      }
      
      const scheduleIso = getScheduleDate(g);
      const resolvedIso = forcedDate || (status === 'missed' && g.type === 'daily' ? scheduleIso : activeIso);
      const stamp = new Date(`${resolvedIso}T12:00:00`).toISOString();
      if (status === 'done') {
        // فقط برای اهداف کوتاه‌مدت و بلندمدت تاریخ تکمیل ثبت می‌شود
        const completedAt = g.type === 'daily' ? undefined : stamp;
        return { ...g, status, completed: true, completedAt, missedAt: undefined };
      }
      if (status === 'missed') {
        return { ...g, status, completed: false, completedAt: undefined, missedAt: stamp };
      }
      return { ...g, status: 'pending', completed: false, completedAt: undefined, missedAt: undefined };
    });
    if (changed) {
      persistGoals(next.map(normalizeGoal));
    }
  };

  const deleteGoal = (id: string) => {
    persistGoals(goals.filter(g => g.id !== id));
  };

  const visibleGoals = useMemo(() => goals.filter(isVisibleOnActiveDay), [goals, activeIso]);

  const goalsByType = useMemo(
    () => ({
      daily: visibleGoals.filter(g => g.type === 'daily'),
      'short-term': visibleGoals.filter(g => g.type === 'short-term'),
      'long-term': visibleGoals.filter(g => g.type === 'long-term')
    }),
    [visibleGoals]
  );

  const focusedGoals = goalsByType[activeType];

  const completedByType = useMemo(
    () => ({
      daily: goals.filter(g => isDone(g) && g.type === 'daily'),
      'short-term': goals.filter(g => isDone(g) && g.type === 'short-term'),
      'long-term': goals.filter(g => isDone(g) && g.type === 'long-term')
    }),
    [goals]
  );

  const reminders = useMemo(() => {
    // فقط یادآوری‌های بازه یک‌ماهه‌ی آینده از امروز
    const futureLimitIso = toISODate(getRelativeDate(30));
    return goals
      .filter(g => {
        if (!isPending(g)) return false;
        const schedule = getScheduleDate(g);
        return schedule > todayIso && schedule <= futureLimitIso;
      })
      .sort((a, b) => getScheduleDate(a).localeCompare(getScheduleDate(b)));
  }, [goals, todayIso]);

  const remindersByDay = useMemo(() => {
    return reminders.reduce((acc, goal) => {
      const date = getScheduleDate(goal);
      acc[date] = acc[date] ? [...acc[date], goal] : [goal];
      return acc;
    }, {} as Record<string, Goal[]>);
  }, [reminders]);

  const completedCount = focusedGoals.filter(g => isDone(g)).length;
  const totalGoals = goals.length;
  const totalCompleted = goals.filter(g => isDone(g)).length;
  const completionRate = totalGoals ? Math.round((totalCompleted / totalGoals) * 100) : 0;
  const activeCompletionRate = focusedGoals.length ? Math.round((completedCount / focusedGoals.length) * 100) : 0;

  const rangeProgressItems: RangeProgressItem[] = useMemo(() => {
    const dailyPercent = (iso: string) => {
      const dayGoals = goals.filter(g => {
        const scheduledIso = getScheduleDate(g);
        return g.type === activeType && scheduledIso === iso;
      });
      if (dayGoals.length === 0) return 0;
      const completedToday = dayGoals.filter(g => isDone(g) && resolvedOnDate(g, iso)).length;
      return (completedToday / dayGoals.length) * 100;
    };

    const averageWindow = (days: number, offset: number) => {
      if (days <= 0) return 0;
      let acc = 0;
      for (let i = 0; i < days; i++) {
        const iso = toISODate(getRelativeDate(-(i + offset), viewEndDate));
        acc += dailyPercent(iso);
      }
      return acc / days;
    };

    return RANGE_WINDOWS.map(window => {
      const currentAvg = averageWindow(window.days, 0);
      const prevAvg = averageWindow(window.days, window.days);
      return { ...window, value: clampRangePercent(currentAvg - prevAvg) };
    });
  }, [goals, activeType, viewEndDate]);


  const rangeLabel = (r: number) => {
    if (r === 365) return 'یک سال';
    if (r === 730) return 'دو سال';
    return `${r} روز`;
  };

  const chartData = useMemo(() => {
    const days = chartRange;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = getRelativeDate(-i, viewEndDate);
      const isoDate = toISODate(d);
      const completedToday = goals.filter(g => isDone(g) && resolvedOnDate(g, isoDate));
      data.push({
        index: data.length,
        date: toPersianDate(d).split(' ').slice(1, 3).join(' '),
        fullDate: toPersianDate(d), // شامل سال
        count: completedToday.length,
        items: completedToday.map(g => g.text)
      });
    }
    return data;
  }, [goals, chartRange, viewEndDate]);

  // داده مخصوص «دفتر ثبت تکمیل‌ها» فقط برای یک ماه گذشته (۳۰ روز قبل از امروز)
  const completionLogData = useMemo(() => {
    const days = 30;
    const endDate = new Date();
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = getRelativeDate(-i, endDate);
      const isoDate = toISODate(d);
      const completedToday = goals.filter(g => isDone(g) && resolvedOnDate(g, isoDate));
      const studyManagementToday = studyLogs.filter(s => s.date === isoDate && s.subject === StudySubject.MODIRIYAT);
      const englishToday = studyLogs.filter(s => s.date === isoDate && s.subject === StudySubject.ENGLISH);
      data.push({
        date: toPersianDate(d).split(' ').slice(1, 3).join(' '),
        fullDate: toPersianDate(d),
        count: completedToday.length,
        items: completedToday.map(g => g.text),
        studyManagementCount: studyManagementToday.length,
        studyManagementItems: studyManagementToday.map(s => `مدیریت مطالعه: ${s.hours.toFixed(1)} ساعت`),
        englishCount: englishToday.length,
        englishItems: englishToday.map(s => `زبان انگلیسی: ${s.hours.toFixed(1)} ساعت`)
      });
    }
    return data;
  }, [goals, studyLogs]);
  const ticks = useMemo(() => {
    if (chartData.length === 0) return [];
    const step = Math.max(1, Math.floor(chartData.length / 8));
    const t: number[] = [];
    for (let i = 0; i < chartData.length; i += step) t.push(i);
    if (t[t.length - 1] !== chartData.length - 1) t.push(chartData.length - 1);
    return t;
  }, [chartData]);

  const weeklyCompleted = useMemo(() => {
    const start = getRelativeDate(-6);
    const startIso = toISODate(start);
    return goals.filter(g => isDone(g) && g.completedAt && toISODate(new Date(g.completedAt)) >= startIso).length;
  }, [goals]);

  const activeDayCompleted = useMemo(() => {
    return goals.filter(g => isDone(g) && resolvedOnDate(g, activeIso)).length;
  }, [goals, activeIso]);

  const weeklyTrend = useMemo(() => {
    const last7 = chartData.slice(-7).reduce((sum, d) => sum + d.count, 0);
    const prev7 = chartData.slice(-14, -7).reduce((sum, d) => sum + d.count, 0);
    if (prev7 === 0) return last7 > 0 ? 100 : 0;
    return Math.round(((last7 - prev7) / prev7) * 100);
  }, [chartData]);

  const rangeStart = useMemo(() => getRelativeDate(-(chartRange - 1), viewEndDate), [chartRange, viewEndDate]);
  const rangeText = useMemo(() => {
    const startLabel = toPersianDate(rangeStart).split(' ').slice(1, 3).join(' ');
    const endLabel = toPersianDate(viewEndDate).split(' ').slice(1, 3).join(' ');
    return `${startLabel} تا ${endLabel}`;
  }, [rangeStart, viewEndDate]);
  const isAtToday = useMemo(() => toISODate(viewEndDate) === toISODate(new Date()), [viewEndDate]);
  const shiftActiveDate = (direction: 'prev' | 'next') => {
    setActiveDate(prev => getRelativeDate(direction === 'prev' ? -1 : 1, prev));
  };
  const shiftViewWindow = (direction: 'prev' | 'next') => {
    const step = chartRange;
    const today = new Date();
    const next = getRelativeDate(direction === 'prev' ? -step : step, viewEndDate);
    setViewEndDate(next > today ? today : next);
  };

  return (
    <>
    <div className="space-y-7 animate-enter" dir="rtl">
      <div className="relative overflow-hidden rounded-[32px] border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 shadow-[0_20px_70px_-28px_rgba(34,211,238,0.6)]">
        <div className="absolute inset-0 opacity-60 pointer-events-none">
          <div className="absolute -left-12 -top-16 w-56 h-56 rounded-full bg-cyan-500/18 blur-[110px] animate-pulse"></div>
          <div className="absolute left-1/3 -bottom-14 w-64 h-64 rounded-full bg-cyan-500/14 blur-[120px] animate-float"></div>
          <div className="absolute right-0 top-0 w-72 h-72 rounded-full bg-purple-500/14 blur-[130px] animate-float" style={{ animationDelay: '1.2s' }}></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(34,211,238,0.16),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_50%_90%,rgba(16,185,129,0.14),transparent_30%)]"></div>
        </div>
        <div className="relative">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1.5fr)] items-stretch">
            {/* ستون چپ: توضیحات تالار اهداف – شبیه طرح */}
            <div className="relative flex flex-col justify-center gap-4 text-right text-slate-100">
              <div className="inline-flex items-center self-start gap-2 px-3 py-1 rounded-full bg-slate-900/70 border border-cyan-400/30 text-cyan-200 text-xs font-mono tracking-wide">
                <Sparkles className="w-4 h-4 text-cyan-300" />
                اتاق فرمان اهداف | همه نوع‌ها همزمان
              </div>
              <div className="flex items-center gap-3 text-white">
                <Target className="w-8 h-8 text-cyan-300" />
                <h2 className="text-3xl md:text-4xl font-black tracking-tight">تالار اهداف</h2>
              </div>
              <p className="text-sm md:text-base text-slate-200/80 leading-relaxed max-w-xl">
                همه اهداف کوتاه‌مدت، بلندمدت و روزانه در یک نما دیده می‌شوند. اهداف بلند و کوتاه پس از تکمیل در روز بعد مخفی
                می‌شوند اما در بایگانی قابل مشاهده‌اند. اهداف روزانه فقط در تاریخ مشخص‌شان نمایش داده می‌شوند و در این تالار
                براساس روز فعال فیلتر می‌شوند.
              </p>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-cyan-100">
                  نمایش هوشمند اهداف بر اساس تاریخ
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/40 text-emerald-100">
                  تفکیک روزانه / کوتاه‌مدت / بلندمدت
                </span>
                <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-400/40 text-purple-100">
                  بایگانی و دفتر ثبت تکمیل‌ها
                </span>
              </div>
            </div>

            {/* ستون وسط: دایره اصلی + سه کارت زیر آن (مثل امتیاز امروز) */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-full overflow-hidden rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-[0_18px_50px_-26px_rgba(34,211,238,0.8)] flex flex-col items-center justify-center gap-6">
                <div className="absolute inset-0 opacity-50 pointer-events-none">
                  <div className="absolute -left-10 -top-10 w-40 h-40 bg-cyan-500/25 blur-[110px]"></div>
                  <div className="absolute right-0 -bottom-12 w-44 h-44 bg-emerald-500/20 blur-[120px]"></div>
                </div>
                {/* دایره وسط */}
                <div className="relative w-40 h-40 md:w-48 md:h-48 shrink-0">
                  <div
                    className="absolute inset-0 rounded-full border border-cyan-400/50"
                    style={{
                      background: `conic-gradient(#22d3ee ${completionRate * 3.6}deg, rgba(148,163,184,0.2) ${
                        completionRate * 3.6
                      }deg)`
                    }}
                  ></div>
                  <div className="absolute inset-4 md:inset-5 rounded-full bg-slate-950/90 border border-white/10 flex flex-col items-center justify-center text-center px-3">
                    <div className="text-3xl md:text-4xl font-black text-cyan-100">{completionRate}%</div>
                    <div className="text-[11px] md:text-sm text-slate-300 mt-1">نرخ کلی تکمیل اهداف</div>
                    <div className="mt-1 text-[11px] text-emerald-200 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {weeklyTrend >= 0 ? 'رشد هفتگی' : 'افت هفتگی'} {Math.abs(weeklyTrend)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* سه کارت زیر دایره – امروز / این هفته / کل اهداف */}
              <div className="grid w-full grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-3 flex flex-col justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-slate-300">امروز</span>
                    <span className="text-[10px] text-slate-500">اهداف کامل‌شده در روز انتخابی</span>
                  </div>
                  <div className="mt-2 text-2xl font-black text-white">{activeDayCompleted}</div>
                </div>
                <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-3 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-[11px] text-emerald-100">
                    <Flame className="w-3.5 h-3.5" />
                    اهداف این هفته
                  </div>
                  <div className="mt-1 text-[10px] text-emerald-200">
                    {weeklyTrend >= 0 ? 'رشد' : 'افت'} {Math.abs(weeklyTrend)}% نسبت به هفته قبل
                  </div>
                  <div className="mt-2 text-2xl font-black text-white">{weeklyCompleted}</div>
                </div>
                <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-3 flex flex-col justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-slate-300">کل اهداف</span>
                    <span className="text-[10px] text-slate-500">تا این لحظه ثبت‌شده / تکمیل‌شده</span>
                  </div>
                  <div className="mt-2 text-right">
                    <div className="text-2xl font-black text-white">{totalGoals || 0}</div>
                    <div className="text-[10px] text-emerald-200 mt-0.5">تکمیل: {totalCompleted}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ستون راست: دو مستطیل آماری – مثل اسکرین‌شات اهداف فعال امروز / پیشرفت نوع فعال */}
            <div className="flex flex-col gap-3 justify-center">
              <div className="relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 space-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/15 via-transparent to-emerald-400/15 opacity-80"></div>
                <div className="relative flex items-center justify-between text-xs text-slate-300">
                  <span>اهداف فعال امروز</span>
                  <Target className="w-4 h-4 text-cyan-300" />
                </div>
                <div className="relative text-white text-2xl font-black">{visibleGoals.length}</div>
                <div className="relative text-[11px] text-slate-400">
                  فقط اهدافی که در این روز باید ببینی، اینجا حساب می‌شوند.
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 space-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/15 via-transparent to-cyan-400/15 opacity-80"></div>
                <div className="relative flex items-center justify-between text-xs text-slate-300">
                  <span>پیشرفت نوع فعال</span>
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                </div>
                <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-emerald-300 to-purple-400"
                    style={{ width: `${activeCompletionRate}%` }}
                  ></div>
                </div>
                <div className="relative text-[11px] text-cyan-100">
                  {activeCompletionRate}% از اهداف {typeLabels[activeType]} امروز کامل شده است.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <div className="relative overflow-hidden rounded-[24px] border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 md:p-6 shadow-[0_15px_40px_-25px_rgba(34,211,238,0.6)]">
          <div className="absolute inset-0 opacity-40 pointer-events-none">
            <div className="absolute -left-10 top-10 w-32 h-32 bg-cyan-500/20 blur-[120px] animate-pulse"></div>
            <div className="absolute right-4 -bottom-10 w-40 h-40 bg-emerald-500/10 blur-[120px] animate-float" style={{ animationDelay: '1s' }}></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_90%_80%,rgba(56,189,248,0.14),transparent_35%)]"></div>
          </div>
          <div className="relative space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-sm text-slate-300">اهداف این روز</div>
                <div className="flex items-center gap-2 text-2xl font-black text-white">
                  {visibleGoals.length}
                  <span className="text-sm text-cyan-200">هدف فعال</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <div className="flex items-center gap-2 text-cyan-200 bg-slate-950/70 border border-cyan-400/30 px-3 py-2 rounded-xl">
                  <Target className="w-4 h-4 text-cyan-300" />
                  نوع پیش‌فرض افزودن: {typeLabels[activeType]}
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="text-sm text-slate-300 flex items-center gap-2">
                <span className="px-2 py-1 rounded-lg bg-slate-950/70 border border-white/10 text-cyan-200 font-bold min-w-[260px] text-center">
                  {activeDayFullLabel}
                </span>
                <span className="text-xs text-slate-500">({activeDayGregorian} / {activeDayShortLabel})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => shiftActiveDate('next')}
                  className="px-3 py-1.5 text-sm rounded-xl bg-slate-900/70 border border-white/10 text-slate-200 hover:border-cyan-300/40 transition flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  روز بعد
                </button>
                <button
                  onClick={() => shiftActiveDate('prev')}
                  className="px-3 py-1.5 text-sm rounded-xl bg-slate-900/70 border border-white/10 text-slate-200 hover:border-cyan-300/40 transition flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  روز قبل
                </button>
                <button
                  onClick={() => setActiveDate(new Date())}
                  disabled={isViewingToday}
                  className={`px-3 py-1.5 text-sm rounded-xl border transition flex items-center gap-2 ${
                    isViewingToday
                      ? 'bg-slate-800/60 border-white/5 text-slate-500 cursor-not-allowed'
                      : 'bg-cyan-500/10 border-cyan-400/40 text-cyan-100 hover:-translate-y-0.5'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  بازگشت به امروز
                </button>
              </div>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {typeOrder.map(t => {
                const list = goalsByType[t];
                const typeCompletedToday = list.filter(g => isCompletedOnActiveDay(g)).length;
                const typePending = list.filter(g => isPending(g)).length;
                const typeMissed = list.filter(g => isMissed(g)).length;
                const typeOpen = typePending + typeMissed;
                return (
                  <div key={t} className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 space-y-3 shadow-[0_10px_30px_-20px_rgba(34,211,238,0.4)] h-full flex flex-col min-h-[520px] max-h-[520px]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-white">
                        <span className="text-sm font-black">{typeLabels[t]}</span>
                        <span className="text-xs text-cyan-200 bg-white/10 px-2 py-1 rounded-full">کل: {list.length}</span>
                      </div>
                      <div className="text-[11px] text-slate-300 flex items-center gap-2 flex-wrap">
                        <span className="text-cyan-200">{typeOpen} باز</span>
                        <span className="text-slate-400">/</span>
                        <span className="text-cyan-300">{typeCompletedToday} تکمیل شده</span>
                        <span className="text-slate-500">/</span>
                        <span className="text-rose-300">{typeMissed} از دست رفته</span>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[430px] overflow-y-auto custom-scrollbar pr-1">
                      {list.length === 0 && (
                        <div className="text-slate-400 text-xs text-center py-4 border border-dashed border-white/10 rounded-xl bg-slate-950/70">
                          هیچ هدفی برای این نوع در این روز ثبت نشده است.
                        </div>
                      )}

                      {list.map(goal => {
                        const status = getStatus(goal);
                        // برای اهداف روزانه که تکمیل شده‌اند، از تاریخ برنامه‌ریزی استفاده می‌کنیم
                        const resolvedIso = goal.type === 'daily' && status === 'done'
                          ? getScheduleDate(goal)
                          : statusDate(goal);
                        // برای همه اهداف سال و روز هفته را هم نمایش می‌دهیم
                        const dateParts = resolvedIso
                          ? toPersianDate(new Date(`${resolvedIso}T12:00:00`)).split(' ')
                          : [];
                        const resolvedDateLabel = resolvedIso
                          ? `${dateParts[2]} ${dateParts[1]} ${dateParts[3]} ${dateParts[0]}` // ماه، روز، سال و روز هفته
                          : '';
                        const scheduleDateParts = toPersianDate(new Date(getScheduleDate(goal))).split(' ');
                        const scheduleLabel = `${scheduleDateParts[2]} ${scheduleDateParts[1]} ${scheduleDateParts[3]} ${scheduleDateParts[0]}`; // ماه، روز، سال و روز هفته
                        const cardTone =
                          status === 'done'
                            ? 'bg-gradient-to-r from-cyan-400/20 via-emerald-400/10 to-cyan-400/10 border-cyan-400/40 shadow-[0_12px_40px_-24px_rgba(34,211,238,0.8)]'
                            : status === 'missed'
                              ? 'bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-red-500/5 border-rose-400/40 shadow-[0_12px_40px_-24px_rgba(239,68,68,0.5)]'
                              : 'bg-slate-900/60 border-white/5 hover:border-cyan-300/40';
                        const stripeTone =
                          status === 'done'
                            ? 'bg-gradient-to-b from-cyan-400 to-emerald-300'
                            : status === 'missed'
                              ? 'bg-gradient-to-b from-rose-400 to-amber-400'
                              : 'bg-white/10';
                        return (
                          <div
                            key={goal.id}
                            className={`relative overflow-hidden rounded-2xl border transition-all duration-300 group ${cardTone}`}
                          >
                            <div className={`absolute inset-y-0 right-0 w-1 ${stripeTone} opacity-80`}></div>
                            <div className="relative flex flex-col gap-3 p-4 min-h-[100px]">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => setGoalStatus(goal.id, 'done')}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center border transition ${
                                      status === 'done'
                                        ? 'bg-emerald-500 border-emerald-400 text-slate-900 shadow-[0_8px_20px_-12px_rgba(16,185,129,0.9)]'
                                        : 'border-slate-600 text-slate-200 hover:border-cyan-400 hover:text-cyan-200'
                                    }`}
                                    title="Mark as done"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setGoalStatus(goal.id, 'missed')}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center border transition ${
                                      status === 'missed'
                                        ? 'bg-rose-500 border-rose-400 text-white shadow-[0_8px_20px_-12px_rgba(239,68,68,0.6)]'
                                        : 'border-slate-600 text-slate-200 hover:border-rose-400 hover:text-rose-200'
                                    }`}
                                    title="Mark as not done"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {goal.type === 'daily' && (
                                    <>
                                      {resolvedIso ? (
                                        <span className={`text-[11px] rounded-full px-2 py-0.5 ${
                                          status === 'done'
                                            ? 'text-emerald-100 bg-emerald-500/20 border border-emerald-400/50'
                                            : 'text-rose-100 bg-rose-500/20 border border-rose-400/50'
                                        }`}>
                                          {status === 'done' ? `تکمیل شده: ${resolvedDateLabel}` : `انجام نشده: ${resolvedDateLabel}`}
                                        </span>
                                      ) : (
                                        <span className="text-[11px] text-emerald-200 bg-emerald-500/10 border border-emerald-400/30 rounded-full px-2 py-0.5">
                                          {scheduleLabel}
                                        </span>
                                      )}
                                    </>
                                  )}
                                  {(goal.type === 'short-term' || goal.type === 'long-term') && resolvedIso && (
                                    <span className={`text-[11px] rounded-full px-2 py-0.5 ${
                                      status === 'done'
                                        ? 'text-emerald-100 bg-emerald-500/20 border border-emerald-400/50'
                                        : 'text-rose-100 bg-rose-500/20 border border-rose-400/50'
                                    }`}>
                                      {status === 'done' ? `تکمیل شده: ${resolvedDateLabel}` : `انجام نشده: ${resolvedDateLabel}`}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => openNoteModal(goal.id, goal.text)}
                                    className="p-1.5 rounded-lg border border-white/10 bg-slate-900/60 hover:border-cyan-300/60 hover:text-white transition text-slate-300 flex items-center justify-center gap-1 w-7 h-7"
                                    title="یادداشت برای این هدف"
                                  >
                                    <NotebookPen className="w-3.5 h-3.5" />
                                    {dayNotes.some(n => n.targetType === 'goal' && n.targetId === goal.id) && (
                                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]"></span>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => deleteGoal(goal.id)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition flex items-center justify-center w-7 h-7"
                                    title="حذف هدف"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div className={`${
                                  status === 'done' ? 'text-emerald-50' : status === 'missed' ? 'text-rose-50' : 'text-white'
                                }`}>
                                  <div className={`text-sm font-bold leading-relaxed ${
                                    status !== 'pending' ? 'line-through opacity-80' : ''
                                  }`}>
                                    {(() => {
                                      const words = goal.text.split(/\s+/);
                                      const firstTwelveWords = words.slice(0, 12).join(' ');
                                      const hasMore = words.length > 16;
                                      
                                      if (hasMore) {
                                        return (
                                          <>
                                            <span className="inline">{firstTwelveWords}</span>
                                            <span className="inline">...</span>
                                            <button
                                              onClick={() => setDetailsModal({ open: true, text: goal.text, title: `جزئیات هدف ${typeLabels[goal.type]}` })}
                                              className="mr-1 text-cyan-300 hover:text-cyan-200 underline text-xs font-semibold inline"
                                            >
                                              جزئیات
                                            </button>
                                          </>
                                        );
                                      }
                                      return <span>{goal.text}</span>;
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="relative flex flex-col lg:flex-row gap-3 pt-3 border-t border-white/5">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {typeOrder.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`relative px-4 py-2 rounded-xl border text-sm font-bold transition-all duration-300 overflow-hidden ${
                    activeType === t
                      ? 'text-slate-900 shadow-[0_12px_30px_-12px_rgba(34,211,238,0.9)] border-transparent'
                      : 'text-slate-200 border-white/10 hover:border-cyan-300/40'
                  }`}
                  style={
                    activeType === t
                      ? { background: 'linear-gradient(135deg, #22d3ee 0%, #34d399 45%, #a855f7 100%)' }
                      : {}
                  }
                >
                  <span className="relative z-10">{typeLabels[t]}</span>
                  {activeType === t && <span className="absolute inset-0 opacity-20 bg-white/40"></span>}
                </button>
              ))}
            </div>
            <div className="flex-1">
              <input
                type="text"
                dir="rtl"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGoal())}
                placeholder="هدف جدید را بنویسید..."
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none bg-slate-900/70 border border-white/10 focus:border-cyan-400/60 transition"
              />
            </div>
              <button
                onClick={addGoal}
                className="md:w-auto w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-500 text-slate-900 font-extrabold flex items-center justify-center gap-2 hover:shadow-[0_10px_30px_-10px_rgba(34,211,238,0.9)] transition"
              >
                <Plus className="w-5 h-5" /> افزودن هدف
              </button>
            </div>
          </div>
        </div>
      </div>
      <RangeProgressRow
        title="ریتم بازه‌ای اهداف"
        subtitle="نرخ تکمیل اهداف در بازه‌های ۳ روزه تا یک‌ساله"
        items={rangeProgressItems}
      />
      <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-6">
        <div className="relative p-5 rounded-[24px] border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 backdrop-blur-xl flex flex-col overflow-hidden h-full max-h-[350px] min-h-[350px] transition-all duration-500 hover:border-cyan-300/60 hover:shadow-[0_26px_70px_-34px_rgba(0,0,0,0.95)]">
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute -left-10 top-0 w-36 h-36 bg-cyan-500/18 blur-[90px]"></div>
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-emerald-500/16 blur-[90px]"></div>
          </div>
          <div className="relative flex items-center gap-2 text-white pb-3 border-b border-white/5">
            <CalendarCheck className="w-5 h-5 text-cyan-300" />
            دفتر ثبت تکمیل‌ها
          </div>
          <div className="relative p-3 space-y-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            {completionLogData.slice().reverse().map((day, idx) => (
              (day.count > 0 || day.studyManagementCount > 0 || day.englishCount > 0) && (
                <div key={idx} className="relative pl-4">
                  <div className="absolute right-0 top-2 w-[2px] h-full bg-gradient-to-b from-cyan-400/70 to-transparent"></div>
                  <div className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.7)]"></span>
                    {day.date}
                  </div>
                  <div className="mt-2 space-y-2">
                    {day.items.map((item: string, i: number) => (
                      <div key={i} className="text-sm text-slate-100 bg-slate-900/70 border border-white/5 rounded-xl px-3 py-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0 flex-shrink-0"></span>
                        <span className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">
                          {item.length > 60 ? (
                            <>
                              <span className="inline-block max-w-[calc(100%-70px)] overflow-hidden text-ellipsis whitespace-nowrap">{item.slice(0, 60)}...</span>
                              <button
                                onClick={() => setDetailsModal({ open: true, text: item, title: 'جزئیات هدف تکمیل شده' })}
                                className="mr-1 text-cyan-300 hover:text-cyan-200 underline text-xs font-semibold whitespace-nowrap inline-block"
                              >
                                جزئیات
                              </button>
                            </>
                          ) : (
                            <span className="inline-block overflow-hidden text-ellipsis whitespace-nowrap">{item}</span>
                          )}
                        </span>
                      </div>
                    ))}
                    {day.studyManagementItems && day.studyManagementItems.map((item: string, i: number) => (
                      <div key={`study-${i}`} className="text-sm text-slate-100 bg-slate-900/70 border border-teal-400/30 rounded-xl px-3 py-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0 flex-shrink-0"></span>
                        <span className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">{item}</span>
                      </div>
                    ))}
                    {day.englishItems && day.englishItems.map((item: string, i: number) => (
                      <div key={`english-${i}`} className="text-sm text-slate-100 bg-slate-900/70 border border-orange-400/30 rounded-xl px-3 py-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 flex-shrink-0"></span>
                        <span className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
            {completionLogData.every(d => d.count === 0 && d.studyManagementCount === 0 && d.englishCount === 0) && (
              <div className="text-center text-slate-500 text-sm py-6">
                هنوز تکمیلی ثبت نشده است. وقتی هدفی را کامل کنید یا مطالعه‌ای ثبت کنید، اینجا به تفکیک روز می‌آید.
              </div>
            )}
          </div>
        </div>

        <div className="relative p-5 rounded-[24px] border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 backdrop-blur-xl flex flex-col overflow-hidden h-full max-h-[350px] min-h-[350px] transition-all duration-500 hover:border-cyan-300/60 hover:shadow-[0_26px_70px_-34px_rgba(0,0,0,0.95)]">
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute -left-8 top-0 w-32 h-32 bg-cyan-500/20 blur-[100px]"></div>
            <div className="absolute right-0 -bottom-10 w-40 h-40 bg-emerald-500/15 blur-[120px]"></div>
          </div>
          <div className="relative flex items-center gap-2 text-white pb-3 border-b border-white/5">
            <BellRing className="w-5 h-5 text-cyan-300" />
            یادآور تاریخ‌ها
          </div>
          <div className="relative space-y-3 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
            {Object.keys(remindersByDay).length === 0 && (
              <div className="text-center text-slate-500 text-sm py-6">
                یادآوری آینده‌ای ثبت نشده است. برای روزهای بعدی هدف تنظیم کنید تا اینجا دیده شود.
              </div>
            )}
            {Object.entries(remindersByDay).map(([date, dayGoals]) => {
              const goals = dayGoals as Goal[];
              return (
              <div key={date} className="border border-white/5 rounded-2xl bg-slate-900/60 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]"></span>
                  {new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date))}
                </div>
                <div className="space-y-2">
                  {goals.map((goal) => (
                  <div key={goal.id} className="flex items-center gap-2 text-slate-100 bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2">
                      <span className="text-[10px] text-cyan-200 bg-cyan-500/10 border border-cyan-400/40 rounded-full px-2 py-0.5 shrink-0 flex-shrink-0">{typeLabels[goal.type]}</span>
                      <span className="text-sm font-bold flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">
                        {goal.text.length > 60 ? (
                          <>
                            <span className="inline-block max-w-[calc(100%-70px)] overflow-hidden text-ellipsis whitespace-nowrap">{goal.text.slice(0, 60)}...</span>
                            <button
                              onClick={() => setDetailsModal({ open: true, text: goal.text, title: `جزئیات هدف ${typeLabels[goal.type]}` })}
                              className="mr-1 text-cyan-300 hover:text-cyan-200 underline text-xs font-semibold whitespace-nowrap inline-block"
                            >
                              جزئیات
                            </button>
                          </>
                        ) : (
                          <span className="inline-block overflow-hidden text-ellipsis whitespace-nowrap">{goal.text}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="relative p-5 rounded-[24px] border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 backdrop-blur-xl flex flex-col gap-4 overflow-hidden min-h-[380px] transition-all duration-500 hover:border-cyan-300/60 hover:shadow-[0_26px_70px_-34px_rgba(0,0,0,0.95)]">
          <div className="absolute inset-0 opacity-40 pointer-events-none">
            <div className="absolute -right-10 -top-10 w-44 h-44 bg-cyan-500/22 blur-[100px] animate-float"></div>
            <div className="absolute left-6 bottom-0 w-32 h-32 bg-emerald-500/15 blur-[90px] animate-pulse" style={{ animationDelay: '1.4s' }}></div>
          </div>
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-cyan-300" />
              بایگانی اهداف تکمیل‌شده
            </div>
            <div className="text-xs text-slate-400">جدا برای هر نوع</div>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3">
            {typeOrder.map((t) => {
              const completed = [...completedByType[t]].sort((a, b) => {
                const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
                const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
                return bTime - aTime;
              });
              return (
                <div key={t} className="border border-white/5 rounded-2xl bg-slate-900/60 p-4 space-y-2 h-full min-h-[320px] max-h-[340px] flex flex-col">
                  <div className="flex items-center justify-between text-sm text-white">
                    <span className="font-bold">{typeLabels[t]}</span>
                    <span className="text-xs text-emerald-200 bg-white/10 rounded-full px-2 py-1">{completed.length} تکمیل</span>
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
                    {completed.length === 0 && (
                      <div className="text-[12px] text-slate-500 text-center py-3 border border-dashed border-white/10 rounded-xl bg-slate-950/70">
                        هنوز هدف تکمیل‌شده‌ای برای این دسته ندارید.
                      </div>
                    )}
                    {completed.slice(0, 20).map(goal => (
                      <div key={goal.id} className="flex items-center gap-3 bg-slate-900/70 border border-white/5 rounded-xl px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                            {goal.text.length > 70 ? (
                              <>
                                <span className="inline-block max-w-[calc(100%-80px)] overflow-hidden text-ellipsis whitespace-nowrap">{goal.text.slice(0, 70)}...</span>
                                <button
                                  onClick={() => setDetailsModal({ open: true, text: goal.text, title: `جزئیات هدف ${typeLabels[goal.type]}` })}
                                  className="mr-1 text-cyan-300 hover:text-cyan-200 underline text-xs font-semibold whitespace-nowrap inline-block"
                                >
                                  جزئیات
                                </button>
                              </>
                            ) : (
                              <span className="inline-block overflow-hidden text-ellipsis whitespace-nowrap">{goal.text}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                            <span className="text-emerald-200">تکمیل: {goal.completedAt ? (() => {
                              const dateParts = toPersianDate(new Date(goal.completedAt)).split(' ');
                              // برای اهداف کوتاه‌مدت و بلندمدت سال و روز هفته را هم نمایش می‌دهیم
                              return goal.type === 'daily'
                                ? dateParts.slice(1, 3).join(' ') // روزانه: فقط ماه و روز
                                : `${dateParts[2]} ${dateParts[1]} ${dateParts[3]} ${dateParts[0]}`; // کوتاه‌مدت/بلندمدت: ماه، روز، سال و روز هفته
                            })() : '---'}</span>
                            <span className="text-slate-500">/</span>
                            <span className="text-slate-300">نمایش از: {toPersianDate(new Date(getScheduleDate(goal))).split(' ').slice(1, 3).join(' ')}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-emerald-200 bg-white/10 rounded-full px-2 py-1 shrink-0">تکمیل شده</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6">
        <div className="relative p-3 sm:p-4 md:p-5 rounded-[20px] sm:rounded-[24px] border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 backdrop-blur-xl flex flex-col gap-3 md:gap-4 overflow-hidden transition-all duration-500 hover:border-cyan-300/60 hover:shadow-[0_26px_70px_-34px_rgba(0,0,0,0.95)]">
          <div className="absolute inset-0 opacity-40 pointer-events-none">
            <div className="absolute -right-10 -top-10 w-44 h-44 bg-emerald-500/20 blur-[100px] animate-float"></div>
            <div className="absolute left-6 bottom-0 w-32 h-32 bg-cyan-500/15 blur-[90px] animate-pulse" style={{ animationDelay: '1.4s' }}></div>
          </div>
          <div className="relative flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex-shrink-0">
                <div className="text-xs sm:text-sm text-slate-300">رادار پیشرفت اهداف</div>
                <div className="text-lg sm:text-xl font-bold text-white flex items-center gap-1.5 sm:gap-2">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300 flex-shrink-0" />
                  <span>{rangeLabel(chartRange)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {chartRanges.map(r => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={chartCategoryClass(chartRange === r) + " whitespace-nowrap text-[11px] sm:text-xs"}
                >
                  {rangeLabel(r)}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-[240px] sm:h-[280px] md:h-[320px] relative min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGoals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis
                  type="number"
                  dataKey="index"
                  domain={[0, Math.max(chartData.length - 1, 0)]}
                  ticks={ticks}
                  tickFormatter={(value) => chartData[value]?.date || ''}
                  stroke="#94a3b8"
                  tick={{ fontSize: 9 }}
                  padding={{ left: 5, right: 5 }}
                  allowDecimals={false}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <YAxis 
                  allowDecimals={false} 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 9 }} 
                  width={30}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ color: '#34d399', fontWeight: 'bold' }}
                  labelFormatter={(idx: any) => chartData[idx]?.fullDate || chartData[idx]?.date || ''}
                  formatter={(value: any) => [`${value} هدف`, 'تکمیل']}
                />
                <Area type="monotone" dataKey="count" stroke="#34d399" fillOpacity={1} fill="url(#colorGoals)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            {!chartData.some(d => d.count > 0) && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs sm:text-sm px-4 text-center">
                هنوز تکمیلی در این بازه ثبت نشده است.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>

      {noteModal.open && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/70 backdrop-blur">
          <div className="relative w-full max-w-lg glass-card border border-cyan-400/40 rounded-3xl overflow-hidden shadow-[0_25px_80px_-35px_rgba(34,211,238,0.6)]">
            <div className="absolute inset-0 opacity-50 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900"></div>
            <div className="relative p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-cyan-200/80">یادداشت روز {noteModal.date}</p>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <NotebookPen className="w-5 h-5 text-emerald-300" />
                    {noteModal.targetTitle}
                  </h3>
                </div>
                <button
                  onClick={closeNoteModal}
                  className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition border border-white/10"
                  aria-label="بستن یادداشت"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full h-32 rounded-2xl bg-slate-900/70 border border-white/10 text-white text-sm p-3 focus:border-cyan-400/60 outline-none"
                placeholder="توضیحی کوتاه درباره پیشرفت این هدف بنویسید..."
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">اگر خالی بگذارید، یادداشت حذف می‌شود.</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={closeNoteModal}
                    className="px-3 py-2 rounded-xl border border-white/10 text-slate-200 hover:border-slate-400/50 transition"
                  >
                    بستن
                  </button>
                  <button
                    onClick={saveNote}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-900 font-bold shadow-[0_0_18px_rgba(34,211,238,0.45)] hover:from-cyan-300 hover:to-emerald-300"
                  >
                    ذخیره یادداشت
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {detailsModal.open && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl">
          <div className="relative w-full max-w-2xl glass-card border border-cyan-400/40 rounded-3xl overflow-hidden shadow-[0_25px_80px_-35px_rgba(34,211,238,0.6)]">
            <div className="absolute inset-0 opacity-50 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900"></div>
            <div className="relative p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-cyan-300" />
                    {detailsModal.title}
                  </h3>
                </div>
                <button
                  onClick={() => setDetailsModal({ open: false, text: '', title: '' })}
                  className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition border border-white/10"
                  aria-label="بستن جزئیات"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="rounded-2xl bg-slate-900/70 border border-white/10 text-white text-sm p-4 leading-relaxed whitespace-pre-wrap break-words">
                {detailsModal.text}
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDetailsModal({ open: false, text: '', title: '' })}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-900 font-bold shadow-[0_0_18px_rgba(34,211,238,0.45)] hover:from-cyan-300 hover:to-emerald-300"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
