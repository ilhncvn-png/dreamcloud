# Technology Stack

## DreamCloud — Teknoloji Kararları ve Gerekçeleri

**Versiyon:** 1.0 | **Tarih:** 2026-06-14

---

## Karar Kriterleri

Teknoloji seçimlerinde aşağıdaki öncelikler esas alınmıştır:

1. **Hız:** MVP'yi 12 ayda yayına almak
2. **Ölçeklenebilirlik:** 1 kullanıcıdan 10 milyona sorunsuz büyüme
3. **NLP Uyumluluğu:** Rüya eşleştirme motoru için AI/ML entegrasyonu
4. **Gizlilik:** GDPR/KVKK uyumu için tam kontrol
5. **Ekip Büyüklüğü:** 3–5 kişilik küçük ekiple yönetilebilir

---

## 1. Mobil İstemci

### React Native + Expo (TypeScript)

| Kriter              | React Native            | Flutter          | Swift/Kotlin Native |
| ------------------- | ----------------------- | ---------------- | ------------------- |
| Tek kod tabanı      | ✅ iOS + Android        | ✅ iOS + Android | ❌ Ayrı kod         |
| Geliştirme hızı     | ✅ Yüksek               | ✅ Yüksek        | ❌ Düşük            |
| Ekosistem olgunluğu | ✅ En geniş             | ✅ Olgun         | ✅ En olgun         |
| HealthKit/WearOS    | ✅ Kütüphane var        | ✅ Kütüphane var | ✅ Native           |
| TypeScript desteği  | ✅ Tam                  | ❌ Dart          | ✅ Native           |
| İşe alım kolaylığı  | ✅ Kolay (JS bilenleri) | ⚠️ Orta          | ❌ Zor              |

**Karar: React Native + Expo + TypeScript**

**Gerekçe:** JavaScript/TypeScript ekosistemi backend ile aynı dil; Expo managed workflow ile MVP hızlı teslim edilir; V3'te Expo'dan ejected yapıya geçilerek native modüller (HealthKit REM tespiti) entegre edilir.

**Temel Kütüphaneler:**

```
expo                      # Managed workflow (MVP)
react-navigation v6       # Navigasyon
react-query (TanStack)    # Server state yönetimi ve caching
zustand                   # Client state yönetimi (Redux alternatifi, minimal)
react-hook-form           # Form yönetimi
expo-notifications        # Push bildirim
expo-av                   # Ses kaydı (V2)
expo-secure-store         # Token güvenli saklama
@shopify/flash-list       # Yüksek performanslı liste (rüya akışı)
date-fns                  # Tarih yönetimi
i18next                   # Çok dil desteği
```

---

## 2. Backend Servisleri

### Node.js + NestJS (TypeScript)

**Mimari Yaklaşım:**

- MVP: Modüler Monolith (tek deploy, hızlı geliştirme)
- V2+: Servis bazlı ayrışma (her modül bağımsız ölçeklenir)

| Kriter                 | NestJS       | Express     | Go (Gin)    | Django    |
| ---------------------- | ------------ | ----------- | ----------- | --------- |
| TypeScript-first       | ✅ Native    | ⚠️ Sonradan | ❌          | ❌        |
| Modüler yapı           | ✅ Built-in  | ❌ Manuel   | ⚠️          | ✅        |
| Bağımlılık enjeksiyonu | ✅           | ❌          | ❌          | ✅        |
| Geliştirme hızı        | ✅ Yüksek    | ✅ Yüksek   | ⚠️ Orta     | ✅ Yüksek |
| Performans             | ✅ İyi       | ✅ İyi      | ✅ Mükemmel | ⚠️ Orta   |
| Ekosistem              | ✅ Çok geniş | ✅ En geniş | ⚠️ Orta     | ✅ Geniş  |
| Mikroservis geçiş      | ✅ Kolay     | ⚠️ Manuel   | ✅          | ⚠️ Zor    |

**Karar: NestJS + TypeScript**

**Gerekçe:** Monolith'ten mikroservise geçişi minimal değişiklikle destekler. Backend ve mobil aynı dil → tam stack TypeScript → daha az kontekst geçişi, kod paylaşımı (tip tanımları). Decorator-based mimarisi büyük ekibe okunabilir yapı sunar.

**Temel Kütüphaneler:**

```
@nestjs/core, @nestjs/common    # Core framework
@nestjs/jwt                     # JWT yönetimi
@nestjs/throttler               # Rate limiting
@nestjs/bull                    # Job queue (bildirimler, NLP işleme)
@nestjs/schedule                # Cron jobs (trend hesaplama)
@nestjs/config                  # Environment yönetimi
passport, passport-jwt          # Auth stratejileri
passport-google-oauth20         # Google OAuth
class-validator, class-transformer  # DTO validasyon
typeorm                         # ORM (PostgreSQL)
ioredis                         # Redis client
@aws-sdk/client-s3              # Medya yükleme (V2)
openai                          # NLP embedding + moderasyon
socket.io                       # Gerçek zamanlı bildirimler
helmet                          # HTTP güvenlik başlıkları
compression                     # Gzip sıkıştırma
```

---

## 3. Eşleştirme Motoru (NLP Servisi)

### Python + FastAPI (Ayrı Servis)

Rüya eşleştirme motoru NestJS'den bağımsız bir Python mikroservisi olarak çalışır.

**Karar: Python + FastAPI**

**Gerekçe:** Python, ML/NLP ekosistemi için standart; PyTorch/Transformers kütüphaneleri en olgun bu dilde. FastAPI, Node.js benzeri async yapısıyla yüksek throughput sağlar.

```python
# Teknoloji seçimleri
fastapi                  # API framework
sentence-transformers    # Anlam tabanlı embedding (dream content → vector)
pgvector                 # PostgreSQL vektör uzantısı
openai                   # Embedding API (alternatif)
celery + redis           # Async embedding işleme
numpy, scikit-learn      # Benzerlik hesaplama
```

**Eşleştirme Akışı:**

```
Rüya metni
    → Sentence Transformer (all-MiniLM-L6-v2 modeli)
    → 384 boyutlu vektör
    → pgvector'da cosine similarity araması
    → Top-K benzer rüya döner
```

---

## 4. Veritabanı Katmanı

### PostgreSQL 16 (Ana Veri Tabanı)

**Karar: PostgreSQL**

**Gerekçe:**

- pgvector uzantısıyla vektör araması (ayrı vektör DB gerekmez — MVP için maliyet avantajı)
- ACID uyumluluğu: rüya verisinin bütünlüğü kritik
- JSONB desteği: etiket metadata esnekliği
- Row-level security: kullanıcı görünürlük kuralları veritabanı seviyesinde
- Full-text search: Türkçe metin araması için `pg_trgm` uzantısı

**Uzantılar:**

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- UUID primary keys
CREATE EXTENSION IF NOT EXISTS "pgvector";     -- Vektör benzerlik araması
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";    -- Bileşik index optimizasyonu
```

---

### Redis 7 (Cache ve Gerçek Zamanlı)

**Kullanım Alanları:**

- Session ve refresh token saklama
- API rate limiting sayaçları
- Trend etiket hesaplama (sorted sets)
- Gerçek zamanlı bildirim pub/sub
- Rüya feed cache (kullanıcı başına son feed)
- NLP embedding geçici cache

```
veri yapıları:
  STRING    → Session token, rate limit sayacı
  SORTED SET → Trend etiketler (score: son 24 saat count)
  HASH      → Kullanıcı session bilgisi
  LIST      → Bildirim kuyruğu
  PUB/SUB   → Gerçek zamanlı eşleşme bildirimi
```

---

### AWS S3 + CloudFront (Medya Depolama — V2)

Ses ve video rüya kayıtları için:

- S3: depolama (kullanıcı başına izole bucket prefix)
- CloudFront: CDN dağıtımı (düşük gecikme)
- S3 presigned URL: istemci doğrudan S3'e yükler (server bypass)

---

## 5. Kimlik Doğrulama

| Yöntem            | Çözüm                                            |
| ----------------- | ------------------------------------------------ |
| JWT Access Token  | RS256 imzalı, 15 dakika TTL                      |
| Refresh Token     | SHA-256 hash, PostgreSQL'de saklanır, 30 gün TTL |
| Google OAuth      | passport-google-oauth20                          |
| Apple Sign In     | @nestjs/passport + apple-signin-auth             |
| E-posta doğrulama | AWS SES + 6 haneli OTP, 10 dk TTL (Redis)        |
| Şifre sıfırlama   | AWS SES + signed URL, 1 saat TTL                 |

---

## 6. Bildirimler

| Platform            | Çözüm                                                 |
| ------------------- | ----------------------------------------------------- |
| iOS Push            | Apple Push Notification Service (APNs) via `node-apn` |
| Android Push        | Firebase Cloud Messaging (FCM)                        |
| Birleşik katman     | Expo Push Notification Service (MVP için basit)       |
| Zamanlı bildirimler | Bull queue + cron scheduler                           |
| E-posta             | AWS SES (doğrulama, şifre sıfırlama)                  |

**V3 Wearable:** Apple HealthKit (REM verisi) → Expo Health API → Backend webhook

---

## 7. Altyapı ve DevOps

### Cloud: AWS

| Servis            | Kullanım                             |
| ----------------- | ------------------------------------ |
| EC2 / ECS         | Backend servis deploy                |
| RDS PostgreSQL    | Yönetilen veritabanı, otomatik yedek |
| ElastiCache Redis | Yönetilen Redis cluster              |
| S3                | Medya depolama                       |
| CloudFront        | CDN                                  |
| API Gateway       | Rate limiting, SSL termination       |
| SES               | E-posta gönderimi                    |
| CloudWatch        | Log ve monitoring                    |
| Secrets Manager   | API anahtarları ve env yönetimi      |
| ECR               | Docker image registry                |

### Containerization: Docker + Docker Compose

```yaml
# Servisler
services:
  api          # NestJS backend
  nlp          # Python FastAPI matching service
  postgres     # PostgreSQL + pgvector
  redis        # Redis
  nginx        # Reverse proxy (production)
```

### CI/CD: GitHub Actions

```
Push to main     → Test → Build Docker → Deploy to Staging
Tag vX.X.X       → Test → Build Docker → Deploy to Production
Pull Request      → Lint + Test + Type Check
```

### Monitoring:

- **Application:** Sentry (hata takibi, iOS + Android + Backend)
- **Infrastructure:** AWS CloudWatch + Grafana
- **Uptime:** UptimeRobot veya AWS Route53 Health Checks
- **Performance:** DataDog APM (V2+)

---

## 8. İçerik Moderasyonu

| Katman                | Çözüm                       | Açıklama                           |
| --------------------- | --------------------------- | ---------------------------------- |
| Otomatik metin tarama | OpenAI Moderation API       | İçerik yayınlanmadan önce          |
| Ses içerik tarama     | AWS Transcribe + Moderation | V2, sesli giriş için               |
| Görüntü tarama        | AWS Rekognition             | V2, video için                     |
| İnsan moderasyonu     | Dahili panel                | Rapor kuyruğu; moderatör dashboard |

---

## 9. Geliştirme Araçları

```
Kod kalitesi:
  ESLint + Prettier       # Linting ve formatlama
  Husky + lint-staged     # Pre-commit hooks
  TypeScript strict mode  # Tip güvenliği

Test:
  Jest                    # Unit ve integration testler
  Supertest               # API endpoint testleri
  Detox                   # E2E mobil test (V2)

API Dokümantasyon:
  Swagger/OpenAPI         # @nestjs/swagger ile otomatik üretim

Şema Yönetimi:
  TypeORM Migration       # Veritabanı migrasyon yönetimi

Monorepo (V2+):
  Turborepo               # Ortak tipler ve utils için (mobile + backend paylaşımı)
```

---

## 10. Teknoloji Stack Özeti

```
┌─────────────────────────────────────────────────────┐
│                   İSTEMCİ KATMANI                   │
│         React Native + Expo + TypeScript            │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS / WebSocket
┌─────────────────────▼───────────────────────────────┐
│              API GATEWAY (AWS / Nginx)              │
│         Rate Limiting · SSL · Load Balancer         │
└──────┬──────────────────────────┬───────────────────┘
       │                          │
┌──────▼──────┐          ┌────────▼────────┐
│  NestJS API │          │  Python FastAPI  │
│  (Ana API)  │◄────────►│  (NLP / Match)  │
└──────┬──────┘          └────────┬────────┘
       │                          │
┌──────▼──────────────────────────▼────────┐
│              VERİ KATMANI                │
│  PostgreSQL+pgvector · Redis · S3(V2)   │
└──────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────┐
│           DIŞ SERVİSLER                 │
│  OpenAI · APNs · FCM · AWS SES · Sentry│
└─────────────────────────────────────────┘
```

---

## Versiyon Bazlı Stack Aktivasyon

| Bileşen               | MVP      | V2             | V3                |
| --------------------- | -------- | -------------- | ----------------- |
| React Native + Expo   | ✅       | ✅             | ✅                |
| NestJS Monolith       | ✅       | ✅ → Servisler | Servisler         |
| PostgreSQL + pgvector | ✅       | ✅             | ✅ + Read Replica |
| Redis                 | ✅       | ✅             | ✅ + Cluster      |
| Python NLP Servisi    | ✅ Temel | ✅ Gelişmiş    | ✅ Multi-model    |
| AWS S3 + CDN          | —        | ✅             | ✅                |
| Expo Push (basit)     | ✅       | —              | —                 |
| FCM + APNs (doğrudan) | —        | ✅             | ✅                |
| HealthKit / WearOS    | —        | —              | ✅                |
| Ad Servis             | —        | —              | ✅                |

---

_Bu doküman TECH_STACK.md olup teknoloji kararlarının gerekçelerini kapsar. Stack değişikliği öncesinde tüm etkilenen modüller gözden geçirilmelidir._
