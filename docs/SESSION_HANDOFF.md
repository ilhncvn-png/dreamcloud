# SESSION_HANDOFF.md

## DreamCloud — Oturum Devir Notu

**Son Güncelleme:** 2026-06-15  
**Mevcut Branch:** `develop`  
**Son Commit:** `49e9eda` — feat(auth): implement JWT RS256 authentication with refresh token rotation

---

## SIRADAKI GÖREV: Sprint 2 — TASK-011 Dreams Modülü

Auth tamamlandı. Sıradaki: Dreams CRUD modülü.

### Yapılacaklar

1. `Dream` entity (title, content, category, visibility, mood_score, embedding vector)
2. `DreamTag` entity
3. Migration: `dreams` + `dream_tags` tabloları
4. DreamsService: create, findAll (paginated), findOne, update, softDelete
5. DreamsController: CRUD endpoints (JwtAuthGuard ile korumalı)
6. DTO'lar: CreateDreamDto, UpdateDreamDto, DreamResponseDto

---

## DOCKER ORTAMI

```
dreamcloud-postgres  → localhost:5432  (healthy)
dreamcloud-redis     → localhost:6379  (healthy)
dreamcloud-pgadmin   → http://localhost:5050
dreamcloud-mailhog   → http://localhost:8025
```

`apps/api/keys/jwt-private.key` ve `jwt-public.key` → üretildi (gitignore'da)

---

## MEVCUT REPO DURUMU

```
Branch:   develop
Remote:   git@github.com:ilhncvn-png/dreamcloud.git

Son commitler:
49e9eda  feat(auth): implement JWT RS256 authentication with refresh token rotation
1c4ee72  docs: mark TASK-005 complete, TASK-007 next in SESSION_HANDOFF
be1d883  fix(ci): add continue-on-error for Codecov and passWithNoTests for mobile
9b163fd  feat(ci): fix CI workflows and add unit tests for API
6614904  feat(db): add TypeORM entities and initial migration for users, profiles, and settings
```

---

## SPRINT 1 & 2 TASK DURUMU

| TASK     | Açıklama                          | Durum           |
| -------- | --------------------------------- | --------------- |
| TASK-001 | GitHub repo + branch protection   | ✅ Tamamlandı   |
| TASK-002 | NestJS API iskeleti               | ✅ Tamamlandı   |
| TASK-003 | Docker Compose                    | ✅ Tamamlandı   |
| TASK-004 | TypeORM entity + migration        | ✅ Tamamlandı   |
| TASK-005 | CI/CD doğrulama                   | ✅ Tamamlandı   |
| TASK-007 | JWT Auth (register/login/refresh) | ✅ Tamamlandı   |
| TASK-006 | AWS altyapı                       | ⏳ Bekliyor     |
| TASK-008 | Expo mobil iskelet                | ⏳ Bekliyor     |
| TASK-009 | FastAPI NLP                       | ⏳ Bekliyor     |
| TASK-011 | Dreams modülü                     | ⏳ **SIRADAKI** |

---

## AUTH MODÜLü — Doğrulanmış Endpoint'ler

| Endpoint              | Method | Auth   | Test Sonucu       |
| --------------------- | ------ | ------ | ----------------- |
| `POST /auth/register` | Public | —      | ✅ 201            |
| `POST /auth/login`    | Public | —      | ✅ 200            |
| `POST /auth/refresh`  | Public | —      | ✅ 200 + rotation |
| `POST /auth/logout`   | Public | —      | ✅ 204            |
| `GET  /auth/me`       | JWT    | Bearer | ✅ 200            |

Güvenlik özellikleri:

- bcrypt 12 rounds
- Refresh token: SHA-256 hashed, DB'de saklanır, kullanımda rotation
- Account lockout: 5 başarısız giriş → 15 dakika kilit
- Duplicate email/username: 409 Conflict
- ValidationPipe: whitelist + transform

---

## ÖNEMLİ TEKNİK NOTLAR

### Mimari kararlar

- `SnakeNamingStrategy` (typeorm-naming-strategies): entity camelCase → DB snake_case
- `jwt.config.ts`: `JWT_PRIVATE_KEY` env var (CI) veya `./keys/jwt-private.key` dosya yolu (dev)
- Refresh token ömrü: 30 gün (2592000 saniye)
- Access token ömrü: 15 dakika (900 saniye)
- `@fastify/static` → Swagger UI Fastify adapter için gerekli

### API Base URL

`http://localhost:3000/api/v1`

### JWT Public Key Konumu

`apps/api/keys/jwt-public.key` (gitignore'da, commit edilmez)

---

## BEKLEYİŞ (Manuel GitHub Adımları)

1. **Branch protection** — main/develop için PR kuralları
2. **Secrets** — `JWT_TEST_PRIVATE_KEY`, `JWT_TEST_PUBLIC_KEY`, `CODECOV_TOKEN`
3. **Default branch** — develop

---

_Bu dosya her oturum sonunda güncellenir._
