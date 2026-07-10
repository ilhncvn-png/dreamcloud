import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { Colors } from '@/constants/colors';
import { getCityForecast, getForecast } from '@/api/forecast.api';
import type {
  CityForecastDetail,
  CityForecastSummary,
  DreamForecast,
  EmotionShift,
  ForecastPeriod,
  TrendDir,
  TrendItem,
} from '@/types/forecast.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const STALE = 3 * 60 * 1000;

const TREND_COLOR: Record<TrendDir, string> = {
  Exploding: '#FBBF24',
  Rising:    '#34D399',
  Stable:    'rgba(255,255,255,0.3)',
  Falling:   '#F87171',
};

const TREND_ICON: Record<TrendDir, React.ComponentProps<typeof Ionicons>['name']> = {
  Exploding: 'flame-outline',
  Rising:    'arrow-up',
  Stable:    'remove',
  Falling:   'arrow-down',
};

const TREND_LABEL_TR: Record<TrendDir, string> = {
  Exploding: 'Güçlü Yükseliş',
  Rising:    'Yükseliyor',
  Stable:    'Stabil',
  Falling:   'Düşüyor',
};

const PERIOD_LABEL: Record<ForecastPeriod, string> = {
  today: 'Bugün',
  week:  'Bu Hafta',
  month: 'Bu Ay',
};

// ── Shared primitives ─────────────────────────────────────────────────────────

function SectionTitle({ icon, children, color = Colors.textSecondary }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.sectionTitleText, { color }]}>{children}</Text>
    </View>
  );
}

function TrendBadge({ dir }: { dir: TrendDir }) {
  const color = TREND_COLOR[dir];
  return (
    <View style={[styles.trendBadge, { borderColor: `${color}40`, backgroundColor: `${color}18` }]}>
      <Ionicons name={TREND_ICON[dir]} size={10} color={color} />
      <Text style={[styles.trendBadgeText, { color }]}>{TREND_LABEL_TR[dir]}</Text>
    </View>
  );
}

function DeltaChip({ delta }: { delta: number }) {
  const positive = delta >= 0;
  const color    = positive ? '#34D399' : '#F87171';
  if (positive && delta > 300) {
    return <Text style={[styles.deltaChip, { color }]}>çok güçlü ↑</Text>;
  }
  if (positive && delta > 100) {
    return <Text style={[styles.deltaChip, { color }]}>güçlü ↑</Text>;
  }
  const sign = positive ? '+' : '';
  return (
    <Text style={[styles.deltaChip, { color }]}>
      {sign}{delta.toFixed(1)}%
    </Text>
  );
}

// ── Section: Humanity Tonight ─────────────────────────────────────────────────

function HumanityTonightCard({ forecast }: { forecast: DreamForecast }) {
  const scoreColor = forecast.forecastScore >= 70 ? '#FBBF24'
    : forecast.forecastScore >= 40 ? '#60A5FA'
    : '#94A3B8';

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroTop}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroMood}>{forecast.dominantMood}</Text>
          {forecast.dominantEmotion && (
            <Text style={styles.heroDominantEmotion}>{forecast.dominantEmotion}</Text>
          )}
          <Text style={styles.heroStats}>
            {forecast.totalDreams} rüya · {forecast.totalDreamers} rüyacı
          </Text>
        </View>
        {/* Forecast score gauge */}
        <View style={styles.scoreBlock}>
          <Text style={[styles.scoreValue, { color: scoreColor }]}>
            {forecast.forecastScore}
          </Text>
          <Text style={styles.scoreLabel}>SKORU</Text>
          <View style={[styles.scoreMeter, { borderColor: `${scoreColor}30` }]}>
            <View
              style={[
                styles.scoreMeterFill,
                {
                  height: `${forecast.forecastScore}%` as any,
                  backgroundColor: scoreColor,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Lucid + Nightmare ratio pills */}
      <View style={styles.heroPillRow}>
        <HeroPill
          label="LUCID"
          value={forecast.lucidRatio}
          delta={forecast.lucidDelta}
          trend={forecast.lucidTrend}
          color="#C084FC"
        />
        <HeroPill
          label="KABUS"
          value={forecast.nightmareRatio}
          delta={forecast.nightmareDelta}
          trend={forecast.nightmareTrend}
          color="#F87171"
        />
        <HeroPill
          label="NORMAL"
          value={Math.max(0, 100 - forecast.lucidRatio - forecast.nightmareRatio)}
          delta={0}
          trend="Stable"
          color="#60A5FA"
        />
      </View>
    </View>
  );
}

function HeroPill({
  label, value, delta, trend, color,
}: {
  label: string; value: number; delta: number; trend: TrendDir; color: string;
}) {
  return (
    <View style={[styles.heroPill, { borderColor: `${color}30`, backgroundColor: `${color}10` }]}>
      <Text style={[styles.heroPillValue, { color }]}>{value}%</Text>
      <Text style={styles.heroPillLabel}>{label}</Text>
      {delta !== 0 && (
        <Text style={[styles.heroPillDelta, { color: delta > 0 ? '#34D399' : '#F87171' }]}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)}
        </Text>
      )}
    </View>
  );
}

// ── Section: Trend Items (themes / symbols) ───────────────────────────────────

function TrendItemRow({ item, accent }: { item: TrendItem; accent: string }) {
  const pct = Math.min(100, Math.abs(item.changePercent));
  return (
    <View style={styles.trendRow}>
      <View style={styles.trendRowLeft}>
        <Text style={styles.trendItemName}>{item.name}</Text>
        <View style={styles.trendBarTrack}>
          <View
            style={[
              styles.trendBarFill,
              { width: `${pct}%` as any, backgroundColor: TREND_COLOR[item.trend] },
            ]}
          />
        </View>
      </View>
      <View style={styles.trendRowRight}>
        <DeltaChip delta={item.changePercent} />
        <TrendBadge dir={item.trend} />
      </View>
    </View>
  );
}

function FallingItemRow({ item }: { item: TrendItem }) {
  return (
    <View style={[styles.trendRow, styles.fallingRow]}>
      <Text style={styles.fallingName}>{item.name}</Text>
      <View style={styles.trendRowRight}>
        <DeltaChip delta={item.changePercent} />
        <TrendBadge dir="Falling" />
      </View>
    </View>
  );
}

// ── Section: Emotional Climate ────────────────────────────────────────────────

function EmotionShiftRow({ shift }: { shift: EmotionShift }) {
  const color = TREND_COLOR[shift.trend];
  const barW  = Math.min(100, shift.currentRatio);
  return (
    <View style={styles.emotionRow}>
      <Text style={styles.emotionName}>{shift.emotion}</Text>
      <View style={styles.emotionBarTrack}>
        <View
          style={[styles.emotionBarFill, { width: `${barW}%` as any, backgroundColor: color }]}
        />
      </View>
      <Text style={[styles.emotionPct, { color }]}>{shift.currentRatio}%</Text>
      <DeltaChip delta={shift.delta} />
    </View>
  );
}

// ── Section: Lucid / Nightmare trend card ─────────────────────────────────────

function RatioTrendCard({
  label, ratio, delta, trend, previousRatio, color, icon,
}: {
  label: string; ratio: number; delta: number; trend: TrendDir;
  previousRatio: number; color: string; icon: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={[styles.ratioCard, { borderColor: `${color}25`, backgroundColor: `${color}0C` }]}>
      <View style={styles.ratioCardLeft}>
        <View style={[styles.ratioIconWrap, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <View>
          <Text style={styles.ratioLabel}>{label}</Text>
          <Text style={[styles.ratioValue, { color }]}>{ratio}%</Text>
          <Text style={styles.ratioPrev}>Önceki: {previousRatio}%</Text>
        </View>
      </View>
      <View style={styles.ratioCardRight}>
        <TrendBadge dir={trend} />
        <Text style={[styles.ratioDelta, { color: delta >= 0 ? '#34D399' : '#F87171' }]}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
        </Text>
      </View>
    </View>
  );
}

// ── Section: City Forecasts ───────────────────────────────────────────────────

function CityForecastRow({
  city,
  onPress,
}: {
  city: CityForecastSummary;
  onPress: (city: CityForecastSummary) => void;
}) {
  const color = TREND_COLOR[city.trend];
  return (
    <Pressable
      style={({ pressed }) => [styles.cityRow, pressed && { opacity: 0.75 }]}
      onPress={() => onPress(city)}
    >
      <View style={styles.cityRowLeft}>
        <View style={[styles.cityDot, { backgroundColor: color, shadowColor: color }]} />
        <View>
          <Text style={styles.cityName}>{city.name}</Text>
          {city.country && <Text style={styles.cityCountry}>{city.country}</Text>}
          {city.topThemes.length > 0 && (
            <Text style={styles.cityThemes} numberOfLines={1}>
              {city.topThemes.join(' · ')}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.cityRowRight}>
        <Text style={[styles.cityCount, { color }]}>{city.dreamCount}</Text>
        <TrendBadge dir={city.trend} />
        <Ionicons name="chevron-forward" size={12} color={Colors.textMuted} />
      </View>
    </Pressable>
  );
}

// ── City detail panel ─────────────────────────────────────────────────────────

function CityDetailPanel({
  city,
  detail,
  onClose,
}: {
  city:    CityForecastSummary;
  detail:  CityForecastDetail | null;
  onClose: () => void;
}) {
  const color = TREND_COLOR[city.trend];

  return (
    <View style={styles.cityPanel}>
      <View style={styles.cityPanelHeader}>
        <View>
          <Text style={styles.cityPanelName}>{city.name}</Text>
          {city.country && <Text style={styles.cityPanelCountry}>{city.country}</Text>}
        </View>
        <Pressable onPress={onClose} style={styles.cityPanelClose}>
          <Ionicons name="close" size={16} color={Colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.cityPanelStats}>
        <CityStatPill label="Rüya" value={city.dreamCount}      color={color} />
        <CityStatPill label="Lucid" value={`${city.lucidRatio}%`}     color="#C084FC" />
        <CityStatPill label="Kabus" value={`${city.nightmareRatio}%`} color="#F87171" />
        {city.dominantEmotion && (
          <CityStatPill label="Duygu" value={city.dominantEmotion} color="#60A5FA" />
        )}
      </View>

      <TrendBadge dir={city.trend} />

      {detail && detail.risingThemes.length > 0 && (
        <>
          <Text style={styles.cityPanelSub}>YÜKSELEN TEMALAR</Text>
          {detail.risingThemes.map((t) => (
            <TrendItemRow key={t.name} item={t} accent={color} />
          ))}
        </>
      )}
      {detail && detail.emotionalShifts.length > 0 && (
        <>
          <Text style={styles.cityPanelSub}>DUYGU KAYMALARI</Text>
          {detail.emotionalShifts.slice(0, 4).map((s) => (
            <EmotionShiftRow key={s.emotion} shift={s} />
          ))}
        </>
      )}
      {detail && detail.topSymbols.length > 0 && (
        <>
          <Text style={styles.cityPanelSub}>SEMBOLLER</Text>
          <View style={styles.chipRow}>
            {detail.topSymbols.map((s) => (
              <View key={s} style={styles.symbolChip}>
                <Text style={styles.symbolChipText}>{s}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function CityStatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={[styles.cityStatPill, { borderColor: `${color}30`, backgroundColor: `${color}10` }]}>
      <Text style={[styles.cityStatVal, { color }]}>{value}</Text>
      <Text style={styles.cityStatLbl}>{label}</Text>
    </View>
  );
}

// ── Period selector ───────────────────────────────────────────────────────────

function PeriodTabs({
  period,
  onChange,
}: {
  period:   ForecastPeriod;
  onChange: (p: ForecastPeriod) => void;
}) {
  const periods: ForecastPeriod[] = ['today', 'week', 'month'];
  return (
    <View style={styles.periodTabs}>
      {periods.map((p) => (
        <Pressable
          key={p}
          style={({ pressed }) => [
            styles.periodTab,
            period === p && styles.periodTabActive,
            pressed && { opacity: 0.75 },
          ]}
          onPress={() => onChange(p)}
        >
          <Text style={[styles.periodTabText, period === p && styles.periodTabTextActive]}>
            {PERIOD_LABEL[p]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DreamForecastScreen() {
  const router = useRouter();
  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);
  const [period, setPeriod]             = useState<ForecastPeriod>('week');
  const [selectedCity, setSelectedCity] = useState<CityForecastSummary | null>(null);
  const [showAllThemes, setShowAllThemes]   = useState(false);
  const [showAllSymbols, setShowAllSymbols] = useState(false);

  const forecastQ = useQuery({
    queryKey: ['forecast', period],
    queryFn:  () => getForecast(period),
    staleTime: STALE,
  });

  const cityDetailQ = useQuery({
    queryKey: ['forecast', 'city', selectedCity?.slug],
    queryFn:  () => (selectedCity ? getCityForecast(selectedCity.slug) : Promise.resolve(null)),
    enabled:  !!selectedCity,
    staleTime: STALE,
  });

  const forecast = forecastQ.data;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.screenTitle}>DREAM FORECAST</Text>
          <Text style={styles.screenSub}>Kolektif Bilinçaltı Hava Durumu</Text>
        </View>
        {forecastQ.isLoading && <ActivityIndicator size="small" color={Colors.primary} />}
      </View>

      {/* Period selector */}
      <PeriodTabs period={period} onChange={setPeriod} />

      {/* City detail overlay */}
      {selectedCity && (
        <ScrollView style={styles.cityPanelWrap} showsVerticalScrollIndicator={false}>
          <CityDetailPanel
            city={selectedCity}
            detail={cityDetailQ.data ?? null}
            onClose={() => setSelectedCity(null)}
          />
        </ScrollView>
      )}

      {!selectedCity && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {forecast ? (
            <>
              {/* Explanation note */}
              <View style={styles.forecastHint}>
                <Ionicons name="information-circle-outline" size={11} color={Colors.textMuted} />
                <Text style={styles.forecastHintText}>
                  Tüm kullanıcıların rüyalarından hesaplanan kolektif trend analizi. Yükselen konular önceki döneme göredir.
                </Text>
              </View>

              {/* ── 1. Humanity Tonight ── */}
              <SectionTitle icon="globe-outline" color="#60A5FA">
                HUMANITY {period === 'today' ? 'TONIGHT' : period === 'week' ? 'THIS WEEK' : 'THIS MONTH'}
              </SectionTitle>
              <HumanityTonightCard forecast={forecast} />

              {/* ── 2. Rising Dream Themes ── */}
              {forecast.risingThemes.length > 0 && (
                <>
                  <SectionTitle icon="trending-up-outline" color="#34D399">
                    YÜKSELEN TEMALAR
                  </SectionTitle>
                  <View style={styles.sectionCard}>
                    {(showAllThemes
                      ? forecast.risingThemes
                      : forecast.risingThemes.slice(0, 5)
                    ).map((t) => (
                      <TrendItemRow key={t.name} item={t} accent="#34D399" />
                    ))}
                    {forecast.risingThemes.length > 5 && (
                      <Pressable
                        onPress={() => setShowAllThemes(!showAllThemes)}
                        style={styles.showMoreBtn}
                      >
                        <Text style={styles.showMoreText}>
                          {showAllThemes ? 'Daha az göster' : `${forecast.risingThemes.length - 5} tema daha`}
                        </Text>
                        <Ionicons
                          name={showAllThemes ? 'chevron-up' : 'chevron-down'}
                          size={11}
                          color={Colors.primary}
                        />
                      </Pressable>
                    )}
                    {forecast.fallingThemes.length > 0 && (
                      <>
                        <View style={styles.divider} />
                        {forecast.fallingThemes.map((t) => (
                          <FallingItemRow key={t.name} item={t} />
                        ))}
                      </>
                    )}
                  </View>
                </>
              )}

              {/* ── 3. Rising Dream Symbols ── */}
              {forecast.risingSymbols.length > 0 && (
                <>
                  <SectionTitle icon="sparkles-outline" color="#FBBF24">
                    YÜKSELEN SEMBOLLER
                  </SectionTitle>
                  <View style={styles.sectionCard}>
                    {(showAllSymbols
                      ? forecast.risingSymbols
                      : forecast.risingSymbols.slice(0, 5)
                    ).map((s) => (
                      <TrendItemRow key={s.name} item={s} accent="#FBBF24" />
                    ))}
                    {forecast.risingSymbols.length > 5 && (
                      <Pressable
                        onPress={() => setShowAllSymbols(!showAllSymbols)}
                        style={styles.showMoreBtn}
                      >
                        <Text style={styles.showMoreText}>
                          {showAllSymbols ? 'Daha az göster' : `${forecast.risingSymbols.length - 5} sembol daha`}
                        </Text>
                        <Ionicons
                          name={showAllSymbols ? 'chevron-up' : 'chevron-down'}
                          size={11}
                          color={Colors.primary}
                        />
                      </Pressable>
                    )}
                    {forecast.fallingSymbols.length > 0 && (
                      <>
                        <View style={styles.divider} />
                        {forecast.fallingSymbols.map((s) => (
                          <FallingItemRow key={s.name} item={s} />
                        ))}
                      </>
                    )}
                  </View>
                </>
              )}

              {/* ── 4. Emotional Climate ── */}
              {forecast.emotionalShifts.length > 0 && (
                <>
                  <SectionTitle icon="pulse-outline" color="#F472B6">
                    DUYGU İKLİMİ
                  </SectionTitle>
                  <View style={styles.sectionCard}>
                    {forecast.emotionalShifts.map((s) => (
                      <EmotionShiftRow key={s.emotion} shift={s} />
                    ))}
                  </View>
                </>
              )}

              {/* ── 5. Lucid Trend ── */}
              <SectionTitle icon="eye-outline" color="#C084FC">
                LUCID TREND
              </SectionTitle>
              <RatioTrendCard
                label="Lucid Rüya Oranı"
                ratio={forecast.lucidRatio}
                delta={forecast.lucidDelta}
                trend={forecast.lucidTrend}
                previousRatio={forecast.previousLucidRatio}
                color="#C084FC"
                icon="eye-outline"
              />

              {/* ── 6. Nightmare Trend ── */}
              <SectionTitle icon="skull-outline" color="#F87171">
                KABUS TREND
              </SectionTitle>
              <RatioTrendCard
                label="Kabus Oranı"
                ratio={forecast.nightmareRatio}
                delta={forecast.nightmareDelta}
                trend={forecast.nightmareTrend}
                previousRatio={forecast.previousNightmareRatio}
                color="#F87171"
                icon="skull-outline"
              />

              {/* ── 7. City Forecasts ── */}
              {forecast.cityForecasts.length > 0 && (
                <>
                  <SectionTitle icon="location-outline" color="#A78BFA">
                    ŞEHİR TAHMİNLERİ
                  </SectionTitle>
                  <View style={styles.sectionCard}>
                    {forecast.cityForecasts.map((city) => (
                      <CityForecastRow
                        key={city.slug}
                        city={city}
                        onPress={setSelectedCity}
                      />
                    ))}
                  </View>
                </>
              )}

              <View style={{ height: 40 }} />
            </>
          ) : forecastQ.isError ? (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Tahmin alınamadı</Text>
              <Text style={styles.emptyText}>API bağlantısını kontrol edin</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll:    { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 20 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  backBtn:    { padding: 4 },
  titleBlock: { flex: 1 },
  screenTitle: {
    fontSize: 14, fontWeight: '900', letterSpacing: 2.5, color: Colors.textPrimary,
  },
  screenSub: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },

  // Period tabs
  periodTabs: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  periodTabActive: { backgroundColor: Colors.primary },
  periodTabText:   { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  periodTabTextActive: { color: '#FFFFFF', fontWeight: '800' },

  // Section title
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 2,
  },
  sectionTitleText: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1.2,
  },

  // Section card wrapper
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 2,
  },

  divider: {
    height: 1, backgroundColor: Colors.border, marginVertical: 8,
  },

  // Hero card
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    padding: 14,
    gap: 12,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLeft: { flex: 1, gap: 4 },
  heroMood: { fontSize: 26, fontWeight: '900', color: Colors.textPrimary },
  heroDominantEmotion: { fontSize: 13, color: Colors.textMuted, textTransform: 'capitalize' },
  heroStats: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },

  // Score gauge
  scoreBlock: { alignItems: 'center', gap: 2 },
  scoreValue: { fontSize: 28, fontWeight: '900' },
  scoreLabel: { fontSize: 8, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1 },
  scoreMeter: {
    width: 8, height: 60, borderRadius: 4, borderWidth: 1,
    overflow: 'hidden', justifyContent: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 4,
  },
  scoreMeterFill: { borderRadius: 4, opacity: 0.85 },

  // Hero pills
  heroPillRow: { flexDirection: 'row', gap: 8 },
  heroPill: {
    flex: 1, borderWidth: 1, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center', gap: 2,
  },
  heroPillValue: { fontSize: 16, fontWeight: '900' },
  heroPillLabel: { fontSize: 8, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5 },
  heroPillDelta: { fontSize: 9, fontWeight: '700' },

  // Trend badge
  trendBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  trendBadgeText: { fontSize: 9, fontWeight: '700' },

  // Delta chip
  deltaChip: { fontSize: 11, fontWeight: '800' },

  // Trend row (rising/falling items)
  trendRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 7, gap: 10,
  },
  trendRowLeft: { flex: 1, gap: 4 },
  trendRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trendItemName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  trendBarTrack: {
    height: 2, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 1, overflow: 'hidden',
  },
  trendBarFill: { height: '100%', borderRadius: 1 },
  fallingRow: { opacity: 0.75 },
  fallingName: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  // Emotion row
  emotionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6,
  },
  emotionName: { fontSize: 12, color: Colors.textPrimary, width: 80 },
  emotionBarTrack: {
    flex: 1, height: 3,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden',
  },
  emotionBarFill: { height: '100%', borderRadius: 2 },
  emotionPct: { fontSize: 11, fontWeight: '700', width: 38, textAlign: 'right' },

  // Ratio trend card
  ratioCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderRadius: 14, padding: 14, gap: 10,
  },
  ratioCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ratioIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ratioLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  ratioValue: { fontSize: 22, fontWeight: '900' },
  ratioPrev:  { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  ratioCardRight: { alignItems: 'flex-end', gap: 6 },
  ratioDelta: { fontSize: 16, fontWeight: '900' },

  // City row
  cityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cityRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  cityDot: {
    width: 8, height: 8, borderRadius: 4,
    shadowRadius: 4, shadowOpacity: 0.7, shadowOffset: { width: 0, height: 0 },
  },
  cityName:    { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  cityCountry: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  cityThemes:  { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  cityRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cityCount: { fontSize: 14, fontWeight: '900' },

  // City detail panel
  cityPanelWrap: { flex: 1 },
  cityPanel: {
    margin: 14, backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 10,
  },
  cityPanelHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  cityPanelName:    { fontSize: 22, fontWeight: '900', color: Colors.textPrimary },
  cityPanelCountry: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  cityPanelClose:   { padding: 4 },
  cityPanelStats:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  cityStatPill: {
    flex: 1, minWidth: 60, paddingHorizontal: 8, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1, alignItems: 'center',
  },
  cityStatVal: { fontSize: 15, fontWeight: '900' },
  cityStatLbl: { fontSize: 8, color: Colors.textMuted, marginTop: 2, fontWeight: '600' },
  cityPanelSub: {
    fontSize: 9, fontWeight: '800', color: Colors.textMuted,
    letterSpacing: 1.2, marginTop: 6,
  },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  symbolChip: {
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', backgroundColor: 'rgba(251,191,36,0.1)',
  },
  symbolChipText: { fontSize: 11, fontWeight: '600', color: '#FBBF24' },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
  emptyText:  { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  // Forecast hint
  forecastHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: Colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 4,
  },
  forecastHintText: { fontSize: 11, color: Colors.textMuted, flex: 1, lineHeight: 16 },

  // Show more button
  showMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 8, marginTop: 4,
  },
  showMoreText: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
});
