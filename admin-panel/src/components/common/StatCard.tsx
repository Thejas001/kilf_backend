import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
  to?: string;
  footer?: ReactNode;
}

const toneClasses: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

export function StatCard({ label, value, icon: Icon, hint, tone = 'default', to, footer }: StatCardProps) {
  const card = (
    <Card className={cn('h-full', to && 'transition-colors hover:border-primary/50')}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 break-words font-serif text-2xl font-bold">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          {Icon && (
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', toneClasses[tone])}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
        {footer && <div className="mt-3">{footer}</div>}
      </CardContent>
    </Card>
  );

  return to ? (
    <Link to={to} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {card}
    </Link>
  ) : (
    card
  );
}
