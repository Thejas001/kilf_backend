import { cn } from '@/lib/utils';

export function ProgressBar({
  value,
  max,
  className,
  barClassName = 'bg-primary',
}: {
  value: number;
  max: number;
  className?: string;
  barClassName?: string;
}) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-secondary', className)}>
      <div className={cn('h-full rounded-full', barClassName)} style={{ width: `${percent}%` }} />
    </div>
  );
}
