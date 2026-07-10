import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Avatar from '@/components/Avatar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { search } from '@/api/search.api';
import { getAllClusters } from '@/api/clusters.api';
import { getTrendingByPeriod } from '@/api/places.api';
import { getSignalsToday } from '@/api/signals.api';
import { getWeatherNow } from '@/api/weather.api';
import { Colors, CategoryColors } from '@/constants/colors';
import { EMOTION_LABEL } from '@/utils/dreamLanguage';
import type { DreamCluster } from '@/types/cluster.types';
import type { TrendingPlace, DreamPlaceType } from '@/types/place.types';
import type { DreamSignals, SignalItem } from '@/types/signal.types';
import type { DreamWeather } from '@/types/weather.types';
import type { DreamSearchResult, UserSearchResult, TagSearchResult } from '@/types/search.types';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Label maps ────────────────────────────────────────────────────────────────

const THEME_TR: Record<string, string> = {
  transformation: 'Dönüşüm', threshold: 'Eşik', flying: 'Uçuş',
  falling: 'Düşüş', pursuit: 'Takip', loss: 'Kayıp',
  reunion: 'Kavuşma', discovery: 'Keşif', confrontation: 'Yüzleşme',
  protection: 'Koruma', entrapment: 'Sıkışma', exposure: 'Açığa Çıkma',
  chase: 'Kovalama', water: 'Su', fire: 'Ateş',
  descent: 'İniş', ascent: 'Yükseliş', school: 'Okul',
  death: 'Ölüm', birth: 'Doğum', journey: 'Yolculuk',
};

const SYMBOL_TR: Record<string, string> = {
  threshold: 'Eşik', shadow: 'Gölge', flood: 'Sel', abyss: 'Uçurum',
  guide: 'Rehber', labyrinth: 'Labirent', door: 'Kapı', mirror_self: 'Ayna',
  tree: 'Ağaç', water: 'Su', key: 'Anahtar', light: 'Işık', fire: 'Ateş',
  flying: 'Uçuş', falling: 'Düşüş', sea: 'Deniz', old_house: 'Eski Ev',
  animal: 'Hayvan', child: 'Çocuk', chase: 'Takip', vehicle: 'Araç',
  transformation: 'Dönüşüm',
};

const ARCHETYPE_TR: Record<string, string> = {
  shadow: 'Gölge', anima: 'Anima', animus: 'Animus',
  wise_elder: 'Bilge', trickster: 'Düzenbaz', guide: 'Rehber',
  hero: 'Kahraman', child: 'İlahi Çocuk', great_mother: 'Büyük Ana',
  explorer: 'Kaşif', guardian: 'Koruyucu',
};

const LOCATION_TR: Record<string, string> = {
  forest: 'Orman', ocean: 'Okyanus', city: 'Şehir', childhood_home: 'Çocukluk Evi',
  corridor: 'Koridor', underground: 'Yeraltı', mountain: 'Dağ', school: 'Okul',
  hospital: 'Hastane', desert: 'Çöl', sea: 'Deniz', rooftop: 'Çatı',
  cave: 'Mağara', bridge: 'Köprü', unknown_city: 'Tanımsız Şehir',
  old_house: 'Eski Ev', temple: 'Tapınak', labyrinth: 'Labirent',
};

// ── Dream Atlas static data ───────────────────────────────────────────────────

interface TerritoryConfig {
  emoji: string; name: string; desc: string; color: string;
  keys: string[]; defaultEmotion: string;
}

const TERRITORY_CONFIG: Record<string, TerritoryConfig> = {
  waters:         { emoji: '🌊', name: 'Duygu Suları',       color: '#4A90D9', defaultEmotion: 'Özlem',
    keys: ['ocean', 'sea', 'lake', 'flood'],
    desc: 'Bilinçdışının en derin ve akışkan alanı. Duygusal dönüşümün metaforik denizi.' },
  nature:         { emoji: '🌲', name: 'Yaşayan Doğa',       color: '#2D9362', defaultEmotion: 'Merak',
    keys: ['forest', 'mountain', 'desert', 'tree'],
    desc: 'İçgüdülerin ve kolektif belleğin mekânı. Şehirden uzak, arkaik olan.' },
  transformation: { emoji: '⚡', name: 'Dönüşüm Bölgeleri',  color: '#7B5EA7', defaultEmotion: 'Korku',
    keys: ['cave', 'underground', 'basement', 'labyrinth'],
    desc: 'Bilinçdışının yeraltı katmanları. İnişin ve dönüşümün mekânı.' },
  threshold:      { emoji: '🚪', name: 'Eşik Alanları',      color: '#B08B3A', defaultEmotion: 'Kaygı',
    keys: ['bridge', 'corridor', 'rooftop'],
    desc: 'İki dünyanın arasındaki geçiş noktaları. Ne burası ne orası.' },
  sacred:         { emoji: '🕯', name: 'Kutsal Mekânlar',    color: '#9B4F7A', defaultEmotion: 'Huşu',
    keys: ['temple', 'old_house', 'childhood_home'],
    desc: 'Kolektif anlam ve spiritüel yönelişin odaklandığı yerler.' },
  cities:         { emoji: '🌃', name: 'İnsan Şehirleri',    color: '#5A6478', defaultEmotion: 'Kaygı',
    keys: ['city', 'unknown_city', 'school', 'hospital'],
    desc: 'Toplumsal anksiyete ve kentsel deneyimin kolektif sahası.' },
};

const LOCATION_TERRITORY_MAP: Record<string, string> = {
  ocean: 'waters', sea: 'waters', lake: 'waters', flood: 'waters',
  forest: 'nature', mountain: 'nature', desert: 'nature',
  cave: 'transformation', underground: 'transformation', labyrinth: 'transformation',
  bridge: 'threshold', corridor: 'threshold', rooftop: 'threshold',
  temple: 'sacred', old_house: 'sacred', childhood_home: 'sacred',
  city: 'cities', unknown_city: 'cities', school: 'cities', hospital: 'cities',
};

const PLACE_SYMBOLIC: Record<string, { title: string; meaning: string }> = {
  istanbul:      { title: 'Kavuşmaların Şehri', meaning: 'Doğu ve batı bilinçlerinin kesiştiği kadim kavşak noktası.' },
  ankara:        { title: 'Düzenin Kalesi',     meaning: 'Otorite ve yapısal düzenin bilinçdışı yansıması.' },
  izmir:         { title: 'Deniz Kapısı',       meaning: 'Bilinç ile bilinçdışı arasındaki kıyı şeridi.' },
  paris:         { title: 'Erişilmez İdeal',    meaning: 'Hayal edilen ama asla tam olarak ulaşılamayan mükemmellik.' },
  london:        { title: 'Gizemli Büyükkent',  meaning: 'Sis içinde kaybolmuş kimlik ve belirsiz beklentiler.' },
  rome:          { title: 'Geçmişin Mirası',    meaning: 'Kolektif tarihin ve derinlere uzanan köklerin mekânı.' },
  roma:          { title: 'Geçmişin Mirası',    meaning: 'Kolektif tarihin ve derinlere uzanan köklerin mekânı.' },
  tokyo:         { title: 'Düzen ve Kaos',      meaning: 'Modernliğin ve geleneğin arasında kalan bilinç.' },
  berlin:        { title: 'Bölünmüş Bellek',    meaning: 'Tarihsel travma ve yeniden doğuşun şehri.' },
  new_york:      { title: 'Sonsuz Olasılıklar', meaning: 'Başarı, kaygı ve sonsuz potansiyelin metropolü.' },
  new_york_city: { title: 'Sonsuz Olasılıklar', meaning: 'Başarı, kaygı ve sonsuz potansiyelin metropolü.' },
  eiffel_tower:  { title: 'Erişilmez İdeal',    meaning: 'Uzaktan bakan, hiç ulaşamayan. Hayranlığın mimarisi.' },
  machu_picchu:  { title: 'Kayıp Bilgelik',     meaning: 'Unutulmuş bilgeliğin ve kadim ruhun sığınağı.' },
  pyramids:      { title: 'Ölümsüzlüğe Adım',  meaning: 'Zamanın ötesinde bir varoluşun taş hali.' },
  colosseum:     { title: 'Gücün Kalıntısı',    meaning: 'Kolektif bilinçte hâlâ çınlayan tarihsel güç.' },
  taj_mahal:     { title: 'Ölümsüz Aşk',        meaning: 'Sevginin taşa dönüşmüş hali. Kayıp ve kalıcılık.' },
  amazon:        { title: 'İlk Orman',           meaning: 'Medeniyetten önceki vahşi ve arkaik yaşam.' },
};

const PLACE_TYPE_MEANING: Record<DreamPlaceType, { title: string; meaning: string }> = {
  CITY:       { title: 'Kentsel Bilinçdışı',    meaning: 'Toplumsal anksiyete ve kentsel deneyimin kolektif sahası.' },
  COUNTRY:    { title: 'Kolektif Kimlik',        meaning: 'Köken, aidiyet ve kültürel belleğin coğrafyası.' },
  LANDMARK:   { title: 'Kolektif Simge',         meaning: 'Milyonlarca bireyin hayal gücünde yaşayan arketip imge.' },
  HOTEL:      { title: 'Geçiciliğin Alanı',      meaning: 'Ne buraya ait ne oraya. Kimlik eşiğinde varoluş.' },
  RESTAURANT: { title: 'Paylaşımın Ritüeli',     meaning: 'Beslenme, bağlantı ve paylaşımın arketip mekânı.' },
  CAFE:       { title: 'Düşüncenin Sığınağı',   meaning: 'Geçici dinginlik ve derin sohbetin alanı.' },
  STREET:     { title: 'Yolculuğun Arasında',    meaning: 'Hedefler arasındaki belirsiz geçiş mekânı.' },
  BUILDING:   { title: 'Gizli Katmanlar',        meaning: 'Yapısal düzenin arkasındaki keşfedilmemiş odalar.' },
  NATURE:     { title: 'Arkaik Alan',             meaning: 'İçgüdüsel ve kolektif belleğin yaşayan mekânı.' },
  UNKNOWN:    { title: 'Bilinmeyenin Çağrısı',   meaning: 'Tanımsız yerler bilinçdışının sınırlarını işaret eder.' },
};

interface RouteDefinition {
  id: string; name: string; icon: string; desc: string;
  steps: string[]; stepLabels: string[];
}

const CONSCIOUSNESS_ROUTES_DEF: RouteDefinition[] = [
  { id: 'hero',    name: 'KAHRAMAN YOLU', icon: '🦅',
    desc: 'Köyden tapınağa uzanan evrensel bireyleşme yolculuğu. Her adım bir içsel dönüşümü simgeler.',
    steps: ['old_house', 'forest', 'mountain', 'temple'], stepLabels: ['Ev', 'Orman', 'Dağ', 'Tapınak'] },
  { id: 'descent', name: 'İNİŞ',          icon: '🌑',
    desc: 'Bilinçdışının derinliklerine doğru zorunlu iniş. Dönüşümün ön koşulu.',
    steps: ['old_house', 'underground', 'cave', 'labyrinth'], stepLabels: ['Ev', 'Yeraltı', 'Mağara', 'Labirent'] },
  { id: 'return',  name: 'DÖNÜŞ',         icon: '🌊',
    desc: 'Uzaktan geri dönen bilinçaltı. Kök arayışı ve kavuşma özlemi.',
    steps: ['sea', 'corridor', 'childhood_home'], stepLabels: ['Deniz', 'Koridor', 'Ev'] },
  { id: 'sacred',  name: 'HAC YOLCULUĞU', icon: '🕯',
    desc: 'Dünyevi mekânlardan kutsal alana uzanan spiritüel yol. Anlam arayışının coğrafyası.',
    steps: ['city', 'desert', 'mountain', 'temple'], stepLabels: ['Şehir', 'Çöl', 'Dağ', 'Tapınak'] },
  { id: 'depth',   name: 'DERİNLİĞE DALIŞ', icon: '🌌',
    desc: 'Okyanusun yüzeyinden diplere uzanan bilinçdışı yolculuğu.',
    steps: ['ocean', 'sea', 'underground', 'cave'], stepLabels: ['Okyanus', 'Deniz', 'Yeraltı', 'Mağara'] },
];

const PLACE_TYPE_TR: Record<DreamPlaceType, string> = {
  LANDMARK: 'ÖNEMLİ YER', CITY: 'ŞEHİR', COUNTRY: 'ÜLKE',
  NATURE: 'DOĞA', HOTEL: 'OTEL', RESTAURANT: 'RESTORAN',
  CAFE: 'KAFE', STREET: 'SOKAK', BUILDING: 'BİNA', UNKNOWN: '',
};

const PLACE_COLOR: Record<DreamPlaceType, string> = {
  LANDMARK: '#FBBF24', CITY: '#60A5FA', COUNTRY: '#34D399',
  NATURE: '#34D399', HOTEL: '#A78BFA', RESTAURANT: '#F472B6',
  CAFE: '#F472B6', STREET: '#94A3B8', BUILDING: '#A78BFA', UNKNOWN: '#94A3B8',
};

const TYPE_COLOR: Record<string, string> = {
  theme: '#A78BFA', emotion: '#F472B6', symbol: '#60A5FA',
  archetype: '#FBBF24', location: '#34D399',
};

const TYPE_TR: Record<string, string> = {
  theme: 'TEMA', emotion: 'DUYGU', symbol: 'SEMBOL',
  archetype: 'ARKETİP', location: 'MEKAN',
};

// ── Theme worlds ──────────────────────────────────────────────────────────────

const THEME_DESC: Record<string, string> = {
  transformation: 'Köklü değişimin ve yeniden doğuşun deneyimi. Kim olduğunun dönüştüğünü hissettiğin rüyalar.',
  threshold:      'İki dünya arasındaki geçiş anı. Karar noktasında bekleyen bilinç.',
  flying:         'Yer çekiminden ve sınırlamalardan kurtuluşun sembolik özgürlüğü.',
  falling:        'Kontrol kaybının en ham biçimi. Bilinmeyene doğru serbest düşüşün korkusu.',
  pursuit:        'Kaçınılmaz olanla yüzleşmeme. Geçmişin ya da geleceğin takibi.',
  loss:           'Neyin yitirildiğinin ağır bilinciyle yaşanan yas, özlem ve boşluk.',
  reunion:        'Ayrılığın yarattığı özlemin kavuşmayla kapandığı derin duygusal an.',
  discovery:      'Bilinmeyenin kapısını açmak. Sürpriz, merak ve aydınlanma.',
  confrontation:  'Yüzleşmenin kaçınılmazlığı. İç ve dış çatışmanın doruğu.',
  protection:     'Sevilen şeyleri tehditten sakınma içgüdüsü. Koruyuculuk dürtüsü.',
  entrapment:     'Çıkış yolu bulamama. Sıkışmışlık, çaresizlik ve tünelin sonundaki karanlık.',
  exposure:       'Gizlinin açığa çıkması. Savunmasız kalma ve çıplaklık korkusu.',
  chase:          'Hem kaçan hem kovalayan olmak. Hız, baskı ve kaçış.',
  water:          'Bilinçaltının en derin metaforu. Duygusal akış ve dönüşüm suyun içinde.',
  fire:           'Tutkuyu, yıkımı ve yeniden doğuşu kucaklayan ilk ve son element.',
  descent:        'Karanlığa, bilinçaltına ve korkuya doğru zorunlu iniş.',
  ascent:         'Yükselme, aydınlanma ve üstesinden gelmenin rüya hali.',
  death:          'Sonlanmanın ve yeniden başlangıcın derin sembolik döngüsü.',
  birth:          'Her şeyin başladığı yer. Yeniden doğuş ve sonsuz olasılıkların kapısı.',
  journey:        'İç ve dış yolculuğun bilinçte bıraktığı derin iz.',
};

const THEME_RELATED: Record<string, { emotions: string[]; symbols: string[] }> = {
  transformation: { emotions: ['wonder', 'hope', 'fear'],   symbols: ['fire', 'threshold', 'mirror_self'] },
  threshold:      { emotions: ['anxiety', 'wonder', 'awe'], symbols: ['door', 'key', 'bridge'] },
  flying:         { emotions: ['joy', 'wonder', 'peace'],   symbols: ['flying', 'light'] },
  falling:        { emotions: ['fear', 'anxiety'],          symbols: ['falling', 'abyss'] },
  pursuit:        { emotions: ['fear', 'despair'],          symbols: ['chase', 'shadow'] },
  loss:           { emotions: ['grief', 'longing'],         symbols: ['threshold', 'shadow', 'tree'] },
  reunion:        { emotions: ['joy', 'longing', 'peace'],  symbols: ['light', 'door'] },
  discovery:      { emotions: ['wonder', 'awe'],            symbols: ['key', 'door', 'light'] },
  confrontation:  { emotions: ['fear', 'anger'],            symbols: ['shadow', 'mirror_self', 'abyss'] },
  protection:     { emotions: ['love', 'fear'],             symbols: ['guide', 'tree', 'old_house'] },
  water:          { emotions: ['peace', 'longing', 'awe'],  symbols: ['water', 'sea', 'flood'] },
  fire:           { emotions: ['passion', 'fear'],          symbols: ['fire', 'light'] },
  death:          { emotions: ['fear', 'peace', 'wonder'],  symbols: ['threshold', 'door', 'shadow'] },
  journey:        { emotions: ['wonder', 'longing'],        symbols: ['vehicle', 'door', 'guide'] },
};

const THEME_CONNECTIONS: { a: string; b: string; desc: string }[] = [
  { a: 'discovery',     b: 'threshold',      desc: 'Her keşif bir eşikten geçer.' },
  { a: 'discovery',     b: 'journey',        desc: 'Yolculuk, keşfin bedenidir.' },
  { a: 'threshold',     b: 'transformation', desc: 'Eşikler dönüşümü başlatır.' },
  { a: 'loss',          b: 'reunion',        desc: 'Kayıp, kavuşmanın ön yüzüdür.' },
  { a: 'confrontation', b: 'transformation', desc: 'Yüzleşmeden geçmeden dönüşüm olmaz.' },
  { a: 'descent',       b: 'transformation', desc: 'Derin iniş köklü dönüşümün habercisidir.' },
  { a: 'pursuit',       b: 'confrontation',  desc: 'Takip, kaçınılmaz yüzleşmeye gider.' },
  { a: 'exposure',      b: 'confrontation',  desc: 'Açığa çıkmak yüzleşmeye zorlar.' },
  { a: 'water',         b: 'loss',           desc: 'Su gibi kayıp: akıp giden şeylerin bilinci.' },
  { a: 'fire',          b: 'transformation', desc: 'Ateş yıkar; ama aynı zamanda yeniden doğurur.' },
  { a: 'death',         b: 'birth',          desc: 'Sonlanma ve başlangıç tek bir döngünün yüzleridir.' },
  { a: 'death',         b: 'transformation', desc: 'Ölüm, en köklü dönüşümün simgesidir.' },
  { a: 'ascent',        b: 'transformation', desc: 'Yükselişin ardında köklü bir değişim yatar.' },
  { a: 'flying',        b: 'ascent',         desc: 'Uçuş, özgürlüğün bedenleşmiş halidir.' },
  { a: 'falling',       b: 'descent',        desc: 'Düşüş, inişin en sert biçimidir.' },
  { a: 'protection',    b: 'confrontation',  desc: 'Korumanın gerçek bedeli yüzleşmedir.' },
  { a: 'entrapment',    b: 'confrontation',  desc: 'Sıkışmışlık, kaçınılan yüzleşmenin yansımasıdır.' },
  { a: 'journey',       b: 'transformation', desc: 'Her yolculuk farklı döner.' },
];

const THEME_ARCHETYPES: Record<string, string[]> = {
  discovery:      ['explorer', 'child', 'guide', 'wise_elder'],
  transformation: ['hero', 'trickster', 'shadow'],
  confrontation:  ['shadow', 'animus', 'hero'],
  journey:        ['explorer', 'guide', 'wise_elder'],
  threshold:      ['hero', 'guide', 'guardian'],
  protection:     ['guardian', 'great_mother', 'wise_elder'],
  loss:           ['anima', 'shadow', 'great_mother'],
  reunion:        ['anima', 'great_mother', 'child'],
  water:          ['anima', 'great_mother'],
  fire:           ['animus', 'hero'],
  birth:          ['great_mother', 'child'],
  death:          ['shadow', 'wise_elder'],
  ascent:         ['hero', 'animus'],
  descent:        ['shadow', 'trickster'],
  exposure:       ['shadow', 'trickster'],
  entrapment:     ['trickster', 'guardian'],
  pursuit:        ['shadow', 'hero'],
  flying:         ['explorer', 'hero'],
  falling:        ['shadow', 'anima'],
  school:         ['child', 'wise_elder'],
};

// ── Archetype mythology ───────────────────────────────────────────────────────

const ARCHETYPE_EMOJI: Record<string, string> = {
  shadow: '🌑', anima: '🌸', animus: '⚡', wise_elder: '🌿',
  trickster: '🎭', guide: '🌟', hero: '🦅', child: '✨',
  great_mother: '🌙', explorer: '🧭', guardian: '🛡️',
};

const ARCHETYPE_SUBTITLE: Record<string, string> = {
  shadow:      'Karanlığın Yüzü',  anima: 'Dişilin Sesi',   animus: 'Erilin Gücü',
  wise_elder:  'Bilgeliğin Bekçisi', trickster: 'Kaosun Ruhu', guide: 'Yolun Işığı',
  hero:        'İradenin Zirvesi', child: 'Masumiyetin Özü',
  great_mother:'Yaşamın Kaynağı',  explorer: 'Sınırların Ötesi', guardian: 'Değerlerin Kalkanı',
};

const ARCHETYPE_LONG_DESC: Record<string, string> = {
  shadow:      'Kabul edilmemiş her şeyin barındığı yer. Reddedilen, bastırılan ve aydınlığa çıkmaya çalışan bilinçaltı yüzü. Onunla yüzleşmek, bütünleşmenin ilk adımıdır.',
  anima:       'Eril bilinçteki dişil ruh. Duygu, sezgi ve yaratıcılığın iç sesi. Rüyalarda kadın figürleri aracılığıyla konuşur — her biri bir mesaj taşır.',
  animus:      'Dişil bilinçteki eril enerji. Mantık, yapı ve öz ifadenin içsel gücü. Erkek figürleri aracılığıyla kendini gösterir.',
  wise_elder:  'Deneyimin billurlaştığı form. Rehberlik, içgörü ve derin anlayışın simgesi. Yaşlı figürler, mağaralar ve gizemli sesler aracılığıyla belirir.',
  trickster:   'Kuralları kıran, sınırları zorlayan yaratıcı kaosun ruhu. Saçma görünen şeylerin ardında dönüştürücü bir bilgelik gizlidir.',
  guide:       'Karanlıkta yolu gösterenin simgesi. Güvenilir varlıklar, ışıklar ve yönlendirici sesler aracılığıyla belirir. Yolculuğun habercisi.',
  hero:        'Zorlukları aşmaya yönelik irade. Mücadele, test ve kazanım döngüsünü yaşayan bilinç. Her zaferde biraz daha güçlenir.',
  child:       'Masumiyetin ve yeniden başlangıcın simgesi. Huşu, merak ve keşfin saf hali. Rüyalarda kayıp çocuk ya da özgür çocuk olarak belirir.',
  great_mother:'Besleyen, dönüştüren ve yutucu olan. Yaşamın kaynağı ve yeniden dönüşünü simgeler. Toprak, deniz ve büyük figürlerle belirir.',
  explorer:    'Ufkun ötesindeki bilinmeyeni arayan bilinç. Sınırların çağrısına cevap veren ruh. Her yeni kapı yeni bir boyutu açar.',
  guardian:    'Sınırları ve değerleri koruyan güç. Tehdit karşısında savunmaya geçen bilinç. Duvarlar, kalkanlar ve bekçi figürleri aracılığıyla belirir.',
};

const ARCHETYPE_COLOR: Record<string, string> = {
  shadow:      '#6366F1', anima: '#EC4899', animus: '#3B82F6',
  wise_elder:  '#10B981', trickster: '#F59E0B', guide: '#8B5CF6',
  hero:        '#EF4444', child: '#F472B6', great_mother: '#7C3AED',
  explorer:    '#059669', guardian: '#1D4ED8',
};

const ARCHETYPE_EN: Record<string, string> = {
  shadow: 'The Shadow', anima: 'The Anima', animus: 'The Animus',
  wise_elder: 'The Sage', trickster: 'The Trickster', guide: 'The Guide',
  hero: 'The Hero', child: 'The Divine Child', great_mother: 'The Great Mother',
  explorer: 'The Explorer', guardian: 'The Guardian',
};

const ARCHETYPE_EMOTIONS: Record<string, string[]> = {
  shadow:      ['fear', 'grief', 'anxiety'],
  anima:       ['love', 'longing', 'wonder'],
  animus:      ['passion', 'anger', 'hope'],
  wise_elder:  ['peace', 'awe', 'wonder'],
  trickster:   ['joy', 'anxiety', 'wonder'],
  guide:       ['peace', 'hope', 'wonder'],
  hero:        ['fear', 'hope', 'courage'],
  child:       ['joy', 'wonder', 'fear'],
  great_mother:['love', 'peace', 'grief'],
  explorer:    ['wonder', 'joy', 'awe'],
  guardian:    ['love', 'fear', 'peace'],
};

const ARCHETYPE_SYMBOLS: Record<string, string[]> = {
  shadow:      ['shadow', 'abyss', 'mirror_self'],
  anima:       ['water', 'mirror_self', 'tree'],
  animus:      ['fire', 'threshold', 'vehicle'],
  wise_elder:  ['tree', 'light', 'old_house'],
  trickster:   ['labyrinth', 'door', 'mirror_self'],
  guide:       ['light', 'key', 'door'],
  hero:        ['fire', 'bridge', 'threshold'],
  child:       ['light', 'door', 'child'],
  great_mother:['tree', 'water', 'sea'],
  explorer:    ['door', 'key', 'vehicle'],
  guardian:    ['bridge', 'threshold', 'old_house'],
};

const ARCHETYPE_THEMES: Record<string, string[]> = {
  shadow:      ['confrontation', 'exposure', 'descent'],
  anima:       ['reunion', 'water', 'loss'],
  animus:      ['confrontation', 'ascent', 'fire'],
  wise_elder:  ['journey', 'discovery', 'protection'],
  trickster:   ['exposure', 'transformation', 'entrapment'],
  guide:       ['journey', 'discovery', 'threshold'],
  hero:        ['transformation', 'confrontation', 'ascent'],
  child:       ['discovery', 'protection', 'birth'],
  great_mother:['protection', 'water', 'birth'],
  explorer:    ['journey', 'discovery', 'threshold'],
  guardian:    ['protection', 'confrontation', 'threshold'],
};

const ARCHETYPE_CONNECTIONS: { a: string; b: string; desc: string }[] = [
  { a: 'explorer',     b: 'guide',       desc: 'Arayış yolu bulunca anlam kazanır.' },
  { a: 'explorer',     b: 'child',       desc: 'Merakın iki farklı, derin ifadesi.' },
  { a: 'shadow',       b: 'trickster',   desc: 'Karanlığın iki dönüştürücü yüzü.' },
  { a: 'shadow',       b: 'hero',        desc: 'İlerlemenin kaçınılmaz iç diyalogu.' },
  { a: 'wise_elder',   b: 'child',       desc: 'Bilgelik masumiyette yeniden doğar.' },
  { a: 'anima',        b: 'animus',      desc: 'Birbirini arayan karşıt güçler.' },
  { a: 'great_mother', b: 'child',       desc: 'Kaynağın besleyici sarması.' },
  { a: 'hero',         b: 'guardian',    desc: 'İlerleme ile koruma arasındaki gerilim.' },
  { a: 'guide',        b: 'wise_elder',  desc: 'Bilgeliğin eyleme dönüşümü.' },
  { a: 'trickster',    b: 'child',       desc: 'Kuralsız oyunun saf ve dönüştürücü hali.' },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type UniverseTab = 'dunya' | 'temalar' | 'yerler' | 'arketipler';
type SearchTab   = 'dreams' | 'users' | 'tags';

const UNIVERSE_TABS: { key: UniverseTab; emoji: string; label: string }[] = [
  { key: 'dunya',      emoji: '🌍', label: 'Dünya'      },
  { key: 'temalar',    emoji: '🧠', label: 'Temalar'    },
  { key: 'yerler',     emoji: '📍', label: 'Yerler'     },
  { key: 'arketipler', emoji: '👥', label: 'Arketipler' },
];

// ── Utility ───────────────────────────────────────────────────────────────────

function traceLabel(type: string, name: string): string {
  if (type === 'emotion')   return EMOTION_LABEL[name]  ?? name;
  if (type === 'symbol')    return SYMBOL_TR[name]       ?? name;
  if (type === 'archetype') return ARCHETYPE_TR[name]    ?? name;
  if (type === 'location')  return LOCATION_TR[name]     ?? name;
  return THEME_TR[name] ?? name;
}

function buildNightNarrative(signals: DreamSignals, weather: DreamWeather): string {
  const strong = (weather.patterns ?? []).find(p => p.strength >= 0.6);
  if (strong?.body)     return strong.body;
  if (strong?.headline) return strong.headline;

  const topTheme   = [...(signals.themes   ?? [])].sort((a, b) => b.count - a.count)[0];
  const topEmotion = [...(signals.emotions ?? [])].sort((a, b) => b.count - a.count)[0];

  const allSignals = [
    ...(signals.themes     ?? []).map(s => ({ ...s, type: 'theme'     })),
    ...(signals.emotions   ?? []).map(s => ({ ...s, type: 'emotion'   })),
    ...(signals.symbols    ?? []).map(s => ({ ...s, type: 'symbol'    })),
    ...(signals.archetypes ?? []).map(s => ({ ...s, type: 'archetype' })),
  ];
  const fastestRising = allSignals
    .filter(s => s.trend === 'rising' && s.trendPct >= 40)
    .sort((a, b) => b.trendPct - a.trendPct)[0];

  if (fastestRising && topEmotion) {
    const risingLabel  = traceLabel(fastestRising.type, fastestRising.name);
    const emotionLabel = EMOTION_LABEL[topEmotion.name] ?? topEmotion.name;
    return `"${risingLabel}" bu gece kolektif bilinçaltında güçlü bir ivmeyle yükseliyor. Baskın duygu "${emotionLabel}" ile birleşiyor.`;
  }
  if (topTheme && topEmotion) {
    const themeLabel   = THEME_TR[topTheme.name]        ?? topTheme.name;
    const emotionLabel = EMOTION_LABEL[topEmotion.name] ?? topEmotion.name;
    const count        = weather.totalDreamers ?? signals.dreamCount ?? 0;
    const who          = count > 0 ? `${count} rüyacının` : 'insanlığın';
    return `${who} bilinçaltı bu gece "${themeLabel}" etrafında yoğunlaşıyor. Ortak duygu: "${emotionLabel}".`;
  }
  if (weather.weatherTitle) {
    return `Bu gece insanlığın kolektif bilinci "${weather.weatherTitle}" yaşantısını örüyor. Rüyalar şekilleniyor.`;
  }
  return 'Bu gece insanlığın bilinçaltı sessizce kendini örüyor. Kolektif desenler yüzeye çıkıyor.';
}

// ── Universe nav bar ──────────────────────────────────────────────────────────

function UniverseNavBar({ active, onPress }: { active: UniverseTab; onPress: (t: UniverseTab) => void }) {
  return (
    <View style={unb.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={unb.scroll}>
        {UNIVERSE_TABS.map(tab => {
          const isActive = active === tab.key;
          return (
            <Pressable key={tab.key} style={unb.tab} onPress={() => onPress(tab.key)}>
              <Text style={unb.emoji}>{tab.emoji}</Text>
              <Text style={[unb.label, isActive && unb.labelActive]}>{tab.label}</Text>
              {isActive && <View style={unb.activeLine} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const unb = StyleSheet.create({
  wrap:       { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  scroll:     { paddingHorizontal: 14, gap: 2 },
  tab:        { paddingHorizontal: 16, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', gap: 7, position: 'relative' },
  emoji:      { fontSize: 14 },
  label:      { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.32)' },
  labelActive:{ color: 'rgba(255,255,255,0.92)', fontWeight: '700' },
  activeLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: '#A78BFA', borderRadius: 1 },
});

// ── S1: Tonight's Consciousness ───────────────────────────────────────────────

function buildConsciousnessHeadline(
  signals: DreamSignals | undefined,
  weather: DreamWeather | undefined,
): string {
  const strong = (weather?.patterns ?? []).find(p => p.strength >= 0.70);
  if (strong?.headline) return strong.headline;

  const topTheme   = [...(signals?.themes   ?? [])].sort((a, b) => b.count - a.count)[0];
  const topEmotion = [...(signals?.emotions ?? [])].sort((a, b) => b.count - a.count)[0];
  const fastest    = [
    ...(signals?.themes  ?? []).map(s => ({ ...s, cat: 'theme'   })),
    ...(signals?.emotions ?? []).map(s => ({ ...s, cat: 'emotion' })),
    ...(signals?.symbols  ?? []).map(s => ({ ...s, cat: 'symbol'  })),
  ].filter(s => s.trend === 'rising').sort((a, b) => b.trendPct - a.trendPct)[0];

  if (topTheme?.name === 'discovery' || topTheme?.name === 'journey')
    return 'Merak ve keşif bu gece kolektif bilincin merkezinde.';
  if (topTheme?.name === 'transformation')
    return 'İnsanlık derin bir dönüşümün eşiğinde rüya görüyor.';
  if (topTheme?.name === 'threshold')
    return 'İnsanlık bu gece yeni eşiklere doğru yöneliyor.';
  if (topEmotion?.name === 'fear' || topEmotion?.name === 'anxiety')
    return 'Kolektif bilinç bu gece gölgeli suların içinde yüzüyor.';
  if (topEmotion?.name === 'wonder' || topEmotion?.name === 'awe')
    return 'Merak ve hayranlık bu gece kolektif bilincin merkezinde.';
  if (fastest) {
    const lbl = traceLabel((fastest as any).cat ?? 'theme', fastest.name);
    return `"${lbl}" bu gece kolektif bilincin yüzeyine çıkıyor.`;
  }
  if (weather?.weatherTitle) return weather.weatherTitle;
  return 'İnsanlık bu gece kolektif bir bilinç örüyor.';
}

function ConsciousnessHero({ signals, weather }: {
  signals: DreamSignals | undefined;
  weather: DreamWeather | undefined;
}) {
  const headline  = buildConsciousnessHeadline(signals, weather);
  const dreamers  = weather?.totalDreamers ?? signals?.dreamCount ?? 0;
  const topEmotion = [...(signals?.emotions ?? [])].sort((a, b) => b.count - a.count)[0];
  const topTheme   = [...(signals?.themes   ?? [])].sort((a, b) => b.count - a.count)[0];
  const topSymbol  = [...(signals?.symbols  ?? [])].sort((a, b) => b.count - a.count)[0];

  const trio = [
    topEmotion && { key: 'e', label: EMOTION_LABEL[topEmotion.name] ?? topEmotion.name, tag: 'DUYGU',  color: '#F472B6' },
    topTheme   && { key: 't', label: THEME_TR[topTheme.name]        ?? topTheme.name,   tag: 'TEMA',   color: '#A78BFA' },
    topSymbol  && { key: 's', label: SYMBOL_TR[topSymbol.name]      ?? topSymbol.name,  tag: 'SEMBOL', color: '#60A5FA' },
  ].filter(Boolean) as { key: string; label: string; tag: string; color: string }[];

  return (
    <View style={hero.wrap}>
      {dreamers > 0 && <Text style={hero.eyebrow}>{dreamers} rüyacı · bu gece</Text>}
      <View style={hero.accentLine} />
      <Text style={hero.headline}>{headline}</Text>
      {trio.length > 0 && (
        <View style={hero.trio}>
          {trio.map((t, i) => (
            <View key={t.key} style={[hero.trioItem, i > 0 && hero.trioItemBorder]}>
              <Text style={[hero.trioTag, { color: t.color }]}>{t.tag}</Text>
              <Text style={hero.trioLabel}>{t.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const hero = StyleSheet.create({
  wrap:           { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32 },
  eyebrow:        { fontSize: 11, fontWeight: '600', color: 'rgba(167,139,250,0.50)', letterSpacing: 0.8, marginBottom: 12 },
  accentLine:     { width: 40, height: 1.5, backgroundColor: '#A78BFA', marginBottom: 20, opacity: 0.65 },
  headline:       { fontSize: 26, fontWeight: '700', color: 'rgba(255,255,255,0.92)', lineHeight: 36, letterSpacing: -0.5 },
  trio:           { flexDirection: 'row', marginTop: 28 },
  trioItem:       { flex: 1, gap: 8 },
  trioItemBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.06)', paddingLeft: 20 },
  trioTag:        { fontSize: 8, fontWeight: '900', letterSpacing: 1.8 },
  trioLabel:      { fontSize: 22, fontWeight: '900', color: 'rgba(255,255,255,0.88)', letterSpacing: -0.5, lineHeight: 26 },
});

// ── S2: Dream Weather ─────────────────────────────────────────────────────────

interface WeatherIndicator { key: string; emoji: string; name: string; level: number; label: string }

function computeDreamWeather(signals: DreamSignals | undefined): WeatherIndicator[] {
  if (!signals) return [];
  const all = [
    ...(signals.themes     ?? []).map(s => ({ ...s })),
    ...(signals.emotions   ?? []).map(s => ({ ...s })),
    ...(signals.symbols    ?? []).map(s => ({ ...s })),
    ...(signals.archetypes ?? []).map(s => ({ ...s })),
    ...(signals.locations  ?? []).map(s => ({ ...s })),
  ];
  const total = all.reduce((s, a) => s + a.count, 0) || 1;
  const sum   = (names: string[]) => all.filter(a => names.includes(a.name)).reduce((s, a) => s + a.count, 0);

  const shadowCnt    = sum(['fear', 'anxiety', 'despair', 'grief', 'shadow', 'pursuit', 'descent', 'exposure', 'entrapment', 'abyss']);
  const thresholdCnt = sum(['threshold', 'door', 'bridge', 'key', 'corridor', 'rooftop']);
  const discoveryCnt = sum(['discovery', 'wonder', 'awe', 'explorer', 'journey', 'flying', 'ascent']);
  const peaceCnt     = sum(['peace', 'calm', 'serenity', 'protection', 'guardian', 'hope', 'love', 'great_mother']);
  const emotionalCnt = (signals.emotions ?? []).reduce((s, e) => s + e.count, 0);

  const cap = (n: number) => Math.min(1, n / (total * 0.25));
  const lvl = (n: number) => n < 0.20 ? 'Sessiz' : n < 0.45 ? 'Hafif' : n < 0.70 ? 'Orta' : 'Yoğun';

  return [
    { key: 'emotional', emoji: '🌊', name: 'Duygusal Yoğunluk', level: cap(emotionalCnt), label: lvl(cap(emotionalCnt)) },
    { key: 'shadow',    emoji: '🌑', name: 'Gölge Aktivitesi',  level: cap(shadowCnt),    label: lvl(cap(shadowCnt))    },
    { key: 'threshold', emoji: '🚪', name: 'Eşik Sinyalleri',   level: cap(thresholdCnt), label: lvl(cap(thresholdCnt)) },
    { key: 'discovery', emoji: '✨', name: 'Keşif Enerjisi',    level: cap(discoveryCnt), label: lvl(cap(discoveryCnt)) },
    { key: 'peace',     emoji: '🕊', name: 'Kolektif Huzur',    level: cap(peaceCnt),     label: lvl(cap(peaceCnt))     },
  ];
}

function DreamWeatherSection({ signals }: { signals: DreamSignals | undefined }) {
  const indicators = computeDreamWeather(signals);
  if (indicators.length === 0) return null;
  return (
    <View style={wth.wrap}>
      <Text style={wth.label}>BİLİNÇALTI HAVA DURUMU</Text>
      {indicators.map(ind => (
        <View key={ind.key} style={wth.row}>
          <Text style={wth.emoji}>{ind.emoji}</Text>
          <Text style={wth.name}>{ind.name}</Text>
          <View style={wth.track}>
            <View style={[wth.bar, {
              width: `${Math.round(ind.level * 100)}%` as `${number}%`,
              opacity: 0.30 + ind.level * 0.70,
              backgroundColor: ind.level > 0.65 ? '#A78BFA' : ind.level > 0.35 ? '#60A5FA' : 'rgba(255,255,255,0.35)',
            }]} />
          </View>
          <Text style={[wth.lvlLabel, {
            color: ind.level > 0.65 ? '#A78BFA' : ind.level > 0.35 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.25)',
          }]}>{ind.label}</Text>
        </View>
      ))}
    </View>
  );
}

const wth = StyleSheet.create({
  wrap:     { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  label:    { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)', marginBottom: 4 },
  row:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji:    { fontSize: 16, width: 24 },
  name:     { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.50)', width: 140 },
  track:    { flex: 1, height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' },
  bar:      { height: '100%', borderRadius: 1 },
  lvlLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8, width: 46, textAlign: 'right' },
});

// ── S3: Global Shifts ─────────────────────────────────────────────────────────

function GlobalShifts({ signals }: { signals: DreamSignals | undefined }) {
  if (!signals) return null;
  type Tagged = SignalItem & { cat: string };
  const all: Tagged[] = [
    ...(signals.themes     ?? []).map(s => ({ ...s, cat: 'theme'     })),
    ...(signals.emotions   ?? []).map(s => ({ ...s, cat: 'emotion'   })),
    ...(signals.symbols    ?? []).map(s => ({ ...s, cat: 'symbol'    })),
    ...(signals.archetypes ?? []).map(s => ({ ...s, cat: 'archetype' })),
  ].filter(s => s.count > 0);

  const rising  = all.filter(s => s.trend === 'rising').sort((a, b) => b.trendPct - a.trendPct).slice(0, 5);
  const falling = all.filter(s => s.trend === 'falling').sort((a, b) => b.trendPct - a.trendPct).slice(0, 3);
  const isNew   = all.filter(s => s.trend === 'new');
  if (rising.length === 0 && falling.length === 0 && isNew.length === 0) return null;

  const lbl = (s: Tagged) => traceLabel(s.cat, s.name);

  return (
    <View style={gsh.wrap}>
      <Text style={gsh.sLabel}>KÜRESEL DÖNÜŞÜMLER</Text>
      {rising.length > 0 && (
        <View style={gsh.group}>
          <View style={gsh.gHead}><Text style={[gsh.arrow, { color: '#34D399' }]}>↑</Text><Text style={[gsh.gTag, { color: '#34D399' }]}>YÜKSELİYOR</Text></View>
          <Text style={gsh.flow}>{rising.map(lbl).join('   ·   ')}</Text>
        </View>
      )}
      {isNew.length > 0 && (
        <View style={gsh.group}>
          <View style={gsh.gHead}><Text style={[gsh.arrow, { color: '#FBBF24' }]}>→</Text><Text style={[gsh.gTag, { color: '#FBBF24' }]}>YENİ</Text></View>
          <Text style={[gsh.flow, { color: 'rgba(251,191,36,0.75)' }]}>{isNew.map(lbl).join('   ·   ')}</Text>
        </View>
      )}
      {falling.length > 0 && (
        <View style={gsh.group}>
          <View style={gsh.gHead}><Text style={[gsh.arrow, { color: '#F87171' }]}>↓</Text><Text style={[gsh.gTag, { color: '#F87171' }]}>ZAYIFLIYOR</Text></View>
          <Text style={[gsh.flow, { opacity: 0.42 }]}>{falling.map(lbl).join('   ·   ')}</Text>
        </View>
      )}
    </View>
  );
}

const gsh = StyleSheet.create({
  wrap:   { paddingHorizontal: 24, paddingVertical: 24, gap: 22 },
  sLabel: { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  group:  { gap: 10 },
  gHead:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  arrow:  { fontSize: 22, fontWeight: '900', lineHeight: 24 },
  gTag:   { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  flow:   { fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.82)', lineHeight: 28, letterSpacing: -0.2 },
});

// ── S4: Collective Story ──────────────────────────────────────────────────────

function buildCollectiveStory(signals: DreamSignals | undefined, weather: DreamWeather | undefined): string {
  if (weather?.weatherDescription && weather.weatherDescription.length > 60)
    return weather.weatherDescription;
  if (weather?.weatherSummary && weather.weatherSummary.length > 40)
    return weather.weatherSummary;

  const topEmotion = [...(signals?.emotions ?? [])].sort((a, b) => b.count - a.count)[0];
  const topTheme   = [...(signals?.themes   ?? [])].sort((a, b) => b.count - a.count)[0];
  const topSymbol  = [...(signals?.symbols  ?? [])].sort((a, b) => b.count - a.count)[0];
  const risingAll  = [...(signals?.themes ?? []), ...(signals?.emotions ?? [])].filter(s => s.trend === 'rising').slice(0, 2);
  if (!topTheme && !topEmotion) return '';

  const emotLbl   = topEmotion ? (EMOTION_LABEL[topEmotion.name] ?? topEmotion.name).toLowerCase() : '';
  const themeLbl  = topTheme   ? (THEME_TR[topTheme.name]        ?? topTheme.name).toLowerCase()   : '';
  const symLbl    = topSymbol  ? (SYMBOL_TR[topSymbol.name]      ?? topSymbol.name).toLowerCase()  : '';
  const risingStr = risingAll.map(r => (THEME_TR[r.name] ?? EMOTION_LABEL[r.name] ?? r.name).toLowerCase()).join(' ve ');

  let s = emotLbl
    ? `Bu gecenin rüyaları, kolektif bilincin ${emotLbl} duygusunu yoğun biçimde işlediğini gösteriyor.`
    : 'Bu gecenin rüyaları kolektif psişenin derinliklerini yansıtıyor.';
  if (themeLbl) s += ` "${themeLbl.charAt(0).toUpperCase() + themeLbl.slice(1)}" teması`;
  if (symLbl)   s += ` ve "${symLbl}" sembolü`;
  if (themeLbl || symLbl) s += ` tekrar tekrar yüzeye çıkıyor; bu, kolektif psişenin ortak bir eşiğin kenarında durduğunu işaret ediyor.`;
  if (risingStr) s += ` ${risingStr.charAt(0).toUpperCase() + risingStr.slice(1)} yükselen sinyaller olarak öne çıkıyor.`;
  return s;
}

function CollectiveStory({ signals, weather }: {
  signals: DreamSignals | undefined;
  weather: DreamWeather | undefined;
}) {
  const story = buildCollectiveStory(signals, weather);
  if (!story) return null;
  return (
    <View style={cst.wrap}>
      <Text style={cst.label}>KOLEKTİF HİKÂYE</Text>
      <View style={cst.bar} />
      <Text style={cst.story}>{story}</Text>
      <Text style={cst.credit}>— Bilinç Gözlemevi</Text>
    </View>
  );
}

const cst = StyleSheet.create({
  wrap:   { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  label:  { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  bar:    { width: 24, height: 2, backgroundColor: 'rgba(167,139,250,0.45)' },
  story:  { fontSize: 15, color: 'rgba(255,255,255,0.68)', lineHeight: 26, letterSpacing: -0.1 },
  credit: { fontSize: 11, color: 'rgba(255,255,255,0.22)', fontStyle: 'italic', fontWeight: '600', marginTop: 4 },
});

// ── S5: Consciousness Map ─────────────────────────────────────────────────────

const TERRITORY_DEFS = [
  { key: 'shadow',    name: 'Gölge Bölgeleri',    emoji: '🌑',
    keys: ['shadow', 'fear', 'anxiety', 'pursuit', 'descent', 'exposure', 'entrapment', 'abyss', 'underground'],
    defEmotion: 'Korku', defSymbol: 'Gölge' },
  { key: 'threshold', name: 'Eşik Alanları',       emoji: '🚪',
    keys: ['threshold', 'door', 'bridge', 'corridor', 'key', 'rooftop'],
    defEmotion: 'Kaygı', defSymbol: 'Kapı' },
  { key: 'transform', name: 'Dönüşüm Toprakları',  emoji: '⚡',
    keys: ['transformation', 'fire', 'cave', 'labyrinth', 'entrapment'],
    defEmotion: 'Merak', defSymbol: 'Ateş' },
  { key: 'discovery', name: 'Keşif Coğrafyası',    emoji: '✨',
    keys: ['discovery', 'wonder', 'awe', 'explorer', 'journey', 'flying', 'ascent', 'forest'],
    defEmotion: 'Hayranlık', defSymbol: 'Işık' },
  { key: 'sacred',    name: 'Kutsal Dağlar',        emoji: '⛰',
    keys: ['wise_elder', 'ascent', 'mountain', 'temple', 'light', 'guide', 'protection'],
    defEmotion: 'Huşu', defSymbol: 'Işık' },
  { key: 'ocean',     name: 'Rüya Okyanuslari',     emoji: '🌊',
    keys: ['water', 'sea', 'ocean', 'anima', 'loss', 'reunion', 'flood'],
    defEmotion: 'Özlem', defSymbol: 'Su' },
];

interface DreamTerritory {
  key: string; name: string; emoji: string;
  emotion: string; symbol: string; activity: number; clusterId?: string | undefined;
}

function computeDreamTerritories(signals: DreamSignals | undefined, clusters: DreamCluster[]): DreamTerritory[] {
  if (!signals) return [];
  const allSig = [
    ...(signals.themes     ?? []).map(s => ({ ...s })),
    ...(signals.emotions   ?? []).map(s => ({ ...s })),
    ...(signals.symbols    ?? []).map(s => ({ ...s })),
    ...(signals.archetypes ?? []).map(s => ({ ...s })),
    ...(signals.locations  ?? []).map(s => ({ ...s })),
  ];
  const maxC   = Math.max(...allSig.map(s => s.count), 1);
  const sigMap = new Map(allSig.map(s => [s.name, s.count]));

  return TERRITORY_DEFS.map(def => {
    const total   = def.keys.reduce((sum, k) => sum + (sigMap.get(k) ?? 0), 0);
    const level   = Math.min(1, total / (maxC * def.keys.length * 0.30));
    const eMatch  = (signals.emotions ?? []).filter(e => def.keys.includes(e.name)).sort((a, b) => b.count - a.count)[0];
    const sMatch  = (signals.symbols  ?? []).filter(s => def.keys.includes(s.name)).sort((a, b) => b.count - a.count)[0];
    const emotion = eMatch ? (EMOTION_LABEL[eMatch.name] ?? eMatch.name) : def.defEmotion;
    const symbol  = sMatch ? (SYMBOL_TR[sMatch.name]     ?? sMatch.name) : def.defSymbol;
    const cluster = clusters.find(c =>
      (c.primaryTheme   && def.keys.includes(c.primaryTheme))   ||
      (c.primaryEmotion && def.keys.includes(c.primaryEmotion)) ||
      (c.primarySymbol  && def.keys.includes(c.primarySymbol))
    );
    return { key: def.key, name: def.name, emoji: def.emoji, emotion, symbol, activity: level, clusterId: cluster?.id };
  }).sort((a, b) => b.activity - a.activity);
}

function ConsciousnessMap({ signals }: { signals: DreamSignals | undefined }) {
  const router = useRouter();
  const { data: clusters = [] } = useQuery({
    queryKey: ['clusters', 'all'], queryFn: getAllClusters, staleTime: 5 * 60 * 1000,
  });
  const territories = computeDreamTerritories(signals, clusters);

  return (
    <View style={cmap.wrap}>
      <Text style={cmap.label}>BİLİNÇ HARİTASI</Text>
      <Text style={cmap.sub}>Bu gece aktif olan rüya coğrafyaları. Her bölge psişenin ayrı bir katmanını temsil eder.</Text>
      <View style={cmap.list}>
        {territories.map(t => {
          const active = t.activity > 0.25;
          const pct    = Math.round(t.activity * 100);
          return (
            <Pressable
              key={t.key}
              style={({ pressed }) => [cmap.row, { opacity: pressed ? 0.75 : 1 }]}
              onPress={() => t.clusterId && router.push(`/dream-clusters?id=${t.clusterId}` as any)}
            >
              <Text style={[cmap.emoji, { opacity: active ? 1 : 0.32 }]}>{t.emoji}</Text>
              <View style={cmap.body}>
                <Text style={[cmap.name, { opacity: active ? 0.90 : 0.35 }]}>{t.name}</Text>
                <Text style={cmap.meta}>{t.emotion} · {t.symbol}</Text>
              </View>
              <View style={cmap.right}>
                <View style={cmap.actTrack}>
                  <View style={[cmap.actBar, {
                    width: `${pct}%` as `${number}%`,
                    backgroundColor: active ? '#A78BFA' : 'rgba(255,255,255,0.18)',
                  }]} />
                </View>
                <Text style={[cmap.actLbl, { opacity: active ? 0.72 : 0.22 }]}>
                  {pct > 60 ? 'Aktif' : pct > 25 ? 'Hareketli' : 'Sessiz'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {clusters.length > 0 && (
        <Pressable
          style={({ pressed }) => [cmap.clusterCta, { opacity: pressed ? 0.75 : 1 }]}
          onPress={() => router.push('/dream-clusters' as any)}
        >
          <Text style={cmap.clusterCtaText}>Tüm Rüya Evrenlerini Keşfet</Text>
          <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.28)" />
        </Pressable>
      )}
    </View>
  );
}

const cmap = StyleSheet.create({
  wrap:          { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  label:         { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sub:           { fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 19, marginTop: -4 },
  list:          { gap: 0 },
  row:           { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16,
                   borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  emoji:         { fontSize: 22, width: 28 },
  body:          { flex: 1, gap: 4 },
  name:          { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.90)' },
  meta:          { fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: '600' },
  right:         { alignItems: 'flex-end', gap: 5, width: 80 },
  actTrack:      { width: 70, height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' },
  actBar:        { height: '100%', borderRadius: 1, opacity: 0.72 },
  actLbl:        { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, color: 'rgba(255,255,255,0.65)' },
  clusterCta:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingVertical: 12,
                   borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  clusterCtaText:{ flex: 1, fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.30)' },
});

// ── S6: Rare Signals ──────────────────────────────────────────────────────────

function RareSignals({ signals }: { signals: DreamSignals | undefined }) {
  if (!signals) return null;
  const all = [
    ...(signals.themes     ?? []).map(s => ({ ...s, cat: 'theme'     })),
    ...(signals.emotions   ?? []).map(s => ({ ...s, cat: 'emotion'   })),
    ...(signals.symbols    ?? []).map(s => ({ ...s, cat: 'symbol'    })),
    ...(signals.archetypes ?? []).map(s => ({ ...s, cat: 'archetype' })),
    ...(signals.locations  ?? []).map(s => ({ ...s, cat: 'location'  })),
  ].filter(s => s.count > 0 && s.count <= 3).sort((a, b) => a.count - b.count).slice(0, 5);
  if (all.length === 0) return null;

  return (
    <View style={rar.wrap}>
      <Text style={rar.label}>NADİR SİNYALLER</Text>
      <Text style={rar.sub}>Bu gece yalnızca birkaç bilinçte ortaya çıkan gizemli olgular.</Text>
      <View style={rar.list}>
        {all.map(r => (
          <View key={r.name} style={rar.item}>
            <Text style={rar.bullet}>◦</Text>
            <Text style={rar.text}>
              Yalnızca <Text style={rar.cnt}>{r.count}</Text> rüyacı bu gece{' '}
              <Text style={rar.sig}>"{traceLabel(r.cat, r.name)}"</Text> deneyimini bildirdi.
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const rar = StyleSheet.create({
  wrap:  { paddingHorizontal: 24, paddingVertical: 24, gap: 14 },
  label: { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sub:   { fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 19, marginTop: -4 },
  list:  { gap: 16 },
  item:  { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  bullet:{ fontSize: 18, color: '#FBBF24', lineHeight: 22, opacity: 0.65 },
  text:  { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.52)', lineHeight: 22 },
  cnt:   { fontWeight: '900', color: '#FBBF24' },
  sig:   { fontWeight: '700', color: 'rgba(255,255,255,0.78)' },
});

// ── S7: Emerging Patterns ─────────────────────────────────────────────────────

function EmergingPatterns({ signals, weather }: {
  signals: DreamSignals | undefined;
  weather: DreamWeather | undefined;
}) {
  const patterns = (weather?.patterns ?? []).filter(p => p.count >= 2).slice(0, 6);
  if (patterns.length === 0) return null;

  const newNames = new Set([
    ...(signals?.themes     ?? []).filter(s => s.trend === 'new').map(s => s.name),
    ...(signals?.emotions   ?? []).filter(s => s.trend === 'new').map(s => s.name),
    ...(signals?.symbols    ?? []).filter(s => s.trend === 'new').map(s => s.name),
    ...(signals?.archetypes ?? []).filter(s => s.trend === 'new').map(s => s.name),
  ]);

  return (
    <View style={epat.wrap}>
      <Text style={epat.label}>BELLEĞE DÜŞEN DESENLER</Text>
      <Text style={epat.sub}>Bu gece kolektif bilinçte birlikte yüzeye çıkan unsurlar.</Text>
      <View style={epat.list}>
        {patterns.map(p => {
          const text   = p.body || p.headline
            || `${p.element1.label} ve ${p.element2.label} bu gece ${p.count} rüyada birlikte belirdi.`;
          const isNew  = newNames.has(p.element1.name) || newNames.has(p.element2.name);
          return (
            <View key={p.id} style={epat.item}>
              {isNew && <Text style={epat.newTag}>YENİ</Text>}
              <Text style={epat.text}>{text}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const epat = StyleSheet.create({
  wrap:   { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  label:  { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sub:    { fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 19, marginTop: -4 },
  list:   { gap: 0 },
  item:   { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 6 },
  newTag: { fontSize: 7, fontWeight: '900', letterSpacing: 1.8, color: '#FBBF24' },
  text:   { fontSize: 14, color: 'rgba(255,255,255,0.70)', lineHeight: 22 },
});

// ── S8: Consciousness Timeline ────────────────────────────────────────────────

function buildTimeline(signals: DreamSignals | undefined): { id: string; name: string; icon: string; signals: string[] }[] {
  if (!signals) return [];
  type Tagged = SignalItem & { cat: string };
  const all: Tagged[] = [
    ...(signals.themes     ?? []).map(s => ({ ...s, cat: 'theme'     })),
    ...(signals.emotions   ?? []).map(s => ({ ...s, cat: 'emotion'   })),
    ...(signals.symbols    ?? []).map(s => ({ ...s, cat: 'symbol'    })),
    ...(signals.archetypes ?? []).map(s => ({ ...s, cat: 'archetype' })),
  ].filter(s => s.count > 0);

  const lbl = (s: Tagged) => traceLabel(s.cat, s.name);

  const evening   = all.filter(s => s.trend === 'falling').slice(0, 2).map(lbl);
  const midnight  = all.filter(s => s.trend === 'stable' && s.count > 5).slice(0, 2).map(lbl);
  const deepSleep = all.filter(s => s.trend === 'stable' && s.count <= 5).slice(0, 2).map(lbl);
  const preDawn   = all.filter(s => s.trend === 'rising' || s.trend === 'new').slice(0, 2).map(lbl);

  const hasData = evening.length + midnight.length + deepSleep.length + preDawn.length > 0;
  if (!hasData) {
    const sorted = [...all].sort((a, b) => b.count - a.count);
    const q      = Math.ceil(sorted.length / 4);
    return [
      { id: 'evening',   name: 'Akşam',        icon: '🌆', signals: sorted.slice(0, q).map(lbl).slice(0, 2) },
      { id: 'midnight',  name: 'Gece Yarısı',  icon: '🌑', signals: sorted.slice(q, q * 2).map(lbl).slice(0, 2) },
      { id: 'deepsleep', name: 'Derin Uyku',   icon: '🌌', signals: sorted.slice(q * 2, q * 3).map(lbl).slice(0, 2) },
      { id: 'predawn',   name: 'Sabah Öncesi', icon: '🌅', signals: sorted.slice(q * 3).map(lbl).slice(0, 2) },
    ];
  }
  return [
    { id: 'evening',   name: 'Akşam',        icon: '🌆', signals: evening },
    { id: 'midnight',  name: 'Gece Yarısı',  icon: '🌑', signals: midnight },
    { id: 'deepsleep', name: 'Derin Uyku',   icon: '🌌', signals: deepSleep },
    { id: 'predawn',   name: 'Sabah Öncesi', icon: '🌅', signals: preDawn },
  ];
}

function ConsciousnessTimeline({ signals }: { signals: DreamSignals | undefined }) {
  const slots = buildTimeline(signals);
  if (!slots.some(s => s.signals.length > 0)) return null;

  return (
    <View style={tl.wrap}>
      <Text style={tl.label}>BİLİNÇ ZAMANÇİZELGESİ</Text>
      <Text style={tl.sub}>Gecenin evrimi boyunca kolektif bilincin değişen sinyalleri.</Text>
      <View style={tl.slots}>
        {slots.map((slot, i) => (
          <View key={slot.id} style={tl.slot}>
            <Text style={tl.icon}>{slot.icon}</Text>
            <View style={tl.line}>
              <View style={tl.dot} />
              {i < slots.length - 1 && <View style={tl.connector} />}
            </View>
            <View style={tl.body}>
              <Text style={tl.slotName}>{slot.name}</Text>
              {slot.signals.length > 0
                ? <Text style={tl.slotSigs}>{slot.signals.join('  ·  ')}</Text>
                : <Text style={tl.slotEmpty}>Sessiz</Text>
              }
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const tl = StyleSheet.create({
  wrap:      { paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 40, gap: 16 },
  label:     { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sub:       { fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 19, marginTop: -4 },
  slots:     { gap: 0, paddingTop: 8 },
  slot:      { flexDirection: 'row', gap: 14, alignItems: 'flex-start', minHeight: 64 },
  icon:      { fontSize: 20, width: 28, marginTop: 2 },
  line:      { alignItems: 'center', width: 12 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: '#A78BFA', marginTop: 6, opacity: 0.65 },
  connector: { flex: 1, width: 1, backgroundColor: 'rgba(167,139,250,0.18)', minHeight: 36, marginTop: 4 },
  body:      { flex: 1, paddingBottom: 20, gap: 6 },
  slotName:  { fontSize: 11, fontWeight: '900', letterSpacing: 1, color: 'rgba(255,255,255,0.48)' },
  slotSigs:  { fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.82)', lineHeight: 22 },
  slotEmpty: { fontSize: 13, color: 'rgba(255,255,255,0.20)', fontStyle: 'italic' },
});

// ── Dünya tab ─────────────────────────────────────────────────────────────────

function WorldSep() {
  return <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 24 }} />;
}

function DunyaTab({ signals, weather, onSignalPress }: {
  signals:       DreamSignals | undefined;
  weather:       DreamWeather | undefined;
  onSignalPress: (name: string) => void;
}) {
  return (
    <View>
      <ConsciousnessHero    signals={signals} weather={weather} />
      <WorldSep />
      <DreamWeatherSection  signals={signals} />
      <WorldSep />
      <GlobalShifts         signals={signals} />
      <WorldSep />
      <CollectiveStory      signals={signals} weather={weather} />
      <WorldSep />
      <ConsciousnessMap     signals={signals} />
      <WorldSep />
      <RareSignals          signals={signals} />
      <WorldSep />
      <EmergingPatterns     signals={signals} weather={weather} />
      <WorldSep />
      <ConsciousnessTimeline signals={signals} />
    </View>
  );
}

// ── THEMES tab: each theme as a world ─────────────────────────────────────────

// ── Theme Observatory ─────────────────────────────────────────────────────────
// S1 · S2 · S3 · S4 · S5 — no cards, no equal rows, meaning first.

function buildHeroNarrative(name: string, count: number): string {
  const related = THEME_RELATED[name];
  const syms    = related?.symbols.slice(0, 3).map(s => (SYMBOL_TR[s] ?? s).toLowerCase()).join(', ');
  const desc    = THEME_DESC[name]?.split('.')[0];
  const countLine = count === 1
    ? 'Bu gece ilk kez belirdi.'
    : `Bu gece ${count} ayrı rüyada belirdi.`;
  const symLine = syms ? `${syms.charAt(0).toUpperCase() + syms.slice(1)} bu gecenin ortak imgesi haline geldi.` : '';
  return [countLine, symLine, desc].filter(Boolean).join(' ');
}

function DominantThemeHero({ theme, onExplore, onSearch }: {
  theme:     SignalItem;
  onExplore: () => void;
  onSearch:  () => void;
}) {
  const trName    = (THEME_TR[theme.name] ?? theme.name).toUpperCase();
  const related   = THEME_RELATED[theme.name];
  const archs     = THEME_ARCHETYPES[theme.name] ?? [];
  const narrative = buildHeroNarrative(theme.name, theme.count);
  const isRising  = theme.trend === 'rising' || theme.trend === 'new';

  return (
    <View style={th1.wrap}>
      <Text style={th1.eyebrow}>BU GECENİN HİKAYESİ</Text>
      <View style={th1.accentLine} />
      <Text style={th1.themeName}>{trName}</Text>
      <Text style={th1.narrative}>{narrative}</Text>
      {isRising && (
        <View style={th1.trendRow}>
          <Ionicons name="trending-up" size={12} color="#34D399" />
          <Text style={th1.trendText}>+{theme.trendPct}% bu gece yükseliyor</Text>
        </View>
      )}
      {related && (
        <View style={th1.ecosystemRow}>
          <View style={th1.ecoBlock}>
            <Text style={th1.ecoLabel}>DUYGU</Text>
            <Text style={th1.ecoValue}>
              {related.emotions.slice(0, 3).map(e => EMOTION_LABEL[e] ?? e).join('  ·  ')}
            </Text>
          </View>
          <View style={th1.ecoBlock}>
            <Text style={th1.ecoLabel}>SEMBOL</Text>
            <Text style={th1.ecoValue}>
              {related.symbols.slice(0, 3).map(s => SYMBOL_TR[s] ?? s).join('  ·  ')}
            </Text>
          </View>
        </View>
      )}
      {archs[0] && (
        <Text style={th1.archLine}>
          EN BAĞLI ARKETİP  {(ARCHETYPE_TR[archs[0]] ?? archs[0]).toUpperCase()}
        </Text>
      )}
      <View style={th1.ctaRow}>
        <Pressable style={({ pressed }) => [th1.ctaA, { opacity: pressed ? 0.80 : 1 }]} onPress={onExplore}>
          <Text style={th1.ctaAText}>Temayı Keşfet</Text>
          <Ionicons name="arrow-forward" size={12} color="#A78BFA" />
        </Pressable>
        <Pressable style={({ pressed }) => [th1.ctaB, { opacity: pressed ? 0.80 : 1 }]} onPress={onSearch}>
          <Text style={th1.ctaBText}>Rüyaları Ara</Text>
        </Pressable>
      </View>
    </View>
  );
}

const th1 = StyleSheet.create({
  wrap:        { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28 },
  eyebrow:     { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.8, color: 'rgba(167,139,250,0.42)', marginBottom: 14 },
  accentLine:  { width: 28, height: 1.5, backgroundColor: 'rgba(167,139,250,0.28)', marginBottom: 22 },
  themeName:   { fontSize: 48, fontWeight: '900', color: 'rgba(255,255,255,0.94)', letterSpacing: 5, lineHeight: 56 },
  narrative:   { fontSize: 15, color: 'rgba(255,255,255,0.60)', lineHeight: 25, marginTop: 18 },
  trendRow:    { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
  trendText:   { fontSize: 12, fontWeight: '700', color: '#34D399' },
  ecosystemRow:{ flexDirection: 'row', gap: 28, marginTop: 22 },
  ecoBlock:    { gap: 5 },
  ecoLabel:    { fontSize: 7.5, fontWeight: '900', letterSpacing: 1.6, color: 'rgba(255,255,255,0.22)' },
  ecoValue:    { fontSize: 12.5, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  archLine:    { fontSize: 9.5, fontWeight: '800', letterSpacing: 1.4, color: 'rgba(167,139,250,0.48)', marginTop: 18 },
  ctaRow:      { flexDirection: 'row', gap: 12, marginTop: 24 },
  ctaA:        { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: 'rgba(167,139,250,0.22)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  ctaAText:    { fontSize: 12, fontWeight: '700', color: '#A78BFA' },
  ctaB:        { borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  ctaBText:    { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.36)' },
});

// S2: Theme Landscape — visual weight hierarchy

function ThemeLandscape({ themes, maxCount, onThemePress }: {
  themes:       SignalItem[];
  maxCount:     number;
  onThemePress: (name: string) => void;
}) {
  const heroName  = themes[0]?.name;
  const secondary = themes.slice(1, 3);
  const emerging  = themes.filter(t =>
    (t.trend === 'rising' || t.trend === 'new') &&
    t.name !== heroName &&
    !secondary.find(s => s.name === t.name),
  );
  const threshold = maxCount * 0.30;
  const known     = new Set([heroName, ...secondary.map(t => t.name), ...emerging.map(t => t.name)]);
  const rare      = themes.filter(t => t.count < threshold && !known.has(t.name));
  const stable    = themes.filter(t => t.count >= threshold && !known.has(t.name));

  return (
    <View style={th2.wrap}>
      <Text style={th2.label}>TEMA PEYZAJI</Text>

      {secondary.length > 0 && (
        <View style={th2.secondaryRow}>
          {secondary.map(t => (
            <Pressable key={t.name} style={({ pressed }) => [th2.secondaryItem, { opacity: pressed ? 0.78 : 1 }]} onPress={() => onThemePress(t.name)}>
              <Text style={th2.secondaryName}>{(THEME_TR[t.name] ?? t.name).toUpperCase()}</Text>
              <Text style={th2.secondaryCount}>{t.count} rüya</Text>
            </Pressable>
          ))}
        </View>
      )}

      {emerging.length > 0 && (
        <View style={th2.emergingBlock}>
          <Text style={th2.tierLabel}>↑  YÜKSELEN</Text>
          <View style={th2.emergingRow}>
            {emerging.map(t => (
              <Pressable key={t.name} style={({ pressed }) => [th2.emergingItem, { opacity: pressed ? 0.78 : 1 }]} onPress={() => onThemePress(t.name)}>
                <Text style={th2.emergingName}>{THEME_TR[t.name] ?? t.name}</Text>
                {t.trendPct > 0 && <Text style={th2.emergingPct}>+{t.trendPct}%</Text>}
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {stable.length > 0 && (
        <View style={th2.stableRow}>
          {stable.map(t => (
            <Pressable key={t.name} style={({ pressed }) => [th2.stableItem, { opacity: pressed ? 0.78 : 1 }]} onPress={() => onThemePress(t.name)}>
              <Text style={th2.stableName}>{THEME_TR[t.name] ?? t.name}</Text>
              <Text style={th2.stableCount}>{t.count}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {rare.length > 0 && (
        <View style={th2.rareBlock}>
          <Text style={th2.rareTierLabel}>NADİR</Text>
          <Text style={th2.rareInline}>
            {rare.map(t => THEME_TR[t.name] ?? t.name).join('   ·   ')}
          </Text>
        </View>
      )}
    </View>
  );
}

const th2 = StyleSheet.create({
  wrap:          { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24 },
  label:         { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)', marginBottom: 20 },
  secondaryRow:  { flexDirection: 'row', gap: 12, marginBottom: 20 },
  secondaryItem: { flex: 1, gap: 5 },
  secondaryName: { fontSize: 26, fontWeight: '900', color: 'rgba(255,255,255,0.88)', letterSpacing: 1.5 },
  secondaryCount:{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: '600' },
  emergingBlock: { marginBottom: 20 },
  tierLabel:     { fontSize: 8, fontWeight: '900', letterSpacing: 1.8, color: '#34D399', marginBottom: 10 },
  emergingRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  emergingItem:  { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  emergingName:  { fontSize: 17, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  emergingPct:   { fontSize: 10, fontWeight: '800', color: '#34D399' },
  stableRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  stableItem:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stableName:    { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.52)' },
  stableCount:   { fontSize: 10, color: 'rgba(255,255,255,0.22)', fontWeight: '600' },
  rareBlock:     { marginTop: 4 },
  rareTierLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1.8, color: 'rgba(251,191,36,0.50)', marginBottom: 8 },
  rareInline:    { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.28)', lineHeight: 22 },
});

// S3: Theme Connections — typographic pairs, no cards

function ThemeConnectionsSection({ themes, onThemePress }: {
  themes:       SignalItem[];
  onThemePress: (name: string) => void;
}) {
  const themeNames = new Set(themes.map(t => t.name));
  const active     = THEME_CONNECTIONS.filter(c => themeNames.has(c.a) && themeNames.has(c.b)).slice(0, 5);
  if (active.length === 0) return null;

  return (
    <View style={th3.wrap}>
      <Text style={th3.label}>TEMA BAĞLANTILARI</Text>
      {active.map((c, i) => (
        <View key={`${c.a}-${c.b}`} style={[th3.pair, i > 0 && th3.pairBorder]}>
          <View style={th3.pairNames}>
            <Pressable onPress={() => onThemePress(c.a)}>
              <Text style={th3.nameA}>{(THEME_TR[c.a] ?? c.a).toUpperCase()}</Text>
            </Pressable>
            <Text style={th3.arrow}>←→</Text>
            <Pressable onPress={() => onThemePress(c.b)}>
              <Text style={th3.nameB}>{(THEME_TR[c.b] ?? c.b).toUpperCase()}</Text>
            </Pressable>
          </View>
          <Text style={th3.desc}>{c.desc}</Text>
        </View>
      ))}
    </View>
  );
}

const th3 = StyleSheet.create({
  wrap:       { paddingHorizontal: 24, paddingTop: 0, paddingBottom: 28 },
  label:      { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)', marginBottom: 20 },
  pair:       { paddingVertical: 16 },
  pairBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  pairNames:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 7 },
  nameA:      { fontSize: 14, fontWeight: '900', color: 'rgba(255,255,255,0.82)', letterSpacing: 0.8 },
  arrow:      { fontSize: 12, color: 'rgba(255,255,255,0.22)', fontWeight: '300' },
  nameB:      { fontSize: 14, fontWeight: '900', color: 'rgba(255,255,255,0.82)', letterSpacing: 0.8 },
  desc:       { fontSize: 13, color: 'rgba(255,255,255,0.44)', lineHeight: 20, fontStyle: 'italic' },
});

// S4: Emotional Gravity — the ecosystem surrounding each theme

function EmotionalGravitySection({ themes }: { themes: SignalItem[] }) {
  const topThemes = themes.slice(0, 3).filter(t => THEME_RELATED[t.name]);

  return (
    <View style={th4.wrap}>
      <Text style={th4.label}>DUYGUSAL ÇEKİM ALANLARI</Text>
      {topThemes.map((theme, idx) => {
        const related = THEME_RELATED[theme.name]!;
        const archs   = (THEME_ARCHETYPES[theme.name] ?? []).slice(0, 2);
        return (
          <View key={theme.name} style={[th4.block, idx > 0 && th4.blockBorder]}>
            <Text style={th4.themeName}>{(THEME_TR[theme.name] ?? theme.name).toUpperCase()}</Text>
            <View style={th4.orbits}>
              <View style={th4.orbitRow}>
                <Text style={th4.orbitLabel}>Duygular</Text>
                <Text style={th4.orbitValues}>
                  {related.emotions.map(e => EMOTION_LABEL[e] ?? e).join('  ·  ')}
                </Text>
              </View>
              <View style={th4.orbitRow}>
                <Text style={th4.orbitLabel}>Semboller</Text>
                <Text style={th4.orbitValues}>
                  {related.symbols.map(s => SYMBOL_TR[s] ?? s).join('  ·  ')}
                </Text>
              </View>
              {archs.length > 0 && (
                <View style={th4.orbitRow}>
                  <Text style={th4.orbitLabel}>Arketipler</Text>
                  <Text style={th4.orbitValues}>
                    {archs.map(a => ARCHETYPE_TR[a] ?? a).join('  ·  ')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const th4 = StyleSheet.create({
  wrap:        { paddingHorizontal: 24, paddingTop: 0, paddingBottom: 28 },
  label:       { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)', marginBottom: 20 },
  block:       { paddingVertical: 16, gap: 12 },
  blockBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  themeName:   { fontSize: 11, fontWeight: '900', letterSpacing: 1.8, color: 'rgba(255,255,255,0.55)' },
  orbits:      { gap: 8 },
  orbitRow:    { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  orbitLabel:  { fontSize: 9.5, fontWeight: '700', color: 'rgba(255,255,255,0.22)', width: 68 },
  orbitValues: { flex: 1, fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.65)', lineHeight: 20 },
});

// S5: First Appearances — new themes treated as discoveries

function FirstAppearancesSection({ themes, onThemePress }: {
  themes:       SignalItem[];
  onThemePress: (name: string) => void;
}) {
  const newThemes = themes.filter(t => t.trend === 'new');
  if (newThemes.length === 0) return null;

  return (
    <View style={th5.wrap}>
      <Text style={th5.label}>İLK KEZ BU GECE</Text>
      <Text style={th5.sub}>Yeni beliren temalar, kolektif bilinçaltının yönelimini işaret eder.</Text>
      {newThemes.map(t => (
        <Pressable
          key={t.name}
          style={({ pressed }) => [th5.item, { opacity: pressed ? 0.80 : 1 }]}
          onPress={() => onThemePress(t.name)}
        >
          <Text style={th5.star}>★</Text>
          <View style={th5.body}>
            <Text style={th5.name}>{(THEME_TR[t.name] ?? t.name).toUpperCase()}</Text>
            <Text style={th5.insight}>
              {THEME_DESC[t.name]?.split('.')[0] ?? 'Kolektif bilinçte yeni bir sinyal.'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={13} color="rgba(251,191,36,0.40)" />
        </Pressable>
      ))}
    </View>
  );
}

const th5 = StyleSheet.create({
  wrap:    { paddingHorizontal: 24, paddingBottom: 28 },
  label:   { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(251,191,36,0.55)', marginBottom: 6 },
  sub:     { fontSize: 11, color: 'rgba(255,255,255,0.32)', marginBottom: 20 },
  item:    { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  star:    { fontSize: 16, color: '#FBBF24', marginTop: 1 },
  body:    { flex: 1, gap: 4 },
  name:    { fontSize: 14, fontWeight: '900', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.8 },
  insight: { fontSize: 12.5, color: 'rgba(255,255,255,0.42)', lineHeight: 19 },
});

// Symbol Pulse — preserved data, restrained presentation

function SymbolPulse({ symbols, onPress }: { symbols: SignalItem[]; onPress: (name: string) => void }) {
  const visible = symbols.filter(s => s.count > 0).slice(0, 10);
  if (visible.length === 0) return null;

  return (
    <View style={thsym.wrap}>
      <Text style={thsym.label}>BU GECENİN SEMBOLLERİ</Text>
      <View style={thsym.flow}>
        {visible.map((s, i) => {
          const opacity = 0.30 + ((visible.length - i) / visible.length) * 0.55;
          return (
            <Pressable key={s.name} onPress={() => onPress(s.name)} style={({ pressed }) => ({ opacity: pressed ? 0.60 : 1 })}>
              <Text style={[thsym.symbol, { opacity }]}>
                {SYMBOL_TR[s.name] ?? s.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const thsym = StyleSheet.create({
  wrap:   { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 32 },
  label:  { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.18)', marginBottom: 14 },
  flow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  symbol: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.92)' },
});

// Main Themes tab — orchestrates all 5 sections + symbol pulse

function ThemalarTab({ signals, onSignalPress }: { signals: DreamSignals | undefined; onSignalPress: (name: string) => void }) {
  const router = useRouter();

  if (!signals) return <View style={tab.loader}><ActivityIndicator color="#A78BFA" /></View>;

  const themes  = [...(signals.themes  ?? [])].filter(t => t.count > 0).sort((a, b) => b.count - a.count);
  const symbols = [...(signals.symbols ?? [])].filter(s => s.count > 0).sort((a, b) => b.count - a.count);

  if (themes.length === 0 && symbols.length === 0) return (
    <View style={tab.empty}>
      <Ionicons name="moon-outline" size={32} color="rgba(255,255,255,0.18)" />
      <Text style={tab.emptyText}>Bugün henüz sinyal yok</Text>
    </View>
  );

  const maxCount = themes[0]?.count ?? 1;
  const dominant = themes[0];
  const toDetail = (name: string) => router.push(`/theme/${name}` as any);

  return (
    <View>
      {dominant && (
        <DominantThemeHero
          theme={dominant}
          onExplore={() => toDetail(dominant.name)}
          onSearch={() => onSignalPress(dominant.name)}
        />
      )}
      {themes.length > 1 && (
        <>
          <View style={thMain.sep} />
          <ThemeLandscape themes={themes} maxCount={maxCount} onThemePress={toDetail} />
        </>
      )}
      {themes.length > 0 && (
        <>
          <View style={thMain.sep} />
          <ThemeConnectionsSection themes={themes} onThemePress={toDetail} />
          <EmotionalGravitySection themes={themes} />
          <FirstAppearancesSection themes={themes} onThemePress={toDetail} />
        </>
      )}
      <View style={thMain.sep} />
      <SymbolPulse symbols={symbols} onPress={onSignalPress} />
    </View>
  );
}

const thMain = StyleSheet.create({
  sep: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 24 },
});

const tab = StyleSheet.create({
  loader:    { height: 200, alignItems: 'center', justifyContent: 'center' },
  empty:     { height: 200, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 13, color: 'rgba(255,255,255,0.28)' },
});

// ── PLACES tab: each place tells a story ─────────────────────────────────────

// ── Dream Atlas: 5-layer consciousness geography ──────────────────────────────

function placeSymbolic(name: string, type: DreamPlaceType): { title: string; meaning: string } {
  const key = name.toLowerCase()
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o')
    .replace(/ı/g, 'i').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return PLACE_SYMBOLIC[key] ?? PLACE_TYPE_MEANING[type];
}

// L1: Consciousness Territories

interface ComputedTerritory {
  key: string; config: TerritoryConfig; signals: SignalItem[];
  totalCount: number; topSignal: SignalItem | null; isRising: boolean;
}

function computeTerritories(locationSignals: SignalItem[]): ComputedTerritory[] {
  const result: ComputedTerritory[] = [];
  for (const [key, config] of Object.entries(TERRITORY_CONFIG)) {
    const sigs = locationSignals.filter(l => config.keys.includes(l.name));
    if (sigs.length === 0) continue;
    const totalCount = sigs.reduce((s, l) => s + l.count, 0);
    const topSignal  = sigs.sort((a, b) => b.count - a.count)[0] ?? null;
    const isRising   = sigs.some(s => s.trend === 'rising' || s.trend === 'new');
    result.push({ key, config, signals: sigs, totalCount, topSignal, isRising });
  }
  return result.sort((a, b) => b.totalCount - a.totalCount);
}

function ConsciousnessTerritories({ locations }: { locations: SignalItem[] }) {
  const territories = computeTerritories(locations);
  if (territories.length === 0) return null;

  const dominant   = territories[0]!;
  const secondary  = territories.slice(1, 4);
  const rare       = territories.slice(4);
  const maxCount   = dominant.totalCount;

  return (
    <View style={atl.section}>
      <Text style={atl.sectionLabel}>BU GECENİN BİLİNÇ BÖLGELERİ</Text>

      {/* Dominant territory — immersive hero */}
      <View style={atl.terrHero}>
        <Text style={atl.terrHeroEmoji}>{dominant.config.emoji}</Text>
        <Text style={atl.terrHeroName}>{dominant.config.name.toUpperCase()}</Text>
        <Text style={atl.terrHeroDesc}>{dominant.config.desc}</Text>
        <View style={atl.terrHeroMeta}>
          <Text style={atl.terrHeroCount}>{dominant.totalCount} rüya bu gece aktif</Text>
          {dominant.isRising && (
            <View style={atl.terrHeroRising}>
              <Ionicons name="trending-up" size={11} color="#34D399" />
              <Text style={atl.terrHeroRisingText}>yükseliyor</Text>
            </View>
          )}
        </View>
        <Text style={atl.terrHeroEmotion}>Dominant his: {dominant.config.defaultEmotion}</Text>
      </View>

      {/* Secondary territories — medium weight */}
      {secondary.length > 0 && (
        <View style={atl.terrSecondaryList}>
          {secondary.map(t => {
            const ratio = t.totalCount / maxCount;
            return (
              <View key={t.key} style={atl.terrSecondaryRow}>
                <Text style={atl.terrSecondaryEmoji}>{t.config.emoji}</Text>
                <View style={atl.terrSecondaryBody}>
                  <Text style={[atl.terrSecondaryName, { opacity: 0.55 + ratio * 0.35 }]}>
                    {t.config.name}
                  </Text>
                  <View style={atl.terrSecondaryTrack}>
                    <View style={[atl.terrSecondaryBar, { width: `${ratio * 100}%` as `${number}%`, backgroundColor: t.config.color }]} />
                  </View>
                </View>
                <Text style={[atl.terrSecondaryCount, { color: t.config.color }]}>{t.totalCount}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Rare territories */}
      {rare.length > 0 && (
        <Text style={atl.terrRare}>
          {'NADİR  '}
          {rare.map(t => `${t.config.emoji} ${t.config.name}`).join('   ·   ')}
        </Text>
      )}
    </View>
  );
}

// L2: Collective Hotspots

function CollectiveHotspot({ place, onPress }: { place: TrendingPlace; onPress: () => void }) {
  const sym = placeSymbolic(place.name, place.type);
  return (
    <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.78 : 1 }]} onPress={onPress}>
      <View style={atl.hotspotBlock}>
        <Text style={atl.hotspotName} numberOfLines={1}>{place.name.toUpperCase()}</Text>
        <Text style={atl.hotspotTitle}>"{sym.title}"</Text>
        <Text style={atl.hotspotMeaning}>{sym.meaning}</Text>
        <View style={atl.hotspotMeta}>
          <Ionicons name="moon-outline" size={10} color="rgba(255,255,255,0.28)" />
          <Text style={atl.hotspotCount}>{place.dreamCount} rüya bu gece</Text>
        </View>
      </View>
    </Pressable>
  );
}

function CollectiveHotspots({ places, onPlacePress, onMapPress }: {
  places:       TrendingPlace[];
  onPlacePress: (name: string) => void;
  onMapPress:   () => void;
}) {
  const sorted = [...places].sort((a, b) => b.dreamCount - a.dreamCount).slice(0, 6);
  if (sorted.length === 0) return null;

  const lead = sorted[0]!;
  const rest = sorted.slice(1);

  return (
    <View style={atl.section}>
      <Text style={atl.sectionLabel}>KOLEKTİF ODAK NOKTALARI</Text>
      <Text style={atl.sectionSub}>
        Bu gece kolektif dikkat aşağıdaki yerlerde yoğunlaşıyor. Her mekân bilinçdışında derin bir anlam taşır.
      </Text>

      {/* Lead hotspot */}
      <CollectiveHotspot place={lead} onPress={() => onPlacePress(lead.name)} />

      {/* Remaining hotspots — smaller visual weight */}
      {rest.length > 0 && (
        <View style={atl.hotspotRestList}>
          {rest.map(p => {
            const sym = placeSymbolic(p.name, p.type);
            return (
              <Pressable key={p.name} style={({ pressed }) => [atl.hotspotRestRow, { opacity: pressed ? 0.78 : 1 }]} onPress={() => onPlacePress(p.name)}>
                <View style={atl.hotspotRestBody}>
                  <Text style={atl.hotspotRestName}>{p.name}</Text>
                  <Text style={atl.hotspotRestTitle} numberOfLines={1}>"{sym.title}"</Text>
                </View>
                <Text style={atl.hotspotRestCount}>{p.dreamCount}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Preserve map navigation */}
      <Pressable style={({ pressed }) => [atl.mapLink, { opacity: pressed ? 0.78 : 1 }]} onPress={onMapPress}>
        <Ionicons name="globe-outline" size={12} color="rgba(255,255,255,0.32)" />
        <Text style={atl.mapLinkText}>Rüya haritasında gör</Text>
        <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.22)" />
      </Pressable>
    </View>
  );
}

// L3: Dream Migrations

function buildMigrationNarrative(
  from: SignalItem | null,
  current: SignalItem | null,
  emerging: SignalItem | null,
): string {
  if (!current) return 'Kolektif bilinç bu gece sakin seyrediyor.';
  const fromTerr = from    ? (LOCATION_TERRITORY_MAP[from.name]    ?? 'unknown') : null;
  const currTerr =            LOCATION_TERRITORY_MAP[current.name] ?? 'unknown';
  const currName = LOCATION_TR[current.name] ?? current.name;

  if (fromTerr === 'nature'  && currTerr === 'transformation') return 'Kolektif bilinç keşiften derinleşmeye doğru akıyor.';
  if (fromTerr === 'cities'  && currTerr === 'nature')         return 'Bilinçaltı kentsel kaygıdan doğanın sessizliğine çekiliyor.';
  if (fromTerr === 'threshold' && currTerr === 'transformation') return 'Eşik geçildi, şimdi iniş başlıyor.';
  if (currTerr === 'waters')  return 'Kolektif bilinç bu gece duygusal sularda yüzüyor.';
  if (currTerr === 'sacred')  return 'Kutsal mekânlar bu gece kolektif ruhu çekiyor.';

  if (from) {
    const fromName = LOCATION_TR[from.name] ?? from.name;
    return `Kolektif dikkat ${fromName.toLowerCase()}dan ${currName.toLowerCase()}a doğru akıyor.`;
  }
  if (emerging) {
    const emName = LOCATION_TR[emerging.name] ?? emerging.name;
    return `${currName} baskın, ${emName.toLowerCase()} yükseliyor.`;
  }
  return `${currName} bu gece kolektif bilincin odak noktası.`;
}

function DreamMigrations({ locations }: { locations: SignalItem[] }) {
  if (locations.length < 2) return null;

  const falling  = locations.filter(l => l.trend === 'falling').sort((a, b) => a.count - b.count)[0]  ?? null;
  const emerging = locations.filter(l => l.trend === 'new' || l.trend === 'rising').sort((a, b) => b.trendPct - a.trendPct)[0] ?? null;
  const current  = locations.filter(l => l !== falling && l !== emerging).sort((a, b) => b.count - a.count)[0]
    ?? locations.filter(l => l !== falling).sort((a, b) => b.count - a.count)[0]
    ?? null;

  const narrative = buildMigrationNarrative(falling, current, emerging);

  const columns = [
    falling  ? { signal: falling,  label: 'AZALIYOR',   opacity: 0.38 } : null,
    current  ? { signal: current,  label: 'BU GECE',    opacity: 0.90 } : null,
    emerging ? { signal: emerging, label: 'YÜKSELİYOR', opacity: 0.65 } : null,
  ].filter(Boolean) as { signal: SignalItem; label: string; opacity: number }[];

  if (columns.length < 2) return null;

  return (
    <View style={atl.section}>
      <Text style={atl.sectionLabel}>KOLEKTİF HAREKET</Text>
      <Text style={atl.migNarrative}>"{narrative}"</Text>
      <View style={atl.migRow}>
        {columns.map((col, i) => (
          <View key={col.signal.name} style={atl.migCol}>
            <Text style={[atl.migLocName, { opacity: col.opacity }]}>
              {(LOCATION_TR[col.signal.name] ?? col.signal.name).toUpperCase()}
            </Text>
            <Text style={[atl.migLabel, {
              color: col.label === 'YÜKSELİYOR' ? '#34D399' :
                     col.label === 'AZALIYOR'   ? '#F87171' : 'rgba(255,255,255,0.40)',
            }]}>{col.label}</Text>
            <Text style={[atl.migCount, { opacity: col.opacity }]}>{col.signal.count} rüya</Text>
            {i < columns.length - 1 && <Text style={atl.migArrow}>→</Text>}
          </View>
        ))}
      </View>
    </View>
  );
}

// L4: Consciousness Routes

interface ActiveRoute extends RouteDefinition {
  activeSteps: string[];
  totalCount:  number;
}

function computeActiveRoutes(locationSignals: SignalItem[]): ActiveRoute[] {
  const active = new Map(locationSignals.map(l => [l.name, l.count]));
  return CONSCIOUSNESS_ROUTES_DEF
    .map(r => {
      const matchedSteps = r.steps.filter(s => active.has(s));
      const totalCount   = matchedSteps.reduce((sum, s) => sum + (active.get(s) ?? 0), 0);
      return { ...r, activeSteps: matchedSteps, totalCount };
    })
    .filter(r => r.activeSteps.length >= 2)
    .sort((a, b) => b.activeSteps.length - a.activeSteps.length);
}

function ConsciousnessRoutes({ locations }: { locations: SignalItem[] }) {
  const activeRoutes = computeActiveRoutes(locations);
  if (activeRoutes.length === 0) return null;

  return (
    <View style={atl.section}>
      <Text style={atl.sectionLabel}>KOLEKTİF YOLCULUKLAR</Text>
      <Text style={atl.sectionSub}>
        Bu gece kolektif bilinç aşağıdaki rota desenlerini takip ediyor.
      </Text>
      {activeRoutes.map((route, ri) => (
        <View key={route.id} style={[atl.routeBlock, ri > 0 && atl.routeBlockBorder]}>
          <View style={atl.routeHeader}>
            <Text style={atl.routeIcon}>{route.icon}</Text>
            <View style={atl.routeHeaderText}>
              <Text style={atl.routeName}>{route.name}</Text>
              <Text style={atl.routeActive}>{route.activeSteps.length}/{route.steps.length} adım aktif · {route.totalCount} rüya</Text>
            </View>
          </View>
          <View style={atl.routeSteps}>
            {route.steps.map((step, i) => {
              const isActive = route.activeSteps.includes(step);
              return (
                <View key={step} style={atl.routeStepItem}>
                  <Text style={[atl.routeStepName, { opacity: isActive ? 0.88 : 0.28 }]}>
                    {route.stepLabels[i] ?? step}
                  </Text>
                  {i < route.steps.length - 1 && (
                    <Text style={[atl.routeStepArrow, { opacity: isActive ? 0.50 : 0.18 }]}>→</Text>
                  )}
                </View>
              );
            })}
          </View>
          <Text style={atl.routeDesc}>{route.desc}</Text>
        </View>
      ))}
    </View>
  );
}

// L5: World Dream Map

const MAP_LOCAL_W = SCREEN_W - 32;
const MAP_LOCAL_H = 190;

function placeToMapPos(place: TrendingPlace): [number, number] | null {
  if (place.latitude == null || place.longitude == null) return null;
  return [
    ((place.longitude + 180) / 360) * MAP_LOCAL_W,
    ((90 - place.latitude) / 180) * MAP_LOCAL_H,
  ];
}

function WorldDreamMap({ places, onMapPress }: { places: TrendingPlace[]; onMapPress: () => void }) {
  const withPos = places.filter(p => p.latitude != null && p.longitude != null);
  const maxCount = Math.max(...withPos.map(p => p.dreamCount), 1);
  const totalDreamers = places.reduce((s, p) => s + p.dreamCount, 0);

  return (
    <View style={atl.section}>
      <Text style={atl.sectionLabel}>DÜNYA BİLİNÇ HARİTASI</Text>
      <View style={atl.worldMapContainer}>
        {/* Atmospheric latitude lines */}
        {[0.25, 0.50, 0.75].map(y => (
          <View key={y} style={[atl.worldLatLine, { top: y * MAP_LOCAL_H }]} />
        ))}
        {/* City nodes with actual coordinates */}
        {withPos.map(p => {
          const pos = placeToMapPos(p);
          if (!pos) return null;
          const r = 3 + Math.round((p.dreamCount / maxCount) * 12);
          return (
            <View
              key={p.name}
              style={[atl.worldDot, {
                left:         pos[0] - r,
                top:          pos[1] - r,
                width:        r * 2,
                height:       r * 2,
                borderRadius: r,
                backgroundColor: PLACE_COLOR[p.type],
                shadowColor:     PLACE_COLOR[p.type],
              }]}
            />
          );
        })}
        {/* Fallback dots from country-based positioning for places without coords */}
        {places.filter(p => p.latitude == null).slice(0, 8).map(p => {
          const h  = Math.abs([...p.name].reduce((a, c) => (Math.imul(31, a) + c.charCodeAt(0)) | 0, 0));
          const rx = 0.05 + (h % 88) / 100;
          const ry = 0.10 + ((h >> 5) % 78) / 100;
          const r  = 4;
          return (
            <View
              key={p.name}
              style={[atl.worldDot, {
                left: rx * MAP_LOCAL_W - r, top: ry * MAP_LOCAL_H - r,
                width: r * 2, height: r * 2, borderRadius: r,
                backgroundColor: PLACE_COLOR[p.type], shadowColor: PLACE_COLOR[p.type],
              }]}
            />
          );
        })}
      </View>
      <Text style={atl.worldMapMeta}>
        {totalDreamers} rüya aktivitesi · {places.length} mekân
      </Text>
      <Pressable style={({ pressed }) => [atl.mapLink, { opacity: pressed ? 0.78 : 1 }]} onPress={onMapPress}>
        <Ionicons name="map-outline" size={12} color="rgba(255,255,255,0.32)" />
        <Text style={atl.mapLinkText}>Tam haritayı keşfet</Text>
        <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.22)" />
      </Pressable>
    </View>
  );
}

// ── YerlerTab orchestrator ────────────────────────────────────────────────────

function YerlerTab() {
  const router = useRouter();
  const { data: places = [], isLoading } = useQuery({
    queryKey: ['places', 'trending', 'week'], queryFn: () => getTrendingByPeriod('week'), staleTime: 5 * 60 * 1000,
  });
  const { data: signals } = useQuery({
    queryKey: ['signals', 'today'], queryFn: getSignalsToday, staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <View style={tab.loader}><ActivityIndicator color="#34D399" /></View>;

  const locationSignals = [...(signals?.locations ?? [])].filter(l => l.count > 0).sort((a, b) => b.count - a.count);

  if (places.length === 0 && locationSignals.length === 0) return (
    <View style={tab.empty}>
      <Ionicons name="globe-outline" size={32} color="rgba(255,255,255,0.18)" />
      <Text style={tab.emptyText}>Bilinç haritası oluşuyor</Text>
    </View>
  );

  const onPlacePress = (name: string) => router.push(`/dream-place/${encodeURIComponent(name)}` as any);
  const onMapPress   = () => router.push('/dream-map');

  return (
    <View style={atl.wrap}>
      {/* L1 */}
      {locationSignals.length > 0 && <ConsciousnessTerritories locations={locationSignals} />}
      {locationSignals.length > 0 && <View style={atl.sep} />}

      {/* L2 */}
      {places.length > 0 && <CollectiveHotspots places={places} onPlacePress={onPlacePress} onMapPress={onMapPress} />}
      {places.length > 0 && <View style={atl.sep} />}

      {/* L3 */}
      {locationSignals.length >= 2 && <DreamMigrations locations={locationSignals} />}
      {locationSignals.length >= 2 && <View style={atl.sep} />}

      {/* L4 */}
      {locationSignals.length > 0 && <ConsciousnessRoutes locations={locationSignals} />}

      {/* L5 */}
      {places.length > 0 && (
        <>
          <View style={atl.sep} />
          <WorldDreamMap places={places} onMapPress={onMapPress} />
        </>
      )}
    </View>
  );
}

const atl = StyleSheet.create({
  wrap:        { paddingTop: 20, paddingBottom: 8 },
  sep:         { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 24, marginVertical: 0 },
  section:     { paddingHorizontal: 24, paddingVertical: 24, gap: 16 },
  sectionLabel:{ fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.22)' },
  sectionSub:  { fontSize: 12, color: 'rgba(255,255,255,0.40)', lineHeight: 18, marginTop: -8 },

  // L1 Territories
  terrHero:        { gap: 10, paddingTop: 4 },
  terrHeroEmoji:   { fontSize: 40 },
  terrHeroName:    { fontSize: 32, fontWeight: '900', color: 'rgba(255,255,255,0.92)', letterSpacing: 2 },
  terrHeroDesc:    { fontSize: 14, color: 'rgba(255,255,255,0.52)', lineHeight: 22 },
  terrHeroMeta:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  terrHeroCount:   { fontSize: 12, color: 'rgba(255,255,255,0.50)', fontWeight: '600' },
  terrHeroRising:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  terrHeroRisingText:{ fontSize: 11, fontWeight: '700', color: '#34D399' },
  terrHeroEmotion: { fontSize: 11, color: 'rgba(255,255,255,0.30)', fontWeight: '600', letterSpacing: 0.3 },
  terrSecondaryList:{ gap: 12, marginTop: 4 },
  terrSecondaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  terrSecondaryEmoji:{ fontSize: 18 },
  terrSecondaryBody: { flex: 1, gap: 5 },
  terrSecondaryName: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.88)' },
  terrSecondaryTrack:{ height: 2, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 1, overflow: 'hidden' },
  terrSecondaryBar:  { height: '100%', borderRadius: 1, opacity: 0.60 },
  terrSecondaryCount:{ fontSize: 13, fontWeight: '800' },
  terrRare:   { fontSize: 10, color: 'rgba(255,255,255,0.24)', lineHeight: 17, fontWeight: '500' },

  // L2 Hotspots
  hotspotBlock:  { paddingVertical: 8, gap: 8 },
  hotspotName:   { fontSize: 26, fontWeight: '900', color: 'rgba(255,255,255,0.90)', letterSpacing: 1.5 },
  hotspotTitle:  { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' },
  hotspotMeaning:{ fontSize: 13, color: 'rgba(255,255,255,0.44)', lineHeight: 21 },
  hotspotMeta:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hotspotCount:  { fontSize: 11, color: 'rgba(255,255,255,0.28)', fontWeight: '600' },
  hotspotRestList:{ gap: 0, marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  hotspotRestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  hotspotRestBody:{ flex: 1, gap: 2 },
  hotspotRestName:{ fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.80)' },
  hotspotRestTitle:{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' },
  hotspotRestCount:{ fontSize: 18, fontWeight: '900', color: 'rgba(255,255,255,0.55)' },
  mapLink:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  mapLinkText:    { flex: 1, fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.32)' },

  // L3 Migrations
  migNarrative: { fontSize: 15, color: 'rgba(255,255,255,0.68)', lineHeight: 24, fontStyle: 'italic', marginTop: -4 },
  migRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 0 },
  migCol:       { flex: 1, alignItems: 'center', gap: 6, position: 'relative' },
  migLocName:   { fontSize: 13, fontWeight: '900', color: 'rgba(255,255,255,0.90)', letterSpacing: 0.8, textAlign: 'center' },
  migLabel:     { fontSize: 8, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center' },
  migCount:     { fontSize: 11, color: 'rgba(255,255,255,0.50)', fontWeight: '600', textAlign: 'center' },
  migArrow:     { position: 'absolute', right: -6, top: 8, fontSize: 16, color: 'rgba(255,255,255,0.18)' },

  // L4 Routes
  routeBlock:       { paddingVertical: 18, gap: 12 },
  routeBlockBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  routeHeader:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  routeIcon:        { fontSize: 24 },
  routeHeaderText:  { flex: 1, gap: 3 },
  routeName:        { fontSize: 12, fontWeight: '900', letterSpacing: 1.8, color: 'rgba(255,255,255,0.72)' },
  routeActive:      { fontSize: 10, color: '#34D399', fontWeight: '600' },
  routeSteps:       { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 0 },
  routeStepItem:    { flexDirection: 'row', alignItems: 'center' },
  routeStepName:    { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.88)' },
  routeStepArrow:   { fontSize: 14, color: 'rgba(255,255,255,0.40)', marginHorizontal: 8 },
  routeDesc:        { fontSize: 12.5, color: 'rgba(255,255,255,0.40)', lineHeight: 20 },

  // L5 World Map
  worldMapContainer: {
    width: MAP_LOCAL_W, height: MAP_LOCAL_H,
    backgroundColor: '#010108', borderRadius: 16, overflow: 'hidden', position: 'relative',
  },
  worldLatLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(167,139,250,0.07)' },
  worldDot: {
    position: 'absolute',
    shadowOpacity: 0.75, shadowRadius: 5, shadowOffset: { width: 0, height: 0 },
    elevation: 3, opacity: 0.82,
  },
  worldMapMeta: { fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: '600', textAlign: 'center' },
});

// ── ARCHETYPES tab: mythological force discovery ──────────────────────────────

// Hero card: the top active archetype tonight — full immersion
function ActiveArchetypeHero({ name, count, trendPct, trend, onEnter }: {
  name: string; count: number; trendPct: number; trend: string; onEnter: () => void;
}) {
  const displayName = ARCHETYPE_TR[name]    ?? name;
  const enName      = ARCHETYPE_EN[name]    ?? name;
  const subtitle    = ARCHETYPE_SUBTITLE[name];
  const longDesc    = ARCHETYPE_LONG_DESC[name];
  const emoji       = ARCHETYPE_EMOJI[name] ?? '🌙';
  const color       = ARCHETYPE_COLOR[name] ?? '#A78BFA';
  const emotions    = (ARCHETYPE_EMOTIONS[name]  ?? []).slice(0, 3);
  const symbols     = (ARCHETYPE_SYMBOLS[name]   ?? []).slice(0, 3);
  const isRising    = trend === 'rising';
  const isNew       = trend === 'new';

  return (
    <View style={[ah.card, { borderColor: `${color}25` }]}>
      <View style={[ah.topBar, { backgroundColor: color }]} />

      {/* Identity */}
      <View style={ah.identity}>
        <Text style={ah.heroEmoji}>{emoji}</Text>
        <Text style={[ah.enName, { color: `${color}70` }]}>{enName.toUpperCase()}</Text>
        <Text style={ah.heroName}>{displayName}</Text>
        {subtitle && <Text style={[ah.heroSubtitle, { color }]}>{subtitle}</Text>}
        <View style={[ah.divider, { backgroundColor: `${color}30` }]} />
        {longDesc && <Text style={ah.heroDesc}>{longDesc}</Text>}
      </View>

      {/* Live status */}
      <View style={ah.statsWrap}>
        <View style={ah.liveRow}>
          <View style={[ah.liveDot, { backgroundColor: '#34D399' }]} />
          <Text style={ah.liveText}>{count} rüyacı bu gece aktif</Text>
        </View>
        <View style={ah.trendRow}>
          {isNew && (
            <View style={[ah.badge, { backgroundColor: `${color}18`, borderColor: `${color}38` }]}>
              <Text style={[ah.badgeText, { color }]}>BU GECE UYANDI</Text>
            </View>
          )}
          {isRising && (
            <View style={ah.risingRow}>
              <Ionicons name="trending-up" size={12} color="#34D399" />
              <Text style={ah.risingText}>+{trendPct}%</Text>
            </View>
          )}
        </View>
      </View>

      {/* Attributes */}
      {emotions.length > 0 && (
        <View style={ah.attrBlock}>
          <Text style={ah.attrLabel}>DUYGULAR</Text>
          <View style={ah.chips}>
            {emotions.map(e => (
              <View key={e} style={[ah.chip, { borderColor: 'rgba(244,114,182,0.28)', backgroundColor: 'rgba(244,114,182,0.06)' }]}>
                <Text style={[ah.chipText, { color: '#F472B6' }]}>{EMOTION_LABEL[e] ?? e}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {symbols.length > 0 && (
        <View style={ah.attrBlock}>
          <Text style={ah.attrLabel}>SEMBOLLER</Text>
          <View style={ah.chips}>
            {symbols.map(s => (
              <View key={s} style={[ah.chip, { borderColor: 'rgba(96,165,250,0.28)', backgroundColor: 'rgba(96,165,250,0.06)' }]}>
                <Text style={[ah.chipText, { color: '#60A5FA' }]}>{SYMBOL_TR[s] ?? s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Gateway CTA */}
      <Pressable style={({ pressed }) => [ah.cta, { backgroundColor: color, opacity: pressed ? 0.82 : 1 }]} onPress={onEnter}>
        <Text style={ah.ctaText}>{displayName.toUpperCase()} DÜNYASINA GİR</Text>
        <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.90)" />
      </Pressable>
    </View>
  );
}

// Secondary active archetype cards (2nd, 3rd) — peek scroll
function SecondaryArchetypeCard({ name, count, trendPct, trend, onEnter }: {
  name: string; count: number; trendPct: number; trend: string; onEnter: () => void;
}) {
  const displayName = ARCHETYPE_TR[name] ?? name;
  const longDesc    = ARCHETYPE_LONG_DESC[name];
  const emoji       = ARCHETYPE_EMOJI[name] ?? '🌙';
  const color       = ARCHETYPE_COLOR[name] ?? '#A78BFA';
  const isRising    = trend === 'rising';
  const firstSentence = longDesc?.split('.')[0] ?? '';

  return (
    <Pressable style={({ pressed }) => [sa.card, { borderColor: `${color}22`, opacity: pressed ? 0.82 : 1 }]} onPress={onEnter}>
      <View style={[sa.topBar, { backgroundColor: color }]} />
      <View style={sa.body}>
        <Text style={sa.emoji}>{emoji}</Text>
        <Text style={sa.name}>{displayName}</Text>
        {firstSentence.length > 0 && <Text style={sa.desc} numberOfLines={2}>{firstSentence}.</Text>}
        <View style={sa.footer}>
          <View style={sa.liveRow}>
            <View style={[sa.liveDot, { backgroundColor: '#34D399' }]} />
            <Text style={sa.count}>{count}</Text>
          </View>
          {isRising && (
            <View style={sa.trendRow}>
              <Ionicons name="trending-up" size={10} color="#34D399" />
              <Text style={sa.trendText}>+{trendPct}%</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// Gallery card: all archetypes (active and dormant) — character dossier style
function ArchetypeGalleryCard({ name, liveCount, liveRising, liveTrend, onEnter }: {
  name: string; liveCount: number; liveRising: boolean; liveTrend: number; onEnter: () => void;
}) {
  const displayName = ARCHETYPE_TR[name]    ?? name;
  const enName      = ARCHETYPE_EN[name]    ?? name;
  const subtitle    = ARCHETYPE_SUBTITLE[name];
  const longDesc    = ARCHETYPE_LONG_DESC[name];
  const emoji       = ARCHETYPE_EMOJI[name] ?? '🌙';
  const color       = ARCHETYPE_COLOR[name] ?? '#A78BFA';
  const isActive    = liveCount > 0;
  const firstSentence = longDesc?.split('.')[0] ?? '';

  return (
    <Pressable style={({ pressed }) => [ag.card, { borderColor: `${color}18`, opacity: pressed ? 0.80 : 1 }]} onPress={onEnter}>
      <View style={[ag.leftBar, { backgroundColor: color }]} />
      <View style={ag.body}>
        <View style={ag.top}>
          <View style={[ag.emojiCircle, { backgroundColor: `${color}14` }]}>
            <Text style={ag.emoji}>{emoji}</Text>
          </View>
          <View style={ag.nameBlock}>
            <Text style={[ag.enName, { color: `${color}60` }]}>{enName.toUpperCase()}</Text>
            <Text style={ag.name}>{displayName}</Text>
            {subtitle && <Text style={[ag.subtitle, { color }]}>{subtitle}</Text>}
          </View>
          {isActive ? (
            <View style={ag.activePill}>
              <View style={[ag.activeDot, { backgroundColor: '#34D399' }]} />
              <Text style={ag.activeText}>{liveCount}</Text>
            </View>
          ) : (
            <Text style={ag.dormantText}>ZZZ</Text>
          )}
        </View>
        {firstSentence.length > 0 && <Text style={ag.desc} numberOfLines={2}>{firstSentence}.</Text>}
        <View style={ag.footer}>
          {isActive && liveRising && (
            <View style={ag.trendRow}>
              <Ionicons name="trending-up" size={10} color="#34D399" />
              <Text style={ag.trendText}>+{liveTrend}% bu gece</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <View style={[ag.enterBtn, { borderColor: `${color}35` }]}>
            <Text style={[ag.enterText, { color }]}>KEŞFETme →</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// Connection card: meaningful archetype relationships
function ArchetypeConnectionCard({ a, b, desc }: { a: string; b: string; desc: string }) {
  const colorA = ARCHETYPE_COLOR[a] ?? '#A78BFA';
  const colorB = ARCHETYPE_COLOR[b] ?? '#60A5FA';
  const nameA  = ARCHETYPE_TR[a]    ?? a;
  const nameB  = ARCHETYPE_TR[b]    ?? b;
  const emojiA = ARCHETYPE_EMOJI[a] ?? '🌙';
  const emojiB = ARCHETYPE_EMOJI[b] ?? '🌙';

  return (
    <View style={conn.card}>
      <View style={conn.sides}>
        <View style={conn.side}>
          <Text style={conn.sideEmoji}>{emojiA}</Text>
          <Text style={[conn.sideName, { color: colorA }]}>{nameA}</Text>
        </View>
        <Text style={conn.arrow}>↔</Text>
        <View style={conn.side}>
          <Text style={conn.sideEmoji}>{emojiB}</Text>
          <Text style={[conn.sideName, { color: colorB }]}>{nameB}</Text>
        </View>
      </View>
      <Text style={conn.desc}>{desc}</Text>
    </View>
  );
}

// ── ARCHETYPES TAB ORCHESTRATOR ───────────────────────────────────────────────

function ArketiperTab({ signals, onSignalPress }: {
  signals:       DreamSignals | undefined;
  onSignalPress: (name: string) => void;
}) {
  const router = useRouter();

  if (!signals) return <View style={tab.loader}><ActivityIndicator color="#FBBF24" /></View>;

  const liveMap = new Map((signals.archetypes ?? []).map(a => [a.name, a]));
  const liveActive = [...(signals.archetypes ?? [])]
    .filter(a => a.count > 0)
    .sort((a, b) => b.count - a.count);

  const hero      = liveActive[0];
  const secondary = liveActive.slice(1, 3);

  const galleryOrder = Object.keys(ARCHETYPE_TR).sort((a, b) => {
    const la = liveMap.get(a);
    const lb = liveMap.get(b);
    if (la?.count && !lb?.count) return -1;
    if (!la?.count && lb?.count) return  1;
    if (la?.count && lb?.count)  return lb.count - la.count;
    return 0;
  });

  const handleEnter = (name: string) => router.push(`/archetype/${name}` as any);

  return (
    <View style={at.wrap}>
      {/* ── SECTION 1: Active forces tonight ── */}
      {hero && (
        <View style={at.section}>
          <Text style={at.sectionLabel}>BU GECENİN GÜCÜ</Text>
          <Text style={at.sectionSub}>En güçlü arketip şu an aktif</Text>
          <View style={at.heroWrap}>
            <ActiveArchetypeHero
              name={hero.name}
              count={hero.count}
              trendPct={hero.trendPct}
              trend={hero.trend}
              onEnter={() => handleEnter(hero.name)}
            />
          </View>
        </View>
      )}

      {secondary.length > 0 && (
        <View style={at.section}>
          <Text style={at.sectionLabel}>DİĞER AKTİF GÜÇLER</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={at.secondaryScroll}>
            {secondary.map(s => (
              <SecondaryArchetypeCard
                key={s.name}
                name={s.name}
                count={s.count}
                trendPct={s.trendPct}
                trend={s.trend}
                onEnter={() => handleEnter(s.name)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── SECTION 2: The complete mythological gallery ── */}
      <View style={at.section}>
        <Text style={at.sectionLabel}>TÜM BİLİNÇALTI GÜÇLERİ</Text>
        <Text style={at.sectionSub}>Kolektif bilincin 11 temel kuvveti</Text>
        <View style={at.galleryList}>
          {galleryOrder.map(name => {
            const live = liveMap.get(name);
            return (
              <ArchetypeGalleryCard
                key={name}
                name={name}
                liveCount={live?.count    ?? 0}
                liveRising={live?.trend   === 'rising'}
                liveTrend={live?.trendPct ?? 0}
                onEnter={() => handleEnter(name)}
              />
            );
          })}
        </View>
      </View>

      {/* ── SECTION 3: Subconscious connections ── */}
      <View style={at.section}>
        <Text style={at.sectionLabel}>BİLİNÇALTI BAĞLANTILARI</Text>
        <Text style={at.sectionSub}>Arketiplerin gizemli ilişkileri</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={at.connScroll}>
          {ARCHETYPE_CONNECTIONS.map((rel, i) => (
            <ArchetypeConnectionCard key={i} a={rel.a} b={rel.b} desc={rel.desc} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// ── Archetype StyleSheets ─────────────────────────────────────────────────────

const ah = StyleSheet.create({
  card: {
    marginHorizontal: 20, backgroundColor: '#04030E',
    borderRadius: 20, borderWidth: 1, overflow: 'hidden',
  },
  topBar:       { height: 3 },
  identity:     { padding: 24, gap: 6, alignItems: 'flex-start' },
  heroEmoji:    { fontSize: 56, marginBottom: 8 },
  enName:       { fontSize: 9, fontWeight: '900', letterSpacing: 2.2 },
  heroName:     { fontSize: 36, fontWeight: '900', color: 'rgba(255,255,255,0.95)', letterSpacing: -1, lineHeight: 42, marginTop: 2 },
  heroSubtitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  divider:      { width: '100%', height: 1, marginVertical: 14 },
  heroDesc:     { fontSize: 14, color: 'rgba(255,255,255,0.60)', lineHeight: 22, fontWeight: '400' },
  statsWrap:    { paddingHorizontal: 24, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot:      { width: 7, height: 7, borderRadius: 3.5 },
  liveText:     { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.65)' },
  trendRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge:        { borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText:    { fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 },
  risingRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  risingText:   { fontSize: 12, fontWeight: '800', color: '#34D399' },
  attrBlock:    { paddingHorizontal: 24, paddingBottom: 14, gap: 7 },
  attrLabel:    { fontSize: 7.5, fontWeight: '900', letterSpacing: 1.6, color: 'rgba(255,255,255,0.28)' },
  chips:        { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  chip:         { borderWidth: 1, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
  chipText:     { fontSize: 11, fontWeight: '700' },
  cta: {
    margin: 20, marginTop: 8, borderRadius: 14,
    paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaText: { fontSize: 12, fontWeight: '900', color: 'rgba(255,255,255,0.92)', letterSpacing: 0.8 },
});

const sa = StyleSheet.create({
  card: {
    width: SCREEN_W * 0.70, backgroundColor: '#05041A',
    borderRadius: 18, borderWidth: 1, overflow: 'hidden',
  },
  topBar: { height: 2 },
  body:   { padding: 18, gap: 8 },
  emoji:  { fontSize: 32, marginBottom: 2 },
  name:   { fontSize: 20, fontWeight: '900', color: 'rgba(255,255,255,0.92)', letterSpacing: -0.5 },
  desc:   { fontSize: 12, color: 'rgba(255,255,255,0.48)', lineHeight: 18 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  liveRow:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot:{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  count:  { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.55)' },
  trendRow:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendText:{ fontSize: 11, fontWeight: '800', color: '#34D399' },
});

const ag = StyleSheet.create({
  card: {
    backgroundColor: '#05041A', borderRadius: 16, borderWidth: 1,
    flexDirection: 'row', overflow: 'hidden',
  },
  leftBar:    { width: 3 },
  body:       { flex: 1, padding: 16, gap: 10 },
  top:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  emojiCircle:{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  emoji:      { fontSize: 22 },
  nameBlock:  { flex: 1, gap: 2 },
  enName:     { fontSize: 7.5, fontWeight: '900', letterSpacing: 1.4 },
  name:       { fontSize: 18, fontWeight: '900', color: 'rgba(255,255,255,0.92)', letterSpacing: -0.4 },
  subtitle:   { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(52,211,153,0.10)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  activeDot:  { width: 5, height: 5, borderRadius: 2.5 },
  activeText: { fontSize: 10, fontWeight: '800', color: '#34D399' },
  dormantText:{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.18)', letterSpacing: 1 },
  desc:       { fontSize: 12, color: 'rgba(255,255,255,0.44)', lineHeight: 18 },
  footer:     { flexDirection: 'row', alignItems: 'center' },
  trendRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendText:  { fontSize: 9.5, fontWeight: '800', color: '#34D399' },
  enterBtn:   { borderWidth: 1, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
  enterText:  { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
});

const conn = StyleSheet.create({
  card: {
    width: 190, backgroundColor: '#05041A', borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)',
    padding: 16, gap: 10,
  },
  sides:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side:     { alignItems: 'center', gap: 4, flex: 1 },
  sideEmoji:{ fontSize: 26 },
  sideName: { fontSize: 11, fontWeight: '800', letterSpacing: -0.2 },
  arrow:    { fontSize: 20, color: 'rgba(255,255,255,0.25)', paddingHorizontal: 6 },
  desc:     { fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 17, textAlign: 'center' },
});

const at = StyleSheet.create({
  wrap:           { paddingBottom: 16 },
  section:        { marginTop: 30 },
  sectionLabel:   { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.28)', paddingHorizontal: 20, marginBottom: 4 },
  sectionSub:     { fontSize: 10.5, color: 'rgba(255,255,255,0.35)', paddingHorizontal: 20, marginBottom: 14, fontWeight: '400' },
  heroWrap:       { paddingBottom: 4 },
  secondaryScroll:{ paddingHorizontal: 20, gap: 12 },
  galleryList:    { gap: 8, paddingHorizontal: 20 },
  connScroll:     { paddingHorizontal: 20, gap: 10 },
});

// ── Dream Universe coordinator ────────────────────────────────────────────────

function DreamUniverse({ onSignalPress }: { onSignalPress: (name: string) => void }) {
  const [activeTab, setActiveTab] = useState<UniverseTab>('dunya');

  const { data: signals } = useQuery({
    queryKey: ['signals', 'today'], queryFn: getSignalsToday, staleTime: 5 * 60 * 1000, retry: 1,
  });
  const { data: weather } = useQuery({
    queryKey: ['weather', 'now'], queryFn: getWeatherNow, staleTime: 5 * 60 * 1000, retry: 1,
  });

  const handleTabPress = useCallback((t: UniverseTab) => setActiveTab(t), []);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <View style={du.header}>
        <Text style={du.title}>DREAM UNIVERSE</Text>
        <Text style={du.subtitle}>İnsanlığın Bilinçaltını Keşfet</Text>
        {(weather || signals) && (
          <View style={du.meta}>
            {weather?.totalDreamers ? <Text style={du.metaText}>{weather.totalDreamers} rüyacı aktif</Text> : null}
            {weather?.totalDreamers && signals?.dreamCount ? <Text style={du.metaDot}>·</Text> : null}
            {signals?.dreamCount    ? <Text style={du.metaText}>{signals.dreamCount} rüya bu gece</Text>   : null}
          </View>
        )}
      </View>

      <UniverseNavBar active={activeTab} onPress={handleTabPress} />

      {activeTab === 'dunya'      && <DunyaTab signals={signals} weather={weather} onSignalPress={onSignalPress} />}
      {activeTab === 'temalar'    && <ThemalarTab signals={signals} onSignalPress={onSignalPress} />}
      {activeTab === 'yerler'     && <YerlerTab />}
      {activeTab === 'arketipler' && <ArketiperTab signals={signals} onSignalPress={onSignalPress} />}
    </ScrollView>
  );
}

const du = StyleSheet.create({
  header:   { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 18, gap: 4 },
  title:    { fontSize: 24, fontWeight: '900', letterSpacing: 2.8, color: 'rgba(255,255,255,0.96)' },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.30)', fontWeight: '500' },
  meta:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  metaText: { fontSize: 10, fontWeight: '700', color: 'rgba(167,139,250,0.58)' },
  metaDot:  { fontSize: 10, color: 'rgba(255,255,255,0.18)' },
});

// ── Search result rows (PRESERVED) ───────────────────────────────────────────

function DreamResultRow({ item, onPress }: { item: DreamSearchResult; onPress: () => void }) {
  const cat    = item.category as keyof typeof CategoryColors;
  const colors = CategoryColors[cat] ?? CategoryColors.normal;
  return (
    <Pressable style={({ pressed }) => [srch.row, { opacity: pressed ? 0.80 : 1 }]} onPress={onPress}>
      <View style={[srch.catDot, { backgroundColor: colors.accent }]} />
      <View style={srch.body}>
        {item.title ? <Text style={srch.title} numberOfLines={1}>{item.title}</Text> : null}
        <Text style={srch.sub} numberOfLines={2}>{item.content}</Text>
        <View style={srch.metaRow}>
          <Text style={srch.meta}>{item.author ? `@${item.author.username}` : 'Anonim'} ·</Text>
          <Ionicons name="heart-outline" size={11} color={Colors.textMuted} />
          <Text style={srch.meta}>{item.likeCount}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function UserResultRow({ item, onPress }: { item: UserSearchResult; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [srch.row, { opacity: pressed ? 0.80 : 1 }]} onPress={onPress}>
      <Avatar uri={item.avatarUrl} name={item.displayName ?? item.username} size={40} />
      <View style={srch.body}>
        <Text style={srch.title}>{item.displayName ?? item.username}</Text>
        <Text style={srch.sub}>@{item.username}</Text>
        {item.bio ? <Text style={srch.meta} numberOfLines={1}>{item.bio}</Text> : null}
      </View>
    </Pressable>
  );
}

function TagResultRow({ item, onPress }: { item: TagSearchResult; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [srch.row, { opacity: pressed ? 0.80 : 1 }]} onPress={onPress}>
      <View style={srch.tagIcon}>
        <Text style={srch.tagHash}>#</Text>
      </View>
      <View style={srch.body}>
        <Text style={srch.title}>#{item.tag}</Text>
        <Text style={srch.sub}>{item.count} rüyada</Text>
      </View>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const router = useRouter();

  const [query,          setQuery]          = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab,      setActiveTab]      = useState<SearchTab>('dreams');
  const [isFocused,      setIsFocused]      = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const isSearchMode = isFocused || query.length > 0;

  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn:  () => search(debouncedQuery),
    enabled:  debouncedQuery.length >= 2,
    staleTime: 30 * 1000,
  });

  const handleDreamPress  = useCallback((id: string) => { Keyboard.dismiss(); router.push(`/dream/${id}`); }, [router]);
  const handleUserPress   = useCallback((id: string) => { Keyboard.dismiss(); router.push(`/user/${id}`); }, [router]);
  const handleCancel      = useCallback(() => { setQuery(''); setDebouncedQuery(''); setIsFocused(false); Keyboard.dismiss(); }, []);
  const handleSignalPress = useCallback((name: string) => {
    setQuery(name); setDebouncedQuery(name); setActiveTab('dreams'); Keyboard.dismiss();
  }, []);

  const dreamResults = searchResults?.dreams ?? [];
  const userResults  = searchResults?.users  ?? [];
  const tagResults   = searchResults?.tags   ?? [];

  const TAB_LABELS: Record<SearchTab, string> = {
    dreams: `Rüyalar${dreamResults.length > 0 ? ` (${dreamResults.length})` : ''}`,
    users:  `Kişiler${userResults.length  > 0 ? ` (${userResults.length})`  : ''}`,
    tags:   `Etiket${tagResults.length   > 0 ? ` (${tagResults.length})`   : ''}`,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, isFocused && styles.searchBoxFocused]}>
          <Ionicons name="search-outline" size={15} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tema, sembol, yer, rüya, kişi…"
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsFocused(true)}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
          />
          {query.length > 0 && Platform.OS === 'android' && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Text style={{ fontSize: 13, color: Colors.textMuted }}>✕</Text>
            </Pressable>
          )}
        </View>
        {isSearchMode && (
          <Pressable style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>İptal</Text>
          </Pressable>
        )}
      </View>

      {isSearchMode ? (
        <View style={{ flex: 1 }}>
          {debouncedQuery.length < 2 ? (
            <View style={styles.searchHint}>
              <Ionicons name="search-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.searchHintText}>En az 2 karakter gir…</Text>
            </View>
          ) : (
            <>
              <View style={styles.tabs}>
                {(['dreams', 'users', 'tags'] as SearchTab[]).map(t => {
                  const active = activeTab === t;
                  return (
                    <Pressable key={t} style={[styles.tab, active && styles.tabActive]} onPress={() => setActiveTab(t)}>
                      <Text style={[styles.tabText, active && styles.tabTextActive]}>{TAB_LABELS[t]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {searching ? (
                <View style={styles.searchLoader}><ActivityIndicator size="small" color={Colors.primary} /></View>
              ) : (
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                  {activeTab === 'dreams' && dreamResults.length === 0 && (
                    <View style={styles.noResults}><Text style={styles.noResultsText}>"{debouncedQuery}" için rüya bulunamadı</Text></View>
                  )}
                  {activeTab === 'dreams' && dreamResults.map(d => (
                    <DreamResultRow key={d.id} item={d} onPress={() => handleDreamPress(d.id)} />
                  ))}
                  {activeTab === 'users' && userResults.length === 0 && (
                    <View style={styles.noResults}><Text style={styles.noResultsText}>"{debouncedQuery}" için kişi bulunamadı</Text></View>
                  )}
                  {activeTab === 'users' && userResults.map(u => (
                    <UserResultRow key={u.id} item={u} onPress={() => handleUserPress(u.id)} />
                  ))}
                  {activeTab === 'tags' && tagResults.length === 0 && (
                    <View style={styles.noResults}><Text style={styles.noResultsText}>"{debouncedQuery}" için etiket bulunamadı</Text></View>
                  )}
                  {activeTab === 'tags' && tagResults.map(t => (
                    <TagResultRow key={t.tag} item={t} onPress={() => handleSignalPress(t.tag)} />
                  ))}
                </ScrollView>
              )}
            </>
          )}
        </View>
      ) : (
        <DreamUniverse onSignalPress={handleSignalPress} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, gap: 8,
  },
  searchBoxFocused: { borderColor: Colors.primary },
  searchInput:      { flex: 1, fontSize: 15, color: Colors.textPrimary, fontWeight: '500', padding: 0 },
  cancelBtn:        { paddingVertical: 6, paddingHorizontal: 4 },
  cancelBtnText:    { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  searchHint:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  searchHintText:   { fontSize: 14, color: Colors.textMuted },
  tabs:             { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: 16 },
  tab:              { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  tabActive:        { borderBottomColor: Colors.primary },
  tabText:          { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tabTextActive:    { color: Colors.primary },
  searchLoader:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noResults:        { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 },
  noResultsText:    { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
});

const srch = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  catDot:  { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  body:    { flex: 1, gap: 2 },
  title:   { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  sub:     { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  meta:    { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  tagIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryGlow, borderWidth: 1, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  tagHash: { fontSize: 18, fontWeight: '800', color: Colors.primary },
});
