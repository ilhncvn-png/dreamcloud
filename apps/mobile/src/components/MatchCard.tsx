import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '@/components/Avatar';
import { Colors } from '@/constants/colors';
import {
  THEME_LABELS, EMOTION_LABELS, SYMBOL_LABELS, labelOf,
  RESONANCE_HUMAN_LABELS, RESONANCE_COLORS,
} from '@/utils/resonance-labels';
import type { DreamMatch, ResonanceLevel } from '@/types/match.types';

interface Props {
  match: DreamMatch;
  onPress: () => void;
  onDetailPress?: () => void;
}

export default function MatchCard({ match, onPress, onDetailPress }: Props) {
  const level     = match.resonanceLevel as ResonanceLevel;
  const color     = RESONANCE_COLORS[level] ?? Colors.primary;
  const levelName = RESONANCE_HUMAN_LABELS[level] ?? level;

  const displayName = match.matchingUserDisplayName ?? match.matchingUserUsername;
  const dreamTitle  = match.matchingDreamTitle ?? 'İsimsiz Rüya';
  const preview     = match.matchingDreamContent.slice(0, 100).trim();

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      {/* Resonance level chip */}
      <View style={[styles.levelChip, { backgroundColor: `${color}15`, borderColor: `${color}35` }]}>
        <Ionicons name="sparkles-outline" size={10} color={color} />
        <Text style={[styles.levelText, { color }]}>{levelName}</Text>
      </View>

      {/* User row */}
      <View style={styles.userRow}>
        <Avatar uri={match.matchingUserAvatarUrl} name={displayName} size={36} />
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.username}>@{match.matchingUserUsername}</Text>
        </View>
      </View>

      {/* Dream content */}
      <View style={styles.dreamBox}>
        <Text style={styles.dreamTitle} numberOfLines={1}>{dreamTitle}</Text>
        <Text style={styles.dreamPreview} numberOfLines={2}>{preview}…</Text>
      </View>

      {/* Shared dimensions as labels */}
      {match.sharedThemes.length > 0 && (
        <View style={styles.tagsRow}>
          <Ionicons name="grid-outline" size={11} color={Colors.textMuted} />
          <Text style={styles.tagsText}>
            {match.sharedThemes.slice(0, 3).map(t => labelOf(THEME_LABELS, t)).join(' · ')}
          </Text>
        </View>
      )}
      {match.sharedEmotions.length > 0 && (
        <View style={styles.tagsRow}>
          <Ionicons name="heart-outline" size={11} color={Colors.textMuted} />
          <Text style={styles.tagsText}>
            {match.sharedEmotions.slice(0, 3).map(e => labelOf(EMOTION_LABELS, e)).join(' · ')}
          </Text>
        </View>
      )}
      {match.sharedSymbols.length > 0 && (
        <View style={styles.tagsRow}>
          <Ionicons name="eye-outline" size={11} color={Colors.textMuted} />
          <Text style={styles.tagsText}>
            {match.sharedSymbols.slice(0, 3).map(s => labelOf(SYMBOL_LABELS, s)).join(' · ')}
          </Text>
        </View>
      )}

      {/* Detail button */}
      {onDetailPress && (
        <View style={styles.bottomRow}>
          <Pressable
            onPress={onDetailPress}
            style={({ pressed }) => [styles.detailBtn, { opacity: pressed ? 0.7 : 1, borderColor: color }]}
          >
            <Text style={[styles.detailBtnText, { color }]}>Bağlantıyı Gör</Text>
            <Ionicons name="chevron-forward" size={12} color={color} />
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
  },

  levelChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  levelText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userInfo: { gap: 1 },
  displayName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  username:    { fontSize: 12, color: Colors.textMuted },

  dreamBox: { gap: 4 },
  dreamTitle:   { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  dreamPreview: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tagsText: { fontSize: 12, color: Colors.textMuted, flex: 1 },

  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  detailBtnText: { fontSize: 11, fontWeight: '700' },
});
