import React, { useState } from 'react';
import { ShieldCheck, Lock, Database, Cpu } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'PIMX963') {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background FX */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[100px] animate-float"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[100px] animate-float" style={{animationDelay: '3s'}}></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

      <div className="glass-card border border-white/10 p-8 md:p-12 rounded-[2rem] shadow-2xl max-w-md w-full animate-enter relative z-10 backdrop-blur-2xl">
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 bg-slate-900/50 rounded-3xl flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_30px_rgba(34,211,238,0.1)] rotate-3">
            <Lock className="w-10 h-10 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">PIMX SECURITY</h1>
          <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <Cpu className="w-3 h-3" />
            SYSTEM LOCKED
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2 group">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="ENTER PASSCODE"
              className={`w-full bg-slate-950/50 border ${error ? 'border-red-500 animate-shake text-red-500' : 'border-slate-700 focus:border-cyan-500 text-white'} rounded-2xl px-4 py-5 text-center tracking-[0.5em] outline-none transition-all placeholder:tracking-widest placeholder:text-slate-600 text-lg font-bold shadow-inner`}
              autoFocus
            />
            {error && <p className="text-red-500 text-xs text-center font-bold tracking-widest animate-pulse">ACCESS DENIED</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-[0_10px_20px_-5px_rgba(6,182,212,0.4)] flex items-center justify-center gap-3 group hover:scale-[1.02] active:scale-[0.98]"
          >
            <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
            AUTHENTICATE
          </button>
        </form>
        
        <div className="mt-8 text-center flex flex-col gap-1">
          <div className="text-[10px] text-slate-600 font-mono">SECURE DATABASE CONNECTION</div>
          <div className="text-[10px] text-slate-700 font-mono">ID: PIMX-963-Secure-V2</div>
        </div>
      </div>
    </div>
  );
};