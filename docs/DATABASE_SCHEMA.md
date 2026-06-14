# Database Schema

## DreamCloud — Veritabanı Şeması

**Versiyon:** 1.0 | **Tarih:** 2026-06-14  
**Veritabanı:** PostgreSQL 16 + pgvector + pg_trgm

---

## Genel Prensipler

- Tüm tablolar `UUID` primary key kullanır (`gen_random_uuid()`)
- Tüm tablolarda `created_at` ve `updated_at` zaman damgası bulunur
- Soft delete: kritik tablolarda `deleted_at` (NULL = aktif)
- Enum tipleri PostgreSQL `TYPE` olarak tanımlanır
- Tüm foreign key ilişkileri `ON DELETE` davranışıyla belirtilir
- Her tablo için index stratejisi tanımlanmıştır

---

## Enum Tanımları

```sql
-- Rüya kategorisi
CREATE TYPE dream_category AS ENUM (
  'lucid',      -- Lucid / Berrak rüya
  'beautiful',  -- Güzel rüya
  'nightmare',  -- Kabus
  'normal'      -- Normal rüya
);

-- Rüya görünürlüğü
CREATE TYPE dream_visibility AS ENUM (
  'private',      -- Yalnızca sahibi
  'followers',    -- Takipçiler
  'public'        -- Herkes
);

-- Bildirim türü
CREATE TYPE notification_type AS ENUM (
  'dream_match',    -- Rüya eşleşmesi
  'like',           -- Beğeni
  'comment',        -- Yorum
  'follow',         -- Yeni takipçi
  'interpretation', -- Yorum yanıtı (V2)
  'system'          -- Sistem mesajı
);

-- Rapor kategorisi
CREATE TYPE report_reason AS ENUM (
  'inappropriate',  -- Uygunsuz içerik
  'hate_speech',    -- Nefret söylemi
  'fake_content',   -- Sahte içerik
  'spam',           -- Spam
  'other'           -- Diğer
);

-- Moderasyon durumu
CREATE TYPE moderation_status AS ENUM (
  'pending',   -- İnceleme bekliyor
  'approved',  -- Onaylandı
  'rejected',  -- Reddedildi
  'escalated'  -- Üst kademeye iletildi
);

-- OAuth sağlayıcı
CREATE TYPE oauth_provider AS ENUM (
  'google',
  'apple'
);

-- Etiket türü
CREATE TYPE tag_type AS ENUM (
  'place',    -- Yer / Lokasyon
  'person',   -- Kişi
  'object',   -- Nesne
  'emotion',  -- Duygu
  'brand',    -- Marka
  'other'     -- Diğer
);
```

---

## ÇEKIRDEK TABLOLAR

### users

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255),          -- NULL: yalnızca OAuth kullanıcısı
  username        VARCHAR(50)  UNIQUE NOT NULL,
  is_email_verified BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  role            VARCHAR(20) DEFAULT 'user',  -- 'user', 'moderator', 'admin'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,           -- Soft delete
  last_login_at   TIMESTAMPTZ
);

-- Index'ler
CREATE INDEX idx_users_email     ON users(email)    WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username  ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_active    ON users(is_active) WHERE deleted_at IS NULL;
```

### user_profiles

```sql
CREATE TABLE user_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name    VARCHAR(100),
  bio             VARCHAR(200),
  avatar_url      VARCHAR(500),
  location_city   VARCHAR(100),          -- Opsiyonel, kullanıcı girer
  location_country VARCHAR(100),
  is_public       BOOLEAN DEFAULT TRUE,  -- FALSE: profil gizli
  dream_count     INTEGER DEFAULT 0,     -- Denormalize sayaç (hız için)
  follower_count  INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
```

### user_settings

```sql
CREATE TABLE user_settings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Bildirim tercihleri
  notify_dream_match        BOOLEAN DEFAULT TRUE,
  notify_likes              BOOLEAN DEFAULT TRUE,
  notify_comments           BOOLEAN DEFAULT TRUE,
  notify_follows            BOOLEAN DEFAULT TRUE,
  morning_reminder_enabled  BOOLEAN DEFAULT TRUE,
  morning_reminder_time     TIME DEFAULT '08:00:00',
  morning_reminder_timezone VARCHAR(50) DEFAULT 'Europe/Istanbul',
  -- Gizlilik
  default_dream_visibility  dream_visibility DEFAULT 'followers',
  allow_dream_in_ads        BOOLEAN DEFAULT FALSE, -- Reklam hedefleme onayı
  allow_data_research       BOOLEAN DEFAULT FALSE, -- Araştırma veri onayı
  -- Dil
  language                  VARCHAR(10) DEFAULT 'tr',
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### oauth_accounts

```sql
CREATE TABLE oauth_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        oauth_provider NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  access_token    TEXT,                  -- Şifreli saklanır
  refresh_token   TEXT,                  -- Şifreli saklanır
  token_expires_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
```

### refresh_tokens

```sql
CREATE TABLE refresh_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash
  device_id       UUID REFERENCES devices(id) ON DELETE SET NULL,
  ip_address      INET,
  user_agent      TEXT,
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,           -- NULL: aktif
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id   ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash      ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires   ON refresh_tokens(expires_at);
```

### devices

```sql
CREATE TABLE devices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  push_token      VARCHAR(500) UNIQUE NOT NULL,
  platform        VARCHAR(10) NOT NULL,  -- 'ios', 'android'
  device_model    VARCHAR(100),
  os_version      VARCHAR(20),
  app_version     VARCHAR(20),
  is_active       BOOLEAN DEFAULT TRUE,
  last_used_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devices_user_id ON devices(user_id) WHERE is_active = TRUE;
```

---

## RÜYA TABLOLARI

### dreams

```sql
CREATE TABLE dreams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(120),
  content         TEXT NOT NULL,
  category        dream_category NOT NULL DEFAULT 'normal',
  visibility      dream_visibility NOT NULL DEFAULT 'followers',
  is_draft        BOOLEAN DEFAULT FALSE,
  -- Sayaçlar (denormalize, hız için)
  like_count      INTEGER DEFAULT 0,
  comment_count   INTEGER DEFAULT 0,
  match_count     INTEGER DEFAULT 0,
  save_count      INTEGER DEFAULT 0,
  -- Moderasyon
  is_moderated    BOOLEAN DEFAULT FALSE,  -- TRUE: otomatik kontrol geçildi
  moderation_score FLOAT,                 -- OpenAI Moderation API skoru
  is_hidden       BOOLEAN DEFAULT FALSE,  -- Moderatör kaldırdı
  -- Zaman
  dreamed_at      TIMESTAMPTZ DEFAULT NOW(), -- Kullanıcının rüya gördüğü an
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ             -- Soft delete
);

-- Feed için composite index (en kritik sorgu)
CREATE INDEX idx_dreams_feed
  ON dreams(created_at DESC, visibility, is_hidden, deleted_at)
  WHERE visibility = 'public' AND is_hidden = FALSE AND deleted_at IS NULL;

-- Kullanıcı rüya listesi
CREATE INDEX idx_dreams_user_id
  ON dreams(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Full-text search (Türkçe + İngilizce)
CREATE INDEX idx_dreams_content_fts
  ON dreams USING GIN(to_tsvector('simple', coalesce(title,'') || ' ' || content));

-- pg_trgm fuzzy search
CREATE INDEX idx_dreams_content_trgm
  ON dreams USING GIN(content gin_trgm_ops);
```

### dream_embeddings

```sql
CREATE TABLE dream_embeddings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id        UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  embedding       vector(384),    -- all-MiniLM-L6-v2 boyutu; OpenAI ada-002 için 1536
  model_version   VARCHAR(50) NOT NULL,  -- 'sentence-transformers/all-MiniLM-L6-v2'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dream_id)
);

-- pgvector HNSW index (approximate nearest neighbor, yüksek hız)
CREATE INDEX idx_dream_embeddings_vector
  ON dream_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### dream_matches

```sql
CREATE TABLE dream_matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id        UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  matched_dream_id UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  similarity_score FLOAT NOT NULL,       -- 0.0 - 1.0
  tag_overlap_score FLOAT DEFAULT 0,     -- Etiket örtüşme katkısı
  semantic_score  FLOAT DEFAULT 0,       -- Vektör benzerlik katkısı
  final_score     FLOAT NOT NULL,        -- Ağırlıklı final skor
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CHECK (dream_id != matched_dream_id),
  UNIQUE(dream_id, matched_dream_id)
);

CREATE INDEX idx_dream_matches_dream_id
  ON dream_matches(dream_id, final_score DESC);
```

### tags

```sql
CREATE TABLE tags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL UNIQUE, -- normalize edilmiş lowercase
  type            tag_type DEFAULT 'other',
  usage_count     INTEGER DEFAULT 0,     -- Denormalize sayaç
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tags_name     ON tags(name);
CREATE INDEX idx_tags_usage    ON tags(usage_count DESC);
CREATE INDEX idx_tags_name_trgm ON tags USING GIN(name gin_trgm_ops);
```

### dream_tags

```sql
CREATE TABLE dream_tags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id        UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  tag_id          UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dream_id, tag_id)
);

CREATE INDEX idx_dream_tags_dream_id ON dream_tags(dream_id);
CREATE INDEX idx_dream_tags_tag_id   ON dream_tags(tag_id);
```

### dream_drafts

```sql
CREATE TABLE dream_drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(120),
  content         TEXT,
  category        dream_category,
  tag_names       TEXT[],                -- Henüz tag tablosuna eklenmemiş
  auto_saved_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dream_drafts_user_id ON dream_drafts(user_id);
```

---

## SOSYAL TABLOLAR

### likes

```sql
CREATE TABLE likes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dream_id        UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, dream_id)
);

CREATE INDEX idx_likes_dream_id ON likes(dream_id);
CREATE INDEX idx_likes_user_id  ON likes(user_id);
```

### comments

```sql
CREATE TABLE comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dream_id        UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES comments(id) ON DELETE CASCADE, -- Nested yorum
  content         VARCHAR(300) NOT NULL,
  is_hidden       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_comments_dream_id  ON comments(dream_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent_id ON comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comments_user_id   ON comments(user_id);
```

### saved_dreams

```sql
CREATE TABLE saved_dreams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dream_id        UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  collection_name VARCHAR(100) DEFAULT 'default',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, dream_id)
);

CREATE INDEX idx_saved_dreams_user_id ON saved_dreams(user_id, created_at DESC);
```

### follows

```sql
CREATE TABLE follows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          VARCHAR(20) DEFAULT 'active', -- 'active', 'pending' (gizli profil için)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CHECK (follower_id != following_id),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX idx_follows_follower_id  ON follows(follower_id)  WHERE status = 'active';
CREATE INDEX idx_follows_following_id ON follows(following_id) WHERE status = 'active';
```

### blocks

```sql
CREATE TABLE blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CHECK (blocker_id != blocked_id),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocks_blocker_id ON blocks(blocker_id);
```

---

## BİLDİRİM TABLOLARI

### notifications

```sql
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  type            notification_type NOT NULL,
  -- Polimorfik referans
  entity_type     VARCHAR(50),           -- 'dream', 'comment', 'match'
  entity_id       UUID,
  -- İçerik
  title           VARCHAR(200) NOT NULL,
  body            VARCHAR(500),
  data            JSONB,                 -- Ekstra payload (deep link vs.)
  -- Durum
  is_read         BOOLEAN DEFAULT FALSE,
  is_pushed       BOOLEAN DEFAULT FALSE, -- Push gönderildi mi
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient
  ON notifications(recipient_id, created_at DESC)
  WHERE is_read = FALSE;
CREATE INDEX idx_notifications_all
  ON notifications(recipient_id, created_at DESC);
```

---

## MODERASYON TABLOLARI

### reports

```sql
CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Raporlanan içerik
  entity_type     VARCHAR(50) NOT NULL,  -- 'dream', 'comment', 'user'
  entity_id       UUID NOT NULL,
  reason          report_reason NOT NULL,
  description     TEXT,                  -- Opsiyonel açıklama
  status          moderation_status DEFAULT 'pending',
  resolved_by     UUID REFERENCES users(id),
  resolved_at     TIMESTAMPTZ,
  resolution_note TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_status     ON reports(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_reports_entity     ON reports(entity_type, entity_id);
```

### user_violations

```sql
CREATE TABLE user_violations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason          TEXT NOT NULL,
  severity        VARCHAR(20) NOT NULL,  -- 'warning', 'temporary_ban', 'permanent_ban'
  ban_until       TIMESTAMPTZ,           -- NULL: kalıcı ban veya uyarı
  issued_by       UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_violations_user_id ON user_violations(user_id);
```

---

## TREND TABLOLARI

### tag_trends

```sql
CREATE TABLE tag_trends (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id          UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  period_start    TIMESTAMPTZ NOT NULL,  -- Trend periyodu başlangıcı
  period_end      TIMESTAMPTZ NOT NULL,
  dream_count     INTEGER NOT NULL,
  unique_user_count INTEGER NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tag_id, period_start)
);

CREATE INDEX idx_tag_trends_period ON tag_trends(period_start DESC, dream_count DESC);
```

---

## V2 EK TABLOLARI

### dream_audio

```sql
-- V2: Sesli rüya girişi
CREATE TABLE dream_audio (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id        UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  s3_key          VARCHAR(500) NOT NULL,   -- AWS S3 object key
  duration_seconds INTEGER,
  file_size_bytes  INTEGER,
  transcript       TEXT,                  -- Speech-to-text çıktısı
  transcript_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'done', 'failed'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dream_id)
);
```

### interpreters

```sql
-- V2: Rüya yorumcuları
CREATE TABLE interpreters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  specialty       VARCHAR(100)[],         -- ['psychological', 'spiritual', 'cultural']
  bio             TEXT,
  is_verified     BOOLEAN DEFAULT FALSE,
  avg_rating      FLOAT DEFAULT 0,
  total_interpretations INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### interpretation_requests

```sql
-- V2: Yorum talepleri
CREATE TABLE interpretation_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id        UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  requester_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interpreter_id  UUID NOT NULL REFERENCES interpreters(id) ON DELETE CASCADE,
  status          VARCHAR(20) DEFAULT 'pending', -- 'pending', 'answered', 'declined'
  response_text   TEXT,
  responded_at    TIMESTAMPTZ,
  rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interp_requests_interpreter
  ON interpretation_requests(interpreter_id, status, created_at);
```

---

## V3 EK TABLOLARI

### ad_cohorts

```sql
-- V3: Reklam hedefleme kohortları
CREATE TABLE ad_cohorts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id          UUID REFERENCES tags(id),
  cohort_name     VARCHAR(200) NOT NULL,
  description     TEXT,
  user_count      INTEGER DEFAULT 0,     -- Anonimleştirilmiş büyüklük
  last_refreshed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### ad_campaigns

```sql
-- V3: Marka reklam kampanyaları
CREATE TABLE ad_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_user_id   UUID NOT NULL REFERENCES users(id),
  cohort_id       UUID NOT NULL REFERENCES ad_cohorts(id),
  name            VARCHAR(200) NOT NULL,
  content_url     VARCHAR(500),
  daily_budget_cents INTEGER NOT NULL,
  total_budget_cents  INTEGER NOT NULL,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  status          VARCHAR(20) DEFAULT 'draft', -- 'draft', 'active', 'paused', 'ended'
  impressions     INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  spend_cents     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Veritabanı İlişki Özeti (ER)

```
users
  ├── user_profiles (1:1)
  ├── user_settings (1:1)
  ├── oauth_accounts (1:N)
  ├── refresh_tokens (1:N)
  ├── devices (1:N)
  ├── dreams (1:N)
  │     ├── dream_tags (N:M) → tags
  │     ├── dream_embeddings (1:1)
  │     ├── dream_matches (1:N)
  │     ├── likes (1:N)
  │     ├── comments (1:N)
  │     └── saved_dreams (1:N)
  ├── follows (N:M)
  ├── blocks (N:M)
  └── notifications (1:N)

reports → (dreams | comments | users)
user_violations → users
tag_trends → tags
```

---

## Migrasyon Stratejisi

```
migrations/
  001_create_enums.sql
  002_create_users.sql
  003_create_user_profiles.sql
  004_create_user_settings.sql
  005_create_oauth_accounts.sql
  006_create_refresh_tokens.sql
  007_create_devices.sql
  008_create_dreams.sql
  009_create_dream_embeddings.sql
  010_create_dream_matches.sql
  011_create_tags.sql
  012_create_dream_tags.sql
  013_create_dream_drafts.sql
  014_create_social_tables.sql   (likes, comments, saved_dreams, follows, blocks)
  015_create_notifications.sql
  016_create_moderation_tables.sql
  017_create_tag_trends.sql
  --- V2 ---
  020_create_dream_audio.sql
  021_create_interpreters.sql
  --- V3 ---
  030_create_ad_tables.sql
```

---

_Bu doküman DATABASE_SCHEMA.md olup tüm tablo tanımlarını, index stratejilerini ve ilişkileri kapsar. Migrasyon çalıştırılmadan önce DBA review zorunludur._
