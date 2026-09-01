import { Badge, BadgeProps } from '@/components/ui/badge';

const STATUS_VARIANTS: Record<string, NonNullable<BadgeProps['variant']>> = {
  // Bookings
  PENDING_PAYMENT: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'destructive',
  REFUNDED: 'secondary',
  EXPIRED: 'destructive',
  // Payments
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'destructive',
  // Tickets / Sponsors
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  VALID: 'success',
  USED: 'secondary',
  // Festivals
  DRAFT: 'secondary',
  PUBLISHED: 'success',
  COMPLETED: 'accent',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Pending Payment',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANTS[status] ?? 'outline'}>
      {STATUS_LABELS[status] ?? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')}
    </Badge>
  );
}
