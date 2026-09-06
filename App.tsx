import React, { useState, useEffect } from 'react';
import { VideoSection } from './components/VideoSection';
import { StudySection } from './components/StudySection';
import { EnglishStudySection } from './components/EnglishStudySection';
import { DailyPlanner } from './components/DailyPlanner';
import { GradeTracker } from './components/GradeTracker';
import { CalendarSection } from './components/CalendarSection';
import { ChatSection } from './components/ChatSection';
import { GoalSection } from './components/GoalSection';
import { ProgressSection } from './components/ProgressSection';
import { ReminderSection } from './components/ReminderSection';
import { DiarySection } from './components/DiarySection';
import { FuturePlanSection } from './components/FuturePlanSection';
import { NamesSection } from './components/NamesSection';
import { LoginScreen } from './components/LoginScreen';
import { DataResetModal } from './components/DataResetModal';
import { resetSectionData } from './resetData';
import { CalendarMode, calendarModeStorage, getCalendarModeLabel, storage } from './utils';
import { LayoutDashboard, CheckSquare, GraduationCap, CalendarDays, MessageCircle, Target, Lock, Activity, RotateCcw, BookOpen, Languages, BellRing, NotebookPen, CalendarClock, Users } from 'lucide-react';

type TabId = 'video' | 'study' | 'english' | 'planner' | 'grades' | 'calendar' | 'chat' | 'goals' | 'progress' | 'reminders' | 'diary' | 'future' | 'names';

const TAB_LABELS: Record<TabId, string> = {
  planner: 'برنامه روزانه',
  video: 'ویدیوها',
  study: 'مطالعه',
  english: 'زبان انگلیسی',
  grades: 'نمرات',
  calendar: 'تقویم',
  chat: 'گفتگو',
  goals: 'اهداف',
  progress: 'پیشرفت',
  reminders: 'یادآوری‌ها',
  diary: 'دفتر خاطرات',
  future: 'برنامه‌های آینده',
  names: 'اسامی'
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabId>('planner');
  const [isBooting, setIsBooting] = useState<boolean>(true);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>(() => calendarModeStorage.get());
  const [resetKeys, setResetKeys] = useState<Record<TabId, number>>({
    planner: 0,
    video: 0,
    study: 0,
    english: 0,
    grades: 0,
    calendar: 0,
    chat: 0,
    goals: 0,
    progress: 0,
    reminders: 0,
    diary: 0,
    future: 0,
    names: 0
  });

  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('pimx_auth_session');
    if (sessionAuth === 'valid') {
      setIsAuthenticated(true);
    }
    const t = setTimeout(() => setIsBooting(false), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    storage.syncFromServer().catch(() => {
      // keep UI functional even if API is down
    });
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('pimx_auth_session', 'valid');
  };

  const handleLock = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('pimx_auth_session');
  };

  const refreshTabs = (tabs: TabId[]) => {
    setResetKeys(prev => {
      const next = { ...prev };
      tabs.forEach(tab => {
        if (typeof next[tab] === 'number') {
          next[tab] = next[tab] + 1;
        }
      });
      return next;
    });
  };

  const handleResetConfirm = ({ dates, clearAll }: { dates: string[]; clearAll: boolean }) => {
    const result = resetSectionData(activeTab, dates, clearAll);
    refreshTabs(result.affectedTabs as TabId[]);
    setIsResetModalOpen(false);
  };

  const handleCalendarModeChange = (mode: CalendarMode) => {
    setCalendarMode(mode);
    calendarModeStorage.set(mode);
    refreshTabs(Object.keys(resetKeys) as TabId[]);
  };

  const SplashLoader = () => (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute -left-20 -top-20 w-72 h-72 rounded-full bg-cyan-500/15 blur-[120px] animate-pulse"></div>
        <div className="absolute -right-10 bottom-10 w-80 h-80 rounded-full bg-purple-500/15 blur-[140px] animate-float"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      </div>
      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl border border-cyan-400/40 bg-slate-900/60 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.35)]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 blur-[1px] animate-[spin_2.2s_linear_infinite]"></div>
        </div>
        <div>
          <p className="text-sm text-cyan-200/70 font-mono tracking-[0.2em]">PIMX SYSTEM</p>
          <p className="text-2xl md:text-3xl font-black mt-1">سیستم مدیریت پیشرفت شخصی</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Loading modules...</span>
        </div>
      </div>
    </div>
  );

  if (isBooting) {
    return <SplashLoader />;
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const NavButton = ({ id, icon: Icon, label }: { id: TabId; icon: any; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`relative group p-1.5 md:p-2 rounded-lg transition-all duration-300 flex flex-col items-center gap-0.5
        ${activeTab === id ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}
      `}
    >
      <div className={`absolute inset-0 bg-cyan-500/10 rounded-lg blur-md transition-opacity duration-300 ${activeTab === id ? 'opacity-100' : 'opacity-0'}`}></div>
      <div className={`relative z-10 transition-transform duration-300 ${activeTab === id ? 'scale-110 -translate-y-1' : ''}`}>
        <Icon className="h-5 w-5" />
      </div>
      <span className={`text-[9px] font-bold leading-none transition-all duration-300 ${activeTab === id ? 'opacity-100 translate-y-0 text-cyan-400' : 'opacity-0 translate-y-1 hidden md:block'}`}>
        {label}
      </span>
      {activeTab === id && <div className="absolute -bottom-1 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>}
    </button>
  );

  return (
    <div className="min-h-screen relative font-sans overflow-hidden selection:bg-cyan-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-[-1] bg-[#020617]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[120px] animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-pink-600/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      </div>

      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed top-0 right-0 h-screen w-20 glass border-l border-white/5 z-50 flex-col items-center py-4 gap-3 shadow-2xl">
        <div className="text-2xl font-black bg-gradient-to-br from-cyan-400 to-purple-500 text-transparent bg-clip-text animate-pulse">P</div>

        <div className="flex w-full flex-1 flex-col gap-1.5 overflow-y-auto px-1.5 custom-scrollbar">
          <NavButton id="planner" icon={CheckSquare} label="برنامه" />
          <NavButton id="video" icon={LayoutDashboard} label="ویدیو" />
          <NavButton id="study" icon={BookOpen} label="مطالعه" />
          <NavButton id="english" icon={Languages} label="انگلیسی" />
          <NavButton id="grades" icon={GraduationCap} label="نمرات" />
          <NavButton id="goals" icon={Target} label="اهداف" />
          <NavButton id="future" icon={CalendarClock} label="آینده" />
          <NavButton id="names" icon={Users} label="اسامی" />
          <NavButton id="progress" icon={Activity} label="پیشرفت" />
          <NavButton id="reminders" icon={BellRing} label="یادآوری" />
          <NavButton id="diary" icon={NotebookPen} label="خاطرات" />
          <NavButton id="calendar" icon={CalendarDays} label="تقویم" />
          <NavButton id="chat" icon={MessageCircle} label="گفتگو" />
        </div>

        <div className="pt-2">
          <button
            onClick={handleLock}
            className="p-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all group border border-white/5"
            title="خروج از حساب"
          >
            <Lock className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation (Floating HUD) */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 h-16 glass rounded-2xl z-50 flex items-center gap-1 overflow-x-auto shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border border-white/10 px-2 custom-scrollbar">
        <NavButton id="planner" icon={CheckSquare} label="برنامه" />
        <NavButton id="video" icon={LayoutDashboard} label="ویدیو" />
        <NavButton id="study" icon={BookOpen} label="مطالعه" />
        <NavButton id="english" icon={Languages} label="انگلیسی" />
        <NavButton id="goals" icon={Target} label="اهداف" />
        <NavButton id="future" icon={CalendarClock} label="آینده" />
        <NavButton id="names" icon={Users} label="اسامی" />
        <NavButton id="progress" icon={Activity} label="پیشرفت" />
        <NavButton id="reminders" icon={BellRing} label="یادآوری" />
        <NavButton id="diary" icon={NotebookPen} label="خاطرات" />
        <NavButton id="calendar" icon={CalendarDays} label="تقویم" />
        <button onClick={() => setActiveTab('chat')} className={`p-2 rounded-full transition-all ${activeTab === 'chat' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 -translate-y-4 scale-110' : 'text-slate-500'}`}>
          <MessageCircle className="w-6 h-6" />
        </button>
        <NavButton id="grades" icon={GraduationCap} label="نمرات" />
      </nav>

      {/* Main Content */}
      <main className="md:pr-28 p-4 md:p-10 max-w-7xl mx-auto pb-28 md:pb-10">
        <header className="mb-6 md:mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 md:gap-6 animate-enter">
          <div className="w-full lg:w-auto">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-lg leading-tight">
              {activeTab === 'planner' && 'برنامه‌ریزی روزانه'}
              {activeTab === 'video' && 'پیگیری ویدیوها'}
              {activeTab === 'study' && 'مدیریت مطالعه'}
              {activeTab === 'english' && 'زبان انگلیسی'}
              {activeTab === 'grades' && 'مدیریت نمرات'}
              {activeTab === 'goals' && 'اهداف و پیگیری'}
              {activeTab === 'future' && 'برنامه‌های آینده'}
              {activeTab === 'names' && 'اسامی و خانواده‌ها'}
              {activeTab === 'progress' && 'پیشرفت و تحلیل بهره‌وری'}
              {activeTab === 'reminders' && 'یادآوری‌ها و اعلان‌های شخصی'}
              {activeTab === 'diary' && 'دفتر خاطرات روزانه'}
              {activeTab === 'calendar' && 'تقویم و بازه‌های کاری'}
              {activeTab === 'chat' && 'گفتگو و یادداشت‌ها'}
            </h1>
            <p className="text-cyan-400/80 mt-2 md:mt-3 text-xs sm:text-sm md:text-base font-medium flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse flex-shrink-0"></span>
              <span className="whitespace-nowrap">داشبوردی برای مدیریت پیشرفت شخصی</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 sm:gap-3 w-full lg:w-auto">
            <div className="flex items-center justify-center gap-1 rounded-full border border-white/10 bg-slate-900/60 p-1 text-xs font-bold text-slate-200">
              {(['jalali', 'gregorian'] as CalendarMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => handleCalendarModeChange(mode)}
                  className={`rounded-full px-3 py-1.5 transition ${
                    calendarMode === mode
                      ? 'bg-cyan-500 text-white shadow-[0_10px_24px_-14px_rgba(34,211,238,0.9)]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {getCalendarModeLabel(mode)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 text-cyan-100 font-bold text-xs sm:text-sm shadow-[0_10px_30px_-15px_rgba(34,211,238,0.8)] hover:bg-cyan-500/15 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden min-[400px]:inline">بازنشانی داده‌های بخش</span>
              <span className="min-[400px]:hidden">بازنشانی</span>
              <span className="hidden md:inline text-[11px] text-cyan-100/70">({TAB_LABELS[activeTab]})</span>
            </button>
            <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/50 backdrop-blur-md px-3 sm:px-4 py-2 rounded-full border border-white/5 shadow-inner">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981] flex-shrink-0"></div>
              <div className="text-[9px] sm:text-[10px] md:text-xs text-slate-300 font-mono tracking-wider whitespace-nowrap">
                <span className="hidden sm:inline">STATUS: ONLINE <span className="opacity-50 mx-1">|</span> DB: SECURE</span>
                <span className="sm:hidden">ONLINE | SECURE</span>
              </div>
              <button onClick={handleLock} className="md:hidden ml-1 sm:ml-2 text-slate-500 hover:text-red-400 flex-shrink-0">
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-[70vh]">
          {activeTab === 'video' && <VideoSection key={`video-${resetKeys.video}`} />}
          {activeTab === 'study' && <StudySection key={`study-${resetKeys.study}`} />}
          {activeTab === 'english' && <EnglishStudySection key={`english-${resetKeys.english}`} />}
          {activeTab === 'planner' && <DailyPlanner key={`planner-${resetKeys.planner}`} />}
          {activeTab === 'grades' && <GradeTracker key={`grades-${resetKeys.grades}`} />}
          {activeTab === 'goals' && <GoalSection key={`goals-${resetKeys.goals}`} />}
          {activeTab === 'future' && <FuturePlanSection key={`future-${resetKeys.future}`} />}
          {activeTab === 'names' && <NamesSection key={`names-${resetKeys.names}`} />}
          {activeTab === 'progress' && <ProgressSection key={`progress-${resetKeys.progress}`} />}
          {activeTab === 'reminders' && <ReminderSection key={`reminders-${resetKeys.reminders}`} />}
          {activeTab === 'diary' && <DiarySection key={`diary-${resetKeys.diary}`} />}
          {activeTab === 'calendar' && <CalendarSection key={`calendar-${resetKeys.calendar}`} />}
          {activeTab === 'chat' && <ChatSection key={`chat-${resetKeys.chat}`} />}
        </div>
      </main>
      <DataResetModal
        open={isResetModalOpen}
        sectionLabel={TAB_LABELS[activeTab]}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleResetConfirm}
      />
    </div>
  );
};

export default App;
