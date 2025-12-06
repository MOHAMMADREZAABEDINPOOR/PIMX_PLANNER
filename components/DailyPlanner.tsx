import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowRight, ArrowLeft, CheckCircle, Plus, Trash2, Calendar, 
  Activity, Settings, X, Database, Sparkles, Flame, Clock3, SlidersHorizontal, NotebookPen 
} from 'lucide-react';
import { Habit, AdHocTask, DailyPlan, TimeRange, DayNote, NoteTargetType } from '../types';
import { storage, toISODate, toPersianDate, getRelativeDate } from '../utils';
import { RangeProgressRow, RANGE_WINDOWS, RangeProgressItem, clampRangePercent } from './RangeProgressRow';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { chartCategoryClass } from './chartCategoryStyles';

const HABIT_IMPACT_WEIGHT = 5;

const WEEKDAY_OPTIONS = [
  { id: 6, label: "شنبه" },
  { id: 0, label: "یکشنبه" },
  { id: 1, label: "دوشنبه" },
  { id: 2, label: "سه‌شنبه" },
  { id: 3, label: "چهارشنبه" },
  { id: 4, label: "پنجشنبه" },
  { id: 5, label: "جمعه" },
];

const DEFAULT_HABITS: Habit[] = [
  { id: "h1", title: "گرم کردن صبحگاهی", completed: false, isCustom: false, scheduleDays: [] },
  { id: "h2", title: "مرور درس‌های امروز", completed: false, isCustom: false, scheduleDays: [] },
  { id: "h3", title: "مدیتیشن کوتاه", completed: false, isCustom: false, scheduleDays: [] },
  { id: "h4", title: "ورزش سبک ۱۵ دقیقه‌ای", completed: false, isCustom: false, scheduleDays: [] },
  { id: "h5", title: "برنامه‌ریزی فردا", completed: false, isCustom: false, scheduleDays: [] },
  { id: "h6", title: "مطالعه عمیق ۳۰ دقیقه", completed: false, isCustom: false, scheduleDays: [] },
  { id: "h7", title: "استراحت کوتاه بدون موبایل", completed: false, isCustom: false, scheduleDays: [] },
];

const RANGE_LABELS: Record<TimeRange, string> = {
  "1W": "۱ هفته",
  "2W": "۲ هفته",
  "1M": "۱ ماه",
  "2M": "۲ ماه",
  "4M": "۴ ماه",
  "6M": "۶ ماه",
  "1Y": "۱ سال"
};

const normalizeHabit = (habit: Habit): Habit => ({
  ...habit,
  scheduleDays: habit.scheduleDays ?? []
});

const habitMatchesDate = (habit: Habit, date: Date) => {
  const day = date.getDay();
  const days = habit.scheduleDays ?? [];
  return days.length === 0 || days.includes(day);
};

  const getHabitScheduleLabel = (habit: Habit) => {
  const days = habit.scheduleDays ?? [];
  if (days.length === 0) return "هر روز";
  const labels = WEEKDAY_OPTIONS.filter(w => days.includes(w.id)).map(w => w.label);
  return labels.join('، ');
};

export const DailyPlanner: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [habitInput, setHabitInput] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskImpact, setNewTaskImpact] = useState<number>(10);
  const [historyRange, setHistoryRange] = useState<TimeRange>('1W');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isManagingHabits, setIsManagingHabits] = useState(false);
  const [globalHabits, setGlobalHabits] = useState<Habit[]>([]);
  const [isAdvancedHabitsOpen, setIsAdvancedHabitsOpen] = useState(false);
  const [advancedHabitId, setAdvancedHabitId] = useState<string | null>(null);
  const [advancedScheduleDays, setAdvancedScheduleDays] = useState<number[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notesByDate, setNotesByDate] = useState<Record<string, DayNote[]>>({});
  const [noteModal, setNoteModal] = useState<{
    open: boolean;
    targetId: string;
    targetType: NoteTargetType;
    targetTitle: string;
    date: string;
  }>({ open: false, targetId: '', targetType: 'habit', targetTitle: '', date: '' });
  const [noteText, setNoteText] = useState('');
  const [hasHydratedFromServer, setHasHydratedFromServer] = useState(false);
  const currentDateRef = useRef<Date>(currentDate);

  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);

  useEffect(() => {
    let cancelled = false;

    const hydrateFromServer = async () => {
      try {
        const data = await storage.syncFromServer([
          storage.keys.DAILY_PLANS,
          storage.keys.GLOBAL_HABITS,
          storage.keys.NOTES
        ]);
        if (!data || cancelled) return;

        const serverGlobals = (data[storage.keys.GLOBAL_HABITS] as Habit[] | undefined) ?? [];
        if (serverGlobals.length) {
          const normalized = serverGlobals.map(normalizeHabit);
          setGlobalHabits(normalized);
          try {
            localStorage.setItem(storage.keys.GLOBAL_HABITS, JSON.stringify(normalized));
          } catch {}
        }

        const serverNotes = data[storage.keys.NOTES] as Record<string, DayNote[]> | undefined;
        if (serverNotes) {
          setNotesByDate(serverNotes);
          try {
            localStorage.setItem(storage.keys.NOTES, JSON.stringify(serverNotes));
          } catch {}
        }

        const serverPlans = data[storage.keys.DAILY_PLANS] as Record<string, DailyPlan> | undefined;
        if (serverPlans) {
          const normalizedPlans = Object.fromEntries(
            Object.entries(serverPlans).map(([date, p]) => [
              date,
              { ...p, habits: (p.habits || []).map(normalizeHabit) }
            ])
          ) as Record<string, DailyPlan>;
          try {
            localStorage.setItem(storage.keys.DAILY_PLANS, JSON.stringify(normalizedPlans));
          } catch {}
          const currentIso = toISODate(currentDateRef.current);
          if (normalizedPlans[currentIso]) {
            setPlan(normalizedPlans[currentIso]);
          }
        }
      } finally {
        if (!cancelled) {
          setHasHydratedFromServer(true);
        }
      }
    };

    void hydrateFromServer();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const storedGlobals = storage.get<Habit[]>(storage.keys.GLOBAL_HABITS, []);
    if (storedGlobals.length > 0) {
      const normalized = storedGlobals.map(normalizeHabit);
      setGlobalHabits(normalized);
      storage.set(storage.keys.GLOBAL_HABITS, normalized);
    } else if (hasHydratedFromServer) {
      setGlobalHabits(DEFAULT_HABITS);
      storage.set(storage.keys.GLOBAL_HABITS, DEFAULT_HABITS);
    }
  }, [hasHydratedFromServer]);

  useEffect(() => {
    if (globalHabits.length === 0) {
      setAdvancedHabitId(null);
      setAdvancedScheduleDays([]);
      return;
    }

    const hasSelected = advancedHabitId && globalHabits.some(h => h.id === advancedHabitId);
    if (!hasSelected) {
      const first = globalHabits[0];
      setAdvancedHabitId(first.id);
      setAdvancedScheduleDays(first.scheduleDays ?? []);
    }
  }, [globalHabits, advancedHabitId]);

  useEffect(() => {
    const isoDate = toISODate(currentDate);
    const allPlans = storage.get<Record<string, DailyPlan>>(storage.keys.DAILY_PLANS, {});

    if (allPlans[isoDate]) {
      const hydratedHabits = (allPlans[isoDate].habits || []).map(normalizeHabit);
      const hydrated = { ...allPlans[isoDate], habits: hydratedHabits };
      setPlan(hydrated);
      allPlans[isoDate] = hydrated;
      storage.set(storage.keys.DAILY_PLANS, allPlans);
    } else {
      const currentGlobals = storage.get<Habit[]>(storage.keys.GLOBAL_HABITS, DEFAULT_HABITS).map(normalizeHabit);
      const weekday = currentDate.getDay();
      const todaysHabits = currentGlobals.filter(h => (h.scheduleDays ?? []).length === 0 || (h.scheduleDays ?? []).includes(weekday));
      const newPlan: DailyPlan = {
        date: isoDate,
        habits: todaysHabits.map(h => ({ ...h, completed: false })),
        tasks: []
      };
      setPlan(newPlan);
    }
  }, [currentDate]);

  useEffect(() => {
    if (!plan) return;
    const weekday = currentDate.getDay();
    const applicableGlobals = globalHabits.filter(h => (h.scheduleDays ?? []).length === 0 || (h.scheduleDays ?? []).includes(weekday));
    const existingMap = new Map(plan.habits.map(h => [h.id, h]));
    const merged = applicableGlobals.map(h => {
      const found = existingMap.get(h.id);
      return found ? { ...h, completed: found.completed } : { ...h, completed: false };
    });
    const normalizeForCompare = (arr: Habit[]) => [...arr]
      .map(h => ({ ...h, _key: (h.scheduleDays ?? []).slice().sort().join(',') }))
      .sort((a, b) => a.id.localeCompare(b.id));
    const mergedNormalized = normalizeForCompare(merged);
    const currentNormalized = normalizeForCompare(plan.habits);
    const isSame = mergedNormalized.length === currentNormalized.length &&
      mergedNormalized.every((h, idx) => h.id === currentNormalized[idx].id && h._key === currentNormalized[idx]._key && h.completed === currentNormalized[idx].completed);
    if (!isSame) {
      savePlan({ ...plan, habits: merged });
    }
  }, [globalHabits, currentDate, plan]);


  useEffect(() => {
    const getDaysFromRange = (range: TimeRange) => {
      switch(range) {
        case '1W': return 7;
        case '2W': return 14;
        case '1M': return 30;
        case '2M': return 60;
        case '4M': return 120;
        case '6M': return 180;
        case '1Y': return 365;
        default: return 7;
      }
    };

    const days = getDaysFromRange(historyRange);
    const data = [];
    const allPlans = storage.get<Record<string, DailyPlan>>(storage.keys.DAILY_PLANS, {});
    
    for (let i = days - 1; i >= 0; i--) {
      const d = getRelativeDate(-i);
      const iso = toISODate(d);
      const p = allPlans[iso];
      const persianDateParts = toPersianDate(d).split(' ');
      const day = persianDateParts[1] || '';
      const month = persianDateParts[2] || '';
      const year = persianDateParts[3] || '';
      const dateLabel = [day, month].filter(Boolean).join(' ');
      const fullDateLabel = [day, month, year].filter(Boolean).join(' ');
      
      let percentage = 0;
      let points = 0;
      if (p) {
        const totalHabits = p.habits.length;
        const completedHabits = p.habits.filter(h => h.completed).length;
        const totalTaskImpact = p.tasks.reduce((sum, t) => sum + t.impactScore, 0);
        const completedTaskImpact = p.tasks.reduce((sum, t) => t.completed ? sum + t.impactScore : sum, 0);
        const totalScore = (totalHabits * HABIT_IMPACT_WEIGHT) + totalTaskImpact;
        const earnedScore = (completedHabits * HABIT_IMPACT_WEIGHT) + completedTaskImpact;
        percentage = totalScore === 0 ? 0 : Math.round((earnedScore / totalScore) * 100);
        points = earnedScore;
      }
      
      data.push({
        date: dateLabel,
        fullDate: fullDateLabel,
        percentage,
        points
      });
    }
    setHistoryData(data);
  }, [historyRange, plan]);

  const showSaveFeedback = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const savePlan = (updatedPlan: DailyPlan) => {
    const normalizedPlan = { ...updatedPlan, habits: (updatedPlan.habits || []).map(normalizeHabit) };
    setPlan(normalizedPlan);
    const allPlans = storage.get<Record<string, DailyPlan>>(storage.keys.DAILY_PLANS, {});
    allPlans[normalizedPlan.date] = normalizedPlan;
    storage.set(storage.keys.DAILY_PLANS, allPlans);
  };

  const toggleHabit = (id: string) => {
    if (!plan || isManagingHabits) return;
    const updatedHabits = plan.habits.map(h => 
      h.id === id ? { ...h, completed: !h.completed } : h
    );
    savePlan({ ...plan, habits: updatedHabits });
    showSaveFeedback();
  };

  const handleAddHabit = () => {
    if (!habitInput.trim()) return;
    const newId = Date.now().toString();
    const newHabit: Habit = { id: newId, title: habitInput, completed: false, isCustom: !isManagingHabits, scheduleDays: [] };

    const updatedGlobals = [...globalHabits, newHabit];
    setGlobalHabits(updatedGlobals);
    storage.set(storage.keys.GLOBAL_HABITS, updatedGlobals);

    if (plan) {
      const shouldShow = habitMatchesDate(newHabit, currentDate);
      const nextHabits = shouldShow ? [...plan.habits, newHabit] : plan.habits;
      savePlan({ ...plan, habits: nextHabits });
    }

    setHabitInput('');
    showSaveFeedback();
  };

  const handleDeleteGlobalHabit = (id: string) => {
    const newGlobals = globalHabits.filter(h => h.id !== id);
    setGlobalHabits(newGlobals);
    storage.set(storage.keys.GLOBAL_HABITS, newGlobals);
    if (plan) savePlan({ ...plan, habits: plan.habits.filter(h => h.id !== id) });
  };

  const updateHabitSchedule = (id: string, days: number[]) => {
    const updatedGlobals = globalHabits.map(h => h.id === id ? { ...h, scheduleDays: days } : h);
    setGlobalHabits(updatedGlobals);
    storage.set(storage.keys.GLOBAL_HABITS, updatedGlobals);

    if (!plan) return;
    const shouldShow = days.length === 0 || days.includes(currentDate.getDay());
    let updatedHabits = plan.habits.map(h => h.id === id ? { ...h, scheduleDays: days } : h);

    if (shouldShow) {
      const exists = updatedHabits.some(h => h.id === id);
      if (!exists) {
        const source = updatedGlobals.find(h => h.id === id);
        if (source) updatedHabits.push({ ...source, completed: false });
      }
    } else {
      updatedHabits = updatedHabits.filter(h => h.id !== id);
    }

    savePlan({ ...plan, habits: updatedHabits });
  };

  const openAdvancedHabits = (habitId?: string) => {
    const fallback = habitId
      ? globalHabits.find(h => h.id === habitId)
      : (advancedHabitId ? globalHabits.find(h => h.id === advancedHabitId) : undefined);
    const target = fallback || globalHabits[0];
    if (!target) return;
    setAdvancedHabitId(target.id);
    setAdvancedScheduleDays(target.scheduleDays ?? []);
    setIsAdvancedHabitsOpen(true);
  };

  const selectAdvancedHabit = (id: string) => {
    setAdvancedHabitId(id);
    const found = globalHabits.find(h => h.id === id);
    setAdvancedScheduleDays(found?.scheduleDays ?? []);
  };

  const toggleAdvancedDay = (day: number) => {
    setAdvancedScheduleDays(prev => {
      const exists = prev.includes(day);
      const next = exists ? prev.filter(d => d !== day) : [...prev, day];
      return [...next].sort((a, b) => a - b);
    });
  };

  const setAdvancedAlways = () => setAdvancedScheduleDays([]);

  const applyAdvancedSchedule = () => {
    if (!advancedHabitId) return;
    const uniqueDays = Array.from(new Set(advancedScheduleDays)).sort((a, b) => a - b);
    updateHabitSchedule(advancedHabitId, uniqueDays);
    setIsAdvancedHabitsOpen(false);
    showSaveFeedback();
  };


  const addTask = () => {
    if (!plan || !newTaskTitle.trim()) return;
    const newTask: AdHocTask = { id: Date.now().toString(), title: newTaskTitle, impactScore: newTaskImpact, completed: false };
    savePlan({ ...plan, tasks: [...plan.tasks, newTask] });
    setNewTaskTitle('');
    setNewTaskImpact(10);
    showSaveFeedback();
  };

  const toggleTask = (id: string) => {
    if (!plan) return;
    const updatedTasks = plan.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    savePlan({ ...plan, tasks: updatedTasks });
    showSaveFeedback();
  };

  const removeTask = (id: string) => {
    if (!plan) return;
    savePlan({ ...plan, tasks: plan.tasks.filter(t => t.id !== id) });
    showSaveFeedback();
  };

  const changeDate = (days: number) => {
    setCurrentDate(prev => getRelativeDate(days, prev));
  };

  const calculatePlanPercent = (inputPlan?: DailyPlan | null) => {
    if (!inputPlan) return 0;
    const totalHabitsValue = inputPlan.habits.length;
    const completedHabitsValue = inputPlan.habits.filter(h => h.completed).length;
    const totalTaskImpactValue = inputPlan.tasks.reduce((sum, t) => sum + t.impactScore, 0);
    const completedTaskImpactValue = inputPlan.tasks.reduce((sum, t) => (t.completed ? sum + t.impactScore : sum), 0);
    const totalScoreValue = totalHabitsValue * HABIT_IMPACT_WEIGHT + totalTaskImpactValue;
    if (totalScoreValue <= 0) return 0;
    return Math.round(((completedHabitsValue * HABIT_IMPACT_WEIGHT + completedTaskImpactValue) / totalScoreValue) * 100);
  };

  const rangeProgressItems: RangeProgressItem[] = useMemo(() => {
    const allPlans = storage.get<Record<string, DailyPlan>>(storage.keys.DAILY_PLANS, {});
    const averageForWindow = (days: number) => {
      const span = Math.max(days, 1);
      let total = 0;
      for (let i = 0; i < span; i++) {
        const iso = toISODate(getRelativeDate(-i));
        total += calculatePlanPercent(allPlans[iso]);
      }
      return clampRangePercent(total / span);
    };
    return RANGE_WINDOWS.map(window => ({
      ...window,
      value: averageForWindow(window.days)
    }));
  }, [plan, currentDate]);

  useEffect(() => {
    setNotesByDate(storage.get(storage.keys.NOTES, {}));
  }, []);

  const persistNotes = (next: Record<string, DayNote[]>) => {
    setNotesByDate(next);
    storage.set(storage.keys.NOTES, next);
  };

  const getExistingNote = (date: string, targetType: NoteTargetType, targetId: string) =>
    (notesByDate[date] || []).find(n => n.targetType === targetType && n.targetId === targetId);

  const openNoteModal = (targetType: NoteTargetType, targetId: string, targetTitle: string) => {
    if (!plan) return;
    const date = plan.date;
    const existing = getExistingNote(date, targetType, targetId);
    setNoteText(existing?.text || '');
    setNoteModal({
      open: true,
      targetId,
      targetType,
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

  if (!plan) return <div className="text-white">در حال بارگذاری...</div>;

  const habitImpactWeight = HABIT_IMPACT_WEIGHT;
  const totalHabits = plan.habits.length;
  const completedHabits = plan.habits.filter(h => h.completed).length;
  const totalTasks = plan.tasks.length;
  const completedTasks = plan.tasks.filter(t => t.completed).length;
  const totalTaskImpact = plan.tasks.reduce((sum, t) => sum + t.impactScore, 0);
  const completedTaskImpact = plan.tasks.reduce((sum, t) => t.completed ? sum + t.impactScore : sum, 0);
  const totalScore = (totalHabits * habitImpactWeight) + totalTaskImpact;
  const earnedScore = (completedHabits * habitImpactWeight) + completedTaskImpact;
  const completionPercent = calculatePlanPercent(plan);
  const progressRingStyle = {
    background: `conic-gradient(#22d3ee ${completionPercent * 3.6}deg, rgba(148,163,184,0.25) ${completionPercent * 3.6}deg)`
  };
  const dayNotes = notesByDate[plan.date] || [];
  const selectedAdvancedHabit = advancedHabitId ? globalHabits.find(h => h.id === advancedHabitId) : null;
  const isAdvancedAlways = advancedScheduleDays.length === 0;
  const advancedPreviewLabel = selectedAdvancedHabit
    ? getHabitScheduleLabel({ ...selectedAdvancedHabit, scheduleDays: advancedScheduleDays })
    : "زمان‌بندی انتخاب نشده";

  const HistoryTooltip = ({ active, payload, dataKeyLabel = 'percentage' }: any) => {
    if (!active || !payload || !payload.length) return null;
    const entry = payload[0].payload;
    const value = entry[dataKeyLabel];
    const labelTitle = dataKeyLabel === 'points' ? 'امتیاز' : 'percentage';
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white shadow-lg min-w-[140px]">
        <div className="font-bold text-cyan-300 mb-1">{entry.fullDate || entry.date}</div>
        <div className="text-xs text-slate-300">{labelTitle}: {value}</div>
      </div>
    );
  };

  return (
    <>
    <div className="space-y-6 animate-enter pb-12 relative">
      {saveSuccess && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
            <div className="glass-card px-5 py-3 rounded-2xl border border-emerald-400/40 text-emerald-100 flex items-center gap-2 shadow-[0_15px_50px_-20px_rgba(16,185,129,0.6)]">
              <Database className="w-4 h-4" />
              <span className="text-sm font-semibold">ذخیره شد</span>
            </div>
          </div>
      )}

      <div className="relative overflow-hidden rounded-[32px] border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 shadow-[0_20px_70px_-30px_rgba(34,211,238,0.5)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.16),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(56,189,248,0.14),transparent_40%),radial-gradient(circle_at_60%_70%,rgba(16,185,129,0.12),transparent_45%)]"></div>
        <div className="absolute -left-20 top-10 w-48 h-48 bg-cyan-500/24 blur-[90px] animate-[spin_14s_linear_infinite]"></div>
        <div className="absolute -right-24 -top-16 w-64 h-64 bg-purple-500/18 blur-[110px] animate-[spin_16s_linear_infinite] [animation-direction:reverse]"></div>
        <div className="absolute right-10 -bottom-8 w-40 h-40 bg-emerald-500/15 blur-[100px] animate-float"></div>
        <div className="relative flex flex-col xl:flex-row gap-6 xl:items-center">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-cyan-100/80 font-mono">
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>جزئیات روز</span>
            </div>
              <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-2xl md:text-3xl font-black text-white drop-shadow-lg">
                <Calendar className="w-7 h-7 text-cyan-300" />
                {toPersianDate(currentDate)}
              </div>
              <span className="px-3 py-1.5 rounded-full bg-cyan-500/15 text-cyan-100 border border-cyan-400/40 text-xs font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4" />
                بهره‌وری: {completionPercent}%
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => changeDate(1)} className="group px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-400/40 text-emerald-100 hover:text-white hover:border-emerald-300/60 transition-all flex items-center gap-2">
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                روز بعد
              </button>
              <button onClick={() => changeDate(-1)} className="group px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-emerald-400/40 text-emerald-100 hover:text-white hover:border-emerald-300/60 transition-all flex items-center gap-2">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
                روز قبل
              </button>
              <div className="px-4 py-2 rounded-xl bg-slate-900/70 border border-emerald-500/25 text-xs text-emerald-100 font-mono">
                {toISODate(currentDate)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="relative w-32 h-32 shrink-0">
              <div className="absolute inset-0 rounded-full border border-emerald-500/30" style={progressRingStyle}></div>
              <div className="absolute inset-[8px] rounded-full bg-slate-950/80 border border-white/10 flex flex-col items-center justify-center text-white shadow-[0_20px_45px_-18px_rgba(16,185,129,0.55)]">
                <div className="text-3xl font-black">{completionPercent}%</div>
                <div className="text-[11px] text-slate-400">درصد تکمیل</div>
              </div>
            </div>
              <div className="grid grid-cols-2 gap-3 text-sm min-w-[220px]">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/12 to-transparent"></div>
                <div className="relative text-emerald-100 text-xs">عادت‌ها</div>
                <div className="relative text-white font-bold text-lg">{completedHabits}/{totalHabits || 0}</div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2.5">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/15 to-transparent"></div>
                <div className="relative text-cyan-100 text-xs">Tasks</div>
                <div className="relative text-white font-bold text-lg">{completedTasks}/{totalTasks}</div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-purple-400/25 bg-purple-500/10 px-3 py-2.5 col-span-2">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/15 via-cyan-400/10 to-transparent"></div>
                <div className="relative flex items-center justify-between">
                  <div>
                    <div className="text-purple-100 text-xs">Total score</div>
                    <div className="text-white font-bold text-lg">{earnedScore}/{totalScore || 0}</div>
                  </div>
                  <Clock3 className="w-5 h-5 text-purple-200" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="group relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-slate-900/60 p-4">
            <div className="absolute inset-0 opacity-60 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-200/80">عادت‌های انجام‌شده</p>
                <p className="text-xl font-bold text-white">{completedHabits}/{totalHabits || 0}</p>
              </div>
              <div className="h-2 w-28 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full" style={{ width: `${totalHabits ? (completedHabits / totalHabits) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-purple-400/25 bg-slate-900/60 p-4">
            <div className="absolute inset-0 opacity-60 bg-gradient-to-r from-purple-400/15 via-transparent to-transparent"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-100/90">کارهای انجام‌شده</p>
                <p className="text-xl font-bold text-white">{completedTasks}/{totalTasks}</p>
              </div>
              <div className="h-2 w-28 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full" style={{ width: `${totalTasks ? (completedTasks / totalTasks) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-slate-900/60 p-4">
            <div className="absolute inset-0 opacity-60 bg-gradient-to-r from-cyan-400/15 via-transparent to-transparent"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs text-cyan-100/90">امتیاز کسب‌شده</p>
                <p className="text-xl font-bold text-white">{earnedScore}</p>
              </div>
              <div className="h-2 w-28 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full" style={{ width: `${totalScore ? (earnedScore / totalScore) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <RangeProgressRow
        title="ریتم بازه‌ای برنامه‌ریزی"
        subtitle="میانگین درصد انجام از ۳ روزه تا یک‌ساله"
        items={rangeProgressItems}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className={`relative xl:col-span-1 p-6 rounded-[24px] border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 transition-all duration-300 overflow-hidden ${isManagingHabits ? 'border-cyan-500/15 shadow-[0_0_25px_rgba(34,211,238,0.25)]' : 'border-cyan-500/15'} flex flex-col xl:h-[720px]`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(34,197,94,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.08),transparent_30%)]"></div>
            <div className="relative flex justify-between items-center mb-6">
              <div>
                <p className="text-xs text-slate-400">لیست عادت‌ها</p>
                <h3 className={`text-xl font-bold flex items-center gap-2 ${isManagingHabits ? 'text-cyan-300' : 'text-emerald-300'}`}>
                  <Activity className="w-5 h-5" />
                  {isManagingHabits ? 'مدیریت عادت‌ها' : 'عادت‌های امروز'}
                </h3>
              </div>
            <div className="flex items-center gap-2">
              {isManagingHabits && (
                <button
                  onClick={() => openAdvancedHabits()}
                  className="px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-100 hover:bg-cyan-500/25 hover:text-white transition flex items-center gap-2 text-xs font-semibold"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  زمان‌بندی پیشرفته
                </button>
              )}
              <button onClick={() => setIsManagingHabits(!isManagingHabits)} className={`p-2 rounded-xl transition ${isManagingHabits ? 'bg-cyan-500 text-slate-900 hover:bg-cyan-400' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                {isManagingHabits ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
              </button>
            </div>
            </div>

          <div className="relative flex-1 min-h-0 space-y-3 overflow-y-auto custom-scrollbar pr-1 py-2">
            {plan.habits.map(habit => (
              <div
                key={habit.id}
                onClick={() => toggleHabit(habit.id)}
                className={`relative group flex items-center gap-3 p-3 rounded-2xl border overflow-hidden transition-all hover:z-10 focus-within:z-10 ${isManagingHabits ? 'cursor-default bg-slate-900/70 border-slate-800' : habit.completed ? 'bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 border-emerald-400/30' : 'bg-slate-900/60 border-white/5 hover:border-emerald-400/40 hover:-translate-y-0.5 cursor-pointer'}`}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent"></div>
                {!isManagingHabits && (
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors border ${habit.completed ? 'bg-emerald-500 text-slate-900 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-slate-800 text-slate-300 border-white/10'}`}>
                    {habit.completed && <CheckCircle className="w-4 h-4" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold break-words ${!isManagingHabits && habit.completed ? 'text-emerald-100/60 line-through' : 'text-white'}`}>
                    {habit.title}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{getHabitScheduleLabel(habit)}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); openNoteModal('habit', habit.id, habit.title); }}
                  className="p-2 rounded-lg border border-white/10 bg-slate-900/60 hover:border-cyan-300/60 hover:text-white transition text-slate-300 flex items-center gap-1"
                  title="یادداشت برای این عادت"
                >
                  <NotebookPen className="w-4 h-4" />
                  {dayNotes.some(n => n.targetType === 'habit' && n.targetId === habit.id) && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                  )}
                </button>
                {isManagingHabits && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteGlobalHabit(habit.id); }}
                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {plan.habits.length === 0 && <div className="text-center text-slate-500 py-4 text-sm border border-dashed border-slate-700 rounded-xl">هنوز عادتی برای امروز ثبت نشده است.</div>}
          </div>

          <div className="relative mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-2 shrink-0">
            <input
              type="text"
              placeholder={isManagingHabits ? "عنوان عادت را وارد کنید..." : "عادت جدید..."}
              value={habitInput}
              onChange={(e) => setHabitInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddHabit()}
              className="flex-1 glass-input rounded-xl px-3 py-3 text-sm text-white outline-none bg-slate-950/60"
            />
            <button onClick={handleAddHabit} className={`px-4 py-2 rounded-xl text-white font-semibold transition ${isManagingHabits ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-900' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="relative p-6 rounded-[24px] border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden xl:col-span-2 flex flex-col xl:h-[720px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(16,185,129,0.08),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.06),transparent_30%)]"></div>
          <div className="relative flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs text-slate-400">کارهای امروز</p>
                <h3 className="text-xl font-bold text-emerald-300 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-300" />
                  لیست کارها
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-100">{completedTasks} کار انجام‌شده</span>
                <span className="px-3 py-1 rounded-full bg-slate-950/70 border border-white/10 text-slate-200">امتیاز کل: {totalTaskImpact}</span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 shrink-0">
              <input
                type="text"
                placeholder="عنوان کار..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-grow glass-input rounded-xl px-4 py-3 text-white outline-none bg-slate-950/60"
              />
              <div className="flex items-center gap-2 glass-input rounded-xl px-3 py-2 bg-slate-950/60">
                <span className="text-xs text-slate-400 whitespace-nowrap">امتیاز:</span>
                <input
                  type="number"
                  min="0.25"
                  max="20"
                  step="0.25"
                  value={newTaskImpact}
                  onChange={(e) => setNewTaskImpact(parseFloat(e.target.value))}
                  className="w-16 bg-transparent text-center text-emerald-300 font-bold outline-none"
                />
              </div>
              <button
                onClick={addTask}
                className="bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition shadow-[0_0_20px_rgba(16,185,129,0.35)]"
              >
                افزودن
              </button>
            </div>

            <div className="space-y-3 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
              {plan.tasks.length === 0 && <div className="text-center text-slate-500 py-10 border-2 border-dashed border-slate-700 rounded-2xl">هیچ کاری برای امروز ثبت نشده است.</div>}
              {plan.tasks.map(task => (
                <div
                  key={task.id}
                  className={`relative flex items-start justify-between p-4 rounded-2xl border overflow-hidden transition-all ${task.completed ? 'bg-gradient-to-r from-emerald-500/12 to-cyan-500/10 border-emerald-400/30 opacity-85' : 'bg-slate-900/60 border-white/5 hover:border-emerald-400/30 hover:-translate-y-0.5'}`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition ${task.completed ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.35)]' : 'border-slate-500 hover:border-emerald-400'}`}
                    >
                      {task.completed && <CheckCircle className="w-4 h-4 text-slate-900" />}
                    </button>
                    <div className="min-w-0">
                      <div className={`text-lg font-medium break-words ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>{task.title}</div>
                      <div className="text-xs text-emerald-300/80">امتیاز: {task.impactScore}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-950/70 border border-white/10 text-slate-300">کار سفارشی</span>
                    <button
                      onClick={() => openNoteModal('task', task.id, task.title)}
                      className="p-2 rounded-lg border border-white/10 bg-slate-900/60 hover:border-cyan-300/60 hover:text-white transition text-slate-300 flex items-center gap-1"
                      title="یادداشت برای این کار"
                    >
                      <NotebookPen className="w-4 h-4" />
                      {dayNotes.some(n => n.targetType === 'task' && n.targetId === task.id) && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                      )}
                    </button>
                    <button onClick={() => removeTask(task.id)} className="text-slate-600 hover:text-red-400 transition p-1.5 rounded-lg hover:bg-red-500/10">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

        <div className="relative p-6 rounded-[24px] border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden xl:col-span-3">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.08),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(168,85,247,0.06),transparent_35%)]"></div>
            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <p className="text-xs text-slate-400">مرور عملکرد</p>
                <h3 className="text-xl font-bold text-cyan-300 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-emerald-300" />
                  روند عملکرد (تاریخچه)
                </h3>
              </div>
              <div className="flex flex-wrap md:flex-nowrap justify-between bg-slate-900/50 rounded-lg p-1 overflow-x-auto w-full no-scrollbar border border-white/10 gap-2">
                {(['1W', '2W', '1M', '2M', '4M', '6M', '1Y'] as TimeRange[]).map(r => (
                  <button
                    key={r}
                    onClick={() => setHistoryRange(r)}
                    className={`${chartCategoryClass(historyRange === r)} flex-1 md:flex-none min-w-[88px] text-center text-sm`}
                  >
                    {RANGE_LABELS[r]}
                  </button>
                ))}
              </div>
          </div>
          <div className="w-full min-w-0 space-y-6">
            <div>
              <div className="text-sm text-slate-300 mb-2">نمودار درصد پیشرفت</div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.85}/>
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 10}} interval="preserveStartEnd" minTickGap={30} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{fontSize: 10}} width={30} />
                    <Tooltip content={<HistoryTooltip />} />
                    <Area type="monotone" dataKey="percentage" stroke="#22d3ee" fill="url(#colorPerf)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-300 mb-2">نمودار امتیازها</div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.85}/>
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 10}} interval="preserveStartEnd" minTickGap={30} />
                    <YAxis domain={[0, 'auto']} stroke="#94a3b8" tick={{fontSize: 10}} width={34} />
                    <Tooltip content={<HistoryTooltip dataKeyLabel="points" />} />
                    <Area type="monotone" dataKey="points" stroke="#34d399" fill="url(#colorPoints)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
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
                  <p className="text-xs text-cyan-200/80">یادداشت روز {plan.date}</p>
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
                placeholder="مثلا: امروز ۲۰ صفحه کتاب خواندم..."
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

      {isAdvancedHabitsOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl">
          <div className="relative w-full max-w-5xl max-h-[90vh] glass-card border border-cyan-400/40 rounded-3xl overflow-hidden shadow-[0_25px_90px_-40px_rgba(34,211,238,0.6)] overflow-y-auto">
            <div className="absolute inset-0 opacity-70 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900"></div>
            <div className="relative p-6 md:p-8 lg:p-10 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-cyan-200/80">تنظیمات زمان‌بندی عادت‌ها</p>
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-cyan-300" />
                    <h3 className="text-2xl font-bold text-white">زمان‌بندی پیشرفته عادت‌ها</h3>
                  </div>
                  <p className="text-sm text-slate-300">روزهای اجرای هر عادت را انتخاب کن تا برنامه دقیق‌تر شود.</p>
                </div>
                <button
                  onClick={() => setIsAdvancedHabitsOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {globalHabits.map(habit => {
                    const active = advancedHabitId === habit.id;
                    return (
                      <button
                        key={habit.id}
                        onClick={() => selectAdvancedHabit(habit.id)}
                        className={`w-full text-right rounded-xl px-3 py-2 border transition flex flex-col gap-1 ${active ? 'border-cyan-400/60 bg-cyan-500/10 text-white shadow-[0_0_15px_rgba(34,211,238,0.25)]' : 'border-white/5 bg-slate-900/40 text-slate-200 hover:border-cyan-400/40 hover:text-white'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold truncate">{habit.title}</span>
                          <span className={`w-2 h-2 rounded-full ${active ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Activity className="w-3 h-3 text-emerald-300" />
                          <span className="truncate">{getHabitScheduleLabel(habit)}</span>
                        </div>
                      </button>
                    );
                  })}
                  {globalHabits.length === 0 && (
                    <div className="text-center text-slate-500 text-sm py-6 border border-dashed border-slate-700 rounded-xl">
                      هیچ عادتی پیدا نشد.
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 bg-slate-900/60 border border-cyan-400/30 rounded-2xl p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-400">عادت انتخابی</div>
                      <div className="text-lg font-semibold text-white">{selectedAdvancedHabit?.title || 'هنوز هیچ عادتی انتخاب نشده'}</div>
                      <div className="text-xs text-emerald-300 mt-1">{advancedPreviewLabel}</div>
                    </div>
                    <button
                      onClick={setAdvancedAlways}
                      className={`px-3 py-2 rounded-xl border text-sm font-semibold transition ${isAdvancedAlways ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-100' : 'border-white/10 text-slate-200 hover:border-emerald-300/60 hover:text-white'}`}
                    >
                      همه روزها
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {WEEKDAY_OPTIONS.map(day => {
                      const active = advancedScheduleDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          disabled={!selectedAdvancedHabit}
                          onClick={() => selectedAdvancedHabit && toggleAdvancedDay(day.id)}
                          className={`rounded-xl border px-3 py-3 text-sm flex items-center justify-between transition ${active ? 'bg-cyan-500/15 border-cyan-400/60 text-white' : 'bg-slate-900/50 border-white/5 text-slate-200 hover:border-cyan-400/40'} ${!selectedAdvancedHabit ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span>{day.label}</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-slate-600'}`}></span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-300 flex-1 min-w-[240px]">
                      نکته: هر عادت می‌تواند برای روزهای خاص یا حالت «همیشه» تنظیم شود؛ در حالت همیشه عادت هر روز نمایش داده می‌شود مگر روزی را حذف کنید.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={applyAdvancedSchedule}
                        disabled={!selectedAdvancedHabit}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-900 font-bold shadow-[0_0_18px_rgba(34,211,238,0.45)] hover:from-cyan-300 hover:to-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ذخیره زمان‌بندی
                      </button>
                      <button
                        onClick={() => setIsAdvancedHabitsOpen(false)}
                        className="px-3 py-2 rounded-xl border border-white/10 text-slate-200 hover:text-white hover:border-slate-400/50 transition"
                      >
                        بستن
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};


