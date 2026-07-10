import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
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
import { getDream } from '@/api/dreams.api';
import { getDreamAnalysis } from '@/api/analysis.api';
import { getDreamMatches } from '@/api/matches.api';
import { getForecast } from '@/api/forecast.api';
import { Colors } from '@/constants/colors';
import DreamConnectionCard from '@/components/DreamConnectionCard';
import {
  buildCollectiveTraces, labelOf, EMOTION_LABELS, SYMBOL_LABELS, THEME_LABELS,
} from '@/utils/resonance-labels';
import {
  CATEGORY_LABEL,
  EMOTION_LABEL,
  EMOTION_DECODE,
  THEME_DECODE,
  SYMBOL_DECODE,
  ARCHETYPE_DECODE,
  getMoodColor,
  buildMainReadingBody,
  deriveArchetype,
  buildPatternSummary,
} from '@/utils/dreamLanguage';
import type { Dream } from '@/types/dream.types';
import type { DreamAnalysisResponse, NetworkSignal } from '@/types/analysis.types';
import type { DreamForecast } from '@/types/forecast.types';

const ANALYZING_MSGS = [
  'Rüya alanına gönderiliyor...',
  'Semboller okunuyor...',
  'Duygusal izler ayrıştırılıyor...',
  'Benzer rüyalar aranıyor...',
  'Kolektif rezonans ölçülüyor...',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildNetworkSignals(
  analysis: DreamAnalysisResponse,
  forecast: DreamForecast | undefined,
): NetworkSignal[] {
  const signals: NetworkSignal[] = [];

  if (analysis.primaryTheme) {
    const activeTonight = forecast?.risingThemes.find((t) => t.name === analysis.primaryTheme);
    signals.push({
      type: 'theme',
      name: analysis.primaryTheme,
      displayLabel: THEME_DECODE[analysis.primaryTheme]?.headline ?? analysis.primaryTheme.replace(/_/g, ' '),
      ...(activeTonight?.currentCount !== undefined ? { activeCountTonight: activeTonight.currentCount } : {}),
    });
  }

  for (const sym of analysis.symbols.filter((s) => s.confidence >= 0.5).slice(0, 3)) {
    const activeTonight = forecast?.risingSymbols.find((s) => s.name === sym.symbolCategory);
    signals.push({
      type: 'symbol',
      name: sym.symbolCategory,
      displayLabel: SYMBOL_DECODE[sym.symbolCategory]?.label ?? sym.symbolCategory.replace(/_/g, ' '),
      ...(activeTonight?.currentCount !== undefined ? { activeCountTonight: activeTonight.currentCount } : {}),
    });
  }

  if (analysis.primaryEmotion) {
    const shift = forecast?.emotionalShifts.find((e) => e.emotion === analysis.primaryEmotion);
    const count = shift && forecast ? Math.round(shift.currentRatio * forecast.totalDreams) : undefined;
    signals.push({
      type: 'emotion',
      name: analysis.primaryEmotion,
      displayLabel: EMOTION_LABEL[analysis.primaryEmotion] ?? analysis.primaryEmotion,
      ...(count !== undefined ? { activeCountTonight: count } : {}),
    });
  }

  const archFigure = analysis.figures.find(
    (f) => f.archetypeCandidate && (f.archetypeConfidence ?? 0) >= 0.5,
  );
  if (archFigure?.archetypeCandidate) {
    signals.push({
      type: 'archetype',
      name: archFigure.archetypeCandidate,
      displayLabel: ARCHETYPE_DECODE[archFigure.archetypeCandidate]?.label ?? archFigure.archetypeCandidate.replace(/_/g, ' '),
    });
  }

  return signals.filter((s) => s.name);
}

// ── Section fade wrapper ──────────────────────────────────────────────────────

function SectionFade({ animValue, children }: { animValue: Animated.Value; children: React.ReactNode }) {
  const translateY = animValue.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  return (
    <Animated.View style={{ opacity: animValue, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ── Loading phase ─────────────────────────────────────────────────────────────

function AnalyzingPhase() {
  const [msgIdx, setMsgIdx] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    const timer = setInterval(() => setMsgIdx((i) => (i + 1) % ANALYZING_MSGS.length), 2000);
    return () => { anim.stop(); clearInterval(timer); };
  }, [pulse]);

  const scale  = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.12] });
  const op     = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.00] });
  const ringOp = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.05, 0.30, 0.05] });

  return (
    <View style={anim.wrap}>
      <View style={anim.orbWrap}>
        <Animated.View style={[anim.ring, { opacity: ringOp, transform: [{ scale }] }]} />
        <Animated.View style={[anim.core, { opacity: op, transform: [{ scale }] }]} />
      </View>
      <Text style={anim.msg}>{ANALYZING_MSGS[msgIdx]}</Text>
    </View>
  );
}

// ── Error phase ───────────────────────────────────────────────────────────────

function ErrorPhase({ dreamId }: { dreamId: string }) {
  const router = useRouter();
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };
  return (
    <View style={err.wrap}>
      <Pressable style={err.backBtn} onPress={goBack} hitSlop={12}>
        <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
      </Pressable>
      <Text style={err.title}>Rüyan kayıt altına alındı.</Text>
      <Text style={err.body}>Sinyal analizi tamamlanamadı. Rüyan kolektif alana eklendi.</Text>
      {dreamId ? (
        <Pressable style={err.btn} onPress={() => { router.replace(`/dream/${dreamId}`); }}>
          <Text style={err.btnText}>Rüyaya Git</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </Pressable>
      ) : (
        <Pressable style={err.btn} onPress={goBack}>
          <Text style={err.btnText}>Geri Dön</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Decode sections ───────────────────────────────────────────────────────────

function DecodeHero({
  dream,
  analysis,
  matchCount,
}: {
  dream: Dream | undefined;
  analysis: DreamAnalysisResponse;
  matchCount: number;
}) {
  const title      = dream?.title ?? 'Rüyan';
  const catLabel   = CATEGORY_LABEL[dream?.category ?? ''] ?? 'Rüya';
  const theme      = analysis.primaryTheme;
  const emotion    = analysis.primaryEmotion;
  const headline   = theme ? (THEME_DECODE[theme]?.headline ?? null) : null;
  const moodColor  = getMoodColor(emotion);
  const emotLabel  = emotion ? (EMOTION_LABEL[emotion] ?? null) : null;
  const themeLabel = theme ? (THEME_DECODE[theme]?.headline ?? theme.replace(/_/g, ' ')) : null;
  const archResult = deriveArchetype(analysis);
  const archLabel  = archResult ? (ARCHETYPE_DECODE[archResult.key]?.label ?? null) : null;

  return (
    <View style={hero.wrap}>
      <View style={[hero.glowOrb, { backgroundColor: `${moodColor}18`, borderColor: `${moodColor}25` }]} />
      <Text style={hero.catLabel}>{catLabel}</Text>
      <Text style={hero.title} numberOfLines={2}>{title}</Text>
      {headline && <Text style={hero.reading}>{headline}</Text>}

      {/* Attribute pills — premium summary row */}
      <View style={hero.pills}>
        {themeLabel && (
          <View style={[hero.pill, { borderColor: '#A78BFA40' }]}>
            <Text style={hero.pillLabel}>Tema</Text>
            <Text style={[hero.pillValue, { color: '#A78BFA' }]} numberOfLines={1}>{themeLabel}</Text>
          </View>
        )}
        {emotLabel && (
          <View style={[hero.pill, { borderColor: `${moodColor}40` }]}>
            <Text style={hero.pillLabel}>Duygu</Text>
            <Text style={[hero.pillValue, { color: moodColor }]}>{emotLabel}</Text>
          </View>
        )}
        {archLabel && (
          <View style={[hero.pill, { borderColor: '#34D39940' }]}>
            <Text style={hero.pillLabel}>Arketip</Text>
            <Text style={[hero.pillValue, { color: '#34D399' }]}>{archLabel}</Text>
          </View>
        )}
        {matchCount > 0 && (
          <View style={[hero.pill, { borderColor: '#FBBF2440' }]}>
            <Text style={hero.pillLabel}>Yankı</Text>
            <Text style={[hero.pillValue, { color: '#FBBF24' }]}>{matchCount} bilinç</Text>
          </View>
        )}
      </View>

      <View style={[hero.divider, { backgroundColor: `${moodColor}40` }]} />
    </View>
  );
}

function OriginalDreamCard({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > 280;
  const displayed = isLong && !expanded ? content.slice(0, 280) + '…' : content;

  return (
    <View style={card.wrap}>
      <Text style={card.tag}>RÜYA METNİ</Text>
      <Text style={card.content}>{displayed}</Text>
      {isLong && (
        <Pressable onPress={() => setExpanded((v) => !v)} style={card.expandBtn}>
          <Text style={card.expandText}>{expanded ? 'Daralt' : 'Tamamını Gör'}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={Colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

function MainReading({ analysis }: { analysis: DreamAnalysisResponse }) {
  const theme   = analysis.primaryTheme;
  const emotion = analysis.primaryEmotion;
  if (!theme && !emotion) return null;

  const headline  = theme ? (THEME_DECODE[theme]?.headline ?? null) : (emotion ? (EMOTION_LABEL[emotion] ?? null) : null);
  const body      = buildMainReadingBody(theme, emotion);
  const emotLabel = emotion ? (EMOTION_LABEL[emotion] ?? emotion) : null;
  const emotDec   = emotion ? EMOTION_DECODE[emotion] : null;
  const moodColor = getMoodColor(emotion);

  return (
    <View style={sec.wrap}>
      <Text style={sec.tag}>ANA YORUM</Text>
      {headline && <Text style={sec.headline}>{headline}</Text>}
      <Text style={[sec.body, { marginTop: 8 }]}>{body}</Text>
      {emotLabel && (
        <View style={[sec.emotBadge, { borderColor: `${moodColor}35`, backgroundColor: `${moodColor}10` }]}>
          <View style={sec.emotRow}>
            <View style={[sec.emotDot, { backgroundColor: moodColor }]} />
            <Text style={[sec.emotText, { color: moodColor }]}>{emotLabel}</Text>
          </View>
          {emotDec && <Text style={[sec.emotBody, { color: moodColor }]}>{emotDec.body}</Text>}
        </View>
      )}
    </View>
  );
}

// ── Symbol fallback inference ─────────────────────────────────────────────────

const _FIG_TO_SYM: Record<string, string> = {
  animal: 'animal', guide: 'guide', shadow: 'shadow',
  shadow_figure: 'shadow', child: 'child',
};
const _ARCH_TO_SYM: Record<string, string> = {
  shadow: 'shadow', guide: 'guide', child: 'child',
  explorer: 'flying', guardian: 'guide',
};
const _LOC_TO_SYM: Record<string, string> = {
  sea: 'sea', ocean: 'sea', old_house: 'old_house', labyrinth: 'labyrinth',
  underground: 'abyss', cave: 'abyss', bridge: 'threshold', forest: 'water',
};
const _THEME_TO_SYM: Record<string, string> = {
  threshold: 'threshold', pursuit: 'chase', falling: 'falling',
  flying: 'flying', entrapment: 'labyrinth', transformation: 'transformation',
  discovery: 'guide', protection: 'guide', water: 'water',
};

interface _FallbackSym { label: string; meaning: string; isUniversal: boolean; contextNote?: string }

function _deriveFallbackSymbols(analysis: DreamAnalysisResponse): _FallbackSym[] {
  const results: _FallbackSym[] = [];
  const seen = new Set<string>();

  const tryAdd = (symKey: string, isUniversal: boolean, contextNote?: string) => {
    if (!symKey || seen.has(symKey)) return;
    const dec = SYMBOL_DECODE[symKey];
    if (!dec) return;
    seen.add(symKey);
    const entry: _FallbackSym = { label: dec.label, meaning: dec.meaning, isUniversal };
    if (contextNote) entry.contextNote = contextNote;
    results.push(entry);
  };

  for (const fig of analysis.figures.slice(0, 3)) {
    const symKey = _FIG_TO_SYM[fig.figureType]
      ?? (fig.archetypeCandidate ? _ARCH_TO_SYM[fig.archetypeCandidate] : undefined)
      ?? '';
    const qualities = fig.qualityDescriptors.slice(0, 2).join(' ');
    tryAdd(symKey, true, qualities || undefined);
  }

  for (const loc of analysis.locations.slice(0, 2)) {
    tryAdd(_LOC_TO_SYM[loc.locationType ?? ''] ?? '', false);
  }

  if (results.length < 2 && analysis.primaryTheme) {
    tryAdd(_THEME_TO_SYM[analysis.primaryTheme] ?? '', true);
  }

  return results.slice(0, 3);
}

function SymbolsSection({ analysis }: { analysis: DreamAnalysisResponse }) {
  const symbols = analysis.symbols.filter((s) => s.confidence >= 0.5).slice(0, 4);

  // Render a symbol row (shared between real and fallback paths)
  const renderSymRow = (
    key: string,
    label: string,
    meaning: string,
    isUniversal: boolean,
    contextNote?: string,
  ) => {
    const tagColor = isUniversal ? '#8B5CF6' : '#F59E0B';
    const tagLabel = isUniversal ? 'Evrensel' : 'Kişisel';
    return (
      <View key={key} style={sec.symbolRow}>
        <View style={sec.symbolDot} />
        <View style={{ flex: 1 }}>
          <View style={sec.symbolHeader}>
            <Text style={sec.symbolLabel}>{label}</Text>
            <View style={[sec.symbolTag, { backgroundColor: `${tagColor}18`, borderColor: `${tagColor}40` }]}>
              <Text style={[sec.symbolTagText, { color: tagColor }]}>{tagLabel}</Text>
            </View>
          </View>
          <Text style={sec.symbolMeaning}>{meaning}</Text>
          {contextNote && (
            <Text style={sec.symbolManifest}>Rüyanda: {contextNote}</Text>
          )}
        </View>
      </View>
    );
  };

  if (symbols.length === 0) {
    const fallback = _deriveFallbackSymbols(analysis);
    if (fallback.length === 0) {
      return (
        <View style={sec.wrap}>
          <Text style={sec.tag}>SEMBOLLER</Text>
          <Text style={sec.empty}>Bu rüyada açık semboller yerine atmosferik imgeler öne çıkıyor.</Text>
        </View>
      );
    }
    return (
      <View style={sec.wrap}>
        <Text style={sec.tag}>SEMBOLLER</Text>
        <Text style={[sec.empty, { marginBottom: 14 }]}>
          Doğrudan semboller yerine atmosferik figürler ve mekanlar öne çıkıyor.
        </Text>
        {fallback.map((sym, i) => renderSymRow(`fb-${i}`, sym.label, sym.meaning, sym.isUniversal, sym.contextNote))}
      </View>
    );
  }

  return (
    <View style={sec.wrap}>
      <Text style={sec.tag}>SEMBOLLER</Text>
      {symbols.map((sym) => {
        const dec = SYMBOL_DECODE[sym.symbolCategory] ?? {
          label: sym.symbolCategory.replace(/_/g, ' '),
          meaning: sym.emotionalContext ?? sym.narrativeFunction ?? 'Bu sembol rüyanın önemli bir parçasıydı.',
        };
        // Contextual meaning: if manifestation exists, personalise with it
        const contextualMeaning = sym.manifestation
          ? `Bu rüyada ${dec.label.toLowerCase()}, ${sym.manifestation.toLowerCase()} üzerinden beliriyor. ${dec.meaning}`
          : (sym.emotionalContext ? `${dec.meaning} ${sym.emotionalContext}.` : dec.meaning);
        return renderSymRow(
          sym.symbolCategory,
          dec.label,
          contextualMeaning,
          sym.isUniversal,
          sym.manifestation ?? undefined,
        );
      })}
    </View>
  );
}

function EmotionalArcSection({ analysis }: { analysis: DreamAnalysisResponse }) {
  const arc     = analysis.emotionalArc;
  const primary = analysis.primaryEmotion;

  // Build 3-node arc from emotions array if arcPosition data is available
  const openingEmo = analysis.emotions.find((e) => e.arcPosition === 'opening');
  const peakEmo    = analysis.emotions.find((e) => e.arcPosition === 'peak');
  const closingEmo = analysis.emotions.find((e) => e.arcPosition === 'closing');
  const has3Node   = !!(openingEmo && peakEmo && closingEmo);

  const fromLabel    = arc?.from ? (EMOTION_LABEL[arc.from] ?? arc.from) : null;
  const toLabel      = arc?.to   ? (EMOTION_LABEL[arc.to]   ?? arc.to)   : null;
  const primaryLabel = primary   ? (EMOTION_LABEL[primary]  ?? primary)  : null;
  const fromColor    = getMoodColor(arc?.from ?? primary);
  const toColor      = getMoodColor(arc?.to ?? primary);

  // 3-node narrative
  function threeNodeNarrative(): string {
    const oL = EMOTION_LABEL[openingEmo!.emotion] ?? openingEmo!.emotion;
    const pL = EMOTION_LABEL[peakEmo!.emotion]    ?? peakEmo!.emotion;
    const cL = EMOTION_LABEL[closingEmo!.emotion] ?? closingEmo!.emotion;
    const isEasing     = /peace|calm|serenity|joy|wonder/.test(closingEmo!.emotion);
    const isEscalating = /fear|anxiety|dread|anger/.test(closingEmo!.emotion);
    if (isEasing)
      return `Rüya ${oL.toLowerCase()} ile açılıyor, ${pL.toLowerCase()} noktasında doruk yapıyor ve ${cL.toLowerCase()} ile sonlanıyor — bir yüzleşme ve çözülme yolculuğu.`;
    if (isEscalating)
      return `Rüya ${oL.toLowerCase()} ile başlıyor, ${pL.toLowerCase()} ile yoğunlaşıyor ve ${cL.toLowerCase()} ile kapanıyor — bilinçaltı gerilimi dışa vuruyor.`;
    return `Rüya ${oL.toLowerCase()} ile açılıyor, ${pL.toLowerCase()} noktasından geçiyor ve ${cL.toLowerCase()} ile kapanıyor.`;
  }

  // 2-node narrative
  function arcNarrative(): string | null {
    if (!fromLabel && !toLabel) return null;
    if (!toLabel) return null;
    const isEasing     = /peace|calm|serenity|joy|wonder/.test(arc?.to ?? '');
    const isEscalating = /fear|anxiety|dread|anger/.test(arc?.to ?? '');
    if (isEasing)     return `Rüyan ${fromLabel ?? 'başlangıcından'} ${toLabel.toLowerCase()} doğru ilerledi — bir çözülme ve rahatlama süreci.`;
    if (isEscalating) return `Rüyan ${fromLabel ?? 'başlangıcından'} ${toLabel.toLowerCase()} doğru yoğunlaştı — bilinçaltı gerilimini dışa vurdu.`;
    return `Rüyan duygusal olarak ${fromLabel ?? '?'}'dan ${toLabel}'a geçiş yaptı.`;
  }

  return (
    <View style={sec.wrap}>
      <Text style={sec.tag}>DUYGUSAL YOLCULUK</Text>

      {has3Node ? (
        <>
          <View style={arcS.row3}>
            {[openingEmo!, peakEmo!, closingEmo!].map((e, i) => {
              const lbl    = EMOTION_LABEL[e.emotion] ?? e.emotion;
              const color  = getMoodColor(e.emotion);
              const isLast = i === 2;
              return (
                <View key={e.arcPosition} style={arcS.node3Wrap}>
                  <View style={arcS.node}>
                    <View style={[arcS.dot, { backgroundColor: color }]} />
                    <Text style={[arcS.nodeLabel, { color }]}>{lbl}</Text>
                    <Text style={arcS.nodePos}>
                      {i === 0 ? 'başlangıç' : i === 1 ? 'doruk' : 'kapanış'}
                    </Text>
                  </View>
                  {!isLast && (
                    <View style={arcS.line}>
                      <View style={[arcS.lineInner, { backgroundColor: `${color}40` }]} />
                      <Ionicons name="chevron-forward" size={12} color={`${color}60`} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          <Text style={[sec.body, { marginTop: 14 }]}>{threeNodeNarrative()}</Text>
        </>
      ) : arc && fromLabel && toLabel ? (
        <View style={arcS.row}>
          <View style={arcS.node}>
            <View style={[arcS.dot, { backgroundColor: fromColor }]} />
            <Text style={[arcS.nodeLabel, { color: fromColor }]}>{fromLabel}</Text>
          </View>
          <View style={arcS.line}>
            <View style={[arcS.lineInner, { backgroundColor: `${toColor}50` }]} />
            <Ionicons name="chevron-forward" size={13} color={`${toColor}70`} />
          </View>
          <View style={arcS.node}>
            <View style={[arcS.dot, { backgroundColor: toColor }]} />
            <Text style={[arcS.nodeLabel, { color: toColor }]}>{toLabel}</Text>
          </View>
        </View>
      ) : primaryLabel ? (
        <View style={arcS.single}>
          <View style={[arcS.singleDot, { backgroundColor: fromColor }]} />
          <Text style={[arcS.singleLabel, { color: fromColor }]}>{primaryLabel}</Text>
          <Text style={sec.body}>Rüya boyunca baskın duygu bu oldu.</Text>
        </View>
      ) : (
        <Text style={sec.empty}>Duygusal yolculuk verisi mevcut değil.</Text>
      )}

      {!has3Node && arcNarrative() && (
        <Text style={[sec.body, { marginTop: 14 }]}>{arcNarrative()}</Text>
      )}

    </View>
  );
}

const _ROLE_LABELS: Record<string, string> = {
  guide: 'rehber', pursuer: 'takipçi', helper: 'yardımcı',
  obstacle: 'engel', witness: 'tanık', protector: 'koruyucu',
};

function ArchetypeSection({ analysis }: { analysis: DreamAnalysisResponse }) {
  const result = deriveArchetype(analysis);
  if (!result) return (
    <View style={sec.wrap}>
      <Text style={sec.tag}>ARKETİP ENERJİSİ</Text>
      <Text style={sec.empty}>Bu rüyada baskın bir arketip sinyali tespit edilmedi.</Text>
    </View>
  );

  const dec = ARCHETYPE_DECODE[result.key] ?? {
    label: result.key.replace(/_/g, ' '),
    body:  'Bu arketip enerjisi bu rüyada aktive oldu.',
  };

  // Build dream-specific body using the triggering figure
  const figure = analysis.figures.find(
    (f) => f.archetypeCandidate === result.key && (f.archetypeConfidence ?? 0) >= 0.5,
  );

  let personalBody = dec.body;
  if (figure) {
    const qualities = figure.qualityDescriptors.slice(0, 2);
    if (qualities.length > 0) {
      personalBody = `Bu rüyada ${dec.label} arketipi, ${qualities.join(', ')} niteliğiyle öne çıkan bir figür üzerinden beliriyor. ${dec.body}`;
    } else if (figure.narrativeRole) {
      const roleLabel = _ROLE_LABELS[figure.narrativeRole] ?? figure.narrativeRole;
      personalBody = `Bu rüyada ${dec.label} arketipi, ${roleLabel} rolündeki figür üzerinden beliriyor. ${dec.body}`;
    }
  } else if (result.isInferred && analysis.primaryTheme) {
    const themeDec = THEME_DECODE[analysis.primaryTheme];
    if (themeDec) {
      personalBody = `Bu rüyada ${dec.label} arketipi, "${themeDec.headline.toLowerCase()}" teması üzerinden beliriyor. ${dec.body}`;
    }
  }

  return (
    <View style={sec.wrap}>
      <Text style={sec.tag}>ARKETİP ENERJİSİ</Text>
      <Text style={sec.headline}>{dec.label}</Text>
      <Text style={sec.body}>{personalBody}</Text>
      {result.isInferred && (
        <Text style={sec.inferredNote}>Ana tema üzerinden türetildi.</Text>
      )}
    </View>
  );
}

const _PAT_META: Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  'Ana Tema':         { icon: 'moon-outline',          color: '#A78BFA' },
  'Baskın Duygu':     { icon: 'heart-outline',         color: '#F472B6' },
  'Öne Çıkan Sembol': { icon: 'eye-outline',           color: '#60A5FA' },
  'Hareket':          { icon: 'arrow-forward-outline', color: '#34D399' },
  'İç Çatışma':       { icon: 'git-compare-outline',  color: '#FB923C' },
  'Kapanış Tonu':     { icon: 'flag-outline',          color: '#FBBF24' },
};

function PatternSummary({ analysis }: { analysis: DreamAnalysisResponse }) {
  const items = buildPatternSummary(analysis);
  if (items.length === 0) return null;

  return (
    <View style={sec.wrap}>
      <Text style={sec.tag}>RÜYANIN İÇ YAPISI</Text>
      <View style={pat.grid}>
        {items.map((item) => {
          const meta  = _PAT_META[item.label] ?? { icon: 'sparkles-outline' as const, color: Colors.primary };
          const color = meta.color;
          return (
            <View key={item.label} style={[pat.cell, { borderColor: `${color}25`, backgroundColor: `${color}08` }]}>
              <Ionicons name={meta.icon} size={15} color={color} />
              <Text style={[pat.cellLabel, { color: `${color}99` as any }]}>{item.label}</Text>
              <Text style={pat.cellValue} numberOfLines={2}>{item.value}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SimilarDreams({ matches }: { matches: import('@/types/match.types').DreamMatch[] }) {
  const router = useRouter();

  // Deduplicate by matchingDreamId
  const uniqueMatches = useMemo(() => {
    const seen = new Set<string>();
    return matches.filter(m => {
      if (seen.has(m.matchingDreamId)) return false;
      seen.add(m.matchingDreamId);
      return true;
    });
  }, [matches]);

  if (uniqueMatches.length === 0) return (
    <View style={sec.wrap}>
      <Text style={sec.tag}>BU RÜYANIN YANKILARI</Text>
      <Text style={sec.empty}>Bu rüya kolektif alana katıldı. Benzer bilinçler arasındaki bağlantılar yakında görünecek.</Text>
    </View>
  );

  const traces = buildCollectiveTraces(uniqueMatches);

  // Strongest echo by matchScore
  const strongest = uniqueMatches.reduce<typeof uniqueMatches[0] | null>(
    (best, m) => (!best || m.matchScore > best.matchScore ? m : best),
    null,
  );
  const strongestName = strongest?.matchingUserDisplayName ?? strongest?.matchingUserUsername ?? null;

  return (
    <View style={sec.wrap}>
      <Text style={sec.tag}>BU RÜYANIN YANKILARI</Text>

      {/* Collective Pattern View */}
      <View style={sim.tracesBox}>
        <Text style={sim.tracesHeadline}>Bu rüya yalnız değil.</Text>
        <Text style={sim.tracesCount}>
          <Text style={sim.tracesNum}>{traces.totalConnected}</Text>
          {' '}farklı bilinçte benzer izler görüldü.
        </Text>

        {traces.topEmotions.length > 0 && (
          <View style={sim.traceRow}>
            <Text style={sim.traceLabel}>Ortak duygu</Text>
            <View style={sim.traceChips}>
              {traces.topEmotions.map(e => (
                <Text key={e} style={[sim.traceChip, { color: '#F472B6' }]}>{labelOf(EMOTION_LABELS, e)}</Text>
              ))}
            </View>
          </View>
        )}
        {traces.topSymbols.length > 0 && (
          <View style={sim.traceRow}>
            <Text style={sim.traceLabel}>Ortak sembol</Text>
            <View style={sim.traceChips}>
              {traces.topSymbols.map(s => (
                <Text key={s} style={[sim.traceChip, { color: '#60A5FA' }]}>{labelOf(SYMBOL_LABELS, s)}</Text>
              ))}
            </View>
          </View>
        )}
        {traces.topThemes.length > 0 && (
          <View style={sim.traceRow}>
            <Text style={sim.traceLabel}>Ortak tema</Text>
            <View style={sim.traceChips}>
              {traces.topThemes.map(t => (
                <Text key={t} style={[sim.traceChip, { color: '#A78BFA' }]}>{labelOf(THEME_LABELS, t)}</Text>
              ))}
            </View>
          </View>
        )}
        {strongestName && (
          <View style={sim.traceRow}>
            <Text style={sim.traceLabel}>En güçlü yankı</Text>
            <Text style={[sim.traceChip, { color: '#FBBF24' }]}>{strongestName}</Text>
          </View>
        )}
      </View>

      {/* Connection cards — first auto-expanded, rest collapsed */}
      <View style={sim.list}>
        {uniqueMatches.map((m, index) => (
          <DreamConnectionCard
            key={m.id}
            match={m}
            onPress={() => { router.push(`/match/${m.id}`); }}
            defaultExpanded={index === 0}
          />
        ))}
      </View>
    </View>
  );
}

function CollectiveResonance({
  signals,
  totalDreamsTonight,
}: {
  signals: NetworkSignal[];
  totalDreamsTonight: number;
}) {
  const router = useRouter();
  const visibleSignals = signals.filter((s) => s.activeCountTonight !== undefined);

  return (
    <View style={coll.wrap}>
      <Text style={sec.tag}>KOLEKTİF REZONANS</Text>

      {totalDreamsTonight > 0 && (
        <Text style={coll.subtext}>
          Bu gece <Text style={coll.subtextBold}>{totalDreamsTonight} rüya</Text> aynı kolektif alanda.
        </Text>
      )}

      {visibleSignals.length > 0 ? (
        <View style={coll.list}>
          {visibleSignals.map((signal) => {
            const typeColor = { theme: '#8B5CF6', symbol: '#F59E0B', emotion: '#60A5FA', archetype: '#34D399' }[signal.type];
            return (
              <Pressable
                key={`${signal.type}-${signal.name}`}
                style={({ pressed }) => [coll.row, pressed && { opacity: 0.72 }]}
                onPress={() => { router.push('/dream-forecast'); }}
              >
                <View style={[coll.dot, { backgroundColor: typeColor }]} />
                <Text style={coll.label}>{signal.displayLabel}</Text>
                <View style={{ flex: 1 }} />
                <Text style={[coll.count, { color: typeColor }]}>{signal.activeCountTonight} aktif sinyal</Text>
                <Ionicons name="chevron-forward" size={11} color={typeColor} style={{ marginLeft: 3 }} />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={coll.empty}>
          Bu rüyan kolektif alana kaydedildi. Benzer rüya bağlantıları Dream Match Engine ile yakında güçlendirilecek.
        </Text>
      )}
    </View>
  );
}

function DecodeActions({ dreamId }: { dreamId: string }) {
  const router = useRouter();
  return (
    <View style={act.wrap}>
      <Pressable
        style={({ pressed }) => [act.primary, pressed && { opacity: 0.86 }]}
        onPress={() => { router.replace(`/dream/${dreamId}`); }}
      >
        <Text style={act.primaryText}>Rüyaya Git</Text>
        <Ionicons name="arrow-forward" size={15} color="#fff" />
      </Pressable>
      <Pressable
        style={({ pressed }) => [act.secondary, pressed && { opacity: 0.75 }]}
        onPress={() => { router.push('/explore'); }}
      >
        <Text style={act.secondaryText}>Benzer Rüyaları Keşfet</Text>
      </Pressable>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DreamDecodeScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();

  const [shouldPoll, setShouldPoll] = useState(true);
  const pollCount = useRef(0);

  const { data: dream } = useQuery({
    queryKey: ['dream', id],
    queryFn:  () => getDream(id!),
    enabled:  !!id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: analysis, isError: analysisError } = useQuery({
    queryKey:        ['dream-analysis', id],
    queryFn:         () => getDreamAnalysis(id!),
    refetchInterval: shouldPoll ? 1500 : false,
    enabled:         !!id,
    staleTime:       0,
    retry:           false,
  });

  const { data: todayForecast } = useQuery({
    queryKey: ['forecast', 'today'],
    queryFn:  () => getForecast('today'),
    staleTime: 3 * 60 * 1000,
  });

  const { data: dreamMatchesPage } = useQuery({
    queryKey: ['dream-matches', id],
    queryFn:  () => getDreamMatches(id!, { limit: 3 }),
    enabled:  !!id && analysis?.status === 'completed',
    staleTime: 5 * 60 * 1000,
  });

  // Stop polling on completion, failure, API error, or after 8 attempts
  useEffect(() => {
    if (analysis?.status === 'completed' || analysis?.status === 'failed') {
      setShouldPoll(false);
      return;
    }
    if (analysisError) {
      setShouldPoll(false);
      return;
    }
    if (analysis) {
      // pending / processing — keep counting
      pollCount.current += 1;
      if (pollCount.current >= 8) setShouldPoll(false);
    }
  }, [analysis, analysisError]);

  const phase = analysis?.status === 'completed'
    ? 'reveal'
    : analysis?.status === 'failed' || (!shouldPoll && !analysis)
      ? 'error'
      : 'analyzing';

  // Staggered reveal animations — one per section (must be declared unconditionally)
  const a0 = useRef(new Animated.Value(0)).current;
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  const a3 = useRef(new Animated.Value(0)).current;
  const a4 = useRef(new Animated.Value(0)).current;
  const a5 = useRef(new Animated.Value(0)).current;
  const a6 = useRef(new Animated.Value(0)).current;
  const a7 = useRef(new Animated.Value(0)).current;
  const a8 = useRef(new Animated.Value(0)).current;
  const anims = [a0, a1, a2, a3, a4, a5, a6, a7, a8];

  useEffect(() => {
    if (phase !== 'reveal') return;
    const DELAY = 340;
    const DUR   = 500;
    anims.forEach((v, i) => {
      setTimeout(
        () => Animated.timing(v, { toValue: 1, duration: DUR, useNativeDriver: true }).start(),
        i * DELAY,
      );
    });
  }, [phase]);

  const networkSignals     = analysis ? buildNetworkSignals(analysis, todayForecast) : [];
  const totalDreamsTonight = todayForecast?.totalDreams ?? 0;

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);

  if (phase === 'analyzing') {
    return (
      <SafeAreaView style={scr.container} edges={['top', 'bottom']}>
        <Pressable style={scr.topBack} onPress={goBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
        </Pressable>
        <AnalyzingPhase />
      </SafeAreaView>
    );
  }

  if (phase === 'error' || !analysis) {
    return (
      <SafeAreaView style={scr.container} edges={['top', 'bottom']}>
        <ErrorPhase dreamId={id ?? ''} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={scr.container} edges={['top']}>
      {/* Header */}
      <View style={scr.header}>
        <Pressable onPress={goBack} hitSlop={12} style={scr.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
        </Pressable>
        <View style={scr.headerDot} />
        <Text style={scr.headerTitle}>RÜYAN ÇÖZÜMLENDI</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={scr.scroll} showsVerticalScrollIndicator={false}>

        {/* 1 — Hero */}
        <SectionFade animValue={anims[0]!}>
          <DecodeHero
            dream={dream}
            analysis={analysis}
            matchCount={dreamMatchesPage?.meta.total ?? dreamMatchesPage?.items.length ?? 0}
          />
        </SectionFade>

        {/* 2 — Original Dream */}
        {dream && (
          <SectionFade animValue={anims[1]!}>
            <OriginalDreamCard content={dream.content} />
          </SectionFade>
        )}

        {/* 3 — Main Reading */}
        <SectionFade animValue={anims[2]!}>
          <MainReading analysis={analysis} />
        </SectionFade>

        {/* 4 — Symbols */}
        <SectionFade animValue={anims[3]!}>
          <SymbolsSection analysis={analysis} />
        </SectionFade>

        {/* 5 — Emotional Arc */}
        <SectionFade animValue={anims[4]!}>
          <EmotionalArcSection analysis={analysis} />
        </SectionFade>

        {/* 6 — Archetype */}
        <SectionFade animValue={anims[5]!}>
          <ArchetypeSection analysis={analysis} />
        </SectionFade>

        {/* 7 — Pattern Summary */}
        <SectionFade animValue={anims[6]!}>
          <PatternSummary analysis={analysis} />
        </SectionFade>

        {/* 8 — Similar Dreams */}
        <SectionFade animValue={anims[7]!}>
          <SimilarDreams matches={dreamMatchesPage?.items ?? []} />
        </SectionFade>

        {/* 9 — Collective Resonance + Actions */}
        <SectionFade animValue={anims[8]!}>
          <CollectiveResonance signals={networkSignals} totalDreamsTonight={totalDreamsTonight} />
          <DecodeActions dreamId={analysis.dreamId} />
        </SectionFade>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const scr = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll:    { paddingBottom: 64 },
  topBack: {
    position: 'absolute', top: 16, left: 16,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  headerDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary,
    ...Platform.select({ ios: { shadowRadius: 4, shadowOpacity: 0.8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 } } }),
  },
  headerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2, color: Colors.primary },
});

const anim = StyleSheet.create({
  wrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32 },
  orbWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    borderWidth: 1, borderColor: Colors.primary,
  },
  core: {
    width: 112, height: 112, borderRadius: 56,
    backgroundColor: 'rgba(139,92,246,0.10)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
  },
  msg: { fontSize: 14, color: Colors.textSecondary, letterSpacing: 0.3, fontWeight: '500' },
});

const hero = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28,
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    top: -60, right: -40, borderWidth: 1,
  },
  catLabel: {
    fontSize: 9.5, fontWeight: '800', letterSpacing: 2.5,
    color: Colors.textMuted, marginBottom: 10, textTransform: 'uppercase',
  },
  title: {
    fontSize: 26, fontWeight: '900', color: Colors.textPrimary,
    lineHeight: 32, marginBottom: 14, letterSpacing: 0.2,
  },
  reading: {
    fontSize: 15, color: Colors.textSecondary, lineHeight: 23,
    fontStyle: 'italic', marginBottom: 20,
  },
  divider: { width: 32, height: 1.5, borderRadius: 1 },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, marginBottom: 4 },
  pill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 2,
    minWidth: 70,
  },
  pillLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1, color: Colors.textMuted, textTransform: 'uppercase' },
  pillValue: { fontSize: 12, fontWeight: '800' },
});

const card = StyleSheet.create({
  wrap: {
    marginHorizontal: 16, marginVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border,
    borderRadius: 14, padding: 16,
  },
  tag: {
    fontSize: 8.5, fontWeight: '900', letterSpacing: 2,
    color: Colors.textMuted, marginBottom: 10,
  },
  content: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  expandBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 10, alignSelf: 'flex-start',
  },
  expandText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
});

const sec = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20, paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  tag: {
    fontSize: 8.5, fontWeight: '900', letterSpacing: 2,
    color: Colors.textMuted, marginBottom: 12,
  },
  headline: {
    fontSize: 20, fontWeight: '800', color: Colors.textPrimary,
    letterSpacing: 0.2, marginBottom: 8,
  },
  body: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  empty: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 20 },

  emotBadge: {
    marginTop: 14, borderWidth: 1, borderRadius: 12,
    padding: 14, gap: 6,
  },
  emotRow:  { flexDirection: 'row', alignItems: 'center', gap: 7 },
  emotDot:  { width: 5, height: 5, borderRadius: 2.5 },
  emotText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  emotBody: { fontSize: 12, lineHeight: 18, opacity: 0.85 },

  symbolRow:    { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  symbolDot:    { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.primary, marginTop: 7 },
  symbolHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' },
  symbolLabel:  { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  symbolTag: {
    borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  symbolTagText:    { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  symbolMeaning:    { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  symbolManifest:   { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic', marginTop: 4, lineHeight: 16 },

  inferredNote: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic', marginTop: 10 },
});

const arcS = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 0 },
  row3:  { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  node:  { alignItems: 'center', gap: 6, minWidth: 72 },
  node3Wrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dot:   { width: 10, height: 10, borderRadius: 5 },
  nodeLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2, textAlign: 'center' },
  nodePos:   { fontSize: 9, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  line:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  lineInner: { flex: 1, height: 1.5, borderRadius: 1 },

  single:      { alignItems: 'flex-start', gap: 8, marginTop: 4 },
  singleDot:   { width: 10, height: 10, borderRadius: 5 },
  singleLabel: { fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
});

const sim = StyleSheet.create({
  list: { gap: 10 },
  tracesBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  tracesHeadline: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 2 },
  tracesCount: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500', marginBottom: 6 },
  tracesNum:   { fontSize: 18, fontWeight: '900', color: Colors.textPrimary },
  traceRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  traceLabel: {
    fontSize: 10, color: Colors.textMuted, fontWeight: '700',
    width: 90, textTransform: 'uppercase', letterSpacing: 0.3,
  },
  traceChips: { flexDirection: 'row', gap: 8, flex: 1, flexWrap: 'wrap' },
  traceChip:  { fontSize: 12, fontWeight: '700' },
});

const pat = StyleSheet.create({
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  cell: {
    width: '47.5%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    gap: 5,
  },
  cellLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  cellValue: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, lineHeight: 17 },
});

const coll = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingVertical: 20, gap: 14 },
  subtext: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  subtextBold: { fontWeight: '800', color: Colors.textPrimary },
  list: { gap: 0 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  dot:   { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  count: { fontSize: 11, fontWeight: '700' },
  empty: { fontSize: 12, color: Colors.textMuted, lineHeight: 19, fontStyle: 'italic' },
});

const act = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 10 },
  primary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16,
  },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  secondary: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  secondaryText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
});

const err = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  backBtn: {
    position: 'absolute', top: 16, left: 16,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  title:   { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  body:    { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 14, marginTop: 8,
  },
  btnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
