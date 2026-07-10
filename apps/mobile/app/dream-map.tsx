import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, G, Line, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import {
  getMapCities,
  getMapCity,
  getMapConstellations,
  getMapWorld,
} from '@/api/dreammap.api';
import type { MapCity, MapCityDetail, MapConstellation, NodeColor } from '@/types/dreammap.types';

// ── Constants ──────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');
const MAP_W  = SCREEN_W;
const MAP_H  = Math.round(SCREEN_W * 0.56);
const STALE  = 5 * 60 * 1000;

// ViewBox: 360×180 → 1 unit = 1 degree
const VB_W = 360;
const VB_H = 180;

// Scale factors from degree-space to pixel-space
const SX = MAP_W  / VB_W;
const SY = MAP_H  / VB_H;

// ── Projection ─────────────────────────────────────────────────────────────────

/** Equirectangular: lat/lng degrees → SVG pixel coordinates */
function project(lat: number, lng: number): { px: number; py: number } {
  return {
    px: (lng + 180) * SX,
    py: (90  - lat) * SY,
  };
}

/** Node radius from dream count (log-scaled, min 4, max 14) */
function nodeRadius(dreamCount: number): number {
  return Math.max(4, Math.min(14, Math.log(dreamCount + 1) * 5));
}

// ── Color helpers ─────────────────────────────────────────────────────────────

const WEATHER_LABEL: Record<string, string> = {
  'peaceful':       'Huzurlu',
  'active':         'Aktif',
  'transforming':   'Dönüşüm',
  'lucid':          'Lucid',
  'nightmare-heavy':'Kabus Bölgesi',
};

const CATEGORY_COLOR: Record<string, string> = {
  lucid:     '#C084FC',
  nightmare: '#F87171',
  beautiful: '#34D399',
  normal:    '#60A5FA',
};

const COUNTRY_FLAG: Record<string, string> = {
  'Turkey': '🇹🇷', 'Japan': '🇯🇵', 'Germany': '🇩🇪',
  'United States': '🇺🇸', 'USA': '🇺🇸', 'Brazil': '🇧🇷',
  'France': '🇫🇷', 'United Kingdom': '🇬🇧', 'UK': '🇬🇧',
  'Italy': '🇮🇹', 'Spain': '🇪🇸', 'Canada': '🇨🇦',
  'Australia': '🇦🇺', 'India': '🇮🇳', 'China': '🇨🇳',
  'Russia': '🇷🇺', 'Mexico': '🇲🇽', 'Argentina': '🇦🇷',
  'South Korea': '🇰🇷', 'Netherlands': '🇳🇱', 'Sweden': '🇸🇪',
  'Norway': '🇳🇴', 'Denmark': '🇩🇰', 'Poland': '🇵🇱',
  'Portugal': '🇵🇹', 'Greece': '🇬🇷', 'Switzerland': '🇨🇭',
  'Austria': '🇦🇹', 'Belgium': '🇧🇪', 'Czech Republic': '🇨🇿',
};

// ── Animated SVG Circle (pulse ring) ─────────────────────────────────────────

function PulseNode({
  px,
  py,
  r,
  color,
  delay = 0,
}: {
  px:    number;
  py:    number;
  r:     number;
  color: string;
  delay?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 2200,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false, // SVG props need JS driver
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const pulseR       = anim.interpolate({ inputRange: [0, 1], outputRange: [r, r * 2.8] });
  const pulseOpacity = anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.6, 0.3, 0] });

  return (
    <>
      {/* Outer pulse ring */}
      <AnimatedCircle
        cx={px}
        cy={py}
        r={pulseR as unknown as number}
        fill={color}
        opacity={pulseOpacity as unknown as number}
      />
      {/* Solid core */}
      <Circle cx={px} cy={py} r={r}       fill={color} opacity={0.95} />
      {/* Bright center dot */}
      <Circle cx={px} cy={py} r={r * 0.4} fill="#FFFFFF" opacity={0.7}  />
    </>
  );
}

// ── World Map SVG ─────────────────────────────────────────────────────────────

function WorldMapSvg({
  cities,
  selected,
  onSelectCity,
}: {
  cities:       MapCity[];
  selected:     MapCity | null;
  onSelectCity: (city: MapCity) => void;
}) {
  // Deduplicate cities by slug so keys and gradient ids are always unique
  const uniqueCities = cities.filter((c, i, arr) => arr.findIndex((x) => x.slug === c.slug) === i);

  // Grid lines: meridians every 30°, parallels every 30°
  const meridians  = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
  const parallels  = [-60, -30, 0, 30, 60];

  // Geographic region labels [lat, lng, label]
  const regionLabels: Array<[number, number, string]> = [
    [ 48, -100, 'AMERICAS'  ],
    [-15,  -56, 'S. AMERICA'],
    [ 54,   15, 'EUROPE'    ],
    [  5,   20, 'AFRICA'    ],
    [ 50,   80, 'ASIA'      ],
    [-25,  135, 'OCEANIA'   ],
  ];

  return (
    <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Defs>
        <LinearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"   stopColor="#060A1A" stopOpacity="1" />
          <Stop offset="0.5" stopColor="#080E22" stopOpacity="1" />
          <Stop offset="1"   stopColor="#060A18" stopOpacity="1" />
        </LinearGradient>
        {/* Per-city glow gradients */}
        {uniqueCities.map((c) => {
          const { px, py } = project(c.latitude, c.longitude);
          return (
            <LinearGradient key={`glow-${c.slug}`} id={`glow-${c.slug}`} x1={px} y1={py} x2={px + 10} y2={py} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={c.nodeColor} stopOpacity="0.3" />
              <Stop offset="1" stopColor={c.nodeColor} stopOpacity="0"   />
            </LinearGradient>
          );
        })}
      </Defs>

      {/* Background */}
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#bgGrad)" />

      {/* Grid: meridians */}
      {meridians.map((lng) => {
        const x = (lng + 180);
        return (
          <Line
            key={`m${lng}`}
            x1={x} y1={0} x2={x} y2={VB_H}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={0.4}
          />
        );
      })}

      {/* Grid: parallels */}
      {parallels.map((lat) => {
        const y = 90 - lat;
        const isEquator = lat === 0;
        return isEquator ? (
          <Line
            key={`p${lat}`}
            x1={0} y1={y} x2={VB_W} y2={y}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={0.5}
          />
        ) : (
          <Line
            key={`p${lat}`}
            x1={0} y1={y} x2={VB_W} y2={y}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={0.4}
            strokeDasharray="2,4"
          />
        );
      })}

      {/* Prime meridian (slightly brighter) */}
      <Line x1={180} y1={0} x2={180} y2={VB_H} stroke="rgba(255,255,255,0.09)" strokeWidth={0.5} />

      {/* Parallel labels */}
      {parallels.filter((l) => l !== 0).map((lat) => {
        const y = 90 - lat;
        return (
          <SvgText
            key={`pl${lat}`}
            x={2}
            y={y - 1}
            fontSize={4}
            fill="rgba(255,255,255,0.2)"
          >
            {lat > 0 ? `${lat}°N` : `${Math.abs(lat)}°S`}
          </SvgText>
        );
      })}

      {/* Geographic region labels */}
      {regionLabels.map(([lat, lng, label]) => {
        const { px, py } = project(lat, lng);
        return (
          <SvgText
            key={label}
            x={px}
            y={py}
            fontSize={5}
            fill="rgba(255,255,255,0.08)"
            textAnchor="middle"
            fontWeight="bold"
          >
            {label}
          </SvgText>
        );
      })}

      {/* Dream nodes */}
      {uniqueCities.map((city, i) => {
        const { px, py } = project(city.latitude, city.longitude);
        const r          = nodeRadius(city.dreamCount);
        const isSelected = selected?.slug === city.slug;
        const hitR       = Math.max(r + 8, 14);
        return (
          <G key={city.slug}>
            {isSelected && (
              <Circle
                cx={px} cy={py} r={r + 5}
                fill="none" stroke={city.nodeColor}
                strokeWidth={0.8} opacity={0.6}
              />
            )}
            <PulseNode px={px} py={py} r={r} color={city.nodeColor} delay={i * 400} />
            {/* Transparent oversized hit target — onPress on Circle works reliably in react-native-svg */}
            <Circle
              cx={px} cy={py} r={hitR}
              fill="transparent"
              onPress={() => onSelectCity(city)}
            />
          </G>
        );
      })}
    </Svg>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────────

const LEGEND_ITEMS: Array<{ color: NodeColor; label: string }> = [
  { color: '#60A5FA', label: 'Huzurlu'    },
  { color: '#C084FC', label: 'Lucid'      },
  { color: '#F87171', label: 'Kabus'      },
  { color: '#FBBF24', label: 'Dönüşüm'   },
  { color: '#34D399', label: 'Aktif'      },
];

function Legend() {
  return (
    <View style={styles.legend}>
      {LEGEND_ITEMS.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: item.color, shadowColor: item.color }]} />
          <Text style={styles.legendLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── City Detail Panel ─────────────────────────────────────────────────────────

function CityDetailPanel({
  city,
  detail,
  onClose,
}: {
  city:   MapCity;
  detail: MapCityDetail | null;
  onClose: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 1,
      tension: 65,
      friction: 10,
      useNativeDriver: true,
    }).start();
    return () => {
      slideAnim.setValue(0);
    };
  }, [city.slug]);

  const translateY = slideAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [300, 0],
  });

  const color = city.nodeColor;

  return (
    <Animated.View style={[styles.panel, { transform: [{ translateY }] }]}>
      {/* Handle */}
      <View style={styles.panelHandle} />

      {/* Close */}
      <Pressable style={styles.panelClose} onPress={onClose}>
        <Ionicons name="close" size={16} color={Colors.textMuted} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.panelScroll}>
        {/* City header */}
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelCityName}>{city.name}</Text>
            {city.country && (
              <Text style={styles.panelCountry}>{city.country}</Text>
            )}
          </View>
          <View style={[styles.weatherBadge, { borderColor: `${color}50`, backgroundColor: `${color}18` }]}>
            <View style={[styles.weatherDot, { backgroundColor: color }]} />
            <Text style={[styles.weatherLabel, { color }]}>
              {WEATHER_LABEL[city.dreamWeather] ?? city.dreamWeather}
            </Text>
          </View>
        </View>

        {/* Score row */}
        <View style={styles.scoreRow}>
          <ScorePill label="Dream Skoru"  value={city.dreamScore}      color={color}       suffix="" />
          <ScorePill label="Lucid"        value={city.lucidRatio}      color="#C084FC"     suffix="%" />
          <ScorePill label="Kabus"        value={city.nightmareRatio}  color="#F87171"     suffix="%" />
          <ScorePill label="Rüya"         value={city.dreamCount}      color={Colors.textSecondary} suffix="" />
        </View>

        {/* Emotion distribution */}
        {(detail?.emotionDistribution ?? []).length > 0 ? (
          <>
            <PanelLabel>DUYGU DAĞILIMI</PanelLabel>
            {(detail!.emotionDistribution).map((e) => (
              <View key={e.emotion} style={styles.emotionRow}>
                <Text style={styles.emotionName}>{e.emotion}</Text>
                <View style={styles.emotionBarTrack}>
                  <View
                    style={[
                      styles.emotionBarFill,
                      { width: `${e.percentage}%` as any, backgroundColor: color },
                    ]}
                  />
                </View>
                <Text style={[styles.emotionPct, { color }]}>{e.percentage}%</Text>
              </View>
            ))}
          </>
        ) : city.dominantEmotion ? (
          <>
            <PanelLabel>BASKUN DUYGU</PanelLabel>
            <View style={[styles.singleEmotionChip, { borderColor: `${color}40`, backgroundColor: `${color}15` }]}>
              <Text style={[styles.singleEmotionText, { color }]}>{city.dominantEmotion}</Text>
            </View>
          </>
        ) : null}

        {/* Top symbols */}
        {city.dominantSymbols.length > 0 && (
          <>
            <PanelLabel>SEMBOLLER</PanelLabel>
            <View style={styles.chipRow}>
              {city.dominantSymbols.map((s) => (
                <View key={s} style={[styles.chip, { borderColor: '#FBBF2430', backgroundColor: '#FBBF2412' }]}>
                  <Text style={[styles.chipText, { color: '#FBBF24' }]}>{s}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Top themes */}
        {city.dominantThemes.length > 0 && (
          <>
            <PanelLabel>TEMALAR</PanelLabel>
            <View style={styles.chipRow}>
              {city.dominantThemes.map((t) => (
                <View key={t} style={[styles.chip, { borderColor: `${color}30`, backgroundColor: `${color}12` }]}>
                  <Text style={[styles.chipText, { color }]}>{t}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Top archetypes */}
        {city.dominantArchetypes.length > 0 && (
          <>
            <PanelLabel>ARKETİPLER</PanelLabel>
            <View style={styles.chipRow}>
              {city.dominantArchetypes.map((a) => (
                <View key={a} style={[styles.chip, { borderColor: '#A78BFA30', backgroundColor: '#A78BFA12' }]}>
                  <Text style={[styles.chipText, { color: '#A78BFA' }]}>{a}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Recent dream snippets */}
        {(detail?.recentSnippets ?? []).length > 0 && (
          <>
            <PanelLabel>SON RÜYALAR</PanelLabel>
            {detail!.recentSnippets.map((s, i) => (
              <View key={i} style={[styles.snippetCard, { borderLeftColor: CATEGORY_COLOR[s.category] ?? color }]}>
                {s.title && (
                  <Text style={styles.snippetTitle}>{s.title}</Text>
                )}
                <Text style={styles.snippetExcerpt} numberOfLines={3}>
                  {s.excerpt}{s.excerpt.length >= 110 ? '…' : ''}
                </Text>
                <View style={[styles.snippetBadge, { backgroundColor: `${CATEGORY_COLOR[s.category] ?? color}20` }]}>
                  <Text style={[styles.snippetCategory, { color: CATEGORY_COLOR[s.category] ?? color }]}>
                    {s.category}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </Animated.View>
  );
}

function ScorePill({
  label,
  value,
  color,
  suffix,
}: {
  label:  string;
  value:  number;
  color:  string;
  suffix: string;
}) {
  return (
    <View style={[styles.scorePill, { borderColor: `${color}30`, backgroundColor: `${color}10` }]}>
      <Text style={[styles.scorePillValue, { color }]}>
        {value}{suffix}
      </Text>
      <Text style={styles.scorePillLabel}>{label}</Text>
    </View>
  );
}

function PanelLabel({ children }: { children: string }) {
  return <Text style={styles.panelLabel}>{children}</Text>;
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function DreamMapScreen() {
  const router = useRouter();
  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);
  const [selectedCity, setSelectedCity] = useState<MapCity | null>(null);

  const worldQ = useQuery({
    queryKey: ['dreammap', 'world'],
    queryFn:  getMapWorld,
    staleTime: STALE,
  });

  const citiesQ = useQuery({
    queryKey: ['dreammap', 'cities'],
    queryFn:  getMapCities,
    staleTime: STALE,
  });

  const constellationsQ = useQuery({
    queryKey: ['dreammap', 'constellations'],
    queryFn:  getMapConstellations,
    staleTime: STALE,
  });

  const cityDetailQ = useQuery({
    queryKey:  ['dreammap', 'city', selectedCity?.slug],
    queryFn:   () => (selectedCity ? getMapCity(selectedCity.slug) : Promise.resolve(null)),
    enabled:   !!selectedCity,
    staleTime: STALE,
  });

  const rawCities      = citiesQ.data         ?? [];
  const cities         = rawCities.filter((c, i, arr) => arr.findIndex((x) => x.slug === c.slug) === i);
  const constellations = constellationsQ.data  ?? [];
  const world         = worldQ.data;
  const detail        = cityDetailQ.data ?? null;

  const handleSelect = useCallback((city: MapCity) => {
    setSelectedCity(city);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedCity(null);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Back row + title */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.screenTitle}>DREAM MAP</Text>
          <Text style={styles.screenSub}>Kolektif Bilinçaltı Haritası</Text>
        </View>
        {world && (
          <View style={styles.topStats}>
            <Text style={styles.topStatVal}>{world.totalDreamers}</Text>
            <Text style={styles.topStatLbl}>rüyacı</Text>
          </View>
        )}
      </View>

      {/* Map canvas */}
      <View style={styles.mapContainer}>
        <WorldMapSvg
          cities={cities}
          selected={selectedCity}
          onSelectCity={handleSelect}
        />

        {/* Legend overlay */}
        <View style={styles.legendOverlay}>
          <Legend />
        </View>

        {/* Stat strip at top-right of map */}
        {world && (
          <View style={styles.mapStatStrip}>
            <MapStat label="Rüya" value={world.totalDreams}   color="#60A5FA" />
            <MapStat label="Lucid" value={`${world.lucidRatio}%`}   color="#C084FC" />
            <MapStat label="Kabus" value={`${world.nightmareRatio}%`} color="#F87171" />
          </View>
        )}
      </View>

      {/* ── Scrollable content below map ── */}
      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Map hint */}
        {cities.length > 0 && (
          <View style={styles.mapHint}>
            <Ionicons name="information-circle-outline" size={11} color={Colors.textMuted} />
            <Text style={styles.mapHintText}>Her nokta rüyalarda bahsedilen bir yeri gösterir. Dokunarak keşfet.</Text>
          </View>
        )}

        {/* City horizontal chips */}
        {cities.length > 0 && (
          <>
            <View style={styles.cityListHeader}>
              <Text style={styles.cityListTitle}>
                <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
                {'  '}RÜYADAKİ YERLER
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.cityRow}
            >
              {cities.map((city) => (
                <Pressable
                  key={city.slug}
                  style={({ pressed }) => [
                    styles.cityChip,
                    { borderColor: `${city.nodeColor}40`, backgroundColor: `${city.nodeColor}12` },
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => handleSelect(city)}
                >
                  <View style={[styles.cityChipDot, { backgroundColor: city.nodeColor }]} />
                  <Text style={[styles.cityChipName, { color: city.nodeColor }]}>{city.name}</Text>
                  <Text style={styles.cityChipCount}>{city.dreamCount}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Bilinçaltı Fırtınaları ── */}
        {constellations.length > 0 && (
          <View style={styles.stormSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.stormSectionTitle}>⚡ BİLİNÇALTI FIRTINALARI</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.stormRow}
            >
              {constellations.slice(0, 6).map((c) => {
                const pair = c.connections[0];
                return (
                  <View key={c.clusterId} style={styles.stormCard}>
                    {pair ? (
                      <Text style={styles.stormPair} numberOfLines={1}>
                        {pair.from.name} ↔ {pair.to.name}
                      </Text>
                    ) : (
                      <Text style={styles.stormPair}>{c.clusterName}</Text>
                    )}
                    <Text style={styles.stormMeta}>{c.memberCount} rüyacı</Text>
                    <View style={styles.stormScore}>
                      <Text style={styles.stormScoreVal}>{c.strengthScore.toFixed(0)}</Text>
                      <Text style={styles.stormScoreLbl}>bağ</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── En Güçlü Kolektifler ── */}
        {constellations.length > 0 && (
          <View style={styles.collectiveSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="people-outline" size={12} color="#A78BFA" />
              <Text style={styles.collectiveSectionTitle}>EN GÜÇLÜ KOLEKTİFLER</Text>
            </View>
            {constellations.slice(0, 4).map((c) => {
              const places = [...new Set(
                c.connections.flatMap((conn) => [conn.from.name, conn.to.name]),
              )].slice(0, 3);
              return (
                <View key={c.clusterId} style={styles.collectiveCard}>
                  <View style={styles.collectiveLeft}>
                    <Text style={styles.collectiveName}>{c.clusterName}</Text>
                    {places.length > 0 && (
                      <Text style={styles.collectivePlaces} numberOfLines={1}>
                        {places.join(' · ')}
                      </Text>
                    )}
                  </View>
                  <View style={styles.collectiveRight}>
                    <Text style={styles.collectiveScoreVal}>{c.strengthScore.toFixed(0)}</Text>
                    <Text style={styles.collectiveScoreLbl}>güç</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Dünyadan Son Rüya Sinyalleri ── */}
        {cities.length > 0 && (
          <View style={styles.signalsSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="radio-outline" size={12} color="#60A5FA" />
              <Text style={styles.signalsSectionTitle}>DÜNYA'DAN SON RÜYA SİNYALLERİ</Text>
            </View>
            {cities.slice(0, 6).map((city) => {
              const flag    = COUNTRY_FLAG[city.country ?? ''] ?? '🌍';
              const preview = city.dominantThemes[0]
                ? `${city.dominantThemes[0]} teması${city.dominantSymbols[0] ? ` ve "${city.dominantSymbols[0]}" sembolü` : ''} öne çıkıyor`
                : city.dominantSymbols[0]
                ? `"${city.dominantSymbols[0]}" sembolü öne çıkıyor`
                : null;
              if (!preview) return null;
              return (
                <Pressable
                  key={city.slug}
                  style={({ pressed }) => [styles.signalCard, pressed && { opacity: 0.75 }]}
                  onPress={() => handleSelect(city)}
                >
                  <View style={[styles.signalAccent, { backgroundColor: city.nodeColor }]} />
                  <View style={styles.signalBody}>
                    <View style={styles.signalHeaderRow}>
                      <Text style={[styles.signalCityName, { color: city.nodeColor }]}>{city.name}</Text>
                      <Text style={styles.signalFlag}>{flag}</Text>
                      <View style={{ flex: 1 }} />
                      <Text style={styles.signalCount}>{city.dreamCount} rüya</Text>
                    </View>
                    <Text style={styles.signalPreview} numberOfLines={2}>{preview}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Empty state */}
        {cities.length === 0 && !citiesQ.isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="planet-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Harita oluşuyor</Text>
            <Text style={styles.emptyText}>
              Rüyalarda gerçek yerler bahsedildikçe haritada belirir
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* City detail panel — absolute overlay, shown regardless of scroll position */}
      {selectedCity && (
        <>
          <Pressable style={styles.backdrop} onPress={handleClose} />
          <CityDetailPanel
            city={selectedCity}
            detail={detail}
            onClose={handleClose}
          />
        </>
      )}
    </SafeAreaView>
  );
}

function MapStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={styles.mapStatItem}>
      <Text style={[styles.mapStatVal, { color }]}>{value}</Text>
      <Text style={styles.mapStatLbl}>{label}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#060A18' },
  scrollArea: { flex: 1 },

  // Top bar
  topBar: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  backBtn:   { padding: 4 },
  titleBlock:{ flex: 1 },
  screenTitle: {
    fontSize:    14,
    fontWeight:  '900',
    letterSpacing: 2.5,
    color:       Colors.textPrimary,
  },
  screenSub: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  topStats:  { alignItems: 'center' },
  topStatVal:{ fontSize: 16, fontWeight: '900', color: '#60A5FA' },
  topStatLbl:{ fontSize: 9, color: Colors.textMuted },

  // Map
  mapContainer: {
    width:    MAP_W,
    height:   MAP_H,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  legendOverlay: {
    position: 'absolute',
    bottom: 6,
    left:   8,
  },
  mapStatStrip: {
    position:       'absolute',
    top:            8,
    right:          8,
    flexDirection:  'row',
    gap:            10,
    backgroundColor: 'rgba(6,10,24,0.7)',
    borderRadius:   8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mapStatItem:  { alignItems: 'center' },
  mapStatVal:   { fontSize: 13, fontWeight: '800' },
  mapStatLbl:   { fontSize: 8, color: Colors.textMuted },

  // Legend
  legend:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: {
    width:        5,
    height:       5,
    borderRadius: 3,
    ...Platform.select({
      ios:     { shadowRadius: 3, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 } },
      android: { elevation: 2 },
    }),
  },
  legendLabel: { fontSize: 8, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

  // City list
  cityListHeader: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  cityListTitle:  { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  cityRow:        { paddingHorizontal: 14, paddingVertical: 6, gap: 8 },
  cityChip: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              6,
    paddingHorizontal: 10,
    paddingVertical:  6,
    borderRadius:     10,
    borderWidth:      1,
  },
  cityChipDot:   { width: 6, height: 6, borderRadius: 3 },
  cityChipName:  { fontSize: 12, fontWeight: '700' },
  cityChipCount: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },

  // Map hint
  mapHint: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingTop: 6, paddingBottom: 2,
  },
  mapHintText: { fontSize: 10, color: Colors.textMuted, flex: 1, lineHeight: 14 },

  // Shared section header
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 10,
  },

  // ── Bilinçaltı Fırtınaları ──
  stormSection: { paddingHorizontal: 14, paddingTop: 14 },
  stormSectionTitle: {
    fontSize: 10, fontWeight: '900', color: '#FBBF24', letterSpacing: 1.2,
  },
  stormRow: { gap: 8, paddingBottom: 4 },
  stormCard: {
    backgroundColor: 'rgba(251,191,36,0.06)',
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.20)',
    padding: 12, minWidth: 160, gap: 4,
  },
  stormPair:      { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  stormMeta:      { fontSize: 10, color: Colors.textMuted },
  stormScore:     { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 4 },
  stormScoreVal:  { fontSize: 20, fontWeight: '900', color: '#FBBF24' },
  stormScoreLbl:  { fontSize: 9, color: Colors.textMuted, fontWeight: '600' },

  // ── En Güçlü Kolektifler ──
  collectiveSection: { paddingHorizontal: 14, paddingTop: 16 },
  collectiveSectionTitle: {
    fontSize: 10, fontWeight: '900', color: '#A78BFA', letterSpacing: 1.2,
  },
  collectiveCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(167,139,250,0.06)',
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.15)',
    padding: 12, marginBottom: 7, gap: 10,
  },
  collectiveLeft:   { flex: 1, gap: 3 },
  collectiveName:   { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  collectivePlaces: { fontSize: 10, color: Colors.textMuted },
  collectiveRight:  { alignItems: 'center' },
  collectiveScoreVal: { fontSize: 20, fontWeight: '900', color: '#A78BFA' },
  collectiveScoreLbl: { fontSize: 8, color: Colors.textMuted, fontWeight: '600' },

  // ── Dünyadan Son Rüya Sinyalleri ──
  signalsSection: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 30 },
  signalsSectionTitle: {
    fontSize: 10, fontWeight: '900', color: '#60A5FA', letterSpacing: 1.2,
  },
  signalCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden', marginBottom: 8,
  },
  signalAccent: { width: 3 },
  signalBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 5 },
  signalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  signalCityName:  { fontSize: 13, fontWeight: '800' },
  signalFlag:      { fontSize: 14 },
  signalCount:     { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  signalPreview:   { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
  emptyText:  { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 18, paddingHorizontal: 32 },

  // Backdrop
  backdrop: {
    position:         'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor:  'rgba(0,0,0,0.5)',
  },

  // Panel
  panel: {
    position:         'absolute',
    bottom:           0,
    left:             0,
    right:            0,
    maxHeight:        '70%',
    backgroundColor:  '#0D1026',
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    borderTopWidth:   1,
    borderTopColor:   'rgba(255,255,255,0.1)',
    paddingTop:       10,
  },
  panelHandle: {
    alignSelf:    'center',
    width:        36,
    height:       4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 10,
  },
  panelClose: {
    position: 'absolute',
    top: 10, right: 14,
    padding: 6,
  },
  panelScroll: { paddingHorizontal: 16 },
  panelHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   12,
  },
  panelCityName: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary },
  panelCountry:  { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  weatherBadge: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              5,
    paddingHorizontal: 9,
    paddingVertical:  5,
    borderRadius:     10,
    borderWidth:      1,
  },
  weatherDot:   { width: 6, height: 6, borderRadius: 3 },
  weatherLabel: { fontSize: 11, fontWeight: '700' },

  // Score pills
  scoreRow:   { flexDirection: 'row', gap: 7, marginBottom: 14, flexWrap: 'wrap' },
  scorePill: {
    flex:             1,
    minWidth:         64,
    paddingHorizontal: 8,
    paddingVertical:  7,
    borderRadius:     10,
    borderWidth:      1,
    alignItems:       'center',
  },
  scorePillValue: { fontSize: 17, fontWeight: '900' },
  scorePillLabel: { fontSize: 8,  color: Colors.textMuted, marginTop: 2, fontWeight: '600' },

  // Panel sections
  panelLabel: {
    fontSize:     9,
    fontWeight:   '800',
    color:        Colors.textMuted,
    letterSpacing: 1.2,
    marginTop:    12,
    marginBottom: 7,
  },
  emotionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  emotionName: { fontSize: 12, color: Colors.textPrimary, width: 80 },
  emotionBarTrack: {
    flex:            1,
    height:          3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius:    2,
    overflow:        'hidden',
  },
  emotionBarFill:  { height: '100%', borderRadius: 2 },
  emotionPct:      { fontSize: 11, fontWeight: '700', width: 36, textAlign: 'right' },
  singleEmotionChip: {
    paddingHorizontal: 12,
    paddingVertical:   7,
    borderRadius:      10,
    borderWidth:       1,
    alignSelf:         'flex-start',
  },
  singleEmotionText: { fontSize: 13, fontWeight: '700' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 9,
    paddingVertical:   4,
    borderRadius:      8,
    borderWidth:       1,
  },
  chipText: { fontSize: 11, fontWeight: '600' },

  // Snippets
  snippetCard: {
    backgroundColor:  'rgba(255,255,255,0.04)',
    borderRadius:     10,
    borderLeftWidth:  3,
    padding:          10,
    marginBottom:     8,
    gap:              4,
  },
  snippetTitle:    { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  snippetExcerpt:  { fontSize: 11, color: Colors.textSecondary, lineHeight: 16 },
  snippetBadge:    { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  snippetCategory: { fontSize: 9, fontWeight: '700' },
});
