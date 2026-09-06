import { storage, toISODate } from './utils';
import {
  ChatSession,
  DailyPlan,
  DiaryEntry,
  FuturePlan,
  GradeEntry,
  Goal,
  PlannedFamily,
  PlannedPerson,
  VideoLog,
  StudyLog,
  StudySubject,
  ReminderEvent
} from './types';

export type ResetSection =
  | 'planner'
  | 'video'
  | 'study'
  | 'english'
  | 'grades'
  | 'goals'
  | 'progress'
  | 'future'
  | 'calendar'
  | 'chat'
  | 'reminders'
  | 'diary'
  | 'names';

export interface ResetResult {
  affectedTabs: ResetSection[];
  summary: {
    clearedAll: boolean;
    plans?: number;
    logs?: number;
    grades?: number;
    goals?: number;
    futurePlans?: number;
    chats?: number;
    reminders?: number;
    diary?: number;
    people?: number;
    families?: number;
  };
}

const toIsoSafe = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return toISODate(parsed);
};

export const resetSectionData = (section: ResetSection, dates: string[], clearAll: boolean): ResetResult => {
  const dateSet = new Set(dates);
  const affected = new Set<ResetSection>([section]);
  const summary: ResetResult['summary'] = { clearedAll: clearAll };

  const removePlans = () => {
    const plans = storage.get<Record<string, DailyPlan>>(storage.keys.DAILY_PLANS, {});
    if (clearAll) {
      summary.plans = Object.keys(plans).length;
      storage.remove(storage.keys.DAILY_PLANS);
      storage.remove(storage.keys.GLOBAL_HABITS);
      return;
    }
    if (dateSet.size === 0) {
      summary.plans = 0;
      return;
    }
    const next = { ...plans };
    let removed = 0;
    dateSet.forEach(d => {
      if (next[d]) {
        delete next[d];
        removed += 1;
      }
    });
    summary.plans = removed;
    if (removed > 0) {
      storage.set(storage.keys.DAILY_PLANS, next);
    }
  };

  const removeVideo = () => {
    const logs = storage.get<VideoLog[]>(storage.keys.VIDEO_LOGS, []);
    if (clearAll) {
      summary.logs = logs.length;
      storage.remove(storage.keys.VIDEO_LOGS);
      storage.remove(storage.keys.VIDEO_CONFIG);
      return;
    }
    if (dateSet.size === 0) {
      summary.logs = 0;
      return;
    }
    const filtered = logs.filter(l => !dateSet.has(l.date));
    summary.logs = logs.length - filtered.length;
    if (filtered.length !== logs.length) {
      storage.set(storage.keys.VIDEO_LOGS, filtered);
    }
  };

  const removeStudy = (subjectFilter?: StudySubject) => {
    const logs = storage.get<StudyLog[]>(storage.keys.STUDY_LOGS, []);
    if (clearAll) {
      const toRemove = subjectFilter ? logs.filter(l => l.subject === subjectFilter) : logs;
      summary.logs = toRemove.length;
      if (subjectFilter) {
        const filtered = logs.filter(l => l.subject !== subjectFilter);
        storage.set(storage.keys.STUDY_LOGS, filtered);
      } else {
        storage.remove(storage.keys.STUDY_LOGS);
        storage.remove(storage.keys.STUDY_CONFIG);
      }
      return;
    }
    if (dateSet.size === 0) {
      summary.logs = 0;
      return;
    }
    const filtered = logs.filter(l => {
      if (subjectFilter && l.subject !== subjectFilter) return true;
      return !dateSet.has(l.date);
    });
    summary.logs = logs.length - filtered.length;
    if (filtered.length !== logs.length) {
      storage.set(storage.keys.STUDY_LOGS, filtered);
    }
  };

  const removeGrades = () => {
    const grades = storage.get<GradeEntry[]>(storage.keys.GRADES, []);
    if (clearAll) {
      summary.grades = grades.length;
      storage.remove(storage.keys.GRADES);
      return;
    }
    if (dateSet.size === 0) {
      summary.grades = 0;
      return;
    }
    const filtered = grades.filter(g => !dateSet.has(toIsoSafe(g.date) || g.date));
    summary.grades = grades.length - filtered.length;
    if (filtered.length !== grades.length) {
      storage.set(storage.keys.GRADES, filtered);
    }
  };

  const removeGoals = () => {
    const goals = storage.get<Goal[]>(storage.keys.GOALS, []);
    if (clearAll) {
      summary.goals = goals.length;
      storage.remove(storage.keys.GOALS);
      return;
    }
    if (dateSet.size === 0) {
      summary.goals = 0;
      return;
    }
    const filtered = goals.filter(goal => {
      const created = toIsoSafe(goal.createdAt);
      const scheduled = toIsoSafe(goal.scheduledFor);
      const completed = toIsoSafe(goal.completedAt);
      const hit =
        (created && dateSet.has(created)) ||
        (scheduled && dateSet.has(scheduled)) ||
        (completed && dateSet.has(completed));
      return !hit;
    });
    summary.goals = goals.length - filtered.length;
    if (filtered.length !== goals.length) {
      storage.set(storage.keys.GOALS, filtered);
    }
  };

  const removeFuturePlans = () => {
    const futurePlans = storage.get<FuturePlan[]>(storage.keys.FUTURE_PLANS, []);
    if (clearAll) {
      summary.futurePlans = futurePlans.length;
      storage.remove(storage.keys.FUTURE_PLANS);
      return;
    }
    if (dateSet.size === 0) {
      summary.futurePlans = 0;
      return;
    }
    const filtered = futurePlans.filter(plan => !dateSet.has(plan.targetDate));
    summary.futurePlans = futurePlans.length - filtered.length;
    if (filtered.length !== futurePlans.length) {
      storage.set(storage.keys.FUTURE_PLANS, filtered);
    }
  };

  const removeChats = () => {
    const sessions = storage.get<ChatSession[]>(storage.keys.CHAT_SESSIONS, []);
    if (clearAll) {
      summary.chats = sessions.length;
      storage.remove(storage.keys.CHAT_SESSIONS);
      storage.remove(storage.keys.CHAT_HISTORY);
      return;
    }
    if (dateSet.size === 0) {
      summary.chats = 0;
      return;
    }
    const nextSessions: ChatSession[] = [];
    let removedMessages = 0;

    sessions.forEach(session => {
      const remainingMessages = session.messages.filter(msg => {
        const iso = toIsoSafe(msg.timestamp);
        return !iso || !dateSet.has(iso);
      });
      removedMessages += session.messages.length - remainingMessages.length;
      if (remainingMessages.length > 0) {
        const last = remainingMessages[remainingMessages.length - 1];
        nextSessions.push({ ...session, messages: remainingMessages, lastModified: last.timestamp });
      }
    });

    summary.chats = removedMessages;
    storage.set(storage.keys.CHAT_SESSIONS, nextSessions);
  };

  const removeReminders = () => {
    const reminders = storage.get<ReminderEvent[]>(storage.keys.REMINDERS, []);
    if (clearAll) {
      summary.reminders = reminders.length;
      storage.remove(storage.keys.REMINDERS);
      return;
    }
    if (dateSet.size === 0) {
      summary.reminders = 0;
      return;
    }
    const filtered = reminders.filter(rem => {
      const iso = toIsoSafe(rem.startAt) || rem.startAt;
      return !iso || !dateSet.has(iso);
    });
    summary.reminders = reminders.length - filtered.length;
    if (filtered.length !== reminders.length) {
      storage.set(storage.keys.REMINDERS, filtered);
    }
  };

  const removeDiary = () => {
    const diaryEntries = storage.get<Record<string, DiaryEntry>>(storage.keys.DIARY_ENTRIES, {});
    const normalized = diaryEntries && typeof diaryEntries === 'object' && !Array.isArray(diaryEntries) ? diaryEntries : {};
    if (clearAll) {
      summary.diary = Object.keys(normalized).length;
      storage.remove(storage.keys.DIARY_ENTRIES);
      return;
    }
    if (dateSet.size === 0) {
      summary.diary = 0;
      return;
    }
    const next = { ...normalized };
    let removed = 0;
    dateSet.forEach(d => {
      if (next[d]) {
        delete next[d];
        removed += 1;
      }
    });
    summary.diary = removed;
    if (removed > 0) {
      storage.set(storage.keys.DIARY_ENTRIES, next);
    }
  };

  const removeNames = () => {
    const people = storage.get<PlannedPerson[]>(storage.keys.PLANNED_PEOPLE, []);
    const families = storage.get<PlannedFamily[]>(storage.keys.PLANNED_FAMILIES, []);
    if (clearAll) {
      summary.people = Array.isArray(people) ? people.length : 0;
      summary.families = Array.isArray(families) ? families.length : 0;
      storage.remove(storage.keys.PLANNED_PEOPLE);
      storage.remove(storage.keys.PLANNED_FAMILIES);
      return;
    }
    if (dateSet.size === 0) {
      summary.people = 0;
      summary.families = 0;
      return;
    }

    const normalizedPeople = Array.isArray(people) ? people : [];
    const normalizedFamilies = Array.isArray(families) ? families : [];
    const familyIdsToRemove = new Set<string>();
    const nextFamilies = normalizedFamilies.filter(family => {
      const created = toIsoSafe(family.createdAt);
      const updated = toIsoSafe(family.updatedAt);
      const historyHit = Array.isArray(family.editHistory) && family.editHistory.some(item => {
        const iso = toIsoSafe(item);
        return Boolean(iso && dateSet.has(iso));
      });
      const hit = (created && dateSet.has(created)) || (updated && dateSet.has(updated)) || historyHit;
      if (hit) familyIdsToRemove.add(family.id);
      return !hit;
    });
    const nextPeople = normalizedPeople
      .filter(person => {
        const created = toIsoSafe(person.createdAt);
        const updated = toIsoSafe(person.updatedAt);
        const historyHit = Array.isArray(person.editHistory) && person.editHistory.some(item => {
          const iso = toIsoSafe(item);
          return Boolean(iso && dateSet.has(iso));
        });
        const hit = (created && dateSet.has(created)) || (updated && dateSet.has(updated)) || historyHit;
        return !hit;
      })
      .map(person => (person.familyId && familyIdsToRemove.has(person.familyId) ? { ...person, familyId: '', relation: 'independent' as const } : person));

    summary.people = normalizedPeople.length - nextPeople.length;
    summary.families = normalizedFamilies.length - nextFamilies.length;
    if (nextPeople.length !== normalizedPeople.length || familyIdsToRemove.size > 0) {
      storage.set(storage.keys.PLANNED_PEOPLE, nextPeople);
    }
    if (nextFamilies.length !== normalizedFamilies.length) {
      storage.set(storage.keys.PLANNED_FAMILIES, nextFamilies);
    }
  };

  switch (section) {
    case 'planner':
      removePlans();
      affected.add('progress');
      affected.add('calendar');
      break;
    case 'video':
      removeVideo();
      break;
    case 'study':
      removeStudy();
      affected.add('calendar');
      break;
    case 'english':
      removeStudy(StudySubject.ENGLISH);
      affected.add('calendar');
      break;
    case 'grades':
      removeGrades();
      affected.add('calendar');
      break;
    case 'goals':
      removeGoals();
      affected.add('progress');
      affected.add('calendar');
      break;
    case 'future':
      removeFuturePlans();
      affected.add('calendar');
      break;
    case 'progress':
      removePlans();
      removeGoals();
      affected.add('planner');
      affected.add('calendar');
      affected.add('goals');
      affected.add('progress');
      break;
    case 'calendar':
      removePlans();
      removeFuturePlans();
      removeStudy();
      removeGrades();
      removeGoals();
      removeReminders();
      removeDiary();
      affected.add('planner');
      affected.add('future');
      affected.add('study');
      affected.add('english');
      affected.add('grades');
      affected.add('goals');
      affected.add('progress');
      affected.add('calendar');
      affected.add('reminders');
      affected.add('diary');
      break;
    case 'chat':
      removeChats();
      break;
    case 'reminders':
      removeReminders();
      affected.add('calendar');
      break;
    case 'diary':
      removeDiary();
      break;
    case 'names':
      removeNames();
      break;
    default:
      break;
  }

  return {
    affectedTabs: Array.from(affected),
    summary
  };
};
