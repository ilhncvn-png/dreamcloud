# SESSION_HANDOFF.md

## DreamCloud — Oturum Devir Notu

**Son Güncelleme:** 2026-07-10  
**Mevcut Branch:** `develop`  
**Son Commit:** `fe50041` — fix(api): reduce Railway startup logs and stabilize health checks

### Railway Staging Durumu (Phase 1F)
- Build: ✅ geçiyor  
- Log flood: ✅ düzeltildi — production logger `['error','warn']`, route mapping log'ları Railway'e gitmiyor  
- `/health` ve `/api/v1/health`: ✅ her ikisi aktif, DB bağımsız  
- Sıradaki: Railway dashboard'da healthcheck `/health` path'inin doğru ayarlanması, ardından DB extension + migration

---

## SIRADAKI GÖREVLER: TASK-012 / 013 / 014 — Mobil Dreams Ekranları

TASK-008 tamamlandı, Expo Go'da doğrulandı. Sıradaki: Backend'deki çalışan Dreams API'sine bağlanan 3 mobil ekran.

---

## TASK DURUMU

| TASK     | Açıklama                          | Durum           |
| -------- | --------------------------------- | --------------- |
| TASK-001 | GitHub repo + branch protection   | ✅ Tamamlandı   |
| TASK-002 | NestJS API iskeleti               | ✅ Tamamlandı   |
| TASK-003 | Docker Compose                    | ✅ Tamamlandı   |
| TASK-004 | TypeORM entity + migration        | ✅ Tamamlandı   |
| TASK-005 | CI/CD doğrulama                   | ✅ Tamamlandı   |
| TASK-007 | JWT Auth (register/login/refresh) | ✅ Tamamlandı   |
| TASK-011 | Dreams CRUD backend (6 endpoint)  | ✅ Tamamlandı   |
| TASK-008 | Expo mobil iskelet + auth flow    | ✅ Tamamlandı   |
| TASK-006 | AWS altyapı                       | ⏳ Ertelendi    |
| TASK-009 | FastAPI NLP servisi               | ⏳ Ertelendi    |
| TASK-012 | Mobil Dreams Feed (gerçek veri)   | 🔵 **SIRADAKI** |
| TASK-013 | Create Dream Ekranı               | 📋 Planlandı    |
| TASK-014 | Dream Detail Ekranı               | 📋 Planlandı    |

---

## TAMAMLANAN: TASK-008 — Expo Mobil İskelet

### Oluşturulan Dosyalar

```
apps/mobile/
├── app/
│   ├── _layout.tsx          — RootLayout + AuthGuard (Zustand hydration, redirect logic)
│   ├── index.tsx            — Redirect: isAuthenticated → /(tabs), else → /(auth)/login
│   ├── (auth)/
│   │   ├── _layout.tsx      — Stack layout (header hidden)
│   │   ├── login.tsx        — Email + password form (react-hook-form + zod)
│   │   └── register.tsx     — Email + username + password + confirm form
│   └── (tabs)/
│       ├── _layout.tsx      — Tab bar layout
│       └── index.tsx        — Feed ekranı (user.email, logout butonu)
├── src/
│   ├── api/
│   │   ├── client.ts        — Axios + Bearer interceptor + 401 refresh retry
│   │   └── auth.api.ts      — loginApi, registerApi, refreshApi, logoutApi
│   ├── store/
│   │   └── auth.store.ts    — Zustand: user, tokens, login, logout, hydrate
│   ├── types/
│   │   └── auth.types.ts    — AuthTokens, AuthUser, AuthState, LoginDto, RegisterDto
│   └── constants/
│       └── colors.ts        — DreamCloud renk paleti (#0F0F23 bg, #6C63FF primary)
├── assets/images/           — icon.png, splash.png, adaptive-icon.png, favicon.png, notification-icon.png
├── .env                     — EXPO_PUBLIC_API_URL=http://192.168.68.102:3000/api/v1
└── babel.config.js          — module-resolver + react-native-reanimated/plugin
```

### SDK Upgrade Geçmişi (SDK 52 → 54)

| Paket                          | Eski     | Yeni                              |
| ------------------------------ | -------- | --------------------------------- |
| expo                           | ~52.0.17 | ~54.0.0                           |
| react                          | 18.3.1   | 19.1.0                            |
| react-native                   | 0.76.5   | 0.81.5                            |
| expo-router                    | ~4.0.14  | ~6.0.24                           |
| react-native-reanimated        | ~3.16.1  | ~4.1.1                            |
| react-native-screens           | ~4.4.0   | ~4.16.0                           |
| react-native-gesture-handler   | ~2.20.2  | ~2.28.0                           |
| react-native-safe-area-context | 4.12.0   | ~5.6.0                            |
| expo-splash-screen             | ~0.29.18 | ~31.0.13                          |
| expo-status-bar                | ~2.0.1   | ~3.0.9                            |
| **react-native-worklets**      | —        | ~0.8.3 (yeni, reanimated v4 peer) |
| **expo-linking**               | —        | ~8.0.12 (expo-router v6 peer)     |

---

## PLANLANAN: TASK-012 — Mobil Dreams Feed

### Hedef

`apps/mobile/app/(tabs)/index.tsx` — placeholder metin yerine kullanıcının kendi rüyalarını listele.

### Yapılacaklar

1. **`src/api/dreams.api.ts`** — `getMyDreams(cursor?)`, `getDream(id)`, `createDream(dto)`, `updateDream(id, dto)`, `deleteDream(id)`
2. **`src/types/dream.types.ts`** — `Dream`, `CreateDreamDto`, `UpdateDreamDto`, `DreamCategory`, `DreamVisibility`
3. **`src/components/DreamCard.tsx`** — Kategori rengi, başlık, içerik özeti, tarih, görünürlük badge
4. **`app/(tabs)/index.tsx`** güncelle — TanStack Query `useQuery`, FlatList, pull-to-refresh, empty state, loading skeleton
5. Pagination — cursor tabanlı (backend'de mevcut: `limit` + `cursor`)

### API Bağlantısı

```
GET /api/v1/dreams/me
Authorization: Bearer <access_token>

Response: { data: { items: Dream[], nextCursor: string | null, total: number } }
```

DreamCategory enum: `lucid` | `beautiful` | `nightmare` | `normal`  
DreamVisibility enum: `public` | `private` | `friends_only`

---

## PLANLANAN: TASK-013 — Create Dream Ekranı

### Hedef

Yeni bir rüya kayıt ekranı. Tab bar'a veya FAB butonuna bağlanacak.

### Yapılacaklar

1. **`app/(tabs)/create.tsx`** — Form ekranı
2. **Form alanları:**
   - `title` — TextInput (zorunlu, max 200 karakter)
   - `content` — TextInput multiline (zorunlu, max 5000 karakter)
   - `category` — RadioButton / Picker: `lucid` / `beautiful` / `nightmare` / `normal`
   - `visibility` — Toggle: `public` / `private` / `friends_only`
   - `tags` — Tag input (isteğe bağlı, string array)
3. **Zod schema** — form validasyonu
4. **`POST /api/v1/dreams`** çağrısı
5. Başarıda Feed'e navigate + query invalidate

### Not

`mood_score` ve `embedding` backend'de otomatik hesaplanıyor, formda gösterilmeyecek.

---

## PLANLANAN: TASK-014 — Dream Detail Ekranı

### Hedef

Feed'deki bir kartın üstüne basınca açılan detay ekranı. Okuma + düzenle + sil.

### Yapılacaklar

1. **`app/dream/[id].tsx`** — Dynamic route (expo-router)
2. **`GET /api/v1/dreams/:id`** ile tam içerik yükle
3. Ekran içeriği:
   - Başlık, içerik (tam metin)
   - Kategori badge, görünürlük badge
   - Oluşturma tarihi
   - Etiketler
4. **Düzenle butonu** → `app/dream/[id]/edit.tsx` veya modal
5. **Sil butonu** → Alert confirm → `DELETE /api/v1/dreams/:id` → Feed'e dön + query invalidate
6. Sadece rüyanın sahibi düzenleyip silebilir (`user.sub === dream.authorId`)

---

## DOCKER ORTAMI

```
dreamcloud-postgres  → localhost:5432  (healthy)
dreamcloud-redis     → localhost:6379  (healthy)
dreamcloud-pgadmin   → http://localhost:5050
dreamcloud-mailhog   → http://localhost:8025
```

`apps/api/keys/jwt-private.key` ve `jwt-public.key` → üretildi (gitignore'da)

---

## MEVCUT REPO DURUMU

```
Branch:   develop
Remote:   git@github.com:ilhncvn-png/dreamcloud.git

Son commitler:
49e9eda  feat(auth): implement JWT RS256 authentication with refresh token rotation
1c4ee72  docs: mark TASK-005 complete, TASK-007 next in SESSION_HANDOFF
be1d883  fix(ci): add continue-on-error for Codecov and passWithNoTests for mobile
9b163fd  feat(ci): fix CI workflows and add unit tests for API
6614904  feat(db): add TypeORM entities and initial migration for users, profiles, and settings
```

---

## DOĞRULANMIŞ BACKEND ENDPOINTLERİ

### Auth

| Endpoint              | Method | Auth   | Durum |
| --------------------- | ------ | ------ | ----- |
| `POST /auth/register` | Public | —      | ✅    |
| `POST /auth/login`    | Public | —      | ✅    |
| `POST /auth/refresh`  | Public | —      | ✅    |
| `POST /auth/logout`   | Public | —      | ✅    |
| `GET  /auth/me`       | JWT    | Bearer | ✅    |

### Dreams

| Endpoint             | Method | Auth   | Durum            |
| -------------------- | ------ | ------ | ---------------- |
| `POST /dreams`       | JWT    | Bearer | ✅               |
| `GET  /dreams`       | JWT    | Bearer | ✅               |
| `GET  /dreams/me`    | JWT    | Bearer | ✅               |
| `GET  /dreams/:id`   | JWT    | Bearer | ✅               |
| `PATCH /dreams/:id`  | JWT    | Bearer | ✅               |
| `DELETE /dreams/:id` | JWT    | Bearer | ✅ (soft delete) |

---

## ÖNEMLİ TEKNİK NOTLAR

### Monorepo Paket Çözümlemesi

- Expo SDK 54 paketleri root `node_modules`'te (monorepo hoisting)
- `react-native-worklets@0.8.3` — reanimated v4 peer dependency, root'ta kurulu olmalı
- `expo-linking@8.0.12` — expo-router v6 peer dependency, root'ta kurulu olmalı

### API Yanıt Zarfı

Tüm yanıtlar `{ data: ..., timestamp, path }` ile sarılı.  
`auth.api.ts`'deki `extractData()` helper ile açılıyor: `res.data.data`

### Backend Enum Değerleri (Doğrulanmış)

- DreamCategory: `lucid`, `beautiful`, `nightmare`, `normal`
- DreamVisibility: `public`, `private`, `friends_only`

### JWT Token Süresi

- Access token: 15 dakika
- Refresh token: 30 gün

### Mobil API URL

`EXPO_PUBLIC_API_URL=http://192.168.68.102:3000/api/v1` (`.env` dosyasında)

---

## BEKLEYİŞ (Manuel GitHub Adımları)

1. **Branch protection** — main/develop için PR kuralları
2. **Secrets** — `JWT_TEST_PRIVATE_KEY`, `JWT_TEST_PUBLIC_KEY`, `CODECOV_TOKEN`
3. **Default branch** — develop

---

_Bu dosya her oturum sonunda güncellenir._
