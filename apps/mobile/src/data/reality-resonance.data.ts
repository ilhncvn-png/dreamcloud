// TODO: Replace with real API responses when backend anomaly-detection service is ready.

export type SignalType    = 'symbol' | 'emotion' | 'theme';
export type ResonanceLevel = 'signal' | 'resonance' | 'strong' | 'deep' | 'mirror';
export type AlertSeverity  = 'high' | 'medium';

export interface CollectiveSignal {
  id:                   string;
  icon:                 string;
  text:                 string;
  name:                 string;
  type:                 SignalType;
  count:                number;
  timeWindow:           string;
  relatedDreams:        number;
  dominantEmotion:      string;
  dominantEmotionColor: string;
  explanation:          string;
}

export interface EventMatch {
  id:               string;
  dreamSignal:      string;
  realEvent:        string;
  resonance:        number;
  level:            ResonanceLevel;
  dateRange:        string;
  matchingSymbols:  string[];
  matchingEmotions: string[];
  confidenceLevel:  string;
  explanation:      string;
}

export interface RealizedDream {
  id:               string;
  dreamDate:        string;
  eventDate:        string;
  dream:            string;
  event:            string;
  resonance:        number;
  level:            ResonanceLevel;
  timeGap:          string;
  matchingKeywords: string[];
}

export interface ResonanceAlert {
  id:       string;
  text:     string;
  severity: AlertSeverity;
  signalId: string;
}

export const LEVEL_COLOR: Record<string, string> = {
  signal:    '#60A5FA',
  resonance: '#A78BFA',
  strong:    '#6C63FF',
  deep:      '#F472B6',
  mirror:    '#FBBF24',
};

export const LEVEL_TR: Record<string, string> = {
  signal:    'Sinyal',
  resonance: 'Yankı',
  strong:    'Uyum',
  deep:      'Derin',
  mirror:    'Ayna',
};

export const SIGNAL_TYPE_TR: Record<SignalType, string> = {
  symbol:  'SEMBOL',
  emotion: 'DUYGU',
  theme:   'TEMA',
};

export const SIGNAL_TYPE_COLOR: Record<SignalType, string> = {
  symbol:  '#6C63FF',
  emotion: '#F87171',
  theme:   '#60A5FA',
};

export const COLLECTIVE_SIGNALS: CollectiveSignal[] = [
  {
    id: 's1', icon: '🌊', text: '14 kişi deniz sembolü gördü',
    name: 'Deniz Sembolü', type: 'symbol', count: 14, timeWindow: 'Son 48 saat',
    relatedDreams: 22, dominantEmotion: 'Kaygı', dominantEmotionColor: '#F87171',
    explanation: 'Deniz sembolü, bilinçaltında belirsizlik ve sınırları aşma arzusunu temsil eder. Bu kadar kısa sürede bu denli yüksek frekans, kolektif bir geçiş sürecine işaret edebilir. Denizi görmek çoğunlukla bilinçdışı duyguların yüzeye çıkışını simgeler.',
  },
  {
    id: 's2', icon: '🌅', text: '8 kişi kırmızı gökyüzü gördü',
    name: 'Kırmızı Gökyüzü', type: 'theme', count: 8, timeWindow: 'Son 48 saat',
    relatedDreams: 11, dominantEmotion: 'Dönüşüm', dominantEmotionColor: '#A78BFA',
    explanation: 'Kırmızı gökyüzü sembolü yoğun değişim, uyarı ve dönüşüm enerjisini taşır. Kolektif bilinçte bir kırılma noktasının yaklaştığını gösterebilir.',
  },
  {
    id: 's3', icon: '🚂', text: '11 kişi tren sembolü gördü',
    name: 'Tren Sembolü', type: 'symbol', count: 11, timeWindow: 'Son 48 saat',
    relatedDreams: 17, dominantEmotion: 'Merak', dominantEmotionColor: '#60A5FA',
    explanation: 'Tren, belirlenmiş bir yolda hareket etmeyi temsil eder. Bu sembolün ani yükselişi, kolektif planda bir yön veya kadere ilişkin paylaşılan kaygıyı gösterebilir.',
  },
  {
    id: 's4', icon: '😰', text: '9 kişi kaygı duygusu yaşadı',
    name: 'Kolektif Kaygı', type: 'emotion', count: 9, timeWindow: 'Son 48 saat',
    relatedDreams: 14, dominantEmotion: 'Kaygı', dominantEmotionColor: '#F87171',
    explanation: 'Kaygı duygusunun eş zamanlı yükselmesi, kolektif bilinçaltında ortak bir baskı kaynağına işaret edebilir. Bu tür duygusal konverjans nadiren tesadüf ürünüdür.',
  },
  {
    id: 's5', icon: '🔥', text: '6 kişi ateş sembolü gördü',
    name: 'Ateş Sembolü', type: 'symbol', count: 6, timeWindow: 'Son 48 saat',
    relatedDreams: 9, dominantEmotion: 'Dönüşüm', dominantEmotionColor: '#A78BFA',
    explanation: 'Ateş; yıkım ve yeniden doğuşun arketipsel sembolüdür. Bu frekans artışı, kolektif bir arınma veya kırılma dönemine girildiğini işaret edebilir.',
  },
  {
    id: 's6', icon: '💫', text: '7 kişi çöküş rüyası yaşadı',
    name: 'Çöküş Teması', type: 'theme', count: 7, timeWindow: 'Son 48 saat',
    relatedDreams: 10, dominantEmotion: 'Kaygı', dominantEmotionColor: '#F87171',
    explanation: 'Çöküş rüyaları, kontrol kaybı hissini ve mevcut dengelerin sarsıldığını yansıtır. Kolektif olarak gözlemlendiğinde, paylaşılan varoluşsal bir kırılganlığa işaret eder.',
  },
];

export const EVENT_MATCHES: EventMatch[] = [
  {
    id:               'e1',
    dreamSignal:      'Son 48 saatte 9 kullanıcı tren kazası sembolü gördü.',
    realEvent:        "Avrupa'da büyük tren kazası haberi yayınlandı.",
    resonance:        72,
    level:            'strong',
    dateRange:        '19–21 Haziran 2026',
    matchingSymbols:  ['Tren', 'Çarpışma', 'Yolculuk'],
    matchingEmotions: ['Kaygı', 'Şok'],
    confidenceLevel:  'Orta–Yüksek',
    explanation:      'Tren sembolü, çarpışma ve kaygı temaları son 48 saatte belirgin şekilde yükseldi. Bu örüntü gerçek dünya olaylarıyla orta-yüksek seviyede örtüşüyor. Sembolik benzerlik analizi olup nedensellik ilişkisi kurulamaz.',
  },
  {
    id:               'e2',
    dreamSignal:      'Son 72 saatte 6 kullanıcı sel felaketi rüyası gördü.',
    realEvent:        "Güney Asya'da şiddetli yağış ve sel uyarısı verildi.",
    resonance:        58,
    level:            'resonance',
    dateRange:        '18–21 Haziran 2026',
    matchingSymbols:  ['Deniz', 'Su', 'Sel'],
    matchingEmotions: ['Kaygı', 'Çaresizlik'],
    confidenceLevel:  'Orta',
    explanation:      'Su ve sel sembolleri yüksek frekansta gözlemlenirken bu dönemde bölgesel sel uyarıları verildi. Kolektif bilinçaltı, çevresel streslere karşı hassas olabilir.',
  },
];

export const REALIZED_DREAMS: RealizedDream[] = [
  {
    id: 'r1', dreamDate: '23 Haziran', eventDate: '27 Haziran',
    dream:    '"Eyfel yakınında düşen bir uçak gördüm."',
    event:    'Paris hava sahasında uçak acil inişi gerçekleşti.',
    resonance: 91, level: 'mirror', timeGap: '4 gün',
    matchingKeywords: ['Uçak', 'Düşüş', 'Paris', 'Hava'],
  },
  {
    id: 'r2', dreamDate: '11 Mayıs', eventDate: '14 Mayıs',
    dream:    '"İstanbul\'da çok şiddetli bir sallantı hissettim."',
    event:    "Ege'de 5.1 büyüklüğünde deprem meydana geldi.",
    resonance: 84, level: 'deep', timeGap: '3 gün',
    matchingKeywords: ['Deprem', 'Sallantı', 'Ege', 'İstanbul'],
  },
  {
    id: 'r3', dreamDate: '3 Nisan', eventDate: '6 Nisan',
    dream:    '"Büyük bir kalabalık nehir kenarında toplandı."',
    event:    "Avrupa'da nehir taşkınları binlerce kişiyi etkiledi.",
    resonance: 67, level: 'strong', timeGap: '3 gün',
    matchingKeywords: ['Nehir', 'Kalabalık', 'Su', 'Taşkın'],
  },
];

export const HIGH_RESONANCE_ALERTS: ResonanceAlert[] = [
  { id: 'a1', text: 'Son 24 saatte "deniz" sembolü yükseliyor.',               severity: 'high',   signalId: 's1' },
  { id: 'a2', text: '5 kullanıcı aynı temayı gördü.',                          severity: 'medium', signalId: 's3' },
  { id: 'a3', text: 'Bir rüyan güncel olaylarla eşleşebilir.',                 severity: 'medium', signalId: 's4' },
  { id: 'a4', text: '"Ateş" sembolü 3 gündür yüksek rezonans gösteriyor.',     severity: 'high',   signalId: 's5' },
];
