/**
 * DreamCloud Universe Seed V2
 *
 * Extends V1 with: 42 global users · 170+ dreams · full AI analysis ·
 * GPS dream_places · 10 clusters · dream_identities · 200+ follows ·
 * dream_connections · DiceBear avatars.
 *
 * Prerequisite: npm run seed   (V1 must run first)
 * Command:      cd apps/api && npm run seed:v2
 * Idempotent:   ON CONFLICT DO NOTHING on every insert
 * Tag:          seed-demo-v2
 */

import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import AppDataSource from '../../config/database.config';

import { User }               from '../../modules/users/entities/user.entity';
import { UserProfile }        from '../../modules/users/entities/user-profile.entity';
import { UserFollow }         from '../../modules/users/entities/user-follow.entity';
import { Dream }              from '../../modules/dreams/entities/dream.entity';
import { DreamLike }          from '../../modules/dreams/entities/dream-like.entity';
import { DreamSave }          from '../../modules/dreams/entities/dream-save.entity';
import { DreamComment }       from '../../modules/comments/entities/dream-comment.entity';
import { Notification }       from '../../modules/notifications/entities/notification.entity';
import { DreamAnalysis }      from '../../modules/analysis/entities/dream-analysis.entity';
import { DreamTheme }         from '../../modules/analysis/entities/dream-theme.entity';
import { DreamEmotion }       from '../../modules/analysis/entities/dream-emotion.entity';
import { DreamSymbol }        from '../../modules/analysis/entities/dream-symbol.entity';
import { DreamFigure }        from '../../modules/analysis/entities/dream-figure.entity';
import { DreamLocation }      from '../../modules/analysis/entities/dream-location.entity';
import { DreamCluster }       from '../../modules/clusters/entities/dream-cluster.entity';
import { DreamClusterMember } from '../../modules/clusters/entities/dream-cluster-member.entity';
import { DreamPlace, DreamPlaceType } from '../../modules/places/entities/dream-place.entity';
import { DreamIdentity }      from '../../modules/identity/entities/dream-identity.entity';
import { DreamConnection }    from '../../modules/connections/entities/dream-connection.entity';

import {
  DreamCategory,
  DreamVisibility,
  NotificationType,
  AnalysisStatus,
} from '../../common/enums/database.enums';

// ─── Guard ───────────────────────────────────────────────────────────────────

if (process.env['NODE_ENV'] === 'production') {
  console.error('❌  Seed V2 disabled in production.');
  process.exit(1);
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEMO_PASSWORD = 'DemoUser99!';
const V2_TAG        = 'seed-demo-v2';
const V1_TAG        = 'seed-demo-v1';
const MODEL_VER     = 'seed-v2-mock';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const av = (seed: string) =>
  `https://api.dicebear.com/9.x/personas/png?seed=${encodeURIComponent(seed)}&size=256&backgroundColor=1a1a2e,0d1117,16213e`;

function hoursAgo(h: number): Date {
  const d = new Date();
  d.setTime(d.getTime() - h * 3_600_000);
  d.setMinutes(Math.floor(Math.random() * 60));
  d.setSeconds(Math.floor(Math.random() * 60));
  return d;
}
const daysAgo = (n: number) => hoursAgo(n * 24 + Math.floor(Math.random() * 5));

function pickN<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}

// ─── City Coordinates ────────────────────────────────────────────────────────

interface CityInfo { lat: number; lon: number; country: string; }

const CITIES: Record<string, CityInfo> = {
  Istanbul:      { lat: 41.0082,   lon: 28.9784,   country: 'Turkey'         },
  Ankara:        { lat: 39.9208,   lon: 32.8541,   country: 'Turkey'         },
  İzmir:         { lat: 38.4192,   lon: 27.1287,   country: 'Turkey'         },
  Bursa:         { lat: 40.1885,   lon: 29.0610,   country: 'Turkey'         },
  Antalya:       { lat: 36.8969,   lon: 30.7133,   country: 'Turkey'         },
  Berlin:        { lat: 52.5200,   lon: 13.4050,   country: 'Germany'        },
  Munich:        { lat: 48.1351,   lon: 11.5820,   country: 'Germany'        },
  Hamburg:       { lat: 53.5753,   lon: 10.0153,   country: 'Germany'        },
  'New York':    { lat: 40.7128,   lon: -74.0060,  country: 'United States'  },
  'Los Angeles': { lat: 34.0522,   lon: -118.2437, country: 'United States'  },
  Chicago:       { lat: 41.8781,   lon: -87.6298,  country: 'United States'  },
  Seattle:       { lat: 47.6062,   lon: -122.3321, country: 'United States'  },
  London:        { lat: 51.5074,   lon: -0.1278,   country: 'United Kingdom' },
  Edinburgh:     { lat: 55.9533,   lon: -3.1883,   country: 'United Kingdom' },
  Paris:         { lat: 48.8566,   lon: 2.3522,    country: 'France'         },
  Lyon:          { lat: 45.7640,   lon: 4.8357,    country: 'France'         },
  Tokyo:         { lat: 35.6762,   lon: 139.6503,  country: 'Japan'          },
  Osaka:         { lat: 34.6937,   lon: 135.5023,  country: 'Japan'          },
  Kyoto:         { lat: 35.0116,   lon: 135.7681,  country: 'Japan'          },
  'São Paulo':   { lat: -23.5505,  lon: -46.6333,  country: 'Brazil'         },
  'Rio de Janeiro': { lat: -22.9068, lon: -43.1729, country: 'Brazil'        },
  Mumbai:        { lat: 19.0760,   lon: 72.8777,   country: 'India'          },
  Bangalore:     { lat: 12.9716,   lon: 77.5946,   country: 'India'          },
  Madrid:        { lat: 40.4168,   lon: -3.7038,   country: 'Spain'          },
  Barcelona:     { lat: 41.3851,   lon: 2.1734,    country: 'Spain'          },
  Rome:          { lat: 41.9028,   lon: 12.4964,   country: 'Italy'          },
  Milan:         { lat: 45.4654,   lon: 9.1859,    country: 'Italy'          },
  Toronto:       { lat: 43.6532,   lon: -79.3832,  country: 'Canada'         },
  Vancouver:     { lat: 49.2827,   lon: -123.1207, country: 'Canada'         },
  Amsterdam:     { lat: 52.3676,   lon: 4.9041,    country: 'Netherlands'    },
  Rotterdam:     { lat: 51.9244,   lon: 4.4777,    country: 'Netherlands'    },
  'Mexico City': { lat: 19.4326,   lon: -99.1332,  country: 'Mexico'         },
  Guadalajara:   { lat: 20.6597,   lon: -103.3496, country: 'Mexico'         },
  Seoul:         { lat: 37.5665,   lon: 126.9780,  country: 'South Korea'    },
  Busan:         { lat: 35.1796,   lon: 129.0756,  country: 'South Korea'    },
  Cairo:         { lat: 30.0444,   lon: 31.2357,   country: 'Egypt'          },
  Marrakech:     { lat: 31.6295,   lon: -7.9811,   country: 'Morocco'        },
  Athens:        { lat: 37.9838,   lon: 23.7275,   country: 'Greece'         },
  Stockholm:     { lat: 59.3293,   lon: 18.0686,   country: 'Sweden'         },
  Sydney:        { lat: -33.8688,  lon: 151.2093,  country: 'Australia'      },
  Melbourne:     { lat: -37.8136,  lon: 144.9631,  country: 'Australia'      },
  Bali:          { lat: -8.3405,   lon: 115.0920,  country: 'Indonesia'      },
};

// ─── Recurring Symbol / Theme / Archetype pools ───────────────────────────────
// Used for analysis templates and dream_identity seeding.

const SYMBOLS = [
  'flood','flying','falling','mirror','labyrinth','old house','sea','forest',
  'unknown person','door','child','shadow','fire','bridge','train','city',
  'moon','animal','stairs','key',
];

const THEMES = [
  'transformation','escape','loss','nostalgia','fear','freedom','searching',
  'reunion','awakening','hidden truth','entrapment','journey','memory',
  'shadow','rebirth',
];

const ARCHETYPES = [
  'Observer','Explorer','Shadow','Child','Wise Elder','Stranger',
  'Guardian','Seeker','Wanderer','Mirror Self',
];

// ─── Analysis Templates ───────────────────────────────────────────────────────
// Each dream is assigned one template key. Sub-entities use analysis.id as dreamId.

interface AT {
  primaryTheme: string;
  primaryEmotion: string;
  intensity: 'low' | 'moderate' | 'high' | 'intense';
  arcFrom: string; arcTo: string;
  residual: string;
  themes: [string, string, boolean, number][]; // [theme, family, isPrimary, confidence]
  emotions: [string, string, boolean, boolean, string | null][]; // [emotion, intensity, isPrimary, isResidual, arcPosition]
  symbols: [string, string, string, boolean][]; // [symbolCategory, manifestation, narrativeFunction, isUniversal]
  figure?: [string, boolean, string | null, string | null, number | null, string[], string | null];
  location?: [number, string | null, string | null, string | null, string, boolean, string | null];
}

const ANALYSIS_TEMPLATES: Record<string, AT> = {
  water_deep: {
    primaryTheme: 'transformation', primaryEmotion: 'wonder',
    intensity: 'high', arcFrom: 'unease', arcTo: 'awe', residual: 'peace',
    themes: [['transformation','change',true,0.92],['journey','movement',false,0.74]],
    emotions: [['wonder','high',true,false,'peak'],['peace','low',false,true,'resolution']],
    symbols: [['flood','deep ocean water','transform',true],['abyss','the depths below','passive',true]],
    location: [2,null,'ocean','unconscious','awe',false,null],
  },
  sky_freedom: {
    primaryTheme: 'freedom', primaryEmotion: 'joy',
    intensity: 'intense', arcFrom: 'wonder', arcTo: 'ecstasy', residual: 'lightness',
    themes: [['freedom','liberation',true,0.95],['awakening','consciousness',false,0.68]],
    emotions: [['joy','intense',true,false,'peak'],['lightness','low',false,true,'resolution']],
    symbols: [['guide','wind beneath wings','approach',true],['transformation','the sky itself','passive',false]],
    location: [2,null,'sky','liminal','freedom',false,null],
  },
  shadow_chase: {
    primaryTheme: 'fear', primaryEmotion: 'dread',
    intensity: 'intense', arcFrom: 'dread', arcTo: 'panic', residual: 'unease',
    themes: [['fear','threat',true,0.91],['escape','movement',false,0.82],['entrapment','confinement',false,0.61]],
    emotions: [['dread','intense',true,false,'rising'],['panic','intense',false,false,'peak'],['unease','moderate',false,true,'resolution']],
    symbols: [['shadow','an unknown pursuer','flee',true],['labyrinth','narrow corridor','passive',true]],
    figure: ['unknown',false,null,'shadow',0.88,['threatening','dark','fast'],'pursuer'],
    location: [2,null,'corridor','descent','dread',true,null],
  },
  door_search: {
    primaryTheme: 'searching', primaryEmotion: 'curiosity',
    intensity: 'moderate', arcFrom: 'curiosity', arcTo: 'wonder', residual: 'longing',
    themes: [['searching','purpose',true,0.89],['hidden truth','revelation',false,0.71]],
    emotions: [['curiosity','moderate',true,false,'rising'],['longing','moderate',false,true,'resolution']],
    symbols: [['threshold','a heavy iron door','approach',true],['guide','the door itself','passive',false]],
    location: [2,null,'city','threshold','anticipation',false,null],
  },
  forest_journey: {
    primaryTheme: 'journey', primaryEmotion: 'wonder',
    intensity: 'moderate', arcFrom: 'uncertainty', arcTo: 'wonder', residual: 'peace',
    themes: [['journey','exploration',true,0.88],['transformation','change',false,0.65]],
    emotions: [['wonder','moderate',true,false,'peak'],['peace','low',false,true,'resolution']],
    symbols: [['guide','a white deer','approach',true],['transformation','sunlight through trees','passive',false]],
    figure: ['unknown',false,null,'guide',0.77,['luminous','silent','wise'],'guide'],
    location: [2,null,'dark_forest','unconscious','wonder',false,null],
  },
  mirror_identity: {
    primaryTheme: 'shadow', primaryEmotion: 'unease',
    intensity: 'high', arcFrom: 'curiosity', arcTo: 'unease', residual: 'insight',
    themes: [['shadow','self',true,0.93],['hidden truth','revelation',false,0.74]],
    emotions: [['unease','high',true,false,'peak'],['insight','moderate',false,true,'resolution']],
    symbols: [['shadow','broken mirror shards','passive',true],['transformation','the reflections','passive',false]],
    location: [3,'Mirror Room','corridor','liminal','unease',true,null],
  },
  childhood_memory: {
    primaryTheme: 'nostalgia', primaryEmotion: 'warmth',
    intensity: 'moderate', arcFrom: 'warmth', arcTo: 'bittersweet', residual: 'longing',
    themes: [['nostalgia','memory',true,0.94],['memory','past',false,0.82],['loss','absence',false,0.55]],
    emotions: [['warmth','moderate',true,false,'rising'],['bittersweet','moderate',false,false,'peak'],['longing','low',false,true,'resolution']],
    symbols: [['transformation','childhood home enlarged','passive',false],['guide','a parent\'s voice','receive',true]],
    figure: ['known_personal',true,'family',null,null,['warm','distant','younger'],'guide'],
    location: [1,'Childhood home','childhood_home','origin','warmth',false,null],
  },
  cosmic_awe: {
    primaryTheme: 'awakening', primaryEmotion: 'awe',
    intensity: 'intense', arcFrom: 'wonder', arcTo: 'dissolution', residual: 'serenity',
    themes: [['awakening','consciousness',true,0.90],['freedom','expansion',false,0.72],['rebirth','new self',false,0.60]],
    emotions: [['awe','intense',true,false,'peak'],['serenity','moderate',false,true,'resolution']],
    symbols: [['flood','starfield','passive',true],['guide','the cosmos itself','passive',false]],
    location: [3,'Outer space','sky','liminal','awe',false,null],
  },
  urban_lost: {
    primaryTheme: 'loss', primaryEmotion: 'disorientation',
    intensity: 'high', arcFrom: 'confusion', arcTo: 'despair', residual: 'unease',
    themes: [['loss','absence',true,0.87],['searching','purpose',false,0.76],['fear','threat',false,0.52]],
    emotions: [['disorientation','high',true,false,'rising'],['despair','high',false,false,'peak'],['unease','moderate',false,true,'resolution']],
    symbols: [['shadow','unfamiliar street signs','passive',true],['labyrinth','city maze','passive',false]],
    location: [2,null,'city','exposure','disorientation',false,null],
  },
  labyrinth_escape: {
    primaryTheme: 'entrapment', primaryEmotion: 'claustrophobia',
    intensity: 'high', arcFrom: 'claustrophobia', arcTo: 'panic', residual: 'exhaustion',
    themes: [['entrapment','confinement',true,0.91],['escape','movement',false,0.88]],
    emotions: [['claustrophobia','high',true,false,'rising'],['panic','intense',false,false,'peak'],['exhaustion','moderate',false,true,'resolution']],
    symbols: [['labyrinth','endless corridors','flee',true],['threshold','locked doors','passive',true]],
    location: [2,null,'underground','descent','claustrophobia',true,null],
  },
  fire_rebirth: {
    primaryTheme: 'rebirth', primaryEmotion: 'intensity',
    intensity: 'intense', arcFrom: 'fear', arcTo: 'liberation', residual: 'warmth',
    themes: [['rebirth','renewal',true,0.92],['transformation','change',false,0.85],['freedom','liberation',false,0.64]],
    emotions: [['intensity','intense',true,false,'rising'],['liberation','intense',false,false,'peak'],['warmth','moderate',false,true,'resolution']],
    symbols: [['transformation','fire that doesn\'t burn','transform',true],['guide','phoenix rising','passive',false]],
    location: [2,null,'city','threshold','intensity',true,null],
  },
  time_flow: {
    primaryTheme: 'memory', primaryEmotion: 'bittersweet',
    intensity: 'moderate', arcFrom: 'wonder', arcTo: 'melancholy', residual: 'longing',
    themes: [['memory','past',true,0.90],['nostalgia','time',false,0.79],['journey','movement',false,0.62]],
    emotions: [['bittersweet','moderate',true,false,'peak'],['longing','moderate',false,true,'resolution']],
    symbols: [['train','a night train to the past','approach',true],['transformation','shifting decades','passive',false]],
    location: [1,'Train station','city','liminal','bittersweet',false,null],
  },
  library_wisdom: {
    primaryTheme: 'awakening', primaryEmotion: 'curiosity',
    intensity: 'moderate', arcFrom: 'curiosity', arcTo: 'awe', residual: 'inspiration',
    themes: [['awakening','knowledge',true,0.85],['searching','truth',false,0.73],['hidden truth','revelation',false,0.68]],
    emotions: [['curiosity','moderate',true,false,'rising'],['awe','high',false,false,'peak'],['inspiration','moderate',false,true,'resolution']],
    symbols: [['labyrinth','infinite library','passive',true],['guide','a book that reads itself','receive',false]],
    location: [3,'Infinite Library','underground','liminal','wonder',false,null],
  },
  mountain_peak: {
    primaryTheme: 'freedom', primaryEmotion: 'clarity',
    intensity: 'high', arcFrom: 'exertion', arcTo: 'transcendence', residual: 'peace',
    themes: [['freedom','expansion',true,0.88],['awakening','perspective',false,0.71]],
    emotions: [['clarity','high',true,false,'peak'],['peace','moderate',false,true,'resolution']],
    symbols: [['guide','the summit','approach',false],['flood','clouds below','passive',true]],
    location: [1,'Mountain summit','sky','exposure','clarity',false,null],
  },
  ancient_sacred: {
    primaryTheme: 'journey', primaryEmotion: 'reverence',
    intensity: 'high', arcFrom: 'reverence', arcTo: 'awe', residual: 'serenity',
    themes: [['journey','pilgrimage',true,0.89],['awakening','sacred',false,0.76],['memory','ancient',false,0.65]],
    emotions: [['reverence','high',true,false,'rising'],['awe','intense',false,false,'peak'],['serenity','moderate',false,true,'resolution']],
    symbols: [['guide','ancient temple','receive',true],['transformation','sacred fire','passive',false]],
    location: [1,'Ancient temple','city','threshold','reverence',false,null],
  },
  reunion_tender: {
    primaryTheme: 'reunion', primaryEmotion: 'warmth',
    intensity: 'moderate', arcFrom: 'anticipation', arcTo: 'joy', residual: 'bittersweet',
    themes: [['reunion','connection',true,0.91],['nostalgia','past',false,0.78],['loss','absence',false,0.55]],
    emotions: [['warmth','moderate',true,false,'peak'],['bittersweet','moderate',false,true,'resolution']],
    symbols: [['guide','a familiar face','receive',true],['transformation','the meeting place','passive',false]],
    figure: ['known_personal',true,'family',null,null,['warm','older','radiant'],'companion'],
    location: [2,null,'childhood_home','origin','warmth',false,null],
  },
  void_contemplation: {
    primaryTheme: 'shadow', primaryEmotion: 'emptiness',
    intensity: 'moderate', arcFrom: 'emptiness', arcTo: 'acceptance', residual: 'calm',
    themes: [['shadow','void',true,0.84],['searching','meaning',false,0.70],['awakening','insight',false,0.58]],
    emotions: [['emptiness','moderate',true,false,'sustained'],['calm','low',false,true,'resolution']],
    symbols: [['abyss','an empty white space','passive',true],['shadow','absence of sound','passive',false]],
    location: [3,'The Void','sky','unconscious','emptiness',false,null],
  },
  lucid_control: {
    primaryTheme: 'awakening', primaryEmotion: 'clarity',
    intensity: 'intense', arcFrom: 'awareness', arcTo: 'mastery', residual: 'empowerment',
    themes: [['awakening','lucid control',true,0.96],['freedom','creation',false,0.88],['transformation','intention',false,0.75]],
    emotions: [['clarity','intense',true,false,'sustained'],['empowerment','intense',false,true,'resolution']],
    symbols: [['transformation','the dream shifting at will','transform',true],['guide','conscious awareness','passive',false]],
    location: [3,'Self-constructed space','sky','liminal','clarity',false,null],
  },
  ocean_surface: {
    primaryTheme: 'transformation', primaryEmotion: 'serenity',
    intensity: 'moderate', arcFrom: 'serenity', arcTo: 'wonder', residual: 'peace',
    themes: [['transformation','flow',true,0.86],['freedom','water',false,0.73]],
    emotions: [['serenity','moderate',true,false,'sustained'],['peace','low',false,true,'resolution']],
    symbols: [['flood','calm sea surface','passive',true],['guide','the horizon','passive',false]],
    location: [2,null,'ocean','unconscious','serenity',false,null],
  },
  collective_signal: {
    primaryTheme: 'awakening', primaryEmotion: 'connection',
    intensity: 'high', arcFrom: 'wonder', arcTo: 'unity', residual: 'warmth',
    themes: [['awakening','collective',true,0.90],['reunion','network',false,0.80],['hidden truth','shared',false,0.68]],
    emotions: [['connection','high',true,false,'peak'],['warmth','moderate',false,true,'resolution']],
    symbols: [['guide','threads of light between people','receive',true],['transformation','the signal tower','passive',false]],
    location: [3,'Signal network','sky','liminal','connection',false,null],
  },
};

// ─── User Definitions ─────────────────────────────────────────────────────────

interface UserSeedV2 {
  email: string; username: string; displayName: string;
  bio: string; city: string;
  archetype: string; isVeteran?: boolean;
}

// Existing 10 users: location patches only (no re-create)
const EXISTING_USER_CITIES: Record<string, string> = {
  'ahmet@dreamcloud.dev':  'Istanbul',
  'mehmet@dreamcloud.dev': 'Istanbul',
  'elif@dreamcloud.dev':   'Istanbul',
  'zeynep@dreamcloud.dev': 'Istanbul',
  'mert@dreamcloud.dev':   'Istanbul',
  'deniz@dreamcloud.dev':  'Istanbul',
  'selin@dreamcloud.dev':  'Istanbul',
  'ece@dreamcloud.dev':    'Istanbul',
  'can@dreamcloud.dev':    'Istanbul',
  'naz@dreamcloud.dev':    'Istanbul',
};

// 42 new global users (10 existing + 42 = 52 total)
const NEW_USERS: UserSeedV2[] = [
  // Turkey (4)
  { email:'ayse@dreamcloud.dev',    username:'ayse',         displayName:'Ayşe Kaya',         bio:'Her gece farklı bir evrende yaşıyorum.',              city:'Ankara',       archetype:'Explorer'   },
  { email:'burak@dreamcloud.dev',   username:'burak',        displayName:'Burak Şahin',        bio:'Bilinçaltı haritacısı. Her sembol bir ipucu.',        city:'İzmir',        archetype:'Observer'   },
  { email:'fatma@dreamcloud.dev',   username:'fatma',        displayName:'Fatma Yıldız',       bio:'Tekrarlayan rüyalarım beni buraya getirdi.',          city:'Bursa',        archetype:'Seeker'     },
  { email:'emre@dreamcloud.dev',    username:'emre',         displayName:'Emre Arslan',        bio:'Rüyalar çözülmeyi bekleyen şiirler.',                 city:'Antalya',      archetype:'Wanderer'   },
  // Germany (3)
  { email:'lena@dreamcloud.dev',    username:'lena_berlin',  displayName:'Lena Müller',        bio:'Jungian dream explorer. Mapping the collective unconscious one dream at a time.', city:'Berlin', archetype:'Wise Elder', isVeteran:true },
  { email:'felix@dreamcloud.dev',   username:'felix_dreams', displayName:'Felix Wagner',       bio:'Software engineer by day, lucid dreamer by night.',   city:'Munich',       archetype:'Explorer'   },
  { email:'hannah@dreamcloud.dev',  username:'hannah_h',     displayName:'Hannah Schmidt',     bio:'Artist and dreamer. My paintings come from my dreams.',city:'Hamburg',      archetype:'Guardian'   },
  // USA (4)
  { email:'james@dreamcloud.dev',   username:'james_dreamer',displayName:'James Chen',         bio:'New York nights, everywhere dreams.',                 city:'New York',     archetype:'Wanderer'   },
  { email:'sarah@dreamcloud.dev',   username:'sarah_lucid',  displayName:'Sarah Mitchell',     bio:'Lucid dreaming practitioner for 8 years.',            city:'Los Angeles',  archetype:'Explorer',  isVeteran:true },
  { email:'michael@dreamcloud.dev', username:'michael_k',    displayName:'Michael Kowalski',   bio:'Psychiatrist fascinated by the dreaming mind.',       city:'Chicago',      archetype:'Wise Elder' },
  { email:'emma@dreamcloud.dev',    username:'emma_dreams',  displayName:'Emma Davis',         bio:'Recurring dreams led me here. Searching for the door.',city:'Seattle',     archetype:'Seeker'     },
  // UK (3)
  { email:'oliver@dreamcloud.dev',  username:'oliver_w',     displayName:'Oliver Williams',    bio:'London writer. My best stories come from my dreams.', city:'London',       archetype:'Wanderer'   },
  { email:'charlotte@dreamcloud.dev',username:'char_dreams', displayName:'Charlotte Green',    bio:'Dreams are the language of the soul.',                city:'London',       archetype:'Seeker'     },
  { email:'william@dreamcloud.dev', username:'will_edinburgh',displayName:'William MacLeod',   bio:'Philosopher. Dreams are where consciousness is honest.',city:'Edinburgh',   archetype:'Observer'   },
  // France (2)
  { email:'camille@dreamcloud.dev', username:'camille_paris',displayName:'Camille Dubois',     bio:'Artiste et rêveuse. Je peins ce que je rêve.',        city:'Paris',        archetype:'Guardian'   },
  { email:'pierre@dreamcloud.dev',  username:'pierre_lyon',  displayName:'Pierre Martin',      bio:'Every night I choose my own adventure.',              city:'Lyon',         archetype:'Explorer'   },
  // Japan (3)
  { email:'yuki@dreamcloud.dev',    username:'yuki_dreams',  displayName:'Yuki Tanaka',        bio:'夢は魂の言語。Dreams are the language of the soul.',  city:'Tokyo',        archetype:'Observer',  isVeteran:true },
  { email:'kenji@dreamcloud.dev',   username:'kenji_k',      displayName:'Kenji Nakamura',     bio:'Game designer. My best levels come from nightmares.', city:'Osaka',        archetype:'Shadow'     },
  { email:'sakura@dreamcloud.dev',  username:'sakura_s',     displayName:'Sakura Yamamoto',    bio:'Collector of night visions since childhood.',         city:'Kyoto',        archetype:'Child'      },
  // Brazil (2)
  { email:'maria@dreamcloud.dev',   username:'maria_sp',     displayName:'Maria Silva',        bio:'Exploradora do inconsciente. Os sonhos são a porta.', city:'São Paulo',    archetype:'Explorer'   },
  { email:'lucas@dreamcloud.dev',   username:'lucas_rio',    displayName:'Lucas Oliveira',     bio:'Musician from Rio. My dreams compose melodies.',      city:'Rio de Janeiro',archetype:'Guardian'   },
  // India (2)
  { email:'priya@dreamcloud.dev',   username:'priya_dreams', displayName:'Priya Sharma',       bio:'Yoga teacher and dream keeper. Vedic tradition runs deep.', city:'Mumbai', archetype:'Wise Elder', isVeteran:true },
  { email:'arjun@dreamcloud.dev',   username:'arjun_b',      displayName:'Arjun Patel',        bio:'Sometimes I wonder which world is more real.',        city:'Bangalore',    archetype:'Seeker'     },
  // Spain (2)
  { email:'sofia@dreamcloud.dev',   username:'sofia_madrid', displayName:'Sofía García',       bio:'Los sueños son el espejo del alma.',                  city:'Madrid',       archetype:'Mirror Self'},
  { email:'carlos@dreamcloud.dev',  username:'carlos_b',     displayName:'Carlos Rodríguez',   bio:'Architect by day, dream architect by night.',         city:'Barcelona',    archetype:'Guardian'   },
  // Italy (2)
  { email:'giulia@dreamcloud.dev',  username:'giulia_rome',  displayName:'Giulia Rossi',       bio:'Psicologa appassionata del mondo onirico.',           city:'Rome',         archetype:'Wise Elder' },
  { email:'marco@dreamcloud.dev',   username:'marco_milan',  displayName:'Marco Bianchi',      bio:'Fashion designer from Milan. Collections born in dreams.',city:'Milan',     archetype:'Child'      },
  // Canada (2)
  { email:'emily@dreamcloud.dev',   username:'emily_toronto',displayName:'Emily Thompson',     bio:'Neuroscience researcher studying sleep and dreaming.', city:'Toronto',      archetype:'Observer'   },
  { email:'ryan@dreamcloud.dev',    username:'ryan_van',     displayName:'Ryan Park',          bio:'Mountaineer from Vancouver. Both require going beyond limits.',city:'Vancouver', archetype:'Wanderer'},
  // Netherlands (2)
  { email:'anna@dreamcloud.dev',    username:'anna_amsterdam',displayName:'Anna de Vries',     bio:'Cycling through Amsterdam by day, dreamscapes by night.',city:'Amsterdam',  archetype:'Explorer'   },
  { email:'jan@dreamcloud.dev',     username:'jan_r',        displayName:'Jan Bakker',         bio:'Best solutions found in the space between sleep and waking.',city:'Rotterdam',archetype:'Seeker'  },
  // Mexico (2)
  { email:'valentina@dreamcloud.dev',username:'vale_mx',     displayName:'Valentina López',    bio:'Los sueños son el puente entre este mundo y el otro.', city:'Mexico City',  archetype:'Wanderer'   },
  { email:'diego@dreamcloud.dev',   username:'diego_gdl',    displayName:'Diego Hernández',    bio:'Photographer. Some images only exist when eyes are closed.',city:'Guadalajara',archetype:'Shadow'  },
  // South Korea (2)
  { email:'jiyeon@dreamcloud.dev',  username:'jiyeon_s',     displayName:'Jiyeon Park',        bio:'꿈은 또 다른 현실입니다. Dreams are another reality.',  city:'Seoul',        archetype:'Mirror Self'},
  { email:'minho@dreamcloud.dev',   username:'minho_busan',  displayName:'Minho Kim',          bio:'Marine biologist. The ocean and unconscious share the same depth.',city:'Busan',archetype:'Explorer'},
  // Egypt (1)
  { email:'layla@dreamcloud.dev',   username:'layla_cairo',  displayName:'Layla Hassan',       bio:'Ancient Egypt believed dreams were messages from the gods.',city:'Cairo',   archetype:'Wise Elder' },
  // Morocco (1)
  { email:'amara@dreamcloud.dev',   username:'amara_m',      displayName:'Amara Benali',       bio:'From Marrakech, where dream and reality were always thin.',city:'Marrakech', archetype:'Guardian'  },
  // Greece (1)
  { email:'elena@dreamcloud.dev',   username:'elena_athens', displayName:'Elena Papadopoulos', bio:'Greek mythology is just remembered dreams.',           city:'Athens',       archetype:'Child'      },
  // Sweden (1)
  { email:'astrid@dreamcloud.dev',  username:'astrid_sthlm', displayName:'Astrid Lindqvist',   bio:'Stockholm winters are made for long, deep dreams.',    city:'Stockholm',    archetype:'Observer'   },
  // Australia (2)
  { email:'noah@dreamcloud.dev',    username:'noah_sydney',  displayName:'Noah Wilson',        bio:'Surfer from Sydney. Both surf and dreams require reading waves.',city:'Sydney', archetype:'Wanderer'},
  { email:'isabelle@dreamcloud.dev',username:'isabelle_melb',displayName:'Isabelle Brown',     bio:'Therapist from Melbourne. Dreams are stories in the dark.',city:'Melbourne', archetype:'Wise Elder'},
  // Indonesia (1)
  { email:'made@dreamcloud.dev',    username:'made_bali',    displayName:'Made Wijaya',        bio:'From Bali, where every temple bridges waking and dreaming.',city:'Bali',     archetype:'Guardian'   },
];

// ─── Dream Seeds ─────────────────────────────────────────────────────────────

interface DreamSeedV2 {
  userEmail: string;
  title: string; content: string;
  category: DreamCategory; visibility: DreamVisibility;
  tags: string[]; hoursAgo: number; atKey: string;
}

const L = DreamVisibility.PUBLIC;
const F = DreamVisibility.FOLLOWERS;
const LU = DreamCategory.LUCID;
const BE = DreamCategory.BEAUTIFUL;
const NI = DreamCategory.NIGHTMARE;
const NO = DreamCategory.NORMAL;

const DREAM_SEEDS: DreamSeedV2[] = [

  // ── ahmet — 10 new dreams (veteran, Istanbul) ───────────────────────────
  { userEmail:'ahmet@dreamcloud.dev', title:'Kırık Ayna',
    content:'Camdan bir odada duruyordum, her parça benim farklı bir versiyonumu gösteriyordu. Bir parçada mimar olmuştum, başka bir parçada kaybolmuş bir gezgin. Aynayı birleştirmeye çalıştım ama parçalar her birleştiğinde yeni bir yüz ortaya çıkıyordu. Uyandığımda hangisinin gerçek ben olduğunu hâlâ bilmiyordum.',
    category:LU, visibility:L, tags:['ayna','kimlik','lucid'], hoursAgo:4, atKey:'mirror_identity' },

  { userEmail:'ahmet@dreamcloud.dev', title:'Demir Kapı',
    content:'Boş bir düzlükte devasa bir demir kapı duruyordu. Etrafında hiçbir şey yoktu — ne duvar ne çit ne de yapı. Kapının öte yönünde bir şeyin beklediğini hissediyordum ama tutamacı çeviremiyordum. Kapı soğuktu, metaldi ve neden burada olduğumu bilmiyordum. Döndüğümde düzlük de yok olmuştu.',
    category:NO, visibility:L, tags:['kapı','bekleyiş','sembol'], hoursAgo:72, atKey:'door_search' },

  { userEmail:'ahmet@dreamcloud.dev', title:'Atalarım',
    content:'İstanbul\'un eski çarşılarında yürüyordum ve yüzleri tanıdık ama hiç görmediğim insanlar vardı etrafımda. Büyükbabamın büyükbabasıydı biri, ama bunu nasıl bildiğimi açıklayamam. Konuştuk, gülüştük. Onlar ölü olduklarını bilmiyorlardı ya da umursamıyorlardı. Çarşıdan çıkarken elimde bir nesne vardı, ama ne olduğunu hatırlamıyorum.',
    category:BE, visibility:L, tags:['aile','İstanbul','atalar','tarih'], hoursAgo:168, atKey:'reunion_tender' },

  { userEmail:'ahmet@dreamcloud.dev', title:'Karanlık Orman',
    content:'Yön değiştiren bir ormanda kayboldum. Her döndüğümde ağaçlar yeniden diziliyordu. Bir kurt beni yönlendiriyordu ama onu takip etmeli miyim bilmiyordum. Koşmak istedim ama bacaklarım yerden kesilmiyordu. Kurt durdu, döndü, gözlerinde kendi yansımamı gördüm.',
    category:NI, visibility:L, tags:['orman','kurt','kabus','gölge'], hoursAgo:336, atKey:'shadow_chase' },

  { userEmail:'ahmet@dreamcloud.dev', title:'Sualtı Kütüphanesi',
    content:'Dev bir kütüphane suyun altındaydı, ama ıslanmıyordum. Kitaplar sayfalarını okuyucusuz açıp kapıyordu. Bir tanesi bana döndü ve içinde sadece sorular vardı, hiç cevap yok. Raflar okyanus tabanına kadar uzanıyordu. Kitapların sesini duyabiliyordum — fısıltı gibi, ama kelimeler dil değildi.',
    category:BE, visibility:L, tags:['kütüphane','sualtı','kitap'], hoursAgo:504, atKey:'library_wisdom' },

  { userEmail:'ahmet@dreamcloud.dev', title:'Zaman Döngüsü',
    content:'Aynı beş dakikayı yaşıyordum ama her seferinde bir şey farklıydı. Birinde pencerede kar vardı, birinde güneş, birinde gece. Fark ettiğimi anladım ve döngüyü kırmak için bir şeyi değiştirmeye çalıştım. Sonunda döngü durdu — ama durduğu an hangisiydi hatırlamıyorum.',
    category:LU, visibility:L, tags:['zaman','döngü','lucid'], hoursAgo:120, atKey:'lucid_control' },

  { userEmail:'ahmet@dreamcloud.dev', title:'Büyükbabamın Sesi',
    content:'Büyükbabam sekiz yıl önce vefat etti. Bu gece sesini duydum — ama görmedim. Bilmediğim bir dilde konuşuyordu, ama anlıyordum. Bana bir şeyler söylüyordu, önemli şeyler. Uyandığımda içerik gitmişti, sadece sesin tonu ve hissi kalmıştı. Huzur gibiydi.',
    category:NO, visibility:F, tags:['büyükbaba','ses','aile'], hoursAgo:720, atKey:'reunion_tender' },

  { userEmail:'ahmet@dreamcloud.dev', title:'Yangın İçinde Şehir',
    content:'İstanbul yanıyordu ama kimse paniklemiyordu. İnsanlar alışveriş yapıyor, çay içiyor, oturuyordu. Ben de ateşin arasından yürüyordum ve yanmıyordum. Boğaz kırmızıydı, köprüler yanıyordu ama ayaktaydı. Sabah oldu ve yangın yavaşça silindi. Şehir aynıydı.',
    category:NI, visibility:L, tags:['yangın','İstanbul','kabus','şehir'], hoursAgo:6, atKey:'fire_rebirth' },

  { userEmail:'ahmet@dreamcloud.dev', title:'Yeniden Doğuş',
    content:'Öldüm. Rüyada. Düştüm ve her şey karardı. Sonra yavaşça bir ışık — benim ışığım değil, başka bir benin ışığı. Yeni bir gözle açıldım ve her şeyi ilk kez görür gibi gördüm. Eller benim ellerimdi ama onları tanımak biraz zaman aldı. Uyandığımda ağlıyordum, ama keder değildi bu.',
    category:LU, visibility:L, tags:['yeniden doğuş','ölüm','dönüşüm','lucid'], hoursAgo:1440, atKey:'fire_rebirth' },

  { userEmail:'ahmet@dreamcloud.dev', title:'Gece Treni',
    content:'Bir tren gecenin içinden geçiyordu, duraklar farklı on yıllardan geliyordu. Bir durak 1970\'ler İstanbul\'u, bir sonraki hiç var olmamış bir şehirdi. Komşu koltuktaki adam her duraklarken başka biri oluyordu. Ben değişmiyordum. Tren durmadı — ama ben biliyordum: durmayacak.',
    category:BE, visibility:L, tags:['tren','zaman','yolculuk','gece'], hoursAgo:1080, atKey:'time_flow' },

  // ── lena_berlin — 12 dreams (veteran, Berlin) ───────────────────────────
  { userEmail:'lena@dreamcloud.dev', title:'The Archive of Emotions',
    content:'An infinite archive, but not organized by subject — organized by emotion. Grief on the third floor, wonder on the seventh. I was looking for a specific memory and found it filed under "bittersweet, afternoon, age 9." It was not my memory. Or maybe it was.',
    category:BE, visibility:L, tags:['archive','memory','jungian'], hoursAgo:2, atKey:'library_wisdom' },

  { userEmail:'lena@dreamcloud.dev', title:'The Red Figure',
    content:'It appears in my dreams every few weeks now. A red-cloaked figure, never speaking, always pointing somewhere I haven\'t been. Last night it pointed into a door in the water. I followed. The door opened onto another dream I had had in 2019. How does it know?',
    category:NO, visibility:L, tags:['figure','recurring','red','guide'], hoursAgo:48, atKey:'forest_journey' },

  { userEmail:'lena@dreamcloud.dev', title:'Glass Labyrinth',
    content:'Every wall was transparent — I could see all the other paths, all the other choices. But I could only walk one. The horror was not being lost. The horror was seeing exactly where every other path led, in perfect detail, and choosing anyway.',
    category:NI, visibility:L, tags:['labyrinth','glass','choice','nightmare'], hoursAgo:120, atKey:'labyrinth_escape' },

  { userEmail:'lena@dreamcloud.dev', title:'The Underground River',
    content:'I followed a river that flowed underground. It got darker, then suddenly luminous — bioluminescent somehow. The river knew where it was going even when I didn\'t. At the end it emptied into a sea that had no name. I sat on its shore until I woke up.',
    category:BE, visibility:L, tags:['river','underground','journey'], hoursAgo:192, atKey:'water_deep' },

  { userEmail:'lena@dreamcloud.dev', title:'White City',
    content:'A city in permanent, silent snowfall. No footprints — no one had walked here before, or the snow covered everything instantly. Sounds were muffled to nothing. I walked through and left no prints either. A city built for looking at, not living in.',
    category:NO, visibility:L, tags:['city','snow','silence','liminal'], hoursAgo:288, atKey:'void_contemplation' },

  { userEmail:'lena@dreamcloud.dev', title:'Meeting My Shadow',
    content:'Jung described this. Meeting it is different. My shadow looked like me but angrier, freer, louder. We had to negotiate. It wanted things I had denied for years. We didn\'t agree on everything. We agreed on more than I expected. I woke feeling both exposed and lighter.',
    category:LU, visibility:L, tags:['shadow','jung','confrontation','lucid'], hoursAgo:384, atKey:'mirror_identity' },

  { userEmail:'lena@dreamcloud.dev', title:'The Disappearing Bridge',
    content:'Each step I took forward, the bridge behind me dissolved. Return was impossible from the first step. The bridge ahead was always there, just. I kept walking. The destination — when I arrived — was identical to the starting point. The journey had changed me. The place hadn\'t.',
    category:NI, visibility:L, tags:['bridge','journey','no return'], hoursAgo:480, atKey:'forest_journey' },

  { userEmail:'lena@dreamcloud.dev', title:'The Mirror Room',
    content:'Every mirror in a room showed a different emotional state of me. Angry me in one corner, grieving me in another, young me laughing near the door. They didn\'t react to each other. When I stood in the center, all of them looked directly at me at once.',
    category:LU, visibility:L, tags:['mirror','emotion','self','lucid'], hoursAgo:600, atKey:'mirror_identity' },

  { userEmail:'lena@dreamcloud.dev', title:'The Golden Thread',
    content:'I followed a golden thread through absolute darkness. What it was made of kept changing — silk, then light, then water, then time. When I reached the end, the thread was attached to nothing. Or rather, attached to me. I had been holding both ends the whole time.',
    category:BE, visibility:L, tags:['thread','guide','darkness','symbol'], hoursAgo:840, atKey:'forest_journey' },

  { userEmail:'lena@dreamcloud.dev', title:'Library at the Edge',
    content:'A library at the literal edge of the world — past it, nothing. The books here hadn\'t been written yet. When I opened one, the pages filled in as I read them, responding to what I needed to know. I tried to bring one back. It dissolved at the threshold. That\'s probably the point.',
    category:BE, visibility:L, tags:['library','edge','unwritten'], hoursAgo:1200, atKey:'library_wisdom' },

  { userEmail:'lena@dreamcloud.dev', title:'Children in the Garden',
    content:'Children playing in a garden, utterly absorbed, utterly happy. I knew somehow they were all dead — not recently, but long ago. They didn\'t know it, or it didn\'t matter to them. I watched for what felt like hours. When I tried to join them, they smiled and made room.',
    category:NO, visibility:F, tags:['children','garden','death','peace'], hoursAgo:1560, atKey:'reunion_tender' },

  { userEmail:'lena@dreamcloud.dev', title:'The Final Door',
    content:'After years of searching in dreams — for what, I couldn\'t say — I found it. The final door. I opened it. Behind it was another door. I laughed. I had been laughing at the wrong thing all along. The search was never about arriving.',
    category:LU, visibility:L, tags:['door','search','lucid','revelation'], hoursAgo:1920, atKey:'door_search' },

  // ── sarah_lucid — 12 dreams (veteran, Los Angeles) ──────────────────────
  { userEmail:'sarah@dreamcloud.dev', title:'Pacific Overflight',
    content:'Flying over the Pacific at dusk, watching gold dissolve into violet dissolve into black. Below me, whales moving in slow formation. I could feel their frequency through the air. The horizon was a perfect line between everything that exists and everything that doesn\'t. I did not want to land.',
    category:LU, visibility:L, tags:['flying','pacific','lucid','ocean'], hoursAgo:1, atKey:'sky_freedom' },

  { userEmail:'sarah@dreamcloud.dev', title:'Building the City',
    content:'Lucid from the first moment. I built a city from nothing — laid the streets first, then the light, then the people. When I gave the people their histories they began to dream themselves. A city that dreamed. I woke before I found out what they dreamed about.',
    category:LU, visibility:L, tags:['lucid','creation','city','architecture'], hoursAgo:96, atKey:'lucid_control' },

  { userEmail:'sarah@dreamcloud.dev', title:'Crystal Cave',
    content:'Each crystal held a memory — not mine, random human memories. A woman\'s first morning in a new country. A boy\'s last day with his dog. A surgeon\'s hands at 3am. I moved through the cave gently, careful not to touch, afraid I might change them.',
    category:BE, visibility:L, tags:['crystal','memory','cave','collective'], hoursAgo:168, atKey:'collective_signal' },

  { userEmail:'sarah@dreamcloud.dev', title:'Meeting the Architect',
    content:'He claimed to have designed the dream world. He was not a person exactly — more the idea of a person, wearing the shape. He showed me blueprints that changed as I looked at them. "You\'ve been editing my work," he said, not accusing. He seemed pleased.',
    category:LU, visibility:L, tags:['lucid','architect','design','meta'], hoursAgo:240, atKey:'lucid_control' },

  { userEmail:'sarah@dreamcloud.dev', title:'Time Collapse',
    content:'Every dream I\'d ever had was happening simultaneously, visible from where I stood at the center. My dream at age six. Last Tuesday\'s. One I haven\'t had yet. I was the only fixed point. The skill was not getting pulled into any single one.',
    category:LU, visibility:L, tags:['time','lucid','collapse','all dreams'], hoursAgo:360, atKey:'cosmic_awe' },

  { userEmail:'sarah@dreamcloud.dev', title:'Consciousness Mirror',
    content:'A mirror that didn\'t show my face — it showed my consciousness directly. The texture of my attention. Knots where I was contracted. Open space where I\'d let go. It was the most honest thing I\'d ever seen. I stood there for the rest of the dream, watching myself think.',
    category:LU, visibility:L, tags:['mirror','consciousness','lucid','awareness'], hoursAgo:456, atKey:'mirror_identity' },

  { userEmail:'sarah@dreamcloud.dev', title:'Ocean Mandala',
    content:'From above, the ocean arranged itself into a perfect mandala — hundreds of miles across. The waves were the pattern. I was hovering close enough to watch each wave\'s contribution. When I inhaled, the mandala contracted. When I exhaled, it expanded. The ocean was breathing with me.',
    category:BE, visibility:L, tags:['ocean','mandala','breathe','pattern'], hoursAgo:552, atKey:'ocean_surface' },

  { userEmail:'sarah@dreamcloud.dev', title:'The Dream Within',
    content:'So deep in the dream I forgot I had entered it. When I realized — the way you suddenly realize you\'ve been reading the same page for ten minutes — there were four layers between me and waking. I climbed them one by one, gently, the way you surface from water.',
    category:LU, visibility:L, tags:['nested','lucid','layers','depth'], hoursAgo:672, atKey:'lucid_control' },

  { userEmail:'sarah@dreamcloud.dev', title:'Lucid Desert',
    content:'I was creating the desert as I walked through it. Sand grain by grain ahead of me. If I stopped thinking, the desert stopped extending. I had to actively imagine the horizon. This is what creation must feel like — responsibility in every direction, infinite and exhausting and beautiful.',
    category:LU, visibility:L, tags:['desert','lucid','creation','responsibility'], hoursAgo:912, atKey:'lucid_control' },

  { userEmail:'sarah@dreamcloud.dev', title:'The Signal Tower',
    content:'A tower that emitted a frequency connecting dreamers around the world. Standing near it I could feel others sleeping — in Tokyo, in Istanbul, in São Paulo. They were all dreaming simultaneously, their signals crossing. I put my hand on the tower and felt them all at once.',
    category:BE, visibility:L, tags:['signal','collective','connection','tower'], hoursAgo:1200, atKey:'collective_signal' },

  { userEmail:'sarah@dreamcloud.dev', title:'Starfield Navigation',
    content:'No instruments — I navigated between stars using emotional resonance as compass. Grief pulled left. Joy pulled upward. Curiosity was forward. I had never known directions could feel like this. When I found the constellation I was looking for, I understood it was a map of a conversation I needed to have.',
    category:LU, visibility:L, tags:['stars','navigation','emotion','lucid'], hoursAgo:1560, atKey:'cosmic_awe' },

  { userEmail:'sarah@dreamcloud.dev', title:'The Edge of Sleep',
    content:'Standing at the exact boundary between sleep and waking, looking both ways. On one side: the logic of daylight and cause and effect. On the other: anything. I stood there long enough to memorize both views. When I finally chose, I couldn\'t tell you which direction I stepped.',
    category:NO, visibility:L, tags:['threshold','sleep','waking','liminal'], hoursAgo:2040, atKey:'door_search' },

  // ── yuki_dreams — 10 dreams (veteran, Tokyo) ────────────────────────────
  { userEmail:'yuki@dreamcloud.dev', title:'Sakura and Ash',
    content:'Cherry blossoms fell, but before they reached the ground they became ash. Not burned — just changed. The tree kept producing flowers and the ground below it never accumulated either petals or ash. The cycle was continuous and pointless and perfect. I sat under it until I understood I was the tree.',
    category:BE, visibility:L, tags:['sakura','ash','cycle','japan'], hoursAgo:3, atKey:'fire_rebirth' },

  { userEmail:'yuki@dreamcloud.dev', title:'The Mountain Spirit',
    content:'Climbed Fuji in the dream and met a presence at the summit. Not a figure — a quality of attention. It asked me something in a language I didn\'t know but understood: "What are you carrying that isn\'t yours?" I had to think about that for a long time. The answer surprised me.',
    category:NO, visibility:L, tags:['mountain','spirit','fuji','question'], hoursAgo:72, atKey:'mountain_peak' },

  { userEmail:'yuki@dreamcloud.dev', title:'Edo and Neon',
    content:'Edo-period Tokyo and modern Tokyo coexisted, layered. I could walk through both simultaneously — paper lanterns next to LED signs, kimono next to streetwear. No one else seemed confused. I tried to photograph it on a smartphone that turned into a calligraphy brush when I raised it.',
    category:LU, visibility:L, tags:['tokyo','edo','history','lucid','japan'], hoursAgo:144, atKey:'time_flow' },

  { userEmail:'yuki@dreamcloud.dev', title:'Sea of Clouds',
    content:'Walked on a sea of clouds that led to an island of silence. The clouds were solid, slightly yielding, like new snow. On the island there was only wind — no trees, no buildings, just clean wind. I stayed until the island began slowly submerging back into the clouds.',
    category:BE, visibility:L, tags:['clouds','silence','island','sky'], hoursAgo:240, atKey:'sky_freedom' },

  { userEmail:'yuki@dreamcloud.dev', title:'Digital Temple',
    content:'A temple where the statues were made of flowing data — code that took sacred shape. Prayers were algorithms. Incense was processing power, visible as heat shimmer. I made an offering of source code I had written years ago. The temple accepted it and the statue it built was me.',
    category:NO, visibility:L, tags:['temple','digital','code','japan','sacred'], hoursAgo:336, atKey:'ancient_sacred' },

  { userEmail:'yuki@dreamcloud.dev', title:'The Waiting Platform',
    content:'A train platform between life and death — no one in a hurry, no one afraid. Everyone was calm, everyone was waiting. A woman next to me was knitting something with no beginning or end. "The train always comes," she said, "but not always in the direction you expect."',
    category:NO, visibility:L, tags:['train','death','waiting','calm'], hoursAgo:480, atKey:'time_flow' },

  { userEmail:'yuki@dreamcloud.dev', title:'Monsoon Memory',
    content:'Rain that brought specific memories with each drop — not mine. Someone\'s first time reading. Someone\'s last look at a person they loved. The memories dissolved when they hit the ground. I tried to catch them but cupped hands can\'t hold rain-memories.',
    category:BE, visibility:L, tags:['monsoon','memory','rain','collective'], hoursAgo:720, atKey:'childhood_memory' },

  { userEmail:'yuki@dreamcloud.dev', title:'The Fox Wedding',
    content:'Attended a fox wedding in the forest, invited by name though I hadn\'t given it. Honored guest. The foxes wore formal dress and were entirely serious. When asked to give a toast, I spoke in a language I\'d never learned. The foxes applauded. I still don\'t know what I said.',
    category:LU, visibility:L, tags:['fox','wedding','forest','japan','trickster'], hoursAgo:1008, atKey:'forest_journey' },

  { userEmail:'yuki@dreamcloud.dev', title:'Ink and Paper',
    content:'I fell into a calligraphy scroll and became part of the writing. I was a brushstroke — specific, intentional, part of a larger character I couldn\'t read from the inside. Another brushstroke appeared next to me. We were two strokes of the same kanji for "together."',
    category:BE, visibility:L, tags:['calligraphy','ink','kanji','japan','symbol'], hoursAgo:1320, atKey:'mirror_identity' },

  { userEmail:'yuki@dreamcloud.dev', title:'Origami Universe',
    content:'The universe folded itself into origami shapes. Galaxies became cranes. Stars became precise geometric corners. The folding was deliberate, patient, mathematical. When it was complete it was the size of my palm. I held it carefully. Then it began unfolding.',
    category:BE, visibility:L, tags:['origami','universe','japan','cosmic'], hoursAgo:1800, atKey:'cosmic_awe' },

  // ── priya_dreams — 10 dreams (veteran, Mumbai) ──────────────────────────
  { userEmail:'priya@dreamcloud.dev', title:'The Lotus in Darkness',
    content:'A single lotus rising from dark, still water — and as it opened, it illuminated the entire space. Not like a lamp. More like understanding. The light came from the flower recognizing itself. I sat with it for the whole dream and absorbed its particular silence.',
    category:BE, visibility:L, tags:['lotus','india','light','sacred'], hoursAgo:5, atKey:'ancient_sacred' },

  { userEmail:'priya@dreamcloud.dev', title:'River Without Shore',
    content:'Crossing the Ganges, but the river kept redirecting — upstream, then sideways, then in circles. The other shore kept moving. I stopped fighting the current and floated. The river slowed. I arrived not at the other shore but at the exact center of the water.',
    category:NO, visibility:L, tags:['river','india','ganga','surrender'], hoursAgo:48, atKey:'water_deep' },

  { userEmail:'priya@dreamcloud.dev', title:'The Cosmic Dance',
    content:'Shiva danced the universe into existence at the edge of my dream. I watched from close enough to feel the rhythm change the air around me. Each step was a galaxy being born. When the dance ended, everything was silent for exactly one moment — then began again.',
    category:BE, visibility:L, tags:['shiva','dance','cosmos','india','sacred'], hoursAgo:144, atKey:'cosmic_awe' },

  { userEmail:'priya@dreamcloud.dev', title:'Mandala of All Dreams',
    content:'My entire dreamlife arranged as a mandala — perfectly symmetrical, every dream I\'d ever had in its precise position. I could see the patterns that had eluded me over years. What I thought were random was a spiral. What I thought were separate were one long continuous dream.',
    category:LU, visibility:L, tags:['mandala','lucid','pattern','life'], hoursAgo:264, atKey:'lucid_control' },

  { userEmail:'priya@dreamcloud.dev', title:'The Wordless Teacher',
    content:'Met a guru in a garden who taught without speaking. Lessons arrived as weather — a shift in temperature, a quality of light, a sound from somewhere else. I understood everything and could not write any of it down. That\'s the point, I understood on waking.',
    category:NO, visibility:L, tags:['guru','teaching','india','silence'], hoursAgo:432, atKey:'void_contemplation' },

  { userEmail:'priya@dreamcloud.dev', title:'Monsoon Library',
    content:'A library where the books read themselves in the sound of rain. Each book was a different monsoon — some fierce, some gentle. When you listened carefully, the rain was words. A scholar told me this was the oldest library in the world and everything ever thought had been a monsoon here once.',
    category:BE, visibility:L, tags:['monsoon','library','rain','india','knowledge'], hoursAgo:624, atKey:'library_wisdom' },

  { userEmail:'priya@dreamcloud.dev', title:'Past Life Fragment',
    content:'A fragment. A woman at a window in a city that no longer exists. She was grieving something I\'d already processed in this life. I felt that she was me, in the way that water in two different rivers is still water. We looked at each other through centuries.',
    category:NO, visibility:L, tags:['past life','india','vedic','soul'], hoursAgo:864, atKey:'time_flow' },

  { userEmail:'priya@dreamcloud.dev', title:'The Thousand Doors',
    content:'A palace with a thousand doors, each opening to a different reality. I had one night. I opened seventeen. Behind the last one was not a reality but a question: "Which self opened these doors?" I sat in the doorframe for the rest of the dream considering it.',
    category:LU, visibility:L, tags:['doors','palace','reality','lucid'], hoursAgo:1152, atKey:'door_search' },

  { userEmail:'priya@dreamcloud.dev', title:'Dancing with Stars',
    content:'I danced with individual stars — not a metaphor, literally. Each one was warm and had a rhythm. When I matched it I could feel its entire history: birth, sequence, expansion, whatever comes after. I danced until I was part of the choreography. This is what yoga is trying to remember.',
    category:BE, visibility:L, tags:['stars','dance','india','cosmos','union'], hoursAgo:1440, atKey:'cosmic_awe' },

  { userEmail:'priya@dreamcloud.dev', title:'The Liberation Dream',
    content:'Every weight I had ever carried — known and unknown — fell from me simultaneously. Grief, ambition, the need to be understood, the fear of being known. Not stripped away painfully. Just released, the way you release an exhale. What remained was not empty. It was clear.',
    category:LU, visibility:L, tags:['liberation','moksha','india','release','lucid'], hoursAgo:1872, atKey:'sky_freedom' },

  // ── Regular users: Turkey ─────────────────────────────────────────────────
  { userEmail:'ayse@dreamcloud.dev', title:'Ankara Kalesi\'nde Gece',
    content:'Kaleye çıktım ama kale çok daha büyüktü, her kulenin içinde farklı bir şehir vardı. Bir kulede 1920\'ler Ankara\'sını, başka bir kulede hiç var olmamış bir başkent gördüm. En son kulenin penceresinden baktım — sadece açık ova vardı.',
    category:BE, visibility:L, tags:['ankara','kale','tarih','şehir'], hoursAgo:8, atKey:'time_flow' },
  { userEmail:'ayse@dreamcloud.dev', title:'Beyaz Çöl',
    content:'Beyaz bir çölde yürüyordum. Kum değil, tuz. Her adımda ayağım biraz geçiyordu içine. Ufukta bir şey vardı ama yaklaşmıyordu. Rüzgar yoktu ama saçlarım savruluyor gibiydi.',
    category:NO, visibility:L, tags:['çöl','beyaz','boşluk'], hoursAgo:120, atKey:'void_contemplation' },
  { userEmail:'ayse@dreamcloud.dev', title:'Denize Koşmak',
    content:'Ankara\'dan doğruca denize koşuyordum, ama mesafe bitmiyordu. Sonunda deniz bana geldi — şehrin ortasında küçük bir dalga. Ayakkabılarım ıslandı ve mutlu oldum.',
    category:LU, visibility:L, tags:['deniz','ankara','koşmak','lucid'], hoursAgo:360, atKey:'sky_freedom' },
  { userEmail:'ayse@dreamcloud.dev', title:'Kayıp Mektuplar',
    content:'Hiç göndermediğim mektuplar bir çekmecede duruyordu. Okuduğumda hepsinde başkasının yazısını buldum ama düşünceler bendendi. Belki de mektuplar gönderilmişti ve ben almıştım.',
    category:NO, visibility:F, tags:['mektup','geçmiş','yazı','bellek'], hoursAgo:720, atKey:'childhood_memory' },

  { userEmail:'burak@dreamcloud.dev', title:'Körfezde Yüzmek',
    content:'İzmir körfezinde yüzüyordum, ama su berraktı ve dip görünüyordu. Dipte bir şehir vardı — küçük, eski, hiç hasar görmemiş. İnmek istedim ama her yüzüşte yüzey beni geri itiyordu.',
    category:BE, visibility:L, tags:['körfez','izmir','sualtı','şehir'], hoursAgo:6, atKey:'water_deep' },
  { userEmail:'burak@dreamcloud.dev', title:'Agora\'da Tek Başına',
    content:'İzmir\'in antik agorasında gece yarısı yalnız kalmıştım. Sütunlar ayaktaydı ve her birinin yanında bir gölge duruyordu — insanların değil, anlık duyguların gölgesi. Geçip gittiler.',
    category:NO, visibility:L, tags:['agora','izmir','antik','gece'], hoursAgo:96, atKey:'shadow_chase' },
  { userEmail:'burak@dreamcloud.dev', title:'Rüzgar Dedektörü',
    content:'Rüzgarı görebiliyordum. Her esinti farklı bir renkteydi. Kuzeyden gelen mavi, güneyden turuncu. Şehrin üzerinde dev bir renk haritası oluştu ve her bölge farklı bir şey hissediyordu.',
    category:LU, visibility:L, tags:['rüzgar','renk','lucid','izmir'], hoursAgo:288, atKey:'lucid_control' },
  { userEmail:'burak@dreamcloud.dev', title:'Çakıl Taşları',
    content:'Sahilde çakıl taşları topluyordum. Her birinin içinde farklı bir ses vardı — küçük, özel. Birini tutunca dedemin sesini duydum. Bıraktım ve taş denize döndü.',
    category:NO, visibility:F, tags:['çakıl','ses','deniz','özlem'], hoursAgo:600, atKey:'reunion_tender' },

  { userEmail:'fatma@dreamcloud.dev', title:'İpek Yolu',
    content:'İpek yolunda yürüyordum, ama yol Bursa\'dan başlıyordu. İpek kumaşlar mağazaların önünden yerde akıyordu, rüzgarda dalgalanıyordu. Yolun sonu İstanbul\'a değil, hiç bilmediğim bir şehre çıkıyordu.',
    category:BE, visibility:L, tags:['ipek','bursa','yol','tarih'], hoursAgo:10, atKey:'ancient_sacred' },
  { userEmail:'fatma@dreamcloud.dev', title:'Uludağ\'da Kaybolmak',
    content:'Uludağ\'da kar fırtınasında kayboldum. Yolu bulmaya çalışırken adımlarım beni daha derin kara götürüyordu. Bir ses beni çağırıyordu ama yönü değişiyordu. Sonunda durup oturdum — ve fırtına geçti.',
    category:NI, visibility:L, tags:['uludağ','kar','kaybolmak','kabus'], hoursAgo:144, atKey:'shadow_chase' },
  { userEmail:'fatma@dreamcloud.dev', title:'Tarihi Han',
    content:'Tarihi bir hana girdim, avluda çeşme çalışıyordu. Bir tüccar bana çay ikram etti, nereden geldiğimi sordu. "İlerisinden" dedim ve doğru cevap buymuş gibi gülümsedi.',
    category:BE, visibility:L, tags:['han','bursa','tarih','çay'], hoursAgo:480, atKey:'time_flow' },
  { userEmail:'fatma@dreamcloud.dev', title:'Yeşil Işık',
    content:'Her şey yeşil bir ışıkla aydınlanıyordu — güneşten değil, topraktan geliyordu. Bitkilerin de içindeydi, taşların da. Işığı kaynağına takip ettim ve orman zeminine ulaştım. Toprağın bana baktığını hissettim.',
    category:LU, visibility:L, tags:['yeşil','ışık','toprak','lucid'], hoursAgo:960, atKey:'forest_journey' },

  { userEmail:'emre@dreamcloud.dev', title:'Akdeniz\'de Yelken',
    content:'Antalya kıyısından açılmış, tek başıma yelken yapıyordum. Rüzgar o kadar uyumluydu ki kürek gerektirmiyordu. Ufukta bir ada gördüm — haritada yok. Yaklaşırken ada yavaşça battı. Geri döndüm.',
    category:BE, visibility:L, tags:['yelken','antalya','akdeniz','ada'], hoursAgo:2, atKey:'ocean_surface' },
  { userEmail:'emre@dreamcloud.dev', title:'Antik Tiyatro',
    content:'Aspendos tiyatrosunda gece oturuyordum. Sahne boştu ama ses vardı — alkış, müzik, konuşma. Oyuncularsız bir gösteri. Koltuklar doluydu ama kimse gözükmüyordu.',
    category:NO, visibility:L, tags:['tiyatro','antik','antalya','ses'], hoursAgo:168, atKey:'void_contemplation' },
  { userEmail:'emre@dreamcloud.dev', title:'Derin Mavi',
    content:'Denizin derinliklerine dalıyordum ve her metre derinleştikçe renk daha arı maviye dönüşüyordu. En derininde ışık olmayan ama benim gördüğüm bir nokta vardı. Orada durdum. Ses yoktu. Sadece mavinin kendi sesi.',
    category:LU, visibility:L, tags:['derin','mavi','deniz','lucid'], hoursAgo:432, atKey:'water_deep' },
  { userEmail:'emre@dreamcloud.dev', title:'Kayalık Kıyı',
    content:'Kayalık kıyıda biri beni takip ediyordu. Döndüğümde hep bir adım gerideydi. Koşmadım. Durdum. O da durdu. Birlikte denize baktık.',
    category:NI, visibility:L, tags:['kaya','kıyı','takip','kabus'], hoursAgo:840, atKey:'shadow_chase' },

  // ── Regular: Germany ──────────────────────────────────────────────────────
  { userEmail:'felix@dreamcloud.dev', title:'The Bavarian Castle',
    content:'A castle in the mountains I\'d never visited, but every room was familiar. The architecture kept shifting — medieval becoming modernist becoming something with no name. In the basement: servers running. Processing dreams, maybe.',
    category:BE, visibility:L, tags:['castle','bavaria','germany','architecture'], hoursAgo:5, atKey:'labyrinth_escape' },
  { userEmail:'felix@dreamcloud.dev', title:'Silicon Dream',
    content:'I was debugging code but the bugs were emotions. A memory leak that was actually loneliness. A race condition that was actually impatience. Fixed them one by one. When I finished, the program output a single word: "enough."',
    category:LU, visibility:L, tags:['code','debugging','lucid','tech','emotion'], hoursAgo:192, atKey:'mirror_identity' },
  { userEmail:'felix@dreamcloud.dev', title:'Fog Over the River',
    content:'Munich\'s Isar in early morning fog. I couldn\'t see the other bank. I crossed anyway. On the other side: Munich again, but quieter, as if the fog had stayed on the wrong side of the river.',
    category:NO, visibility:L, tags:['fog','river','munich','threshold'], hoursAgo:528, atKey:'door_search' },
  { userEmail:'felix@dreamcloud.dev', title:'Running Out of Code',
    content:'The worst kind of nightmare: the code I\'d been writing for months simply stopped existing. Not deleted — never written. I had to start over but didn\'t know where. I woke in a cold sweat and immediately opened my laptop to check.',
    category:NI, visibility:L, tags:['code','nightmare','loss','tech'], hoursAgo:1320, atKey:'urban_lost' },

  { userEmail:'hannah@dreamcloud.dev', title:'The Harbor at Midnight',
    content:'Hamburg\'s harbor at midnight, the water black and still. The ships were painted in colors that don\'t exist in daylight. I mixed them all on a palette and tried to paint what I was seeing. The painting finished itself while I watched.',
    category:BE, visibility:L, tags:['harbor','hamburg','art','night'], hoursAgo:9, atKey:'ocean_surface' },
  { userEmail:'hannah@dreamcloud.dev', title:'The Painting That Changed',
    content:'A painting in a gallery slowly became a different painting over the hours I stood before it. Not dramatically — a color shifting, a figure disappearing, a new light source appearing. No one else noticed. By closing time it was a landscape of somewhere I\'d never been but recognized.',
    category:NO, visibility:L, tags:['painting','art','change','gallery'], hoursAgo:168, atKey:'mirror_identity' },
  { userEmail:'hannah@dreamcloud.dev', title:'Colors Without Names',
    content:'I could see colors that had no names. They didn\'t exist on any spectrum I knew. I spent the dream trying to mix them from known colors and failing. I woke with the overwhelming desire to paint before they faded.',
    category:BE, visibility:L, tags:['color','art','perception','synesthesia'], hoursAgo:408, atKey:'lucid_control' },
  { userEmail:'hannah@dreamcloud.dev', title:'Museum After Hours',
    content:'Locked in a museum after closing. The statues moved — slightly, slowly, the way people move when they think no one is watching. I walked among them like a guest at a private gathering. One handed me a drink made of light.',
    category:LU, visibility:L, tags:['museum','statues','night','lucid'], hoursAgo:1080, atKey:'ancient_sacred' },

  // ── Regular: UK ───────────────────────────────────────────────────────────
  { userEmail:'oliver@dreamcloud.dev', title:'Fog on the Thames',
    content:'The Thames in Victorian fog, but I was myself — contemporary, out of time. Boats that shouldn\'t coexist moved together. A man in a top hat handed me a telegram. It was for someone else. I delivered it anyway.',
    category:BE, visibility:L, tags:['london','thames','fog','history'], hoursAgo:7, atKey:'time_flow' },
  { userEmail:'oliver@dreamcloud.dev', title:'Library Under the City',
    content:'Below London — not the tube, below that — an ancient library. The books were in languages that hadn\'t been spoken for millennia but I could read them. My novel was there, not yet written. I took it carefully and read what I\'d write next.',
    category:LU, visibility:L, tags:['library','london','underground','writing','lucid'], hoursAgo:120, atKey:'library_wisdom' },
  { userEmail:'oliver@dreamcloud.dev', title:'Chapter Not Written',
    content:'A chapter appeared in my manuscript that I hadn\'t written. It was better than anything else in the book. I read it three times, memorizing it. Woke up. Could not recall a single sentence. This happens more often than I admit.',
    category:NO, visibility:L, tags:['writing','chapter','loss','creativity'], hoursAgo:336, atKey:'urban_lost' },
  { userEmail:'oliver@dreamcloud.dev', title:'Tube That Never Stops',
    content:'A tube train that never stopped — running through stations where people waited patiently, resigned. I tried to get off but the doors wouldn\'t open at the stations. The train kept going deeper into London than London actually goes.',
    category:NI, visibility:L, tags:['tube','london','trapped','nightmare'], hoursAgo:912, atKey:'labyrinth_escape' },

  { userEmail:'charlotte@dreamcloud.dev', title:'Door in the Hedgerow',
    content:'A door in the middle of an English hedgerow, no frame, no building, just door. I opened it. A garden on both sides. But the garden on the other side was the same garden, photographed in different light. I walked through and stood in the same place, differently lit.',
    category:BE, visibility:L, tags:['door','garden','england','threshold'], hoursAgo:4, atKey:'door_search' },
  { userEmail:'charlotte@dreamcloud.dev', title:'Ancestor\'s Garden',
    content:'A garden tended by every ancestor I\'d ever had — crowded, overlapping, each planting for the next generation. None of them could see each other. But what they planted nourished each other across centuries. I understood suddenly what family means.',
    category:BE, visibility:L, tags:['garden','ancestors','family','time'], hoursAgo:216, atKey:'reunion_tender' },
  { userEmail:'charlotte@dreamcloud.dev', title:'Language I Almost Knew',
    content:'Everyone spoke in a language I almost understood. Every tenth word was clear. I kept catching meaning at the edge of comprehension, then losing it. Like hearing a song you know but can\'t place. Woke frustrated and deeply curious.',
    category:NO, visibility:L, tags:['language','unknown','comprehension','london'], hoursAgo:552, atKey:'void_contemplation' },

  { userEmail:'william@dreamcloud.dev', title:'The Castle in Rain',
    content:'Edinburgh Castle in heavy rain, but the rain fell upward. The whole city visible from the castle was also reversed — rivers running uphill, smoke falling. Only I was oriented correctly. A philosopher\'s dream: standing right-side-up in an inverted world.',
    category:NO, visibility:L, tags:['edinburgh','castle','rain','inversion'], hoursAgo:11, atKey:'mirror_identity' },
  { userEmail:'william@dreamcloud.dev', title:'Minds Long Gone',
    content:'A conference of dead philosophers. Not ghosts — they had been reconstituted from their texts. Hume was precisely as skeptical as advertised. Wittgenstein spoke rarely and only in questions. I tried to contribute. They listened politely. Hume asked if I was certain I was there.',
    category:LU, visibility:L, tags:['philosophy','hume','wittgenstein','lucid','edinburgh'], hoursAgo:192, atKey:'collective_signal' },
  { userEmail:'william@dreamcloud.dev', title:'The Loch and the Mirror',
    content:'A loch so still it was a perfect mirror of the sky. I couldn\'t tell which was real — the sky reflected or the sky itself. I lay on the bank and stared upward and was no longer sure I wasn\'t looking down.',
    category:BE, visibility:L, tags:['loch','mirror','scotland','sky','perception'], hoursAgo:672, atKey:'ocean_surface' },

  // ── Regular: France ───────────────────────────────────────────────────────
  { userEmail:'camille@dreamcloud.dev', title:'Le Musée Silencieux',
    content:'The Louvre but all the visitors had been replaced by painted figures who had climbed from their frames. They moved through the galleries examining each other. The Mona Lisa stood in front of Delacroix\'s Liberty and they were talking. I tried to listen but they spoke in paint.',
    category:BE, visibility:L, tags:['musee','paris','art','louvre','france'], hoursAgo:6, atKey:'ancient_sacred' },
  { userEmail:'camille@dreamcloud.dev', title:'La Seine la Nuit',
    content:'La Seine at night, painted in the colors of all the nights painters had painted it. Monet\'s blues next to a contemporary grey next to a Seurat of dots. The river flowed through all their visions at once.',
    category:BE, visibility:L, tags:['seine','paris','art','night','france'], hoursAgo:120, atKey:'ocean_surface' },
  { userEmail:'camille@dreamcloud.dev', title:'Les Couleurs de l\'Inconscient',
    content:'I painted in a lucid dream with colors that existed nowhere but in the unconscious. When I tried to describe them on waking I had no words — only the feeling of what they meant. I think I painted something important.',
    category:LU, visibility:L, tags:['peinture','couleurs','lucid','inconscient','france'], hoursAgo:384, atKey:'lucid_control' },
  { userEmail:'camille@dreamcloud.dev', title:'La Rue Disparue',
    content:'A street in Paris I had known all my life simply wasn\'t there anymore. Not rebuilt — erased. I asked everyone around me. No one had heard of it. I began to wonder if I had invented it, or if it had invented me.',
    category:NO, visibility:L, tags:['rue','paris','disparue','memory','loss'], hoursAgo:960, atKey:'urban_lost' },

  { userEmail:'pierre@dreamcloud.dev', title:'Light in the Cellar',
    content:'A cellar in Lyon full of wine but also full of light. The light came from the bottles — not the wine inside them but the glass itself, as if it had absorbed decades of light and was releasing it. I opened one. The light spilled out and didn\'t fade.',
    category:BE, visibility:L, tags:['cellar','light','lyon','wine','france'], hoursAgo:8, atKey:'library_wisdom' },
  { userEmail:'pierre@dreamcloud.dev', title:'Running Through Markets',
    content:'Running through Lyon\'s Marché de la Croix-Rousse at full speed and everything slowed to give me room. Stallholders stepped aside. Produce reorganized. The market opened a corridor just for me. I had no idea where I was running but it felt necessary.',
    category:LU, visibility:L, tags:['marche','lyon','running','france','lucid'], hoursAgo:144, atKey:'sky_freedom' },
  { userEmail:'pierre@dreamcloud.dev', title:'Bridge Between Seasons',
    content:'Standing on a bridge where one side was summer and one side was winter. People crossed without noticing. I stood in the exact middle where both existed simultaneously — warm left side, cold right side. I stayed until the seasons changed and the bridge was the same temperature on both sides.',
    category:NO, visibility:L, tags:['bridge','seasons','threshold','france'], hoursAgo:456, atKey:'door_search' },

  // ── Regular: Japan ────────────────────────────────────────────────────────
  { userEmail:'kenji@dreamcloud.dev', title:'Neon Ghost',
    content:'Osaka\'s Dotonbori at night but all the people were translucent. I could see through them to the neon signs behind — the signs were more solid than the crowd. Only I was opaque. I walked through the ghost-city feeling very alone and very real.',
    category:NI, visibility:L, tags:['neon','osaka','ghost','japan','nightmare'], hoursAgo:3, atKey:'shadow_chase' },
  { userEmail:'kenji@dreamcloud.dev', title:'The Game That Played Me',
    content:'I was a character in a game I had designed. The player controlling me was making choices I would never make. I couldn\'t override. I watched myself do things that were wrong for who I am. The player paused the game. In the pause, I was free.',
    category:LU, visibility:L, tags:['game','design','control','lucid','japan'], hoursAgo:168, atKey:'labyrinth_escape' },
  { userEmail:'kenji@dreamcloud.dev', title:'Boss Level Final',
    content:'The final boss of a nightmare. It was my own perfectionism — had my face, moved in ways I recognized. The trick was not to fight it but to acknowledge it. I lowered my sword. It lowered its sword. Level cleared.',
    category:NI, visibility:L, tags:['boss','game','perfectionism','nightmare','shadow'], hoursAgo:480, atKey:'mirror_identity' },
  { userEmail:'kenji@dreamcloud.dev', title:'The Glitch in the Sky',
    content:'The sky had a rendering error — a rectangular patch of pure white where sky should be. Only I noticed. I climbed a building to get closer. At the top I could see through the glitch into the code behind reality. It was elegant.',
    category:NO, visibility:L, tags:['glitch','sky','code','japan','reality'], hoursAgo:1080, atKey:'lucid_control' },

  { userEmail:'sakura@dreamcloud.dev', title:'Temple in Moonlight',
    content:'Fushimi Inari at midnight, alone, the torii gates lit only by moonlight. The fox statues moved at the edges of vision, vanishing when I looked directly. The path kept extending. I didn\'t try to reach the top — I walked to walk.',
    category:BE, visibility:L, tags:['temple','kyoto','moon','fox','japan'], hoursAgo:10, atKey:'ancient_sacred' },
  { userEmail:'sakura@dreamcloud.dev', title:'Grandmother\'s Tea Ceremony',
    content:'My grandmother performed the tea ceremony as she had when I was small. Every movement precisely correct. The tea was ready. She poured it and handed it to me. The cup was warm in my hands when I woke up. My hands were still warm.',
    category:BE, visibility:L, tags:['grandmother','tea','ceremony','japan','warmth'], hoursAgo:96, atKey:'reunion_tender' },
  { userEmail:'sakura@dreamcloud.dev', title:'Cherry Blossoms in December',
    content:'Cherry blossoms in Kyoto in December. They weren\'t confused by the season — they simply bloomed because they wanted to. The cold didn\'t stop them. No one else was photographing them. I wondered if that was why they bloomed — for someone who wouldn\'t photograph.',
    category:NO, visibility:L, tags:['sakura','kyoto','winter','japan','beauty'], hoursAgo:312, atKey:'forest_journey' },
  { userEmail:'sakura@dreamcloud.dev', title:'The Koi That Spoke',
    content:'A koi in a temple pond swam to the surface and said my name. In Japanese, in a voice like running water. It said nothing else. It didn\'t need to. My name said the way it said it was already everything.',
    category:BE, visibility:L, tags:['koi','japan','pond','temple','name'], hoursAgo:720, atKey:'forest_journey' },

  // ── Regular: Brazil ───────────────────────────────────────────────────────
  { userEmail:'maria@dreamcloud.dev', title:'Floresta Infinita',
    content:'An Amazon forest that extended infinitely, but I was not lost — I knew exactly where I was, which was everywhere. The forest was also inside me: my lungs were leaves, my heartbeat was the water cycle. When I breathed, the canopy moved.',
    category:BE, visibility:L, tags:['amazon','forest','brazil','nature','body'], hoursAgo:5, atKey:'forest_journey' },
  { userEmail:'maria@dreamcloud.dev', title:'A Cidade que Dorme',
    content:'São Paulo asleep — all 22 million of them simultaneously. I walked through the streets and could hear them all dreaming at once, a sound like the ocean. Each building was a different dream. I tried to count them and lost myself in the counting.',
    category:NO, visibility:L, tags:['sao paulo','city','sleep','collective','brazil'], hoursAgo:216, atKey:'collective_signal' },
  { userEmail:'maria@dreamcloud.dev', title:'Samba dos Mortos',
    content:'Awake in the dream knowing I was dreaming, I danced with the dead of my city. They danced as they had in life — some with joy, some with grief still in their bones. The music was made by both groups together and it was the most complete music I\'ve ever heard.',
    category:LU, visibility:L, tags:['samba','dead','brazil','lucid','dance'], hoursAgo:576, atKey:'reunion_tender' },

  { userEmail:'lucas@dreamcloud.dev', title:'Music from the Favela Sky',
    content:'Floating above Rio, I heard music rising from every community simultaneously — not competing, but converging. By the time it reached my altitude it had become one song. The song was older than the city. The city was built around the song.',
    category:BE, visibility:L, tags:['rio','music','favela','brazil','sky'], hoursAgo:8, atKey:'sky_freedom' },
  { userEmail:'lucas@dreamcloud.dev', title:'Beach at the Edge',
    content:'A beach at the edge of the world — the water fell off into nothing beyond the horizon. Not frightening. Just the literal end, calm, attended by seabirds who were used to it. I sat and watched people arrive and stand at the edge and not fall.',
    category:BE, visibility:L, tags:['beach','edge','brazil','sea','abyss'], hoursAgo:144, atKey:'void_contemplation' },
  { userEmail:'lucas@dreamcloud.dev', title:'Carnival Parade Without End',
    content:'A carnival parade that had been going for longer than anyone could remember. The floats at the back were from decades past. I joined and couldn\'t tell if I was adding to the parade or if the parade had always included me.',
    category:LU, visibility:L, tags:['carnival','rio','parade','lucid','brazil','time'], hoursAgo:432, atKey:'time_flow' },
  { userEmail:'lucas@dreamcloud.dev', title:'The Cord',
    content:'A thin cord connected my chest to everyone I had ever loved. In the dream I could see them all, faint lights at the end of each thread, scattered across the city, the country, the years. One cord led to someone I had forgotten. I followed it.',
    category:NO, visibility:F, tags:['connection','love','brazil','cord','memory'], hoursAgo:960, atKey:'collective_signal' },

  // ── Regular: India ────────────────────────────────────────────────────────
  { userEmail:'arjun@dreamcloud.dev', title:'The Algorithm Dream',
    content:'I dreamed in code — not metaphorically, literally. Each thought was a function, each memory a data structure. My subconscious was running an algorithm I hadn\'t written. When I looked at the output, it was making decisions about my waking life. Better ones, honestly.',
    category:LU, visibility:L, tags:['algorithm','code','india','lucid','tech'], hoursAgo:4, atKey:'lucid_control' },
  { userEmail:'arjun@dreamcloud.dev', title:'Mumbai in My Sleep',
    content:'Bangalore boy dreaming of Mumbai — the difference in air, in light, in pace. In the dream I lived there as someone else. That someone else was homesick for Bangalore. We were each other\'s missing.',
    category:BE, visibility:L, tags:['mumbai','bangalore','india','city','homesick'], hoursAgo:192, atKey:'urban_lost' },
  { userEmail:'arjun@dreamcloud.dev', title:'The Code That Wrote Itself',
    content:'I was debugging and the bug fixed itself, but then wrote a comment explaining why it had been a bug in the first place. The comment was in English and Sanskrit simultaneously. I started reading. It was not about code.',
    category:NO, visibility:L, tags:['code','bug','india','sanskrit','self'], hoursAgo:528, atKey:'mirror_identity' },
  { userEmail:'arjun@dreamcloud.dev', title:'Valley of Silicon Gods',
    content:'A nightmare: a valley where people worshipped technology and it worshipped them back, consuming them. I watched from outside, which meant I was either saved or just not yet chosen. The uncertainty was worse.',
    category:NI, visibility:L, tags:['technology','nightmare','india','silicon','worship'], hoursAgo:1200, atKey:'shadow_chase' },

  // ── Regular: Spain ────────────────────────────────────────────────────────
  { userEmail:'sofia@dreamcloud.dev', title:'El Espejo del Prado',
    content:'In the Prado, every painting was a mirror showing not a reflection but an alternative version of me who had made different choices. Las Meninas showed me as a court painter. Goya\'s dark paintings showed me having survived something I hadn\'t yet faced.',
    category:BE, visibility:L, tags:['prado','madrid','mirror','spain','art'], hoursAgo:7, atKey:'mirror_identity' },
  { userEmail:'sofia@dreamcloud.dev', title:'La Ciudad Vacía',
    content:'Madrid completely empty — not abandoned, not post-apocalyptic. Just quiet. Waiting. I walked Gran Vía in silence and it was the most beautiful the city had ever been, without anyone to see it.',
    category:NO, visibility:L, tags:['madrid','empty','silence','city','spain'], hoursAgo:120, atKey:'void_contemplation' },
  { userEmail:'sofia@dreamcloud.dev', title:'Mi Otra Yo',
    content:'I met myself — the self who had stayed in the small town where I grew up. She was happy in ways I\'m not. I was free in ways she isn\'t. We sat across from each other in a dream café and ordered the same thing and spoke the same words at different volumes.',
    category:LU, visibility:L, tags:['alter ego','self','spain','lucid','choice'], hoursAgo:408, atKey:'mirror_identity' },
  { userEmail:'sofia@dreamcloud.dev', title:'Las Flores Caídas',
    content:'Fallen flowers covering Madrid streets — not sad, not neglected. The petals were the city\'s way of resting. I walked through them and they rose a little with each step and settled again. A city exhaling.',
    category:BE, visibility:F, tags:['flores','madrid','rest','beauty','spain'], hoursAgo:912, atKey:'childhood_memory' },

  { userEmail:'carlos@dreamcloud.dev', title:'Cathedral Dream',
    content:'Designing a cathedral in the dream — not a historical one, one that had never existed. Every arch was a different structural solution to the same spiritual question. The building knew what it was for before I finished it.',
    category:BE, visibility:L, tags:['cathedral','architecture','spain','barcelona','sacred'], hoursAgo:9, atKey:'ancient_sacred' },
  { userEmail:'carlos@dreamcloud.dev', title:'Impossible Building',
    content:'Lucid and designing a building that couldn\'t be built in waking reality — it required the interior to be larger than the exterior, gravity to work selectively, light to come from the walls themselves. I spent the whole dream making it structurally honest within its own impossible rules.',
    category:LU, visibility:L, tags:['architecture','impossible','lucid','spain','design'], hoursAgo:168, atKey:'lucid_control' },
  { userEmail:'carlos@dreamcloud.dev', title:'Sea Level Rising',
    content:'Barcelona flooded slowly, but people stayed. They adapted — furniture floated, conversations continued at water level, children swam to school. The architecture, submerged, was more beautiful. I woke troubled and inspired at once.',
    category:NI, visibility:L, tags:['barcelona','flood','climate','nightmare','sea'], hoursAgo:480, atKey:'water_deep' },

  // ── Regular: Italy ────────────────────────────────────────────────────────
  { userEmail:'giulia@dreamcloud.dev', title:'The Forum Under Stars',
    content:'Rome\'s Forum at night under a sky impossible in a modern city — the Milky Way overhead. The stones remembered. I could feel the weight of what had happened here, not as drama but as accumulation. History as sediment.',
    category:BE, visibility:L, tags:['rome','forum','stars','history','italy'], hoursAgo:5, atKey:'ancient_sacred' },
  { userEmail:'giulia@dreamcloud.dev', title:'Patient Without Words',
    content:'A therapy session where the patient spoke only in gestures and I understood everything. When I tried to respond in words, they didn\'t land. We found a way to communicate entirely in silence and movement. Most productive session I\'ve ever had, in any form.',
    category:NO, visibility:L, tags:['therapy','silence','communication','italy','understanding'], hoursAgo:144, atKey:'void_contemplation' },
  { userEmail:'giulia@dreamcloud.dev', title:'Il Sogno del Bambino',
    content:'I was watching a child sleep and could see their dream projected above them like light through leaves — simple, vivid, completely fearless. The child dreamed of flying and in the dream they were very good at it, the way children are good at things they believe in.',
    category:BE, visibility:L, tags:['child','dream','rome','italy','flying'], hoursAgo:360, atKey:'sky_freedom' },
  { userEmail:'giulia@dreamcloud.dev', title:'The Colosseum Empty',
    content:'The Colosseum with no tourists, no memory of gladiators — just stone and sky. I sat in the center of the arena and listened to the silence. What the silence remembered was not violence but all the ways people had tried to make meaning of things they couldn\'t control.',
    category:LU, visibility:L, tags:['colosseum','rome','italy','empty','silence','lucid'], hoursAgo:840, atKey:'void_contemplation' },

  { userEmail:'marco@dreamcloud.dev', title:'Fashion Show in the Sky',
    content:'A runway show held on clouds, models walking the sky. The clothes were made of weather — fog and lightning and the particular light before rain. When the models walked, the sky changed. The final look was made of clear night and everyone fell silent.',
    category:BE, visibility:L, tags:['fashion','sky','milan','italy','clouds'], hoursAgo:8, atKey:'sky_freedom' },
  { userEmail:'marco@dreamcloud.dev', title:'Fabric That Changed Color',
    content:'A fabric I was designing changed color based on the emotion of whoever touched it. I couldn\'t make it stay one color. When I wore it, it showed everything at once — the full palette of me. Too honest for fashion, maybe.',
    category:NO, visibility:L, tags:['fabric','color','fashion','milan','italy'], hoursAgo:192, atKey:'mirror_identity' },
  { userEmail:'marco@dreamcloud.dev', title:'Mannequins Woke Up',
    content:'The mannequins in my studio stood up and walked around examining my sketches. They had opinions — quiet, precise, communicated by turning slightly toward or away. I found myself designing for what they responded to. It was the most efficient creative process I\'ve experienced.',
    category:NI, visibility:L, tags:['mannequin','fashion','nightmare','milan','italy'], hoursAgo:504, atKey:'shadow_chase' },

  // ── Regular: Canada ───────────────────────────────────────────────────────
  { userEmail:'emily@dreamcloud.dev', title:'The Sleep Lab Dream',
    content:'I was both the researcher and the subject simultaneously. I watched my own brain waves on a monitor while experiencing them. During REM the monitor showed a pattern no one had seen before. In the dream I wrote it down. In waking I can\'t read what I wrote.',
    category:LU, visibility:L, tags:['sleep lab','neuroscience','lucid','canada','brain'], hoursAgo:6, atKey:'mirror_identity' },
  { userEmail:'emily@dreamcloud.dev', title:'The Neurons Firing',
    content:'I was inside my own brain as the neurons fired. Each thought was a lightning strike in slow motion, illuminating the landscape. I followed a memory back to its source. It began earlier than I thought. The source was a feeling, not an event.',
    category:BE, visibility:L, tags:['neurons','brain','canada','science','memory'], hoursAgo:168, atKey:'cosmic_awe' },
  { userEmail:'emily@dreamcloud.dev', title:'REM Cycle',
    content:'A dream documenting its own REM stage in real time — I watched myself move through each stage, felt the paralysis lift and return, watched the activity peaks on a monitor hovering in the corner of the dream. The last peak was larger than the chart could hold.',
    category:NO, visibility:L, tags:['rem','sleep','canada','neuroscience','meta'], hoursAgo:504, atKey:'lucid_control' },
  { userEmail:'emily@dreamcloud.dev', title:'The Baseline Is Changing',
    content:'My baseline anxiety in the dream was different — lower, steadier. I kept checking for the familiar tension and finding it wasn\'t there. Not absent but resting. I woke and lay very still trying to hold that baseline for as long as possible.',
    category:NO, visibility:F, tags:['anxiety','baseline','canada','peace','neuroscience'], hoursAgo:1080, atKey:'void_contemplation' },

  { userEmail:'ryan@dreamcloud.dev', title:'Mountain That Moved',
    content:'The mountain I was climbing moved — not shook, moved. Walked, slowly, deliberately, to a different valley. I climbed the whole way and when I reached the summit it was somewhere else entirely. The view was different but just as good. Maybe better.',
    category:BE, visibility:L, tags:['mountain','vancouver','canada','movement','impossible'], hoursAgo:10, atKey:'mountain_peak' },
  { userEmail:'ryan@dreamcloud.dev', title:'Kayaking Through Fog',
    content:'Fog so thick the water and sky merged. I kayaked through what could have been either. My paddle found resistance — water below, air above — but the distinction didn\'t matter. I navigated by sound and felt more oriented than I usually do in clear weather.',
    category:NO, visibility:L, tags:['kayak','fog','vancouver','canada','water'], hoursAgo:192, atKey:'ocean_surface' },
  { userEmail:'ryan@dreamcloud.dev', title:'The Pacific Pull',
    content:'The Pacific pulled at me from a distance — a gravitational thing, not metaphorical. Standing in Vancouver I felt the whole ocean leaning toward me, asking me to come back in. I walked to the shore in the dream and stood in the surf and the pull balanced.',
    category:BE, visibility:L, tags:['pacific','ocean','vancouver','canada','pull'], hoursAgo:432, atKey:'water_deep' },
  { userEmail:'ryan@dreamcloud.dev', title:'The Summit Cloud',
    content:'Reached the summit and it was inside a cloud — no view, just white. I sat and waited. The cloud didn\'t move. The summit was the cloud. I had been climbing toward being inside this. That was the destination. I was satisfied.',
    category:LU, visibility:L, tags:['summit','cloud','mountain','canada','lucid'], hoursAgo:1008, atKey:'mountain_peak' },

  // ── Regular: Netherlands ──────────────────────────────────────────────────
  { userEmail:'anna@dreamcloud.dev', title:'Cycling Through Canals at Night',
    content:'Amsterdam\'s canals at night on my bike — except the canals were slightly elevated, level with the rooftops, reflecting the city below them. I cycled along the water\'s edge and looked down at the lit windows beneath the water\'s surface.',
    category:BE, visibility:L, tags:['amsterdam','canal','cycling','night','netherlands'], hoursAgo:4, atKey:'ocean_surface' },
  { userEmail:'anna@dreamcloud.dev', title:'The Windmill Field',
    content:'A field of windmills in fog, all turning at different speeds and directions. I stood in the center. The wind was created by the mills, not the other way around. I was in the center of an engine that made its own fuel.',
    category:NO, visibility:L, tags:['windmill','field','netherlands','fog','cycle'], hoursAgo:96, atKey:'void_contemplation' },
  { userEmail:'anna@dreamcloud.dev', title:'Below Sea Level',
    content:'Standing in the Randstad knowing I was below sea level, feeling the weight of the water held back behind dikes I couldn\'t see. In the dream the dikes failed silently — not in disaster but in acceptance. The sea came in gently and everything continued.',
    category:NI, visibility:L, tags:['sea level','netherlands','dikes','water','nightmare'], hoursAgo:240, atKey:'water_deep' },
  { userEmail:'anna@dreamcloud.dev', title:'Tulip Labyrinth',
    content:'A labyrinth of tulips — walls of flowers in all colors, impossibly tall. The labyrinth had no wrong turns, only choices. Every path arrived somewhere worth arriving. I stopped trying to find the center and explored instead.',
    category:BE, visibility:L, tags:['tulip','labyrinth','netherlands','flower','color'], hoursAgo:768, atKey:'labyrinth_escape' },

  { userEmail:'jan@dreamcloud.dev', title:'Architecture of Light',
    content:'Designing a building made entirely of light — structural light, load-bearing light. The math worked in the dream. The materials were angles of sun and types of shadow. When I finished and stood back, the building was indistinguishable from the air around it. It held anyway.',
    category:LU, visibility:L, tags:['architecture','light','rotterdam','netherlands','lucid'], hoursAgo:7, atKey:'lucid_control' },
  { userEmail:'jan@dreamcloud.dev', title:'The Port in Fog',
    content:'Rotterdam\'s port in fog — container ships moving silently, enormous, careful. Each ship carried something I needed but didn\'t know I needed. I watched them all pass. None of them docked. Maybe they were for someone else.',
    category:NO, visibility:L, tags:['port','rotterdam','fog','netherlands','ship'], hoursAgo:216, atKey:'ocean_surface' },
  { userEmail:'jan@dreamcloud.dev', title:'Building Bridges From Nothing',
    content:'I built a bridge from one bank to another using only intention. Each board appeared under my foot as I stepped forward. I couldn\'t look back — looking back made the boards disappear. I reached the other side and looked back anyway. The bridge was still there.',
    category:BE, visibility:L, tags:['bridge','building','netherlands','faith','creation'], hoursAgo:672, atKey:'door_search' },

  // ── Regular: Mexico ───────────────────────────────────────────────────────
  { userEmail:'valentina@dreamcloud.dev', title:'El Mercado Flotante',
    content:'A floating market on a lake — Mexico City as it was before the Spanish, before the lake was drained. Vendors in canoes, produce and flowers floating on rafts. I bought marigolds from a woman who looked like my great-grandmother. The marigolds didn\'t wilt when I woke.',
    category:BE, visibility:L, tags:['mercado','mexico','tenochtitlan','history','floating'], hoursAgo:6, atKey:'time_flow' },
  { userEmail:'valentina@dreamcloud.dev', title:'Los Muertos Bailan',
    content:'Día de Muertos but the dead actually danced. Not mournfully — with abandon, with joy, with the specific freedom of those who no longer have anything to lose. I joined them. They taught me a step I\'d never learned. I danced it again the next morning.',
    category:LU, visibility:L, tags:['dia de muertos','mexico','dance','dead','lucid'], hoursAgo:144, atKey:'reunion_tender' },
  { userEmail:'valentina@dreamcloud.dev', title:'La Pirámide Habla',
    content:'Teotihuacán at dawn, and the Pyramid of the Sun spoke — not in words but in frequency, a low resonance I felt in my chest. I climbed it and at the top the frequency was so strong I could see in more directions than exist. I saw the four cardinal directions and three more.',
    category:NO, visibility:L, tags:['piramide','teotihuacan','mexico','frequency','sacred'], hoursAgo:336, atKey:'ancient_sacred' },
  { userEmail:'valentina@dreamcloud.dev', title:'El Río de Luz',
    content:'A river of light flowing through Mexico City streets at night, following the routes of the old canals. I walked beside it. People sleeping in nearby buildings dreamed through it — I could see their dreams rising from the water like steam.',
    category:BE, visibility:L, tags:['luz','rio','mexico','canals','dreams'], hoursAgo:792, atKey:'collective_signal' },

  { userEmail:'diego@dreamcloud.dev', title:'The Dark Lens',
    content:'My camera but the lens was made of shadow. Everything it captured was the negative of what was there — dark where light was, bright where dark. The photographs it produced were the most beautiful I\'ve ever made. I couldn\'t figure out how to develop them into positive.',
    category:NI, visibility:L, tags:['camera','shadow','mexico','photography','negative'], hoursAgo:8, atKey:'shadow_chase' },
  { userEmail:'diego@dreamcloud.dev', title:'Portrait That Changed',
    content:'A portrait I had taken of a stranger slowly became a portrait of me. Not dramatically — a feature at a time, over hours. By the time I noticed, there was no stranger left. I don\'t know if this is something I dreamed or something I remember.',
    category:NO, visibility:L, tags:['portrait','photography','mexico','identity','change'], hoursAgo:168, atKey:'mirror_identity' },
  { userEmail:'diego@dreamcloud.dev', title:'Light Through Darkness',
    content:'Photographing light sources in complete darkness — finding light where there shouldn\'t be any. Under stones, inside closed boxes, in empty rooms. By the end of the dream I understood that darkness is not the absence of light but a different kind of it.',
    category:LU, visibility:L, tags:['light','darkness','photography','lucid','mexico'], hoursAgo:456, atKey:'library_wisdom' },
  { userEmail:'diego@dreamcloud.dev', title:'City of Shadows',
    content:'Guadalajara but made entirely of shadows — not dark, but shadow-colored: grey, deep purple, black-blue. The buildings cast shadows of themselves that were more solid than they were. I lived in my own shadow for the night and found it comfortable.',
    category:NI, visibility:L, tags:['shadow','guadalajara','mexico','city','nightmare'], hoursAgo:1032, atKey:'urban_lost' },

  // ── Regular: South Korea ──────────────────────────────────────────────────
  { userEmail:'jiyeon@dreamcloud.dev', title:'K-Dream Mirror City',
    content:'Seoul exactly mirrored underground — an identical city below, every building reflected, every street inverted. I took the subway down instead of across and arrived in the mirror city. People there were me in different decades — 10 years younger, 10 years older — going about their days.',
    category:LU, visibility:L, tags:['seoul','mirror','underground','korea','lucid'], hoursAgo:3, atKey:'mirror_identity' },
  { userEmail:'jiyeon@dreamcloud.dev', title:'Subway Station That Didn\'t Exist',
    content:'A Seoul metro station between two stops that I\'d ridden a thousand times. Announced in Korean, perfectly official, but not on any map. I got off. The station was beautiful — all tile and light — and completely empty. The next train never came.',
    category:NO, visibility:L, tags:['subway','seoul','korea','liminal','station'], hoursAgo:96, atKey:'door_search' },
  { userEmail:'jiyeon@dreamcloud.dev', title:'Other Side of the Glass',
    content:'Standing at the glass of a window and my reflection was doing something different from me — living a different day. I watched her for a long time. Her day looked harder and also more real. I pressed my hand to the glass and she did too.',
    category:BE, visibility:L, tags:['glass','reflection','korea','seoul','alter'], hoursAgo:264, atKey:'mirror_identity' },
  { userEmail:'jiyeon@dreamcloud.dev', title:'Screen Between Worlds',
    content:'My phone screen showed me a feed from a parallel Seoul — same city, different decisions. Everything slightly left of what had actually happened. I scrolled through alternative memories. One post was from an account that was me but had made one choice differently. She seemed okay.',
    category:NO, visibility:F, tags:['screen','parallel','korea','social','feed'], hoursAgo:648, atKey:'collective_signal' },

  { userEmail:'minho@dreamcloud.dev', title:'The Deep Water Dream',
    content:'Diving in the East Sea without equipment — breathing water, reading sonar with my skin. I found a seamount no one had mapped. The creatures there were specialized for darkness and pressure in ways I\'d never theorized. I took no samples. Some things should stay where they are.',
    category:BE, visibility:L, tags:['diving','ocean','korea','sea','marine'], hoursAgo:9, atKey:'water_deep' },
  { userEmail:'minho@dreamcloud.dev', title:'Whale in the Port',
    content:'A blue whale in Busan harbor, moving with impossible patience between container ships. The ships gave way. No one panicked. The whale moved through the port as if it had business there, which maybe it did. It looked at me once.',
    category:BE, visibility:L, tags:['whale','busan','port','korea','ocean'], hoursAgo:144, atKey:'ocean_surface' },
  { userEmail:'minho@dreamcloud.dev', title:'The Current Beneath',
    content:'Sitting on Haeundae Beach and feeling the deep ocean currents below the surface — not waves, the slow deep rivers in the sea. I could feel where they came from: the Arctic, the equator. I felt, for the first time, that I understood the ocean\'s weather.',
    category:NO, visibility:L, tags:['current','ocean','busan','korea','depth'], hoursAgo:408, atKey:'ocean_surface' },

  // ── Regular: Egypt, Morocco, Greece, Sweden ───────────────────────────────
  { userEmail:'layla@dreamcloud.dev', title:'The Dream of Thoth',
    content:'The god Thoth appeared not as a figure from a painting but as a quality of intelligence in the air. He was interested in what I dreamed about, took notes. At the end he said: "Your people dreamed better when they wrote it down." I agreed and asked him what to write.',
    category:BE, visibility:L, tags:['thoth','egypt','sacred','cairo','god'], hoursAgo:5, atKey:'ancient_sacred' },
  { userEmail:'layla@dreamcloud.dev', title:'Crossing the Nile',
    content:'The Nile in flood season, red with silt. I crossed not by boat but walking on the surface — the way you do when you absolutely have to get somewhere. The crocodiles watched. One nodded.',
    category:NO, visibility:L, tags:['nile','egypt','cairo','crossing','water'], hoursAgo:192, atKey:'water_deep' },
  { userEmail:'layla@dreamcloud.dev', title:'The Temple of Sleep',
    content:'An ancient temple dedicated entirely to dreaming — incubation chambers where petitioners slept to receive guidance. I walked through it as both petitioner and priest. In one chamber I found my own dream waiting for me like a message I had sent myself.',
    category:BE, visibility:L, tags:['temple','egypt','sleep','incubation','sacred'], hoursAgo:528, atKey:'ancient_sacred' },
  { userEmail:'layla@dreamcloud.dev', title:'Stars the Ancient Priests Mapped',
    content:'Standing in the desert outside Cairo, I could see the stars as the ancient priests had seen them — the same stars, but understood differently, as a living document. The stars were not metaphors. They were instructions.',
    category:LU, visibility:L, tags:['stars','egypt','cairo','ancient','lucid','astronomy'], hoursAgo:1248, atKey:'cosmic_awe' },

  { userEmail:'amara@dreamcloud.dev', title:'The Medina at Dusk',
    content:'Marrakech medina at dusk, but slower than real life — every shadow lengthening with deliberate grace. Merchants were packing up in a way that looked like ceremony. The light turned the walls the color of memory. I could smell my childhood in it.',
    category:BE, visibility:L, tags:['medina','marrakech','morocco','dusk','memory'], hoursAgo:7, atKey:'childhood_memory' },
  { userEmail:'amara@dreamcloud.dev', title:'The Storyteller\'s Circle',
    content:'Jemaa el-Fna, but the storytellers were telling dreams — specific dreams, real ones, collected from the crowd. When the storyteller told my dream I hadn\'t yet had, I knew then that dreams can precede themselves.',
    category:NO, visibility:L, tags:['storyteller','marrakech','morocco','circle','dream'], hoursAgo:216, atKey:'collective_signal' },
  { userEmail:'amara@dreamcloud.dev', title:'Colors of the Souk',
    content:'The spice souk at dawn, but every spice glowed its own color. Saffron was gold, obviously, but deeper. Ras el hanout was a constellation of seven colors. I moved through it gathering light on my hands.',
    category:BE, visibility:L, tags:['souk','color','marrakech','morocco','spice'], hoursAgo:552, atKey:'library_wisdom' },

  { userEmail:'elena@dreamcloud.dev', title:'The Oracle Speaks',
    content:'At Delphi, the oracle was still there — the fumes, the trance, the answer that was also a question. She spoke to me in ancient Greek which I understood. The prophecy was about a decision I hadn\'t made yet. I still haven\'t made it. I\'m not sure the prophecy changed anything.',
    category:LU, visibility:L, tags:['oracle','delphi','greece','prophecy','lucid'], hoursAgo:6, atKey:'ancient_sacred' },
  { userEmail:'elena@dreamcloud.dev', title:'Parthenon at Dawn',
    content:'The Parthenon at dawn, but intact — marble white and clean, the painted colors still vivid. Athens spread below it was both ancient and modern simultaneously, layered like geology. I stood at the top and the two cities breathed together.',
    category:BE, visibility:L, tags:['parthenon','athens','greece','dawn','history'], hoursAgo:168, atKey:'time_flow' },
  { userEmail:'elena@dreamcloud.dev', title:'Sea Between Worlds',
    content:'The Aegean between islands — water so blue it was a different substance from other water. The mythology was still alive in it: I could see figures moving below the surface, not fish, not human, the old things. They didn\'t see me.',
    category:BE, visibility:L, tags:['aegean','greece','sea','mythology','athens'], hoursAgo:480, atKey:'ocean_surface' },
  { userEmail:'elena@dreamcloud.dev', title:'The Myth That Came Alive',
    content:'Theseus was real, in the dream. Not mythological — a person, confused, famous for something he barely remembered doing. He was trying to get the bull-headed creature out of his head. "It\'s not a monster," he said. "It was just something I couldn\'t look at directly."',
    category:NO, visibility:L, tags:['theseus','minotaur','greece','myth','psychology'], hoursAgo:1080, atKey:'mirror_identity' },

  { userEmail:'astrid@dreamcloud.dev', title:'Northern Lights Laboratory',
    content:'A laboratory where the northern lights were being studied by catching samples in jars. The scientists were very serious about a thing that was also obviously magic. I helped them label jars: green-7pm, purple-midnight, white-impossible. They thanked me.',
    category:BE, visibility:L, tags:['aurora','stockholm','sweden','science','light'], hoursAgo:8, atKey:'library_wisdom' },
  { userEmail:'astrid@dreamcloud.dev', title:'The Ice Bridge',
    content:'Stockholm in winter and a bridge of ice appeared between the old town and the new — not built, formed, the way ice forms. People crossed it carefully, respectfully. In spring it would melt. Everyone knew this and crossed anyway.',
    category:NO, visibility:L, tags:['ice','bridge','stockholm','sweden','winter'], hoursAgo:168, atKey:'door_search' },
  { userEmail:'astrid@dreamcloud.dev', title:'Midsummer at the Edge',
    content:'Midsommar at the very edge of Sweden, where the sun didn\'t set. I danced with others I didn\'t know around a maypole for what felt like all of time. When I stopped, I understood something about circularity that I lost by morning.',
    category:LU, visibility:L, tags:['midsummer','sweden','sun','dance','lucid'], hoursAgo:600, atKey:'sky_freedom' },

  // ── Regular: Australia, Indonesia ─────────────────────────────────────────
  { userEmail:'noah@dreamcloud.dev', title:'Surfer\'s Paradise Below',
    content:'The perfect wave, but underground — a wave moving through stone beneath the ocean floor. I surfed it through solid rock, the stone parting around me like water would. At the end of the ride I surfaced into a sea that didn\'t exist anywhere I knew.',
    category:BE, visibility:L, tags:['surf','sydney','australia','underground','wave'], hoursAgo:4, atKey:'water_deep' },
  { userEmail:'noah@dreamcloud.dev', title:'Great Reef as Home',
    content:'I lived on the reef — not diving it but living in it, like fish do. The coral was the city. Color everywhere. I knew my neighbors. When I woke I had to remind myself I breathe air.',
    category:BE, visibility:L, tags:['reef','australia','ocean','home','coral'], hoursAgo:96, atKey:'ocean_surface' },
  { userEmail:'noah@dreamcloud.dev', title:'Riding the Southern Swell',
    content:'A swell coming all the way from Antarctica — I could feel its origin, the cold clean water, the distance it had traveled. I caught it off Sydney heads and rode it further than any wave had ever gone. It carried news from the southern pole.',
    category:LU, visibility:L, tags:['swell','surf','sydney','australia','lucid','ocean'], hoursAgo:384, atKey:'sky_freedom' },
  { userEmail:'noah@dreamcloud.dev', title:'Red Center Calling',
    content:'Uluru in the dream but I had never visited. It was calling — not dramatically, the way a mountain calls, just by being. I walked toward it for the entire dream and it didn\'t get closer. The walking was the point. The red earth under my feet was warm.',
    category:NO, visibility:L, tags:['uluru','australia','outback','sacred','calling'], hoursAgo:912, atKey:'ancient_sacred' },

  { userEmail:'isabelle@dreamcloud.dev', title:'Language of Sadness',
    content:'Every language in the world, simultaneously, expressing sadness. They didn\'t compete — they harmonized. Each language had a different color of sadness: Japanese a grey-blue, Spanish a dark red, Turkish a gold-brown. All of them together were something I don\'t have a word for.',
    category:NO, visibility:L, tags:['language','sadness','melbourne','australia','emotion'], hoursAgo:10, atKey:'collective_signal' },
  { userEmail:'isabelle@dreamcloud.dev', title:'Room Between Sessions',
    content:'The waiting room between therapy sessions — where clients sit before and after. In the dream I could see the residue of every session that had happened there: fragments of what had been said, pieces of what had been felt, left in the air like perfume.',
    category:LU, visibility:L, tags:['therapy','room','melbourne','australia','residue'], hoursAgo:192, atKey:'void_contemplation' },
  { userEmail:'isabelle@dreamcloud.dev', title:'Client Who Was Not There',
    content:'A session with a client who was invisible. I could hear them, feel their presence, respond to them. By the end of the session something had shifted in the empty chair. When it was over, they left and I sat alone with the shift they\'d left behind.',
    category:NO, visibility:L, tags:['therapy','invisible','melbourne','australia','absence'], hoursAgo:528, atKey:'void_contemplation' },
  { userEmail:'isabelle@dreamcloud.dev', title:'Healing in the Dream',
    content:'A client I had seen for years appeared in my dream, healed — not in the sense of resolved, but in the sense of whole. They showed me what whole looked like from the inside. I woke knowing something about what I was working toward with them, without being able to explain it.',
    category:BE, visibility:L, tags:['healing','therapy','melbourne','australia','whole'], hoursAgo:1200, atKey:'reunion_tender' },

  { userEmail:'made@dreamcloud.dev', title:'Ceremony Between Worlds',
    content:'An odalan ceremony at a sea temple in Bali — but the temple extended into the ocean, its inner courtyards submerged, fish swimming where priests moved. Both the above-water and below-water ceremonies were happening simultaneously and both were correct.',
    category:BE, visibility:L, tags:['ceremony','bali','indonesia','temple','ocean'], hoursAgo:5, atKey:'ancient_sacred' },
  { userEmail:'made@dreamcloud.dev', title:'Temple at the Volcano',
    content:'Pura Besakih on Agung, but the volcano was active and the temple was in ceremony. The priests moved through smoke and ash without fear. The god and the volcano were the same thing. I brought my offering and the mountain acknowledged it.',
    category:NO, visibility:L, tags:['volcano','temple','bali','indonesia','agung'], hoursAgo:192, atKey:'ancient_sacred' },
  { userEmail:'made@dreamcloud.dev', title:'Rice Paddies and Stars',
    content:'Lying in a rice paddy in Ubud at night, the water reflecting stars. The rice grew visibly, I could watch it. The stars moved in the water. I was between two skies: the real one above and the reflected one below, each as real as the other.',
    category:BE, visibility:L, tags:['rice','stars','bali','indonesia','ubud','sky'], hoursAgo:480, atKey:'cosmic_awe' },
  { userEmail:'made@dreamcloud.dev', title:'The Offering',
    content:'Making a canang sari for someone I couldn\'t see. Each flower chosen with attention. When I placed it on the ground it disappeared — not blown away, simply accepted. I made another. And another. Each disappeared. I understood this is the whole point.',
    category:NO, visibility:F, tags:['offering','bali','indonesia','ritual','impermanence'], hoursAgo:1008, atKey:'void_contemplation' },
];

// ─── Dream Cluster Definitions ────────────────────────────────────────────────

// ─── Follow Graph ─────────────────────────────────────────────────────────────
// [followerEmail, followingEmail]
const V2_FOLLOWS: [string, string][] = [
  // ahmet follows 16 → veterans + global power users
  ['ahmet@dreamcloud.dev','lena@dreamcloud.dev'],
  ['ahmet@dreamcloud.dev','sarah@dreamcloud.dev'],
  ['ahmet@dreamcloud.dev','yuki@dreamcloud.dev'],
  ['ahmet@dreamcloud.dev','priya@dreamcloud.dev'],
  ['ahmet@dreamcloud.dev','ayse@dreamcloud.dev'],
  ['ahmet@dreamcloud.dev','burak@dreamcloud.dev'],
  ['ahmet@dreamcloud.dev','fatma@dreamcloud.dev'],
  ['ahmet@dreamcloud.dev','emre@dreamcloud.dev'],
  ['ahmet@dreamcloud.dev','felix@dreamcloud.dev'],
  ['ahmet@dreamcloud.dev','oliver@dreamcloud.dev'],
  ['ahmet@dreamcloud.dev','giulia@dreamcloud.dev'],
  ['ahmet@dreamcloud.dev','elena@dreamcloud.dev'],
  ['ahmet@dreamcloud.dev','arjun@dreamcloud.dev'],
  ['ahmet@dreamcloud.dev','maria@dreamcloud.dev'],
  ['ahmet@dreamcloud.dev','jiyeon@dreamcloud.dev'],
  ['ahmet@dreamcloud.dev','made@dreamcloud.dev'],
  // lena follows intellectuals + cross-culture
  ['lena@dreamcloud.dev','sarah@dreamcloud.dev'],
  ['lena@dreamcloud.dev','yuki@dreamcloud.dev'],
  ['lena@dreamcloud.dev','priya@dreamcloud.dev'],
  ['lena@dreamcloud.dev','oliver@dreamcloud.dev'],
  ['lena@dreamcloud.dev','william@dreamcloud.dev'],
  ['lena@dreamcloud.dev','giulia@dreamcloud.dev'],
  ['lena@dreamcloud.dev','emily@dreamcloud.dev'],
  ['lena@dreamcloud.dev','elena@dreamcloud.dev'],
  ['lena@dreamcloud.dev','camille@dreamcloud.dev'],
  ['lena@dreamcloud.dev','astrid@dreamcloud.dev'],
  // sarah follows explorers
  ['sarah@dreamcloud.dev','lena@dreamcloud.dev'],
  ['sarah@dreamcloud.dev','yuki@dreamcloud.dev'],
  ['sarah@dreamcloud.dev','priya@dreamcloud.dev'],
  ['sarah@dreamcloud.dev','noah@dreamcloud.dev'],
  ['sarah@dreamcloud.dev','emily@dreamcloud.dev'],
  ['sarah@dreamcloud.dev','ryan@dreamcloud.dev'],
  ['sarah@dreamcloud.dev','lucas@dreamcloud.dev'],
  ['sarah@dreamcloud.dev','jiyeon@dreamcloud.dev'],
  ['sarah@dreamcloud.dev','minho@dreamcloud.dev'],
  ['sarah@dreamcloud.dev','made@dreamcloud.dev'],
  // yuki follows Asian community + veterans
  ['yuki@dreamcloud.dev','lena@dreamcloud.dev'],
  ['yuki@dreamcloud.dev','sarah@dreamcloud.dev'],
  ['yuki@dreamcloud.dev','priya@dreamcloud.dev'],
  ['yuki@dreamcloud.dev','kenji@dreamcloud.dev'],
  ['yuki@dreamcloud.dev','sakura@dreamcloud.dev'],
  ['yuki@dreamcloud.dev','jiyeon@dreamcloud.dev'],
  ['yuki@dreamcloud.dev','minho@dreamcloud.dev'],
  ['yuki@dreamcloud.dev','made@dreamcloud.dev'],
  ['yuki@dreamcloud.dev','arjun@dreamcloud.dev'],
  // priya follows spiritual seekers
  ['priya@dreamcloud.dev','lena@dreamcloud.dev'],
  ['priya@dreamcloud.dev','sarah@dreamcloud.dev'],
  ['priya@dreamcloud.dev','yuki@dreamcloud.dev'],
  ['priya@dreamcloud.dev','arjun@dreamcloud.dev'],
  ['priya@dreamcloud.dev','made@dreamcloud.dev'],
  ['priya@dreamcloud.dev','layla@dreamcloud.dev'],
  ['priya@dreamcloud.dev','amara@dreamcloud.dev'],
  ['priya@dreamcloud.dev','giulia@dreamcloud.dev'],
  ['priya@dreamcloud.dev','emily@dreamcloud.dev'],
  // Europe cross-connections
  ['felix@dreamcloud.dev','lena@dreamcloud.dev'],
  ['felix@dreamcloud.dev','arjun@dreamcloud.dev'],
  ['felix@dreamcloud.dev','kenji@dreamcloud.dev'],
  ['felix@dreamcloud.dev','jiyeon@dreamcloud.dev'],
  ['felix@dreamcloud.dev','sarah@dreamcloud.dev'],
  ['hannah@dreamcloud.dev','lena@dreamcloud.dev'],
  ['hannah@dreamcloud.dev','camille@dreamcloud.dev'],
  ['hannah@dreamcloud.dev','giulia@dreamcloud.dev'],
  ['hannah@dreamcloud.dev','marco@dreamcloud.dev'],
  ['hannah@dreamcloud.dev','astrid@dreamcloud.dev'],
  ['oliver@dreamcloud.dev','lena@dreamcloud.dev'],
  ['oliver@dreamcloud.dev','william@dreamcloud.dev'],
  ['oliver@dreamcloud.dev','charlotte@dreamcloud.dev'],
  ['oliver@dreamcloud.dev','sarah@dreamcloud.dev'],
  ['oliver@dreamcloud.dev','yuki@dreamcloud.dev'],
  ['charlotte@dreamcloud.dev','oliver@dreamcloud.dev'],
  ['charlotte@dreamcloud.dev','lena@dreamcloud.dev'],
  ['charlotte@dreamcloud.dev','priya@dreamcloud.dev'],
  ['charlotte@dreamcloud.dev','elena@dreamcloud.dev'],
  ['william@dreamcloud.dev','lena@dreamcloud.dev'],
  ['william@dreamcloud.dev','oliver@dreamcloud.dev'],
  ['william@dreamcloud.dev','sarah@dreamcloud.dev'],
  ['william@dreamcloud.dev','giulia@dreamcloud.dev'],
  ['camille@dreamcloud.dev','lena@dreamcloud.dev'],
  ['camille@dreamcloud.dev','hannah@dreamcloud.dev'],
  ['camille@dreamcloud.dev','giulia@dreamcloud.dev'],
  ['camille@dreamcloud.dev','sofia@dreamcloud.dev'],
  ['pierre@dreamcloud.dev','camille@dreamcloud.dev'],
  ['pierre@dreamcloud.dev','carlos@dreamcloud.dev'],
  ['pierre@dreamcloud.dev','lena@dreamcloud.dev'],
  // Asia
  ['kenji@dreamcloud.dev','yuki@dreamcloud.dev'],
  ['kenji@dreamcloud.dev','jiyeon@dreamcloud.dev'],
  ['kenji@dreamcloud.dev','sarah@dreamcloud.dev'],
  ['kenji@dreamcloud.dev','felix@dreamcloud.dev'],
  ['sakura@dreamcloud.dev','yuki@dreamcloud.dev'],
  ['sakura@dreamcloud.dev','priya@dreamcloud.dev'],
  ['sakura@dreamcloud.dev','made@dreamcloud.dev'],
  ['sakura@dreamcloud.dev','lena@dreamcloud.dev'],
  ['jiyeon@dreamcloud.dev','yuki@dreamcloud.dev'],
  ['jiyeon@dreamcloud.dev','kenji@dreamcloud.dev'],
  ['jiyeon@dreamcloud.dev','sarah@dreamcloud.dev'],
  ['jiyeon@dreamcloud.dev','lena@dreamcloud.dev'],
  ['minho@dreamcloud.dev','jiyeon@dreamcloud.dev'],
  ['minho@dreamcloud.dev','noah@dreamcloud.dev'],
  ['minho@dreamcloud.dev','sarah@dreamcloud.dev'],
  ['minho@dreamcloud.dev','yuki@dreamcloud.dev'],
  // Americas
  ['maria@dreamcloud.dev','lucas@dreamcloud.dev'],
  ['maria@dreamcloud.dev','sarah@dreamcloud.dev'],
  ['maria@dreamcloud.dev','made@dreamcloud.dev'],
  ['maria@dreamcloud.dev','valentina@dreamcloud.dev'],
  ['lucas@dreamcloud.dev','maria@dreamcloud.dev'],
  ['lucas@dreamcloud.dev','sarah@dreamcloud.dev'],
  ['lucas@dreamcloud.dev','noah@dreamcloud.dev'],
  ['lucas@dreamcloud.dev','valentina@dreamcloud.dev'],
  ['valentina@dreamcloud.dev','priya@dreamcloud.dev'],
  ['valentina@dreamcloud.dev','maria@dreamcloud.dev'],
  ['valentina@dreamcloud.dev','layla@dreamcloud.dev'],
  ['valentina@dreamcloud.dev','amara@dreamcloud.dev'],
  ['diego@dreamcloud.dev','valentina@dreamcloud.dev'],
  ['diego@dreamcloud.dev','camille@dreamcloud.dev'],
  ['diego@dreamcloud.dev','hannah@dreamcloud.dev'],
  ['diego@dreamcloud.dev','lena@dreamcloud.dev'],
  ['arjun@dreamcloud.dev','priya@dreamcloud.dev'],
  ['arjun@dreamcloud.dev','felix@dreamcloud.dev'],
  ['arjun@dreamcloud.dev','sarah@dreamcloud.dev'],
  ['arjun@dreamcloud.dev','kenji@dreamcloud.dev'],
  ['arjun@dreamcloud.dev','emily@dreamcloud.dev'],
  ['emily@dreamcloud.dev','sarah@dreamcloud.dev'],
  ['emily@dreamcloud.dev','lena@dreamcloud.dev'],
  ['emily@dreamcloud.dev','giulia@dreamcloud.dev'],
  ['emily@dreamcloud.dev','isabelle@dreamcloud.dev'],
  ['emily@dreamcloud.dev','william@dreamcloud.dev'],
  ['ryan@dreamcloud.dev','sarah@dreamcloud.dev'],
  ['ryan@dreamcloud.dev','noah@dreamcloud.dev'],
  ['ryan@dreamcloud.dev','lucas@dreamcloud.dev'],
  // Iberian + Italian
  ['sofia@dreamcloud.dev','camille@dreamcloud.dev'],
  ['sofia@dreamcloud.dev','lena@dreamcloud.dev'],
  ['sofia@dreamcloud.dev','giulia@dreamcloud.dev'],
  ['sofia@dreamcloud.dev','priya@dreamcloud.dev'],
  ['carlos@dreamcloud.dev','sofia@dreamcloud.dev'],
  ['carlos@dreamcloud.dev','jan@dreamcloud.dev'],
  ['carlos@dreamcloud.dev','felix@dreamcloud.dev'],
  ['carlos@dreamcloud.dev','lena@dreamcloud.dev'],
  ['giulia@dreamcloud.dev','lena@dreamcloud.dev'],
  ['giulia@dreamcloud.dev','priya@dreamcloud.dev'],
  ['giulia@dreamcloud.dev','emily@dreamcloud.dev'],
  ['giulia@dreamcloud.dev','isabelle@dreamcloud.dev'],
  ['marco@dreamcloud.dev','giulia@dreamcloud.dev'],
  ['marco@dreamcloud.dev','camille@dreamcloud.dev'],
  ['marco@dreamcloud.dev','hannah@dreamcloud.dev'],
  ['marco@dreamcloud.dev','sofia@dreamcloud.dev'],
  // Netherlands
  ['anna@dreamcloud.dev','lena@dreamcloud.dev'],
  ['anna@dreamcloud.dev','camille@dreamcloud.dev'],
  ['anna@dreamcloud.dev','jan@dreamcloud.dev'],
  ['jan@dreamcloud.dev','anna@dreamcloud.dev'],
  ['jan@dreamcloud.dev','carlos@dreamcloud.dev'],
  ['jan@dreamcloud.dev','felix@dreamcloud.dev'],
  // MENA + Scandinavia + Greece
  ['layla@dreamcloud.dev','priya@dreamcloud.dev'],
  ['layla@dreamcloud.dev','amara@dreamcloud.dev'],
  ['layla@dreamcloud.dev','elena@dreamcloud.dev'],
  ['layla@dreamcloud.dev','lena@dreamcloud.dev'],
  ['amara@dreamcloud.dev','layla@dreamcloud.dev'],
  ['amara@dreamcloud.dev','priya@dreamcloud.dev'],
  ['amara@dreamcloud.dev','valentina@dreamcloud.dev'],
  ['elena@dreamcloud.dev','lena@dreamcloud.dev'],
  ['elena@dreamcloud.dev','priya@dreamcloud.dev'],
  ['elena@dreamcloud.dev','giulia@dreamcloud.dev'],
  ['elena@dreamcloud.dev','layla@dreamcloud.dev'],
  ['astrid@dreamcloud.dev','lena@dreamcloud.dev'],
  ['astrid@dreamcloud.dev','sarah@dreamcloud.dev'],
  ['astrid@dreamcloud.dev','anna@dreamcloud.dev'],
  ['astrid@dreamcloud.dev','emily@dreamcloud.dev'],
  // Oceania + SE Asia
  ['noah@dreamcloud.dev','sarah@dreamcloud.dev'],
  ['noah@dreamcloud.dev','ryan@dreamcloud.dev'],
  ['noah@dreamcloud.dev','minho@dreamcloud.dev'],
  ['noah@dreamcloud.dev','lucas@dreamcloud.dev'],
  ['isabelle@dreamcloud.dev','emily@dreamcloud.dev'],
  ['isabelle@dreamcloud.dev','giulia@dreamcloud.dev'],
  ['isabelle@dreamcloud.dev','lena@dreamcloud.dev'],
  ['isabelle@dreamcloud.dev','priya@dreamcloud.dev'],
  ['made@dreamcloud.dev','priya@dreamcloud.dev'],
  ['made@dreamcloud.dev','yuki@dreamcloud.dev'],
  ['made@dreamcloud.dev','sakura@dreamcloud.dev'],
  ['made@dreamcloud.dev','layla@dreamcloud.dev'],
  // Turkish community
  ['ayse@dreamcloud.dev','ahmet@dreamcloud.dev'],
  ['ayse@dreamcloud.dev','burak@dreamcloud.dev'],
  ['ayse@dreamcloud.dev','fatma@dreamcloud.dev'],
  ['burak@dreamcloud.dev','ahmet@dreamcloud.dev'],
  ['burak@dreamcloud.dev','emre@dreamcloud.dev'],
  ['burak@dreamcloud.dev','ayse@dreamcloud.dev'],
  ['fatma@dreamcloud.dev','ahmet@dreamcloud.dev'],
  ['fatma@dreamcloud.dev','ayse@dreamcloud.dev'],
  ['emre@dreamcloud.dev','ahmet@dreamcloud.dev'],
  ['emre@dreamcloud.dev','burak@dreamcloud.dev'],
  ['emre@dreamcloud.dev','noah@dreamcloud.dev'],
  // ahmet's 22 followers (extra)
  ['felix@dreamcloud.dev','ahmet@dreamcloud.dev'],
  ['hannah@dreamcloud.dev','ahmet@dreamcloud.dev'],
  ['oliver@dreamcloud.dev','ahmet@dreamcloud.dev'],
  ['camille@dreamcloud.dev','ahmet@dreamcloud.dev'],
  ['kenji@dreamcloud.dev','ahmet@dreamcloud.dev'],
  ['maria@dreamcloud.dev','ahmet@dreamcloud.dev'],
  ['sofia@dreamcloud.dev','ahmet@dreamcloud.dev'],
  ['giulia@dreamcloud.dev','ahmet@dreamcloud.dev'],
  ['elena@dreamcloud.dev','ahmet@dreamcloud.dev'],
  ['layla@dreamcloud.dev','ahmet@dreamcloud.dev'],
  ['valentina@dreamcloud.dev','ahmet@dreamcloud.dev'],
  ['made@dreamcloud.dev','ahmet@dreamcloud.dev'],
];

// ─── Comment Pools ────────────────────────────────────────────────────────────
const COMMENTS_EN = [
  'This mirrors something I dreamed last month almost exactly.',
  'The detail about the light is what stays with me.',
  'Water in dreams almost always means something deeper is moving.',
  'I\'ve had the labyrinth too. Did yours have an exit?',
  'The way you described this is precise. That\'s the hardest part.',
  'This feels like a threshold dream. Something is shifting.',
  'Your dreams have such clarity. Mine are fragments.',
  'The mirror is doing something important here.',
  'This resonates. The ocean does this to me too.',
  'Three times I\'ve had a version of this and never known what to do with it.',
  'There\'s something about the light in this that I recognize.',
  'Sent this to my sister. She had the same dream last week.',
  'I\'ve been thinking about this one all day.',
  'The ancestor thing is so real. Mine show up in markets.',
  'Your forest dreams and my forest dreams should meet.',
  'The figure at the edge shows up in my dreams too.',
  'This is the clearest description of that feeling I\'ve ever read.',
  'I dream of cities underwater too. Never flooded — just submerged and peaceful.',
  'The way memory works in dreams is so different from waking memory.',
  'I\'ve never been able to describe this. You just did.',
];
const COMMENTS_TR = [
  'Bu rüyayı geçen hafta ben de gördüm, neredeyse birebir aynı.',
  'Işığı nasıl tarif ettiğin çok güzel.',
  'Sudaki o his beni de çok yakalıyor.',
  'Atalar rüyalarda hep önemli yerlerde çıkıyor.',
  'Bu eşik rüyası — bir şeyler değişiyor hayatında.',
  'Benzer bir labirentte ben de kayboldum, çıkış olmadan uyandım.',
  'Seni anlıyorum tam olarak. Kelimeye dökemiyorum ama tanıyorum.',
  'Bu duyguyu çok iyi biliyorum — kontrol kaybı ama özgürlük gibi.',
  'İstanbul rüyaları farklı bir şey taşıyor hep.',
  'Ayna motifi bende de var. Yüzüm hiç doğru çıkmıyor.',
  'Büyükbabam da böyle geliyor rüyalarıma — hiç yaşlanmış olmadan.',
  'Şehir rüyaları hep benliğimizin haritası.',
  'Bunu okuduğumda neden ağladım?',
  'Rüyanı sabah ilk okuyunca o his geri geldi.',
  'Bu tam da anlayamadığım ama çok iyi bildiğim o hissin adı.',
];

// ─── Cluster Definitions ──────────────────────────────────────────────────────
interface ClusterDef {
  slug: string; name: string; description: string;
  primaryTheme: string; primarySymbol: string;
  primaryEmotion: string; primaryArchetype: string;
  strengthScore: number;
}

const CLUSTER_DEFS: ClusterDef[] = [
  { slug: 'su-ve-derinlik',          name: 'Su ve Derinlik',          description: 'Okyanuslar, göller ve derin sulardan doğan rüyaların buluşma noktası.',              primaryTheme: 'transformation', primarySymbol: 'flood',    primaryEmotion: 'wonder',          primaryArchetype: 'Explorer',   strengthScore: 87 },
  { slug: 'ucus-ve-ozgurluk',        name: 'Uçuş ve Özgürlük',        description: 'Gökyüzünde süzülmenin ve sınırsız özgürlüğün paylaşıldığı alan.',                   primaryTheme: 'freedom',         primarySymbol: 'flying',   primaryEmotion: 'joy',             primaryArchetype: 'Wanderer',   strengthScore: 93 },
  { slug: 'karanlik-ve-kacis',       name: 'Karanlık ve Kaçış',       description: 'Gece kâbuslarının ve bilinmeyenden kaçışın ortak dili.',                             primaryTheme: 'fear',            primarySymbol: 'shadow',   primaryEmotion: 'dread',           primaryArchetype: 'Shadow',     strengthScore: 78 },
  { slug: 'donusum-ve-yeniden-dogus',name: 'Dönüşüm',                 description: 'Eski benliğin bırakıldığı ve yeninin doğduğu rüya kümesi.',                         primaryTheme: 'rebirth',         primarySymbol: 'fire',     primaryEmotion: 'intensity',       primaryArchetype: 'Seeker',     strengthScore: 85 },
  { slug: 'eski-ev-ve-bellek',       name: 'Eski Ev ve Bellek',       description: 'Çocukluğun ve geçmişin kapılarını yeniden açan nostalji rüyaları.',                  primaryTheme: 'nostalgia',       primarySymbol: 'old house',primaryEmotion: 'warmth',          primaryArchetype: 'Child',      strengthScore: 82 },
  { slug: 'labirent-ve-arayis',      name: 'Labirent ve Arayış',      description: 'Anlam ve çıkış arayan bilinçaltının karanlık koridorları.',                          primaryTheme: 'searching',       primarySymbol: 'labyrinth',primaryEmotion: 'curiosity',       primaryArchetype: 'Observer',   strengthScore: 79 },
  { slug: 'zaman-ve-tarih',          name: 'Zaman ve Tarih',          description: 'Geçmişe yolculuk eden, tarihin katmanlarını keşfeden rüyalar.',                      primaryTheme: 'memory',          primarySymbol: 'train',    primaryEmotion: 'bittersweet',     primaryArchetype: 'Wise Elder', strengthScore: 74 },
  { slug: 'orman-ve-doga',           name: 'Orman ve Doğa',           description: 'Vahşi doğanın gizemli sesi — orman yolları, hayvanlar ve dönüşüm.',                 primaryTheme: 'journey',         primarySymbol: 'forest',   primaryEmotion: 'wonder',          primaryArchetype: 'Guardian',   strengthScore: 80 },
  { slug: 'uzay-ve-sonsuzluk',       name: 'Uzay ve Sonsuzluk',       description: 'Yıldızlara dokunulan, evrenle bütünleşilen kozmik rüya deneyimleri.',               primaryTheme: 'awakening',       primarySymbol: 'moon',     primaryEmotion: 'awe',             primaryArchetype: 'Explorer',   strengthScore: 89 },
  { slug: 'sehir-ve-kaybolmak',      name: 'Şehir ve Kaybolmak',      description: 'Modern şehrin labirentinde kaybolan, yabancılık hissini paylaşan rüyalar.',         primaryTheme: 'loss',            primarySymbol: 'city',     primaryEmotion: 'disorientation',  primaryArchetype: 'Stranger',   strengthScore: 76 },
];

// ─── Main Seed Function ───────────────────────────────────────────────────────

async function seed(ds: DataSource): Promise<void> {
  const qr = ds.createQueryRunner();
  await qr.connect();

  console.log('\n🌙  DreamCloud Seed V2 — starting\n');

  // ── Phase 1: Patch existing V1 users with city/country + DiceBear avatars ──
  console.log('Phase 1: Patching V1 users…');
  for (const [email, cityName] of Object.entries(EXISTING_USER_CITIES)) {
    const city = CITIES[cityName];
    if (!city) continue;
    const user = await ds.getRepository(User).findOne({ where: { email } });
    if (!user) continue;
    await ds.getRepository(UserProfile).update({ userId: user.id }, {
      avatarUrl: av(user.username),
      locationCity: cityName,
      locationCountry: city.country,
    });
  }

  // ── Phase 2: Create 42 new users ─────────────────────────────────────────
  console.log('Phase 2: Creating new users…');
  const hashedPw = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userMap: Record<string, User> = {};

  // Pre-load existing users
  const allExisting = await ds.getRepository(User).find();
  for (const u of allExisting) userMap[u.email] = u;

  for (const u of NEW_USERS) {
    if (userMap[u.email]) continue;
    const city = CITIES[u.city];
    const user = ds.getRepository(User).create({
      email: u.email, username: u.username,
      passwordHash: hashedPw,
      isEmailVerified: true, isActive: true,
      role: 'user',
    });
    await ds.getRepository(User).save(user);
    userMap[u.email] = user;

    const profile = ds.getRepository(UserProfile).create({
      userId: user.id,
      displayName: u.displayName,
      bio: u.bio,
      avatarUrl: av(u.username),
      locationCity: u.city,
      locationCountry: city?.country ?? u.city,
      isPublic: true,
    });
    await ds.getRepository(UserProfile).save(profile);
  }
  console.log(`  → ${Object.keys(userMap).length} total users in map`);

  // ── Phase 3: Create dreams via raw SQL (timestamp control) ───────────────
  console.log('Phase 3: Inserting dreams…');
  const dreamMap: Record<string, string> = {}; // email:title → dreamId

  for (const ds_ of DREAM_SEEDS) {
    const user = userMap[ds_.userEmail];
    if (!user) { console.warn(`  ⚠ No user for ${ds_.userEmail}`); continue; }

    const createdAt = hoursAgo(ds_.hoursAgo);
    const tagArr = `{${[...ds_.tags, V2_TAG].map(t => `"${t}"`).join(',')}}`;

    const existing = await qr.query(
      `SELECT id FROM dreams WHERE user_id=$1 AND title=$2 LIMIT 1`,
      [user.id, ds_.title],
    );
    if (existing.length > 0) {
      dreamMap[`${ds_.userEmail}:${ds_.title}`] = existing[0].id;
      continue;
    }

    const res = await qr.query(
      `INSERT INTO dreams (user_id,title,content,category,visibility,is_draft,tags,like_count,save_count,comment_count,match_count,is_moderated,is_hidden,dreamed_at,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,false,$6,0,0,0,0,false,false,$7,$7,$7)
       RETURNING id`,
      [user.id, ds_.title, ds_.content, ds_.category, ds_.visibility, tagArr, createdAt],
    );
    dreamMap[`${ds_.userEmail}:${ds_.title}`] = res[0].id;
  }
  console.log(`  → ${Object.keys(dreamMap).length} dreams processed`);

  // ── Phase 4: Create dream_analyses for all V2 dreams ─────────────────────
  console.log('Phase 4: Creating analyses…');
  for (const ds_ of DREAM_SEEDS) {
    const dreamId = dreamMap[`${ds_.userEmail}:${ds_.title}`];
    if (!dreamId) continue;
    const at = ANALYSIS_TEMPLATES[ds_.atKey];
    if (!at) continue;

    const exists = await ds.getRepository(DreamAnalysis)
      .findOne({ where: { dreamId } });
    if (exists) continue;

    const analysis = ds.getRepository(DreamAnalysis).create({
      dreamId,
      status: AnalysisStatus.COMPLETED,
      primaryTheme: at.primaryTheme,
      primaryEmotion: at.primaryEmotion,
      emotionalIntensity: at.intensity,
      emotionalArc: { from: at.arcFrom, to: at.arcTo },
      residualEmotion: at.residual,
      modelVersion: MODEL_VER,
    });
    await ds.getRepository(DreamAnalysis).save(analysis);

    // Sub-entities: dreamId references dreams.id (NOT analysis.id per DB FK)
    for (const [theme, family, isPrimary, confidence] of at.themes) {
      const t = ds.getRepository(DreamTheme).create({
        dreamId, theme, themeFamily: family, isPrimary, confidence,
      });
      await ds.getRepository(DreamTheme).save(t);
    }

    for (const [emotion, intensity, isPrimary, isResidual, arcPosition] of at.emotions) {
      const e = ds.getRepository(DreamEmotion).create({
        dreamId, emotion, intensity, isPrimary, isResidual,
        arcPosition: arcPosition ?? null,
      });
      await ds.getRepository(DreamEmotion).save(e);
    }

    for (const [symbolCategory, manifestation, narrativeFunction, isUniversal] of at.symbols) {
      const s = ds.getRepository(DreamSymbol).create({
        dreamId, symbolCategory, manifestation, narrativeFunction, isUniversal,
      });
      await ds.getRepository(DreamSymbol).save(s);
    }

    if (at.figure) {
      const [figureType, isKnown, relationshipType, archetypeCandidate, archetypeConfidence, qualityDescriptors, narrativeRole] = at.figure;
      const f = ds.getRepository(DreamFigure).create({
        dreamId,
        figureType: figureType ?? 'unknown',
        isKnown: isKnown ?? false,
        relationshipType: relationshipType ?? null,
        archetypeCandidate: archetypeCandidate ?? null,
        archetypeConfidence: archetypeConfidence ?? null,
        qualityDescriptors: qualityDescriptors ?? [],
        narrativeRole: narrativeRole ?? null,
      });
      await ds.getRepository(DreamFigure).save(f);
    }

    if (at.location) {
      const [locationTier, name, locationType, archetypeType, emotionalTone, isDistorted, geographicHint] = at.location;
      const l = ds.getRepository(DreamLocation).create({
        dreamId,
        locationTier: locationTier ?? 2,
        name: name ?? null,
        locationType: locationType ?? null,
        archetypeType: archetypeType ?? null,
        emotionalTone: emotionalTone ?? null,
        isDistorted: isDistorted ?? false,
        geographicHint: geographicHint ?? null,
      });
      await ds.getRepository(DreamLocation).save(l);
    }
  }

  // ── Phase 5: Dream Places (GPS) ──────────────────────────────────────────
  console.log('Phase 5: Creating dream_places…');
  // Pair dreams that mention real cities with GPS coords
  // [email, dreamTitle, placeName, placeType, lat, lon, city|undefined, country|undefined]
  const PLACE_DREAMS: [string, string, string, DreamPlaceType, number, number, string | undefined, string | undefined][] = [
    ['ahmet@dreamcloud.dev','Atalarım','İstanbul Bazaarı',DreamPlaceType.CITY,41.0082,28.9784,'Istanbul','Turkey'],
    ['ahmet@dreamcloud.dev','Yangın İçinde Şehir','İstanbul',DreamPlaceType.CITY,41.0082,28.9784,'Istanbul','Turkey'],
    ['ahmet@dreamcloud.dev','Gece Treni','İstanbul Gece Treni',DreamPlaceType.CITY,41.0082,28.9784,'Istanbul','Turkey'],
    ['lena@dreamcloud.dev','White City','White City',DreamPlaceType.CITY,52.5200,13.4050,'Berlin','Germany'],
    ['sarah@dreamcloud.dev','Starfield Navigation','Los Angeles',DreamPlaceType.CITY,34.0522,-118.2437,'Los Angeles','United States'],
    ['yuki@dreamcloud.dev','Edo and Neon','Tokyo',DreamPlaceType.CITY,35.6762,139.6503,'Tokyo','Japan'],
    ['yuki@dreamcloud.dev','Digital Temple','Kyoto Temple',DreamPlaceType.LANDMARK,35.0116,135.7681,'Kyoto','Japan'],
    ['priya@dreamcloud.dev','River Without Shore','Ganges River',DreamPlaceType.NATURE,25.3176,82.9739,undefined,'India'],
    ['priya@dreamcloud.dev','The Cosmic Dance','Mumbai',DreamPlaceType.CITY,19.0760,72.8777,'Mumbai','India'],
    ['ayse@dreamcloud.dev','Ankara Kalesi\'nde Gece','Ankara Kalesi',DreamPlaceType.LANDMARK,39.9333,32.8597,'Ankara','Turkey'],
    ['burak@dreamcloud.dev','Körfezde Yüzmek','İzmir Körfezi',DreamPlaceType.NATURE,38.4192,27.1287,'İzmir','Turkey'],
    ['burak@dreamcloud.dev','Agora\'da Tek Başına','İzmir Agorası',DreamPlaceType.LANDMARK,38.4167,27.1333,'İzmir','Turkey'],
    ['emre@dreamcloud.dev','Akdeniz\'de Yelken','Antalya Körfezi',DreamPlaceType.NATURE,36.8969,30.7133,'Antalya','Turkey'],
    ['emre@dreamcloud.dev','Antik Tiyatro','Aspendos',DreamPlaceType.LANDMARK,36.9414,31.1669,undefined,'Turkey'],
    ['fatma@dreamcloud.dev','Tarihi Han','Bursa Kapalıçarşı',DreamPlaceType.BUILDING,40.1828,29.0670,'Bursa','Turkey'],
    ['felix@dreamcloud.dev','The Bavarian Castle','Neuschwanstein',DreamPlaceType.LANDMARK,47.5576,10.7498,undefined,'Germany'],
    ['felix@dreamcloud.dev','Fog Over the River','Munich Isar',DreamPlaceType.NATURE,48.1351,11.5820,'Munich','Germany'],
    ['hannah@dreamcloud.dev','The Harbor at Midnight','Hamburg Harbor',DreamPlaceType.CITY,53.5435,9.9660,'Hamburg','Germany'],
    ['oliver@dreamcloud.dev','Fog on the Thames','River Thames',DreamPlaceType.NATURE,51.5033,-0.1195,'London','United Kingdom'],
    ['william@dreamcloud.dev','The Castle in Rain','Edinburgh Castle',DreamPlaceType.LANDMARK,55.9486,-3.1999,'Edinburgh','United Kingdom'],
    ['william@dreamcloud.dev','The Loch and the Mirror','Scottish Loch',DreamPlaceType.NATURE,57.0000,-4.0000,undefined,'United Kingdom'],
    ['camille@dreamcloud.dev','Le Musée Silencieux','Louvre Museum',DreamPlaceType.LANDMARK,48.8606,2.3376,'Paris','France'],
    ['camille@dreamcloud.dev','La Seine la Nuit','River Seine',DreamPlaceType.NATURE,48.8566,2.3522,'Paris','France'],
    ['pierre@dreamcloud.dev','Running Through Markets','Marché Croix-Rousse',DreamPlaceType.CITY,45.7640,4.8357,'Lyon','France'],
    ['kenji@dreamcloud.dev','Neon Ghost','Dotonbori',DreamPlaceType.CITY,34.6687,135.5027,'Osaka','Japan'],
    ['sakura@dreamcloud.dev','Temple in Moonlight','Fushimi Inari',DreamPlaceType.LANDMARK,34.9671,135.7727,'Kyoto','Japan'],
    ['maria@dreamcloud.dev','A Cidade que Dorme','São Paulo',DreamPlaceType.CITY,-23.5505,-46.6333,'São Paulo','Brazil'],
    ['lucas@dreamcloud.dev','Music from the Favela Sky','Rio de Janeiro',DreamPlaceType.CITY,-22.9068,-43.1729,'Rio de Janeiro','Brazil'],
    ['arjun@dreamcloud.dev','Mumbai in My Sleep','Mumbai',DreamPlaceType.CITY,19.0760,72.8777,'Mumbai','India'],
    ['sofia@dreamcloud.dev','El Espejo del Prado','Museo del Prado',DreamPlaceType.LANDMARK,40.4138,-3.6921,'Madrid','Spain'],
    ['carlos@dreamcloud.dev','Cathedral Dream','Barcelona Cathedral',DreamPlaceType.LANDMARK,41.3838,2.1761,'Barcelona','Spain'],
    ['carlos@dreamcloud.dev','Sea Level Rising','Barcelona Coast',DreamPlaceType.NATURE,41.3851,2.1734,'Barcelona','Spain'],
    ['giulia@dreamcloud.dev','The Forum Under Stars','Roman Forum',DreamPlaceType.LANDMARK,41.8924,12.4853,'Rome','Italy'],
    ['giulia@dreamcloud.dev','The Colosseum Empty','Colosseum',DreamPlaceType.LANDMARK,41.8902,12.4922,'Rome','Italy'],
    ['emily@dreamcloud.dev','The Sleep Lab Dream','Toronto Sleep Lab',DreamPlaceType.BUILDING,43.6532,-79.3832,'Toronto','Canada'],
    ['ryan@dreamcloud.dev','Mountain That Moved','Vancouver Mountain',DreamPlaceType.NATURE,49.2827,-123.1207,'Vancouver','Canada'],
    ['anna@dreamcloud.dev','Cycling Through Canals at Night','Amsterdam Canals',DreamPlaceType.CITY,52.3676,4.9041,'Amsterdam','Netherlands'],
    ['valentina@dreamcloud.dev','El Mercado Flotante','Tenochtitlan',DreamPlaceType.LANDMARK,19.4326,-99.1332,'Mexico City','Mexico'],
    ['valentina@dreamcloud.dev','La Pirámide Habla','Teotihuacán',DreamPlaceType.LANDMARK,19.6920,-98.8437,undefined,'Mexico'],
    ['jiyeon@dreamcloud.dev','K-Dream Mirror City','Seoul Underground',DreamPlaceType.CITY,37.5665,126.9780,'Seoul','South Korea'],
    ['minho@dreamcloud.dev','Whale in the Port','Busan Harbor',DreamPlaceType.CITY,35.1028,129.0403,'Busan','South Korea'],
    ['layla@dreamcloud.dev','The Temple of Sleep','Cairo Temple',DreamPlaceType.LANDMARK,29.9773,31.1325,'Cairo','Egypt'],
    ['layla@dreamcloud.dev','Stars the Ancient Priests Mapped','Cairo Desert',DreamPlaceType.NATURE,29.9792,31.1342,'Cairo','Egypt'],
    ['amara@dreamcloud.dev','The Medina at Dusk','Marrakech Medina',DreamPlaceType.CITY,31.6295,-7.9811,'Marrakech','Morocco'],
    ['elena@dreamcloud.dev','Parthenon at Dawn','Parthenon',DreamPlaceType.LANDMARK,37.9715,23.7267,'Athens','Greece'],
    ['elena@dreamcloud.dev','Sea Between Worlds','Aegean Sea',DreamPlaceType.NATURE,37.5000,24.0000,undefined,'Greece'],
    ['astrid@dreamcloud.dev','The Ice Bridge','Stockholm Ice Bridge',DreamPlaceType.CITY,59.3293,18.0686,'Stockholm','Sweden'],
    ['noah@dreamcloud.dev','Great Reef as Home','Great Barrier Reef',DreamPlaceType.NATURE,-18.2871,147.6992,undefined,'Australia'],
    ['isabelle@dreamcloud.dev','Language of Sadness','Melbourne',DreamPlaceType.CITY,-37.8136,144.9631,'Melbourne','Australia'],
    ['made@dreamcloud.dev','Ceremony Between Worlds','Tanah Lot',DreamPlaceType.LANDMARK,-8.5202,115.2630,undefined,'Indonesia'],
    ['made@dreamcloud.dev','Temple at the Volcano','Pura Besakih',DreamPlaceType.LANDMARK,-8.3405,115.5082,undefined,'Indonesia'],
  ];

  for (const [email, title, placeName, placeType, lat, lon, placeCity, placeCountry] of PLACE_DREAMS) {
    const dreamId = dreamMap[`${email}:${title}`];
    if (!dreamId) continue;
    const user = userMap[email];
    if (!user) continue;
    const exists = await ds.getRepository(DreamPlace)
      .findOne({ where: { dreamId, name: placeName } });
    if (exists) continue;
    const place = ds.getRepository(DreamPlace).create({
      dreamId, userId: user.id,
      name: placeName,
      type: placeType,
      latitude: lat, longitude: lon,
      city: placeCity ?? null,
      country: placeCountry ?? null,
      confidence: 90,
    });
    await ds.getRepository(DreamPlace).save(place);
  }

  // ── Phase 6: Dream Clusters ───────────────────────────────────────────────
  console.log('Phase 6: Creating clusters…');
  const clusterMap: Record<string, DreamCluster> = {};
  for (const cd of CLUSTER_DEFS) {
    let cluster = await ds.getRepository(DreamCluster)
      .findOne({ where: { slug: cd.slug } });
    if (!cluster) {
      cluster = ds.getRepository(DreamCluster).create({
        slug: cd.slug, name: cd.name, description: cd.description,
        primaryTheme: cd.primaryTheme, primarySymbol: cd.primarySymbol,
        primaryEmotion: cd.primaryEmotion, primaryArchetype: cd.primaryArchetype,
        strengthScore: cd.strengthScore, memberCount: 0,
      });
      await ds.getRepository(DreamCluster).save(cluster);
    }
    clusterMap[cd.slug] = cluster;
  }

  // ── Phase 7: Cluster Members ──────────────────────────────────────────────
  console.log('Phase 7: Assigning cluster members…');
  const CLUSTER_MEMBERS: [string, string[]][] = [
    ['su-ve-derinlik',       ['lena@dreamcloud.dev','sarah@dreamcloud.dev','priya@dreamcloud.dev','minho@dreamcloud.dev','noah@dreamcloud.dev','burak@dreamcloud.dev','emre@dreamcloud.dev','anna@dreamcloud.dev','made@dreamcloud.dev','maria@dreamcloud.dev']],
    ['ucus-ve-ozgurluk',     ['sarah@dreamcloud.dev','yuki@dreamcloud.dev','lucas@dreamcloud.dev','ryan@dreamcloud.dev','astrid@dreamcloud.dev','ayse@dreamcloud.dev','pierre@dreamcloud.dev','priya@dreamcloud.dev','noah@dreamcloud.dev','valentina@dreamcloud.dev']],
    ['karanlik-ve-kacis',    ['ahmet@dreamcloud.dev','felix@dreamcloud.dev','kenji@dreamcloud.dev','jiyeon@dreamcloud.dev','fatma@dreamcloud.dev','burak@dreamcloud.dev','diego@dreamcloud.dev','arjun@dreamcloud.dev']],
    ['donusum-ve-yeniden-dogus',['ahmet@dreamcloud.dev','priya@dreamcloud.dev','yuki@dreamcloud.dev','valentina@dreamcloud.dev','layla@dreamcloud.dev','sakura@dreamcloud.dev','maria@dreamcloud.dev','made@dreamcloud.dev']],
    ['eski-ev-ve-bellek',    ['lena@dreamcloud.dev','yuki@dreamcloud.dev','fatma@dreamcloud.dev','amara@dreamcloud.dev','burak@dreamcloud.dev','charlotte@dreamcloud.dev','giulia@dreamcloud.dev','diego@dreamcloud.dev']],
    ['labirent-ve-arayis',   ['lena@dreamcloud.dev','felix@dreamcloud.dev','anna@dreamcloud.dev','oliver@dreamcloud.dev','william@dreamcloud.dev','jiyeon@dreamcloud.dev','minho@dreamcloud.dev','carlos@dreamcloud.dev']],
    ['zaman-ve-tarih',       ['ahmet@dreamcloud.dev','yuki@dreamcloud.dev','valentina@dreamcloud.dev','layla@dreamcloud.dev','ayse@dreamcloud.dev','oliver@dreamcloud.dev','pierre@dreamcloud.dev','elena@dreamcloud.dev']],
    ['orman-ve-doga',        ['lena@dreamcloud.dev','sarah@dreamcloud.dev','yuki@dreamcloud.dev','made@dreamcloud.dev','noah@dreamcloud.dev','ryan@dreamcloud.dev','sakura@dreamcloud.dev','fatma@dreamcloud.dev']],
    ['uzay-ve-sonsuzluk',    ['sarah@dreamcloud.dev','priya@dreamcloud.dev','lena@dreamcloud.dev','arjun@dreamcloud.dev','emily@dreamcloud.dev','astrid@dreamcloud.dev','made@dreamcloud.dev','lucas@dreamcloud.dev']],
    ['sehir-ve-kaybolmak',   ['ahmet@dreamcloud.dev','kenji@dreamcloud.dev','jiyeon@dreamcloud.dev','carlos@dreamcloud.dev','camille@dreamcloud.dev','sofia@dreamcloud.dev','pierre@dreamcloud.dev','arjun@dreamcloud.dev']],
  ];

  for (const [slug, emails] of CLUSTER_MEMBERS) {
    const cluster = clusterMap[slug];
    if (!cluster) continue;
    let count = 0;
    for (const email of emails) {
      const user = userMap[email];
      if (!user) continue;
      const exists = await ds.getRepository(DreamClusterMember)
        .findOne({ where: { clusterId: cluster.id, userId: user.id } });
      if (exists) { count++; continue; }
      const member = ds.getRepository(DreamClusterMember).create({
        clusterId: cluster.id, userId: user.id,
        joinedAt: daysAgo(Math.floor(Math.random() * 30)),
      });
      await ds.getRepository(DreamClusterMember).save(member);
      count++;
    }
    await ds.getRepository(DreamCluster).update(cluster.id, { memberCount: count });
  }

  // ── Phase 8: Dream Identities ─────────────────────────────────────────────
  console.log('Phase 8: Creating dream identities…');
  const allUsers = Object.values(userMap);
  for (let i = 0; i < allUsers.length; i++) {
    const user = allUsers[i];
    if (!user) continue;
    const exists = await ds.getRepository(DreamIdentity)
      .findOne({ where: { userId: user.id } });
    if (exists) continue;
    const primaryArchetype = ARCHETYPES[i % ARCHETYPES.length] ?? 'Observer';
    const identity = ds.getRepository(DreamIdentity).create({
      userId: user.id,
      primaryArchetype,
      secondaryArchetype: ARCHETYPES[(i + 3) % ARCHETYPES.length] ?? 'Seeker',
      dominantThemes: pickN(THEMES, 2),
      dominantEmotions: ['wonder', 'curiosity', 'peace', 'unease', 'joy'].slice(i % 3, (i % 3) + 2),
      dominantSymbols: pickN(SYMBOLS, 3),
      dominantLocations: ['city', 'forest', 'ocean', 'sky', 'unknown'].slice(i % 3, (i % 3) + 2),
      dominantArchetypes: [primaryArchetype],
      lucidScore: i % 5 === 0 ? 75 : 20,
      resonanceScore: 40 + (i % 4) * 10,
    });
    await ds.getRepository(DreamIdentity).save(identity);
  }

  // ── Phase 9: Follow Relationships ────────────────────────────────────────
  console.log('Phase 9: Creating follows…');
  for (const [followerEmail, followingEmail] of V2_FOLLOWS) {
    const follower = userMap[followerEmail];
    const following = userMap[followingEmail];
    if (!follower || !following) continue;
    const exists = await ds.getRepository(UserFollow)
      .findOne({ where: { followerId: follower.id, followingId: following.id } });
    if (exists) continue;
    const follow = ds.getRepository(UserFollow).create({
      followerId: follower.id,
      followingId: following.id,
    });
    await ds.getRepository(UserFollow).save(follow);
  }

  // ── Phase 10: Likes, Saves, Comments ─────────────────────────────────────
  console.log('Phase 10: Creating likes, saves, comments…');
  const allDreamIds = Object.values(dreamMap);
  const allUserList = Object.values(userMap);

  // Sample: each new dream gets 3-8 likes and 1-3 comments
  for (const dreamId of allDreamIds) {
    const likers = pickN(allUserList, 3 + Math.floor(Math.random() * 6));
    for (const liker of likers) {
      const existsL = await ds.getRepository(DreamLike)
        .findOne({ where: { dreamId, userId: liker.id } });
      if (!existsL) {
        const like = ds.getRepository(DreamLike).create({ dreamId, userId: liker.id });
        await ds.getRepository(DreamLike).save(like);
      }
    }

    const savers = pickN(allUserList, 1 + Math.floor(Math.random() * 3));
    for (const saver of savers) {
      const existsS = await ds.getRepository(DreamSave)
        .findOne({ where: { dreamId, userId: saver.id } });
      if (!existsS) {
        const save = ds.getRepository(DreamSave).create({ dreamId, userId: saver.id });
        await ds.getRepository(DreamSave).save(save);
      }
    }

    const commenters = pickN(allUserList, 1 + Math.floor(Math.random() * 3));
    for (const commenter of commenters) {
      const pool = COMMENTS_EN;
      const text = pool[Math.floor(Math.random() * pool.length)] ?? pool[0]!;
      const comment = ds.getRepository(DreamComment).create({
        dreamId, userId: commenter.id, content: text,
      });
      await ds.getRepository(DreamComment).save(comment);
    }
  }

  // ── Phase 11: Dream Connections (resonant pairs) ──────────────────────────
  console.log('Phase 11: Creating dream connections…');
  type DCLevel = 'signal' | 'resonance' | 'strong' | 'deep' | 'mirror';
  const RESONANT_PAIRS: [string, string, DCLevel][] = [
    ['lena@dreamcloud.dev',     'sarah@dreamcloud.dev',    'deep'],
    ['lena@dreamcloud.dev',     'william@dreamcloud.dev',  'strong'],
    ['sarah@dreamcloud.dev',    'yuki@dreamcloud.dev',     'resonance'],
    ['yuki@dreamcloud.dev',     'sakura@dreamcloud.dev',   'deep'],
    ['priya@dreamcloud.dev',    'made@dreamcloud.dev',     'mirror'],
    ['priya@dreamcloud.dev',    'layla@dreamcloud.dev',    'strong'],
    ['ahmet@dreamcloud.dev',    'lena@dreamcloud.dev',     'resonance'],
    ['ahmet@dreamcloud.dev',    'yuki@dreamcloud.dev',     'signal'],
    ['felix@dreamcloud.dev',    'arjun@dreamcloud.dev',    'strong'],
    ['julia@dreamcloud.dev',    'emily@dreamcloud.dev',    'resonance'],
    ['giulia@dreamcloud.dev',   'emily@dreamcloud.dev',    'resonance'],
    ['valentina@dreamcloud.dev','amara@dreamcloud.dev',    'strong'],
    ['jiyeon@dreamcloud.dev',   'kenji@dreamcloud.dev',    'deep'],
    ['noah@dreamcloud.dev',     'minho@dreamcloud.dev',    'resonance'],
    ['lucas@dreamcloud.dev',    'maria@dreamcloud.dev',    'deep'],
    ['camille@dreamcloud.dev',  'sofia@dreamcloud.dev',    'signal'],
    ['carlos@dreamcloud.dev',   'jan@dreamcloud.dev',      'signal'],
    ['astrid@dreamcloud.dev',   'anna@dreamcloud.dev',     'resonance'],
    ['elena@dreamcloud.dev',    'layla@dreamcloud.dev',    'strong'],
    ['isabelle@dreamcloud.dev', 'giulia@dreamcloud.dev',   'resonance'],
    ['oliver@dreamcloud.dev',   'charlotte@dreamcloud.dev','signal'],
    ['diego@dreamcloud.dev',    'hannah@dreamcloud.dev',   'signal'],
    ['made@dreamcloud.dev',     'sakura@dreamcloud.dev',   'strong'],
    ['ryan@dreamcloud.dev',     'noah@dreamcloud.dev',     'deep'],
    ['pierre@dreamcloud.dev',   'camille@dreamcloud.dev',  'signal'],
  ];

  const now = new Date();
  for (const [emailA, emailB, level] of RESONANT_PAIRS) {
    const ua = userMap[emailA];
    const ub = userMap[emailB];
    if (!ua || !ub) continue;
    const [first, second] = ua.id < ub.id ? [ua, ub] : [ub, ua];
    const exists = await ds.getRepository(DreamConnection).findOne({
      where: { userIdA: first.id, userIdB: second.id },
    });
    if (exists) continue;
    const conn = ds.getRepository(DreamConnection).create({
      userIdA: first.id, userIdB: second.id,
      level,
      connectionScore: { signal:20, resonance:45, strong:65, deep:82, mirror:95 }[level] ?? 20,
      firstSeenAt: daysAgo(30 + Math.floor(Math.random() * 60)),
      lastSeenAt: now,
    });
    await ds.getRepository(DreamConnection).save(conn);
  }

  // ── Phase 12: Sync Counts ─────────────────────────────────────────────────
  console.log('Phase 12: Syncing counts…');
  await qr.query(`
    UPDATE user_profiles p
    SET dream_count     = (SELECT COUNT(*) FROM dreams d   WHERE d.user_id    = p.user_id),
        follower_count  = (SELECT COUNT(*) FROM user_follows uf WHERE uf.following_id = p.user_id),
        following_count = (SELECT COUNT(*) FROM user_follows uf WHERE uf.follower_id  = p.user_id)
  `);
  await qr.query(`
    UPDATE dreams d
    SET like_count    = (SELECT COUNT(*) FROM dream_likes    WHERE dream_id = d.id),
        save_count    = (SELECT COUNT(*) FROM dream_saves    WHERE dream_id = d.id),
        comment_count = (SELECT COUNT(*) FROM dream_comments WHERE dream_id = d.id AND deleted_at IS NULL)
  `);

  await qr.release();

  // ── Summary ───────────────────────────────────────────────────────────────
  const [userCount]       = await ds.query('SELECT COUNT(*) FROM users');
  const [dreamCount]      = await ds.query('SELECT COUNT(*) FROM dreams');
  const [analysisCount]   = await ds.query('SELECT COUNT(*) FROM dream_analyses');
  const [followCount]     = await ds.query('SELECT COUNT(*) FROM user_follows');
  const [clusterCount]    = await ds.query('SELECT COUNT(*) FROM dream_clusters');
  const [identityCount]   = await ds.query('SELECT COUNT(*) FROM dream_identities');
  const [placeCount]      = await ds.query('SELECT COUNT(*) FROM dream_places');
  const [connectionCount] = await ds.query('SELECT COUNT(*) FROM dream_connections');

  console.log('\n✅  Seed V2 complete:\n');
  console.log(`   users:            ${userCount.count}`);
  console.log(`   dreams:           ${dreamCount.count}`);
  console.log(`   analyses:         ${analysisCount.count}`);
  console.log(`   follows:          ${followCount.count}`);
  console.log(`   clusters:         ${clusterCount.count}`);
  console.log(`   identities:       ${identityCount.count}`);
  console.log(`   places:           ${placeCount.count}`);
  console.log(`   connections:      ${connectionCount.count}`);
  console.log('\n   Sample veteran dreamers:');
  console.log('   • ahmet@dreamcloud.dev  — Istanbul, 10 new dreams');
  console.log('   • lena@dreamcloud.dev   — Berlin, 12 dreams');
  console.log('   • sarah@dreamcloud.dev  — Los Angeles, 12 dreams');
  console.log('   • yuki@dreamcloud.dev   — Tokyo, 10 dreams');
  console.log('   • priya@dreamcloud.dev  — Mumbai, 10 dreams');
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function main() {
  let ds: DataSource | null = null;
  try {
    ds = await AppDataSource.initialize();
    await seed(ds);
  } catch (err) {
    console.error('❌  Seed V2 failed:', err);
    process.exit(1);
  } finally {
    if (ds?.isInitialized) await ds.destroy();
  }
}

main();
