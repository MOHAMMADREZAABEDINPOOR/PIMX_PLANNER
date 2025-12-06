import React, { useEffect, useMemo, useState } from 'react';
import { storage, getPersianMonthDays, toISODate, getRelativeDate } from '../utils';
import { DailyPlan, VideoLog, GradeEntry, Goal, DayNote } from '../types';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Play,
  Award,
  Calendar,
  BarChart2,
  Target,
  Sparkles,
  Activity,
  Flame,
  NotebookPen
} from 'lucide-react';
import { RangeProgressRow, RANGE_WINDOWS, RangeProgressItem, clampRangePercent } from './RangeProgressRow';

type DaySnapshot = {
  date: Date;
  plan?: DailyPlan;
  videoCount: number;
  gradeCount: number;
  goalCount: number;
  goals: Goal[];
  videos?: VideoLog[];
  grades?: GradeEntry[];
  notes?: DayNote[];
  noteCount: number;
};

type TimelineTone = 'emerald' | 'cyan' | 'amber' | 'pink' | 'slate';
export const CalendarSection: React.FC = () => {
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [calendarData, setCalendarData] = useState<{ days: any[]; currentMonth: number; currentYear: number }>(
    () => getPersianMonthDays(new Date())
  );
  const [plans, setPlans] = useState<Record<string, DailyPlan>>({});
  const [videoLogs, setVideoLogs] = useState<VideoLog[]>([]);
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notesByDate, setNotesByDate] = useState<Record<string, DayNote[]>>({});
  const [selectedDayStats, setSelectedDayStats] = useState<DaySnapshot | null>(null);

  useEffect(() => {
    setPlans(storage.get(storage.keys.DAILY_PLANS, {}));
    setVideoLogs(storage.get(storage.keys.VIDEO_LOGS, []));
    setGrades(storage.get(storage.keys.GRADES, []));
    setGoals(storage.get(storage.keys.GOALS, []));
    setNotesByDate(storage.get(storage.keys.NOTES, {}));
  }, []);

  useEffect(() => {
    setCalendarData(getPersianMonthDays(viewDate));
  }, [viewDate]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
    setSelectedDayStats(null);
  };

  const safeIsoFromString = (value?: string | null) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : toISODate(d);
  };

  const normalizePlan = (plan?: DailyPlan) => {
    if (!plan) return undefined;
    return {
      ...plan,
      habits: Array.isArray(plan.habits) ? plan.habits : [],
      tasks: Array.isArray(plan.tasks) ? plan.tasks : []
    };
  };

  const getDayStats = (date: Date) => {
    const iso = toISODate(date);
    const plan = normalizePlan(plans[iso]);
    const videos = videoLogs.filter(v => v.date === iso);
    const daysGrades = grades.filter(g => g.date === iso);
    const dayGoals = goals.filter(g => {
      const completedIso = g.completed ? safeIsoFromString(g.completedAt) : null;
      return g.completed && completedIso === iso;
    });
    const notes = notesByDate[iso] || [];

    let score = 0;
    if (plan) {
      const habitImpact = 5;
      const totalHabits = plan.habits.length;
      const totalTaskImpact = plan.tasks.reduce((sum, t) => sum + (Number.isFinite(t.impactScore) ? t.impactScore : 0), 0);
      const totalScore = totalHabits * habitImpact + totalTaskImpact;
      const earnedScore =
        plan.habits.filter(h => h.completed).length * habitImpact +
        plan.tasks.reduce((sum, t) => (t.completed ? sum + (Number.isFinite(t.impactScore) ? t.impactScore : 0) : sum), 0);
      score = totalScore === 0 ? 0 : Math.round((earnedScore / totalScore) * 100);
    }

    return { score, plan, videos, daysGrades, dayGoals, notes };
  };

  // Auto-select today when component first loads, and refresh selected day stats when data changes
  useEffect(() => {
    const targetDate = selectedDayStats?.date || new Date();
    const { plan, videos, daysGrades, dayGoals, notes } = getDayStats(targetDate);
    setSelectedDayStats({
      date: targetDate,
      plan,
      videoCount: videos.reduce((acc, v) => acc + (Number.isFinite(v.count) ? v.count : 0), 0),
      gradeCount: daysGrades.length,
      goalCount: dayGoals.length,
      goals: dayGoals,
      videos,
      grades: daysGrades,
      notes,
      noteCount: notes.length
    });
  }, [plans, videoLogs, grades, goals, notesByDate]);

  const handleDayClick = (date: Date) => {
    const { plan, videos, daysGrades, dayGoals, notes } = getDayStats(date);
    setSelectedDayStats({
      date,
      plan,
      videoCount: videos.reduce((acc, v) => acc + (Number.isFinite(v.count) ? v.count : 0), 0),
      gradeCount: daysGrades.length,
      goalCount: dayGoals.length,
      goals: dayGoals,
      videos,
      grades: daysGrades,
      notes,
      noteCount: notes.length
    });
  };

  const shiftSelectedDay = (offset: number) => {
    const baseDate = selectedDayStats?.date || viewDate;
    const nextDate = new Date(baseDate);
    nextDate.setDate(baseDate.getDate() + offset);
    setViewDate(nextDate);
    handleDayClick(nextDate);
  };

  const weekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
  const monthName = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', year: 'numeric' }).format(viewDate);

  const monthlyHighlights = useMemo(() => {
    const monthDays = calendarData.days.filter(d => d.isCurrentMonth);

    let totalScore = 0;
    let scoreDays = 0;
    let videoTotal = 0;
    let gradeTotal = 0;
    let goalTotal = 0;

    monthDays.forEach(day => {
      const { score, videos, daysGrades, dayGoals } = getDayStats(day.date);
      if (score > 0) {
        totalScore += score;
        scoreDays += 1;
      }
      videoTotal += videos.reduce((acc, v) => acc + v.count, 0);
      gradeTotal += daysGrades.length;
      goalTotal += dayGoals.length;
    });

    return {
      efficiency: Math.round(totalScore / (scoreDays || 1)),
      videoTotal,
      gradeTotal,
      goalTotal
    };
  }, [calendarData, plans, videoLogs, grades, goals]);

  const activeDate = selectedDayStats?.date || viewDate;
  const activeDateLabel = useMemo(
    () => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long', year: 'numeric' }).format(activeDate),
    [activeDate]
  );
  const activeDayNumber = useMemo(
    () => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric' }).format(activeDate),
    [activeDate]
  );
  const activeMonthLabel = useMemo(
    () => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', year: 'numeric' }).format(activeDate),
    [activeDate]
  );
  const activeWeekday = useMemo(
    () => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long' }).format(activeDate),
    [activeDate]
  );

  const averageEfficiencyRange = (startOffset: number, length: number) => {
    if (length <= 0) return 0;
    let total = 0;
    for (let i = 0; i < length; i++) {
      const date = getRelativeDate(-(startOffset + i));
      total += getDayStats(date).score;
    }
    return Math.round(total / length);
  };

  const today = new Date();
  const todayIso = toISODate(today);
  const dailyEfficiency = getDayStats(today).score;
  const weeklyEfficiency = averageEfficiencyRange(0, 7);
  const biWeeklyEfficiency = averageEfficiencyRange(0, 14);
  const monthlyWindowEfficiency = averageEfficiencyRange(0, 30);

  const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

  const getDailyCounts = (date: Date) => {
    const { videos, daysGrades, dayGoals } = getDayStats(date);
    const videoCount = videos.reduce((acc, v) => acc + (Number.isFinite(v.count) ? v.count : 0), 0);
    const gradeCount = daysGrades.length;
    const goalCount = dayGoals.length;
    return { videoCount, gradeCount, goalCount };
  };

  const activeDayProgress = useMemo(() => {
    const baseDate = activeDate;
    const isFuture = baseDate > today;

    const current = getDailyCounts(baseDate);
    const prevDate = new Date(baseDate);
    prevDate.setDate(baseDate.getDate() - 1);
    const previous = getDailyCounts(prevDate);

    const growth = (currentValue: number, previousValue: number) => {
      if (isFuture) return 0;
      if (previousValue <= 0) return currentValue > 0 ? 100 : 0;
      if (currentValue <= previousValue) return 0;
      const delta = ((currentValue - previousValue) / previousValue) * 100;
      return clampPercent(delta);
    };

    return {
      counts: current,
      videoPercent: growth(current.videoCount, previous.videoCount),
      goalPercent: growth(current.goalCount, previous.goalCount)
    };
  }, [activeDate, videoLogs, grades, goals]);

  const videoDailyPercent = activeDayProgress.videoPercent;
  const goalDailyPercent = activeDayProgress.goalPercent;

  const goalCompletionItems: RangeProgressItem[] = useMemo(() => {
    const parseIso = (value?: string | null) => (value ? safeIsoFromString(value) : null);
    const todayDate = new Date(`${todayIso}T12:00:00`);

    const dayProductivity = (iso: string) => {
      const plan = normalizePlan(plans[iso]);
      const tasks = plan?.tasks || [];
      const habits = plan?.habits || [];
      const goalsForDay = goals.filter(goal => {
        const scheduledIso = parseIso(goal.scheduledFor) || parseIso(goal.createdAt);
        return scheduledIso === iso;
      });
      const completedGoalsForDay = goalsForDay.filter(goal => {
        const completedIso = parseIso(goal.completedAt);
        return goal.completed && completedIso === iso;
      });

      const plannedCount = tasks.length + habits.length + goalsForDay.length;
      if (plannedCount === 0) return 0;

      const completedCount =
        tasks.filter(t => t.completed).length +
        habits.filter(h => h.completed).length +
        completedGoalsForDay.length;

      return clampPercent((completedCount / plannedCount) * 100);
    };

    return RANGE_WINDOWS.map(window => {
      let sum = 0;
      for (let i = 0; i < window.days; i++) {
        const iso = toISODate(getRelativeDate(-i, todayDate));
        sum += dayProductivity(iso);
      }
      const average = sum / window.days;
      return { ...window, value: clampRangePercent(Number(average.toFixed(2))) };
    });
  }, [goals, plans, todayIso]);

  const heatDays = calendarData.days.filter(d => d.isCurrentMonth);
  const visibleCalendarDays = useMemo(() => {
    const days = calendarData.days;
    const firstIdx = days.findIndex(d => d.isCurrentMonth);
    const lastIdx = [...days].reverse().findIndex(d => d.isCurrentMonth);
    if (firstIdx === -1 || lastIdx === -1) return days;
    const lastActualIdx = days.length - 1 - lastIdx;
    const startRow = Math.floor(firstIdx / 7);
    const endRow = Math.floor(lastActualIdx / 7);
    return days.slice(startRow * 7, (endRow + 1) * 7);
  }, [calendarData]);
  const selectedEfficiency = selectedDayStats ? getDayStats(selectedDayStats.date).score : monthlyHighlights.efficiency;
  const selectedNotes = selectedDayStats?.notes || [];

  const timelineEvents = useMemo(() => {
    if (!selectedDayStats) return [];
    const events: { id: string; title: string; hint?: string; tone: TimelineTone; icon: React.ReactElement }[] = [];

    selectedDayStats.plan?.tasks.forEach(t => {
      events.push({
        id: `task-${t.id}`,
        title: `تسک: ${t.title}`,
        hint: t.completed ? 'انجام شد' : `در انتظار | امتیاز ${t.impactScore}`,
        tone: t.completed ? 'emerald' : 'amber',
        icon: <CheckCircle2 className={t.completed ? 'text-emerald-300' : 'text-amber-300'} />
      });
    });

    selectedDayStats.plan?.habits.forEach(h => {
      events.push({
        id: `habit-${h.id}`,
        title: `عادت: ${h.title}`,
        hint: h.completed ? 'تمام شد' : 'در انتظار',
        tone: h.completed ? 'emerald' : 'slate',
        icon: <Activity className={h.completed ? 'text-emerald-300' : 'text-slate-300'} />
      });
    });

    (selectedDayStats.videos || []).forEach((v, idx) => {
      events.push({
        id: `video-${v.id || idx}`,
        title: `${v.count} ویدیو`,
        hint: `${v.subject}`,
        tone: 'cyan',
        icon: <Play className="text-cyan-300 fill-cyan-300/30" />
      });
    });

    (selectedDayStats.notes || []).forEach(note => {
      events.push({
        id: `note-${note.id}`,
        title: `یادداشت: ${note.targetTitle}`,
        hint: note.text,
        tone: 'slate',
        icon: <NotebookPen className="text-emerald-300" />
      });
    });

    (selectedDayStats.grades || []).forEach((g, idx) => {
      events.push({
        id: `grade-${g.id || idx}`,
        title: `نمره ${g.score}/20`,
        hint: `${g.subject}`,
        tone: 'pink',
        icon: <Award className="text-pink-300" />
      });
    });

    selectedDayStats.goals.forEach((g, idx) => {
      events.push({
        id: `goal-${g.id || idx}`,
        title: `هدف: ${g.text}`,
        hint: 'ثبت شده',
        tone: 'emerald',
        icon: <Target className="text-emerald-300" />
      });
    });

    return events;
  }, [selectedDayStats]);
  const dayPlan = selectedDayStats?.plan;
  const planTasks = dayPlan?.tasks || [];
  const planHabits = dayPlan?.habits || [];

  const toneStyles: Record<TimelineTone, string> = {
    emerald: 'border-emerald-400/30 bg-emerald-500/5 text-emerald-50',
    cyan: 'border-cyan-400/30 bg-cyan-500/5 text-cyan-50',
    amber: 'border-amber-400/30 bg-amber-500/5 text-amber-50',
    pink: 'border-pink-400/30 bg-pink-500/5 text-pink-50',
    slate: 'border-white/10 bg-white/5 text-slate-100'
  };

  return (
    <div className="space-y-7 animate-enter" dir="rtl">
      <div className="relative overflow-hidden rounded-[32px] border border-cyan-500/25 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 shadow-[0_24px_80px_-32px_rgba(34,211,238,0.9)] backdrop-blur-xl">
        <div className="absolute inset-0 pointer-events-none opacity-70">
          <div className="absolute -left-24 -top-24 w-64 h-64 bg-cyan-500/18 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute right-10 -bottom-20 w-72 h-72 bg-emerald-500/12 rounded-full blur-[130px] animate-float"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_40%,rgba(34,211,238,0.14),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(56,189,248,0.12),transparent_30%),radial-gradient(circle_at_60%_80%,rgba(16,185,129,0.12),transparent_32%)]"></div>
        </div>

        <div className="relative flex flex-col xl:flex-row gap-6 items-start xl:items-center">
          <div className="space-y-4 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/70 border border-cyan-400/30 text-cyan-200 text-xs tracking-wide">
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>کپسول زمان | مرور ماهانه</span>
            </div>

            <div className="flex flex-col gap-2 text-white">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-cyan-300" />
                <h2 className="text-3xl md:text-4xl font-black tracking-tight">تقویم، نمره و برنامه‌ی هر روز</h2>
              </div>
              <p className="text-sm md:text-base text-slate-200/70 leading-relaxed max-w-3xl">
                برای هر روز می‌توانی برنامه، ویدیوها، نمره‌ها و اهداف تکمیل‌شده را ببینی. روی روز دلخواه کلیک کن تا جزئیات کامل را همین‌جا ببینی.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => changeMonth(1)}
                className="p-3 rounded-2xl border border-white/10 bg-white/5 text-slate-200 hover:text-cyan-200 hover:-translate-y-0.5 transition-all shadow-[0_10px_40px_-20px_rgba(34,211,238,0.4)]"
              >
                <ArrowRight />
              </button>
              <div className="px-5 py-3 rounded-2xl border border-cyan-400/30 bg-white/5 text-2xl font-black text-white backdrop-blur shadow-[0_10px_30px_-15px_rgba(34,211,238,0.7)]">
                {monthName}
              </div>
              <button
                onClick={() => changeMonth(-1)}
                className="p-3 rounded-2xl border border-white/10 bg-white/5 text-slate-200 hover:text-cyan-200 hover:-translate-y-0.5 transition-all shadow-[0_10px_40px_-20px_rgba(34,211,238,0.4)]"
              >
                <ArrowLeft />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-cyan-400/40 bg-white/5 p-4 shadow-[0_12px_40px_-24px_rgba(34,211,238,0.8)] flex flex-col items-center gap-3">
                <div className="w-full flex items-center justify-between text-[11px] text-slate-300">
                  <span className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-300" />
                    امروز
                  </span>
                  <span className="text-slate-200 font-semibold">{dailyEfficiency}%</span>
                </div>
                <div className="relative w-20 h-20 md:w-24 md:h-24">
                  <div
                    className="absolute inset-0 rounded-full border border-cyan-400/40"
                    style={{
                      background: `conic-gradient(#22d3ee ${dailyEfficiency * 3.6}deg, rgba(148,163,184,0.25) ${
                        dailyEfficiency * 3.6
                      }deg)`
                    }}
                  ></div>
                  <div className="absolute inset-2 rounded-full bg-slate-950/90 border border-white/10 flex flex-col items-center justify-center text-center px-2">
                    <div className="text-lg md:text-2xl font-black text-white">{dailyEfficiency}%</div>
                    <div className="text-[9px] md:text-[11px] text-slate-400">امتیاز امروز</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-400/40 bg-white/5 p-4 flex flex-col items-center gap-3">
                <div className="w-full flex items-center justify-between text-[11px] text-slate-300">
                  <span>۷ روز اخیر</span>
                  <span className="text-emerald-200 font-semibold">{weeklyEfficiency}%</span>
                </div>
                <div className="relative w-20 h-20 md:w-24 md:h-24">
                  <div
                    className="absolute inset-0 rounded-full border border-emerald-400/40"
                    style={{
                      background: `conic-gradient(#10b981 ${weeklyEfficiency * 3.6}deg, rgba(34,197,94,0.2) ${
                        weeklyEfficiency * 3.6
                      }deg)`
                    }}
                  ></div>
                  <div className="absolute inset-2 rounded-full bg-slate-950/90 border border-white/10 flex flex-col items-center justify-center text-center px-2">
                    <div className="text-lg md:text-2xl font-black text-white">{weeklyEfficiency}%</div>
                    <div className="text-[9px] md:text-[11px] text-slate-400">میانگین هفته</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-400/40 bg-white/5 p-4 flex flex-col items-center gap-3">
                <div className="w-full flex items-center justify-between text-[11px] text-slate-300">
                  <span>۲ هفته اخیر</span>
                  <span className="text-amber-200 font-semibold">{biWeeklyEfficiency}%</span>
                </div>
                <div className="relative w-20 h-20 md:w-24 md:h-24">
                  <div
                    className="absolute inset-0 rounded-full border border-amber-400/40"
                    style={{
                      background: `conic-gradient(#fbbf24 ${biWeeklyEfficiency * 3.6}deg, rgba(251,191,36,0.2) ${
                        biWeeklyEfficiency * 3.6
                      }deg)`
                    }}
                  ></div>
                  <div className="absolute inset-2 rounded-full bg-slate-950/90 border border-white/10 flex flex-col items-center justify-center text-center px-2">
                    <div className="text-lg md:text-2xl font-black text-white">{biWeeklyEfficiency}%</div>
                    <div className="text-[9px] md:text-[11px] text-slate-400">ریتم ۱۴ روزه</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-cyan-400/40 bg-white/5 p-4 flex flex-col items-center gap-3">
                <div className="w-full flex items-center justify-between text-[11px] text-slate-300">
                  <span>ماه اخیر</span>
                  <span className="text-cyan-200 font-semibold">{monthlyWindowEfficiency}%</span>
                </div>
                <div className="relative w-20 h-20 md:w-24 md:h-24">
                  <div
                    className="absolute inset-0 rounded-full border border-cyan-400/40"
                    style={{
                      background: `conic-gradient(#22d3ee ${monthlyWindowEfficiency * 3.6}deg, rgba(148,163,184,0.25) ${
                        monthlyWindowEfficiency * 3.6
                      }deg)`
                    }}
                  ></div>
                  <div className="absolute inset-2 rounded-full bg-slate-950/90 border border-white/10 flex flex-col items-center justify-center text-center px-2">
                    <div className="text-lg md:text-2xl font-black text-white">{monthlyWindowEfficiency}%</div>
                    <div className="text-[9px] md:text-[11px] text-slate-400">میانگین ماهانه</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full xl:w-96 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>روزهای ماه</span>
                <span>{heatDays.length} روز</span>
              </div>
              <div className="flex items-end gap-1 h-16">
                {heatDays.map((day, idx) => {
                  const { score } = getDayStats(day.date);
                  const height = Math.max(12, Math.min(64, (score / 100) * 64));
                  return (
                    <div key={idx} className="flex-1">
                      <div
                        className="w-full rounded-full bg-slate-800/60 overflow-hidden shadow-[0_6px_20px_-12px_rgba(34,211,238,0.6)] transition-all duration-300"
                        style={{
                          height,
                          background:
                            score > 0
                              ? 'linear-gradient(180deg, rgba(34,211,238,0.7) 0%, rgba(16,185,129,0.4) 60%, rgba(15,23,42,0.8) 100%)'
                              : 'rgba(255,255,255,0.05)'
                        }}
                      ></div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                <span>کم</span>
                <span>زیاد</span>
              </div>
            </div>
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-50 px-4 py-3 text-sm shadow-[0_15px_35px_-28px_rgba(16,185,129,0.8)]">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4" />
                <span>ثبات روزانه را با رصد نمره و عادت‌ها حفظ کن.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RangeProgressRow
        title="ریتم بازدهی کلی"
        subtitle="درصد تکمیل عادت‌ها، کارها و اهداف در بازه‌های ۳ روزه تا یک‌ساله"
        items={goalCompletionItems}
        className="relative flex"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-cyan-400/35 bg-gradient-to-br from-[#0a1c2c] via-[#0f2236] to-slate-950/85 p-4 flex flex-col items-center gap-3 shadow-[0_16px_44px_-28px_rgba(34,211,238,0.45)]">
          <div className="w-full flex items-center justify-between text-[11px] text-slate-200">
            <span className="flex items-center gap-2">
              <Play className="w-4 h-4 text-cyan-300" />
              ویدیوهای امروز
            </span>
            <span className="text-slate-200 font-semibold">{activeDayProgress.counts.videoCount}</span>
          </div>
          <div className="relative w-20 h-20 md:w-24 md:h-24">
            <div
              className="absolute inset-0 rounded-full border border-cyan-400/40"
              style={{
                background: `conic-gradient(#22d3ee ${videoDailyPercent * 3.6}deg, rgba(148,163,184,0.25) ${
                  videoDailyPercent * 3.6
                }deg)`
              }}
            ></div>
            <div className="absolute inset-2 rounded-full bg-slate-950/90 border border-white/10 flex flex-col items-center justify-center text-center px-2">
              <div className="text-lg md:text-2xl font-black text-white">{videoDailyPercent}%</div>
              <div className="text-[9px] md:text-[11px] text-slate-400">ریتم مطالعه ویدیو</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            درصد رشد تعداد ویدیوهای این روز نسبت به روز قبل؛ اگر کمتر یا برابر دیروز باشد، ۰٪ نمایش داده می‌شود.
          </p>
        </div>
        <div className="rounded-2xl border border-rose-400/40 bg-gradient-to-br from-[#1a0b0c] via-[#2a0f1a] to-slate-950/90 p-4 flex flex-col items-center gap-3 shadow-[0_18px_52px_-30px_rgba(248,113,113,0.6)]">
          <div className="w-full flex items-center justify-between text-[11px] text-rose-50">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-rose-300" />
              پیشرفت روزانه
            </span>
            <span className="text-rose-100 font-semibold">{selectedEfficiency}%</span>
          </div>
          <div className="relative w-20 h-20 md:w-24 md:h-24">
            <div
              className="absolute inset-0 rounded-full border border-rose-400/50"
              style={{
                background: `conic-gradient(#ef4444 ${selectedEfficiency * 3.6}deg, rgba(239,68,68,0.22) ${
                  selectedEfficiency * 3.6
                }deg)`
              }}
            ></div>
            <div className="absolute inset-2 rounded-full bg-slate-950/90 border border-white/10 flex flex-col items-center justify-center text-center px-2">
              <div className="text-lg md:text-2xl font-black text-white">{selectedEfficiency}%</div>
              <div className="text-[9px] md:text-[11px] text-rose-100/80">عادت‌ها و کارهای امروز</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            درصد تکمیل عادت‌ها و کارهای روزانه در همین روز؛ ترکیبی از همه‌ی تسک‌ها و عادت‌های ثبت‌شده.
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-400/35 bg-gradient-to-br from-[#0a1f18] via-[#0f2b22] to-slate-950/85 p-4 flex flex-col items-center gap-3 shadow-[0_16px_44px_-28px_rgba(16,185,129,0.45)]">
          <div className="w-full flex items-center justify-between text-[11px] text-slate-200">
            <span className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-300" />
              اهداف امروز
            </span>
            <span className="text-slate-200 font-semibold">{activeDayProgress.counts.goalCount}</span>
          </div>
          <div className="relative w-20 h-20 md:w-24 md:h-24">
            <div
              className="absolute inset-0 rounded-full border border-emerald-400/40"
              style={{
                background: `conic-gradient(#10b981 ${goalDailyPercent * 3.6}deg, rgba(16,185,129,0.25) ${
                  goalDailyPercent * 3.6
                }deg)`
              }}
            ></div>
            <div className="absolute inset-2 rounded-full bg-slate-950/90 border border-white/10 flex flex-col items-center justify-center text-center px-2">
              <div className="text-lg md:text-2xl font-black text-white">{goalDailyPercent}%</div>
              <div className="text-[9px] md:text-[11px] text-slate-400">پیشرفت اهداف</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            درصد رشد تعداد اهداف تکمیل‌شده این روز نسبت به روز قبل؛ روزهای آینده یا بدون رشد با ۰٪ نمایش داده می‌شوند.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-6 items-start mt-6">
        <div className="flex flex-col gap-6">
        <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-slate-950/80 p-5 md:p-6 backdrop-blur min-h-[620px] flex flex-col">
            <div className="absolute inset-0 opacity-60 pointer-events-none">
              <div className="absolute -left-16 top-10 w-44 h-44 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse"></div>
              <div className="absolute right-0 -bottom-10 w-56 h-56 bg-purple-500/10 rounded-full blur-[120px] animate-float"></div>
            </div>
            <div className="relative space-y-4 flex-1 flex flex-col">
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 md:gap-3 text-center text-[11px] sm:text-[12px] font-bold text-cyan-200/80 uppercase">
                {weekDays.map(d => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="flex-1 pr-1">
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 md:gap-3">
              {visibleCalendarDays.map((day, idx) => {
                const { score, videos, daysGrades, dayGoals, notes } = getDayStats(day.date);
                const isToday = toISODate(new Date()) === toISODate(day.date);
                const isSelected = selectedDayStats && toISODate(selectedDayStats.date) === toISODate(day.date);

                const glow =
                  score > 0 ? 'from-rose-400/25 to-rose-500/10' : 'from-slate-700/40 to-slate-800/40';

                return (
                  <div
                    key={idx}
                    onClick={() => handleDayClick(day.date)}
                    className={`relative aspect-[4/6] sm:aspect-[9/12] rounded-2xl cursor-pointer transition-all duration-300 group overflow-hidden border ${
                      isSelected
                        ? 'border-emerald-400/50 shadow-[0_0_35px_-12px_rgba(16,185,129,0.8)] scale-105'
                        : 'border-white/10 hover:border-emerald-300/30 hover:scale-105'
                    } ${!day.isCurrentMonth ? 'opacity-40' : 'opacity-100'} ${isToday ? 'ring-2 ring-cyan-400/70 ring-offset-[3px] ring-offset-slate-900' : ''}`}
                    style={{
                      background: `linear-gradient(145deg, rgba(15,23,42,0.8) 0%, rgba(15,23,42,0.6) 50%, rgba(15,23,42,0.9) 100%)`
                    }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${glow} opacity-0 group-hover:opacity-80 transition-opacity duration-500`}></div>
                    {score > 0 && (
                      <div
                        className="absolute inset-1 rounded-[14px] opacity-70"
                        style={{
                          background: `conic-gradient(from 90deg, rgba(239,68,68,0.28) ${score}%, rgba(148,163,184,0.16) ${score}% 100%)`
                        }}
                      ></div>
                    )}
                    <div className="relative z-10 h-full w-full flex flex-col items-center justify-between p-2">
                      <div className="w-full flex items-center justify-between text-[11px] text-slate-400">
                        {isToday ? <span className="text-cyan-200 font-semibold">امروز</span> : <span className="opacity-70">روز</span>}
                        <span className="font-mono text-[10px] text-slate-500">{score ? `${score}%` : ''}</span>
                      </div>

                      <div className="flex-1 flex items-center justify-center">
                        <div className="relative w-12 h-12 rounded-2xl border border-white/10 bg-slate-900/60 flex items-center justify-center text-white font-black text-lg shadow-inner">
                          {day.dayNum}
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full blur-sm bg-white/20"></div>
                        </div>
                      </div>

                      <div className="w-full flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center gap-1">
                          {videos.length > 0 && <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>}
                          {daysGrades.length > 0 && <span className="w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_8px_#f472b6]"></span>}
                          {dayGoals.length > 0 && <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]"></span>}
                          {notes.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_8px_#fbbf24]"></span>}
                        </div>
                        <span className="text-right text-slate-500">{day.isCurrentMonth ? '' : 'ماه دیگر'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
              </div>
            </div>
          </div>

        </div>

        <div className="flex flex-col gap-4 h-full">
        <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 md:p-6 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)] min-h-[620px]">
            <div className="absolute inset-0 pointer-events-none opacity-60">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-500/15 rounded-full blur-[80px]"></div>
              <div className="absolute left-6 bottom-0 w-40 h-40 bg-cyan-500/12 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative flex flex-col gap-4 h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <BarChart2 className="w-5 h-5 text-emerald-300" />
                  <h3 className="text-lg font-black">کارنامه روز</h3>
                </div>
                <div className="text-xs text-slate-400">{selectedDayStats ? 'جزئیات روز انتخابی' : 'یک روز را از تقویم انتخاب کن'}</div>
              </div>

              <div className="flex-1 flex flex-col">
                {selectedDayStats ? (
                  <>
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/80 px-4 py-5 shadow-[0_18px_45px_-28px_rgba(34,211,238,0.8)]">
                    <div className="absolute inset-0 pointer-events-none opacity-70">
                      <div className="absolute -left-16 -top-14 w-36 h-36 bg-emerald-500/12 blur-[90px]"></div>
                      <div className="absolute right-6 -bottom-10 w-44 h-44 bg-cyan-500/14 blur-[110px]"></div>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(34,211,238,0.08),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(16,185,129,0.08),transparent_30%)]"></div>
                    </div>

                    <div className="relative flex flex-col items-center gap-4 w-full">
                      <div className="relative flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center shadow-[0_12px_30px_-20px_rgba(16,185,129,0.7)] overflow-hidden w-full max-w-xl">
                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-60"></div>
                        <div className="text-[11px] text-slate-400 flex items-center justify-center gap-3 mb-2">
                          <span className="h-px w-6 bg-white/10"></span>
                          <span>تاریخ انتخابی</span>
                          <span className="h-px w-6 bg-white/10"></span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <Calendar className="w-6 h-6 text-emerald-300" />
                          <div className="flex items-baseline gap-2 px-3 py-2 rounded-xl bg-slate-900/60 border border-white/10">
                            <span className="text-4xl font-black text-emerald-100 leading-none min-w-[48px] text-center">{activeDayNumber}</span>
                            <div className="flex flex-col items-start text-sm min-w-[120px]">
                              <span className="text-cyan-100 font-semibold w-full text-center">{activeMonthLabel}</span>
                              <div className="flex items-center gap-1 text-[11px] text-slate-300">
                                <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                                <span>{activeWeekday}</span>
                              </div>
                            </div>
                          </div>
                          <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-100 text-sm font-semibold shadow-[0_10px_30px_-24px_rgba(16,185,129,0.9)]">
                            {selectedEfficiency}% امتیاز روز
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between w-full max-w-xl">
                        <button
                          onClick={() => shiftSelectedDay(1)}
                          className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-800/70 to-slate-900/80 border border-white/10 px-4 py-3 text-slate-100 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.9)] transition-all hover:border-cyan-300/40">
                          <span className="text-sm font-semibold">روز بعد</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => shiftSelectedDay(-1)}
                          className="group flex items-center gap-2 rounded-xl bg-gradient-to-l from-slate-800/70 to-slate-900/80 border border-white/10 px-4 py-3 text-slate-100 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.9)] transition-all hover:border-emerald-300/40">
                          <ArrowLeft className="w-4 h-4" />
                          <span className="text-sm font-semibold">روز قبل</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <div className="rounded-2xl border border-cyan-400/20 bg-white/5 p-3 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[11px] text-cyan-200">
                        <Play className="w-4 h-4" />
                        ویدیوهای امروز
                      </div>
                      <div className="text-2xl font-black text-white">{selectedDayStats.videoCount}</div>
                      <div className="text-[11px] text-slate-400">تعداد ویدیو ثبت‌شده</div>
                    </div>
                    <div className="rounded-2xl border border-pink-400/20 bg-white/5 p-3 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[11px] text-pink-200">
                        <Award className="w-4 h-4" />
                        آزمون‌های امروز
                      </div>
                      <div className="text-2xl font-black text-white">{selectedDayStats.gradeCount}</div>
                      <div className="text-[11px] text-slate-400">تعداد نمره ثبت‌شده</div>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/20 bg-white/5 p-3 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[11px] text-emerald-200">
                        <Target className="w-4 h-4" />
                        اهداف امروز
                      </div>
                      <div className="text-2xl font-black text-white">{selectedDayStats.goalCount}</div>
                      <div className="text-[11px] text-slate-400">هدف تکمیل‌شده</div>
                    </div>
                    <div className="rounded-2xl border border-amber-400/30 bg-white/5 p-3 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[11px] text-amber-200">
                        <NotebookPen className="w-4 h-4" />
                        یادداشت‌ها
                      </div>
                      <div className="text-2xl font-black text-white">{selectedDayStats.noteCount || 0}</div>
                      <div className="text-[11px] text-slate-400">یادداشت ثبت‌شده برای این روز</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 gap-3">
                  <div className="w-20 h-20 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                    <Calendar className="w-10 h-10 text-emerald-300" />
                  </div>
                  <div className="text-3xl font-black text-white">{monthName}</div>
                  <div className="text-sm text-slate-400 max-w-xs">
                    میانگین راندمان این ماه: <span className="text-emerald-200 font-bold">{monthlyHighlights.efficiency}%</span>. یک روز را انتخاب کن تا جزئیات ضربانش را ببینی.
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch xl:col-span-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 shadow-[0_20px_50px_-28px_rgba(16,185,129,0.45)] flex flex-col h-[420px]">
            <div className="flex items-center justify-between mb-3 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-300" />
                <span className="font-bold text-sm">عادت‌ها و کارهای روز</span>
              </div>
              <span className="text-xs text-slate-400">{planTasks.length + planHabits.length} مورد</span>
            </div>
            <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {planTasks.length === 0 && planHabits.length === 0 && (
                <div className="text-sm text-slate-500 border border-dashed border-white/10 rounded-xl px-3 py-4 text-center">
                  هنوز عادت یا کاری برای این روز ثبت نشده است.
                </div>
              )}
              {planTasks.map(t => (
                <div
                  key={`task-${t.id}`}
                  className={`flex items-center justify-between text-sm rounded-xl px-3 py-2 border ${
                    t.completed ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-white/5 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${t.completed ? 'text-emerald-300' : 'text-slate-400'}`} />
                    <span className="truncate">{t.title}</span>
                  </div>
                  <span className="text-[11px] text-emerald-200">{t.impactScore}</span>
                </div>
              ))}
              {planHabits.map(h => (
                <div
                  key={`habit-${h.id}`}
                  className={`flex items-center justify-between text-sm rounded-xl px-3 py-2 border ${
                    h.completed ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-white/5 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${h.completed ? 'text-emerald-300' : 'text-slate-400'}`} />
                    <span className="truncate">{h.title}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">{h.completed ? 'تمام شد' : 'در انتظار'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 shadow-[0_20px_50px_-28px_rgba(34,211,238,0.45)] flex flex-col overflow-hidden h-[420px]">
            <div className="flex items-center gap-2 text-white mb-3">
              <Sparkles className="w-5 h-5 text-cyan-300" />
              <span className="font-bold text-sm">خط زمانی روز</span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {timelineEvents.length === 0 ? (
                <p className="text-sm text-slate-500 border border-dashed border-white/10 rounded-xl px-3 py-4 text-center">
                  رویدادی برای این روز ثبت نشده است.
                </p>
              ) : (
                timelineEvents.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${toneStyles[item.tone]} shadow-[0_10px_30px_-24px_rgba(34,211,238,0.6)]`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white leading-tight">{item.title}</div>
                      {item.hint && <div className="text-xs text-slate-400 mt-0.5">{item.hint}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

          <div className="rounded-2xl border border-amber-400/30 bg-slate-950/80 p-5 shadow-[0_18px_45px_-26px_rgba(251,191,36,0.35)] flex flex-col overflow-hidden min-h-[520px] max-h-[700px] w-full max-w-none xl:col-span-2">
          <div className="flex items-center justify-between text-white mb-3">
            <div className="flex items-center gap-2">
              <NotebookPen className="w-5 h-5 text-amber-300" />
              <span className="font-bold text-sm">یادداشت‌های این روز</span>
            </div>
            <span className="text-xs text-slate-400">{selectedNotes.length} یادداشت</span>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {selectedNotes.length === 0 ? (
              <p className="text-sm text-slate-500 border border-dashed border-white/10 rounded-xl px-3 py-4 text-center">
                هیچ یادداشتی برای این روز ثبت نشده است.
              </p>
            ) : (
              selectedNotes.map(note => (
                <div
                  key={note.id}
                  className="flex items-start gap-2 p-4 rounded-xl border border-amber-400/30 bg-amber-500/5 text-amber-50 min-h-[112px] w-full"
                >
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white leading-tight">{note.targetTitle}</div>
                    <div className="text-[11px] text-amber-200/80">
                      {note.targetType === 'habit' ? 'عادت' : note.targetType === 'task' ? 'کار' : 'هدف'}
                    </div>
                    <p className="text-xs text-slate-200 mt-1 leading-relaxed whitespace-pre-wrap break-words">{note.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
