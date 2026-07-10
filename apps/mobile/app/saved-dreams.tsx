import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DreamCard from '@/components/DreamCard';
import DreamCardSkeleton from '@/components/DreamCardSkeleton';
import { Colors } from '@/constants/colors';
import { useSavedDreams, SAVED_DREAMS_KEY } from '@/hooks/useSavedDreams';
import type { Dream } from '@/types/dream.types';
import { useCallback, useEffect } from 'react';

export default function SavedDreamsScreen() {
  const router = useRouter();

  const {
    dreams,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    isRefetching,
    refetch,
    loadMore,
  } = useSavedDreams();

  useEffect(() => {
    if (isError && __DEV__) {
      console.error('[SavedDreams] fetch failed:', error);
    }
  }, [isError, error]);

  const renderItem = useCallback(
    ({ item }: { item: Dream }) => (
      <DreamCard
        dream={item}
        onPress={() => { router.push(`/dream/${item.id}`); }}
        feedQueryKey={[...SAVED_DREAMS_KEY]}
      />
    ),
    [router],
  );

  const keyExtractor = useCallback((item: Dream) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => { router.back(); }}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Kaydedilen Rüyalar</Text>
        <View style={styles.backBtn} />
      </View>

      {isError && !isLoading && dreams.length === 0 && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={20} color="#F87171" />
          <Text style={styles.errorText}>Rüyalar yüklenemedi</Text>
          <Pressable onPress={() => { void refetch(); }} style={styles.retryBtn}>
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={dreams}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={
          isLoading || (isRefetching && dreams.length === 0)
            ? <View style={{ paddingTop: 8 }}><DreamCardSkeleton count={3} /></View>
            : null
        }
        ListEmptyComponent={
          !isLoading && !isRefetching && !isError
            ? (
              <View style={styles.empty}>
                <Ionicons name="bookmark-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Kayıtlı rüya yok</Text>
                <Text style={styles.emptySub}>
                  Bir rüyayı kaydetmek için yer imi simgesine dokun.
                </Text>
              </View>
            )
            : null
        }
        ListFooterComponent={
          isFetchingNextPage
            ? <ActivityIndicator size="small" color={Colors.primary} style={styles.footerLoader} />
            : null
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={() => { void refetch(); }}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  listContent: { paddingBottom: 40 },
  footerLoader:{ paddingVertical: 20 },
  empty:       { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  emptyTitle:  { fontSize: 16, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center' },
  emptySub:    { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  errorBox:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: 'rgba(248,113,113,0.08)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.20)' },
  errorText:   { flex: 1, fontSize: 13, color: '#F87171', fontWeight: '600' },
  retryBtn:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(248,113,113,0.15)' },
  retryText:   { fontSize: 12, color: '#F87171', fontWeight: '700' },
});
