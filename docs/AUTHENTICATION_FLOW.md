# Authentication Flow

## DreamCloud — Kimlik Doğrulama Akışları

**Versiyon:** 1.0 | **Tarih:** 2026-06-14

---

## 1. Token Mimarisi

### JWT Access Token

```
Algoritma:   RS256 (RSA 2048-bit, asimetrik)
Süre:        15 dakika
Payload:     { sub, username, role, iat, exp }
İmzalama:    Private key (sunucu), Doğrulama: Public key (tüm servisler)
```

**Neden RS256 (HS256 değil)?**  
HS256'da tek bir secret key hem imzalar hem doğrular. Mikroservis mimarisinde her servisin bu secret'a sahip olması güvenlik riski oluşturur. RS256'da yalnızca Auth Service private key'e sahiptir; diğer servisler yalnızca public key kullanarak doğrular.

### JWT Refresh Token

```
Algoritma:   Opaque token (UUID, rastgele 32 byte)
Süre:        30 gün
Saklama:     SHA-256 hash → PostgreSQL (refresh_tokens tablosu)
Rotasyon:    Her kullanımda yeni token üretilir (Refresh Token Rotation)
```

### Access Token Payload

```json
{
  "sub": "user-uuid",
  "username": "zeynep_dreams",
  "role": "user",
  "iat": 1718352000,
  "exp": 1718352900
}
```

---

## 2. E-posta / Şifre ile Kayıt Akışı

```
[Kullanıcı]          [Mobil App]          [Auth API]           [PostgreSQL]   [AWS SES]
     │                    │                    │                     │              │
     │── Formu doldurur ──►│                   │                     │              │
     │                    │── POST /register ──►│                    │              │
     │                    │                    │── email unique? ────►│             │
     │                    │                    │◄── EXISTS: true ────│              │
     │                    │◄── 409 Conflict ───│                     │              │
     │◄── "E-posta kayıtlı"│                   │                     │              │
     │                    │                    │                     │              │
     │── Farklı e-posta ──►│                   │                     │              │
     │                    │── POST /register ──►│                    │              │
     │                    │                    │── email unique? ────►│             │
     │                    │                    │◄── NOT EXISTS ──────│              │
     │                    │                    │── bcrypt(password) ─►│             │
     │                    │                    │── INSERT user ──────►│             │
     │                    │                    │── INSERT profile ───►│             │
     │                    │                    │── INSERT settings ──►│             │
     │                    │                    │── OTP üret (6 hane) │              │
     │                    │                    │── Redis SET otp:{email} TTL:600   │
     │                    │                    │────────────────────────────── OTP e-posta gönder ──►│
     │                    │                    │── JWT üret (access + refresh)     │
     │                    │◄── 201 tokens ─────│                     │              │
     │◄── Ana sayfaya yönlendir             │                     │              │
     │                    │                    │                     │              │
     │── OTP'yi girer ───►│                   │                     │              │
     │                    │── POST /verify-email►│                   │              │
     │                    │                    │── Redis GET otp:{email}           │
     │                    │                    │── OTP eşleşiyor mu?               │
     │                    │                    │── UPDATE is_email_verified=true ─►│
     │                    │                    │── Redis DEL otp:{email}           │
     │                    │◄── 200 OK ─────────│                     │              │
```

---

## 3. E-posta / Şifre ile Giriş Akışı

```
[Kullanıcı]    [Mobil App]       [Auth API]          [PostgreSQL]      [Redis]
     │              │                 │                    │               │
     │── Giriş ────►│                │                    │               │
     │              │── POST /login ──►│                  │               │
     │              │                 │── SELECT user ────►│              │
     │              │                 │◄── user row ───────│              │
     │              │                 │                    │               │
     │              │                 │── bcrypt.compare() │               │
     │              │                 │── Hatalı ise: ─────►              │
     │              │                 │   failedAttempts++ │               │
     │              │                 │   5 başarısızsa: account_locked   │
     │              │                 │                    │               │
     │              │                 │── Başarılıysa:     │               │
     │              │                 │── JWT access token üret           │
     │              │                 │── Refresh token üret (UUID)       │
     │              │                 │── SHA256(refresh) ─────────────────►SET
     │              │                 │── INSERT refresh_tokens ──►│      │
     │              │                 │── UPDATE last_login_at ────►│     │
     │              │◄── 200 tokens ──│                    │               │
     │◄── Dashboard │                 │                    │               │
```

---

## 4. Token Yenileme (Refresh Token Rotation)

```
[Mobil App]           [Auth API]           [PostgreSQL]         [Redis]
     │                     │                    │                   │
     │ Access token sürüyor│                    │                   │
     │── POST /auth/refresh►│                  │                   │
     │   {refresh_token}   │                   │                   │
     │                     │── SHA256(token) ──►│                  │
     │                     │── SELECT WHERE     │                   │
     │                     │   token_hash=hash  │                   │
     │                     │   AND revoked_at IS NULL               │
     │                     │   AND expires_at > NOW()               │
     │                     │◄── token row ──────│                  │
     │                     │                    │                   │
     │                     │── Eski token'ı iptal et               │
     │                     │── UPDATE revoked_at=NOW() ────►│      │
     │                     │                    │                   │
     │                     │── Yeni JWT access token üret          │
     │                     │── Yeni refresh token üret (UUID)      │
     │                     │── INSERT yeni refresh_tokens ──►│     │
     │                     │                    │                   │
     │◄── 200 new_tokens ──│                    │                   │

NOT: Çalınmış refresh token tespit mekanizması:
Eğer zaten iptal edilmiş bir refresh token kullanılırsa,
bu bir saldırı işareti olabilir → TÜM kullanıcı oturumları iptal edilir.
```

---

## 5. Google OAuth Akışı

```
[Kullanıcı]   [Mobil App]         [Google]       [Auth API]         [PostgreSQL]
     │              │                  │                │                  │
     │── "Google ile giriş"            │                │                  │
     │              │── Google OAuth ──►              │                  │
     │              │   (expo-auth-session)            │                  │
     │              │◄── id_token ─────              │                  │
     │              │                  │                │                  │
     │              │── POST /auth/oauth/google         │                  │
     │              │   {id_token}  ──────────────────►│                  │
     │              │                  │                │── Google key ile │
     │              │                  │                │   token doğrula  │
     │              │                  │◄── verify ─────│                  │
     │              │                  │                │                  │
     │              │                  │                │── oauth_accounts'da
     │              │                  │                │   google_id var mı?
     │              │                  │                │──────────────────►│
     │              │                  │                │                  │
     │              │                  │     [Var]      │◄── user_id ──────│
     │              │                  │                │── JWT üret        │
     │              │                  │                │                  │
     │              │                  │     [Yok]      │── Yeni user oluştur
     │              │                  │                │── username üret (google_name + 4 random)
     │              │                  │                │── INSERT users ──►│
     │              │                  │                │── INSERT oauth_accounts►│
     │              │                  │                │── JWT üret        │
     │              │                  │                │                  │
     │              │◄── 200 tokens ──────────────────│                  │
```

---

## 6. Şifre Sıfırlama Akışı

```
[Kullanıcı]    [Mobil App]    [Auth API]    [PostgreSQL]   [AWS SES]   [Redis]
     │              │               │               │            │          │
     │── E-posta ──►│              │               │            │          │
     │              │── POST /forgot-password       │            │          │
     │              │   {email} ───►│              │            │          │
     │              │               │── E-posta var mı? ────────►         │
     │              │               │              │            │          │
     │              │ (Her durumda 200 dön; kullanıcıya e-posta var mı ipucu verme)
     │              │               │── Signed token üret (HMAC, 1 saat)  │
     │              │               │── Redis SET reset:{token} user_id TTL:3600
     │              │               │───────────────────────────────── Reset linki gönder
     │              │◄── 200 OK ────│              │            │          │
     │◄── "E-posta gönderildi" mesajı              │            │          │
     │              │               │               │            │          │
     │── Linke tıkla►│             │               │            │          │
     │── Yeni şifre ►│             │               │            │          │
     │              │── POST /reset-password        │            │          │
     │              │   {token, new_password} ─────►│           │          │
     │              │               │── Redis GET reset:{token} ──────────►│
     │              │               │◄── user_id ──────────────────────────│
     │              │               │── bcrypt(new_password)    │          │
     │              │               │── UPDATE password_hash ───►│         │
     │              │               │── Redis DEL reset:{token} ──────────►│
     │              │               │── Tüm refresh token'ları iptal et ──►│
     │              │◄── 200 OK ────│              │            │          │
     │◄── "Şifre güncellendi, giriş yap"           │            │          │
```

---

## 7. Çoklu Cihaz Yönetimi

Her cihaz için ayrı refresh token saklanır. Kullanıcı bir cihazdan "Tüm cihazlardan çıkış" yapabilir.

```
refresh_tokens tablosu:
┌──────────────┬─────────────┬──────────────────────┬──────────────┐
│ user_id      │ device_id   │ user_agent            │ revoked_at   │
├──────────────┼─────────────┼──────────────────────┼──────────────┤
│ uuid-zeynep  │ iphone-15   │ DreamCloud/iOS/1.0   │ NULL (aktif) │
│ uuid-zeynep  │ ipad-mini   │ DreamCloud/iOS/1.0   │ NULL (aktif) │
│ uuid-zeynep  │ android-tab │ DreamCloud/Android   │ 2026-06-10   │
└──────────────┴─────────────┴──────────────────────┴──────────────┘

POST /auth/logout-all → tüm satırlar revoked_at = NOW() ile güncellenir
```

---

## 8. Oturum Güvenlik Kontrolleri

### Şüpheli Aktivite Tespiti

```
Kontrol 1: IP Değişikliği
  Aynı refresh token farklı IP'den → Warning log + opsiyonel kullanıcı bildirimi

Kontrol 2: Çok Sayıda Başarısız Giriş
  5 başarısız giriş / 15 dk → Hesap geçici kilitlenmesi (30 dk)
  Redis: SET lockout:{email} attempts EX 900

Kontrol 3: Süresi Dolmuş Token Kullanımı
  Grace period yok → 401 Unauthorized

Kontrol 4: İptal Edilmiş Token Yeniden Kullanımı
  Bu token zaten iptal edilmişse → TÜM oturumları iptal et (token theft indication)
```

### Hesap Güvenlik Bildirimleri (e-posta)

- Yeni cihazdan giriş
- Şifre değişikliği
- Tüm cihazlardan çıkış
- Hesap silme

---

## 9. Middleware ve Guard Katmanı (NestJS)

```typescript
// İstek akışı (her korumalı endpoint):
Request
  → JwtAuthGuard (token var mı, geçerli mi?)
  → RolesGuard (gerekli rol var mı?)
  → RateLimitGuard (limit aşıldı mı?)
  → ThrottlerGuard (çok sık istek var mı?)
  → Controller Handler
  → Response
```

### Endpoint Koruma Seviyeleri

```
@Public()            → JwtAuthGuard devre dışı
@Roles('admin')      → Admin role zorunlu
@Roles('moderator')  → Moderatör veya admin
(varsayılan)         → Geçerli JWT yeterli
```

---

## 10. Token Saklama (Mobil İstemci)

```typescript
// Güvenli saklama — Expo SecureStore
// iOS: Keychain Services
// Android: Keystore + EncryptedSharedPreferences

await SecureStore.setItemAsync('access_token', accessToken);
await SecureStore.setItemAsync('refresh_token', refreshToken);

// Bellek içi (in-memory) — Access token
// Uygulama açıkken RAM'de tutulur, kapatılınca silinir
// Yalnızca refresh token kalıcı olarak saklanır

// Otomatik token yenileme
// React Query interceptor: 401 alınırsa /auth/refresh çağır,
// yeni token al, isteği tekrar et
```

---

## 11. Güvenli Oturum Kapatma Kontrol Listesi

```
✅ Access token sunucuda blacklist'e alınır (Redis, TTL: kalan süre)
✅ Refresh token PostgreSQL'de revoked_at ile iptal edilir
✅ Cihaz push token deaktive edilir
✅ WebSocket bağlantısı kapatılır
✅ Mobil uygulama SecureStore'dan token'ları siler
✅ Bellek içi state temizlenir
```

---

_Bu doküman AUTHENTICATION_FLOW.md olup kimlik doğrulama akışlarını kapsar. Token süresi ve rotasyon parametreleri güvenlik denetiminden geçirilmelidir._
