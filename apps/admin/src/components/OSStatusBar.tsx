import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOverview } from '../api/admin.api';
import { useLiveSystem } from '../contexts/LiveSystemContext';

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function OSStatusBar() {
  const time       = useClock();
  const { events, systemPulse } = useLiveSystem();
  const [tickIdx, setTickIdx]   = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data } = useQuery({
    queryKey:        ['overview'],
    queryFn:         fetchOverview,
    refetchInterval: 30_000,
    staleTime:       20_000,
  });

  // Advance ticker every 3 seconds
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setTickIdx(i => (i + 1) % Math.max(events.length, 1));
    }, 3_000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [events.length]);

  // Jump to newest event when it arrives
  useEffect(() => { setTickIdx(0); }, [events[0]?.id]);

  const hh = String(time.getHours()).padStart(2, '0');
  const mm = String(time.getMinutes()).padStart(2, '0');
  const ss = String(time.getSeconds()).padStart(2, '0');

  const pulseColor = systemPulse >= 80 ? '#38D68A' : systemPulse >= 55 ? '#FFB800' : '#FF4A5E';
  const critCount  = data?.reportedCount ?? 0;
  const tickEvent  = events[tickIdx % Math.max(events.length, 1)];

  return (
    <div className="flex flex-col border-b"
      style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(6,6,20,0.96)', backdropFilter: 'blur(16px)' }}>

      {/* ── TOP ROW: identity · status · metrics ─────────────────────── */}
      <div className="flex items-center justify-between px-5 py-1.5">

        {/* Left: OS identity */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-dc-primary text-[10px] font-bold tracking-[0.2em] font-mono">DREAMCLOUD</span>
            <span className="text-dc-muted text-[10px] font-mono">OS</span>
            <span className="text-dc-muted/50 text-[9px] font-mono">v4.0</span>
          </div>
          <span className="w-px h-3 bg-dc-border" />
          <span className="font-mono text-[10px] text-dc-muted tabular-nums">{hh}:{mm}:{ss}</span>
          {/* Heartbeat pulse */}
          <span className="w-px h-3 bg-dc-border" />
          <div className="flex items-center gap-1.5">
            <svg viewBox="0 0 32 12" style={{ width: 32, height: 12 }}>
              <polyline
                points="0,6 4,6 6,2 8,10 10,2 12,10 14,4 16,6 32,6"
                fill="none" stroke={pulseColor} strokeWidth="1.2"
                style={{ filter: `drop-shadow(0 0 3px ${pulseColor})` }} />
            </svg>
            <span className="font-mono text-[9px] font-bold" style={{ color: pulseColor }}>
              {systemPulse}
            </span>
          </div>
        </div>

        {/* Center: system state */}
        <div className="flex items-center gap-2">
          {critCount > 0 ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-dc-error block animate-pulse" />
              <span className="text-[9px] text-dc-error font-mono uppercase tracking-wider">
                {critCount} ALERT{critCount > 1 ? 'S' : ''} ACTIVE
              </span>
            </>
          ) : (
            <>
              <div className="relative">
                <span className="w-1.5 h-1.5 rounded-full bg-dc-success block" />
                <span className="absolute inset-0 rounded-full bg-dc-success animate-status-ping" />
              </div>
              <span className="text-[9px] text-dc-muted font-mono uppercase tracking-wider">SYSTEM NOMINAL</span>
            </>
          )}
        </div>

        {/* Right: live metrics */}
        <div className="flex items-center gap-4 text-[9px] font-mono text-dc-muted tabular-nums">
          {data && (
            <>
              <span>
                <span className="text-dc-success">{data.activeUsersToday.toLocaleString()}</span>
                <span className="ml-1 text-dc-muted/50">ACTIVE</span>
              </span>
              <span className="w-px h-3 bg-dc-border" />
              <span>
                <span className="text-dc-primary">{data.dreamsToday.toLocaleString()}</span>
                <span className="ml-1 text-dc-muted/50">DREAMS</span>
              </span>
              {data.reportedCount > 0 && (
                <>
                  <span className="w-px h-3 bg-dc-border" />
                  <span>
                    <span className="text-dc-error">{data.reportedCount}</span>
                    <span className="ml-1 text-dc-muted/50">ALERTS</span>
                  </span>
                </>
              )}
            </>
          )}
          <span className="w-px h-3 bg-dc-border" />
          <span className="text-dc-muted/40">
            {new Date().toLocaleDateString('tr-TR', { day:'2-digit', month:'short', year:'numeric' })}
          </span>
        </div>
      </div>

      {/* ── SIGNAL TICKER ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-0 overflow-hidden"
        style={{
          height: 22,
          borderTop: '1px solid rgba(255,255,255,0.03)',
          background: 'rgba(0,0,0,0.25)',
        }}>

        {/* Left label */}
        <div className="shrink-0 flex items-center gap-1.5 px-3 h-full"
          style={{ borderRight: '1px solid rgba(255,255,255,0.05)', background: 'rgba(123,111,255,0.06)' }}>
          <span className="w-1 h-1 rounded-full animate-glow-breathe" style={{ background: '#7B6FFF' }} />
          <span className="text-[8px] font-mono font-black tracking-[0.18em]" style={{ color: 'rgba(123,111,255,0.6)' }}>
            LIVE
          </span>
        </div>

        {/* Scrolling events */}
        <div className="flex-1 overflow-hidden relative h-full flex items-center">
          <div className="flex gap-0 items-center h-full"
            style={{ paddingLeft: 12 }}>
            {events.slice(0, 8).map((e, i) => (
              <div key={e.id}
                className="flex items-center gap-1.5 shrink-0 h-full px-4"
                style={{
                  borderRight: '1px solid rgba(255,255,255,0.03)',
                  opacity:      i === tickIdx % 8 ? 1 : 0.35,
                  transition:   'opacity 0.6s',
                }}>
                <span className="text-[9px]" style={{ color: e.color }}>{e.icon}</span>
                <span className="text-[8px] font-mono" style={{ color: 'rgba(232,232,255,0.65)' }}>
                  {e.message}
                </span>
                {e.detail && (
                  <span className="text-[8px] font-mono" style={{ color: 'rgba(232,232,255,0.3)' }}>
                    · {e.detail}
                  </span>
                )}
              </div>
            ))}
            {events.length === 0 && (
              <span className="text-[8px] font-mono pl-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Sinyal bekleniyor…
              </span>
            )}
          </div>
        </div>

        {/* Right: ticker event highlight */}
        {tickEvent && (
          <div className="shrink-0 flex items-center gap-2 px-3 h-full"
            style={{ borderLeft: '1px solid rgba(255,255,255,0.04)', background: `${tickEvent.color}06` }}>
            <span className="text-[9px]" style={{ color: tickEvent.color }}>{tickEvent.icon}</span>
            <span className="text-[8px] font-mono font-bold" style={{ color: tickEvent.color, maxWidth: 120, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {tickEvent.message}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
