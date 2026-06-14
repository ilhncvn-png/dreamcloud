# SPRINT_1_TASKS.md

## DreamCloud — Sprint 1 Görev Listesi

**Sprint:** 1 / 18  
**Hafta:** 1–2 (2 hafta)  
**Odak:** Geliştirme Ortamı Kurulumu  
**Tarih:** Geliştirme başlangıcında güncellenecek  
**Durum:** ⏳ Henüz Başlamadı

---

## SPRINT HEDEFİ

> Sprint 1 sonunda:
>
> - Turborepo monorepo (`dreamcloud`) GitHub'da mevcut ve korumalı
> - Her geliştirici yerel ortamda projeyi `docker compose up` ile çalıştırabilmeli
> - CI/CD pipeline aktif (her PR'da lint + test + build çalışmalı)
> - Temel veritabanı tabloları (`users`, `user_profiles`, `user_settings`) migration ile oluşturulmuş
> - Staging ortamı AWS ECS Fargate'de ayakta
> - Mobil uygulama Expo geliştirme modunda çalışıyor

**Bitiş Kriteri:**

- `GET /health` → `{ status: "ok" }` döndürüyor (staging)
- `docker compose up` → PostgreSQL + Redis + API + pgAdmin çalışıyor
- GitHub Actions CI → her PR'da otomatik çalışıyor
- Migration: `users`, `user_profiles`, `user_settings` tabloları var
- Expo mobil: Emülatörde giriş ekranı görüntüleniyor (statik, API bağlantısı henüz yok)

---

## GÖREV LİSTESİ

---

### TASK-001 — GitHub Monorepo Kurulumu

**Atanan:** Backend Geliştirici 1  
**Tahmin:** 2 saat  
**Öncelik:** P0 — Sprint blokeri

> **Not:** Monorepo yapısı yerel olarak hazır (`/dreamcloud/`). Bu görev GitHub'a push ve branch koruması adımlarını kapsar.

#### Yapılacaklar

```bash
# Monorepo kök dizininde (yerel dreamcloud/ klasörü)
cd /path/to/dreamcloud
git init
git branch -m main

# GitHub'da private repo oluştur (gh CLI veya web UI)
gh repo create dreamcloud --private --source=. --remote=origin

# İlk commit ve push
git add .
git commit -m "chore: initial monorepo setup"
git push -u origin main

# develop branch'i oluştur ve push et
git checkout -b develop
git push -u origin develop
```

- [ ] `dreamcloud` reposunu GitHub'da oluştur (private, Turborepo monorepo)
- [ ] Yerel `dreamcloud/` dizinini remote'a bağla ve push et
- [ ] `main` branch koruması aktive et:
  - Required: 2 reviewer approval
  - Required: CI status checks pass (ci.yml, ci-mobile.yml)
  - Disallow force push
  - Disallow direct push (admin dahil)
- [ ] `develop` branch koruması aktive et:
  - Required: 1 reviewer approval
  - Required: CI status checks pass
  - Disallow force push
  - Disallow direct push
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` ekle
- [ ] `.github/ISSUE_TEMPLATE/bug_report.md` ekle
- [ ] `.github/ISSUE_TEMPLATE/feature_request.md` ekle
- [ ] GitHub Actions Secrets ekle:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `ECR_REGISTRY`
  - `SLACK_WEBHOOK_URL` (bildirim için, opsiyonel)
- [ ] Tüm ekip üyeleri Collaborator olarak ekle

#### Kabul Kriterleri

- [ ] `github.com/<org>/dreamcloud` erişilebilir (private)
- [ ] Branch korumaları aktif (test: `develop`'a direkt push → hata alınmalı)
- [ ] Tüm ekip üyeleri Collaborator olarak eklendi
- [ ] PR şablonu çalışıyor (yeni PR aç ve şablon geldiğini doğrula)
- [ ] `git log --oneline` → en az 1 commit (`chore: initial monorepo setup`)

---

### TASK-002 — NestJS API Proje İskeleti

**Atanan:** Backend Geliştirici 1  
**Tahmin:** 3 saat  
**Öncelik:** P0  
**Bağımlılık:** TASK-001

#### Yapılacaklar

```bash
# NestJS CLI ile proje oluştur
nest new dreamcloud-api --package-manager npm --strict

# Temel bağımlılıkları ekle
npm install @nestjs/config @nestjs/typeorm typeorm pg
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install @nestjs/throttler @nestjs/bull bull ioredis
npm install @nestjs/swagger swagger-ui-express
npm install class-validator class-transformer
npm install helmet compression
npm install @aws-sdk/client-ses @aws-sdk/client-s3
npm install bcrypt
npm install -D @types/bcrypt @types/passport-jwt @types/bull
```

- [ ] `tsconfig.json` strict mode ayarla (CODING_STANDARDS.md'den)
- [ ] `.eslintrc.js` yapılandır (CODING_STANDARDS.md'den)
- [ ] `.prettierrc` yapılandır (CODING_STANDARDS.md'den)
- [ ] Husky + lint-staged kur (pre-commit hook)
- [ ] `nest-cli.json` yapılandır
- [ ] REPOSITORY_STRUCTURE.md'deki dizin yapısını oluştur
- [ ] `AppModule`'u yapılandır (Config, TypeORM, ThrottlerModule)
- [ ] Global exception filter ekle (`src/common/filters/http-exception.filter.ts`)
- [ ] Global transform interceptor ekle (response format standardizasyonu)
- [ ] Global validation pipe ekle
- [ ] Health check controller ekle (`GET /health`)
- [ ] Swagger yapılandır (`/api/docs` endpoint)
- [ ] `src/config/configuration.ts` oluştur (Joi validation ile)

#### Kabul Kriterleri

- [ ] `npm run start:dev` → uygulama ayağa kalkıyor
- [ ] `npm run lint` → hata yok
- [ ] `npm run test` → geçiyor
- [ ] `npm run build` → dist/ oluşuyor
- [ ] `GET /health` → `{ "status": "ok", "timestamp": "..." }`
- [ ] `GET /api/docs` → Swagger UI görüntüleniyor
- [ ] Pre-commit hook çalışıyor (bilerek lint hatası gir → commit reddediliyor)

#### `.env.example` İçeriği (Oluşturulmalı)

```bash
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=dreamcloud_dev
DATABASE_USER=dreamcloud
DATABASE_PASSWORD=
DATABASE_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT (RS256 — dosya yolu veya base64 encoded)
JWT_PRIVATE_KEY_PATH=./jwt-private.key
JWT_PUBLIC_KEY_PATH=./jwt-public.key
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=30d

# AWS
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SES_FROM_EMAIL=noreply@dreamcloud.app

# NLP Service
NLP_SERVICE_URL=http://localhost:8000

# OpenAI (Moderation API)
OPENAI_API_KEY=

# Throttle
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

---

### TASK-003 — Docker Compose Kurulumu

**Atanan:** Backend Geliştirici 2  
**Tahmin:** 3 saat  
**Öncelik:** P0  
**Bağımlılık:** TASK-001

#### Yapılacaklar

- [ ] `docker-compose.yml` oluştur:
  - PostgreSQL 16 + pgvector + pg_trgm
  - Redis 7
  - pgAdmin 4 (geliştirme UI)
  - NestJS API (hot reload ile)
  - Volume'lar (veri kalıcılığı)
  - Health check'ler
- [ ] `docker-compose.test.yml` oluştur (izole test DB)
- [ ] `Dockerfile.dev` oluştur (API — hot reload)
- [ ] `Dockerfile` oluştur (API — production multi-stage build)

#### `docker-compose.yml` Hedef Yapısı

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: dreamcloud_dev
      POSTGRES_USER: dreamcloud
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    ports: ['5432:5432']
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init-extensions.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U dreamcloud']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']

  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: dev@dreamcloud.app
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD}
    ports: ['5050:80']
    depends_on:
      postgres:
        condition: service_healthy

  api:
    build:
      context: .
      dockerfile: docker/Dockerfile.dev
    ports: ['3000:3000']
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  postgres_data:
  redis_data:
```

- [ ] `docker/init-extensions.sql` oluştur:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
```

#### Kabul Kriterleri

- [ ] `docker compose up -d` → tüm servisler healthy
- [ ] `docker compose ps` → tüm servisler Up durumda
- [ ] pgAdmin'e `http://localhost:5050` den erişilebiliyor
- [ ] PostgreSQL'e `localhost:5432` den bağlanılabiliyor
- [ ] Redis'e `localhost:6379` den bağlanılabiliyor
- [ ] pgvector uzantısı kurulu: `SELECT * FROM pg_extension WHERE extname = 'pgvector';`
- [ ] `docker compose down && docker compose up -d` → veri korunuyor (volume)

---

### TASK-004 — TypeORM ve İlk Migrations

**Atanan:** Backend Geliştirici 1  
**Tahmin:** 4 saat  
**Öncelik:** P0  
**Bağımlılık:** TASK-002, TASK-003

#### Yapılacaklar

- [ ] TypeORM yapılandırmasını tamamla (`src/config/database.config.ts`)
- [ ] Migration CLI script'lerini `package.json`'a ekle:

```json
{
  "scripts": {
    "migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/config/database.config.ts",
    "migration:run": "typeorm-ts-node-commonjs migration:run -d src/config/database.config.ts",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/config/database.config.ts",
    "migration:show": "typeorm-ts-node-commonjs migration:show -d src/config/database.config.ts"
  }
}
```

- [ ] Enum tiplerini oluştur (DATABASE_SCHEMA.md'den):
  - `dream_category`
  - `dream_visibility`
  - `notification_type`
  - `report_reason`
  - `moderation_status`
  - `oauth_provider`
  - `tag_type`
- [ ] Sprint 1 entity'lerini oluştur:
  - `User` entity (`src/modules/users/entities/user.entity.ts`)
  - `UserProfile` entity
  - `UserSettings` entity
- [ ] Migration dosyasını üret ve çalıştır:
  - `{timestamp}-create-enums-and-user-tables`
  - `users` tablosu
  - `user_profiles` tablosu
  - `user_settings` tablosu

#### `users` Tablosu (İlk Migration)

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),            -- NULL: OAuth kullanıcılar
  role          VARCHAR(20) DEFAULT 'user',
  is_active     BOOLEAN DEFAULT true,
  is_email_verified BOOLEAN DEFAULT false,
  failed_login_attempts INT DEFAULT 0,
  locked_until  TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ,             -- Soft delete
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
```

#### Kabul Kriterleri

- [ ] `npm run migration:run` → hata yok
- [ ] `npm run migration:show` → tüm migration'lar "applied" görünüyor
- [ ] pgAdmin'de tablolar görünüyor (`users`, `user_profiles`, `user_settings`)
- [ ] `npm run migration:revert` → tablolar siliniyor
- [ ] `npm run migration:run` → tekrar oluşturuluyor (idempotent)

---

### TASK-005 — GitHub Actions CI/CD Pipeline

**Atanan:** Backend Geliştirici 2  
**Tahmin:** 4 saat  
**Öncelik:** P0  
**Bağımlılık:** TASK-001, TASK-002

#### Yapılacaklar

- [ ] `.github/workflows/ci.yml` oluştur:

```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [develop]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_DB: dreamcloud_test
          POSTGRES_USER: dreamcloud
          POSTGRES_PASSWORD: test_password
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    env:
      NODE_ENV: test
      DATABASE_HOST: localhost
      DATABASE_PORT: 5432
      DATABASE_NAME: dreamcloud_test
      DATABASE_USER: dreamcloud
      DATABASE_PASSWORD: test_password
      REDIS_HOST: localhost
      REDIS_PORT: 6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run migration:run
      - run: npm run test:cov
      - uses: codecov/codecov-action@v4 # Coverage raporlama

  build:
    runs-on: ubuntu-latest
    needs: [lint-and-type-check, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

- [ ] `.github/workflows/deploy-staging.yml` oluştur (develop → staging ECS deploy)
- [ ] `package.json`'a eksik script'leri ekle:

```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

#### Kabul Kriterleri

- [ ] `develop`'a push → CI otomatik tetikleniyor
- [ ] PR açılınca → CI check'leri PR'da görünüyor
- [ ] Bilerek lint hatası gir → CI başarısız oluyor
- [ ] Tüm check'ler geçince → PR merge edilebilir durumda

---

### TASK-006 — AWS Altyapı Kurulumu

**Atanan:** Backend Geliştirici 2  
**Tahmin:** 4 saat  
**Öncelik:** P0  
**Bağımlılık:** TASK-001

#### Yapılacaklar

**IAM:**

- [ ] `dreamcloud-dev` IAM kullanıcısı oluştur (programmatic access)
- [ ] CI/CD IAM kullanıcısı oluştur (`dreamcloud-cicd`)
- [ ] MCP read-only IAM kullanıcısı oluştur (`dreamcloud-mcp-readonly`)
- [ ] Gerekli policy'leri tanımla ve ekle

**ECR (Elastic Container Registry):**

- [ ] `dreamcloud-api` ECR reposu oluştur
- [ ] `dreamcloud-nlp` ECR reposu oluştur

**ECS Fargate (Staging):**

- [ ] VPC + subnet kurulumu
- [ ] Security group tanımla:
  - API: 3000 portu (ALB'den)
  - DB: 5432 portu (ECS task'tan)
  - Redis: 6379 portu (ECS task'tan)
- [ ] ECS Cluster oluştur (`dreamcloud-staging`)
- [ ] Task Definition oluştur (api)
- [ ] Service oluştur (api, 1 task)
- [ ] Application Load Balancer (ALB) oluştur

**RDS PostgreSQL (Staging):**

- [ ] `db.t3.micro` (staging için yeterli)
- [ ] Multi-AZ: false (staging)
- [ ] pgvector extension etkinleştirme parametresi
- [ ] Security group: yalnızca ECS task'ından erişim

**ElastiCache Redis (Staging):**

- [ ] `cache.t3.micro`
- [ ] Security group: yalnızca ECS task'ından erişim

**AWS Secrets Manager:**

- [ ] `dreamcloud/staging/db` — DB credentials
- [ ] `dreamcloud/staging/jwt/private-key` — RS256 private key
- [ ] `dreamcloud/staging/jwt/public-key` — RS256 public key
- [ ] `dreamcloud/staging/openai` — OpenAI API key

#### Kabul Kriterleri

- [ ] `aws ecs describe-clusters --clusters dreamcloud-staging` → ACTIVE
- [ ] Staging URL'sine `GET /health` → 200 OK
- [ ] RDS bağlantısı test: `psql -h {rds-endpoint} -U dreamcloud -d dreamcloud_staging`
- [ ] GitHub Actions Secrets güncellendi (AWS credentials, ECR registry)

---

### TASK-007 — JWT RS256 Key Üretimi

**Atanan:** Backend Geliştirici 1  
**Tahmin:** 1 saat  
**Öncelik:** P0  
**Bağımlılık:** TASK-006

#### Yapılacaklar

```bash
# Key pair üret
openssl genrsa -out jwt-private.key 2048
openssl rsa -in jwt-private.key -pubout -out jwt-public.key

# Doğrula
openssl rsa -in jwt-private.key -check -noout
```

- [ ] Private key → AWS Secrets Manager'a yükle (staging + dev)
- [ ] Public key → AWS Secrets Manager'a yükle
- [ ] Yerel `.env` dosyasına key path ekle
- [ ] `jwt-private.key` ve `jwt-public.key` `.gitignore`'da olduğunu doğrula

#### Kabul Kriterleri

- [ ] `openssl rsa -in jwt-private.key -check -noout` → "RSA key ok"
- [ ] AWS Secrets Manager'da `dreamcloud/dev/jwt/private-key` mevcut
- [ ] `git status` → key dosyaları untracked değil (gitignore çalışıyor)

---

### TASK-008 — Expo Mobil Proje İskeleti

**Atanan:** Mobil Geliştirici  
**Tahmin:** 4 saat  
**Öncelik:** P0  
**Bağımlılık:** TASK-001

#### Yapılacaklar

```bash
# Monorepo içindeki mobil uygulama: apps/mobile/ zaten mevcut
# Bağımlılıkları kur (monorepo kökünden)
cd apps/mobile
npx expo install expo-router expo-constants expo-linking expo-font
npx expo install expo-secure-store expo-notifications expo-av
npx expo install react-native-safe-area-context react-native-screens
npm install @tanstack/react-query axios zustand react-hook-form
npm install @shopify/flash-list date-fns i18next react-i18next
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

- [ ] `app.json` yapılandır (bundle ID, scheme, splash screen)
- [ ] `eas.json` oluştur (EAS Build config)
- [ ] REPOSITORY_STRUCTURE.md'deki dizin yapısını oluştur
- [ ] TypeScript strict mode (`tsconfig.json`)
- [ ] ESLint + Prettier yapılandır
- [ ] React Query client kurulumu (`src/api/client.ts`)
- [ ] Axios instance + interceptors (`src/api/client.ts`)
- [ ] Zustand auth store (`src/store/auth.store.ts`)
- [ ] SecureStore wrapper (`src/utils/storage.ts`)
- [ ] Expo Router layout yapısını kur:
  - `app/_layout.tsx` (root layout, providers)
  - `app/(auth)/_layout.tsx`
  - `app/(auth)/login.tsx` (statik ekran — sadece görsel, API yok)
  - `app/(auth)/register.tsx` (statik ekran)
  - `app/(tabs)/_layout.tsx`
  - `app/(tabs)/index.tsx` (boş feed ekranı)

#### Kabul Kriterleri

- [ ] `npx expo start` → QR kod ve emülatörde çalışıyor
- [ ] iOS Simulator'da giriş ekranı görüntüleniyor
- [ ] Android Emülatörde giriş ekranı görüntüleniyor
- [ ] `npm run lint` → hata yok
- [ ] TypeScript strict → hata yok
- [ ] `app.json`'da bundle ID tanımlı

---

### TASK-009 — Python FastAPI NLP İskeleti

**Atanan:** ML/NLP Mühendisi  
**Tahmin:** 3 saat  
**Öncelik:** P1 (Sprint 5'te kullanılacak, ama iskelet Sprint 1'de)  
**Bağımlılık:** TASK-001

#### Yapılacaklar

```bash
# Monorepo içindeki NLP servisi: apps/nlp/ zaten mevcut
cd apps/nlp
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

- [ ] Mevcut `apps/nlp/` dizin yapısını doğrula
- [ ] `pyproject.toml` oluştur (ruff, mypy, pytest config — CODING_STANDARDS.md'den)
- [ ] `app/main.py` oluştur (FastAPI app, lifespan, CORS)
- [ ] `app/config.py` oluştur (Pydantic Settings)
- [ ] `app/api/routes/health.py` → `GET /health`
- [ ] `app/api/routes/embed.py` → `POST /internal/embed` (stub — Sprint 5'te implement)
- [ ] `app/api/routes/match.py` → `POST /internal/match` (stub — Sprint 5'te implement)
- [ ] `Dockerfile` ve `Dockerfile.dev`
- [ ] `.github/workflows/ci.yml` (ruff + mypy + pytest)
- [ ] `docker-compose.yml`'e nlp servisi ekle
- [ ] `.env.example` oluştur

#### Kabul Kriterleri

- [ ] `uvicorn app.main:app --reload` → çalışıyor
- [ ] `GET /health` → `{ "status": "ok" }`
- [ ] `ruff check .` → hata yok
- [ ] `mypy .` → hata yok
- [ ] `pytest` → geçiyor (stub testler)
- [ ] Docker image build ediliyor: `docker build -f apps/nlp/docker/Dockerfile -t dreamcloud-nlp apps/nlp/`

---

### TASK-010 — Geliştirici Ortam Dokümantasyonu

**Atanan:** Ürün/Tasarım  
**Tahmin:** 2 saat  
**Öncelik:** P1  
**Bağımlılık:** TASK-002, TASK-003, TASK-007, TASK-008

#### Yapılacaklar

- [ ] Her repo için `README.md` tamamla:
  - Proje açıklaması
  - Ön gereksinimler (Node.js, Python, Docker, AWS CLI)
  - İlk kurulum adımları
  - Geliştirme ortamı başlatma
  - Kullanılabilir npm/python komutları
  - Katkı rehberi (DEVELOPMENT_RULES.md'e link)
- [ ] `PROJECT_STATE.md` güncelle: Sprint 1 tamamlanan görevleri işaretle
- [ ] Sprint 2 GitHub Issue'larını oluştur (auth endpoint'leri)

#### Kabul Kriterleri

- [ ] Yeni bir ekip üyesi README.md'yi okuyarak 30 dakikada ortamı kurabiliyor
- [ ] `PROJECT_STATE.md`'de Sprint 1 "✅ Tamamlandı" olarak işaretli

---

## SPRINT 1 BAĞIMLILIK GRAFİĞİ

```
TASK-001 (GitHub Repo)
    ↓
    ├── TASK-002 (NestJS İskeleti)
    │       ↓
    │       ├── TASK-004 (TypeORM + Migrations) ← TASK-003'e bağımlı
    │       └── TASK-005 (CI/CD Pipeline)
    │
    ├── TASK-003 (Docker Compose)
    │       ↓
    │       └── TASK-004 (TypeORM + Migrations)
    │
    ├── TASK-006 (AWS Altyapı)
    │       ↓
    │       └── TASK-007 (JWT Key Üretimi)
    │
    ├── TASK-008 (Expo Mobil İskeleti)      ← Bağımsız paralel
    └── TASK-009 (FastAPI NLP İskeleti)     ← Bağımsız paralel

TASK-010 (Dokümantasyon) ← Tüm görevler tamamlandıktan sonra
```

### Paralel Çalışma Planı

```
Gün 1–2:  TASK-001 (herkes bekler) → TASK-002 + TASK-003 + TASK-008 + TASK-009 paralel
Gün 3–4:  TASK-004 + TASK-005 + TASK-006 paralel
Gün 5–6:  TASK-007 (TASK-006'ya bağlı) + CI testleri
Gün 7–8:  Entegrasyon testi + TASK-010 (dokümantasyon)
Gün 9–10: Sprint review hazırlık + buffer
```

---

## SPRINT 1 RİSKLERİ

| Risk                                        | Olasılık | Etki   | Önlem                                                  |
| ------------------------------------------- | -------- | ------ | ------------------------------------------------------ |
| AWS hesap limitleri (Fargate, RDS)          | Orta     | Yüksek | Limit artışı talebi önceden gönder                     |
| pgvector Docker image boyutu                | Düşük    | Düşük  | Cache'e al, alternative: pgvector extension manuel kur |
| ECS task definition karmaşıklığı            | Orta     | Orta   | Terraform veya AWS CDK değerlendir                     |
| Expo Router v3 migration sorunları          | Düşük    | Orta   | Expo dokümanını önceden incele                         |
| Python sen-transformer model indirme süresi | Yüksek   | Düşük  | Docker layer'a cache'le                                |

---

## SPRINT 1 BİTİŞ KRİTERİ (DEFINITION OF DONE)

Sprint tamamlandı sayılır ANCAK VE ANCAK:

```
Repo:
  ✓ dreamcloud Turborepo monorepo GitHub'da mevcut (private)
  ✓ main + develop branch'leri korumalı
  ✓ Tüm ekip üyeleri Collaborator olarak eklendi

Yerel Geliştirme:
  ✓ docker compose up -d → tüm servisler healthy
  ✓ GET localhost:3000/health → { "status": "ok" }
  ✓ pgAdmin'de users, user_profiles, user_settings tabloları var
  ✓ npx expo start → Giriş ekranı emülatörde görüntüleniyor
  ✓ uvicorn app.main:app → GET /health çalışıyor

CI/CD:
  ✓ Her PR'da GitHub Actions CI çalışıyor
  ✓ Lint + type-check + test geçmeden merge engelleniyor

Staging:
  ✓ GET {staging-url}/health → 200 OK (AWS ECS Fargate)
  ✓ staging.dreamcloud.app ALB arkasına yönlendiriyor

Güvenlik:
  ✓ JWT RS256 key pair üretildi ve Secrets Manager'da
  ✓ Hiçbir secret git geçmişinde yok (git log --all -S "password" kontrol et)
  ✓ branch korumaları aktif
```

---

## SPRINT 2 HAZIRLIĞI (Sprint 1 Biterken)

Sprint 1 biterken şunlar hazırlanmalı:

- [ ] Sprint 2 GitHub Issue'ları oluşturuldu (auth endpoint'leri — 11 issue)
- [ ] AWS SES'te doğrulama domain ayarlandı (e-posta doğrulama için)
- [ ] Google Cloud Console'da OAuth client oluşturuldu (Google OAuth için)
- [ ] Apple Developer hesabında Sign In with Apple yapılandırıldı
- [ ] `PROJECT_STATE.md` güncellendi

---

_Bu doküman SPRINT_1_TASKS.md olup Sprint 1 görevlerini ve kabul kriterlerini kapsar._  
_Her görev tamamlandığında checkbox'lar işaretlenmeli ve PROJECT_STATE.md güncellenmelidir._
