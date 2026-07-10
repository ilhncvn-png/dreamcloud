import { Injectable } from '@nestjs/common';
import type {
  DreamAnalysisResult,
  ExtractedEmotion,
  ExtractedFigure,
  ExtractedLocation,
  ExtractedObject,
  ExtractedSymbol,
  ExtractedTheme,
  IDreamAnalyzer,
} from './ai-analysis.interface';

// ─── vocabulary tables ─────────────────────────────────────────────────────────

const THEME_PATTERNS: Array<{ theme: string; family: string; keywords: string[] }> = [
  { theme: 'pursuit',      family: 'control',    keywords: ['koş', 'kaç', 'kovalıyor', 'peşimde', 'takip', 'kaçıyordum', 'run', 'chase', 'follow', 'escape', 'flee', 'running', 'chasing'] },
  { theme: 'threshold',    family: 'transition', keywords: ['kapı', 'köprü', 'sınır', 'geçiş', 'eşik', 'door', 'bridge', 'threshold', 'crossing', 'gate', 'portal', 'border'] },
  { theme: 'falling',      family: 'control',    keywords: ['düştüm', 'düşüyordum', 'uçurum', 'fall', 'falling', 'fell', 'dropped', 'plunging', 'abyss'] },
  { theme: 'flying',       family: 'expansion',  keywords: ['uçtum', 'uçuyordum', 'fly', 'flying', 'flew', 'float', 'floating', 'soaring', 'levitate'] },
  { theme: 'entrapment',   family: 'control',    keywords: ['kilitli', 'hapis', 'çıkamıyordum', 'labirent', 'sıkışmış', 'trapped', 'locked', 'stuck', 'maze', 'prison', 'cage', 'paralysis', 'paralyzed'] },
  { theme: 'reunion',      family: 'loss',       keywords: ['buldum', 'kavuştum', 'yeniden', 'özledim', 'found', 'reunion', 'reunited', 'met again', 'missing person'] },
  { theme: 'exposure',     family: 'identity',   keywords: ['çıplak', 'utanç', 'herkes bakıyor', 'naked', 'nude', 'embarrassed', 'shame', 'exposed', 'everyone watching'] },
  { theme: 'discovery',    family: 'growth',     keywords: ['gizli oda', 'keşfettim', 'yeni yer', 'hidden room', 'discovered', 'secret room', 'unexplored', 'new place', 'found a room'] },
  { theme: 'loss',         family: 'loss',       keywords: ['öldü', 'kayboldu', 'kaybettim', 'death', 'died', 'lost', 'gone', 'disappeared', 'missing'] },
  { theme: 'transformation', family: 'growth',   keywords: ['değişti', 'dönüştü', 'başka biri oldum', 'transform', 'changed', 'metamorphosis', 'became', 'turning into'] },
  { theme: 'confrontation', family: 'identity',  keywords: ['yüzleştim', 'karşıma çıktı', 'dövüştüm', 'confront', 'faced', 'fight', 'fought', 'confronted', 'stood up to'] },
  { theme: 'protection',   family: 'care',       keywords: ['korumak', 'kurtarmak', 'protect', 'save', 'rescue', 'defend', 'shelter', 'guard'] },
];

const EMOTION_PATTERNS: Array<{ emotion: string; intensity: 'low'|'moderate'|'high'|'overwhelming'; keywords: string[] }> = [
  { emotion: 'fear',       intensity: 'high',        keywords: ['korktum', 'korku', 'dehşet', 'fear', 'afraid', 'scared', 'terrified', 'terror', 'dread', 'horrified', 'nightmare'] },
  { emotion: 'anxiety',    intensity: 'moderate',    keywords: ['endişe', 'kaygı', 'stres', 'anxiety', 'anxious', 'worried', 'stress', 'nervous', 'uneasy', 'panic'] },
  { emotion: 'joy',        intensity: 'high',        keywords: ['mutlu', 'sevinç', 'neşe', 'joy', 'happy', 'happiness', 'excited', 'elated', 'wonderful', 'amazing'] },
  { emotion: 'peace',      intensity: 'moderate',    keywords: ['huzur', 'sakin', 'dingin', 'peace', 'peaceful', 'calm', 'serene', 'tranquil', 'still', 'quiet'] },
  { emotion: 'sadness',    intensity: 'moderate',    keywords: ['üzüldüm', 'ağladım', 'hüzün', 'sad', 'sadness', 'crying', 'cried', 'grief', 'sorrow', 'melancholy'] },
  { emotion: 'nostalgia',  intensity: 'moderate',    keywords: ['özlem', 'eski', 'çocukluğum', 'nostalgia', 'nostalgic', 'childhood', 'old memories', 'longing', 'miss'] },
  { emotion: 'confusion',  intensity: 'moderate',    keywords: ['anlamadım', 'nerede', 'kafam karışık', 'confused', 'confusion', 'disoriented', 'lost', 'bewildered'] },
  { emotion: 'wonder',     intensity: 'high',        keywords: ['şaşırdım', 'inanılmaz', 'büyülü', 'wonder', 'amazed', 'awe', 'magical', 'incredible', 'astonished'] },
  { emotion: 'shame',      intensity: 'high',        keywords: ['utandım', 'mahçup', 'rezil', 'shame', 'ashamed', 'humiliated', 'embarrassed', 'guilt', 'guilty'] },
  { emotion: 'loneliness', intensity: 'moderate',    keywords: ['yalnız', 'tek başıma', 'kimse yok', 'alone', 'lonely', 'loneliness', 'isolated', 'no one', 'empty'] },
  { emotion: 'anger',      intensity: 'high',        keywords: ['kızgın', 'öfke', 'sinir', 'angry', 'anger', 'furious', 'rage', 'mad', 'frustrated'] },
  { emotion: 'love',       intensity: 'high',        keywords: ['sevgi', 'aşk', 'seviyorum', 'love', 'loving', 'affection', 'romantic', 'tender'] },
];

const FIGURE_PATTERNS = {
  unknown:  ['yabancı', 'tanımadığım', 'biri', 'stranger', 'someone', 'unknown person', 'a man', 'a woman', 'a figure', 'a shadow', 'silhouette'],
  pursuer:  ['kovalıyordu', 'peşimden', 'arkamdan', 'chasing me', 'following me', 'pursuer', 'after me'],
  guide:    ['rehber', 'gösterdi', 'yol gösterdi', 'guide', 'showed me', 'led me', 'pointing the way'],
  observer: ['izliyordu', 'bakıyordu', 'sessizce', 'watching', 'staring', 'observing', 'silent'],
  elder:    ['yaşlı', 'bilge', 'büyükanne', 'büyükbaba', 'old man', 'old woman', 'wise', 'grandmother', 'grandfather'],
  child:    ['çocuk', 'bebek', 'küçük', 'child', 'baby', 'little', 'kid', 'young'],
  shadow:   ['karanlık figür', 'gölge', 'kötü', 'dark figure', 'shadow', 'evil', 'threatening figure'],
};

const LOCATION_PATTERNS: Array<{ type: string; archetype: string; tier: 1|2|3; keywords: string[] }> = [
  { type: 'childhood_home', archetype: 'origin',       tier: 2, keywords: ['çocukluk evim', 'eski evimiz', 'büyüdüğüm', 'childhood home', 'old house', 'grew up', 'parents house'] },
  { type: 'dark_forest',    archetype: 'unconscious',  tier: 2, keywords: ['karanlık orman', 'ormanda', 'dark forest', 'forest', 'woods', 'trees', 'jungle'] },
  { type: 'ocean',          archetype: 'unconscious',  tier: 2, keywords: ['okyanus', 'deniz', 'su', 'ocean', 'sea', 'water', 'waves', 'beach'] },
  { type: 'corridor',       archetype: 'liminal',      tier: 2, keywords: ['koridor', 'uzun yol', 'corridor', 'hallway', 'endless hall', 'long passage'] },
  { type: 'underground',    archetype: 'descent',      tier: 2, keywords: ['bodrum', 'yeraltı', 'mağara', 'underground', 'basement', 'cave', 'tunnel'] },
  { type: 'rooftop',        archetype: 'exposure',     tier: 2, keywords: ['çatı', 'tepe', 'rooftop', 'rooftop', 'mountain top', 'peak', 'high up', 'cliff'] },
  { type: 'school',         archetype: 'judgment',     tier: 2, keywords: ['okul', 'sınav', 'öğretmen', 'school', 'exam', 'classroom', 'teacher', 'test'] },
  { type: 'hospital',       archetype: 'healing',      tier: 2, keywords: ['hastane', 'doktor', 'hospital', 'doctor', 'medical', 'sick', 'healing'] },
  { type: 'city',           archetype: 'collective',   tier: 2, keywords: ['şehir', 'sokak', 'cadde', 'city', 'street', 'town', 'urban', 'downtown'] },
  { type: 'unknown_house',  archetype: 'psyche',       tier: 2, keywords: ['bilinmeyen ev', 'yabancı ev', 'oda oda', 'unknown house', 'strange house', 'unfamiliar house', 'many rooms'] },
];

const SYMBOL_PATTERNS: Array<{ category: string; universal: boolean; keywords: string[] }> = [
  { category: 'threshold',       universal: true,  keywords: ['kapı', 'köprü', 'geçit', 'door', 'bridge', 'gate', 'crossing', 'threshold'] },
  { category: 'shadow',          universal: true,  keywords: ['gölge', 'karanlık varlık', 'shadow', 'dark presence', 'dark figure'] },
  { category: 'flood',           universal: true,  keywords: ['sel', 'su basması', 'taşma', 'flood', 'rising water', 'overflow', 'tidal wave'] },
  { category: 'abyss',           universal: true,  keywords: ['uçurum', 'dipsiz', 'abyss', 'endless fall', 'bottomless pit', 'void', 'chasm'] },
  { category: 'guide',           universal: true,  keywords: ['rehber', 'beyaz hayvan', 'guide', 'white animal', 'white deer', 'wise figure', 'guardian'] },
  { category: 'transformation',  universal: true,  keywords: ['dönüşüm', 'değişim', 'transformation', 'metamorphosis', 'changing', 'shapeshifting'] },
  { category: 'mirror_self',     universal: true,  keywords: ['ayna', 'yansıma', 'ikiz', 'mirror', 'reflection', 'twin', 'double', 'doppelganger'] },
  { category: 'labyrinth',       universal: true,  keywords: ['labirent', 'çıkmaz', 'labyrinth', 'maze', 'getting lost', 'no way out'] },
  { category: 'absent_presence', universal: false, keywords: ['yokluğu hissettim', 'olmayan biri', 'absence felt', 'felt someone', 'presence without body'] },
  { category: 'peaceful_void',   universal: false, keywords: ['sonsuz huzur', 'hiçlik', 'boşluk ama iyi', 'void peace', 'infinite peace', 'nothingness but good'] },
];

const OBJECT_PATTERNS: Array<{ name: string; category: string; type: string; keywords: string[] }> = [
  { name: 'door',    category: 'door',    type: 'transition',     keywords: ['kapı', 'door', 'doors'] },
  { name: 'key',     category: 'key',     type: 'transition',     keywords: ['anahtar', 'key', 'keys', 'unlock'] },
  { name: 'mirror',  category: 'mirror',  type: 'transformation', keywords: ['ayna', 'mirror', 'reflection'] },
  { name: 'staircase', category: 'staircase', type: 'transition', keywords: ['merdiven', 'staircase', 'stairs', 'steps'] },
  { name: 'clock',   category: 'clock',   type: 'transformation', keywords: ['saat', 'clock', 'watch', 'time running out'] },
  { name: 'phone',   category: 'phone',   type: 'personal',       keywords: ['telefon', 'phone', 'mobile', "couldn't call", 'no signal'] },
  { name: 'vehicle', category: 'vehicle', type: 'transition',     keywords: ['araba', 'tren', 'uçak', 'gemi', 'car', 'train', 'plane', 'ship', 'boat'] },
  { name: 'weapon',  category: 'weapon',  type: 'transformation', keywords: ['silah', 'bıçak', 'kılıç', 'weapon', 'knife', 'sword', 'gun'] },
  { name: 'bridge',  category: 'bridge',  type: 'transition',     keywords: ['köprü', 'bridge'] },
  { name: 'fire',    category: 'fire',    type: 'transformation', keywords: ['ateş', 'alev', 'yangın', 'fire', 'flame', 'burning', 'blaze'] },
  { name: 'water',   category: 'water',   type: 'transformation', keywords: ['su', 'nehir', 'göl', 'water', 'river', 'lake', 'rain'] },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function matches(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function confidence(matchCount: number): number {
  return Math.min(0.95, 0.6 + matchCount * 0.1);
}

// ─── Stub Analyzer ────────────────────────────────────────────────────────────

@Injectable()
export class StubAnalyzerService implements IDreamAnalyzer {
  async analyze(
    dreamId: string,
    title: string | null,
    content: string,
  ): Promise<DreamAnalysisResult> {
    const text = `${title ?? ''} ${content}`;

    // ── Themes ────────────────────────────────────────────────────────────────
    const themes: ExtractedTheme[] = [];
    for (const p of THEME_PATTERNS) {
      const hits = p.keywords.filter((kw) => text.toLowerCase().includes(kw.toLowerCase())).length;
      if (hits > 0) {
        themes.push({
          theme: p.theme,
          themeFamily: p.family,
          isPrimary: false,
          confidence: confidence(hits),
        });
      }
    }
    themes.sort((a, b) => b.confidence - a.confidence);
    const primaryTheme = themes[0];
    if (primaryTheme) primaryTheme.isPrimary = true;

    // ── Emotions ──────────────────────────────────────────────────────────────
    const emotions: ExtractedEmotion[] = [];
    for (const p of EMOTION_PATTERNS) {
      const hits = p.keywords.filter((kw) => text.toLowerCase().includes(kw.toLowerCase())).length;
      if (hits > 0) {
        emotions.push({
          emotion: p.emotion,
          intensity: p.intensity,
          isPrimary: false,
          isResidual: false,
          arcPosition: 'throughout',
        });
      }
    }
    emotions.sort((a, b) => {
      const iOrder = { overwhelming: 4, high: 3, moderate: 2, low: 1 };
      return iOrder[b.intensity] - iOrder[a.intensity];
    });
    const primaryEmotion = emotions[0];
    if (primaryEmotion) primaryEmotion.isPrimary = true;
    // Simple arc: if fear + peace both exist, mark as arc
    const hasFear  = emotions.some((e) => e.emotion === 'fear');
    const hasPeace = emotions.some((e) => e.emotion === 'peace');
    const emotionalArc = hasFear && hasPeace ? { from: 'fear', to: 'peace' } : null;

    // ── Figures ───────────────────────────────────────────────────────────────
    const figures: ExtractedFigure[] = [];
    if (matches(text, FIGURE_PATTERNS.unknown)) {
      const isPursuer  = matches(text, FIGURE_PATTERNS.pursuer);
      const isObserver = matches(text, FIGURE_PATTERNS.observer);
      const isShadow   = matches(text, FIGURE_PATTERNS.shadow);
      figures.push({
        figureType: 'unknown',
        isKnown: false,
        relationshipType: 'stranger',
        archetypeCandidate: isShadow ? 'shadow' : isPursuer ? 'shadow' : isObserver ? 'witness' : 'unknown',
        archetypeConfidence: 0.65,
        qualityDescriptors: [
          ...(isPursuer  ? ['threatening', 'pursuing'] : []),
          ...(isObserver ? ['silent', 'observing']     : []),
          ...(isShadow   ? ['dark', 'ominous']         : []),
        ],
        narrativeRole: isPursuer ? 'pursuer' : isObserver ? 'observer' : null,
      });
    }
    if (matches(text, FIGURE_PATTERNS.elder)) {
      figures.push({
        figureType: 'known_personal',
        isKnown: true,
        relationshipType: 'family',
        archetypeCandidate: 'wise_elder',
        archetypeConfidence: 0.75,
        qualityDescriptors: ['wise', 'aged'],
        narrativeRole: 'guide',
      });
    }
    if (matches(text, FIGURE_PATTERNS.child)) {
      figures.push({
        figureType: 'unknown',
        isKnown: false,
        relationshipType: null,
        archetypeCandidate: 'child',
        archetypeConfidence: 0.70,
        qualityDescriptors: ['young', 'innocent'],
        narrativeRole: 'companion',
      });
    }
    if (matches(text, FIGURE_PATTERNS.guide) && !matches(text, FIGURE_PATTERNS.elder)) {
      figures.push({
        figureType: 'unknown',
        isKnown: false,
        relationshipType: null,
        archetypeCandidate: 'guide',
        archetypeConfidence: 0.72,
        qualityDescriptors: ['guiding', 'directing'],
        narrativeRole: 'guide',
      });
    }

    // ── Locations ─────────────────────────────────────────────────────────────
    const locations: ExtractedLocation[] = [];
    for (const p of LOCATION_PATTERNS) {
      if (matches(text, p.keywords)) {
        locations.push({
          locationTier: p.tier,
          name: null,
          locationType: p.type,
          archetypeType: p.archetype,
          emotionalTone: emotions[0]?.emotion ?? null,
          isDistorted: matches(text, ['değişiyordu', 'distorted', 'shifting', 'wrong', 'wasn\'t right', 'strange version']),
          geographicHint: null,
        });
      }
    }

    // ── Symbols ───────────────────────────────────────────────────────────────
    const symbols: ExtractedSymbol[] = [];
    for (const p of SYMBOL_PATTERNS) {
      const hits = p.keywords.filter((kw) => text.toLowerCase().includes(kw.toLowerCase())).length;
      if (hits > 0) {
        symbols.push({
          symbolCategory: p.category,
          manifestation: null,
          emotionalContext: emotions[0]?.emotion ?? null,
          narrativeFunction: 'passive',
          isUniversal: p.universal,
          confidence: confidence(hits),
        });
      }
    }

    // ── Objects ───────────────────────────────────────────────────────────────
    const objects: ExtractedObject[] = [];
    for (const p of OBJECT_PATTERNS) {
      if (matches(text, p.keywords)) {
        objects.push({
          objectName: p.name,
          objectType: p.type,
          symbolicCategory: p.category,
          narrativeFunction: null,
          emotionalContext: emotions[0]?.emotion ?? null,
          isImpossible: false,
        });
      }
    }

    const rawResponse: Record<string, unknown> = {
      analyzer: 'stub-v1',
      dreamId,
      inputLength: text.length,
      themesFound: themes.length,
      emotionsFound: emotions.length,
      figuresFound: figures.length,
      locationsFound: locations.length,
      symbolsFound: symbols.length,
      objectsFound: objects.length,
    };

    return {
      modelVersion: 'stub-v1',
      primaryTheme: themes[0]?.theme ?? null,
      primaryEmotion: emotions[0]?.emotion ?? null,
      emotionalIntensity: emotions[0]?.intensity ?? null,
      emotionalArc,
      residualEmotion: hasPeace && hasFear ? 'peace' : emotions[0]?.emotion ?? null,
      themes,
      emotions,
      figures,
      locations,
      symbols,
      objects,
      rawResponse,
    };
  }
}
