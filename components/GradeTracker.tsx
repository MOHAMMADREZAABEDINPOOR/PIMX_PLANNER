import React, { useEffect, useMemo, useState } from 'react';
import { GradeEntry, GradeSubject } from '../types';
import { getRelativeDate, storage, toISODate, toPersianDate } from '../utils';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, Legend } from 'recharts';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Flame,
  GraduationCap,
  NotebookPen,
  PlusCircle,
  Sparkles,
  Star,
  Target,
  Trash,
  Trophy
} from 'lucide-react';
import { RangeProgressRow, RANGE_WINDOWS, RangeProgressItem, clampRangePercent } from './RangeProgressRow';
import { chartCategoryClass } from './chartCategoryStyles';

const SUBJECT_LABELS: Record<GradeSubject, string> = {
  [GradeSubject.HESABAN]: 'حسابان',
  [GradeSubject.HENDESEH]: 'هندسه',
  [GradeSubject.GOSASTEH]: 'گسسته',
  [GradeSubject.SHIMI]: 'شیمی',
  [GradeSubject.FIZIK]: 'فیزیک',
  [GradeSubject.HOVIYAT]: 'هویت اجتماعی',
  [GradeSubject.SALAMAT]: 'سلامت و تربیت',
  [GradeSubject.FARSI]: 'فارسی',
  [GradeSubject.ARABI]: 'عربی',
  [GradeSubject.ENGLISH]: 'زبان انگلیسی',
  [GradeSubject.DINI]: 'دینی',
  [GradeSubject.MODIRIYAT]: 'مدیریت'
};

const SUBJECT_GRADIENTS: Record<GradeSubject, string> = {
  [GradeSubject.HESABAN]: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 40%, #6366f1 100%)',
  [GradeSubject.HENDESEH]: 'linear-gradient(135deg, #10b981 0%, #34d399 40%, #f59e0b 100%)',
  [GradeSubject.GOSASTEH]: 'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #22d3ee 100%)',
  [GradeSubject.SHIMI]: 'linear-gradient(135deg, #f472b6 0%, #fb7185 40%, #fbbf24 100%)',
  [GradeSubject.FIZIK]: 'linear-gradient(135deg, #06b6d4 0%, #14b8a6 50%, #22c55e 100%)',
  [GradeSubject.HOVIYAT]: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 45%, #8b5cf6 100%)',
  [GradeSubject.SALAMAT]: 'linear-gradient(135deg, #2dd4bf 0%, #22c55e 45%, #84cc16 100%)',
  [GradeSubject.FARSI]: 'linear-gradient(135deg, #f97316 0%, #fb7185 45%, #fb923c 100%)',
  [GradeSubject.ARABI]: 'linear-gradient(135deg, #22c55e 0%, #0ea5e9 45%, #14b8a6 100%)',
  [GradeSubject.ENGLISH]: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 45%, #a855f7 100%)',
  [GradeSubject.DINI]: 'linear-gradient(135deg, #facc15 0%, #fb7185 40%, #f97316 100%)',
  [GradeSubject.MODIRIYAT]: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 45%, #0ea5e9 100%)'
};

const SUBJECT_COLORS: Record<GradeSubject, string> = {
  [GradeSubject.HESABAN]: '#22d3ee',
  [GradeSubject.HENDESEH]: '#10b981',
  [GradeSubject.GOSASTEH]: '#a855f7',
  [GradeSubject.SHIMI]: '#f472b6',
  [GradeSubject.FIZIK]: '#06b6d4',
  [GradeSubject.HOVIYAT]: '#f59e0b',
  [GradeSubject.SALAMAT]: '#2dd4bf',
  [GradeSubject.FARSI]: '#f97316',
  [GradeSubject.ARABI]: '#22c55e',
  [GradeSubject.ENGLISH]: '#38bdf8',
  [GradeSubject.DINI]: '#facc15',
  [GradeSubject.MODIRIYAT]: '#0ea5e9'
};

const CHART_RANGES = [7, 14, 30, 60, 90, 120, 365, 730];

const formatPersianDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return toPersianDate(d);
};

const formatPersianDateShort = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return toPersianDate(d).split(' ').slice(1, 3).join(' ');
};

const formatPersianFullWithWeekday = (date: Date) =>
  new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);

const getScoreTone = (score: number) => {
  if (score >= 17) return 'text-emerald-400';
  if (score >= 12) return 'text-amber-300';
  return 'text-rose-400';
};

export const GradeTracker: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [newScore, setNewScore] = useState<string>('');
  const [newSubject, setNewSubject] = useState<GradeSubject>(GradeSubject.HESABAN);
  const [filterSubject, setFilterSubject] = useState<GradeSubject | 'All'>('All');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [chartRangeDays, setChartRangeDays] = useState<number>(7);
  const [viewEndDate, setViewEndDate] = useState<Date>(new Date());

  useEffect(() => {
    setGrades(storage.get<GradeEntry[]>(storage.keys.GRADES, []));
  }, []);

  const changeDate = (days: number) => setCurrentDate(prev => getRelativeDate(days, prev));

  const showSaveFeedback = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1800);
  };

  const addGrade = () => {
    const scoreNum = parseFloat(newScore);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 20) {
      alert('نمره باید بین ۰ تا ۲۰ باشد.');
      return;
    }
    const newEntry: GradeEntry = {
      id: Date.now().toString(),
      subject: newSubject,
      date: toISODate(currentDate),
      score: parseFloat(scoreNum.toFixed(2))
    };
    const updated = [...grades, newEntry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setGrades(updated);
    storage.set(storage.keys.GRADES, updated);
    setNewScore('');
    showSaveFeedback();
  };

  const deleteGrade = (id: string) => {
    const updated = grades.filter(g => g.id !== id);
    setGrades(updated);
    storage.set(storage.keys.GRADES, updated);
  };

  const chartGrades = useMemo(() => {
    const anchor = viewEndDate;
    const days = chartRangeDays;
    const dayMs = 86400000;
    return grades.filter(g => {
      const diff = (anchor.getTime() - new Date(g.date).getTime()) / dayMs;
      return diff >= 0 && diff < days;
    });
  }, [grades, chartRangeDays, viewEndDate]);

  const filteredGrades = useMemo(
    () => (filterSubject === 'All' ? chartGrades : chartGrades.filter(g => g.subject === filterSubject)),
    [chartGrades, filterSubject]
  );

  const gradeByDateSubject = useMemo(() => {
    const map: Record<string, Record<GradeSubject, { score: number; idNum: number }>> = {};
    grades.forEach(g => {
      const iso = g.date;
      if (!map[iso]) map[iso] = {};
      const idNum = Number(g.id) || 0;
      const existing = map[iso][g.subject];
      if (!existing || idNum > existing.idNum) {
        map[iso][g.subject] = { score: g.score, idNum };
      }
    });
    return map;
  }, [grades]);

  const isAllSubjects = filterSubject === 'All';

  const chartData = useMemo(() => {
    const data = [];
    for (let i = chartRangeDays - 1; i >= 0; i--) {
      const d = getRelativeDate(-i, viewEndDate);
      const iso = toISODate(d);
      const displayDate = formatPersianDateShort(iso);
      const displayHover = formatPersianFullWithWeekday(d);
      const entry: any = { index: chartRangeDays - 1 - i, iso, displayDate, displayHover, baseline: 0 };

      if (isAllSubjects) {
        Object.values(GradeSubject).forEach(sub => {
          entry[sub] = gradeByDateSubject[iso]?.[sub]?.score ?? null;
        });
      } else {
        const sub = filterSubject as GradeSubject;
        entry.score = gradeByDateSubject[iso]?.[sub]?.score ?? null;
      }

      data.push(entry);
    }
    return data;
  }, [chartRangeDays, viewEndDate, gradeByDateSubject, isAllSubjects, filterSubject]);

  const chartTicks = useMemo(() => {
    if (chartData.length === 0) return [];
    const step = Math.max(1, Math.floor(chartData.length / 8));
    const ticks: number[] = [];
    for (let i = 0; i < chartData.length; i += step) ticks.push(i);
    if (ticks[ticks.length - 1] !== chartData.length - 1) ticks.push(chartData.length - 1);
    return ticks;
  }, [chartData]);

  const chartRangeStart = useMemo(() => getRelativeDate(-(chartRangeDays - 1), viewEndDate), [chartRangeDays, viewEndDate]);
  const chartRangeText = useMemo(() => {
    const startLabel = toPersianDate(chartRangeStart).split(' ').slice(1, 3).join(' ');
    const endLabel = toPersianDate(viewEndDate).split(' ').slice(1, 3).join(' ');
    return `${startLabel} تا ${endLabel}`;
  }, [chartRangeStart, viewEndDate]);

  const shiftChartWindow = (direction: 'prev' | 'next') => {
    const step = chartRangeDays;
    const today = new Date();
    const next = getRelativeDate(direction === 'prev' ? -step : step, viewEndDate);
    const clamped = next > today ? today : next;
    setViewEndDate(clamped);
  };

  const subjectsToPlot = useMemo(() => {
    if (!isAllSubjects) {
      return [filterSubject as GradeSubject];
    }

    const present = new Set<GradeSubject>();
    chartData.forEach(point => {
      Object.values(GradeSubject).forEach(subject => {
        if (typeof (point as any)[subject] === 'number') {
          present.add(subject);
        }
      });
    });
    return Array.from(present);
  }, [chartData, filterSubject, isAllSubjects]);

  const totalExams = grades.length;
  const avgScore = totalExams ? +(grades.reduce((sum, g) => sum + g.score, 0) / totalExams).toFixed(2) : 0;
  const passRate = totalExams ? Math.round((grades.filter(g => g.score >= 10).length / totalExams) * 100) : 0;
  const bestEntry = grades.reduce<GradeEntry | null>((best, g) => (!best || g.score > best.score ? g : best), null);
  const lastEntry =
    grades.length > 0 ? [...grades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;
  const todayCount = grades.filter(g => g.date === toISODate(currentDate)).length;
  const filteredAvg = filteredGrades.length
    ? +(filteredGrades.reduce((sum, g) => sum + g.score, 0) / filteredGrades.length).toFixed(2)
    : 0;
  const filteredBest = filteredGrades.length ? Math.max(...filteredGrades.map(g => g.score)) : 0;
  const filteredPassCount = filteredGrades.filter(g => g.score >= 10).length;

  const avgProgress = Math.min(100, Math.round((avgScore / 20) * 100));
  const avgRingStyle = {
    background: `conic-gradient(#22d3ee ${avgProgress * 3.6}deg, rgba(148,163,184,0.25) ${avgProgress * 3.6}deg)`
  };

  const rangeProgressItems: RangeProgressItem[] = useMemo(() => {
    const dailyPercent = (iso: string) => {
      const dayGrades = grades.filter(g => {
        const matchesSubject = filterSubject === 'All' || g.subject === filterSubject;
        return matchesSubject && g.date === iso;
      });
      if (dayGrades.length === 0) return 0;
      const avg = dayGrades.reduce((sum, g) => sum + g.score, 0) / dayGrades.length;
      return (avg / 20) * 100;
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
  }, [grades, filterSubject, viewEndDate]);

  const subjectStats = Object.values(GradeSubject).map(sub => {
    const items = grades.filter(g => g.subject === sub);
    const avg = items.length ? items.reduce((sum, g) => sum + g.score, 0) / items.length : 0;
    const best = items.length ? Math.max(...items.map(g => g.score)) : 0;
    return { subject: sub, avg: +avg.toFixed(2), count: items.length, best };
  });

  const topSubjects = subjectStats
    .filter(s => s.count > 0)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 4);

  const recentEntries = [...grades]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  const scorePreview = (() => {
    const val = parseFloat(newScore);
    if (isNaN(val)) return 0;
    return Math.min(20, Math.max(0, val));
  })();

  return (
    <div className="space-y-8 animate-enter" dir="rtl">
      <div className="relative overflow-hidden rounded-[32px] border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 shadow-[0_20px_70px_-30px_rgba(34,211,238,0.5)]">
        <div className="absolute inset-0 opacity-50">
          <div className="absolute -left-14 -top-20 w-64 h-64 rounded-full bg-cyan-500/15 blur-[120px] animate-pulse"></div>
          <div className="absolute left-1/2 -bottom-10 w-80 h-80 rounded-full bg-emerald-500/10 blur-[140px] animate-float"></div>
          <div className="absolute right-10 -top-6 w-48 h-48 rounded-full bg-purple-500/10 blur-[100px] animate-float"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.16),transparent_28%),radial-gradient(circle_at_50%_90%,rgba(16,185,129,0.18),transparent_30%)]"></div>
        </div>

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/70 border border-white/10 text-cyan-200 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
              کارنامه تحصیلی | LIVE
            </div>
            <div className="flex items-center gap-2 text-white">
              <GraduationCap className="w-7 h-7 text-cyan-300" />
              <h2 className="text-3xl md:text-4xl font-black tracking-tight">مرکز کنترل نمرات</h2>
            </div>
            <p className="text-slate-200/80 text-sm md:text-base max-w-3xl leading-relaxed">
              تحلیل زنده نمره‌ها، درس به درس. تمرکز روی ضعف‌ها، جشن گرفتن قوی‌ترین‌ها و ثبت سریع هر امتحان بدون
              حواس‌پرتی.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 font-mono">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                {grades.length} رکورد فعال
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-100 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {passRate}% نرخ قبولی
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatPersianDate(currentDate)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <div className="relative w-36 h-36 md:w-40 md:h-40 rounded-full bg-slate-900/80 border border-white/10 flex items-center justify-center">
              <div className="absolute inset-3 rounded-full" style={avgRingStyle}></div>
              <div className="absolute inset-[18px] rounded-full bg-slate-950/80 border border-white/5 flex flex-col items-center justify-center text-white font-black">
                <span className="text-3xl md:text-4xl">{avgScore.toFixed(1)}</span>
                <span className="text-[10px] text-slate-400">میانگین کل</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white shadow-[0_10px_40px_-20px_rgba(34,211,238,0.6)]">
                <div className="text-xs text-slate-400">بهترین نمره</div>
                <div className="text-xl font-black flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-300" />
                  {bestEntry ? bestEntry.score : '--'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {bestEntry ? `${SUBJECT_LABELS[bestEntry.subject]} | ${formatPersianDateShort(bestEntry.date)}` : 'منتظر رکورد'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white shadow-[0_10px_40px_-20px_rgba(99,102,241,0.5)]">
                <div className="text-xs text-slate-400">آخرین ثبت</div>
                <div className="text-xl font-black flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-300" />
                  {lastEntry ? lastEntry.score : '--'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {lastEntry ? `${SUBJECT_LABELS[lastEntry.subject]} • ${formatPersianDateShort(lastEntry.date)}` : 'هنوز داده‌ای نیست'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RangeProgressRow
        title="ریتم بازه‌ای نمره‌ها"
        subtitle="میانگین درصد نمرات در بازه‌های ۳ روزه تا یک‌ساله"
        items={rangeProgressItems}
      />

      <div className="space-y-6">
        <div className="grid xl:grid-cols-[360px_1fr] gap-4">
          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 p-5 space-y-4 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/80 relative overflow-hidden shadow-[0_15px_50px_-25px_rgba(34,211,238,0.6)] h-full min-h-[420px] max-h-[520px]">
              <div className="absolute inset-0 opacity-40">
                <div className="absolute -left-10 -top-10 w-40 h-40 bg-cyan-500/15 rounded-full blur-[90px]"></div>
                <div className="absolute right-0 bottom-0 w-48 h-48 bg-emerald-500/15 rounded-full blur-[100px]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
              </div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <PlusCircle className="w-5 h-5 text-cyan-300" />
                  <div>
                    <div className="text-sm text-slate-400">ثبت نمره جدید</div>
                    <div className="text-xl font-black">افزودن فوری</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                  <Flame className="w-4 h-4 text-amber-300" />
                  {todayCount} ثبت در تاریخ انتخابی
                </div>
              </div>

              <div className="relative rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300 grid grid-cols-[auto_1fr_auto] items-center gap-2">
                <button
                  onClick={() => changeDate(1)}
                  className="min-w-[90px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 hover:border-cyan-400/50 transition-all flex items-center justify-center gap-1 text-xs"
                >
                  <ArrowRight className="w-4 h-4" />
                  روز بعد
                </button>
                <div className="flex items-center justify-center gap-2 text-cyan-100 font-bold text-center px-2">
                  <Calendar className="w-4 h-4" />
                  <span className="block leading-relaxed">{formatPersianDate(currentDate)}</span>
                </div>
                <button
                  onClick={() => changeDate(-1)}
                  className="min-w-[90px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 hover:border-cyan-400/50 transition-all flex items-center justify-center gap-1 text-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  روز قبل
                </button>
              </div>

              <div className="relative space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-bold">درس</label>
                  <select
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value as GradeSubject)}
                    className="w-full rounded-xl px-4 py-3 bg-slate-950/80 border border-white/10 text-white outline-none"
                  >
                    {Object.values(GradeSubject).map(s => (
                      <option key={s} value={s}>
                        {SUBJECT_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-bold">نمره (۰ تا ۲۰)</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="20"
                    value={newScore}
                    onChange={e => setNewScore(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 bg-slate-950/80 border border-white/10 text-white outline-none font-mono"
                    placeholder="مثلاً ۱۸.۵۰"
                  />
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {[20, 19, 18, 17, 16].map(val => (
                      <button
                        key={val}
                        onClick={() => setNewScore(val.toString())}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 hover:border-cyan-400/40 transition"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>پیش‌نمایش نمره</span>
                    <span className={`font-black ${getScoreTone(scorePreview)}`}>{scorePreview.toFixed(1)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(scorePreview / 20) * 100}%`,
                        background: SUBJECT_GRADIENTS[newSubject]
                      }}
                    ></div>
                  </div>
                </div>

                <button
                  onClick={addGrade}
                  className="w-full bg-gradient-to-l from-cyan-400 to-emerald-400 text-slate-900 font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 shadow-[0_0_30px_rgba(34,211,238,0.35)] hover:shadow-[0_0_40px_rgba(16,185,129,0.45)]"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  ذخیره در کارنامه
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3 flex-1 min-h-[340px] max-h-[520px] overflow-hidden">
              <div className="flex items-center justify-between text-white font-bold">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-emerald-300" />
                  برترین درس‌ها
                </div>
                <div className="text-xs text-slate-500">میانگین بالا</div>
              </div>
              <div className="space-y-2 h-full overflow-y-auto custom-scrollbar pr-1">
                {topSubjects.length === 0 && <div className="text-slate-500 text-sm">منتظر اولین ثبت...</div>}
                {topSubjects.map(stat => (
                  <div key={stat.subject} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-9 h-9 rounded-lg text-slate-900 font-black flex items-center justify-center shadow"
                        style={{ background: SUBJECT_GRADIENTS[stat.subject] }}
                      >
                        {SUBJECT_LABELS[stat.subject].slice(0, 2)}
                      </span>
                      <div>
                        <div className="text-white text-sm font-bold">{SUBJECT_LABELS[stat.subject]}</div>
                        <div className="text-[11px] text-slate-400">{stat.count} آزمون | بیشترین {stat.best}</div>
                      </div>
                    </div>
                    <div className={`text-sm font-black ${getScoreTone(stat.avg)}`}>{stat.avg.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 overflow-hidden h-full min-h-[420px] max-h-[520px] flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 shrink-0">
                <div className="flex items-center gap-2 text-white font-bold">
                  <BarChart3 className="w-5 h-5 text-cyan-300" />
                  آرشیو نمرات
                </div>
                <div className="text-xs text-slate-500">۱۰ مورد آخر</div>
              </div>

              <div
                className="divide-y divide-white/5 overflow-y-auto overflow-x-auto custom-scrollbar px-0"
                style={{ maxHeight: 'calc(100% - 64px)' }}
              >
                {grades.length === 0 && <div className="p-6 text-center text-slate-500 text-sm">هیچ نمره‌ای ثبت نشده است.</div>}
                {[...grades]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 10)
                  .map(entry => (
                    <div
                      key={entry.id}
                      className="grid grid-cols-[1.6fr_1.1fr_auto_auto_auto] items-center px-5 py-3 gap-2 sm:gap-3 hover:bg-white/5 transition min-w-[480px] sm:min-w-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-10 h-10 rounded-lg text-slate-900 font-black flex items-center justify-center shadow"
                          style={{ background: SUBJECT_GRADIENTS[entry.subject] }}
                        >
                          {SUBJECT_LABELS[entry.subject].slice(0, 2)}
                        </span>
                        <div className="text-white font-bold text-sm sm:text-base truncate">{SUBJECT_LABELS[entry.subject]}</div>
                      </div>
                      <div className="text-xs sm:text-sm text-slate-300 font-mono whitespace-nowrap">{formatPersianDate(entry.date)}</div>
                      <div className={`text-xs sm:text-sm font-black ${getScoreTone(entry.score)}`}>{entry.score}</div>
                      <div className="text-xs sm:text-sm text-slate-400 md:text-center whitespace-nowrap">کد: {entry.id.slice(-6)}</div>
                      <div className="flex justify-end whitespace-nowrap">
                        <button onClick={() => deleteGrade(entry.id)} className="text-slate-500 hover:text-red-400 transition flex items-center gap-1">
                          <Trash className="w-4 h-4" />
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-center justify-between text-white font-bold">
                  <div className="flex items-center gap-2">
                    <NotebookPen className="w-4 h-4 text-cyan-300" />
                    آخرین ثبت‌ها
                  </div>
                  <div className="text-xs text-slate-500">{grades.length} رکورد</div>
                </div>
                <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                  {recentEntries.length === 0 && <div className="text-slate-500 text-sm">چیزی ثبت نشده است.</div>}
                  {recentEntries.map(entry => (
                    <div key={entry.id} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-900 font-black shadow-lg shrink-0"
                        style={{ background: SUBJECT_GRADIENTS[entry.subject] }}
                      >
                        {entry.score.toFixed(1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-bold">{SUBJECT_LABELS[entry.subject]}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {formatPersianDateShort(entry.date)}
                        </div>
                      </div>
                      <div className={`text-xs font-black ${getScoreTone(entry.score)}`}>{entry.score}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between text-white font-bold mb-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-300" />
                    تابلو درسی
                  </div>
                  <div className="text-xs text-slate-500">میانگین/بهترین</div>
                </div>
                <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                  {subjectStats.map(stat => (
                    <div key={stat.subject} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-10 h-10 rounded-lg text-slate-900 font-black flex items-center justify-center shadow-md shrink-0"
                            style={{ background: SUBJECT_GRADIENTS[stat.subject] }}
                          >
                            {SUBJECT_LABELS[stat.subject].slice(0, 2)}
                          </span>
                          <div>
                            <div className="text-white text-sm font-bold">{SUBJECT_LABELS[stat.subject]}</div>
                            <div className="text-[11px] text-slate-400">
                              {stat.best > 0 ? `بیشترین: ${stat.best}` : 'ثبت نشده'} | {stat.count} آزمون
                            </div>
                          </div>
                        </div>
                        <div className={`text-sm font-black ${getScoreTone(stat.avg)}`}>{stat.avg.toFixed(1)}</div>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(100, (stat.avg / 20) * 100)}%`, background: SUBJECT_GRADIENTS[stat.subject] }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative rounded-3xl border border-white/10 bg-slate-950/70 p-5 md:p-6 space-y-4 overflow-hidden">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute -left-16 -top-14 w-56 h-56 bg-cyan-500/15 blur-[110px]"></div>
          <div className="absolute right-0 bottom-0 w-64 h-64 bg-purple-500/15 blur-[120px]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(168,85,247,0.08),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.08),transparent_28%)]"></div>
        </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <div className="text-sm text-cyan-200 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                منحنی رشد نمرات
              </div>
              <div className="text-xl font-black text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-300" />
                روند {filterSubject === 'All' ? 'همه درس‌ها' : SUBJECT_LABELS[filterSubject]}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                میانگین فیلتر: {filteredAvg.toFixed(1)} | بهترین: {filteredBest || '--'}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
              {CHART_RANGES.map(r => {
                const label =
                  r === 365 ? '۱ سال' : r === 730 ? '۲ سال' : `${r.toLocaleString('fa-IR')} روز`;
                return (
                  <button
                    key={r}
                    onClick={() => {
                      setChartRangeDays(r);
                      setViewEndDate(new Date());
                    }}
                    className={chartCategoryClass(chartRangeDays === r)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
        </div>

        <div className="relative flex flex-wrap gap-2">
          <button
            onClick={() => setFilterSubject('All')}
            className={chartCategoryClass(filterSubject === 'All')}
          >
            همه
          </button>
          {Object.values(GradeSubject).map(sub => (
            <button
              key={sub}
              onClick={() => setFilterSubject(sub)}
              className={chartCategoryClass(filterSubject === sub)}
              style={filterSubject === sub ? { background: SUBJECT_GRADIENTS[sub] } : {}}
            >
              {SUBJECT_LABELS[sub]}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr,260px] gap-4">
          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md h-[320px] md:h-[400px] p-2 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-70">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.08),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(99,102,241,0.08),transparent_35%)]"></div>
              <div className="absolute -left-10 -top-12 w-48 h-48 bg-cyan-400/10 blur-3xl"></div>
              <div className="absolute right-0 bottom-0 w-56 h-56 bg-emerald-400/10 blur-3xl"></div>
            </div>
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                هنوز نموداری برای نمایش نداریم. یک نمره جدید ثبت کن.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis
                    type="number"
                    dataKey="index"
                    domain={[0, Math.max(chartData.length - 1, 0)]}
                    ticks={chartTicks}
                    tickFormatter={(value: number) => chartData[value]?.displayDate || ''}
                    stroke="#94a3b8"
                    tick={{ fontSize: 10 }}
                    padding={{ left: 10, right: 10 }}
                    allowDecimals={false}
                  />
                  <YAxis domain={[0, 20]} allowDecimals={false} stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <Tooltip
                    wrapperStyle={{ outline: 'none' }}
                    contentStyle={{
                      background: 'linear-gradient(135deg, rgba(34,211,238,0.16) 0%, rgba(16,185,129,0.14) 50%, rgba(15,23,42,0.95) 100%)',
                      border: '1px solid rgba(148,163,184,0.3)',
                      color: '#fff',
                      borderRadius: '16px',
                      boxShadow: '0 12px 35px -18px rgba(0,0,0,0.7)'
                    }}
                    labelStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const point = payload[0]?.payload || {};
                      const dateLabel = point.displayHover || point.displayDate || '';

                      const rows: { label: string; value: string }[] = [];
                      if (isAllSubjects) {
                        subjectsToPlot.forEach(sub => {
                          const val = point[sub];
                          rows.push({
                            label: SUBJECT_LABELS[sub],
                            value: val === null || val === undefined ? 'بدون نمره' : `${val} نمره`
                          });
                        });
                      } else {
                        const sub = filterSubject as GradeSubject;
                        const val = point.score;
                        rows.push({
                          label: SUBJECT_LABELS[sub],
                          value: val === null || val === undefined ? 'بدون نمره' : `${val} نمره`
                        });
                      }

                      return (
                        <div className="px-4 py-3 text-sm backdrop-blur-md">
                          <div className="font-bold text-cyan-200 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.7)]"></span>
                            {dateLabel}
                          </div>
                          <div className="space-y-1">
                            {rows.map((r, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-3">
                                <span className="text-slate-200">{r.label}</span>
                                <span className="font-bold text-white">{r.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ paddingTop: 8 }}
                    formatter={value => SUBJECT_LABELS[value as GradeSubject] || value}
                  />
                  <Line
                    type="linear"
                    dataKey="baseline"
                    stroke="transparent"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                  <ReferenceLine y={10} stroke="#f97316" strokeDasharray="3 3" />
                  <ReferenceLine y={17} stroke="#22c55e" strokeDasharray="3 3" />
                  {subjectsToPlot.map(subject => (
                    <Line
                      key={subject}
                      type="monotone"
                      dataKey={isAllSubjects ? subject : 'score'}
                      name={SUBJECT_LABELS[subject]}
                      stroke={SUBJECT_COLORS[subject]}
                      strokeWidth={3}
                      dot={{ r: 4, fill: SUBJECT_COLORS[subject], strokeWidth: 0 }}
                      activeDot={{ r: 6, stroke: SUBJECT_COLORS[subject], strokeWidth: 2 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
            <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
          </div>

          <div className="relative rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3 text-white backdrop-blur">
            <div>
              <p className="text-xs text-cyan-200">روند</p>
              <h4 className="text-lg font-bold">
                {filterSubject === 'All' ? 'همه درس‌ها' : SUBJECT_LABELS[filterSubject]}
              </h4>
              <p className="text-[11px] text-slate-300">
                فیلتر زمانی:{" "}
                {chartRangeDays === 365
                  ? '۱ سال'
                  : chartRangeDays === 730
                  ? '۲ سال'
                  : `${chartRangeDays.toLocaleString('fa-IR')} روز`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-slate-900/50 border border-white/10 p-3">
                <div className="text-xs text-slate-400">میانگین بازه</div>
                <div className="text-xl font-black">{filteredAvg.toFixed(1)}</div>
              </div>
              <div className="rounded-xl bg-slate-900/50 border border-white/10 p-3">
                <div className="text-xs text-slate-400">بهترین نمره</div>
                <div className="text-xl font-black">{filteredBest || '--'}</div>
              </div>
              <div className="rounded-xl bg-slate-900/50 border border-white/10 p-3">
                <div className="text-xs text-slate-400">تعداد آزمون</div>
                <div className="text-xl font-black">{filteredGrades.length}</div>
              </div>
              <div className="rounded-xl bg-slate-900/50 border border-white/10 p-3">
                <div className="text-xs text-slate-400">وضعیت قبولی</div>
                <div className="text-xl font-black text-emerald-300">
                  {filteredGrades.length ? `${filteredPassCount}/${filteredGrades.length}` : '--'}
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-emerald-400/15 via-cyan-400/10 to-blue-500/15 border border-white/10 p-3 text-xs text-slate-200">
              نوارهای راهنما: خط سبز ۱۷، خط نارنجی ۱۰. تلاش کن میانگین را بالاتر از ۱۷ نگه داری.
            </div>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="fixed bottom-6 left-6 z-50 px-4 py-3 rounded-2xl bg-emerald-500 text-slate-900 font-bold shadow-[0_20px_40px_-20px_rgba(16,185,129,0.9)] flex items-center gap-2 animate-enter">
          <CheckCircle2 className="w-4 h-4" />
          ذخیره شد
        </div>
      )}
    </div>
  );
};
