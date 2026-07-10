import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

interface State {
  hasError: boolean;
  errorId: string | null;
}

interface Props {
  children: React.ReactNode;
}

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorId: null };
  }

  static getDerivedStateFromError(_error: unknown): State {
    const id = Date.now().toString(36).toUpperCase();
    return { hasError: true, errorId: id };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error.message, info.componentStack);
    }
  }

  handleReload() {
    if (typeof window !== 'undefined') {
      (window as unknown as { location: { reload: () => void } }).location.reload();
    }
  }

  handleClearCache() {
    const reload = () => {
      (window as unknown as { location: { reload: () => void } }).location.reload();
    };
    if (typeof window !== 'undefined' && 'caches' in window) {
      void caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(reload);
    } else {
      reload();
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.root}>
        <View style={styles.glowRing} />

        <View style={styles.iconBox}>
          <Text style={styles.iconText}>⚠</Text>
        </View>

        <Text style={[styles.codeLabel, { fontFamily: MONO }]}>
          {`ERR-${this.state.errorId ?? 'UNKNOWN'}`}
        </Text>

        <Text style={styles.title}>Bir şeyler ters gitti</Text>
        <Text style={styles.body}>
          DreamCloud beklenmedik bir hatayla karşılaştı.{'\n'}
          Sayfayı yenilemeyi deneyin.
        </Text>

        <View style={styles.divider} />

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={() => {
            this.handleReload();
          }}
          accessibilityRole="button"
        >
          <Text style={[styles.primaryBtnText, { fontFamily: MONO }]}>YENİLE</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
          onPress={() => {
            this.handleClearCache();
          }}
          accessibilityRole="button"
        >
          <Text style={styles.ghostBtnText}>Önbelleği Temizle ve Yenile</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#060614',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  glowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,74,94,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,74,94,0.15)',
    shadowColor: '#FF4A5E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 0,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,74,94,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,74,94,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 32,
    color: 'rgba(255,74,94,0.9)',
  },
  codeLabel: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: 'rgba(255,74,94,0.5)',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: 'rgba(232,232,255,0.92)',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 13,
    color: 'rgba(232,232,255,0.38)',
    textAlign: 'center',
    lineHeight: 21,
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: 'rgba(255,74,94,0.2)',
    marginVertical: 4,
  },
  primaryBtn: {
    backgroundColor: 'rgba(255,74,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,74,94,0.35)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    shadowColor: '#FF4A5E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(255,100,120,0.9)',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ghostBtn: {
    paddingVertical: 10,
  },
  ghostBtnText: {
    fontSize: 13,
    color: 'rgba(232,232,255,0.28)',
  },
  pressed: { opacity: 0.65 },
});
