import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DreamIdentity } from './entities/dream-identity.entity';

// ── Archetype definitions ─────────────────────────────────────────────────────

interface ArchetypeDef {
  name: string;
  englishName: string;
  emoji: string;
  description: string;
  themes?: Record<string, number>;
  emotions?: Record<string, number>;
  symbols?: Record<string, number>;
  locations?: Record<string, number>;
  figureArchetypes?: Record<string, number>;
  categories?: Record<string, number>;
}

const ARCHETYPES: Record<string, ArchetypeDef> = {
  explorer: {
    name: 'Kaşif', englishName: 'The Explorer', emoji: '🧭',
    description: 'Rüyalarında özgürlük ve keşfin peşinde koşan bir ruh. Her rüya seni yeni ufuklara taşır.',
    themes:    { journey: 3, flying: 3, ascent: 2, water: 1 },
    emotions:  { wonder: 2, excitement: 2, joy: 1 },
    locations: { forest: 2, mountain: 2, ocean: 2, desert: 2 },
  },
  seeker: {
    name: 'Arayışçı', englishName: 'The Seeker', emoji: '🔍',
    description: 'Anlam ve hakikat arayan, eşikte duran bir yolcu. Rüyaların derinliklerinde cevaplar arıyorsun.',
    themes:   { pursuit: 3, threshold: 3, chase: 2, loss: 2 },
    emotions: { anxiety: 2, wonder: 2, loneliness: 2 },
    symbols:  { key: 3, door: 3, labyrinth: 2 },
  },
  creator: {
    name: 'Yaratıcı', englishName: 'The Creator', emoji: '✨',
    description: 'Dönüşüm ve yaratım enerjisiyle parlayan bir zihin. Rüyaların yeni dünyalar inşa eder.',
    themes:   { transformation: 3, birth: 3, fire: 2 },
    symbols:  { light: 2, transformation: 2 },
    emotions: { excitement: 2, joy: 2, love: 1 },
  },
  dream_walker: {
    name: 'Rüya Yürüyücüsü', englishName: 'The Dream Walker', emoji: '🌙',
    description: 'Bilinç sınırlarını aşan, lucid dünyaların efendisi. Uyku sana bir süpergüç gibi gelir.',
    categories: { lucid: 5 },
    themes:     { flying: 2, ascent: 2 },
    emotions:   { wonder: 2, peace: 1 },
  },
  observer: {
    name: 'Gözlemci', englishName: 'The Observer', emoji: '👁️',
    description: 'Derinlikleri sessizce seyreden, bilgelik biriktiren bir bakış. Her rüyan birer mesaj taşır.',
    themes:   { descent: 3, school: 2, water: 2, falling: 2 },
    emotions: { peace: 3, nostalgia: 3, sadness: 2 },
    symbols:  { mirror: 2, abyss: 2 },
  },
  architect: {
    name: 'Mimar', englishName: 'The Architect', emoji: '🏛️',
    description: 'Bilinçaltının yapılarını şekillendiren, düzeni arayan bir güç. Her rüyanda gizli bir plan var.',
    symbols:   { labyrinth: 3, threshold: 3, door: 2, mirror: 2 },
    locations: { city: 3, corridor: 3, underground: 2 },
  },
  visionary: {
    name: 'Kahin', englishName: 'The Visionary', emoji: '🔮',
    description: 'Vizyoner imgelerle geleceği hisseden dönüşümün habercisi. Rüyaların derin mesajlar taşır.',
    themes:            { transformation: 3, death: 3, fire: 2, reunion: 2 },
    emotions:          { wonder: 2, excitement: 2 },
    figureArchetypes:  { shadow: 2, anima: 2, animus: 2 },
  },
  pathfinder: {
    name: 'Yol Bulucu', englishName: 'The Pathfinder', emoji: '🌄',
    description: 'Karanlıkta bile yolunu bulan, başkalarına rehberlik eden bir öncü. Rüyaların seni yönlendirir.',
    themes:           { journey: 3, threshold: 2, reunion: 2 },
    locations:        { mountain: 2, forest: 2, desert: 2, ocean: 1 },
    emotions:         { loneliness: 2 },
    figureArchetypes: { guide: 3, hero: 2 },
  },
};

// ── Frequency helpers ─────────────────────────────────────────────────────────

type FreqMap = Map<string, number>;

function topN(freq: FreqMap, n: number): string[] {
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

function scoreArchetype(
  def: ArchetypeDef,
  themeFreq: FreqMap,
  emotionFreq: FreqMap,
  symbolFreq: FreqMap,
  locationFreq: FreqMap,
  figureFreq: FreqMap,
  lucidCount: number,
  totalDreams: number,
): number {
  let score = 0;

  const addFreq = (freq: FreqMap, weights?: Record<string, number>) => {
    if (!weights) return;
    const total = [...freq.values()].reduce((s, v) => s + v, 0) || 1;
    for (const [tag, weight] of Object.entries(weights)) {
      const count = freq.get(tag) ?? 0;
      score += (count / total) * weight * 100;
    }
  };

  addFreq(themeFreq,    def.themes);
  addFreq(emotionFreq,  def.emotions);
  addFreq(symbolFreq,   def.symbols);
  addFreq(locationFreq, def.locations);
  addFreq(figureFreq,   def.figureArchetypes);

  if (def.categories?.lucid && totalDreams > 0) {
    score += (lucidCount / totalDreams) * def.categories.lucid * 100;
  }

  return Math.round(score);
}

// ── Summary generator ─────────────────────────────────────────────────────────

const THEME_TR: Record<string, string> = {
  journey: 'yolculuk', flying: 'uçuş', transformation: 'dönüşüm',
  pursuit: 'takip', threshold: 'eşik', descent: 'iniş', ascent: 'yükseliş',
  water: 'su', fire: 'ateş', loss: 'kayıp', death: 'ölüm', birth: 'doğum',
  school: 'okul', reunion: 'kavuşma', chase: 'kovalanma', falling: 'düşme',
};

const EMOTION_TR: Record<string, string> = {
  wonder: 'hayranlık', fear: 'korku', peace: 'huzur', joy: 'sevinç',
  anxiety: 'kaygı', sadness: 'üzüntü', loneliness: 'yalnızlık',
  excitement: 'heyecan', nostalgia: 'nostalji', love: 'aşk',
};

function buildSummary(
  primaryKey: string,
  secondaryKey: string,
  themes: string[],
  emotions: string[],
): string {
  const primary   = ARCHETYPES[primaryKey];
  const secondary = ARCHETYPES[secondaryKey];
  if (!primary || !secondary) return '';

  const topTheme   = THEME_TR[themes[0] ?? '']   ?? themes[0]   ?? '';
  const topEmotion = EMOTION_TR[emotions[0] ?? ''] ?? emotions[0] ?? '';

  const themePart   = topTheme   ? `Rüyalarında ${topTheme} teması öne çıkmaktadır.` : '';
  const emotionPart = topEmotion ? `En sık hissedilen duygu ${topEmotion}.` : '';

  return [
    `Sen bir ${primary.name}'sin — aynı zamanda ${secondary.name} enerjisini taşıyorsun.`,
    themePart,
    emotionPart,
    primary.description,
  ]
    .filter(Boolean)
    .join(' ');
}

// ── Service ───────────────────────────────────────────────────────────────────

export interface DreamIdentityResult {
  primaryArchetype: string;
  primaryArchetypeName: string;
  primaryArchetypeEnglish: string;
  primaryArchetypeEmoji: string;
  primaryArchetypeDescription: string;
  primaryArchetypeScore: number;
  secondaryArchetype: string;
  secondaryArchetypeName: string;
  secondaryArchetypeEnglish: string;
  secondaryArchetypeEmoji: string;
  secondaryArchetypeScore: number;
  personalitySummary: string;
  dominantThemes: string[];
  dominantEmotions: string[];
  dominantSymbols: string[];
  dominantLocations: string[];
  dominantArchetypes: string[];
  resonanceScore: number;
  lucidScore: number;
  transformationScore: number;
  wonderScore: number;
  connectionScore: number;
  dreamCount: number;
  computedAt: Date;
  isStale: boolean;
}

@Injectable()
export class IdentityService {
  constructor(
    @InjectDataSource()
    private readonly ds: DataSource,

    @InjectRepository(DreamIdentity)
    private readonly identityRepo: Repository<DreamIdentity>,
  ) {}

  // Returns cached identity; recomputes if older than 24h or dreamCount changed
  async getOrCompute(userId: string): Promise<DreamIdentityResult> {
    const existing = await this.identityRepo.findOne({ where: { userId } });
    const currentDreamCount = await this.currentDreamCount(userId);

    const isStale =
      !existing ||
      existing.dreamCount !== currentDreamCount ||
      Date.now() - existing.computedAt.getTime() > 24 * 60 * 60 * 1000;

    if (isStale) {
      await this.compute(userId);
    }

    const identity = (await this.identityRepo.findOne({ where: { userId } }))!;
    return this.toResult(identity, false);
  }

  async compute(userId: string): Promise<DreamIdentityResult> {
    // ── 1. Collect frequency maps via raw SQL ──────────────────────────────
    const dreamCount = await this.currentDreamCount(userId);

    const themeFreq   = await this.freqMap(userId, 'dream_themes',    'theme');
    const emotionFreq = await this.freqMap(userId, 'dream_emotions',  'emotion');
    const symbolFreq  = await this.freqMap(userId, 'dream_symbols',   'symbol_category');
    const locFreq     = await this.freqMap(userId, 'dream_locations', 'location_type', 'location_type IS NOT NULL');
    const figFreq     = await this.freqMap(userId, 'dream_figures',   'archetype_candidate', 'archetype_candidate IS NOT NULL');

    const [lucidRow] = await this.ds.query<[{ cnt: string }]>(
      `SELECT COUNT(*)::int AS cnt FROM dreams
       WHERE user_id = $1 AND category = 'lucid' AND is_draft = FALSE`,
      [userId],
    );
    const lucidCount = Number(lucidRow?.cnt ?? 0);

    // ── 2. Score each archetype ────────────────────────────────────────────
    const scores: [string, number][] = Object.entries(ARCHETYPES).map(([key, def]) => [
      key,
      scoreArchetype(def, themeFreq, emotionFreq, symbolFreq, locFreq, figFreq, lucidCount, dreamCount),
    ]);
    scores.sort((a, b) => b[1] - a[1]);

    const [primaryKey, primaryScore]     = scores[0] ?? ['observer', 0];
    const [secondaryKey, secondaryScore] = scores[1] ?? ['seeker', 0];

    // ── 3. Dominant patterns ───────────────────────────────────────────────
    const dominantThemes    = topN(themeFreq,   5);
    const dominantEmotions  = topN(emotionFreq, 5);
    const dominantSymbols   = topN(symbolFreq,  3);
    const dominantLocations = topN(locFreq,     3);
    const dominantArchetypes = topN(figFreq,    3);

    // ── 4. Personality scores (0–100) ─────────────────────────────────────
    const resonanceScore   = await this.resonanceScore(userId, dreamCount);
    const lucidScore       = dreamCount > 0 ? Math.round((lucidCount / dreamCount) * 100) : 0;
    const transformationScore = this.patternScore(
      themeFreq, ['transformation', 'death', 'birth', 'fire'], dreamCount,
    );
    const wonderScore = this.patternScore(
      emotionFreq, ['wonder', 'excitement', 'joy', 'love'], dreamCount,
    );
    const connectionScore = await this.connectionScore(userId, dreamCount);

    // ── 5. Summary ─────────────────────────────────────────────────────────
    const personalitySummary = buildSummary(
      primaryKey, secondaryKey, dominantThemes, dominantEmotions,
    );

    // ── 6. Persist ─────────────────────────────────────────────────────────
    await this.identityRepo.upsert(
      {
        userId,
        primaryArchetype:       primaryKey,
        secondaryArchetype:     secondaryKey,
        primaryArchetypeScore:  primaryScore,
        secondaryArchetypeScore: secondaryScore,
        personalitySummary,
        dominantThemes,
        dominantEmotions,
        dominantSymbols,
        dominantLocations,
        dominantArchetypes,
        resonanceScore,
        lucidScore,
        transformationScore,
        wonderScore,
        connectionScore,
        dreamCount,
        computedAt: new Date(),
      },
      { conflictPaths: ['userId'] },
    );

    const identity = (await this.identityRepo.findOne({ where: { userId } }))!;
    return this.toResult(identity, false);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async currentDreamCount(userId: string): Promise<number> {
    const [row] = await this.ds.query<[{ cnt: string }]>(
      `SELECT COUNT(*)::int AS cnt FROM dreams WHERE user_id = $1 AND is_draft = FALSE`,
      [userId],
    );
    return Number(row?.cnt ?? 0);
  }

  private async freqMap(
    userId: string,
    table: string,
    column: string,
    extraWhere = '',
  ): Promise<FreqMap> {
    const whereExtra = extraWhere ? `AND ${extraWhere}` : '';
    const rows = await this.ds.query<Array<{ tag: string; cnt: string }>>(
      `SELECT t.${column} AS tag, COUNT(*) AS cnt
       FROM ${table} t
       JOIN dreams d ON t.dream_id = d.id
       WHERE d.user_id = $1 AND d.is_draft = FALSE ${whereExtra}
         AND t.${column} IS NOT NULL
       GROUP BY t.${column}
       ORDER BY cnt DESC`,
      [userId],
    );
    const map: FreqMap = new Map();
    for (const { tag, cnt } of rows) {
      if (tag) map.set(tag, Number(cnt));
    }
    return map;
  }

  private patternScore(freq: FreqMap, keys: string[], dreamCount: number): number {
    if (dreamCount === 0) return 0;
    const total = [...freq.values()].reduce((s, v) => s + v, 0) || 1;
    const matching = keys.reduce((s, k) => s + (freq.get(k) ?? 0), 0);
    return Math.min(100, Math.round((matching / total) * 200));
  }

  private async resonanceScore(userId: string, dreamCount: number): Promise<number> {
    if (dreamCount === 0) return 0;
    const [row] = await this.ds.query<[{ avg: string | null }]>(
      `SELECT AVG(match_score)::numeric(5,1) AS avg
       FROM dream_matches
       WHERE user_id_a = $1 OR user_id_b = $1`,
      [userId],
    );
    return Math.min(100, Math.round(Number(row?.avg ?? 0)));
  }

  private async connectionScore(userId: string, dreamCount: number): Promise<number> {
    if (dreamCount === 0) return 0;
    const [row] = await this.ds.query<[{ cnt: string }]>(
      `SELECT COUNT(DISTINCT CASE WHEN user_id_a = $1 THEN user_id_b ELSE user_id_a END)::int AS cnt
       FROM dream_matches
       WHERE user_id_a = $1 OR user_id_b = $1`,
      [userId],
    );
    const connections = Number(row?.cnt ?? 0);
    return Math.min(100, Math.round((connections / dreamCount) * 50));
  }

  private toResult(identity: DreamIdentity, isStale: boolean): DreamIdentityResult {
    const primary   = ARCHETYPES[identity.primaryArchetype]   ?? ARCHETYPES.observer!;
    const secondary = ARCHETYPES[identity.secondaryArchetype] ?? ARCHETYPES.seeker!;
    return {
      primaryArchetype:            identity.primaryArchetype,
      primaryArchetypeName:        primary.name,
      primaryArchetypeEnglish:     primary.englishName,
      primaryArchetypeEmoji:       primary.emoji,
      primaryArchetypeDescription: primary.description,
      primaryArchetypeScore:       identity.primaryArchetypeScore,
      secondaryArchetype:          identity.secondaryArchetype,
      secondaryArchetypeName:      secondary.name,
      secondaryArchetypeEnglish:   secondary.englishName,
      secondaryArchetypeEmoji:     secondary.emoji,
      secondaryArchetypeScore:     identity.secondaryArchetypeScore,
      personalitySummary:          identity.personalitySummary,
      dominantThemes:              identity.dominantThemes,
      dominantEmotions:            identity.dominantEmotions,
      dominantSymbols:             identity.dominantSymbols,
      dominantLocations:           identity.dominantLocations,
      dominantArchetypes:          identity.dominantArchetypes,
      resonanceScore:              identity.resonanceScore,
      lucidScore:                  identity.lucidScore,
      transformationScore:         identity.transformationScore,
      wonderScore:                 identity.wonderScore,
      connectionScore:             identity.connectionScore,
      dreamCount:                  identity.dreamCount,
      computedAt:                  identity.computedAt,
      isStale,
    };
  }
}
