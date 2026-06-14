# DEVELOPMENT_RULES.md

## DreamCloud — Geliştirme Kuralları ve Ekip Anlaşmaları

**Versiyon:** 1.0 | **Tarih:** 2026-06-14  
**Kaynak:** MASTER_PROJECT.md · SECURITY_REQUIREMENTS.md · MVP_ROADMAP.md

> Bu kurallar ekip anlaşmasıdır. İstisna kabul edilmez; istisnai durum gerekliyse ekiple karar alınır.

---

## 1. TEMEL PRENSİPLER

### 1.1 Kod Yazma Felsefesi

- **Çalışan kod → Okunabilir kod → Hızlı kod** (bu sırayla)
- Erken optimizasyon yasak — ölçüm olmadan optimizasyon olmaz
- Her değişiklik gerekçelendirilmeli: "Neden?" sorusu yanıtsız kalmamalı
- Kod karmaşık hissettiriyorsa muhtemelen yanlış tasarlanmıştır

### 1.2 Güvenlik Önce

- Güvenlik özelliği değil, zorunluluktur
- Her yeni endpoint'te authentication + authorization kontrol edilir
- Kullanıcı girdisine güven yok — her zaman validate et
- Secret yokken kod yok: `.env.example` her zaman güncellenir

### 1.3 Test Kültürü

- Test olmayan özellik tamamlanmış sayılmaz
- Hata düzeltmesi önce failing test, sonra fix
- Code coverage hedefi: kritik servislerde %80+

---

## 2. GELİŞTİRME ORTAMI KURULUM (YENİ EKİP ÜYESİ)

### Zorunlu Araçlar

```bash
# Node.js (nvm ile)
nvm install --lts
nvm use --lts

# Python (pyenv ile)
pyenv install 3.11.8
pyenv global 3.11.8

# Docker Desktop
# https://www.docker.com/products/docker-desktop/

# Araçlar
npm install -g @nestjs/cli
brew install awscli
brew install gh          # GitHub CLI

# VS Code / Cursor eklentileri
# - ESLint
# - Prettier
# - GitLens
# - Error Lens
# - REST Client (Postman alternatifi)
# - Python (Pylance)
# - Docker
```

### İlk Kurulum Adımları

```bash
# 1. Repo clone
git clone git@github.com:dreamcloud/dreamcloud-api.git
cd dreamcloud-api

# 2. Dependencies
npm install

# 3. Environment
cp .env.example .env
# .env dosyasını doldurmak için ekipten credentials al
# AWS Secrets Manager'dan: aws secretsmanager get-secret-value --secret-id dreamcloud/dev

# 4. Docker ortamını başlat
docker compose up -d

# 5. Migrations çalıştır
npm run migration:run

# 6. Uygulamayı başlat
npm run start:dev
```

---

## 3. GÜNDELİK ÇALIŞMA KURALLARI

### 3.1 Gün Başlangıcı

```bash
# develop'u güncelle
git checkout develop
git pull origin develop

# Çalıştığın branch'i rebase et
git checkout feature/xx-your-feature
git rebase origin/develop

# Docker ortamının çalıştığını kontrol et
docker compose ps
```

### 3.2 Commit Sıklığı

- Küçük ve sık commit: her mantıksal adım ayrı commit
- Minimum: günde en az 1 commit (çalışılan gün)
- WIP commit kabul edilmez (interactive rebase ile temizle)
- Gün sonu yarım iş `feature/*` branch'te kalabilir; `develop`'a merge edilmez

### 3.3 İletişim

- Blocker → aynı gün bildir (Slack veya standupda)
- PR review → 24 saat içinde yanıt
- Acil güvenlik bulgusu → Slack DM (kanal değil) + GitHub Security Advisory

---

## 4. TANIMLAR (DEFINITION OF DONE)

Bir görev aşağıdakiler tamamlanmadan "bitti" sayılmaz:

### Backend (NestJS) Görevi İçin

- [ ] Özellik implement edildi ve unit test yazıldı
- [ ] Test coverage bu servis için %80+ (kritik servisler: auth, dreams)
- [ ] TypeScript strict hata yok (`npm run type-check` geçiyor)
- [ ] ESLint + Prettier hata yok (`npm run lint` geçiyor)
- [ ] `develop` ile conflict çözüldü (rebase yapıldı)
- [ ] PR açıldı, açıklama eksiksiz dolduruldu
- [ ] CI/CD tüm check'leri geçiyor
- [ ] Reviewer onayı alındı
- [ ] `.env.example` güncellendi (yeni env var eklendiyse)
- [ ] Swagger/OpenAPI dökümantasyonu güncellendi
- [ ] DATABASE_SCHEMA.md veya API_ARCHITECTURE.md güncellendi (şema değiştiyse)

### Mobile (React Native) Görevi İçin

- [ ] Komponent/ekran implement edildi
- [ ] Component test yazıldı
- [ ] TypeScript strict hata yok
- [ ] ESLint + Prettier hata yok
- [ ] iOS ve Android'de manuel test yapıldı
- [ ] Farklı ekran boyutlarında (SE, 14 Pro Max, tablet) test edildi
- [ ] Dark mode kontrol edildi
- [ ] Yükleme ve hata durumları görsel olarak test edildi
- [ ] PR açıldı ve onaylandı

### NLP (Python) Görevi İçin

- [ ] Servis implement edildi
- [ ] pytest testleri yazıldı
- [ ] mypy tip kontrol geçiyor
- [ ] ruff linting geçiyor
- [ ] Performans testi: yanıt süresi `POST /internal/embed` < 500ms
- [ ] PR açıldı ve onaylandı

---

## 5. KOD İNCELEME (CODE REVIEW) KURALLARI

### Reviewer Sorumlulukları

- **Ne kontrol edilmeli:**
  - Mantık hatası var mı?
  - Güvenlik açığı var mı? (SQL injection, IDOR, mass assignment)
  - Performance sorunu var mı? (N+1 sorgu, index eksik)
  - Test coverage yeterli mi?
  - Naming açık ve tutarlı mı?
  - `CODING_STANDARDS.md`'e uygun mu?

- **Ne kontrol edilmez:**
  - Kişisel stil tercihleri (Prettier halleder)
  - Satır sonu boşluk (ESLint halleder)
  - Import sıralaması (ESLint halleder)

### Yorum Etiketleri

```
[BLOCKER]   → Merge edilemez, düzeltilmeli (güvenlik, hata, mantık hatası)
[NITPICK]   → Küçük öneri, PR sahibi karar verebilir
[QUESTION]  → Anlamadım, açıklama ister
[SUGGEST]   → İyileştirme önerisi, zorunlu değil
[PRAISE]    → İyi iş, teşvik
```

```typescript
// [BLOCKER] Bu sorgu N+1 problemi yaratır.
// Her dream için ayrı query gidiyor. Tek sorguda JOIN ile çöz.
const dreams = await this.dreamsRepository.find();
for (const dream of dreams) {
  dream.tags = await this.tagsRepository.findBy({ dreamId: dream.id });
}

// [SUGGEST] Bu magic number sabit olarak tanımlanabilir.
if (content.length > 2000) { ... }
```

### Review Süresi

- Draft PR → review isteğinde bulunma
- PR açıldığında → Slack'te bildir
- Reviewer → 24 saat içinde ilk yorum veya onay
- BLOCKER giderildikten sonra → 8 saat içinde re-review

---

## 6. ENVIRONMENT YÖNETİMİ

### Ortam Hiyerarşisi

```
local      ← Geliştirici makinesi (Docker Compose)
test       ← CI/CD pipeline'da otomatik çalışan izole ortam
staging    ← develop branch → AWS ECS (otomatik deploy)
production ← main branch + tag → AWS ECS (manuel onaylı deploy)
```

### `.env` Kuralları

```bash
# .env.example — her zaman güncel tutulur, repo'ya eklenir
DATABASE_URL=            # Açıklama: PostgreSQL bağlantı string'i
REDIS_URL=               # Açıklama: Redis bağlantı string'i
JWT_PRIVATE_KEY_PATH=    # Açıklama: RS256 private key dosya yolu
JWT_PUBLIC_KEY_PATH=     # Açıklama: RS256 public key dosya yolu
AWS_REGION=              # Açıklama: AWS region (örn: eu-central-1)
SES_FROM_EMAIL=          # Açıklama: Gönderici e-posta adresi
OPENAI_API_KEY=          # Açıklama: Moderasyon API key
NLP_SERVICE_URL=         # Açıklama: Python FastAPI internal URL

# .env — asla repo'ya eklenmez
# AWS Secrets Manager'dan çekilir veya ekipten alınır
```

### Secrets Yönetimi

- **Geliştirme:** `.env` dosyasında (gitignore'da)
- **Staging/Production:** AWS Secrets Manager
- **CI/CD:** GitHub Actions Secrets
- **Secret paylaşımı:** Şifreli kanal (1Password, AWS Secrets Manager paylaşım linki)
- **Secret'ı chat'e yazma:** ASLA (bu kural ihlal edilirse token derhal rotate et)

### JWT Key Üretimi

```bash
# Sprint 1'de bir kez yapılır, AWS Secrets Manager'a yüklenir
openssl genrsa -out jwt-private.key 2048
openssl rsa -in jwt-private.key -pubout -out jwt-public.key

# Private key → AWS Secrets Manager (dreamcloud/jwt/private-key)
# Public key → AWS Secrets Manager (dreamcloud/jwt/public-key)
# Yerel dosyalar → asla commit edilmez
```

---

## 7. VERİTABANI YÖNETİMİ

### Migration Kuralları

```bash
# Yeni migration oluştur (otomatik timestamp)
npm run migration:generate -- src/database/migrations/CreateDreams

# Migration çalıştır (lokal)
npm run migration:run

# Migration geri al (dikkatli!)
npm run migration:revert

# Migration durumu kontrol
npm run migration:show
```

### Migration Yazma Kuralları

- Her migration tek sorumluluğa sahip
- `up()` ve `down()` her zaman ikisi birlikte yazılır
- Veri migrationları `down()`'da geri alınamıyorsa açıkça belirtilir
- Production migration'larını çalıştırmadan önce backup alınır
- Migration MCP üzerinden çalıştırılmaz — TypeORM CLI zorunlu

### Seed Verisi

- Geliştirme ortamı için fake data: `src/database/seeds/`
- Test için: `src/database/seeds/test.seed.ts`
- Production'a seed verisi eklenmez

---

## 8. LOGGING KURALLARI

### Log Seviyeleri

```typescript
// ERROR — Kullanıcı etkileyen hata (mutlaka log'lanır)
this.logger.error('JWT verification failed', { userId, error: err.message });

// WARN — Dikkat gerektiren durum (kullanıcı etkilenmemiş)
this.logger.warn('Rate limit approaching threshold', { userId, count });

// LOG/INFO — Önemli sistem eventi
this.logger.log('User registered', { userId });

// DEBUG — Geliştirme sırasında detay (production'da kapalı)
this.logger.debug('Cache hit for feed', { userId, cacheKey });

// VERBOSE — En detaylı seviye (yalnızca geliştirmede)
this.logger.verbose('pgvector query params', { vector, limit });
```

### Log'lama Yasakları

```typescript
// ❌ console.log production'a girmez
console.log('user:', user);

// ❌ Hassas veri log'lanmaz
this.logger.log('Login attempt', { password: dto.password }); // ŞİFRE!
this.logger.log('Token created', { token }); // TOKEN!

// ❌ PII (kişisel tanımlayıcı bilgi) log'lanmaz
this.logger.log('Email verified', { email }); // E-posta PII!

// ✅ Doğru
this.logger.log('Login attempt', { userId: user.id });
this.logger.log('Token created', { userId: user.id, expiresAt });
this.logger.log('Email verified', { userId: user.id });
```

---

## 9. HATA YÖNETİMİ

### Backend Hata Hiyerarşisi

```typescript
// NestJS built-in exception kullan
throw new UnauthorizedException('INVALID_CREDENTIALS');
throw new NotFoundException('DREAM_NOT_FOUND');
throw new ConflictException('EMAIL_ALREADY_EXISTS');
throw new BadRequestException('INVALID_TOKEN_FORMAT');
throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
throw new TooManyRequestsException('RATE_LIMIT_EXCEEDED');

// Custom exception (iş mantığı için)
throw new DreamMatchingException('NLP_SERVICE_UNAVAILABLE');
```

### HTTP Yanıt Formatı (tutarlı olmalı)

```json
// Başarılı
{ "success": true, "data": { ... }, "meta": { "timestamp": "..." } }

// Hata
{ "success": false, "error": { "code": "DREAM_NOT_FOUND", "message": "..." } }
```

### Asla Yapılmayanlar

```typescript
// ❌ Hata yutmak
try {
  await this.nlpService.embed(dream.content);
} catch (e) {
  // sessiz geç — NLP başarısız olursa kayıt yine de yapılır
}

// ✅ Doğru
try {
  await this.nlpService.embed(dream.content);
} catch (e) {
  this.logger.error('NLP embedding failed', { dreamId: dream.id, error: e.message });
  // Job queue'ya ekle → retry
  await this.queue.add('embed', { dreamId: dream.id }, { attempts: 3 });
}
```

---

## 10. PERFORMANS KURALLARI

### Veritabanı

- N+1 sorgu yasak — `relations` veya JOIN kullan
- Her yeni sorgu için EXPLAIN ANALYZE çalıştır (geliştirme ortamında)
- Büyük liste sorgularında mutlaka pagination (cursor-based)
- Bulk işlemler için batch query kullan

### API

- Büyük JSON response'lar için streaming düşün
- Stateless endpoint'lerde cache header ekle
- 3 saniyeden uzun süren işlemler için async job + webhook

### Mobile

- FlashList kullan (FlatList değil) — rüya akışında zorunlu
- Görüntüler için lazy loading + progressive placeholder
- API çağrılarını memoize et (React Query cache)
- Animasyonlarda `useNativeDriver: true`

---

## 11. GÜVENLİK KONTROL LİSTESİ (Her PR için)

```
Auth:
  [ ] Endpoint @Public() değilse JWT guard aktif mi?
  [ ] Role kontrolü gerektiren endpoint'te @Roles() var mı?
  [ ] Kullanıcı başka kullanıcının kaynağına erişebilir mi? (IDOR kontrolü)

Input Validation:
  [ ] DTO'da tüm field'lar validate ediliyor mu? (@IsString, @MaxLength vb.)
  [ ] Kullanıcı girdisi SQL sorgusuna doğrudan ekleniyor mu? (parameterized query kullan)
  [ ] File upload varsa tip ve boyut kontrolü var mı?

Data Exposure:
  [ ] Response'da şifre hash, token veya PII gönderilmiyor mu?
  [ ] Error mesajında iç sistem detayı açık mı? (stack trace vs generic mesaj)

Rate Limiting:
  [ ] Auth endpoint'lerinde throttle var mı? (brute force)
  [ ] Arama endpoint'lerinde limit var mı?
```

---

## 12. SPRINT TÖRENLER (CEREMONIES)

| Tören                  | Sıklık         | Süre   | Katılımcı      |
| ---------------------- | -------------- | ------ | -------------- |
| Daily Standup          | Her gün        | 15 dk  | Tüm ekip       |
| Sprint Planning        | Sprint başı    | 2 saat | Tüm ekip       |
| Sprint Review          | Sprint sonu    | 1 saat | Tüm ekip       |
| Sprint Retrospective   | Sprint sonu    | 45 dk  | Tüm ekip       |
| Teknik Borç Toplantısı | 2 sprintte bir | 30 dk  | Geliştiriciler |

### Standup Formatı (3 soru)

1. Dün ne yaptım?
2. Bugün ne yapacağım?
3. Engel var mı?

Standup tartışma yeri değil; detaylar ayrı toplantıda.

---

_Bu doküman DEVELOPMENT_RULES.md olup tüm ekip üyeleri için bağlayıcıdır._  
_Kural değişikliği için Sprint Retrospective'de ekip kararı gerekir._
