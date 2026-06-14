# SPRINT_1_READINESS_CHECK.md

## DreamCloud — Sprint 1 Başlangıç Hazırlık Denetimi

**Tarih:** 2026-06-14  
**Denetleyen:** Claude Code  
**Karşılaştırılan Kaynaklar:** SPRINT_1_TASKS.md · REPOSITORY_STRUCTURE.md · PROJECT_STATE.md  
**Denetlenen Hedef:** `/Users/ilhanceven/Documents/dreamcloud/`

> Bu rapor Sprint 1'e geçmeden önce onaylanmalıdır. Düzeltmeleri ben yapabilirim — ama sen onaylayana kadar dokunmuyorum.

---

## ÖZET PUAN TABLOSU

| Kategori                     | Durum                            |
| ---------------------------- | -------------------------------- |
| npm/Turborepo yapılandırması | ❌ 3 kritik hata                 |
| apps/api iskeleti            | ❌ 5 eksik dosya/klasör          |
| apps/mobile iskeleti         | ❌ 2 kritik eksik                |
| apps/nlp iskeleti            | ⚠️ 6 eksik (Sprint 5 bloklayıcı) |
| Docker / Altyapı             | ⚠️ 1 eksik (pgAdmin)             |
| CI/CD Workflows              | ✅ Hazır                         |
| packages/ (shared)           | ⚠️ 1 eksik (tsconfig)            |
| Dokümantasyon uyumu          | ⚠️ 2 güncelleme gerekli          |
| .gitignore / güvenlik        | ✅ Hazır                         |
| Temel config dosyaları       | ✅ Hazır                         |

**Sprint 1'e BAŞLANAMAZ — aşağıdaki 8 blokör düzeltilmeli.**

---

## 🔴 BLOKÖRLER — npm install çalışmaz

### B-1: `apps/web` workspace'de ama `package.json` yok

**Dosya:** [`package.json`](package.json) — satır 9  
**Sorun:** `"workspaces"` listesinde `"apps/web"` var. Bu dizinde `package.json` olmadığı için `npm install` hata verir veya workspace'i atlar.  
**Fix:** `apps/web` workspace listesinden kaldır; `package.json` Sprint 10'da eklenince geri alınır.

```json
// Şu an:
"workspaces": ["apps/api", "apps/mobile", "apps/web", "packages/*"]
// Olması gereken:
"workspaces": ["apps/api", "apps/mobile", "packages/*"]
```

### B-2: `--filter=api` yanlış — `@dreamcloud/api` olmalı

**Dosya:** [`package.json`](package.json) — satır 22–23  
**Sorun:** Turborepo v2 `--filter` flag'i **tam paket adına** göre eşleşir. `@dreamcloud/api` paketini `--filter=api` ile bulamaz.  
**Fix:**

```json
// Şu an:
"db:migrate": "turbo run migration:run --filter=api",
"db:seed":    "turbo run seed --filter=api",
// Olması gereken:
"db:migrate": "turbo run migration:run --filter=@dreamcloud/api",
"db:seed":    "turbo run seed --filter=@dreamcloud/api",
```

### B-3: `packages/utils/tsconfig.json` eksik

**Sorun:** `packages/utils/package.json` `@dreamcloud/typescript-config/base.json`'u extends eder ama `tsconfig.json` dosyası hiç oluşturulmadı. `turbo run type-check` zinciri kırılır.  
**Fix:** `packages/utils/tsconfig.json` oluştur.

---

## 🔴 KRİTİK — Sprint 1 kabul kriterleri karşılanmaz

### K-1: `apps/api/docker/` BOŞ — Dockerfile yok

**TASK-003** kabul kriteri: Docker ile API image build edilebilmeli.  
**Eksik dosyalar:**

- `apps/api/docker/Dockerfile` (production multi-stage)
- `apps/api/docker/Dockerfile.dev` (hot reload)

### K-2: `apps/api/src/config/` BOŞ — tüm config dosyaları eksik

**TASK-002** kabul kriteri: `npm run start:dev` çalışmalı.  
`app.module.ts` ConfigModule ve TypeOrmModule kullanıyor ama konfigürasyon dosyaları yok.  
**Eksik dosyalar:**

- `apps/api/src/config/configuration.ts` — Joi validation ile env yükleme
- `apps/api/src/config/database.config.ts` — TypeORM DataSource
- `apps/api/src/config/jwt.config.ts`
- `apps/api/src/config/redis.config.ts`

### K-3: `apps/api/src/app.controller.ts` eksik — `GET /health` yok

**TASK-002** kabul kriteri: `GET /health` → `{ "status": "ok" }`.  
`app.module.ts`'te controller kaydı yok, dosya yok.

### K-4: `apps/api/src/database/data-source.ts` eksik — migration CLI çalışmaz

**TASK-004** tüm görevleri bu dosyaya bağlı:

```bash
npm run migration:generate -- -d src/database/data-source.ts
npm run migration:run
```

Dosya olmadan TypeORM CLI hata verir.

### K-5: `apps/api/test/` BOŞ — `jest-e2e.json` yok

**TASK-005** CI pipeline `test:e2e` script'ini kullanır ve `jest-e2e.json` bekler.  
`apps/api/package.json`'da ayrıca `test:cov` script eksik (TASK-005 bunu referans alıyor).

### K-6: `.husky/` yapılandırılmamış — pre-commit hook aktif değil

**TASK-002** kabul kriteri: pre-commit hook çalışmalı (bilerek lint hatası gir → commit reddedilmeli).  
`husky` `devDependencies`'de var ama `husky install` çalıştırılmamış, `.husky/pre-commit` dosyası yok.

### K-7: Root `.eslintrc.js` yok — lint çalışmaz

`turbo run lint` her paketteki ESLint'i çalıştırır. Root seviyede `.eslintrc.js` veya `eslint.config.js` olmadan yeni dosyalar (tools/, scripts/) lintlenemez. Ayrıca Turborepo bazı konfigürasyonları root'tan miras alır.

### K-8: `apps/mobile/babel.config.js` eksik — Expo başlamaz

**TASK-008** kabul kriteri: `npx expo start` çalışmalı.  
Expo SDK 52 + Expo Router, Metro bundler için `babel.config.js` bekler. Bu olmadan `npm run dev` hata verir.

---

## ⚠️ ORTA — İşlevselliği kırıcı ama anında bloklayıcı değil

### O-1: `apps/mobile/app/` içinde hiç route dosyası yok

Klasörler var (`(auth)/`, `(tabs)/`, vb.) ama hiç `.tsx` dosyası yok. `npx expo start` çalışır ama boş bir app açar. TASK-008 kabul kriteri "giriş ekranı görüntülenmeli" dediği için bu bir sorun.  
**Eksik dosyalar:** `_layout.tsx`, `(auth)/_layout.tsx`, `(auth)/login.tsx`, `(tabs)/_layout.tsx`, `(tabs)/index.tsx`

### O-2: docker-compose.yml'de pgAdmin yok

**TASK-003** kabul kriteri: `http://localhost:5050` → pgAdmin erişilebilir.  
Mevcut `docker-compose.yml` PostgreSQL + Redis + Mailhog içeriyor ama pgAdmin yok.

### O-3: `init-db` SQL'de `btree_gin` eksik

**TASK-003** kendi SQL listesinde `btree_gin` uzantısını belirtiyor. Mevcut SQL'de yok.  
(Kritik değil — sonraki migration'da eklenebilir. Ama TASK-003 kabul kriterini kırmaz.)

---

## ⚠️ YAPISAL — Doküman/Karar Uyumsuzluğu

### Y-1: SPRINT_1_TASKS.md TASK-001 multi-repo referansları — GÜNCELLENMELİ

**Sorun:** TASK-001, `dreamcloud-api`, `dreamcloud-mobile`, `dreamcloud-nlp` şeklinde 3 ayrı GitHub reposu kurmayı anlatıyor. Ancak monorepo kararı alındı ve tek `dreamcloud` reposu oluşturuldu.  
**Etki:** TASK-001 tüm ekibe gönderilmeden önce güncellenmeli; aksi takdirde ekip yanlış yapıyı kurar.  
**Güncellenmesi gereken satırlar:** 41–43, 66–67, 520, 592, 672  
**Yeni TASK-001 odağı:** Tek `dreamcloud` monoreposu → GitHub'a push → branch koruması → Secrets.

### Y-2: PROJECT_STATE.md güncel değil

**Sorun:** Hâlâ "REPO: YOK" ve "Sprint 0" yazıyor. Monorepo iskeleti oluşturuldu.  
**Güncellenmesi gereken:** REPO durumu, Sprint tablosu, Ortam Durumu.

---

## ⚠️ MINOR — Sprint 5'te bloklayıcı (şimdi değil)

### M-1: `apps/nlp/` eksik dosyalar (6 adet)

REPOSITORY_STRUCTURE.md ve TASK-009'da belirtilen ama oluşturulmayan dosyalar:
| Dosya | Durum |
|-------|-------|
| `app/api/dependencies.py` | ❌ Eksik |
| `app/database/connection.py` | ❌ Eksik |
| `app/services/moderation_service.py` | ❌ Eksik |
| `app/models/request_models.py` | ❌ Eksik |
| `app/models/response_models.py` | ❌ Eksik |
| `docker/Dockerfile.dev` | ❌ Eksik |

Sprint 1 TASK-009 için stub dosyalar yeterli olabilir ama tam kabul kriteri için bunlar gerekiyor.

---

## ✅ DOĞRU VE HAZIR OLAN

| Bileşen                                           | Durum | Not                                                  |
| ------------------------------------------------- | ----- | ---------------------------------------------------- |
| `turbo.json`                                      | ✅    | Doğru task tanımları                                 |
| `.gitignore`                                      | ✅    | JWT keys, .env, node_modules, ML models gitignore'da |
| `packages/shared-types/`                          | ✅    | Tüm dosyalar hazır, enum'lar doğru                   |
| `packages/eslint-config/`                         | ✅    | base + nestjs + react-native                         |
| `packages/typescript-config/`                     | ✅    | base + nestjs + react-native                         |
| `.github/workflows/ci.yml`                        | ✅    | pgvector service, JWT secrets, codecov               |
| `.github/workflows/ci-mobile.yml`                 | ✅    | expo-doctor dahil                                    |
| `.github/workflows/ci-nlp.yml`                    | ✅    | ruff + mypy + pytest                                 |
| `.github/workflows/deploy-*.yml`                  | ✅    | Staging + production                                 |
| `.github/PULL_REQUEST_TEMPLATE.md`                | ✅    | Checklist tam                                        |
| `.github/CODEOWNERS`                              | ✅    | Modül bazında sahiplik                               |
| `infrastructure/docker/docker-compose.yml`        | ⚠️    | pgAdmin eksik                                        |
| `infrastructure/docker/docker-compose.test.yml`   | ✅    | tmpfs ile hızlı test DB                              |
| `infrastructure/docker/init-db/01-extensions.sql` | ✅    | `vector` adı doğru (`pgvector` değil)                |
| `infrastructure/scripts/setup-dev.sh`             | ✅    | İlk kurulum otomasyonu                               |
| `infrastructure/scripts/generate-jwt-keys.sh`     | ✅    | RS256 + Secrets Manager talimatları                  |
| `apps/api/src/app.module.ts`                      | ✅    | Config, TypeORM, Throttler bağlı                     |
| `apps/api/src/main.ts`                            | ✅    | Fastify, ValidationPipe, Swagger                     |
| `apps/api/src/modules/`                           | ✅    | 8 modül stub'ı mevcut                                |
| `apps/api/.env.example`                           | ✅    | Tüm değişkenler açıklamalı                           |
| `apps/mobile/package.json`                        | ✅    | Expo SDK 52, Flash-List, React Query                 |
| `apps/mobile/app.json`                            | ✅    | iOS/Android permissions, scheme                      |
| `apps/mobile/eas.json`                            | ✅    | dev/preview/production profilleri                    |
| `apps/nlp/app/main.py`                            | ✅    | Lifespan, CORS, router kayıtları                     |
| `apps/nlp/app/config.py`                          | ✅    | Pydantic Settings                                    |
| `apps/nlp/app/api/routes/*.py`                    | ✅    | health, embed, match stub'ları                       |
| `apps/nlp/app/services/*.py`                      | ⚠️    | embedding + matching var; moderation eksik           |
| `apps/nlp/pyproject.toml`                         | ✅    | ruff + mypy + pytest config                          |
| `apps/nlp/docker/Dockerfile`                      | ✅    | Multi-stage production image                         |
| `apps/nlp/tests/`                                 | ✅    | conftest.py + test_health.py                         |
| `docs/` (21 dosya)                                | ✅    | Tüm proje dokümanları kopyalandı                     |
| `.nvmrc` (Node 20)                                | ✅    |                                                      |
| `.python-version` (3.11.8)                        | ✅    |                                                      |
| `.prettierrc`                                     | ✅    |                                                      |
| `commitlint` config                               | ✅    | package.json içinde, scope-enum tanımlı              |
| `README.md`                                       | ✅    | Quick start, yapı, tech stack                        |

---

## DÜZELTİLECEKLER LİSTESİ (Öncelik Sırası)

```
ÖNCE (Sprint 1 başlamadan ZORUNLU):
  [B-1]  apps/web → workspaces listesinden çıkar
  [B-2]  --filter=api → --filter=@dreamcloud/api
  [B-3]  packages/utils/tsconfig.json oluştur
  [K-1]  apps/api/docker/Dockerfile + Dockerfile.dev oluştur
  [K-2]  apps/api/src/config/ → 4 config dosyası oluştur
  [K-3]  apps/api/src/app.controller.ts oluştur (GET /health)
  [K-4]  apps/api/src/database/data-source.ts oluştur
  [K-5]  apps/api/test/jest-e2e.json oluştur + test:cov script ekle
  [K-6]  .husky/ kur (husky install + pre-commit hook)
  [K-7]  Root .eslintrc.js oluştur
  [K-8]  apps/mobile/babel.config.js oluştur

SONRA (Sprint 1 içinde yapılabilir):
  [O-1]  apps/mobile/app/ route dosyaları (TASK-008)
  [O-2]  docker-compose.yml → pgAdmin ekle (TASK-003)
  [Y-1]  SPRINT_1_TASKS.md TASK-001 → monorepo için güncelle
  [Y-2]  PROJECT_STATE.md → mevcut durumu yansıt
  [M-1]  apps/nlp/ eksik 6 dosya (TASK-009 için)
```

---

## KARAR BEKLİYOR

Yukarıdaki tüm düzeltmeler **otomatik olarak yapılabilir** — tek bir onay yeterli.

Onay verirsen şu sırayla ilerlerim:

1. Blokör düzeltmeler (B-1, B-2, B-3) — 2 dakika
2. Kritik eksik dosyalar (K-1 → K-8) — gerçek kod + config
3. Orta düzey eksikler (O-1, O-2) — route stub'ları + pgAdmin
4. Doküman güncellemeleri (Y-1, Y-2) — TASK-001 monorepo hizalaması + PROJECT_STATE
5. NLP tamamlama (M-1) — 6 stub dosya

**Onayladıktan sonra Sprint 1 geliştirmeye hazır olacak.**

---

_Bu dosya SPRINT_1_READINESS_CHECK.md olup tek seferlik denetim raporu olarak oluşturulmuştur._  
_Düzeltmeler tamamlandıktan sonra silinebilir veya arşivlenebilir._
