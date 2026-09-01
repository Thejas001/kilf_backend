import { ReactNode, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, RotateCcw, QrCode } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { cancelBooking, getBooking, refundBooking } from '@/services/booking.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getApiErrorMessage } from '@/services/api';

function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  variant,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  variant: 'default' | 'destructive';
  onConfirm: (reason: string) => Promise<unknown>;
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm(reason);
      onOpenChange(false);
      setReason('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="reason">Reason (optional)</Label>
          <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Back
          </Button>
          <Button variant={variant === 'destructive' ? 'destructive' : 'default'} onClick={handleConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const { data: booking, isLoading, isError, refetch } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => getBooking(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cancelBooking(id!, reason || undefined),
    onSuccess: () => {
      toast.success('Booking cancelled');
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to cancel booking')),
  });

  const refundMutation = useMutation({
    mutationFn: (reason: string) => refundBooking(id!, reason || undefined),
    onSuccess: () => {
      toast.success('Booking refunded');
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to refund booking')),
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (isError || !booking) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Booking ${booking.bookingNumber}`}
        description={`Created ${formatDate(booking.createdAt, true)}`}
        actions={
          <div className="flex gap-2">
            {['PENDING_PAYMENT', 'CONFIRMED'].includes(booking.status) && (
              <Button variant="outline" onClick={() => setCancelOpen(true)}>
                <Ban className="h-4 w-4" /> Cancel Booking
              </Button>
            )}
            {booking.status === 'CONFIRMED' && (
              <Button variant="destructive" onClick={() => setRefundOpen(true)}>
                <RotateCcw className="h-4 w-4" /> Refund
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Booking summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <InfoRow label="Booking status" value={<StatusBadge status={booking.status} />} />
              <InfoRow label="Payment status" value={<StatusBadge status={booking.payments[0]?.status ?? 'PENDING'} />} />
              <InfoRow label="Festival" value={booking.festival.name} />
              <InfoRow label="Quantity" value={String(booking.quantity)} />
              <InfoRow label="Total amount" value={formatCurrency(booking.totalAmount, booking.currency)} />
              {booking.cancelReason && <InfoRow label="Cancel reason" value={booking.cancelReason} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tickets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booking.bookingItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="font-medium">{item.ticket.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatCurrency(item.unitPrice, booking.currency)}
                    </p>
                  </div>
                  <p className="font-medium">{formatCurrency(item.subtotal, booking.currency)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {booking.ticketInstances && booking.ticketInstances.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>QR Tickets</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {booking.ticketInstances.map((instance) => (
                  <div key={instance.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                    {instance.qrCode ? (
                      <img src={instance.qrCode} alt={instance.ticketNumber} className="h-16 w-16 rounded" />
                    ) : (
                      <QrCode className="h-16 w-16 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs">{instance.ticketNumber}</p>
                      <div className="mt-1">
                        <StatusBadge status={instance.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <InfoRow label="Name" value={booking.customer.name} />
              <InfoRow label="Email" value={booking.customer.email} />
              <InfoRow label="Phone" value={booking.customer.phone} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booking.payments.map((payment) => (
                <div key={payment.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{formatCurrency(payment.amount, payment.currency)}</span>
                    <StatusBadge status={payment.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{payment.provider} • {formatDate(payment.createdAt, true)}</p>
                  {payment.providerPaymentId && (
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground" title={payment.providerPaymentId}>
                      ID: {payment.providerPaymentId}
                    </p>
                  )}
                  {payment.status === 'REFUNDED' && Number(payment.refundedAmount) > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Refunded: {formatCurrency(payment.refundedAmount, payment.currency)}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel booking"
        description="This will release reserved inventory back to the ticket pool."
        confirmLabel="Cancel booking"
        variant="destructive"
        onConfirm={(reason) => cancelMutation.mutateAsync(reason)}
      />
      <ReasonDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        title="Refund booking"
        description="This will refund the payment and release ticket inventory."
        confirmLabel="Refund"
        variant="destructive"
        onConfirm={(reason) => refundMutation.mutateAsync(reason)}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
