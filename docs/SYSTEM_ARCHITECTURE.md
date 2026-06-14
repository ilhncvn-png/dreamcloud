# System Architecture

## DreamCloud — Sistem Mimarisi

**Versiyon:** 1.0 | **Tarih:** 2026-06-14

---

## 1. Mimari Felsefesi

DreamCloud'un mimarisi **"Modüler Monolith → Mikroservis"** evrim yolunu izler:

- **MVP:** Tek deploy birimi (hızlı geliştirme, düşük operasyonel yük)
- **V2:** Yüksek yük servislerini ayrıştır (NLP, Bildirim)
- **V3:** Tam servis bağımsızlığı (her servis bağımsız ölçeklenir)

Bu yaklaşım, küçük ekibin kapasitesini boşa harcamadan büyük ölçek hazırlığı yapar.

---

## 2. Genel Sistem Diyagramı

```
┌──────────────────────────────────────────────────────────────────┐
│                        İSTEMCİ KATMANI                          │
│                                                                  │
│    ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐   │
│    │  iOS App    │    │ Android App │    │  Web (V2+)      │   │
│    │ React Native│    │ React Native│    │  Next.js        │   │
│    └──────┬──────┘    └──────┬──────┘    └────────┬────────┘   │
└───────────┼──────────────────┼──────────────────── ┼────────────┘
            │                  │                      │
            └──────────────────┴──────────────────────┘
                               │ HTTPS (TLS 1.3)
                               │ WebSocket (wss://)
┌──────────────────────────────▼───────────────────────────────────┐
│                       EDGE KATMANI                               │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              AWS CloudFront (CDN)                        │   │
│   │   Statik varlıklar · Medya (V2) · DDoS koruması         │   │
│   └────────────────────────────┬────────────────────────────┘   │
│                                │                                 │
│   ┌────────────────────────────▼────────────────────────────┐   │
│   │           AWS Application Load Balancer                  │   │
│   │     Health Check · SSL Termination · Routing            │   │
│   └────────┬──────────────────────────┬───────────────────── ┘  │
└────────────┼──────────────────────────┼─────────────────────────┘
             │                          │
┌────────────▼──────────┐  ┌────────────▼──────────────────────────┐
│   API GATEWAY         │  │        WEBSOCKET GATEWAY              │
│   (Nginx / Kong)      │  │         (NestJS + Socket.io)          │
│   Rate Limit          │  │   Gerçek zamanlı eşleşme bildirimi    │
│   Auth Token Check    │  │   Feed güncellemeleri                 │
│   Request Logging     │  └────────────────────────────────────── ┘
└────────┬──────────────┘
         │
┌────────▼──────────────────────────────────────────────────────────┐
│                     UYGULAMA KATMANI (MVP: Monolith)              │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                  NestJS Modüler Monolith                    │  │
│  │                                                             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │  Auth    │ │  Dream   │ │  Social  │ │ Notification │  │  │
│  │  │  Module  │ │  Module  │ │  Module  │ │   Module     │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │  Search  │ │   Feed   │ │Moderation│ │   User       │  │  │
│  │  │  Module  │ │  Module  │ │  Module  │ │   Module     │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────┐                                          │
│  │  Python FastAPI     │ ← Ayrı süreç (MVP'de de bağımsız)       │
│  │  NLP Match Service  │   NestJS HTTP ile çağırır               │
│  └─────────────────────┘                                          │
└────────────────────────────────────────────────────────────────────┘
         │                    │                    │
┌────────▼──────┐  ┌──────────▼──────┐  ┌────────▼──────────────────┐
│  PostgreSQL   │  │     Redis       │  │     AWS S3 (V2+)          │
│  + pgvector  │  │  Cache · Queue  │  │  Ses · Video Kayıtları     │
│  Ana DB       │  │  Session · PubSub│  │  + CloudFront CDN         │
└───────────────┘  └─────────────────┘  └───────────────────────────┘
         │
┌────────▼──────────────────────────────────────────────────────────┐
│                    DIŞ SERVİSLER                                  │
│  OpenAI API  │  APNs  │  FCM  │  AWS SES  │  Sentry              │
└───────────────────────────────────────────────────────────────────┘
```

---

## 3. Modül Sorumlulukları

### 3.1 Auth Module

**Sorumluluk:** Kimlik doğrulama, oturum ve token yönetimi

```
İşlemler:
  - Kullanıcı kaydı (e-posta, Google, Apple)
  - E-posta doğrulama (OTP)
  - JWT access/refresh token üretimi ve doğrulaması
  - Token yenileme (refresh rotation)
  - Şifre sıfırlama
  - Cihaz (device) token kaydı (push bildirim)
  - OAuth2 akışı

Bağımlılıklar:
  - PostgreSQL (users, refresh_tokens tabloları)
  - Redis (OTP geçici saklama, blacklisted tokens)
  - AWS SES (e-posta gönderimi)
```

### 3.2 Dream Module

**Sorumluluk:** Rüya CRUD işlemleri, etiketleme, NLP tetikleme

```
İşlemler:
  - Rüya oluşturma, okuma, güncelleme, silme
  - Etiket ekleme ve yönetimi
  - Görünürlük kontrolü
  - NLP servisi tetikleme (rüya kaydedilince async)
  - Taslak yönetimi (auto-save)
  - Rüya istatistiği güncelleme

Bağımlılıklar:
  - PostgreSQL (dreams, tags, dream_tags tabloları)
  - Redis (feed cache invalidation)
  - Python NLP Service (async, Bull Queue)
  - Moderation Module (yayın öncesi tetikleme)
```

### 3.3 Matching Module (NLP Service — Python)

**Sorumluluk:** Semantik rüya eşleştirme

```
İşlemler:
  - Rüya metni → vektör dönüşümü (embedding)
  - pgvector cosine similarity araması
  - Eşleşme skoru hesaplama (etiket + semantik ağırlıklı)
  - Sonuç cache (Redis, 1 saat TTL)
  - Toplu yeniden-embedding (model güncellenince)

Bağımlılıklar:
  - PostgreSQL + pgvector (dream_embeddings tablosu)
  - Redis (embedding cache)
  - OpenAI API veya local Sentence Transformer modeli
```

### 3.4 Feed Module

**Sorumluluk:** Global rüya akışı, trend hesaplama

```
İşlemler:
  - Herkese açık rüya akışı (pagination)
  - Trend etiket hesaplama (son 24 saat, her 15 dk güncelleme)
  - Kişiselleştirilmiş akış (takip edilenler öncelikli) (V2)
  - Keşfet algoritması

Bağımlılıklar:
  - PostgreSQL (dreams, follows tabloları)
  - Redis (trend_tags sorted set, feed cache)
  - Cron Scheduler (trend güncelleme)
```

### 3.5 Social Module

**Sorumluluk:** Sosyal etkileşim

```
İşlemler:
  - Beğeni (like/unlike)
  - Yorum (CRUD)
  - Kaydetme koleksiyonları
  - Takip/takipten çıkma
  - Engelleme
  - Platform dışı paylaşım URL üretimi

Bağımlılıklar:
  - PostgreSQL (likes, comments, follows, blocks, saved_dreams)
  - Notification Module (etkileşim bildirimleri için)
```

### 3.6 Notification Module

**Sorumluluk:** Tüm bildirim türlerini yönetme

```
İşlemler:
  - Push bildirim gönderimi (APNs + FCM)
  - Sabah hatırlatma bildirimleri (kullanıcı bazında schedule)
  - Eşleşme bildirimi (matching tamamlanınca)
  - Sosyal bildirimler (beğeni, yorum, takip)
  - Bildirim tercihleri yönetimi
  - Bildirim geçmişi

Bağımlılıklar:
  - PostgreSQL (notifications, devices, notification_settings)
  - Redis (Bull Queue — async bildirim kuyruğu)
  - APNs / FCM / Expo Push Service
  - NestJS Schedule (cron — sabah bildirimleri)
```

### 3.7 Moderation Module

**Sorumluluk:** İçerik güvenliği

```
İşlemler:
  - Yayın öncesi otomatik içerik tarama (OpenAI Moderation API)
  - Kullanıcı raporu alımı
  - Moderatör iş kuyruğu yönetimi
  - İçerik kaldırma ve kullanıcı uyarı sistemi
  - İhlal sayacı ve ban yönetimi

Bağımlılıklar:
  - PostgreSQL (reports, moderation_queue, user_violations)
  - OpenAI Moderation API
  - Notification Module (kullanıcı uyarıları)
```

### 3.8 Search Module

**Sorumluluk:** Platform geneli arama

```
İşlemler:
  - Rüya metin araması (pg_trgm full-text)
  - Etiket araması
  - Kullanıcı araması (takma ad)
  - Arama önerileri (autocomplete)

Bağımlılıklar:
  - PostgreSQL (pg_trgm full-text index)
  - Redis (arama öneri cache)
```

---

## 4. Servis İletişim Desenleri

### Senkron (HTTP/REST)

```
Mobil App → API Gateway → NestJS → PostgreSQL
Mobil App → API Gateway → NestJS → Python NLP (internal HTTP)
```

### Asenkron (Queue-based)

```
Dream Kaydedildi → Bull Queue → NLP İşleme Job
NLP Tamamlandı   → Bull Queue → Notification Job → APNs/FCM
Cron (15dk)      → Trend Hesaplama Job → Redis Update
```

### Gerçek Zamanlı (WebSocket)

```
Kullanıcı bağlanır → Socket.io handshake (JWT doğrulama)
NLP eşleşme bulundu → Socket event: "dream:match" → İstemci
Yeni yorum geldi   → Socket event: "social:comment" → İlgili kullanıcı
```

---

## 5. Veri Akış Diyagramları

### 5.1 Rüya Kaydetme Akışı

```
[Kullanıcı] Rüya metnini yazar ve kaydeder
      │
      ▼
[Mobil App] POST /api/v1/dreams
      │
      ▼
[API Gateway] JWT doğrula → Rate limit kontrol
      │
      ▼
[Dream Module]
  1. DTO validasyonu (içerik, kategori, etiketler)
  2. Moderation API kontrolü (OpenAI) — sync, ≤2sn
  3. İçerik temizse: PostgreSQL'e kaydet
  4. Etiketleri dream_tags'e ekle
  5. Bull Queue'ya NLP job ekle (async)
  6. HTTP 201 Created dön (kullanıcı beklemez)
      │
      ▼ (Arka planda)
[NLP Queue Worker]
  1. Rüya metni alınır
  2. Sentence Transformer embedding üretir
  3. PostgreSQL dream_embeddings'e kaydeder
  4. pgvector ile top-10 benzer rüyayı bulur
  5. dream_matches tablosuna yazar
  6. Socket.io event gönderir: "dream:matched"
      │
      ▼
[Mobil App] Push bildirim + Socket event alır
  → "Rüyanla benzer 7 rüya bulundu" gösterilir
```

### 5.2 Feed Yükleme Akışı

```
[Kullanıcı] Ana sayfayı açar
      │
      ▼
[Mobil App] GET /api/v1/feed?cursor=&limit=20
      │
      ▼
[Feed Module]
  1. Redis cache kontrol: feed:{userId}:{cursor}
  2. Cache HIT  → Direkt dön (≤10ms)
  3. Cache MISS →
       PostgreSQL sorgu:
         SELECT dreams WHERE visibility='public'
           AND user_id NOT IN (blocked list)
           ORDER BY created_at DESC
           LIMIT 20 OFFSET cursor
       → Redis'e cache (TTL: 2dk)
  4. Kullanıcının rüya geçmişiyle eşleşen içerikler önce sıralanır (V2)
      │
      ▼
[Mobil App] Kart listesi render edilir
```

---

## 6. V2 Mikroservis Geçiş Mimarisi

V2'de yüksek yük altındaki modüller ayrışır:

```
┌──────────────────────────────────────────────────────────┐
│                  API GATEWAY                             │
│  /auth/*        → Auth Service   (Pod: 2-4)            │
│  /dreams/*      → Dream Service  (Pod: 4-8)            │
│  /feed/*        → Feed Service   (Pod: 4-8)            │
│  /social/*      → Social Service (Pod: 2-4)            │
│  /notifications → Notif Service  (Pod: 2-4)            │
│  /search/*      → Search Service (Pod: 2-4)            │
│  /match/*       → NLP Service    (Pod: 2-8, GPU)       │
└──────────────────────────────────────────────────────────┘
```

**Servisler Arası İletişim:**

- HTTP/REST → Senkron çağrılar (auth doğrulama, basit sorgular)
- Message Queue (Bull/Redis) → Async iş akışları (NLP, bildirim)
- Paylaşılan JWT → Servisler arası kimlik doğrulama

---

## 7. Hata Yönetimi ve Dayanıklılık

| Senaryo                  | Strateji                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------- |
| NLP servisi yanıt vermez | Circuit breaker; eşleştirme asenkron; kullanıcı rüyasını kaydeder, eşleşme sonra gelir |
| PostgreSQL yavaş         | Read replica (V2); sorgu timeout 5 sn                                                  |
| Redis erişilemez         | Graceful degradation; cache olmadan PostgreSQL'den çek                                 |
| Push bildirim başarısız  | Retry: 3 deneme, exponential backoff                                                   |
| OpenAI API kota aşımı    | Fallback: etiket bazlı eşleştirme (semantik olmadan)                                   |
| Dosya yükleme başarısız  | Presigned URL yeniden üret; istemci yeniden dener                                      |

---

## 8. Deployment Ortamları

| Ortam         | Açıklama                        | Otomatik Deploy |
| ------------- | ------------------------------- | --------------- |
| `development` | Yerel Docker Compose            | Manuel          |
| `staging`     | AWS ECS, prod kopyası           | PR merge → main |
| `production`  | AWS ECS, yüksek erişilebilirlik | Tag (vX.X.X)    |

```yaml
# Ortam değişkeni hiyerarşisi
development  → .env.development (git'e commit edilmez)
staging      → AWS Secrets Manager (staging)
production   → AWS Secrets Manager (production)
```

---

_Bu doküman SYSTEM_ARCHITECTURE.md olup sistem tasarım kararlarını kapsar. Mikroservis geçiş zamanlaması kullanıcı büyüme metriklerine bağlı olarak güncellenmelidir._
