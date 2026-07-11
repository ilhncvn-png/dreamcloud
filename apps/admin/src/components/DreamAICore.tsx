import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchOverview,
  fetchCommunityHealth,
  fetchConsciousnessMap,
  fetchCollectiveConsciousness,
  fetchEmotionMap,
  fetchOperationalAlerts,
} from '../api/admin.api';
import { useLiveSystem } from '../contexts/LiveSystemContext';

/* ── AI panel section ────────────────────────────────────────────────── */

function AISection({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="p-4 rounded-xl"
      style={{ background: `${color}06`, border: `1px solid ${color}14` }}
    >
      <p
        className="text-[8px] font-mono font-black tracking-[0.2em] mb-2"
        style={{ color: `${color}AA` }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────────── */

export default function DreamAICore() {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const { events, systemPulse } = useLiveSystem();

  const ov = useQuery({ queryKey: ['overview'], queryFn: fetchOverview, staleTime: 20_000 });
  const ch = useQuery({
    queryKey: ['com-health'],
    queryFn: fetchCommunityHealth,
    staleTime: 50_000,
  });
  const cm = useQuery({
    queryKey: ['consciousness-map'],
    queryFn: fetchConsciousnessMap,
    staleTime: 50_000,
  });
  const cc = useQuery({
    queryKey: ['collective-consciousness'],
    queryFn: fetchCollectiveConsciousness,
    staleTime: 50_000,
  });
  const em = useQuery({ queryKey: ['emotion-map'], queryFn: fetchEmotionMap, staleTime: 50_000 });
  const al = useQuery({ queryKey: ['alerts'], queryFn: fetchOperationalAlerts, staleTime: 12_000 });

  // Pulse whenever a new event arrives
  useEffect(() => {
    setPulse((p) => p + 1);
  }, [events[0]?.id]);

  const data = ov.data;
  const health = ch.data;
  const consciousness = cm.data;
  const collective = cc.data;
  const emotion = em.data;
  const critAlerts = (al.data?.alerts ?? []).filter((a) => a.severity === 'critical').length;

  // Derive AI summaries from real data
  const moodSummary = health
    ? `Kolektif ruh hali ${health.moodScore >= 65 ? 'olumlu bölgede' : health.moodScore >= 40 ? 'nötr alanda' : 'karanlık frekanslarda'}. ` +
      `Pozitivite %${health.positivityIndex.toFixed(0)}, anksiyete %${health.anxietyIndex.toFixed(0)}. ` +
      `${health.topPositiveEmotions[0]?.toUpperCase() ?? 'JOY'} baskın duygu.`
    : 'Ruh hali verisi analiz ediliyor…';

  const consciousnessSummary = consciousness
    ? `Bilinç katmanı ${consciousness.tier}. Skor: ${consciousness.overallScore}/100. ` +
      (consciousness.tier === 'TRANSCENDENT' || consciousness.tier === 'LUCID'
        ? 'Kolektif alan yüksek rezonans ışıyor. Lucid rüya aktivitesi tepe noktasında.'
        : consciousness.tier === 'ACTIVE'
          ? 'Kolektif bilinç aktif senkronizasyon halinde. Arketipler uyanık.'
          : 'Bilinç alanı sakin. Yeni örüntüler filizleniyor.')
    : 'Bilinç haritası taranıyor…';

  const emotionSummary = emotion
    ? `${((emotion.dominantEmotion as string | null) ?? '').toUpperCase()} dominant frekansta %${
        emotion.topEmotions[0]?.pct ?? 0
      }. Duygusal hava: ${
        emotion.dominantType === 'positive'
          ? 'güneşli ve açık'
          : emotion.dominantType === 'negative'
            ? 'fırtınalı ve derin'
            : 'bulutlu ve geçişsel'
      }. Hız endeksi ${emotion.velocityIndex >= 0 ? '+' : ''}${emotion.velocityIndex}%.`
    : 'Duygu spektrumu okunuyor…';

  const collectiveSummary = collective
    ? `Kolektif bilinç ${collective.coherenceLevel} seviyesinde. ` +
      `${collective.resonanceCount} paylaşılan sembol aktif. ` +
      `${collective.mindToMindConnections} mind-to-mind bağlantı tespit edildi. ` +
      `Dominant duygu: ${((collective.collectiveEmotion as string | null) ?? '').toUpperCase()}.`
    : 'Kolektif alan taranıyor…';

  const riskSummary =
    critAlerts > 0
      ? `${critAlerts} KRİTİK sinyal aktif. ${data?.reportedCount ?? 0} içerik moderasyon kuyruğunda. Acil müdahale gerekebilir.`
      : data?.reportedCount
        ? `${data.reportedCount} rapor bekliyor. Kritik tehdit tespit edilmedi. Sistem nominal.`
        : 'Risk tespiti yok. Tüm sistemler nominal çalışıyor.';

  const recentSignals = events.slice(0, 4);

  return (
    <>
      {/* Floating orb button */}
      <button
        onClick={() => {
          setOpen((o) => !o);
        }}
        className="fixed z-50 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
        style={{
          bottom: 24,
          right: 24,
          width: 52,
          height: 52,
          background: open
            ? 'linear-gradient(135deg, rgba(123,111,255,0.95), rgba(204,128,255,0.95))'
            : 'linear-gradient(135deg, rgba(8,4,24,0.98), rgba(12,6,32,0.98))',
          border: `2px solid ${open ? 'rgba(204,128,255,0.6)' : 'rgba(123,111,255,0.3)'}`,
          boxShadow: open
            ? '0 0 30px rgba(123,111,255,0.6), 0 0 60px rgba(123,111,255,0.2)'
            : `0 0 ${pulse % 2 === 0 ? '20' : '14'}px rgba(123,111,255,0.4), 0 4px 20px rgba(0,0,0,0.8)`,
          transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Pulsing ring */}
        {!open && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: '1px solid rgba(123,111,255,0.3)',
              animation: 'nova-pulse 3s ease-out infinite',
            }}
          />
        )}
        <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}>
          {open ? (
            <path
              d="M6 18L18 6M6 6l12 12"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <>
              <circle cx="12" cy="12" r="3" fill="rgba(204,128,255,0.9)" />
              <circle cx="12" cy="12" r="3" fill="rgba(204,128,255,0.9)">
                <animate attributeName="r" values="3;6;3" dur="3s" repeatCount="indefinite" />
                <animate
                  attributeName="opacity"
                  values="0.9;0;0.9"
                  dur="3s"
                  repeatCount="indefinite"
                />
              </circle>
              {[0, 60, 120, 180, 240, 300].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                return (
                  <circle
                    key={deg}
                    cx={12 + 8 * Math.cos(rad)}
                    cy={12 + 8 * Math.sin(rad)}
                    r="1"
                    fill="rgba(123,111,255,0.6)"
                  />
                );
              })}
            </>
          )}
        </svg>
      </button>

      {/* AI Panel */}
      {open && (
        <div
          ref={panelRef}
          className="fixed z-50 flex flex-col"
          style={{
            bottom: 88,
            right: 24,
            width: 360,
            maxHeight: 580,
            background: 'linear-gradient(160deg, rgba(8,4,24,0.99) 0%, rgba(10,6,28,0.99) 100%)',
            border: '1px solid rgba(123,111,255,0.25)',
            borderRadius: 16,
            boxShadow: '0 0 60px rgba(123,111,255,0.15), 0 24px 60px rgba(0,0,0,0.9)',
            backdropFilter: 'blur(24px)',
            animation: 'float-drift 0s', // resets drift
            overflow: 'hidden',
          }}
        >
          {/* Top gradient border */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background:
                'linear-gradient(90deg, transparent, rgba(204,128,255,0.7), rgba(0,207,255,0.4), transparent)',
            }}
          />

          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(123,111,255,0.1)' }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgba(123,111,255,0.2)',
                    border: '1px solid rgba(123,111,255,0.4)',
                  }}
                >
                  <span style={{ fontSize: 10, color: '#CC80FF' }}>◆</span>
                </div>
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: '1px solid rgba(123,111,255,0.3)',
                    animation: 'nova-pulse 3s ease-out infinite',
                  }}
                />
              </div>
              <div>
                <p
                  className="text-[11px] font-black tracking-widest font-mono"
                  style={{ color: '#CC80FF' }}
                >
                  DREAM AI CORE
                </p>
                <p className="text-[8px] font-mono" style={{ color: 'rgba(123,111,255,0.5)' }}>
                  SİSTEM ZEKASI · AKTİF
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-1 h-1 rounded-full animate-glow-breathe"
                style={{ background: '#38D68A' }}
              />
              <span className="text-[8px] font-mono" style={{ color: '#38D68A' }}>
                PULSE {systemPulse}
              </span>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Live signal stream */}
            {recentSignals.length > 0 && (
              <div
                style={{
                  borderBottom: '1px solid rgba(123,111,255,0.08)',
                  paddingBottom: 12,
                  marginBottom: 12,
                }}
              >
                <p
                  className="text-[8px] font-mono font-black tracking-[0.2em] mb-2"
                  style={{ color: 'rgba(123,111,255,0.4)' }}
                >
                  CANLI SİNYAL
                </p>
                <div className="space-y-1.5">
                  {recentSignals.map((e, i) => (
                    <div
                      key={e.id}
                      className="flex items-start gap-2"
                      style={{ opacity: 1 - i * 0.2 }}
                    >
                      <span
                        className="text-[9px] font-mono mt-0.5 shrink-0"
                        style={{ color: e.color }}
                      >
                        {e.icon}
                      </span>
                      <div>
                        <p
                          className="text-[10px] font-mono"
                          style={{ color: 'rgba(232,232,255,0.8)' }}
                        >
                          {e.message}
                        </p>
                        {e.detail && (
                          <p
                            className="text-[8px] font-mono"
                            style={{ color: 'rgba(232,232,255,0.35)' }}
                          >
                            {e.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI summaries */}
            <AISection title="TOPLULUK RUHALI" color="#38D68A">
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: 'rgba(232,232,255,0.75)' }}
              >
                {moodSummary}
              </p>
            </AISection>

            <AISection title="BİLİNÇ KATMANI" color="#CC80FF">
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: 'rgba(232,232,255,0.75)' }}
              >
                {consciousnessSummary}
              </p>
            </AISection>

            <AISection title="DUYGUSAL HAVA" color="#FFB800">
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: 'rgba(232,232,255,0.75)' }}
              >
                {emotionSummary}
              </p>
            </AISection>

            <AISection title="KOLEKTİF ZİHİN" color="#00CFFF">
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: 'rgba(232,232,255,0.75)' }}
              >
                {collectiveSummary}
              </p>
            </AISection>

            <AISection
              title={critAlerts > 0 ? `RİSK ALARMI · ${critAlerts} KRİTİK` : 'RİSK DEĞERLENDİRMESİ'}
              color={critAlerts > 0 ? '#FF4A5E' : '#5A5A84'}
            >
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: 'rgba(232,232,255,0.75)' }}
              >
                {riskSummary}
              </p>
            </AISection>

            {/* Platform stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'KULLANICI', value: data?.activeUsersToday ?? '—', color: '#38D68A' },
                { label: 'RÜYA', value: data?.dreamsToday ?? '—', color: '#CC80FF' },
                { label: 'SKOR', value: systemPulse, color: '#FFB800' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="p-2 rounded-lg text-center"
                  style={{ background: `${color}08`, border: `1px solid ${color}18` }}
                >
                  <p className="text-[8px] font-mono mb-0.5" style={{ color: `${color}80` }}>
                    {label}
                  </p>
                  <p className="font-mono font-black text-sm" style={{ color }}>
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(123,111,255,0.08)' }}
          >
            <p className="text-[8px] font-mono" style={{ color: 'rgba(123,111,255,0.3)' }}>
              AI_CORE v4.0 ▪ DREAMCLOUD OS
            </p>
            <div className="flex items-center gap-1">
              <span
                className="text-[8px] font-mono animate-ai-cursor"
                style={{ color: 'rgba(204,128,255,0.6)' }}
              >
                ▋
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
