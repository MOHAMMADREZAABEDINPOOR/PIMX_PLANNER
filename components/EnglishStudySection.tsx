import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calendar, Sparkles, Activity, Clock4, BookOpen, ArrowLeft, ArrowRight, Settings2, X, Languages, TrendingUp, Award } from 'lucide-react';
import { StudyConfig, StudyLog, StudySubject } from '../types';
import { storage, toISODate, toPersianDate, getRelativeDate } from '../utils';
import { RangeProgressRow, RANGE_WINDOWS, RangeProgressItem, clampRangePercent } from './RangeProgressRow';

// تبدیل ساعت.دقیقه به ساعت اعشاری
const parseTimeInput = (value: string): number => {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.');
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    if (minutes >= 10 && minutes < 60) {
      return hours + (minutes / 60);
    }
    return hours + (minutes / 10);
  }
  
  return parseFloat(trimmed) || 0;
};

// تبدیل ساعت اعشاری به فرمت ساعت.دقیقه برای نمایش
const formatTimeDisplay = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return h.toString();
  return `${h}.${m.toString().padStart(2, '0')}`;
};

export const EnglishStudySection: React.FC = () => {
  const [configs, setConfigs] = useState<StudyConfig[]>([]);
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [timeInput, setTimeInput] = useState<string>('1.00');
  const [saveToast, setSaveToast] = useState<boolean>(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<number>(14);
  const [selectedDateDetails, setSelectedDateDetails] = useState<Date>(new Date());
  const [selectedDateLog, setSelectedDateLog] = useState<Date>(new Date());
  const [isStudySettingsOpen, setIsStudySettingsOpen] = useState<boolean>(false);
  const [tempConfigs, setTempConfigs] = useState<StudyConfig[] | null>(null);

  // فیلتر کردن فقط برای زبان انگلیسی
  const englishSubject = StudySubject.ENGLISH;
  const englishLogs = useMemo(() => logs.filter(l => l.subject === englishSubject), [logs]);
  const englishConfig = useMemo(() => configs.find(c => c.subject === englishSubject), [configs]);

  useEffect(() => {
    const storedConfigs = storage.get<StudyConfig[]>(storage.keys.STUDY_CONFIG, []);
    const storedLogs = storage.get<StudyLog[]>(storage.keys.STUDY_LOGS, []);
    const normalizedConfigs = Array.isArray(storedConfigs) ? storedConfigs : [];
    const normalizedLogs = Array.isArray(storedLogs) ? storedLogs : [];
    setConfigs(normalizedConfigs);
    setLogs(normalizedLogs);
  }, []);

  const selectedIsoDetails = useMemo(() => toISODate(selectedDateDetails), [selectedDateDetails]);
  const selectedDateLabelDetails = useMemo(
    () => toPersianDate(selectedDateDetails).split(' ').slice(1, 3).join(' '),
    [selectedDateDetails]
  );
  const selectedIsoLog = useMemo(() => toISODate(selectedDateLog), [selectedDateLog]);
  const selectedDateLabelLog = useMemo(
    () => toPersianDate(selectedDateLog).split(' ').slice(1, 3).join(' '),
    [selectedDateLog]
  );

  const totalStudiedHours = englishLogs.reduce((sum, l) => sum + l.hours, 0);

  // ساعت‌های مطالعه روز انتخابی
  const selectedDateStudied = useMemo(
    () =>
      englishLogs
        .filter(l => l.date === selectedIsoDetails)
        .reduce((s, l) => s + l.hours, 0),
    [englishLogs, selectedIsoDetails]
  );

  // ساعت‌های مطالعه روز انتخابی (برای نمایش در کارت)
  const selectedDayStudied = useMemo(
    () => selectedDateStudied,
    [selectedDateStudied]
  );

  // ۳۰ روز اخیر بر اساس تاریخ انتخابی
  const monthlyStudied = useMemo(() => {
    const endDate = selectedDateDetails;
    const start = toISODate(getRelativeDate(-29, endDate));
    const end = selectedIsoDetails;
    return englishLogs
      .filter(l => l.date >= start && l.date <= end)
      .reduce((s, l) => s + l.hours, 0);
  }, [englishLogs, selectedDateDetails, selectedIsoDetails]);

  // محاسبه رشد در بازه‌های مختلف بر اساس تاریخ انتخابی
  const getGrowthData = useMemo(() => {
    const baseDate = selectedDateDetails;
    const baseIso = selectedIsoDetails;
    
    const getHoursInRange = (days: number) => {
      const start = toISODate(getRelativeDate(-days, baseDate));
      return englishLogs
        .filter(l => l.date >= start && l.date <= baseIso)
        .reduce((s, l) => s + l.hours, 0);
    };

    const getPreviousRangeHours = (days: number) => {
      const start = toISODate(getRelativeDate(-days * 2, baseDate));
      const end = toISODate(getRelativeDate(-days, baseDate));
      return englishLogs
        .filter(l => l.date >= start && l.date < end)
        .reduce((s, l) => s + l.hours, 0);
    };

    const calculateGrowth = (days: number) => {
      const current = getHoursInRange(days);
      const previous = getPreviousRangeHours(days);
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      threeDays: { hours: getHoursInRange(3), growth: calculateGrowth(3) },
      oneWeek: { hours: getHoursInRange(7), growth: calculateGrowth(7) },
      oneMonth: { hours: getHoursInRange(30), growth: calculateGrowth(30) },
      threeMonths: { hours: getHoursInRange(90), growth: calculateGrowth(90) }
    };
  }, [englishLogs, selectedDateDetails, selectedIsoDetails]);

  // محاسبه میانگین بهره‌وری بر اساس تاریخ انتخابی
  const productivityData = useMemo(() => {
    const baseDate = selectedDateDetails;
    const baseIso = selectedIsoDetails;
    
    const getAverageHours = (days: number) => {
      const start = toISODate(getRelativeDate(-days, baseDate));
      const filtered = englishLogs.filter(l => l.date >= start && l.date <= baseIso);
      if (filtered.length === 0) return 0;
      const total = filtered.reduce((s, l) => s + l.hours, 0);
      return (total / days) * 100;
    };

    return {
      threeDays: getAverageHours(3),
      sevenDays: getAverageHours(7),
      thirtyDays: getAverageHours(30),
      ninetyDays: getAverageHours(90),
      oneEightyDays: getAverageHours(180),
      threeSixtyFiveDays: getAverageHours(365)
    };
  }, [englishLogs, selectedDateDetails, selectedIsoDetails]);

  // محاسبه ریتم بازه‌ای زبان انگلیسی
  const englishRangeItems: RangeProgressItem[] = useMemo(() => {
    const todayIso = toISODate(new Date());
    return RANGE_WINDOWS.map(window => {
      const todayDate = new Date(`${todayIso}T12:00:00`);
      let currentSum = 0;
      let prevSum = 0;
      for (let i = 0; i < window.days; i++) {
        const iso = toISODate(getRelativeDate(-i, todayDate));
        const currentDay = englishLogs.filter(s => s.date === iso);
        currentSum += currentDay.length > 0 ? 1 : 0;
        const prevIso = toISODate(getRelativeDate(-(i + window.days), todayDate));
        const prevDay = englishLogs.filter(s => s.date === prevIso);
        prevSum += prevDay.length > 0 ? 1 : 0;
      }
      const currentAvg = (currentSum / window.days) * 100;
      const prevAvg = (prevSum / window.days) * 100;
      return { ...window, value: clampRangePercent(currentAvg - prevAvg) };
    });
  }, [englishLogs]);

  const addLog = () => {
    const hours = parseTimeInput(timeInput);
    if (hours <= 0) {
      setErrorToast('لطفاً زمان مطالعه را وارد کن');
      setTimeout(() => setErrorToast(null), 2200);
      return;
    }

    const newLog: StudyLog = {
      id: Date.now().toString(),
      date: selectedIsoLog,
      subject: englishSubject,
      hours: hours
    };

    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);
    storage.set(storage.keys.STUDY_LOGS, updatedLogs);

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 1800);
    setTimeInput('1.00');
  };

  const recentLogs = useMemo(() => {
    return [...englishLogs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [englishLogs]);

  const shiftSelectedDateDetails = (offset: number) => {
    setSelectedDateDetails(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + offset);
      return d;
    });
  };

  const shiftSelectedDateLog = (offset: number) => {
    setSelectedDateLog(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + offset);
      return d;
    });
  };

  const resetToTodayDetails = () => {
    setSelectedDateDetails(new Date());
  };

  const resetToTodayLog = () => {
    setSelectedDateLog(new Date());
  };

  // داده‌های نمودار - همیشه بر اساس امروز و منزوی از تاریخ انتخابی
  const chartData = useMemo(() => {
    const data: any[] = [];
    const today = new Date();
    const todayIso = toISODate(today);
    
    for (let i = chartRange - 1; i >= 0; i--) {
      const date = getRelativeDate(-i, today);
      const iso = toISODate(date);
      
      // تاریخ‌های آینده را نشان نده
      if (iso > todayIso) {
        break;
      }
      
      const dayLogs = englishLogs.filter(l => l.date === iso);
      const hours = dayLogs.reduce((sum, l) => sum + l.hours, 0);

      const dateParts = toPersianDate(date).split(' ');
      const dayMonth = dateParts.slice(1, 3).join(' ');

      data.push({
        iso,
        label: dayMonth,
        hours
      });
    }
    return data;
  }, [englishLogs, chartRange]);

  const chartRanges = [7, 14, 30, 60, 90, 180, 365];

  const openStudySettings = () => {
    setTempConfigs(configs);
    setIsStudySettingsOpen(true);
  };

  const closeStudySettings = () => {
    setIsStudySettingsOpen(false);
    setTempConfigs(null);
  };

  const applyStudySettings = () => {
    if (!tempConfigs) return;
    setConfigs(tempConfigs);
    storage.set(storage.keys.STUDY_CONFIG, tempConfigs);
    setIsStudySettingsOpen(false);
  };

  const updateTotalHoursInSettings = (value: number) => {
    if (!tempConfigs) return;
    const existingConfig = tempConfigs.find(c => c.subject === englishSubject);
    const updatedConfigs = existingConfig
      ? tempConfigs.map(c => c.subject === englishSubject ? { ...c, totalHours: Math.max(0, value) } : c)
      : [...tempConfigs, { subject: englishSubject, totalHours: Math.max(0, value), scheduleDays: [] }];
    setTempConfigs(updatedConfigs);
  };

  const renderTooltip = (props: any) => {
    const { active, payload } = props || {};
    if (!active || !payload || !payload.length) return null;
    const p = payload[0].payload as any;
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-xs text-white shadow-[0_16px_40px_-24px_rgba(0,0,0,0.9)]">
        <div className="text-sm font-semibold text-amber-100 mb-2">{p.label}</div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-200">ساعت مطالعه</span>
          <span className="text-amber-100 font-bold">{p.hours?.toFixed(2) || 0} ساعت</span>
        </div>
      </div>
    );
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

  const toggleScheduleDayInSettings = (dayId: number) => {
    if (!tempConfigs) return;
    const existingConfig = tempConfigs.find(c => c.subject === englishSubject);
    const hasDay = existingConfig?.scheduleDays?.includes(dayId);
    const scheduleDays = hasDay
      ? (existingConfig?.scheduleDays || []).filter(d => d !== dayId)
      : [...(existingConfig?.scheduleDays || []), dayId];
    
    const updatedConfigs = existingConfig
      ? tempConfigs.map(c => c.subject === englishSubject ? { ...c, scheduleDays } : c)
      : [...tempConfigs, { subject: englishSubject, totalHours: existingConfig?.totalHours || 0, scheduleDays }];
    setTempConfigs(updatedConfigs);
  };

  return (
    <div className="space-y-6 animate-enter" dir="rtl">
      {saveToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-2xl bg-amber-500 text-slate-900 font-bold shadow-[0_18px_40px_-18px_rgba(245,158,11,0.9)]">
          ثبت شد
        </div>
      )}
      {errorToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-2xl bg-rose-500 text-slate-900 font-bold shadow-[0_18px_40px_-18px_rgba(248,113,113,0.9)]">
          {errorToast}
        </div>
      )}

      {/* هدر با آیکون زبان */}
      <section className="relative overflow-hidden rounded-[32px] border border-amber-500/30 bg-gradient-to-br from-slate-950 via-amber-950/20 to-orange-950/10 p-8 shadow-[0_20px_70px_-30px_rgba(245,158,11,0.4)]">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -left-16 -top-16 w-64 h-64 rounded-full bg-amber-500/20 blur-[120px]"></div>
          <div className="absolute right-0 -bottom-16 w-72 h-72 rounded-full bg-orange-500/15 blur-[140px]"></div>
        </div>
        <div className="relative flex items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/40 to-orange-500/40 flex items-center justify-center border-2 border-amber-400/50 shadow-[0_0_30px_rgba(245,158,11,0.4)]">
              <Languages className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white mb-1">زبان انگلیسی</h2>
              <p className="text-amber-200/80 text-sm">مدیریت و پیگیری مطالعه زبان انگلیسی</p>
            </div>
          </div>
        </div>
      </section>

      {/* کارت‌های آماری اصلی - طراحی افقی */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-slate-950 to-amber-950/20 p-6 shadow-[0_10px_40px_-20px_rgba(245,158,11,0.3)]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Clock4 className="w-5 h-5 text-amber-300" />
              <span className="text-xs text-amber-200/70">{selectedIsoDetails === toISODate(new Date()) ? 'امروز' : 'روز انتخابی'}</span>
            </div>
            <div className="text-3xl font-black text-amber-300 mb-1">{selectedDayStudied.toFixed(1)}</div>
            <div className="text-xs text-slate-400">ساعت مطالعه</div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-orange-400/30 bg-gradient-to-br from-slate-950 to-orange-950/20 p-6 shadow-[0_10px_40px_-20px_rgba(249,115,22,0.3)]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-orange-300" />
              <span className="text-xs text-orange-200/70">۳۰ روز تا {selectedIsoDetails === toISODate(new Date()) ? 'امروز' : 'روز انتخابی'}</span>
            </div>
            <div className="text-3xl font-black text-orange-300 mb-1">{monthlyStudied.toFixed(1)}</div>
            <div className="text-xs text-slate-400">ساعت مطالعه</div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-slate-950 to-yellow-950/20 p-6 shadow-[0_10px_40px_-20px_rgba(234,179,8,0.3)]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-yellow-300" />
              <span className="text-xs text-yellow-200/70">کل ساعت‌ها</span>
            </div>
            <div className="text-3xl font-black text-yellow-300 mb-1">{totalStudiedHours.toFixed(1)}</div>
            <div className="text-xs text-slate-400">ساعت مطالعه</div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-slate-950 to-amber-950/20 p-6 shadow-[0_10px_40px_-20px_rgba(245,158,11,0.3)]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-amber-300" />
              <span className="text-xs text-amber-200/70">رشد هفتگی</span>
            </div>
            <div className={`text-3xl font-black mb-1 ${getGrowthData.oneWeek.growth >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {getGrowthData.oneWeek.growth >= 0 ? '+' : ''}{getGrowthData.oneWeek.growth.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400">نسبت به هفته قبل</div>
          </div>
        </div>
      </section>

      {/* بخش ثبت مطالعه و جزئیات روز */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ثبت مطالعه */}
        <div className="relative overflow-hidden rounded-[32px] border border-amber-500/20 bg-gradient-to-br from-slate-950 via-amber-950/10 to-slate-950 p-6 md:p-8 shadow-[0_20px_70px_-30px_rgba(245,158,11,0.3)]">
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute -left-16 -top-16 w-48 h-48 rounded-full bg-amber-500/15 blur-[110px]"></div>
            <div className="absolute right-0 bottom-0 w-64 h-64 rounded-full bg-orange-500/12 blur-[140px]"></div>
          </div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/30 to-orange-400/30 flex items-center justify-center border border-amber-400/40">
                <BookOpen className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">ثبت ساعت مطالعه</h2>
                <p className="text-xs text-amber-200/70">زمان مطالعه زبان انگلیسی را ثبت کن</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 mb-1.5 block">زمان مطالعه (مثلاً 1.20)</label>
                <input
                  type="text"
                  value={timeInput}
                  onChange={e => setTimeInput(e.target.value)}
                  placeholder="1.20"
                  className="w-full h-12 rounded-xl px-3 bg-slate-950/60 border border-white/10 text-white text-center text-lg font-black outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 mb-1.5 block">تاریخ مطالعه</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => shiftSelectedDateLog(1)}
                      className="h-12 w-12 rounded-xl bg-slate-900/60 border border-white/10 text-slate-300 hover:text-amber-300 hover:border-amber-400/50 transition flex items-center justify-center"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <div className="flex-1 h-12 rounded-xl bg-slate-900/60 border border-white/10 px-3 flex items-center justify-center text-white text-sm">
                      <span className="font-semibold">{selectedDateLabelLog}</span>
                    </div>
                    <button
                      onClick={() => shiftSelectedDateLog(-1)}
                      className="h-12 w-12 rounded-xl bg-slate-900/60 border border-white/10 text-slate-300 hover:text-amber-300 hover:border-amber-400/50 transition flex items-center justify-center"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={resetToTodayLog}
                    className="w-full h-10 rounded-xl bg-slate-900/60 border border-white/10 text-slate-300 hover:text-amber-300 hover:border-amber-400/50 transition text-sm flex items-center justify-center gap-1"
                  >
                    <Calendar className="w-4 h-4" />
                    بازگشت به امروز
                  </button>
                </div>
              </div>

              <button
                onClick={addLog}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 font-black flex items-center justify-center gap-2 shadow-[0_18px_40px_-20px_rgba(245,158,11,0.85)] hover:shadow-[0_18px_50px_-20px_rgba(245,158,11,1)] transition text-sm"
              >
                <BookOpen className="w-4 h-4" />
                ثبت مطالعه
              </button>
            </div>
          </div>
        </div>

        {/* جزئیات روز انتخابی */}
        <div className="relative overflow-hidden rounded-[32px] border border-orange-500/20 bg-gradient-to-br from-slate-950 via-orange-950/10 to-slate-950 p-6 md:p-8 shadow-[0_20px_70px_-30px_rgba(249,115,22,0.3)]">
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute -left-16 -top-16 w-48 h-48 rounded-full bg-orange-500/15 blur-[110px]"></div>
            <div className="absolute right-0 bottom-0 w-64 h-64 rounded-full bg-amber-500/12 blur-[140px]"></div>
          </div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-5 h-5 text-orange-300" />
              <h3 className="text-lg font-bold text-white">جزئیات روز</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-400 mb-1">تاریخ</div>
                <div className="text-lg font-bold text-white">{toPersianDate(selectedDateDetails).split(' ').slice(1, 4).join(' ')}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-slate-400 mb-2">ساعت مطالعه</div>
                <div className="text-3xl font-black text-orange-300 mb-2">{selectedDateStudied.toFixed(1)}</div>
                <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400"
                    style={{ width: `${Math.min(100, (selectedDateStudied / 8) * 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => shiftSelectedDateDetails(1)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-slate-300 hover:text-orange-300 hover:border-orange-400/50 transition text-sm flex items-center justify-center gap-1"
                  >
                    <ArrowRight className="w-4 h-4" />
                    روز بعد
                  </button>
                  <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-slate-400">
                    {toISODate(selectedDateDetails)}
                  </div>
                  <button
                    onClick={() => shiftSelectedDateDetails(-1)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-slate-300 hover:text-orange-300 hover:border-orange-400/50 transition text-sm flex items-center justify-center gap-1"
                  >
                    روز قبل
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={resetToTodayDetails}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-slate-300 hover:text-orange-300 hover:border-orange-400/50 transition text-sm flex items-center justify-center gap-1"
                >
                  <Calendar className="w-4 h-4" />
                  بازگشت به امروز
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* نمودار */}
      <section className="relative overflow-hidden rounded-[32px] border border-amber-500/20 bg-gradient-to-br from-slate-950 via-amber-950/10 to-slate-950 p-6 md:p-8 shadow-[0_20px_70px_-30px_rgba(245,158,11,0.2)]">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -left-16 -top-16 w-48 h-48 rounded-full bg-amber-500/15 blur-[110px]"></div>
          <div className="absolute right-0 -bottom-16 w-64 h-64 rounded-full bg-orange-500/12 blur-[140px]"></div>
        </div>
        <div className="relative">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/30 to-orange-400/30 flex items-center justify-center border border-amber-400/40">
                <Activity className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">نمودار مطالعه</h3>
                <p className="text-sm text-amber-200/70">تحلیل ساعت‌های مطالعه در بازه‌های زمانی مختلف</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {chartRanges.map(r => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={`px-4 py-1.5 rounded-full border text-xs font-bold transition-all duration-200 ${
                    chartRange === r
                      ? 'bg-amber-400 text-slate-900 border-amber-200 shadow-[0_12px_32px_-18px_rgba(245,158,11,0.85)]'
                      : 'bg-slate-900/80 border-slate-700/70 text-slate-200 hover:border-amber-400/60 hover:text-white'
                  }`}
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
          </div>

          <div className="relative h-[350px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="englishGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.85} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={true} stroke="#94a3b8" tick={{ fontSize: 10 }} width={40} />
                <Tooltip content={renderTooltip} />
                <Area
                  type="monotone"
                  dataKey="hours"
                  name="ساعت مطالعه"
                  stroke="#f59e0b"
                  fill="url(#englishGradient)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <RangeProgressRow
        title="ریتم بازه‌ای زبان انگلیسی"
        subtitle="نرخ ثبت مطالعه زبان انگلیسی در بازه‌های ۳ روزه تا یک‌ساله"
        items={englishRangeItems}
      />

      {/* آرشیو و آمار پیشرفت */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* آرشیو */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-4 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between text-white font-bold">
            <div className="flex items-center gap-2">
              <Clock4 className="w-5 h-5 text-amber-300" />
              <span className="text-lg">آرشیو ۱۰ مورد آخر</span>
            </div>
            <div className="text-xs text-slate-500">{englishLogs.length} رکورد</div>
          </div>
          <div className="relative space-y-2 h-[280px] overflow-y-auto custom-scrollbar pr-1">
            {englishLogs.length === 0 && <div className="text-slate-500 text-sm">ساعتی ثبت نشده است.</div>}
            {recentLogs.map(log => (
              <div
                key={log.id}
                className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-slate-900 font-black flex items-center justify-center shadow text-xs">
                    {formatTimeDisplay(log.hours)}
                  </div>
                  <div className="text-white text-sm font-bold">زبان انگلیسی</div>
                </div>
                <div className="text-xs text-slate-400 sm:text-center">{log.date}</div>
                <div className="text-xs text-amber-200 font-semibold sm:text-center">
                  {toPersianDate(new Date(log.date)).split(' ').slice(1, 3).join(' ')}
                </div>
                <div className="text-xs text-slate-400 sm:text-right">کد: {log.id.slice(-6)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* آمار پیشرفت */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <h3 className="text-lg font-bold text-white">آمار پیشرفت</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'threeDays', label: '۳ روز', days: 3 },
              { key: 'oneWeek', label: '۱ هفته', days: 7 },
              { key: 'oneMonth', label: '۱ ماه', days: 30 },
              { key: 'threeMonths', label: '۳ ماه', days: 90 }
            ].map(({ key, label, days }) => {
              const data = getGrowthData[key as keyof typeof getGrowthData];
              const growthColor = data.growth >= 0 ? '#f59e0b' : '#ef4444';
              return (
                <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col items-center gap-2">
                  <div className="relative w-16 h-16">
                    <div
                      className="absolute inset-0 rounded-full border-2"
                      style={{
                        borderColor: `${growthColor}40`,
                        background: `conic-gradient(${growthColor} ${Math.min(100, Math.abs(data.growth)) * 3.6}deg, rgba(148,163,184,0.15) ${Math.min(100, Math.abs(data.growth)) * 3.6}deg)`
                      }}
                    ></div>
                    <div className="absolute inset-2 rounded-full bg-slate-950/95 border border-white/10 flex items-center justify-center">
                      <span className={`text-xs font-black ${data.growth >= 0 ? 'text-amber-100' : 'text-rose-100'}`}>
                        {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400">{label}</div>
                    <div className="text-xs text-amber-300 mt-1">{data.hours.toFixed(1)} ساعت</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* مودال تنظیمات */}
      {isStudySettingsOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl">
          <div className="relative w-full max-w-5xl max-h-[90vh] glass-card border border-amber-400/40 rounded-3xl overflow-hidden shadow-[0_25px_90px_-40px_rgba(245,158,11,0.6)] overflow-y-auto">
            <div className="absolute inset-0 opacity-70 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900"></div>
            <div className="relative p-6 md:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-amber-200/80">تنظیمات برنامه‌ریزی مطالعه زبان انگلیسی</p>
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-amber-300" />
                    <h3 className="text-2xl font-bold text-white">زمان‌بندی هفتگی و تعداد ساعت‌ها</h3>
                  </div>
                  <p className="text-sm text-slate-300">
                    مشخص کن در چه روزهایی از هفته مطالعه زبان انگلیسی انجام شود و تعداد کل ساعت‌های هدف چقدر است.
                  </p>
                </div>
                <button
                  onClick={closeStudySettings}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div>
                      <div className="text-xs text-slate-400">روزهای تایم‌لاین مطالعه</div>
                      <div className="text-sm font-semibold text-white">برای زبان انگلیسی</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-3 gap-2">
                    {DAY_LABELS.map(day => {
                      const isActive = (tempConfigs || configs).find(c => c.subject === englishSubject)?.scheduleDays?.includes(day.id) || false;
                      return (
                        <button
                          key={day.id}
                          onClick={() => toggleScheduleDayInSettings(day.id)}
                          className={`rounded-xl border px-3 py-2 text-sm flex items-center justify-between transition ${
                            isActive
                              ? 'bg-amber-500/15 border-amber-400/60 text-white'
                              : 'bg-slate-900/50 border-white/5 text-slate-200 hover:border-amber-400/40'
                          }`}
                        >
                          <span>{day.label}</span>
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isActive ? 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-slate-600'
                            }`}
                          ></span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-400">
                    اگر برای زبان انگلیسی مثلاً «یکشنبه» را فعال کنی، این درس هر هفته در همین روز در تایم‌لاین نشان داده می‌شود.
                  </p>
                </div>

                <div className="bg-slate-900/60 border border-amber-400/30 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-400">تعداد کل ساعت‌ها</div>
                      <div className="text-sm font-semibold text-white">زبان انگلیسی</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 block">تعداد کل ساعت هدف برای زبان انگلیسی</label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      value={(tempConfigs || configs).find(c => c.subject === englishSubject)?.totalHours ?? 0}
                      onChange={e => updateTotalHoursInSettings(Number(e.target.value) || 0)}
                      className="w-full rounded-xl bg-slate-950/70 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-[11px] text-slate-400">
                      این عدد به‌عنوان هدف کل ساعت‌های مطالعه برای زبان انگلیسی در نظر گرفته می‌شود.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={applyStudySettings}
                      disabled={!tempConfigs}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 font-bold shadow-[0_0_18px_rgba(245,158,11,0.45)] hover:from-amber-300 hover:to-orange-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ذخیره تنظیمات
                    </button>
                    <button
                      onClick={closeStudySettings}
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
