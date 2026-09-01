import { FormEvent, ReactNode, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, ScanLine, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/common/StatusBadge';
import { checkInTicket, VerifyResult, verifyTicket } from '@/services/checkin.service';
import { getApiErrorMessage } from '@/services/api';
import { formatDate } from '@/lib/utils';

export default function CheckInPage() {
  const [ticketNumber, setTicketNumber] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const verifyMutation = useMutation({
    mutationFn: verifyTicket,
    onSuccess: (data) => setResult(data),
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to verify ticket'));
      setResult(null);
    },
  });

  const checkInMutation = useMutation({
    mutationFn: checkInTicket,
    onSuccess: async () => {
      toast.success('Attendee checked in');
      if (ticketNumber) {
        const refreshed = await verifyTicket(ticketNumber);
        setResult(refreshed);
      }
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to check in ticket')),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ticketNumber.trim()) return;
    verifyMutation.mutate(ticketNumber.trim());
  }

  function reset() {
    setTicketNumber('');
    setResult(null);
    inputRef.current?.focus();
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Check-in" description="Scan or enter a ticket number to verify and check in attendees" />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="ticketNumber">Ticket number / QR code</Label>
              <Input
                id="ticketNumber"
                ref={inputRef}
                autoFocus
                placeholder="LF-2026-000123"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
              />
            </div>
            <Button type="submit" loading={verifyMutation.isPending}>
              <ScanLine className="h-4 w-4" /> Verify
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className={result.valid && !result.alreadyUsed ? 'border-success/40' : 'border-destructive/40'}>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-3">
              {result.valid && !result.alreadyUsed ? (
                <CheckCircle2 className="h-8 w-8 text-success" />
              ) : (
                <XCircle className="h-8 w-8 text-destructive" />
              )}
              <div>
                <p className="font-serif text-lg font-semibold">{result.message}</p>
                {result.ticket && <p className="font-mono text-xs text-muted-foreground">{result.ticket.ticketNumber}</p>}
              </div>
            </div>

            {result.ticket && (
              <div className="space-y-2 rounded-md border border-border p-4 text-sm">
                <Row label="Ticket type" value={result.ticket.ticket.name} />
                <Row label="Attendee" value={result.ticket.booking.customer.name} />
                <Row label="Email" value={result.ticket.booking.customer.email} />
                <Row label="Booking #" value={result.ticket.booking.bookingNumber} />
                <Row label="Status" value={<StatusBadge status={result.ticket.status} />} />
                {result.ticket.checkedInAt && <Row label="Checked in at" value={formatDate(result.ticket.checkedInAt, true)} />}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              {result.valid && !result.alreadyUsed && (
                <Button onClick={() => checkInMutation.mutate(ticketNumber)} loading={checkInMutation.isPending}>
                  <CheckCircle2 className="h-4 w-4" /> Check in attendee
                </Button>
              )}
              <Button variant="outline" onClick={reset}>
                Scan another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
