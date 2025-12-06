// Date Utils
export const toPersianDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(date);
};

export const toISODate = (date: Date): string => {
  // Returns YYYY-MM-DD based on LOCAL time, not UTC.
  // This prevents issues where 'today' becomes 'yesterday' late at night/early morning.
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().split('T')[0];
};

export const getRelativeDate = (offsetDays: number, baseDate: Date = new Date()): Date => {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + offsetDays);
  return date;
};

// Persian Calendar Grid Generator
export const getPersianMonthDays = (baseDate: Date) => {
  const toEnglishNumber = (value: string) => {
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
    const normalized = value
      .replace(/[۰-۹]/g, d => persianDigits.indexOf(d).toString())
      .replace(/[٠-٩]/g, d => arabicDigits.indexOf(d).toString());
    const parsed = parseInt(normalized, 10);
    return Number.isFinite(parsed) ? parsed : 1;
  };

  try {
    const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });

    const getParts = (d: Date) => formatter.formatToParts(d);
    const getPartVal = (parts: Intl.DateTimeFormatPart[], type: string): number => {
      const val = parts.find(p => p.type === type)?.value || '1';
      return toEnglishNumber(val);
    };

    const currentParts = getParts(baseDate);
    const currentMonth = getPartVal(currentParts, 'month');
    const currentYear = getPartVal(currentParts, 'year');

    // Find start of month
    let iter = new Date(baseDate);
    for (let i = 0; i < 35; i++) {
      const p = getParts(iter);
      const d = getPartVal(p, 'day');
      if (d === 1) break;
      iter.setDate(iter.getDate() - 1);
    }
    const firstDayOfMonth = new Date(iter);

    // Persian week starts Saturday (6 in JS getDay() is Sat, we want it to be index 0)
    // JS: Sun=0, Mon=1... Fri=5, Sat=6
    // Persian: Sat=0, Sun=1... Fri=6
    // Formula: (day + 1) % 7
    const startDayOfWeek = (firstDayOfMonth.getDay() + 1) % 7;

    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    const days = [];
    // 6 rows * 7 cols = 42 days to ensure full coverage
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const p = getParts(d);

      days.push({
        date: d,
        dayNum: getPartVal(p, 'day'),
        monthNum: getPartVal(p, 'month'),
        yearNum: getPartVal(p, 'year'),
        isCurrentMonth: getPartVal(p, 'month') === currentMonth
      });
    }

    return { days, currentMonth, currentYear };
  } catch (error) {
    // Fallback to Gregorian grid so the calendar never crashes on unsupported locales.
    const today = new Date(baseDate);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = (firstDay.getDay() + 1) % 7;
    const startDate = new Date(currentYear, currentMonth, 1 - startDayOfWeek);
    const days = [];

    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push({
        date: d,
        dayNum: d.getDate(),
        monthNum: d.getMonth() + 1,
        yearNum: d.getFullYear(),
        isCurrentMonth: d.getMonth() === currentMonth
      });
    }

    return { days, currentMonth: currentMonth + 1, currentYear };
  }
};

// Storage Keys
const KEYS = {
  VIDEO_CONFIG: 'planner_video_config',
  VIDEO_LOGS: 'planner_video_logs',
  DAILY_PLANS: 'planner_daily_plans',
  GRADES: 'planner_grades',
  GOALS: 'planner_goals',
  GLOBAL_HABITS: 'planner_global_habits',
  NOTES: 'planner_notes',
  CHAT_HISTORY: 'planner_chat_history',
  CHAT_SESSIONS: 'planner_chat_sessions'
};

// Default API base; can be overridden via VITE_API_BASE_URL
// NOTE: defaulting to 4000 to avoid clashing with Postgres on 3000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const API_SYNC_ENABLED = typeof window !== 'undefined' && !!API_BASE_URL;

if (typeof window !== 'undefined') {
  // Surface the API base so we can quickly debug misconfig (e.g., pointing to DB port)
  // eslint-disable-next-line no-console
  console.info('[storage] API base:', API_BASE_URL);
}

const pushToApi = async (key: string, value: unknown) => {
  if (!API_SYNC_ENABLED) return;
  try {
    await fetch(`${API_BASE_URL}/kv/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    });
  } catch (error) {
    console.warn('[storage] Failed to push to API', error);
  }
};

const removeFromApi = async (key: string) => {
  if (!API_SYNC_ENABLED) return;
  try {
    await fetch(`${API_BASE_URL}/kv/${encodeURIComponent(key)}`, { method: 'DELETE' });
  } catch (error) {
    console.warn('[storage] Failed to remove from API', error);
  }
};

const pullFromApi = async (keys: string[]) => {
  if (!API_SYNC_ENABLED) return null;
  try {
    const params = keys.length ? `?keys=${keys.map(encodeURIComponent).join(',')}` : '';
    const res = await fetch(`${API_BASE_URL}/state${params}`);
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data ?? {};
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined) {
        localStorage.setItem(k, JSON.stringify(v));
      }
    });
    return data;
  } catch (error) {
    console.warn('[storage] Failed to sync from API', error);
    return null;
  }
};

// Generic Storage Helper
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: <T>(key: string, value: T): void => {
    localStorage.setItem(key, JSON.stringify(value));
    void pushToApi(key, value);
  },
  remove: (key: string): void => {
    localStorage.removeItem(key);
    void removeFromApi(key);
  },
  syncFromServer: async (keys: string[] = Object.values(KEYS)) => {
    return pullFromApi(keys);
  },
  keys: KEYS
};
