import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calendar, Sparkles, Activity, Clock4, BookOpen, ArrowLeft, ArrowRight, Settings2, X, ChevronDown } from 'lucide-react';
import { StudyConfig, StudyLog, StudySubject } from '../types';
import { storage, toISODate, toPersianDate, getRelativeDate } from '../utils';
import { RangeProgressRow, RANGE_WINDOWS, RangeProgressItem, clampRangePercent } from './RangeProgressRow';
import { chartCategoryClass } from './chartCategoryStyles';

const SUBJECT_LABELS: Record<StudySubject, string> = {
  [StudySubject.HESABAN]: 'حسابان',
  [StudySubject.HENDESEH]: 'هندسه',
  [StudySubject.GOSASTEH]: 'گسسته',
  [StudySubject.SHIMI]: 'شیمی',
  [StudySubject.FIZIK]: 'فیزیک',
  [StudySubject.HOVIYAT]: 'هویت اجتماعی',
  [StudySubject.SALAMAT]: 'سلامت و بهداشت',
  [StudySubject.FARSI]: 'فارسی',
  [StudySubject.ARABI]: 'عربی',
  [StudySubject.ENGLISH]: 'زبان انگلیسی',
  [StudySubject.DINI]: 'دینی',
  [StudySubject.MODIRIYAT]: 'مدیریت خانواده'
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

const defaultConfigs = (): StudyConfig[] =>
  Object.values(StudySubject).map(sub => ({
    subject: sub,
    totalHours: 0,
    scheduleDays: []
  }));

const SUBJECT_COLORS: Record<
  StudySubject,
  {
    stroke: string;
    gradientId: string;
  }
> = {
  [StudySubject.HESABAN]: { stroke: '#22d3ee', gradientId: 'studyGradient-hesaban' },
  [StudySubject.HENDESEH]: { stroke: '#a78bfa', gradientId: 'studyGradient-hendeseh' },
  [StudySubject.GOSASTEH]: { stroke: '#f97316', gradientId: 'studyGradient-gosasteh' },
  [StudySubject.SHIMI]: { stroke: '#34d399', gradientId: 'studyGradient-shimi' },
  [StudySubject.FIZIK]: { stroke: '#fb7185', gradientId: 'studyGradient-fizik' },
  [StudySubject.HOVIYAT]: { stroke: '#eab308', gradientId: 'studyGradient-hoviyat' },
  [StudySubject.SALAMAT]: { stroke: '#06b6d4', gradientId: 'studyGradient-salamat' },
  [StudySubject.FARSI]: { stroke: '#8b5cf6', gradientId: 'studyGradient-farsi' },
  [StudySubject.ARABI]: { stroke: '#10b981', gradientId: 'studyGradient-arabi' },
  [StudySubject.ENGLISH]: { stroke: '#f59e0b', gradientId: 'studyGradient-english' },
  [StudySubject.DINI]: { stroke: '#ec4899', gradientId: 'studyGradient-dini' },
  [StudySubject.MODIRIYAT]: { stroke: '#14b8a6', gradientId: 'studyGradient-modiriyat' }
};

// تبدیل ساعت.دقیقه به ساعت اعشاری (مثلاً 1.20 = 1.33 ساعت)
const parseTimeInput = (value: string): number => {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  
  // اگر نقطه دارد، به عنوان ساعت.دقیقه در نظر بگیر
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.');
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    // اگر دقیقه دو رقمی است (مثلاً 20)، به ساعت تبدیل کن
    if (minutes >= 10 && minutes < 60) {
      return hours + (minutes / 60);
    }
    // اگر یک رقمی است، به عنوان اعشار در نظر بگیر (مثلاً 1.5 = 1.5 ساعت)
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

export const StudySection: React.FC = () => {
  const [configs, setConfigs] = useState<StudyConfig[]>([]);
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<StudySubject>(StudySubject.HESABAN);
  const [timeInput, setTimeInput] = useState<string>('1.00');
  const [saveToast, setSaveToast] = useState<boolean>(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<number>(14);
  const [selectedDateDetails, setSelectedDateDetails] = useState<Date>(new Date());
  const [selectedDateLog, setSelectedDateLog] = useState<Date>(new Date());
  const [isStudySettingsOpen, setIsStudySettingsOpen] = useState<boolean>(false);
  const [settingsSubject, setSettingsSubject] = useState<StudySubject>(StudySubject.HESABAN);
  const [tempConfigs, setTempConfigs] = useState<StudyConfig[] | null>(null);
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState<boolean>(false);
  const [chartView, setChartView] = useState<'total' | 'all' | 'subject'>('total');
  const [selectedChartSubject, setSelectedChartSubject] = useState<StudySubject | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedConfigs = storage.get<StudyConfig[]>(storage.keys.STUDY_CONFIG, defaultConfigs());
    const storedLogs = storage.get<StudyLog[]>(storage.keys.STUDY_LOGS, []);
    const normalizedConfigs = Array.isArray(storedConfigs) ? storedConfigs : defaultConfigs();
    const normalizedLogs = Array.isArray(storedLogs) ? storedLogs : [];
    setConfigs(normalizedConfigs);
    setLogs(normalizedLogs);
  }, []);

  // بستن دراپ‌داون وقتی کلیک خارج از آن می‌شود
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSubjectDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSubjectDropdownOpen(false);
      }
    };

    if (isSubjectDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSubjectDropdownOpen]);

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

  const totalStudiedHours = logs.reduce((sum, l) => sum + l.hours, 0);
  const todayIsoGlobal = toISODate(new Date());

  // ساعت‌های مطالعه روز انتخابی در بخش جزئیات
  const selectedDateStudiedAll = useMemo(
    () =>
      logs
        .filter(l => l.date === selectedIsoDetails)
        .reduce((s, l) => s + l.hours, 0),
    [logs, selectedIsoDetails]
  );

  const todayStudiedAll = useMemo(
    () =>
      logs
        .filter(l => l.date === todayIsoGlobal)
        .reduce((s, l) => s + l.hours, 0),
    [logs, todayIsoGlobal]
  );

  const monthlyStudiedAll = useMemo(() => {
    const start = toISODate(getRelativeDate(-29));
    return logs
      .filter(l => l.date >= start && l.date <= todayIsoGlobal)
      .reduce((s, l) => s + l.hours, 0);
  }, [logs, todayIsoGlobal]);

  // محاسبه رشد در بازه‌های مختلف
  const getGrowthData = (subject: StudySubject | null = null) => {
    const subjectLogs = subject ? logs.filter(l => l.subject === subject) : logs;
    
    const getHoursInRange = (days: number) => {
      const start = toISODate(getRelativeDate(-days));
      return subjectLogs
        .filter(l => l.date >= start && l.date <= todayIsoGlobal)
        .reduce((s, l) => s + l.hours, 0);
    };

    const getPreviousRangeHours = (days: number) => {
      const start = toISODate(getRelativeDate(-days * 2));
      const end = toISODate(getRelativeDate(-days));
      return subjectLogs
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
  };

  // محاسبه میانگین بهره‌وری در بازه‌های مختلف
  const getProductivityData = (subject: StudySubject | null = null) => {
    const subjectLogs = subject ? logs.filter(l => l.subject === subject) : logs;
    
    const getAverageHours = (days: number) => {
      const start = toISODate(getRelativeDate(-days));
      const filtered = subjectLogs.filter(l => l.date >= start && l.date <= todayIsoGlobal);
      if (filtered.length === 0) return 0;
      const total = filtered.reduce((s, l) => s + l.hours, 0);
      return (total / days) * 100; // درصد از یک ساعت در روز
    };

    return {
      threeDays: getAverageHours(3),
      sevenDays: getAverageHours(7),
      thirtyDays: getAverageHours(30),
      ninetyDays: getAverageHours(90),
      oneEightyDays: getAverageHours(180),
      threeSixtyFiveDays: getAverageHours(365)
    };
  };

  const allSubjectsGrowthData = useMemo(() => getGrowthData(null), [logs]);
  const allSubjectsProductivityData = useMemo(() => getProductivityData(null), [logs]);

  // محاسبه ریتم بازه‌ای مدیریت مطالعه
  const studyManagementRangeItems: RangeProgressItem[] = useMemo(() => {
    const todayIso = toISODate(new Date());
    return RANGE_WINDOWS.map(window => {
      const todayDate = new Date(`${todayIso}T12:00:00`);
      let currentSum = 0;
      let prevSum = 0;
      for (let i = 0; i < window.days; i++) {
        const iso = toISODate(getRelativeDate(-i, todayDate));
        const currentDay = logs.filter(s => s.date === iso && s.subject === StudySubject.MODIRIYAT);
        currentSum += currentDay.length > 0 ? 1 : 0;
        const prevIso = toISODate(getRelativeDate(-(i + window.days), todayDate));
        const prevDay = logs.filter(s => s.date === prevIso && s.subject === StudySubject.MODIRIYAT);
        prevSum += prevDay.length > 0 ? 1 : 0;
      }
      const currentAvg = (currentSum / window.days) * 100;
      const prevAvg = (prevSum / window.days) * 100;
      return { ...window, value: clampRangePercent(currentAvg - prevAvg) };
    });
  }, [logs]);

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
      subject: selectedSubject,
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
    return [...logs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [logs]);

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

  // داده‌های نمودار کل ساعت‌ها
  const totalChartData = useMemo(() => {
    const data: any[] = [];
    for (let i = chartRange - 1; i >= 0; i--) {
      const date = getRelativeDate(-i);
      const iso = toISODate(date);
      const dayLogs = logs.filter(l => l.date === iso);
      const total = dayLogs.reduce((sum, l) => sum + l.hours, 0);

      const dateParts = toPersianDate(date).split(' ');
      const dayMonth = dateParts.slice(1, 3).join(' ');

      data.push({
        iso,
        label: dayMonth,
        total
      });
    }
    return data;
  }, [logs, chartRange]);

  // داده‌های نمودار همه دروس
  const allSubjectsChartData = useMemo(() => {
    const data: any[] = [];
    for (let i = chartRange - 1; i >= 0; i--) {
      const date = getRelativeDate(-i);
      const iso = toISODate(date);
      const dayLogs = logs.filter(l => l.date === iso);

      const dateParts = toPersianDate(date).split(' ');
      const dayMonth = dateParts.slice(1, 3).join(' ');

      const point: any = {
        iso,
        label: dayMonth
      };

      Object.values(StudySubject).forEach(sub => {
        const sum = dayLogs.filter(l => l.subject === sub).reduce((s, l) => s + l.hours, 0);
        point[sub] = sum;
      });

      data.push(point);
    }
    return data;
  }, [logs, chartRange]);

  // داده‌های نمودار تک‌درس
  const getSubjectChartData = (subject: StudySubject) => {
    const data: any[] = [];
    for (let i = chartRange - 1; i >= 0; i--) {
      const date = getRelativeDate(-i);
      const iso = toISODate(date);
      const dayLogs = logs.filter(l => l.date === iso && l.subject === subject);
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
  };

  const chartRanges = [7, 14, 30, 60, 90, 180, 365];

  const openStudySettings = () => {
    setTempConfigs(configs);
    setSettingsSubject(selectedSubject);
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

  const updateTotalHoursInSettings = (value: number) => {
    if (!tempConfigs) return;
    setTempConfigs(prev =>
      (prev || []).map(cfg => {
        if (cfg.subject !== settingsSubject) return cfg;
        return { ...cfg, totalHours: Math.max(0, value) };
      })
    );
  };

  const renderTotalTooltip = (props: any) => {
    const { active, payload } = props || {};
    if (!active || !payload || !payload.length) return null;
    const p = payload[0].payload as any;
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-xs text-white shadow-[0_16px_40px_-24px_rgba(0,0,0,0.9)]">
        <div className="text-sm font-semibold text-cyan-100 mb-2">{p.label}</div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-200">کل ساعت‌های مطالعه</span>
          <span className="text-cyan-100 font-bold">{p.total?.toFixed(2) || 0} ساعت</span>
        </div>
      </div>
    );
  };

  const renderAllSubjectsTooltip = (props: any) => {
    const { active, payload } = props || {};
    if (!active || !payload || !payload.length) return null;
    const p = payload[0].payload as any;
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-xs text-white shadow-[0_16px_40px_-24px_rgba(0,0,0,0.9)] min-w-[180px]">
        <div className="text-sm font-semibold text-cyan-100 mb-2">{p.label}</div>
        <div className="space-y-1">
          {payload.map((item: any) => {
            if (item.value === 0) return null;
            return (
              <div key={item.dataKey} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></span>
                  <span className="text-[11px] text-slate-200">{item.name}</span>
                </div>
                <span className="text-[11px] text-cyan-100">{item.value?.toFixed(2) || 0} ساعت</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSubjectTooltip = (props: any) => {
    const { active, payload } = props || {};
    if (!active || !payload || !payload.length) return null;
    const p = payload[0].payload as any;
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-xs text-white shadow-[0_16px_40px_-24px_rgba(0,0,0,0.9)]">
        <div className="text-sm font-semibold text-cyan-100 mb-2">{p.label}</div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-200">ساعت مطالعه</span>
          <span className="text-cyan-100 font-bold">{p.hours?.toFixed(2) || 0} ساعت</span>
        </div>
      </div>
    );
  };

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

      {/* بخش اول - جزئیات روز */}
      <section className="relative overflow-hidden rounded-[32px] border border-cyan-500/20 bg-gradient-to-br from-slate-950 via-cyan-950/10 to-slate-950 p-6 md:p-8 shadow-[0_20px_70px_-30px_rgba(34,211,238,0.3)]">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -left-16 -top-16 w-48 h-48 rounded-full bg-cyan-500/15 blur-[110px]"></div>
          <div className="absolute right-0 -bottom-16 w-64 h-64 rounded-full bg-purple-500/12 blur-[140px]"></div>
        </div>
        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* سمت چپ - کارت‌های کوچک */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-cyan-400/30 bg-slate-950/80 p-4">
              <div className="text-xs text-slate-400 mb-1">مطالعه {selectedIsoDetails === todayIsoGlobal ? 'امروز' : 'روز انتخابی'}</div>
              <div className="text-2xl font-black text-cyan-300">{selectedDateStudiedAll.toFixed(1)}</div>
              <div className="text-xs text-slate-500">ساعت</div>
            </div>
            <div className="rounded-2xl border border-emerald-400/30 bg-slate-950/80 p-4">
              <div className="text-xs text-slate-400 mb-1">۳۰ روز اخیر</div>
              <div className="text-2xl font-black text-emerald-300">{monthlyStudiedAll.toFixed(1)}</div>
              <div className="text-xs text-slate-500">ساعت</div>
            </div>
            <div className="rounded-2xl border border-purple-400/30 bg-slate-950/80 p-4 flex items-center gap-3">
              <Clock4 className="w-5 h-5 text-purple-300" />
              <div>
                <div className="text-xs text-slate-400">کل ساعت‌ها</div>
                <div className="text-xl font-black text-purple-300">{totalStudiedHours.toFixed(1)}</div>
              </div>
            </div>
          </div>

          {/* مرکز - دایره بزرگ درصد */}
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48 md:w-56 md:h-56">
              <div
                className="absolute inset-0 rounded-full border-4 border-cyan-400/40"
                style={{
                  background: `conic-gradient(#22d3ee ${Math.min(100, (selectedDateStudiedAll / 8) * 100) * 3.6}deg, rgba(148,163,184,0.15) ${
                    Math.min(100, (selectedDateStudiedAll / 8) * 100) * 3.6
                  }deg)`
                }}
              ></div>
              <div className="absolute inset-4 rounded-full bg-slate-950/95 border border-white/10 flex flex-col items-center justify-center text-center">
                <div className="text-4xl md:text-5xl font-black text-cyan-100">{Math.round((selectedDateStudiedAll / 8) * 100)}%</div>
                <div className="text-sm text-slate-400 mt-2">درصد تکمیل</div>
                <div className="text-xs text-cyan-300 mt-1">{selectedDateStudiedAll.toFixed(1)} ساعت</div>
              </div>
            </div>
          </div>

          {/* سمت راست - جزئیات روز */}
          <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-cyan-300" />
              <h3 className="text-lg font-bold text-white">جزئیات روز</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-400 mb-1">تاریخ</div>
                <div className="text-lg font-bold text-white">{toPersianDate(selectedDateDetails).split(' ').slice(1, 4).join(' ')}</div>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-300" />
                <div>
                  <div className="text-xs text-slate-400">بهره‌وری</div>
                  <div className="text-sm font-bold text-emerald-300">{Math.round((selectedDateStudiedAll / 8) * 100)}%</div>
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => shiftSelectedDateDetails(1)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-slate-300 hover:text-cyan-300 hover:border-cyan-400/50 transition text-sm flex items-center justify-center gap-1"
                  >
                    <ArrowRight className="w-4 h-4" />
                    روز بعد
                  </button>
                  <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-slate-400">
                    {toISODate(selectedDateDetails)}
                  </div>
                  <button
                    onClick={() => shiftSelectedDateDetails(-1)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-slate-300 hover:text-cyan-300 hover:border-cyan-400/50 transition text-sm flex items-center justify-center gap-1"
                  >
                    روز قبل
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={resetToTodayDetails}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-slate-300 hover:text-cyan-300 hover:border-cyan-400/50 transition text-sm flex items-center justify-center gap-1"
                >
                  <Calendar className="w-4 h-4" />
                  بازگشت به امروز
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* کارت‌های پایین */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-xs text-slate-400 mb-1">امتیاز کسب شده</div>
            <div className="text-2xl font-black text-white">{Math.round(selectedDateStudiedAll * 10)}</div>
            <div className="h-1.5 rounded-full bg-slate-800/80 mt-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                style={{ width: `${Math.min(100, (selectedDateStudiedAll / 8) * 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-xs text-slate-400 mb-1">ساعت‌های {selectedIsoDetails === todayIsoGlobal ? 'امروز' : 'روز انتخابی'}</div>
            <div className="text-2xl font-black text-white">{selectedDateStudiedAll.toFixed(1)}/{8}</div>
            <div className="h-1.5 rounded-full bg-slate-800/80 mt-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400"
                style={{ width: `${Math.min(100, (selectedDateStudiedAll / 8) * 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-xs text-slate-400 mb-1">کل ساعت‌های ثبت‌شده</div>
            <div className="text-2xl font-black text-white">{totalStudiedHours.toFixed(1)}</div>
            <div className="h-1.5 rounded-full bg-slate-800/80 mt-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
                style={{ width: `${Math.min(100, (totalStudiedHours / 1000) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* بخش ثبت مطالعه و آرشیو */}
      <section className="relative overflow-hidden rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950 p-6 md:p-8 shadow-[0_20px_70px_-30px_rgba(16,185,129,0.3)]">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -left-16 -top-16 w-48 h-48 rounded-full bg-emerald-500/15 blur-[110px]"></div>
          <div className="absolute right-0 bottom-0 w-64 h-64 rounded-full bg-cyan-500/12 blur-[140px]"></div>
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* بخش ثبت مطالعه */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/30 to-cyan-400/30 flex items-center justify-center border border-emerald-400/40">
                <BookOpen className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">ثبت ساعت مطالعه</h2>
                <p className="text-xs text-emerald-200/70">زمان مطالعه خود را ثبت کن</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 mb-1.5 block">انتخاب درس</label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSubjectDropdownOpen(!isSubjectDropdownOpen);
                    }}
                    className="w-full h-12 rounded-xl bg-slate-900/60 border border-white/10 px-3 flex items-center justify-between text-white hover:border-emerald-400/50 transition text-sm"
                  >
                    <span className="font-semibold">{SUBJECT_LABELS[selectedSubject]}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isSubjectDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isSubjectDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-[99]"
                        onClick={() => setIsSubjectDropdownOpen(false)}
                      ></div>
                      <div 
                        className="absolute top-full mt-2 w-full rounded-xl bg-slate-900 border border-white/10 shadow-2xl z-[100] max-h-64 overflow-y-auto custom-scrollbar"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {Object.values(StudySubject).map(sub => (
                          <button
                            key={sub}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSubject(sub);
                              setIsSubjectDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-right hover:bg-emerald-500/10 transition text-sm ${
                              selectedSubject === sub ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-200'
                            }`}
                          >
                            {SUBJECT_LABELS[sub]}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 mb-1.5 block">زمان مطالعه (مثلاً 1.20)</label>
                <input
                  type="text"
                  value={timeInput}
                  onChange={e => setTimeInput(e.target.value)}
                  placeholder="1.20"
                  className="w-full h-12 rounded-xl px-3 bg-slate-950/60 border border-white/10 text-white text-center text-lg font-black outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 mb-1.5 block">تاریخ مطالعه</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => shiftSelectedDateLog(1)}
                      className="h-12 w-12 rounded-xl bg-slate-900/60 border border-white/10 text-slate-300 hover:text-emerald-300 hover:border-emerald-400/50 transition flex items-center justify-center"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <div className="flex-1 h-12 rounded-xl bg-slate-900/60 border border-white/10 px-3 flex items-center justify-center text-white text-sm">
                      <span className="font-semibold">{selectedDateLabelLog}</span>
                    </div>
                    <button
                      onClick={() => shiftSelectedDateLog(-1)}
                      className="h-12 w-12 rounded-xl bg-slate-900/60 border border-white/10 text-slate-300 hover:text-emerald-300 hover:border-emerald-400/50 transition flex items-center justify-center"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={resetToTodayLog}
                    className="w-full h-10 rounded-xl bg-slate-900/60 border border-white/10 text-slate-300 hover:text-emerald-300 hover:border-emerald-400/50 transition text-sm flex items-center justify-center gap-1"
                  >
                    <Calendar className="w-4 h-4" />
                    بازگشت به امروز
                  </button>
                </div>
              </div>

              <button
                onClick={addLog}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-900 font-black flex items-center justify-center gap-2 shadow-[0_18px_40px_-20px_rgba(16,185,129,0.85)] hover:shadow-[0_18px_50px_-20px_rgba(16,185,129,1)] transition text-sm"
              >
                <BookOpen className="w-4 h-4" />
                ثبت مطالعه
              </button>
            </div>
          </div>

          {/* آرشیو */}
          <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-4 flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center justify-between text-white font-bold">
              <div className="flex items-center gap-2">
                <Clock4 className="w-5 h-5 text-cyan-300" />
                <span className="text-lg">آرشیو ۱۰ مورد آخر</span>
              </div>
              <div className="text-xs text-slate-500">{logs.length} رکورد</div>
            </div>
            <div className="relative space-y-2 h-[280px] overflow-y-auto custom-scrollbar pr-1">
              {logs.length === 0 && <div className="text-slate-500 text-sm">ساعتی ثبت نشده است.</div>}
              {recentLogs.map(log => (
                <div
                  key={log.id}
                  className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-900 font-black flex items-center justify-center shadow text-xs">
                      {formatTimeDisplay(log.hours)}
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

      {/* روند میانگین و سرعت پیشرفت - بخش دوم */}
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/75 p-6 shadow-[0_18px_60px_-32px_rgba(0,0,0,0.85)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-amber-300" />
            <h3 className="text-xl font-bold text-white">روند میانگین بهره‌وری در پنجره‌های زمانی مختلف</h3>
          </div>
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-emerald-300" />
            <h3 className="text-xl font-bold text-white">سرعت پیشرفت در بازه‌ها</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {/* روند میانگین بهره‌وری - 4 دایره */}
          {[
            { days: 365, label: '۱ سال اخیر', key: 'threeSixtyFiveDays' },
            { days: 180, label: '۶ ماه اخیر', key: 'oneEightyDays' },
            { days: 90, label: '۳ ماه اخیر', key: 'ninetyDays' },
            { days: 30, label: '۱ ماه اخیر', key: 'thirtyDays' }
          ].map(({ days, label, key }) => {
            const value = allSubjectsProductivityData[key as keyof typeof allSubjectsProductivityData];
            return (
              <div key={days} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col items-center gap-3">
                <div className="relative w-20 h-20">
                  <div
                    className="absolute inset-0 rounded-full border border-cyan-400/40"
                    style={{
                      background: `conic-gradient(#22d3ee ${Math.min(100, value) * 3.6}deg, rgba(148,163,184,0.15) ${Math.min(100, value) * 3.6}deg)`
                    }}
                  ></div>
                  <div className="absolute inset-2 rounded-full bg-slate-950/95 border border-white/10 flex items-center justify-center">
                    <span className="text-sm font-black text-cyan-100">{value.toFixed(2)}%</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-400">بازه {days} روزه</div>
                  <div className="text-xs text-slate-300">{label}</div>
                </div>
              </div>
            );
          })}
          {/* سرعت پیشرفت - 4 دایره */}
          {[
            { key: 'threeDays', label: '۳ روز اخیر', days: 3 },
            { key: 'oneWeek', label: '۱ هفته اخیر', days: 7 },
            { key: 'oneMonth', label: '۱ ماه اخیر', days: 30 },
            { key: 'threeMonths', label: '۳ ماه اخیر', days: 90 }
          ].map(({ key, label, days }) => {
            const data = allSubjectsGrowthData[key as keyof typeof allSubjectsGrowthData];
            const growthColor = data.growth >= 0 ? '#10b981' : '#ef4444';
            return (
              <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col items-center gap-3">
                <div className="relative w-20 h-20">
                  <div
                    className="absolute inset-0 rounded-full border border-emerald-400/40"
                    style={{
                      background: `conic-gradient(${growthColor} ${Math.min(100, Math.abs(data.growth)) * 3.6}deg, rgba(148,163,184,0.15) ${Math.min(100, Math.abs(data.growth)) * 3.6}deg)`
                    }}
                  ></div>
                  <div className="absolute inset-2 rounded-full bg-slate-950/95 border border-white/10 flex items-center justify-center">
                    <span className={`text-sm font-black ${data.growth >= 0 ? 'text-emerald-100' : 'text-rose-100'}`}>
                      {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-400">بازه {days} روزه</div>
                  <div className="text-xs text-slate-300">{label}</div>
                  <div className="text-xs text-emerald-300 mt-1">{data.hours.toFixed(1)} ساعت</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* نمودار با دسته‌بندی */}
      <section className="relative overflow-hidden rounded-[32px] border border-cyan-500/20 bg-gradient-to-br from-slate-950 via-cyan-950/10 to-slate-950 p-6 md:p-8 shadow-[0_20px_70px_-30px_rgba(34,211,238,0.2)]">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -left-16 -top-16 w-48 h-48 rounded-full bg-cyan-500/15 blur-[110px]"></div>
          <div className="absolute right-0 -bottom-16 w-64 h-64 rounded-full bg-purple-500/12 blur-[140px]"></div>
        </div>
        <div className="relative">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400/30 to-blue-400/30 flex items-center justify-center border border-cyan-400/40">
                <Activity className="w-6 h-6 text-cyan-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">نمودارهای مطالعه</h3>
                <p className="text-sm text-cyan-200/70">تحلیل ساعت‌های مطالعه در بازه‌های زمانی مختلف</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {chartRanges.map(r => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
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
          </div>

          {/* تب‌های دسته‌بندی */}
          <div className="flex flex-wrap gap-2 mb-6 bg-slate-900/60 border border-white/10 rounded-2xl p-2">
            <button
              onClick={() => {
                setChartView('total');
                setSelectedChartSubject(null);
              }}
              className={chartCategoryClass(chartView === 'total')}
            >
              کل مطالعه
            </button>
            <button
              onClick={() => {
                setChartView('all');
                setSelectedChartSubject(null);
              }}
              className={chartCategoryClass(chartView === 'all')}
            >
              همه دروس
            </button>
            {Object.values(StudySubject).map(sub => (
              <button
                key={sub}
                onClick={() => {
                  setChartView('subject');
                  setSelectedChartSubject(sub);
                }}
                className={chartCategoryClass(chartView === 'subject' && selectedChartSubject === sub)}
              >
                {SUBJECT_LABELS[sub]}
              </button>
            ))}
          </div>

          {/* نمایش نمودار بر اساس انتخاب */}
          <div className="relative h-[350px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'total' && (
                <AreaChart data={totalChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.85} />
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={true} stroke="#94a3b8" tick={{ fontSize: 10 }} width={40} />
                  <Tooltip content={renderTotalTooltip} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="کل ساعت‌ها"
                    stroke="#fbbf24"
                    fill="url(#totalGradient)"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              )}
              {chartView === 'all' && (
                <AreaChart data={allSubjectsChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  <YAxis allowDecimals={true} stroke="#94a3b8" tick={{ fontSize: 10 }} width={40} />
                  <Tooltip content={renderAllSubjectsTooltip} />
                  {Object.values(StudySubject).map(sub => {
                    const cfg = SUBJECT_COLORS[sub];
                    return (
                      <Area
                        key={sub}
                        type="monotone"
                        dataKey={sub}
                        name={SUBJECT_LABELS[sub]}
                        stroke={cfg.stroke}
                        fill={`url(#${cfg.gradientId})`}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    );
                  })}
                </AreaChart>
              )}
              {chartView === 'subject' && selectedChartSubject && (
                <AreaChart data={getSubjectChartData(selectedChartSubject)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`${SUBJECT_COLORS[selectedChartSubject].gradientId}-single`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={SUBJECT_COLORS[selectedChartSubject].stroke} stopOpacity={0.85} />
                      <stop offset="95%" stopColor={SUBJECT_COLORS[selectedChartSubject].stroke} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={true} stroke="#94a3b8" tick={{ fontSize: 10 }} width={40} />
                  <Tooltip content={renderSubjectTooltip} />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    name={SUBJECT_LABELS[selectedChartSubject]}
                    stroke={SUBJECT_COLORS[selectedChartSubject].stroke}
                    fill={`url(#${SUBJECT_COLORS[selectedChartSubject].gradientId}-single)`}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <RangeProgressRow
        title="ریتم بازه‌ای مدیریت مطالعه"
        subtitle="نرخ ثبت مطالعه مدیریت خانواده در بازه‌های ۳ روزه تا یک‌ساله"
        items={studyManagementRangeItems}
      />

      {/* آمار تک‌تک دروس */}
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/75 p-6 shadow-[0_18px_60px_-32px_rgba(0,0,0,0.85)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/30 to-cyan-400/30 flex items-center justify-center border border-emerald-400/40">
            <BookOpen className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">آمار تک‌تک دروس</h3>
            <p className="text-sm text-slate-400">آمار و تحلیل مطالعه برای هر درس</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.values(StudySubject).map(subject => {
            const subjectLogs = logs.filter(l => l.subject === subject);
            const todaySubject = subjectLogs.filter(l => l.date === todayIsoGlobal).reduce((s, l) => s + l.hours, 0);
            const monthlySubject = subjectLogs.filter(l => {
              const start = toISODate(getRelativeDate(-29));
              return l.date >= start && l.date <= todayIsoGlobal;
            }).reduce((s, l) => s + l.hours, 0);
            const totalSubject = subjectLogs.reduce((s, l) => s + l.hours, 0);
            const subjectGrowth = getGrowthData(subject);
            const subjectProductivity = getProductivityData(subject);
            const cfg = SUBJECT_COLORS[subject];

            return (
              <div key={subject} className="rounded-3xl border border-white/10 bg-slate-950/90 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cfg.stroke}20`, border: `1px solid ${cfg.stroke}40` }}>
                    <span className="text-xs font-bold" style={{ color: cfg.stroke }}>
                      {SUBJECT_LABELS[subject].slice(0, 2)}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white">{SUBJECT_LABELS[subject]}</h4>
                </div>

                {/* 3 کارت درصدی */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="rounded-xl border bg-slate-900/50 p-3 flex flex-col items-center gap-2">
                    <div className="relative w-16 h-16">
                      <div
                        className="absolute inset-0 rounded-full border-2"
                        style={{
                          borderColor: `${cfg.stroke}40`,
                          background: `conic-gradient(${cfg.stroke} ${Math.min(100, (todaySubject / 8) * 100) * 3.6}deg, rgba(148,163,184,0.15) ${
                            Math.min(100, (todaySubject / 8) * 100) * 3.6
                          }deg)`
                        }}
                      ></div>
                      <div className="absolute inset-2 rounded-full bg-slate-950/95 border border-white/10 flex flex-col items-center justify-center text-center">
                        <div className="text-sm font-black" style={{ color: cfg.stroke }}>{todaySubject.toFixed(1)}</div>
                        <div className="text-[8px] text-slate-400">ساعت</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400">امروز</div>
                      <div className="text-xs font-semibold" style={{ color: cfg.stroke }}>{todaySubject.toFixed(1)} ساعت</div>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-slate-900/50 p-3 flex flex-col items-center gap-2">
                    <div className="relative w-16 h-16">
                      <div
                        className="absolute inset-0 rounded-full border-2"
                        style={{
                          borderColor: `${cfg.stroke}40`,
                          background: `conic-gradient(${cfg.stroke} ${Math.min(100, (monthlySubject / 240) * 100) * 3.6}deg, rgba(148,163,184,0.15) ${
                            Math.min(100, (monthlySubject / 240) * 100) * 3.6
                          }deg)`
                        }}
                      ></div>
                      <div className="absolute inset-2 rounded-full bg-slate-950/95 border border-white/10 flex flex-col items-center justify-center text-center">
                        <div className="text-sm font-black" style={{ color: cfg.stroke }}>{monthlySubject.toFixed(1)}</div>
                        <div className="text-[8px] text-slate-400">ساعت</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400">۳۰ روز</div>
                      <div className="text-xs font-semibold" style={{ color: cfg.stroke }}>{monthlySubject.toFixed(1)} ساعت</div>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-slate-900/50 p-3 flex flex-col items-center gap-2">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-2 bg-opacity-10" style={{ borderColor: `${cfg.stroke}40`, backgroundColor: `${cfg.stroke}10` }}></div>
                      <div className="absolute inset-2 rounded-full bg-slate-950/95 border border-white/10 flex flex-col items-center justify-center text-center">
                        <div className="text-sm font-black" style={{ color: cfg.stroke }}>{totalSubject.toFixed(1)}</div>
                        <div className="text-[8px] text-slate-400">ساعت</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400">کل</div>
                      <div className="text-xs font-semibold" style={{ color: cfg.stroke }}>{totalSubject.toFixed(1)} ساعت</div>
                    </div>
                  </div>
                </div>

                {/* روند میانگین و سرعت پیشرفت - 8 دایره */}
                <div className="grid grid-cols-4 gap-3">
                  {/* روند میانگین بهره‌وری - 4 دایره */}
                  {[
                    { days: 90, label: '۳ ماه', key: 'ninetyDays' },
                    { days: 30, label: '۱ ماه', key: 'thirtyDays' },
                    { days: 7, label: '۱ هفته', key: 'sevenDays' },
                    { days: 3, label: '۳ روز', key: 'threeDays' }
                  ].map(({ days, label, key }) => {
                    const value = subjectProductivity[key as keyof typeof subjectProductivity];
                    return (
                      <div key={days} className="rounded-xl border border-white/10 bg-white/5 p-2 flex flex-col items-center gap-2">
                        <div className="relative w-16 h-16">
                          <div
                            className="absolute inset-0 rounded-full border"
                            style={{
                              borderColor: `${cfg.stroke}40`,
                              background: `conic-gradient(${cfg.stroke} ${Math.min(100, value) * 3.6}deg, rgba(148,163,184,0.15) ${Math.min(100, value) * 3.6}deg)`
                            }}
                          ></div>
                          <div className="absolute inset-1.5 rounded-full bg-slate-950/95 border border-white/10 flex items-center justify-center">
                            <span className="text-xs font-black" style={{ color: cfg.stroke }}>{value.toFixed(2)}%</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] text-slate-400">{days} روز</div>
                          <div className="text-[9px] text-slate-300">{label}</div>
                        </div>
                      </div>
                    );
                  })}
                  {/* سرعت پیشرفت - 4 دایره */}
                  {[
                    { key: 'threeDays', label: '۳ روز', days: 3 },
                    { key: 'oneWeek', label: '۱ هفته', days: 7 },
                    { key: 'oneMonth', label: '۱ ماه', days: 30 },
                    { key: 'threeMonths', label: '۳ ماه', days: 90 }
                  ].map(({ key, label, days }) => {
                    const data = subjectGrowth[key as keyof typeof subjectGrowth];
                    const growthColor = data.growth >= 0 ? cfg.stroke : '#ef4444';
                    return (
                      <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-2 flex flex-col items-center gap-2">
                        <div className="relative w-16 h-16">
                          <div
                            className="absolute inset-0 rounded-full border"
                            style={{
                              borderColor: `${growthColor}40`,
                              background: `conic-gradient(${growthColor} ${Math.min(100, Math.abs(data.growth)) * 3.6}deg, rgba(148,163,184,0.15) ${Math.min(100, Math.abs(data.growth)) * 3.6}deg)`
                            }}
                          ></div>
                          <div className="absolute inset-1.5 rounded-full bg-slate-950/95 border border-white/10 flex items-center justify-center">
                            <span className="text-xs font-black" style={{ color: growthColor }}>
                              {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] text-slate-400">{days} روز</div>
                          <div className="text-[9px] text-slate-300">{label}</div>
                          <div className="text-[9px] mt-1" style={{ color: cfg.stroke }}>{data.hours.toFixed(1)} ساعت</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {isStudySettingsOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl">
          <div className="relative w-full max-w-5xl max-h-[90vh] glass-card border border-cyan-400/40 rounded-3xl overflow-hidden shadow-[0_25px_90px_-40px_rgba(34,211,238,0.6)] overflow-y-auto">
            <div className="absolute inset-0 opacity-70 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900"></div>
            <div className="relative p-6 md:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-cyan-200/80">تنظیمات برنامه‌ریزی مطالعه</p>
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-cyan-300" />
                    <h3 className="text-2xl font-bold text-white">زمان‌بندی هفتگی و تعداد ساعت‌ها</h3>
                  </div>
                  <p className="text-sm text-slate-300">
                    برای هر درس مشخص کن در چه روزهایی از هفته مطالعه انجام شود و تعداد کل ساعت‌های هدف این درس چقدر است.
                  </p>
                </div>
                <button
                  onClick={closeStudySettings}
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
                      <div className="text-xs text-slate-400">روزهای تایم‌لاین مطالعه</div>
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
                      <div className="text-xs text-slate-400">تعداد کل ساعت‌ها</div>
                      <div className="text-sm font-semibold text-white">
                          {SUBJECT_LABELS[settingsSubject]}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 block">تعداد کل ساعت هدف برای این درس</label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      value={
                        (tempConfigs || configs).find(cfg => cfg.subject === settingsSubject)?.totalHours ?? 0
                      }
                      onChange={e => updateTotalHoursInSettings(Number(e.target.value) || 0)}
                      className="w-full rounded-xl bg-slate-950/70 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-[11px] text-slate-400">
                      این عدد به‌عنوان هدف کل ساعت‌های مطالعه برای این درس در نظر گرفته می‌شود.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={applyStudySettings}
                      disabled={!tempConfigs}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-900 font-bold shadow-[0_0_18px_rgba(34,211,238,0.45)] hover:from-cyan-300 hover:to-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
