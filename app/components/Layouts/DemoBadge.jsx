'use client';

import PillsBadge from '@/components/buttons/PillsBadge';

export default function DemoBadge() {
  return (
    <div
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none"
      data-testid="demo-badge"
      aria-hidden="true"
    >
      <PillsBadge type="dark" small className="gap-1.5 px-3.5 py-1 shadow-md">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span>Modo Demonstração</span>
      </PillsBadge>
    </div>
  );
}
