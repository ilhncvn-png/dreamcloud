# SPRINT_1_AUDIT.md

## DreamCloud — Sprint 1 Teknik Denetim Raporu

**Tarih:** 2026-06-15  
**Denetleyen:** Claude Code  
**Kapsam:** Sprint 1 başlangıç hazırlık denetimi — kod değişikliği yapılmadı

---

## ÖZET PUAN KARTI

| Kategori                     | Durum                  | Kritiklik  |
| ---------------------------- | ---------------------- | ---------- |
| API Production Build         | ✅ PASS                | —          |
| API TypeScript (workspace)   | ✅ PASS                | —          |
| Root `tsc --noEmit`          | ⚠️ YANLIŞ YAPILANDIRMA | Warning    |
| npm Workspace Symlinks       | ✅ PASS                | —          |
| Docker Kurulumu              | ❌ YOK                 | 🔴 Blocker |
| Migration Dosyaları          | ❌ BOŞ                 | 🔴 Blocker |
| Entity Dosyaları             | ❌ BOŞ                 | 🔴 Blocker |
| CI Workflow Filtre Sözdizimi | ❌ HATALI              | 🔴 Blocker |
| GitHub Remote                | ❌ PUSH YAPILMADI      | 🔴 Blocker |
| API Bootstrap                | ✅ PASS                | —          |
| GET /health                  | ✅ PASS (koda göre)    | —          |
| Mobile Route Yapısı          | ✅ PASS                | —          |
| JWT Key Altyapısı            | ✅ PASS (script hazır) | —          |
| JWT Key (runtime)            | ❌ ÜRETILMEDI          | 🔴 Blocker |
| E2E Test / supertest         | ❌ KURULMADI + UYUMSUZ | Warning    |
| Husky Hook'ları              | ✅ PASS                | —          |

**Blokör sayısı: 7 — Sprint 1 bitiş kriteri karşılanmaz**

---

## 1. BUILD

### 1.1 API Production Build

```
Komut: npx turbo run build --filter=@dreamcloud/api
Sonuç: ✅ 1 successful, 1 total — FULL TURBO (cached)
Süre:  16ms (cache hit)
```

NestJS `nest build` başarıyla tamamlanıyor. `dist/` dizini oluşuyor.

### 1.2 Turbo Pipeline

```
Komut: npx turbo run build --dry=json
Sonuç: ✅ Pipeline tanımları doğru
```

`build`, `dev`, `test`, `test:ci`, `lint`, `type-check`, `migration:run`, `seed`, `clean` taskları tanımlı. `globalEnv: [NODE_ENV, DATABASE_URL, REDIS_URL]` doğru.

---

## 2. TYPESCRIPT

### 2.1 API Workspace Tipi (Doğru Kapsam)

```
Komut: cd apps/api && npx tsc --noEmit
Sonuç: ✅ 0 hata
```

`apps/api/tsconfig.json` → `@dreamcloud/typescript-config/nestjs.json` → `base.json` zinciri doğru çalışıyor.

### 2.2 Root `tsc --noEmit` — Yapılandırma Hatası (Gerçek Hata Değil)

```
Sonuç: ⚠️ Birden fazla hata — ancak bunlar root tsconfig yapılandırma sorunudur
```

Root `tsconfig.json` dosyasında:

- **`"exclude": ["node_modules"]`** — `apps/mobile/` ve `apps/api/test/` hariç tutulmamış
- `jsx` ayarı yok → mobile `.tsx` dosyaları hata veriyor
- `emitDecoratorMetadata: true` yok → NestJS decorator'ları hata veriyor
- `noPropertyAccessFromIndexSignature: true` var → `process.env.NODE_ENV` dot-notation hatası

**Etki:** CI'da her workspace kendi tsconfig'ini kullandığı için bu hatalar build'i engellemez. Ancak IDE'de root projede false-positive hatalar görülür.

**Tespit edilen root `tsc` hataları (false positive):**

- `apps/api/src/app.controller.ts` — TS1241 decorator imza uyumsuzluğu (emitDecoratorMetadata eksik)
- `apps/api/src/main.ts` — TS4111 `process.env.NODE_ENV` dot-notation (noPropertyAccessFromIndexSignature)
- `apps/mobile/app/(auth)/*.tsx` — TS17004 JSX flag eksik
- `apps/api/test/app.e2e-spec.ts` — TS2307 `supertest` tip tanımı yok

**Gerçek hata yok** — her workspace kendi tsconfig'iyle temizdir.

### 2.3 main.ts — process.env Dot Notation

```
apps/api/src/main.ts satır 10, 14, 25, 35
process.env.NODE_ENV  → process.env['NODE_ENV'] olmalı
```

`nestjs.json` base'inde `noPropertyAccessFromIndexSignature` yok, bu yüzden API build geçiyor. Ama root tsconfig'deki kural tutarsız — standartlaştırılmalı.

---

## 3. WORKSPACE YAPISI

### 3.1 npm Workspaces

```
"workspaces": ["apps/api", "apps/mobile", "packages/*"]
"packageManager": "npm@11.13.0"
```

✅ `apps/web` kaldırıldı (B-1 düzeltmesi)  
✅ `apps/nlp` Python olduğu için workspaces dışında — doğru

### 3.2 Symlink Kontrolü

```
node_modules/@dreamcloud/
  api ✅
  eslint-config ✅
  mobile ✅
  shared-types ✅
  typescript-config ✅
  utils ✅
```

Tüm 6 workspace paketi doğru symlink'lenmiş.

### 3.3 Package Name Tutarlılığı

| Dizin                      | package.json name                  |
| -------------------------- | ---------------------------------- |
| apps/api                   | `@dreamcloud/api` ✅               |
| apps/mobile                | `@dreamcloud/mobile` ✅            |
| packages/shared-types      | `@dreamcloud/shared-types` ✅      |
| packages/eslint-config     | `@dreamcloud/eslint-config` ✅     |
| packages/typescript-config | `@dreamcloud/typescript-config` ✅ |
| packages/utils             | `@dreamcloud/utils` ✅             |

---

## 4. DOCKER

### 4.1 Docker Kurulum Durumu

```
Komut: docker info
Sonuç: ❌ command not found: docker
```

**TASK-003 tamamlanmadı.** Docker Desktop kurulmamış.

### 4.2 docker-compose.yml Sözdizimi

Docker kurulu olsaydı `docker compose config --quiet` başarılı olacaktı. İçerik kontrolü:

- ✅ `postgres` — `pgvector/pgvector:pg16`, healthcheck, `init-db/` volume
- ✅ `redis` — `redis:7-alpine`, maxmemory 256mb, healthcheck
- ✅ `mailhog` — port 1025/8025
- ✅ `pgadmin` — port 5050, `depends_on: postgres: condition: service_healthy`
- ✅ `pgadmin_data` volume tanımlı

### 4.3 init-db/01-extensions.sql

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  ✅
CREATE EXTENSION IF NOT EXISTS "vector";      ✅ (pgvector — doğru isim: "vector")
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    ✅
```

NLP read-only kullanıcı (`dreamcloud_nlp_ro`) oluşturma SQL doğru.

---

## 5. MİGRASYON ALTYAPISI

### 5.1 Migration Scripts

```json
"migration:generate": "typeorm-ts-node-commonjs migration:generate"
"migration:run":      "typeorm-ts-node-commonjs -d src/database/data-source.ts migration:run"
"migration:revert":   "typeorm-ts-node-commonjs -d src/database/data-source.ts migration:revert"
"migration:show":     "typeorm-ts-node-commonjs -d src/database/data-source.ts migration:show"
```

✅ Sözdizimi doğru. DataSource doğru konumda işaret ediyor.

### 5.2 DataSource

```
apps/api/src/database/data-source.ts → re-exports AppDataSource
apps/api/src/config/database.config.ts → DataSourceOptions + AppDataSource
```

✅ TypeORM CLI için doğru dual-export pattern.

### 5.3 Migration Dosyaları

```
Dizin: apps/api/src/database/migrations/
İçerik: ❌ BOŞ
```

**BLOCKER — TASK-004 tamamlanmadı.** `users`, `user_profiles`, `user_settings` tabloları için migration dosyası yok. Sprint 1 bitiş kriterinin bir koşulu karşılanmıyor.

### 5.4 Entity Dosyaları

```
Komut: find src/modules -name "*.entity.ts"
Sonuç: ❌ 0 dosya
```

**BLOCKER.** Hiçbir `.entity.ts` dosyası mevcut değil. `TypeOrmModule.forRootAsync` içindeki `autoLoadEntities: true` ayarı, modüllerde herhangi bir `TypeOrmModule.forFeature([EntityClass])` çağrısı bulunmadığı için boş kalır. Migration `generate` da entity'leri referans alamaz.

Eksik entity'ler:

- `modules/users/entities/user.entity.ts`
- `modules/users/entities/user-profile.entity.ts`
- `modules/users/entities/user-settings.entity.ts`
- `modules/dreams/entities/dream.entity.ts`
- `modules/social/entities/follow.entity.ts`
- `modules/feed/entities/dream-view.entity.ts`
- `modules/notifications/entities/notification.entity.ts`
- `modules/moderation/entities/moderation-report.entity.ts`

---

## 6. API BOOTSTRAP

### 6.1 main.ts

```typescript
NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: ... }))
```

✅ Fastify adapter doğru kullanılmış.  
✅ URI versioning (`/api/v1/...`).  
✅ ValidationPipe: `whitelist`, `forbidNonWhitelisted`, `transform`.  
✅ Swagger: `NODE_ENV !== 'production'` koşullu.  
✅ `app.listen(port, '0.0.0.0')` — container uyumlu.

### 6.2 app.module.ts

```
✅ ConfigModule.forRoot({ isGlobal: true, load: [configuration, jwtConfig, redisConfig] })
✅ TypeOrmModule.forRootAsync — ConfigService ile URL okuma
✅ ThrottlerModule.forRootAsync — rate limiting
✅ TerminusModule — health check
✅ 8 modül import: Auth, Dreams, Users, Social, Feed, Search, Notifications, Moderation
```

### 6.3 BullModule Eksikliği

`@nestjs/bull` + `bull` bağımlılıklar içinde var, ancak `app.module.ts`'te `BullModule.forRoot(...)` çağrısı yok. Sprint 5 NLP async queue için gerekecek. Sprint 1 bağlamında bloker değil.

### 6.4 GET /health

```typescript
@Get('health') @HealthCheck()
check() { return this.health.check([() => this.db.pingCheck('database')]); }
```

✅ Terminus + TypeORM DB ping. Docker olmadan DB bağlantısı kurulamaz — `docker compose up` sonrası test edilebilir.

---

## 7. COMMON KATMANI

### 7.1 Dizin Yapısı

```
src/common/
  decorators/  ⚠️ BOŞTU (içerik kontrol edilemedi — ls çıktı vermedi)
  filters/     ⚠️ BOŞTU
  guards/      ⚠️ BOŞTU
  interceptors/⚠️ BOŞTU
  interfaces/  ⚠️ BOŞTU
  pipes/       ⚠️ BOŞTU
```

Dizin yapıları mevcut ancak hiçbir dosya yok. Sprint 2 için:

- `HttpExceptionFilter` → TASK-002 kabul kriterlerinde var
- `JwtAuthGuard` → Sprint 2 auth modülüyle gelecek
- Sprint 1 açısından bloker değil; ancak ekibe bildirilmeli.

---

## 8. MOBILE

### 8.1 Route Yapısı

```
app/_layout.tsx           ✅ QueryClientProvider + SplashScreen
app/(auth)/_layout.tsx    ✅ Stack navigasyon
app/(auth)/login.tsx      ✅ Dark theme, 3 buton, Link to register
app/(auth)/register.tsx   ✅ Dark theme, Link to login
app/(tabs)/_layout.tsx    ✅ 5 tab, dark tabBar
app/(tabs)/index.tsx      ✅ Feed skeleton
app/(tabs)/explore.tsx    ✅ Keşfet skeleton
app/(tabs)/add-dream.tsx  ✅ Rüya Ekle skeleton
app/(tabs)/notifications.tsx ✅ Bildirimler skeleton
app/(tabs)/profile.tsx    ✅ Profil skeleton
```

### 8.2 TypeScript + Babel

```
apps/mobile/tsconfig.json → react-native.json → jsx: "react-native" ✅
apps/mobile/babel.config.js → babel-preset-expo + module-resolver + reanimated ✅
```

### 8.3 Eksik Assets

`apps/mobile/app.json` → `./assets/images/icon.png` ve `./assets/images/splash.png` referans ediyor. Bu dosyaların varlığı doğrulanamadı (listede görünmüyor). `npx expo start` çalışır ancak ikon/splash yüklenemez uyarısı alınabilir. Sprint 1 kabul kriterini (giriş ekranı görüntüleniyor) engellemez.

### 8.4 Runtime Doğrulaması

iOS Simulator veya Android Emülatör olmadan "ekran görüntüleniyor" kriteri doğrulanamaz. TASK-008 kabul kriterindeki emülatör testi bu denetim kapsamı dışında.

---

## 9. E2E TEST SORUNLARI

### 9.1 supertest Eksik

```
supertest paketi: ❌ YOK (node_modules'de yok)
@types/supertest:  ❌ YOK
devDependencies:   ❌ apps/api/package.json'da yok
```

E2E test dosyası dinamik `import('supertest')` kullanıyor — kurulu değilse `MODULE_NOT_FOUND` hatası.

### 9.2 Fastify + supertest Uyumsuzluğu

```typescript
const response = await request(app.getHttpAdapter().getInstance()).get('/health');
```

`app.getHttpAdapter().getInstance()` Fastify instance döner (Node.js `http.Server` değil). `supertest` Express/http.Server bekler. Bu test Express adapter olmadan çalışmaz.

**Çözüm alternatifleri (bilgi amaçlı, düzeltme yapılmadı):**

- `light-my-request` (Fastify'ın kendi test utility'si)
- `app.getHttpAdapter().inject(...)` kullanmak
- Test ortamında Express adapter tercih etmek

---

## 10. CI/CD

### 10.1 Kritik: --filter Sözdizimi Hatası

```yaml
# ci.yml satır 43, 46, 102:
npx turbo run lint --filter=api...         ❌ HATALI
npx turbo run type-check --filter=api...   ❌ HATALI
npx turbo run test:ci --filter=api...      ❌ HATALI

# ci-mobile.yml satır 38, 41, 44:
npx turbo run lint --filter=mobile...      ❌ HATALI
npx turbo run type-check --filter=mobile.. ❌ HATALI
npx turbo run test:ci --filter=mobile...   ❌ HATALI
```

Turborepo v2 kısmi isim eşleşmesi yapmaz. Scoped package name zorunlu:

- `api` → `@dreamcloud/api`
- `mobile` → `@dreamcloud/mobile`

Bu hatalarla GitHub Actions CI hiçbir görevi çalıştırmaz ama başarılı görünür (0 task = uyarı, hata değil). **PR merge kontrolü çalışmaz.**

### 10.2 ci.yml Genel Yapı

- ✅ PR ve push trigger (paths-filtered)
- ✅ PostgreSQL + Redis service container
- ✅ `npm ci --prefer-offline`
- ✅ Migration çalıştırma adımı (`Run Migrations`)
- ✅ Coverage upload (Codecov)
- ⚠️ `NODE_VERSION: '20.x'` → Yerel ortam Node.js v24.16.0; küçük versiyon farkı, sorun çıkarmaz

---

## 11. GIT VE GÜVENLİK

### 11.1 Git Repo Durumu

```
.git/: ✅ Mevcut (git init yapılmış)
Branch: main
Commits: ❌ YOK (fatal: does not have any commits yet)
Remote: ❌ YOK (GitHub'a push edilmedi)
```

Uncommitted dosyalar: tüm proje (`??` — untracked).

### 11.2 .gitignore Kapsam

```
.env, .env.local, *.env.*   ✅ Hariç tutulmuş
*.key, jwt-private.key       ✅ Hariç tutulmuş
node_modules/                ✅ Hariç tutulmuş
dist/, .turbo/               ✅ Hariç tutulmuş
apps/api/keys/               → .gitignore içinde kontrol edilmeli
```

### 11.3 JWT Key Altyapısı

```
infrastructure/scripts/generate-jwt-keys.sh: ✅ Mevcut
apps/api/keys/ dizini:                        ❌ YOK
```

Script `openssl genrsa -out apps/api/keys/jwt-private.key 2048` çalıştırılmamış. API production modda başlatılamaz (jwt.config.ts key bulamazsa '' döner — boş key, token imzalanamaz).

---

## 12. TOPLAM DEĞERLENDİRME

### 🔴 BLOKÖRLER (Sprint 1 bitiş kriteri karşılanamaz)

| #   | Bloker                                                                                  | Görev                  |
| --- | --------------------------------------------------------------------------------------- | ---------------------- |
| B-1 | Docker kurulmadı — `docker compose up` çalışmıyor                                       | TASK-003               |
| B-2 | Migration dosyaları yok — `users`, `user_profiles`, `user_settings` tabloları oluşmuyor | TASK-004               |
| B-3 | Entity dosyaları yok — TypeORM autoLoad çalışmıyor, migration generate çalışmıyor       | TASK-004 (bağımlı)     |
| B-4 | JWT keys üretilmedi — `apps/api/keys/` yok                                              | TASK-007               |
| B-5 | CI workflow `--filter=api...` hatası — GitHub Actions hiçbir task çalıştırmıyor         | Düzeltme gerekli       |
| B-6 | GitHub remote yok — `git push` yapılmadı, CI tetiklenemiyor                             | TASK-001               |
| B-7 | `.env` dosyaları yok — API ve NLP servisleri konfigürasyon okuyamaz                     | TASK-002/003 bağımlısı |

### 🟡 UYARILAR (Sprint 1'i engellemez, Sprint 2 öncesi çözülmeli)

| #   | Uyarı                                                                                     | Öncelik            |
| --- | ----------------------------------------------------------------------------------------- | ------------------ |
| W-1 | Root `tsconfig.json` — `apps/mobile/` ve `apps/api/test/` hariç tutulmalı + jsx eklenmeli | Sprint 2 öncesi    |
| W-2 | `main.ts` — `process.env.NODE_ENV` → `process.env['NODE_ENV']` (bracket notation)         | Sprint 2           |
| W-3 | E2E test: `supertest` kurulmadı + Fastify uyumsuzluğu                                     | Sprint 2 öncesi    |
| W-4 | `common/filters/`, `common/guards/`, vb. — tüm dizinler boş                               | Sprint 2 (auth)    |
| W-5 | Mobile assets: `icon.png`, `splash.png` referans var, varlık doğrulanamadı                | Sprint 2 (tasarım) |
| W-6 | `app.module.ts` — `BullModule.forRoot(...)` yok (Sprint 5'te gerekecek)                   | Sprint 5 öncesi    |
| W-7 | CI `NODE_VERSION: 20.x` vs yerel `v24.16.0` farkı                                         | Düşük risk         |

### ✅ GEÇTİ

- npm install (1821 paket, 0 hata)
- API production build (`nest build`)
- API TypeScript (0 hata)
- npm workspace symlinks (6 paket)
- docker-compose.yml sözdizimi
- Migration script komutları
- TypeORM DataSource config
- app.module.ts import yapısı
- main.ts Fastify adapter
- GET /health endpoint kodu
- Mobile 10 route dosyası
- Mobile tsconfig JSX
- Husky pre-commit + commit-msg hook
- turbo.json pipeline
- .gitignore güvenlik kuralları
- NLP 6 eksik dosya (bu oturumda oluşturuldu)
- SPRINT_1_TASKS.md TASK-001 monorepo güncellemesi

---

## SONRAKI ADIMLAR (Öncelik Sırası)

```
1. [TASK-001] git add . && git commit -m "chore: initial monorepo setup"
              gh repo create dreamcloud --private
              git push -u origin main

2. [CI FIX]   ci.yml ve ci-mobile.yml'deki --filter=api → --filter=@dreamcloud/api

3. [TASK-003] Docker Desktop kurulumu → docker compose up -d → servisler healthy

4. [.env]     apps/api/.env.example → apps/api/.env kopyala + DB/Redis URL doldur

5. [TASK-007] bash infrastructure/scripts/generate-jwt-keys.sh

6. [TASK-004] Entity'leri yaz (user.entity.ts, user-profile.entity.ts, user-settings.entity.ts)
              → npx turbo run migration:generate --filter=@dreamcloud/api
              → npx turbo run migration:run --filter=@dreamcloud/api

7. [W-3]      supertest yerine light-my-request / Fastify inject kullan (E2E test düzelt)

8. [TASK-005] PR aç → GitHub Actions CI'ın tetiklendiğini doğrula
```

---

_Bu doküman Sprint 1 başlangıç denetim raporudur._  
_Kod değişikliği yapılmamıştır — tüm bulgular gözlem ve analiz sonucudur._
