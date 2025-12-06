import React, { useEffect, useMemo, useState } from 'react';
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Calendar, CheckCircle2, Flame, Gauge, Sparkles, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { DailyPlan, Goal } from '../types';
import { getRelativeDate, storage, toISODate, toPersianDate } from '../utils';
import { RangeProgressRow, RANGE_WINDOWS, RangeProgressItem, clampRangePercent } from './RangeProgressRow';

const HABIT_WEIGHT = 5;

const calculateProductivity = (plan?: DailyPlan) => {
  if (!plan) {
    return {
      percent: 0,
      totalHabits: 0,
      completedHabits: 0,
      totalTasks: 0,
      completedTasks: 0,
      earnedScore: 0,
      totalScore: 0
    };
  }

  const totalHabits = plan.habits.length;
  const completedHabits = plan.habits.filter(h => h.completed).length;
  const totalTasks = plan.tasks.length;
  const completedTasks = plan.tasks.filter(t => t.completed).length;
  const totalTaskImpact = plan.tasks.reduce((sum, t) => sum + t.impactScore, 0);
  const completedTaskImpact = plan.tasks.reduce((sum, t) => (t.completed ? sum + t.impactScore : sum), 0);
  const totalScore = totalHabits * HABIT_WEIGHT + totalTaskImpact;
  const earnedScore = completedHabits * HABIT_WEIGHT + completedTaskImpact;
  const percent = totalScore === 0 ? 0 : Math.round((earnedScore / totalScore) * 100);

  return {
    percent,
    totalHabits,
    completedHabits,
    totalTasks,
    completedTasks,
    earnedScore,
    totalScore
  };
};

const calcDelta = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
};

const completionPercent = (completed: number, total: number) => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

const isoFromOffset = (offset: number) => toISODate(getRelativeDate(-offset));

const formatRangeLabel = (value: number) => {
  if (value === 365) return '۱ ساله';
  if (value === 730) return '۲ ساله';
  if (value === 1095) return '۳ ساله';
  if (value >= 30 && value < 360 && value % 30 === 0) return `${value / 30} ماهه`;
  if (value >= 7 && value < 30 && value % 7 === 0) return `${value / 7} هفته اخیر`;
  return `${value} روزه`;
};

export const ProgressSection: React.FC = () => {
  const [plans, setPlans] = useState<Record<string, DailyPlan>>({});
  const [goals, setGoals] = useState<Goal[]>([]);
  const [chartRange, setChartRange] = useState<number>(21);
  const [activeTooltipIndex, setActiveTooltipIndex] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    setPlans(storage.get(storage.keys.DAILY_PLANS, {}));
    setGoals(storage.get(storage.keys.GOALS, []));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const productivityMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof calculateProductivity>> = {};
    Object.entries(plans).forEach(([iso, plan]) => {
      map[iso] = calculateProductivity(plan as DailyPlan);
    });
    return map;
  }, [plans]);

  const goalMap = useMemo(() => {
    const map: Record<string, number> = {};
    goals.forEach(goal => {
      if (goal.completed && goal.completedAt) {
        const iso = toISODate(new Date(goal.completedAt));
        map[iso] = (map[iso] || 0) + 1;
      }
    });
    return map;
  }, [goals]);

  const getProductivityPercent = (iso: string) => productivityMap[iso]?.percent ?? 0;
  const getGoalCount = (iso: string) => goalMap[iso] ?? 0;

  const averageRange = (startOffset: number, length: number, getter: (iso: string) => number) => {
    if (length <= 0) return 0;
    let total = 0;
    for (let i = 0; i < length; i++) {
      total += getter(isoFromOffset(startOffset + i));
    }
    return Math.round(total / length);
  };

  const sumRange = (startOffset: number, length: number, getter: (iso: string) => number) => {
    let total = 0;
    for (let i = 0; i < length; i++) {
      total += getter(isoFromOffset(startOffset + i));
    }
    return total;
  };

  const todayIso = isoFromOffset(0);
  const yesterdayIso = isoFromOffset(1);
  const todayProductivity = getProductivityPercent(todayIso);
  const yesterdayProductivity = getProductivityPercent(yesterdayIso);
  const todayGoals = getGoalCount(todayIso);
  const yesterdayGoals = getGoalCount(yesterdayIso);

  const dailyDelta = calcDelta(todayProductivity, yesterdayProductivity);
  const goalDailyDelta = calcDelta(todayGoals, yesterdayGoals);

  const weeklyAvg = averageRange(0, 7, getProductivityPercent);
  const lastWeeklyAvg = averageRange(7, 7, getProductivityPercent);
  const weeklyDelta = calcDelta(weeklyAvg, lastWeeklyAvg);

  const monthlyAvg = averageRange(0, 30, getProductivityPercent);
  const lastMonthlyAvg = averageRange(30, 30, getProductivityPercent);
  const monthlyDelta = calcDelta(monthlyAvg, lastMonthlyAvg);

  const weeklyGoals = sumRange(0, 7, getGoalCount);
  const lastWeeklyGoals = sumRange(7, 7, getGoalCount);
  const weeklyGoalsDelta = calcDelta(weeklyGoals, lastWeeklyGoals);

  const monthlyGoals = sumRange(0, 30, getGoalCount);
  const lastMonthlyGoals = sumRange(30, 30, getGoalCount);
  const monthlyGoalsDelta = calcDelta(monthlyGoals, lastMonthlyGoals);

  const chartData = useMemo(() => {
    const data: {
      iso: string;
      label: string;
      fullLabel: string;
      habitRate: number;
      taskRate: number;
      goals: number;
    }[] = [];

    for (let i = chartRange - 1; i >= 0; i--) {
      const date = getRelativeDate(-i);
      const iso = toISODate(date);
      const label = toPersianDate(date).split(' ').slice(1, 3).join(' ');
      const fullLabel = toPersianDate(date);
      const detail = productivityMap[iso] || calculateProductivity();
      data.push({
        iso,
        label,
        fullLabel,
        habitRate: completionPercent(detail.completedHabits, detail.totalHabits),
        taskRate: completionPercent(detail.completedTasks, detail.totalTasks),
        goals: getGoalCount(iso)
      });
    }
    return data;
  }, [chartRange, productivityMap, goalMap]);

  useEffect(() => {
    setActiveTooltipIndex(chartData.length ? chartData.length - 1 : 0);
  }, [chartData]);

  const todayDetail = productivityMap[todayIso] || calculateProductivity();
  const momentum = averageRange(0, 3, getProductivityPercent);
  const signed = (value: number) => `${value >= 0 ? '+' : '-'}${Math.abs(value)}%`;

  const aggregateWindow = (startOffset: number, length: number) => {
    let tasksCompleted = 0;
    let tasksTotal = 0;
    let habitsCompleted = 0;
    let habitsTotal = 0;
    let goalsCount = 0;
    let productivitySum = 0;

    const effectiveLength = Math.max(length, 1);

    for (let i = 0; i < effectiveLength; i++) {
      const iso = isoFromOffset(startOffset + i);
      const detail = productivityMap[iso] || calculateProductivity();
      tasksCompleted += detail.completedTasks;
      tasksTotal += detail.totalTasks;
      habitsCompleted += detail.completedHabits;
      habitsTotal += detail.totalHabits;
      goalsCount += goalMap[iso] || 0;
      productivitySum += getProductivityPercent(iso);
    }

    return {
      productivity: Math.round(productivitySum / effectiveLength),
      taskRate: completionPercent(tasksCompleted, tasksTotal),
      habitRate: completionPercent(habitsCompleted, habitsTotal),
      goals: goalsCount,
      tasksCompleted,
      tasksTotal,
      habitsCompleted,
      habitsTotal
    };
  };

  const improvementSnapshots = useMemo(() => {
    const createSnapshot = (
      label: string,
      caption: string,
      gradient: string,
      currentOffset: number,
      currentLength: number,
      previousOffset: number,
      previousLength: number
    ) => {
      const current = aggregateWindow(currentOffset, currentLength);
      const previous = aggregateWindow(previousOffset, previousLength);

      return {
        label,
        caption,
        gradient,
        productivity: {
          current: current.productivity,
          previous: previous.productivity,
          delta: calcDelta(current.productivity, previous.productivity)
        },
        tasks: {
          current: current.taskRate,
          previous: previous.taskRate,
          delta: calcDelta(current.taskRate, previous.taskRate)
        },
        habits: {
          current: current.habitRate,
          previous: previous.habitRate,
          delta: calcDelta(current.habitRate, previous.habitRate)
        },
        goals: {
          current: current.goals,
          previous: previous.goals,
          delta: calcDelta(current.goals, previous.goals)
        }
      };
    };

    return [
      createSnapshot('امروز در برابر دیروز', 'اثر اقدامات امروز نسبت به دیروز', 'from-cyan-400/20 via-emerald-400/15 to-blue-500/10', 0, 1, 1, 1),
      createSnapshot('۷ روز اخیر', 'مقایسه با هفته قبل', 'from-purple-400/20 via-pink-400/10 to-indigo-500/10', 0, 7, 7, 7),
      createSnapshot('۳۰ روز اخیر', 'مقایسه با ۳۰ روز قبل', 'from-amber-400/20 via-orange-400/15 to-rose-500/10', 0, 30, 30, 30)
    ];
  }, [productivityMap, goalMap]);

  const chartRangeSummary = aggregateWindow(0, chartRange);

  const rangeProgressItems: RangeProgressItem[] = useMemo(
    () =>
      RANGE_WINDOWS.map(window => ({
        ...window,
        value: clampRangePercent(averageRange(0, window.days, getProductivityPercent))
      })),
    [productivityMap]
  );

  const deltaBadge = (value: number, label: string) => {
    const isPositive = value >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${isPositive ? 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10' : 'text-rose-200 border-rose-500/30 bg-rose-500/10'}`}>
        <Icon className="w-4 h-4" />
        <span>{Math.abs(value)}%</span>
        <span className="text-[11px] text-slate-200/70">{label}</span>
      </div>
    );
  };

  const chartRanges = isMobile ? [7, 14, 21, 30, 60, 90, 180, 365] : [7, 14, 21, 30, 60, 90, 180, 365, 730];

  const habitsRateToday = completionPercent(todayDetail.completedHabits, todayDetail.totalHabits);
  const tasksRateToday = completionPercent(todayDetail.completedTasks, todayDetail.totalTasks);

  return (
    <div className="space-y-8 md:space-y-10 animate-enter" dir="rtl">
      <div className="relative overflow-hidden rounded-[32px] border border-cyan-500/25 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 shadow-[0_24px_80px_-32px_rgba(34,211,238,0.9)] backdrop-blur-xl transition-all duration-500 hover:border-cyan-400/60 hover:shadow-[0_30px_90px_-40px_rgba(34,211,238,1)]">
        <div className="absolute inset-0 opacity-60 pointer-events-none">
          <div className="absolute -left-20 -top-32 w-72 h-72 bg-cyan-500/24 blur-[120px] animate-pulse"></div>
          <div className="absolute right-[-60px] bottom-[-40px] w-80 h-80 bg-purple-500/26 blur-[140px] animate-[pulse_6s_ease-in-out_infinite]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_30%,rgba(34,211,238,0.18),transparent_45%),radial-gradient(circle_at_80%_15%,rgba(168,85,247,0.16),transparent_45%),radial-gradient(circle_at_50%_85%,rgba(16,185,129,0.18),transparent_45%)] animate-[spin_28s_linear_infinite] mix-blend-screen opacity-70"></div>
        </div>

        <div className="relative flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-cyan-400/30 text-cyan-100 text-xs font-mono tracking-[0.2em]">
              <Sparkles className="w-4 h-4 text-amber-300" />
              گزارش زنده | مدیریت پیشرفت شخصی
            </div>

            <div className="flex flex-wrap items-end gap-4 text-white">
              <div>
                <div className="text-sm text-slate-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-300" />
                  {toPersianDate(new Date())}
                </div>
                <div className="text-3xl md:text-4xl font-black tracking-tight">پیشرفت و تحلیل بهره‌وری</div>
              </div>
              <div className="flex items-center gap-3">
                {deltaBadge(dailyDelta, 'تغییر نسبت به دیروز')}
                {deltaBadge(weeklyDelta, 'میانگین هفتگی نسبت به هفته قبل')}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <div className="text-5xl md:text-6xl font-black text-white drop-shadow-lg">{todayProductivity}%</div>
              <div className="space-y-2 text-sm text-slate-200/80">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>میانگین ۳ روز اخیر: {momentum}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-300" />
                  <span>میانگین ۷ روز اخیر: {weeklyAvg}% | هفته قبل: {lastWeeklyAvg}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-300" />
                  <span>میانگین ۳۰ روز اخیر: {monthlyAvg}%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/70 hover:bg-emerald-500/15">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 via-transparent to-cyan-400/20 opacity-60"></div>
                <div className="relative text-emerald-100 text-xs mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  امتیاز کلی امروز
                </div>
                <div className="relative text-white text-2xl font-bold">
                  {todayDetail.earnedScore}/{todayDetail.totalScore || 0}
                </div>
                <div className="h-2 mt-3 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${todayProductivity}%` }}></div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/70 hover:bg-cyan-500/15">
                <div className="relative text-cyan-100 text-xs mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  تکمیل عادت‌ها
                </div>
                <div className="relative text-white text-2xl font-bold">{habitsRateToday}%</div>
                <div className="text-[11px] text-slate-200/80">{todayDetail.completedHabits}/{todayDetail.totalHabits} عادت</div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-purple-400/30 bg-purple-500/10 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-purple-300/70 hover:bg-purple-500/15">
                <div className="relative text-purple-100 text-xs mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  پیشرفت کارها
                </div>
                <div className="relative text-white text-2xl font-bold">{tasksRateToday}%</div>
                <div className="text-[11px] text-slate-200/80">{todayDetail.completedTasks}/{todayDetail.totalTasks} کار</div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/70 hover:bg-amber-500/15">
                <div className="relative text-amber-100 text-xs mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  اهداف ثبت‌شده امروز
                </div>
                <div className="relative text-white text-2xl font-bold">{todayGoals}</div>
                <div className="text-[11px] text-slate-200/80">تغییر نسبت به دیروز: {goalDailyDelta >= 0 ? '+' : '-'}{Math.abs(goalDailyDelta)}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {improvementSnapshots.map((item, idx) => {
          const positive = item.productivity.delta >= 0;
          const ProdIcon = positive ? TrendingUp : TrendingDown;

          const statPill = (delta: number) => {
            const good = delta >= 0;
            const StatIcon = good ? TrendingUp : TrendingDown;
            return (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] ${good ? 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10' : 'text-rose-200 border-rose-500/30 bg-rose-500/10'}`}>
                <StatIcon className="w-3 h-3" />
                <span>{Math.abs(delta)}%</span>
              </div>
            );
          };

          return (
            <div
              key={idx}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5 backdrop-blur-xl shadow-[0_18px_48px_-26px_rgba(0,0,0,0.85)] group hover:-translate-y-1.5 hover:shadow-[0_28px_70px_-34px_rgba(0,0,0,0.95)] transition-all duration-400"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-70 group-hover:opacity-90 transition-opacity`}></div>
              <div className="absolute -right-8 -top-10 w-32 h-32 bg-white/10 blur-3xl group-hover:rotate-3 transition-transform"></div>
              <div className="relative flex flex-col gap-3 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-slate-200/80">{item.caption}</div>
                    <div className="text-lg font-bold">{item.label}</div>
                  </div>
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full border text-sm font-bold ${positive ? 'text-emerald-100 border-emerald-400/60 bg-emerald-500/20' : 'text-rose-100 border-rose-400/60 bg-rose-500/20'}`}>
                    <ProdIcon className="w-4 h-4" />
                    <span>{signed(item.productivity.delta)}</span>
                  </div>
                </div>

                <div className="flex items-end gap-2">
                  <div className="text-3xl font-black leading-tight">{item.productivity.current}%</div>
                  <div className="text-[11px] text-slate-200/80">نرخ بهره‌وری همین بازه</div>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full ${positive ? 'bg-gradient-to-r from-emerald-400 to-cyan-400' : 'bg-gradient-to-r from-rose-400 to-amber-300'}`}
                    style={{ width: `${Math.min(100, Math.max(0, item.productivity.current))}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs">
                  {[
                    { title: 'اهداف ثبت و انجام‌شده', current: item.goals.current, previous: item.goals.previous, delta: item.goals.delta, suffix: ' هدف' },
                    { title: 'نرخ تکمیل کارها', current: item.tasks.current, previous: item.tasks.previous, delta: item.tasks.delta, suffix: '%' },
                    { title: 'نرخ انجام عادت‌ها', current: item.habits.current, previous: item.habits.previous, delta: item.habits.delta, suffix: '%' }
                  ].map((stat, sIdx) => (
                    <div
                      key={sIdx}
                      className="flex items-center justify-between gap-2 rounded-xl bg-slate-900/50 border border-white/10 px-3 py-2 backdrop-blur"
                    >
                      <div>
                        <div className="text-[11px] text-slate-300">{stat.title}</div>
                        <div className="text-sm font-semibold text-white flex items-center gap-1">
                          <span>{stat.current}{stat.suffix}</span>
                          <span className="text-[10px] text-slate-400">/ بازه قبل: {stat.previous}{stat.suffix}</span>
                        </div>
                      </div>
                      {statPill(stat.delta)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <RangeProgressRow
        title="سرعت پیشرفت در بازه‌ها"
        subtitle="روند میانگین بهره‌وری در پنجره‌های زمانی مختلف"
        items={rangeProgressItems}
      />

      <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/80 p-5 md:p-6 shadow-[0_24px_70px_-32px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="absolute inset-0 pointer-events-none opacity-50">
          <div className="absolute -left-10 -top-6 w-36 h-36 bg-cyan-500/20 blur-[110px] animate-pulse"></div>
          <div className="absolute right-0 bottom-0 w-44 h-44 bg-purple-500/20 blur-[120px] animate-[pulse_6s_ease-in-out_infinite]"></div>
        </div>
        <div className="relative space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-cyan-100/80">خلاصه بازه انتخابی</p>
              <h3 className="text-xl font-bold text-white">میانگین بهره‌وری و خروجی‌ها</h3>
            </div>
            <div className="px-3 py-1 rounded-full bg-white/5 border border-cyan-400/30 text-xs text-cyan-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>طول بازه: {formatRangeLabel(chartRange)}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-white shadow-inner">
              <div className="text-xs text-cyan-100 flex items-center justify-between">
                <span>نرخ انجام عادت‌ها</span>
                <span className="text-[11px] text-cyan-200/80">{formatRangeLabel(chartRange)}</span>
              </div>
              <div className="text-2xl font-black">{chartRangeSummary.habitRate}%</div>
              <div className="text-[11px] text-slate-200/80">{chartRangeSummary.habitsCompleted}/{chartRangeSummary.habitsTotal} عادت</div>
            </div>
            <div className="rounded-xl border border-purple-400/30 bg-purple-500/10 p-3 text-white shadow-inner">
              <div className="text-xs text-purple-100 flex items-center justify-between">
                <span>نرخ انجام کارها</span>
                <span className="text-[11px] text-purple-200/80">{formatRangeLabel(chartRange)}</span>
              </div>
              <div className="text-2xl font-black text-purple-100">{chartRangeSummary.taskRate}%</div>
              <div className="text-[11px] text-slate-200/80">{chartRangeSummary.tasksCompleted}/{chartRangeSummary.tasksTotal} کار</div>
            </div>
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-white shadow-inner">
              <div className="text-xs text-amber-100 flex items-center justify-between">
                <span>اهداف تکمیل شده</span>
                <span className="text-[11px] text-amber-200/80">{formatRangeLabel(chartRange)}</span>
              </div>
              <div className="text-2xl font-black text-amber-100">{chartRangeSummary.goals}</div>
              <div className="text-[11px] text-slate-200/80">هدف انجام‌شده در این بازه</div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative glass-card rounded-[24px] border border-white/10 p-5 md:p-6 overflow-hidden bg-slate-950/70 backdrop-blur-xl transition-all duration-500 hover:border-cyan-300/60 hover:shadow-[0_26px_70px_-34px_rgba(0,0,0,0.95)]">
        <div className="absolute inset-0 opacity-45 pointer-events-none">
          <div className="absolute -left-10 top-0 w-36 h-36 bg-cyan-500/25 blur-[95px] animate-pulse"></div>
          <div className="absolute right-0 bottom-0 w-40 h-40 bg-emerald-500/20 blur-[95px] animate-[pulse_7s_ease-in-out_infinite]"></div>
        </div>
        <div className="relative flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <div className="text-xs text-slate-400">روند عادت‌ها، کارها و اهداف در بازه انتخابی</div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-300" />
              نمودار تحلیلی بهره‌وری
            </h3>
          </div>
          <div className="relative w-full md:w-auto">
            <div className="bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 overflow-visible md:overflow-x-auto no-scrollbar flex flex-col gap-2">
              <div className="flex flex-nowrap justify-between items-center gap-2 overflow-x-auto no-scrollbar">
                {chartRanges.map(r => (
                  <button
                    key={r}
                    onClick={() => setChartRange(r)}
                    className={`px-3 py-1 rounded-lg text-[12px] md:text-xs transition whitespace-nowrap min-w-[64px] text-center ${
                      chartRange === r
                        ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-900 shadow-[0_12px_24px_-16px_rgba(34,211,238,0.8)]'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {formatRangeLabel(r)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="relative h-[360px] w-full">
          <ResponsiveContainer width="99%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              activeTooltipIndex={activeTooltipIndex}
              onMouseMove={(state: any) => {
                if (state?.activeTooltipIndex != null) {
                  setActiveTooltipIndex(state.activeTooltipIndex);
                }
              }}
              onMouseLeave={() => {
                setActiveTooltipIndex(chartData.length ? chartData.length - 1 : 0);
              }}
            >
              <defs>
                <linearGradient id="habitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="taskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="goalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.75} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={20} />
              <YAxis yAxisId="left" domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 10 }} width={32} />
              <YAxis yAxisId="right" orientation="right" allowDecimals={false} domain={[0, 'auto']} stroke="#fbbf24" tick={{ fontSize: 10 }} width={40} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px' }}
                labelStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                labelFormatter={(_, payload: any) => {
                  const point = payload && payload[0] && payload[0].payload;
                  return point?.fullLabel || point?.label || '';
                }}
                formatter={(value: any, name: any) => {
                  if (name === 'اهداف انجام‌شده') return [`${value} هدف`, name];
                  return [`${value}%`, name];
                }}
              />
              <Area yAxisId="left" type="monotone" dataKey="habitRate" name="انجام عادت‌ها" stroke="#22d3ee" fill="url(#habitGradient)" strokeWidth={3} />
              <Area yAxisId="left" type="monotone" dataKey="taskRate" name="انجام کارها" stroke="#a78bfa" fill="url(#taskGradient)" strokeWidth={3} />
              <Area yAxisId="right" type="monotone" dataKey="goals" name="اهداف انجام‌شده" stroke="#fbbf24" fill="url(#goalGradient)" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

