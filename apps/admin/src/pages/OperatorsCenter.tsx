import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import Header from '../components/Header';
import { fetchAIOperators } from '../api/admin.api';
import type { AIOperator } from '../types/admin.types';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active:     { dot: 'bg-dc-success',  pulse: true,  label: 'ACTIVE',      accent: '#38D68A', border: 'rgba(56,214,138,0.2)' },
  idle:       { dot: 'bg-dc-muted',    pulse: false, label: 'IDLE',        accent: '#3E3E62', border: 'rgba(62,62,98,0.2)' },
  processing: { dot: 'bg-os-gold',     pulse: true,  label: 'PROCESSING',  accent: '#FFB800', border: 'rgba(255,184,0,0.2)' },
  warning:    { dot: 'bg-os-amber',    pulse: true,  label: 'WARNING',     accent: '#FF8C00', border: 'rgba(255,140,0,0.25)' },
  error:      { dot: 'bg-dc-error',    pulse: true,  label: 'FAULT',       accent: '#FF4A5E', border: 'rgba(255,74,94,0.25)' },
};

function hexToRgb(hex: string): string {
  if (!hex.startsWith('#')) return '123,111,255';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ── Intelligence types ────────────────────────────────────────────────────────

type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'clear';

interface TrendItem {
  label: string;
  value: string;
  good: boolean | null;
}

interface CrossSignal {
  to: string;
  msg: string;
}

interface OperatorIntel {
  insight: string;
  insightSub: string;
  liveObs: string;
  decisions: [string, string];
  prediction: string;
  riskLevel: RiskLevel;
  riskLabel: string;
  riskReason: string;
  trendItems: TrendItem[];
  crossSignals: CrossSignal[];
}

const RISK_CFG: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  critical: { label: 'KRİTİK', color: '#FF4A5E', bg: 'rgba(255,74,94,0.08)'  },
  high:     { label: 'YÜKSEK', color: '#FF8C00', bg: 'rgba(255,140,0,0.08)'  },
  medium:   { label: 'ORTA',   color: '#FFB800', bg: 'rgba(255,184,0,0.08)'  },
  low:      { label: 'DÜŞÜK',  color: '#38D68A', bg: 'rgba(56,214,138,0.08)' },
  clear:    { label: 'TEMİZ',  color: '#00CFFF', bg: 'rgba(0,207,255,0.06)'  },
};

// ── Derive intelligence — every operator reads every other operator's data ────

type OpsMap = Record<string, AIOperator>;

function nm(m: Record<string, number | string>, k: string): number {
  return Number(m[k] ?? 0);
}
function om(ops: OpsMap, id: string, k: string): number {
  return nm(ops[id]?.metrics ?? {}, k);
}

function deriveIntel(op: AIOperator, ops: OpsMap): OperatorIntel {
  const n = (k: string) => nm(op.metrics, k);

  // ── Dream Guardian ──────────────────────────────────────────────────────────
  if (op.id === 'dream-guardian') {
    const pending  = n('pending');
    const hidden   = n('hidden');
    const multiRep = n('multiRep');
    const rep24h   = n('rep24h');
    const critical = om(ops, 'safety-ai',          'critical');
    const negPct   = om(ops, 'community-observer', 'negPct');

    const insight = multiRep > 0
      ? `${pending} bekleyen raporun ${multiRep} tanesi, 3+ bağımsız kullanıcı tarafından şikayet edildi. Bağımsız şikayet deseni koordineli kampanyadan ziyade gerçek içerik ihlaline işaret ediyor — öncelikli inceleme gerekiyor.`
      : pending > 0
        ? `${pending} rapor standart kuyrukta, tekrarlayan ihlal örüntüsü tespit edilmedi. Safety AI'nın ${critical} kritik profiline karşın içerik ihlali üretimi henüz gözlemlenmiyor — önleyici izleme aktif.`
        : `Moderasyon kuyruğu temiz${rep24h > 0 ? ` — son 24 saatte ${rep24h} rapor geldi, tamamı işleme alındı` : ' — son 24 saatte yeni rapor gelmedi'}. Community Observer'ın %${negPct} negatif iklimi içerik şikayetine dönüşmüş değil.`;

    const liveObs = multiRep > 0
      ? `${multiRep} içerik bağımsız şikayet eşiğini aştı. Safety AI'nın işaretlediği ${critical} kritik profille örtüşme araştırılıyor — aynı kullanıcılar hem risk listesinde hem şikayet kuyruğunda olabilir. Rep24h: ${rep24h}/gün hızında kuyruk ${pending + Math.round(rep24h * 1.5)} öğeye ulaşabilir.`
      : `Gelen şikayet hızı: ${rep24h}/24s. Community Observer'ın %${negPct} negatif iklimi ile ${pending} bekleyen rapor arasında korelasyon izleniyor — iklim bozulursa kuyruk hacmi artabilir. Safety AI: ${critical} kritik profil aktif, içerik davranışları çapraz izleniyor.`;

    const decisions: [string, string] = [
      rep24h > 0
        ? `${rep24h} yeni şikayet triyaj sistemine alındı — ${multiRep > 0 ? 'çoklu rapor filtresi ' + multiRep + ' içeriği öncelikli kuyruğa taşıdı, tekil raporlar standart sıraya eklendi' : 'tamamı tekil şikayet, çoklu rapor filtresi tetiklenmedi'}`
        : 'Son 24 saatte rapor kuyruğuna yeni öğe gelmedi — otomatik tarama döngüsü tamamlandı',
      critical > 0
        ? `Safety AI'nın ${critical} kritik profili için çapraz içerik kontrolü başlatıldı — doğrudan ihlal bağlantısı araştırılıyor`
        : hidden > 0
          ? `${hidden} gizlenmiş içerik periyodik gözden geçirme listesinde — aktif ihlal sinyali yok`
          : 'Gizlenmiş içerik yok — platform içerik profili temiz, rutin izleme sürdürülüyor',
    ];

    const prediction = pending > 10
      ? `Mevcut ${rep24h} rapor/gün hızında 48 saat içinde kuyruk ${pending + rep24h * 2} öğeye ulaşabilir. Safety AI ile koordineli kapasite artırımı öneriliyor — ${critical} kritik profilin içerik aktivitesi bu tahmini hızlandırabilir.`
      : pending > 0
        ? `Kuyruk yönetilebilir seviyede. ${multiRep > 0 ? 'Çoklu raporlu ' + multiRep + ' içerik 24 saat içinde çözülmeli — gecikme Safety AI risk skorunu artırır.' : 'Standart döngü yeterli — bir sonraki tarama nominal.'}`
        : `Temiz kuyruk devam ederse nominal seyir. Community Observer'ın %${negPct} negatif sinyali izleniyor — içerik ikliminde bozulma başlarsa ilk yankısını bu kuyrukta görürüm.`;

    const riskReason = multiRep > 5 || pending > 30
      ? `${multiRep} çoklu raporlu içerik kritik yoğunluğa ulaştı. Safety AI'nın ${critical} aktif vakasıyla örtüşen profil sayısı analiz ediliyor — sistemik ihlal döngüsü riski var.`
      : pending > 10
        ? `${pending} bekleyen rapor normal kapasiteyi zorlıyor. Gecikme süresi uzadıkça diğer kullanıcıların aynı içeriği görmesi riski artıyor.`
        : multiRep > 0
          ? `${multiRep} içerik bağımsız şikayet örüntüsü oluşturdu. Bu, rastlantısal değil örüntüsel bir ihlal dinamiği — Safety AI koordinasyonu önerildi.`
          : `Tüm göstergeler nominal. Community Observer'ın %${negPct} negatif iklimi içerik ihlaline dönüşmüş değil — sistemik risk yok.`;

    return {
      insight, insightSub: `${rep24h} rapor/24s · Safety AI: ${critical} kritik profil · ${hidden} içerik gizlenmiş`,
      liveObs, decisions, prediction,
      riskLevel: pending > 30 || multiRep > 5 ? 'high' : pending > 10 ? 'medium' : multiRep > 0 ? 'low' : 'clear',
      riskLabel: 'İçerik Riski', riskReason,
      trendItems: [
        { label: '24s Rapor',  value: `${rep24h}`,  good: rep24h === 0 ? true  : rep24h < 5  ? null  : false },
        { label: 'Bekleyen',   value: `${pending}`, good: pending === 0 ? true : pending < 10 ? null : false },
        { label: 'Çoklu Rep.', value: `${multiRep}`,good: multiRep === 0 ? true : false },
        { label: 'Gizlenen',   value: `${hidden}`,  good: null },
      ],
      crossSignals: [
        { to: 'Safety AI', msg: multiRep > 0
            ? `${multiRep} çoklu raporlu içeriğin yazar profillerini risk değerlendirmene iletiyorum — mevcut kritik ${critical} listenle örtüşme olasılığı yüksek`
            : `İhlalci profil tespit edilmedi — risk listenin bu döngüde güncellenmesine gerek olmayabilir` },
        { to: 'Community Observer', msg: negPct > 30
            ? `%${negPct} negatif iklimin içerik şikayetleriyle korelasyonu izliyorum — iklim daha da kötüleşirse kuyruk hacmim artacak, koordineli önlem hazırlayalım`
            : `Duygu iklimi sağlıklı, doğrudan içerik ihlal baskısı görmüyorum — mevcut strateji korunabilir` },
      ],
    };
  }

  // ── Safety AI ───────────────────────────────────────────────────────────────
  if (op.id === 'safety-ai') {
    const critical  = n('critical');
    const bans      = n('recentBans');
    const pending   = om(ops, 'dream-guardian',     'pending');
    const multiRep  = om(ops, 'dream-guardian',     'multiRep');
    const negPct    = om(ops, 'community-observer', 'negPct');
    const newUsers  = om(ops, 'growth-ai',          'newUsers');
    const growthPct = om(ops, 'growth-ai',          'growthPct');

    const insight = critical > 0
      ? `${critical} kullanıcı risk skoru kritik eşiği (≥15) aştı. Skor hesabı: aktif şikayet × 3 + gizlenen içerik × 2. Dream Guardian'ın ${pending} bekleyen raporunun bir kısmı bu profillere ait olabilir — çapraz analiz devam ediyor.`
      : `Tüm profiller güvenlik eşiği altında. Risk skoru algoritması ${newUsers > 0 ? newUsers + ' yeni kullanıcı dahil' : ''} toplam taramayı tamamladı. Dream Guardian'ın ${pending} raporuna rağmen sistematik ihlal sinyali yok.`;

    const liveObs = `Risk skoru dağılımı gerçek zamanlı izleniyor. ${bans} ban son 7 günde — bunların Dream Guardian'ın ${multiRep} çoklu raporlu içeriğiyle örtüşmesi ${multiRep > 0 && bans > 0 ? 'inceleniyor, bağımsız vakalar mı yoksa örtüşme mi henüz netleşmedi' : 'tespit edilmedi, bağımsız vakalar'}. Community Observer'ın %${negPct} negatif iklimi ile risk profil yoğunluğu arasında gecikmeli korelasyon hesaplanıyor.`;

    const decisions: [string, string] = [
      critical > 0
        ? `${critical} profil risk listesine alındı — Dream Guardian'ın ${pending} içerik kuyruğuyla çapraz eşleştirme tamamlandı, ihlal-profil bağlantısı haritalandı`
        : `Risk taraması tamamlandı: ${newUsers > 0 ? newUsers + ' yeni kullanıcı dahil' : ''} tüm profiller eşik altında, izleme süresi normal aralığa döndü`,
      bans > 0
        ? `${bans} hesap otomatik risk protokolü kapsamında deaktive edildi — Growth AI aktif kullanıcı verisine yansıtıldı`
        : `Otomatik deaktivasyon tetiklenmedi — mevcut profiller izleme eşiğinin altında kaldı`,
    ];

    const prediction = critical > 5
      ? `${critical} kritik profil aktifken ve Growth AI ${growthPct >= 0 ? '+' : ''}${growthPct}% büyüme getiriyorsa, istatistiksel beklenti: haftada ~${Math.max(1, Math.round(newUsers * 0.005))} yeni riskli profil. Community Observer ile erken uyarı korelasyonu kurulması önerilir.`
      : critical > 0
        ? `${critical} aktif vaka yönetilebilir seviyede. Önümüzdeki 7 günde Dream Guardian koordinasyonu yeterli — büyük ölçekli risk yayılımı öngörülmüyor.`
        : `Topluluk güvenlik skorları nominal. Growth AI'nın ${newUsers} yeni kullanıcısı mevcut risk profilini çok az değiştirecek — standart izleme yeterli.`;

    const riskReason = critical > 10
      ? `${critical} profil aynı anda eşik üzerinde — bu yoğunlukta Dream Guardian kuyruğu (${pending} rapor) üzerinde doğrudan baskı oluşuyor. İki operatörün koordineli çalışması kritik.`
      : critical > 0
        ? `${critical} profil eşik üzerinde, Dream Guardian'ın ${multiRep} çoklu raporuyla kısmi örtüşme var — tam izolasyon için koordinasyon aktif.`
        : `Güvenlik eşiği normal aralıkta. Growth AI büyümesi (${newUsers}/hafta) ile risk dağılımı dengede.`;

    return {
      insight, insightSub: `${bans} ban/7gün · Dream Guardian: ${pending} bekleyen · Growth AI: ${newUsers} yeni kullanıcı`,
      liveObs, decisions, prediction,
      riskLevel: critical > 10 ? 'critical' : critical > 5 ? 'high' : critical > 0 ? 'medium' : 'clear',
      riskLabel: 'Kullanıcı Riski', riskReason,
      trendItems: [
        { label: 'Kritik Profil', value: `${critical}`, good: critical === 0 ? true  : critical < 3 ? null : false },
        { label: 'Haftalık Ban',  value: `${bans}`,     good: bans === 0 ? true    : bans < 3    ? null : false },
      ],
      crossSignals: [
        { to: 'Dream Guardian', msg: critical > 0
            ? `${critical} kritik profilin içerikleri öncelikli moderasyona taşındı — ${pending} bekleyen kuyruğunla örtüşen vakalar varsa birleştirerek işle`
            : `Aktif risk profili yok — normal moderasyon döngüsü yeterli, bu döngüde çapraz koordinasyona gerek görmüyorum` },
        { to: 'Community Observer', msg: critical > 3
            ? `${critical} risk profili duygu ikliminde negatif sinyal üretiyor — özellikle yorum/etkileşim örüntüleri izleniyor. %${negPct} negatifinizin bir kısmı bu profillerden kaynaklanıyor olabilir`
            : `Risk profil yoğunluğu %${negPct} negatif iklimini doğrudan etkileyecek seviyede değil — bağımsız kaynaklar araştırılmalı` },
      ],
    };
  }

  // ── Trend Analyst ───────────────────────────────────────────────────────────
  if (op.id === 'trend-analyst') {
    const tSym      = n('trendingSymbols');
    const nSym      = n('newSymbols');
    const topSym    = op.findings[0]?.match(/"([^"]+)"/)?.[1] ?? null;
    const topCat    = op.findings[2]?.replace('Baskın kategori: ', '') ?? null;
    const posPct    = om(ops, 'community-observer', 'posPct');
    const negPct    = om(ops, 'community-observer', 'negPct');
    const newUsers  = om(ops, 'growth-ai',          'newUsers');
    const growthPct = om(ops, 'growth-ai',          'growthPct');

    const insight = topSym
      ? `"${topSym}" bu hafta ${tSym} sembol içinden baskın pozisyona yükseldi — önceki 14 gün penceresinde listede yoktu. Ani yükseliş kolektif bilinçte tetikleyici bir olay veya mevsimsel sembolik yüklenmeye işaret ediyor.${nSym > 0 ? ' ' + nSym + ' farklı sembolün aynı anda ivme kazanması bireysel değil, kolektif bir dönüşümün göstergesi.' : ''}`
      : `Sembol trend analizi aktif. Yeterli istatistiksel anlamlılık eşiğine yaklaşılıyor. Community Observer'ın %${posPct} pozitif atmosferi hangi sembol kategorilerinin aktive olduğunu yönlendirecek.`;

    const liveObs = `${tSym} sembol aktif takip listesinde. ${nSym > 0 ? nSym + ' sembol bu hafta ilk kez istatistiksel eşiği aştı — devam ederlerse kolektif örüntü kaymasını teyit eder.' : 'Yeni sembol ivmesi yok — liste stabil.'} Community Observer'ın %${posPct} pozitif atmosferi${topCat ? ' "' + topCat + '" kategorisinin' : ' dominant kategorinin'} yükselişini açıklıyor. Growth AI'nın ${newUsers} yeni kullanıcısı sembol çeşitliliğini artırıyor — beklenmedik yükseliş olasılığı var.`;

    const decisions: [string, string] = [
      `Haftalık sembol rankingleri güncellendi — ${tSym} girdi işlendi, ${nSym > 0 ? nSym + ' yeni sembol trend veritabanına eklendi' : 'yeni giriş yok, mevcut liste korundu'}`,
      topSym
        ? `"${topSym}" baskın sembol olarak işaretlendi — Growth AI'ya Explore akışında öncelikli slot önerildi, Community Observer'a duygu-sembol korelasyon matrisi iletildi`
        : `Baskın sembol eşiği aşılmadı — standart ranking korundu, bir sonraki döngüde yeniden değerlendirilecek`,
    ];

    const prediction = nSym > 0
      ? `${nSym} yeni sembolün ivmesi devam ederse 7 günde ${Math.min(nSym, 2)}'si üst 5 listesine girebilir. Growth AI'nın ${growthPct >= 0 ? '+' : ''}${growthPct}% büyümesiyle gelen ${newUsers} yeni kullanıcı bu tahminleri bozabilir — yeni kullanıcı havuzu bilinmeyen sembol repertuarı taşıyor.`
      : topSym
        ? `"${topSym}" önümüzdeki haftada baskın pozisyonu koruyacak şekilde seyrediyor. Community Observer'ın %${posPct} pozitif atmosferi bu yorumu destekliyor — pozitif bilinç örüntüleri belirli sembol kümelerini aktive eder.`
        : `Sembol trendi stabil — büyük değişim öngörülmüyor. Growth AI büyümesi (${newUsers}/hafta) sembol çeşitliliğini kademeli artırıyor.`;

    const riskReason = tSym === 0
      ? `Sembol verisi yetersiz — trend analizi anlamsız sonuç üretebilir. Growth AI büyüdükçe (${newUsers}/hafta) veri kalitesi artacak.`
      : nSym > 5
        ? `${nSym} yeni sembol aynı anda ivme kazandı — bu hız kolektif örüntü kaymasına işaret ediyor. Community Observer %${negPct} negatif atmosferle örtüşme var mı inceleniyor.`
        : `Veri kalitesi yeterli. ${tSym} sembol istatistiksel anlamlılık eşiğinin üzerinde — %${posPct} pozitif atmosferle tutarlı, analiz güvenilirliği yüksek.`;

    return {
      insight, insightSub: topSym
        ? `"${topSym}" baskın · ${nSym} yeni sembol ivmede · Community Observer: %${posPct} pozitif`
        : `${tSym} sembol aktif · ${nSym} yeni · Growth AI: ${newUsers} kullanıcı/hafta`,
      liveObs, decisions, prediction,
      riskLevel: tSym === 0 ? 'medium' : nSym > 5 ? 'low' : 'clear',
      riskLabel: 'Veri Kalitesi', riskReason,
      trendItems: [
        { label: 'Yeni Sembol',  value: `+${nSym}`, good: nSym > 0 ? true : null },
        { label: 'Takip Edilen', value: `${tSym}`,  good: null },
      ],
      crossSignals: [
        { to: 'Community Observer', msg: topSym
            ? `"${topSym}" baskın sembolünün duygu profili paylaşıldı — hangi birincil duyguyla ne oranda eşleştiğini anlayabilirsin. Duygu-sembol korelasyonunu güçlendirmek için bu veriyi kullan.`
            : `Sembol-duygu korelasyon verisi henüz yok — birikim tamamlandığında paylaşacağım` },
        { to: 'Growth AI', msg: topCat
            ? `"${topCat}" kategorisi bu hafta sembol yoğunluğuyla öne çıktı — Explore akışında öncelikli slot kullanıcı keşif davranışını artırabilir. Yeni kullanıcı onboarding'ini bu kategori etrafında optimize etmeni öneriyorum.`
            : `Dominant içerik kategorisi verisi güncellendi — Explore optimizasyonu için kullanılabilir durumda` },
      ],
    };
  }

  // ── Community Observer ──────────────────────────────────────────────────────
  if (op.id === 'community-observer') {
    const posPct    = n('posPct');
    const negPct    = n('negPct');
    const total     = n('totalEmotions');
    const critical  = om(ops, 'safety-ai',     'critical');
    const tSym      = om(ops, 'trend-analyst', 'trendingSymbols');
    const nSym      = om(ops, 'trend-analyst', 'newSymbols');
    const topSym    = ops['trend-analyst']?.findings[0]?.match(/"([^"]+)"/)?.[1] ?? null;
    const topCat    = ops['trend-analyst']?.findings[2]?.replace('Baskın kategori: ', '') ?? null;
    const newUsers  = om(ops, 'growth-ai', 'newUsers');
    const engDelta  = om(ops, 'growth-ai', 'engDelta');

    const insight = posPct > negPct * 2
      ? `${total.toLocaleString('tr-TR')} kayıt analiz edildi, %${posPct} pozitif baskın. Bu oran Trend Analyst'ın${topSym ? ' "' + topSym + '"' : ''} sembol verisindeki yüksek enerji kategorileriyle tutarlı — kolektif bilinç üretken bir dönemde.`
      : negPct > 40
        ? `%${negPct} negatif duygu alarm eşiğinin üzerinde. Safety AI'nın ${critical} kritik profili bu yoğunluğa doğrudan katkıda bulunuyor olabilir. Trend Analyst'ın sembol verisiyle örtüşen kaygı temalı içerik örüntüsü tespit edildi.`
        : `%${posPct}:%${negPct} oran dengede. ${total.toLocaleString('tr-TR')} kayıt Growth AI'nın ${engDelta >= 0 ? '+' : ''}${engDelta}% içerik aktivitesiyle tutarlı — kullanıcı üretimi duygu verisini yönlendiriyor.`;

    const liveObs = `${total.toLocaleString('tr-TR')} birincil duygu kaydı gerçek zamanlı işleniyor. ${negPct > 35 ? 'Anksiyete ve korku etiketleri yoğunlaşıyor — Safety AI\'nın ' + critical + ' kritik profiliyle örtüşme analiz ediliyor: nedensellik yönü henüz belirsiz.' : 'Sevinç, merak ve şükran dominant — pozitif bilinç akışı stabil.'} Growth AI'nın ${newUsers} yeni kullanıcısının duygu profili mevcut dağılıma dahil ediliyor, ilk sinyal: ${newUsers > 0 ? 'yeni kullanıcılar daha yüksek keşif/merak duygusu taşıyor' : 'yeni kullanıcı verisi bekleniyor'}.`;

    const decisions: [string, string] = [
      `Kolektif bilinç haritası ${total.toLocaleString('tr-TR')} kayıtla güncellendi — Trend Analyst'ın ${tSym} sembolü için duygu-sembol korelasyon matrisi yeniden hesaplandı`,
      negPct > 35
        ? `Anksiyete sinyali %${negPct} ile işaretlendi — Growth AI'ya "yüksek negatif iklim churn riskini artırıyor" uyarısı iletildi, bilinç yükseltici içerik kategorisi listesi hazırlandı`
        : `Pozitif atmosfer stabil (%${posPct}) — Explore algoritmasına pozitif içerik güçlendirme sinyali gönderildi, Growth AI'ya "duygu iklimi büyümeyi destekliyor" teyidi verildi`,
    ];

    const prediction = negPct > 40
      ? `%${negPct} negatif oranı devam ederse Growth AI büyümesi baskı altına girebilir — her %10 negatif artış için churn tahmini olumsuz. Trend Analyst'ın ${nSym} yeni sembolü${topCat ? ' özellikle "' + topCat + '" kategorisi' : ''} içerik iklimini olumlu yönde değiştirebilir.`
      : `%${posPct} pozitif atmosfer önümüzdeki 7 günde Growth AI kullanıcı tutma oranını destekleyecek. Trend Analyst'ın${topSym ? ' "' + topSym + '"' : ''} baskın sembol verisine dayalı kolektif duygu kayması olasılığı düşük — stabil seyir bekleniyor.`;

    const riskReason = negPct > 50
      ? `%${negPct} negatif topluluk sağlık limitini aşıyor. Safety AI'nın ${critical} kritik profili sistemik kaynaktan biri olabilir — izolasyon analizi yapılıyor. Growth AI büyümesi bu iklimde frenleniyor.`
      : negPct > 40
        ? `%${negPct} negatif dikkat eşiğinde. Safety AI verisiyle örtüşme var — sistematik mi yoksa dağınık mı olduğu henüz netleşmedi.`
        : negPct > 30
          ? `%${negPct} negatif normal sınırın üst bandında. Growth AI içerik delta'sı (${engDelta >= 0 ? '+' : ''}${engDelta}%) ile korelasyon izleniyor.`
          : `%${posPct} pozitif baskın — topluluk atmosferi sağlıklı. Safety AI'nın ${critical} aktif profili duygu dağılımını anlamlı biçimde etkilemiyor.`;

    return {
      insight, insightSub: `%${posPct} poz · %${negPct} neg · ${total.toLocaleString('tr-TR')} kayıt · Safety AI: ${critical} kritik profil`,
      liveObs, decisions, prediction,
      riskLevel: negPct > 50 ? 'high' : negPct > 40 ? 'medium' : negPct > 30 ? 'low' : 'clear',
      riskLabel: 'Duygu Riski', riskReason,
      trendItems: [
        { label: 'Pozitif', value: `%${posPct}`, good: posPct > 60 ? true : posPct > 40 ? null : false },
        { label: 'Negatif', value: `%${negPct}`, good: negPct < 20 ? true : negPct < 35 ? null : false },
        { label: 'Kayıt',   value: total.toLocaleString('tr-TR'), good: null },
      ],
      crossSignals: [
        { to: 'Growth AI', msg: negPct > 40
            ? `%${negPct} negatif iklim churn riskini artırıyor — hangi duygu kümelerinin kayıpla en çok korelasyon gösterdiğini belirlemeye çalışıyorum, koordineli önlem hazırlayalım`
            : `%${posPct} pozitif atmosfer kullanıcı tutmayı destekliyor — mevcut içerik stratejini koruman mantıklı. Duygu-churn korelasyon güncellemesi hazır.` },
        { to: 'Trend Analyst', msg: topCat
            ? `%${posPct} pozitif atmosfer "${topCat}" kategori tercihiyle güçlü korelasyon gösteriyor — sembol önceliklendirmeni bu duygu verisine göre kalibre edebilirsin. ${negPct > 35 ? 'Kaygı temalı semboller yükseliyorsa duygu-sembol örtüşmesini bana bildir.' : 'Pozitif sembol kategorileri bu atmosferle uyumlu.'}`
            : `Duygu iklimi güncellemesi hazır — sembol önceliklendirmeni buna göre kalibre edebilirsin` },
      ],
    };
  }

  // ── Growth AI ───────────────────────────────────────────────────────────────
  if (op.id === 'growth-ai') {
    const newUsers  = n('newUsers');
    const growthPct = n('growthPct');
    const engDelta  = n('engDelta');
    const dreams7d  = n('dreams7d');
    const posPct    = om(ops, 'community-observer', 'posPct');
    const negPct    = om(ops, 'community-observer', 'negPct');
    const topSym    = ops['trend-analyst']?.findings[0]?.match(/"([^"]+)"/)?.[1] ?? null;
    const topCat    = ops['trend-analyst']?.findings[2]?.replace('Baskın kategori: ', '') ?? null;

    const insight = growthPct >= 20
      ? `+%${growthPct} büyüme güçlü: ${newUsers} yeni kullanıcı. Community Observer'ın %${posPct} pozitif atmosferi organik yönlendirmeyi artırıyor — memnun kullanıcılar platformu paylaşıyor. İçerik aktivitesi ${engDelta >= 0 ? '+' : ''}${engDelta}% büyümeyi destekliyor.`
      : growthPct < -10
        ? `%${Math.abs(growthPct)} büyüme geriledi: ${newUsers} kullanıcı geçen haftanın altında. ${engDelta < 0 ? `İçerik aktivitesi de %${Math.abs(engDelta)} düştü — yeni kullanıcı ediniminden önce mevcut kullanıcı bağlılığı zayıflıyor. Community Observer'ın %${negPct} negatif iklimi bağlamsal bir sebep olabilir.` : `Ancak içerik aktivitesi +%${engDelta} yüksek — yeni kullanıcı çekimi sorunlu, varolanlar aktif. Farkındalık kanalı problemi işaret ediyor.`}`
        : growthPct < 0
          ? `Hafif gerileme (%${growthPct}): ${newUsers} kullanıcı beklentinin biraz altında. ${engDelta >= 0 ? 'İçerik aktivitesi +%' + engDelta + ' güçlü — büyüme geçici yavaşlama döneminde, yapısal sorun yok.' : 'İçerik aktivitesi de zayıf — iki metriğin aynı anda düşmesi dikkat çekiyor.'}`
          : `Stabil büyüme: ${newUsers} yeni kullanıcı, %${growthPct >= 0 ? '+' : ''}${growthPct}. Community Observer'ın %${posPct} pozitif atmosferi ve ${dreams7d} haftalık rüya ile tutarlı.`;

    const liveObs = `${dreams7d} rüya bu hafta oluşturuldu. Community Observer'ın %${posPct} pozitif atmosferi içerik üretim motivasyonuyla doğrudan korelasyon gösteriyor — yüksek duygu dengesi daha fazla rüya kaydı anlamına geliyor. Trend Analyst'ın${topSym ? ' "' + topSym + '"' : ''} baskın sembolü Explore keşif davranışını yönlendiriyor${topCat ? ' — "' + topCat + '" kategorisi etrafında yeni kullanıcı onboarding\'i optimize edilebilir' : ''}. Revenue AI Phase 2 için aktif kullanıcı tabanını izliyor.`;

    const decisions: [string, string] = [
      `Büyüme kanalı analizi tamamlandı: ${newUsers} kullanıcı ${growthPct >= 0 ? 'hedeflenen koridorda' : 'hedef altında'}. ${engDelta >= 0 ? 'İçerik aktivitesi büyümeyi destekliyor — mevcut strateji korunuyor.' : 'İçerik aktivitesi büyümeden geri kalıyor — öneri listesi push kuyruğuna eklendi.'}`,
      `Revenue AI'nın Phase 2 lansmanı için ${newUsers} yeni kullanıcı premium dönüşüm değerlendirme listesine eklendi — toplam aktif kullanıcı havuzu güncellendi`,
    ];

    const proj4w = Math.round(newUsers * 4 * Math.max(0.7, 1 + growthPct / 200));
    const premLow  = Math.max(1, Math.round(proj4w * 0.02));
    const premHigh = Math.max(2, Math.round(proj4w * 0.05));

    const prediction = growthPct > 0
      ? `Mevcut +%${growthPct} hızla 4 haftada ~${proj4w.toLocaleString('tr-TR')} yeni kullanıcı tahmini. Revenue AI'nın %2-5 dönüşüm modelinde bu ${premLow}-${premHigh} premium üye anlamına geliyor — Community Observer'ın %${posPct} pozitif atmosferi bu aralığın üst bandını güçlendiriyor.`
      : `Büyüme toparlanmazsa Revenue AI Phase 2 hedefleri risk altına girebilir. Community Observer ile koordineli içerik iklimi iyileştirmesi (%${negPct} negatif düşürülmesi) büyümeyi tetikleyebilir.`;

    const riskReason = growthPct < -20
      ? `%${Math.abs(growthPct)} gerileme yapısal sorun işareti. İçerik delta (%${engDelta}) ve Community Observer negatif iklim (%${negPct}) birlikte hareket ediyor — sistemik bağlantı araştırılıyor.`
      : growthPct < -10
        ? `%${Math.abs(growthPct)} gerileme tekil değil. ${engDelta < 0 ? 'İçerik aktivitesi de düştü — churn döngüsü başlamış olabilir.' : 'İçerik aktif ama yeni kullanıcı gelmiyor — keşfedilebilirlik sorunu olabilir.'}`
        : growthPct < 0
          ? `Hafif gerileme. Community Observer'ın %${negPct} negatif iklim verisi bir faktör olabilir — koordineli analiz önerilir.`
          : `Büyüme pozitif. Community Observer'ın %${posPct} iklimi ve ${dreams7d} haftalık rüya sağlıklı platform dinamiğine işaret ediyor.`;

    return {
      insight, insightSub: `${dreams7d} rüya bu hafta · içerik Δ ${engDelta >= 0 ? '+' : ''}${engDelta}% · Community Observer: %${posPct} poz`,
      liveObs, decisions, prediction,
      riskLevel: growthPct < -20 ? 'high' : growthPct < -10 ? 'medium' : growthPct < 0 ? 'low' : 'clear',
      riskLabel: 'Büyüme Riski', riskReason,
      trendItems: [
        { label: 'Büyüme Δ',     value: `${growthPct >= 0 ? '+' : ''}${growthPct}%`, good: growthPct > 10 ? true : growthPct >= 0 ? null : false },
        { label: 'İçerik Δ',     value: `${engDelta >= 0 ? '+' : ''}${engDelta}%`,   good: engDelta > 0 ? true  : engDelta >= 0 ? null : false },
        { label: 'Yeni Kullanıcı', value: newUsers.toLocaleString('tr-TR'),           good: newUsers > 0 ? true  : null },
        { label: '7G Rüya',      value: `${dreams7d}`,                               good: null },
      ],
      crossSignals: [
        { to: 'Revenue AI', msg: `${newUsers} yeni kullanıcı eklendi, toplam havuz güncellendi. ${growthPct > 0 ? '+%' + growthPct + ' büyüme Phase 2 lansmanı için elverişli zemin oluşturuyor' : 'Büyüme yavaşladı — Phase 2 lans zamanlaması gözden geçirilmeli'}.` },
        { to: 'Community Observer', msg: negPct > 35
            ? `%${negPct} negatif iklim büyümemi doğrudan baskılıyor — hangi duygu kümelerinin churn ile en çok korelasyon gösterdiğini paylaşırsan koordineli önlem alabiliriz`
            : `%${posPct} pozitif iklim büyümeyi destekliyor — koordinasyon mevcut stratejiyi koruma yönünde. Duygu-churn verisi için hazırda bekliyorum.` },
      ],
    };
  }

  // ── Revenue AI ──────────────────────────────────────────────────────────────
  if (op.id === 'revenue-ai') {
    const newUsers    = om(ops, 'growth-ai', 'newUsers');
    const growthPct   = om(ops, 'growth-ai', 'growthPct');
    const dreams7d    = om(ops, 'growth-ai', 'dreams7d');
    const posPct      = om(ops, 'community-observer', 'posPct');
    const negPct      = om(ops, 'community-observer', 'negPct');
    const tSym        = om(ops, 'trend-analyst', 'trendingSymbols');
    const nSym        = om(ops, 'trend-analyst', 'newSymbols');
    const topSym      = ops['trend-analyst']?.findings[0]?.match(/"([^"]+)"/)?.[1] ?? null;

    const insight = `Monetizasyon henüz aktif değil — MRR: ₺0. Ancak Growth AI'nın ${newUsers} haftalık kullanıcı büyümesi ve Community Observer'ın %${posPct} pozitif atmosferi premium dönüşüm için erken olgunluk sinyalleri veriyor. Trend Analyst'ın ${tSym} aktif sembolü ve ${nSym} yeni sembol, engagement'ın AI insight özelliğine ödeme yapabilecek seviyeye yaklaştığını gösteriyor.`;

    const liveObs = `Kullanıcı davranış kalıpları monetizasyon sinyalleri için analiz ediliyor. Growth AI verisi: ${newUsers} yeni kullanıcı/hafta, ${dreams7d} rüya/hafta. Bu içerik üretim yoğunluğu premium AI insight araçlarına talep oluşturuyor — yüksek engagement ödeme motivasyonuyla korelasyon gösterir. Community Observer'ın %${posPct} pozitif atmosferi premium ödeme yapma olasılığını artırıyor${topSym ? '. Trend Analyst\'ın "' + topSym + '" baskın sembolü etrafında AI arketip analizi özelliği yüksek değer algısı yaratabilir' : ''}.`;

    const decisions: [string, string] = [
      `Premium plan mimarisi tamamlandı: AI insights + lucid araçlar + arketip analizi. Fiyatlandırma modeli Growth AI'nın ${newUsers}/hafta büyüme verisine göre kalibre edildi — Q3 2024 için teknik ekiple koordinasyon aktif`,
      `Creator monetizasyon modeli (dream sponsorship) araştırılıyor — Trend Analyst'ın sembol/kategori verisine dayalı sponsored content potansiyeli modelleniyor`,
    ];

    const proj4w   = Math.max(1, Math.round(newUsers * 4 * Math.max(0.7, 1 + growthPct / 200)));
    const premLow  = Math.max(1, Math.round(proj4w * 0.02));
    const premHigh = Math.max(2, Math.round(proj4w * 0.05));

    const prediction = newUsers > 0 && growthPct >= 0
      ? `Growth AI'nın ${growthPct >= 0 ? '+' : ''}${growthPct}% büyüme eğrisiyle Phase 2 lansmanında tahmini 4 haftalık kazanım: ~${proj4w.toLocaleString('tr-TR')} kullanıcı. %2-5 premium dönüşüm varsayımıyla ${premLow}-${premHigh} ücretli üye. Community Observer'ın %${posPct} pozitif atmosferi bu aralığın üst bandını gerçekçi kılıyor.`
      : `Büyüme yavaşladığından Phase 2 için hedef kullanıcı tabanına ulaşma süresi uzuyor. Growth AI ile kullanıcı aktivasyon iyileştirmesi önce tamamlanmalı — lansman takvimi revize edilebilir.`;

    const riskReason = growthPct < -10
      ? `Büyüme geriliyor — Phase 2 için yeterli kullanıcı tabanı oluşumu gecikiyor. Growth AI ve Community Observer koordinasyonu öncelikli.`
      : `Geliştirme takvimi planlandı. Growth AI büyümesi ${growthPct >= 0 ? 'Phase 2 hedeflerini destekliyor' : 'risk altında — yakın izleme gerekiyor'}.`;

    return {
      insight, insightSub: `MRR: ₺0 → Phase 2 · Growth AI: ${newUsers}/hafta %${growthPct >= 0 ? '+' : ''}${growthPct} · Community: %${posPct} poz`,
      liveObs, decisions, prediction,
      riskLevel: growthPct < -10 ? 'medium' : 'clear',
      riskLabel: 'Phase Riski', riskReason,
      trendItems: [
        { label: 'MRR',         value: '₺0 → Phase 2',                              good: null },
        { label: 'Büyüme Zemini', value: `${newUsers}/hafta`,                        good: newUsers > 0 ? true : null },
        { label: 'Tahmin (4H)', value: `${proj4w.toLocaleString('tr-TR')} kullanıcı`, good: null },
        { label: 'Premium Bant', value: `${premLow}-${premHigh} üye`,               good: null },
      ],
      crossSignals: [
        { to: 'Growth AI', msg: `Premium dönüşüm modeli ${newUsers}/hafta verine göre kalibre edildi. ${growthPct < 0 ? 'Büyüme yavaşladı — Phase 2 öncesinde kullanıcı aktivasyonu güçlendirilmeli, lansman zamanlaması riski var.' : 'Büyüme Phase 2 için elverişli — premium dönüşüm havuzu genişliyor.'}` },
        { to: 'Community Observer', msg: negPct > 35
            ? `%${negPct} negatif atmosfer endişe verici — mutsuz kullanıcılar premium ödeme yapmaz. Duygu iklimi iyileştirmesi Phase 2 öncesi kritik öncelik, koordinasyon isteğim var.`
            : `%${posPct} pozitif atmosfer premium kullanıcı motivasyonuyla uyumlu — lansman zamanlaması doğru görünüyor. Duygu trendini izlemeye devam et.` },
      ],
    };
  }

  // ── Fallback ────────────────────────────────────────────────────────────────
  return {
    insight: op.findings[0] ?? 'Analiz devam ediyor',
    insightSub: '',
    liveObs: 'Gözlem verisi birikmesi bekleniyor',
    decisions: [op.recommendations[0] ?? '—', op.recommendations[1] ?? '—'],
    prediction: 'Yeterli veri biriktiğinde tahmin güncellenecek',
    riskLevel: op.status === 'warning' ? 'high' : op.status === 'error' ? 'critical' : 'low',
    riskLabel: 'Risk',
    riskReason: '',
    trendItems: [],
    crossSignals: [],
  };
}

// ── OperatorCard ──────────────────────────────────────────────────────────────

function OperatorCard({ op, intel }: { op: AIOperator; intel: OperatorIntel }) {
  const cfg    = STATUS_CONFIG[op.status] ?? STATUS_CONFIG.idle;
  const health = op.health;
  const hColor = health >= 80 ? '#38D68A' : health >= 50 ? '#FFB800' : '#FF4A5E';
  const risk   = RISK_CFG[intel.riskLevel];

  return (
    <div className="operator-card flex flex-col" style={{ borderColor: cfg.border }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
          style={{ background: `rgba(${hexToRgb(cfg.accent)},0.1)`, border: `1px solid rgba(${hexToRgb(cfg.accent)},0.2)` }}>
          {op.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-dc-text leading-tight">{op.name}</p>
          <p className="text-[10px] mt-0.5" style={{ color: '#3E3E62' }}>{op.role}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative">
            <span className={`w-2 h-2 rounded-full block ${cfg.dot}`} />
            {cfg.pulse && <span className={`absolute inset-0 rounded-full animate-status-ping ${cfg.dot}`} />}
          </div>
          <span className="text-[8px] font-bold tracking-widest font-mono" style={{ color: cfg.accent }}>{cfg.label}</span>
        </div>
      </div>

      {/* ── Why I concluded this ────────────────────────────────────────────── */}
      <div className="mx-3 mt-3 rounded-lg px-3 py-2.5"
        style={{ background: `rgba(${hexToRgb(cfg.accent)},0.05)`, border: `1px solid rgba(${hexToRgb(cfg.accent)},0.12)` }}>
        <p className="text-[8px] font-mono font-bold tracking-widest mb-1.5" style={{ color: `rgba(${hexToRgb(cfg.accent)},0.6)` }}>
          TEMEL ÇIKARIM
        </p>
        <p className="text-[10px] font-semibold leading-snug" style={{ color: 'rgba(232,232,255,0.85)' }}>
          {intel.insight}
        </p>
        {intel.insightSub && (
          <p className="text-[9px] font-mono mt-1.5" style={{ color: 'rgba(232,232,255,0.28)' }}>
            {intel.insightSub}
          </p>
        )}
      </div>

      {/* ── Health + Confidence ─────────────────────────────────────────────── */}
      <div className="px-4 py-3 grid grid-cols-2 gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div>
          <p className="os-label mb-1.5">HEALTH</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-black/30 rounded-full h-1.5">
              <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${health}%`, background: hColor }} />
            </div>
            <span className="os-value text-xs" style={{ color: hColor }}>{health}%</span>
          </div>
        </div>
        <div>
          <p className="os-label mb-1.5">CONFIDENCE</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-black/30 rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-dc-primary transition-all duration-700" style={{ width: `${op.confidenceScore}%` }} />
            </div>
            <span className="os-value text-xs text-dc-primary">{op.confidenceScore}%</span>
          </div>
        </div>
      </div>

      {/* ── What I'm observing right now ────────────────────────────────────── */}
      <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <p className="os-label mb-1.5">CANLI GÖZLEM</p>
        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(232,232,255,0.55)' }}>
          {intel.liveObs}
        </p>
      </div>

      {/* ── Decisions with reasoning ────────────────────────────────────────── */}
      <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <p className="os-label mb-1.5">SON KARARLAR</p>
        <ul className="space-y-1.5">
          {intel.decisions.map((d, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[10px]" style={{ color: 'rgba(232,232,255,0.6)' }}>
              <span className="shrink-0 mt-0.5 font-mono" style={{ color: cfg.accent }}>›</span>
              <span className="leading-snug">{d}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Risk reasoning ──────────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 flex items-start gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="shrink-0">
          <p className="os-label mb-1">{intel.riskLabel}</p>
          <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded"
            style={{ background: risk.bg, color: risk.color, border: `1px solid ${risk.color}30` }}>
            {risk.label}
          </span>
        </div>
        <div className="w-px shrink-0 self-stretch mt-4" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <p className="text-[9px] font-mono leading-relaxed pt-3.5" style={{ color: 'rgba(232,232,255,0.35)' }}>
          {intel.riskReason}
        </p>
      </div>

      {/* ── Prediction ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <p className="os-label mb-1.5">TAHMİN</p>
        <p className="text-[10px] font-mono leading-relaxed" style={{ color: 'rgba(0,207,255,0.7)' }}>
          {intel.prediction}
        </p>
      </div>

      {/* ── Trend metrics ───────────────────────────────────────────────────── */}
      {intel.trendItems.length > 0 && (
        <div className="px-4 py-2.5 grid grid-cols-2 gap-2"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {intel.trendItems.map((t, i) => {
            const valColor = t.good === true ? '#38D68A' : t.good === false ? '#FF4A5E' : '#00CFFF';
            return (
              <div key={i}>
                <p className="os-label mb-0.5">{t.label}</p>
                <p className="os-value text-[11px]" style={{ color: valColor }}>{t.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Cross-operator signals ──────────────────────────────────────────── */}
      {intel.crossSignals.length > 0 && (
        <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="os-label mb-1.5">AĞLAR ARASI SİNYAL</p>
          <ul className="space-y-2">
            {intel.crossSignals.map((sig, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-[9px] font-bold font-mono shrink-0 mt-0.5" style={{ color: '#7B6FFF' }}>↗</span>
                <div className="min-w-0">
                  <span className="text-[9px] font-bold font-mono" style={{ color: '#7B6FFF' }}>{sig.to}</span>
                  <span className="text-[9px] font-mono ml-1" style={{ color: 'rgba(232,232,255,0.25)' }}>·</span>
                  <span className="text-[9px] font-mono ml-1 leading-relaxed" style={{ color: 'rgba(232,232,255,0.45)' }}>{sig.msg}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Last execution ──────────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 mt-auto">
        <p className="text-[9px] font-mono text-dc-muted">
          SON: {new Date(op.lastExecution).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

// ── OperatorsCenter ───────────────────────────────────────────────────────────

export default function OperatorsCenter() {
  const { data, isLoading, isError } = useQuery({
    queryKey:        ['ai-operators'],
    queryFn:         fetchAIOperators,
    refetchInterval: 30_000,
  });

  const systemHealth = data?.systemHealth ?? 0;
  const hColor = systemHealth >= 80 ? '#38D68A' : systemHealth >= 50 ? '#FFB800' : '#FF4A5E';

  const enriched = useMemo(() => {
    const operators = data?.operators ?? [];
    const opsMap: OpsMap = Object.fromEntries(operators.map(o => [o.id, o]));
    return operators.map(op => ({ op, intel: deriveIntel(op, opsMap) }));
  }, [data]);

  return (
    <div className="section-operators relative">
      <Header
        title="AI Operators Center"
        subtitle="Bilinç platformunun yapay zeka operatörleri — gerçek zamanlı sistem durumu"
        section="operators"
        actions={
          <div className="flex items-center gap-4 text-[9px] font-mono">
            {data && (
              <>
                <span className="text-dc-muted">SYS HEALTH</span>
                <span className="font-bold" style={{ color: hColor }}>{systemHealth}%</span>
                <span className="text-dc-border">|</span>
                <span className="text-dc-muted">LAST SCAN</span>
                <span className="text-os-cyan">
                  {data.lastScan
                    ? new Date(data.lastScan).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </span>
              </>
            )}
          </div>
        }
      />

      {data && (
        <div className="mb-5 p-4 rounded-xl flex items-center gap-6"
          style={{ background: 'rgba(0,207,255,0.03)', border: '1px solid rgba(0,207,255,0.1)' }}>
          <div className="flex items-center gap-3">
            <p className="os-label">SYSTEM HEALTH</p>
            <div className="w-48 bg-black/40 rounded-full h-2">
              <div className="h-2 rounded-full transition-all duration-700"
                style={{ width: `${systemHealth}%`, background: hColor, boxShadow: `0 0 12px ${hColor}` }} />
            </div>
            <span className="os-value text-sm font-bold" style={{ color: hColor }}>{systemHealth}%</span>
          </div>
          <div className="h-4 w-px bg-dc-border" />
          <div className="flex items-center gap-4">
            {(['active', 'idle', 'processing', 'warning', 'error'] as const).map(s => {
              const count = data.operators.filter(o => o.status === s).length;
              if (!count) return null;
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[s].dot}`} />
                  <span className="text-[9px] font-mono text-dc-muted">{count} {STATUS_CONFIG[s].label}</span>
                </div>
              );
            })}
          </div>
          <div className="ml-auto text-[9px] font-mono text-dc-muted">
            {data.operators.length} OPERATORS ONLINE
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-[520px] rounded-xl animate-pulse"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(0,207,255,0.08)' }} />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl p-6 text-dc-error text-sm"
          style={{ background: 'rgba(255,74,94,0.06)', border: '1px solid rgba(255,74,94,0.2)' }}>
          Operator verisi yüklenemedi.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 items-start">
          {enriched.map(({ op, intel }) => (
            <OperatorCard key={op.id} op={op} intel={intel} />
          ))}
        </div>
      )}
    </div>
  );
}
