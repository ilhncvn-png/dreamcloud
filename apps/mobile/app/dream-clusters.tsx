import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { getAllClusters, getClusterDetail, getMyClusters } from '@/api/clusters.api';
import type { ClusterMembership, DreamCluster } from '@/types/cluster.types';

const CLUSTER_COLORS: Record<string, string> = {
  'gokyuzu-gezginleri':  '#60A5FA',
  'deniz-hafizasi':      '#34D399',
  'kayip-sehirler':      '#F472B6',
  'gece-yolculari':      '#A78BFA',
  'esik-geçenler':       '#FBBF24',
  'golge-takipcileri':   '#F87171',
  'lucid-kasifler':      '#C084FC',
  'donusum-ruyacilari':  '#FB923C',
};

const CLUSTER_EMOJI: Record<string, string> = {
  'gokyuzu-gezginleri':  '✦',
  'deniz-hafizasi':      '◈',
  'kayip-sehirler':      '◎',
  'gece-yolculari':      '◉',
  'esik-geçenler':       '◇',
  'golge-takipcileri':   '◆',
  'lucid-kasifler':      '◈',
  'donusum-ruyacilari':  '◉',
};

function clusterColor(slug: string): string {
  return CLUSTER_COLORS[slug] ?? Colors.primary;
}
function clusterGlyph(slug: string): string {
  return CLUSTER_EMOJI[slug] ?? '◎';
}

// ─── Sub-screens ─────────────────────────────────────────────────────────────

function ClusterDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['cluster-detail', id],
    queryFn: () => getClusterDetail(id),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const { cluster, topMembers, myMembership } = data;
  const color = clusterColor(cluster.slug);
  const glyph = clusterGlyph(cluster.slug);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
        <Text style={styles.backText}>Rüya Kümeleri</Text>
      </Pressable>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Hero */}
        <View style={[styles.detailHero, { borderColor: `${color}40` }]}>
          <View style={[styles.detailGlyph, { backgroundColor: `${color}20` }]}>
            <Text style={[styles.detailGlyphText, { color }]}>{glyph}</Text>
          </View>
          <Text style={styles.detailName}>{cluster.name}</Text>
          {cluster.description ? (
            <Text style={styles.detailDesc}>{cluster.description}</Text>
          ) : null}
          <View style={styles.detailStats}>
            <StatChip label={`${cluster.memberCount} üye`}    color={color} />
            <StatChip label={`${cluster.dreamCount} rüya`}    color={color} />
            <StatChip label={`${Math.round(cluster.strengthScore)} güç`} color={color} />
          </View>
        </View>

        {/* My membership */}
        {myMembership ? (
          <View style={[styles.myMemberCard, { borderColor: `${color}30` }]}>
            <View style={styles.myMemberRow}>
              <Ionicons name="checkmark-circle" size={18} color={color} />
              <Text style={[styles.myMemberLabel, { color }]}>Bu kümenin üyesisin</Text>
            </View>
            <Text style={styles.myMemberScore}>
              Uyum skoru: <Text style={{ color, fontWeight: '800' }}>{Math.round(myMembership.membershipScore)}</Text>
            </Text>
            {myMembership.matchedThemes.length > 0 && (
              <View style={styles.chipRow}>
                {myMembership.matchedThemes.map((t) => (
                  <View key={t} style={[styles.chip, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
                    <Text style={[styles.chipText, { color }]}>{t}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.notMemberCard}>
            <Ionicons name="ellipse-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.notMemberText}>Bu kümenin üyesi değilsin</Text>
          </View>
        )}

        {/* Top members */}
        {topMembers.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>KÜME ÜYELERİ</Text>
            {topMembers.map((m, i) => (
              <View key={m.userId} style={styles.memberRow}>
                <Text style={[styles.memberRank, { color }]}>#{i + 1}</Text>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{m.displayName ?? m.username}</Text>
                  <Text style={styles.memberUsername}>@{m.username}</Text>
                </View>
                <ScoreBar score={m.membershipScore} color={color} />
              </View>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatChip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.statChip, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
      <Text style={[styles.statChipText, { color }]}>{label}</Text>
    </View>
  );
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  const pct = Math.min(100, score);
  return (
    <View style={styles.scoreBarWrap}>
      <Text style={[styles.scoreBarNum, { color }]}>{Math.round(score)}</Text>
      <View style={styles.scoreBarTrack}>
        <View style={[styles.scoreBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ─── Cluster card (for list views) ───────────────────────────────────────────

function ClusterCard({
  cluster,
  membershipScore,
  onPress,
}: {
  cluster: DreamCluster;
  membershipScore?: number;
  onPress: () => void;
}) {
  const color = clusterColor(cluster.slug);
  const glyph = clusterGlyph(cluster.slug);

  return (
    <Pressable
      style={({ pressed }) => [styles.clusterCard, { borderColor: `${color}30`, opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.clusterGlyph, { backgroundColor: `${color}18` }]}>
        <Text style={[styles.clusterGlyphText, { color }]}>{glyph}</Text>
      </View>
      <View style={styles.clusterInfo}>
        <Text style={styles.clusterName}>{cluster.name}</Text>
        {cluster.description ? (
          <Text style={styles.clusterDesc} numberOfLines={2}>{cluster.description}</Text>
        ) : null}
        <View style={styles.clusterMeta}>
          <Text style={styles.clusterMetaText}>{cluster.memberCount} üye</Text>
          <Text style={styles.clusterMetaDot}>·</Text>
          <Text style={styles.clusterMetaText}>{cluster.dreamCount} rüya</Text>
          {membershipScore !== undefined && (
            <>
              <Text style={styles.clusterMetaDot}>·</Text>
              <Text style={[styles.clusterMetaScore, { color }]}>
                {Math.round(membershipScore)} uyum
              </Text>
            </>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </Pressable>
  );
}

// ─── Main list view ───────────────────────────────────────────────────────────

type Tab = 'mine' | 'popular' | 'rising';

export default function DreamClustersScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router  = useRouter();

  if (id) return <ClusterDetailView id={id} />;

  const [tab, setTab] = useState<Tab>('mine');

  const { data: myClusters = [], isLoading: loadingMine } = useQuery({
    queryKey: ['clusters', 'me'],
    queryFn: getMyClusters,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allClusters = [], isLoading: loadingAll } = useQuery({
    queryKey: ['clusters', 'all'],
    queryFn: getAllClusters,
    staleTime: 5 * 60 * 1000,
  });

  const popular = [...allClusters].sort((a, b) => b.memberCount - a.memberCount);
  const rising  = [...allClusters].sort((a, b) => b.strengthScore - a.strengthScore);

  const myMembershipMap = new Map(myClusters.map((m) => [m.cluster.id, m.membershipScore]));

  const toDetail = (clusterId: string) => {
    router.push({ pathname: '/dream-clusters', params: { id: clusterId } } as any);
  };

  const loading = (tab === 'mine' && loadingMine) || (tab !== 'mine' && loadingAll);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
        <Text style={styles.backText}>Benim Dünyam</Text>
      </Pressable>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <Text style={styles.heading}>Rüya Kümeleri</Text>
        <Text style={styles.headingSub}>
          Bilinçaltındaki örüntüler seni diğer rüyacılarla birleştiriyor
        </Text>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['mine', 'popular', 'rising'] as const).map((t) => (
            <Pressable
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'mine' ? 'Benim Kümelerim' : t === 'popular' ? 'Popüler' : 'Yükselen'}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : tab === 'mine' ? (
          myClusters.length === 0 ? (
            <EmptyState
              icon="layers-outline"
              text="Henüz hiçbir kümeye dahil değilsin"
              sub="Analiz edilen rüyaların arttıkça kümeler oluşmaya başlar"
            />
          ) : (
            myClusters.map((m) => (
              <ClusterCard
                key={m.cluster.id}
                cluster={m.cluster}
                membershipScore={m.membershipScore}
                onPress={() => toDetail(m.cluster.id)}
              />
            ))
          )
        ) : (
          (tab === 'popular' ? popular : rising).map((c) => {
            const score = myMembershipMap.get(c.id);
            return (
              <ClusterCard
                key={c.id}
                cluster={c}
                {...(score !== undefined ? { membershipScore: score } : {})}
                onPress={() => toDetail(c.id)}
              />
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyState({ icon, text, sub }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string; sub: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={36} color={Colors.textMuted} />
      <Text style={styles.emptyText}>{text}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll:    { paddingHorizontal: 16, paddingBottom: 40 },
  centered:  { paddingVertical: 60, alignItems: 'center' },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backText: { fontSize: 13, color: Colors.textSecondary },

  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  headingSub: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 18,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabText:       { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: '#FFFFFF', fontWeight: '700' },

  // Cluster card
  clusterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  clusterGlyph: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterGlyphText: { fontSize: 20, fontWeight: '800' },
  clusterInfo: { flex: 1, gap: 3 },
  clusterName: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  clusterDesc: { fontSize: 12, color: Colors.textMuted, lineHeight: 16 },
  clusterMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  clusterMetaText:  { fontSize: 11, color: Colors.textMuted },
  clusterMetaDot:   { fontSize: 11, color: Colors.textMuted },
  clusterMetaScore: { fontSize: 11, fontWeight: '700' },

  // Detail hero
  detailHero: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  detailGlyph: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailGlyphText: { fontSize: 30, fontWeight: '800' },
  detailName: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  detailDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, textAlign: 'center' },
  detailStats: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  statChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statChipText: { fontSize: 12, fontWeight: '700' },

  // My membership card
  myMemberCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    marginBottom: 12,
  },
  myMemberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  myMemberLabel: { fontSize: 14, fontWeight: '700' },
  myMemberScore: { fontSize: 12, color: Colors.textSecondary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: '600' },

  notMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  notMemberText: { fontSize: 13, color: Colors.textMuted },

  // Members list
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginTop: 16,
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 8,
  },
  memberRank: { fontSize: 12, fontWeight: '800', width: 26 },
  memberInfo: { flex: 1, gap: 2 },
  memberName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  memberUsername: { fontSize: 11, color: Colors.textMuted },

  // Score bar
  scoreBarWrap: { alignItems: 'flex-end', gap: 4, minWidth: 70 },
  scoreBarNum: { fontSize: 13, fontWeight: '800' },
  scoreBarTrack: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  scoreBarFill: { height: '100%', borderRadius: 2 },

  // Empty state
  emptyState: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  emptyText: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center' },
  emptySub:  { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 19 },
});
