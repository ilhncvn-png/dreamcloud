# SESSION_HANDOFF.md

## DreamCloud — Oturum Devir Notu

> Bu dosya oturumlar arası bağlam aktarımı için kullanılır.
> Her oturum sonunda güncellenir. Claude Code tarafından tutulur.

**Son Güncelleme:** 2026-06-15  
**Mevcut Branch:** `develop`  
**Son Commit:** `c74fad5` — fix(infra): add --ignore-scripts to Dockerfile.dev to skip husky

---

## SIRADAKI GÖREV: TASK-004

### Hedef

`users`, `user_profiles`, `user_settings` tablolarını TypeORM entity + migration ile oluşturmak.

### Oluşturulacak 5 dosya

| Dosya                                                                      | İçerik                              |
| -------------------------------------------------------------------------- | ----------------------------------- |
| `apps/api/src/common/enums/database.enums.ts`                              | 7 PostgreSQL enum → TypeScript enum |
| `apps/api/src/modules/users/entities/user.entity.ts`                       | `users` tablosu                     |
| `apps/api/src/modules/users/entities/user-profile.entity.ts`               | `user_profiles` tablosu             |
| `apps/api/src/modules/users/entities/user-settings.entity.ts`              | `user_settings` tablosu             |
| `apps/api/src/database/migrations/{timestamp}-CreateEnumsAndUserTables.ts` | SQL migration                       |

### Enum değerleri (DATABASE_SCHEMA.md'den — PG ile birebir eşleşmeli)

```typescript
// dream_category
'lucid' | 'beautiful' | 'nightmare' | 'normal';

// dream_visibility
'private' | 'followers' | 'public';

// notification_type
'dream_match' | 'like' | 'comment' | 'follow' | 'interpretation' | 'system';

// report_reason
'inappropriate' | 'hate_speech' | 'fake_content' | 'spam' | 'other';

// moderation_status
'pending' | 'approved' | 'rejected' | 'escalated';

// oauth_provider
'google' | 'apple';

// tag_type
'place' | 'person' | 'object' | 'emotion' | 'brand' | 'other';
```

### `users` tablosu şeması (DATABASE_SCHEMA.md + SPRINT_1_TASKS.md)

```sql
id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
email                 VARCHAR(255) UNIQUE NOT NULL
password_hash         VARCHAR(255)           -- NULL: OAuth kullanıcısı
username              VARCHAR(50)  UNIQUE NOT NULL
is_email_verified     BOOLEAN DEFAULT FALSE
is_active             BOOLEAN DEFAULT TRUE
role                  VARCHAR(20) DEFAULT 'user'  -- 'user' | 'moderator' | 'admin'
failed_login_attempts INTEGER DEFAULT 0
locked_until          TIMESTAMPTZ
last_login_at         TIMESTAMPTZ
deleted_at            TIMESTAMPTZ            -- soft delete
created_at            TIMESTAMPTZ DEFAULT NOW()
updated_at            TIMESTAMPTZ DEFAULT NOW()
```

### `user_profiles` tablosu şeması

```sql
id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
display_name     VARCHAR(100)
bio              VARCHAR(200)
avatar_url       VARCHAR(500)
location_city    VARCHAR(100)
location_country VARCHAR(100)
is_public        BOOLEAN DEFAULT TRUE
dream_count      INTEGER DEFAULT 0
follower_count   INTEGER DEFAULT 0
following_count  INTEGER DEFAULT 0
created_at       TIMESTAMPTZ DEFAULT NOW()
updated_at       TIMESTAMPTZ DEFAULT NOW()
UNIQUE(user_id)
```

### `user_settings` tablosu şeması

```sql
id                       UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
notify_dream_match       BOOLEAN DEFAULT TRUE
notify_likes             BOOLEAN DEFAULT TRUE
notify_comments          BOOLEAN DEFAULT TRUE
notify_follows           BOOLEAN DEFAULT TRUE
morning_reminder_enabled BOOLEAN DEFAULT TRUE
morning_reminder_time    TIME DEFAULT '08:00:00'
morning_reminder_timezone VARCHAR(50) DEFAULT 'Europe/Istanbul'
default_dream_visibility  dream_visibility DEFAULT 'followers'
allow_dream_in_ads        BOOLEAN DEFAULT FALSE
allow_data_research       BOOLEAN DEFAULT FALSE
language                  VARCHAR(10) DEFAULT 'tr'
created_at                TIMESTAMPTZ DEFAULT NOW()
updated_at                TIMESTAMPTZ DEFAULT NOW()
UNIQUE(user_id)
```

### Migration adımları

```bash
# 1. Entity'leri oluşturduktan sonra:
npm run db:migrate   # (root'tan, infra:up servisler çalışıyor olmalı)

# 2. Doğrula:
docker exec dreamcloud-postgres psql -U dreamcloud -d dreamcloud_dev \
  -c "\dt" -c "SELECT extname FROM pg_extension;"

# 3. Type check:
npx turbo run type-check --filter=@dreamcloud/api
```

---

## DOCKER ORTAMI

Servisler çalışıyor:

```
dreamcloud-postgres  → localhost:5432  (healthy)
dreamcloud-redis     → localhost:6379  (healthy)
dreamcloud-pgadmin   → http://localhost:5050
dreamcloud-mailhog   → http://localhost:8025
```

Kurulu PG extension'ları: `vector 0.8.2`, `pg_trgm 1.6`, `uuid-ossp 1.1`

`apps/api/.env` mevcut — `.env.example`'dan kopyalandı.

**Önemli:** `DATABASE_URL` `.env`'de `localhost` kullanıyor (local geliştirme için doğru).
Docker içinde API çalıştırmak istersen compose'daki `DATABASE_URL` override'ı `postgres` hostname kullanıyor.

---

## MEVCUT REPO DURUMU

```
Branch:   develop
Remote:   git@github.com:ilhncvn-png/dreamcloud.git

Commit geçmişi:
c74fad5  fix(infra): add --ignore-scripts to Dockerfile.dev to skip husky
a5f1854  chore(infra): upgrade to Node 22 and add api service to dev compose
0b05411  feat(api): add exception filter, transform interceptor, and health endpoint
68df513  docs: add GitHub setup guide, production README, and CONTRIBUTING
f99d227  chore: initial monorepo setup
```

---

## SPRINT 1 TASK DURUMU

| TASK     | Açıklama                               | Durum           |
| -------- | -------------------------------------- | --------------- |
| TASK-001 | GitHub repo + branch protection        | ✅ Tamamlandı   |
| TASK-002 | NestJS API iskeleti                    | ✅ Tamamlandı   |
| TASK-003 | Docker Compose                         | ✅ Tamamlandı   |
| TASK-004 | TypeORM entity + migration             | ⏳ **SIRADAKI** |
| TASK-005 | CI/CD doğrulama                        | ⏳ Bekliyor     |
| TASK-006 | AWS altyapı                            | ⏳ Bekliyor     |
| TASK-007 | JWT key üretimi                        | ⏳ Bekliyor     |
| TASK-008 | Expo mobil iskelet                     | ⏳ Bekliyor     |
| TASK-009 | FastAPI NLP (zaten büyük ölçüde hazır) | ⏳ Bekliyor     |
| TASK-010 | Dokümantasyon                          | ⏳ Bekliyor     |

---

## ÖNEMLİ TEKNİK NOTLAR

### TypeORM dual DataSource pattern

- `apps/api/src/config/database.config.ts` → `AppDataSource` (CLI için)
- `apps/api/src/app.module.ts` → `TypeOrmModule.forRootAsync` (NestJS için)
- Migration komutu: `npm run db:migrate` (kökten) veya `cd apps/api && npm run migration:run`

### ESLint

- Root `eslint.config.js` (flat config, v9) — FlatCompat ile `packages/eslint-config/index.js` extend ediyor
- Özel kurallar: `dot-notation allowIndexSignaturePropertyAccess`, `no-extraneous-class allowWithDecorator`, `restrict-template-expressions allowNumber`

### Commit scope'ları

Commitlint izin verilen scope'lar: `auth, dreams, users, feed, social, search, notifications, moderation, nlp, mobile, db, infra, api, config, deps, ci, shared`

### Güvenlik kuralları

- `apps/api/keys/` gitignore'da — JWT key'leri asla commit edilmez
- `.env` dosyaları gitignore'da — terminal/chat'e hiçbir zaman yazdırılmaz
- Hassas bilgiler (API key, token) ekrana yazdırılmaz

---

## BEKLEYİŞ (Manuel GitHub Adımları)

Henüz yapılmamış manuel işlemler (docs/GITHUB_SETUP.md'de detaylı):

1. **Branch protection** — Settings → Branches → `main` (2 reviewer) ve `develop` (1 reviewer)
2. **Secrets** — En azından `CODECOV_TOKEN`, `JWT_TEST_PRIVATE_KEY`, `JWT_TEST_PUBLIC_KEY`
3. **Default branch** — `develop` olarak ayarla

---

_Bu dosya her oturum sonunda güncellenir._
