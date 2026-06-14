# MASTER_PROJECT.md

## DreamCloud — Ana Referans Dokümanı

**Versiyon:** 1.0 | **Oluşturulma:** 2026-06-14  
**Kaynak:** 14 proje dokümanı + MCP kurulum planı  
**Durum:** Geliştirme Öncesi — Dokümantasyon Tamamlandı

> Bu dosya DreamCloud projesinin tek gerçek kaynağıdır (single source of truth).
> Tüm teknik ve stratejik kararların özeti burada tutulur.
> Detay için ilgili dokümanlar bölüm başlarında belirtilmiştir.

---

## 1. ÜRÜN ÖZETİ

**Ne:** Kullanıcıların uyku sırasında gördükleri rüyaları paylaşabildiği, dünya genelinde benzer rüyaların gerçek zamanlı eşleştirildiği ve bu veriden hem kullanıcılara hem markalara değer üretilen sosyal medya platformu.

**Fark:** Mevcut sosyal medyalar bilinçli ve kurgulanmış içeriğe dayanır. Rüyalar fabrike edilemez — insanın en filtresiz ve savunmasız anından doğar. Bu DreamCloud'u rakipsiz kılar.

**Hedef:** 12 ayda iOS + Android MVP → Yayın

**Kaynak:** [PROJECT_ANALYSIS.md](PROJECT_ANALYSIS.md) · [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md)

---

## 2. VİZYON

### Kısa Vade (MVP — 12 Ay)

Dünya genelinde insanları bilinçdışı deneyimleri üzerinden birleştiren, gerçek zamanlı ve filtrelenebilir içerikli bir sosyal medya ekosistemi kurmak.

### Uzun Vade (V3+)

- Rüya verilerini sağlık, psikoloji, sosyoloji ve marka araştırmaları için küresel veri kaynağına dönüştürmek
- Nanoteknolojiyle REM anında otomatik rüya kaydı
- Akıllı saat entegrasyonuyla uyku takibi ve rüya hatırlatma

### Pazar Konumu

| Platform       | İçerik Türü           | DreamCloud Farkı        |
| -------------- | --------------------- | ----------------------- |
| Instagram      | Kurgulanmış görsel    | Özgün / filtresiz       |
| TikTok         | Eğlence videosu       | Bilinçaltı verisi       |
| Twitter/X      | Anlık haber           | Evrensel insan deneyimi |
| **DreamCloud** | **Rüya / Bilinçaltı** | **Rakip yok**           |

### Başarı Metrikleri (OKR)

| Metrik                    | 6. Ay (MVP) | 12. Ay   |
| ------------------------- | ----------- | -------- |
| Kayıtlı Kullanıcı         | 50,000      | 500,000  |
| Günlük Aktif Kullanıcı    | 10,000      | 150,000  |
| Haftalık Rüya Girişi/Kişi | 2+          | 3+       |
| Eşleşme Oranı             | %15         | %40      |
| App Store Puanı           | 4.0+        | 4.3+     |
| Aylık Reklam Geliri       | —           | $50,000+ |

---

## 3. MVP KAPSAMI

**Kaynak:** [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) · [FEATURE_SPECIFICATIONS.md](FEATURE_SPECIFICATIONS.md)

### MVP'de Olan (V1.0 — P0)

- Kullanıcı kaydı: e-posta, Google OAuth, Apple Sign In
- Metin tabanlı rüya girişi (maks. 2000 karakter)
- Rüya kategorisi: Lucid / Güzel / Kabus / Normal
- Etiketleme: yer, nesne, kişi, duygu, marka
- Görünürlük kontrolü: Özel / Takipçiler / Herkese Açık
- Kişisel rüya günlüğü (auto-save her 10 sn)
- NLP tabanlı rüya eşleştirme (sentence-transformers + pgvector)
- Global rüya akışı (keşfet sayfası)
- Sosyal etkileşim: beğeni, yorum, kaydetme, takip, engelleme
- Sabah hatırlatma bildirimi (kullanıcı tanımlı saat)
- Otomatik içerik moderasyonu (OpenAI Moderation API)
- Sosyal paylaşım (Instagram, Twitter)
- iOS + Android

### MVP Dışı (V1.5)

- Sesli rüya girişi
- Tekrar eden rüya tespiti
- Rüya istatistikleri dashboardu
- Premium abonelik

### MVP Dışı (V2)

- Video rüya girişi
- Profil bazlı rüya karşılaştırma
- Rüya yorumcuları entegrasyonu
- Web uygulaması (Next.js)
- Turborepo monorepo geçişi

### MVP Dışı (V3)

- Marka reklam paneli (self-serve)
- Akıllı saat REM entegrasyonu (HealthKit / WearOS)
- Akıllı TV desteği

### Hiçbir Zaman Yapılmayacak

- Kullanıcı verisinin izinsiz 3. taraflarla paylaşımı
- İK değerlendirme aracı olarak kullanım (hukuki/etik risk)

---

## 4. TEKNİK MİMARİ ÖZETİ

**Kaynak:** [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) · [SCALABILITY_PLAN.md](SCALABILITY_PLAN.md)

### Mimari Felsefesi

**"Modüler Monolith → Mikroservis"** evrim yolu:

- **MVP:** Tek deploy birimi (hızlı geliştirme, düşük operasyonel yük)
- **V2:** Yüksek yük servislerini ayrıştır (NLP, Bildirim)
- **V3:** Tam servis bağımsızlığı

### Katmanlar

```
İSTEMCİ: React Native + Expo (iOS + Android)
    ↓ HTTPS TLS 1.3 / WebSocket (wss://)
EDGE: AWS CloudFront → Application Load Balancer
    ↓
API: NestJS Modüler Monolith (8 modül)
     ↔ Python FastAPI NLP Servisi (ayrı process)
    ↓
VERİ: PostgreSQL 16 + pgvector | Redis 7 | S3 (V2+)
    ↓
DIŞ: OpenAI · APNs · FCM · AWS SES · Sentry
```

### NestJS 8 Modülü

| Modül        | Sorumluluk                                       |
| ------------ | ------------------------------------------------ |
| Auth         | JWT RS256, OAuth2, refresh token rotation, OTP   |
| Dream        | CRUD, etiketleme, NLP tetikleme, görünürlük      |
| Social       | Beğeni, yorum, takip, engelleme, paylaşım        |
| Feed         | Global akış, trend hesaplama, kişisel feed       |
| Search       | pg_trgm metin araması, etiket autocomplete       |
| Notification | Push (APNs + FCM), sabah bildirimi, socket event |
| Moderation   | OpenAI tarama, rapor kuyruğu, moderatör panel    |
| User         | Profil, ayarlar, hesap silme                     |

### Ölçeklenme Eşikleri

| Faz   | DAU      | Mimari Değişiklik               |
| ----- | -------- | ------------------------------- |
| Faz 0 | 0–10K    | Monolith, ECS 2 task, $180/ay   |
| Faz 1 | 10K–100K | NLP ve Notification ayrı servis |
| Faz 2 | 100K–1M  | Read replica, Redis cluster     |
| Faz 3 | 1M–10M+  | Multi-region, global CDN        |

---

## 5. TEKNOLOJİ STACK'İ

**Kaynak:** [TECH_STACK.md](TECH_STACK.md)

### Karar Özeti

| Katman     | Teknoloji                        | Alternatif Reddedilen                         |
| ---------- | -------------------------------- | --------------------------------------------- |
| Mobil      | React Native + Expo + TypeScript | Flutter (Dart), Swift/Kotlin Native           |
| Backend    | NestJS + TypeScript              | Express (yapısız), Go/Gin (ekosistem), Django |
| NLP        | Python + FastAPI                 | Node.js ML (olgunluk eksik)                   |
| Ana DB     | PostgreSQL 16 + pgvector         | MySQL (pgvector yok), MongoDB                 |
| Cache      | Redis 7                          | Memcached (pub/sub yok)                       |
| Auth       | JWT RS256 + Refresh Rotation     | HS256 (mikroservis güvenlik riski)            |
| Cloud      | AWS                              | GCP, Azure                                    |
| CDN        | CloudFront                       | CloudFlare                                    |
| E-posta    | AWS SES                          | SendGrid, Mailgun                             |
| Monitoring | Sentry + CloudWatch              | Datadog (V2+)                                 |

### Temel Kütüphaneler

**Mobil:**

```
expo · react-navigation v6 · react-query (TanStack v5)
zustand · react-hook-form · expo-notifications
expo-secure-store · @shopify/flash-list · i18next
```

**Backend:**

```
@nestjs/core · @nestjs/jwt · @nestjs/bull · @nestjs/schedule
passport-jwt · passport-google-oauth20
class-validator · class-transformer · typeorm
ioredis · socket.io · helmet · openai
```

**NLP:**

```
fastapi · sentence-transformers · pgvector
celery + redis · numpy · scikit-learn
```

### Eşleştirme Algoritması

```
Rüya metni
  → all-MiniLM-L6-v2 (Sentence Transformer)
  → 384 boyutlu vektör
  → pgvector HNSW index → cosine similarity araması
  → final_score = (α × tag_overlap) + (β × semantic_similarity)
  → Top-K benzer rüya
```

_Not: α ve β değerleri kullanıcı geri bildirimiyle optimize edilecek._

---

## 6. VERİTABANI ÖZETİ

**Kaynak:** [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)

### Prensipleri

- Tüm tablolar UUID primary key (`gen_random_uuid()`)
- Her tabloda `created_at` + `updated_at`
- Soft delete: kritik tablolarda `deleted_at` (NULL = aktif)
- Enum tipler PostgreSQL `TYPE` olarak tanımlı
- Foreign key'lerde `ON DELETE` davranışı belirtilmiş

### PostgreSQL Uzantıları

```sql
"uuid-ossp"  -- UUID primary keys
"pgvector"   -- Vektör benzerlik araması (eşleştirme motoru)
"pg_trgm"    -- Fuzzy text search (Türkçe metin araması)
"btree_gin"  -- Bileşik index optimizasyonu
```

### Tablo Grupları (25 Tablo)

| Grup           | Tablolar                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------- |
| **Kullanıcı**  | `users`, `user_profiles`, `user_settings`, `oauth_accounts`, `refresh_tokens`, `devices` |
| **Rüya**       | `dreams`, `dream_drafts`, `dream_embeddings`, `dream_matches`, `dream_tags`, `tags`      |
| **Sosyal**     | `likes`, `comments`, `saved_dreams`, `follows`, `blocks`                                 |
| **Feed**       | `tag_trends`                                                                             |
| **Bildirim**   | `notifications`, `notification_settings`                                                 |
| **Moderasyon** | `reports`, `moderation_queue`, `content_flags`                                           |
| **Analitik**   | `user_activity_log`, `dream_stats`                                                       |

### Kritik Enum Tipleri

```sql
dream_category:    lucid | beautiful | nightmare | normal
dream_visibility:  private | followers | public
tag_type:          place | person | object | emotion | brand | other
notification_type: dream_match | like | comment | follow | system
```

---

## 7. API ÖZETİ

**Kaynak:** [API_ARCHITECTURE.md](API_ARCHITECTURE.md) · [AUTHENTICATION_FLOW.md](AUTHENTICATION_FLOW.md)

### Temel Prensipler

- **Stil:** REST + JSON
- **URL:** `https://api.dreamcloud.app/v1/{resource}`
- **Protokol:** HTTPS TLS 1.3 (WebSocket: wss://)
- **Versiyonlama:** URL path (`/v1/`, `/v2/`)
- **Pagination:** Cursor-based (keyset pagination)
- **Auth:** JWT RS256 Bearer token

### Rate Limiting

| Grup               | Limit         |
| ------------------ | ------------- |
| Auth endpoint'leri | 10 istek/dk   |
| Rüya oluşturma     | 20 istek/saat |
| Genel API          | 100 istek/dk  |
| Arama              | 30 istek/dk   |

### Endpoint Grupları (60+ endpoint)

| Grup          | Endpoint Sayısı | Örnekler                                 |
| ------------- | --------------- | ---------------------------------------- |
| Auth          | ~10             | register, login, refresh, logout, oauth  |
| Dreams        | ~12             | CRUD, drafts, matches, embed             |
| Feed          | ~4              | global, following, trending              |
| Social        | ~14             | likes, comments, saves, follows, blocks  |
| Search        | ~3              | search, tags/suggest, tags/{name}/dreams |
| Users         | ~6              | me, profile, settings, delete            |
| Notifications | ~4              | list, read, settings                     |
| Moderation    | ~4              | report, queue (moderatör)                |

### WebSocket Events

```
dream:matched      → Kullanıcının rüyası eşleşti
notification:new   → Yeni bildirim
feed:updated       → Feed'e yeni içerik eklendi
```

### JWT Mimarisi

```
Access Token:  RS256 · 15 dk TTL · Payload: {sub, username, role}
Refresh Token: Opaque UUID · 30 gün · SHA-256 hash → PostgreSQL
Rotation:      Her kullanımda yeni token (token theft koruması)
```

---

## 8. SPRİNT PLANI

**Kaynak:** [MVP_ROADMAP.md](MVP_ROADMAP.md)

### Ekip (5 Kişi)

| Rol                  | Sayı |
| -------------------- | ---- |
| Full-Stack / Backend | 2    |
| Mobil Geliştirici    | 1    |
| ML / NLP Mühendisi   | 1    |
| Ürün / Tasarım       | 1    |

### Zaman Çizelgesi

```
AY 1–2   (Sprint 1–4):  Altyapı, Auth, Profil
AY 3–4   (Sprint 5–8):  Rüya Modülü, NLP, Arama
AY 5–6   (Sprint 9–12): Feed, Sosyal Özellikler
AY 7–8   (Sprint 13–16): Moderasyon, Bildirim, Onboarding
AY 9–10  (Sprint 17–18): Test, Güvenlik Denetimi, Performans
AY 11:   Soft Launch — Beta (1000 kullanıcı)
AY 12:   Genel Yayın — App Store (iOS + Android)
```

### Sprint Özeti

| Sprint | Hafta | Odak                         | Bitiş Kriteri                       |
| ------ | ----- | ---------------------------- | ----------------------------------- |
| 1      | 1–2   | Geliştirme ortamı kurulumu   | CI/CD çalışıyor, DB bağlı           |
| 2      | 3–4   | Auth sistemi                 | Kayıt + giriş + token yenileme      |
| 3      | 5–6   | OAuth + Kullanıcı profili    | Google/Apple giriş çalışıyor        |
| 4      | 7–8   | Rüya CRUD                    | Rüya giriş/düzenleme/silme          |
| 5      | 9–10  | NLP eşleştirme motoru        | Rüya kayıtlanınca eşleşme bulunuyor |
| 6      | 11–12 | Etiket önerisi + Arama       | pg_trgm araması çalışıyor           |
| 7      | 13–14 | Feed + Trend hesaplama       | Global akış + trend etiketler       |
| 8      | 15–16 | Sosyal etkileşim             | Beğeni, yorum, takip çalışıyor      |
| 9      | 17–18 | Moderasyon sistemi           | Otomatik tarama + rapor kuyruğu     |
| 10     | 19–20 | Bildirim sistemi             | Push + sabah hatırlatma çalışıyor   |
| 11     | 21–22 | Onboarding + Sosyal paylaşım | İlk kullanıcı deneyimi              |
| 12     | 23–24 | Paylaşım + Profil geliştirme | Instagram/Twitter paylaşım          |
| 13     | 25–26 | Lokasyon özellikleri         | Şehir bazlı rüya keşfi              |
| 14     | 27–28 | Performans optimizasyonu     | <2s açılış, <3s eşleşme             |
| 15     | 29–30 | Güvenlik denetimi            | Penetrasyon testi + GDPR audit      |
| 16     | 31–32 | App Store hazırlık           | Store sayfaları, TestFlight         |
| 17     | 33–34 | Beta (1000 kullanıcı)        | Hata takibi + geri bildirim         |
| 18     | 35–36 | Genel yayın                  | iOS + Android public release        |

---

## 9. GELİŞTİRME SIRASI

### Bağımlılık Zinciri (Sıra Bozulamaz)

```
1. Altyapı (Docker, DB, CI/CD)
   ↓
2. Auth (kullanıcısız hiçbir şey çalışmaz)
   ↓
3. Rüya CRUD (içeriksiz eşleştirme anlamsız)
   ↓
4. NLP Eşleştirme (platformun çekirdek değeri)
   ↓
5. Feed (eşleşme olmadan feed boş kalır)
   ↓
6. Sosyal (etkileşim için içerik gerekir)
   ↓
7. Moderasyon (sosyal platform açılmadan moderasyon şart)
   ↓
8. Bildirim (kullanıcıyı geri getiren kritik döngü)
   ↓
9. Test + Güvenlik Denetimi
   ↓
10. Yayın
```

### Kritik Bağımlılıklar

- PostgreSQL + pgvector → NLP motoru buna bağlı
- NLP servisi → rüya kaydedilince async çalışmalı (Bull Queue)
- Socket.io → eşleşme bildirimi için
- AWS SES → e-posta doğrulama ve şifre sıfırlama
- Redis → rate limiting, OTP, feed cache, pub/sub

---

## 10. KRİTİK RİSKLER

**Kaynak:** [PROJECT_ANALYSIS.md](PROJECT_ANALYSIS.md) · [SCALABILITY_PLAN.md](SCALABILITY_PLAN.md)

### Yüksek Öncelikli (Proje Tehdit Eden)

| Risk                     | Açıklama                                                                | Azaltma Stratejisi                                             |
| ------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Rüya Hatırlama Oranı** | İnsanlar rüyalarını dakikalar içinde unutur → düşük içerik üretimi      | Sabah bildirimi + uyanır uyanmaz hızlı giriş akışı             |
| **Cold Start Problemi**  | Eşleştirme anlamlı sonuç vermek için kritik kitle gerektirir (~10K DAU) | Influencer lansman kampanyası + seed içerik                    |
| **NLP Doğruluğu**        | Yanlış eşleşmeler kullanıcıyı kaybettirir                               | α/β ağırlık optimizasyonu, A/B testi, kullanıcı geri bildirimi |
| **İçerik Moderasyonu**   | Kabus/travma/cinsel içerik platformu tehdit eder                        | OpenAI Moderation API + insan moderatör + rapor kuyruğu        |

### Orta Öncelikli

| Risk                      | Açıklama                                     | Azaltma Stratejisi                            |
| ------------------------- | -------------------------------------------- | --------------------------------------------- |
| **Gizlilik/GDPR**         | Rüya verisi hassas kişisel veri sayılabilir  | Privacy by Design, KVKK/GDPR uyum denetimi    |
| **Veri Sahtekârlığı**     | Uydurma rüya girişi reklam değerini düşürür  | Davranış analizi, tekrar girdi tespiti        |
| **Kullanıcı Alışkanlığı** | Düzenli rüya kaydetme alışkanlığı zor oluşur | Gamification, streak sistemi, sabah ritual UX |
| **Rekabet**               | Büyük platformların rüya özelliği eklemesi   | Hız + derinlik + topluluk avantajı            |

### Teknik Riskler

| Risk                         | Azaltma                                            |
| ---------------------------- | -------------------------------------------------- |
| pgvector HNSW index büyümesi | Partition + approximate search eşiği               |
| NLP servis gecikmesi         | Async queue + cache + timeout fallback             |
| Socket.io ölçeği             | Redis pub/sub + Sticky session → Socket.io cluster |
| App Store reddedilmesi       | İçerik politikası uyumu, review rehberi            |

---

## 11. MİMARİ KARARLAR

**Kaynak:** [TECH_STACK.md](TECH_STACK.md) · [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) · [AUTHENTICATION_FLOW.md](AUTHENTICATION_FLOW.md)

### ADR-001: Modüler Monolith (MVP)

**Karar:** Mikroservis değil, NestJS modüler monolith  
**Neden:** 5 kişilik ekip için operasyonel yük düşük; modüller bağımsız; V2'de kolayca ayrıştırılabilir  
**Risk:** Tek hata noktası → ECS Health Check + auto-restart ile hafifletildi

### ADR-002: PostgreSQL + pgvector (Vektör DB Yok)

**Karar:** Ayrı vektör veritabanı (Pinecone, Weaviate) yerine pgvector  
**Neden:** MVP için ek operasyonel yük yok; PostgreSQL'de ACID + pgvector yeterli  
**Eşik:** 1M+ rüya kayıtında ayrı vektör DB değerlendirilebilir

### ADR-003: JWT RS256 (HS256 Değil)

**Karar:** RS256 asimetrik imzalama  
**Neden:** Mikroservis mimarisinde her servis private key'e sahip olmaz; yalnızca public key ile doğrulama yapabilir  
**Etki:** Auth module'dan bağımsız token doğrulama

### ADR-004: Refresh Token Rotation

**Karar:** Her kullanımda yeni refresh token  
**Neden:** Çalınan token tespiti — iptal edilmiş token yeniden kullanılırsa TÜM oturumlar kapatılır  
**Etki:** Güçlü güvenlik, hafif kullanıcı deneyimi maliyeti (yok denecek kadar az)

### ADR-005: Python FastAPI NLP Servisi (MVP'den Ayrı)

**Karar:** NLP motoru MVP'den itibaren ayrı process  
**Neden:** Python ML ekosistemi (sentence-transformers, PyTorch) NestJS'e entegre edilemez; izolasyon hata yayılımını önler  
**İletişim:** NestJS → HTTP → FastAPI (içsel, private network)

### ADR-006: Cursor-Based Pagination

**Karar:** Offset yerine cursor pagination  
**Neden:** Büyük veri setinde offset pagination performans sorunu yaratır; cursor stabil sayfa atlama sağlar  
**Etki:** Frontend infinite scroll daha güvenilir

### ADR-007: Expo Managed Workflow (MVP)

**Karar:** MVP'de Expo Managed, V3'te Ejected  
**Neden:** OTA update, hızlı geliştirme; HealthKit/REM entegrasyonu için V3'te eject gerekecek  
**Risk:** Eject geçişi breaking change içerebilir → önceden kapsamlı test

### ADR-008: Bull Queue (Async NLP)

**Karar:** Rüya kaydı → NLP embedding → async queue  
**Neden:** NLP işleme ~500ms–2s; kullanıcıyı bekletmemek için async; Socket.io ile tamamlanınca bildirim  
**Etki:** Kullanıcı hemen kayıt onayı alır, eşleşme sonradan gelir

---

## 12. REDDEDİLEN YAKLAŞIMLAR

| Yaklaşım                | Neden Reddedildi                                                          | Kabul Edilen Alternatif   |
| ----------------------- | ------------------------------------------------------------------------- | ------------------------- |
| **Flutter**             | Dart dili ekip için yabancı; TypeScript ekosistemi paylaşımı yok          | React Native + Expo       |
| **Swift/Kotlin Native** | İki ayrı kod tabanı, 2 geliştirici gerektirir                             | React Native              |
| **Express.js**          | Yapısız; büyük ekip için okunabilirlik sorunu; modüler geçiş zor          | NestJS                    |
| **Go/Gin**              | ML/NLP ekosistemi zayıf; TypeScript paylaşımı yok                         | NestJS + Python           |
| **HS256 JWT**           | Mikroservis mimarisinde her servisin secret'a sahip olması güvenlik riski | RS256                     |
| **Pinecone / Weaviate** | MVP için gereksiz operasyonel yük ve maliyet                              | pgvector (PostgreSQL içi) |
| **MongoDB**             | ACID uyumsuz; pgvector yok; ilişkisel veri için uygunsuz                  | PostgreSQL                |
| **Firebase / Supabase** | Vendor lock-in; AWS mimarisini karmaşıklaştırır; GDPR kontrolü zor        | AWS RDS                   |
| **Offset Pagination**   | Büyük veri setinde N+1 sorunu, performans sorunu                          | Cursor-based pagination   |
| **Redux**               | DreamCloud ölçeği için aşırı karmaşık; boilerplate fazla                  | Zustand                   |
| **Mikroservis (MVP)**   | 5 kişilik ekip için operasyonel yük fazla; erken optimizasyon             | Modüler Monolith          |
| **Supabase MCP**        | Proje AWS RDS kullanıyor; Supabase'e özgü araç değersiz                   | PostgreSQL MCP (Faz 1)    |
| **Slack MCP**           | 5 kişilik ekip için gereksiz; standart Slack yeterli                      | —                         |
| **Docker MCP**          | `docker compose up` CLI yeterli                                           | —                         |
| **Linear/Jira MCP**     | GitHub Issues yeterli; ayrı proje yönetim aracına geçiş yok               | GitHub MCP                |

---

## 13. MCP KULLANIM STRATEJİSİ

**Kaynak:** [MCP_SETUP_PLAN.md](MCP_SETUP_PLAN.md)

### Kurulu MCP Sunucuları (7 Aktif)

| MCP                     | Paket                                            | Kullanım Alanı                                                |
| ----------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| **sequential-thinking** | @modelcontextprotocol/server-sequential-thinking | NLP algoritması tasarımı, güvenlik analizi, mimari kararlar   |
| **context7**            | @upstash/context7-mcp                            | NestJS, Expo, pgvector, TypeORM güncel API dokümantasyonu     |
| **filesystem**          | @modelcontextprotocol/server-filesystem          | Proje dizini dosya okuma/yazma (Dream Cloud Project/)         |
| **github**              | @modelcontextprotocol/server-github              | Issue takibi, PR yönetimi, CI/CD durumu                       |
| **memory**              | @modelcontextprotocol/server-memory              | Mimari kararlar ve sprint geçmişinin oturumlar arası hafızası |
| **playwright**          | @playwright/mcp                                  | UI test otomasyonu (moderatör paneli, Sprint 10+)             |
| **figma**               | figma-developer-mcp                              | Tasarım token'ları, UI bileşen spesifikasyonu (Sprint 7+)     |

### MCP Kullanım Kuralları

**sequential-thinking:** Rutin kod yazımında kullanma. Şu durumlarda aktive et:

- NLP skor denklemi (α/β optimizasyonu)
- Feed algoritması kararı (fanout-on-write vs read)
- Güvenlik açığı analizi
- Ölçekleme faz geçiş kararları
- Veritabanı sorgu optimizasyonu

**context7:** Her kütüphane sorusunda sürümü belirt:

- ✅ "NestJS 10.x için JWT guard"
- ❌ "NestJS için JWT guard" (eski sürüm dönebilir)

**filesystem:** Yalnızca proje dizini kapsamlı. Asla:

- `~/.aws/` erişimi
- `.env` dosya okuma (yalnızca `.env.example`)
- `node_modules/` veya `.git/` erişimi

**github:** Branch koruması aktif. Doğrudan `main`/`develop` push yok — PR akışı zorunlu. Token 90 günde rotate edilmeli.

**memory:** Mimari kararları, sprint sonuçlarını, debug çözümlerini kaydet. Format:

```
Karar: [ne yapıldı]
Neden: [gerekçe]
Sprint: [hangi aşamada]
```

**playwright:** Sprint 10 (moderatör paneli) sonrasında aktive et. Staging ortamı kurulduktan sonra CI'ya entegre et.

**figma:** Sprint 7 (UI geliştirme) başlangıcında aktive et. Token 90 günde rotate edilmeli.

### Sonraki MCP Kurulumları (Planlı)

| MCP                        | Aşama  | Koşul                                     |
| -------------------------- | ------ | ----------------------------------------- |
| PostgreSQL MCP (read-only) | Faz 1  | 10K+ kullanıcı, performans analizi dönemi |
| AWS MCP (read-only)        | Faz 1+ | Altyapı yönetim karmaşıklığı artınca      |

### Güvenlik Kısıtları

- Production DB bağlantısı MCP üzerinden asla
- AWS credentials MCP üzerinden asla
- GitHub PAT: 90 günlük rotasyon
- Figma API Key: 90 günlük rotasyon

---

## 14. GELİR MODELİ ÖZETİ

**Kaynak:** [BUSINESS_MODEL.md](BUSINESS_MODEL.md)

| Gelir Akışı                 | Versiyon | Tahmini                       |
| --------------------------- | -------- | ----------------------------- |
| Bağlamsal Rüya Reklamcılığı | V3       | $15–40 CPM · $500–5K/kampanya |
| Premium Abonelik            | V1.5     | ~$4.99–9.99/ay                |
| B2B Veri API                | V2+      | Kurumsal anlaşma              |
| Araştırma Ortaklığı         | V3       | Akademik/sağlık sektörü       |

**Başlangıç Finansmanı:** V1–V2 yatırım finansmanıyla karşılanacak. Reklam sistemi V3'te devreye girecek.

**Faz 0 Altyapı Maliyeti:** ~$180/ay (ECS + RDS + ElastiCache + CloudFront)

---

## 15. GÜVENLİK ÖZETİ

**Kaynak:** [SECURITY_REQUIREMENTS.md](SECURITY_REQUIREMENTS.md)

### Temel Prensipler

- Privacy by Design (sonradan yama değil)
- Minimum Veri Toplama
- Varsayılan Gizlilik (default: özel profil)
- Zero Trust iç servisler arası

### Veri Şifreleme

- Aktarımda: TLS 1.3, HSTS
- Beklemede: AES-256 (RDS, ElastiCache, S3)
- Şifre: bcrypt rounds=12
- OAuth token: AES-256-GCM (uygulama katmanı)

### Uyum

- GDPR (AB)
- KVKK (Türkiye)
- CCPA (California)
- COPPA (çocuk kullanıcı kuralları)

---

_Bu doküman tüm DreamCloud proje belgelerinin özeti ve tek referans noktasıdır._  
_Detaylı bilgi için başlık yanındaki kaynak dokümanları inceleyin._  
_Son güncelleme: 2026-06-14_
