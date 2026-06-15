# SESSION_HANDOFF.md

## DreamCloud — Oturum Devir Notu

> Bu dosya oturumlar arası bağlam aktarımı için kullanılır.
> Her oturum sonunda güncellenir. Claude Code tarafından tutulur.

**Son Güncelleme:** 2026-06-15  
**Mevcut Branch:** `develop`  
**Son Commit:** `be1d883` — fix(ci): add continue-on-error for Codecov and passWithNoTests for mobile

---

## SIRADAKI GÖREV: TASK-007

### Hedef

JWT RS256 asimetrik anahtar çifti oluştur ve API'ye bağla.

### Adımlar

1. `openssl genrsa -out apps/api/keys/private.pem 4096`
2. `openssl rsa -in apps/api/keys/private.pem -pubout -out apps/api/keys/public.pem`
3. `apps/api/.env` dosyasına ekle: `JWT_PRIVATE_KEY` ve `JWT_PUBLIC_KEY` (base64 veya multiline)
4. `apps/api/src/config/jwt.config.ts` içeriğini kontrol et
5. `AppModule`'da `JwtModule.registerAsync(...)` entegrasyonunu doğrula

**Önemli:** `apps/api/keys/` gitignore'da → key'ler asla commit edilmez!

---

## DOCKER ORTAMI

Servisler çalışıyor:

```
dreamcloud-postgres  → localhost:5432  (healthy)
dreamcloud-redis     → localhost:6379  (healthy)
dreamcloud-pgadmin   → http://localhost:5050
dreamcloud-mailhog   → http://localhost:8025
```

Kurulu PG extension'ları: `vector 0.8.2`, `pg_trgm 1.6`, `uuid-ossp 1.1`

`apps/api/.env` mevcut — `.env.example`'dan kopyalandı.

---

## MEVCUT REPO DURUMU

```
Branch:   develop
Remote:   git@github.com:ilhncvn-png/dreamcloud.git

Commit geçmişi:
be1d883  fix(ci): add continue-on-error for Codecov and passWithNoTests for mobile
9b163fd  feat(ci): fix CI workflows and add unit tests for API
6614904  feat(db): add TypeORM entities and initial migration for users, profiles, and settings
a74b6e8  docs: update PROJECT_STATE and add SESSION_HANDOFF for TASK-004
c74fad5  fix(infra): add --ignore-scripts to Dockerfile.dev to skip husky
```

---

## SPRINT 1 TASK DURUMU

| TASK     | Açıklama                               | Durum           |
| -------- | -------------------------------------- | --------------- |
| TASK-001 | GitHub repo + branch protection        | ✅ Tamamlandı   |
| TASK-002 | NestJS API iskeleti                    | ✅ Tamamlandı   |
| TASK-003 | Docker Compose                         | ✅ Tamamlandı   |
| TASK-004 | TypeORM entity + migration             | ✅ Tamamlandı   |
| TASK-005 | CI/CD doğrulama                        | ✅ Tamamlandı   |
| TASK-006 | AWS altyapı                            | ⏳ Bekliyor     |
| TASK-007 | JWT key üretimi                        | ⏳ **SIRADAKI** |
| TASK-008 | Expo mobil iskelet                     | ⏳ Bekliyor     |
| TASK-009 | FastAPI NLP (zaten büyük ölçüde hazır) | ⏳ Bekliyor     |
| TASK-010 | Dokümantasyon                          | ⏳ Bekliyor     |

---

## TASK-005 ÖZETI (Tamamlandı)

Yapılan değişiklikler:

- `.github/workflows/ci.yml`: NODE_VERSION 20→22, filter api→@dreamcloud/api, continue-on-error: Codecov
- `.github/workflows/ci-mobile.yml`: NODE_VERSION 20→22, filter mobile→@dreamcloud/mobile
- `.github/workflows/ci-nlp.yml`: continue-on-error: Codecov
- `apps/api/package.json`: Jest coverage exclusions (entities, migrations, config, enums, decorators)
- `apps/mobile/package.json`: test:ci → --passWithNoTests (TASK-008 tamamlanana kadar)

Eklenen test dosyaları:

- `apps/api/src/app.controller.spec.ts`
- `apps/api/src/common/filters/http-exception.filter.spec.ts`
- `apps/api/src/common/interceptors/transform.interceptor.spec.ts`

Sonuç: 13 test, 100% statement coverage, 92.85% branch coverage

---

## ÖNEMLİ TEKNİK NOTLAR

### TypeORM dual DataSource pattern

- `apps/api/src/config/database.config.ts` → `AppDataSource` (CLI için)
- `apps/api/src/database/data-source.ts` → re-export (migration script için)
- `apps/api/src/app.module.ts` → `TypeOrmModule.forRootAsync` (NestJS için)
- Migration komutu: `npm run db:migrate` (kökten)

### CI workflow özeti

| Workflow        | Trigger                | Jobs                                      |
| --------------- | ---------------------- | ----------------------------------------- |
| `ci.yml`        | push/PR → api paths    | lint-typecheck, test (+ pg/redis service) |
| `ci-mobile.yml` | push/PR → mobile paths | lint-typecheck-test, expo-doctor          |
| `ci-nlp.yml`    | push/PR → nlp paths    | ruff, mypy, pytest                        |

### Commit scope'ları

Commitlint izin verilen scope'lar: `auth, dreams, users, feed, social, search, notifications, moderation, nlp, mobile, db, infra, api, config, deps, ci, shared`

### Güvenlik kuralları

- `apps/api/keys/` gitignore'da — JWT key'leri asla commit edilmez
- `.env` dosyaları gitignore'da — terminal/chat'e hiçbir zaman yazdırılmaz
- Hassas bilgiler (API key, token) ekrana yazdırılmaz

---

## BEKLEYİŞ (Manuel GitHub Adımları)

Henüz yapılmamış manuel işlemler (docs/GITHUB_SETUP.md'de detaylı):

1. **Branch protection** — Settings → Branches → `main` (2 reviewer) ve `develop` (1 reviewer)
2. **Secrets** — `CODECOV_TOKEN`, `JWT_TEST_PRIVATE_KEY`, `JWT_TEST_PUBLIC_KEY`
3. **Default branch** — `develop` olarak ayarla

---

_Bu dosya her oturum sonunda güncellenir._
