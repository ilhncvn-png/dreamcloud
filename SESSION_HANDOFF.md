# SESSION_HANDOFF.md

## DreamCloud — Oturum Devir Notu

**Güncellenme:** 2026-06-15
**Durum:** Sprint 3 tamamlandı + Sprint 4 büyük ölçüde tamamlandı
**Sonraki oturumun ilk görevi:** Takipçi/takip sayılarını profile ekle + DreamCard avatar sistemi

---

## 1. MEVCUT ÇALIŞAN SİSTEM

### Backend (NestJS — port 3000)

```
✅ GET    /health
✅ POST   /api/v1/auth/register
✅ POST   /api/v1/auth/login
✅ POST   /api/v1/auth/refresh
✅ POST   /api/v1/auth/logout

✅ GET    /api/v1/dreams              (sort=newest|most_liked|most_saved|most_commented, category=lucid|beautiful|nightmare|normal)
✅ GET    /api/v1/dreams/me           (own dreams — JWT gerekli)
✅ GET    /api/v1/dreams/:id          (detail)
✅ POST   /api/v1/dreams              (create)
✅ PATCH  /api/v1/dreams/:id          (update)
✅ DELETE /api/v1/dreams/:id          (soft delete)
✅ POST   /api/v1/dreams/:id/like     (toggle)
✅ POST   /api/v1/dreams/:id/save     (toggle)

✅ GET    /api/v1/comments/:dreamId   (paginated)
✅ POST   /api/v1/comments/:dreamId   (create)
✅ DELETE /api/v1/comments/:dreamId/:commentId

✅ GET    /api/v1/notifications        (paginated)
✅ GET    /api/v1/notifications/unread-count
✅ PATCH  /api/v1/notifications/read-all
✅ PATCH  /api/v1/notifications/:id/read

✅ GET    /api/v1/users/me             (kendi profili: bio, displayName, avatarUrl)
✅ PATCH  /api/v1/users/me             (profil güncelle: displayName, username, bio, avatarUrl)
✅ GET    /api/v1/users/:id/profile    (başka kullanıcı profili + follower/following sayıları + isFollowing)
✅ POST   /api/v1/users/:id/follow     (toggle follow)

✅ GET    /api/v1/search?q=&type=      (type: dreams|users|tags|all — OptionalJwtAuthGuard)
```

### Mobile (Expo Go SDK 54)

```
✅ (auth)/login.tsx          — giriş
✅ (auth)/register.tsx       — kayıt
✅ (tabs)/index.tsx          — ana feed (infinite scroll, like/save, comment badge)
✅ (tabs)/add-dream.tsx      — rüya ekle
✅ (tabs)/explore.tsx        — Keşfet: search bar + 7 keşif bölümü (yatay scroll)
✅ (tabs)/notifications.tsx  — bildirimler (infinite scroll, unread badge, tümünü oku)
✅ (tabs)/profile.tsx        — premium profil (avatar ring, displayName, bio, stats, Düzenle)
✅ (tabs)/_layout.tsx        — tab bar + unread badge (60s poll)
✅ dream/[id]/index.tsx      — rüya detay + yorum sistemi
✅ user/[id].tsx             — başka kullanıcı profili + takip butonu
✅ profile/edit.tsx          — profil düzenleme (displayName, username, bio, avatarUrl URL)
```

---

## 2. SPRINT 3 (Tamamlandı)

### Yorum Sistemi

- `GET /comments/:dreamId`, `POST /comments/:dreamId`, `DELETE /comments/:dreamId/:commentId`
- Mobile: `dream/[id]` FlatList'e dönüştürüldü, KeyboardAvoidingView yorum girişi, optimistic commentCount

### Bildirim Sistemi

- `notifications` tablosu + migration (PostgreSQL enum: `'save'` eklendi)
- NotificationType: `LIKE | SAVE | COMMENT | FOLLOW`
- Tetikleyiciler: toggleLike, toggleSave, createComment, toggleFollow
- Kendine bildirim önleme: `recipientId === actorId` kontrolü
- Mobile: infinite scroll, tür ikonları, unread badge, "Tümünü oku"

### Seed Script Güncelleme

- Step 5: Yorumlar (rüya başına 0-8, 40+ Türkçe havuz)
- Step 6: Bildirimler (follow/like/comment)
- Step 7/8: like_count, save_count, comment_count senkronizasyonu

---

## 3. SPRINT 4 (Büyük Ölçüde Tamamlandı)

### Profil Düzenleme (Priority #1) ✅

**Backend:** `GET /users/me` + `PATCH /users/me` (username uniqueness check)

**Mobile:**

- `profile.tsx` premium redesign: avatar ring (URL image veya initials fallback), displayName büyük, @username, bio, stats kartı, "Profili Düzenle" butonu
- `profile/edit.tsx` yeni ekran: Field bileşeni, live avatar preview, form validation, PATCH mutation

### Keşfet + Arama (Priority #2 & #3) ✅

**Backend:**

- `GET /dreams?sort=...&category=...` — 4 sort + 4 category filtresi
- `GET /search?q=&type=...` — ILIKE araması, `unnest(tags)` etiket search

**Mobile `explore.tsx` tam yeniden yazım:**

- Search bar üstte (her zaman görünür)
- Arama modunda: 3 tab (Rüyalar/Kişiler/Etiketler), 350ms debounce, min 2 karakter
- Keşif modunda: 7 bölüm (yatay kart listeler)
  - 🔥 Trend (most_commented)
  - ❤️ En Çok Beğenilenler (most_liked)
  - 🔖 En Çok Kaydedilenler (most_saved)
  - 🌟 Lucid Rüyalar (category=lucid)
  - 😱 Kabuslar (category=nightmare)
  - 🌸 Güzel Rüyalar (category=beautiful)
  - 🌙 Son Eklenenler (newest)

### TypeScript Temizliği ✅

- `exactOptionalPropertyTypes: true` ile tüm TS hataları giderildi
- Conditional spreading pattern: `...(val !== undefined ? { key: val } : {})`
- Optional prop tip: `error?: string | undefined` (explicit undefined için)

---

## 4. KRİTİK TEKNİK BİLGİLER

### Backend

- NestJS + Fastify, port 3000
- TypeORM 0.3.20 + SnakeNamingStrategy (leftJoinAndSelect, relations: { profile: true })
- `forbidNonWhitelisted: true` — bilinmeyen query params 400 döner
- OptionalJwtAuthGuard — unauthenticated erişime izin verir, null user döner
- Response wrapper: `{ data: ..., timestamp, path }`
- Soft delete (`@DeleteDateColumn`) Dream entity'sinde
- Void fire-and-forget: `void this.notificationsService.create(...)`

### Mobile

- Expo Go SDK 54, fiziksel cihaz, `EXPO_PUBLIC_API_URL=http://192.168.68.102:3000/api/v1`
- TanStack Query v5 — `useInfiniteQuery` page-based, optimistic updates
- Zustand auth store — `user.sub` = userId, `user.email` (JWT'de username yok)
- `noUncheckedIndexedAccess: true` + `exactOptionalPropertyTypes: true`
- `tabBarBadge`: `...(count > 0 && { tabBarBadge: count })` spread pattern gerekli

### JWT / Auth / DB

- JWT key'leri: `apps/api/keys/` — asla commit edilmemeli
- Seed: sadece `NODE_ENV=development`'ta çalışır
- Database reset yapma, volume silme, gerçek kullanıcı verileri silme

---

## 5. KALAN GÖREVLER

### Kısa Vadeli (Sprint 4 tamamlamak için)

- [ ] `GET /users/me` yanıtına `followerCount` / `followingCount` ekle (veya profile.tsx'te `getUserProfile` ile al)
- [ ] DreamCard + dream detail avatar: URL-based avatarUrl desteği (`Image` bileşeni)
- [ ] Explore bölümleri için yatay kart skeleton animasyonu

### Sprint 5

- [ ] Push notifications (Expo Notifications)
- [ ] Rüya etiketleri chips (DreamCard)
- [ ] Feed kategori filtre butonu
- [ ] Explore bölümlerinde "Tümünü gör" → full list ekranı

---

## 6. GELİŞTİRME ORTAMI

```bash
# Backend
cd apps/api && nest start --watch

# Mobile
cd apps/mobile && npx expo start

# Seed (development only)
cd apps/api && NODE_ENV=development npx ts-node src/database/seeds/run.seed.ts

# TypeScript kontrol (mobile)
cd apps/mobile && npx tsc --noEmit
```

---

## 7. ÖNEMLİ DOSYALAR (Sprint 3-4 Değişiklikleri)

```
apps/api/src/
├── modules/
│   ├── users/
│   │   ├── users.controller.ts         (GET /me, PATCH /me — YENİ)
│   │   ├── users.service.ts            (getMyProfile, updateProfile — YENİ)
│   │   └── dto/update-profile.dto.ts   (YENİ)
│   ├── search/
│   │   ├── search.controller.ts        (YENİ)
│   │   └── search.service.ts           (YENİ)
│   ├── comments/                       (Sprint 3 — YENİ modül)
│   ├── notifications/                  (Sprint 3 — YENİ modül)
│   └── dreams/dto/dream-query.dto.ts   (sort param EKLENDİ)
└── database/
    ├── migrations/1750220000000-CreateNotificationsTable.ts
    └── seeds/run.seed.ts               (Steps 5-8 EKLENDİ)

apps/mobile/
├── app/
│   ├── (tabs)/
│   │   ├── profile.tsx                 (PREMIUM REDESIGN)
│   │   ├── explore.tsx                 (TAM YENİ)
│   │   └── notifications.tsx           (Sprint 3 — YENİ)
│   ├── dream/[id]/index.tsx            (Sprint 3 — yorum sistemi)
│   └── profile/
│       └── edit.tsx                    (YENİ)
└── src/
    ├── api/
    │   ├── users.api.ts                (getMyProfile, updateMyProfile EKLENDİ)
    │   ├── search.api.ts               (YENİ)
    │   └── dreams.api.ts               (getDiscoverSection EKLENDİ)
    └── types/
        ├── user.types.ts               (MyProfile, UpdateProfileDto EKLENDİ)
        ├── search.types.ts             (YENİ)
        └── notification.types.ts       (Sprint 3 — YENİ)
```
