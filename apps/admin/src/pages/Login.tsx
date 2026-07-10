import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminLogin } from '../api/admin.api';
import { setStoredAuth, clearStoredAuth } from '../store/auth.store';
import axios from 'axios';

/* ══════════════════════════════════════════════════════════════════════
   DREAMCLOUD OS — NEURAL AUTHENTICATION INTERFACE
   ══════════════════════════════════════════════════════════════════════ */

const STYLES = `
/* ── Keyframes ─────────────────────────────────────────────────────── */
@keyframes dc-float    { 0%,100%{transform:translateY(0px);}  50%{transform:translateY(-8px);}  }
@keyframes dc-breathe  { 0%,100%{opacity:0.7;transform:scale(1);}  50%{opacity:1;transform:scale(1.04);} }
@keyframes dc-glow-pulse { 0%,100%{box-shadow:0 0 20px rgba(123,111,255,0.15),0 0 60px rgba(123,111,255,0.06);}  50%{box-shadow:0 0 35px rgba(123,111,255,0.30),0 0 80px rgba(123,111,255,0.12);} }
@keyframes dc-rotate   { from{transform:rotate(0deg);}  to{transform:rotate(360deg);}  }
@keyframes dc-rotate-r { from{transform:rotate(0deg);}  to{transform:rotate(-360deg);} }
@keyframes dc-orbit    { from{transform:rotate(0deg) translateX(var(--r)) rotate(0deg);}  to{transform:rotate(360deg) translateX(var(--r)) rotate(-360deg);} }
@keyframes dc-ping     { 0%{transform:scale(1);opacity:0.8;}  100%{transform:scale(2.2);opacity:0;} }
@keyframes dc-drift    { 0%,100%{transform:translate(0,0);}  33%{transform:translate(3px,-5px);}  66%{transform:translate(-4px,2px);} }
@keyframes dc-pulse-ring { 0%{r:20;opacity:0.6;} 100%{r:90;opacity:0;} }
@keyframes dc-scan     { 0%{transform:translateY(-100%);}  100%{transform:translateY(400%);} }
@keyframes dc-fade-up  { from{opacity:0;transform:translateY(10px);}  to{opacity:1;transform:translateY(0);} }
@keyframes dc-fade-in  { from{opacity:0;}  to{opacity:1;} }
@keyframes dc-blink    { 0%,100%{opacity:1;}  50%{opacity:0.3;} }
@keyframes dc-slide-in { from{opacity:0;transform:translateX(-8px);}  to{opacity:1;transform:translateX(0);} }
@keyframes dc-morph-btn{ 0%{border-radius:12px;} 50%{border-radius:28px;} 100%{border-radius:12px;} }
@keyframes dc-grid-fade{ 0%,100%{opacity:0.018;} 50%{opacity:0.034;} }
@keyframes dc-star-twinkle { 0%,100%{opacity:0.15;} 50%{opacity:0.65;} }
@keyframes dc-wave-out { 0%{transform:scale(0);opacity:0.5;} 100%{transform:scale(1);opacity:0;} }
@keyframes dc-ticker   { from{transform:translateX(0);} to{transform:translateX(-50%);} }
@keyframes dc-sphere-glow { 0%,100%{filter:drop-shadow(0 0 12px rgba(123,111,255,0.25));} 50%{filter:drop-shadow(0 0 28px rgba(123,111,255,0.5));} }
@keyframes dc-node-breathe { 0%,100%{r:2.5;opacity:0.55;} 50%{r:3.8;opacity:0.9;} }
@keyframes dc-auth-bar { from{width:0%;} to{width:100%;} }

/* ── Utility ────────────────────────────────────────────────────────── */
.dc-float    { animation: dc-float    6s ease-in-out infinite; }
.dc-breathe  { animation: dc-breathe  4s ease-in-out infinite; }
.dc-glow-pulse { animation: dc-glow-pulse 3s ease-in-out infinite; }
.dc-fade-up  { animation: dc-fade-up  0.5s ease-out both; }
.dc-fade-in  { animation: dc-fade-in  0.4s ease-out both; }
.dc-slide-in { animation: dc-slide-in 0.35s ease-out both; }
.dc-sphere-glow { animation: dc-sphere-glow 4s ease-in-out infinite; }

/* ── Input focus glow ───────────────────────────────────────────────── */
.dc-input {
  background: rgba(6,6,20,0.7);
  border: 1px solid rgba(123,111,255,0.18);
  border-radius: 12px;
  padding: 13px 16px;
  color: rgba(232,232,255,0.92);
  font-size: 14px;
  width: 100%;
  outline: none;
  transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
  font-family: inherit;
}
.dc-input::placeholder { color: rgba(232,232,255,0.2); }
.dc-input:focus {
  border-color: rgba(123,111,255,0.7);
  box-shadow: 0 0 0 3px rgba(123,111,255,0.1), 0 0 20px rgba(123,111,255,0.08);
  background: rgba(8,6,28,0.85);
}

/* ── Button ─────────────────────────────────────────────────────────── */
.dc-btn {
  position: relative; overflow: hidden;
  width: 100%; padding: 14px 20px;
  background: linear-gradient(135deg, #7B6FFF 0%, #9B6FFF 50%, #CC80FF 100%);
  border: none; border-radius: 12px;
  color: #fff; font-weight: 700; font-size: 13px;
  letter-spacing: 0.12em; text-transform: uppercase;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
  box-shadow: 0 4px 20px rgba(123,111,255,0.3), 0 0 40px rgba(123,111,255,0.1);
}
.dc-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 30px rgba(123,111,255,0.45), 0 0 60px rgba(123,111,255,0.15);
}
.dc-btn:active:not(:disabled) { transform: translateY(0px); }
.dc-btn:disabled { opacity: 0.8; cursor: not-allowed; }
.dc-btn::before {
  content: '';
  position: absolute; top: 0; left: -75%; width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
  transform: skewX(-20deg);
  transition: left 0.6s;
}
.dc-btn:hover:not(:disabled)::before { left: 150%; }

/* ── Card glass ─────────────────────────────────────────────────────── */
.dc-card {
  background: linear-gradient(135deg, rgba(12,8,32,0.92) 0%, rgba(8,6,24,0.95) 100%);
  border: 1px solid rgba(123,111,255,0.2);
  border-radius: 20px;
  backdrop-filter: blur(24px);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.03),
    0 20px 60px rgba(0,0,0,0.7),
    0 0 80px rgba(123,111,255,0.06),
    inset 0 1px 0 rgba(255,255,255,0.05);
}

/* ── Error state ────────────────────────────────────────────────────── */
@keyframes dc-error-border { 0%,100%{border-color:rgba(255,74,94,0.4);} 50%{border-color:rgba(255,74,94,0.8);} }
.dc-error-box {
  border: 1px solid rgba(255,74,94,0.4);
  background: rgba(255,74,94,0.06);
  border-radius: 10px;
  padding: 12px 14px;
  animation: dc-error-border 2s ease-in-out infinite;
}

/* ── Auth phase bar ─────────────────────────────────────────────────── */
.dc-auth-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #7B6FFF, #CC80FF, #00CFFF);
  border-radius: 99px;
  animation: dc-auth-bar var(--dur, 1.2s) cubic-bezier(0.4,0,0.2,1) forwards;
}

/* ── Status ticker ──────────────────────────────────────────────────── */
.dc-ticker { animation: dc-ticker 24s linear infinite; white-space: nowrap; }
`;

/* ── Deterministic "random" helpers ─────────────────────────────────── */
function seed(n: number) { return (Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1; }
function seeded(n: number) { return Math.abs(seed(n)); }

/* ── Background canvas — SVG living environment ──────────────────────── */
function NeuralBackground() {
  // Grid lines
  const gridV = Array.from({ length: 14 }, (_, i) => (i + 1) * (100 / 15));
  const gridH = Array.from({ length: 9  }, (_, i) => (i + 1) * (100 / 10));

  // Stars / constellation points
  const stars = Array.from({ length: 55 }, (_, i) => ({
    cx: seeded(i * 3 + 1) * 100,
    cy: seeded(i * 3 + 2) * 100,
    r:  0.3 + seeded(i * 3 + 3) * 0.8,
    dur: 3 + seeded(i * 5) * 5,
    del: seeded(i * 7) * 5,
  }));

  // Neural connection lines (between nearby star pairs)
  const lines: Array<{ x1:number;y1:number;x2:number;y2:number;op:number;dur:number }> = [];
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const dx = stars[i].cx - stars[j].cx;
      const dy = stars[i].cy - stars[j].cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 12 && lines.length < 28) {
        lines.push({ x1:stars[i].cx, y1:stars[i].cy, x2:stars[j].cx, y2:stars[j].cy,
          op: 0.04 + (1 - dist/12) * 0.06, dur: 4 + seeded(i+j) * 4 });
      }
    }
  }

  // Floating particles
  const particles = Array.from({ length: 22 }, (_, i) => ({
    cx: seeded(i * 11 + 1) * 100,
    cy: seeded(i * 11 + 2) * 100,
    r:  0.8 + seeded(i * 11 + 3) * 1.2,
    dur: 5 + seeded(i * 13) * 8,
    del: seeded(i * 7 + 9) * 6,
    dx: (seeded(i * 11 + 4) - 0.5) * 3,
    dy: (seeded(i * 11 + 5) - 0.5) * 3,
  }));

  // Pulse rings (emanating from center)
  const pulseCount = 4;

  return (
    <svg className="fixed inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="bgAtmo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#7B6FFF" stopOpacity="0.04" />
          <stop offset="60%"  stopColor="#CC80FF" stopOpacity="0.015" />
          <stop offset="100%" stopColor="#060614" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Atmospheric glow */}
      <ellipse cx="50" cy="50" rx="50" ry="50" fill="url(#bgAtmo)" />

      {/* Grid lines — horizontal */}
      {gridH.map((y, i) => (
        <line key={`h${i}`} x1="0" y1={y} x2="100" y2={y}
          stroke="rgba(123,111,255,0.025)" strokeWidth="0.08">
          <animate attributeName="stroke-opacity" values="0.018;0.034;0.018"
            dur={`${8 + i * 0.4}s`} repeatCount="indefinite" />
        </line>
      ))}

      {/* Grid lines — vertical */}
      {gridV.map((x, i) => (
        <line key={`v${i}`} x1={x} y1="0" x2={x} y2="100"
          stroke="rgba(123,111,255,0.025)" strokeWidth="0.08">
          <animate attributeName="stroke-opacity" values="0.018;0.034;0.018"
            dur={`${9 + i * 0.3}s`} begin={`${i * 0.2}s`} repeatCount="indefinite" />
        </line>
      ))}

      {/* Neural connection lines */}
      {lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke="rgba(204,128,255,0.35)" strokeWidth="0.06">
          <animate attributeName="stroke-opacity" values={`${l.op};${l.op * 2.5};${l.op}`}
            dur={`${l.dur}s`} begin={`${seeded(i) * 4}s`} repeatCount="indefinite" />
        </line>
      ))}

      {/* Constellation stars */}
      {stars.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="rgba(232,220,255,0.7)">
          <animate attributeName="opacity" values="0.1;0.6;0.1"
            dur={`${s.dur}s`} begin={`${s.del}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Floating particles */}
      {particles.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="rgba(123,111,255,0.5)">
          <animate attributeName="opacity" values="0.05;0.4;0.05"
            dur={`${p.dur}s`} begin={`${p.del}s`} repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate"
            values={`0,0; ${p.dx},${p.dy}; 0,0`}
            dur={`${p.dur * 1.5}s`} begin={`${p.del}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Slow pulse waves from center */}
      {Array.from({ length: pulseCount }, (_, i) => (
        <circle key={i} cx="50" cy="50" r="0" fill="none"
          stroke="rgba(123,111,255,0.12)" strokeWidth="0.15">
          <animate attributeName="r" values="0;48" dur="8s" begin={`${i * 2}s`} repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.15;0" dur="8s" begin={`${i * 2}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

/* ── Neural Sphere visualization ─────────────────────────────────────── */
function NeuralSphere() {
  const W = 480, H = 480, CX = W / 2, CY = H / 2, R = 170;

  // Project sphere nodes
  const nodes = Array.from({ length: 40 }, (_, i) => {
    const phi   = Math.acos(1 - 2 * (i + 0.5) / 40);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const x = CX + R * Math.sin(phi) * Math.cos(theta);
    const y = CY + R * Math.sin(phi) * Math.sin(theta) * 0.38; // flatten Y for oval
    const z = Math.cos(phi); // depth cue
    return { x, y, z, i };
  }).filter(n => n.z > -0.2); // only show front hemisphere

  // Sphere connection edges
  const edges: Array<{ n1:typeof nodes[0]; n2:typeof nodes[0]; dist:number }> = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i+1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const d  = Math.sqrt(dx*dx + dy*dy);
      if (d < 90 && edges.length < 50) edges.push({ n1:nodes[i], n2:nodes[j], dist:d });
    }
  }

  // Floating dream symbol particles around sphere
  const orbitals = Array.from({ length: 8 }, (_, i) => {
    const symbols = ['◇','△','○','✦','◎','⬡','✧','⌬'];
    return { sym: symbols[i], angle: (i / 8) * 360, r: R + 35 + seeded(i*3)*20, dur: 12 + i*2, del: i*1.4 };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full dc-sphere-glow"
      style={{ maxWidth: 480, maxHeight: 480 }}>
      <defs>
        <radialGradient id="sphereCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#9B6FFF" stopOpacity="0.35" />
          <stop offset="50%"  stopColor="#7B6FFF" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#7B6FFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sphereAtmo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#CC80FF" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#7B6FFF" stopOpacity="0" />
        </radialGradient>
        <filter id="sGlow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="sGlowSoft">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Outer atmospheric rings */}
      <ellipse cx={CX} cy={CY} rx={R+60} ry={(R+60)*0.38} fill="url(#sphereAtmo)" />

      {/* Rotating latitude ring 1 */}
      <g style={{ transformOrigin: `${CX}px ${CY}px` }}>
        <ellipse cx={CX} cy={CY} rx={R} ry={R*0.38} fill="none"
          stroke="rgba(123,111,255,0.15)" strokeWidth="0.8" strokeDasharray="4 8">
          <animateTransform attributeName="transform" type="rotate"
            values="0 240 240; 360 240 240" dur="25s" repeatCount="indefinite" />
        </ellipse>
      </g>
      {/* Rotating latitude ring 2 */}
      <g>
        <ellipse cx={CX} cy={CY} rx={R*0.7} ry={R*0.7*0.38} fill="none"
          stroke="rgba(204,128,255,0.1)" strokeWidth="0.6" strokeDasharray="2 10">
          <animateTransform attributeName="transform" type="rotate"
            values="0 240 240; -360 240 240" dur="18s" repeatCount="indefinite" />
        </ellipse>
      </g>
      {/* Vertical meridian */}
      <ellipse cx={CX} cy={CY} rx={R*0.18} ry={R} fill="none"
        stroke="rgba(0,207,255,0.08)" strokeWidth="0.6" strokeDasharray="3 7" />

      {/* Sphere core glow */}
      <circle cx={CX} cy={CY} r={R*0.45} fill="url(#sphereCore)">
        <animate attributeName="r" values={`${R*0.42};${R*0.52};${R*0.42}`} dur="5s" repeatCount="indefinite" />
      </circle>

      {/* Pulse rings from core */}
      {[0, 1.8, 3.6].map(del => (
        <circle key={del} cx={CX} cy={CY} r="10" fill="none" stroke="rgba(123,111,255,0.5)" strokeWidth="0.8">
          <animate attributeName="r" values={`10;${R+10}`} dur="5s" begin={`${del}s`} repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.5;0" dur="5s" begin={`${del}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Neural edges */}
      {edges.map((e, i) => {
        const depthOp = ((e.n1.z + e.n2.z) / 2 + 1) / 2;
        return (
          <line key={i}
            x1={e.n1.x} y1={e.n1.y} x2={e.n2.x} y2={e.n2.y}
            stroke={`rgba(123,111,255,${0.3 + depthOp * 0.4})`}
            strokeWidth={0.5 + depthOp * 0.5}
            opacity={0.2 + depthOp * 0.4}>
            <animate attributeName="opacity"
              values={`${0.2 + depthOp*0.3};${0.5 + depthOp*0.4};${0.2 + depthOp*0.3}`}
              dur={`${3 + i * 0.07}s`} repeatCount="indefinite" />
            {/* Particle on edge */}
            {i % 4 === 0 && (
              <animateMotion dur={`${2 + (i%5)*0.6}s`} repeatCount="indefinite"
                path={`M 0,0 L ${e.n2.x - e.n1.x},${e.n2.y - e.n1.y}`} />
            )}
          </line>
        );
      })}

      {/* Edge particles separately */}
      {edges.filter((_, i) => i % 4 === 0).map((e, i) => (
        <circle key={i} r="1.5" fill="#CC80FF" opacity="0">
          <animateMotion dur={`${2 + (i%5)*0.6}s`} repeatCount="indefinite"
            path={`M ${e.n1.x},${e.n1.y} L ${e.n2.x},${e.n2.y}`} />
          <animate attributeName="opacity" values="0;0.85;0" keyTimes="0;0.5;1"
            dur={`${2 + (i%5)*0.6}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Sphere nodes */}
      {nodes.map(n => {
        const depth = (n.z + 1) / 2;
        const nr    = 2 + depth * 4;
        const hex   = depth > 0.7 ? '#CC80FF' : depth > 0.4 ? '#9B6FFF' : '#7B6FFF';
        return (
          <g key={n.i} filter="url(#sGlow)">
            <circle cx={n.x} cy={n.y} r={nr + 3} fill={hex} opacity={depth * 0.08}>
              <animate attributeName="opacity" values={`${depth*0.05};${depth*0.18};${depth*0.05}`}
                dur={`${2.5 + n.i * 0.11}s`} repeatCount="indefinite" />
            </circle>
            <circle cx={n.x} cy={n.y} r={nr} fill={hex} opacity={0.4 + depth * 0.55}>
              <animate attributeName="r" values={`${nr};${nr*1.3};${nr}`}
                dur={`${2 + n.i * 0.09}s`} repeatCount="indefinite" />
            </circle>
          </g>
        );
      })}

      {/* Central core */}
      <g filter="url(#sGlowSoft)">
        <circle cx={CX} cy={CY} r="14" fill="#9B6FFF" opacity="0.95">
          <animate attributeName="r" values="12;18;12" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx={CX} cy={CY} r="6" fill="#E8DFFF" opacity="0.9" />
        <circle cx={CX} cy={CY} r="22" fill="none" stroke="#CC80FF" strokeWidth="1" opacity="0.3">
          <animate attributeName="r" values="22;36;22" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0;0.4" dur="4s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* Orbiting dream symbols */}
      {orbitals.map((o, i) => (
        <text key={i}
          fontSize="11" fill="rgba(204,128,255,0.45)"
          textAnchor="middle" dominantBaseline="middle">
          <animateMotion
            dur={`${o.dur}s`} begin={`${o.del}s`} repeatCount="indefinite"
            path={`M ${CX},${CY - o.r} A ${o.r},${o.r * 0.35} 0 1,1 ${CX - 0.01},${CY - o.r}`} />
          {o.sym}
        </text>
      ))}

      {/* Scan line */}
      <line x1={CX - R - 20} y1="0" x2={CX - R - 20} y2="0"
        stroke="rgba(0,207,255,0.08)" strokeWidth="1">
        <animate attributeName="x1" values={`${CX-R-20};${CX+R+20};${CX+R+20}`}
          keyTimes="0;0.5;1" dur="6s" repeatCount="indefinite" />
        <animate attributeName="x2" values={`${CX-R-20};${CX+R+20};${CX+R+20}`}
          keyTimes="0;0.5;1" dur="6s" repeatCount="indefinite" />
        <animate attributeName="y2" values="0;480;480"
          keyTimes="0;0;1" dur="6s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0;0.12;0"
          keyTimes="0;0.5;1" dur="6s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

/* ── System status strip ─────────────────────────────────────────────── */
type StatusItem = { dot: string; text: string };

function SystemStatus() {
  const [dreams,    setDreams]    = useState(208);
  const [dreamers,  setDreamers]  = useState(167);
  const [resonance, setResonance] = useState(63);

  useEffect(() => {
    const id = setInterval(() => {
      setDreams(v    => v + Math.floor(Math.random() * 3));
      setDreamers(v  => v + (Math.random() > 0.5 ? 1 : -1));
      setResonance(v => Math.max(55, Math.min(78, v + (Math.random() - 0.5) * 2)));
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const items: StatusItem[] = [
    { dot: '#38D68A', text: 'Neural Network Active'         },
    { dot: '#CC80FF', text: `${dreams} Dreams Processing`  },
    { dot: '#00CFFF', text: `${dreamers} Dreamers Online`  },
    { dot: '#FFB800', text: `Collective Resonance ${resonance.toFixed(0)}%` },
    { dot: '#38D68A', text: 'AI Core Stable'               },
    { dot: '#7B6FFF', text: 'Symbol Engine Running'        },
    { dot: '#00CFFF', text: `${Math.round(dreams * 4.2)} Symbols Mapped` },
  ];
  return (
    <div className="overflow-hidden" style={{
      background: 'rgba(123,111,255,0.05)',
      border: '1px solid rgba(123,111,255,0.14)',
      borderRadius: 10, padding: '7px 0',
    }}>
      <div className="dc-ticker flex items-center gap-0" style={{
        color: 'rgba(200,185,255,0.65)', fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.07em',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {items.map((it, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: it.dot, boxShadow: `0 0 4px ${it.dot}` }} />
              {it.text}
              {i < items.length - 1 && <span style={{ opacity: 0.3, margin: '0 8px' }}>▸</span>}
            </span>
          ))}
          <span style={{ margin: '0 16px', opacity: 0.3 }}>▸</span>
          {items.map((it, i) => (
            <span key={`r-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: it.dot, boxShadow: `0 0 4px ${it.dot}` }} />
              {it.text}
              {i < items.length - 1 && <span style={{ opacity: 0.3, margin: '0 8px' }}>▸</span>}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

/* ── Auth phase sequence ─────────────────────────────────────────────── */
type AuthPhase = 'idle' | 'neural' | 'sync' | 'entering';
const AUTH_PHASES: Array<{ phase: AuthPhase; label: string; sub: string; color: string; dur: number }> = [
  { phase: 'neural',   label: 'NEURAL AUTHENTICATION',   sub: 'Verifying consciousness signature…', color: '#7B6FFF', dur: 1100 },
  { phase: 'sync',     label: 'COLLECTIVE SYNC',         sub: 'Connecting to dream network…',      color: '#CC80FF', dur: 1000 },
  { phase: 'entering', label: 'ENTERING DREAMCLOUD OS',  sub: 'Initializing admin interface…',     color: '#38D68A', dur: 800  },
];

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */

export default function Login() {
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [authPhase, setAuthPhase] = useState<AuthPhase>('idle');
  const [phaseIdx,  setPhaseIdx]  = useState(0);
  const [cursor,    setCursor]    = useState({ x: -300, y: -300 });
  const containerRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const from     = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard';

  useEffect(() => { clearStoredAuth(); }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setCursor({ x: e.clientX, y: e.clientY });
  }, []);
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('E-posta ve şifre gerekli.'); return; }
    setError('');
    setLoading(true);
    setPhaseIdx(0);
    setAuthPhase('neural');

    // Run through auth phases visually
    let pi = 0;
    const runPhase = () => {
      if (pi >= AUTH_PHASES.length) return;
      setPhaseIdx(pi);
      setAuthPhase(AUTH_PHASES[pi].phase);
      pi++;
      if (pi < AUTH_PHASES.length) setTimeout(runPhase, AUTH_PHASES[pi - 1].dur);
    };
    setTimeout(runPhase, 0);

    try {
      const auth = await adminLogin(email, password);
      // Wait for last phase to finish
      const totalDur = AUTH_PHASES.reduce((s, p) => s + p.dur, 0);
      const elapsed  = Date.now();
      const wait     = Math.max(0, totalDur - (Date.now() - elapsed));
      setTimeout(() => {
        setStoredAuth(auth);
        navigate(from, { replace: true });
      }, wait + 200);
    } catch (err) {
      setAuthPhase('idle');
      setLoading(false);
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string })?.message;
        setError(msg ?? 'Giriş başarısız. Lütfen tekrar deneyin.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Beklenmeyen bir hata oluştu.');
      }
    }
  }

  const currentPhase = authPhase !== 'idle' ? AUTH_PHASES[phaseIdx] : null;

  return (
    <div ref={containerRef} className="min-h-screen relative overflow-hidden flex"
      style={{ background: 'linear-gradient(135deg, #060614 0%, #080820 40%, #06060E 100%)' }}>
      <style>{STYLES}</style>

      {/* Cursor glow */}
      <div className="pointer-events-none fixed z-50 transition-opacity"
        style={{
          left: cursor.x - 150, top: cursor.y - 150,
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(123,111,255,0.07) 0%, transparent 70%)',
        }} />

      {/* Living background */}
      <NeuralBackground />

      {/* ── LEFT SIDE: Login interface ───────────────────────────────── */}
      <div className="relative z-10 flex flex-col justify-center w-full lg:w-1/2 xl:w-5/12 min-h-screen p-8 lg:p-16">

        {/* Logo section */}
        <div className="mb-8 dc-fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-4 mb-6">
            {/* Logo mark */}
            <div className="dc-float dc-glow-pulse relative shrink-0" style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(123,111,255,0.15) 0%, rgba(204,128,255,0.08) 100%)',
              border: '1px solid rgba(123,111,255,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src="/logo.png" alt="DreamCloud"
                style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 8 }} />
              {/* Ping dot */}
              <span className="absolute" style={{ top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#38D68A', boxShadow: '0 0 6px #38D68A' }}>
                <span className="dc-breathe absolute inset-0 rounded-full" style={{ background: '#38D68A', borderRadius: '50%', opacity: 0.5 }}
                  onAnimationIteration={() => {}} />
              </span>
            </div>

            <div>
              <h1 style={{
                fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em',
                background: 'linear-gradient(135deg, #E8E8FF 0%, #CC80FF 50%, #7B6FFF 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                lineHeight: 1.1,
              }}>
                DreamCloud
              </h1>
              <p style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.25em', color: 'rgba(123,111,255,0.6)', marginTop: 2, textTransform: 'uppercase' }}>
                ADMIN OS · v2.0
              </p>
            </div>
          </div>

          {/* System status */}
          <div className="dc-fade-up" style={{ animationDelay: '0.25s' }}>
            <SystemStatus />
          </div>
        </div>

        {/* Login card */}
        <div className="dc-card p-8 dc-fade-up" style={{ animationDelay: '0.4s', maxWidth: 420 }}>

          {/* Card header */}
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-3">
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#7B6FFF', boxShadow: '0 0 6px #7B6FFF', display: 'inline-block' }} />
              <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.2em', color: 'rgba(123,111,255,0.6)', textTransform: 'uppercase' }}>
                NEURAL AUTHENTICATION
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'rgba(232,232,255,0.95)', letterSpacing: '-0.01em', marginBottom: 4 }}>
              Sistem Girişi
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(232,232,255,0.35)', lineHeight: 1.5 }}>
              Yetkili admin kimliğinizle DreamCloud OS'a erişin.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={(e) => { void handleSubmit(e); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.18em', color: 'rgba(123,111,255,0.55)', textTransform: 'uppercase', marginBottom: 8 }}>
                Kimlik — E-posta
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@dreamcloud.ai"
                autoComplete="email"
                className="dc-input"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.18em', color: 'rgba(123,111,255,0.55)', textTransform: 'uppercase', marginBottom: 8 }}>
                Şifre — Neural Key
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="dc-input"
                disabled={loading}
              />
            </div>

            {/* Error state — AI styled */}
            {error && (
              <div className="dc-error-box dc-slide-in">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginTop: 1, flexShrink: 0 }}>
                    <circle cx="7" cy="7" r="6" fill="none" stroke="#FF4A5E" strokeWidth="1.2" />
                    <line x1="7" y1="4" x2="7" y2="8" stroke="#FF4A5E" strokeWidth="1.2" strokeLinecap="round" />
                    <circle cx="7" cy="10" r="0.8" fill="#FF4A5E" />
                    <animate attributeName="stroke-opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
                  </svg>
                  <div>
                    <p style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.15em', color: 'rgba(255,74,94,0.7)', marginBottom: 2, textTransform: 'uppercase' }}>
                      AUTHENTICATION FAILED
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(255,74,94,0.9)', lineHeight: 1.4 }}>{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Auth phase display */}
            {loading && currentPhase && (
              <div className="dc-slide-in" style={{
                background: `${currentPhase.color}08`,
                border: `1px solid ${currentPhase.color}22`,
                borderRadius: 10, padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: currentPhase.color,
                    boxShadow: `0 0 8px ${currentPhase.color}`, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.15em', color: currentPhase.color, textTransform: 'uppercase' }}>
                    {currentPhase.label}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'rgba(232,232,255,0.5)', marginBottom: 10, fontFamily: 'monospace' }}>
                  {currentPhase.sub}
                </p>
                {/* Progress bar */}
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <div className="dc-auth-bar-fill" style={{ '--dur': `${currentPhase.dur}ms` } as React.CSSProperties} />
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                  {AUTH_PHASES.map((p, i) => (
                    <div key={i} style={{
                      flex: 1, height: 2, borderRadius: 99,
                      background: i <= phaseIdx ? p.color : 'rgba(255,255,255,0.06)',
                      transition: 'background 0.3s',
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="dc-btn"
              style={{ marginTop: 4 }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: 'dc-rotate 1s linear infinite' }}>
                    <circle cx="7" cy="7" r="5.5" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
                    <path d="M 7,1.5 A 5.5,5.5 0 0,1 12.5,7" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  PROCESSING…
                </span>
              ) : 'ENTER DREAMCLOUD OS'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 dc-fade-up" style={{ animationDelay: '0.6s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#38D68A', boxShadow: '0 0 4px #38D68A', display: 'inline-block' }} />
            <p style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(232,232,255,0.2)', letterSpacing: '0.08em' }}>
              AUTHORIZED ACCESS ONLY · DREAMCLOUD OS · NEURAL SECURITY ENABLED
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDE: Neural sphere visualization ──────────────────── */}
      <div className="hidden lg:flex flex-col items-center justify-center flex-1 relative z-10">

        {/* Top label */}
        <div className="dc-fade-up text-center mb-6" style={{ animationDelay: '0.5s' }}>
          <p style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.22em', color: 'rgba(123,111,255,0.45)', textTransform: 'uppercase' }}>
            COLLECTIVE CONSCIOUSNESS FIELD
          </p>
        </div>

        {/* Neural sphere */}
        <div className="dc-fade-in" style={{ width: '100%', maxWidth: 480, animationDelay: '0.3s' }}>
          <NeuralSphere />
        </div>

        {/* Live stats below sphere */}
        <div className="dc-fade-up mt-6" style={{ animationDelay: '0.7s' }}>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {[
              { label: 'DREAMERS', value: '167', color: '#CC80FF' },
              { label: 'SYMBOLS',  value: '3.2K', color: '#00CFFF' },
              { label: 'CLUSTERS', value: '92',  color: '#38D68A' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{value}</p>
                <p style={{ fontSize: 8, color: 'rgba(232,232,255,0.25)', letterSpacing: '0.18em', fontFamily: 'monospace', textTransform: 'uppercase', marginTop: 2 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tagline */}
        <div className="dc-fade-up text-center mt-8" style={{ animationDelay: '0.9s', maxWidth: 320 }}>
          <p style={{ fontSize: 12, color: 'rgba(232,232,255,0.22)', lineHeight: 1.7, fontStyle: 'italic', letterSpacing: '0.02em' }}>
            "Mapping the collective subconscious of humanity,<br />one dream at a time."
          </p>
          <p style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(123,111,255,0.3)', marginTop: 10, letterSpacing: '0.15em' }}>
            DREAMCLOUD OS · NEURAL INTELLIGENCE PLATFORM
          </p>
        </div>
      </div>
    </div>
  );
}
