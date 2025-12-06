import { storage, toISODate } from './utils';
import { ChatSession, DailyPlan, GradeEntry, Goal, VideoLog } from './types';

export type ResetSection = 'planner' | 'video' | 'grades' | 'goals' | 'progress' | 'calendar' | 'chat';

export interface ResetResult {
  affectedTabs: ResetSection[];
  summary: {
    clearedAll: boolean;
    plans?: number;
    logs?: number;
    grades?: number;
    goals?: number;
    chats?: number;
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

  switch (section) {
    case 'planner':
      removePlans();
      affected.add('progress');
      affected.add('calendar');
      break;
    case 'video':
      removeVideo();
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
      removeVideo();
      removeGrades();
      removeGoals();
      affected.add('planner');
      affected.add('video');
      affected.add('grades');
      affected.add('goals');
      affected.add('progress');
      affected.add('calendar');
      break;
    case 'chat':
      removeChats();
      break;
    default:
      break;
  }

  return {
    affectedTabs: Array.from(affected),
    summary
  };
};
