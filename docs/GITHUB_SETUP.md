# GitHub Repository Setup Guide

Bu dosya, repository'yi production-ready hale getirmek için GitHub UI'da yapman gereken **manuel adımları** içerir. Kod repository'sine commit edilir; takım üyeleri de bu rehberi izleyebilir.

---

## 1. Branch Protection Rules

### 1.1 `main` Branch (Production)

**Settings → Branches → Add rule → Branch name pattern: `main`**

| Setting                                                          | Value                    |
| ---------------------------------------------------------------- | ------------------------ |
| Require a pull request before merging                            | ✅                       |
| Required approving reviews                                       | **2**                    |
| Dismiss stale pull request approvals when new commits are pushed | ✅                       |
| Require review from Code Owners                                  | ✅                       |
| Require status checks to pass before merging                     | ✅                       |
| Require branches to be up to date before merging                 | ✅                       |
| Status checks — Required checks                                  | `lint-typecheck`, `test` |
| Require conversation resolution before merging                   | ✅                       |
| Require signed commits                                           | ❌ (opsiyonel)           |
| Require linear history                                           | ✅                       |
| Include administrators                                           | ✅                       |
| Allow force pushes                                               | ❌                       |
| Allow deletions                                                  | ❌                       |

### 1.2 `develop` Branch (Integration)

**Settings → Branches → Add rule → Branch name pattern: `develop`**

| Setting                                                          | Value                    |
| ---------------------------------------------------------------- | ------------------------ |
| Require a pull request before merging                            | ✅                       |
| Required approving reviews                                       | **1**                    |
| Dismiss stale pull request approvals when new commits are pushed | ✅                       |
| Require review from Code Owners                                  | ❌                       |
| Require status checks to pass before merging                     | ✅                       |
| Require branches to be up to date before merging                 | ✅                       |
| Status checks — Required checks                                  | `lint-typecheck`, `test` |
| Require conversation resolution before merging                   | ✅                       |
| Require linear history                                           | ✅                       |
| Include administrators                                           | ❌                       |
| Allow force pushes                                               | ❌                       |
| Allow deletions                                                  | ❌                       |

---

## 2. GitHub Secrets

**Settings → Secrets and variables → Actions → New repository secret**

### 2.1 AWS Credentials

| Secret Name                     | Description                                      | Nereden Alınır                                                    |
| ------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| `AWS_ACCESS_KEY_ID_STAGING`     | Staging ortamı için AWS IAM Access Key ID        | AWS Console → IAM → Users → CI kullanıcısı → Security credentials |
| `AWS_SECRET_ACCESS_KEY_STAGING` | Staging ortamı için AWS IAM Secret Access Key    | Yukarıdaki ile aynı, key oluştururken bir kez gösterilir          |
| `AWS_ACCESS_KEY_ID_PROD`        | Production ortamı için AWS IAM Access Key ID     | Ayrı prod IAM kullanıcısı — staging ile aynı kullanıcı OLMAMALI   |
| `AWS_SECRET_ACCESS_KEY_PROD`    | Production ortamı için AWS IAM Secret Access Key | Prod IAM kullanıcısı, key oluştururken                            |
| `AWS_ECR_REGISTRY`              | ECR registry URL                                 | `<account-id>.dkr.ecr.<region>.amazonaws.com` formatında          |

> **IAM İzin Politikası (CI kullanıcıları için minimum):**
>
> - `ecr:GetAuthorizationToken`
> - `ecr:BatchCheckLayerAvailability`
> - `ecr:GetDownloadUrlForLayer`
> - `ecr:BatchGetImage`
> - `ecr:PutImage`
> - `ecr:InitiateLayerUpload`
> - `ecr:UploadLayerPart`
> - `ecr:CompleteLayerUpload`
> - `ecs:UpdateService`
> - `ecs:RegisterTaskDefinition`

### 2.2 Test Infrastructure

| Secret Name            | Description                                              | Nereden Alınır                                       |
| ---------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| `JWT_TEST_PRIVATE_KEY` | Test ortamı için RS256 private key (PEM, base64 encoded) | `openssl genrsa 2048 \| base64 -w 0`                 |
| `JWT_TEST_PUBLIC_KEY`  | Test ortamı için RS256 public key (PEM, base64 encoded)  | `openssl rsa -pubout -in private.pem \| base64 -w 0` |

> **NOT:** Bu anahtarlar sadece CI testleri içindir, production'da kullanılmaz.
> Production JWT anahtarları `apps/api/keys/` dizininde saklanır (gitignored).

### 2.3 Coverage & Build Cache

| Secret Name     | Description                          | Nereden Alınır                                            |
| --------------- | ------------------------------------ | --------------------------------------------------------- |
| `CODECOV_TOKEN` | Codecov.io coverage upload tokeni    | codecov.io → Settings → Repository Upload Token           |
| `TURBO_TEAM`    | Turborepo remote cache takım adı     | Vercel Dashboard → Settings → Your name (prefix: `team_`) |
| `TURBO_TOKEN`   | Turborepo remote cache erişim tokeni | Vercel Dashboard → Settings → Tokens → Create             |

> **NOT:** `TURBO_TEAM` ve `TURBO_TOKEN` opsiyoneldir. Remote cache olmadan CI çalışır,
> sadece build süreleri daha uzun olur. Sprint 2'de kurulabilir.

### 2.4 Otomatik Sağlanan Secret

| Secret Name    | Description                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN` | GitHub tarafından her workflow run'da otomatik olarak sağlanır. Manuel oluşturmana gerek yok. |

---

## 3. Repository Settings

**Settings → General**

| Setting                            | Value                        |
| ---------------------------------- | ---------------------------- |
| Default branch                     | `develop`                    |
| Allow merge commits                | ❌                           |
| Allow squash merging               | ✅ (default — takım tercihi) |
| Allow rebase merging               | ✅                           |
| Automatically delete head branches | ✅                           |

---

## 4. Environments

**Settings → Environments → New environment**

İki environment oluştur:

### `staging`

- Protection rules: Required reviewers → (boş bırak)
- Deployment branches: `develop` branch'ı

### `production`

- Protection rules: Required reviewers → **2 kişi** (lead + 1)
- Deployment branches: `main` branch'ı

---

## 5. CODEOWNERS Özeti

`.github/CODEOWNERS` dosyası zaten repository'de mevcut. Takım üyelerinin GitHub kullanıcı adlarını bu dosyaya ekle.

**Şu anki durum:** `@ilhncvn-png` sahip olarak tanımlı.

---

## 6. CI/CD Notları

> **Sprint 1 sonunda düzeltilecek:** Bazı workflow dosyalarında `--filter=api` yerine
> `--filter=@dreamcloud/api` (Turborepo scoped filter) kullanılması gerekiyor.
> Bu workflow CI başarısızlıklarına yol açabilir — Sprint 1 bitiminde ele alınacak.

---

## Öncelik Sırası

1. ✅ **Hemen yap:** Branch protection (`main` ve `develop`)
2. ✅ **Hemen yap:** `GITHUB_TOKEN` dışındaki tüm secretları ekle (en azından `CODECOV_TOKEN` ve `JWT_TEST_*`)
3. ⏳ **Sprint 2:** AWS credentials (deploy workflow'ları aktif olduğunda)
4. ⏳ **Opsiyonel:** Turborepo remote cache secrets
