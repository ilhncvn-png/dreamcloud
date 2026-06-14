# PROJECT_STATE.md

## DreamCloud — Proje Durum Takip Dosyası

> Bu dosya proje ilerledikçe güncellenir.
> Her sprint sonunda veya önemli bir karar alındığında güncellenmelidir.
> **Asla sil, her zaman güncelle.**

**Son Güncelleme:** 2026-06-15  
**Güncelleyen:** Claude Code — Sprint 1 tüm blokörleri çözüldü, build doğrulandı

---

## MEVCUT DURUM

```
AŞAMA:    Sprint 1 Hazır — Tüm Blokörler Çözüldü
SPRINT:   1 (Başlayabilir)
AY:       0 / 12
KOD:      SCAFFOLD (config + routing + health check — business logic yok)
REPO:     YEREL (dreamcloud/ monorepo — npm install ✅, API build ✅, GitHub push bekliyor)
```

---

## TAMAMLANAN İŞLER

### Dokümantasyon (✅ Tamamlandı — 2026-06-14)

- [x] `PROJECT_ANALYSIS.md` — Proje analizi, vizyon, riskler
- [x] `PRODUCT_REQUIREMENTS.md` — OKR, fonksiyonel gereksinimler (FR-01–FR-07)
- [x] `USER_PERSONAS.md` — 5 kullanıcı personası
- [x] `USER_JOURNEY.md` — 5 kullanıcı yolculuğu
- [x] `FEATURE_SPECIFICATIONS.md` — 25 özellik, P0/P1/P2
- [x] `BUSINESS_MODEL.md` — Gelir modeli, fiyatlandırma
- [x] `TECH_STACK.md` — Teknoloji kararları ve gerekçeleri
- [x] `SYSTEM_ARCHITECTURE.md` — ASCII mimari diyagram, 8 NestJS modülü
- [x] `DATABASE_SCHEMA.md` — 25 tablo, enum'lar, index'ler
- [x] `API_ARCHITECTURE.md` — 60+ endpoint, rate limiting, WebSocket
- [x] `AUTHENTICATION_FLOW.md` — 6 akış diyagramı, JWT RS256
- [x] `SECURITY_REQUIREMENTS.md` — GDPR/KVKK, şifreleme, moderasyon
- [x] `SCALABILITY_PLAN.md` — 4 faz, eşikler, maliyet tahmini
- [x] `MVP_ROADMAP.md` — 12 ay, 18 sprint, 5 kişi
- [x] `MCP_SETUP_PLAN.md` — 9 MCP değerlendirme, kurulum sırası
- [x] `MASTER_PROJECT.md` — Tek referans dosyası
- [x] `PROJECT_STATE.md` — Bu dosya
- [x] `REPOSITORY_STRUCTURE.md` — Orijinal multi-repo yapısı (⚠️ monorepo kararıyla kısmen eskidi)
- [x] `BRANCHING_STRATEGY.md` — Git flow, Conventional Commits
- [x] `DEVELOPMENT_RULES.md` — Definition of Done, ekip kuralları
- [x] `CODING_STANDARDS.md` — TypeScript strict, NestJS, RN, Python standartları
- [x] `SPRINT_1_TASKS.md` — Sprint 1 görevleri (⚠️ TASK-001 güncellenmeli — multi-repo referanslar var)

### Geliştirme Ortamı (✅ Tamamlandı — 2026-06-14)

- [x] Node.js v24.16.0 kurulumu (nvm v0.40.3)
- [x] `~/.zshrc` oluşturuldu (nvm otomatik yükleme)
- [x] 7 MCP sunucusu kuruldu ve test edildi
- [x] `~/.claude/settings.json` yapılandırıldı

### MCP Kurulumu (✅ Tamamlandı — 2026-06-14)

- [x] sequential-thinking MCP — aktif
- [x] context7 MCP — aktif
- [x] filesystem MCP — aktif
- [x] github MCP — aktif (Fine-grained PAT)
- [x] memory MCP — aktif
- [x] playwright MCP — aktif
- [x] figma MCP — aktif

### Monorepo İskeleti (✅ Oluşturuldu — 2026-06-14)

- [x] `/Users/ilhanceven/Documents/dreamcloud/` — Turborepo root oluşturuldu
- [x] `turbo.json` — task pipeline tanımlı
- [x] `package.json` (root) — workspaces, scripts, commitlint, lint-staged, `packageManager: npm@11.13.0`
- [x] `tsconfig.json` (root) — base TypeScript config
- [x] `.gitignore` — JWT keys, .env, node_modules, ML models dahil
- [x] `.prettierrc`, `.nvmrc`, `.python-version`
- [x] `README.md` — Quick start, yapı diyagramı
- [x] `apps/api/` — NestJS (main.ts, app.module.ts, 8 modül, nest-cli.json)
- [x] `apps/mobile/` — Expo (package.json, app.json, eas.json, tsconfig.json)
- [x] `apps/nlp/` — FastAPI (main.py, config.py, 3 route, 2 service, tests)
- [x] `apps/web/` — Next.js placeholder (V2)
- [x] `packages/shared-types/` — Tüm TypeScript tipleri ve enum'lar hazır
- [x] `packages/eslint-config/` — base + nestjs + react-native presetleri
- [x] `packages/typescript-config/` — base + nestjs + react-native tsconfig'leri
- [x] `packages/utils/` — date, string, validation utils
- [x] `infrastructure/docker/docker-compose.yml` — PostgreSQL + Redis + Mailhog + pgAdmin
- [x] `infrastructure/docker/docker-compose.test.yml` — izole test ortamı
- [x] `infrastructure/docker/init-db/01-extensions.sql` — vector, pg_trgm, uuid-ossp
- [x] `infrastructure/terraform/` — 8 modül klasörü (vpc, ecs, rds, elasticache, s3, cloudfront, ses, waf)
- [x] `infrastructure/scripts/setup-dev.sh` — ilk kurulum otomasyonu
- [x] `infrastructure/scripts/generate-jwt-keys.sh` — RS256 key üretimi
- [x] `.github/workflows/` — ci.yml, ci-mobile.yml, ci-nlp.yml, deploy-staging.yml, deploy-production.yml, security-scan.yml
- [x] `.github/PULL_REQUEST_TEMPLATE.md`, `CODEOWNERS`, `SECURITY.md`
- [x] `docs/` — 21 proje dokümanı kopyalandı
- [x] `SPRINT_1_READINESS_CHECK.md` — Hazırlık denetim raporu (2026-06-14)

### Sprint 1 Blokörleri (✅ Çözüldü — 2026-06-15)

**Bloker düzeltmeleri:**

- [x] B-1: `apps/web` workspaces listesinden çıkarıldı → `npm install` çalışıyor
- [x] B-2: `--filter=api` → `--filter=@dreamcloud/api` (Turborepo scoped package filter)
- [x] B-3: `packages/utils/tsconfig.json` oluşturuldu

**Kritik eksikler:**

- [x] K-1: `apps/api/docker/Dockerfile` + `Dockerfile.dev` — multi-stage prod + hot reload dev
- [x] K-2: `apps/api/src/config/` — configuration.ts, database.config.ts, jwt.config.ts, redis.config.ts
- [x] K-3: `apps/api/src/app.controller.ts` — GET /health (Terminus health check)
- [x] K-4: `apps/api/src/database/data-source.ts` — TypeORM DataSource (CLI + NestJS dual pattern)
- [x] K-5: `apps/api/test/jest-e2e.json` + test:cov script
- [x] K-6: `.husky/pre-commit` + `.husky/commit-msg` (nvm-aware)
- [x] K-7: Root `.eslintrc.js`
- [x] K-8: `apps/mobile/babel.config.js`

**Orta öncelik:**

- [x] O-1: `apps/mobile/app/` — 10 route dosyası (auth + tabs)
- [x] O-2: `docker-compose.yml` → pgAdmin servisi eklendi (port 5050)

**Doküman güncellemeleri:**

- [x] Y-1: `SPRINT_1_TASKS.md` TASK-001 monorepo için güncellendi

**NLP tamamlama:**

- [x] M-1: `apps/nlp/` eksik 6 dosya oluşturuldu (dependencies.py, connection.py, moderation_service.py, request_models.py, response_models.py, Dockerfile.dev)

**Ek düzeltmeler (build sırasında tespit edildi):**

- [x] 8 NestJS modül class ismi düzeltildi (`uauthModule` → `AuthModule` vb.)
- [x] TypeORM `url: string | undefined` tipi düzeltildi (`?? ''` fallback)
- [x] `apps/mobile/package.json` — `@types/react-native` kaldırıldı (RN 0.71+ bundled), `react-test-renderer@18.3.1` pinlendi
- [x] `apps/nlp/app/config.py` — `INTERNAL_API_KEY` alanı eklendi

**Doğrulama sonuçları:**

- [x] `npm install` — Başarılı (1821 paket, sıfır hata)
- [x] `turbo run build --filter=@dreamcloud/api` — Başarılı (0 TypeScript hatası)

---

## DEVAM EDEN İŞLER

### Sprint 1 — GitHub + Docker + AWS Kurulumu (⏳ Ekip Bekliyor)

Tüm blokörlere ve teknik hazırlıklara göre sıradaki adımlar:

- [ ] **TASK-001:** `dreamcloud` reposunu GitHub'da oluştur, push et, branch korumaları kur
- [ ] **TASK-003:** Docker Desktop kur, `docker compose up -d` ile servisleri başlat
- [ ] **TASK-004:** TypeORM migrations yaz (`users`, `user_profiles`, `user_settings`)
- [ ] **TASK-005:** GitHub Actions CI çalıştığını doğrula (PR açarak test et)
- [ ] **TASK-006:** AWS hesabı yapılandır, Terraform ile staging ortamını kur
- [ ] **TASK-007:** JWT RS256 key çifti üret, AWS Secrets Manager'a yükle
- [ ] **TASK-010:** Ekip dokümantasyonunu tamamla, Sprint 2 issue'larını aç

---

## SPRINT DURUMU

| Sprint | Hafta | Odak                                   | Durum                   | Tamamlanma |
| ------ | ----- | -------------------------------------- | ----------------------- | ---------- |
| 0      | —     | Planlama + Ortam                       | ✅ Tamamlandı           | 2026-06-14 |
| 0.5    | —     | Monorepo iskeleti + tüm blokörleri çöz | ✅ Tamamlandı           | 2026-06-15 |
| 1      | 1–2   | Geliştirme ortamı kurulumu             | 🟢 HAZİR — Başlayabilir | —          |
| 2      | 3–4   | Auth sistemi                           | ⏳ Bekliyor             | —          |
| 3      | 5–6   | OAuth + Kullanıcı profili              | ⏳ Bekliyor             | —          |
| 4      | 7–8   | Rüya CRUD                              | ⏳ Bekliyor             | —          |
| 5      | 9–10  | NLP eşleştirme                         | ⏳ Bekliyor             | —          |
| 6      | 11–12 | Arama + Etiket önerisi                 | ⏳ Bekliyor             | —          |
| 7      | 13–14 | Feed + Trend                           | ⏳ Bekliyor             | —          |
| 8      | 15–16 | Sosyal etkileşim                       | ⏳ Bekliyor             | —          |
| 9      | 17–18 | Moderasyon                             | ⏳ Bekliyor             | —          |
| 10     | 19–20 | Bildirim sistemi                       | ⏳ Bekliyor             | —          |
| 11     | 21–22 | Onboarding                             | ⏳ Bekliyor             | —          |
| 12     | 23–24 | Sosyal paylaşım                        | ⏳ Bekliyor             | —          |
| 13     | 25–26 | Lokasyon özellikleri                   | ⏳ Bekliyor             | —          |
| 14     | 27–28 | Performans optimizasyonu               | ⏳ Bekliyor             | —          |
| 15     | 29–30 | Güvenlik denetimi                      | ⏳ Bekliyor             | —          |
| 16     | 31–32 | App Store hazırlık                     | ⏳ Bekliyor             | —          |
| 17     | 33–34 | Beta (1000 kullanıcı)                  | ⏳ Bekliyor             | —          |
| 18     | 35–36 | Genel yayın                            | ⏳ Bekliyor             | —          |

---

## TEKNİK BORÇ

| Tarih      | Borç                                                                               | Kaynak            | Sprint       |
| ---------- | ---------------------------------------------------------------------------------- | ----------------- | ------------ |
| 2026-06-14 | REPOSITORY_STRUCTURE.md multi-repo yaklaşımı anlatıyor — monorepo kararıyla eskidi | Mimari değişiklik | Sprint 1 içi |

---

## ALINAN MİMARİ KARARLAR

| Tarih      | Karar                                                  | Gerekçe                                                               |
| ---------- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| 2026-06-14 | Modüler Monolith (MVP)                                 | 5 kişilik ekip için operasyonel yük düşük                             |
| 2026-06-14 | PostgreSQL + pgvector (Pinecone yok)                   | MVP'de ayrı vektör DB gereksiz                                        |
| 2026-06-14 | JWT RS256                                              | Mikroservis hazırlığı için asimetrik imza                             |
| 2026-06-14 | Cursor pagination                                      | Büyük veri setinde offset sorunu                                      |
| 2026-06-14 | Bull Queue async NLP                                   | Kullanıcıyı NLP için bekletmemek                                      |
| 2026-06-14 | Expo Managed → V3 Ejected                              | MVP hızı, V3 HealthKit için eject                                     |
| 2026-06-14 | **Turborepo Monorepo MVP'den itibaren**                | Multi-repo yerine monorepo — ekip koordinasyonu, shared-types, tek CI |
| 2026-06-14 | NestJS → Fastify adapter (Express değil)               | Performans; MVP'den itibaren                                          |
| 2026-06-14 | pgAdmin docker-compose'da (staging değil sadece local) | Geliştirici UX                                                        |

---

## AÇIK KARARLAR (Henüz Netleşmemiş)

| Konu                                       | Durum                                      | Son Tarih              |
| ------------------------------------------ | ------------------------------------------ | ---------------------- |
| NLP skor denklemi α/β değerleri            | Belirsiz — test verisiyle kalibre edilecek | Sprint 5               |
| Feed algoritması (fanout-on-write vs read) | Belirsiz — kullanıcı sayısına göre karar   | Sprint 7               |
| İlk pazar (Türkiye mi global mi?)          | Belirsiz                                   | Sprint 1 öncesi        |
| Reklam onay metni (GDPR)                   | Taslak yok                                 | Sprint 2 (kayıt akışı) |
| Influencer lansman stratejisi              | Belirsiz                                   | Ay 10 (beta öncesi)    |

---

## BİLİNEN RİSKLER (Aktif İzleme)

| Risk                           | Seviye    | Durum                | Aksiyon                           |
| ------------------------------ | --------- | -------------------- | --------------------------------- |
| Cold start problemi            | 🔴 Yüksek | İzleniyor            | Influencer stratejisi planlanacak |
| Rüya hatırlama oranı           | 🔴 Yüksek | İzleniyor            | Sabah UX tasarımı kritik          |
| NLP doğruluğu                  | 🟡 Orta   | İzleniyor            | Sprint 5'te baseline ölçüm        |
| GDPR uyum                      | 🟡 Orta   | İzleniyor            | Sprint 15'te hukuk denetimi       |
| İçerik moderasyonu             | 🟡 Orta   | İzleniyor            | Sprint 9'da sistem kurulacak      |
| Docker / AWS / GitHub kurulumu | 🟡 Orta   | Sprint 1 Ekip Görevi | TASK-001, TASK-003, TASK-006      |

---

## ORTAM DURUMU

### Geliştirme Araçları

| Araç    | Versiyon       | Durum                                   |
| ------- | -------------- | --------------------------------------- |
| Node.js | v24.16.0       | ✅ Kurulu (nvm)                         |
| npm     | v11.13.0       | ✅ Kurulu                               |
| Python  | 3.9.6 (sistem) | ⚠️ 3.11.8 gerekli (pyenv ile kurulacak) |
| Docker  | —              | ❌ Henüz kurulmadı                      |
| AWS CLI | —              | ❌ Henüz kurulmadı                      |
| Git     | —              | ✅ Mevcut (sistem)                      |

### MCP Sunucuları

| MCP                 | Durum    | Not                                |
| ------------------- | -------- | ---------------------------------- |
| sequential-thinking | ✅ Aktif | —                                  |
| context7            | ✅ Aktif | —                                  |
| filesystem          | ✅ Aktif | Dream Cloud Project/ kapsamlı      |
| github              | ✅ Aktif | Fine-grained PAT (90 gün rotasyon) |
| memory              | ✅ Aktif | —                                  |
| playwright          | ✅ Aktif | Sprint 10'da kullanılacak          |
| figma               | ✅ Aktif | Sprint 7'de kullanılacak           |

### Repo Durumu

| Platform             | Durum                  | Not                                       |
| -------------------- | ---------------------- | ----------------------------------------- |
| Yerel monorepo       | ✅ İskelet oluşturuldu | `/Users/ilhanceven/Documents/dreamcloud/` |
| GitHub Repo          | ❌ Oluşturulmadı       | TASK-001                                  |
| main branch koruması | ❌ Ayarlanmadı         | TASK-001                                  |
| CI/CD pipeline       | ✅ Dosyalar hazır      | GitHub'a push sonrası aktif               |
| AWS hesabı           | ❌ Yapılandırılmadı    | TASK-006                                  |
| Staging ortamı       | ❌ Oluşturulmadı       | TASK-006                                  |
| npm install          | ✅ Çalışıyor           | 1821 paket, 0 hata                        |
| turbo build (API)    | ✅ Başarılı            | 0 TypeScript hatası                       |

---

## GELİR VE BÜYÜME TAKİBİ

_Henüz veri yok — yayın sonrası güncellenecek._

| Tarih | DAU | Toplam Kullanıcı | Rüya/Gün | Eşleşme Oranı | Gelir |
| ----- | --- | ---------------- | -------- | ------------- | ----- |
| —     | —   | —                | —        | —             | —     |

---

## GÜNCELLEME GEÇMİŞİ

| Tarih      | Güncelleyen | Değişiklik                                                                                                              |
| ---------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| 2026-06-14 | Claude Code | İlk oluşturma — başlangıç durumu                                                                                        |
| 2026-06-14 | Claude Code | Monorepo iskeleti tamamlandı, Readiness Check sonuçları işlendi                                                         |
| 2026-06-15 | Claude Code | Tüm Sprint 1 blokörleri çözüldü: API config/Docker/Husky/ESLint/Mobile routes/NLP 6 dosya, npm install ✅, API build ✅ |

---

_Bu dosya her sprint sonunda veya önemli bir karar/değişiklik olduğunda güncellenmelidir._  
_Format: Tamamlanan checkbox'ları işaretle, sprint tablosunu güncelle, kararları ve riskleri not al._
