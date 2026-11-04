import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const REGION_ID = 'qr-scanner-region';

interface QrScannerProps {
  /** Called with the decoded text. Repeat reads of the same code within `cooldownMs` are ignored. */
  onScan: (text: string) => void;
  /** Pause decoding (e.g. while a result is on screen) without tearing down the camera. */
  paused?: boolean;
  cooldownMs?: number;
  /** Start the camera as soon as the component mounts. */
  autoStart?: boolean;
}

/** Camera-based QR reader. Needs HTTPS (or localhost) for browser camera access. */
export function QrScanner({ onScan, paused = false, cooldownMs = 2500, autoStart = false }: QrScannerProps) {
  const [active, setActive] = useState(autoStart);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastRef = useRef<{ text: string; at: number } | null>(null);

  // Keep the latest callback/flags without restarting the camera on every render.
  const onScanRef = useRef(onScan);
  const pausedRef = useRef(paused);
  onScanRef.current = onScan;
  pausedRef.current = paused;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const scanner = new Html5Qrcode(REGION_ID, { verbose: false });
    scannerRef.current = scanner;

    const startPromise = scanner.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: (w, h) => ({ width: Math.min(w, h, 280), height: Math.min(w, h, 280) }) },
        (text) => {
          if (pausedRef.current) return;
          const now = Date.now();
          const last = lastRef.current;
          if (last && last.text === text && now - last.at < cooldownMs) return;
          lastRef.current = { text, at: now };
          onScanRef.current(text);
        },
        () => {
          /* per-frame "no QR found" noise */
        }
    );

    startPromise.catch((err: unknown) => {
      if (cancelled) return;
      const msg = String(err);
      setError(
        /NotAllowed|Permission/i.test(msg)
          ? 'Camera permission was denied. Allow camera access in the browser and try again.'
          : /NotFound|Requested device/i.test(msg)
            ? 'No camera found on this device.'
            : 'Could not start the camera. It needs HTTPS (or localhost) and no other app using it.'
      );
      setActive(false);
    });

    return () => {
      cancelled = true;
      scannerRef.current = null;
      // stop() throws synchronously if the camera never started (denied / no
      // device), which would crash the whole page. Wait for the start attempt
      // and only stop a camera that actually came up.
      void (async () => {
        try {
          await startPromise;
        } catch {
          return;
        }
        try {
          await scanner.stop();
          scanner.clear();
        } catch {
          /* already stopped */
        }
      })();
    };
  }, [active, cooldownMs]);

  return (
    <div className="space-y-3">
      <div
        id={REGION_ID}
        className={active ? 'overflow-hidden rounded-md bg-black' : 'hidden'}
        aria-label="Camera preview"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="button"
        size="lg"
        variant={active ? 'outline' : 'default'}
        className="h-11 w-full"
        onClick={() => {
          setError(null);
          setActive((v) => !v);
        }}
      >
        {active ? (
          <>
            <CameraOff className="h-4 w-4" /> Stop camera
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" /> Scan QR with camera
          </>
        )}
      </Button>
    </div>
  );
}
