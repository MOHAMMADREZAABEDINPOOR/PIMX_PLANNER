import React from 'react';
import { Activity, Sparkles } from 'lucide-react';

export type RangeProgressKey = '3d' | '1w' | '2w' | '1m' | '3m' | '6m' | '1y';

export type RangeProgressWindow = {
  key: RangeProgressKey;
  label: string;
  days: number;
  color: string;
};

export type RangeProgressItem = RangeProgressWindow & {
  value: number;
};

export const RANGE_WINDOWS: RangeProgressWindow[] = [
  { key: '3d', label: '۳ روز اخیر', days: 3, color: '#22d3ee' },
  { key: '1w', label: '۱ هفته اخیر', days: 7, color: '#34d399' },
  { key: '2w', label: '۲ هفته اخیر', days: 14, color: '#f59e0b' },
  { key: '1m', label: '۱ ماه اخیر', days: 30, color: '#a855f7' },
  { key: '3m', label: '۳ ماه اخیر', days: 90, color: '#f472b6' },
  { key: '6m', label: '۶ ماه اخیر', days: 180, color: '#38bdf8' },
  { key: '1y', label: '۱ سال اخیر', days: 365, color: '#f43f5e' }
];

export const clampRangePercent = (value: number) => Math.max(-100, Math.min(100, value));

type RangeProgressRowProps = {
  title?: string;
  subtitle?: string;
  items: RangeProgressItem[];
  className?: string;
};

export const RangeProgressRow: React.FC<RangeProgressRowProps> = ({
  title = 'تحلیل تغییرات بازه‌ای',
  subtitle = 'مقایسه میانگین بازده در بازه‌های زمانی مختلف',
  className = 'relative flex',
  items
}) => {
  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-slate-950/70 backdrop-blur-md p-4 md:p-5 shadow-[0_18px_55px_-32px_rgba(0,0,0,0.6)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.08),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(120,58,230,0.09),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(14,165,233,0.08),transparent_45%)]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/40 via-slate-950/50 to-slate-900/40"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light"></div>
        </div>

        <div className="relative flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2 text-white text-lg font-bold">
            <Activity className="w-5 h-5 text-cyan-300" />
            <span>{title}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{subtitle}</span>
          </div>
        </div>

        <div className="relative overflow-x-auto pb-2">
          <div className="grid grid-flow-col auto-cols-[114px] sm:auto-cols-[133px] md:auto-cols-[144px] gap-3 snap-x snap-mandatory">
            {items.map(item => {
              const percent = clampRangePercent(item.value);
              const magnitude = Math.min(100, Math.abs(percent));
              const angle = magnitude * 3.6;
              const ringColor = percent === 0 ? '#94a3b8' : percent > 0 ? '#22c55e' : '#ef4444';
              const textColor = percent === 0 ? 'text-slate-200' : percent > 0 ? 'text-emerald-200' : 'text-rose-200';
              const signPrefix = percent > 0 ? '+' : percent < 0 ? '-' : '';
              const displayValue = Math.abs(percent).toFixed(2);
              return (
                <div
                  key={item.key}
                  className="snap-start flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-950/80 to-slate-900/70 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.8)]"
                >
                  <div className="relative w-16 h-16 shrink-0">
                    <div
                      className="absolute inset-0 rounded-full border border-white/10"
                      style={{
                        background: `conic-gradient(${ringColor} ${angle}deg, rgba(148,163,184,0.18) ${angle}deg)`
                      }}
                    ></div>
                    <div className="absolute inset-[6px] rounded-full bg-slate-950/90 border border-white/10 flex flex-col items-center justify-center text-white shadow-[0_6px_18px_rgba(0,0,0,0.45)]">
                      <span className={`text-lg font-black ${textColor}`}>{`${signPrefix}${displayValue}%`}</span>
                    </div>
                  </div>
                  <div className="w-full space-y-1 text-center">
                    <div className="text-[11px] text-slate-400 leading-tight">بازه {item.days} روزه</div>
                    <div className="text-[11px] text-slate-400 leading-tight">{item.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
