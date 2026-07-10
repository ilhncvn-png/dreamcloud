import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { createDream } from '@/api/dreams.api';
import type { DreamCategory, DreamVisibility, CreateDreamDto } from '@/types/dream.types';

const { width: W, height: H } = Dimensions.get('window');
type InputMethod = 'write' | 'voice' | 'image';

// ── Data ──────────────────────────────────────────────────────────────────────

const SYMBOLS = [
  { key: 'sea',         emoji: '🌊', name: 'Deniz'  },
  { key: 'door',        emoji: '🚪', name: 'Kapı'   },
  { key: 'old_house',   emoji: '🏠', name: 'Ev'     },
  { key: 'vehicle',     emoji: '🚂', name: 'Tren'   },
  { key: 'fire',        emoji: '🔥', name: 'Ateş'   },
  { key: 'bird',        emoji: '🕊', name: 'Kuş'    },
  { key: 'mirror_self', emoji: '🪞', name: 'Ayna'   },
  { key: 'moon',        emoji: '🌙', name: 'Ay'     },
];

const SYMBOL_MEANINGS: Record<string, { meaning: string; archetype: string; emotion: string }> = {
  sea:         { meaning: 'Bilinçaltının sonsuzluğu ve derinliği.', archetype: 'Dönüşüm', emotion: 'Özlem'     },
  door:        { meaning: 'Geçişler, fırsatlar ve eşikler.',        archetype: 'Arayan',   emotion: 'Merak'     },
  old_house:   { meaning: 'Kimlik, geçmiş ve köklerin yeri.',       archetype: 'Koruyucu', emotion: 'Hüzün'     },
  vehicle:     { meaning: 'Yaşam yolculuğu ve yön duygusu.',        archetype: 'Kaşif',    emotion: 'Özgürlük'  },
  fire:        { meaning: 'Dönüşüm, tutku ve arınma.',              archetype: 'Gölge',    emotion: 'Yoğunluk'  },
  bird:        { meaning: 'Özgürlük, ruh ve sezgi.',                archetype: 'Rehber',   emotion: 'Umut'      },
  mirror_self: { meaning: 'Benlik, yansıma ve gerçek kimlik.',      archetype: 'Kaşif',    emotion: 'Merak'     },
  moon:        { meaning: 'Bilinçaltı, ritim ve kadim döngüler.',   archetype: 'Gizemli',  emotion: 'Huzur'     },
};

const EMOTIONS = [
  { key: 'fear',    name: 'Korku',  emoji: '◈', color: '#EF4444' },
  { key: 'wonder',  name: 'Merak',  emoji: '✦', color: '#A78BFA' },
  { key: 'longing', name: 'Özlem',  emoji: '◎', color: '#C084FC' },
  { key: 'peace',   name: 'Huzur',  emoji: '◌', color: '#60A5FA' },
  { key: 'joy',     name: 'Sevinç', emoji: '◑', color: '#FBBF24' },
  { key: 'anxiety', name: 'Kaygı',  emoji: '◐', color: '#F87171' },
];

const ENERGY = [
  { level: 4, name: 'Bunaltıcı', sub: 'Gerçekten yaşadım gibi', intensity: 1.00 },
  { level: 3, name: 'Güçlü',     sub: 'Canlı ve detaylı',       intensity: 0.72 },
  { level: 2, name: 'Normal',    sub: 'Net ama sıradan',         intensity: 0.44 },
  { level: 1, name: 'Silik',     sub: 'Zar zor hatırladım',     intensity: 0.22 },
];

const VISIBILITIES: { value: DreamVisibility; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'public',    label: 'Herkese', icon: 'globe-outline'       },
  { value: 'followers', label: 'Takipçi', icon: 'people-outline'      },
  { value: 'private',   label: 'Gizli',   icon: 'lock-closed-outline' },
];

const ANALYSIS_PHASES = [
  { text: 'Rüyan okunuyor…',           icon: '📖', duration: 1000 },
  { text: 'Semboller belirleniyor…',    icon: '⬡',  duration: 1000 },
  { text: 'Duygular analiz ediliyor…',  icon: '◈',  duration: 1000 },
  { text: 'Rezonans hesaplanıyor…',     icon: '✦',  duration: 800  },
];

// ── Module-level geometry ─────────────────────────────────────────────────────

const CHIP_W    = 90;
const CHIP_H    = 42;
const FIELD_H   = 256;
const FIELD_W   = W - 48;
const AVAIL_X   = FIELD_W - CHIP_W;
const AVAIL_Y   = FIELD_H - CHIP_H;

const SYM_FX: [number, number][] = [
  [0.00, 0.00], [0.50, 0.02], [0.02, 0.37], [0.63, 0.22],
  [0.26, 0.52], [0.74, 0.50], [0.08, 0.72], [0.50, 0.68],
];

const SYM_CENTERS = SYM_FX.map(([fx, fy]) => ({
  cx: fx * AVAIL_X + CHIP_W / 2,
  cy: fy * AVAIL_Y + CHIP_H / 2,
}));

const ORB_FIELD  = 300;
const ORB_CENTER = ORB_FIELD / 2;
const ORB_R      = 108;
const NODE_SIZE  = 62;

// ── Module-level stable refs ──────────────────────────────────────────────────

const R_COLORS = ['#A78BFA', '#6C63FF', '#C4B5FD', '#818CF8', '#60A5FA'];
const RITUAL_PARTS = Array.from({ length: 26 }, (_, i) => ({
  id: i, x: Math.random() * (W - 16),
  size: 1.5 + Math.random() * 3,
  duration: 7000 + Math.random() * 8000, delay: Math.random() * 4000,
  color: R_COLORS[Math.floor(Math.random() * R_COLORS.length)]!,
  anim: new Animated.Value(0),
}));

// Stable deterministic star positions
const STARS = Array.from({ length: 24 }, (_, i) => {
  const s = i * 73 + 17;
  return {
    id: i,
    x: ((s * 31 + 7) % (W - 6)),
    y: ((s * 53 + 11) % (H * 0.82)),
    size: i % 4 === 0 ? 2 : i % 3 === 0 ? 1.5 : 1,
    duration: 2200 + ((s * 97) % 2800),
    anim: new Animated.Value(((s % 10) / 10) * 0.5 + 0.05),
  };
});

const PARTICLE_CONFIGS = [
  { duration: 10000, startDeg: 0   },
  { duration: 14500, startDeg: 120 },
  { duration: 18000, startDeg: 240 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildTags(symbols: string[], emotions: string[]): string[] {
  return [...symbols.map(s => `sym:${s}`), ...emotions.map(e => `em:${e}`)].slice(0, 20);
}

function deriveCategory(content: string, emotions: string[]): DreamCategory {
  const lower = content.toLowerCase();
  if (lower.includes('lucid') || lower.includes('bilinçli rüya')) return 'lucid';
  if (emotions.includes('fear') || emotions.includes('anxiety')) return 'nightmare';
  if (emotions.includes('peace') || emotions.includes('joy')) return 'beautiful';
  return 'normal';
}

function deriveArchetype(cat: DreamCategory, emotions: string[]): string {
  if (emotions.includes('wonder')) return 'Arayan';
  if (emotions.includes('fear') || cat === 'nightmare') return 'Gölge';
  if (emotions.includes('peace') || cat === 'beautiful') return 'Koruyucu';
  if (cat === 'lucid') return 'Kaşif';
  if (emotions.includes('longing')) return 'Hayalperest';
  return 'Rehber';
}

function deriveInsight(cat: DreamCategory, emotions: string[], symbols: string[]): string {
  if (emotions.includes('fear') && emotions.includes('wonder'))
    return 'Bilinçaltın güven ve korku arasında bir geçiş yaşıyor.';
  if (emotions.includes('longing') && symbols.includes('door'))
    return 'Kapı, ulaşmak istediğin ama giremediğin bir şeyi simgeliyor.';
  if (emotions.includes('wonder'))
    return 'Bilinmeyene olan merakın, seni daha derin bir farkındalığa çekiyor.';
  if (cat === 'lucid')
    return 'Bilinç ve rüya arasındaki sınır eriyor. Bu seyrek bir armağan.';
  if (emotions.includes('peace'))
    return 'İç dünyan bir sükunet içinde; bilinçaltın seni dinlendiriyor.';
  if (symbols.includes('sea') || symbols.includes('moon'))
    return 'Derin su ve ay, bilinçaltının kadim sembolleri. İçsel döngüler konuşuyor.';
  if (cat === 'nightmare') return 'Karanlık rüyalar çoğunlukla işlenmemiş duyguların sesidir.';
  return 'Bilinçaltın bir mesaj bırakmış. Anlam zamanla açılacak.';
}

function analyzeContent(content: string): { emotions: string[]; symbols: string[] } {
  const lower = content.toLowerCase();
  const EM: Record<string, string[]> = {
    fear:    ['korku', 'kork', 'karanlık', 'tehlike', 'kaç', 'canavar', 'ölüm'],
    wonder:  ['merak', 'tuhaf', 'garip', 'şaşır', 'keşif', 'büyülü', 'gizem'],
    longing: ['özlem', 'hasret', 'uzak', 'geçmiş', 'hatır', 'kayıp', 'yalnız'],
    peace:   ['huzur', 'sakin', 'sessiz', 'dingin', 'güzel', 'rahat'],
    joy:     ['sevinç', 'mutlu', 'neşe', 'güld', 'oyna', 'dans'],
    anxiety: ['kaygı', 'endişe', 'gergin', 'sıkış', 'stres'],
  };
  const SY: Record<string, string[]> = {
    sea:         ['deniz', 'okyan', 'dalga', 'su ', 'kumsal'],
    door:        ['kapı', 'açıl', 'kapan', 'geçit', 'eşik'],
    old_house:   ['ev ', 'oda ', 'koridor', 'çatı', 'merdiven'],
    vehicle:     ['araba', 'tren', 'uçak', 'otobüs', 'yolculuk'],
    fire:        ['ateş', 'alev', 'yandı', 'duman'],
    bird:        ['kuş', 'kanat', 'uçtu'],
    mirror_self: ['ayna', 'yansı', 'kendim'],
    moon:        ['ay ', 'gece', 'yıldız', 'gölge'],
  };
  const emotions = Object.entries(EM).filter(([, ws]) => ws.some(w => lower.includes(w))).map(([k]) => k).slice(0, 4);
  const symbols  = Object.entries(SY).filter(([, ws]) => ws.some(w => lower.includes(w))).map(([k]) => k).slice(0, 5);
  if (emotions.length === 0) emotions.push('wonder');
  return { emotions, symbols };
}

function generateTitle(emotions: string[]): string {
  const T: Record<string, string[]> = {
    fear:    ['Karanlıkta Bir Ses', 'Gece Yarısı', 'Bilinmeyen'],
    wonder:  ['Bilinmeyenin Kapısında', 'Gizemli Yolculuk', 'Büyülü Labirent'],
    longing: ['Uzaktaki Işık', 'Kayıp Zamanın Peşinde', 'Özlem'],
    peace:   ['Derin Sularda Huzur', 'Sessiz Bir An', 'İç Sükûnet'],
    joy:     ['Işık Dolu Sabah', 'Dans Eden Dünya', 'Neşeli Kargaşa'],
    anxiety: ['Çıkışsız Koridorda', 'Gergin Bekleme', 'Kaçınılmaz Son'],
  };
  const top = emotions[0];
  if (top && T[top]) { const opts = T[top]!; return opts[Date.now() % opts.length]!; }
  return 'Gece Rüyası';
}

function generateSummary(emotions: string[], symbols: string[]): string {
  const topEmo = EMOTIONS.find(e => e.key === emotions[0]);
  const topSym = SYMBOLS.find(s => s.key === symbols[0]);
  if (topEmo && topSym)
    return `Bu rüya, güçlü ${topEmo.name.toLowerCase()} duygusuyla ve ${topSym.name.toLowerCase()} imgesiyle şekillenmiş. Bilinçaltının derinliklerinden gelen bu deneyim, işlenmekte olan içsel bir sürecin yansıması olabilir.`;
  if (topEmo)
    return `Rüyan ${topEmo.name.toLowerCase()} duygusunun egemenliğinde geçmiş. Bu yoğunluk, bilinçaltının sana önemli bir şey iletmeye çalıştığına işaret ediyor.`;
  return 'Rüyan, bilinçaltının gizli katmanlarından gelen imgeler içeriyor. Her detay potansiyel bir anlam taşıyor.';
}

function normalizeMetering(db: number | undefined): number {
  if (db == null) return 0.05;
  return Math.max(0.05, Math.min(1, (db + 60) / 60));
}

// ── Global atmosphere components ──────────────────────────────────────────────

function FloatingStars() {
  useEffect(() => {
    const loops = STARS.map(s => {
      const lp = Animated.loop(Animated.sequence([
        Animated.timing(s.anim, { toValue: 0.90, duration: s.duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(s.anim, { toValue: 0.05, duration: s.duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      lp.start(); return lp;
    });
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {STARS.map(s => (
        <Animated.View key={s.id} style={{
          position: 'absolute', left: s.x, top: s.y,
          width: s.size, height: s.size, borderRadius: s.size / 2,
          backgroundColor: '#C4B5FD', opacity: s.anim,
        }} />
      ))}
    </View>
  );
}

function RitualParticles({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const loops = RITUAL_PARTS.map(p => {
      const lp = Animated.loop(Animated.sequence([
        Animated.delay(p.delay),
        Animated.timing(p.anim, { toValue: 1, duration: p.duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(p.anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]));
      lp.start(); return lp;
    });
    return () => { loops.forEach(l => l.stop()); RITUAL_PARTS.forEach(p => p.anim.setValue(0)); };
  }, [active]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {RITUAL_PARTS.map(p => {
        const ty = p.anim.interpolate({ inputRange: [0, 0.05, 0.85, 1], outputRange: [0, 0, -H * 0.80, -H * 0.80] });
        const op = p.anim.interpolate({ inputRange: [0, 0.05, 0.65, 0.92, 1], outputRange: [0, 0.85, 0.65, 0, 0] });
        return (
          <Animated.View key={p.id} pointerEvents="none" style={{
            position: 'absolute', bottom: H * 0.18, left: p.x,
            width: p.size, height: p.size, borderRadius: p.size / 2,
            backgroundColor: p.color, opacity: op, transform: [{ translateY: ty }],
          }} />
        );
      })}
    </View>
  );
}

function AmbientBg({ color }: { color: string }) {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const make = (anim: Animated.Value, dur: number) =>
      Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
    const l1 = make(pulse1, 9000); const l2 = make(pulse2, 13500);
    l1.start(); l2.start();
    return () => { l1.stop(); l2.stop(); };
  }, [pulse1, pulse2]);
  const op1 = pulse1.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.10] });
  const op2 = pulse2.interpolate({ inputRange: [0, 1], outputRange: [0.02, 0.07] });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={{ position: 'absolute', opacity: op1, backgroundColor: color, width: W * 0.55, height: W * 0.55, borderRadius: W * 0.275, top: -W * 0.16, left: -W * 0.10 }} />
      <Animated.View style={{ position: 'absolute', opacity: op2, backgroundColor: '#4338CA', width: W * 0.42, height: W * 0.42, borderRadius: W * 0.21, bottom: -W * 0.10, right: -W * 0.08 }} />
    </View>
  );
}

// ── Step 0: Tell Your Dream (Voice First) ────────────────────────────────────

function VoiceMethod({ waveformBars, isRecording, duration, isTranscribing, voiceUri, onStartRecord, onStopRecord }: {
  waveformBars: number[]; isRecording: boolean; duration: number;
  isTranscribing: boolean; voiceUri: string | null;
  onStartRecord: () => void; onStopRecord: () => void;
}) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const idleA = useRef(new Animated.Value(0)).current;
  const loopsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    loopsRef.current.forEach(l => l.stop());
    loopsRef.current = [];
    [ring1, ring2, ring3].forEach(r => r.setValue(0));

    if (isRecording) {
      const make = (anim: Animated.Value, delay: number) =>
        Animated.loop(Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]));
      loopsRef.current = [make(ring1, 0), make(ring2, 600), make(ring3, 1200)];
      loopsRef.current.forEach(l => l.start());
    }
    return () => loopsRef.current.forEach(l => l.stop());
  }, [isRecording, ring1, ring2, ring3]);

  useEffect(() => {
    if (isRecording || voiceUri) { idleA.setValue(0); return; }
    const lp = Animated.loop(Animated.sequence([
      Animated.timing(idleA, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(idleA, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    lp.start(); return () => lp.stop();
  }, [isRecording, voiceUri, idleA]);

  const rStyle = (r: Animated.Value, maxScale: number) => ({
    scale:   r.interpolate({ inputRange: [0, 1], outputRange: [1, maxScale] }),
    opacity: r.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 0.45, 0.12, 0] }),
  });
  const r1s = rStyle(ring1, 1.9); const r2s = rStyle(ring2, 2.4); const r3s = rStyle(ring3, 3.0);
  const idleScale = idleA.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const idleOp    = idleA.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.28] });

  const MIC = 96;
  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32, paddingTop: 8, paddingBottom: 48 }}>
      {/* Waveform */}
      <View style={{ width: '100%', height: 72, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        {waveformBars.map((h, i) => (
          <View key={i} style={{
            flex: 1,
            height: Math.max(3, Math.round(h * 64)),
            borderRadius: 2,
            backgroundColor: isRecording
              ? `rgba(167,139,250,${0.3 + h * 0.7})`
              : voiceUri ? 'rgba(52,211,153,0.35)'
              : 'rgba(255,255,255,0.07)',
          }} />
        ))}
      </View>

      {/* Timer */}
      {(isRecording || duration > 0) && (
        <Text style={{ fontSize: 22, color: 'rgba(255,255,255,0.60)', fontWeight: '200', letterSpacing: 5 }}>
          {fmt(duration)}
        </Text>
      )}

      {/* Mic area */}
      {isTranscribing ? (
        <View style={{ alignItems: 'center', gap: 16 }}>
          <View style={[micS.btn, { backgroundColor: 'rgba(167,139,250,0.15)', borderColor: 'rgba(167,139,250,0.35)' }]}>
            <Ionicons name="hourglass-outline" size={32} color="rgba(167,139,250,0.70)" />
          </View>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', letterSpacing: 0.5 }}>
            Çözümleniyor…
          </Text>
        </View>
      ) : voiceUri && !isRecording ? (
        <View style={{ alignItems: 'center', gap: 14 }}>
          <View style={[micS.btn, { backgroundColor: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.45)' }]}>
            <Ionicons name="checkmark" size={36} color="#34D399" />
          </View>
          <Text style={{ fontSize: 13, color: '#34D399', fontWeight: '700', letterSpacing: 0.3 }}>Ses kaydedildi</Text>
        </View>
      ) : (
        <Pressable onPress={isRecording ? onStopRecord : onStartRecord}
          style={({ pressed }) => [{ alignItems: 'center', opacity: pressed ? 0.78 : 1 }]}>
          {/* Rings */}
          <View style={{ width: MIC, height: MIC, alignItems: 'center', justifyContent: 'center' }}>
            {/* Idle ring */}
            {!isRecording && (
              <Animated.View style={{
                position: 'absolute', width: MIC, height: MIC, borderRadius: MIC / 2,
                borderWidth: 1, borderColor: '#A78BFA',
                opacity: idleOp, transform: [{ scale: idleScale }],
              }} />
            )}
            {/* Recording rings */}
            {([r1s, r2s, r3s] as typeof r1s[]).map((rs, i) => (
              <Animated.View key={i} style={{
                position: 'absolute', width: MIC, height: MIC, borderRadius: MIC / 2,
                borderWidth: 1.5, borderColor: '#A78BFA',
                opacity: rs.opacity, transform: [{ scale: rs.scale }],
              }} />
            ))}
            {/* Button */}
            <View style={[micS.btn, isRecording && micS.btnActive]}>
              {isRecording
                ? <View style={micS.stopIcon} />
                : <Ionicons name="mic" size={36} color="#fff" />}
            </View>
          </View>
          <Text style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.22)', marginTop: 18, letterSpacing: 0.8 }}>
            {isRecording ? 'DURDUR' : 'SESLE ANLAT'}
          </Text>
        </Pressable>
      )}

      {!isRecording && !voiceUri && !isTranscribing && (
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.16)', textAlign: 'center', lineHeight: 20, fontStyle: 'italic' }}>
          Bilinçaltın dinliyor.{'\n'}Yargılanmayacaksın.
        </Text>
      )}
    </View>
  );
}
const micS = StyleSheet.create({
  btn:      { width: 96, height: 96, borderRadius: 48, backgroundColor: '#6C63FF', borderWidth: 2, borderColor: 'rgba(167,139,250,0.55)', alignItems: 'center', justifyContent: 'center', shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.60, shadowRadius: 20 },
  btnActive:{ backgroundColor: 'rgba(239,68,68,0.75)', borderColor: 'rgba(239,68,68,0.45)', shadowColor: '#EF4444' },
  stopIcon: { width: 26, height: 26, borderRadius: 4, backgroundColor: '#fff' },
});

function StepTellDream({
  inputMethod, onMethodChange,
  content, onContentChange,
  waveformBars, isRecording, recordingDuration, isTranscribing, voiceUri,
  onStartRecord, onStopRecord,
  imageUri, onPickGallery, onPickCamera,
  inputRef,
}: {
  inputMethod: InputMethod; onMethodChange: (m: InputMethod) => void;
  content: string; onContentChange: (t: string) => void;
  waveformBars: number[]; isRecording: boolean; recordingDuration: number;
  isTranscribing: boolean; voiceUri: string | null;
  onStartRecord: () => void; onStopRecord: () => void;
  imageUri: string | null; onPickGallery: () => void; onPickCamera: () => void;
  inputRef: React.RefObject<TextInput | null>;
}) {
  return (
    <View style={pg.fill}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 4 }}>

          {/* Header — title + optional back-to-voice chip */}
          <View style={tdS.header}>
            <View style={{ flex: 1 }}>
              <Text style={tdS.title}>Anlat.</Text>
              <Text style={tdS.subtitle}>Bilinçaltın dinliyor.</Text>
            </View>
            {inputMethod !== 'voice' && (
              <Pressable onPress={() => onMethodChange('voice')} style={tdS.backVoice} hitSlop={12}>
                <Ionicons name="mic" size={13} color="rgba(167,139,250,0.55)" />
                <Text style={tdS.backVoiceText}>Ses</Text>
              </Pressable>
            )}
          </View>

          {/* Voice — primary, center stage */}
          {inputMethod === 'voice' && (
            <VoiceMethod
              waveformBars={waveformBars} isRecording={isRecording} duration={recordingDuration}
              isTranscribing={isTranscribing} voiceUri={voiceUri}
              onStartRecord={onStartRecord} onStopRecord={onStopRecord}
            />
          )}

          {/* Write — secondary, text fills space */}
          {inputMethod === 'write' && (
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TextInput
                ref={inputRef}
                style={tdS.textInput}
                value={content}
                onChangeText={onContentChange}
                placeholder={'Gördüklerini, hissettiklerini,\nimgelerini bırak buraya…'}
                placeholderTextColor="rgba(255,255,255,0.09)"
                multiline
                textAlignVertical="top"
                maxLength={10000}
                scrollEnabled={false}
                selectionColor="#A78BFA"
                autoFocus
              />
            </ScrollView>
          )}

          {/* Image — secondary, pick or preview */}
          {inputMethod === 'image' && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
              {imageUri ? (
                <View style={tdS.imgPreview}>
                  <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  <View style={tdS.imgOverlay}>
                    <Text style={tdS.imgOverlayTxt}>✦  Semboller çıkarılıyor…</Text>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={tdS.imgHint}>Rüyanı temsil eden bir görsel seç.{'\n'}AI sembolleri okuyacak.</Text>
                  <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                    <Pressable onPress={onPickCamera} style={({ pressed }) => [tdS.pickBtn, { opacity: pressed ? 0.75 : 1 }]}>
                      <Ionicons name="camera-outline" size={22} color="rgba(167,139,250,0.55)" />
                      <Text style={tdS.pickLabel}>Kamera</Text>
                    </Pressable>
                    <Pressable onPress={onPickGallery} style={({ pressed }) => [tdS.pickBtn, { opacity: pressed ? 0.75 : 1 }]}>
                      <Ionicons name="images-outline" size={22} color="rgba(167,139,250,0.55)" />
                      <Text style={tdS.pickLabel}>Galeri</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Secondary method triggers — only in voice mode and idle */}
          {inputMethod === 'voice' && !isRecording && !isTranscribing && (
            <View style={tdS.secondary}>
              <Text style={tdS.secondaryEyebrow}>BUNUN YERİNE</Text>
              <View style={tdS.secondaryRow}>
                <Pressable onPress={() => onMethodChange('write')} style={({ pressed }) => [tdS.secBtn, { opacity: pressed ? 0.65 : 1 }]}>
                  <Text style={tdS.secBtnTxt}>✍  Yaz</Text>
                </Pressable>
                <Pressable onPress={() => onMethodChange('image')} style={({ pressed }) => [tdS.secBtn, { opacity: pressed ? 0.65 : 1 }]}>
                  <Text style={tdS.secBtnTxt}>📷  Görsel</Text>
                </Pressable>
              </View>
            </View>
          )}

        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
const tdS = StyleSheet.create({
  header:          { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  title:           { fontSize: 44, fontWeight: '900', color: 'rgba(255,255,255,0.94)', letterSpacing: -1.5, lineHeight: 50 },
  subtitle:        { fontSize: 12, color: 'rgba(255,255,255,0.18)', fontStyle: 'italic', letterSpacing: 0.3, marginTop: 4 },
  backVoice:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(167,139,250,0.18)', backgroundColor: 'rgba(167,139,250,0.05)', marginTop: 10 },
  backVoiceText:   { fontSize: 11, fontWeight: '700', color: 'rgba(167,139,250,0.55)' },
  textInput:       { fontSize: 17, color: 'rgba(255,255,255,0.88)', lineHeight: 30, minHeight: H * 0.42, fontWeight: '300', letterSpacing: 0.1, marginTop: 20 },
  imgPreview:      { width: '100%', aspectRatio: 1.35, borderRadius: 22, overflow: 'hidden' },
  imgOverlay:      { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, backgroundColor: 'rgba(4,3,15,0.82)' },
  imgOverlayTxt:   { fontSize: 11, color: '#A78BFA', textAlign: 'center', fontStyle: 'italic' },
  imgHint:         { fontSize: 13, color: 'rgba(255,255,255,0.20)', textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },
  pickBtn:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 28, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(167,139,250,0.12)', backgroundColor: 'rgba(108,99,255,0.03)' },
  pickLabel:       { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.28)' },
  secondary:       { paddingBottom: 28, gap: 10, alignItems: 'center' },
  secondaryEyebrow:{ fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(255,255,255,0.10)' },
  secondaryRow:    { flexDirection: 'row', gap: 10 },
  secBtn:          { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' },
  secBtnTxt:       { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.26)' },
});

// ── Step 1: AI Analysis ───────────────────────────────────────────────────────

function StepAIAnalysis({ onComplete }: { onComplete: () => void }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const textFade = useRef(new Animated.Value(1)).current;
  const orbAnim  = useRef(new Animated.Value(0)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const orbLoop = Animated.loop(Animated.sequence([
      Animated.timing(orbAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(orbAnim, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    orbLoop.start();
    let idx = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const next = () => {
      const phase = ANALYSIS_PHASES[idx];
      if (!phase) return;
      const t = setTimeout(() => {
        idx++;
        if (idx < ANALYSIS_PHASES.length) {
          Animated.timing(textFade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
            setPhaseIndex(idx);
            Animated.timing(textFade, { toValue: 1, duration: 220, useNativeDriver: true }).start(next);
          });
        } else {
          Animated.timing(textFade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
            orbLoop.stop(); onCompleteRef.current();
          });
        }
      }, phase.duration);
      timeouts.push(t);
    };
    next();
    return () => { orbLoop.stop(); timeouts.forEach(clearTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orbScale = orbAnim.interpolate({ inputRange: [0, 1], outputRange: [0.90, 1.12] });
  const orbOp    = orbAnim.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.55] });
  const phase    = ANALYSIS_PHASES[phaseIndex]!;

  return (
    <View style={[pg.fill, { alignItems: 'center', justifyContent: 'center', gap: 48 }]}>
      <RitualParticles active />
      <View style={{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: '#6C63FF', opacity: orbOp, transform: [{ scale: orbScale }] }} />
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(108,99,255,0.35)', borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.60)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(196,181,253,0.85)' }} />
        </View>
      </View>
      <Animated.View style={{ opacity: textFade, alignItems: 'center', gap: 14 }}>
        <Text style={{ fontSize: 26, lineHeight: 32 }}>{phase.icon}</Text>
        <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.58)', fontStyle: 'italic', letterSpacing: 0.3, textAlign: 'center' }}>{phase.text}</Text>
      </Animated.View>
    </View>
  );
}

// ── Step 2: Confirm Emotions ──────────────────────────────────────────────────

function CenterPulse({ count }: { count: number }) {
  const scaleA = useRef(new Animated.Value(1)).current;
  const glowA  = useRef(new Animated.Value(0.3)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    Animated.spring(scaleA, { toValue: 1 + count * 0.10, useNativeDriver: true, speed: 10, bounciness: 8 }).start();
    loopRef.current?.stop();
    const duration = Math.max(700, 2400 - count * 400);
    const lp = Animated.loop(Animated.sequence([
      Animated.timing(glowA, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(glowA, { toValue: count > 0 ? 0.40 : 0.12, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loopRef.current = lp; lp.start();
    return () => loopRef.current?.stop();
  }, [count, scaleA, glowA]);

  const outerOp = glowA.interpolate({ inputRange: [0, 1], outputRange: [0.06, count > 0 ? 0.38 : 0.12] });
  const dotOp   = glowA.interpolate({ inputRange: [0, 1], outputRange: [0.25, count > 0 ? 0.90 : 0.45] });

  return (
    <>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: ORB_CENTER - 30, left: ORB_CENTER - 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#6C63FF', opacity: outerOp, transform: [{ scale: scaleA }] }} />
      <View pointerEvents="none" style={{ position: 'absolute', top: ORB_CENTER - 22, left: ORB_CENTER - 22, width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(167,139,250,0.28)' }} />
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: ORB_CENTER - 8, left: ORB_CENTER - 8, width: 16, height: 16, borderRadius: 8, backgroundColor: '#A78BFA', opacity: dotOp, transform: [{ scale: scaleA }] }} />
    </>
  );
}

function OrbitalParticles({ active }: { active: boolean }) {
  const anims  = useRef(PARTICLE_CONFIGS.map(() => new Animated.Value(0))).current;
  const opAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opAnim, { toValue: active ? 1 : 0, duration: 700, useNativeDriver: true }).start();
  }, [active, opAnim]);

  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const lp = Animated.loop(
        Animated.timing(anim, { toValue: 1, duration: PARTICLE_CONFIGS[i]!.duration, easing: Easing.linear, useNativeDriver: true })
      );
      lp.start(); return lp;
    });
    return () => loops.forEach(l => l.stop());
  }, [anims]);

  return (
    <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: opAnim }} pointerEvents="none">
      {anims.map((anim, i) => {
        const start = PARTICLE_CONFIGS[i]!.startDeg;
        const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: [`${start}deg`, `${start + 360}deg`] });
        const sz = 5 - i;
        return (
          <Animated.View key={i} style={{ position: 'absolute', top: ORB_CENTER, left: ORB_CENTER, width: 0, height: 0, transform: [{ rotate }] }}>
            <View style={{ position: 'absolute', top: -(ORB_R - 6), left: -sz / 2, width: sz, height: sz, borderRadius: sz / 2, backgroundColor: '#C4B5FD', opacity: 0.65 - i * 0.10 }} />
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

function StepConfirmEmotions({ selected, onToggle }: { selected: string[]; onToggle: (k: string) => void }) {
  return (
    <View style={pg.fill}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 20 }}>
        <Text style={pg.label}>DUYGULAR  ·  MAX 4</Text>
        <Text style={pg.title}>Hangi duygular{'\n'}hissettirdi?</Text>

        <View style={{ width: ORB_FIELD, height: ORB_FIELD, alignSelf: 'center', marginTop: 16 }}>
          <View pointerEvents="none" style={{ position: 'absolute', top: ORB_CENTER - ORB_R, left: ORB_CENTER - ORB_R, width: ORB_R * 2, height: ORB_R * 2, borderRadius: ORB_R, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderStyle: 'dashed' }} />
          <CenterPulse count={selected.length} />
          <OrbitalParticles active={selected.length >= 2} />
          {EMOTIONS.map((e, i) => (
            <EmotionNode key={e.key} opt={e} index={i} total={EMOTIONS.length} isSelected={selected.includes(e.key)} onPress={() => onToggle(e.key)} />
          ))}
        </View>

        {selected.length > 0 && (
          <View style={enoS.selectedRow}>
            {selected.map(k => {
              const e = EMOTIONS.find(em => em.key === k);
              return e ? (
                <View key={k} style={[enoS.selChip, { borderColor: `${e.color}55`, backgroundColor: `${e.color}10` }]}>
                  <Text style={[enoS.selText, { color: e.color }]}>{e.emoji}  {e.name}</Text>
                </View>
              ) : null;
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function EmotionNode({ opt, index, total, isSelected, onPress }: {
  opt: typeof EMOTIONS[0]; index: number; total: number; isSelected: boolean; onPress: () => void;
}) {
  const rotAnim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const scaleA  = useRef(new Animated.Value(1)).current;
  const baseAngle = (index / total) * 360;

  useEffect(() => {
    loopRef.current?.stop();
    const lp = Animated.loop(
      Animated.timing(rotAnim, { toValue: 1, duration: isSelected ? 9000 : 36000, easing: Easing.linear, useNativeDriver: true })
    );
    loopRef.current = lp; lp.start();
    Animated.spring(scaleA, { toValue: isSelected ? 1.16 : 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
    return () => { loopRef.current?.stop(); };
  }, [isSelected, rotAnim, scaleA]);

  const rotate        = rotAnim.interpolate({ inputRange: [0, 1], outputRange: [`${baseAngle}deg`, `${baseAngle + 360}deg`] });
  const counterRotate = rotAnim.interpolate({ inputRange: [0, 1], outputRange: [`${-baseAngle}deg`, `${-(baseAngle + 360)}deg`] });
  const onIn  = () => Animated.spring(scaleA, { toValue: 0.88, useNativeDriver: true, speed: 60 }).start();
  const onOut = () => Animated.spring(scaleA, { toValue: isSelected ? 1.16 : 1, useNativeDriver: true, speed: 60 }).start();

  return (
    <Animated.View style={{ position: 'absolute', top: ORB_CENTER, left: ORB_CENTER, width: 0, height: 0, transform: [{ rotate }] }}>
      <Animated.View style={{ position: 'absolute', top: -(ORB_R + NODE_SIZE / 2), left: -NODE_SIZE / 2, transform: [{ rotate: counterRotate }, { scale: scaleA }] }}>
        <Pressable onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }} onPressIn={onIn} onPressOut={onOut}
          style={[enoS.node,
            { borderColor: isSelected ? `${opt.color}80` : 'rgba(255,255,255,0.12)', backgroundColor: isSelected ? `${opt.color}18` : 'rgba(255,255,255,0.03)' },
            isSelected && { shadowColor: opt.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 10, elevation: 6 },
          ]}>
          <Text style={[enoS.nodeEmoji, { color: isSelected ? opt.color : 'rgba(255,255,255,0.30)' }]}>{opt.emoji}</Text>
          <Text style={[enoS.nodeName, isSelected && { color: 'rgba(255,255,255,0.90)', fontWeight: '900' }]}>{opt.name}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
const enoS = StyleSheet.create({
  node:        { width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 3 },
  nodeEmoji:   { fontSize: 18, lineHeight: 22 },
  nodeName:    { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.25)', textAlign: 'center', letterSpacing: 0.3 },
  selectedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, justifyContent: 'center' },
  selChip:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  selText:     { fontSize: 12, fontWeight: '800' },
});

// ── Step 3: Confirm Symbols ───────────────────────────────────────────────────

function AnimatedLine({ midX, midY, len, ang }: { midX: number; midY: number; len: number; ang: number }) {
  const fadeA = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeA, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [fadeA]);
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left: midX - len / 2, top: midY - 0.5,
      width: len, height: 1, backgroundColor: 'rgba(167,139,250,0.28)',
      transform: [{ rotate: `${ang}deg` }], opacity: fadeA,
    }} />
  );
}

function SymbolRevealCard({ symbolKey }: { symbolKey: string }) {
  const sym     = SYMBOLS.find(s => s.key === symbolKey);
  const meaning = SYMBOL_MEANINGS[symbolKey];
  const fadeA   = useRef(new Animated.Value(0)).current;
  const slideA  = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeA,  { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideA, { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [fadeA, slideA]);

  if (!sym || !meaning) return null;
  return (
    <Animated.View style={[revS.card, { opacity: fadeA, transform: [{ translateY: slideA }] }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Text style={{ fontSize: 28 }}>{sym.emoji}</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={revS.name}>{sym.name}</Text>
          <Text style={revS.meaning}>{meaning.meaning}</Text>
        </View>
      </View>
      <View style={revS.tagRow}>
        <View style={revS.tag}><Text style={revS.tagText}>◈  {meaning.emotion}</Text></View>
        <View style={revS.tag}><Text style={revS.tagText}>✦  {meaning.archetype}</Text></View>
      </View>
    </Animated.View>
  );
}
const revS = StyleSheet.create({
  card:    { backgroundColor: 'rgba(108,99,255,0.09)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(108,99,255,0.28)', padding: 16, gap: 14, marginTop: 16, marginBottom: 4 },
  name:    { fontSize: 16, fontWeight: '900', color: 'rgba(255,255,255,0.88)', letterSpacing: -0.2 },
  meaning: { fontSize: 12.5, color: 'rgba(255,255,255,0.46)', lineHeight: 18, fontStyle: 'italic' },
  tagRow:  { flexDirection: 'row', gap: 8 },
  tag:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(167,139,250,0.10)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.20)' },
  tagText: { fontSize: 11, fontWeight: '700', color: 'rgba(167,139,250,0.78)' },
});

function StepConfirmSymbols({ selected, onToggle }: { selected: string[]; onToggle: (k: string) => void }) {
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePress = useCallback((k: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const wasSelected = selected.includes(k);
    onToggle(k);
    if (!wasSelected) {
      if (revealTimer.current) clearTimeout(revealTimer.current);
      setRevealedKey(k);
      revealTimer.current = setTimeout(() => setRevealedKey(null), 2600);
    } else {
      setRevealedKey(null);
    }
  }, [selected, onToggle]);

  const lines = useMemo(() => {
    const idxs = selected.map(k => SYMBOLS.findIndex(s => s.key === k)).filter(i => i >= 0);
    const result: { midX: number; midY: number; len: number; ang: number; pairKey: string }[] = [];
    for (let i = 0; i < idxs.length - 1; i++) {
      for (let j = i + 1; j < idxs.length; j++) {
        const a = SYM_CENTERS[idxs[i]!]!; const b = SYM_CENTERS[idxs[j]!]!;
        const dx = b.cx - a.cx; const dy = b.cy - a.cy;
        result.push({ midX: (a.cx + b.cx) / 2, midY: (a.cy + b.cy) / 2, len: Math.sqrt(dx * dx + dy * dy), ang: Math.atan2(dy, dx) * 180 / Math.PI, pairKey: `${idxs[i]}-${idxs[j]}` });
      }
    }
    return result;
  }, [selected]);

  return (
    <View style={pg.fill}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 20 }}>
        <Text style={pg.label}>SEMBOLLER  ·  MAX 5</Text>
        <Text style={pg.title}>Hangi semboller{'\n'}öne çıktı?</Text>

        {/* Reveal card */}
        {revealedKey && <SymbolRevealCard key={revealedKey} symbolKey={revealedKey} />}

        {/* Floating field */}
        <View style={{ width: FIELD_W, height: FIELD_H, marginTop: 22 }}>
          {lines.map(l => <AnimatedLine key={l.pairKey} midX={l.midX} midY={l.midY} len={l.len} ang={l.ang} />)}
          {selected.map(k => {
            const idx = SYMBOLS.findIndex(s => s.key === k);
            const c = idx >= 0 ? SYM_CENTERS[idx] : null;
            return c ? (
              <View key={k} pointerEvents="none" style={{ position: 'absolute', left: c.cx - 3, top: c.cy - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(167,139,250,0.50)' }} />
            ) : null;
          })}
          {SYMBOLS.map((s, i) => {
            const [fx, fy] = SYM_FX[i]!;
            return (
              <FloatingChip key={s.key} opt={s} isSelected={selected.includes(s.key)} onPress={() => handlePress(s.key)} left={fx * AVAIL_X} top={fy * AVAIL_Y} delay={i * 40} />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function FloatingChip({ opt, isSelected, onPress, left, top, delay }: {
  opt: typeof SYMBOLS[0]; isSelected: boolean; onPress: () => void; left: number; top: number; delay: number;
}) {
  const entry  = useRef(new Animated.Value(0)).current;
  const pulse  = useRef(new Animated.Value(0)).current;
  const scaleA = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    Animated.timing(entry, { toValue: 1, duration: 400, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [entry, delay]);

  useEffect(() => {
    loopRef.current?.stop();
    if (isSelected) {
      const lp = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      loopRef.current = lp; lp.start();
    } else { pulse.setValue(0); }
    Animated.spring(scaleA, { toValue: isSelected ? 1.06 : 1, useNativeDriver: true, speed: 35, bounciness: 5 }).start();
    return () => loopRef.current?.stop();
  }, [isSelected, pulse, scaleA]);

  const op     = entry.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const glowOp = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.30] });

  return (
    <Animated.View style={{ position: 'absolute', left, top, opacity: op, transform: [{ scale: scaleA }] }}>
      <Pressable onPress={onPress}
        onPressIn={() => Animated.spring(scaleA, { toValue: 0.91, useNativeDriver: true, speed: 60 }).start()}
        onPressOut={() => Animated.spring(scaleA, { toValue: isSelected ? 1.06 : 1, useNativeDriver: true, speed: 60 }).start()}
        style={[chipS.chip, isSelected && chipS.chipSel]}>
        {isSelected && <Animated.View style={[chipS.glow, { opacity: glowOp }]} />}
        <Text style={chipS.emoji}>{opt.emoji}</Text>
        <Text style={[chipS.label, isSelected && chipS.labelSel]}>{opt.name}</Text>
      </Pressable>
    </Animated.View>
  );
}
const chipS = StyleSheet.create({
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', backgroundColor: 'rgba(255,255,255,0.03)', overflow: 'hidden' },
  chipSel:  { borderColor: 'rgba(108,99,255,0.75)', backgroundColor: 'rgba(108,99,255,0.12)', shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.40, shadowRadius: 8, elevation: 5 },
  glow:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#6C63FF' },
  emoji:    { fontSize: 20 },
  label:    { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.45)' },
  labelSel: { color: 'rgba(255,255,255,0.95)' },
});

// ── Step 4: Energy ────────────────────────────────────────────────────────────

function StepEnergy({ level, onSelect }: { level: number; onSelect: (l: number) => void }) {
  return (
    <View style={pg.fill}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 20 }}>
        <Text style={pg.label}>ENERJİ  ·  İSTEĞE BAĞLI</Text>
        <Text style={pg.title}>Rüyanın enerjisi{'\n'}ne kadar güçlüydü?</Text>
        <View style={engS.scale}>
          {ENERGY.map(e => <EnergyRow key={e.level} item={e} isSelected={level === e.level} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onSelect(e.level); }} />)}
        </View>
      </ScrollView>
    </View>
  );
}

function EnergyRow({ item, isSelected, onPress }: { item: typeof ENERGY[0]; isSelected: boolean; onPress: () => void }) {
  const scaleA   = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const loopRef  = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    loopRef.current?.stop();
    Animated.spring(scaleA, { toValue: isSelected ? 1.02 : 1, useNativeDriver: true, speed: 35, bounciness: 3 }).start();
    if (isSelected) {
      const lp = Animated.loop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.6, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      loopRef.current = lp; lp.start();
    } else { glowAnim.setValue(0); }
    return () => loopRef.current?.stop();
  }, [isSelected, scaleA, glowAnim]);

  const glowOp = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] });

  return (
    <Animated.View style={{ transform: [{ scale: scaleA }] }}>
      <Pressable onPress={onPress}
        onPressIn={() => Animated.spring(scaleA, { toValue: 0.97, useNativeDriver: true, speed: 60 }).start()}
        onPressOut={() => Animated.spring(scaleA, { toValue: isSelected ? 1.02 : 1, useNativeDriver: true, speed: 60 }).start()}
        style={[engS.row, isSelected && { borderColor: 'rgba(108,99,255,0.65)', backgroundColor: 'rgba(108,99,255,0.08)', shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.30, shadowRadius: 10, elevation: 5 }]}>
        {isSelected && <Animated.View style={[engS.rowGlow, { opacity: glowOp }]} />}
        <View style={[engS.intensityBar, { width: `${Math.round(item.intensity * 100)}%` as `${number}%`, opacity: isSelected ? 0.22 : 0.07 }]} />
        <View style={[engS.indicator, isSelected && { backgroundColor: '#6C63FF' }]} />
        <View style={engS.labels}>
          <Text style={[engS.name, isSelected && { color: 'rgba(255,255,255,0.96)', fontWeight: '900' }]}>{item.name}</Text>
          <Text style={engS.sub}>{item.sub}</Text>
        </View>
        <View style={[engS.check, isSelected && engS.checkSel]}>
          {isSelected && <View style={engS.checkDot} />}
        </View>
      </Pressable>
    </Animated.View>
  );
}
const engS = StyleSheet.create({
  scale:       { gap: 10, marginTop: 26 },
  row:         { borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: '#06051A', paddingVertical: 18, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden' },
  rowGlow:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#6C63FF' },
  intensityBar:{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#6C63FF' },
  indicator:   { width: 4, height: 36, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' },
  labels:      { flex: 1, gap: 4 },
  name:        { fontSize: 17, fontWeight: '800', color: 'rgba(255,255,255,0.45)' },
  sub:         { fontSize: 11.5, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' },
  check:       { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  checkSel:    { borderColor: '#6C63FF', backgroundColor: 'rgba(108,99,255,0.15)' },
  checkDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6C63FF' },
});

// ── Step 5: Dream Preview ─────────────────────────────────────────────────────

function ArchetypeNode({ archetype, topEmotion, energyName, topSymbol }: {
  archetype: string; topEmotion: typeof EMOTIONS[0] | undefined; energyName: string; topSymbol: string;
}) {
  const breatheA = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const lp = Animated.loop(Animated.sequence([
      Animated.timing(breatheA, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breatheA, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    lp.start(); return () => lp.stop();
  }, [breatheA]);
  const sc = breatheA.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
  const op = breatheA.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.42] });
  const color = topEmotion?.color ?? '#6C63FF';
  const dataPoints = [
    { label: 'DUYGU',   value: topEmotion?.name ?? '—', color },
    { label: 'SEMBOL',  value: topSymbol,                color: '#C4B5FD' },
    { label: 'ENERJİ',  value: energyName,               color: '#818CF8' },
  ];
  return (
    <View style={{ alignItems: 'center', gap: 20, paddingVertical: 12 }}>
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 96, height: 96 }}>
        <Animated.View style={{ position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: color, opacity: op, transform: [{ scale: sc }] }} />
        <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: `${color}55`, backgroundColor: 'rgba(4,3,15,0.60)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.92)', letterSpacing: -0.2, textAlign: 'center' }}>{archetype}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 0, width: '100%' }}>
        {dataPoints.map((dp, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: 'rgba(255,255,255,0.06)' }}>
            <Text style={{ fontSize: 8, fontWeight: '900', letterSpacing: 1.5, color: 'rgba(255,255,255,0.22)' }}>{dp.label}</Text>
            <Text style={{ fontSize: 15, fontWeight: '900', color: dp.color, letterSpacing: -0.2 }}>{dp.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StepDreamPreview({ title, summary, emotions, symbols, category, energyLevel, visibility, onVisibility }: {
  title: string; summary: string; emotions: string[]; symbols: string[];
  category: DreamCategory; energyLevel: number; visibility: DreamVisibility; onVisibility: (v: DreamVisibility) => void;
}) {
  const archetype  = deriveArchetype(category, emotions);
  const insight    = deriveInsight(category, emotions, symbols);
  const topEmotion = EMOTIONS.find(e => e.key === emotions[0]);
  const topSymbol  = SYMBOLS.find(s => s.key === symbols[0])?.name ?? '—';
  const energyName = ENERGY.find(e => e.level === energyLevel)?.name ?? '—';
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fadeIn, { toValue: 1, duration: 600, delay: 100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [fadeIn]);

  return (
    <View style={pg.fill}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 20 }}>
        <Text style={pg.label}>RÜYA ÖN İZLEME</Text>
        <Animated.View style={{ opacity: fadeIn, gap: 18, marginTop: 8 }}>
          <Text style={{ fontSize: 27, fontWeight: '900', color: 'rgba(255,255,255,0.95)', lineHeight: 34, letterSpacing: -0.5 }}>{title || 'Gece Rüyası'}</Text>
          <View style={prvS.summaryCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Ionicons name="sparkles-outline" size={11} color="rgba(167,139,250,0.60)" />
              <Text style={prvS.summaryLabel}>AI ANALİZİ</Text>
            </View>
            <Text style={prvS.summaryText}>"{summary}"</Text>
          </View>
          {/* Archetype breathing node */}
          <ArchetypeNode archetype={archetype} topEmotion={topEmotion} energyName={energyName} topSymbol={topSymbol} />
          {symbols.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 8.5, fontWeight: '900', letterSpacing: 2, color: 'rgba(255,255,255,0.20)' }}>SEMBOLLER</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {symbols.map(k => { const sym = SYMBOLS.find(s => s.key === k); return sym ? <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: 'rgba(108,99,255,0.10)', borderWidth: 1, borderColor: 'rgba(108,99,255,0.30)' }}><Text style={{ fontSize: 14 }}>{sym.emoji}</Text><Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.65)' }}>{sym.name}</Text></View> : null; })}
              </View>
            </View>
          )}
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.42)', lineHeight: 23, fontStyle: 'italic', borderLeftWidth: 2, borderLeftColor: 'rgba(167,139,250,0.28)', paddingLeft: 14 }}>"{insight}"</Text>
          <View style={prvS.visWrap}>
            <Text style={prvS.visLabel}>KİME GÖRÜNSÜN?</Text>
            <View style={prvS.visRow}>
              {VISIBILITIES.map(v => { const isSel = visibility === v.value; return <Pressable key={v.value} onPress={() => onVisibility(v.value)} style={[prvS.visChip, isSel && prvS.visChipSel]}><Ionicons name={v.icon} size={11} color={isSel ? '#A78BFA' : 'rgba(255,255,255,0.28)'} /><Text style={[prvS.visText, isSel && prvS.visTextSel]}>{v.label}</Text></Pressable>; })}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
const prvS = StyleSheet.create({
  summaryCard:  { gap: 10 },
  summaryLabel: { fontSize: 8.5, fontWeight: '900', letterSpacing: 2, color: 'rgba(167,139,250,0.50)' },
  summaryText:  { fontSize: 14, color: 'rgba(255,255,255,0.58)', lineHeight: 22, fontStyle: 'italic' },
  visWrap:      { gap: 10 },
  visLabel:     { fontSize: 8.5, fontWeight: '900', letterSpacing: 2, color: 'rgba(255,255,255,0.20)' },
  visRow:       { flexDirection: 'row', gap: 10 },
  visChip:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' },
  visChipSel:   { borderColor: 'rgba(167,139,250,0.45)', backgroundColor: 'rgba(167,139,250,0.10)' },
  visText:      { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.28)' },
  visTextSel:   { color: '#A78BFA' },
});

// ── Step 6: Collective Result ─────────────────────────────────────────────────

function ResonanceSentence({ text, delay }: { text: string; delay: number }) {
  const fadeA  = useRef(new Animated.Value(0)).current;
  const slideA = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeA,  { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(slideA, { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, [delay, fadeA, slideA]);

  return (
    <Animated.View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, opacity: fadeA, transform: [{ translateY: slideA }] }}>
      <Text style={{ fontSize: 9, color: '#A78BFA', marginTop: 7, opacity: 0.65 }}>✦</Text>
      <Text style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.75)', lineHeight: 24, flex: 1, fontStyle: 'italic' }}>{text}</Text>
    </Animated.View>
  );
}

function StepFinal({ phase, error, onRetry, createdId, resonance, emotions, onGoToDream, onExplore }: {
  phase: 'sending' | 'done' | 'error'; error: string | null; onRetry: () => void;
  createdId: string | null; resonance: { similarDreams: number; sameEmotion: number; score: number };
  emotions: string[]; onGoToDream: () => void; onExplore: () => void;
}) {
  const orbAnim    = useRef(new Animated.Value(0)).current;
  const sendFade   = useRef(new Animated.Value(1)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const lp = Animated.loop(Animated.sequence([
      Animated.timing(orbAnim, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(orbAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    lp.start(); return () => lp.stop();
  }, [orbAnim]);

  useEffect(() => {
    if (phase === 'done') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.sequence([
        Animated.timing(sendFade,   { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(resultAnim, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [phase, sendFade, resultAnim]);

  const orbScale = orbAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.10] });
  const orbOp    = orbAnim.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.50] });
  const resScale = resultAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
  const resonanceSentences = [
    `${resonance.similarDreams} kişi bu gece benzer imgeler gördü.`,
    `${resonance.sameEmotion} bilinç aynı duyguyu taşıdı.`,
    `${2 + (resonance.score % 9)} yeni rüya rezonansı tespit edildi.`,
  ];

  return (
    <View style={[pg.fill, finS.page]}>
      <RitualParticles active={phase !== 'error'} />

      <View style={finS.orbWrap} pointerEvents="none">
        <Animated.View style={[finS.orbOuter, { opacity: orbOp, transform: [{ scale: orbScale }] }]} />
        <View style={finS.orbCore}><View style={finS.orbInner} /></View>
      </View>

      {phase !== 'done' && phase !== 'error' && (
        <Animated.View style={[finS.sendWrap, { opacity: sendFade }]}>
          <Text style={finS.sendText}>Rüya kolektif alana giriyor…</Text>
          <View style={finS.sendDots}>{[0, 1, 2].map(i => <View key={i} style={finS.sendDot} />)}</View>
        </Animated.View>
      )}

      {phase === 'error' && (
        <View style={finS.errorWrap}>
          <Text style={finS.errorText}>{error ?? 'Bir hata oluştu.'}</Text>
          <Pressable onPress={onRetry} style={finS.retryBtn}>
            <Text style={finS.retryText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      )}

      {phase === 'done' && (
        <Animated.View style={[finS.resultWrap, { opacity: resultAnim, transform: [{ scale: resScale }] }]}>
          <Text style={finS.resultEyebrow}>✦  KOLEKTİF ALANA KATILDIN  ✦</Text>
          <Text style={finS.resultTitle}>Rüyan{'\n'}yayıldı.</Text>

          {/* Resonance sentences */}
          <View style={{ width: '100%', gap: 18, paddingVertical: 8 }}>
            {resonanceSentences.map((txt, i) => (
              <ResonanceSentence key={i} text={txt} delay={300 + i * 550} />
            ))}
          </View>

          <View style={finS.btnStack}>
            <Pressable onPress={onGoToDream} style={({ pressed }) => [finS.btnPrimary, { opacity: pressed ? 0.80 : 1 }]}>
              <Text style={finS.btnPrimaryText}>Rüyama Git</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </Pressable>
            <Pressable onPress={onExplore} style={({ pressed }) => [finS.btnSecondary, { opacity: pressed ? 0.70 : 1 }]}>
              <Text style={finS.btnSecondaryText}>Benzer Bilinçleri Keşfet</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
const finS = StyleSheet.create({
  page:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  orbWrap:       { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', position: 'absolute', top: H * 0.10 },
  orbOuter:      { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: '#6C63FF' },
  orbCore:       { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(108,99,255,0.35)', borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.60)', alignItems: 'center', justifyContent: 'center' },
  orbInner:      { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(196,181,253,0.80)' },
  sendWrap:      { alignItems: 'center', gap: 18, marginTop: H * 0.06 },
  sendText:      { fontSize: 15.5, color: 'rgba(255,255,255,0.50)', fontStyle: 'italic', letterSpacing: 0.2, textAlign: 'center' },
  sendDots:      { flexDirection: 'row', gap: 7 },
  sendDot:       { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(167,139,250,0.35)' },
  errorWrap:     { alignItems: 'center', gap: 20, paddingHorizontal: 24, marginTop: H * 0.06 },
  errorText:     { fontSize: 14, color: 'rgba(255,100,100,0.80)', textAlign: 'center', lineHeight: 22 },
  retryBtn:      { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(167,139,250,0.40)', backgroundColor: 'rgba(167,139,250,0.10)' },
  retryText:     { fontSize: 14, fontWeight: '800', color: '#A78BFA' },
  resultWrap:    { width: '100%', alignItems: 'center', gap: 22, marginTop: H * 0.05 },
  resultEyebrow: { fontSize: 8.5, fontWeight: '900', letterSpacing: 1.8, color: 'rgba(167,139,250,0.50)', textAlign: 'center' },
  resultTitle:   { fontSize: 36, fontWeight: '900', color: 'rgba(255,255,255,0.95)', letterSpacing: -1, textAlign: 'center', lineHeight: 42 },
  btnStack:      { width: '100%', gap: 12 },
  btnPrimary:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17, borderRadius: 18, backgroundColor: '#6C63FF', shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.40, shadowRadius: 12 },
  btnPrimaryText:{ fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  btnSecondary:  { paddingVertical: 14, alignItems: 'center' },
  btnSecondaryText: { fontSize: 14, color: 'rgba(167,139,250,0.65)', fontWeight: '700' },
});

// ── Page shared styles ────────────────────────────────────────────────────────

const pg = StyleSheet.create({
  fill:  { flex: 1 },
  label: { fontSize: 8.5, fontWeight: '900', letterSpacing: 2.2, color: 'rgba(167,139,250,0.40)', marginBottom: 8 },
  title: { fontSize: 29, fontWeight: '900', color: 'rgba(255,255,255,0.94)', lineHeight: 37, letterSpacing: -0.5 },
});

// ── NavBar ────────────────────────────────────────────────────────────────────

function NavBar({ step, onBack, onClose }: { step: number; onBack: () => void; onClose: () => void }) {
  if (step >= 6) return null;
  return (
    <View style={navS.bar}>
      {step > 0 ? (
        <Pressable onPress={onBack} style={navS.btn} hitSlop={14}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.45)" />
        </Pressable>
      ) : <View style={navS.btn} />}
      <View style={navS.dots}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <View key={i} style={[navS.dot, i === step && navS.dotActive, i < step && navS.dotPast]} />
        ))}
      </View>
      <Pressable onPress={onClose} style={navS.btn} hitSlop={14}>
        <Ionicons name="close" size={18} color="rgba(255,255,255,0.28)" />
      </Pressable>
    </View>
  );
}
const navS = StyleSheet.create({
  bar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  btn:      { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  dots:     { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot:      { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' },
  dotActive:{ width: 18, backgroundColor: '#6C63FF' },
  dotPast:  { backgroundColor: 'rgba(108,99,255,0.42)' },
});

// ── Continue button ───────────────────────────────────────────────────────────

function ContinueBtn({ canGo, label, onPress, showSkip, onSkip }: {
  canGo: boolean; label: string; onPress: () => void; showSkip?: boolean; onSkip?: () => void;
}) {
  const fade = useRef(new Animated.Value(canGo ? 1 : 0.35)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: canGo ? 1 : 0.35, duration: 280, useNativeDriver: true }).start();
  }, [canGo, fade]);
  return (
    <View style={cbtS.wrap}>
      <Pressable onPress={canGo ? onPress : undefined}
        style={({ pressed }) => [cbtS.btn, { opacity: pressed && canGo ? 0.78 : 1 }]}>
        <Animated.Text style={[cbtS.label, { opacity: fade }]}>{label}</Animated.Text>
        <Animated.Text style={[cbtS.arrow, { opacity: fade }]}>→</Animated.Text>
      </Pressable>
      {showSkip && onSkip && (
        <Pressable onPress={onSkip} style={cbtS.skip}><Text style={cbtS.skipText}>Atla</Text></Pressable>
      )}
    </View>
  );
}
const cbtS = StyleSheet.create({
  wrap:     { paddingHorizontal: 24, gap: 12 },
  btn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17, borderRadius: 18, backgroundColor: '#6C63FF', shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.38, shadowRadius: 12 },
  label:    { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  arrow:    { fontSize: 16, color: 'rgba(255,255,255,0.75)' },
  skip:     { alignItems: 'center', paddingVertical: 5 },
  skipText: { fontSize: 13, color: 'rgba(255,255,255,0.26)', fontWeight: '600' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function AddDreamScreen() {
  const router      = useRouter();
  const navigation  = useNavigation();
  const queryClient = useQueryClient();
  const insets      = useSafeAreaInsets();
  const inputRef    = useRef<TextInput>(null);

  useFocusEffect(useCallback(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => { parent?.setOptions({ tabBarStyle: undefined }); };
  }, [navigation]));

  const [step, setStep]       = useState(0);
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [inputMethod,       setInputMethod]       = useState<InputMethod>('voice');
  const [content,           setContent]           = useState('');
  const [voiceUri,          setVoiceUri]          = useState<string | null>(null);
  const [imageUri,          setImageUri]          = useState<string | null>(null);
  const [isRecording,       setIsRecording]       = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [waveformBars,      setWaveformBars]      = useState<number[]>(Array(30).fill(0.05));
  const [isTranscribing,    setIsTranscribing]    = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const [symbols,          setSymbols]          = useState<string[]>([]);
  const [emotions,         setEmotions]         = useState<string[]>([]);
  const [energyLevel,      setEnergyLevel]      = useState(2);
  const [visibility,       setVisibility]       = useState<DreamVisibility>('public');
  const [dreamCategory,    setDreamCategory]    = useState<DreamCategory>('normal');
  const [generatedTitle,   setGeneratedTitle]   = useState('');
  const [generatedSummary, setGeneratedSummary] = useState('');

  const [ritualPhase, setRitualPhase] = useState<'sending' | 'done' | 'error'>('sending');
  const [ritualError, setRitualError] = useState<string | null>(null);
  const [createdId,   setCreatedId]   = useState<string | null>(null);

  const [resonance] = useState(() => {
    const t = Date.now();
    return { similarDreams: 7 + (t % 17), sameEmotion: 2 + (t % 7), score: 64 + (t % 31) };
  });

  // Ambient color follows dominant emotion
  const ambientColor = useMemo(() => {
    const top = emotions[0] ? EMOTIONS.find(e => e.key === emotions[0]) : null;
    return top?.color ?? '#6C63FF';
  }, [emotions]);

  const goTo = useCallback((target: number) => {
    const dir = target > step ? -16 : 16;
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: dir, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(() => {
      setStep(target); slideAnim.setValue(-dir);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, fadeAnim, slideAnim]);

  useEffect(() => {
    if (step === 0 && inputMethod === 'write') {
      const t = setTimeout(() => inputRef.current?.focus(), 340);
      return () => clearTimeout(t);
    }
  }, [step, inputMethod]);

  const toggleEmotion = useCallback((k: string) => {
    setEmotions(prev => {
      if (prev.includes(k)) return prev.filter(x => x !== k);
      if (prev.length >= 4) return prev;
      return [...prev, k];
    });
  }, []);

  const toggleSymbol = useCallback((k: string) => {
    setSymbols(prev => {
      if (prev.includes(k)) return prev.filter(x => x !== k);
      if (prev.length >= 5) return prev;
      return [...prev, k];
    });
  }, []);

  const onAnalysisComplete = useCallback(() => {
    const sug     = analyzeContent(content);
    const title   = generateTitle(sug.emotions);
    const summary = generateSummary(sug.emotions, sug.symbols);
    const cat     = deriveCategory(content, sug.emotions);
    setEmotions(sug.emotions);
    setSymbols(sug.symbols);
    setGeneratedTitle(title);
    setGeneratedSummary(summary);
    setDreamCategory(cat);
    setTimeout(() => goTo(2), 400);
  }, [content, goTo]);

  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (s) => {
          if (s.isRecording) {
            setRecordingDuration(Math.floor((s.durationMillis ?? 0) / 1000));
            const level = normalizeMetering(s.metering);
            setWaveformBars(prev => [...prev.slice(1), level]);
          }
        },
        100
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (e) { console.warn('Recording failed:', e); }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    setIsTranscribing(true);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (uri) setVoiceUri(uri);
      setTimeout(() => {
        setIsTranscribing(false);
        setContent(prev => prev.trim() ? prev : '[Sesli rüya kaydedildi]');
      }, 1800);
    } catch (e) { console.warn('Stop failed:', e); setIsTranscribing(false); }
  }, []);

  const pickImage = useCallback(async (useCamera: boolean) => {
    try {
      const permFn   = useCamera ? ImagePicker.requestCameraPermissionsAsync : ImagePicker.requestMediaLibraryPermissionsAsync;
      const launchFn = useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const { status } = await permFn();
      if (status !== 'granted') return;
      const result = await launchFn({ allowsEditing: true, quality: 0.8, mediaTypes: 'images' });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setTimeout(() => {
          const t = Date.now();
          setSymbols(['sea', 'moon', 'bird', 'door', 'fire'].slice(0, 2 + (t % 3)));
          setContent(prev => prev.trim() ? prev : '[Görsel rüya]');
        }, 2000);
      }
    } catch (e) { console.warn('Image pick failed:', e); }
  }, []);

  const pickFromGallery = useCallback(() => pickImage(false), [pickImage]);
  const pickFromCamera  = useCallback(() => pickImage(true),  [pickImage]);

  const { mutate, isPending } = useMutation({
    mutationFn: (dto: CreateDreamDto) => createDream(dto),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['dreams', 'me'] });
      void queryClient.invalidateQueries({ queryKey: ['dreams', 'public'] });
      void queryClient.invalidateQueries({ queryKey: ['dreams', 'my-world'] });
      setCreatedId(created.id); setRitualPhase('done');
    },
    onError: (err: unknown) => {
      const msg =
        err !== null && typeof err === 'object' && 'response' in err &&
        (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
          ? String((err as { response: { data: { message: unknown } } }).response.data.message)
          : 'Bağlantı hatası oluştu.';
      setRitualError(msg); setRitualPhase('error');
    },
  });

  const submit = useCallback(() => {
    const dreamContent = content.trim() || (voiceUri ? '[Sesli rüya]' : imageUri ? '[Görsel rüya]' : '');
    if (!dreamContent || isPending) return;
    mutate({ content: dreamContent, category: dreamCategory, visibility, tags: buildTags(symbols, emotions) });
  }, [content, voiceUri, imageUri, dreamCategory, visibility, symbols, emotions, isPending, mutate]);

  const enterFinal = useCallback(() => { goTo(6); submit(); }, [goTo, submit]);
  const retryFinal = useCallback(() => { setRitualPhase('sending'); setRitualError(null); submit(); }, [submit]);
  const goToDream  = useCallback(() => { if (createdId) router.replace(`/dream-decode/${createdId}`); }, [createdId, router]);
  const goExplore  = useCallback(() => router.replace('/(tabs)/matches'), [router]);

  const hasInput    = content.trim().length >= 5 || voiceUri !== null || imageUri !== null;
  const canContinue = step === 0 ? hasInput : true;
  const btnLabel    = step === 5 ? 'Rüyayı Yayınla  ✦' : 'Devam';
  const showSkip    = step === 2 || step === 3;
  const showBtn     = step !== 1 && step !== 4 && step !== 6;

  const handleContinue = () => {
    if (step === 5) { enterFinal(); return; }
    goTo(step + 1);
  };

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <FloatingStars />
      <AmbientBg color={ambientColor} />
      <NavBar step={step} onBack={() => goTo(step - 1)} onClose={() => router.back()} />

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {step === 0 && (
          <StepTellDream
            inputMethod={inputMethod} onMethodChange={setInputMethod}
            content={content} onContentChange={setContent}
            waveformBars={waveformBars} isRecording={isRecording} recordingDuration={recordingDuration}
            isTranscribing={isTranscribing} voiceUri={voiceUri}
            onStartRecord={startRecording} onStopRecord={stopRecording}
            imageUri={imageUri} onPickGallery={pickFromGallery} onPickCamera={pickFromCamera}
            inputRef={inputRef}
          />
        )}
        {step === 1 && <StepAIAnalysis onComplete={onAnalysisComplete} />}
        {step === 2 && <StepConfirmEmotions selected={emotions} onToggle={toggleEmotion} />}
        {step === 3 && <StepConfirmSymbols  selected={symbols}  onToggle={toggleSymbol}  />}
        {step === 4 && (
          <StepEnergy level={energyLevel} onSelect={l => { setEnergyLevel(l); setTimeout(() => goTo(5), 300); }} />
        )}
        {step === 5 && (
          <StepDreamPreview
            title={generatedTitle} summary={generatedSummary} emotions={emotions} symbols={symbols}
            category={dreamCategory} energyLevel={energyLevel} visibility={visibility} onVisibility={setVisibility}
          />
        )}
        {step === 6 && (
          <StepFinal
            phase={ritualPhase} error={ritualError} onRetry={retryFinal}
            createdId={createdId} resonance={resonance} emotions={emotions}
            onGoToDream={goToDream} onExplore={goExplore}
          />
        )}
      </Animated.View>

      {showBtn && (
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <ContinueBtn canGo={canContinue} label={btnLabel} onPress={handleContinue} showSkip={showSkip} onSkip={() => goTo(step + 1)} />
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#04030F' },
  footer: { paddingTop: 12 },
});
