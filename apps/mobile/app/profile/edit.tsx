import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { getMyProfile, updateMyProfile, uploadAvatar } from '@/api/users.api';
import Avatar from '@/components/Avatar';
import { Colors } from '@/constants/colors';
import type { DreamPreferences, UpdateProfileDto } from '@/types/user.types';

// ── Preset option lists ───────────────────────────────────────────────────────

const ARCHETYPES = [
  'Kahraman', 'Gölge', 'Bilge', 'Yaratıcı', 'Kaşif',
  'Bakıcı', 'Asi', 'Büyücü', 'Çocuk', 'Trickster',
];
const MOODS = [
  'Macera', 'Huzur', 'Kaos', 'Melankoli', 'Neşe',
  'Korku', 'Gizemli', 'Nostaljik', 'Karmaşık', 'Nötr',
];
const ENERGIES = [
  'Ateş', 'Su', 'Toprak', 'Hava', 'Işık', 'Gölge', 'Yıldız', 'Ay',
];
const FREQUENCIES = [
  'Her gece', 'Haftada birkaç kez', 'Haftada bir', 'Ayda birkaç kez', 'Nadiren',
];
const LUCID_LEVELS = [
  'Hiç yaşamadım', 'Nadiren', 'Ara sıra', 'Sık sık', 'Her gece neredeyse',
];
const LANGUAGES = ['Türkçe', 'English', 'Español', 'Français', 'Deutsch', 'العربية'];
const TIMEZONES = [
  'Europe/Istanbul', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Tokyo',
  'UTC',
];

// ── Shared UI primitives ──────────────────────────────────────────────────────

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={s.sectionHeader}>
      <Ionicons name={icon as any} size={14} color={Colors.primary} />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function FieldLabel({ label, hint, error, counter }: {
  label: string; hint?: string; error?: string | undefined; counter?: string;
}) {
  return (
    <View style={s.fieldLabelRow}>
      <Text style={s.fieldLabel}>{label}</Text>
      {counter && <Text style={s.fieldCounter}>{counter}</Text>}
      {error  && <Text style={s.fieldError}>{error}</Text>}
      {!error && hint && <Text style={s.fieldHint}>{hint}</Text>}
    </View>
  );
}

// ── Option picker modal ───────────────────────────────────────────────────────

function OptionPicker({
  visible, title, options, selected, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <Pressable style={s.modalSheet} onPress={() => {}}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={item => item}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = item === selected;
              return (
                <Pressable
                  style={({ pressed }) => [s.modalOption, isSelected && s.modalOptionSelected, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => { onSelect(item); onClose(); }}
                >
                  <Text style={[s.modalOptionText, isSelected && s.modalOptionTextSelected]}>{item}</Text>
                  {isSelected && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: Colors.border }} />}
          />
          <Pressable style={s.modalCancel} onPress={onClose}>
            <Text style={s.modalCancelText}>İptal</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── SelectField ───────────────────────────────────────────────────────────────

function SelectField({
  label, hint, value, placeholder, options, onSelect,
}: {
  label: string; hint?: string; value: string; placeholder: string;
  options: string[]; onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.field}>
      <FieldLabel label={label} {...(hint !== undefined ? { hint } : {})} />
      <Pressable
        style={({ pressed }) => [s.selectBtn, { opacity: pressed ? 0.85 : 1 }]}
        onPress={() => setOpen(true)}
      >
        <Text style={value ? s.selectValue : s.selectPlaceholder} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={15} color={Colors.textMuted} />
      </Pressable>
      <OptionPicker
        visible={open}
        title={label}
        options={options}
        selected={value}
        onSelect={onSelect}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

// ── TagsField ─────────────────────────────────────────────────────────────────

function TagsField({
  label, hint, tags, maxTags, onAdd, onRemove,
}: {
  label: string; hint?: string; tags: string[]; maxTags: number;
  onAdd: (tag: string) => void; onRemove: (tag: string) => void;
}) {
  const [input, setInput] = useState('');

  function handleAdd() {
    const trimmed = input.trim().toLowerCase().replace(/\s+/g, '-');
    if (!trimmed || tags.includes(trimmed) || tags.length >= maxTags) return;
    onAdd(trimmed);
    setInput('');
  }

  return (
    <View style={s.field}>
      <FieldLabel label={label} {...(hint !== undefined ? { hint } : {})} counter={`${tags.length}/${maxTags}`} />
      <View style={s.tagsWrap}>
        {tags.map(tag => (
          <View key={tag} style={s.tag}>
            <Text style={s.tagText}>{tag}</Text>
            <Pressable onPress={() => onRemove(tag)} hitSlop={6}>
              <Ionicons name="close" size={11} color={Colors.primary} />
            </Pressable>
          </View>
        ))}
      </View>
      {tags.length < maxTags && (
        <View style={s.tagInput}>
          <TextInput
            style={s.tagInputText}
            placeholder={`Ekle ve Enter'a bas`}
            placeholderTextColor={Colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable onPress={handleAdd} hitSlop={8} style={s.tagAddBtn}>
            <Ionicons name="add" size={18} color={Colors.primary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── ToggleField ───────────────────────────────────────────────────────────────

function ToggleField({
  label, hint, value, onChange,
}: {
  label: string; hint?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={s.toggleRow}>
      <View style={s.toggleLabels}>
        <Text style={s.toggleLabel}>{label}</Text>
        {hint && <Text style={s.toggleHint}>{hint}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.border, true: `${Colors.primary}60` }}
        thumbColor={value ? Colors.primary : Colors.textMuted}
        ios_backgroundColor={Colors.border}
      />
    </View>
  );
}

// ── Photo picker section ──────────────────────────────────────────────────────

function PhotoSection({
  currentUrl, localUri, mimeType, displayName,
  onPickImage, onRemoveLocal, onUrlChange,
}: {
  currentUrl: string;
  localUri: string | null;
  mimeType: string | null;
  displayName: string;
  onPickImage: (uri: string, mime: string) => void;
  onRemoveLocal: () => void;
  onUrlChange: (url: string) => void;
}) {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const previewUri = localUri ?? (currentUrl || null);

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galeriye erişim izni verilmedi. Ayarlardan izin ver.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mime = asset.mimeType ?? 'image/jpeg';
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mime)) {
        Alert.alert('Desteklenmiyor', 'Lütfen JPEG, PNG veya WebP formatında bir fotoğraf seç.');
        return;
      }
      const fileSize = asset.fileSize ?? 0;
      if (fileSize > 5 * 1024 * 1024) {
        Alert.alert('Dosya Çok Büyük', 'Fotoğraf 5 MB\'dan küçük olmalı.');
        return;
      }
      onPickImage(asset.uri, mime);
    }
  }

  return (
    <View style={s.photoSection}>
      {/* Avatar preview */}
      <View style={s.avatarWrap}>
        {previewUri ? (
          <Image
            source={{ uri: previewUri }}
            style={s.avatarPreview}
            resizeMode="cover"
          />
        ) : (
          <View style={[s.avatarPreview, s.avatarPlaceholder]}>
            <Text style={s.avatarInitial}>
              {((displayName.trim()[0]) ?? '?').toUpperCase()}
            </Text>
          </View>
        )}
        {localUri && (
          <View style={s.avatarPendingBadge}>
            <Ionicons name="cloud-upload-outline" size={10} color="#fff" />
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={s.photoActions}>
        <Pressable
          style={({ pressed }) => [s.photoBtn, s.photoBtnPrimary, { opacity: pressed ? 0.8 : 1 }]}
          onPress={pickFromGallery}
        >
          <Ionicons name="image-outline" size={15} color="#fff" />
          <Text style={s.photoBtnPrimaryText}>Galeriden Seç</Text>
        </Pressable>

        {localUri && (
          <Pressable
            style={({ pressed }) => [s.photoBtn, s.photoBtnSecondary, { opacity: pressed ? 0.8 : 1 }]}
            onPress={onRemoveLocal}
          >
            <Ionicons name="close-outline" size={15} color={Colors.error} />
            <Text style={[s.photoBtnSecondaryText, { color: Colors.error }]}>Kaldır</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [s.photoBtn, s.photoBtnSecondary, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => setShowUrlInput(v => !v)}
        >
          <Ionicons name="link-outline" size={15} color={Colors.textMuted} />
          <Text style={s.photoBtnSecondaryText}>URL</Text>
        </Pressable>
      </View>

      {showUrlInput && (
        <View style={s.urlInputWrap}>
          <TextInput
            style={s.urlInput}
            placeholder="https://example.com/photo.jpg"
            placeholderTextColor={Colors.textMuted}
            value={currentUrl}
            onChangeText={onUrlChange}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>
      )}

      <Text style={s.photoHint}>
        {localUri
          ? '⬆ Fotoğraf kaydedildiğinde yüklenecek'
          : 'JPEG, PNG veya WebP · Maks 5 MB'}
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ProfileEditScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: getMyProfile,
    staleTime: 0,
  });

  // ── Basic fields ──
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername]       = useState('');
  const [bio, setBio]                 = useState('');
  const [avatarUrl, setAvatarUrl]     = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [isPublic, setIsPublic]       = useState(true);

  // ── Local image state ──
  const [localImageUri, setLocalImageUri]   = useState<string | null>(null);
  const [localMimeType, setLocalMimeType]   = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // ── Dream Identity ──
  const [dreamArchetype, setDreamArchetype] = useState('');
  const [dreamMood, setDreamMood]           = useState('');
  const [dreamEnergy, setDreamEnergy]       = useState('');
  const [commonThemes, setCommonThemes]     = useState<string[]>([]);
  const [favoriteSymbol, setFavoriteSymbol] = useState('');
  const [dreamFrequency, setDreamFrequency] = useState('');
  const [lucidExperience, setLucidExperience] = useState('');

  // ── Privacy ──
  const [allowDreamMatching, setAllowDreamMatching]       = useState(true);
  const [allowDreamConnections, setAllowDreamConnections] = useState(true);
  const [allowSeenInDreams, setAllowSeenInDreams]         = useState(true);
  const [anonymousDiscovery, setAnonymousDiscovery]       = useState(false);

  // ── Social ──
  const [websiteUrl, setWebsiteUrl]             = useState('');
  const [interests, setInterests]               = useState<string[]>([]);
  const [dreamTags, setDreamTags]               = useState<string[]>([]);
  const [personalStatement, setPersonalStatement] = useState('');

  // ── Locale ──
  const [language, setLanguage] = useState('Türkçe');
  const [timezone, setTimezone] = useState('Europe/Istanbul');

  const [errors, setErrors]   = useState<Record<string, string | undefined>>({});
  const [saved, setSaved]     = useState(false);

  // Populate from profile data
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? '');
    setUsername(profile.username ?? '');
    setBio(profile.bio ?? '');
    setAvatarUrl(profile.avatarUrl ?? '');
    setLocationCity(profile.locationCity ?? '');
    setIsPublic(profile.isPublic ?? true);

    const prefs: DreamPreferences = profile.preferences ?? {};
    setDreamArchetype(prefs.dreamArchetype ?? '');
    setDreamMood(prefs.dreamMood ?? '');
    setDreamEnergy(prefs.dreamEnergy ?? '');
    setCommonThemes(prefs.commonThemes ?? []);
    setFavoriteSymbol(prefs.favoriteSymbol ?? '');
    setDreamFrequency(prefs.dreamFrequency ?? '');
    setLucidExperience(prefs.lucidExperience ?? '');
    setAllowDreamMatching(prefs.allowDreamMatching ?? true);
    setAllowDreamConnections(prefs.allowDreamConnections ?? true);
    setAllowSeenInDreams(prefs.allowSeenInDreams ?? true);
    setAnonymousDiscovery(prefs.anonymousDiscovery ?? false);
    setWebsiteUrl(prefs.websiteUrl ?? '');
    setInterests(prefs.interests ?? []);
    setDreamTags(prefs.dreamTags ?? []);
    setPersonalStatement(prefs.personalStatement ?? '');
    setLanguage(prefs.language ?? 'Türkçe');
    setTimezone(prefs.timezone ?? 'Europe/Istanbul');
  }, [profile]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: async (dto: UpdateProfileDto) => {
      // Upload image first if one was selected from gallery
      if (localImageUri && localMimeType) {
        setIsUploadingImage(true);
        try {
          const uploadedUrl = await uploadAvatar(localImageUri, localMimeType);
          if (__DEV__) console.log('[EditProfile] uploaded avatar URL:', uploadedUrl);
          dto.avatarUrl = uploadedUrl;
        } finally {
          setIsUploadingImage(false);
        }
      }
      return updateMyProfile(dto);
    },
    onSuccess: (updated) => {
      if (__DEV__) console.log('[EditProfile] onSuccess avatarUrl:', updated.avatarUrl);
      void qc.setQueryData(['my-profile'], updated);
      void qc.invalidateQueries({ queryKey: ['my-profile'] });
      void qc.invalidateQueries({ queryKey: ['dreams', 'me'] });
      setLocalImageUri(null);
      setLocalMimeType(null);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        router.back();
      }, 800);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Bir hata oluştu. Lütfen tekrar dene.';
      if (msg.toLowerCase().includes('username') || msg.includes('kullanıcı adı')) {
        setErrors(prev => ({ ...prev, username: 'Bu kullanıcı adı zaten alınmış.' }));
        scrollRef.current?.scrollTo({ y: 200, animated: true });
      } else {
        Alert.alert('Hata', msg);
      }
    },
  });

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (username.length > 0 && username.length < 3)
      errs.username = 'En az 3 karakter olmalı.';
    if (username.length > 30)
      errs.username = 'En fazla 30 karakter olabilir.';
    if (username.length > 0 && !/^[a-zA-Z0-9_]+$/.test(username))
      errs.username = 'Sadece harf, rakam ve _ kullanılabilir.';
    if (displayName.length > 60)
      errs.displayName = 'En fazla 60 karakter.';
    if (bio.length > 300)
      errs.bio = 'En fazla 300 karakter.';
    if (personalStatement.length > 160)
      errs.personalStatement = 'En fazla 160 karakter.';
    if (websiteUrl.length > 0 && !/^https?:\/\/.+/.test(websiteUrl))
      errs.websiteUrl = 'Geçerli bir URL gir (https://)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;

    const prefs: DreamPreferences = {
      ...(dreamArchetype   ? { dreamArchetype }   : {}),
      ...(dreamMood        ? { dreamMood }        : {}),
      ...(dreamEnergy      ? { dreamEnergy }      : {}),
      ...(commonThemes.length > 0 ? { commonThemes }   : {}),
      ...(favoriteSymbol   ? { favoriteSymbol }   : {}),
      ...(dreamFrequency   ? { dreamFrequency }   : {}),
      ...(lucidExperience  ? { lucidExperience }  : {}),
      allowDreamMatching,
      allowDreamConnections,
      allowSeenInDreams,
      anonymousDiscovery,
      ...(websiteUrl          ? { websiteUrl }          : {}),
      ...(interests.length > 0 ? { interests }          : {}),
      ...(dreamTags.length > 0  ? { dreamTags }         : {}),
      ...(personalStatement ? { personalStatement }  : {}),
      ...(language  ? { language }  : {}),
      ...(timezone  ? { timezone }  : {}),
    };

    const dto: UpdateProfileDto = {};
    if (displayName !== (profile?.displayName ?? '') && displayName) dto.displayName = displayName;
    if (username   !== (profile?.username ?? '')    && username)    dto.username   = username;
    if (bio        !== (profile?.bio ?? ''))                        dto.bio        = bio;
    if (!localImageUri && avatarUrl && avatarUrl !== (profile?.avatarUrl ?? '')) dto.avatarUrl = avatarUrl;
    if (locationCity && locationCity !== (profile?.locationCity ?? ''))          dto.locationCity = locationCity;
    if (isPublic !== (profile?.isPublic ?? true))                   dto.isPublic   = isPublic;
    dto.preferences = prefs;

    if (Object.keys(dto).length === 1 && dto.preferences && !localImageUri) {
      // Only preferences changed — still send
    }

    if (Object.keys(dto).length === 0 && !localImageUri) {
      router.back();
      return;
    }

    save(dto);
  }

  const previewName = displayName || username || profile?.username || '';
  const isBusy = isPending || isUploadingImage;

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* ── Sticky header ── */}
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.headerBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
          disabled={isBusy}
        >
          <Text style={s.headerBtnText}>İptal</Text>
        </Pressable>
        <Text style={s.headerTitle}>Profili Düzenle</Text>
        <Pressable
          style={({ pressed }) => [
            s.headerSaveBtn,
            (isBusy || saved) && s.headerSaveBtnDisabled,
            saved && { backgroundColor: Colors.success },
            { opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={handleSave}
          disabled={isBusy || saved}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : saved ? (
            <Ionicons name="checkmark" size={16} color="#fff" />
          ) : (
            <Text style={s.headerSaveBtnText}>Kaydet</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ══════════════════════════════════════════════════
               SECTION 1 — Profil Kimliği
          ══════════════════════════════════════════════════ */}
          <SectionHeader title="PROFİL KİMLİĞİ" icon="person-outline" />

          {/* Photo */}
          <PhotoSection
            currentUrl={avatarUrl}
            localUri={localImageUri}
            mimeType={localMimeType}
            displayName={previewName}
            onPickImage={(uri, mime) => {
              setLocalImageUri(uri);
              setLocalMimeType(mime);
            }}
            onRemoveLocal={() => {
              setLocalImageUri(null);
              setLocalMimeType(null);
            }}
            onUrlChange={setAvatarUrl}
          />

          <View style={s.fields}>
            {/* Display name */}
            <View style={s.field}>
              <FieldLabel
                label="İsim"
                counter={`${displayName.length}/60`}
                error={errors.displayName}
              />
              <TextInput
                style={[s.input, errors.displayName ? s.inputError : null]}
                placeholder="Adınız Soyadınız"
                placeholderTextColor={Colors.textMuted}
                value={displayName}
                onChangeText={v => { setDisplayName(v); setErrors(e => ({ ...e, displayName: undefined })); }}
                maxLength={60}
                autoCorrect={false}
              />
            </View>

            {/* Username */}
            <View style={s.field}>
              <FieldLabel
                label="Kullanıcı Adı"
                hint="Harf, rakam ve _ · 3-30 karakter"
                error={errors.username}
              />
              <View style={[s.inputRow, errors.username ? s.inputError : null]}>
                <Text style={s.inputPrefix}>@</Text>
                <TextInput
                  style={s.inputInner}
                  placeholder="kullanici_adi"
                  placeholderTextColor={Colors.textMuted}
                  value={username}
                  onChangeText={v => { setUsername(v.toLowerCase()); setErrors(e => ({ ...e, username: undefined })); }}
                  maxLength={30}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Bio */}
            <View style={s.field}>
              <FieldLabel
                label="Bio"
                counter={`${bio.length}/300`}
                error={errors.bio}
              />
              <TextInput
                style={[s.input, s.inputMultiline, errors.bio ? s.inputError : null]}
                placeholder="Kendinden bahset…"
                placeholderTextColor={Colors.textMuted}
                value={bio}
                onChangeText={v => { setBio(v); setErrors(e => ({ ...e, bio: undefined })); }}
                maxLength={300}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Location */}
            <View style={s.field}>
              <FieldLabel label="Şehir / Konum" hint="Maks 100 karakter" />
              <TextInput
                style={s.input}
                placeholder="İstanbul, Türkiye"
                placeholderTextColor={Colors.textMuted}
                value={locationCity}
                onChangeText={setLocationCity}
                maxLength={100}
                autoCorrect={false}
              />
            </View>

            {/* Language */}
            <SelectField
              label="Dil"
              value={language}
              placeholder="Dil seç"
              options={LANGUAGES}
              onSelect={setLanguage}
            />

            {/* Timezone */}
            <SelectField
              label="Saat Dilimi"
              value={timezone}
              placeholder="Saat dilimi seç"
              options={TIMEZONES}
              onSelect={setTimezone}
            />
          </View>

          <View style={s.divider} />

          {/* ══════════════════════════════════════════════════
               SECTION 2 — Rüya Kimliği
          ══════════════════════════════════════════════════ */}
          <SectionHeader title="RÜYA KİMLİĞİ" icon="moon-outline" />

          <View style={s.fields}>
            <SelectField
              label="Rüya Arketipi"
              hint="Rüyalarında genellikle hangi rolü üstlenirsin?"
              value={dreamArchetype}
              placeholder="Arketip seç"
              options={ARCHETYPES}
              onSelect={setDreamArchetype}
            />

            <SelectField
              label="Rüya Ruh Hali"
              hint="Rüyalarının genel atmosferi"
              value={dreamMood}
              placeholder="Ruh hali seç"
              options={MOODS}
              onSelect={setDreamMood}
            />

            <SelectField
              label="Ana Rüya Enerjisi"
              hint="Rüyalarında en çok hissettiren element"
              value={dreamEnergy}
              placeholder="Enerji seç"
              options={ENERGIES}
              onSelect={setDreamEnergy}
            />

            <TagsField
              label="Yaygın Rüya Temaları"
              hint="Rüyalarında sık görünen temalar"
              tags={commonThemes}
              maxTags={5}
              onAdd={t => setCommonThemes(prev => [...prev, t])}
              onRemove={t => setCommonThemes(prev => prev.filter(x => x !== t))}
            />

            <View style={s.field}>
              <FieldLabel label="Favori Rüya Sembolü" hint="Maks 50 karakter" />
              <TextInput
                style={s.input}
                placeholder="Ay, anahtar, köprü…"
                placeholderTextColor={Colors.textMuted}
                value={favoriteSymbol}
                onChangeText={setFavoriteSymbol}
                maxLength={50}
                autoCorrect={false}
              />
            </View>

            <SelectField
              label="Rüya Sıklığı"
              hint="Ne sıklıkta rüya görürsün?"
              value={dreamFrequency}
              placeholder="Sıklık seç"
              options={FREQUENCIES}
              onSelect={setDreamFrequency}
            />

            <SelectField
              label="Lucid Rüya Deneyimi"
              hint="Bilinçli rüya görme deneyimin"
              value={lucidExperience}
              placeholder="Seviye seç"
              options={LUCID_LEVELS}
              onSelect={setLucidExperience}
            />
          </View>

          <View style={s.divider} />

          {/* ══════════════════════════════════════════════════
               SECTION 3 — Gizlilik & Keşif
          ══════════════════════════════════════════════════ */}
          <SectionHeader title="GİZLİLİK & KEŞİF" icon="shield-checkmark-outline" />

          <View style={s.toggleCard}>
            <ToggleField
              label="Herkese Açık Profil"
              hint="Profilin diğer kullanıcılar tarafından görülebilir"
              value={isPublic}
              onChange={setIsPublic}
            />
            <View style={s.toggleDivider} />
            <ToggleField
              label="Rüya Eşleşmelerine İzin Ver"
              hint="Ortak rüya temaları olan kullanıcılarla eşleş"
              value={allowDreamMatching}
              onChange={setAllowDreamMatching}
            />
            <View style={s.toggleDivider} />
            <ToggleField
              label="Dream Connections'a Görün"
              hint="Ortak rüya deneyimleri olan kişilerle bağlan"
              value={allowDreamConnections}
              onChange={setAllowDreamConnections}
            />
            <View style={s.toggleDivider} />
            <ToggleField
              label="Rüyamda Göründüm Tespiti"
              hint="Birisi senden bahsettiğinde bildirim al"
              value={allowSeenInDreams}
              onChange={setAllowSeenInDreams}
            />
            <View style={s.toggleDivider} />
            <ToggleField
              label="Anonim Keşif"
              hint="Keşfet ekranında anonim olarak görün"
              value={anonymousDiscovery}
              onChange={setAnonymousDiscovery}
            />
          </View>

          <View style={s.divider} />

          {/* ══════════════════════════════════════════════════
               SECTION 4 — Sosyal Profil
          ══════════════════════════════════════════════════ */}
          <SectionHeader title="SOSYAL PROFİL" icon="link-outline" />

          <View style={s.fields}>
            {/* Personal statement */}
            <View style={s.field}>
              <FieldLabel
                label="Kısa Beyan"
                hint="Rüya evrenindeki varlığını özetle"
                counter={`${personalStatement.length}/160`}
                error={errors.personalStatement}
              />
              <TextInput
                style={[s.input, s.inputMultiline, errors.personalStatement ? s.inputError : null]}
                placeholder="Ben rüyalarımda…"
                placeholderTextColor={Colors.textMuted}
                value={personalStatement}
                onChangeText={v => { setPersonalStatement(v); setErrors(e => ({ ...e, personalStatement: undefined })); }}
                maxLength={160}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            {/* Website */}
            <View style={s.field}>
              <FieldLabel
                label="Web Sitesi / Sosyal Link"
                error={errors.websiteUrl}
              />
              <View style={[s.inputRow, errors.websiteUrl ? s.inputError : null]}>
                <Ionicons name="globe-outline" size={15} color={Colors.textMuted} style={{ marginRight: 6 }} />
                <TextInput
                  style={s.inputInner}
                  placeholder="https://"
                  placeholderTextColor={Colors.textMuted}
                  value={websiteUrl}
                  onChangeText={v => { setWebsiteUrl(v); setErrors(e => ({ ...e, websiteUrl: undefined })); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
            </View>

            <TagsField
              label="İlgi Alanları"
              hint="Genel ilgi alanların"
              tags={interests}
              maxTags={8}
              onAdd={t => setInterests(prev => [...prev, t])}
              onRemove={t => setInterests(prev => prev.filter(x => x !== t))}
            />

            <TagsField
              label="Rüya Etiketleri"
              hint="Rüya tarzını tanımlayan etiketler"
              tags={dreamTags}
              maxTags={6}
              onAdd={t => setDreamTags(prev => [...prev, t])}
              onRemove={t => setDreamTags(prev => prev.filter(x => x !== t))}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerBtn:            { paddingHorizontal: 12, paddingVertical: 8, minWidth: 64, alignItems: 'center' },
  headerBtnText:        { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  headerTitle:          { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  headerSaveBtn:        { backgroundColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12, minWidth: 64, alignItems: 'center', justifyContent: 'center', minHeight: 36 },
  headerSaveBtnDisabled:{ opacity: 0.65 },
  headerSaveBtnText:    { fontSize: 15, fontWeight: '700', color: '#fff' },

  scrollContent: { paddingBottom: 40 },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    color: Colors.primary,
    textTransform: 'uppercase',
  },

  divider: { height: 1, backgroundColor: Colors.border, marginTop: 8 },

  // Photo section
  photoSection: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  avatarWrap: { position: 'relative' },
  avatarPreview: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: Colors.border,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primaryDark,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 36, fontWeight: '800', color: '#fff' },
  avatarPendingBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primary,
    borderWidth: 2, borderColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  photoActions: { flexDirection: 'row', gap: 8 },
  photoBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  photoBtnPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  photoBtnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  photoBtnSecondary: { backgroundColor: 'transparent', borderColor: Colors.border },
  photoBtnSecondaryText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  urlInputWrap: { width: '100%' },
  urlInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    color: Colors.textPrimary, fontSize: 13,
  },
  photoHint: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },

  // Fields
  fields: { paddingHorizontal: 20, gap: 18 },
  field:  { gap: 7 },

  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabel:    { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, flex: 1 },
  fieldHint:     { fontSize: 11, color: Colors.textMuted },
  fieldError:    { fontSize: 11, color: Colors.error, fontWeight: '600' },
  fieldCounter:  { fontSize: 11, color: Colors.textMuted },

  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    color: Colors.textPrimary, fontSize: 15, fontWeight: '500',
  },
  inputError:     { borderColor: Colors.error },
  inputMultiline: { minHeight: 80, paddingTop: 12 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputPrefix: { fontSize: 15, color: Colors.textMuted, fontWeight: '600', marginRight: 2 },
  inputInner: { flex: 1, paddingVertical: 13, color: Colors.textPrimary, fontSize: 15, fontWeight: '500' },

  // Select button
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.inputBorder,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  selectValue:       { fontSize: 15, color: Colors.textPrimary, fontWeight: '500', flex: 1 },
  selectPlaceholder: { fontSize: 15, color: Colors.textMuted, flex: 1 },

  // Tags
  tagsWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${Colors.primary}18`, borderRadius: 8, borderWidth: 1, borderColor: `${Colors.primary}30`, paddingHorizontal: 8, paddingVertical: 5 },
  tagText:     { fontSize: 12, fontWeight: '600', color: Colors.primary },
  tagInput:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 12, paddingHorizontal: 14 },
  tagInputText:{ flex: 1, paddingVertical: 11, color: Colors.textPrimary, fontSize: 14 },
  tagAddBtn:   { padding: 4 },

  // Toggles
  toggleCard:    { marginHorizontal: 20, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16 },
  toggleRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  toggleLabels:  { flex: 1 },
  toggleLabel:   { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  toggleHint:    { fontSize: 11, color: Colors.textMuted, lineHeight: 16 },
  toggleDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },

  // Option picker modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 40, maxHeight: '70%',
  },
  modalHandle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  modalTitle:       { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  modalOption:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  modalOptionSelected: { backgroundColor: `${Colors.primary}10` },
  modalOptionText:  { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  modalOptionTextSelected: { color: Colors.primary, fontWeight: '700' },
  modalCancel: { marginHorizontal: 20, marginTop: 12, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.background, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
});
