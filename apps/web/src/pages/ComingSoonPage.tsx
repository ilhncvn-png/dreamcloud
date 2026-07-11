interface Props {
  title: string;
  icon?: string;
}

export default function ComingSoonPage({ title, icon = '◈' }: Props) {
  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 20, opacity: 0.35 }}>{icon}</div>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: 'var(--text-1)',
          marginBottom: 10,
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: 'inline-block',
          background: 'rgba(123,111,255,0.1)',
          border: '1px solid rgba(123,111,255,0.2)',
          borderRadius: 100,
          padding: '5px 14px',
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(123,111,255,0.7)',
          marginBottom: 20,
        }}
      >
        Web Paritelerin Sonraki Aşaması
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.7 }}>
        Bu özellik mobil uygulamada mevcut. Web sürümü yakında buraya gelecek.
      </p>
      <a
        href="https://app.dreamclaude.org"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 24,
          padding: '10px 20px',
          borderRadius: 'var(--r-md)',
          fontSize: 13,
          fontWeight: 500,
          background: 'rgba(123,111,255,0.1)',
          border: '1px solid rgba(123,111,255,0.22)',
          color: 'rgba(167,150,255,0.9)',
          textDecoration: 'none',
          transition: 'all 0.15s',
        }}
      >
        Mobil Uygulamayı Aç →
      </a>
    </div>
  );
}
