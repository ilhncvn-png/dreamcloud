import Header from '../components/Header';

const PIPELINES = [
  {
    name:    'Rüya Analizi Motoru',
    icon:    '🧠',
    status:  'operational',
    version: 'v2.1.0',
    desc:    'Rüya içeriğini semantik olarak analiz eder, tema ve arketip çıkarımı yapar.',
    metrics: [
      { label: 'Günlük İşlem', value: '—' },
      { label: 'Ortalama Süre', value: '—' },
      { label: 'Başarı Oranı', value: '—' },
    ],
  },
  {
    name:    'Duygu Tespiti',
    icon:    '💚',
    status:  'operational',
    version: 'v1.4.2',
    desc:    'Rüya içeriğinden birincil ve ikincil duygular ile yoğunluk skorları çıkarır.',
    metrics: [
      { label: 'Model', value: 'Claude Sonnet' },
      { label: 'Duygu Kategorisi', value: '47' },
      { label: 'Doğruluk', value: '—' },
    ],
  },
  {
    name:    'Sembol Çıkarımı',
    icon:    '◆',
    status:  'operational',
    version: 'v1.8.1',
    desc:    'Jungian ve evrensel semboller için rüya metnini tarar ve güven skoru atar.',
    metrics: [
      { label: 'Sembol Veritabanı', value: '2.4K' },
      { label: 'Kategori', value: '18' },
      { label: 'Günlük Çıkarım', value: '—' },
    ],
  },
  {
    name:    'Rüya Eşleştirme (Resonance)',
    icon:    '◉',
    status:  'operational',
    version: 'v3.0.0',
    desc:    'Kullanıcılar arasındaki benzer rüyaları vektör benzerliğiyle eşleştirir.',
    metrics: [
      { label: 'Algoritma', value: 'pgvector cosine' },
      { label: 'Eşik', value: '0.75' },
      { label: 'Günlük Match', value: '—' },
    ],
  },
  {
    name:    'Arketip Sınıflandırıcı',
    icon:    '✨',
    status:  'beta',
    version: 'v0.9.0',
    desc:    'Kullanıcı rüya profillerini Jung arketiplerine göre sınıflandırır.',
    metrics: [
      { label: 'Arketip Sayısı', value: '12' },
      { label: 'Min Rüya', value: '5' },
      { label: 'Kapsam', value: 'Beta' },
    ],
  },
  {
    name:    'Trend Motoru',
    icon:    '📈',
    status:  'operational',
    version: 'v1.1.0',
    desc:    'Topluluk genelindeki sembol, tema ve duygu trendlerini gerçek zamanlı hesaplar.',
    metrics: [
      { label: 'Güncelleme', value: 'Her 1 saat' },
      { label: 'Pencere', value: '7 / 30 gün' },
      { label: 'Veri Noktası', value: '—' },
    ],
  },
];

const STATUS_STYLES: Record<string, string> = {
  operational: 'bg-dc-success/10 border-dc-success/30 text-dc-success',
  beta:        'bg-dc-warning/10 border-dc-warning/30 text-dc-warning',
  offline:     'bg-dc-error/10 border-dc-error/30 text-dc-error',
};

const STATUS_LABELS: Record<string, string> = {
  operational: '● Çalışıyor',
  beta:        '◐ Beta',
  offline:     '✕ Çevrimdışı',
};

export default function AICenter() {
  return (
    <div className="section-operators relative">
      <Header
        title="AI Merkezi"
        subtitle="Dream Cloud'un yapay zeka pipeline'ları ve model durumları"
        section="operators"
        actions={
          <span className="px-3 py-1.5 text-xs font-bold bg-dc-primary/10 text-dc-primary border border-dc-primary/20 rounded-lg">
            Realtime Metrics — Phase 2
          </span>
        }
      />

      {/* Pipeline grid */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        {PIPELINES.map((p) => (
          <div key={p.name} className="bg-dc-surface border border-dc-border rounded-xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">{p.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-dc-text font-bold text-sm truncate">{p.name}</p>
                  <span className="text-[9px] text-dc-muted font-mono shrink-0">{p.version}</span>
                </div>
                <p className="text-dc-muted text-[11px]">{p.desc}</p>
              </div>
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border whitespace-nowrap shrink-0 ${STATUS_STYLES[p.status]}`}>
                {STATUS_LABELS[p.status]}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-dc-border">
              {p.metrics.map((m) => (
                <div key={m.label} className="bg-dc-bg rounded-lg px-2.5 py-2">
                  <p className="text-dc-muted text-[9px] uppercase tracking-wide mb-0.5">{m.label}</p>
                  <p className="text-dc-text text-xs font-bold">{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Roadmap */}
      <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
        <h3 className="text-[10px] font-bold text-dc-muted uppercase tracking-widest mb-4">
          AI Roadmap — Phase 2+
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            'Gerçek zamanlı analiz metrikleri',
            'Model versiyon yönetimi',
            'A/B test — model karşılaştırma',
            'Pipeline log görüntüleyici',
            'Token kullanım izleme',
            'Latency ve hata oranı grafikleri',
            'Fine-tuning veri yönetimi',
            'Prompt şablonu editörü',
            'Kullanıcı geri bildirimi ile model iyileştirme',
          ].map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 bg-dc-bg border border-dc-border rounded-lg px-3 py-2.5 text-dc-muted text-xs"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-dc-primary/40 shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
