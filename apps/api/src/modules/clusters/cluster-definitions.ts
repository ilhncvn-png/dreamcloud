export interface ClusterDefinition {
  slug: string;
  name: string;
  description: string;
  primaryTheme: string;
  primarySymbol: string;
  primaryEmotion: string;
  primaryArchetype: string;
  criteria: {
    themes: string[];
    symbols: string[];
    emotions: string[];
    locations: string[];
    archetypes: string[];
  };
}

export const CLUSTER_DEFINITIONS: ClusterDefinition[] = [
  {
    slug: 'gokyuzu-gezginleri',
    name: 'Gökyüzü Gezginleri',
    description:
      'Rüyalarında uçan, yükselen ve sınırları aşan rüyacılar. Özgürlük ve yücelik onların bilinçdışı dilidir.',
    primaryTheme: 'flying',
    primarySymbol: 'light',
    primaryEmotion: 'wonder',
    primaryArchetype: 'hero',
    criteria: {
      themes: ['flying', 'ascent', 'journey'],
      symbols: ['light', 'void', 'guide'],
      emotions: ['joy', 'wonder', 'excitement', 'peace'],
      locations: ['mountain', 'rooftop'],
      archetypes: ['hero', 'guide'],
    },
  },
  {
    slug: 'deniz-hafizasi',
    name: 'Deniz Hafızası',
    description:
      'Okyanus, su ve derinlik imgelerini taşıyan rüyacılar. Bilinçaltının en eski katmanlarına dalıyorlar.',
    primaryTheme: 'water',
    primarySymbol: 'flood',
    primaryEmotion: 'peace',
    primaryArchetype: 'child',
    criteria: {
      themes: ['water', 'descent', 'loss', 'reunion'],
      symbols: ['flood', 'mirror_self', 'abyss'],
      emotions: ['peace', 'loneliness', 'love', 'nostalgia'],
      locations: ['ocean', 'underwater'],
      archetypes: ['child', 'anima'],
    },
  },
  {
    slug: 'kayip-sehirler',
    name: 'Kayıp Şehirler',
    description:
      'Labirent sokaklarda, unutulmuş binalarda ve kaybolmuş şehirlerde dolaşan rüyacılar. Nostalji onların izleri.',
    primaryTheme: 'loss',
    primarySymbol: 'labyrinth',
    primaryEmotion: 'nostalgia',
    primaryArchetype: 'shadow',
    criteria: {
      themes: ['loss', 'threshold', 'entrapment', 'journey'],
      symbols: ['labyrinth', 'threshold', 'door'],
      emotions: ['loneliness', 'nostalgia', 'sadness', 'confusion'],
      locations: ['city', 'corridor', 'underground', 'school'],
      archetypes: ['shadow', 'trickster'],
    },
  },
  {
    slug: 'gece-yolculari',
    name: 'Gece Yolcuları',
    description:
      'Sürekli hareket halinde olan rüyacılar. Karanlık yollar, koridorlar ve bilinmeyene doğru yolculuklar.',
    primaryTheme: 'pursuit',
    primarySymbol: 'threshold',
    primaryEmotion: 'anxiety',
    primaryArchetype: 'guide',
    criteria: {
      themes: ['pursuit', 'journey', 'threshold', 'chase'],
      symbols: ['threshold', 'guide', 'labyrinth'],
      emotions: ['anxiety', 'wonder', 'excitement', 'fear'],
      locations: ['corridor', 'underground', 'city'],
      archetypes: ['guide', 'trickster'],
    },
  },
  {
    slug: 'esik-geçenler',
    name: 'Eşik Geçenler',
    description:
      'Dönüşüm anlarını yaşayan rüyacılar. Her kapı, her geçit bir öncekinden farklı bir benliğe açılır.',
    primaryTheme: 'threshold',
    primarySymbol: 'threshold',
    primaryEmotion: 'wonder',
    primaryArchetype: 'wise_elder',
    criteria: {
      themes: ['threshold', 'transformation', 'death', 'birth'],
      symbols: ['threshold', 'door', 'light', 'transformation'],
      emotions: ['wonder', 'fear', 'awe', 'peace'],
      locations: ['forest', 'corridor', 'underground'],
      archetypes: ['wise_elder', 'child'],
    },
  },
  {
    slug: 'golge-takipcileri',
    name: 'Gölge Takipçileri',
    description:
      'Kaçış, kovalanma ve düşüş imgelerini taşıyan rüyacılar. Gölge onları takip eder ama asla yakalamaz.',
    primaryTheme: 'pursuit',
    primarySymbol: 'shadow',
    primaryEmotion: 'fear',
    primaryArchetype: 'shadow',
    criteria: {
      themes: ['pursuit', 'chase', 'falling', 'descent', 'entrapment'],
      symbols: ['shadow', 'abyss', 'labyrinth'],
      emotions: ['fear', 'anxiety', 'anger', 'loneliness'],
      locations: ['underground', 'forest', 'corridor'],
      archetypes: ['shadow', 'trickster'],
    },
  },
  {
    slug: 'lucid-kasifler',
    name: 'Lucid Kaşifler',
    description:
      'Rüyalarının farkında olan ve bilinçli olarak keşfeden rüyacılar. Rüya ve gerçeklik arasındaki perdeyi kaldırırlar.',
    primaryTheme: 'flying',
    primarySymbol: 'light',
    primaryEmotion: 'wonder',
    primaryArchetype: 'wise_elder',
    criteria: {
      themes: ['flying', 'ascent', 'transformation', 'reunion', 'journey'],
      symbols: ['light', 'threshold', 'guide', 'mirror_self'],
      emotions: ['wonder', 'joy', 'peace', 'excitement'],
      locations: ['mountain', 'ocean', 'rooftop'],
      archetypes: ['wise_elder', 'hero', 'guide'],
    },
  },
  {
    slug: 'donusum-ruyacilari',
    name: 'Dönüşüm Rüyacıları',
    description:
      'Ölüm, yeniden doğuş ve metamorfoz rüyaları görenler. Her rüya bir önceki benliğin sona erişidir.',
    primaryTheme: 'transformation',
    primarySymbol: 'mirror_self',
    primaryEmotion: 'wonder',
    primaryArchetype: 'anima',
    criteria: {
      themes: ['transformation', 'death', 'birth', 'reunion', 'ascent'],
      symbols: ['mirror_self', 'transformation', 'threshold', 'flood'],
      emotions: ['wonder', 'love', 'fear', 'sadness', 'nostalgia'],
      locations: ['forest', 'ocean', 'underground'],
      archetypes: ['anima', 'animus', 'wise_elder', 'child'],
    },
  },
];
