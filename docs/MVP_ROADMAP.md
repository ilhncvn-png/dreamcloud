# MVP Roadmap

## DreamCloud — Geliştirme Yol Haritası

**Versiyon:** 1.0 | **Tarih:** 2026-06-14  
**Hedef:** 12 ayda MVP → Yayın

---

## 1. Genel Zaman Çizelgesi

```
AY 1–2:   Temel Altyapı ve Auth
AY 3–4:   Rüya Modülü ve NLP MVP
AY 5–6:   Sosyal Özellikler ve Feed
AY 7–8:   Moderasyon, Bildirim, Onboarding
AY 9–10:  Test, Optimizasyon, Güvenlik Denetimi
AY 11:    Soft Launch (Beta, 1000 kullanıcı)
AY 12:    Genel Yayın (iOS + Android App Store)
───────────────────────────────────────────────
AY 13–18: V1.5 — Sesli giriş, istatistikler, trend sayfası
AY 19–24: V2   — Yorumcular, profil karşılaştırma, web app
AY 25–36: V3   — Marka reklam paneli, REM entegrasyonu
```

---

## 2. Ekip Yapısı

| Rol                              | Sayı | Sorumluluk                              |
| -------------------------------- | ---- | --------------------------------------- |
| Full-Stack / Backend Geliştirici | 2    | NestJS API, PostgreSQL, Redis           |
| Mobil Geliştirici                | 1    | React Native iOS + Android              |
| ML / NLP Mühendisi               | 1    | Python FastAPI, embedding, matching     |
| Ürün / Tasarım                   | 1    | UI/UX, PRD yönetimi, test koordinasyonu |

_Toplam: 5 kişi_

---

## 3. Ay 1–2: Temel Altyapı

### Sprint 1 (Hafta 1–2): Geliştirme Ortamı

**Backend:**

- [ ] Monorepo kurulumu (Turborepo)
- [ ] NestJS proje iskeleti (TypeScript strict)
- [ ] Docker Compose: PostgreSQL + Redis + pgAdmin
- [ ] CI/CD pipeline: GitHub Actions (lint + test + build)
- [ ] AWS hesabı ve IAM yapılandırması
- [ ] Secrets Manager kurulumu
- [ ] Staging ortamı (ECS Fargate)

**Veritabanı:**

- [ ] PostgreSQL migrasyon sistemi (TypeORM)
- [ ] Temel tablolar: `users`, `user_profiles`, `user_settings`
- [ ] pgvector ve pg_trgm uzantıları kurulumu
- [ ] Enum tipleri tanımlanması

**Mobil:**

- [ ] Expo projesi kurulumu (TypeScript)
- [ ] React Navigation yapılandırması
- [ ] Zustand store yapısı
- [ ] API istemcisi (React Query + Axios interceptors)
- [ ] Expo SecureStore token yönetimi

---

### Sprint 2 (Hafta 3–4): Auth Sistemi

**Backend:**

- [ ] `POST /v1/auth/register` — e-posta + şifre
- [ ] `POST /v1/auth/login`
- [ ] `POST /v1/auth/refresh` (refresh token rotasyon)
- [ ] `POST /v1/auth/logout` + `logout-all`
- [ ] E-posta OTP doğrulama (AWS SES entegrasyonu)
- [ ] `POST /v1/auth/forgot-password`
- [ ] `POST /v1/auth/reset-password`
- [ ] `POST /v1/auth/change-password`
- [ ] JWT RS256 yapılandırması
- [ ] Brute-force koruması (Redis lockout)
- [ ] Rate limiting (Throttler)

**Tablo Migrasyonları:**

- [ ] `refresh_tokens`
- [ ] `devices`
- [ ] `oauth_accounts`

**Mobil:**

- [ ] Kayıt ekranı (form + validasyon)
- [ ] Giriş ekranı
- [ ] OTP doğrulama ekranı
- [ ] Şifre sıfırlama akışı
- [ ] Auto token refresh interceptor

**Sprint 2 Bitiş Kriteri:**

> Kullanıcı kaydolabilir, giriş yapabilir, oturumu yenileyebilir ve çıkış yapabilir.

---

### Sprint 3 (Hafta 5–6): OAuth ve Kullanıcı Profili

**Backend:**

- [ ] `POST /v1/auth/oauth/google` (passport-google-oauth20)
- [ ] `POST /v1/auth/oauth/apple` (apple-signin-auth)
- [ ] `GET /v1/users/me`
- [ ] `PUT /v1/users/me`
- [ ] `DELETE /v1/users/me` (soft delete + 30 gün silme cron)
- [ ] `GET /v1/users/{username}`
- [ ] Avatar yükleme (S3 presigned URL) _(placeholder: varsayılan avatar)_
- [ ] Kullanıcı ayarları CRUD

**Mobil:**

- [ ] Google ile giriş (expo-auth-session)
- [ ] Apple ile giriş
- [ ] Profil ekranı
- [ ] Profil düzenleme formu
- [ ] Ayarlar ekranı

---

## 4. Ay 3–4: Rüya Modülü ve NLP MVP

### Sprint 4 (Hafta 7–8): Rüya CRUD

**Backend:**

- [ ] `POST /v1/dreams` — metin rüya girişi
- [ ] `GET /v1/dreams/{id}`
- [ ] `PUT /v1/dreams/{id}`
- [ ] `DELETE /v1/dreams/{id}` (soft delete)
- [ ] `GET /v1/dreams/me` (kişisel günlük, pagination)
- [ ] Taslak sistemi: `POST /v1/dreams/drafts`, `GET /v1/dreams/drafts`
- [ ] Etiket oluşturma ve dream_tags ilişkilendirmesi
- [ ] Görünürlük kuralları uygulanması
- [ ] OpenAI Moderation API entegrasyonu (yayın öncesi kontrol)

**Tablo Migrasyonları:**

- [ ] `dreams`
- [ ] `tags`
- [ ] `dream_tags`
- [ ] `dream_drafts`

**Mobil:**

- [ ] Rüya giriş ekranı (tam ekran metin editörü)
- [ ] Kategori seçici (4 ikon)
- [ ] Etiket ekleme (chip input)
- [ ] Görünürlük seçici
- [ ] Auto-save (10 saniyede bir taslak)
- [ ] Kişisel rüya günlüğü (kronolojik liste)
- [ ] Rüya detay ekranı

**Sprint 4 Bitiş Kriteri:**

> Kullanıcı rüya girebilir, düzenleyebilir, silebilir ve kişisel günlüğünü görüntüleyebilir.

---

### Sprint 5 (Hafta 9–10): NLP Eşleştirme Motoru

**Python NLP Servisi:**

- [ ] FastAPI proje kurulumu
- [ ] Sentence Transformer entegrasyonu (all-MiniLM-L6-v2)
- [ ] `POST /internal/embed` — metin → vektör
- [ ] pgvector bağlantısı ve cosine similarity araması
- [ ] `POST /internal/match` — rüya eşleştirme
- [ ] Sonuçları dream_matches tablosuna yazma
- [ ] NestJS → NLP servisi HTTP çağrısı

**Backend (NestJS):**

- [ ] Bull Queue kurulumu (Redis-backed)
- [ ] "Rüya kaydedildi" → NLP job enqueue
- [ ] NLP tamamlandığında Socket.io event gönderimi
- [ ] `GET /v1/dreams/{id}/matches` endpoint

**Tablo Migrasyonları:**

- [ ] `dream_embeddings`
- [ ] `dream_matches`

**Mobil:**

- [ ] Eşleşme sonucu ekranı ("7 benzer rüya bulundu")
- [ ] Eşleşme kartı listesi (similarity score + common tags)
- [ ] Socket.io bağlantısı ve "dream:matched" event işleme

**Sprint 5 Bitiş Kriteri:**

> Kullanıcı rüya kaydedince sistem otomatik eşleşme bulur ve bildirir.

---

### Sprint 6 (Hafta 11–12): Etiket Önerisi ve Arama

**Backend:**

- [ ] `GET /v1/tags/suggest` — NLP tabanlı etiket önerisi
- [ ] `GET /v1/search` — rüya, etiket, kullanıcı araması (pg_trgm)
- [ ] `GET /v1/tags/{name}/dreams`
- [ ] Tam metin arama index'i optimizasyonu
- [ ] Autocomplete (Redis prefix cache)

**Mobil:**

- [ ] Etiket öneri sistemi (rüya yazılırken dinamik öneriler)
- [ ] Arama ekranı
- [ ] Etiket sayfası

---

## 5. Ay 5–6: Sosyal Özellikler ve Feed

### Sprint 7 (Hafta 13–14): Feed ve Trend

**Backend:**

- [ ] `GET /v1/feed` — global rüya akışı (cursor-based pagination)
- [ ] Feed cache (Redis, 2 dk TTL)
- [ ] `GET /v1/feed/trending` — trend etiketler
- [ ] Trend hesaplama cron (her 15 dk, Redis sorted set)
- [ ] `tag_trends` tablo migrasyonu

**Mobil:**

- [ ] Ana feed ekranı (FlashList ile performanslı scroll)
- [ ] Trend etiketler şeridi
- [ ] Pull-to-refresh
- [ ] Sonsuz scroll (infinite pagination)
- [ ] Rüya kartı komponenti

---

### Sprint 8 (Hafta 15–16): Sosyal Etkileşim

**Backend:**

- [ ] `POST/DELETE /v1/dreams/{id}/like`
- [ ] `GET/POST/DELETE /v1/dreams/{id}/comments`
- [ ] `POST/DELETE /v1/dreams/{id}/save`
- [ ] `GET /v1/users/me/saved`
- [ ] `POST/DELETE /v1/users/{username}/follow`
- [ ] `POST/DELETE /v1/users/{username}/block`
- [ ] `GET /v1/users/me/followers`, `GET /v1/users/me/following`
- [ ] `GET /v1/feed/following` — takip edilenler akışı
- [ ] Denormalize sayaç güncelleme (async, Redis → DB cron)

**Tablo Migrasyonları:**

- [ ] `likes`, `comments`, `saved_dreams`, `follows`, `blocks`

**Mobil:**

- [ ] Beğeni butonu (optimistic update)
- [ ] Yorum ekranı
- [ ] Kaydetme / koleksiyon
- [ ] Takip butonu
- [ ] Takipçi/takip listesi ekranı
- [ ] Platform dışı paylaşım (Share API)

**Sprint 8 Bitiş Kriteri:**

> Kullanıcı başka kullanıcıları takip edebilir, rüyaları beğenip yorum yapabilir.

---

## 6. Ay 7–8: Moderasyon, Bildirim, Onboarding

### Sprint 9 (Hafta 17–18): Bildirim Sistemi

**Backend:**

- [ ] `GET /v1/notifications`
- [ ] `PUT /v1/notifications/{id}/read`, `read-all`
- [ ] `GET/PUT /v1/notifications/settings`
- [ ] `POST/DELETE /v1/devices` (push token yönetimi)
- [ ] Expo Push Notification Service entegrasyonu
- [ ] Sosyal bildirim job'ları (beğeni, yorum, takip)
- [ ] Sabah hatırlatma cron (kullanıcı saat dilimine göre)
- [ ] Eşleşme bildirimi job'u

**Tablo Migrasyonları:**

- [ ] `notifications`, `notification_settings`

**Mobil:**

- [ ] Bildirim merkezi ekranı
- [ ] Push bildirim izni isteme (onboarding'de)
- [ ] Deep link: bildirime tıklayınca ilgili rüyaya git
- [ ] Bildirim badge (okunmamış sayısı)

---

### Sprint 10 (Hafta 19–20): Moderasyon ve Raporlama

**Backend:**

- [ ] `POST /v1/reports` — içerik raporlama
- [ ] Otomatik moderasyon: 5+ rapor → gizleme + moderatör kuyruğu
- [ ] İç moderatör paneli (admin API):
  - `GET /internal/moderation/queue`
  - `POST /internal/moderation/{reportId}/approve`
  - `POST /internal/moderation/{reportId}/reject`
  - `POST /internal/moderation/ban-user`
- [ ] Öz-zarar içerik tespiti + kriz kaynakları yönlendirmesi
- [ ] Kullanıcı ihlal sistemi

**Tablo Migrasyonları:**

- [ ] `reports`, `user_violations`

**Mobil:**

- [ ] "Raporla" menüsü (3 nokta → Raporla)
- [ ] Rapor kategori seçimi
- [ ] Engelleme akışı

---

### Sprint 11 (Hafta 21–22): Onboarding ve UX Cilalama

**Mobil:**

- [ ] 4 ekranlık onboarding akışı
- [ ] Sabah alarm saati seçimi (onboarding'de)
- [ ] Boş durum ekranları (ilk rüya, boş feed vb.)
- [ ] Yükleme skeleton'ları (loading states)
- [ ] Hata ekranları (network error, retry)
- [ ] Haptic feedback (beğeni, kaydetme)
- [ ] Dark mode desteği
- [ ] Erişilebilirlik: VoiceOver / TalkBack

---

### Sprint 12 (Hafta 23–24): Profil Tamamlama

**Backend:**

- [ ] `GET /v1/users/{username}/stats`
- [ ] Avatar yükleme (S3 presigned URL)
- [ ] Kullanıcı arama endpoint düzenlemesi
- [ ] Platform dışı paylaşım formatı (share card görseli)

**Mobil:**

- [ ] Profil istatistik ekranı (rüya sayısı, eşleşme, trend etiketler)
- [ ] Avatar yükleme akışı (kamera + galeri)
- [ ] Başkasının profil sayfası
- [ ] Ayarlar ekranı (tüm tercihler)
- [ ] Gizlilik ayarları

---

## 7. Ay 9–10: Test ve Güvenlik

### Sprint 13 (Hafta 25–26): Test Kapsamı

**Backend Testleri:**

- [ ] Unit testler: Her servis modülü (Jest, hedef %80 coverage)
- [ ] Integration testler: Auth akışları uçtan uca
- [ ] API testler: Tüm P0 endpoint'ler (Supertest)
- [ ] Load testi: k6 ile normal yük senaryosu

**Mobil Testler:**

- [ ] Manuel test: Golden path (kayıt → rüya gir → eşleşme gör)
- [ ] Manuel test: Edge case'ler (offline, hata durumları)
- [ ] Gerçek cihaz testi: iPhone 12+, Samsung Galaxy S21+, Pixel 6+

---

### Sprint 14 (Hafta 27–28): Güvenlik Denetimi ve Optimizasyon

**Güvenlik:**

- [ ] Bağımlılık güvenlik taraması (`npm audit`, Snyk)
- [ ] OWASP Top 10 kontrol listesi
- [ ] 3. taraf penetrasyon testi
- [ ] GDPR uyumluluk gözden geçirmesi (hukuk danışmanlığı)
- [ ] Gizlilik politikası ve Kullanım Şartları finalizasyonu
- [ ] Güvenlik başlıkları doğrulaması (securityheaders.com)

**Performans:**

- [ ] PostgreSQL sorgu analizi (EXPLAIN ANALYZE)
- [ ] Yavaş sorgu log'u inceleme
- [ ] Redis cache hit rate optimizasyonu
- [ ] Mobil: Bundle size optimizasyonu (Expo)
- [ ] Mobil: FlatList → FlashList geçişi (tamamlanmamışsa)

---

## 8. Ay 11: Soft Launch (Kapalı Beta)

### Sprint 15–16 (Hafta 29–32): Beta Programı

**Hedef:** 1000 beta kullanıcısı, 2 haftalık aktif kullanım

**Beta Seçim Kriterleri:**

- Rüya meraklısı, düzenli sosyal medya kullanıcısı
- Çeşitli demografik dağılım (yaş, şehir, meslek)
- Psikoloji/spiritualite/sanat topluluklarından

**Takip Edilecek Metrikler:**

```
D1 Retention (ertesi gün geri dönüş):     Hedef > %40
D7 Retention (7. gün geri dönüş):         Hedef > %20
D30 Retention (30. gün geri dönüş):       Hedef > %10
Kullanıcı başına haftalık rüya girişi:    Hedef > 2
Ortalama oturum süresi:                   Hedef > 4 dk
Crash rate:                               Hedef < %0.5
App Store ön değerlendirme puanı:         Hedef > 4.0
```

**Beta Geri Bildirim Döngüsü:**

- Haftalık kullanıcı görüşmesi (6 kullanıcı / hafta)
- Uygulama içi feedback butonu
- Beta Slack kanalı
- Crash raporu: Sentry

**Beta'da Tespit Edilip Kapatılacak:**

- Crash'ler ve ANR (Application Not Responding)
- UX tıkanıklıkları (kullanıcı nerede kayboldu?)
- Rüya giriş akışında sürtünme noktaları
- Eşleştirme kalitesi (kullanıcı geri bildirimi)
- Bildirim timing problemi (sabah bildirimi teslim oranı)

---

## 9. Ay 12: Genel Yayın

### Sprint 17–18 (Hafta 33–36): Launch Hazırlığı

**App Store Hazırlığı:**

- [ ] iOS App Store: metadata, ekran görüntüleri, gizlilik etiketi
- [ ] Google Play: APK/AAB, içerik derecelendirme
- [ ] App Store Optimization (ASO): anahtar kelimeler
- [ ] Launch video (30 sn, App Store için)

**Altyapı:**

- [ ] Production ortam son kontrolü
- [ ] Database backup testi (restore simülasyonu)
- [ ] Auto scaling test (yük testi ile)
- [ ] Runbook hazırlığı (olay müdahale prosedürleri)
- [ ] On-call rotation planı

**Pazarlama (Eş Zamanlı):**

- [ ] Influencer kampanyası aktivasyonu (spiritualite, psikoloji alanı)
- [ ] PR lansmanı (teknoloji medyası)
- [ ] Beta kullanıcılarından App Store yorumu isteme
- [ ] Sosyal medya kanalları: ilk gün içerik takvimi

**Launch Günü Kontrol Listesi:**

```
✅ App Store onayı alındı (iOS review: 24-48 saat, önceden başvur)
✅ Google Play onayı alındı
✅ Production database son yedek alındı
✅ Monitoring dashboard'ları aktif
✅ Sentry alertleri yapılandırıldı
✅ On-call mühendis belirlendi
✅ Lansman bildirimi e-postası hazır
✅ "Acil durum rollback" planı belirlendi
```

---

## 10. Post-MVP: V1.5 Planı (Ay 13–18)

| Özellik                               | Sprint | Öncelik |
| ------------------------------------- | ------ | ------- |
| Sesli rüya girişi (Expo AV + Whisper) | 13. Ay | P1      |
| Rüya istatistik ekranı                | 13. Ay | P1      |
| Profil bazlı rüya karşılaştırma       | 14. Ay | P1      |
| Tekrarlayan rüya tespiti              | 14. Ay | P1      |
| Etiket takip sistemi                  | 15. Ay | P1      |
| Lokasyon bazlı keşif                  | 15. Ay | P1      |
| Rüya yorumcuları altyapısı            | 16. Ay | P1      |
| Trend sayfası (detaylı)               | 16. Ay | P1      |
| iOS Widget (sabah hatırlatma)         | 17. Ay | P2      |
| Android Widget                        | 17. Ay | P2      |
| Web uygulaması (Next.js)              | 18. Ay | P2      |

---

## 11. Teknik Borç Yönetimi

Her sprint'te toplam kapasitenin **%20'si** teknik borca ayrılır:

```
Teknik Borç Backlog Örnekleri:
  - Test kapsamını artırma
  - Yavaş sorgu optimizasyonu
  - Bağımlılık güncellemeleri
  - Kod dokümantasyonu
  - API yanıt formatı tutarlılığı
  - Error handling kapsamı
  - Log yapısı iyileştirme
```

---

## 12. Risk Yönetimi

| Risk                                   | Olasılık | Etki       | Azaltma Stratejisi                                       |
| -------------------------------------- | -------- | ---------- | -------------------------------------------------------- |
| App Store reddi                        | Orta     | Yüksek     | Moderasyon kapsamlı; gizlilik etiketi eksiksiz           |
| NLP kalitesi yetersiz                  | Orta     | Yüksek     | Beta'da eşleşme kalitesi ölçülür; fallback: etiket bazlı |
| Kritik kitle oluşmadan soğuk başlangıç | Yüksek   | Yüksek     | Beta kullanıcıları seçimli; influencer aktivasyonu       |
| AWS maliyeti bütçe aşımı               | Düşük    | Orta       | CloudWatch alarmı; spending limit                        |
| GDPR uyum sorunu                       | Düşük    | Çok Yüksek | Hukuk danışmanlığı ay 9'da; önceden doğrulama            |
| Temel ekip üyesi ayrılması             | Düşük    | Yüksek     | Kod dokümantasyonu; pair programming; bilgi transferi    |

---

_Bu doküman MVP_ROADMAP.md olup 12 aylık geliştirme yol haritasını kapsar. Her sprint bitiş kriteri, bir sonraki sprint'e başlamadan önce ürün sahibi tarafından onaylanmalıdır._
