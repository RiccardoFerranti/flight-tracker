import clsx from 'clsx';
import { RadioTower } from 'lucide-react';

import type { PlaneDetailsSocketStatus } from '@/data/planes/types';

type LiveDataStatusIndicatorProps = {
  status: PlaneDetailsSocketStatus;
};

const statusLabels: Record<PlaneDetailsSocketStatus, string> = {
  connected: 'Live data connected',
  connecting: 'Connecting to live data',
  disconnected: 'Live data disconnected',
  error: 'Live data unavailable',
};

export function LiveDataStatusIndicator({ status }: LiveDataStatusIndicatorProps) {
  return (
    <span
      aria-label={statusLabels[status]}
      className={clsx(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full',
        status === 'connected' && 'bg-status-positive/10 text-status-positive',
        status === 'connecting' &&
          'bg-status-pending-subtle text-status-pending animate-pulse motion-reduce:animate-none',
        status === 'error' && 'bg-status-warning/10 text-status-warning',
        status === 'disconnected' && 'bg-surface-elevated text-text-muted',
      )}
    >
      <RadioTower aria-hidden="true" size={16} strokeWidth={2} />
    </span>
  );
}
