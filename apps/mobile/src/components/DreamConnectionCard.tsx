import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '@/components/Avatar';
import { Colors } from '@/constants/colors';
import {
  THEME_LABELS,
  EMOTION_LABELS,
  SYMBOL_LABELS,
  ARCHETYPE_LABELS,
  labelOf,
  buildConnectionNarrative,
  RESONANCE_HUMAN_LABELS,
  RESONANCE_COLORS,
} from '@/utils/resonance-labels';
import type { DreamMatch } from '@/types/match.types';

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  match: DreamMatch;
  onPress: () => void;
  defaultExpanded?: boolean;
}

export default function DreamConnectionCard({ match, onPress, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const color     = RESONANCE_COLORS[match.resonanceLevel] ?? '#A78BFA';
  const levelName = RESONANCE_HUMAN_LABELS[match.resonanceLevel] ?? match.resonanceLevel;
  const name      = match.matchingUserDisplayName ?? match.matchingUserUsername;

  const narrative = buildConnectionNarrative({
    sharedThemes:     match.sharedThemes     ?? [],
    sharedEmotions:   match.sharedEmotions   ?? [],
    sharedSymbols:    match.sharedSymbols    ?? [],
    sharedLocations:  match.sharedLocations  ?? [],
    sharedArchetypes: match.sharedArchetypes ?? [],
    matchScore:       match.matchScore,
    resonanceLevel:   match.resonanceLevel,
  });

  const excerpt = match.matchingDreamContent?.slice(0, 120).trim();

  const signals: { label: string; color: string }[] = [
    ...(match.sharedEmotions  ?? []).slice(0, 2).map(e => ({ label: labelOf(EMOTION_LABELS,   e), color: '#F472B6' })),
    ...(match.sharedThemes    ?? []).slice(0, 2).map(t => ({ label: labelOf(THEME_LABELS,     t), color: '#A78BFA' })),
    ...(match.sharedSymbols   ?? []).slice(0, 1).map(s => ({ label: labelOf(SYMBOL_LABELS,   s), color: '#60A5FA' })),
    ...(match.sharedArchetypes ?? []).slice(0, 1).map(a => ({ label: labelOf(ARCHETYPE_LABELS, a), color: '#FBBF24' })),
  ].slice(0, 4);

  return (
    <View style={[s.card, { borderColor: `${color}30` }]}>
      {/* Header row: always visible, tap to toggle */}
      <Pressable
        style={({ pressed }) => [s.header, { opacity: pressed ? 0.85 : 1 }]}
        onPress={() => setExpanded(e => !e)}
        accessibilityRole="button"
      >
        <Avatar uri={match.matchingUserAvatarUrl} name={name} size={34} />
        <View style={s.userMeta}>
          <Text style={s.userName} numberOfLines={1}>{name}</Text>
          {match.matchingDreamTitle && (
            <Text style={s.dreamTitle} numberOfLines={1}>"{match.matchingDreamTitle}"</Text>
          )}
        </View>
        <View style={[s.levelChip, { backgroundColor: `${color}15`, borderColor: `${color}35` }]}>
          <Text style={[s.levelText, { color }]}>{levelName}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={14}
          color={Colors.textMuted}
        />
      </Pressable>

      {/* Expanded body: mystery reveal */}
      {expanded && (
        <View style={s.body}>
          <Text style={s.narrative}>{narrative}</Text>

          {excerpt ? (
            <View style={[s.excerptBox, { borderColor: `${color}20`, backgroundColor: `${color}08` }]}>
              <Text style={s.excerptText} numberOfLines={3}>"{excerpt}…"</Text>
            </View>
          ) : null}

          {signals.length > 0 && (
            <View style={s.signalRow}>
              {signals.map((chip, i) => (
                <View key={i} style={[s.chip, { borderColor: `${chip.color}40`, backgroundColor: `${chip.color}12` }]}>
                  <Text style={[s.chipText, { color: chip.color }]}>{chip.label}</Text>
                </View>
              ))}
            </View>
          )}

          <Pressable
            style={({ pressed }) => [s.detailBtn, { borderColor: `${color}50`, opacity: pressed ? 0.8 : 1 }]}
            onPress={onPress}
          >
            <Text style={[s.detailBtnText, { color }]}>Bağlantıyı Keşfet</Text>
            <Ionicons name="arrow-forward-outline" size={13} color={color} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 13,
  },
  userMeta: { flex: 1, gap: 2 },
  userName:  { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  dreamTitle:{ fontSize: 11, color: Colors.textMuted, fontStyle: 'italic' },

  levelChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  levelText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  body: {
    paddingHorizontal: 13,
    paddingBottom: 13,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  narrative: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    fontStyle: 'italic',
    paddingTop: 10,
  },

  excerptBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  excerptText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  signalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: { fontSize: 11, fontWeight: '700' },

  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 2,
  },
  detailBtnText: { fontSize: 13, fontWeight: '700' },
});
