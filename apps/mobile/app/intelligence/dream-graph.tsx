import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDreamGraph } from '@/api/intelligence.api';
import type { GraphNode, GraphConnection } from '@/types/intelligence.types';

// ── Colors ────────────────────────────────────────────────────────────────────

const COLORS = {
  bg:      '#0F0F23',
  surface: '#1A1A35',
  primary: '#6C63FF',
  text:    '#FFFFFF',
  sub:     '#9B9BB4',
  muted:   '#5A5A7A',
  border:  'rgba(255,255,255,0.06)',
};

const TYPE_LABELS: Record<string, string> = {
  symbol:    'Sembol',
  emotion:   'Duygu',
  archetype: 'Arketip',
  theme:     'Tema',
  place:     'Yer',
};

function resonanceColor(lvl: string) {
  if (lvl === 'cosmic')  return '#FBBF24';
  if (lvl === 'deep')    return '#A78BFA';
  if (lvl === 'surface') return '#60A5FA';
  return '#5A5A7A';
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function NodeChip({ node }: { node: GraphNode }) {
  return (
    <View style={[styles.nodeChip, { borderColor: node.color + '44', backgroundColor: node.color + '14' }]}>
      <Text style={[styles.nodeLabel, { color: node.color }]}>{node.label}</Text>
      {node.weight != null && (
        <Text style={[styles.nodeWeight, { color: node.color + '99' }]}>{node.weight}%</Text>
      )}
    </View>
  );
}

function ConnectionCard({ conn }: { conn: GraphConnection }) {
  const color = resonanceColor(conn.resonance_level);
  return (
    <View style={styles.connCard}>
      <View style={styles.connHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.connTitle} numberOfLines={1}>{conn.other_title ?? 'Başlıksız Rüya'}</Text>
          <Text style={styles.connUser}>@{conn.other_user}</Text>
        </View>
        <View style={styles.connScore}>
          <Text style={[styles.connScoreNum, { color }]}>{conn.score.toFixed(0)}%</Text>
          <Text style={[styles.connLevel, { color }]}>{conn.resonance_level}</Text>
        </View>
      </View>
      {conn.shared_emotions && conn.shared_emotions.length > 0 && (
        <View style={styles.tagRow}>
          {conn.shared_emotions.slice(0, 3).map(e => (
            <View key={e} style={styles.emoTag}>
              <Text style={styles.emoTagText}>{e}</Text>
            </View>
          ))}
        </View>
      )}
      {conn.shared_symbols && conn.shared_symbols.length > 0 && (
        <View style={styles.tagRow}>
          {conn.shared_symbols.slice(0, 3).map(s => (
            <View key={s} style={styles.symTag}>
              <Text style={styles.symTagText}>{s}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DreamGraphScreen() {
  const { dreamId } = useLocalSearchParams<{ dreamId: string }>();
  const [activeType, setActiveType] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dream-graph', dreamId],
    queryFn: () => getDreamGraph(dreamId ?? ''),
    enabled: !!dreamId,
  });

  if (!dreamId) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Dream ID eksik.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Graf yükleniyor...</Text>
      </View>
    );
  }

  if (isError || !data || data.accessDenied) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{data?.accessDenied ? 'Bu rüyaya erişim izniniz yok.' : 'Graf yüklenemedi.'}</Text>
      </View>
    );
  }

  const nodeTypes = [...new Set(data.nodes.map(n => n.type))];
  const filteredNodes = activeType ? data.nodes.filter(n => n.type === activeType) : data.nodes;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dream Graph</Text>
          <Text style={styles.headerSub} numberOfLines={1}>Rüya ID: {dreamId}</Text>
        </View>

        {/* Summary stats */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.statScroll} contentContainerStyle={styles.statScrollContent}>
          {[
            { label: 'Sembol',    val: data.summary.symbolCount,    color: '#60A5FA' },
            { label: 'Duygu',    val: data.summary.emotionCount,   color: '#F472B6' },
            { label: 'Arketip',  val: data.summary.archetypeCount, color: '#FBBF24' },
            { label: 'Tema',     val: data.summary.themeCount,     color: '#A78BFA' },
            { label: 'Yer',      val: data.summary.placeCount,     color: '#34D399' },
            { label: 'Bağlantı', val: data.summary.connectionCount,color: '#00CFFF' },
          ].map(({ label, val, color }) => (
            <View key={label} style={styles.summaryCard}>
              <Text style={[styles.summaryVal, { color }]}>{val}</Text>
              <Text style={styles.summaryLabel}>{label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Node map */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Düğüm Haritası</Text>
          {/* Type filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.filterRow}>
              <Pressable onPress={() => setActiveType(null)}
                style={[styles.filterChip, activeType === null && styles.filterChipActive]}>
                <Text style={[styles.filterText, activeType === null && styles.filterTextActive]}>Tümü</Text>
              </Pressable>
              {nodeTypes.map(type => {
                const sampleColor = data.nodes.find(n => n.type === type)?.color ?? COLORS.muted;
                return (
                  <Pressable key={type} onPress={() => setActiveType(type)}
                    style={[styles.filterChip, activeType === type && { borderColor: sampleColor + '60', backgroundColor: sampleColor + '18' }]}>
                    <Text style={[styles.filterText, activeType === type && { color: sampleColor }]}>
                      {TYPE_LABELS[type] ?? type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <View style={styles.nodeWrap}>
            {filteredNodes.map(node => <NodeChip key={node.id} node={node} />)}
            {filteredNodes.length === 0 && (
              <Text style={styles.emptyText}>Bu kategoride düğüm yok.</Text>
            )}
          </View>
        </View>

        {/* Connections */}
        {data.connections.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rezonans Bağlantıları</Text>
            {data.connections.map((conn, i) => (
              <ConnectionCard key={`${conn.id}-${i}`} conn={conn} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:     { flex: 1, backgroundColor: COLORS.bg },
  scroll:       { flex: 1 },
  scrollContent:{ paddingBottom: 40 },
  center:       { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:  { color: COLORS.sub, fontSize: 14 },
  errorText:    { color: '#FF3060', fontSize: 14 },

  header:      { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerTitle: { color: COLORS.text, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  headerSub:   { color: COLORS.muted, fontSize: 11, fontVariant: ['tabular-nums'] },

  statScroll:        { marginBottom: 8 },
  statScrollContent: { gap: 8, paddingHorizontal: 16 },
  summaryCard:       { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, alignItems: 'center', minWidth: 70 },
  summaryVal:        { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  summaryLabel:      { color: COLORS.muted, fontSize: 10, marginTop: 4 },

  card:      { backgroundColor: COLORS.surface, borderRadius: 16, marginHorizontal: 16, marginTop: 12, padding: 16 },
  cardTitle: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 12 },

  filterScroll: { marginBottom: 12 },
  filterRow:    { flexDirection: 'row', gap: 6 },
  filterChip:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.08)' },
  filterText:   { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  filterTextActive: { color: COLORS.text },

  nodeWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nodeChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  nodeLabel:  { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  nodeWeight: { fontSize: 9, fontVariant: ['tabular-nums'] },

  emptyText: { color: COLORS.muted, fontSize: 13 },

  connCard:   { marginTop: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.02)' },
  connHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  connTitle:  { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  connUser:   { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  connScore:  { alignItems: 'flex-end' },
  connScoreNum: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  connLevel:  { fontSize: 10, marginTop: 1 },
  tagRow:     { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginTop: 4 },
  emoTag:     { backgroundColor: 'rgba(244,114,182,0.15)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  emoTagText: { color: '#F472B6', fontSize: 9, fontWeight: '600' },
  symTag:     { backgroundColor: 'rgba(96,165,250,0.15)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  symTagText: { color: '#60A5FA', fontSize: 9, fontWeight: '600' },
});
