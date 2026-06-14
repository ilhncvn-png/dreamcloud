import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Screen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.text}>explore</Text>
        <Text style={styles.sub}>Yakında gelecek</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F23' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  text: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
  sub: { color: '#9B9BB4', fontSize: 14 },
});
