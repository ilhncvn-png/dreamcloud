import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { updateMyProfile } from '@/api/users.api';

const { width: W, height: H } = Dimensions.get('window');
const TRACK_W = W - 48;

// ── Data ──────────────────────────────────────────────────────────────────────

const SYMBOL_OPTIONS = [
  { key: 'sea',    emoji: '🌊', name: 'Deniz'  },
  { key: 'door',   emoji: '🚪', name: 'Kapı'   },
  { key: 'moon',   emoji: '🌙', name: 'Ay'     },
  { key: 'fire',   emoji: '🔥', name: 'Ateş'   },
  { key: 'forest', emoji: '🌲', name: 'Orman'  },
  { key: 'house',  emoji: '🏠', name: 'Ev'     },
  { key: 'bird',   emoji: '🕊', name: 'Kuş'    },
  { key: 'bridge', emoji: '🌉', name: 'Köprü'  },
  { key: 'rain',   emoji: '🌧', name: 'Yağmur' },
  { key: 'road',   emoji: '🛤', name: 'Yol'    },
];

const EMOTION_OPTIONS = [
  { key: 'wonder',  emoji: '✦', name: 'Merak',  desc: 'Bilinmeyene duyulan çekiliş',   color: '#A78BFA' },
  { key: 'fear',    emoji: '◈', name: 'Korku',  desc: 'Karanlıktan gelen ses',          color: '#F87171' },
  { key: 'peace',   emoji: '◌', name: 'Huzur',  desc: 'Sessizliğin içinde yüzme',      color: '#60A5FA' },
  { key: 'longing', emoji: '◎', name: 'Özlem',  desc: 'Uzaktaki şeye yönelme',         color: '#C084FC' },
  { key: 'hope',    emoji: '◉', name: 'Umut',   desc: 'Sabahı bekleyen ışık',          color: '#34D399' },
  { key: 'sadness', emoji: '◐', name: 'Hüzün',  desc: 'Geçmişin yankısı',              color: '#6366F1' },
  { key: 'joy',     emoji: '◑', name: 'Sevinç', desc: 'Geceyi aydınlatan an',          color: '#FBBF24' },
];

const ARCHETYPE_OPTIONS = [
  { key: 'explorer', emoji: '🧭', name: 'Kaşif',       desc: 'Bilinmeyene adım atar, sınırları iter.' },
  { key: 'guide',    emoji: '🌟', name: 'Rehber',       desc: 'Işığı gösterir, yolu aydınlatır.'       },
  { key: 'guardian', emoji: '🛡', name: 'Koruyucu',    desc: 'Gizli olanı saklar, sınırı çizer.'      },
  { key: 'seeker',   emoji: '🔍', name: 'Arayan',       desc: 'Anlam peşinde, hiç durmadan sorar.'     },
  { key: 'shadow',   emoji: '🌑', name: 'Gölge',        desc: 'Derinlere iner, gizleneni bulur.'        },
  { key: 'dreamer',  emoji: '✨', name: 'Hayalperest', desc: 'Sınır tanımaz, olasılıklarla yaşar.'    },
];

const TIMING_OPTIONS = [
  { key: 'morning', emoji: '🌅', name: 'Sabah',   desc: 'Uyanırken rüyaları hatırlıyorum'   },
  { key: 'night',   emoji: '🌑', name: 'Gece',    desc: 'Gece geç saatlerde yoğun rüyalar'  },
  { key: 'often',   emoji: '✨', name: 'Sık Sık', desc: 'Hemen her gece rüya görürüm'       },
  { key: 'rarely',  emoji: '💭', name: 'Nadiren', desc: 'Rüyalarımı nadiren hatırlarım'     },
];

const GEN_PHASES = [
  'Semboller analiz ediliyor…',
  'Duygular işleniyor…',
  'Bilinç haritası oluşturuluyor…',
  'Yakın zihinler aranıyor…',
];

const STEP_NAMES = ['Semboller', 'Duygular', 'Arketip', 'Zamanlama'];

// ── Answers type ──────────────────────────────────────────────────────────────

interface Answers {
  symbols:     string[];
  emotions:    string[];
  archetype:   string | null;
  dreamTiming: string | null;
}

// ── Ambient background ─────────────────────────────────────────────────────────

function AmbientBg() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const lp = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    lp.start();
    return () => lp.stop();
  }, [pulse]);
  const op1 = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.03, 0.05] });
  const op2 = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.02, 0.04] });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[bg.orb1, { opacity: op1 }]} />
      <Animated.View style={[bg.orb2, { opacity: op2 }]} />
    </View>
  );
}
const bg = StyleSheet.create({
  // 70% smaller than original (W*1.4 → W*0.42, W*0.9 → W*0.27), pushed to screen edges
  orb1: { position: 'absolute', width: W * 0.42, height: W * 0.42, borderRadius: W * 0.21, top: -W * 0.18, left: -W * 0.12, backgroundColor: '#6C63FF' },
  orb2: { position: 'absolute', width: W * 0.27, height: W * 0.27, borderRadius: W * 0.135, bottom: -W * 0.08, right: -W * 0.08, backgroundColor: '#A78BFA' },
});

// ── Generating particles ──────────────────────────────────────────────────────

interface GPart { id: number; x: number; size: number; duration: number; delay: number; color: string; anim: Animated.Value }

const GP_COLORS = ['#A78BFA', '#6C63FF', '#60A5FA', '#C4B5FD', '#818CF8'];

const GEN_PARTICLES = Array.from({ length: 22 }, (_, i): GPart => ({
  id: i,
  x:        Math.random() * (W - 20),
  size:     1.5 + Math.random() * 3,
  duration: 8000 + Math.random() * 7000,
  delay:    Math.random() * 5000,
  color:    GP_COLORS[Math.floor(Math.random() * GP_COLORS.length)]!,
  anim:     new Animated.Value(0),
}));

function GenParticles({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const loops = GEN_PARTICLES.map(p => {
      const lp = Animated.loop(Animated.sequence([
        Animated.delay(p.delay),
        Animated.timing(p.anim, { toValue: 1, duration: p.duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(p.anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]));
      lp.start();
      return lp;
    });
    return () => { loops.forEach(l => l.stop()); GEN_PARTICLES.forEach(p => p.anim.setValue(0)); };
  }, [active]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {GEN_PARTICLES.map(p => {
        const translateY = p.anim.interpolate({ inputRange: [0, 0.05, 0.85, 1], outputRange: [0, 0, -H * 0.75, -H * 0.75] });
        const opacity    = p.anim.interpolate({ inputRange: [0, 0.05, 0.6, 0.9, 1], outputRange: [0, 0.8, 0.7, 0, 0] });
        return (
          <Animated.View
            key={p.id}
            pointerEvents="none"
            style={{
              position: 'absolute', bottom: H * 0.2 + Math.random() * H * 0.1,
              left: p.x, width: p.size, height: p.size,
              borderRadius: p.size / 2, backgroundColor: p.color,
              opacity, transform: [{ translateY }],
            }}
          />
        );
      })}
    </View>
  );
}

// ── Progress header ────────────────────────────────────────────────────────────

function ProgressHeader({ step }: { step: number }) {
  if (step >= 4) return null;

  const barAnim = useRef(new Animated.Value(TRACK_W / 4)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: ((step + 1) / 4) * TRACK_W,
      duration: 420,
      easing:   Easing.out(Easing.cubic),
      useNativeDriver: false, // width interpolation requires layout driver
    }).start();
  }, [step, barAnim]);

  const stepStr = String(step + 1).padStart(2, '0');

  return (
    <View style={prg.header}>
      <View style={prg.topRow}>
        <View style={prg.stepInfo}>
          <Text style={prg.bigNum}>{stepStr}</Text>
          <Text style={prg.stepName}>{STEP_NAMES[step]}</Text>
        </View>
        <Text style={prg.fraction}>/ 04</Text>
      </View>
      <View style={prg.track}>
        <Animated.View style={[prg.fill, { width: barAnim }]} />
        {/* segment markers */}
        {[1, 2, 3].map(i => (
          <View key={i} style={[prg.seg, { left: (i / 4) * TRACK_W - 1 }]} />
        ))}
      </View>
    </View>
  );
}
const prg = StyleSheet.create({
  header:   { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20, gap: 10 },
  topRow:   { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  stepInfo: { gap: 2 },
  bigNum:   { fontSize: 38, fontWeight: '900', color: 'rgba(167,139,250,0.90)', lineHeight: 42, letterSpacing: -1 },
  stepName: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.42)', letterSpacing: 1.5, textTransform: 'uppercase' },
  fraction: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.18)', paddingBottom: 8 },
  track:    { width: TRACK_W, height: 2, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1, overflow: 'visible' },
  fill:     { height: 2, backgroundColor: '#6C63FF', borderRadius: 1, shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },
  seg:      { position: 'absolute', top: -3, width: 2, height: 8, backgroundColor: '#04030F', borderRadius: 1 },
});

// ── Page fade hook ────────────────────────────────────────────────────────────

function usePageFade(isActive: boolean) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    if (isActive) {
      opacity.setValue(0);
      translateY.setValue(18);
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1, duration: 500, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 500, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [isActive, opacity, translateY]);
  return { opacity, transform: [{ translateY }] } as const;
}

// ── Step 1: Symbols ───────────────────────────────────────────────────────────

function StepSymbols({ selected, onToggle, isActive }: {
  selected: string[]; onToggle: (k: string) => void; isActive: boolean;
}) {
  const anim = usePageFade(isActive);
  return (
    <View style={page.outer}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={page.scroll}
        bounces
      >
        <Animated.View style={anim}>
          <Text style={page.question}>Rüyalarında en sık{'\n'}hangi semboller belirir?</Text>
          <Text style={page.hint}>Birden fazla seçebilirsin.</Text>
          <View style={sym.grid}>
            {SYMBOL_OPTIONS.map((opt, i) => {
              const isSel = selected.includes(opt.key);
              return (
                <SymbolChip
                  key={opt.key}
                  opt={opt}
                  isSelected={isSel}
                  onPress={() => onToggle(opt.key)}
                  entryDelay={40 + i * 35}
                  stepActive={isActive}
                />
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function SymbolChip({ opt, isSelected, onPress, entryDelay, stepActive }: {
  opt: typeof SYMBOL_OPTIONS[0]; isSelected: boolean; onPress: () => void; entryDelay: number; stepActive: boolean;
}) {
  const entry  = useRef(new Animated.Value(0)).current;
  const scaleA = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (stepActive) {
      entry.setValue(0);
      Animated.timing(entry, { toValue: 1, duration: 380, delay: entryDelay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [stepActive, entry, entryDelay]);

  useEffect(() => {
    Animated.spring(scaleA, { toValue: isSelected ? 1.04 : 1, useNativeDriver: true, speed: 35, bounciness: 6 }).start();
  }, [isSelected, scaleA]);

  const onPressIn  = () => Animated.spring(scaleA, { toValue: 0.92, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scaleA, { toValue: isSelected ? 1.04 : 1, useNativeDriver: true, speed: 50 }).start();

  const opacity    = entry.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const translateY = entry.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale: scaleA }] }}>
      <Pressable
        onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}
        style={[sym.chip, isSelected && sym.chipSelected]}
      >
        <Text style={sym.emoji}>{opt.emoji}</Text>
        <Text style={[sym.label, isSelected && sym.labelSelected]}>{opt.name}</Text>
        {isSelected && (
          <View style={sym.check}>
            <Ionicons name="checkmark" size={9} color="#fff" />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
const sym = StyleSheet.create({
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  chip:          { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  chipSelected:  { backgroundColor: 'rgba(108,99,255,0.16)', borderColor: 'rgba(108,99,255,0.70)', shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 4 },
  emoji:         { fontSize: 20 },
  label:         { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.50)' },
  labelSelected: { color: 'rgba(255,255,255,0.94)' },
  check:         { width: 16, height: 16, borderRadius: 8, backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
});

// ── Step 2: Emotions ──────────────────────────────────────────────────────────

function StepEmotions({ selected, onToggle, isActive }: {
  selected: string[]; onToggle: (k: string) => void; isActive: boolean;
}) {
  const anim = usePageFade(isActive);
  return (
    <View style={page.outer}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={page.scroll}
        bounces
      >
        <Animated.View style={anim}>
          <Text style={page.question}>Rüyalarında en sık{'\n'}hangi duygular belirir?</Text>
          <Text style={page.hint}>Birden fazla seçebilirsin.</Text>
          <View style={em.grid}>
            {EMOTION_OPTIONS.map((opt, i) => {
              const isSel = selected.includes(opt.key);
              return (
                <EmotionCard
                  key={opt.key}
                  opt={opt}
                  isSelected={isSel}
                  onPress={() => onToggle(opt.key)}
                  entryDelay={60 + i * 45}
                  stepActive={isActive}
                />
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function EmotionCard({ opt, isSelected, onPress, entryDelay, stepActive }: {
  opt: typeof EMOTION_OPTIONS[0]; isSelected: boolean; onPress: () => void; entryDelay: number; stepActive: boolean;
}) {
  const entry  = useRef(new Animated.Value(0)).current;
  const scaleA = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (stepActive) {
      entry.setValue(0);
      Animated.timing(entry, { toValue: 1, duration: 420, delay: entryDelay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [stepActive, entry, entryDelay]);

  useEffect(() => {
    Animated.spring(scaleA, { toValue: isSelected ? 1.04 : 1, useNativeDriver: true, speed: 35, bounciness: 6 }).start();
  }, [isSelected, scaleA]);

  const onPressIn  = () => Animated.spring(scaleA, { toValue: 0.93, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scaleA, { toValue: isSelected ? 1.04 : 1, useNativeDriver: true, speed: 50 }).start();

  const opacity    = entry.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const translateY = entry.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  const cardW      = (W - 48 - 12) / 2;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale: scaleA }], width: cardW }}>
      <Pressable
        onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}
        style={[
          em.card,
          isSelected && { borderColor: `${opt.color}70`, backgroundColor: `${opt.color}12`, shadowColor: opt.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 4 },
        ]}
      >
        {isSelected && (
          <View style={[em.checkBadge, { backgroundColor: opt.color }]}>
            <Ionicons name="checkmark" size={8} color="#fff" />
          </View>
        )}
        <Text style={[em.glyph, { color: isSelected ? opt.color : 'rgba(255,255,255,0.22)' }]}>{opt.emoji}</Text>
        <Text style={[em.name, isSelected && { color: 'rgba(255,255,255,0.94)' }]}>{opt.name}</Text>
        <Text style={[em.desc, isSelected && { color: `${opt.color}99` }]} numberOfLines={2}>{opt.desc}</Text>
      </Pressable>
    </Animated.View>
  );
}
const em = StyleSheet.create({
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  card:       { paddingVertical: 20, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'center', gap: 7, overflow: 'visible', minHeight: 110 },
  checkBadge: { position: 'absolute', top: 10, right: 10, width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  glyph:      { fontSize: 22, fontWeight: '900', lineHeight: 28 },
  name:       { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.38)', textAlign: 'center' },
  desc:       { fontSize: 10.5, color: 'rgba(255,255,255,0.22)', lineHeight: 15, textAlign: 'center', fontStyle: 'italic' },
});

// ── Step 3: Archetype ─────────────────────────────────────────────────────────

function StepArchetype({ selected, onSelect, isActive }: {
  selected: string | null; onSelect: (k: string) => void; isActive: boolean;
}) {
  const anim = usePageFade(isActive);
  return (
    <View style={page.outer}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={page.scroll}
        bounces
      >
        <Animated.View style={anim}>
          <Text style={page.question}>Sana en yakın{'\n'}arketip hangisi?</Text>
          <Text style={page.hint}>Bilinçaltının temel enerjisi.</Text>
          <View style={ar.grid}>
            {ARCHETYPE_OPTIONS.map((opt, i) => {
              const isSel = selected === opt.key;
              return (
                <ArchetypeCard
                  key={opt.key}
                  opt={opt}
                  isSelected={isSel}
                  onPress={() => onSelect(opt.key)}
                  entryDelay={60 + i * 50}
                  stepActive={isActive}
                />
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function ArchetypeCard({ opt, isSelected, onPress, entryDelay, stepActive }: {
  opt: typeof ARCHETYPE_OPTIONS[0]; isSelected: boolean; onPress: () => void; entryDelay: number; stepActive: boolean;
}) {
  const entry  = useRef(new Animated.Value(0)).current;
  const scaleA = useRef(new Animated.Value(1)).current;
  const CARD_W = (W - 48 - 12) / 2;

  useEffect(() => {
    if (stepActive) {
      entry.setValue(0);
      Animated.timing(entry, { toValue: 1, duration: 440, delay: entryDelay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [stepActive, entry, entryDelay]);

  useEffect(() => {
    Animated.spring(scaleA, { toValue: isSelected ? 1.04 : 1, useNativeDriver: true, speed: 35, bounciness: 6 }).start();
  }, [isSelected, scaleA]);

  const onPressIn  = () => Animated.spring(scaleA, { toValue: 0.93, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scaleA, { toValue: isSelected ? 1.04 : 1, useNativeDriver: true, speed: 50 }).start();

  const opacity    = entry.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const translateY = entry.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale: scaleA }], width: CARD_W }}>
      <Pressable
        onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}
        style={[
          ar.card,
          isSelected && { backgroundColor: 'rgba(108,99,255,0.14)', borderColor: 'rgba(108,99,255,0.70)', shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.30, shadowRadius: 10, elevation: 5 },
        ]}
      >
        {isSelected && (
          <View style={ar.checkBadge}>
            <Ionicons name="checkmark" size={9} color="#fff" />
          </View>
        )}
        <Text style={ar.emoji}>{opt.emoji}</Text>
        <Text style={[ar.name, isSelected && ar.nameSelected]}>{opt.name}</Text>
        <Text style={ar.desc} numberOfLines={2}>{opt.desc}</Text>
      </Pressable>
    </Animated.View>
  );
}
const ar = StyleSheet.create({
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  card:       { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'center', gap: 8, overflow: 'visible', minHeight: 110 },
  checkBadge: { position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: 9, backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center' },
  emoji:      { fontSize: 24, lineHeight: 30 },
  name:       { fontSize: 14, fontWeight: '900', color: 'rgba(255,255,255,0.45)', letterSpacing: -0.2 },
  nameSelected:{ color: 'rgba(255,255,255,0.95)' },
  desc:       { fontSize: 10, color: 'rgba(255,255,255,0.26)', lineHeight: 15, textAlign: 'center', fontStyle: 'italic' },
});

// ── Step 4: Dream Timing ──────────────────────────────────────────────────────

function StepTiming({ selected, onSelect, isActive }: {
  selected: string | null; onSelect: (k: string) => void; isActive: boolean;
}) {
  const anim = usePageFade(isActive);
  return (
    <View style={page.outer}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={page.scroll}
        bounces
      >
        <Animated.View style={anim}>
          <Text style={page.question}>Genellikle ne zaman{'\n'}rüya görürsün?</Text>
          <Text style={page.hint}>Bilinçaltının ritmi.</Text>
          <View style={ti.list}>
            {TIMING_OPTIONS.map((opt, i) => {
              const isSel = selected === opt.key;
              return (
                <TimingCard
                  key={opt.key}
                  opt={opt}
                  isSelected={isSel}
                  onPress={() => onSelect(opt.key)}
                  entryDelay={60 + i * 60}
                  stepActive={isActive}
                />
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function TimingCard({ opt, isSelected, onPress, entryDelay, stepActive }: {
  opt: typeof TIMING_OPTIONS[0]; isSelected: boolean; onPress: () => void; entryDelay: number; stepActive: boolean;
}) {
  const entry  = useRef(new Animated.Value(0)).current;
  const scaleA = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (stepActive) {
      entry.setValue(0);
      Animated.timing(entry, { toValue: 1, duration: 440, delay: entryDelay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [stepActive, entry, entryDelay]);

  useEffect(() => {
    Animated.spring(scaleA, { toValue: isSelected ? 1.02 : 1, useNativeDriver: true, speed: 35, bounciness: 4 }).start();
  }, [isSelected, scaleA]);

  const onPressIn  = () => Animated.spring(scaleA, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scaleA, { toValue: isSelected ? 1.02 : 1, useNativeDriver: true, speed: 50 }).start();

  const opacity    = entry.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const translateX = entry.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] });

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }, { scale: scaleA }] }}>
      <Pressable
        onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}
        style={[
          ti.card,
          isSelected && { backgroundColor: 'rgba(108,99,255,0.12)', borderColor: 'rgba(108,99,255,0.68)', shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 4 },
        ]}
      >
        <Text style={ti.emoji}>{opt.emoji}</Text>
        <View style={ti.body}>
          <Text style={[ti.name, isSelected && ti.nameSelected]}>{opt.name}</Text>
          <Text style={ti.desc}>{opt.desc}</Text>
        </View>
        <View style={[ti.check, isSelected && ti.checkSelected]}>
          {isSelected
            ? <Ionicons name="checkmark" size={11} color="#6C63FF" />
            : <View style={ti.checkEmpty} />
          }
        </View>
      </Pressable>
    </Animated.View>
  );
}
const ti = StyleSheet.create({
  list:          { gap: 12, marginTop: 20 },
  card:          { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  emoji:         { fontSize: 24, width: 30, textAlign: 'center' },
  body:          { flex: 1, gap: 4 },
  name:          { fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.45)' },
  nameSelected:  { color: 'rgba(255,255,255,0.94)' },
  desc:          { fontSize: 11.5, color: 'rgba(255,255,255,0.28)', lineHeight: 16 },
  check:         { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  checkSelected: { borderColor: '#6C63FF', backgroundColor: 'rgba(108,99,255,0.12)' },
  checkEmpty:    { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.10)' },
});

// ── Step 5: Generating ────────────────────────────────────────────────────────

function StepGenerating({ phaseIdx, isDone, isActive }: {
  phaseIdx: number; isDone: boolean; isActive: boolean;
}) {
  const orbAnim  = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(1)).current;
  const doneAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(orbAnim, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(orbAnim, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [isActive, orbAnim]);

  useEffect(() => {
    if (!isActive) return;
    textFade.setValue(0);
    Animated.timing(textFade, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [phaseIdx, isActive, textFade]);

  useEffect(() => {
    if (isDone) {
      Animated.timing(doneAnim, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [isDone, doneAnim]);

  const orbScale = orbAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] });
  const orbOp    = orbAnim.interpolate({ inputRange: [0, 1], outputRange: [0.30, 0.55] });
  const doneOp   = doneAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const phaseOp  = doneAnim.interpolate({ inputRange: [0, 0.3], outputRange: [1, 0] });

  const phaseText = GEN_PHASES[phaseIdx] ?? GEN_PHASES[GEN_PHASES.length - 1]!;

  return (
    <View style={[page.outer, gen.page]}>
      <GenParticles active={isActive} />

      <View style={gen.orbWrap} pointerEvents="none">
        <Animated.View style={[gen.orbOuter, { opacity: orbOp, transform: [{ scale: orbScale }] }]} />
        <View style={gen.orbCore}>
          <View style={gen.orbInner} />
        </View>
      </View>

      <Animated.View style={[gen.phaseWrap, { opacity: Animated.multiply(textFade, phaseOp) }]}>
        <Text style={gen.phaseText}>{phaseText}</Text>
        <View style={gen.phaseDots}>
          {GEN_PHASES.map((_, i) => (
            <View key={i} style={[gen.phaseDot, i <= phaseIdx && gen.phaseDotActive]} />
          ))}
        </View>
      </Animated.View>

      <Animated.View style={[gen.doneWrap, { opacity: doneOp, transform: [{ scale: doneAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
        <Text style={gen.doneGlyph}>✦</Text>
        <Text style={gen.doneTitle}>DreamCloud kimliğin{'\n'}uyandı.</Text>
        <Text style={gen.doneSub}>Bilinçaltının keşfe hazır.</Text>
      </Animated.View>
    </View>
  );
}
const gen = StyleSheet.create({
  page:       { justifyContent: 'center', alignItems: 'center' },
  orbWrap:    { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 56 },
  orbOuter:   { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: '#6C63FF' },
  orbCore:    { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(108,99,255,0.40)', borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.60)', alignItems: 'center', justifyContent: 'center' },
  orbInner:   { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(167,139,250,0.80)' },
  phaseWrap:  { alignItems: 'center', gap: 20, position: 'absolute', bottom: H * 0.22 },
  phaseText:  { fontSize: 16, color: 'rgba(255,255,255,0.65)', fontStyle: 'italic', letterSpacing: 0.2, textAlign: 'center' },
  phaseDots:  { flexDirection: 'row', gap: 8 },
  phaseDot:   { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  phaseDotActive: { backgroundColor: '#A78BFA' },
  doneWrap:   { position: 'absolute', bottom: H * 0.18, alignItems: 'center', gap: 14, paddingHorizontal: 32 },
  doneGlyph:  { fontSize: 28, color: '#A78BFA', opacity: 0.85 },
  doneTitle:  { fontSize: 24, fontWeight: '900', color: 'rgba(255,255,255,0.94)', letterSpacing: -0.4, textAlign: 'center', lineHeight: 32 },
  doneSub:    { fontSize: 14, color: 'rgba(255,255,255,0.40)', textAlign: 'center', fontStyle: 'italic' },
});

// ── Page shared styles ─────────────────────────────────────────────────────────

const page = StyleSheet.create({
  outer:  { width: W, flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 },
  question: { fontSize: 28, fontWeight: '900', color: 'rgba(255,255,255,0.94)', lineHeight: 36, letterSpacing: -0.5, marginBottom: 8 },
  hint:     { fontSize: 12, color: 'rgba(255,255,255,0.30)', fontStyle: 'italic' },
});

// ── Next button ───────────────────────────────────────────────────────────────

function NextButton({ canProceed, onPress, isLast }: { canProceed: boolean; onPress: () => void; isLast: boolean }) {
  const readyAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(readyAnim, {
      toValue: canProceed ? 1 : 0, duration: 300,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [canProceed, readyAnim]);

  const opacity   = readyAnim.interpolate({ inputRange: [0, 1], outputRange: [0.32, 1] });
  const translateY = readyAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });

  return (
    <Animated.View style={[nb.wrap, { opacity, transform: [{ translateY }] }]}>
      <Pressable
        onPress={canProceed ? onPress : undefined}
        style={({ pressed }) => [nb.btn, { opacity: pressed && canProceed ? 0.78 : 1 }]}
      >
        <Text style={nb.label}>{isLast ? 'Profilimi Oluştur' : 'Devam'}</Text>
        <Text style={nb.arrow}>{isLast ? '✦' : '→'}</Text>
      </Pressable>
    </Animated.View>
  );
}
const nb = StyleSheet.create({
  wrap:  { paddingHorizontal: 24 },
  btn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17, borderRadius: 18, backgroundColor: '#6C63FF', shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.40, shadowRadius: 12 },
  label: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  arrow: { fontSize: 16, color: 'rgba(255,255,255,0.80)' },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [step,     setStep]     = useState(0);
  const [answers,  setAnswers]  = useState<Answers>({ symbols: [], emotions: [], archetype: null, dreamTiming: null });
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [genDone,  setGenDone]  = useState(false);
  const [saving,   setSaving]   = useState(false);

  // ── Toggle helpers ──

  const toggleSymbol = useCallback((k: string) => {
    setAnswers(prev => ({
      ...prev,
      symbols: prev.symbols.includes(k) ? prev.symbols.filter(s => s !== k) : [...prev.symbols, k],
    }));
  }, []);

  const toggleEmotion = useCallback((k: string) => {
    setAnswers(prev => ({
      ...prev,
      emotions: prev.emotions.includes(k) ? prev.emotions.filter(e => e !== k) : [...prev.emotions, k],
    }));
  }, []);

  const selectArchetype = useCallback((k: string) => {
    setAnswers(prev => ({ ...prev, archetype: k }));
  }, []);

  const selectTiming = useCallback((k: string) => {
    setAnswers(prev => ({ ...prev, dreamTiming: k }));
  }, []);

  // ── Can proceed ──

  const canProceed =
    step === 0 ? answers.symbols.length > 0
    : step === 1 ? answers.emotions.length > 0
    : step === 2 ? answers.archetype !== null
    : step === 3 ? answers.dreamTiming !== null
    : false;

  // ── Generation sequence ──

  useEffect(() => {
    if (step !== 4) return;
    let idx = 0;
    const iv = setInterval(() => {
      idx++;
      if (idx < GEN_PHASES.length) {
        setPhaseIdx(idx);
      } else {
        clearInterval(iv);
        setTimeout(() => setGenDone(true), 400);
        setTimeout(() => void saveAndNavigate(), 2200);
      }
    }, 1600);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Save ──

  const saveAndNavigate = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const profile = { ...answers, savedAt: new Date().toISOString() };
      await SecureStore.setItemAsync('onboarding_profile', JSON.stringify(profile));
      await SecureStore.setItemAsync('onboarding_done', 'true');
      try {
        const archName  = ARCHETYPE_OPTIONS.find(a => a.key === answers.archetype)?.name ?? '';
        const emoLabels = answers.emotions.slice(0, 3).map(e => EMOTION_OPTIONS.find(o => o.key === e)?.name ?? e).join(', ');
        const bio = [archName, emoLabels].filter(Boolean).join(' · ');
        if (bio) await updateMyProfile({ bio });
      } catch {
        // non-critical
      }
    } catch {
      // ignore — still navigate
    }
    router.replace('/(tabs)');
  }, [answers, saving, router]);

  // ── Navigation ──

  const goNext = useCallback(() => {
    const next = step + 1;
    scrollRef.current?.scrollTo({ x: next * W, animated: true });
    setStep(next);
  }, [step]);

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <AmbientBg />

      {/* Progress header — fixed at top */}
      <ProgressHeader step={step} />

      {/* Horizontal pager */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <StepSymbols   selected={answers.symbols}    onToggle={toggleSymbol}    isActive={step === 0} />
        <StepEmotions  selected={answers.emotions}   onToggle={toggleEmotion}   isActive={step === 1} />
        <StepArchetype selected={answers.archetype}  onSelect={selectArchetype} isActive={step === 2} />
        <StepTiming    selected={answers.dreamTiming} onSelect={selectTiming}   isActive={step === 3} />
        <StepGenerating phaseIdx={phaseIdx} isDone={genDone} isActive={step === 4} />
      </ScrollView>

      {/* Next button — fixed at bottom, hidden during generation */}
      {step < 4 && (
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <NextButton canProceed={canProceed} onPress={goNext} isLast={step === 3} />
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#04030F' },
  footer: { paddingTop: 12 },
});
