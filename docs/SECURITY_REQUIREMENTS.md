# Security Requirements

## DreamCloud — Güvenlik ve Gizlilik Gereksinimleri

**Versiyon:** 1.0 | **Tarih:** 2026-06-14

---

## 1. Güvenlik Felsefesi

DreamCloud, kullanıcıların en kişisel verilerini — bilinçaltı deneyimlerini — işler. Bu nedenle güvenlik ve gizlilik, sonradan eklenen özellikler değil; mimarinin temel taşıdır.

**Prensipler:**

- **Privacy by Design:** Gizlilik tasarımın başından dahil edilir, sonradan yamalanmaz
- **Minimum Veri:** Yalnızca gerekli veri toplanır; fazlası saklanmaz
- **Varsayılan Gizlilik:** Her ayarın varsayılanı en gizli seçenektir
- **Şeffaflık:** Kullanıcı verilerinin nerede, nasıl kullanıldığını her zaman görebilir
- **Zero Trust:** İç ağdaki servisler bile birbirini doğrular

---

## 2. Veri Sınıflandırması

| Sınıf           | Örnekler                               | Koruma Seviyesi                  |
| --------------- | -------------------------------------- | -------------------------------- |
| **Kritik**      | Şifre hash, OAuth token, refresh token | En yüksek — şifreli + erişim log |
| **Hassas**      | Rüya içerikleri, e-posta, IP adresi    | Yüksek — şifreli, erişim kısıtlı |
| **Dahili**      | Kullanıcı istatistikleri, etiketler    | Orta — erişim kontrollü          |
| **Kamuya Açık** | Herkese açık rüyalar, trend etiketler  | Düşük — public API               |

---

## 3. Şifreleme Gereksinimleri

### Aktarımda (In Transit)

```
Protokol:         TLS 1.3 (minimum 1.2)
Cipher Suites:    TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256
HSTS:             max-age=31536000; includeSubDomains; preload
Certificate:      Let's Encrypt / AWS ACM, otomatik yenileme
API'ye HTTP:      301 redirect → HTTPS
WebSocket:        wss:// (TLS üzerinden)
```

### Beklemede (At Rest)

```
PostgreSQL:       AWS RDS şifreli volume (AES-256)
Redis:            AWS ElastiCache şifreli (in-transit + at-rest)
S3 (Medya):       SSE-S3 (AES-256) server-side encryption
Uygulama katmanı (hassas alanlar):
  - oauth_accounts.access_token  → AES-256-GCM (uygulama şifreli)
  - oauth_accounts.refresh_token → AES-256-GCM
  - Şifreleme anahtarları: AWS KMS
```

### Şifre Hashleme

```
Algoritma:  bcrypt, rounds=12
Neden 12:   ~300ms üretim maliyeti → brute-force yavaşlatma
Güncellik:  Yeni bcrypt versiyonu çıkınca migrasyon planı hazır olmalı
Yasak:      MD5, SHA-1, SHA-256 ile düz şifre hashleme kullanılmaz
```

---

## 4. API Güvenliği

### HTTP Güvenlik Başlıkları (Helmet.js)

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; ...
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(self), geolocation=()
X-XSS-Protection: 1; mode=block
```

### CORS Yapılandırması

```typescript
// Yalnızca onaylı origin'ler
const allowedOrigins = [
  'https://dreamcloud.app', // Prodüksiyon web (V2)
  'https://staging.dreamcloud.app', // Staging
];

// Mobil uygulama: mobil istemci Origin header göndermez
// capacitor:// veya exp:// origin'i → Native mobile olarak işlenir
```

### Input Validasyonu

```
Tüm giriş verileri: class-validator ile DTO katmanında doğrulanır
Metin alanları:     XSS sanitizasyonu (DOMPurify eşdeğeri backend'de)
SQL Injection:      TypeORM parametrik sorgular → ORM güvencesi
Path Traversal:     Dosya yolu girdilerinde whitelist kontrolü
```

### Rate Limiting Detayı

```typescript
// Auth endpoint'leri (brute-force koruması)
POST /auth/login:         10 istek / 15 dk / IP
POST /auth/register:      5 istek / saat / IP
POST /auth/forgot-password: 3 istek / saat / e-posta

// Genel API
Default:                  200 istek / dk / kullanıcı
Dream oluşturma:          20 istek / saat / kullanıcı
Yorum:                    30 istek / saat / kullanıcı

// Limit aşılınca:
HTTP 429 Too Many Requests
Retry-After: {seconds}
```

---

## 5. Kimlik Doğrulama Güvenliği

### Hesap Kilitleme

```
5 başarısız giriş → 30 dk kilitlenme
10 başarısız giriş → 24 saat kilitlenme
Kilitlenme kaydı: Redis (TTL-based, otomatik sona erer)
Kullanıcıya e-posta bildirimi gönderilir
```

### Token Güvenliği

```
Access Token:
  - RS256 imzalı (private key yalnızca Auth Service'te)
  - 15 dakika TTL (kısa süre → çalınsa da hızla geçersiz)
  - Kritik işlemlerde token blacklist kontrolü (Redis)

Refresh Token:
  - 32 byte rastgele (256-bit entropy)
  - Yalnızca SHA-256 hash'i saklanır (raw token hiç yazılmaz)
  - Tek kullanımlık rotasyon (her yenilemede yeni token)
  - İptal edilmiş token kullanılırsa: TÜM oturumlar iptal
```

### OAuth Güvenliği

```
State parameter:    CSRF koruması için random state
PKCE:               Code verifier/challenge (public client güvenliği)
Token doğrulama:    Google/Apple public key ile verify (sunucu tarafında)
```

---

## 6. Veri Gizliliği ve GDPR / KVKK Uyumu

### Hukuki Dayanak (Legal Basis)

```
Rüya içerikleri:     Açık rıza (Madde 6(1)(a) GDPR)
Sosyal etkileşim:    Sözleşme ifası (Madde 6(1)(b))
Güvenlik logları:    Meşru menfaat (Madde 6(1)(f))
Reklam hedefleme:    Açık rıza (Madde 6(1)(a)) — ayrı onay
Araştırma verisi:    Açık rıza (Madde 6(1)(a)) — ayrı onay
```

### Kullanıcı Hakları Uygulaması

| Hak                      | Uygulama                                            |
| ------------------------ | --------------------------------------------------- |
| **Erişim hakkı**         | GET /v1/users/me/data-export → JSON arşiv           |
| **Düzeltme hakkı**       | PUT /v1/users/me profil güncelleme                  |
| **Silme hakkı**          | DELETE /v1/users/me → 30 gün içinde tam silme       |
| **İşlemeyi kısıtlama**   | allow_dream_in_ads=false → reklam sisteminden çıkar |
| **Veri taşınabilirliği** | JSON/CSV export, tüm rüyalar dahil                  |
| **İtiraz hakkı**         | Pazarlama iletişimini tek tıkla durdurma            |

### Veri Silme Protokolü

```
1. DELETE /users/me isteği alınır
2. Hesap soft-delete (deleted_at = NOW())
3. Kullanıcıya "30 gün içinde geri alabilirsiniz" e-postası
4. 30 gün sonra otomatik cron:
   - Tüm rüyalar silinir (hard delete)
   - Yorumlar [silinmiş kullanıcı] olarak anonimleştirilir
   - Beğeni, takip kayıtları silinir
   - OAuth token'ları silinir
   - Push token'lar silinir
   - E-posta hash olarak saklanır (spam önleme, 2 yıl)
5. Silme onayı e-postası gönderilir
6. Silme log'u (audit trail) anonim olarak 3 yıl saklanır
```

### Reklam Veri Onayı

```
Kullanıcı kayıt akışında ayrı checkbox (önceden işaretlenmemiş):
  ☐ "Rüya içeriklerimin anonim olarak reklam hedeflemesinde
     kullanılmasına onay veriyorum"

Onay verilmezse:
  - Rüya verileri eşleştirmede kullanılır
  - Rüya verileri reklam sistemine dahil edilmez
  - Uygulama tam işlevsel kalmaya devam eder
```

### Veri Minimizasyonu

```
Toplanmayan veriler:
  ✗ Gerçek ad, soyad (opsiyonel, boş bırakılabilir)
  ✗ Telefon numarası
  ✗ Kesin konum (yalnızca şehir bazında, opsiyonel)
  ✗ Biyometrik veri (REM için: yalnızca uyku evreleri, ham sensör verisi değil)
  ✗ Üçüncü taraf çerezler

Anonimleştirme:
  Araştırma / trend verileri daima toplulaştırılmış (min. 1000 kullanıcı kohortu)
  Bireysel rüya asla marka yöneticisine iletilmez
```

---

## 7. İçerik Güvenliği

### Otomatik Moderasyon Pipeline

```
Rüya metin girişi
        │
        ▼
[OpenAI Moderation API]
   categories: hate, harassment, sexual, violence, self-harm
   scores: 0.0 – 1.0
        │
        ▼
   score > 0.85?
        │
   YES ─┤─ NO
        │         │
        ▼         ▼
   [İçerik       [Kaydet ve yayınla]
    bloklanır]   [NLP embedding başlat]
        │
        ▼
   [Kullanıcıya] "İçeriğiniz topluluk kurallarımızla
                  uyumsuz görünüyor"
        │
        ▼
   [Moderasyon kuyruğu] (kullanıcı itiraz edebilir)
```

### İçerik Güvenliği Eşikleri

| Kategori       | Eşik  | Aksiyon                       |
| -------------- | ----- | ----------------------------- |
| Nefret söylemi | >0.80 | Otomatik blok                 |
| Cinsel içerik  | >0.85 | Otomatik blok                 |
| Şiddet         | >0.85 | Otomatik blok                 |
| Öz-zarar       | >0.70 | Blok + Kriz kaynakları göster |
| Spam           | >0.90 | Otomatik blok                 |

**Öz-zarar Protokolü:**  
Öz-zarar içerik tespit edildiğinde içerik bloklanır ve kullanıcıya `182 İntihar Önleme Hattı` ve `www.intiharionle.gov.tr` kaynakları gösterilir.

---

## 8. Altyapı Güvenliği

### Ağ İzolasyonu

```
Internet
    │
[AWS CloudFront] ← DDoS koruması, WAF
    │
[Application Load Balancer] ← SSL Termination
    │
[Public Subnet]
    │── [NestJS ECS Tasks]
    │── [Python NLP ECS Tasks]
    │
[Private Subnet] ← Internet erişimi yok
    │── [RDS PostgreSQL]
    │── [ElastiCache Redis]
```

### Sır Yönetimi (Secrets Management)

```
Yasaklı:     .env dosyasında production secret
             Kod içinde hardcoded key
             Git history'de secret (gitleaks pre-commit hook)

Zorunlu:     AWS Secrets Manager (production)
             Uygulama başlangıcında runtime'da çekme
             Secret rotasyon: her 90 günde bir (otomatik)

Uygulama anahtarları:
  JWT_PRIVATE_KEY        → AWS Secrets Manager
  DATABASE_URL           → AWS Secrets Manager
  REDIS_URL              → AWS Secrets Manager
  OPENAI_API_KEY         → AWS Secrets Manager
  AWS_SES_CREDENTIALS    → IAM Role (key yok, instance profile)
```

### AWS WAF Kuralları

```
Blokla:
  - SQL Injection imzaları
  - XSS imzaları
  - Bilinen kötü IP listeleri (AWS Managed Rules)
  - Coğrafi engelleme (gerekirse belirli ülkeler)

Rate limit:
  - 1000+ istek / 5 dk / IP → geçici blok
```

### Güvenlik Log'ları

```
Loglanacak her olay:
  - Başarılı ve başarısız giriş denemeleri (IP, timestamp, user_agent)
  - Token yenileme işlemleri
  - Şifre değişikliği
  - Hesap silme
  - Admin işlemleri
  - İçerik moderasyon kararları
  - Rate limit aşımları

Log saklama: 12 ay (CloudWatch Logs)
Audit trail: 36 ay (S3 arşiv, değiştirilemez)
SIEM entegrasyonu: Güvenlik olayları için alert (V2)
```

---

## 9. Güvenli Yazılım Geliştirme

### Bağımlılık Güvenliği

```bash
# Her PR'da otomatik çalışır (GitHub Actions)
npm audit --audit-level=high    # Kritik/yüksek güvenlik açıkları
snyk test                       # Gelişmiş bağımlılık taraması
```

### Kod Güvenliği

```
Pre-commit hooks:
  - gitleaks: secret/API key tespiti
  - eslint-plugin-security: güvensiz kod pattern'ları

PR zorunlulukları:
  - En az 1 kod incelemesi (review)
  - CI test'lerin geçmesi
  - Güvenlik taramalarının geçmesi

Penetrasyon testi:
  - Yayın öncesi: Manuel pentest (3. taraf)
  - Yılda 1 kez: Kapsamlı güvenlik denetimi
```

### Güvenli Konfigürasyon

```
Production'da kapalı olması gerekenler:
  ✗ Debug modu
  ✗ Stack trace kullanıcıya gösterimi
  ✗ Verbose error mesajları
  ✗ Swagger UI (yalnızca staging'de açık)
  ✗ Seed data endpoint'leri
```

---

## 10. Olay Müdahale Planı

### Güvenlik Olayı Seviyeleri

| Seviye      | Örnek                                  | Müdahale Süresi |
| ----------- | -------------------------------------- | --------------- |
| P0 — Kritik | Veri sızıntısı, sistem ele geçirilmesi | 1 saat içinde   |
| P1 — Yüksek | Auth bypass, mass credential exposure  | 4 saat içinde   |
| P2 — Orta   | DDoS, tek kullanıcı hesabı ele geçirme | 24 saat içinde  |
| P3 — Düşük  | Güvenlik açığı raporu (exploit yok)    | 72 saat içinde  |

### Veri İhlali Bildirimi

```
GDPR Madde 33: 72 saat içinde ilgili Veri Koruma Otoritesi'ne bildirim
               (Türkiye: KVKK; AB: ilgili DPA)
GDPR Madde 34: Yüksek risk varsa → etkilenen kullanıcılara bildirim
               "Şeffaf ve sade dil" zorunlu
```

### Acil Durum Prosedürü

```
1. Olayı tespit et ve belgele
2. Etkilenen sistemi izole et (gerekirse trafik kes)
3. Ekibi ve hukuk danışmanını bilgilendir
4. Kapsamı belirle (kaç kullanıcı, hangi veri)
5. Sızıntıyı kapat
6. Yasal bildirim (72 saat)
7. Kullanıcı bildirimi (gerekirse)
8. Post-mortem (RCA ve önlem planı)
```

---

## 11. Güvenlik Kontrol Listesi (Launch Öncesi)

```
Kimlik Doğrulama
  ✅ JWT RS256 doğru yapılandırıldı
  ✅ Refresh token rotasyon çalışıyor
  ✅ Brute-force koruması aktif
  ✅ OAuth state/PKCE uygulandı

Veri Koruması
  ✅ TLS 1.3 zorunlu
  ✅ bcrypt rounds=12
  ✅ Veritabanı şifreli (at rest)
  ✅ Sensitive alanlar uygulama katmanında şifreli

API Güvenliği
  ✅ CORS whitelist yapılandırıldı
  ✅ Rate limiting aktif
  ✅ Helmet.js headers aktif
  ✅ Input validasyon tüm endpoint'lerde

GDPR / KVKK
  ✅ Gizlilik politikası yazıldı ve onaylatıldı
  ✅ Reklam onayı ayrı checkbox (önceden işaretlenmemiş)
  ✅ Veri silme akışı test edildi
  ✅ Veri export özelliği çalışıyor

Altyapı
  ✅ WAF aktif
  ✅ Secrets Manager kullanılıyor (.env yok production'da)
  ✅ Security log'ları aktif
  ✅ Dependency audit otomatik CI'da
  ✅ Penetrasyon testi tamamlandı
```

---

_Bu doküman SECURITY_REQUIREMENTS.md olup yayın öncesi güvenlik kontrol listesi olarak kullanılmalıdır. Güvenlik gereksinimleri 6 ayda bir gözden geçirilmelidir._
