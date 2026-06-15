# SESSION_HANDOFF.md

## DreamCloud — Oturum Devir Notu

> Bu dosya oturumlar arası bağlam aktarımı için kullanılır.
> Her oturum sonunda güncellenir. Claude Code tarafından tutulur.

**Son Güncelleme:** 2026-06-15  
**Mevcut Branch:** `develop`  
**Son Commit:** `6614904` — feat(db): add TypeORM entities and initial migration for users, profiles, and settings

---

## SIRADAKI GÖREV: TASK-005

### Hedef

GitHub Actions CI doğrulaması — PR açılınca testlerin çalıştığını doğrulamak.

### Adımlar

1. `develop` → `main` üzerine bir test PR'ı aç (ya da mevcut CI workflow'u kontrol et)
2. CI workflow dosyası: `.github/workflows/` dizinini incele
3. Testlerin geçip geçmediğini doğrula
4. Branch protection kurallarının doğru çalıştığını teyit et

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

**Önemli:** `DATABASE_URL` `.env`'de `localhost` kullanıyor (local geliştirme için doğru).

---

## MEVCUT REPO DURUMU

```
Branch:   develop
Remote:   git@github.com:ilhncvn-png/dreamcloud.git

Commit geçmişi:
6614904  feat(db): add TypeORM entities and initial migration for users, profiles, and settings
a74b6e8  docs: update PROJECT_STATE and add SESSION_HANDOFF for TASK-004
c74fad5  fix(infra): add --ignore-scripts to Dockerfile.dev to skip husky
a5f1854  chore(infra): upgrade to Node 22 and add api service to dev compose
0b05411  feat(api): add exception filter, transform interceptor, and health endpoint
```

---

## SPRINT 1 TASK DURUMU

| TASK     | Açıklama                               | Durum           |
| -------- | -------------------------------------- | --------------- |
| TASK-001 | GitHub repo + branch protection        | ✅ Tamamlandı   |
| TASK-002 | NestJS API iskeleti                    | ✅ Tamamlandı   |
| TASK-003 | Docker Compose                         | ✅ Tamamlandı   |
| TASK-004 | TypeORM entity + migration             | ✅ Tamamlandı   |
| TASK-005 | CI/CD doğrulama                        | ⏳ **SIRADAKI** |
| TASK-006 | AWS altyapı                            | ⏳ Bekliyor     |
| TASK-007 | JWT key üretimi                        | ⏳ Bekliyor     |
| TASK-008 | Expo mobil iskelet                     | ⏳ Bekliyor     |
| TASK-009 | FastAPI NLP (zaten büyük ölçüde hazır) | ⏳ Bekliyor     |
| TASK-010 | Dokümantasyon                          | ⏳ Bekliyor     |

---

## TASK-004 ÖZETI (Tamamlandı)

Oluşturulan dosyalar:

- `apps/api/src/common/enums/database.enums.ts` — 7 enum tipi
- `apps/api/src/modules/users/entities/user.entity.ts` — users tablosu
- `apps/api/src/modules/users/entities/user-profile.entity.ts` — user_profiles tablosu
- `apps/api/src/modules/users/entities/user-settings.entity.ts` — user_settings tablosu
- `apps/api/src/database/migrations/1749945600000-CreateEnumsAndUserTables.ts` — migration

Doğrulamalar:

- Migration başarıyla çalıştı (`dreamcloud_dev` veritabanında)
- 7 enum tipi oluşturuldu: `dream_category`, `dream_visibility`, `notification_type`, `report_reason`, `moderation_status`, `oauth_provider`, `tag_type`
- 3 tablo oluşturuldu: `users`, `user_profiles`, `user_settings`
- `tsc --noEmit` → hata yok
- `eslint` → hata yok
- Commit: `6614904`

---

## ÖNEMLİ TEKNİK NOTLAR

### TypeORM dual DataSource pattern

- `apps/api/src/config/database.config.ts` → `AppDataSource` (CLI için)
- `apps/api/src/app.module.ts` → `TypeOrmModule.forRootAsync` (NestJS için)
- Migration komutu: `npm run db:migrate` (kökten) veya `cd apps/api && npm run migration:run`

### ESLint

- Root `eslint.config.js` (flat config, v9) — FlatCompat ile `packages/eslint-config/index.js` extend ediyor
- Özel kurallar: `dot-notation allowIndexSignaturePropertyAccess`, `no-extraneous-class allowWithDecorator`, `restrict-template-expressions allowNumber`

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
2. **Secrets** — En azından `CODECOV_TOKEN`, `JWT_TEST_PRIVATE_KEY`, `JWT_TEST_PUBLIC_KEY`
3. **Default branch** — `develop` olarak ayarla

---

_Bu dosya her oturum sonunda güncellenir._
