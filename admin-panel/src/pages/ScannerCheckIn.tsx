import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, TriangleAlert, XCircle } from 'lucide-react';
import { QrScanner } from '@/components/common/QrScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { checkInTicket, VerifyResult, verifyTicket } from '@/services/checkin.service';
import { getApiErrorMessage } from '@/services/api';
import { formatDate } from '@/lib/utils';

const AUTO_KEY = 'kilf.scanner.autoCheckIn';
const DONE_DISMISS_MS = 1500;

type Outcome = 'ok' | 'used' | 'invalid' | 'done';

function outcomeOf(r: VerifyResult): Outcome {
  if (!r.valid) return 'invalid';
  return r.alreadyUsed ? 'used' : 'ok';
}

function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

function readAuto(): boolean {
  try {
    return localStorage.getItem(AUTO_KEY) === '1';
  } catch {
    return false;
  }
}

/** Full-screen, camera-first check-in for gate staff: scan, see details, one tap to admit. */
export function ScannerCheckIn() {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(readAuto);
  const [manual, setManual] = useState('');
  const [count, setCount] = useState(0);
  const dismissTimer = useRef<number>();
  // Guards against out-of-order responses when scans arrive back to back.
  const seq = useRef(0);

  const clear = useCallback(() => {
    window.clearTimeout(dismissTimer.current);
    seq.current++;
    setResult(null);
    setOutcome(null);
    setBusy(false);
  }, []);

  useEffect(() => () => window.clearTimeout(dismissTimer.current), []);

  const admit = useCallback(
    async (ticketNumber: string, verified: VerifyResult) => {
      const mine = ++seq.current;
      setBusy(true);
      try {
        await checkInTicket(ticketNumber);
        if (mine !== seq.current) return;
        setCount((c) => c + 1);
        setOutcome('done');
        setResult({ ...verified, alreadyUsed: true, message: 'Checked in' });
        buzz(60);
        dismissTimer.current = window.setTimeout(clear, DONE_DISMISS_MS);
      } catch (err) {
        if (mine !== seq.current) return;
        toast.error(getApiErrorMessage(err, 'Failed to check in ticket'));
        buzz([100, 60, 100]);
      } finally {
        if (mine === seq.current) setBusy(false);
      }
    },
    [clear]
  );

  const scan = useCallback(
    async (raw: string) => {
      const ticketNumber = raw.trim();
      if (!ticketNumber) return;
      const mine = ++seq.current;
      setBusy(true);
      setResult(null);
      setOutcome(null);
      try {
        const verified = await verifyTicket(ticketNumber);
        if (mine !== seq.current) return;
        const o = outcomeOf(verified);
        setResult(verified);
        setOutcome(o);
        buzz(o === 'ok' ? 40 : [100, 60, 100]);
        if (o === 'ok' && auto) {
          await admit(ticketNumber, verified);
        } else {
          setBusy(false);
        }
      } catch (err) {
        if (mine !== seq.current) return;
        toast.error(getApiErrorMessage(err, 'Failed to verify ticket'));
        buzz([100, 60, 100]);
        setBusy(false);
      }
    },
    [auto, admit]
  );

  function toggleAuto(value: boolean) {
    setAuto(value);
    try {
      localStorage.setItem(AUTO_KEY, value ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  function handleManual(e: FormEvent) {
    e.preventDefault();
    scan(manual);
    setManual('');
  }

  const t = result?.ticket;
  const attendee = t?.attendee;
  const showing = !!result;
  const style = {
    ok: { bg: 'bg-success/15 border-success', text: 'text-success', Icon: CheckCircle2, title: 'Valid ticket' },
    done: { bg: 'bg-success/15 border-success', text: 'text-success', Icon: CheckCircle2, title: 'Checked in' },
    used: { bg: 'bg-amber-500/15 border-amber-500', text: 'text-amber-600', Icon: TriangleAlert, title: 'Already used' },
    invalid: { bg: 'bg-destructive/10 border-destructive', text: 'text-destructive', Icon: XCircle, title: 'Not valid' },
  }[outcome ?? 'invalid'];

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Checked in this session: <span className="font-semibold text-foreground">{count}</span>
        </p>
        <label className="flex items-center gap-2 text-sm">
          Auto check-in
          <Switch checked={auto} onCheckedChange={toggleAuto} />
        </label>
      </div>

      {/* Camera stays on between scans; decoding pauses while a result is showing. */}
      <QrScanner autoStart onScan={scan} paused={showing || busy} cooldownMs={1500} />

      {busy && !showing && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking…
        </div>
      )}

      {result && (
        <div className={`rounded-lg border-2 p-4 ${style.bg}`} role="status" aria-live="polite">
          <div className="flex items-center gap-3">
            <style.Icon className={`h-10 w-10 shrink-0 ${style.text}`} />
            <div className="min-w-0">
              <p className={`font-serif text-2xl font-bold ${style.text}`}>{style.title}</p>
              <p className="text-sm">
                {outcome === 'done'
                  ? t?.ticketNumber
                  : outcome === 'used'
                    ? 'This ticket was already checked in'
                    : result.message}
              </p>
            </div>
          </div>

          {t && (
            <div className="mt-4 space-y-2 rounded-md bg-background/70 p-3 text-sm">
              <Row label="Name" value={attendee?.name || t.booking.customer.name} />
              <Row label="Ticket" value={t.ticket.name} />
              {attendee?.showSession && (
                <Row
                  label="Show"
                  value={`${attendee.showSession.name} • ${formatDate(attendee.showSession.startsAt, true)}`}
                />
              )}
              {attendee?.validDate && <Row label="Valid on" value={formatDate(attendee.validDate)} />}
              <Row label="Booked by" value={t.booking.customer.name} />
              <Row label="Ticket #" value={<span className="font-mono">{t.ticketNumber}</span>} />
              {t.checkedInAt && outcome === 'used' && (
                <Row label="Checked in at" value={formatDate(t.checkedInAt, true)} />
              )}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            {outcome === 'ok' && t ? (
              <Button size="lg" className="h-12 text-base" loading={busy} onClick={() => admit(t.ticketNumber, result)}>
                Check in
              </Button>
            ) : (
              <span />
            )}
            <Button
              size="lg"
              variant="outline"
              className={`h-12 text-base ${outcome === 'ok' && t ? '' : 'col-span-2'}`}
              onClick={clear}
            >
              Next scan
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleManual} className="flex gap-2">
        <Input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Or type ticket number"
          autoComplete="off"
          className="h-11 font-mono"
        />
        <Button type="submit" variant="outline" className="h-11" disabled={!manual.trim()}>
          Verify
        </Button>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium">{value}</span>
    </div>
  );
}
