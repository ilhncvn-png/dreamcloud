# BRANCHING_STRATEGY.md

## DreamCloud — Branch Stratejisi ve Git Akışı

**Versiyon:** 1.0 | **Tarih:** 2026-06-14  
**Kaynak:** MASTER_PROJECT.md · MVP_ROADMAP.md

---

## 1. BRANCH MODELİ

DreamCloud **GitHub Flow** tabanlı, sprint uyumlu bir model kullanır.  
Karmaşık Gitflow yerine sade ama korumalı bir yapı tercih edilmiştir.

```
main          ← Production (yalnızca tag'lı release'ler)
develop       ← Staging (her sprint sonunda birleşir)
feature/*     ← Özellik dalları (develop'tan açılır)
fix/*         ← Hata düzeltme dalları (develop veya main'den açılır)
hotfix/*      ← Acil production düzeltmeleri (main'den açılır)
release/*     ← Release hazırlık dalları (develop'tan açılır)
chore/*       ← Altyapı, yapılandırma, bağımlılık güncellemeleri
docs/*        ← Yalnızca dokümantasyon değişiklikleri
```

---

## 2. BRANCH HİYERARŞİSİ

```
main ────────────────────────────────────────────► production
  ↑                                                   ↑
  └── release/v1.0.0 ──── (sprint 17–18) ────────────┘
          ↑
develop ──┼─────────────────────────────────────────► staging
          │
          ├── feature/auth-jwt-rs256
          ├── feature/dream-crud
          ├── feature/nlp-embedding
          ├── fix/token-refresh-race-condition
          └── chore/update-nestjs-dependencies
```

---

## 3. BRANCH KORUMA KURALLARI

### `main` Branch

- **Doğrudan push: YASAK** (tüm ekip dahil)
- Yalnızca `release/*` veya `hotfix/*`'dan PR ile birleşir
- En az **2 reviewer** onayı zorunlu
- CI/CD tüm check'leri geçmeli (lint + test + type-check + build)
- Squash merge kullanılır (history temiz kalır)
- Tag zorunlu: `git tag v1.0.0`

### `develop` Branch

- **Doğrudan push: YASAK**
- Yalnızca `feature/*`, `fix/*`, `chore/*`, `docs/*` PR ile birleşir
- En az **1 reviewer** onayı zorunlu
- CI/CD tüm check'leri geçmeli
- Squash merge kullanılır
- Her sprint sonunda `develop` → `release/*` branch açılır

---

## 4. BRANCH İSİMLENDİRME

### Format

```
{tip}/{issue-no}-{kısa-açıklama}
```

| Tip         | Açıklama                                 | Örnek                                 |
| ----------- | ---------------------------------------- | ------------------------------------- |
| `feature/`  | Yeni özellik                             | `feature/12-auth-jwt-rs256`           |
| `fix/`      | Hata düzeltme                            | `fix/34-token-refresh-race-condition` |
| `hotfix/`   | Acil production düzeltmesi               | `hotfix/56-null-pointer-dream-match`  |
| `release/`  | Release hazırlığı                        | `release/v1.0.0`                      |
| `chore/`    | Altyapı / bağımlılık                     | `chore/update-typeorm-0.3.20`         |
| `docs/`     | Yalnızca dokümantasyon                   | `docs/api-endpoint-descriptions`      |
| `test/`     | Test ekleme / düzeltme                   | `test/dream-service-unit-coverage`    |
| `refactor/` | Davranış değiştirmeyen yeniden yapılanma | `refactor/auth-service-extract-token` |

### Kurallar

- **Tümü küçük harf**
- Boşluk yerine **tire** (`-`)
- İssue numarası **zorunlu** (tracability)
- Maksimum **50 karakter**
- Türkçe karakter kullanma (`ş`, `ğ`, `ü` vb.)

```bash
# ✅ Doğru
git checkout -b feature/12-auth-jwt-rs256
git checkout -b fix/34-token-refresh-race-condition

# ❌ Yanlış
git checkout -b AuthFeature
git checkout -b feature/yeni-auth-sistemi-jwt-rs256-ile-token-yenileme
git checkout -b feature/Auth_JWT
```

---

## 5. COMMIT MESAJI KURALLARI

### Format (Conventional Commits)

```
{tip}({kapsam}): {özet}

{isteğe bağlı gövde}

{isteğe bağlı alt bilgi}
```

### Tip Listesi

| Tip                             | Kullanım                                 | Breaking?   |
| ------------------------------- | ---------------------------------------- | ----------- |
| `feat`                          | Yeni özellik                             | Hayır       |
| `fix`                           | Hata düzeltme                            | Hayır       |
| `test`                          | Test ekleme/düzeltme                     | Hayır       |
| `refactor`                      | Yeniden yapılandırma (davranış değişmez) | Hayır       |
| `perf`                          | Performans iyileştirmesi                 | Hayır       |
| `chore`                         | Bağımlılık, araç, yapılandırma           | Hayır       |
| `docs`                          | Yalnızca dokümantasyon                   | Hayır       |
| `style`                         | Formatlama (logic değişmez)              | Hayır       |
| `ci`                            | CI/CD pipeline değişikliği               | Hayır       |
| `build`                         | Build sistemi değişikliği                | Hayır       |
| `revert`                        | Önceki commit'i geri al                  | Duruma göre |
| `feat!` veya `BREAKING CHANGE:` | Kırıcı değişiklik                        | **Evet**    |

### Kapsam Listesi (DreamCloud'a özel)

```
auth       dreams     users      feed
social     search     notifications  moderation
nlp        mobile     db         infra
api        config     deps
```

### Örnekler

```bash
# ✅ Doğru
feat(auth): add JWT RS256 token generation
fix(dreams): prevent duplicate tag insertion on concurrent requests
test(auth): add refresh token rotation edge case coverage
chore(deps): upgrade typeorm from 0.3.17 to 0.3.20
refactor(users): extract avatar upload logic to separate service
perf(feed): add Redis cache for trending tags query
docs(api): update dream endpoint response schemas
ci: add docker layer caching to GitHub Actions workflow
feat(auth)!: change refresh token format from UUID to opaque blob

BREAKING CHANGE: existing refresh tokens will be invalidated after deploy

# ❌ Yanlış
git commit -m "fix"
git commit -m "auth çalışıyor"
git commit -m "Update stuff"
git commit -m "WIP"
git commit -m "sfsdfsdfs"
```

### Commit Uzunluk Kuralları

- **Özet satırı:** Maksimum 72 karakter
- **Gövde:** Her satır maksimum 100 karakter
- **Özet Türkçe değil İngilizce** (kod tabanı İngilizce)
- Özet satırı büyük harfle başlama, nokta ile bitirme

---

## 6. PULL REQUEST SÜRECİ

### PR Açma Kuralları

1. Issue olmadan PR açılamaz
2. Branch `develop`'tan (veya `main`'den hotfix için) açılmalı
3. PR açılmadan önce `develop` ile rebase yapılmalı
4. Draft PR ile çalışmak teşvik edilir ("erken paylaş, geç merge et")

### PR Başlığı

Commit mesajıyla aynı format:

```
feat(auth): add JWT RS256 token generation
```

### PR Açıklama Şablonu (`.github/PULL_REQUEST_TEMPLATE.md`)

```markdown
## Değişiklik Özeti

<!-- Ne değiştirildi ve neden -->

## İlgili Issue

Closes #<issue-no>

## Değişiklik Türü

- [ ] feat: Yeni özellik
- [ ] fix: Hata düzeltme
- [ ] refactor: Yeniden yapılandırma
- [ ] chore: Bağımlılık / yapılandırma
- [ ] docs: Dokümantasyon

## Test Listesi

- [ ] Unit testler yazıldı / güncellendi
- [ ] Mevcut testler hâlâ geçiyor
- [ ] Manuel test yapıldı (varsa adımlar aşağıda)

## Manuel Test Adımları

<!-- varsa -->

1.
2.

## Ekran Görüntüleri

<!-- UI değişikliği varsa -->

## Kontrol Listesi

- [ ] Kod CODING_STANDARDS.md'e uygun
- [ ] Hassas bilgi (token, şifre, API key) commit'e girmedi
- [ ] `console.log` / `print` debug ifadeleri kaldırıldı
- [ ] TypeScript strict hata yok
- [ ] `develop` ile conflict çözüldü (rebase yapıldı)
```

### Review Süreci

1. PR açılır → CI otomatik çalışır
2. CI geçmeden review istenemez
3. Reviewer en geç **24 saat** içinde yanıt verir
4. `develop`'a merge: **1 onay** yeterli
5. `main`'e merge: **2 onay** zorunlu
6. Yorum çözülmeden merge yapılamaz

### Merge Stratejisi

- **`develop` ← `feature/*`:** Squash merge (history temiz)
- **`main` ← `release/*`:** Merge commit (release tarihi net görünür)
- **`main` ← `hotfix/*`:** Squash merge

---

## 7. SPRINT AKİŞİ

### Sprint Başlangıcı

```bash
# develop'tan güncel hale getir
git checkout develop
git pull origin develop

# Sprint issue için branch aç
git checkout -b feature/{issue-no}-{açıklama}
```

### Geliştirme Sırasında

```bash
# Düzenli küçük commit'ler
git add src/modules/auth/auth.service.ts
git commit -m "feat(auth): implement bcrypt password hashing"

# develop güncel kal (her gün veya her büyük mergeden sonra)
git fetch origin develop
git rebase origin/develop
```

### Sprint Sonu / Release

```bash
# develop → release branch
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0

# Release notları güncelle, versiyon bump
# PR: release/v1.0.0 → main
# PR: release/v1.0.0 → develop (hotfix varsa)

# Tag
git tag -a v1.0.0 -m "Release v1.0.0 — Sprint 17–18 tamamlandı"
git push origin v1.0.0
```

### Acil Hotfix

```bash
# main'den hotfix branch
git checkout main
git pull origin main
git checkout -b hotfix/{issue-no}-{açıklama}

# Düzelt, test et
git commit -m "fix(auth): prevent token replay attack on concurrent refresh"

# PR: hotfix/* → main (2 onay)
# PR: hotfix/* → develop (1 onay, sync için)

# main'de tag güncelle
git tag -a v1.0.1 -m "Hotfix v1.0.1 — token replay fix"
```

---

## 8. VERSIYON NUMARALAMA

Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`

| Değişim | Kural                             | Örnek    |
| ------- | --------------------------------- | -------- |
| MAJOR   | Kırıcı (breaking) API değişikliği | `v2.0.0` |
| MINOR   | Geriye uyumlu yeni özellik        | `v1.1.0` |
| PATCH   | Geriye uyumlu hata düzeltmesi     | `v1.0.1` |

### MVP Versiyonları

```
v0.1.0   ← Sprint 1–2 (Auth sistemi çalışıyor)
v0.2.0   ← Sprint 3–4 (Rüya CRUD + OAuth)
v0.3.0   ← Sprint 5–6 (NLP eşleştirme)
v0.4.0   ← Sprint 7–8 (Feed + Sosyal)
v0.5.0   ← Sprint 9–10 (Moderasyon + Bildirim)
v0.9.0   ← Sprint 17 (Beta — 1000 kullanıcı)
v1.0.0   ← Sprint 18 (Genel yayın — App Store)
```

---

## 9. YASAKLAR (KEYFİ OLARAK ASLA YAPILMAZ)

```
❌ git push --force origin main        ← Production history'yi bozar
❌ git push --force origin develop     ← Ekip çalışmasını bozar
❌ git commit --no-verify              ← Hook'ları bypass eder (güvenlik)
❌ git add .                           ← .env gibi hassas dosyalar gidebilir
❌ develop üzerine direkt push         ← Branch koruması bypass
❌ main üzerine direkt push            ← Deploy edilmemiş kod production'a gider
❌ WIP commit'leri PR'a bırakmak       ← Interactive rebase ile temizle
❌ Merge commit olmadan release         ← Versiyon takibi bozulur
```

---

_Bu doküman BRANCHING_STRATEGY.md olup tüm repo'larda (api, mobile, nlp) aynı kurallar geçerlidir._  
_Sprint 1 başlamadan GitHub repo ayarlarında branch koruması aktive edilmelidir._
