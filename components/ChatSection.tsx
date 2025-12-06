
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { storage, toISODate, getRelativeDate } from '../utils';
import { DailyPlan, VideoLog, GradeEntry, ChatSession, Message } from '../types';
import { Send, Bot, User, Sparkles, BarChart2, TrendingUp, Cpu, Trash2, Copy, Plus, MessageSquare, Menu, X, Check, Edit2, Save } from 'lucide-react';

const FormatMessage = ({ text }: { text: string }) => {
  const lines = text.split('\n');
  const formattedElements: React.ReactNode[] = [];
  let listBuffer: React.ReactNode[] = [];

  const processInlineFormatting = (line: string) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-cyan-300 font-black drop-shadow-[0_0_5px_rgba(103,232,249,0.3)]">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('"') && part.endsWith('"')) {
         return <span key={i} className="text-amber-200 italic">{part}</span>;
      }
      return part;
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const content = trimmed.substring(2);
      listBuffer.push(
        <li key={`li-${idx}`} className="ml-5 list-disc marker:text-cyan-400 pl-1 mb-1 text-slate-200">
          {processInlineFormatting(content)}
        </li>
      );
    } else {
      if (listBuffer.length > 0) {
        formattedElements.push(<ul key={`list-${idx}`} className="my-3 space-y-1 bg-slate-900/30 p-3 rounded-xl border border-white/5">{listBuffer}</ul>);
        listBuffer = [];
      }
      if (trimmed === '') {
        formattedElements.push(<div key={`br-${idx}`} className="h-2" />);
      } else {
        formattedElements.push(<p key={`p-${idx}`} className="mb-1.5 last:mb-0 leading-relaxed text-slate-100">{processInlineFormatting(line)}</p>);
      }
    }
  });

  if (listBuffer.length > 0) {
    formattedElements.push(<ul key="list-end" className="my-3 space-y-1 bg-slate-900/30 p-3 rounded-xl border border-white/5">{listBuffer}</ul>);
  }

  return <div className="text-sm md:text-base">{formattedElements}</div>;
};

export const ChatSection: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });
  const [isMobile, setIsMobile] = useState(false);
  
  // Renaming State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const loadedSessions = storage.get<ChatSession[]>(storage.keys.CHAT_SESSIONS, []);
    const legacyHistory = storage.get<Message[]>(storage.keys.CHAT_HISTORY, []);
    
    if (loadedSessions.length === 0 && legacyHistory.length > 0) {
      const migratedSession: ChatSession = {
        id: Date.now().toString(),
        title: 'گفتگوی قبلی',
        messages: legacyHistory,
        lastModified: new Date().toISOString()
      };
      setSessions([migratedSession]);
      setCurrentSessionId(migratedSession.id);
      storage.set(storage.keys.CHAT_SESSIONS, [migratedSession]);
      storage.set(storage.keys.CHAT_HISTORY, []);
    } else if (loadedSessions.length > 0) {
      setSessions(loadedSessions);
      setCurrentSessionId(loadedSessions[0].id);
    } else {
      // Create initial session if nothing exists
      const initSession = createSessionObject();
      setSessions([initSession]);
      setCurrentSessionId(initSession.id);
    }
  }, []);

  // Scroll logic: scrolls only the container, not the window
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [currentSessionId, sessions, isTyping]);

  // Track viewport for responsive sidebar
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-show sidebar on desktop, default closed on mobile (slide-in)
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  const getCurrentMessages = () => {
    const session = sessions.find(s => s.id === currentSessionId);
    return session ? session.messages : [];
  };

  const createSessionObject = (): ChatSession => ({
    id: Date.now().toString(),
    title: 'گفتگوی جدید',
    messages: [{
      id: 'init',
      text: "**سلام!** من دستیار هوشمند PIMX هستم. 🤖\nچطور می‌تونم در درس‌ها و برنامه‌ریزی بهت کمک کنم؟",
      sender: 'bot',
      timestamp: new Date().toISOString()
    }],
    lastModified: new Date().toISOString()
  });

  const createNewChat = () => {
    const emptySession = sessions.find(s => s.messages.length <= 1);
    if (emptySession) {
      setCurrentSessionId(emptySession.id);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
      return;
    }

    const newSession = createSessionObject();
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setCurrentSessionId(newSession.id);
    storage.set(storage.keys.CHAT_SESSIONS, updatedSessions);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const performDeleteSession = (id: string) => {
    const updatedSessions = sessions.filter(s => s.id !== id);
    
    // If we deleted the last session, create a new one immediately
    if (updatedSessions.length === 0) {
      const newSession = createSessionObject();
      setSessions([newSession]);
      setCurrentSessionId(newSession.id);
      storage.set(storage.keys.CHAT_SESSIONS, [newSession]);
    } else {
      setSessions(updatedSessions);
      storage.set(storage.keys.CHAT_SESSIONS, updatedSessions);
      
      // If we deleted the active session, switch to the first available
      if (currentSessionId === id) {
        setCurrentSessionId(updatedSessions[0].id);
      }
    }
  };

  const requestDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const sessionTitle = sessions.find(s => s.id === id)?.title || 'چت';
    setConfirmModal({
      open: true,
      title: 'حذف چت',
      description: `می‌خواهی "${sessionTitle}" پاک شود؟`,
      confirmLabel: 'حذف چت',
      onConfirm: () => performDeleteSession(id)
    });
  };

  const deleteMessage = (messageId: string) => {
    if (!currentSessionId) return;

    const updatedSessions = sessions.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: s.messages.filter(m => m.id !== messageId),
          lastModified: new Date().toISOString()
        };
      }
      return s;
    });

    setSessions(updatedSessions);
    storage.set(storage.keys.CHAT_SESSIONS, updatedSessions);
  };

  const requestDeleteMessage = (messageId: string) => {
    setConfirmModal({
      open: true,
      title: 'حذف پیام',
      description: 'آیا از حذف این پیام مطمئن هستی؟',
      confirmLabel: 'حذف پیام',
      onConfirm: () => deleteMessage(messageId)
    });
  };

  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, open: false }));

  const startEditing = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const saveTitle = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    if (editingId) {
      const updatedSessions = sessions.map(s => 
        s.id === editingId ? { ...s, title: editTitle.trim() || s.title } : s
      );
      setSessions(updatedSessions);
      storage.set(storage.keys.CHAT_SESSIONS, updatedSessions);
      setEditingId(null);
    }
  };

  const updateCurrentSession = (newMessages: Message[], titleUpdate?: string) => {
    const updatedSessions = sessions.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: newMessages,
          title: titleUpdate || s.title,
          lastModified: new Date().toISOString()
        };
      }
      return s;
    });
    
    const current = updatedSessions.find(s => s.id === currentSessionId);
    const others = updatedSessions.filter(s => s.id !== currentSessionId);
    const sortedSessions = current ? [current, ...others] : others;

    setSessions(sortedSessions);
    storage.set(storage.keys.CHAT_SESSIONS, sortedSessions);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || !currentSessionId) return;
    if (!overrideText) setInput('');

    const currentMessages = getCurrentMessages();
    const userMsg: Message = { id: Date.now().toString(), text: textToSend, sender: 'user', timestamp: new Date().toISOString() };
    const updatedMessages = [...currentMessages, userMsg];
    
    let newTitle;
    if (currentMessages.length === 1) { 
      newTitle = textToSend.slice(0, 30) + (textToSend.length > 30 ? '...' : '');
    }

    updateCurrentSession(updatedMessages, newTitle);
    setIsTyping(true);

    try {
      const apiKey = import.meta.env.VITE_API_KEY;
      if (!apiKey) {
        setIsTyping(false);
        updateCurrentSession([...updatedMessages, { 
          id: (Date.now() + 1).toString(), 
          text: "کلید VITE_API_KEY تنظیم نشده است. آن را در فایل env قرار بده و دوباره تلاش کن.", 
          sender: 'bot', 
          timestamp: new Date().toISOString() 
        }]);
        return;
      }

      const plans = storage.get<Record<string, DailyPlan>>(storage.keys.DAILY_PLANS, {});
      const logs = storage.get<VideoLog[]>(storage.keys.VIDEO_LOGS, []);
      const grades = storage.get<GradeEntry[]>(storage.keys.GRADES, []);
      const twoWeeksAgo = getRelativeDate(-14);
      const isoTwoWeeks = toISODate(twoWeeksAgo);
      const contextData = {
        plans: Object.values(plans).filter(p => p.date >= isoTwoWeeks),
        videos: logs.filter(l => l.date >= isoTwoWeeks),
        grades: grades.filter(g => g.date >= isoTwoWeeks)
      };

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: { systemInstruction: "You are PIMX AI. Speak Persian. Be helpful, concise, and use formatting." },
        contents: [{ role: 'user', parts: [{ text: `User: "${textToSend}"\nContext: ${JSON.stringify(contextData)}` }] }]
      });

      setIsTyping(false);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response.text || "پاسخی دریافت نشد. دوباره تلاش کن.",
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      updateCurrentSession([...updatedMessages, botMsg]);

    } catch (e) {
      setIsTyping(false);
      const errorMsg: Message = { id: (Date.now() + 1).toString(), text: "مشکل در اتصال یا پاسخ‌دهی. چند لحظه بعد دوباره امتحان کن.", sender: 'bot', timestamp: new Date().toISOString() };
      updateCurrentSession([...updatedMessages, errorMsg]);
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] md:h-[700px] glass-card rounded-[32px] overflow-hidden border border-cyan-500/25 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_24px_80px_-32px_rgba(34,211,238,0.9)] backdrop-blur-xl animate-enter relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_30%,rgba(34,211,238,0.18),transparent_45%),radial-gradient(circle_at_80%_15%,rgba(168,85,247,0.16),transparent_45%),radial-gradient(circle_at_50%_85%,rgba(16,185,129,0.18),transparent_45%)] animate-[spin_28s_linear_infinite] mix-blend-screen opacity-70"></div>
        <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-cyan-500/24 blur-[110px] animate-pulse"></div>
        <div className="absolute -bottom-32 -right-24 w-72 h-72 rounded-full bg-purple-500/26 blur-[130px] animate-[pulse_6s_ease-in-out_infinite] [animation-direction:reverse]"></div>
      </div>
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-30 animate-enter"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar (History) */}
      <div
        className={`
          ${isMobile ? 'fixed right-0 top-0 h-full w-[88%] max-w-xs z-40' : 'relative md:w-72'}
          ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          bg-gradient-to-b from-slate-950/95 via-slate-900/90 to-slate-950/85 border-l border-white/5 transition-transform duration-500 h-full flex flex-col overflow-hidden shadow-[0_30px_80px_-40px_rgba(6,182,212,0.6)]
        `}
      >
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900/70 backdrop-blur-md">
          <button 
            onClick={createNewChat} 
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-[0_15px_45px_-15px_rgba(6,182,212,0.7)] transition-all"
          >
            <Plus className="w-4 h-4" /> گفتگوی جدید
          </button>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-gradient-to-b from-slate-900/60 to-slate-950/40">
          {sessions.map(session => (
            <div 
              key={session.id}
              onClick={() => { setCurrentSessionId(session.id); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
              className={`p-3 rounded-xl cursor-pointer flex items-center justify-between group transition-all ${currentSessionId === session.id ? 'bg-slate-800 border border-cyan-500/40 text-cyan-100 shadow-[0_10px_30px_-18px_rgba(34,211,238,0.8)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'}`}
            >
              <div className="flex items-center gap-3 overflow-hidden flex-1">
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                {editingId === session.id ? (
                  <input 
                    type="text" 
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => saveTitle()}
                    onKeyDown={(e) => e.key === 'Enter' && saveTitle(e)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-slate-900 border border-cyan-500/50 rounded px-1 text-xs text-white outline-none"
                  />
                ) : (
                  <span className="text-xs truncate font-medium">{session.title}</span>
                )}
              </div>
              
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                 {editingId === session.id ? (
                    <button onClick={(e) => saveTitle(e)} className="p-1.5 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-lg">
                      <Check className="w-3 h-3" />
                    </button>
                 ) : (
                    <button onClick={(e) => startEditing(e, session)} className="p-2 hover:bg-cyan-500/20 hover:text-cyan-400 rounded-lg">
                      <Edit2 className="w-3 h-3" />
                    </button>
                 )}
                 <button 
                  onClick={(e) => requestDeleteSession(e, session.id)} 
                  className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg"
                 >
                  <Trash2 className="w-4 h-4" />
                 </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-900/30 relative">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/60 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            {(isMobile || !isSidebarOpen) && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:text-white transition">
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm md:text-base">PIMX Intelligence</h2>
                <div className="flex items-center gap-1.5 text-[10px] text-cyan-300 font-mono">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
                  Gemini 2.5 Active
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Signal Band */}
        <div className="px-4 md:px-6 pt-4">
          <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-cyan-900/40 shadow-lg shadow-cyan-500/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(34,211,238,0.12),transparent_45%)] animate-[pulse_7s_ease-in-out_infinite]"></div>
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-purple-500/10 blur-[90px] animate-[spin_16s_linear_infinite]"></div>
            <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-cyan-500/10 blur-[70px] animate-[spin_20s_linear_infinite] [animation-direction:reverse]"></div>
            <div className="relative flex flex-wrap items-center gap-4 p-4 md:p-5">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl border border-cyan-500/40 bg-cyan-500/10 flex items-center justify-center shadow-[0_0_24px_rgba(34,211,238,0.35)] animate-pulse">
                <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-cyan-100" />
              </div>
              <div className="flex-1 min-w-[220px]">
                <p className="text-white font-bold text-sm md:text-base">PIMX AI</p>
                <p className="text-xs md:text-sm text-slate-300/80 mt-1 leading-relaxed">
                  سامانه مکالمه با تمرکز روی درس و برنامه روزانه؛ پاسخ‌ها با ریتم تند و شخصی‌سازی می‌آید.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 md:gap-3">
                <span className="px-3 py-1.5 rounded-full bg-white/5 border border-cyan-400/30 text-[10px] md:text-xs text-cyan-100 flex items-center gap-1 animate-[pulse_4s_ease-in-out_infinite]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Real-time
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/5 border border-purple-400/20 text-[10px] md:text-xs text-purple-100 flex items-center gap-1">
                  <Cpu className="w-3 h-3" /> Gemini 2.5
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/5 border border-blue-400/20 text-[10px] md:text-xs text-blue-100 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Context-aware
                </span>
              </div>
            </div>
            <div className="absolute inset-x-6 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-[pulse_5s_ease-in-out_infinite]"></div>
          </div>
        </div>

        {/* Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth relative">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(34,211,238,0.05),transparent_35%),radial-gradient(circle_at_80%_60%,rgba(168,85,247,0.05),transparent_40%)] opacity-70"></div>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_40%,rgba(255,255,255,0.02))] [mask-image:linear-gradient(0deg,transparent,black,black,transparent)]"></div>
          <div className="relative space-y-6">
            {getCurrentMessages().map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} group/msg`}>
              <div className={`relative max-w-[85%] md:max-w-[75%] flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} transition-transform duration-300 hover:-translate-y-1 animate-enter`}>
                <div className="absolute inset-[-6px] rounded-3xl bg-gradient-to-r from-cyan-500/10 via-white/5 to-purple-500/10 opacity-0 group-hover/msg:opacity-100 blur-xl transition-opacity duration-300 pointer-events-none"></div>
                
                <div className={`p-4 md:p-5 rounded-2xl shadow-md border relative overflow-hidden ${
                  msg.sender === 'user' 
                    ? 'bg-gradient-to-br from-cyan-600/90 to-blue-700/90 text-white border-cyan-500/30 rounded-tr-sm' 
                    : 'bg-slate-800/80 text-slate-100 border-white/5 rounded-tl-sm backdrop-blur-sm'
                }`}>
                  <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(34,211,238,0.06),transparent_35%)] pointer-events-none"></div>
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[pulse_5s_ease-in-out_infinite]"></div>
                  <FormatMessage text={msg.text} />
                  
                  {/* Action Buttons */}
                  <div className="absolute top-2 left-2 opacity-0 group-hover/msg:opacity-100 transition-opacity flex gap-1 z-10">
                    <button 
                      onClick={() => copyToClipboard(msg.text, msg.id)}
                      className="p-1.5 bg-slate-950/20 hover:bg-slate-950/40 rounded-lg text-white/70 hover:text-white backdrop-blur-sm transition"
                      title="کپی متن"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <button 
                      onClick={() => requestDeleteMessage(msg.id)}
                      className="p-1.5 bg-slate-950/20 hover:bg-red-500/20 rounded-lg text-white/70 hover:text-red-400 backdrop-blur-sm transition"
                      title="حذف پیام"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                <span className="text-[10px] text-slate-500 mt-1 px-1 font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
            ))}
            {isTyping && (
              <div className="flex justify-start animate-enter">
                <div className="bg-slate-800/70 p-4 rounded-2xl rounded-tl-none border border-white/5 flex gap-1.5 shadow-lg shadow-cyan-500/10 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08)_0%,transparent_40%,rgba(59,130,246,0.08)_70%,transparent_100%)] animate-[spin_12s_linear_infinite] opacity-60"></div>
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100"></span>
                  <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-200"></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-900/80 border-t border-white/10 backdrop-blur-xl z-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.08),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,0.08),transparent_35%)] opacity-50 pointer-events-none"></div>
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent opacity-70 animate-[pulse_6s_ease-in-out_infinite] pointer-events-none"></div>
          <div className="relative flex items-center gap-3">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="پیام خود را بنویسید..."
              className="flex-1 bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white outline-none focus:border-cyan-500/50 focus:bg-slate-900 transition placeholder:text-slate-600 shadow-inner text-sm md:text-base"
            />
            <button 
              onClick={() => handleSend()}
              disabled={isTyping}
              className="p-3.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl transition shadow-[0_0_15px_rgba(6,182,212,0.4)] relative overflow-hidden group"
            >
              <span className="absolute -inset-3 rounded-full bg-cyan-500/20 animate-ping opacity-60"></span>
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-400/30 to-blue-500/30 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              <Send className="w-5 h-5 relative z-10" />
            </button>
          </div>
        </div>

      </div>
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeConfirmModal}></div>
          <div className="relative glass-card w-full max-w-sm rounded-2xl p-6 border border-white/10 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">{confirmModal.description}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={closeConfirmModal}
                className="px-4 py-2 rounded-xl text-slate-300 bg-slate-800/70 border border-white/10 hover:bg-slate-700 transition"
              >
                انصراف
              </button>
              <button 
                onClick={() => { confirmModal.onConfirm(); closeConfirmModal(); }}
                className="px-4 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white shadow-[0_0_12px_rgba(248,113,113,0.4)] transition"
              >
                {confirmModal.confirmLabel || 'تایید'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};








