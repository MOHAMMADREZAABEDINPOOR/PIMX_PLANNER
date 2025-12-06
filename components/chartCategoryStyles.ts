export const chartCategoryBase =
  'px-4 py-1.5 rounded-full border text-xs font-bold transition-all duration-200 whitespace-nowrap';

export const chartCategoryInactive =
  'bg-slate-900/80 border-slate-700/70 text-slate-200 hover:border-cyan-400/60 hover:text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04)]';

export const chartCategoryActive =
  'bg-cyan-400 text-slate-900 border-cyan-200 shadow-[0_12px_32px_-18px_rgba(34,211,238,0.85)]';

export const chartCategoryClass = (active: boolean, extraActive?: string) =>
  `${chartCategoryBase} ${
    active ? `${chartCategoryActive} ${extraActive || ''}`.trim() : chartCategoryInactive
  }`;
