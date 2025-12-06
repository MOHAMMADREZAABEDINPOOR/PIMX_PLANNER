import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calendar, Sparkles, Activity, Clock4, Play, Plus, Minus, Gauge, ArrowLeft, ArrowRight, Settings2, X } from 'lucide-react';
import { VideoConfig, VideoLog, VideoSubject } from '../types';
import { storage, toISODate, toPersianDate, getRelativeDate } from '../utils';
import { RangeProgressRow, RANGE_WINDOWS, RangeProgressItem, clampRangePercent } from './RangeProgressRow';
import { chartCategoryClass } from './chartCategoryStyles';

const SUBJECT_LABELS: Record<VideoSubject, string> = {
  [VideoSubject.HESABAN]: 'حسابان',
  [VideoSubject.HENDESEH]: 'هندسه',
  [VideoSubject.GOSASTEH]: 'گسسته',
  [VideoSubject.SHIMI]: 'شیمی',
  [VideoSubject.FIZIK]: 'فیزیک'
};

const DAY_LABELS: { id: number; label: string }[] = [
  { id: 6, label: 'شنبه' },
  { id: 0, label: 'یکشنبه' },
  { id: 1, label: 'دوشنبه' },
  { id: 2, label: 'سه‌شنبه' },
  { id: 3, label: 'چهارشنبه' },
  { id: 4, label: 'پنجشنبه' },
  { id: 5, label: 'جمعه' }
];

const defaultConfigs = (): VideoConfig[] =>
  Object.values(VideoSubject).map(sub => ({
    subject: sub,
    totalVideos: 0,
    remainingVideos: 0,
    scheduleDays: []
  }));

const SUBJECT_COLORS: Record<
  VideoSubject,
  {
    stroke: string;
    gradientId: string;
  }
> = {
  [VideoSubject.HESABAN]: { stroke: '#22d3ee', gradientId: 'videoGradient-hesaban' },
  [VideoSubject.HENDESEH]: { stroke: '#a78bfa', gradientId: 'videoGradient-hendeseh' },
  [VideoSubject.GOSASTEH]: { stroke: '#f97316', gradientId: 'videoGradient-gosasteh' },
  [VideoSubject.SHIMI]: { stroke: '#34d399', gradientId: 'videoGradient-shimi' },
  [VideoSubject.FIZIK]: { stroke: '#fb7185', gradientId: 'videoGradient-fizik' }
};

const sectionCardClass =
  'relative overflow-hidden rounded-[32px] border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 shadow-[0_20px_70px_-30px_rgba(34,211,238,0.5)]';

const progressSectionCardClass =
  'relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/75 p-4 md:p-6 shadow-[0_18px_60px_-32px_rgba(0,0,0,0.85)]';

const SectionGlow = () => (
  <div className="absolute inset-0 opacity-40 pointer-events-none">
    <div className="absolute -left-16 -top-16 w-48 h-48 rounded-full bg-cyan-500/18 blur-[110px]"></div>
    <div className="absolute right-0 bottom-0 w-64 h-64 rounded-full bg-purple-500/12 blur-[140px]"></div>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(34,211,238,0.16),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.14),transparent_32%),radial-gradient(circle_at_50%_85%,rgba(16,185,129,0.14),transparent_32%)]"></div>
  </div>
);

export const VideoSection: React.FC = () => {
  const [configs, setConfigs] = useState<VideoConfig[]>([]);
  const [logs, setLogs] = useState<VideoLog[]>([]);
  const [activeSubject, setActiveSubject] = useState<VideoSubject>(VideoSubject.HESABAN);
  const [addCount, setAddCount] = useState<number>(1);
  const [saveToast, setSaveToast] = useState<boolean>(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<'SUBJECT' | 'ALL'>('SUBJECT');
  const [chartRange, setChartRange] = useState<number>(14);
  const [chartOffset, setChartOffset] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isVideoSettingsOpen, setIsVideoSettingsOpen] = useState<boolean>(false);
  const [settingsSubject, setSettingsSubject] = useState<VideoSubject>(VideoSubject.HESABAN);
  const [tempConfigs, setTempConfigs] = useState<VideoConfig[] | null>(null);

  useEffect(() => {
    const storedConfigs = storage.get<VideoConfig[]>(storage.keys.VIDEO_CONFIG, defaultConfigs());
    const storedLogs = storage.get<VideoLog[]>(storage.keys.VIDEO_LOGS, []);
    setConfigs(storedConfigs);
    setLogs(storedLogs);
    if (storedConfigs.length > 0) {
      setActiveSubject(storedConfigs[0].subject);
    }
  }, []);

  const activeConfig = useMemo(
    () => configs.find(c => c.subject === activeSubject) || defaultConfigs()[0],
    [configs, activeSubject]
  );

  const selectedIso = useMemo(() => toISODate(selectedDate), [selectedDate]);
  const selectedDateLabel = useMemo(
    () => toPersianDate(selectedDate).split(' ').slice(1, 3).join(' '),
    [selectedDate]
  );

  const subjectLogs = useMemo(() => logs.filter(l => l.subject === activeSubject), [logs, activeSubject]);

  const totalVideos = configs.reduce((sum, c) => sum + c.totalVideos, 0);
  const remainingVideos = configs.reduce((sum, c) => sum + c.remainingVideos, 0);
  const watchedVideos = Math.max(0, totalVideos - remainingVideos);

  const subjectDone = activeConfig.totalVideos - activeConfig.remainingVideos;
  const subjectTotal = Math.max(activeConfig.totalVideos, subjectDone + activeConfig.remainingVideos);
  const subjectPercent = subjectTotal === 0 ? 0 : Math.round((subjectDone / subjectTotal) * 100);

  // درصد کلی همه ویدیوها (همه دروس)
  const overallPercent = totalVideos === 0 ? 0 : Math.round((watchedVideos / totalVideos) * 100);

  // پیشرفت روزانه و ماهانه (همه / یک درس بر اساس chartMode)
  const todayIsoGlobal = toISODate(new Date());

  const todayWatchedAll = useMemo(
    () =>
      logs
        .filter(l => l.date === todayIsoGlobal)
        .reduce((s, l) => s + l.count, 0),
    [logs, todayIsoGlobal]
  );

  const todayWatchedSubject = useMemo(
    () =>
      subjectLogs
        .filter(l => l.date === todayIsoGlobal)
        .reduce((s, l) => s + l.count, 0),
    [subjectLogs, todayIsoGlobal]
  );

  const monthlyWatchedAll = useMemo(() => {
    const start = toISODate(getRelativeDate(-29));
    return logs
      .filter(l => l.date >= start && l.date <= todayIsoGlobal)
      .reduce((s, l) => s + l.count, 0);
  }, [logs, todayIsoGlobal]);

  const monthlyWatchedSubject = useMemo(() => {
    const start = toISODate(getRelativeDate(-29));
    return subjectLogs
      .filter(l => l.date >= start && l.date <= todayIsoGlobal)
      .reduce((s, l) => s + l.count, 0);
  }, [subjectLogs, todayIsoGlobal]);

  // حالت انتخاب نمودار (همه / یک درس)
  const isAllMode = chartMode === 'ALL';

  const baseTotal = isAllMode ? totalVideos : subjectTotal || 0;
  const todayWatched = isAllMode ? todayWatchedAll : todayWatchedSubject;
  const monthlyWatched = isAllMode ? monthlyWatchedAll : monthlyWatchedSubject;

  const dailyPercent = baseTotal === 0 ? 0 : Math.round((todayWatched / baseTotal) * 100);
  const monthlyPercent = baseTotal === 0 ? 0 : Math.round((monthlyWatched / baseTotal) * 100);

  // کارت بزرگ دایره‌ای: پیشرفت روزانه
  const donutPercent = dailyPercent;
  const donutTitle = isAllMode
    ? 'پیشرفت روزانه ویدیوها (همه دروس)'
    : `پیشرفت روزانه ویدیوها (${SUBJECT_LABELS[activeSubject]})`;
  const donutSeen = todayWatched;
  const donutTotal = baseTotal;
  const donutRemaining = Math.max(0, donutTotal - donutSeen);

  // کارت دایره‌ای سبز: پیشرفت ماهانه
  const focusPercent = monthlyPercent;
  const focusLabel = isAllMode ? '۳۰ روز اخیر (همه دروس)' : `۳۰ روز اخیر (${SUBJECT_LABELS[activeSubject]})`;
  const focusDone = monthlyWatched;
  const focusTotal = baseTotal;
  const focusRemaining = Math.max(0, focusTotal - focusDone);

  // محاسبات برای کارت "کل ثبت‌ها" بر اساس درس انتخابی
  const displayWatchedVideos = useMemo(() => {
    if (chartMode === 'ALL') {
      return watchedVideos;
    } else {
      const activeCfg = configs.find(c => c.subject === activeSubject);
      if (!activeCfg) return 0;
      return Math.max(0, activeCfg.totalVideos - activeCfg.remainingVideos);
    }
  }, [chartMode, watchedVideos, configs, activeSubject]);

  const displayRemainingVideos = useMemo(() => {
    if (chartMode === 'ALL') {
      return remainingVideos;
    } else {
      const activeCfg = configs.find(c => c.subject === activeSubject);
      return activeCfg?.remainingVideos || 0;
    }
  }, [chartMode, remainingVideos, configs, activeSubject]);

  const displayLabel = useMemo(() => {
    if (chartMode === 'ALL') {
      return 'کل ثبت‌ها (همه دروس)';
    } else {
      return `کل ثبت‌ها (${SUBJECT_LABELS[activeSubject]})`;
    }
  }, [chartMode, activeSubject]);

  const dailyWatchPercent = (iso: string) => {
    const scopedLogs =
      chartMode === 'ALL'
        ? logs.filter(l => l.date === iso)
        : logs.filter(l => l.subject === activeSubject && l.date === iso);
    const watched = scopedLogs.reduce((sum, l) => sum + l.count, 0);
    return baseTotal === 0 ? 0 : (watched / baseTotal) * 100;
  };

  const rangeProgressItems: RangeProgressItem[] = useMemo(() => {
    const base = baseTotal || 0;
    const averageWindowPercent = (days: number, offset: number) => {
      if (days <= 0) return 0;
      let acc = 0;
      for (let i = 0; i < days; i++) {
        const iso = toISODate(getRelativeDate(-(i + offset)));
        acc += dailyWatchPercent(iso);
      }
      return acc / days;
    };

    return RANGE_WINDOWS.map(window => {
      const currentAvg = averageWindowPercent(window.days, 0);
      const prevAvg = averageWindowPercent(window.days, window.days);
      const delta = clampRangePercent(currentAvg - prevAvg);
      return { ...window, value: delta };
    });
  }, [logs, chartMode, activeSubject, baseTotal, todayIsoGlobal]);
  const toggleDay = (dayId: number) => {
    const updated = configs.map(cfg => {
      if (cfg.subject !== activeSubject) return cfg;
      const hasDay = cfg.scheduleDays?.includes(dayId);
      const scheduleDays = hasDay ? (cfg.scheduleDays || []).filter(d => d !== dayId) : [...(cfg.scheduleDays || []), dayId];
      return { ...cfg, scheduleDays };
    });
    setConfigs(updated);
    storage.set(storage.keys.VIDEO_CONFIG, updated);
  };

  const addLog = () => {
    // اگر روی حالت «همه» هستیم، اجازه ثبت تماشا نده
    if (chartMode === 'ALL') return;
    if (addCount <= 0) return;

    // اگر برای این درس هیچ تنظیمی انجام نشده (روزهای برنامه یا تعداد ویدیوها مشخص نشده)، اجازه ثبت نده
    const cfg = configs.find(c => c.subject === activeSubject);
    const hasSchedule = cfg?.scheduleDays && cfg.scheduleDays.length > 0;
    const hasTotalConfig = (cfg?.totalVideos || 0) > 0 || (cfg?.remainingVideos || 0) > 0;

    if (!cfg || (!hasSchedule && !hasTotalConfig)) {
      setErrorToast('اول از تنظیمات، روزهای پخش و تعداد ویدیوهای این درس را مشخص کن.');
      setTimeout(() => setErrorToast(null), 2200);
      return;
    }
    const newLog: VideoLog = {
      id: Date.now().toString(),
      date: selectedIso,
      subject: activeSubject,
      count: addCount
    };

    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);
    storage.set(storage.keys.VIDEO_LOGS, updatedLogs);

    const updatedConfigs = configs.map(cfg => {
      if (cfg.subject !== activeSubject) return cfg;
      const doneBefore = cfg.totalVideos - cfg.remainingVideos;
      const newDone = doneBefore + addCount;
      const total = Math.max(cfg.totalVideos, newDone + cfg.remainingVideos);
      const remaining = Math.max(0, cfg.remainingVideos - addCount);
      return { ...cfg, totalVideos: total, remainingVideos: remaining };
    });
    setConfigs(updatedConfigs);
    storage.set(storage.keys.VIDEO_CONFIG, updatedConfigs);

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 1800);
  };

  const recentLogs = useMemo(() => {
    return [...logs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [logs]);

  const scheduledDaysCount = activeConfig.scheduleDays?.length || 0;

  const streak = useMemo(() => {
    let streakCount = 0;
    for (let i = 0; i < 30; i++) {
      const iso = toISODate(getRelativeDate(-i));
      const hasLog = subjectLogs.some(l => l.date === iso);
      if (hasLog) streakCount += 1;
      else break;
    }
    return streakCount;
  }, [subjectLogs]);

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 13; i >= 0; i--) {
      const date = getRelativeDate(-i);
      const iso = toISODate(date);
      const count = subjectLogs.filter(l => l.date === iso).reduce((s, l) => s + l.count, 0);
      data.push({
        label: toPersianDate(date).split(' ').slice(1, 3).join(' '),
        count
      });
    }
    return data;
  }, [subjectLogs]);

  // داده‌های نمودار بزرگ (بازه‌های زمانی قابل تغییر + حالت همه دروس)
  const rangeChartData = useMemo(() => {
    const data: any[] = [];
    for (let i = chartRange - 1; i >= 0; i--) {
      const date = getRelativeDate(-(i + chartOffset));
      const iso = toISODate(date);
      const dayLogs = logs.filter(l => l.date === iso);

      const dateParts = toPersianDate(date).split(' ');
      const weekday = dateParts[0] || '';
      const dayMonth = dateParts.slice(1, 3).join(' ');
      const year = dateParts[3] || '';
      const fullDate = year ? `${dayMonth} ${year}` : dayMonth;

      const point: any = {
        iso,
        label: dayMonth,
        weekday,
        fullDate
      };

      Object.values(VideoSubject).forEach(sub => {
        const sum = dayLogs.filter(l => l.subject === sub).reduce((s, l) => s + l.count, 0);
        point[sub] = sum;
      });

      data.push(point);
    }
    return data;
  }, [logs, chartRange, chartOffset]);

  // بازه‌های زمانی: از یک هفته تا یک سال
  const chartRanges = [7, 14, 30, 60, 90, 180, 365];

  const chartRangeLabel = useMemo(() => {
    const startDate = getRelativeDate(-(chartRange - 1 + chartOffset));
    const endDate = getRelativeDate(-chartOffset);
    const startLabel = toPersianDate(startDate).split(' ').slice(1, 3).join(' ');
    const endLabel = toPersianDate(endDate).split(' ').slice(1, 3).join(' ');
    return `${startLabel} تا ${endLabel}`;
  }, [chartRange, chartOffset]);

  const coverageGrid = useMemo(() => {
    return configs.map(cfg => {
      const done = Math.max(0, cfg.totalVideos - cfg.remainingVideos);
      const percent = cfg.totalVideos === 0 ? 0 : Math.round((done / cfg.totalVideos) * 100);
      return { cfg, done, percent };
    });
  }, [configs]);

  const coverageLast = coverageGrid[coverageGrid.length - 1];
  const coverageOthers = coverageGrid.slice(0, -1);

  const shiftSelectedDate = (offset: number) => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + offset);
      return d;
    });
  };

  // کارت اطلاعات روی هاور نمودار بزرگ
  const renderRangeTooltip = (props: any) => {
    const { active, payload } = props || {};
    if (!active || !payload || !payload.length) return null;

    const p = payload[0].payload as any;

    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-xs text-white shadow-[0_16px_40px_-24px_rgba(0,0,0,0.9)] min-w-[180px]">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-300">{p.weekday}</span>
            <span className="text-sm font-semibold text-cyan-100">{p.fullDate}</span>
          </div>
        </div>
        <div className="space-y-1">
          {payload.map((item: any) => (
            <div key={item.dataKey} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></span>
                <span className="text-[11px] text-slate-200">{item.name}</span>
              </div>
              <span className="text-[11px] text-cyan-100">{item.value} ویدیو</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const openVideoSettings = () => {
    setTempConfigs(configs);
    setSettingsSubject(activeSubject);
    setIsVideoSettingsOpen(true);
  };

  const closeVideoSettings = () => {
    setIsVideoSettingsOpen(false);
    setTempConfigs(null);
  };

  const applyVideoSettings = () => {
    if (!tempConfigs) return;
    setConfigs(tempConfigs);
    storage.set(storage.keys.VIDEO_CONFIG, tempConfigs);
    setIsVideoSettingsOpen(false);
  };

  const toggleScheduleDayInSettings = (dayId: number) => {
    if (!tempConfigs) return;
    setTempConfigs(prev =>
      (prev || []).map(cfg => {
        if (cfg.subject !== settingsSubject) return cfg;
        const hasDay = cfg.scheduleDays?.includes(dayId);
        const scheduleDays = hasDay
          ? (cfg.scheduleDays || []).filter(d => d !== dayId)
          : [...(cfg.scheduleDays || []), dayId];
        return { ...cfg, scheduleDays };
      })
    );
  };

  const updateTotalVideosInSettings = (value: number) => {
    if (!tempConfigs) return;
    setTempConfigs(prev =>
      (prev || []).map(cfg => {
        if (cfg.subject !== settingsSubject) return cfg;
        const done = Math.max(0, cfg.totalVideos - cfg.remainingVideos);
        const totalVideos = Math.max(0, value);
        const remainingVideos = Math.max(0, totalVideos - done);
        return { ...cfg, totalVideos, remainingVideos };
      })
    );
  };

  const canAddLog = chartMode === 'SUBJECT';

  return (
    <div className="space-y-6 animate-enter" dir="rtl">
      {saveToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-2xl bg-emerald-500 text-slate-900 font-bold shadow-[0_18px_40px_-18px_rgba(16,185,129,0.9)]">
          ثبت شد
        </div>
      )}
      {errorToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-2xl bg-rose-500 text-slate-900 font-bold shadow-[0_18px_40px_-18px_rgba(248,113,113,0.9)]">
          {errorToast}
        </div>
      )}

      <section className={progressSectionCardClass}>
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/70 border border-white/10 text-cyan-200 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
              تالار ویدیو | LIVE
            </div>
            <div className="flex items-center gap-2 text-white text-2xl font-black">
              <Activity className="w-6 h-6 text-cyan-300" />
              تقویم برنامه ویدیوها
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Calendar className="w-4 h-4" />
              امروز: {toPersianDate(new Date()).split(' ').slice(1, 3).join(' ')}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 bg-slate-900/60 border border-white/10 rounded-2xl p-2">
            <button
              onClick={() => setChartMode('ALL')}
              className={`${chartCategoryClass(chartMode === 'ALL')} text-sm`}
            >
              همه
            </button>
            {configs.map(cfg => (
              <button
                key={cfg.subject}
                onClick={() => {
                  setActiveSubject(cfg.subject);
                  setChartMode('SUBJECT');
                }}
                className={`${chartCategoryClass(chartMode === 'SUBJECT' && activeSubject === cfg.subject)} text-sm`}
              >
                {SUBJECT_LABELS[cfg.subject]}
              </button>
            ))}
          </div>

          {/* خلاصه‌ی درصد پیشرفت به‌صورت دایره‌ای */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative overflow-hidden rounded-2xl border border-cyan-400/30 bg-slate-950/80 p-4 md:p-5 flex items-center gap-4 shadow-[0_18px_45px_-26px_rgba(34,211,238,0.8)]">
              <div className="absolute inset-0 pointer-events-none opacity-40">
                <div className="absolute -left-8 -top-8 w-24 h-24 bg-cyan-500/30 blur-[80px]"></div>
                <div className="absolute right-0 -bottom-10 w-28 h-28 bg-emerald-500/25 blur-[90px]"></div>
              </div>
              <div className="relative w-24 h-24 md:w-32 md:h-32 shrink-0">
                <div
                  className="absolute inset-0 rounded-full border border-cyan-500/40"
                  style={{
                    background: `conic-gradient(#22d3ee ${donutPercent * 3.6}deg, rgba(148,163,184,0.2) ${
                      donutPercent * 3.6
                    }deg)`
                  }}
                ></div>
                <div className="absolute inset-3 rounded-full bg-slate-950/90 border border-white/10 flex flex-col items-center justify-center text-center px-2">
                  <div className="text-lg md:text-2xl font-black text-cyan-100">{donutPercent}%</div>
                  <div className="text-[10px] md:text-xs text-slate-400">{donutTitle}</div>
                </div>
              </div>
              <div className="relative flex-1 space-y-2 text-xs md:text-sm text-slate-200">
                <div className="flex items-center gap-2 text-cyan-100 font-semibold">
                  <Activity className="w-4 h-4 text-cyan-300" />
                  <span>تمام ویدیوهای ثبت‌شده</span>
                </div>
                <div className="text-slate-300">
                  <span className="font-bold text-emerald-300">{donutSeen}</span> از{' '}
                  <span className="font-bold">{donutTotal}</span> ویدیو دیده شده است.
                </div>
                <div className="text-[11px] text-slate-400">
                  باقی‌مانده:{' '}
                  <span className="font-semibold text-cyan-200">{donutRemaining}</span> ویدیو در همه دروس.
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 flex flex-col justify-center gap-2">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-300" />
                <span>پیشرفت ماهانه ویدیوها</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 shrink-0">
                  <div
                    className="absolute inset-0 rounded-full border border-emerald-400/40"
                    style={{
                      background: `conic-gradient(#4ade80 ${focusPercent * 3.6}deg, rgba(148,163,184,0.2) ${
                        focusPercent * 3.6
                      }deg)`
                    }}
                  ></div>
                  <div className="absolute inset-2 rounded-full bg-slate-950/90 border border-white/10 flex flex-col items-center justify-center text-center">
                    <div className="text-sm font-black text-emerald-100">{focusPercent}%</div>
                  </div>
                </div>
                <div className="space-y-1 text-xs md:text-sm text-slate-200">
                  <div className="font-semibold text-white">{focusLabel}</div>
                  <div className="text-[11px] text-slate-400">
                    در این بازه دیده‌شده: <span className="font-semibold text-emerald-300">{focusDone}</span> /{' '}
                    <span className="font-semibold">{focusTotal}</span> ویدیو
                  </div>
                  <div className="text-[11px] text-slate-400">
                    باقی‌مانده نسبت به کل:{' '}
                    <span className="font-semibold text-cyan-200">{focusRemaining}</span> ویدیو
                  </div>
                </div>
              </div>
            </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 flex flex-col justify-center gap-2">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Clock4 className="w-4 h-4 text-cyan-300" />
              <span>برنامه هفتگی و استریک</span>
            </div>
              <div className="flex items-center justify-between text-sm text-white">
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-400">روزهای برنامه‌ریزی‌شده</span>
                  <span className="text-xl font-black text-cyan-300">{scheduledDaysCount}</span>
                  <span className="text-[11px] text-slate-500">روز در هفته</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[11px] text-slate-400">استریک تماشا</span>
                  <span className="text-xl font-black text-amber-300">{streak}</span>
                  <span className="text-[11px] text-slate-500">روز متوالی</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <section >
        <RangeProgressRow
          title="ریتم بازه‌ای تماشا"
          subtitle="درصد تماشای برنامه‌ریزی‌شده در بازه‌های اخیر"
          items={rangeProgressItems}
        />
      </section>

  <section className={sectionCardClass}>
        <SectionGlow />
        <div className="relative flex flex-col gap-6">
          {/* ردیاب ثبت تماشا + نمای کلی ثبت ویدیوها */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-stretch">
            <div className="relative rounded-[22px] border border-white/10 bg-slate-950/70 p-4 md:p-6 flex flex-col gap-4 overflow-hidden">
              <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute -left-10 top-0 w-32 h-32 bg-cyan-500/15 blur-[90px]"></div>
                <div className="absolute right-0 bottom-0 w-40 h-40 bg-emerald-500/10 blur-[110px]"></div>
              </div>

              <div className="relative flex flex-col gap-4 lg:items-center h-full">
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 lg:p-6 flex flex-col gap-3 shadow-inner flex-1">
                  <div className="flex items-center justify-between text-white font-bold gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 text-cyan-300" />
                      <span>ثبت تماشا</span>
                      <span className="text-[10px] text-cyan-200/80 bg-cyan-500/10 border border-cyan-400/40 px-2 py-0.5 rounded-full">
                        پرش کن به روزی که می‌خواهی
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="hidden sm:inline-block text-slate-400">تاریخ انتخابی:</span>
                      <span className="px-2 py-1 rounded-lg bg-slate-950/70 border border-white/10 text-[11px]">
                        {selectedDateLabel}
                      </span>
                      <button
                        onClick={() => shiftSelectedDate(-1)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/70 border border-white/10 hover:border-cyan-400/50 transition"
                      >
                        <ArrowRight className="w-3 h-3" />
                        <span>روز قبل</span>
                      </button>
                      <button
                        onClick={() => shiftSelectedDate(1)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/70 border border-white/10 hover:border-emerald-400/50 transition"
                      >
                        <span>روز بعد</span>
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-[52px,1fr,52px] items-center gap-3">
                    <button
                      onClick={() => canAddLog && setAddCount(c => Math.max(0, c - 1))}
                      disabled={!canAddLog}
                      className={`h-12 w-12 rounded-xl border text-slate-200 flex items-center justify-center transition ${
                        canAddLog
                          ? 'bg-white/5 border-white/10 hover:border-cyan-400/50'
                          : 'bg-slate-800/60 border-slate-700 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <input
                      type="number"
                      value={addCount}
                      min={0}
                      disabled={!canAddLog}
                      onChange={e => setAddCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className={`w-full h-12 rounded-xl px-4 bg-slate-950/60 border text-white text-center text-xl font-black outline-none ${
                        canAddLog ? 'border-white/10 focus:border-cyan-400' : 'border-slate-700 opacity-60 cursor-not-allowed'
                      }`}
                    />
                    <button
                      onClick={() => canAddLog && setAddCount(c => c + 1)}
                      disabled={!canAddLog}
                      className={`h-12 w-12 rounded-xl font-bold flex items-center justify-center transition shadow-[0_10px_30px_-15px_rgba(34,211,238,0.8)] ${
                        canAddLog
                          ? 'bg-cyan-500 text-slate-900 hover:bg-cyan-400'
                          : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60 shadow-none'
                      }`}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <button
                    onClick={addLog}
                    disabled={!canAddLog}
                    className={`w-full mt-1 px-4 py-3 rounded-2xl font-black flex items-center justify-center gap-2 transition ${
                      canAddLog
                        ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-900 shadow-[0_18px_40px_-20px_rgba(16,185,129,0.85)] hover:shadow-[0_18px_50px_-20px_rgba(16,185,129,1)]'
                        : 'bg-slate-700/80 text-slate-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Play className="w-5 h-5" />
                    {canAddLog ? `ثبت تماشا برای ${SUBJECT_LABELS[activeSubject]}` : 'برای ثبت تماشا یک درس را از بالا انتخاب کن'}
                  </button>
                </div>
              </div>
            </div>

            <div className="relative rounded-[22px] border border-white/10 bg-slate-950/70 p-4 flex flex-col gap-4 overflow-hidden">
              <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute -left-10 top-0 w-28 h-28 bg-emerald-500/15 blur-[90px]"></div>
                <div className="absolute right-0 bottom-0 w-32 h-32 bg-cyan-500/15 blur-[100px]"></div>
              </div>
              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Sparkles className="w-5 h-5 text-emerald-300" />
                  <span>نمای کلی ثبت ویدیوها</span>
                </div>
                    <button
                  onClick={openVideoSettings}
                  className="p-2 rounded-xl bg-slate-900/70 border border-white/10 text-slate-300 hover:text-cyan-300 hover:border-cyan-400/60 transition"
                >
                  <Settings2 className="w-4 h-4" />
                    </button>
              </div>

              <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-400">{displayLabel}</div>
                  <div className="text-2xl font-black text-emerald-300">{displayWatchedVideos}</div>
                  <div className="text-[11px] text-slate-500">باقی‌مانده: {displayRemainingVideos}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-400">پیشرفت {SUBJECT_LABELS[activeSubject]}</div>
                  <div className="text-2xl font-black text-white">{subjectPercent}%</div>
                  <div className="text-[11px] text-slate-500">
                    {subjectDone}/{subjectTotal || 0} ویدیو
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-400">برنامه‌های هفتگی</div>
                  <div className="text-2xl font-black text-cyan-300">{scheduledDaysCount}</div>
                  <div className="text-[11px] text-slate-500">روز در هفته</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-400">استریک</div>
                  <div className="text-2xl font-black text-amber-300">{streak}</div>
                  <div className="text-[11px] text-slate-500">روز متوالی</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

  <section className={sectionCardClass}>
        <SectionGlow />
        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="relative rounded-[22px] border border-white/10 bg-slate-950/70 p-5 md:p-6 flex flex-col gap-4 overflow-hidden lg:col-span-2">
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute left-0 top-0 w-36 h-36 bg-cyan-500/15 blur-[110px]"></div>
                <div className="absolute right-0 bottom-0 w-40 h-40 bg-purple-500/10 blur-[120px]"></div>
              </div>
              <div className="relative flex items-center justify-between text-white font-bold">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-300" />
                  پوشش دروس
                </div>
                <div className="text-xs text-slate-500">نمای کلی</div>
              </div>
              <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4">
                {coverageOthers.map(item => (
                  <div key={item.cfg.subject} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold">{SUBJECT_LABELS[item.cfg.subject]}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.done}/{item.cfg.totalVideos || 0} ثبت | باقی: {item.cfg.remainingVideos}
                        </div>
                      </div>
                      <div className="text-sm font-black text-cyan-200">{item.percent}%</div>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500"
                        style={{ width: `${item.percent}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                {/* اسپیسِ خالی برای اینکه فیزیک زیر گسسته قرار بگیرد */}
                <div className="hidden sm:block"></div>
                {coverageLast && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold">{SUBJECT_LABELS[coverageLast.cfg.subject]}</div>
                        <div className="text-[11px] text-slate-500">
                          {coverageLast.done}/{coverageLast.cfg.totalVideos || 0} ثبت | باقی: {coverageLast.cfg.remainingVideos}
                        </div>
                      </div>
                      <div className="text-sm font-black text-cyan-200">{coverageLast.percent}%</div>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500"
                        style={{ width: `${coverageLast.percent}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative rounded-[22px] border border-white/10 bg-slate-950/70 p-4 flex flex-col gap-3 overflow-hidden">
              <div className="absolute inset-0 opacity-25 pointer-events-none">
                <div className="absolute right-0 top-0 w-28 h-28 bg-amber-500/20 blur-[100px]"></div>
                <div className="absolute left-0 bottom-0 w-28 h-28 bg-cyan-500/15 blur-[90px]"></div>
              </div>
              <div className="relative flex items-center justify-between text-white font-bold">
                <div className="flex items-center gap-2">
                  <Clock4 className="w-5 h-5 text-cyan-300" />
                  آرشیو ۱۰ مورد آخر
                </div>
                <div className="text-xs text-slate-500">{logs.length} رکورد</div>
              </div>
              <div className="relative space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                {logs.length === 0 && <div className="text-slate-500 text-sm">ویدیویی ثبت نشده است.</div>}
                {[...logs]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 10)
                  .map(log => (
                    <div
                      key={log.id}
                      className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-900 font-black flex items-center justify-center shadow">
                          {log.count}
                        </div>
                        <div className="text-white text-sm font-bold">{SUBJECT_LABELS[log.subject]}</div>
                      </div>
                      <div className="text-xs text-slate-400 sm:text-center">{log.date}</div>
                      <div className="text-xs text-cyan-200 font-semibold sm:text-center">
                        {toPersianDate(new Date(log.date)).split(' ').slice(1, 3).join(' ')}
                      </div>
                      <div className="text-xs text-slate-400 sm:text-right">کد: {log.id.slice(-6)}</div>
                    </div>
                  ))}
              </div>
            </div>
        </div>
      </section>

  <section className={sectionCardClass}>
        <SectionGlow />
        <div className="relative flex flex-col gap-6">
          {/* نمودار بزرگ شبیه بخش برنامه‌ریزی روزانه */}
          <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/80 p-5 md:p-6 shadow-[0_26px_70px_-34px_rgba(0,0,0,0.95)] mt-2">
            <div className="absolute inset-0 pointer-events-none opacity-40">
              <div className="absolute -left-10 top-0 w-36 h-36 bg-cyan-500/25 blur-[100px]"></div>
              <div className="absolute right-0 -bottom-10 w-40 h-40 bg-purple-500/25 blur-[110px]"></div>
            </div>
            <div className="relative flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 text-white">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400/30 via-emerald-400/25 to-blue-500/20 flex items-center justify-center border border-white/10 shadow-[0_12px_32px_-18px_rgba(34,211,238,0.7)]">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-cyan-100/80">نمودار کلی ردیاب ویدیوها</p>
                    <h3 className="text-lg md:text-xl font-bold">
                      {chartMode === 'ALL' ? 'مقایسه همه درس‌ها در طول زمان' : `نمودار ${SUBJECT_LABELS[activeSubject]} در بازه‌های زمانی`}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {chartRanges.map(r => (
                  <button
                    key={r}
                    onClick={() => {
                      setChartRange(r);
                      setChartOffset(0);
                    }}
                    className={chartCategoryClass(chartRange === r)}
                  >
                    {r === 7 && '۷ روز'}
                    {r === 14 && '۱۴ روز'}
                    {r === 30 && '۳۰ روز'}
                    {r === 60 && '۲ ماه'}
                    {r === 90 && '۳ ماه'}
                    {r === 180 && '۶ ماه'}
                    {r === 365 && '۱ سال'}
                  </button>
                ))}
              </div>

              <div className="relative h-[260px] w-full">
                <ResponsiveContainer width="99%" height="100%">
                  <AreaChart data={rangeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      {Object.entries(SUBJECT_COLORS).map(([sub, cfg]) => (
                        <linearGradient key={sub} id={cfg.gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={cfg.stroke} stopOpacity={0.85} />
                          <stop offset="95%" stopColor={cfg.stroke} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} stroke="#94a3b8" tick={{ fontSize: 10 }} width={32} />
                    <Tooltip content={renderRangeTooltip} />
                    {chartMode === 'ALL'
                      ? Object.values(VideoSubject).map(sub => {
                          const cfg = SUBJECT_COLORS[sub];
                          return (
                            <Area
                              key={sub}
                              type="monotone"
                              dataKey={sub}
                              name={SUBJECT_LABELS[sub]}
                              stroke={cfg.stroke}
                              fill={`url(#${cfg.gradientId})`}
                              strokeWidth={2.5}
                              dot={false}
                              activeDot={{ r: 4 }}
                            />
                          );
                        })
                      : (() => {
                          const cfg = SUBJECT_COLORS[activeSubject];
                          return (
                            <Area
                              type="monotone"
                              dataKey={activeSubject}
                              name={SUBJECT_LABELS[activeSubject]}
                              stroke={cfg.stroke}
                              fill={`url(#${cfg.gradientId})`}
                              strokeWidth={3}
                              dot={false}
                              activeDot={{ r: 5 }}
                            />
                          );
                        })()}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      

      

      

      {isVideoSettingsOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl">
          <div className="relative w-full max-w-5xl max-h-[90vh] glass-card border border-cyan-400/40 rounded-3xl overflow-hidden shadow-[0_25px_90px_-40px_rgba(34,211,238,0.6)] overflow-y-auto">
            <div className="absolute inset-0 opacity-70 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900"></div>
            <div className="relative p-6 md:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-cyan-200/80">تنظیمات برنامه‌ریزی ویدیوها</p>
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-cyan-300" />
                    <h3 className="text-2xl font-bold text-white">زمان‌بندی هفتگی و تعداد ویدیوها</h3>
                  </div>
                  <p className="text-sm text-slate-300">
                    برای هر درس مشخص کن در چه روزهایی از هفته ویدیوها پخش شوند و تعداد کل ویدیوهای آن درس چقدر است.
                  </p>
                </div>
                <button
                  onClick={closeVideoSettings}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 bg-slate-900/60 border border-cyan-400/30 rounded-2xl p-2">
                {configs.map(cfg => (
                  <button
                    key={cfg.subject}
                    onClick={() => setSettingsSubject(cfg.subject)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition ${
                      settingsSubject === cfg.subject
                        ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-900 shadow-[0_0_18px_rgba(34,211,238,0.4)]'
                        : 'bg-white/5 border border-white/10 text-slate-200 hover:border-cyan-400/50'
                    }`}
                  >
                    {SUBJECT_LABELS[cfg.subject]}
                  </button>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div>
                      <div className="text-xs text-slate-400">روزهای تایم‌لاین ویدیو</div>
                      <div className="text-sm font-semibold text-white">
                        {`برای درس ${SUBJECT_LABELS[settingsSubject]}`}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-3 gap-2">
                    {DAY_LABELS.map(day => {
                      const list = (tempConfigs || configs).filter(cfg => cfg.subject === settingsSubject);
                      const isActive =
                        list.length > 0 &&
                        list.every(cfg => cfg.scheduleDays?.includes(day.id));
                      return (
                        <button
                          key={day.id}
                          onClick={() => toggleScheduleDayInSettings(day.id)}
                          className={`rounded-xl border px-3 py-2 text-sm flex items-center justify-between transition ${
                            isActive
                              ? 'bg-cyan-500/15 border-cyan-400/60 text-white'
                              : 'bg-slate-900/50 border-white/5 text-slate-200 hover:border-cyan-400/40'
                          }`}
                        >
                          <span>{day.label}</span>
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isActive ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-slate-600'
                            }`}
                          ></span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-400">
                    اگر برای یک درس مثلاً «یکشنبه» را فعال کنی، آن درس هر هفته در همین روز در تایم‌لاین نشان داده می‌شود.
                  </p>
                </div>

                <div className="bg-slate-900/60 border border-cyan-400/30 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-400">تعداد کل ویدیوها</div>
                      <div className="text-sm font-semibold text-white">
                          {SUBJECT_LABELS[settingsSubject]}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 block">تعداد کل ویدیو برای این درس</label>
                    <input
                      type="number"
                      min={0}
                      value={
                        (tempConfigs || configs).find(cfg => cfg.subject === settingsSubject)?.totalVideos ?? 0
                      }
                      onChange={e => updateTotalVideosInSettings(Number(e.target.value) || 0)}
                      className="w-full rounded-xl bg-slate-950/70 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-[11px] text-slate-400">
                      براساس این عدد، مقدار «باقی‌مانده» هر درس هم به‌صورت خودکار تنظیم می‌شود.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={applyVideoSettings}
                      disabled={!tempConfigs}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-900 font-bold shadow-[0_0_18px_rgba(34,211,238,0.45)] hover:from-cyan-300 hover:to-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ذخیره تنظیمات
                    </button>
                    <button
                      onClick={closeVideoSettings}
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
        , document.body
      )}
    </div>
  );
};

