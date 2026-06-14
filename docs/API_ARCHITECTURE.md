# API Architecture

## DreamCloud — API Tasarımı ve Endpoint Kataloğu

**Versiyon:** 1.0 | **Tarih:** 2026-06-14  
**Stil:** REST + JSON | **Protokol:** HTTPS (TLS 1.3)

---

## 1. Temel Prensipler

### URL Yapısı

```
https://api.dreamcloud.app/v1/{resource}
```

### Versiyonlama

- URL path versiyonlama: `/v1/`, `/v2/`
- V1 en az 12 ay boyunca desteklenir
- Deprecated endpoint'ler `Sunset` header ile duyurulur

### Yanıt Formatı

**Başarılı Yanıt:**

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-06-14T08:00:00Z",
    "version": "1.0"
  }
}
```

**Hatalı Yanıt:**

```json
{
  "success": false,
  "error": {
    "code": "DREAM_NOT_FOUND",
    "message": "Rüya bulunamadı",
    "details": {}
  },
  "meta": {
    "timestamp": "2026-06-14T08:00:00Z"
  }
}
```

**Liste Yanıtı (Cursor Pagination):**

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "cursor": "eyJpZCI6InV1aWQi...",
    "has_next": true,
    "total_count": null
  }
}
```

### HTTP Durum Kodları

| Kod | Kullanım                           |
| --- | ---------------------------------- |
| 200 | Başarılı GET, PUT                  |
| 201 | Başarılı POST (kaynak oluşturma)   |
| 204 | Başarılı DELETE (içerik yok)       |
| 400 | Geçersiz istek (validasyon hatası) |
| 401 | Kimlik doğrulama gerekli           |
| 403 | Yetki yok                          |
| 404 | Kaynak bulunamadı                  |
| 409 | Çakışma (duplicate)                |
| 422 | İşlenemeyen varlık                 |
| 429 | Rate limit aşıldı                  |
| 500 | Sunucu hatası                      |

### Rate Limiting

| Endpoint Grubu         | Limit                       |
| ---------------------- | --------------------------- |
| Auth (login, register) | 10 istek / 15 dk / IP       |
| Dream oluşturma        | 20 istek / saat / kullanıcı |
| Genel API              | 200 istek / dk / kullanıcı  |
| Arama                  | 60 istek / dk / kullanıcı   |
| Feed                   | 120 istek / dk / kullanıcı  |

Header'lar:

```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 150
X-RateLimit-Reset: 1718352000
```

---

## 2. Kimlik Doğrulama

Korumalı endpoint'ler `Authorization: Bearer {access_token}` header'ı gerektirir.

```
Açık endpoint'ler:   🔓  (token gerekmez)
Korumalı endpoint'ler: 🔒  (JWT access token gerekir)
Admin endpoint'leri:  🔑  (admin role gerekir)
```

---

## 3. AUTH ENDPOİNTLERİ

### POST /v1/auth/register 🔓

Yeni kullanıcı kaydı

**Request:**

```json
{
  "username": "zeynep_dreams",
  "email": "zeynep@example.com",
  "password": "SecurePass123!"
}
```

**Response 201:**

```json
{
  "data": {
    "user_id": "uuid",
    "username": "zeynep_dreams",
    "email": "zeynep@example.com",
    "is_email_verified": false,
    "access_token": "eyJ...",
    "refresh_token": "eyJ..."
  }
}
```

**Kurallar:**

- username: 3–50 karakter, alfanumerik + underscore
- password: min 8 karakter, en az 1 büyük + 1 rakam
- E-posta doğrulama OTP'si otomatik gönderilir

---

### POST /v1/auth/login 🔓

**Request:**

```json
{
  "email": "zeynep@example.com",
  "password": "SecurePass123!"
}
```

**Response 200:**

```json
{
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 900,
    "user": { "id": "uuid", "username": "zeynep_dreams" }
  }
}
```

---

### POST /v1/auth/oauth/google 🔓

**Request:**

```json
{ "id_token": "google_id_token" }
```

---

### POST /v1/auth/oauth/apple 🔓

**Request:**

```json
{
  "authorization_code": "apple_auth_code",
  "identity_token": "apple_identity_token",
  "full_name": { "firstName": "Zeynep", "lastName": "Y" }
}
```

---

### POST /v1/auth/refresh 🔓

**Request:**

```json
{ "refresh_token": "eyJ..." }
```

**Response 200:**

```json
{
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 900
  }
}
```

---

### POST /v1/auth/logout 🔒

Mevcut refresh token'ı iptal eder.

**Request:**

```json
{ "refresh_token": "eyJ..." }
```

---

### POST /v1/auth/logout-all 🔒

Kullanıcının tüm cihazlardaki oturumlarını sonlandırır.

---

### POST /v1/auth/verify-email 🔓

**Request:**

```json
{ "email": "zeynep@example.com", "otp": "482931" }
```

---

### POST /v1/auth/resend-verification 🔒

---

### POST /v1/auth/forgot-password 🔓

**Request:**

```json
{ "email": "zeynep@example.com" }
```

---

### POST /v1/auth/reset-password 🔓

**Request:**

```json
{
  "token": "signed_reset_token",
  "new_password": "NewSecurePass456!"
}
```

---

### POST /v1/auth/change-password 🔒

**Request:**

```json
{
  "current_password": "SecurePass123!",
  "new_password": "NewSecurePass456!"
}
```

---

## 4. KULLANICI ENDPOİNTLERİ

### GET /v1/users/me 🔒

Giriş yapan kullanıcının profili.

**Response 200:**

```json
{
  "data": {
    "id": "uuid",
    "username": "zeynep_dreams",
    "email": "zeynep@example.com",
    "profile": {
      "display_name": "Zeynep",
      "bio": "Rüyalarımı paylaşıyorum",
      "avatar_url": "https://cdn.dreamcloud.app/avatars/...",
      "dream_count": 42,
      "follower_count": 128,
      "following_count": 67
    },
    "settings": { ... }
  }
}
```

---

### PUT /v1/users/me 🔒

Profil güncelleme.

**Request:**

```json
{
  "display_name": "Zeynep Y.",
  "bio": "Rüyalarım bu platformda",
  "location_city": "İstanbul"
}
```

---

### DELETE /v1/users/me 🔒

Hesap silme (soft delete + 30 gün geri alma süresi).

**Request:**

```json
{ "password": "SecurePass123!", "reason": "privacy_concerns" }
```

---

### GET /v1/users/{username} 🔓

Başka bir kullanıcının herkese açık profili.

---

### GET /v1/users/{username}/dreams 🔒

Bir kullanıcının görünür rüyaları. Görünürlük kuralları uygulanır.

**Query:** `?limit=20&cursor=&category=lucid`

---

### GET /v1/users/{username}/stats 🔓

Kullanıcı istatistikleri (kamuya açık).

**Response 200:**

```json
{
  "data": {
    "dream_count": 42,
    "public_dream_count": 35,
    "match_count": 187,
    "top_tags": ["#istanbul", "#uçmak", "#deniz"]
  }
}
```

---

### POST /v1/users/{username}/follow 🔒

### DELETE /v1/users/{username}/follow 🔒

### POST /v1/users/{username}/block 🔒

### DELETE /v1/users/{username}/block 🔒

---

### GET /v1/users/me/followers 🔒

### GET /v1/users/me/following 🔒

**Query:** `?limit=20&cursor=`

---

## 5. RÜYA ENDPOİNTLERİ

### POST /v1/dreams 🔒

Rüya oluşturma.

**Request:**

```json
{
  "title": "Eyfel Kulesi'nde Uçmak",
  "content": "Dün gece Paris'teydim ve Eyfel Kulesi'nin üzerinde uçuyordum...",
  "category": "lucid",
  "visibility": "public",
  "tags": ["#paris", "#uçmak", "#eyfelkulesi", "#huzur"],
  "dreamed_at": "2026-06-14T06:30:00+03:00"
}
```

**Response 201:**

```json
{
  "data": {
    "id": "uuid",
    "title": "Eyfel Kulesi'nde Uçmak",
    "content": "...",
    "category": "lucid",
    "visibility": "public",
    "tags": [
      { "id": "uuid", "name": "paris", "type": "place" },
      { "id": "uuid", "name": "uçmak", "type": "other" }
    ],
    "like_count": 0,
    "match_count": 0,
    "created_at": "2026-06-14T08:15:00Z",
    "matching_status": "processing"
  }
}
```

---

### GET /v1/dreams/{id} 🔓

Tekil rüya detayı. Görünürlük kuralları uygulanır.

---

### PUT /v1/dreams/{id} 🔒

Rüya güncelleme. Yalnızca sahip düzenleyebilir.

---

### DELETE /v1/dreams/{id} 🔒

Rüya silme (soft delete).

---

### GET /v1/dreams/me 🔒

Kullanıcının kendi rüya listesi.

**Query:** `?limit=20&cursor=&category=nightmare&visibility=private`

---

### GET /v1/dreams/{id}/matches 🔒

Bir rüyanın eşleşmelerini getirir.

**Query:** `?limit=10&min_score=0.6`

**Response 200:**

```json
{
  "data": [
    {
      "dream": {
        "id": "uuid",
        "title": "Paris'te Özgürce Uçmak",
        "content": "...",
        "user": { "username": "emre_m", "avatar_url": "..." },
        "category": "lucid"
      },
      "similarity_score": 0.89,
      "common_tags": ["paris", "uçmak"]
    }
  ]
}
```

---

### POST /v1/dreams/drafts 🔒

Taslak kaydetme (auto-save).

**Request:**

```json
{
  "title": "Yarım kalan rüya",
  "content": "Henüz tamamlanmamış..."
}
```

---

### GET /v1/dreams/drafts 🔒

### DELETE /v1/dreams/drafts/{id} 🔒

---

## 6. FEED ENDPOİNTLERİ

### GET /v1/feed 🔒

Global rüya akışı.

**Query:** `?limit=20&cursor=&sort=newest|trending|most_matched`

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "İstanbul'da Kaybolmak",
      "content_preview": "Kapalıçarşı'da yolumu kaybettim ve...",
      "category": "normal",
      "user": {
        "username": "fatma_k",
        "avatar_url": "...",
        "display_name": "Fatma"
      },
      "tags": ["#istanbul", "#kaybolmak"],
      "like_count": 24,
      "comment_count": 7,
      "match_count": 31,
      "is_liked": false,
      "is_saved": false,
      "created_at": "2026-06-14T07:22:00Z"
    }
  ],
  "pagination": {
    "cursor": "eyJpZCI6...",
    "has_next": true
  }
}
```

---

### GET /v1/feed/trending 🔓

Trend rüya etiketleri ve konular.

**Response 200:**

```json
{
  "data": {
    "period": "last_24_hours",
    "tags": [
      { "name": "uçmak", "dream_count": 1247, "rank": 1 },
      { "name": "istanbul", "dream_count": 892, "rank": 2 },
      { "name": "deniz", "dream_count": 756, "rank": 3 }
    ]
  }
}
```

---

### GET /v1/feed/following 🔒

Takip edilen kullanıcıların rüya akışı.

**Query:** `?limit=20&cursor=`

---

## 7. SOSYAL ENDPOİNTLERİ

### POST /v1/dreams/{id}/like 🔒

### DELETE /v1/dreams/{id}/like 🔒

---

### GET /v1/dreams/{id}/comments 🔓

**Query:** `?limit=20&cursor=&parent_id=` (nested için)

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "content": "Benim de tam bu rüyayı görüyorum hep!",
      "user": { "username": "emre_m", "avatar_url": "..." },
      "like_count": 3,
      "reply_count": 1,
      "created_at": "2026-06-14T09:10:00Z"
    }
  ]
}
```

---

### POST /v1/dreams/{id}/comments 🔒

**Request:**

```json
{
  "content": "Beni de aynı yer ziyaret etti rüyamda!",
  "parent_id": null
}
```

---

### DELETE /v1/dreams/{dream_id}/comments/{comment_id} 🔒

---

### POST /v1/dreams/{id}/save 🔒

**Request:**

```json
{ "collection_name": "Lucid Rüyalarım" }
```

### DELETE /v1/dreams/{id}/save 🔒

### GET /v1/users/me/saved 🔒

**Query:** `?collection=Lucid Rüyalarım&limit=20&cursor=`

---

## 8. ARAMA ENDPOİNTLERİ

### GET /v1/search 🔓

**Query:** `?q=paris&type=dream|tag|user&limit=20&cursor=`

**Response 200:**

```json
{
  "data": {
    "dreams": [ ... ],
    "tags": [ { "name": "paris", "usage_count": 4521 } ],
    "users": [ { "username": "paris_dreamer", "display_name": "..." } ]
  }
}
```

---

### GET /v1/tags/{name}/dreams 🔓

Belirli bir etikete ait rüyalar.

**Query:** `?limit=20&cursor=&sort=newest|trending`

---

### GET /v1/tags/suggest 🔒

NLP tabanlı etiket önerisi (rüya metni gönderilir).

**Request:**

```json
{ "content": "Paris'te Eyfel Kulesi'nin önünde duruyordum..." }
```

**Response 200:**

```json
{
  "data": {
    "suggestions": [
      { "name": "paris", "type": "place", "confidence": 0.98 },
      { "name": "eyfelkulesi", "type": "place", "confidence": 0.95 },
      { "name": "seyahat", "type": "other", "confidence": 0.72 }
    ]
  }
}
```

---

### POST /v1/tags/{name}/follow 🔒

### DELETE /v1/tags/{name}/follow 🔒

---

## 9. BİLDİRİM ENDPOİNTLERİ

### GET /v1/notifications 🔒

**Query:** `?limit=20&cursor=&unread_only=true`

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "dream_match",
      "title": "Rüyan eşleşti!",
      "body": "3 kişi senin gibi Paris'i rüyasında gördü",
      "entity_type": "dream",
      "entity_id": "dream_uuid",
      "is_read": false,
      "created_at": "2026-06-14T08:45:00Z"
    }
  ],
  "meta": { "unread_count": 5 }
}
```

---

### PUT /v1/notifications/{id}/read 🔒

### PUT /v1/notifications/read-all 🔒

---

### GET /v1/notifications/settings 🔒

### PUT /v1/notifications/settings 🔒

**Request:**

```json
{
  "notify_dream_match": true,
  "notify_likes": false,
  "morning_reminder_enabled": true,
  "morning_reminder_time": "07:30",
  "morning_reminder_timezone": "Europe/Istanbul"
}
```

---

## 10. CİHAZ ENDPOİNTLERİ

### POST /v1/devices 🔒

Push bildirim token kaydı.

**Request:**

```json
{
  "push_token": "ExponentPushToken[xxxx]",
  "platform": "ios",
  "device_model": "iPhone 15 Pro",
  "app_version": "1.0.0"
}
```

### DELETE /v1/devices/{push_token} 🔒

---

## 11. RAPOR ENDPOİNTLERİ

### POST /v1/reports 🔒

**Request:**

```json
{
  "entity_type": "dream",
  "entity_id": "dream_uuid",
  "reason": "inappropriate",
  "description": "Uygunsuz içerik içeriyor"
}
```

---

## 12. KULLANICI AYARLARI

### GET /v1/users/me/settings 🔒

### PUT /v1/users/me/settings 🔒

**Request:**

```json
{
  "default_dream_visibility": "followers",
  "allow_dream_in_ads": true,
  "language": "tr"
}
```

---

## 13. V2 ENDPOİNTLERİ (Planlanan)

### POST /v1/dreams/{id}/audio 🔒

Sesli rüya yüklemesi için presigned URL alır.

**Response 200:**

```json
{
  "data": {
    "upload_url": "https://s3.amazonaws.com/...",
    "audio_id": "uuid",
    "expires_in": 300
  }
}
```

### PUT /v1/dreams/audio/{id}/complete 🔒

Yükleme tamamlandı bildirimi (transcript tetiklenir).

### GET /v1/interpreters 🔓

**Query:** `?specialty=spiritual&limit=20`

### POST /v1/dreams/{id}/interpretation-requests 🔒

### GET /v1/users/me/interpretation-requests 🔒

### GET /v1/users/{username}/compare-dreams/{other_username} 🔒

İki profil arası rüya benzerlik analizi.

---

## 14. V3 ENDPOİNTLERİ — Marka Paneli

### GET /v1/ads/cohorts 🔑

Mevcut rüya hedefleme kohortları.

### POST /v1/ads/campaigns 🔑

### GET /v1/ads/campaigns/{id} 🔑

### GET /v1/ads/campaigns/{id}/analytics 🔑

---

## 15. WebSocket Olayları

Bağlantı: `wss://api.dreamcloud.app/v1/ws?token={access_token}`

### İstemciden Sunucuya

```json
// Bağlantı başlatma
{ "event": "subscribe", "data": { "user_id": "uuid" } }

// Dream sayfasını izleme
{ "event": "subscribe_dream", "data": { "dream_id": "uuid" } }
```

### Sunucudan İstemciye

```json
// Rüya eşleşmesi tamamlandı
{
  "event": "dream:matched",
  "data": {
    "dream_id": "uuid",
    "match_count": 7,
    "top_match": { "dream_id": "uuid", "score": 0.92 }
  }
}

// Yeni beğeni
{ "event": "social:like", "data": { "dream_id": "uuid", "like_count": 25 } }

// Yeni yorum
{
  "event": "social:comment",
  "data": { "dream_id": "uuid", "comment": { ... } }
}
```

---

## 16. İç API (Internal — Servisler Arası)

### POST /internal/dreams/{id}/embed

NLP servisi tarafından çağrılır. Embedding kaydedildi bildirimi.

### POST /internal/dreams/{id}/matches

NLP servisi tarafından çağrılır. Eşleşme sonuçları kaydedilir.

### POST /internal/notifications/push

Bildirim servisi tarafından çağrılır. Push bildirim kuyruğuna ekler.

_İç API'ler yalnızca dahili ağdan erişilebilir; JWT yerine servis-to-servis API key kullanır._

---

_Bu doküman API_ARCHITECTURE.md olup tüm endpoint tanımlarını kapsar. Swagger/OpenAPI dokümantasyonu `@nestjs/swagger` ile otomatik üretilecektir._
