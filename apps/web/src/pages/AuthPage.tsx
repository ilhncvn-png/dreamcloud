import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { forgotPassword } from '@/api/auth.api';
import { apiClient } from '@/lib/api';

type Panel = 'login' | 'forgot';
type InitialPanel = Panel | 'register';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DREAM_WORDS = [
  'forest',
  'ocean',
  'mother',
  'light',
  'mirror',
  'childhood',
  'door',
  'train',
  'rain',
  'mountain',
  'flight',
  'river',
  'home',
  'silence',
  'fear',
  'peace',
  'awakening',
  'hope',
  'shadow',
  'bridge',
  'fire',
  'water',
  'moon',
  'star',
  'labyrinth',
  'falling',
  'void',
  'garden',
  'stranger',
  'return',
];

const DREAM_SIGNALS = [
  {
    icon: '🌙',
    label: 'Dream Signal',
    text: 'Thousands of dreams are analyzed every night, revealing hidden patterns in the human subconscious.',
  },
  {
    icon: '🧠',
    label: 'Collective Symbol',
    text: 'The most recurring dream symbols form an invisible language shared across all of humanity.',
  },
  {
    icon: '🌍',
    label: 'Dream Atlas',
    text: "Every dream adds a point to a living, breathing map of humanity's collective unconscious.",
  },
  {
    icon: '✨',
    label: 'AI Analysis',
    text: 'Each dream is woven into a larger tapestry — a story the world is telling itself in its sleep.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Full-screen atmospheric canvas
// ─────────────────────────────────────────────────────────────────────────────
function AtmosphericCanvas({ mousePos }: { mousePos: { x: number; y: number } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosRef = useRef(mousePos);

  useEffect(() => {
    mousePosRef.current = mousePos;
  }, [mousePos]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    // Nodes
    const NODE_COUNT = 70;
    type Node = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      phase: number;
      layer: number;
    };
    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: 0.8 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      layer: Math.floor(Math.random() * 3),
    }));

    // Fog orbs (slow-moving)
    type Orb = { x: number; y: number; r: number; hue: number; phase: number; speed: number };
    const orbs: Orb[] = [
      { x: W() * 0.15, y: H() * 0.2, r: 420, hue: 250, phase: 0, speed: 0.0003 },
      { x: W() * 0.8, y: H() * 0.75, r: 360, hue: 280, phase: 2.1, speed: 0.0005 },
      { x: W() * 0.5, y: H() * 0.5, r: 280, hue: 210, phase: 4.2, speed: 0.0004 },
    ];

    let frame = 0;
    let raf: number;
    const MAX_DIST = 130;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W(), H());
      frame++;

      const t = frame * 0.01;
      const mx = mousePosRef.current.x;
      const my = mousePosRef.current.y;

      // Fog orbs
      for (const orb of orbs) {
        orb.phase += orb.speed;
        const ox = orb.x + Math.sin(orb.phase) * 60;
        const oy = orb.y + Math.cos(orb.phase * 0.7) * 40;
        const grd = ctx.createRadialGradient(ox, oy, 0, ox, oy, orb.r);
        grd.addColorStop(0, `hsla(${orb.hue},60%,40%,0.07)`);
        grd.addColorStop(0.5, `hsla(${orb.hue},50%,30%,0.04)`);
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(ox, oy, orb.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mouse glow
      if (mx > 0 && my > 0) {
        const mgrd = ctx.createRadialGradient(mx, my, 0, mx, my, 200);
        mgrd.addColorStop(0, 'rgba(123,111,255,0.06)');
        mgrd.addColorStop(1, 'transparent');
        ctx.fillStyle = mgrd;
        ctx.beginPath();
        ctx.arc(mx, my, 200, 0, Math.PI * 2);
        ctx.fill();
      }

      // Move nodes
      for (const n of nodes) {
        const speed = n.layer === 0 ? 1 : n.layer === 1 ? 0.65 : 0.4;
        n.x += n.vx * speed;
        n.y += n.vy * speed;
        if (n.x < 0) {
          n.x = 0;
          n.vx *= -1;
        }
        if (n.x > W()) {
          n.x = W();
          n.vx *= -1;
        }
        if (n.y < 0) {
          n.y = 0;
          n.vy *= -1;
        }
        if (n.y > H()) {
          n.y = H();
          n.vy *= -1;
        }
      }

      // Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[i].layer !== nodes[j].layer) continue;
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.14;
            const hue = nodes[i].layer === 0 ? 250 : nodes[i].layer === 1 ? 280 : 220;
            ctx.strokeStyle = `hsla(${hue},70%,70%,${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Mouse-reactive node connections
      for (const n of nodes) {
        const dx = n.x - mx;
        const dy = n.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160) {
          const alpha = (1 - dist / 160) * 0.22;
          ctx.strokeStyle = `rgba(167,150,255,${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(mx, my);
          ctx.stroke();
        }
      }

      // Nodes
      for (const n of nodes) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.5 + n.phase);
        const opacity = n.layer === 0 ? 0.5 : n.layer === 1 ? 0.3 : 0.18;
        const glow = n.layer === 0 ? 4 : 3;
        const hue = n.layer === 0 ? 250 : n.layer === 1 ? 275 : 220;

        // Glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * glow * pulse);
        grd.addColorStop(0, `hsla(${hue},70%,70%,${opacity * 0.3 * pulse})`);
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * glow * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (0.7 + 0.3 * pulse), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue},80%,80%,${opacity + 0.2 * pulse})`;
        ctx.fill();
      }
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated word cloud
// ─────────────────────────────────────────────────────────────────────────────
function WordCloud() {
  const words = DREAM_WORDS.map((word, i) => {
    const seed = i * 137.508;
    const x = ((seed * 3.7) % 85) + 5;
    const y = ((seed * 5.3) % 80) + 5;
    const duration = 18 + (i % 7) * 4;
    const delay = -(i * 2.3);
    const size = 11 + (i % 4) * 2;
    return { word, x, y, duration, delay, size };
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      {words.map(({ word, x, y, duration, delay, size }) => (
        <div
          key={word}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            fontSize: size,
            color: 'rgba(167,150,255,0.065)',
            fontWeight: 300,
            letterSpacing: '0.08em',
            userSelect: 'none',
            animation: `wordFloat ${duration}s ${delay}s ease-in-out infinite`,
            whiteSpace: 'nowrap',
          }}
        >
          {word}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dream Signals rotating section
// ─────────────────────────────────────────────────────────────────────────────
function DreamSignals() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const tick = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % DREAM_SIGNALS.length);
        setVisible(true);
      }, 500);
    }, 4500);
    return () => clearInterval(tick);
  }, []);

  const signal = DREAM_SIGNALS[current];

  return (
    <div style={{ marginTop: 40 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            height: 1,
            flex: 1,
            background: 'linear-gradient(90deg, rgba(123,111,255,0.2), transparent)',
          }}
        />
        <span
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(123,111,255,0.45)',
          }}
        >
          Live Signal
        </span>
        <div
          style={{
            height: 1,
            flex: 1,
            background: 'linear-gradient(90deg, transparent, rgba(123,111,255,0.2))',
          }}
        />
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
        {DREAM_SIGNALS.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === current ? 18 : 5,
              height: 5,
              borderRadius: 3,
              background: i === current ? 'rgba(123,111,255,0.7)' : 'rgba(123,111,255,0.2)',
              transition: 'all 0.4s ease',
            }}
          />
        ))}
      </div>

      <div
        style={{
          background: 'rgba(123,111,255,0.05)',
          border: '1px solid rgba(123,111,255,0.12)',
          borderRadius: 16,
          padding: '20px 22px',
          backdropFilter: 'blur(12px)',
          transition: 'opacity 0.5s ease',
          opacity: visible ? 1 : 0,
          minHeight: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div
            style={{
              fontSize: 22,
              lineHeight: 1,
              filter: 'drop-shadow(0 0 8px rgba(123,111,255,0.4))',
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            {signal.icon}
          </div>
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(123,111,255,0.65)',
                marginBottom: 8,
                fontWeight: 500,
              }}
            >
              {signal.label}
            </div>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.65,
                color: 'rgba(232,232,255,0.5)',
                fontWeight: 300,
              }}
            >
              {signal.text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Early Access Modal
// ─────────────────────────────────────────────────────────────────────────────
function EarlyAccessModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/waitlist', { email });
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string }; message?: string } } })
          ?.response?.data?.error?.message ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'rgba(6,6,20,0.8)',
        backdropFilter: 'blur(16px)',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'rgba(14,12,36,0.92)',
          border: '1px solid rgba(123,111,255,0.2)',
          borderRadius: 24,
          padding: '40px 36px',
          boxShadow:
            '0 0 0 1px rgba(123,111,255,0.06) inset, 0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(123,111,255,0.08)',
          backdropFilter: 'blur(40px)',
          animation: 'fadeUp 0.25s ease',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(232,232,255,0.3)',
            fontSize: 18,
            lineHeight: 1,
            padding: 4,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(232,232,255,0.7)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(232,232,255,0.3)')}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ marginBottom: 28, position: 'relative' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(123,111,255,0.1)',
              border: '1px solid rgba(123,111,255,0.2)',
              borderRadius: 100,
              padding: '4px 12px',
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(123,111,255,0.8)',
              marginBottom: 18,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'rgba(123,111,255,0.8)',
                display: 'inline-block',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            Closed Beta
          </div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: '-0.025em',
              color: 'rgba(232,232,255,0.95)',
              marginBottom: 12,
              lineHeight: 1.2,
            }}
          >
            DreamCloud Early Access
          </h2>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: 'rgba(232,232,255,0.4)',
              fontWeight: 300,
            }}
          >
            DreamCloud is currently in a closed beta and research phase. We are carefully validating
            the platform before opening it to the public.
          </p>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: 'rgba(232,232,255,0.3)',
              fontWeight: 300,
              marginTop: 10,
            }}
          >
            Public registration is temporarily unavailable.
          </p>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(123,111,255,0.2), transparent)',
            marginBottom: 28,
          }}
        />

        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(56,214,138,0.1)',
                border: '1px solid rgba(56,214,138,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                margin: '0 auto 20px',
              }}
            >
              ✓
            </div>
            <p
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: 'rgba(56,214,138,0.9)',
                marginBottom: 8,
              }}
            >
              You're on the list
            </p>
            <p style={{ fontSize: 13, color: 'rgba(232,232,255,0.35)', lineHeight: 1.6 }}>
              We'll reach out when DreamCloud opens to the public.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(123,111,255,0.7)',
                  marginBottom: 8,
                }}
              >
                E-Posta Adresiniz
              </label>
              <input
                className="dc-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dreamer@example.com"
                required
                autoComplete="email"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255,74,94,0.08)',
                  border: '1px solid rgba(255,74,94,0.2)',
                  borderRadius: 8,
                  fontSize: 13,
                  color: 'rgba(255,100,120,0.9)',
                }}
              >
                {error}
              </div>
            )}

            <button
              className="dc-btn dc-btn-primary"
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                padding: '15px',
                fontSize: 14,
                fontWeight: 500,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {loading ? (
                <span className="dc-spinner" style={{ width: 18, height: 18 }} />
              ) : (
                'Join Early Access List'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Left panel
// ─────────────────────────────────────────────────────────────────────────────
function LeftPanel({
  onRequestAccess,
  parallax,
}: {
  onRequestAccess: () => void;
  parallax: { x: number; y: number };
}) {
  return (
    <div
      style={{
        flex: '0 0 52%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 56px 48px 64px',
        position: 'relative',
        zIndex: 2,
      }}
    >
      {/* Content pushed down 12% */}
      <div
        style={{
          paddingTop: '12%',
          transform: `translate(${parallax.x * 8}px, ${parallax.y * 6}px)`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 52 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 15,
              background: 'linear-gradient(135deg, #7B6FFF, #CC80FF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 21,
              boxShadow: '0 0 28px rgba(123,111,255,0.4), 0 0 60px rgba(123,111,255,0.15)',
              animation: 'logoBreathe 4s ease-in-out infinite',
            }}
          >
            ◐
          </div>
          <span
            style={{
              fontSize: 21,
              fontWeight: 600,
              letterSpacing: '-0.025em',
              color: 'rgba(232,232,255,0.92)',
            }}
          >
            DreamCloud
          </span>
        </div>

        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(123,111,255,0.08)',
            border: '1px solid rgba(123,111,255,0.18)',
            borderRadius: 100,
            padding: '5px 14px',
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(123,111,255,0.8)',
            marginBottom: 28,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'rgba(56,214,138,0.9)',
              display: 'inline-block',
              animation: 'pulse 2.5s ease-in-out infinite',
            }}
          />
          Dream Intelligence Platform
        </div>

        {/* Hero headline */}
        <h1
          style={{
            fontSize: 'clamp(28px, 2.8vw, 42px)',
            fontWeight: 300,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            color: 'rgba(232,232,255,0.9)',
            marginBottom: 24,
          }}
        >
          Every night,
          <br />
          millions of people dream.
          <br />
          <strong
            style={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #a89eff 0%, #cc80ff 60%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            DreamCloud
          </strong>{' '}
          reveals the hidden
          <br />
          map connecting them.
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: 14,
            fontWeight: 300,
            lineHeight: 1.8,
            color: 'rgba(232,232,255,0.35)',
            maxWidth: 400,
            marginBottom: 0,
          }}
        >
          An AI-powered research platform exploring humanity's collective subconscious — anonymously
          analyzing dreams, emotions, symbols and places shared across the world.
        </p>

        {/* Dream Signals */}
        <DreamSignals />

        {/* Request early access */}
        <div style={{ marginTop: 32 }}>
          <button
            onClick={onRequestAccess}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: 'rgba(123,111,255,0.55)',
              letterSpacing: '0.05em',
              padding: 0,
              transition: 'color 0.2s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(167,150,255,0.85)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(123,111,255,0.55)')}
          >
            <span style={{ fontSize: 14 }}>✦</span>
            Request early access
          </button>
        </div>
      </div>

      {/* Bottom footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 28,
          left: 64,
          right: 56,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 11, color: 'rgba(232,232,255,0.15)' }}>© 2025 DreamCloud</span>
        <a
          href="https://app.dreamclaude.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, color: 'rgba(123,111,255,0.4)', transition: 'color 0.2s' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(167,150,255,0.7)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(123,111,255,0.4)')}
        >
          Mobile App →
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Login form
// ─────────────────────────────────────────────────────────────────────────────
function LoginForm({
  onSwitchForgot,
  onRequestAccess,
}: {
  onSwitchForgot: () => void;
  onRequestAccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/home';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response
        ?.data?.error?.message;
      setError(msg ?? 'Giriş başarısız. Bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(123,111,255,0.7)',
            marginBottom: 8,
          }}
        >
          E-Posta
        </label>
        <input
          className={`dc-input${error ? ' error' : ''}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="dreamer@example.com"
          required
          autoComplete="email"
        />
      </div>
      <div>
        <label
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(123,111,255,0.7)',
            marginBottom: 8,
          }}
        >
          Şifre
          <button
            type="button"
            onClick={onSwitchForgot}
            style={{
              fontFamily: 'inherit',
              fontSize: 11,
              color: 'rgba(123,111,255,0.55)',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              letterSpacing: '0.05em',
              textTransform: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(167,150,255,0.85)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(123,111,255,0.55)')}
          >
            Şifremi unuttum
          </button>
        </label>
        <input
          className={`dc-input${error ? ' error' : ''}`}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(255,74,94,0.08)',
            border: '1px solid rgba(255,74,94,0.2)',
            borderRadius: 8,
            fontSize: 13,
            color: 'rgba(255,100,120,0.9)',
          }}
        >
          {error}
        </div>
      )}

      {/* Login button with neural glow */}
      <div style={{ position: 'relative', marginTop: 4 }}>
        <div
          style={{
            position: 'absolute',
            inset: -1,
            borderRadius: 'var(--r-md)',
            background: 'linear-gradient(135deg, rgba(123,111,255,0.4), rgba(204,128,255,0.4))',
            filter: 'blur(8px)',
            opacity: loading ? 0.9 : 0.5,
            transition: 'opacity 0.3s',
            zIndex: 0,
          }}
        />
        <button
          className="dc-btn dc-btn-primary"
          type="submit"
          disabled={loading}
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            padding: '15px',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {loading ? (
            <span className="dc-spinner" style={{ width: 18, height: 18 }} />
          ) : (
            'Giriş Yap'
          )}
        </button>
      </div>

      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)', paddingTop: 4 }}>
        Hesabın yok mu?{' '}
        <button
          type="button"
          onClick={onRequestAccess}
          style={{
            color: 'rgba(167,150,255,0.75)',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 500,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(204,128,255,0.9)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(167,150,255,0.75)')}
        >
          Erken Erişim İste
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Forgot-password form (unchanged logic, polished look)
// ─────────────────────────────────────────────────────────────────────────────
function ForgotPasswordForm({ onSwitchLogin }: { onSwitchLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'rgba(123,111,255,0.1)',
            border: '1px solid rgba(123,111,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            margin: '0 auto 20px',
          }}
        >
          ✉️
        </div>
        <p style={{ fontSize: 15, color: 'var(--text-1)', marginBottom: 8 }}>E-posta gönderildi</p>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
          {email} adresine sıfırlama bağlantısı gönderdik.
        </p>
        <button
          type="button"
          onClick={onSwitchLogin}
          className="dc-btn dc-btn-ghost"
          style={{ marginTop: 24, width: '100%', padding: '12px', fontSize: 13 }}
        >
          ← Giriş sayfasına dön
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65 }}>
        Kayıtlı e-posta adresinizi girin, şifre sıfırlama bağlantısı göndereceğiz.
      </p>
      <div>
        <label
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(123,111,255,0.7)',
            marginBottom: 8,
          }}
        >
          E-Posta
        </label>
        <input
          className="dc-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="dreamer@example.com"
          required
          autoComplete="email"
        />
      </div>
      {error && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(255,74,94,0.08)',
            border: '1px solid rgba(255,74,94,0.2)',
            borderRadius: 8,
            fontSize: 13,
            color: 'rgba(255,100,120,0.9)',
          }}
        >
          {error}
        </div>
      )}
      <div style={{ position: 'relative', marginTop: 4 }}>
        <div
          style={{
            position: 'absolute',
            inset: -1,
            borderRadius: 'var(--r-md)',
            background: 'linear-gradient(135deg, rgba(123,111,255,0.4), rgba(204,128,255,0.4))',
            filter: 'blur(8px)',
            opacity: 0.5,
            zIndex: 0,
          }}
        />
        <button
          className="dc-btn dc-btn-primary"
          type="submit"
          disabled={loading}
          style={{ position: 'relative', zIndex: 1, width: '100%', padding: '15px', fontSize: 14 }}
        >
          {loading ? (
            <span className="dc-spinner" style={{ width: 18, height: 18 }} />
          ) : (
            'Sıfırlama Bağlantısı Gönder'
          )}
        </button>
      </div>
      <button
        type="button"
        onClick={onSwitchLogin}
        style={{
          fontSize: 13,
          color: 'var(--text-3)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
          fontFamily: 'inherit',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-2)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
      >
        ← Giriş sayfasına dön
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Right panel — auth card
// ─────────────────────────────────────────────────────────────────────────────
function RightPanel({
  panel,
  setPanel,
  onRequestAccess,
  parallax,
}: {
  panel: Panel;
  setPanel: (p: Panel) => void;
  onRequestAccess: () => void;
  parallax: { x: number; y: number };
}) {
  const panelMeta: Record<Panel, { title: string; subtitle: string }> = {
    login: { title: 'Hoş Geldin, Dreamer', subtitle: 'Bilinçaltının kapısını aç.' },
    forgot: { title: 'Şifreni Sıfırla', subtitle: 'Erişimini yeniden kazan.' },
  };
  const { title, subtitle } = panelMeta[panel];

  return (
    <div
      className="auth-right-panel"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 24px',
        overflowY: 'auto',
        position: 'relative',
        zIndex: 2,
      }}
    >
      {/* Mobile logo */}
      <div
        className="auth-mobile-logo"
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 13,
            background: 'linear-gradient(135deg,#7B6FFF,#CC80FF)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            boxShadow: '0 0 24px rgba(123,111,255,0.35)',
            animation: 'logoBreathe 4s ease-in-out infinite',
          }}
        >
          ◐
        </div>
        <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>DreamCloud</span>
      </div>

      <div
        className="anim-fade-up"
        style={{
          width: '100%',
          maxWidth: 390,
          transform: `translate(${parallax.x * -5}px, ${parallax.y * -4}px)`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        {/* Glass card — enhanced */}
        <div
          style={{
            background: 'rgba(10,8,28,0.75)',
            border: '1px solid rgba(123,111,255,0.18)',
            borderRadius: 24,
            padding: '36px 32px',
            backdropFilter: 'blur(40px) saturate(150%)',
            boxShadow: [
              '0 0 0 1px rgba(123,111,255,0.06) inset',
              '0 32px 64px rgba(0,0,0,0.5)',
              '0 0 80px rgba(123,111,255,0.07)',
              '0 0 160px rgba(204,128,255,0.04)',
            ].join(', '),
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(123,111,255,0.6)',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--success)',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
              Neural Authentication
            </div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: '-0.025em',
                color: 'var(--text-1)',
                marginBottom: 6,
              }}
            >
              {title}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{subtitle}</p>
          </div>

          {/* Form */}
          {panel === 'login' && (
            <LoginForm
              onSwitchForgot={() => setPanel('forgot')}
              onRequestAccess={onRequestAccess}
            />
          )}
          {panel === 'forgot' && <ForgotPasswordForm onSwitchLogin={() => setPanel('login')} />}
        </div>

        {/* Bottom note */}
        <p
          style={{
            marginTop: 24,
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--text-3)',
            lineHeight: 1.6,
          }}
        >
          Giriş yaparak{' '}
          <Link to="/terms" style={{ color: 'rgba(123,111,255,0.45)' }}>
            Kullanım Şartları
          </Link>{' '}
          ve{' '}
          <Link to="/privacy" style={{ color: 'rgba(123,111,255,0.45)' }}>
            Gizlilik Politikası
          </Link>
          'nı kabul etmiş olursunuz.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main AuthPage
// ─────────────────────────────────────────────────────────────────────────────
export default function AuthPage({ initialPanel = 'login' }: { initialPanel?: InitialPanel }) {
  const [panel, setPanel] = useState<Panel>(
    initialPanel === 'register' ? 'login' : (initialPanel as Panel),
  );
  const [showEarlyAccess, setShowEarlyAccess] = useState(initialPanel === 'register');
  const [mousePos, setMousePos] = useState({ x: -1, y: -1 });
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const { isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/home';

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, isLoading, navigate, from]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    setParallax({
      x: (e.clientX - cx) / cx,
      y: (e.clientY - cy) / cy,
    });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  if (isLoading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
        }}
      >
        <div className="dc-spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <>
      {/* Global keyframes for new animations */}
      <style>{`
        @keyframes wordFloat {
          0%   { transform: translateY(0px) rotate(-1deg); opacity: 0.055; }
          30%  { opacity: 0.09; }
          50%  { transform: translateY(-18px) rotate(0.5deg); opacity: 0.065; }
          70%  { opacity: 0.085; }
          100% { transform: translateY(0px) rotate(-1deg); opacity: 0.055; }
        }
        @keyframes logoBreathe {
          0%,100% { box-shadow: 0 0 28px rgba(123,111,255,0.38), 0 0 56px rgba(123,111,255,0.12); }
          50%     { box-shadow: 0 0 40px rgba(123,111,255,0.55), 0 0 80px rgba(204,128,255,0.18); }
        }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @media (min-width: 900px) {
          .auth-left-panel  { display: flex !important; flex-direction: column; }
          .auth-right-panel { flex: 0 0 48% !important; }
          .auth-mobile-logo { display: none !important; }
        }
        .dc-input:focus {
          border-color: rgba(123,111,255,0.6) !important;
          box-shadow: 0 0 0 3px rgba(123,111,255,0.12), 0 0 16px rgba(123,111,255,0.1) !important;
        }
      `}</style>

      {/* Full-screen atmospheric canvas */}
      <AtmosphericCanvas mousePos={mousePos} />

      {/* Dream word cloud */}
      <WordCloud />

      {/* Page layout */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100vh',
          display: 'flex',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(6,4,15,0.6) 0%, rgba(6,6,20,0.4) 100%)',
        }}
      >
        {/* Left panel — hidden on mobile */}
        <div style={{ flex: '0 0 52%', display: 'none' }} className="auth-left-panel">
          <LeftPanel onRequestAccess={() => setShowEarlyAccess(true)} parallax={parallax} />
        </div>

        {/* Right panel */}
        <RightPanel
          panel={panel}
          setPanel={setPanel}
          onRequestAccess={() => setShowEarlyAccess(true)}
          parallax={parallax}
        />
      </div>

      {/* Early Access Modal */}
      {showEarlyAccess && <EarlyAccessModal onClose={() => setShowEarlyAccess(false)} />}
    </>
  );
}
