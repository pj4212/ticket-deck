import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Users, WifiOff, Loader2 } from 'lucide-react';
import ScanResultOverlay from '@/components/scanner/ScanResultOverlay';
import useOfflineSync from '@/hooks/useOfflineSync';
import { Html5Qrcode } from 'html5-qrcode';

const DEBOUNCE_MS = 3000;

export default function QRScanner() {
  const { occurrenceId } = useParams(); // This is actually eventId from the route
  const eventId = occurrenceId;
  const { user } = useOutletContext();
  const [checkedIn, setCheckedIn] = useState(0);
  const [total, setTotal] = useState(0);
  const [result, setResult] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const lastScanRef = useRef({});
  const mountedRef = useRef(true);
  const eventIdRef = useRef(eventId);
  const scannerRef = useRef(null);
  const trackRef = useRef(null);

  const handleSyncResult = useCallback((data) => {
    if (data.status === 'success') setCheckedIn(prev => prev + 1);
  }, []);

  const { online, pendingCount, syncing, queueScan } = useOfflineSync(eventId, handleSyncResult);

  useEffect(() => { eventIdRef.current = eventId; }, [eventId]);

  // Load initial counts
  useEffect(() => {
    mountedRef.current = true;
    loadCounts();
    const interval = setInterval(pollCounts, 3000);
    return () => { mountedRef.current = false; clearInterval(interval); };
  }, [eventId]);

  // Scanner lifecycle
  useEffect(() => {
    let scanner = null;
    let stopped = false;

    async function startScanner() {
      try {
        scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: { exact: 'environment' } },
          {
            fps: 15,
            disableFlip: false,
            videoConstraints: {
              facingMode: { exact: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              focusMode: 'continuous',
            },
            experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          },
          (decodedText) => handleScan(decodedText),
          () => {}
        );

        if (stopped) { scanner.stop().catch(() => {}); return; }
        if (mountedRef.current) setCameraReady(true);

        // Enhance camera
        try {
          const videoElem = document.querySelector('#qr-reader video');
          if (videoElem?.srcObject) {
            const track = videoElem.srcObject.getVideoTracks()[0];
            trackRef.current = track;
            if (track) {
              const caps = track.getCapabilities?.() || {};
              const constraints = {};
              if (caps.focusMode?.includes('continuous')) constraints.focusMode = 'continuous';
              if (caps.width) constraints.width = { ideal: 1920 };
              if (caps.height) constraints.height = { ideal: 1080 };
              await track.applyConstraints(constraints);
            }
          }
        } catch (_) {}

        try { const sr = document.getElementById('qr-shaded-region'); if (sr) sr.style.display = 'none'; } catch (_) {}
      } catch (err) {
        if (mountedRef.current) setCameraError('Camera access denied. Please allow camera permissions and refresh.');
      }
    }

    startScanner();

    return () => {
      stopped = true;
      (async () => {
        try { if (scanner?.getState?.() === 2) await scanner.stop(); } catch (_) {}
        try { if (scanner) scanner.clear(); } catch (_) {}
        try { const el = document.getElementById('qr-reader'); if (el) el.innerHTML = ''; } catch (_) {}
      })();
      scannerRef.current = null;
      trackRef.current = null;
    };
  }, [eventId]);

  // Tap-to-focus
  const handleTapFocus = useCallback(async () => {
    const track = trackRef.current;
    if (!track) return;
    try {
      const caps = track.getCapabilities?.() || {};
      if (caps.focusMode) {
        await track.applyConstraints({ focusMode: 'auto' }).catch(() => {});
        setTimeout(async () => {
          try { if (caps.focusMode?.includes('continuous')) await track.applyConstraints({ focusMode: 'continuous' }); } catch (_) {}
        }, 1500);
      }
    } catch (_) {}
  }, []);

  const loadCounts = async () => {
    try {
      const tickets = await base44.entities.Ticket.filter({ event_id: eventId, ticket_status: 'active' });
      if (!mountedRef.current) return;
      setTotal(tickets.length);
      setCheckedIn(tickets.filter(t => t.check_in_status === 'checked_in').length);
    } catch (_) {}
  };

  const pollCounts = async () => {
    if (!navigator.onLine) return;
    try {
      const res = await base44.functions.invoke('checkin', { action: 'poll', event_id: eventIdRef.current });
      if (!mountedRef.current) return;
      if (res.data.status === 'success') {
        setTotal(res.data.tickets.length);
        setCheckedIn(res.data.tickets.filter(t => t.check_in_status === 'checked_in').length);
      }
    } catch (_) {}
  };

  const handleScan = async (decodedText) => {
    const currentEventId = eventIdRef.current;
    const now = Date.now();
    // Strong debounce per QR content
    if (lastScanRef.current[decodedText] && now - lastScanRef.current[decodedText] < DEBOUNCE_MS) return;
    lastScanRef.current[decodedText] = now;

    // Visual flash
    setScanning(true);
    setTimeout(() => setScanning(false), 400);

    // Parse QR — support JSON legacy and plain hash
    let ticketId = null;
    let hash = null;
    try { const p = JSON.parse(decodedText); ticketId = p.t; hash = p.h; } catch { hash = decodedText.trim(); }

    if (!hash || hash === 'pending' || hash === 'temp') {
      setResult({ type: 'error', title: 'Invalid QR', subtitle: hash === 'pending' ? 'Ticket not yet activated' : 'Not a valid ticket' });
      return;
    }

    // Offline fallback
    if (!navigator.onLine) {
      await queueScan({ ticket_id: ticketId, event_id: currentEventId, qr_hash: hash });
      setResult({ type: 'success', title: 'Queued Offline', subtitle: 'Will sync when online' });
      setCheckedIn(prev => prev + 1);
      return;
    }

    try {
      const payload = { action: 'checkin', event_id: currentEventId, qr_hash: hash };
      if (ticketId) payload.ticket_id = ticketId;
      const res = await base44.functions.invoke('checkin', payload);
      const data = res.data;

      if (data.status === 'success') {
        const t = data.ticket;
        setResult({ type: 'success', title: `${t.attendee_first_name} ${t.attendee_last_name}`, subtitle: 'Checked In ✓' });
        setCheckedIn(prev => prev + 1);
      } else if (data.status === 'warning_checked_in') {
        const t = data.ticket;
        setResult({ type: 'warning', title: `${t?.attendee_first_name || ''} ${t?.attendee_last_name || ''}`, subtitle: data.reason });
      } else if (data.status === 'warning') {
        const name = data.ticket ? `${data.ticket.attendee_first_name} ${data.ticket.attendee_last_name}` : 'Warning';
        setResult({ type: 'warning', title: name, subtitle: data.reason });
      } else {
        setResult({ type: 'error', title: data.ticket ? `${data.ticket.attendee_first_name} ${data.ticket.attendee_last_name}` : 'Error', subtitle: data.reason || 'Check-in failed' });
      }
    } catch (err) {
      // Network failure — queue offline
      await queueScan({ ticket_id: ticketId, event_id: currentEventId, qr_hash: hash });
      setResult({ type: 'success', title: 'Queued Offline', subtitle: 'Will sync when online' });
      setCheckedIn(prev => prev + 1);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Counter bar */}
      <div className="flex items-center justify-center px-4 py-3 bg-card border-b border-border shrink-0 gap-3">
        <div className="flex items-center gap-2 text-xl font-bold">
          <Users className="h-5 w-5 text-primary" />
          <span>{checkedIn} / {total}</span>
        </div>
        {!online && (
          <div className="flex items-center gap-1 text-yellow-400 text-xs font-medium">
            <WifiOff className="h-3.5 w-3.5" />Offline{pendingCount > 0 ? ` (${pendingCount})` : ''}
          </div>
        )}
        {online && syncing && (
          <div className="flex items-center gap-1 text-primary text-xs font-medium">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />Syncing
          </div>
        )}
      </div>

      {/* Camera viewport */}
      <div className="flex-1 relative bg-black overflow-hidden" onTouchStart={handleTapFocus} onClick={handleTapFocus}>
        <div id="qr-reader" className="qr-scanner-container" />

        {cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="relative" style={{ width: '70vw', height: '70vw', maxWidth: '300px', maxHeight: '300px' }}>
              <div className={`absolute inset-0 border-2 rounded-lg transition-colors duration-150 ${scanning ? 'border-green-400/60' : 'border-white/25'}`} />
              {[['top-0 left-0 border-t-4 border-l-4 rounded-tl-lg', '-top-0.5 -left-0.5'],
                ['top-0 right-0 border-t-4 border-r-4 rounded-tr-lg', '-top-0.5 -right-0.5'],
                ['bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg', '-bottom-0.5 -left-0.5'],
                ['bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg', '-bottom-0.5 -right-0.5']
              ].map(([cls, pos], i) => (
                <div key={i} className={`absolute ${pos} w-12 h-12 ${cls} transition-all duration-150 ${scanning ? 'border-green-400 scale-110' : 'border-primary'}`}
                  style={scanning ? { filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.8))' } : {}} />
              ))}
              <div className={`absolute left-3 right-3 top-1/2 h-0.5 transition-colors ${scanning ? 'bg-green-400' : 'bg-primary/50 animate-pulse'}`} />
              {scanning && <div className="absolute inset-0 rounded-lg bg-green-400/15 animate-scan-flash" />}
            </div>
          </div>
        )}

        {!cameraReady && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-30">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Starting camera...</p>
            </div>
          </div>
        )}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background p-6 text-center z-30">
            <p className="text-destructive">{cameraError}</p>
          </div>
        )}
      </div>

      {result && <ScanResultOverlay result={result} onDismiss={() => setResult(null)} />}
    </div>
  );
}