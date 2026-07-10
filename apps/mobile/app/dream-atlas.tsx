import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueries } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import {
  getAtlasLucid,
  getAtlasNightmares,
  getAtlasPeaceful,
  getAtlasSymbols,
  getAtlasTrending,
  getAtlasWorld,
} from '@/api/atlas.api';
import { getAllClusters } from '@/api/clusters.api';
import type { AtlasPlace, AtlasSymbol, AtlasTrending, AtlasWorld } from '@/types/atlas.types';
import type { DreamCluster } from '@/types/cluster.types';

const STALE  = 10 * 60 * 1000;
const { width: SCREEN_W } = Dimensions.get('window');
const MAP_W  = SCREEN_W - 32;
const MAP_H  = 240;

// ── Palette ───────────────────────────────────────────────────────────────────

const C = {
  peaceful:  '#34D399',
  nightmare: '#F87171',
  lucid:     '#C084FC',
  symbol:    '#FBBF24',
  trending:  '#60A5FA',
  cluster:   '#A78BFA',
};

// ── Geo positioning ───────────────────────────────────────────────────────────
// Approximate world-map coordinates (0-1 relative) keyed by lowercase country name

const COUNTRY_POS: Record<string, [number, number]> = {
  // Americas
  'usa': [0.16, 0.33], 'abd': [0.16, 0.33], 'united states': [0.16, 0.33],
  'canada': [0.17, 0.21], 'kanada': [0.17, 0.21],
  'brazil': [0.25, 0.63], 'brezilya': [0.25, 0.63],
  'mexico': [0.16, 0.44], 'meksika': [0.16, 0.44],
  'argentina': [0.22, 0.78], 'arjantin': [0.22, 0.78],
  'colombia': [0.21, 0.55], 'kolombiya': [0.21, 0.55],
  // Europe
  'turkey': [0.57, 0.38], 'türkiye': [0.57, 0.38],
  'uk': [0.44, 0.27], 'united kingdom': [0.44, 0.27], 'ingiltere': [0.44, 0.27],
  'france': [0.46, 0.33], 'fransa': [0.46, 0.33],
  'germany': [0.50, 0.28], 'almanya': [0.50, 0.28],
  'italy': [0.50, 0.38], 'italya': [0.50, 0.38],
  'spain': [0.43, 0.37], 'ispanya': [0.43, 0.37],
  'netherlands': [0.47, 0.27], 'hollanda': [0.47, 0.27],
  'sweden': [0.51, 0.18], 'isveç': [0.51, 0.18],
  'norway': [0.49, 0.17], 'norveç': [0.49, 0.17],
  'russia': [0.66, 0.21], 'rusya': [0.66, 0.21],
  'poland': [0.53, 0.27], 'polonya': [0.53, 0.27],
  'portugal': [0.41, 0.37], 'portekiz': [0.41, 0.37],
  'greece': [0.54, 0.40], 'yunanistan': [0.54, 0.40],
  'switzerland': [0.49, 0.32], 'isviçre': [0.49, 0.32],
  'austria': [0.51, 0.32], 'avusturya': [0.51, 0.32],
  'belgium': [0.47, 0.29], 'belçika': [0.47, 0.29],
  'denmark': [0.50, 0.23], 'danimarka': [0.50, 0.23],
  'finland': [0.54, 0.17], 'finlandiya': [0.54, 0.17],
  // Middle East / N. Africa
  'uae': [0.64, 0.43], 'bae': [0.64, 0.43],
  'saudi arabia': [0.62, 0.43], 'suudi arabistan': [0.62, 0.43],
  'egypt': [0.57, 0.44], 'mısır': [0.57, 0.44],
  'israel': [0.58, 0.40], 'israil': [0.58, 0.40],
  'iran': [0.64, 0.38], 'morocco': [0.44, 0.42], 'fas': [0.44, 0.42],
  // Asia
  'india': [0.68, 0.44], 'hindistan': [0.68, 0.44],
  'china': [0.76, 0.33], 'çin': [0.76, 0.33],
  'japan': [0.85, 0.33], 'japonya': [0.85, 0.33],
  'south korea': [0.82, 0.32], 'güney kore': [0.82, 0.32],
  'thailand': [0.75, 0.46], 'tayland': [0.75, 0.46],
  'singapore': [0.77, 0.53], 'singapur': [0.77, 0.53],
  'indonesia': [0.78, 0.56], 'endonezya': [0.78, 0.56],
  'vietnam': [0.77, 0.48], 'pakistan': [0.67, 0.40], 'bangladesh': [0.70, 0.43],
  'malaysia': [0.76, 0.51], 'malezya': [0.76, 0.51],
  // Africa
  'south africa': [0.55, 0.70], 'güney afrika': [0.55, 0.70],
  'nigeria': [0.50, 0.56], 'nijerya': [0.50, 0.56],
  'kenya': [0.58, 0.58], 'ethiopia': [0.59, 0.54],
  // Oceania
  'australia': [0.84, 0.69], 'avustralya': [0.84, 0.69],
  'new zealand': [0.91, 0.75], 'yeni zelanda': [0.91, 0.75],
};

function nameHash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function cityPos(name: string, country: string | null): [number, number] {
  const key  = (country ?? '').toLowerCase().trim();
  const base = COUNTRY_POS[key];
  const h    = nameHash(name);
  if (!base) {
    return [0.06 + (h % 88) / 100, 0.10 + ((h >> 5) % 78) / 100];
  }
  return [
    Math.max(0.02, Math.min(0.97, base[0] + ((h % 8) - 4) / 100)),
    Math.max(0.04, Math.min(0.92, base[1] + (((h >> 3) % 8) - 4) / 100)),
  ];
}

function dotRadius(dreamCount: number, maxCount: number): number {
  const ratio = maxCount > 0 ? dreamCount / maxCount : 0;
  return 4 + Math.round(ratio * 13); // 4-17px
}

// ── Place quality types ───────────────────────────────────────────────────────

type PlaceQuality = 'peaceful' | 'nightmare' | 'lucid';

interface EnrichedPlace extends AtlasPlace {
  quality:  PlaceQuality;
  qualityColor: string;
}

function enrichPlaces(
  peaceful:   AtlasPlace[],
  nightmares: AtlasPlace[],
  lucid:      AtlasPlace[],
): EnrichedPlace[] {
  const map = new Map<string, EnrichedPlace>();

  const add = (arr: AtlasPlace[], quality: PlaceQuality, color: string) => {
    arr.forEach(p => {
      const existing = map.get(p.name);
      if (!existing || p.score > existing.score) {
        map.set(p.name, { ...p, quality, qualityColor: color });
      }
    });
  };

  add(peaceful,   'peaceful',  C.peaceful);
  add(nightmares, 'nightmare', C.nightmare);
  add(lucid,      'lucid',     C.lucid);

  return [...map.values()].sort((a, b) => b.dreamCount - a.dreamCount);
}

// ── Atlas layer tabs ──────────────────────────────────────────────────────────

type AtlasLayer = 'dunya' | 'sehirler' | 'koridor' | 'akimlar';

const ATLAS_LAYERS: { key: AtlasLayer; emoji: string; label: string }[] = [
  { key: 'dunya',    emoji: '🌍', label: 'Dünya'      },
  { key: 'sehirler', emoji: '🏙️', label: 'Şehirler'   },
  { key: 'koridor',  emoji: '🔗', label: 'Koridor'    },
  { key: 'akimlar',  emoji: '🌊', label: 'Akımlar'    },
];

function AtlasTabBar({ active, onPress }: { active: AtlasLayer; onPress: (l: AtlasLayer) => void }) {
  return (
    <View style={tb.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tb.scroll}>
        {ATLAS_LAYERS.map(l => {
          const isActive = l.key === active;
          return (
            <Pressable key={l.key} style={tb.tab} onPress={() => onPress(l.key)}>
              <Text style={tb.emoji}>{l.emoji}</Text>
              <Text style={[tb.label, isActive && tb.labelActive]}>{l.label}</Text>
              {isActive && <View style={tb.line} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const tb = StyleSheet.create({
  wrap:       { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  scroll:     { paddingHorizontal: 16, gap: 2 },
  tab:        { paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 7, position: 'relative' },
  emoji:      { fontSize: 14 },
  label:      { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.32)' },
  labelActive:{ color: 'rgba(255,255,255,0.92)', fontWeight: '700' },
  line:       { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: '#A78BFA', borderRadius: 1 },
});

// ── LAYER 1: Living Dream World ───────────────────────────────────────────────

function DreamWorldDot({ place, rx, ry, radius }: {
  place:  EnrichedPlace;
  rx:     number;
  ry:     number;
  radius: number;
}) {
  const left = rx * MAP_W - radius;
  const top  = ry * MAP_H - radius;
  const size = radius * 2;

  return (
    <View
      style={[
        dw.dot,
        {
          left,
          top,
          width:        size,
          height:       size,
          borderRadius: radius,
          backgroundColor: place.qualityColor,
          shadowColor:     place.qualityColor,
        },
      ]}
    />
  );
}

function DreamWorldMap({ places }: { places: EnrichedPlace[] }) {
  const maxCount = Math.max(...places.map(p => p.dreamCount), 1);
  const cities   = places.filter(p => p.type === 'CITY' || p.type === 'COUNTRY').slice(0, 30);

  return (
    <View style={dw.mapContainer}>
      {/* Atmospheric latitude lines */}
      {[0.22, 0.44, 0.66, 0.88].map(y => (
        <View key={y} style={[dw.latLine, { top: y * MAP_H }]} />
      ))}
      {/* Atmosphere glow at equator */}
      <View style={dw.equatorGlow} />

      {/* City dots */}
      {cities.map(p => {
        const [rx, ry] = cityPos(p.name, p.country);
        const radius   = dotRadius(p.dreamCount, maxCount);
        return (
          <DreamWorldDot key={p.name} place={p} rx={rx} ry={ry} radius={radius} />
        );
      })}
    </View>
  );
}

function DunyaTab({ world, places }: { world: AtlasWorld | undefined; places: EnrichedPlace[] }) {
  const topCities = places.filter(p => p.type === 'CITY').slice(0, 5);

  return (
    <View style={dw.wrap}>
      {/* World stats (secondary to the map) */}
      {world && (
        <View style={dw.statsRow}>
          <View style={dw.stat}>
            <Text style={dw.statValue}>{fmtNum(world.totalDreamers)}</Text>
            <Text style={dw.statLabel}>rüyacı aktif</Text>
          </View>
          <View style={dw.statDiv} />
          <View style={dw.stat}>
            <Text style={dw.statValue}>{fmtNum(world.totalDreams)}</Text>
            <Text style={dw.statLabel}>toplam rüya</Text>
          </View>
          <View style={dw.statDiv} />
          <View style={dw.stat}>
            <Text style={dw.statValue}>{fmtNum(world.totalPlaces)}</Text>
            <Text style={dw.statLabel}>aktif yer</Text>
          </View>
        </View>
      )}

      {/* The world map */}
      {places.length > 0 && (
        <View style={dw.mapWrap}>
          <DreamWorldMap places={places} />
          {/* Legend */}
          <View style={dw.legend}>
            {[{ label: 'Huzur', color: C.peaceful }, { label: 'Kabus', color: C.nightmare }, { label: 'Lucid', color: C.lucid }].map(l => (
              <View key={l.label} style={dw.legendItem}>
                <View style={[dw.legendDot, { backgroundColor: l.color }]} />
                <Text style={dw.legendText}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Top active cities tonight */}
      {topCities.length > 0 && (
        <View style={dw.hotspots}>
          <Text style={dw.hotspotsLabel}>BU GECE EN AKTİF</Text>
          {topCities.map((p, i) => (
            <View key={p.name} style={dw.hotspotRow}>
              <Text style={[dw.hotspotRank, { color: p.qualityColor }]}>
                {String(i + 1).padStart(2, '0')}
              </Text>
              <View style={[dw.hotspotDot, { backgroundColor: p.qualityColor }]} />
              <Text style={dw.hotspotName}>{p.name}</Text>
              {p.country && <Text style={dw.hotspotCountry}>{p.country}</Text>}
              <View style={{ flex: 1 }} />
              <Text style={[dw.hotspotCount, { color: p.qualityColor }]}>{p.dreamCount}</Text>
              <Ionicons name="moon-outline" size={9} color={p.qualityColor} />
            </View>
          ))}
        </View>
      )}

      {/* Global emotion pulse */}
      {world && world.topEmotions.length > 0 && (
        <View style={dw.emotionPulse}>
          <Text style={dw.emotionPulseLabel}>KOLEKTİF DUYGU DALGASI</Text>
          <View style={dw.emotionBars}>
            {world.topEmotions.slice(0, 5).map((e, i) => (
              <View key={e.emotion} style={dw.emotionBar}>
                <View
                  style={[
                    dw.emotionBarFill,
                    {
                      height: Math.max(20, (e.percentage / 100) * 80),
                      backgroundColor: `rgba(167,139,250,${0.3 + (i === 0 ? 0.5 : i === 1 ? 0.35 : 0.2)})`,
                    },
                  ]}
                />
                <Text style={dw.emotionBarLabel} numberOfLines={1}>{e.emotion}</Text>
                <Text style={dw.emotionBarPct}>{e.percentage}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Dream ratio breakdown */}
      {world && (world.lucidRatio > 0 || world.nightmareRatio > 0) && (
        <View style={dw.ratios}>
          {world.lucidRatio > 0 && (
            <View style={[dw.ratioPill, { borderColor: `${C.lucid}35`, backgroundColor: `${C.lucid}0A` }]}>
              <Text style={[dw.ratioVal, { color: C.lucid }]}>{world.lucidRatio}%</Text>
              <Text style={dw.ratioLbl}>Lucid</Text>
            </View>
          )}
          {world.beautifulRatio > 0 && (
            <View style={[dw.ratioPill, { borderColor: `${C.peaceful}35`, backgroundColor: `${C.peaceful}0A` }]}>
              <Text style={[dw.ratioVal, { color: C.peaceful }]}>{world.beautifulRatio}%</Text>
              <Text style={dw.ratioLbl}>Huzurlu</Text>
            </View>
          )}
          {world.nightmareRatio > 0 && (
            <View style={[dw.ratioPill, { borderColor: `${C.nightmare}35`, backgroundColor: `${C.nightmare}0A` }]}>
              <Text style={[dw.ratioVal, { color: C.nightmare }]}>{world.nightmareRatio}%</Text>
              <Text style={dw.ratioLbl}>Kabus</Text>
            </View>
          )}
          {world.totalMatches > 0 && (
            <View style={[dw.ratioPill, { borderColor: `${C.cluster}35`, backgroundColor: `${C.cluster}0A` }]}>
              <Text style={[dw.ratioVal, { color: C.cluster }]}>{fmtNum(world.totalMatches)}</Text>
              <Text style={dw.ratioLbl}>Bağlantı</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const dw = StyleSheet.create({
  wrap:       { paddingTop: 20, paddingBottom: 8 },
  statsRow:   { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 18, gap: 0 },
  stat:       { flex: 1, alignItems: 'center', gap: 2 },
  statValue:  { fontSize: 22, fontWeight: '900', color: 'rgba(255,255,255,0.90)' },
  statLabel:  { fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: '700', letterSpacing: 0.5 },
  statDiv:    { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 6 },
  // Map
  mapWrap:    { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', backgroundColor: '#020110' },
  mapContainer: {
    width: MAP_W, height: MAP_H,
    position: 'relative', overflow: 'hidden',
  },
  latLine:    { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(167,139,250,0.08)' },
  equatorGlow:{ position: 'absolute', left: 0, right: 0, top: MAP_H * 0.44 - 20, height: 40, backgroundColor: 'rgba(167,139,250,0.03)' },
  dot: {
    position: 'absolute',
    shadowOpacity: 0.8,
    shadowRadius:  6,
    shadowOffset:  { width: 0, height: 0 },
    elevation:     4,
    opacity:       0.85,
  },
  legend:      { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 6, height: 6, borderRadius: 3 },
  legendText:  { fontSize: 10, color: 'rgba(255,255,255,0.40)', fontWeight: '600' },
  // Hotspots
  hotspots:     { marginTop: 28, paddingHorizontal: 20 },
  hotspotsLabel:{ fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.28)', marginBottom: 14 },
  hotspotRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  hotspotRank:  { fontSize: 11, fontWeight: '900', width: 22 },
  hotspotDot:   { width: 7, height: 7, borderRadius: 3.5 },
  hotspotName:  { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.88)' },
  hotspotCountry:{ fontSize: 10, color: 'rgba(255,255,255,0.32)' },
  hotspotCount: { fontSize: 16, fontWeight: '900' },
  // Emotion bars
  emotionPulse: { marginTop: 28, paddingHorizontal: 20 },
  emotionPulseLabel:{ fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.28)', marginBottom: 14 },
  emotionBars:  { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 100 },
  emotionBar:   { flex: 1, alignItems: 'center', gap: 4 },
  emotionBarFill:{ width: '100%', borderRadius: 6, minHeight: 20 },
  emotionBarLabel:{ fontSize: 8.5, color: 'rgba(255,255,255,0.50)', fontWeight: '600', textAlign: 'center' },
  emotionBarPct:{ fontSize: 9, color: 'rgba(167,139,250,0.70)', fontWeight: '800' },
  // Ratios
  ratios:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginTop: 20 },
  ratioPill:   { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', gap: 2 },
  ratioVal:    { fontSize: 18, fontWeight: '900' },
  ratioLbl:    { fontSize: 9, color: 'rgba(255,255,255,0.38)', fontWeight: '700' },
});

// ── LAYER 2: City Consciousness ───────────────────────────────────────────────

const QUALITY_TR: Record<PlaceQuality, string> = {
  peaceful:  'HUZUR',
  nightmare: 'KABUS',
  lucid:     'LUCİD',
};

const QUALITY_ICON: Record<PlaceQuality, React.ComponentProps<typeof Ionicons>['name']> = {
  peaceful:  'water-outline',
  nightmare: 'thunderstorm-outline',
  lucid:     'eye-outline',
};

function CityConsciousnessCard({ place, onPress }: { place: EnrichedPlace; onPress: () => void }) {
  const color      = place.qualityColor;
  const qualityTR  = QUALITY_TR[place.quality];
  const qualityICO = QUALITY_ICON[place.quality];
  const scoreWidth = `${Math.min(100, Math.max(2, place.score))}%` as `${number}%`;

  return (
    <Pressable style={({ pressed }) => [cc.card, { borderColor: `${color}20`, opacity: pressed ? 0.80 : 1 }]} onPress={onPress}>
      <View style={[cc.topBar, { backgroundColor: color }]} />
      <View style={cc.body}>
        <View style={cc.header}>
          <View style={cc.nameBlock}>
            <Text style={cc.cityName} numberOfLines={1}>{place.name}</Text>
            {place.country && <Text style={cc.country}>{place.country}</Text>}
          </View>
          <View style={[cc.qualityBadge, { backgroundColor: `${color}15`, borderColor: `${color}35` }]}>
            <Ionicons name={qualityICO} size={10} color={color} />
            <Text style={[cc.qualityText, { color }]}>{qualityTR}</Text>
          </View>
        </View>
        <View style={cc.scoreRow}>
          <View style={cc.scoreTrack}>
            <View style={[cc.scoreBar, { width: scoreWidth, backgroundColor: color }]} />
          </View>
          <Text style={[cc.scoreNum, { color }]}>{place.score > 0 ? place.score.toFixed(0) : place.dreamCount}</Text>
        </View>
        <View style={cc.footer}>
          <View style={cc.dreamCount}>
            <Ionicons name="moon-outline" size={10} color="rgba(255,255,255,0.30)" />
            <Text style={cc.dreamText}>{place.dreamCount} rüya</Text>
          </View>
          <View style={cc.enterRow}>
            <Text style={[cc.enterText, { color }]}>Bilince Gir</Text>
            <Ionicons name="arrow-forward" size={11} color={color} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function SehirlerTab({ peaceful, nightmares, lucid, toPlace }: {
  peaceful:   AtlasPlace[];
  nightmares: AtlasPlace[];
  lucid:      AtlasPlace[];
  toPlace:    (name: string) => void;
}) {
  const sections = [
    { title: 'HUZUR BİLİNCİ', sub: 'Bu şehirlerde sakinlik ve dinginlik rüyaları yoğun', data: peaceful,   quality: 'peaceful'  as PlaceQuality },
    { title: 'KABUS MERKEZLERİ', sub: 'Bu şehirlerde kabus aktivitesi bu gece yüksek',       data: nightmares.filter(p => p.score > 0), quality: 'nightmare' as PlaceQuality },
    { title: 'LUCİD ODAKLAR',  sub: 'Bilinçli rüya aktivitesi bu şehirlerde belirgin',     data: lucid.filter(p => p.score > 0),      quality: 'lucid'    as PlaceQuality },
  ].filter(s => s.data.length > 0);

  return (
    <View style={cc.wrap}>
      {sections.map(sec => (
        <View key={sec.title} style={cc.section}>
          <Text style={cc.sectionLabel}>{sec.title}</Text>
          <Text style={cc.sectionSub}>{sec.sub}</Text>
          <View style={cc.cards}>
            {sec.data.map(p => (
              <CityConsciousnessCard
                key={p.name}
                place={{ ...p, quality: sec.quality, qualityColor: C[sec.quality] }}
                onPress={() => toPlace(p.name)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const cc = StyleSheet.create({
  wrap:        { paddingTop: 20, paddingBottom: 8 },
  section:     { marginBottom: 30 },
  sectionLabel:{ fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.28)', paddingHorizontal: 20, marginBottom: 4 },
  sectionSub:  { fontSize: 11, color: 'rgba(255,255,255,0.36)', paddingHorizontal: 20, marginBottom: 14 },
  cards:       { gap: 8, paddingHorizontal: 20 },
  card: {
    backgroundColor: '#04030E', borderRadius: 16, borderWidth: 1, overflow: 'hidden',
  },
  topBar:      { height: 2 },
  body:        { padding: 14, gap: 10 },
  header:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  nameBlock:   { flex: 1, gap: 2 },
  cityName:    { fontSize: 18, fontWeight: '900', color: 'rgba(255,255,255,0.92)', letterSpacing: -0.4 },
  country:     { fontSize: 11, color: 'rgba(255,255,255,0.34)', fontWeight: '500' },
  qualityBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 },
  qualityText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  scoreRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreTrack:  { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  scoreBar:    { height: '100%', borderRadius: 2 },
  scoreNum:    { fontSize: 13, fontWeight: '900', minWidth: 30, textAlign: 'right' },
  footer:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dreamCount:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dreamText:   { fontSize: 11, color: 'rgba(255,255,255,0.32)', fontWeight: '500' },
  enterRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  enterText:   { fontSize: 11, fontWeight: '800' },
});

// ── LAYER 3: Dream Corridors ──────────────────────────────────────────────────

interface Corridor {
  id:     string;
  name:   string;
  sub:    string;
  icon:   string;
  color:  string;
  cities: AtlasPlace[];
}

function buildCorridors(
  peaceful:   AtlasPlace[],
  nightmares: AtlasPlace[],
  lucid:      AtlasPlace[],
  clusters:   DreamCluster[],
): Corridor[] {
  const corridors: Corridor[] = [];

  if (peaceful.length >= 2) corridors.push({
    id:     'peaceful',
    name:   'HUZUR KORIDORU',
    sub:    'Sakinlik ve dinginlik rüyaları bu şehirlerde yankılanıyor. Ortak bir huzur bilinci akar.',
    icon:   '🌊',
    color:  C.peaceful,
    cities: peaceful.slice(0, 5),
  });

  if (nightmares.filter(p => p.score > 0).length >= 2) corridors.push({
    id:     'nightmare',
    name:   'KARANLIK YOLLAR',
    sub:    'Kabus enerjisi bu kentler arasında dolaşıyor. Ortak bir karanlık akım.',
    icon:   '⚡',
    color:  C.nightmare,
    cities: nightmares.filter(p => p.score > 0).slice(0, 5),
  });

  if (lucid.filter(p => p.score > 0).length >= 2) corridors.push({
    id:     'lucid',
    name:   'LUCİD HATTI',
    sub:    'Bilinçli rüya aktivitesi bu şehirleri birleştiriyor. Uyanık bir bilinç hattı.',
    icon:   '👁️',
    color:  C.lucid,
    cities: lucid.filter(p => p.score > 0).slice(0, 5),
  });

  // Cluster-based corridor
  const topClusters = clusters.filter(c => c.memberCount > 1).slice(0, 3);
  if (topClusters.length > 0) corridors.push({
    id:     'constellation',
    name:   'TAKIM YILDIZI HATTI',
    sub:    'Ortak rüya evrenlerinde buluşan toplulukların bağlantı koridoru.',
    icon:   '✨',
    color:  C.cluster,
    cities: [],
  });

  return corridors;
}

function CorridorCityBubble({ place, color }: { place: AtlasPlace; color: string }) {
  return (
    <View style={cor.bubble}>
      <View style={[cor.bubbleDot, { backgroundColor: color }]} />
      <Text style={cor.bubbleName} numberOfLines={1}>{place.name}</Text>
      <Text style={cor.bubbleCount}>{place.dreamCount}</Text>
    </View>
  );
}

function CorridorCard({ corridor, clusters, toPlace, router }: {
  corridor: Corridor;
  clusters: DreamCluster[];
  toPlace:  (name: string) => void;
  router:   ReturnType<typeof useRouter>;
}) {
  const { name, sub, icon, color, cities, id } = corridor;

  return (
    <View style={[cor.card, { borderColor: `${color}22` }]}>
      <View style={[cor.header]}>
        <Text style={cor.icon}>{icon}</Text>
        <View style={cor.headerText}>
          <Text style={[cor.name, { color }]}>{name}</Text>
          <Text style={cor.sub}>{sub}</Text>
        </View>
      </View>

      {/* City flow (non-cluster corridor) */}
      {cities.length > 0 && (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cor.cityFlow}>
            {cities.map((city, i) => (
              <View key={city.name} style={cor.cityFlowItem}>
                <Pressable onPress={() => toPlace(city.name)}>
                  <CorridorCityBubble place={city} color={color} />
                </Pressable>
                {i < cities.length - 1 && (
                  <View style={[cor.connector, { backgroundColor: `${color}40` }]} />
                )}
              </View>
            ))}
          </ScrollView>
          <Text style={[cor.flowLabel, { color: `${color}60` }]}>
            {cities.length} şehir · {cities.reduce((s, c) => s + c.dreamCount, 0)} rüya
          </Text>
        </View>
      )}

      {/* Constellation clusters */}
      {id === 'constellation' && clusters.length > 0 && (
        <View style={cor.clusterList}>
          {clusters.map(cl => (
            <Pressable
              key={cl.id}
              style={({ pressed }) => [cor.clusterRow, { opacity: pressed ? 0.80 : 1 }]}
              onPress={() => router.push({ pathname: '/dream-clusters', params: { id: cl.id } } as any)}
            >
              <View style={[cor.clusterDot, { backgroundColor: `${color}30` }]}>
                <Ionicons name="planet-outline" size={11} color={color} />
              </View>
              <View style={cor.clusterBody}>
                <Text style={cor.clusterName} numberOfLines={1}>{cl.name}</Text>
                <Text style={cor.clusterMeta}>{cl.memberCount} üye · {cl.dreamCount} rüya</Text>
              </View>
              <Ionicons name="chevron-forward" size={13} color={`${color}60`} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function KoridorTab({ peaceful, nightmares, lucid, clusters, toPlace }: {
  peaceful:   AtlasPlace[];
  nightmares: AtlasPlace[];
  lucid:      AtlasPlace[];
  clusters:   DreamCluster[];
  toPlace:    (name: string) => void;
}) {
  const router    = useRouter();
  const corridors = useMemo(
    () => buildCorridors(peaceful, nightmares, lucid, clusters),
    [peaceful, nightmares, lucid, clusters],
  );

  if (corridors.length === 0) return (
    <View style={emptyStyle.wrap}>
      <Ionicons name="git-network-outline" size={36} color="rgba(255,255,255,0.18)" />
      <Text style={emptyStyle.text}>Koridor desenleri oluşuyor</Text>
    </View>
  );

  return (
    <View style={cor.wrap}>
      <Text style={cor.introTitle}>RÜYA KORİDORLARI</Text>
      <Text style={cor.introSub}>
        Kolektif bilinçaltı desenleri, farklı şehirleri görünmez hatlarla birleştirir. Bu koridor boyunca aynı rüyalar akar.
      </Text>
      <View style={cor.list}>
        {corridors.map(c => (
          <CorridorCard
            key={c.id}
            corridor={c}
            clusters={clusters}
            toPlace={toPlace}
            router={router}
          />
        ))}
      </View>
    </View>
  );
}

const cor = StyleSheet.create({
  wrap:        { paddingTop: 20, paddingBottom: 8 },
  introTitle:  { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.28)', paddingHorizontal: 20, marginBottom: 6 },
  introSub:    { fontSize: 12, color: 'rgba(255,255,255,0.42)', paddingHorizontal: 20, marginBottom: 20, lineHeight: 18 },
  list:        { gap: 12, paddingHorizontal: 20 },
  card: {
    backgroundColor: '#04030E', borderRadius: 18, borderWidth: 1, padding: 18, gap: 16,
  },
  header:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon:       { fontSize: 28 },
  headerText: { flex: 1, gap: 4 },
  name:       { fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  sub:        { fontSize: 12, color: 'rgba(255,255,255,0.48)', lineHeight: 18 },
  cityFlow:   { gap: 0, paddingVertical: 4 },
  cityFlowItem:{ flexDirection: 'row', alignItems: 'center' },
  connector:  { width: 24, height: 1.5, marginHorizontal: 4 },
  bubble: {
    alignItems: 'center', gap: 4, minWidth: 64,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 8,
  },
  bubbleDot:  { width: 8, height: 8, borderRadius: 4 },
  bubbleName: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.80)', textAlign: 'center' },
  bubbleCount:{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
  flowLabel:  { fontSize: 9, fontWeight: '700', marginTop: 8 },
  clusterList:{ gap: 8 },
  clusterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clusterDot: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  clusterBody:{ flex: 1 },
  clusterName:{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  clusterMeta:{ fontSize: 10, color: 'rgba(255,255,255,0.35)' },
});

// ── LAYER 4: Consciousness Streams ────────────────────────────────────────────

interface ConsciousnessStream {
  id:          string;
  name:        string;
  desc:        string;
  count:       number;
  percentage:  number;
  color:       string;
  isUniversal: boolean;
  trend:       string;
  trendPct:    number;
}

function buildStreams(
  symbols:  AtlasSymbol[],
  trending: AtlasTrending[],
): ConsciousnessStream[] {
  const streams: ConsciousnessStream[] = [];

  symbols.forEach(s => {
    streams.push({
      id:          `symbol-${s.symbol}`,
      name:        `${s.symbol} AKIMI`,
      desc:        s.exampleManifestation
        ? `"${s.exampleManifestation}"`
        : `${s.symbol} semboli kolektif bilinçte ${s.count} noktada aktif.`,
      count:       s.count,
      percentage:  s.percentage,
      color:       C.symbol,
      isUniversal: s.universalCount > 0,
      trend:       'stable',
      trendPct:    0,
    });
  });

  trending.forEach(t => {
    if (streams.length >= 10) return;
    streams.push({
      id:          `trend-${t.name}`,
      name:        `${t.name} AKIMI`,
      desc:        t.trend === 'new'
        ? `Bu tema kolektif bilinçte bu gece ilk kez yüzeye çıkıyor.`
        : `Bu tema dünya genelinde ${t.trendPct > 0 ? `%${t.trendPct} artışla ` : ''}güçleniyor.`,
      count:       t.count,
      percentage:  0,
      color:       C.trending,
      isUniversal: false,
      trend:       t.trend,
      trendPct:    t.trendPct,
    });
  });

  return streams.slice(0, 10);
}

function ConsciousnessStreamCard({ stream }: { stream: ConsciousnessStream }) {
  const { name, desc, count, percentage, color, isUniversal, trend, trendPct } = stream;
  const barWidth = `${Math.min(100, Math.max(2, percentage))}%` as `${number}%`;
  const isRising = trend === 'rising' || trend === 'new';

  return (
    <View style={[cs.card, { borderColor: `${color}20` }]}>
      <View style={[cs.topBar, { backgroundColor: color }]} />
      <View style={cs.body}>
        <View style={cs.headerRow}>
          <Text style={[cs.streamName, { color }]}>{name}</Text>
          <View style={cs.badges}>
            {isUniversal && (
              <View style={[cs.badge, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
                <Ionicons name="globe-outline" size={9} color={color} />
                <Text style={[cs.badgeText, { color }]}>EVRENSEL</Text>
              </View>
            )}
            {trend === 'new' && (
              <View style={[cs.badge, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
                <Text style={[cs.badgeText, { color }]}>YENİ</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={cs.desc}>{desc}</Text>
        <View style={cs.stats}>
          <Text style={cs.count}>{count} nokta</Text>
          {isRising && trendPct > 0 && (
            <View style={cs.trendRow}>
              <Ionicons name="trending-up" size={10} color="#34D399" />
              <Text style={cs.trendText}>+{trendPct}%</Text>
            </View>
          )}
        </View>
        {percentage > 0 && (
          <View style={cs.barWrap}>
            <View style={cs.barTrack}>
              <View style={[cs.barFill, { width: barWidth, backgroundColor: color }]} />
            </View>
            <Text style={[cs.barPct, { color }]}>{percentage}%</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function AkimlarTab({ symbols, trending }: { symbols: AtlasSymbol[]; trending: AtlasTrending[] }) {
  const streams = useMemo(() => buildStreams(symbols, trending), [symbols, trending]);

  if (streams.length === 0) return (
    <View style={emptyStyle.wrap}>
      <Ionicons name="water-outline" size={36} color="rgba(255,255,255,0.18)" />
      <Text style={emptyStyle.text}>Bilinçaltı akımları oluşuyor</Text>
    </View>
  );

  return (
    <View style={cs.wrap}>
      <Text style={cs.introTitle}>BİLİNÇALTI AKIMLARI</Text>
      <Text style={cs.introSub}>
        Kolektif bilinçaltının derinliklerinde akan bu güçler, insanlığın ortak rüya desenlerini şekillendiriyor.
      </Text>
      <View style={cs.list}>
        {streams.map(s => <ConsciousnessStreamCard key={s.id} stream={s} />)}
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  wrap:       { paddingTop: 20, paddingBottom: 8 },
  introTitle: { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.28)', paddingHorizontal: 20, marginBottom: 6 },
  introSub:   { fontSize: 12, color: 'rgba(255,255,255,0.42)', paddingHorizontal: 20, marginBottom: 20, lineHeight: 18 },
  list:       { gap: 10, paddingHorizontal: 20 },
  card:       { backgroundColor: '#04030E', borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  topBar:     { height: 2 },
  body:       { padding: 18, gap: 10 },
  headerRow:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  streamName: { fontSize: 13, fontWeight: '900', letterSpacing: 0.8, flex: 1 },
  badges:     { flexDirection: 'row', gap: 6 },
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  badgeText:  { fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 },
  desc:       { fontSize: 13, color: 'rgba(255,255,255,0.60)', lineHeight: 20, fontStyle: 'italic' },
  stats:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  count:      { fontSize: 11, color: 'rgba(255,255,255,0.36)', fontWeight: '600' },
  trendRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendText:  { fontSize: 11, fontWeight: '800', color: '#34D399' },
  barWrap:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barTrack:   { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  barFill:    { height: '100%', borderRadius: 2, opacity: 0.85 },
  barPct:     { fontSize: 11, fontWeight: '800', minWidth: 34, textAlign: 'right' },
});

// ── Empty state ───────────────────────────────────────────────────────────────

const emptyStyle = StyleSheet.create({
  wrap: { height: 220, alignItems: 'center', justifyContent: 'center', gap: 12 },
  text: { fontSize: 13, color: 'rgba(255,255,255,0.28)' },
});

// ── Utility ───────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DreamAtlasScreen() {
  const router    = useRouter();
  const [layer, setLayer] = useState<AtlasLayer>('dunya');

  const results = useQueries({
    queries: [
      { queryKey: ['atlas', 'world'],      queryFn: getAtlasWorld,      staleTime: STALE },
      { queryKey: ['atlas', 'peaceful'],   queryFn: getAtlasPeaceful,   staleTime: STALE },
      { queryKey: ['atlas', 'nightmares'], queryFn: getAtlasNightmares, staleTime: STALE },
      { queryKey: ['atlas', 'lucid'],      queryFn: getAtlasLucid,      staleTime: STALE },
      { queryKey: ['atlas', 'symbols'],    queryFn: getAtlasSymbols,    staleTime: STALE },
      { queryKey: ['atlas', 'trending'],   queryFn: getAtlasTrending,   staleTime: STALE },
      { queryKey: ['clusters'],            queryFn: getAllClusters,      staleTime: STALE },
    ],
  });

  const [worldQ, peacefulQ, nightmaresQ, lucidQ, symbolsQ, trendingQ, clustersQ] = results;
  const isLoading = results.some(r => r.isLoading);

  const world      = worldQ.data;
  const peaceful   = peacefulQ.data   ?? [];
  const nightmares = nightmaresQ.data ?? [];
  const lucid      = lucidQ.data      ?? [];
  const symbols    = symbolsQ.data    ?? [];
  const trending   = trendingQ.data   ?? [];
  const clusters   = (clustersQ.data  ?? [])
    .filter(c => c.memberCount > 0)
    .sort((a, b) => parseFloat(String(b.strengthScore)) - parseFloat(String(a.strengthScore)));

  const allPlaces = useMemo(
    () => enrichPlaces(peaceful, nightmares, lucid),
    [peaceful, nightmares, lucid],
  );

  const toPlace = (name: string) =>
    router.push({ pathname: '/dream-places', params: { name: encodeURIComponent(name) } } as any);

  return (
    <SafeAreaView style={main.container} edges={['top']}>
      <Pressable style={main.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
        <Text style={main.backText}>Benim Dünyam</Text>
      </Pressable>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Atlas header */}
        <View style={main.header}>
          <Text style={main.eyebrow}>DREAM ATLAS</Text>
          <Text style={main.title}>İnsanlığın{'\n'}Bilinçaltı Haritası</Text>
          {world && (
            <Text style={main.subtitle}>
              {fmtNum(world.totalDreamers)} rüyacı · {fmtNum(world.totalPlaces)} yer · canlı
            </Text>
          )}
        </View>

        {/* Layer tabs */}
        <AtlasTabBar active={layer} onPress={setLayer} />

        {isLoading ? (
          <View style={main.loading}>
            <ActivityIndicator size="large" color={C.cluster} />
            <Text style={main.loadingText}>Atlas uyanıyor…</Text>
          </View>
        ) : (
          <>
            {layer === 'dunya'    && <DunyaTab world={world} places={allPlaces} />}
            {layer === 'sehirler' && <SehirlerTab peaceful={peaceful} nightmares={nightmares} lucid={lucid} toPlace={toPlace} />}
            {layer === 'koridor'  && <KoridorTab peaceful={peaceful} nightmares={nightmares} lucid={lucid} clusters={clusters} toPlace={toPlace} />}
            {layer === 'akimlar'  && <AkimlarTab symbols={symbols} trending={trending} />}

            {/* Empty fallback if all data is empty */}
            {allPlaces.length === 0 && symbols.length === 0 && trending.length === 0 && !world && (
              <View style={emptyStyle.wrap}>
                <Ionicons name="planet-outline" size={44} color={Colors.textMuted} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.textSecondary }}>Atlas oluşuyor</Text>
                <Text style={{ fontSize: 13, color: Colors.textMuted, textAlign: 'center' }}>
                  Rüyalar paylaşıldıkça harita canlanır
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const main = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  back:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 14 },
  backText:    { fontSize: 13, color: Colors.textSecondary },
  header:      { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20, gap: 4 },
  eyebrow:     { fontSize: 9, fontWeight: '900', letterSpacing: 2.8, color: `${C.cluster}90` },
  title:       { fontSize: 32, fontWeight: '900', color: 'rgba(255,255,255,0.95)', lineHeight: 38, letterSpacing: -0.8 },
  subtitle:    { fontSize: 11, color: 'rgba(255,255,255,0.34)', fontWeight: '500', marginTop: 4 },
  loading:     { height: 280, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 13, color: Colors.textMuted },
});
