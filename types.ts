
export enum VideoSubject {
  HESABAN = "حسابان",
  HENDESEH = "هندسه",
  GOSASTEH = "گسسته",
  SHIMI = "شیمی",
  FIZIK = "فیزیک"
}

export enum StudySubject {
  HESABAN = "حسابان",
  HENDESEH = "هندسه",
  GOSASTEH = "گسسته",
  SHIMI = "شیمی",
  FIZIK = "فیزیک",
  HOVIYAT = "هویت اجتماعی",
  SALAMAT = "سلامت و بهداشت",
  FARSI = "فارسی",
  ARABI = "عربی",
  ENGLISH = "زبان انگلیسی",
  DINI = "دینی",
  MODIRIYAT = "مدیریت خانواده"
}

export enum GradeSubject {
  HESABAN = "حسابان",
  HENDESEH = "هندسه",
  GOSASTEH = "گسسته",
  SHIMI = "شیمی",
  FIZIK = "فیزیک",
  HOVIYAT = "هویت اجتماعی",
  SALAMAT = "سلامت و بهداشت",
  FARSI = "فارسی",
  ARABI = "عربی",
  ENGLISH = "زبان انگلیسی",
  DINI = "دینی",
  MODIRIYAT = "مدیریت خانواده"
}

export interface VideoConfig {
  subject: VideoSubject;
  totalVideos: number;
  remainingVideos: number;
  scheduleDays?: number[]; // Array of Day Indexes (0=Sun, 1=Mon, ..., 6=Sat)
}

export interface VideoLog {
  id: string;
  date: string; // ISO String YYYY-MM-DD
  subject: VideoSubject;
  count: number;
}

export interface StudyConfig {
  subject: StudySubject;
  totalHours: number;
  scheduleDays?: number[]; // Array of Day Indexes (0=Sun, 1=Mon, ..., 6=Sat)
}

export interface StudyLog {
  id: string;
  date: string; // ISO String YYYY-MM-DD
  subject: StudySubject;
  hours: number;
}

export interface Habit {
  id: string;
  title: string;
  completed: boolean;
  isCustom: boolean;
  scheduleDays?: number[]; // empty or undefined => every day, otherwise limited to listed weekdays (0=Sun ... 6=Sat)
}

export interface AdHocTask {
  id: string;
  title: string;
  impactScore: number; // 1 to 20
  completed: boolean;
}

export interface DailyPlan {
  date: string; // ISO String YYYY-MM-DD
  habits: Habit[];
  tasks: AdHocTask[];
}

export interface GradeEntry {
  id: string;
  subject: GradeSubject;
  date: string;
  score: number; // 0-20
}

export type TimeRange = '1W' | '2W' | '1M' | '2M' | '4M' | '6M' | '8M' | '1Y' | '2Y';

export type GoalType = 'daily' | 'short-term' | 'long-term';
export type GoalStatus = 'pending' | 'done' | 'missed';

export type NoteTargetType = 'habit' | 'task' | 'goal';

export interface DayNote {
  id: string;
  date: string; // ISO date for the day the note belongs to
  targetId: string; // id of the habit/task/goal
  targetType: NoteTargetType;
  targetTitle: string;
  text: string;
  createdAt: string; // timestamp
}

export interface DiaryEntry {
  date: string; // ISO date
  text: string;
  updatedAt: string; // ISO timestamp
}

export interface Goal {
  id: string;
  text: string;
  type: GoalType;
  completed: boolean;
  createdAt: string; // ISO date
  scheduledFor?: string; // ISO date the goal is meant to surface
  completedAt?: string; // ISO date of completion
  status?: GoalStatus; // legacy goals default to pending/done based on completed flag
  missedAt?: string; // ISO date of failure (for missed daily goals)
}

export interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastModified: string;
}

export type ReminderPriority = 'low' | 'normal' | 'high';

export interface ReminderEvent {
  id: string;
  title: string;
  description?: string;
  startAt: string; // ISO timestamp
  createdAt: string; // ISO timestamp
  tags?: string[];
  priority?: ReminderPriority;
  pinned?: boolean;
  location?: string;
}

export type FuturePlanPriority = 'low' | 'normal' | 'high';
export type FuturePlanStatus = 'active' | 'done';

export interface FuturePlan {
  id: string;
  title: string;
  targetDate: string; // ISO date YYYY-MM-DD for the planned day
  priority: FuturePlanPriority;
  status: FuturePlanStatus;
  description?: string;
  category?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export type PersonRelation =
  | 'independent'
  | 'family_head'
  | 'spouse'
  | 'son'
  | 'daughter'
  | 'daughter_in_law'
  | 'son_in_law'
  | 'grandchild'
  | 'mother'
  | 'father'
  | 'other';

export interface PlannedFamily {
  id: string;
  name: string;
  description?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  editHistory?: string[]; // ISO timestamps, newest changes are appended
}

export interface PlannedPerson {
  id: string;
  fullName: string;
  relation: PersonRelation;
  customRelationTag?: string;
  familyId?: string;
  futurePlan: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  editHistory?: string[]; // ISO timestamps, newest changes are appended
}
