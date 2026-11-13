'use client';

export default function DemoBadge() {
  return (
    <div
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none"
      data-testid="demo-badge"
      aria-hidden="true"
    >
      <span className="inline-flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-sm text-slate-100 text-xs font-medium px-3.5 py-1 rounded-full shadow-md border border-slate-700/60">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span>Modo Demonstração</span>
      </span>
    </div>
  );
}
