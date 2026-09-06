import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Flag,
  ListChecks,
  PencilLine,
  Plus,
  RefreshCcw,
  Tag,
  Target,
  Trash2
} from 'lucide-react';
import { FuturePlan, FuturePlanPriority, FuturePlanStatus } from '../types';
import {
  calendarModeStorage,
  formatAppDate,
  formatCalendarMonthYear,
  getCalendarModeLabel,
  getCalendarMonthDays,
  getCalendarWeekDays,
  storage,
  toISODate
} from '../utils';

type FuturePlanFormState = {
  title: string;
  priority: FuturePlanPriority;
  status: FuturePlanStatus;
  category: string;
  description: string;
};

const priorityMeta: Record<
  FuturePlanPriority,
  {
    label: string;
    dot: string;
    pill: string;
    ring: string;
    order: number;
  }
> = {
  high: {
    label: 'اولویت بالا',
    dot: 'bg-rose-300',
    pill: 'border-rose-400/35 bg-rose-500/10 text-rose-100',
    ring: 'ring-rose-400/50',
    order: 0
  },
  normal: {
    label: 'اولویت معمولی',
    dot: 'bg-cyan-300',
    pill: 'border-cyan-400/35 bg-cyan-500/10 text-cyan-100',
    ring: 'ring-cyan-400/50',
    order: 1
  },
  low: {
    label: 'اولویت پایین',
    dot: 'bg-emerald-300',
    pill: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100',
    ring: 'ring-emerald-400/50',
    order: 2
  }
};

const statusMeta: Record<
  FuturePlanStatus,
  {
    label: string;
    pill: string;
  }
> = {
  active: {
    label: 'در حال انجام',
    pill: 'border-amber-400/35 bg-amber-500/10 text-amber-100'
  },
  done: {
    label: 'انجام شده',
    pill: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100'
  }
};

const defaultForm = (): FuturePlanFormState => ({
  title: '',
  priority: 'normal',
  status: 'active',
  category: '',
  description: ''
});

const DEFAULT_CATEGORIES = ['درس', 'کار', 'شخصی'];

const normalizeFuturePlans = (value: unknown): FuturePlan[] => {
  const list = Array.isArray(value) ? value : [];
  return list
    .filter(item => {
      if (!item || typeof item !== 'object') return false;
      const plan = item as Partial<FuturePlan>;
      return Boolean(plan.id && plan.title);
    })
    .map(item => {
      const plan = item as FuturePlan;
      const status: FuturePlanStatus = plan.status === 'done' ? 'done' : 'active';
      const priority: FuturePlanPriority =
        plan.priority === 'high' || plan.priority === 'low' || plan.priority === 'normal' ? plan.priority : 'normal';
      const storedTargetDate = typeof plan.targetDate === 'string' ? plan.targetDate : '';
      const targetDateValue = new Date(`${storedTargetDate}T12:00:00`);
      const createdAtValue = plan.createdAt ? new Date(plan.createdAt) : new Date();
      const targetDate =
        storedTargetDate && !Number.isNaN(targetDateValue.getTime())
          ? storedTargetDate
          : toISODate(Number.isNaN(createdAtValue.getTime()) ? new Date() : createdAtValue);
      return {
        ...plan,
        title: String(plan.title).trim(),
        targetDate,
        priority,
        status,
        category: plan.category || '',
        description: plan.description || '',
        createdAt: plan.createdAt || new Date().toISOString(),
        updatedAt: plan.updatedAt || plan.createdAt || new Date().toISOString()
      };
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      const priorityDiff = priorityMeta[a.priority].order - priorityMeta[b.priority].order;
      if (priorityDiff !== 0) return priorityDiff;
      return (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt);
    });
};

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export const FuturePlanSection: React.FC = () => {
  const [plans, setPlans] = useState<FuturePlan[]>([]);
  const [form, setForm] = useState<FuturePlanFormState>(() => defaultForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [calendarMode, setCalendarMode] = useState(() => calendarModeStorage.get());
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarData, setCalendarData] = useState(() => getCalendarMonthDays(new Date(), calendarModeStorage.get()));
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [filters, setFilters] = useState<{
    priority: 'all' | FuturePlanPriority;
    status: 'all' | FuturePlanStatus;
    category: 'all' | string;
  }>({
    priority: 'all',
    status: 'all',
    category: 'all'
  });

  useEffect(() => {
    setPlans(normalizeFuturePlans(storage.get(storage.keys.FUTURE_PLANS, [])));
    const storedCategories = storage.get<string[]>(storage.keys.FUTURE_PLAN_CATEGORIES, DEFAULT_CATEGORIES);
    setCategories(Array.isArray(storedCategories) && storedCategories.length ? storedCategories : DEFAULT_CATEGORIES);
  }, []);

  useEffect(() => {
    setCalendarData(getCalendarMonthDays(viewDate, calendarMode));
  }, [viewDate, calendarMode]);

  useEffect(() => {
    const handler = (event: Event) => {
      const mode = (event as CustomEvent).detail;
      if (mode === 'jalali' || mode === 'gregorian') setCalendarMode(mode);
    };
    window.addEventListener('planner-calendar-mode-change', handler);
    return () => window.removeEventListener('planner-calendar-mode-change', handler);
  }, []);

  const selectedIso = toISODate(selectedDate);
  const todayIso = toISODate(new Date());

  const savePlans = (next: FuturePlan[]) => {
    const normalized = normalizeFuturePlans(next);
    setPlans(normalized);
    storage.set(storage.keys.FUTURE_PLANS, normalized);
  };

  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      if (filters.priority !== 'all' && plan.priority !== filters.priority) return false;
      if (filters.status !== 'all' && plan.status !== filters.status) return false;
      if (filters.category !== 'all' && (plan.category || '') !== filters.category) return false;
      return true;
    });
  }, [plans, filters]);

  const sortedFilteredPlans = useMemo(
    () =>
      [...filteredPlans].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        const priorityDiff = priorityMeta[a.priority].order - priorityMeta[b.priority].order;
        if (priorityDiff !== 0) return priorityDiff;
        return (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt);
      }),
    [filteredPlans]
  );

  const activePlans = useMemo(() => plans.filter(plan => plan.status !== 'done'), [plans]);
  const doneCount = plans.filter(plan => plan.status === 'done').length;
  const highPriorityCount = plans.filter(plan => plan.priority === 'high' && plan.status !== 'done').length;
  const highlightedPlan = activePlans[0] || plans[0];

  const plansByCreatedDate = useMemo(() => {
    const map: Record<string, FuturePlan[]> = {};
    plans.forEach(plan => {
      const createdDate = new Date(plan.createdAt);
      const iso = toISODate(Number.isNaN(createdDate.getTime()) ? new Date() : createdDate);
      if (!map[iso]) map[iso] = [];
      map[iso].push(plan);
    });
    Object.values(map).forEach(items =>
      items.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        const priorityDiff = priorityMeta[a.priority].order - priorityMeta[b.priority].order;
        if (priorityDiff !== 0) return priorityDiff;
        return (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt);
      })
    );
    return map;
  }, [plans]);

  const selectedCreatedPlans = plansByCreatedDate[selectedIso] || [];

  const saveCategories = (next: string[]) => {
    const normalized = Array.from(new Set(next.map(item => item.trim()).filter(Boolean)));
    setCategories(normalized);
    storage.set(storage.keys.FUTURE_PLAN_CATEGORIES, normalized);
  };

  const addCategory = () => {
    const value = newCategory.trim();
    if (!value) return;
    saveCategories([...categories, value]);
    setForm(prev => ({ ...prev, category: value }));
    setNewCategory('');
  };

  const deleteCategory = (category: string) => {
    saveCategories(categories.filter(item => item !== category));
    if (form.category === category) setForm(prev => ({ ...prev, category: '' }));
    setFilters(prev => ({ ...prev, category: prev.category === category ? 'all' : prev.category }));
  };

  const resetForm = () => {
    setForm(defaultForm());
    setEditingId(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;

    const now = new Date().toISOString();
    if (editingId) {
      savePlans(
        plans.map(plan =>
          plan.id === editingId
            ? {
                ...plan,
                title: form.title.trim(),
                priority: form.priority,
                status: form.status,
                category: form.category.trim(),
                description: form.description.trim(),
                updatedAt: now
              }
            : plan
        )
      );
    } else {
      const newPlan: FuturePlan = {
        id: uid(),
        title: form.title.trim(),
        targetDate: toISODate(new Date()),
        priority: form.priority,
        status: form.status,
        category: form.category.trim(),
        description: form.description.trim(),
        createdAt: now,
        updatedAt: now
      };
      savePlans([...plans, newPlan]);
    }
    resetForm();
  };

  const editPlan = (plan: FuturePlan) => {
    setEditingId(plan.id);
    setForm({
      title: plan.title,
      priority: plan.priority,
      status: plan.status,
      category: plan.category || '',
      description: plan.description || ''
    });
  };

  const deletePlan = (id: string) => {
    savePlans(plans.filter(plan => plan.id !== id));
    if (editingId === id) resetForm();
  };

  const setStatus = (id: string, status: FuturePlanStatus) => {
    savePlans(plans.map(plan => (plan.id === id ? { ...plan, status, updatedAt: new Date().toISOString() } : plan)));
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const changeMonth = (offset: number) => {
    const next = new Date(viewDate);
    next.setMonth(next.getMonth() + offset);
    setViewDate(next);
  };

  const monthLabel = formatCalendarMonthYear(viewDate, calendarMode);
  const weekDays = getCalendarWeekDays(calendarMode);
  const selectedDateLabel = formatAppDate(selectedDate, calendarMode);

  const renderPlanCard = (plan: FuturePlan) => {
    return (
      <div
        key={plan.id}
        className={`rounded-2xl border bg-white/5 p-3 md:p-4 text-white transition hover:border-cyan-300/40 ${
          plan.status === 'done' ? 'border-emerald-400/25 opacity-80' : 'border-white/10'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${priorityMeta[plan.priority].pill}`}>
                <span className={`h-2 w-2 rounded-full ${priorityMeta[plan.priority].dot}`}></span>
                {priorityMeta[plan.priority].label}
              </span>
              <span className={`rounded-full border px-2 py-1 text-[11px] ${statusMeta[plan.status].pill}`}>{statusMeta[plan.status].label}</span>
            </div>
            <div className="text-base font-black leading-tight">{plan.title}</div>
            {plan.category && (
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                <Tag className="h-3.5 w-3.5 text-cyan-300" />
                <span>{plan.category}</span>
              </div>
            )}
            {plan.description && <p className="text-xs leading-relaxed text-slate-300">{plan.description}</p>}
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button
              onClick={() => editPlan(plan)}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-100"
              title="ویرایش"
            >
              <PencilLine className="h-4 w-4" />
            </button>
            <button
              onClick={() => deletePlan(plan.id)}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-rose-400/40 hover:text-rose-100"
              title="حذف"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(['active', 'done'] as FuturePlanStatus[]).map(status => (
            <button
              key={status}
              onClick={() => setStatus(plan.id, status)}
              className={`rounded-xl border px-2 py-2 text-[11px] font-bold transition ${
                plan.status === status ? statusMeta[status].pill : 'border-white/10 bg-slate-900/50 text-slate-300 hover:border-white/20'
              }`}
            >
              {statusMeta[status].label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 md:space-y-7 animate-enter" dir="rtl">
      <div className="relative overflow-hidden rounded-[32px] border border-cyan-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 md:p-7 shadow-[0_24px_80px_-36px_rgba(34,211,238,0.8)]">
        <div className="absolute inset-0 pointer-events-none opacity-50">
          <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-[120px]"></div>
          <div className="absolute right-10 bottom-[-90px] h-72 w-72 rounded-full bg-emerald-500/12 blur-[140px]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_35%,rgba(34,211,238,0.16),transparent_38%),radial-gradient(circle_at_85%_20%,rgba(245,158,11,0.10),transparent_34%),radial-gradient(circle_at_55%_90%,rgba(16,185,129,0.13),transparent_36%)]"></div>
        </div>

        <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr] lg:items-stretch">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-white/5 px-3 py-1 text-xs text-cyan-100">
              <Target className="h-4 w-4 text-cyan-300" />
              نقشه آینده
            </div>
            <div>
              <h2 className="text-2xl font-black text-white md:text-4xl">برنامه‌های آینده و اولویت‌بندی</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                برنامه‌های مهم آینده را با وضعیت، اولویت و دسته‌بندی ثبت کن؛ لیست بر اساس وضعیت و اولویت مرتب می‌شود.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4">
                <div className="text-xs text-cyan-100">کل برنامه‌ها</div>
                <div className="mt-1 text-3xl font-black text-white">{plans.length}</div>
              </div>
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
                <div className="text-xs text-emerald-100">فعال</div>
                <div className="mt-1 text-3xl font-black text-white">{activePlans.length}</div>
              </div>
              <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4">
                <div className="text-xs text-rose-100">اولویت بالا</div>
                <div className="mt-1 text-3xl font-black text-white">{highPriorityCount}</div>
              </div>
              <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
                <div className="text-xs text-amber-100">انجام شده</div>
                <div className="mt-1 text-3xl font-black text-white">{doneCount}</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2 text-white">
              <Flag className="h-5 w-5 text-amber-300" />
              <span className="font-bold">برنامه شاخص</span>
            </div>
            {highlightedPlan ? (
              <div className="mt-4 space-y-3">
                <div className="text-2xl font-black text-white">{highlightedPlan.title}</div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-2 py-1 text-xs ${priorityMeta[highlightedPlan.priority].pill}`}>
                    {priorityMeta[highlightedPlan.priority].label}
                  </span>
                  <span className={`rounded-full border px-2 py-1 text-xs ${statusMeta[highlightedPlan.status].pill}`}>
                    {statusMeta[highlightedPlan.status].label}
                  </span>
                </div>
                {highlightedPlan.category && <div className="text-sm text-cyan-100">{highlightedPlan.category}</div>}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
                برنامه فعالی برای آینده ثبت نشده است.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.9fr]">
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/85 p-4 md:p-5 shadow-[0_22px_70px_-38px_rgba(34,211,238,0.65)]">
          <div className="absolute inset-0 pointer-events-none opacity-45">
            <div className="absolute -left-16 top-8 h-44 w-44 rounded-full bg-cyan-500/14 blur-[100px]"></div>
            <div className="absolute bottom-[-60px] right-8 h-56 w-56 rounded-full bg-emerald-500/12 blur-[120px]"></div>
          </div>
          <div className="relative mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-white">
              <CalendarClock className="h-5 w-5 text-cyan-300" />
              <span className="font-bold">تقویم ثبت برنامه‌ها</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:border-cyan-400/40"
                aria-label="ماه قبل"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white">
                {monthLabel}
              </div>
              <button
                onClick={() => changeMonth(1)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:border-cyan-400/40"
                aria-label="ماه بعد"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative mb-2 text-[11px] text-slate-400">نمای تقویم: {getCalendarModeLabel(calendarMode)}</div>
          <div className="relative grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-cyan-200/80 sm:gap-2">
            {weekDays.map(day => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="relative mt-2 grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarData.days.map(day => {
              const iso = toISODate(day.date);
              const dayPlans = plansByCreatedDate[iso] || [];
              const isSelected = selectedIso === iso;
              const isToday = iso === todayIso;
              const topPriority = dayPlans[0]?.priority || 'normal';
              return (
                <button
                  key={`${iso}-${day.isCurrentMonth}`}
                  onClick={() => handleDayClick(day.date)}
                  className={`relative aspect-[4/5] overflow-hidden rounded-xl border bg-slate-900/65 p-1.5 text-right transition duration-300 hover:scale-[1.03] hover:border-cyan-300/40 sm:rounded-2xl sm:p-2 ${
                    isSelected ? `border-cyan-300/70 ring-2 ${priorityMeta[topPriority].ring}` : 'border-white/10'
                  } ${!day.isCurrentMonth ? 'opacity-45' : ''} ${isToday ? 'ring-2 ring-emerald-400/60 ring-offset-2 ring-offset-slate-950' : ''}`}
                >
                  <div className="flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                      <span>{isToday ? 'امروز' : 'روز'}</span>
                      <span>{dayPlans.length ? `${dayPlans.length}` : ''}</span>
                    </div>
                    <div className="flex flex-1 items-center justify-center">
                      <div className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-base font-black text-white shadow-inner">
                        {day.dayNum}
                      </div>
                    </div>
                    <div className="flex min-h-3 items-center gap-1">
                      {dayPlans.slice(0, 4).map(plan => (
                        <span key={plan.id} className={`h-1.5 w-1.5 rounded-full ${priorityMeta[plan.priority].dot}`}></span>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="relative mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-emerald-300" />
                <span className="text-sm font-bold">برنامه‌های نوشته‌شده در روز انتخابی</span>
              </div>
              <span className="text-xs text-slate-400">{selectedCreatedPlans.length} مورد</span>
            </div>
            <div className="mb-3 text-xs text-cyan-100">{selectedDateLabel}</div>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
              {selectedCreatedPlans.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-sm text-slate-500">
                  در این روز برنامه‌ای ننوشتی.
                </div>
              ) : (
                selectedCreatedPlans.map(renderPlanCard)
              )}
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-5 shadow-[0_22px_70px_-40px_rgba(16,185,129,0.6)]"
        >
          <div className="absolute inset-0 pointer-events-none opacity-45">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/14 blur-[90px]"></div>
            <div className="absolute bottom-0 left-4 h-48 w-48 rounded-full bg-cyan-500/12 blur-[110px]"></div>
          </div>
          <div className="relative space-y-4">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-cyan-300" />
                <span className="font-bold">{editingId ? 'ویرایش برنامه' : 'ثبت برنامه آینده'}</span>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={() => resetForm()}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:border-cyan-400/40"
                >
                  لغو ویرایش
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">عنوان برنامه</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
                placeholder="مثال: شروع پروژه، آماده‌سازی آزمون، یادگیری مهارت..."
                value={form.title}
                onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">دسته‌بندی</label>
              <div className="flex gap-2">
                <select
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
                  value={form.category}
                  onChange={event => setForm(prev => ({ ...prev, category: event.target.value }))}
                >
                  <option value="">بدون دسته</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
                  placeholder="دسته‌بندی جدید"
                  value={newCategory}
                  onChange={event => setNewCategory(event.target.value)}
                />
                <button
                  type="button"
                  onClick={addCategory}
                  className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100"
                >
                  اضافه
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <span key={category} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-2 py-1 text-xs text-slate-200">
                    {category}
                    <button type="button" onClick={() => deleteCategory(category)} className="text-rose-200 hover:text-rose-100">
                      حذف
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">اولویت</label>
              <div className="grid grid-cols-3 gap-2">
                {(['high', 'normal', 'low'] as FuturePlanPriority[]).map(priority => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, priority }))}
                    className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${
                      form.priority === priority ? priorityMeta[priority].pill : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <span className={`h-2 w-2 rounded-full ${priorityMeta[priority].dot}`}></span>
                      {priority === 'high' ? 'بالا' : priority === 'normal' ? 'معمولی' : 'پایین'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">وضعیت</label>
              <div className="grid grid-cols-2 gap-2">
                {(['active', 'done'] as FuturePlanStatus[]).map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, status }))}
                    className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${
                      form.status === status ? statusMeta[status].pill : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    {status === 'active' ? 'در حال' : 'انجام شد'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">توضیحات</label>
              <textarea
                className="min-h-[88px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
                placeholder="جزئیات، قدم بعدی یا نتیجه‌ای که می‌خواهی..."
                value={form.description}
                onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
              />
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-3 text-sm font-black text-white shadow-[0_14px_36px_-18px_rgba(16,185,129,0.9)] transition hover:scale-[1.01]"
            >
              {editingId ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>{editingId ? 'ذخیره تغییرات' : 'ثبت برنامه'}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-slate-950/85 p-4 md:p-5 shadow-[0_22px_70px_-42px_rgba(0,0,0,0.9)]">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="text-white">
            <div className="flex items-center gap-2 text-lg font-black">
              <Filter className="h-5 w-5 text-cyan-300" />
              <span>لیست برنامه‌ها</span>
            </div>
            <div className="mt-1 text-xs text-slate-400">{sortedFilteredPlans.length} مورد مطابق فیلترها</div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <select
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-400/70 focus:outline-none"
              value={filters.priority}
              onChange={event => setFilters(prev => ({ ...prev, priority: event.target.value as 'all' | FuturePlanPriority }))}
            >
              <option value="all">همه اولویت‌ها</option>
              <option value="high">اولویت بالا</option>
              <option value="normal">اولویت معمولی</option>
              <option value="low">اولویت پایین</option>
            </select>
            <select
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-400/70 focus:outline-none"
              value={filters.status}
              onChange={event => setFilters(prev => ({ ...prev, status: event.target.value as 'all' | FuturePlanStatus }))}
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="active">در حال انجام</option>
              <option value="done">انجام شده</option>
            </select>
            <select
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-400/70 focus:outline-none"
              value={filters.category}
              onChange={event => setFilters(prev => ({ ...prev, category: event.target.value }))}
            >
              <option value="all">همه دسته‌ها</option>
              <option value="">بدون دسته</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <button
              onClick={() => setFilters({ priority: 'all', status: 'all', category: 'all' })}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:border-cyan-400/40"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              پاک کردن
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {sortedFilteredPlans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500 lg:col-span-2">
              برنامه‌ای با این فیلترها پیدا نشد.
            </div>
          ) : (
            sortedFilteredPlans.map(renderPlanCard)
          )}
        </div>
      </div>
    </div>
  );
};
