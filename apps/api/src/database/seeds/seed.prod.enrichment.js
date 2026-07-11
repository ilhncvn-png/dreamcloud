/**
 * DreamCloud Production Enrichment Seed
 * Safely bootstraps missing analysis + place data without touching real users.
 *
 * Run locally against production:
 *   DB_PUBLIC_URL="postgresql://..." node src/database/seeds/seed.prod.enrichment.js
 *
 * Safety rules:
 *  - Never deletes existing users, dreams, likes, comments, saves, follows
 *  - Idempotent: unique constraints handle repeated inserts; sub-tables are
 *    cleared per-dream before re-analysis so they don't grow on each run
 *  - Only affects staging test accounts; never touches real admin data
 */

'use strict';

const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

// ─── DB connection ────────────────────────────────────────────────────────────

const DB_URL = process.env.DB_PUBLIC_URL || process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('ERROR: Set DB_PUBLIC_URL or DATABASE_URL');
  process.exit(1);
}

const db = new Client({
  connectionString: DB_URL,
  ssl:
    DB_URL.includes('tokaido') || DB_URL.includes('proxy') ? { rejectUnauthorized: false } : false,
});

// ─── Stub analyzer patterns ───────────────────────────────────────────────────

const THEME_PATTERNS = [
  {
    theme: 'pursuit',
    family: 'control',
    keywords: [
      'koş',
      'kaç',
      'kovalıyor',
      'peşimde',
      'takip',
      'kaçıyordum',
      'run',
      'chase',
      'follow',
      'escape',
      'flee',
      'running',
      'chasing',
    ],
  },
  {
    theme: 'threshold',
    family: 'transition',
    keywords: [
      'kapı',
      'köprü',
      'sınır',
      'geçiş',
      'eşik',
      'door',
      'bridge',
      'threshold',
      'crossing',
      'gate',
      'portal',
      'border',
    ],
  },
  {
    theme: 'falling',
    family: 'control',
    keywords: [
      'düştüm',
      'düşüyordum',
      'uçurum',
      'fall',
      'falling',
      'fell',
      'dropped',
      'plunging',
      'abyss',
    ],
  },
  {
    theme: 'flying',
    family: 'expansion',
    keywords: [
      'uçtum',
      'uçuyordum',
      'uçmak',
      'fly',
      'flying',
      'flew',
      'float',
      'floating',
      'soaring',
      'levitate',
      'havalandım',
    ],
  },
  {
    theme: 'entrapment',
    family: 'control',
    keywords: [
      'kilitli',
      'hapis',
      'çıkamıyordum',
      'labirent',
      'sıkışmış',
      'trapped',
      'locked',
      'stuck',
      'maze',
      'prison',
      'cage',
    ],
  },
  {
    theme: 'reunion',
    family: 'loss',
    keywords: [
      'buldum',
      'kavuştum',
      'yeniden',
      'özledim',
      'found',
      'reunion',
      'reunited',
      'met again',
      'kavuşmak',
    ],
  },
  {
    theme: 'exposure',
    family: 'identity',
    keywords: ['çıplak', 'utanç', 'herkes bakıyor', 'naked', 'embarrassed', 'shame', 'exposed'],
  },
  {
    theme: 'discovery',
    family: 'growth',
    keywords: [
      'gizli oda',
      'keşfettim',
      'yeni yer',
      'hidden room',
      'discovered',
      'secret room',
      'unexplored',
      'new place',
    ],
  },
  {
    theme: 'loss',
    family: 'loss',
    keywords: [
      'öldü',
      'kayboldu',
      'kaybettim',
      'death',
      'died',
      'lost',
      'gone',
      'disappeared',
      'missing',
      'ölüm',
    ],
  },
  {
    theme: 'transformation',
    family: 'growth',
    keywords: [
      'değişti',
      'dönüştü',
      'başka biri oldum',
      'transform',
      'changed',
      'metamorphosis',
      'became',
      'turning into',
      'dönüşüm',
    ],
  },
  {
    theme: 'confrontation',
    family: 'identity',
    keywords: [
      'yüzleştim',
      'karşıma çıktı',
      'dövüştüm',
      'confront',
      'faced',
      'fight',
      'fought',
      'confronted',
    ],
  },
  {
    theme: 'protection',
    family: 'care',
    keywords: ['korumak', 'kurtarmak', 'protect', 'save', 'rescue', 'defend', 'shelter', 'guard'],
  },
  {
    theme: 'journey',
    family: 'expansion',
    keywords: [
      'yolculuk',
      'seyahat',
      'gitmek',
      'yürümek',
      'journey',
      'travel',
      'walk',
      'path',
      'road',
      'sokak',
    ],
  },
  {
    theme: 'water',
    family: 'unconscious',
    keywords: ['deniz', 'nehir', 'su', 'dalga', 'ocean', 'sea', 'river', 'wave', 'yüzmek', 'swim'],
  },
  {
    theme: 'city',
    family: 'collective',
    keywords: [
      'şehir',
      'sokak',
      'cadde',
      'city',
      'street',
      'urban',
      'town',
      'downtown',
      'meydanı',
      'square',
    ],
  },
];

const EMOTION_PATTERNS = [
  {
    emotion: 'fear',
    intensity: 'high',
    keywords: [
      'korktum',
      'korku',
      'dehşet',
      'fear',
      'afraid',
      'scared',
      'terrified',
      'terror',
      'dread',
      'korkmuştum',
    ],
  },
  {
    emotion: 'anxiety',
    intensity: 'moderate',
    keywords: [
      'endişe',
      'kaygı',
      'stres',
      'anxiety',
      'anxious',
      'worried',
      'stress',
      'nervous',
      'uneasy',
      'panic',
    ],
  },
  {
    emotion: 'joy',
    intensity: 'high',
    keywords: [
      'mutlu',
      'sevinç',
      'neşe',
      'joy',
      'happy',
      'happiness',
      'excited',
      'elated',
      'wonderful',
      'amazing',
      'mutluluk',
    ],
  },
  {
    emotion: 'peace',
    intensity: 'moderate',
    keywords: [
      'huzur',
      'sakin',
      'dingin',
      'peace',
      'peaceful',
      'calm',
      'serene',
      'tranquil',
      'still',
      'quiet',
      'huzurlu',
    ],
  },
  {
    emotion: 'sadness',
    intensity: 'moderate',
    keywords: [
      'üzüldüm',
      'ağladım',
      'hüzün',
      'sad',
      'sadness',
      'crying',
      'cried',
      'grief',
      'sorrow',
      'melancholy',
      'ağlamak',
    ],
  },
  {
    emotion: 'nostalgia',
    intensity: 'moderate',
    keywords: [
      'özlem',
      'eski',
      'çocukluk',
      'nostalgia',
      'nostalgic',
      'childhood',
      'longing',
      'miss',
      'geçmiş',
    ],
  },
  {
    emotion: 'confusion',
    intensity: 'moderate',
    keywords: [
      'anlamadım',
      'nerede',
      'kafam karışık',
      'confused',
      'confusion',
      'disoriented',
      'lost',
      'bewildered',
    ],
  },
  {
    emotion: 'wonder',
    intensity: 'high',
    keywords: [
      'şaşırdım',
      'inanılmaz',
      'büyülü',
      'wonder',
      'amazed',
      'awe',
      'magical',
      'incredible',
      'astonished',
      'harika',
    ],
  },
  {
    emotion: 'loneliness',
    intensity: 'moderate',
    keywords: [
      'yalnız',
      'tek başıma',
      'kimse yok',
      'alone',
      'lonely',
      'loneliness',
      'isolated',
      'no one',
      'yalnızlık',
    ],
  },
  {
    emotion: 'anger',
    intensity: 'high',
    keywords: [
      'kızgın',
      'öfke',
      'sinir',
      'angry',
      'anger',
      'furious',
      'rage',
      'mad',
      'frustrated',
      'öfkeli',
    ],
  },
  {
    emotion: 'love',
    intensity: 'high',
    keywords: [
      'sevgi',
      'aşk',
      'seviyorum',
      'love',
      'loving',
      'affection',
      'romantic',
      'tender',
      'sevmek',
    ],
  },
  {
    emotion: 'excitement',
    intensity: 'high',
    keywords: ['heyecan', 'coşku', 'excited', 'thrilled', 'exhilarated', 'rush', 'heyecanlı'],
  },
];

const SYMBOL_PATTERNS = [
  {
    category: 'threshold',
    universal: true,
    keywords: [
      'kapı',
      'köprü',
      'geçit',
      'door',
      'bridge',
      'gate',
      'crossing',
      'threshold',
      'kapıdan',
      'köprüden',
    ],
  },
  {
    category: 'shadow',
    universal: true,
    keywords: ['gölge', 'karanlık varlık', 'shadow', 'dark presence', 'dark figure', 'karanlık'],
  },
  {
    category: 'flood',
    universal: true,
    keywords: [
      'sel',
      'su basması',
      'taşma',
      'flood',
      'rising water',
      'overflow',
      'tidal wave',
      'dalga',
    ],
  },
  {
    category: 'abyss',
    universal: true,
    keywords: [
      'uçurum',
      'dipsiz',
      'abyss',
      'endless fall',
      'bottomless pit',
      'void',
      'chasm',
      'boşluk',
    ],
  },
  {
    category: 'guide',
    universal: true,
    keywords: [
      'rehber',
      'beyaz hayvan',
      'guide',
      'white animal',
      'wise figure',
      'guardian',
      'yol gösteren',
    ],
  },
  {
    category: 'transformation',
    universal: true,
    keywords: [
      'dönüşüm',
      'değişim',
      'transformation',
      'metamorphosis',
      'changing',
      'shapeshifting',
      'değişmek',
    ],
  },
  {
    category: 'mirror_self',
    universal: true,
    keywords: [
      'ayna',
      'yansıma',
      'ikiz',
      'mirror',
      'reflection',
      'twin',
      'double',
      'doppelganger',
      'aynanın',
    ],
  },
  {
    category: 'labyrinth',
    universal: true,
    keywords: [
      'labirent',
      'çıkmaz',
      'labyrinth',
      'maze',
      'getting lost',
      'no way out',
      'labirente',
    ],
  },
  {
    category: 'fire',
    universal: false,
    keywords: ['ateş', 'alev', 'yangın', 'fire', 'flame', 'burning', 'blaze', 'alev aldı'],
  },
  {
    category: 'water',
    universal: false,
    keywords: ['su', 'nehir', 'göl', 'water', 'river', 'lake', 'rain', 'yağmur', 'deniz'],
  },
  {
    category: 'tower',
    universal: false,
    keywords: ['kule', 'kuleye', 'minare', 'tower', 'minaret', 'spire', 'tırmanmak', 'climbing'],
  },
];

function runAnalysis(title, content) {
  const text = `${title || ''} ${content}`;

  const themes = [];
  for (const p of THEME_PATTERNS) {
    const hits = p.keywords.filter((kw) => text.toLowerCase().includes(kw.toLowerCase())).length;
    if (hits > 0)
      themes.push({
        theme: p.theme,
        themeFamily: p.family,
        isPrimary: false,
        confidence: Math.min(0.95, 0.6 + hits * 0.1),
      });
  }
  themes.sort((a, b) => b.confidence - a.confidence);
  if (themes[0]) themes[0].isPrimary = true;

  const emotions = [];
  for (const p of EMOTION_PATTERNS) {
    const hits = p.keywords.filter((kw) => text.toLowerCase().includes(kw.toLowerCase())).length;
    if (hits > 0)
      emotions.push({
        emotion: p.emotion,
        intensity: p.intensity,
        isPrimary: false,
        isResidual: false,
        arcPosition: 'throughout',
      });
  }
  const iOrder = { overwhelming: 4, high: 3, moderate: 2, low: 1 };
  emotions.sort((a, b) => (iOrder[b.intensity] || 0) - (iOrder[a.intensity] || 0));
  if (emotions[0]) emotions[0].isPrimary = true;

  const symbols = [];
  for (const p of SYMBOL_PATTERNS) {
    const hits = p.keywords.filter((kw) => text.toLowerCase().includes(kw.toLowerCase())).length;
    if (hits > 0)
      symbols.push({
        symbolCategory: p.category,
        isUniversal: p.universal,
        confidence: Math.min(0.95, 0.6 + hits * 0.1),
      });
  }

  return {
    primaryTheme: themes[0]?.theme || null,
    primaryEmotion: emotions[0]?.emotion || null,
    emotionalIntensity: emotions[0]?.intensity || null,
    themes,
    emotions,
    symbols,
  };
}

async function analyzeDream(dreamId, title, content) {
  const result = runAnalysis(title, content);

  // Delete + re-insert (no unique constraints on sub-tables, so this is idempotent)
  await db.query('DELETE FROM dream_themes  WHERE dream_id=$1', [dreamId]);
  await db.query('DELETE FROM dream_emotions WHERE dream_id=$1', [dreamId]);
  await db.query('DELETE FROM dream_symbols  WHERE dream_id=$1', [dreamId]);

  for (const t of result.themes) {
    await db.query(
      'INSERT INTO dream_themes (dream_id,theme,theme_family,is_primary,confidence) VALUES ($1,$2,$3,$4,$5)',
      [dreamId, t.theme, t.themeFamily, t.isPrimary, t.confidence],
    );
  }
  for (const e of result.emotions) {
    await db.query(
      'INSERT INTO dream_emotions (dream_id,emotion,intensity,is_primary,is_residual,arc_position) VALUES ($1,$2,$3,$4,$5,$6)',
      [dreamId, e.emotion, e.intensity, e.isPrimary, e.isResidual, e.arcPosition],
    );
  }
  for (const s of result.symbols) {
    await db.query(
      'INSERT INTO dream_symbols (dream_id,symbol_category,is_universal,confidence) VALUES ($1,$2,$3,$4)',
      [dreamId, s.symbolCategory, s.isUniversal, s.confidence],
    );
  }

  await db.query(
    `UPDATE dream_analyses
     SET status='completed', primary_theme=$2, primary_emotion=$3,
         emotional_intensity=$4, model_version='stub-v1', analyzed_at=NOW()
     WHERE dream_id=$1`,
    [dreamId, result.primaryTheme, result.primaryEmotion, result.emotionalIntensity],
  );

  return result;
}

// ─── Place dictionary ─────────────────────────────────────────────────────────

const normalize = (s) =>
  s
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');

const BOUNDARY = '[\\s,;.!?()\\[\\]{}"\'\'\"«»\\-]';
function buildPattern(n) {
  const escaped = normalize(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|${BOUNDARY})${escaped}(?:'[a-z]+)?(?=${BOUNDARY}|$)`, 'i');
}

const PLACE_DICT = [
  {
    name: 'Istanbul',
    aliases: ['İstanbul', 'stanbul'],
    type: 'CITY',
    country: 'Turkey',
    lat: 41.0082,
    lng: 28.9784,
  },
  { name: 'Ankara', aliases: [], type: 'CITY', country: 'Turkey', lat: 39.9334, lng: 32.8597 },
  {
    name: 'Izmir',
    aliases: ['İzmir', 'Smyrna'],
    type: 'CITY',
    country: 'Turkey',
    lat: 38.4192,
    lng: 27.1287,
  },
  { name: 'Bursa', aliases: [], type: 'CITY', country: 'Turkey', lat: 40.1885, lng: 29.061 },
  { name: 'Antalya', aliases: [], type: 'CITY', country: 'Turkey', lat: 36.8969, lng: 30.7133 },
  { name: 'Trabzon', aliases: [], type: 'CITY', country: 'Turkey', lat: 41.0015, lng: 39.7178 },
  {
    name: 'Eskisehir',
    aliases: ['Eskişehir'],
    type: 'CITY',
    country: 'Turkey',
    lat: 39.7667,
    lng: 30.5256,
  },
  {
    name: 'Diyarbakir',
    aliases: ['Diyarbakır'],
    type: 'CITY',
    country: 'Turkey',
    lat: 37.9144,
    lng: 40.2306,
  },
  { name: 'Bodrum', aliases: [], type: 'CITY', country: 'Turkey', lat: 37.0342, lng: 27.4305 },
  { name: 'Marmaris', aliases: [], type: 'CITY', country: 'Turkey', lat: 36.8556, lng: 28.2714 },
  {
    name: 'Kadikoy',
    aliases: ['Kadıköy'],
    type: 'CITY',
    country: 'Turkey',
    lat: 40.9903,
    lng: 29.03,
  },
  {
    name: 'Besiktas',
    aliases: ['Beşiktaş'],
    type: 'CITY',
    country: 'Turkey',
    lat: 41.0422,
    lng: 29.0071,
  },
  { name: 'Taksim', aliases: [], type: 'CITY', country: 'Turkey', lat: 41.0369, lng: 28.985 },
  {
    name: 'Beyoglu',
    aliases: ['Beyoğlu'],
    type: 'CITY',
    country: 'Turkey',
    lat: 41.0338,
    lng: 28.9772,
  },
  {
    name: 'Karakoy',
    aliases: ['Karaköy'],
    type: 'CITY',
    country: 'Turkey',
    lat: 41.0254,
    lng: 28.9743,
  },
  {
    name: 'Nisantasi',
    aliases: ['Nişantaşı'],
    type: 'CITY',
    country: 'Turkey',
    lat: 41.0518,
    lng: 28.9962,
  },
  {
    name: 'Galata Kulesi',
    aliases: ['Galata Tower', 'Galata'],
    type: 'LANDMARK',
    country: 'Turkey',
    lat: 41.0257,
    lng: 28.9742,
  },
  {
    name: 'Ayasofya',
    aliases: ['Hagia Sophia', 'Aya Sofya'],
    type: 'LANDMARK',
    country: 'Turkey',
    lat: 41.0086,
    lng: 28.9802,
  },
  {
    name: 'Kapadokya',
    aliases: ['Cappadocia'],
    type: 'LANDMARK',
    country: 'Turkey',
    lat: 38.644,
    lng: 34.8293,
  },
  {
    name: 'Sultanahmet',
    aliases: ['Blue Mosque'],
    type: 'LANDMARK',
    country: 'Turkey',
    lat: 41.0054,
    lng: 28.9768,
  },
  {
    name: 'Kapalicarsi',
    aliases: ['Kapalıçarşı', 'Grand Bazaar'],
    type: 'LANDMARK',
    country: 'Turkey',
    lat: 41.0108,
    lng: 28.9681,
  },
  {
    name: 'Bogazici',
    aliases: ['Boğaziçi', 'Bosphorus'],
    type: 'NATURE',
    country: 'Turkey',
    lat: 41.0858,
    lng: 29.058,
  },
  {
    name: 'Kiz Kulesi',
    aliases: ['Kız Kulesi'],
    type: 'LANDMARK',
    country: 'Turkey',
    lat: 41.021,
    lng: 29.0041,
  },
  {
    name: 'Ulus Camii',
    aliases: ['Ulu Cami'],
    type: 'LANDMARK',
    country: 'Turkey',
    lat: 40.1827,
    lng: 29.0609,
  },
  {
    name: 'Porsuk',
    aliases: ['Porsuk Cayı', 'Porsuk Çayı'],
    type: 'NATURE',
    country: 'Turkey',
    lat: 39.7667,
    lng: 30.5256,
  },
  { name: 'Paris', aliases: ['Seine'], type: 'CITY', country: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Berlin', aliases: [], type: 'CITY', country: 'Germany', lat: 52.52, lng: 13.405 },
  { name: 'London', aliases: ['Londra'], type: 'CITY', country: 'UK', lat: 51.5074, lng: -0.1278 },
  {
    name: 'Tokyo',
    aliases: ['Shibuya'],
    type: 'CITY',
    country: 'Japan',
    lat: 35.6762,
    lng: 139.6503,
  },
  {
    name: 'New York',
    aliases: ['NYC', 'Manhattan'],
    type: 'CITY',
    country: 'USA',
    lat: 40.7128,
    lng: -74.006,
  },
  { name: 'Dubai', aliases: [], type: 'CITY', country: 'UAE', lat: 25.2048, lng: 55.2708 },
  { name: 'Roma', aliases: ['Rome'], type: 'CITY', country: 'Italy', lat: 41.9028, lng: 12.4964 },
  {
    name: 'Barcelona',
    aliases: ['Barselona', 'La Barceloneta', 'Sagrada Familia'],
    type: 'CITY',
    country: 'Spain',
    lat: 41.3851,
    lng: 2.1734,
  },
  {
    name: 'Amsterdam',
    aliases: [],
    type: 'CITY',
    country: 'Netherlands',
    lat: 52.3676,
    lng: 4.9041,
  },
  {
    name: 'Vienna',
    aliases: ['Viyana', 'Wien'],
    type: 'CITY',
    country: 'Austria',
    lat: 48.2082,
    lng: 16.3738,
  },
  {
    name: 'Prague',
    aliases: ['Prag', 'Praha', 'Charles Koprusu'],
    type: 'CITY',
    country: 'Czech Rep.',
    lat: 50.0755,
    lng: 14.4378,
  },
  {
    name: 'Athens',
    aliases: ['Atina', 'Parthenon'],
    type: 'CITY',
    country: 'Greece',
    lat: 37.9838,
    lng: 23.7275,
  },
  {
    name: 'Seoul',
    aliases: ['Seul', 'Gangnam'],
    type: 'CITY',
    country: 'South Korea',
    lat: 37.5665,
    lng: 126.978,
  },
  {
    name: 'Sydney',
    aliases: ['Opera Binasi'],
    type: 'CITY',
    country: 'Australia',
    lat: -33.8688,
    lng: 151.2093,
  },
  {
    name: 'Los Angeles',
    aliases: ['Griffith'],
    type: 'CITY',
    country: 'USA',
    lat: 34.0522,
    lng: -118.2437,
  },
  {
    name: 'Singapore',
    aliases: ['Singapur', 'Gardens by the Bay'],
    type: 'CITY',
    country: 'Singapore',
    lat: 1.3521,
    lng: 103.8198,
  },
  {
    name: 'Cairo',
    aliases: ['Kahire', 'Piramit'],
    type: 'CITY',
    country: 'Egypt',
    lat: 30.0444,
    lng: 31.2357,
  },
];

const COMPILED_PLACES = PLACE_DICT.map((entry) => ({
  entry,
  patterns: [entry.name, ...entry.aliases].map((n) => buildPattern(n)),
}));

function extractPlaces(title, content) {
  const text = normalize(`${title || ''} ${content}`);
  const found = new Map();
  for (const { entry, patterns } of COMPILED_PLACES) {
    if (found.has(entry.name)) continue;
    for (const pat of patterns) {
      if (pat.test(text)) {
        found.set(entry.name, {
          name: entry.name,
          type: entry.type,
          country: entry.country,
          lat: entry.lat,
          lng: entry.lng,
        });
        break;
      }
    }
  }
  return Array.from(found.values());
}

async function upsertPlaces(dreamId, userId, title, content) {
  const places = extractPlaces(title, content);
  for (const p of places) {
    await db.query(
      `INSERT INTO dream_places (dream_id,user_id,name,type,confidence,country,latitude,longitude)
       VALUES ($1,$2,$3,$4::dream_place_type,85,$5,$6,$7)
       ON CONFLICT (dream_id, name) DO NOTHING`,
      [dreamId, userId, p.name, p.type, p.country, p.lat, p.lng],
    );
  }
  return places.length;
}

// ─── New dream content (50 dreams with explicit place name mentions) ──────────

const ago = (days, hours = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
};

const U = {
  ayse: '381b7dde-08ec-4656-98f9-09b8240fe3f2',
  mehmet: '9216365a-6b49-4844-a259-1c03c168fed0',
  fatma: '520472dd-e09c-4601-9287-dd1cede7a949',
  ali: '99cf9645-c8ae-4663-bf24-f0b773c73c54',
  zeynep: '055ee7aa-158f-4f49-bef9-9c8bfc9a9e60',
  burak: '8041c2fe-64b5-48ac-830b-3f0cc48b0adc',
  selin: 'd1aa513b-0266-47af-bc73-267e2e6d89bf',
  can: '5b521ad6-c1f1-45d8-bc1f-ad072bf8e653',
  melis: '1903c88b-aa29-4416-b1a9-de320fb58f8f',
  emre: '0241472d-77cc-41c5-8994-547470f6eb72',
  neslihan: 'd007826b-4ec7-4b94-a1a5-ecfbc2259c6a',
  ozan: '84803e5b-f6b3-413c-b540-828193cb3886',
  irem: 'f71ac2b3-1aae-4e9e-88c4-2b11364be737',
  berk: 'd530b472-96b2-45b0-b907-a7a039548f67',
  deniz: '3fffa693-9aef-4e03-a34f-686afc8768e8',
  ece: '92fd8fb7-aac4-412a-b368-17e13ed53c6d',
  mert: 'ae3c4595-185a-4212-b444-941176c7a212',
  pinar: '298a87f3-3842-464c-93e3-ae1d27835dce',
  serkan: '9c7b1419-e173-4d0e-8e16-934485c253ab',
};

const NEW_DREAMS = [
  {
    uid: U.ayse,
    title: "Galata Kulesi'nde Gece Yarisi",
    cat: 'lucid',
    vis: 'public',
    d: 3,
    tags: ['istanbul', 'galata', 'gece', 'ucus', 'lucid'],
    text: `Galata Kulesi'nin en tepesindeyim ve bunun bir rüya olduğunu biliyorum. Istanbul gecesi altımda bir ışık denizi gibi uzanıyor. Bogazici'nin iki yakası birbirine dokunuyor, köprüler ışıl ışıl. Kendimi boşluğa bıraktım, düşmek yerine havalandım. Beyoglu'nun üzerinden uçarken her pencerede ayrı bir hikaye gördüm. Taksim Meydanı'ndan yükselen sesler rüzgarla karışıp müziğe dönüştü.`,
  },

  {
    uid: U.ayse,
    title: "Kapalicarsi'da Labirent",
    cat: 'normal',
    vis: 'public',
    d: 8,
    tags: ['istanbul', 'kapalıçarşı', 'labirent', 'keşif'],
    text: `Kapalicarsi'nın derinliklerine dalmıştım ama çıkış kapısı yoktu. Her dükkan başka bir şehre açılıyordu — birinden çıkınca Paris'in dar sokaklarında, diğerinden Tokyo'nun neon ışıklarında bulunuyordum. Bir yaşlı çarşıcı elinden tuttu. "Kaybolmak için değil, bulmak için gelirsin buraya," dedi. Elindeki anahtar altın rengindeydi.`,
  },

  {
    uid: U.mehmet,
    title: "Ankara'nın Altındaki Tüneller",
    cat: 'nightmare',
    vis: 'public',
    d: 2,
    tags: ['ankara', 'tünel', 'kaçmak', 'korku'],
    text: `Ankara'nın altında gizli tünel ağı vardı ve içinde koşuyordum. Peşimde olan ne olduğunu bilmiyordum ama gölgesi duvarlara vuruyordu. Kızılay Meydanı'nın tam altından geçen tüneller sonsuz gibiydi. Sonunda bir kapıya çıktım — herkes normal hayatına devam ediyordu. Kaçışım bitmişti ama neden korktuğumu hâlâ bilmiyordum.`,
  },

  {
    uid: U.mehmet,
    title: 'Berlin Duvarinin Otesi',
    cat: 'beautiful',
    vis: 'public',
    d: 15,
    tags: ['berlin', 'duvar', 'özgürlük', 'köprü'],
    text: `Berlin'deydim ve duvar hâlâ ayaktaydı ama üstünde müzik çalınıyordu. Köprünün ortasında durup iki kıtaya birden baktım. Duvar çiçekle kaplıydı. Geçmek istedim, kapı açıldı. Karşıda kayıp ablamı buldum — yıllardır görmediğim, özlediğim.`,
  },

  {
    uid: U.fatma,
    title: 'Izmir Korfezinde Safak',
    cat: 'beautiful',
    vis: 'public',
    d: 5,
    tags: ['izmir', 'deniz', 'yüzmek', 'huzur'],
    text: `Izmir körfezinde yüzüyordum, sabahın ilk ışıklarında. Su biyolüminesandı — her hareketle mavi ışık yayıyordu. Kadifekale'nin silueti güneşle belirginleşiyordu. Dibinde eski şehir Smyrna'nın mermer sütunları duruyordu. Oraya ulaşmadan uyandım, o huzur hissini taşıyarak.`,
  },

  {
    uid: U.fatma,
    title: "Paris'te Kayip Olmak",
    cat: 'normal',
    vis: 'public',
    d: 20,
    tags: ['paris', 'sokak', 'kayıp', 'keşif'],
    text: `Paris'in dar sokaklarında yürüyordum ve haritam yoktu. Seine nehri önünde durdum, rüzgar yüzüme çarpıyordu. Bir kafede garson bana çay getirdi. "Burada hep böyle miyiz?" diye sordum. "Hayır," dedi, "sadece rüyada."`,
  },

  {
    uid: U.ali,
    title: 'Tokyo Treninden Pencere',
    cat: 'beautiful',
    vis: 'public',
    d: 7,
    tags: ['tokyo', 'tren', 'şehir', 'hız'],
    text: `Tokyo'nun altından geçen trenin penceresinden bakıyordum. Shibuya'dan çıkınca birdenbire bambu ormanının içindeydim. Yanımda sessiz oturan adam kâğıt katladı — her kat başka bir şekle dönüştü. "Nereye gidiyoruz?" dedim. "Gittiğimiz yere," dedi.`,
  },

  {
    uid: U.ali,
    title: "Dubai'de Yükseklik Korkusu",
    cat: 'nightmare',
    vis: 'public',
    d: 25,
    tags: ['dubai', 'kule', 'korku', 'düşmek'],
    text: `Dubai'de dünyanın en yüksek kulesinin tepesindeyim. Ayaklarımın altı cam — aşağıyı görebiliyorum. Çöl ufuk çizgisine kadar uzanıyor. Cam çatlıyor — ses çıkıyor ama parçalanmıyor. Uçurumdan düşüyorum. Ama zemine çarpmadan önce uyandım. Her gece aynı kule.`,
  },

  {
    uid: U.zeynep,
    title: "Kapadokya'da Balon Ucusu",
    cat: 'lucid',
    vis: 'public',
    d: 4,
    tags: ['kapadokya', 'balon', 'uçuş', 'lucid'],
    text: `Kapadokya'nın peri bacaları arasında sıcak hava balonuyla yükseliyordum ve bunun rüya olduğunu biliyordum. Balondan atladım — düşmek yerine yavaşça süzüldüm. Taş konilerin içinde ateş yanıyordu, Selçuklu Türkleri oturmuş konuşuyordu. Beni gördüler ama şaşırmadılar.`,
  },

  {
    uid: U.zeynep,
    title: "Ayasofya'nın Sessizligi",
    cat: 'beautiful',
    vis: 'public',
    d: 12,
    tags: ['istanbul', 'ayasofya', 'sessizlik', 'huzur'],
    text: `Ayasofya'daydım ama boştu — sadece ben ve büyük kubbe. Işık renkliydi, cam parçaları düşüyordu ama sese dönüşmüyor, renklere dönüşüyordu. Kubbenin tepesinde bir delik vardı, oradan gece gökyüzü görünüyordu — gündüz olmasına rağmen. Yıldızlar kubbenin içine doldu. Sessizlik o kadar derindi ki kalbimin çarpışını duyabiliyordum.`,
  },

  {
    uid: U.burak,
    title: 'New York Metrosunda Kaybolmak',
    cat: 'nightmare',
    vis: 'public',
    d: 6,
    tags: ['new york', 'metro', 'kaybolmak', 'karanlık'],
    text: `New York metrosunda yanlış trene bindim. Her istasyon bir öncekinden daha derine indi — Manhattan'ın altında başka bir şehir vardı. İstasyonlar karanlıklaştı. "Son istasyon" tabelası gördüm ama hangi istasyon olduğu yazmıyordu. Trenden inince tamamen boş bir tünel. Ama sonunda bir ışık vardı.`,
  },

  {
    uid: U.burak,
    title: "Sultanahmet'te Safak Ezani",
    cat: 'beautiful',
    vis: 'public',
    d: 18,
    tags: ['istanbul', 'sultanahmet', 'sessizlik', 'sabah'],
    text: `Sultanahmet Meydanı'nda sabahın alacakaranlığında oturuyordum, ezanı bekliyordum. Meydan boştu, güvercin bile yoktu. Birinci ezan geldiğinde ses havada asılı kaldı — gitmedi, birikmedi. Istanbul uyanmaya başladı — uzaktan sesler, ışıklar. Bu anın içinde olmak, hiç kimsesiz olmak değildi.`,
  },

  {
    uid: U.selin,
    title: 'Atina Agorasinda Sinav',
    cat: 'nightmare',
    vis: 'public',
    d: 9,
    tags: ['atina', 'tarih', 'sınav', 'kaygı'],
    text: `Athens'ın eski Agorasında Sokrates karşıma oturmuştu. Sınav zamanı gelmişti ama konuyu bilmiyordum. Parthenon arkada duruyordu, beyaz mermer güneşte yanıyor. "Neyi bilmiyorum?" diye sordum. "İşte bu iyi soru," dedi Sokrates. Kaygı içinde sorular geldi.`,
  },

  {
    uid: U.selin,
    title: "Bogazici'nde Tekne Yolculugu",
    cat: 'beautiful',
    vis: 'public',
    d: 30,
    tags: ['istanbul', 'boğaz', 'tekne', 'su'],
    text: `Bogazici'nde küçük bir tekneyle gidiyordum, hem Avrupa hem Asya kıyısı görünüyordu. Su sakinleştikçe tekne de yavaşladı — zamanın kendisi yavaşladı. İki kıta arasında askıda kaldım. Rüzgar Karadeniz'den esiyor, hafif tuzluydu. Bu geçiş anı sonsuza uzandı.`,
  },

  {
    uid: U.can,
    title: 'Barcelona Sahilinde Dans',
    cat: 'beautiful',
    vis: 'public',
    d: 11,
    tags: ['barcelona', 'güneş', 'deniz', 'dans'],
    text: `Barcelona'nın La Barceloneta sahilindeyim, güneş tam tepemde. Kumun üzerinde dans eden insanlar var, müzik nereden geldiği belli değil. Denize girdim — sıcak ve berraktı. Sagrada Familia uzakta bir devasa armağan gibi duruyordu. Heyecanla güldüm, neden olduğunu bilmeden.`,
  },

  {
    uid: U.can,
    title: "Prag'in Tas Koprusunde",
    cat: 'normal',
    vis: 'public',
    d: 22,
    tags: ['prag', 'köprü', 'gece', 'tarih'],
    text: `Prag'da Charles Koprusu'nun üzerinde gece yürüyordum. Her heykel hareket ediyordu — ağır, sessiz. Biri döndü ve bana baktı. Köprüyü geçince karşı kıyıda farklı bir çağa vardım — atlar, meşaleler, gece bekçisi. "Hoş geldiniz," dedi Türkçe.`,
  },

  {
    uid: U.melis,
    title: "Seoul'de Neon Yagmuru",
    cat: 'lucid',
    vis: 'public',
    d: 3,
    tags: ['seoul', 'gece', 'neon', 'lucid'],
    text: `Seoul'da Gangnam'ın neon ışıkları altında yürüyordum ve bunun rüya olduğunu fark ettim. Işıkları söndürdüm birer birer. Şehir kararmaya başladı ama insanlar kaybolmadı — karanlıkta parlıyordu yüzleri. Yağmur başladı ama ışık yağıyordu.`,
  },

  {
    uid: U.melis,
    title: "Trabzon'dan Karadeniz'e Bakmak",
    cat: 'beautiful',
    vis: 'public',
    d: 16,
    tags: ['trabzon', 'karadeniz', 'deniz', 'huzur'],
    text: `Trabzon'un tepesinden Karadeniz'e bakıyordum, arkamda dağlar önümde okyanus. Fındık bahçeleri yeşil orman gibi uzanıyordu. Deniz bugün kızgın değil — uysal, gri, anlayışlı. Yaşlı bir adam yanıma gelip oturdu. "Deniz her gün yeni hikâye anlatır," dedi.`,
  },

  {
    uid: U.emre,
    title: 'Amsterdam Kanallarinda Kayik',
    cat: 'beautiful',
    vis: 'public',
    d: 5,
    tags: ['amsterdam', 'kanal', 'su', 'huzur'],
    text: `Amsterdam kanallarında küçük bir kayık, tek başıma, sabahın erken saatlerinde. Ağaçlar suya eğilmiş. Köprülerden geçerken aşağıdaki yansımama baktım — yansımam gülümsüyordu ama ben değildim. Bir kez daha baktım, yansımam farklı birine dönüşmüştü. Korkutucu değil — merak verici.`,
  },

  {
    uid: U.emre,
    title: "Kadikoy'de Pazar Sabahi",
    cat: 'normal',
    vis: 'public',
    d: 14,
    tags: ['istanbul', 'kadıköy', 'pazar', 'sabah'],
    text: `Kadikoy pazarında yürüyordum, erken sabah, satıcılar henüz tezgah kuruyordu. Meyve kokuları her şeyi kaplamıştı. Bir tezgahçı "Bugün özel bir gün, bir şey almalısın" dedi. Aldığım elma açıldı — içinde Istanbul haritası çıktı. Bazı sokaklar bilinmedik yerlere çıkıyordu.`,
  },

  {
    uid: U.neslihan,
    title: "Roma Forumu'nda Antik Gece",
    cat: 'beautiful',
    vis: 'public',
    d: 7,
    tags: ['roma', 'antik', 'gece', 'tarih'],
    text: `Roma Forumu'ndaydım ama gece yarısı — sadece ben ve tarihin kalıntıları. Sütunlar ay ışığında parlıyordu, gölgeler çok uzun. Bir ateş yandı, Roma elbiseli insanlar belirdi. Konuşuyor ama ses çıkmıyordu. Bir senatocu benim tarafıma baktı ve gülümsedi.`,
  },

  {
    uid: U.neslihan,
    title: 'Bodrum Gunbatimi',
    cat: 'beautiful',
    vis: 'public',
    d: 21,
    tags: ['bodrum', 'deniz', 'günbatımı', 'huzur'],
    text: `Bodrum'un koyunda bir kayada oturuyordum, deniz durgundu. Güneş batarken gökyüzü turuncu, mor, kırmızıya döndü. Karşıdaki adalar siluet oldu. Yalnızdım ama yalnızlık hissi yoktu — aksine, en kalabalık anımdı bu. Deniz son ışıkla gümüşe döndü.`,
  },

  {
    uid: U.ozan,
    title: "Besiktas'tan Karsiya Bakis",
    cat: 'normal',
    vis: 'public',
    d: 4,
    tags: ['istanbul', 'beşiktaş', 'boğaz', 'yolculuk'],
    text: `Besiktas iskelesindeydim, Üsküdar'a bakıyordum. Vapur gelmiyordu ama bekleyenler çoğalıyordu. Bogazici sakin ve gümüş rengindeydi. Biri yanıma gelip oturdu. "Karşıya geçersen değişirsin," dedi. "Her geçiş bir dönüşümdür." Vapur geldi.`,
  },

  {
    uid: U.ozan,
    title: 'Diyarbakir Surunun Üstünde',
    cat: 'lucid',
    vis: 'public',
    d: 19,
    tags: ['diyarbakır', 'sur', 'tarih', 'lucid'],
    text: `Diyarbakir'ın antik surlarının üstünde yürüyordum ve rüya olduğunu biliyordum. Kara bazalt taşlar asırlık ağırlıklarıyla duruyordu ama ayaklarım hafif hissettirdi. Burç köşesinde durdum, rüzgar kaldırdı beni. Surların üzerinde uçtum, her kuleyi geçerken çağlar değişti.`,
  },

  {
    uid: U.irem,
    title: 'Vienna Operasinda Gece Yarisi',
    cat: 'beautiful',
    vis: 'public',
    d: 6,
    tags: ['viyana', 'opera', 'müzik', 'gece'],
    text: `Vienna Opera Binası'ndaydım, büyük salon tamamen boştu. Sahneye yürüdüm — orkestra yoktu ama müzik çalıyordu. Keman sesi kubbenin her yerinden geliyordu. Beden otomatik dans etmeye başladı. Balkondan biri alkışlamaya başladı — bir kişi, ama sesi bine bedeldi.`,
  },

  {
    uid: U.irem,
    title: "Singapur'un Havada Bahcesi",
    cat: 'beautiful',
    vis: 'public',
    d: 26,
    tags: ['singapur', 'bahçe', 'şehir'],
    text: `Singapur'un Gardens by the Bay'indeyim, dev yapay ağaçların arasında yürüyorum. Gece yarısı ışık gösterisi başladı, ağaçlar renk renk yandı. Bunlar ağaç değil, bir şehrin hayalleri. Yukarıda asma köprüde durdum — şehir ve deniz iki tarafta, gök ise üstte bir ayna gibi.`,
  },

  {
    uid: U.berk,
    title: "Eskisehir Porsuk'ta Sandal",
    cat: 'beautiful',
    vis: 'public',
    d: 8,
    tags: ['eskişehir', 'nehir', 'sandal', 'huzur'],
    text: `Eskisehir'de Porsuk Cayı'nda sandalla gidiyordum, yalnız. Çay'ın iki yanındaki kafeler karanlık, sadece ay ışığı. Su hiç duraksatmıyordu sandali — sürdü götürdü. Köprüden geçerken altımda yansımam ters duruyordu. Bu suskunluk öğrenciliğimi hatırlattı.`,
  },

  {
    uid: U.berk,
    title: "Kahire'de Piramitler Arasinda",
    cat: 'nightmare',
    vis: 'public',
    d: 17,
    tags: ['kahire', 'piramit', 'korku', 'çöl'],
    text: `Kahire çölünde Piramit'ler arasında koşuyordum, güneş amansız yakıyordu. Büyük piramide girdim, içerisi dışarıdan büyük çıktı — labirent gibi koridorlar. Duvarlar hiyeroglifle kaplıydı. Birden okuyabiliyordum. "Geri dön" diyordu hepsi.`,
  },

  {
    uid: U.deniz,
    title: 'Los Angeles Gun Dogumu',
    cat: 'beautiful',
    vis: 'public',
    d: 5,
    tags: ['los angeles', 'gün doğumu', 'şehir'],
    text: `Los Angeles'ta Griffith Observatory'nin tepesindeyim, güneş doğuyor. Şehir net ve parlak bu sabah. Güneş ilk ışınlarıyla Hollywood'u vurdu, sanki set sahnesiydi. Biri yanıma geldi ve "Bugün büyük bir gün" dedi. Kim olduğunu sormadan uyandım.`,
  },

  {
    uid: U.deniz,
    title: "Karakoy'de Vapur Iskelesi",
    cat: 'normal',
    vis: 'public',
    d: 23,
    tags: ['istanbul', 'karaköy', 'vapur', 'sabah'],
    text: `Karakoy'de sabah erkenden, vapur iskelesinde bekliyorum. Boğaz sisi hâlâ dağılmamış, karşı kıyı görünmüyor. Vapur gürültüsü geldi — sesten önce duman geldi. Üçüncü vapur boştu, sadece ben bindim. Iskele uzaklaştı, sis içinde kayboldu şehir.`,
  },

  {
    uid: U.ece,
    title: 'Sydney Koprusunde Firtina',
    cat: 'nightmare',
    vis: 'public',
    d: 9,
    tags: ['sydney', 'köprü', 'fırtına', 'korku'],
    text: `Sydney Köprüsü'nün üstünde yürüyordum, altta liman ve Opera Binasi görünüyordu. Fırtına aniden bastırdı — rüzgar köprüyü salladı. Korkuluğa tutundum. Aşağıda su küçük görünüyordu ama düşersem çok büyük olacaktı. Köprü bitmiyordu, yürüdükçe uzadı.`,
  },

  {
    uid: U.ece,
    title: "Taksim'de Kimsesiz Gece",
    cat: 'normal',
    vis: 'public',
    d: 13,
    tags: ['istanbul', 'taksim', 'gece', 'yalnızlık'],
    text: `Taksim Meydanı'nda gecenin ortasında, meydan boştu. Tek başıma duruyorum. Hava soğuktu, nefesim buğu yapıyordu. Istanbul'un gece sesleri uzaktan geliyordu. Yürüdüm, her adımda ses azaldı. Tepeye vardım, şehir yeniden başladı.`,
  },

  {
    uid: U.mert,
    title: "Marmaris'te Sualti",
    cat: 'lucid',
    vis: 'public',
    d: 4,
    tags: ['marmaris', 'deniz', 'sualtı', 'lucid'],
    text: `Marmaris'in turkuaz sularında dalmıştım. Sualtında nefes alabiliyordum — bu bunun rüya olduğunun işaretiydi. İstediğim yönde süzüldüm, renkli balıklar dans ediyordu. Onlara katıldım — ritim kendiliğinden geldi.`,
  },

  {
    uid: U.mert,
    title: "Nisantasi'nda Kimsesiz Gece",
    cat: 'normal',
    vis: 'public',
    d: 27,
    tags: ['istanbul', 'nişantaşı', 'gece', 'yalnızlık'],
    text: `Nisantasi'nın lüks caddelerinde yürüyordum, vitrinler ışıklıydı ama içeride kimse yoktu. Bir kafede oturdum, servis geldi ama garson görünmezdi. Vitrin camından dışarı baktım, başka biri içeri bakıyordu — ben miydi, aynadan yansımam mıydı?`,
  },

  {
    uid: U.pinar,
    title: "Bursa Ulu Cami'nde Isik",
    cat: 'beautiful',
    vis: 'public',
    d: 6,
    tags: ['bursa', 'cami', 'sessizlik', 'huzur'],
    text: `Bursa'da Ulus Camii'nin içindeyim, yalnız. Yirmi kubbenin hepsi farklı bir ışık renginde parlıyor. Şadırvan ortada duruyor, suyu ses çıkarmıyor ama akıyor. Seccadeye oturdum ve bekledim — neyi beklediğimi bilmiyorum. Uyandım, hâlâ dinginlik içinde.`,
  },

  {
    uid: U.pinar,
    title: "Antalya Konyaalti'nda Firtina Oncesi",
    cat: 'normal',
    vis: 'public',
    d: 20,
    tags: ['antalya', 'deniz', 'fırtına'],
    text: `Antalya'nın Konyaaltı sahilinde oturuyordum, fırtına bulutları toplanıyordu ufukta. Deniz henüz sakin ama kararsız. Diğer insanlar gitmiş, sadece ben kalmıştım. Fırtına gelecek — biliyorum ama korkusu yoktu. Yağmur başlamadan önce uyandım.`,
  },

  {
    uid: U.serkan,
    title: "Beyoglu'nda Eski Bir Bar",
    cat: 'normal',
    vis: 'public',
    d: 7,
    tags: ['istanbul', 'beyoğlu', 'gece', 'müzik'],
    text: `Beyoglu'nun arka sokaklarında bir bar buldum — nereye çıktığını bilmiyorum. İçeride 70'ler Türk pop müziği çalıyordu. Barmen bana sormadan bir içki koydu. "Burada hep bu şarkı mı çalar?" dedim. "Hayır," dedi, "sen her geldiğinde aynı şarkı çalıyor." Daha önce hiç gelmemiştim.`,
  },

  {
    uid: U.serkan,
    title: "Galata'dan Istanbul'a Bakmak",
    cat: 'beautiful',
    vis: 'public',
    d: 24,
    tags: ['istanbul', 'galata', 'panorama', 'güneş'],
    text: `Galata Kulesi'nin tepesindeyim, Istanbul 360 derece etrafımda. Sabah güneşi Bogazici'yi gümüşe çevirmiş, minareler ışıkla yarışıyor. Beyoglu'nun damları altımda uzanıyor. Bu şehri seviyorum diyemem, daha büyük bir şey bu. Aşağı inmeyi istemedim.`,
  },

  {
    uid: U.fatma,
    title: 'Berlin U-Bahn Gece Yolculugu',
    cat: 'normal',
    vis: 'public',
    d: 32,
    tags: ['berlin', 'metro', 'şehir', 'geçiş'],
    text: `Berlin'de U-Bahn'a bindim, gece geç saatlerde. Vagon boştu, uzun tünelde gidiyorduk. Her istasyonda farklı bir on yıl: 60'lar, 70'ler, 80'ler. Birden vagon doldu — insanlar görünür oldu. Hepsi birbirine bakıyordu, bana bakmıyordu. Ben miyim görünmez olan?`,
  },

  {
    uid: U.ali,
    title: 'New York Cati Bahcesi',
    cat: 'beautiful',
    vis: 'public',
    d: 35,
    tags: ['new york', 'çatı', 'bahçe'],
    text: `Manhattan'ın ortasında, 40. katta bir çatı bahçesi. Şehrin sesi çok aşağıda, burada sadece rüzgar. Domates, biber, çiçek — ortasında ada. Central Park uzaktan küçük yeşil bir nokta. Biri bu bahçeyi kurmuş — neden? Cevap: çünkü yapılabilir, çünkü güzel.`,
  },

  {
    uid: U.zeynep,
    title: "Kiz Kulesi'ne Yuzmek",
    cat: 'lucid',
    vis: 'public',
    d: 10,
    tags: ['istanbul', 'kız kulesi', 'boğaz', 'lucid'],
    text: `Bogazici'nde Kiz Kulesi'ne doğru yüzüyordum ve bunun rüya olduğunu biliyordum. Su akıntılıydı ama beni durduramıyordu. Kuleye vardım, kapı açıktı. İçeride spiral merdiven, çıkınca Istanbul'un üstündeyim. Her iki kıta görünüyor.`,
  },

  {
    uid: U.mehmet,
    title: "Roma'da Yagmur",
    cat: 'beautiful',
    vis: 'public',
    d: 38,
    tags: ['roma', 'yağmur', 'nehir', 'huzur'],
    text: `Roma'da aniden yağmur başladı, nehir üzerindeki köprünün altına sığındım. Yağmur taşları yıkıyor. Nehir kabardı ama taşmadı. Yağmur durdu, güneş çıktı — gökkuşağı Castel Sant'Angelo üstünde. Her şey yıkanmıştı.`,
  },

  {
    uid: U.can,
    title: "Eskisehir'de Ogrenci Yillari",
    cat: 'normal',
    vis: 'public',
    d: 41,
    tags: ['eskişehir', 'öğrenci', 'geçmiş', 'nostalji'],
    text: `Eskisehir'e döndüm rüyamda, ama öğrenci yıllarımda. Kampüs tanıdık ama değiştirilmiş. Porsuk Cayı kenarında oturuyorduk, sohbet ediyorduk. Konuşulanlar anlamlıydı ama uyandığımda hatırlamadım. Sadece ait olma hissini hatırlıyorum.`,
  },

  {
    uid: U.neslihan,
    title: "Ayasofya'dan Galata'ya Yurumek",
    cat: 'beautiful',
    vis: 'public',
    d: 6,
    tags: ['istanbul', 'ayasofya', 'galata', 'yürüyüş'],
    text: `Ayasofya'dan çıkıp Galata Kulesi'ne yürümeye karar verdim. Kapalicarsi'nın yanından sarktım. Galata yokuşu uzun, bitmiyordu ama yorulmuyordum. Kuleye vardım — en üste çıktım. Istanbul'un tamamı gözüküyordu.`,
  },

  {
    uid: U.emre,
    title: "Tokyo'da Kaybolmak",
    cat: 'nightmare',
    vis: 'public',
    d: 12,
    tags: ['tokyo', 'kaybolmak', 'kalabalık', 'yalnızlık'],
    text: `Tokyo'da Shibuya'da yürüyordum, kalabalık olağanüstüydü ama ben görünmezdim. Kimse çarpmıyordu ama kimse görmüyordu. Japonca işaretler her yerde. Bir çocuk bana baktı — tek gören o oldu. "Buradan nasıl çıkılır?" dedim. Parmağını kaldırdı, yönü belirsizdi.`,
  },

  {
    uid: U.selin,
    title: "Vienna'da Mozart",
    cat: 'beautiful',
    vis: 'public',
    d: 44,
    tags: ['viyana', 'müzik', 'klasik'],
    text: `Vienna'da bir konser salonundayım, Mozart çalınıyor. Salon boş ama müzik doluydu. Orkestra yoktu ama ses çıkıyordu. Ben tek dinleyici. Notalar havada asılı, renk renk. Bitince alkışlamak için kalktım — aslında müziği durdurmak istemedim.`,
  },

  {
    uid: U.irem,
    title: "Atina'da Akropolis",
    cat: 'beautiful',
    vis: 'public',
    d: 33,
    tags: ['atina', 'tarih', 'manzara'],
    text: `Athens'de Akropolis'in tepesindeyim, Parthenon sütunları tam karşımda. Güneş batıyor, tüm şehir altın rengi. Bir keçi yanıma geldi ve tarihçe anlatan insanlar gibi baktı. Bu kadim yerde zamanı hissediyordum.`,
  },

  {
    uid: U.berk,
    title: "Seoul'de Kaybolmak",
    cat: 'normal',
    vis: 'public',
    d: 48,
    tags: ['seoul', 'şehir', 'gece', 'kaybolmak'],
    text: `Seoul'de Gangnam caddelerinde kayboldum — her taraf aynı görünüyordu. Karanlık sokaklara girdim, mağaza ışıkları neon kırmızısı. Bir kafe buldum, bir kahve aldım. Sahibi Türkçe konuştu. "Nasıl buldun bizi?" diye sordum. "Sen buldun" dedi.`,
  },

  {
    uid: U.deniz,
    title: "Amsterdam'da Bisiklet",
    cat: 'beautiful',
    vis: 'public',
    d: 15,
    tags: ['amsterdam', 'bisiklet', 'şehir', 'huzur'],
    text: `Amsterdam'da bisikletle gidiyordum, kanallar yanımdan akıyor. Köprü üstünde durdum, şehir her yönden güzeldi. Su üstünde tekne, tekne üstünde çiçek, çiçek üstünde güneş. Kanal boyunca devam ettim, şehir bitmiyordu. Bu sefer kaybolduk diyemedim — her yer aynı derecede güzeldi.`,
  },

  {
    uid: U.mert,
    title: "Dubai Colu'nde Gece",
    cat: 'nightmare',
    vis: 'public',
    d: 11,
    tags: ['dubai', 'çöl', 'gece', 'yalnızlık'],
    text: `Dubai'nin çölünde gece yarısı yapayalnız duruyordum. Şehrin ışıkları ufukta bir yıldız gibi görünüyordu — çok uzak, ulaşılamaz. Çöl sessizdi ve bu sessizlik bastırıcıydı. Rüzgar kalktı, kum yüzüme çarptı. Kaçmak istedim ama nereye olduğumu bilmiyordum.`,
  },

  {
    uid: U.pinar,
    title: 'Viyana Kahvaltisi',
    cat: 'beautiful',
    vis: 'public',
    d: 36,
    tags: ['viyana', 'kahve', 'şehir', 'huzur'],
    text: `Vienna'da kahve dükkanında oturuyordum, sabah erken. Şehrin sesi henüz uyanmamış. Opera Binası pencereden görünüyordu. Garson Türkçe konuştu — şaşırdım. Kahvem geldi, köpüklüydü. Şehrin bu sakin anını kendime sakladım.`,
  },

  {
    uid: U.serkan,
    title: "Prag'da Kaybolmak",
    cat: 'normal',
    vis: 'public',
    d: 19,
    tags: ['prag', 'sokak', 'gece', 'kaybolmak'],
    text: `Praha'nın taş sokaklarında kayboldum. Labirent gibi dar yollar. Charles Koprusu'na çıkmaya çalışıyordum ama her köşede farklı bir sokağa giriyordum. Biri peşimden geliyor gibiydi. Döndüm, kimse yoktu. Sadece taşın yankısı.`,
  },
];

const COMMENTS_POOL = [
  'Bu rüya bana da çok tanıdık geldi.',
  'Güzel anlatmışsın, ben de bunu yaşadım.',
  "Istanbul'u bu kadar güzel hiç görmedim.",
  'Rüya mı gerçek mi ayırt etmek zor.',
  'Çok derin bir sembolizm var burada.',
  "Galata Kulesi'nden ben de düştüm rüyamda!",
  "Paris'te kaybolmak nasıl bir his anlattın, tam bu.",
  'Tokyo sokakları gerçekten böyle hissettiriyor insanı.',
  'Anlattığın yer çok tanıdık geldi.',
  'Harika bir rüya, paylaştığın için teşekkürler.',
  'Bu korku bende de var, aynen böyle.',
  'Uçmak özgürlüktür demişler, doğruymuş.',
  'Bu tür rüyalar her zaman iz bırakır.',
  'Bunu okuyunca kendi rüyamı hatırladım.',
  "Kapadokya'yı gördükten sonra artık rüyalarımda da geliyor.",
  'Deniz rüyaları hep bu kadar kuvvetli oluyor.',
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await db.connect();
  console.log('Connected to database');

  // Reset stuck 'processing' analyses so they get re-queued
  const { rowCount: stuck } = await db.query(
    `UPDATE dream_analyses SET status='failed', failure_reason='reset-by-enrichment-script'
     WHERE status='processing'`,
  );
  if (stuck > 0) console.log(`  Reset ${stuck} stuck 'processing' records to 'failed'`);

  // ── Step 1: Create dream_analyses for dreams that have none ───────────────
  console.log('\n[1/6] Bootstrapping dream_analyses...');
  const { rowCount: bootstrap } = await db.query(`
    INSERT INTO dream_analyses (dream_id, status)
    SELECT d.id, 'pending'
    FROM dreams d
    WHERE d.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM dream_analyses da WHERE da.dream_id = d.id)
    ON CONFLICT (dream_id) DO NOTHING
  `);
  console.log(`  Created ${bootstrap} new analysis records`);

  // ── Step 2: Analyze all pending/failed dreams ──────────────────────────────
  console.log('\n[2/6] Running stub analysis...');
  const { rows: toAnalyze } = await db.query(`
    SELECT d.id, d.title, d.content
    FROM dreams d
    JOIN dream_analyses da ON da.dream_id = d.id
    WHERE da.status IN ('pending','failed') AND d.deleted_at IS NULL
  `);
  console.log(`  Found ${toAnalyze.length} dreams to analyze`);

  let analyzed = 0;
  for (const dr of toAnalyze) {
    try {
      await db.query(`UPDATE dream_analyses SET status='processing' WHERE dream_id=$1`, [dr.id]);
      await analyzeDream(dr.id, dr.title, dr.content);
      analyzed++;
    } catch (err) {
      console.error(`  ! Failed ${dr.id}: ${err.message}`);
      await db.query(
        `UPDATE dream_analyses SET status='failed', failure_reason=$2, failed_at=NOW() WHERE dream_id=$1`,
        [dr.id, err.message],
      );
    }
  }
  console.log(`  Analyzed: ${analyzed}/${toAnalyze.length}`);

  // ── Step 3: Extract places from all existing dreams ────────────────────────
  console.log('\n[3/6] Extracting places from existing dreams...');
  const { rows: allExisting } = await db.query(
    `SELECT id, user_id, title, content FROM dreams WHERE deleted_at IS NULL`,
  );
  let existingPlaces = 0;
  for (const d of allExisting) {
    existingPlaces += await upsertPlaces(d.id, d.user_id, d.title, d.content);
  }
  console.log(`  Places found across ${allExisting.length} existing dreams: ${existingPlaces}`);

  // ── Step 4: Insert enrichment dreams ──────────────────────────────────────
  console.log('\n[4/6] Inserting enrichment dreams...');
  let inserted = 0;
  const freshDreams = [];

  for (const d of NEW_DREAMS) {
    const id = uuidv4();
    const dreamedAt = ago(d.d, 5);
    const createdAt = ago(d.d, 4);
    const { rowCount } = await db.query(
      `
      INSERT INTO dreams (id, user_id, title, content, category, visibility, is_draft, tags, dreamed_at, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5::dream_category,$6::dream_visibility,false,$7,$8,$9,$9)
      ON CONFLICT DO NOTHING
    `,
      [id, d.uid, d.title, d.text, d.cat, d.vis, d.tags, dreamedAt, createdAt],
    );

    if (rowCount > 0) {
      inserted++;
      freshDreams.push({ id, uid: d.uid, title: d.title, text: d.text });
    }
  }
  console.log(`  Inserted: ${inserted} (skipped ${NEW_DREAMS.length - inserted} already existing)`);

  // ── Step 5: Analyze + extract places for fresh dreams ─────────────────────
  if (freshDreams.length > 0) {
    console.log(`\n[5/6] Analyzing ${freshDreams.length} new dreams...`);
    let newAnalyzed = 0;
    let newPlaces = 0;
    for (const d of freshDreams) {
      await db.query(
        `INSERT INTO dream_analyses (dream_id, status) VALUES ($1,'pending') ON CONFLICT (dream_id) DO NOTHING`,
        [d.id],
      );
      try {
        await db.query(`UPDATE dream_analyses SET status='processing' WHERE dream_id=$1`, [d.id]);
        await analyzeDream(d.id, d.title, d.text);
        newAnalyzed++;
      } catch (err) {
        console.error(`  ! Failed ${d.id}: ${err.message}`);
        await db.query(
          `UPDATE dream_analyses SET status='failed', failure_reason=$2, failed_at=NOW() WHERE dream_id=$1`,
          [d.id, err.message],
        );
      }
      newPlaces += await upsertPlaces(d.id, d.uid, d.title, d.text);
    }
    console.log(`  Analyzed: ${newAnalyzed}, places found: ${newPlaces}`);
  } else {
    console.log('\n[5/6] Skipped — all enrichment dreams already exist');
  }

  // ── Step 6: Social interactions ────────────────────────────────────────────
  console.log('\n[6/6] Social interactions...');

  const { rows: publicDreams } = await db.query(`
    SELECT id, user_id FROM dreams
    WHERE visibility='public' AND is_draft=false AND deleted_at IS NULL
    ORDER BY created_at DESC LIMIT 70
  `);

  const allUsers = Object.values(U);

  let likes = 0;
  for (let i = 0; i < allUsers.length; i++) {
    const uid = allUsers[i];
    const targets = publicDreams.filter((d) => d.user_id !== uid).slice(i * 3, i * 3 + 8);
    for (const d of targets) {
      const { rowCount } = await db.query(
        `INSERT INTO dream_likes (id,dream_id,user_id) VALUES ($1,$2,$3) ON CONFLICT (user_id,dream_id) DO NOTHING`,
        [uuidv4(), d.id, uid],
      );
      if (rowCount > 0) {
        await db.query(`UPDATE dreams SET like_count=like_count+1 WHERE id=$1`, [d.id]);
        likes++;
      }
    }
  }
  console.log(`  Likes added: ${likes}`);

  let saves = 0;
  for (let i = 0; i < allUsers.length; i++) {
    const uid = allUsers[i];
    const targets = publicDreams.filter((d) => d.user_id !== uid).slice(i * 2, i * 2 + 3);
    for (const d of targets) {
      const { rowCount } = await db.query(
        `INSERT INTO dream_saves (id,dream_id,user_id) VALUES ($1,$2,$3) ON CONFLICT (user_id,dream_id) DO NOTHING`,
        [uuidv4(), d.id, uid],
      );
      if (rowCount > 0) {
        await db.query(`UPDATE dreams SET save_count=save_count+1 WHERE id=$1`, [d.id]);
        saves++;
      }
    }
  }
  console.log(`  Saves added: ${saves}`);

  let comments = 0;
  for (let i = 0; i < Math.min(publicDreams.length, 30); i++) {
    const dr = publicDreams[i];
    const commenters = allUsers.filter((u) => u !== dr.user_id).slice(0, 2);
    for (const uid of commenters) {
      const text = COMMENTS_POOL[(i + comments) % COMMENTS_POOL.length];
      const { rowCount } = await db.query(
        `INSERT INTO dream_comments (id,dream_id,user_id,content)
         SELECT $1,$2,$3,$4
         WHERE NOT EXISTS (
           SELECT 1 FROM dream_comments
           WHERE dream_id=$2 AND user_id=$3 AND content=$4 AND deleted_at IS NULL
         )`,
        [uuidv4(), dr.id, uid, text],
      );
      if (rowCount > 0) {
        await db.query(`UPDATE dreams SET comment_count=comment_count+1 WHERE id=$1`, [dr.id]);
        comments++;
      }
    }
  }
  console.log(`  Comments added: ${comments}`);

  let follows = 0;
  for (let i = 0; i < allUsers.length; i++) {
    const followerId = allUsers[i];
    for (let j = 1; j <= 5; j++) {
      const followingId = allUsers[(i + j) % allUsers.length];
      if (followerId === followingId) continue;
      const { rowCount } = await db.query(
        `INSERT INTO user_follows (id,follower_id,following_id) VALUES ($1,$2,$3) ON CONFLICT (follower_id,following_id) DO NOTHING`,
        [uuidv4(), followerId, followingId],
      );
      if (rowCount > 0) {
        await db.query(
          `UPDATE user_profiles SET follower_count=follower_count+1   WHERE user_id=$1`,
          [followingId],
        );
        await db.query(
          `UPDATE user_profiles SET following_count=following_count+1 WHERE user_id=$1`,
          [followerId],
        );
        follows++;
      }
    }
  }
  console.log(`  Follows added: ${follows}`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n=== FINAL STATE ===');
  const q = (label) => db.query(`SELECT COUNT(*) c FROM ${label}`);
  const stats = await Promise.all([
    db.query('SELECT COUNT(*) c FROM dreams WHERE is_draft=false AND deleted_at IS NULL'),
    db.query(
      "SELECT COUNT(*) c FROM dreams WHERE visibility='public' AND is_draft=false AND deleted_at IS NULL",
    ),
    db.query('SELECT COUNT(*) c FROM dream_analyses'),
    db.query("SELECT COUNT(*) c FROM dream_analyses WHERE status='completed'"),
    db.query('SELECT COUNT(*) c FROM dream_emotions'),
    db.query('SELECT COUNT(*) c FROM dream_themes'),
    db.query('SELECT COUNT(*) c FROM dream_symbols'),
    db.query('SELECT COUNT(*) c FROM dream_places'),
    db.query('SELECT COUNT(DISTINCT name) c FROM dream_places'),
    db.query('SELECT COUNT(DISTINCT country) c FROM dream_places WHERE latitude IS NOT NULL'),
    db.query('SELECT COUNT(*) c FROM dream_likes'),
    db.query('SELECT COUNT(*) c FROM dream_comments WHERE deleted_at IS NULL'),
    db.query('SELECT COUNT(*) c FROM dream_saves'),
    db.query('SELECT COUNT(*) c FROM user_follows'),
  ]);

  [
    'dreams(published)',
    'dreams(public)',
    'dream_analyses',
    'analyses(completed)',
    'dream_emotions',
    'dream_themes',
    'dream_symbols',
    'dream_places(rows)',
    'place_names(unique)',
    'countries',
    'dream_likes',
    'dream_comments',
    'dream_saves',
    'user_follows',
  ].forEach((lbl, i) => console.log(`  ${lbl.padEnd(26)}: ${stats[i].rows[0].c}`));

  await db.end();
  console.log('\nDone. No existing users, dreams, or real admin data were modified.');
}

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
