import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getMyMatches } from '@/api/matches.api';
import Avatar from '@/components/Avatar';
import { Colors } from '@/constants/colors';
import type { DreamMatch } from '@/types/match.types';

// ── Label maps ────────────────────────────────────────────────────────────────

const EMOTION_TR: Record<string, string> = {
  fear: 'Korku', joy: 'Sevinç', peace: 'Huzur', loneliness: 'Yalnızlık',
  wonder: 'Merak', sadness: 'Hüzün', anger: 'Öfke', nostalgia: 'Özlem',
  love: 'Aşk', anxiety: 'Kaygı', excitement: 'Heyecan', grief: 'Yas',
  confusion: 'Karmaşa', calm: 'Sükunet', awe: 'Hayranlık',
  dread: 'Tedirginlik', serenity: 'Dinginlik',
};

const SYMBOL_TR: Record<string, string> = {
  threshold: 'Eşik', shadow: 'Gölge', flood: 'Sel', abyss: 'Uçurum',
  guide: 'Rehber', labyrinth: 'Labirent', door: 'Kapı', mirror_self: 'Ayna',
  tree: 'Ağaç', water: 'Su', key: 'Anahtar', light: 'Işık', fire: 'Ateş',
  flying: 'Uçuş', falling: 'Düşüş', sea: 'Deniz', old_house: 'Eski Ev',
  animal: 'Hayvan', child: 'Çocuk', chase: 'Takip', vehicle: 'Araç',
  transformation: 'Dönüşüm',
};

const THEME_TR: Record<string, string> = {
  pursuit: 'Takip', threshold: 'Eşik', flying: 'Uçuş',
  transformation: 'Dönüşüm', reunion: 'Kavuşma', loss: 'Kayıp',
  chase: 'Kovalanma', falling: 'Düşme', water: 'Su', fire: 'Ateş',
  descent: 'İniş', ascent: 'Yükseliş', school: 'Okul', death: 'Ölüm',
  birth: 'Doğum', journey: 'Yolculuk', entrapment: 'Sıkışma',
  discovery: 'Keşif', confrontation: 'Yüzleşme', protection: 'Koruma',
};

// ── Label helpers ─────────────────────────────────────────────────────────────

function trLabel(key: string): string {
  return EMOTION_TR[key] ?? SYMBOL_TR[key] ?? THEME_TR[key] ?? key;
}

function scoreColor(score: number): string {
  if (score >= 80) return '#34D399';
  if (score >= 65) return '#A78BFA';
  return '#60A5FA';
}

// ── "Neden eşleşti?" narrative ────────────────────────────────────────────────

function buildNarrative(match: DreamMatch): string {
  const sym   = match.sharedSymbols[0];
  const sym2  = match.sharedSymbols[1];
  const emo   = match.sharedEmotions[0];
  const theme = match.sharedThemes[0];

  const SL = sym   ? trLabel(sym).toLowerCase()   : null;
  const S2 = sym2  ? trLabel(sym2).toLowerCase()  : null;
  const EL = emo   ? trLabel(emo).toLowerCase()   : null;
  const TL = theme ? trLabel(theme).toLowerCase() : null;

  if (SL && EL && TL)
    return `Her iki rüyada da ${SL} imgesi ${TL} deneyimiyle ve ${EL} duygusunun gölgesinde belirdi.`;
  if (SL && S2)
    return `${trLabel(sym!)} ve ${trLabel(sym2!)} bu gece her iki bilinçaltında da güçlü bir iz bıraktı.`;
  if (SL && EL)
    return `${trLabel(sym!)} imgesi, ${EL} duygusunun gölgesinde her iki rüyada da yüzeye çıktı.`;
  if (SL && TL)
    return `${TL.charAt(0).toUpperCase() + TL.slice(1)} enerjisi her iki bilinçte de ${SL} sembolüyle ifade buldu.`;
  if (EL && TL)
    return `${TL.charAt(0).toUpperCase() + TL.slice(1)} deneyimi her iki rüyada da ${EL} frekansında titreşti.`;
  if (SL)
    return `${trLabel(sym!)} bu gece her iki bilinçaltında da güçlü bir yankı bıraktı.`;
  if (EL)
    return `${trLabel(emo!)} frekansı bu gece her iki rüyada da baskın çıktı.`;
  if (TL)
    return `${trLabel(theme!)} enerjisi bu gece her iki bilinçte de derinlemesine işlendi.`;
  return 'Bu gece rüyalarınız benzer bilinçaltı alanlarında kesişti.';
}

// ── Match card ────────────────────────────────────────────────────────────────

interface TagGroup {
  items:  string[];
  color:  string;
  label:  string;
}

function MatchCard({ match }: { match: DreamMatch }) {
  const name      = match.matchingUserDisplayName ?? match.matchingUserUsername;
  const score     = Math.round(match.matchScore);
  const color     = scoreColor(score);
  const narrative = buildNarrative(match);

  const groups: TagGroup[] = [
    { items: match.sharedEmotions, color: '#F472B6', label: 'Duygu' },
    { items: match.sharedSymbols,  color: '#60A5FA', label: 'Sembol' },
    { items: match.sharedThemes,   color: '#A78BFA', label: 'Tema' },
  ].filter(g => g.items.length > 0);

  return (
    <View style={mc.card}>
      {/* Score accent bar */}
      <View style={[mc.scoreBar, { backgroundColor: color, width: `${Math.min(100, score)}%` as any }]} />

      {/* User row */}
      <View style={mc.userRow}>
        <Avatar uri={match.matchingUserAvatarUrl} name={name} size={36} />
        <View style={mc.userMeta}>
          <Text style={mc.username} numberOfLines={1}>{name}</Text>
          <Text style={mc.handle} numberOfLines={1}>@{match.matchingUserUsername}</Text>
        </View>
        <View style={[mc.scoreBadge, { borderColor: `${color}40`, backgroundColor: `${color}10` }]}>
          <Text style={[mc.scoreText, { color }]}>{score}%</Text>
          <Text style={mc.scoreLabel}>Yankı</Text>
        </View>
      </View>

      {/* Shared element tags */}
      {groups.map(g => (
        <View key={g.label} style={mc.tagGroup}>
          <Text style={mc.tagGroupLabel}>{g.label.toUpperCase()}</Text>
          <View style={mc.tags}>
            {g.items.slice(0, 4).map(k => (
              <View key={k} style={[mc.tag, { borderColor: `${g.color}35`, backgroundColor: `${g.color}0D` }]}>
                <Text style={[mc.tagText, { color: g.color }]}>{trLabel(k)}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Narrative */}
      <View style={mc.narrativeWrap}>
        <Text style={mc.narrativeLabel}>NEDEN EŞLEŞTİ?</Text>
        <Text style={mc.narrative}>{narrative}</Text>
      </View>
    </View>
  );
}

const mc = StyleSheet.create({
  card: {
    backgroundColor: '#07051A',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    gap: 14,
    padding: 16,
  },
  scoreBar: {
    position: 'absolute', top: 0, left: 0, height: 2,
    borderTopLeftRadius: 16, opacity: 0.7,
  },
  userRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  userMeta:  { flex: 1 },
  username:  { fontSize: 15, fontWeight: '800', color: 'rgba(255,255,255,0.92)' },
  handle:    { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 },
  scoreBadge:{
    alignItems: 'center',
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  scoreText:  { fontSize: 16, fontWeight: '900' },
  scoreLabel: { fontSize: 9, color: 'rgba(255,255,255,0.40)', fontWeight: '700', letterSpacing: 0.5 },
  tagGroup:   { gap: 6 },
  tagGroupLabel: {
    fontSize: 8, fontWeight: '800', letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.25)',
  },
  tags:     { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag: {
    borderWidth: 1, borderRadius: 7,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  tagText:  { fontSize: 11, fontWeight: '700' },
  narrativeWrap: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10, padding: 11, gap: 5,
  },
  narrativeLabel: {
    fontSize: 8, fontWeight: '800', letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.25)',
  },
  narrative: {
    fontSize: 13, color: 'rgba(255,255,255,0.72)',
    lineHeight: 20, fontStyle: 'italic',
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function NearbyMindsScreen() {
  const { data, isLoading } = useQuery({
    queryKey:  ['matches', 'all'],
    queryFn:   () => getMyMatches({ limit: 20 }),
    staleTime: 10 * 60 * 1000,
    retry:     1,
  });

  const matches = data?.items ?? [];

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back} hitSlop={14}>
          <Ionicons name="arrow-back-outline" size={18} color={Colors.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Yakın Bilinçler</Text>
          {matches.length > 0 && (
            <Text style={s.headerSub}>{matches.length} rezonans eşleşmesi</Text>
          )}
        </View>
        <View style={s.resonanceDot} />
      </View>

      {/* Concept note */}
      <View style={s.conceptNote}>
        <Ionicons name="pulse-outline" size={11} color="rgba(167,139,250,0.55)" />
        <Text style={s.conceptText}>
          Rüyalarında benzer imgeler, duygular ve temalar barındıran bilinçler
        </Text>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.loadingText}>Rezonanslar hesaplanıyor…</Text>
        </View>
      ) : matches.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="radio-outline" size={40} color={Colors.textMuted} />
          <Text style={s.emptyTitle}>Henüz bir yankı yok</Text>
          <Text style={s.emptyBody}>Rüyalarını kaydetmeye devam et. Bilinçler yaklaştıkça burada belirirler.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        >
          {matches.map(m => <MatchCard key={m.id} match={m} />)}
          <Text style={s.footer}>
            Eşleşmeler son 30 günün rüya aktivitesinden hesaplanır.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#04030F' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(99,91,255,0.14)',
  },
  back:         { padding: 4 },
  headerTitle:  { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  headerSub:    { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  resonanceDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#A78BFA', opacity: 0.7,
  },

  conceptNote: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  conceptText: { fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 16, flex: 1 },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingHorizontal: 40,
  },
  loadingText: { fontSize: 13, color: Colors.textMuted },
  emptyTitle:  { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  emptyBody:   { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  list:   { padding: 16, gap: 12, paddingBottom: 48 },
  footer: {
    textAlign: 'center', fontSize: 11, color: Colors.textMuted,
    marginTop: 8, lineHeight: 17,
  },
});
