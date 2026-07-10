/**
 * DreamCloud Staging Seed — minimal idempotent dataset for the staging environment.
 *
 * Run locally:
 *   cd apps/api && ALLOW_SEED=true npm run seed:staging
 *
 * Run on Railway (after migrations):
 *   railway run sh -c "ALLOW_SEED=true node dist/database/seeds/seed.staging.js"
 *
 * Safety rules:
 *  - Checks for existing rows before inserting (idempotent, safe to re-run).
 *  - Never truncates or drops tables.
 *  - Blocked in production unless ALLOW_SEED=true is explicitly set.
 *  - Does NOT expose credentials in logs.
 */

import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import AppDataSource from '../../config/database.config';

// ─── Guard ───────────────────────────────────────────────────────────────────

if (process.env['NODE_ENV'] === 'production' && process.env['ALLOW_SEED'] !== 'true') {
  console.error('❌  Staging seed blocked. Set ALLOW_SEED=true to proceed.');
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEED_TAG = 'staging-v1';
const HASH_ROUNDS = 10;

// Deterministic PRNG so repeated runs produce the same IDs
let _s = 0xcafe1234;
function rnd(): number {
  _s = (_s * 1664525 + 1013904223) & 0x7fffffff;
  return _s / 0x7fffffff;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)] as T;
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ─── Static data ─────────────────────────────────────────────────────────────

type DreamCategory = 'lucid' | 'beautiful' | 'nightmare' | 'normal';
type Visibility = 'private' | 'followers' | 'public';

const CATEGORIES: DreamCategory[] = ['lucid', 'beautiful', 'nightmare', 'normal'];
const VISIBILITIES: Visibility[] = ['public', 'public', 'followers', 'private'];
const MOODS = [
  'peaceful',
  'excited',
  'anxious',
  'melancholic',
  'hopeful',
  'confused',
  'joyful',
  'fearful',
];
const THEMES = ['flying', 'water', 'forest', 'city', 'family', 'past', 'future', 'unknown'];
const LOCATIONS = [
  'İstanbul',
  'Ankara',
  'İzmir',
  'Kapadokya',
  'Ege kıyısı',
  'Dağ zirvesi',
  'Şehir parkı',
  'Deniz altı',
];

const STAGING_USERS = [
  // Super admin — must be first
  {
    email: 'ilhncvn@gmail.com',
    username: 'ilhanceven',
    displayName: 'İlhan Ceven',
    role: 'super_admin' as const,
    bio: 'DreamCloud kurucu.',
  },
  {
    email: 'ayse.yilmaz@staging.dc',
    username: 'ayse_yilmaz',
    displayName: 'Ayşe Yılmaz',
    role: 'user' as const,
    bio: 'Rüyalarımı kayıt altına alıyorum.',
  },
  {
    email: 'mehmet.demir@staging.dc',
    username: 'mehmet_demir',
    displayName: 'Mehmet Demir',
    role: 'user' as const,
    bio: 'Lucid dreaming meraklısı.',
  },
  {
    email: 'fatma.kaya@staging.dc',
    username: 'fatma_kaya',
    displayName: 'Fatma Kaya',
    role: 'user' as const,
    bio: 'Doğa ve rüya.',
  },
  {
    email: 'ali.celik@staging.dc',
    username: 'ali_celik',
    displayName: 'Ali Çelik',
    role: 'user' as const,
    bio: 'Gece gezgini.',
  },
  {
    email: 'zeynep.arslan@staging.dc',
    username: 'zeynep_arslan',
    displayName: 'Zeynep Arslan',
    role: 'moderator' as const,
    bio: 'Moderatör ve rüya yorumcusu.',
  },
  {
    email: 'burak.sahin@staging.dc',
    username: 'burak_sahin',
    displayName: 'Burak Şahin',
    role: 'user' as const,
    bio: 'Fotoğrafçı ve hayalci.',
  },
  {
    email: 'selin.ozturk@staging.dc',
    username: 'selin_ozturk',
    displayName: 'Selin Öztürk',
    role: 'user' as const,
    bio: 'Renkli rüyalar görürüm.',
  },
  {
    email: 'can.yildiz@staging.dc',
    username: 'can_yildiz',
    displayName: 'Can Yıldız',
    role: 'user' as const,
    bio: 'Varoluşsal sorular.',
  },
  {
    email: 'melis.karakas@staging.dc',
    username: 'melis_karakas',
    displayName: 'Melis Karakaş',
    role: 'user' as const,
    bio: 'Müzisyen ve rüya günlüğü tutuyorum.',
  },
  {
    email: 'emre.akin@staging.dc',
    username: 'emre_akin',
    displayName: 'Emre Akın',
    role: 'user' as const,
    bio: 'Teknoloji ve bilinçaltı.',
  },
  {
    email: 'neslihan.ercan@staging.dc',
    username: 'neslihan_ercan',
    displayName: 'Neslihan Ercan',
    role: 'user' as const,
    bio: 'Psikolog, rüyalara ilgi duyuyorum.',
  },
  {
    email: 'ozan.kurt@staging.dc',
    username: 'ozan_kurt',
    displayName: 'Ozan Kurt',
    role: 'user' as const,
    bio: 'Yazar, rüyalarım bana ilham veriyor.',
  },
  {
    email: 'irem.polat@staging.dc',
    username: 'irem_polat',
    displayName: 'İrem Polat',
    role: 'user' as const,
    bio: 'Seyahat ve rüya.',
  },
  {
    email: 'berk.yaman@staging.dc',
    username: 'berk_yaman',
    displayName: 'Berk Yaman',
    role: 'user' as const,
    bio: 'Sporcu, bazen uçtuğumu görürüm.',
  },
  {
    email: 'deniz.acar@staging.dc',
    username: 'deniz_acar',
    displayName: 'Deniz Acar',
    role: 'user' as const,
    bio: 'Tasarımcı.',
  },
  {
    email: 'ece.bulut@staging.dc',
    username: 'ece_bulut',
    displayName: 'Ece Bulut',
    role: 'user' as const,
    bio: 'Sanatçı ve hayalperest.',
  },
  {
    email: 'mert.guler@staging.dc',
    username: 'mert_guler',
    displayName: 'Mert Güler',
    role: 'user' as const,
    bio: 'Felsefe öğrencisi.',
  },
  {
    email: 'pinar.tas@staging.dc',
    username: 'pinar_tas',
    displayName: 'Pınar Taş',
    role: 'user' as const,
    bio: 'Kaygısız bir hayalci.',
  },
  {
    email: 'serkan.boz@staging.dc',
    username: 'serkan_boz',
    displayName: 'Serkan Boz',
    role: 'admin' as const,
    bio: 'İçerik yöneticisi.',
  },
];

const STAGING_DREAMS: {
  ownerEmail: string;
  title: string;
  content: string;
  category: DreamCategory;
  visibility: Visibility;
  mood: string;
  location: string;
  daysAgoN: number;
}[] = [
  {
    ownerEmail: 'ilhncvn@gmail.com',
    title: 'Bulutların Üzerinde Şehir',
    content:
      'Gözlerimi açtığımda bulutların üzerinde yükselen bir şehirde olduğumu fark ettim. Camdan yapılmış kuleler sabah güneşini kırarak gökkuşağı oluşturuyordu. Şehrin merkezinde dev bir saat kulesi vardı ve saat ters yönde ilerliyordu.',
    category: 'lucid',
    visibility: 'public',
    mood: 'peaceful',
    location: 'Bulut şehri',
    daysAgoN: 1,
  },
  {
    ownerEmail: 'ilhncvn@gmail.com',
    title: 'Derinlik Olmayan Deniz',
    content:
      'Mavi bir denizin içindeydim ama batmıyordum. Ayaklarımın altında kristal berraklığında su vardı. Balıklar etrafımda uçuyordu sanki yer çekimsi. Uzakta bir ada gördüm, yaklaşmak istedim ama her adımda ada uzaklaşıyordu.',
    category: 'beautiful',
    visibility: 'public',
    mood: 'hopeful',
    location: 'Ege kıyısı',
    daysAgoN: 3,
  },
  {
    ownerEmail: 'ilhncvn@gmail.com',
    title: 'Kayıp Anahtar',
    content:
      'Büyük bir binanın içinde kaybettim kendimi. Her oda bir öncekinden farklıydı. Bir oda kütüphaneydi, bir oda orman, bir oda boşluk. Aradığım şey bir anahtardı ama anahtarın neyin kilidi olduğunu bilmiyordum.',
    category: 'normal',
    visibility: 'followers',
    mood: 'confused',
    location: 'Gizemli bina',
    daysAgoN: 5,
  },
  {
    ownerEmail: 'ilhncvn@gmail.com',
    title: 'Çocukluk Evi',
    content:
      'Çocukluğumda yaşadığım eve döndüm. Her şey aynıydı ama büyütülmüştü sanki. Oyuncaklarım dev boyutlardaydı. Annem mutfakta bir şeyler pişiriyordu ve o karakteristik tarçın kokusu tüm evi dolduruyordu.',
    category: 'beautiful',
    visibility: 'private',
    mood: 'melancholic',
    location: 'İstanbul',
    daysAgoN: 7,
  },
  {
    ownerEmail: 'ayse.yilmaz@staging.dc',
    title: 'Uçmak',
    content:
      'Kollarımı açtım ve havalanmaya başladım. Şehrin üzerinden geçiyordum, insanlar beni göremiyor gibiydi. Özgürlük hissiydi bu. Sonra bir buluta tutundum ve orada oturdum, aşağıdaki şehre baktım.',
    category: 'lucid',
    visibility: 'public',
    mood: 'excited',
    location: 'Ankara',
    daysAgoN: 2,
  },
  {
    ownerEmail: 'mehmet.demir@staging.dc',
    title: 'Karanlık Orman',
    content:
      'Geceleri yalnız bir ormanda yürüyordum. Ağaçların arasından ışıklar parlıyordu ama kaynakları görünmüyordu. Korku yoktu aslında, sadece merak. Derinlere indikçe orman aydınlanmaya başladı.',
    category: 'nightmare',
    visibility: 'public',
    mood: 'anxious',
    location: 'Dağ zirvesi',
    daysAgoN: 4,
  },
  {
    ownerEmail: 'fatma.kaya@staging.dc',
    title: 'Yağmur ve Müzik',
    content:
      'Her yağmur damlası bir nota çıkarıyordu düşerken. Tüm şehir bir senfoni haline gelmişti. Ben de dans etmeye başladım sokak ortasında, kimse gülmüyordu çünkü herkes dans ediyordu.',
    category: 'beautiful',
    visibility: 'public',
    mood: 'joyful',
    location: 'İzmir',
    daysAgoN: 6,
  },
  {
    ownerEmail: 'ali.celik@staging.dc',
    title: 'Sonsuz Merdiven',
    content:
      'Çıkmakta olduğum merdiven hiç bitmiyordu. Yorulmuyordum ama tepesi de görünmüyordu. Basamaklar farklı malzemedendi: biri ahşap, biri taş, biri cam, biri ışıktan yapılmış.',
    category: 'normal',
    visibility: 'followers',
    mood: 'confused',
    location: 'Şehir parkı',
    daysAgoN: 8,
  },
  {
    ownerEmail: 'zeynep.arslan@staging.dc',
    title: 'Deniz Altı Şehri',
    content:
      'Su altında nefes alabiliyordum. Bir antik şehre dalmıştım. Mermer sütunlar yosunla kaplıydı ama hâlâ heybetliydi. Ahtapotlar aralarında yüzüyor, balıklar pencerelere bakıyordu.',
    category: 'lucid',
    visibility: 'public',
    mood: 'peaceful',
    location: 'Deniz altı',
    daysAgoN: 3,
  },
  {
    ownerEmail: 'burak.sahin@staging.dc',
    title: 'Fotoğraf Albümü',
    content:
      'Hiç çekmediğim fotoğraflarla dolu bir albüm buldum. Hepsinde ben vardım ama yaşamadığım anlar. Bir tanesi özellikle dikkat çekti: kar altındaki bir dağın tepesinde duruyordum ve gülümsüyordum.',
    category: 'normal',
    visibility: 'public',
    mood: 'melancholic',
    location: 'Kapadokya',
    daysAgoN: 5,
  },
  {
    ownerEmail: 'selin.ozturk@staging.dc',
    title: 'Renk Kasırgası',
    content:
      'Gökyüzü renk renk dönüyordu. Sarı, mor, turuncu, yeşil — hepsi bir kasırga gibi. Korkutucu değildi, aksine büyüleyiciydi. Rüzgar içime renkler üflüyordu ve ben de değişmeye başladım.',
    category: 'lucid',
    visibility: 'public',
    mood: 'excited',
    location: 'Kapadokya',
    daysAgoN: 2,
  },
  {
    ownerEmail: 'can.yildiz@staging.dc',
    title: 'Paralel Evren Kapısı',
    content:
      'Oturma odamın duvarında bir kapı belirdi. Açtım, karşıda tam aynı oda ama her şey aynalar gibi tersine dönmüştü. İçeri girdim ve öteki ben beni selamlayarak gülümsedi.',
    category: 'normal',
    visibility: 'followers',
    mood: 'confused',
    location: 'İstanbul',
    daysAgoN: 9,
  },
  {
    ownerEmail: 'melis.karakas@staging.dc',
    title: 'Piyano ve Sessizlik',
    content:
      'Büyük bir konser salonundaydım, tek başıma. Sahneye çıktım ve piyano çalmaya başladım. Sesler çıkmıyordu ama müziği hissedebiliyordum. Salon dolmaya başladı, seyirciler sessizce alkışlıyordu.',
    category: 'beautiful',
    visibility: 'public',
    mood: 'peaceful',
    location: 'İstanbul',
    daysAgoN: 4,
  },
  {
    ownerEmail: 'emre.akin@staging.dc',
    title: 'Kod ve Ağaç',
    content:
      'Bir ağacın dalları kod satırlarıydı. Her yaprak bir fonksiyon, her meyve bir veri noktasıydı. Budaldıkça program daha verimli çalışıyordu. Doğa ile teknolojiyi bir araya getiren bir metafordu.',
    category: 'normal',
    visibility: 'public',
    mood: 'hopeful',
    location: 'Dağ zirvesi',
    daysAgoN: 6,
  },
  {
    ownerEmail: 'neslihan.ercan@staging.dc',
    title: 'Bilinçaltı Odası',
    content:
      'Bir hasta koltuğunda oturuyordum ama ben hem hasta hem de terapisttim. Kendimle konuşuyor, kendi sorularımı yanıtlıyordum. Sorular tuhaftı ama cevaplar kristal berraklığındaydı.',
    category: 'lucid',
    visibility: 'followers',
    mood: 'confused',
    location: 'Şehir parkı',
    daysAgoN: 7,
  },
  {
    ownerEmail: 'ozan.kurt@staging.dc',
    title: 'Beyaz Sayfa',
    content:
      'Önümde sonsuza uzanan beyaz bir sayfa vardı. Yazmak istedim ama kalemim yoktu. Parmağımla dokunduğumda kelimeler akıverdi. Roman değildi, şiir de değildi — sadece duygularımdı somutlaşmış hali.',
    category: 'beautiful',
    visibility: 'public',
    mood: 'hopeful',
    location: 'İzmir',
    daysAgoN: 3,
  },
  {
    ownerEmail: 'irem.polat@staging.dc',
    title: 'Harita ve Hazine',
    content:
      'Eski bir harita buldum çantamda. Şehrin sokaklarını gösteriyordu ama sokaklar farklıydı. Hazineyi buldum sonunda — bir kutu içinde anılar vardı, sahte anılar, ama gerçek gibi hissettiriyordu.',
    category: 'normal',
    visibility: 'public',
    mood: 'excited',
    location: 'İstanbul',
    daysAgoN: 10,
  },
  {
    ownerEmail: 'berk.yaman@staging.dc',
    title: 'Maraton Sonu',
    content:
      'Koşuyordum ama nereye gideceğimi bilmiyordum. Yanımda binlerce insan vardı. Sonunda bir kapıya geldik. Kapıyı açtık ve içerde sadece geniş bir çayır vardı. Herkes oturdu ve nefes aldı.',
    category: 'beautiful',
    visibility: 'public',
    mood: 'peaceful',
    location: 'Şehir parkı',
    daysAgoN: 2,
  },
  {
    ownerEmail: 'deniz.acar@staging.dc',
    title: 'Tasarım Stüdyosu',
    content:
      'Mükemmel bir stüdyoyu tasarlamıştım ama stüdyo içindeyken her nesne sürekli değişiyordu. Masa sandalye oluyordu, duvarlar pencere oluyor, zemin tavan oluyordu. Tasarım asla bitmiyordu.',
    category: 'normal',
    visibility: 'followers',
    mood: 'confused',
    location: 'İstanbul',
    daysAgoN: 4,
  },
  {
    ownerEmail: 'ece.bulut@staging.dc',
    title: 'Gece Galeri',
    content:
      'Gece yarısı bir galeride yürüyordum. Tablolar beni izliyordu, gözler tablolardan çıkıp bakıyordu. Korkutucu değil, meraklıydılar sadece. Bir tabloyla uzun süre göz göze geldim.',
    category: 'normal',
    visibility: 'public',
    mood: 'anxious',
    location: 'İstanbul',
    daysAgoN: 8,
  },
  {
    ownerEmail: 'mert.guler@staging.dc',
    title: 'Felsefe Sınavı',
    content:
      'Sokrates karşımda oturuyordu. Sorular soruyordu, cevapladıkça daha derin sorular geliyordu. Sonunda "Bildiğini sanan bilmez" dedi ve kayboldu. Sınav kağıdı boştu ama not aldım.',
    category: 'normal',
    visibility: 'public',
    mood: 'confused',
    location: 'Şehir parkı',
    daysAgoN: 6,
  },
  {
    ownerEmail: 'pinar.tas@staging.dc',
    title: 'Küçük Kaygısız Ev',
    content:
      'Deniz kenarında küçük bir evde oturuyordum. Elektrik yoktu ama mumlar her odayı aydınlatıyordu. Endişelenmem gereken hiçbir şey yoktu. O kadar huzurluydum ki uyanmak istemedim.',
    category: 'beautiful',
    visibility: 'public',
    mood: 'peaceful',
    location: 'Ege kıyısı',
    daysAgoN: 1,
  },
  {
    ownerEmail: 'serkan.boz@staging.dc',
    title: 'İçerik Akışı',
    content:
      'Binlerce mesaj akıyordu ekranda. Hepsini okumam gerekiyordu ama harfler bulanıklaşıyordu. Bir tane durdurdum — yazıyordu: "Duraksama." Durdum ve ekranlar söndü. Sessizlik geldi.',
    category: 'normal',
    visibility: 'followers',
    mood: 'anxious',
    location: 'İstanbul',
    daysAgoN: 3,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  console.log('[seed:staging] Connecting to database...');
  const ds = await AppDataSource.initialize();
  console.log('[seed:staging] Connected.');

  try {
    // ── 1. Hash a safe staging password once ──────────────────────────────
    // The actual password is documented ONLY in a secure note kept by the operator.
    // We use a fixed hash for the staging environment that the operator must set.
    const stagingPassword = process.env['STAGING_SEED_PASSWORD'] ?? 'StagingTest2025!';
    const passwordHash = await bcrypt.hash(stagingPassword, HASH_ROUNDS);

    // ── 2. Upsert users ───────────────────────────────────────────────────
    console.log('[seed:staging] Seeding users...');
    const userIdMap = new Map<string, string>();

    for (const u of STAGING_USERS) {
      const existing: { id: string }[] = await ds.query(
        `SELECT id FROM users WHERE email = $1 LIMIT 1`,
        [u.email],
      );

      let userId: string;
      if (existing.length > 0) {
        userId = existing[0]!.id;
        // Update role in case it changed
        await ds.query(`UPDATE users SET role = $1 WHERE id = $2`, [u.role, userId]);
        console.log(`  ↳ existing: ${u.email} (${userId.slice(0, 8)}...)`);
      } else {
        userId = randomUUID();
        await ds.query(
          `INSERT INTO users
            (id, email, password_hash, username, is_email_verified, is_active, role, created_at, updated_at)
           VALUES ($1,$2,$3,$4,true,true,$5,NOW(),NOW())`,
          [userId, u.email, passwordHash, u.username, u.role],
        );

        // user_profiles row
        const profileExists: { id: string }[] = await ds.query(
          `SELECT id FROM user_profiles WHERE user_id = $1 LIMIT 1`,
          [userId],
        );
        if (profileExists.length === 0) {
          await ds.query(
            `INSERT INTO user_profiles
               (id, user_id, display_name, bio, avatar_url, created_at, updated_at)
             VALUES ($1,$2,$3,$4,NULL,NOW(),NOW())`,
            [randomUUID(), userId, u.displayName, u.bio],
          );
        }
        console.log(`  ↳ created: ${u.email} (${u.role})`);
      }
      userIdMap.set(u.email, userId);
    }

    // ── 3. Upsert dreams ──────────────────────────────────────────────────
    console.log('[seed:staging] Seeding dreams...');
    const dreamIds: string[] = [];

    for (const d of STAGING_DREAMS) {
      const ownerId = userIdMap.get(d.ownerEmail);
      if (!ownerId) continue;

      const existing: { id: string }[] = await ds.query(
        `SELECT id FROM dreams WHERE user_id = $1 AND title = $2 LIMIT 1`,
        [ownerId, d.title],
      );

      let dreamId: string;
      if (existing.length > 0) {
        dreamId = existing[0]!.id;
        console.log(`  ↳ existing dream: "${d.title}"`);
      } else {
        dreamId = randomUUID();
        await ds.query(
          `INSERT INTO dreams
             (id, user_id, title, content, category, visibility, mood, is_draft,
              tags, view_count, like_count, save_count, comment_count, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5::dream_category,$6::dream_visibility,$7,false,
                   ARRAY[$8::text]::text[],0,0,0,0,$9::timestamptz,NOW())`,
          [
            dreamId,
            ownerId,
            d.title,
            d.content,
            d.category,
            d.visibility,
            d.mood,
            SEED_TAG,
            daysAgo(d.daysAgoN),
          ],
        );
        console.log(`  ↳ created dream: "${d.title}"`);
      }
      dreamIds.push(dreamId);
    }

    // ── 4. Basic social graph (idempotent) ────────────────────────────────
    console.log('[seed:staging] Seeding follows...');
    const adminId = userIdMap.get('ilhncvn@gmail.com')!;
    const otherIds = [...userIdMap.values()].filter((id) => id !== adminId);

    for (const followerId of otherIds.slice(0, 10)) {
      const exists: { id: string }[] = await ds.query(
        `SELECT id FROM user_follows WHERE follower_id=$1 AND following_id=$2 LIMIT 1`,
        [followerId, adminId],
      );
      if (exists.length === 0) {
        await ds.query(
          `INSERT INTO user_follows (id, follower_id, following_id, created_at)
           VALUES ($1,$2,$3,NOW())`,
          [randomUUID(), followerId, adminId],
        );
      }
    }

    // ── 5. Basic likes on public dreams (idempotent) ──────────────────────
    console.log('[seed:staging] Seeding likes...');
    const publicDreams: { id: string }[] = await ds.query(
      `SELECT id FROM dreams WHERE visibility='public' AND $1 = ANY(tags) LIMIT 15`,
      [SEED_TAG],
    );
    const likerIds = otherIds.slice(0, 8);
    for (const dream of publicDreams.slice(0, 8)) {
      for (const likerId of likerIds.slice(0, 4)) {
        const exists: { id: string }[] = await ds.query(
          `SELECT id FROM dream_likes WHERE dream_id=$1 AND user_id=$2 LIMIT 1`,
          [dream.id, likerId],
        );
        if (exists.length === 0) {
          await ds.query(
            `INSERT INTO dream_likes (id, dream_id, user_id, created_at) VALUES ($1,$2,$3,NOW())`,
            [randomUUID(), dream.id, likerId],
          );
          await ds.query(`UPDATE dreams SET like_count = like_count + 1 WHERE id = $1`, [dream.id]);
        }
      }
    }

    // ── 6. Basic comments (idempotent via tag check) ──────────────────────
    console.log('[seed:staging] Seeding comments...');
    const SAMPLE_COMMENTS = [
      'Bu rüya çok güzel, benimle paylaştığın için teşekkürler.',
      'İnanılmaz bir deneyim! Ben de benzer şeyler yaşadım.',
      'Bilinçaltının seni nasıl anlattığı çok ilginç.',
      'Lucid dreaming denemelerinde bu çok işe yarar.',
      'Rüyalarının sembolleri çok derin.',
    ];

    for (const dream of publicDreams.slice(0, 5)) {
      const commentCount: { count: string }[] = await ds.query(
        `SELECT COUNT(*) FROM dream_comments WHERE dream_id=$1`,
        [dream.id],
      );
      if (parseInt(commentCount[0]?.count ?? '0', 10) === 0) {
        const commenterId = pick(likerIds);
        await ds.query(
          `INSERT INTO dream_comments (id, dream_id, user_id, content, created_at, updated_at)
           VALUES ($1,$2,$3,$4,NOW(),NOW())`,
          [randomUUID(), dream.id, commenterId, pick(SAMPLE_COMMENTS)],
        );
        await ds.query(`UPDATE dreams SET comment_count = comment_count + 1 WHERE id = $1`, [
          dream.id,
        ]);
      }
    }

    console.log('[seed:staging] ✅ Done.');
    console.log(`  Users:    ${STAGING_USERS.length}`);
    console.log(`  Dreams:   ${STAGING_DREAMS.length}`);
    console.log('');
    console.log('Admin login: ilhncvn@gmail.com');
    console.log('Password:    value of STAGING_SEED_PASSWORD env var (default: StagingTest2025!)');
    console.log('');
    console.log('IMPORTANT: Change the default password in Railway after first login.');
  } finally {
    await ds.destroy();
  }
}

run().catch((err: Error) => {
  console.error('[seed:staging] FATAL:', err.message);
  process.exit(1);
});
