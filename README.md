# DreamCloud

**Dream-sharing social media platform** — A place where people share their dreams and discover others who dream the same.

[![CI](https://github.com/ilhncvn-png/dreamcloud/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/ilhncvn-png/dreamcloud/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/ilhncvn-png/dreamcloud/branch/develop/graph/badge.svg)](https://codecov.io/gh/ilhncvn-png/dreamcloud)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What Is DreamCloud?

DreamCloud lets users record and share their dreams, then uses NLP-powered semantic matching to connect people who share similar dream experiences. The platform is built for genuine social connection — not content virality.

**Core features (MVP):**

- Dream recording with rich text and mood tagging
- AI-powered dream matching (semantic similarity via pgvector)
- Social graph (followers, feed, notifications)
- Content moderation pipeline
- iOS + Android via a single React Native codebase

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                        │
│         React Native + Expo SDK 52 (iOS / Android)      │
└───────────────────┬─────────────────────────────────────┘
                    │ HTTPS / REST
┌───────────────────▼─────────────────────────────────────┐
│                  API Gateway Layer                       │
│         NestJS 10 + Fastify  (port 3000)                │
│         JWT RS256 auth · Bull queue · Swagger docs       │
└────────┬────────────────────────┬───────────────────────┘
         │ TypeORM                │ HTTP (internal key)
┌────────▼─────────┐   ┌─────────▼──────────────────────┐
│  PostgreSQL 16   │   │   Python FastAPI NLP Service   │
│  + pgvector      │   │   sentence-transformers · uvicorn│
│  + pg_trgm       │   │   (port 8000)                   │
└──────────────────┘   └─────────────────────────────────┘
         │
┌────────▼─────────┐
│    Redis 7        │
│  Cache · Queues   │
└──────────────────┘
```

**Monorepo layout (Turborepo):**

```
dreamcloud/
├── apps/
│   ├── api/          NestJS — REST API & business logic
│   ├── mobile/       React Native + Expo — iOS & Android
│   ├── nlp/          Python FastAPI — NLP matching service
│   └── web/          Next.js — Web client (Sprint 3+)
├── packages/
│   ├── shared-types/ Shared TypeScript types & enums
│   ├── eslint-config/ Shared ESLint flat config
│   ├── typescript-config/ Shared tsconfig bases
│   └── utils/        Shared utility functions
├── infrastructure/
│   ├── docker/       Docker Compose (dev + test)
│   ├── terraform/    AWS infrastructure (ECS, RDS, ECR)
│   └── scripts/      Dev & deploy scripts
├── .github/
│   └── workflows/    CI/CD pipelines (6 workflows)
└── docs/             Project documentation
```

---

## Tech Stack

| Layer           | Technology                                    |
| --------------- | --------------------------------------------- |
| Backend API     | NestJS 10 + Fastify + TypeScript              |
| Mobile          | React Native 0.76 + Expo SDK 52               |
| NLP Service     | Python 3.11 + FastAPI + sentence-transformers |
| Database        | PostgreSQL 16 + pgvector + pg_trgm            |
| Cache / Queue   | Redis 7 + Bull                                |
| Auth            | JWT RS256 (asymmetric keys, refresh rotation) |
| Infrastructure  | AWS ECS + RDS + ECR + Terraform               |
| CI/CD           | GitHub Actions (6 workflows)                  |
| Monorepo Build  | Turborepo v2                                  |
| Package Manager | npm workspaces (npm 11)                       |

---

## Prerequisites

| Tool           | Minimum Version | Install                                             |
| -------------- | --------------- | --------------------------------------------------- |
| Node.js        | 22.x (LTS)      | [nvm](https://github.com/nvm-sh/nvm) — `nvm use`    |
| npm            | 11.x            | bundled with Node                                   |
| Python         | 3.11+           | [pyenv](https://github.com/pyenv/pyenv)             |
| Docker Desktop | Latest          | [docs.docker.com](https://docs.docker.com/desktop/) |
| Git            | 2.40+           | system package manager                              |

---

## Quick Start

```bash
# 1. Clone
git clone git@github.com:ilhncvn-png/dreamcloud.git
cd dreamcloud

# 2. Use correct Node version
nvm use

# 3. Install all dependencies (workspaces)
npm install

# 4. First-time setup (creates .env files, starts Docker, generates JWT keys)
bash infrastructure/scripts/setup-dev.sh

# 5. Run migrations
npm run db:migrate

# 6. Start all services
npm run dev
```

**Service URLs after startup:**

| Service         | URL                            |
| --------------- | ------------------------------ |
| NestJS API      | http://localhost:3000          |
| Swagger UI      | http://localhost:3000/api/docs |
| FastAPI NLP     | http://localhost:8000          |
| FastAPI Docs    | http://localhost:8000/docs     |
| Expo Dev Server | exp://localhost:8081           |

---

## Development

### Run individual services

```bash
# API
npm run dev --workspace=apps/api

# Mobile (Expo)
npm run dev --workspace=apps/mobile

# NLP (Python)
cd apps/nlp
python -m uvicorn app.main:app --reload
```

### Build all packages

```bash
npx turbo run build
```

### Type check & lint

```bash
npx turbo run type-check
npx turbo run lint
```

### Tests

```bash
# All tests
npx turbo run test

# API only
npx turbo run test --filter=@dreamcloud/api

# Mobile only
npx turbo run test --filter=@dreamcloud/mobile
```

### Database migrations

```bash
# Generate new migration
cd apps/api
npm run migration:generate -- src/database/migrations/MigrationName -d src/database/data-source.ts

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

---

## Environment Variables

Each app has its own `.env` file (gitignored). Copy from the example:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
cp apps/nlp/.env.example apps/nlp/.env
```

---

## Git Workflow

| Branch      | Purpose                           | Protection                   |
| ----------- | --------------------------------- | ---------------------------- |
| `main`      | Production — deployed on merge    | 2 reviewers + CI required    |
| `develop`   | Integration — staging auto-deploy | 1 reviewer + CI required     |
| `feature/*` | New features                      | PR into `develop`            |
| `fix/*`     | Bug fixes                         | PR into `develop`            |
| `hotfix/*`  | Urgent production fixes           | PR into `main` AND `develop` |

**Commit format:** [Conventional Commits](https://www.conventionalcommits.org/)

```
feat(auth): add refresh token rotation
fix(dreams): resolve race condition in feed pagination
chore(deps): update nestjs to 10.4.15
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

---

## Project Documentation

| Document                                            | Description                                              |
| --------------------------------------------------- | -------------------------------------------------------- |
| [MASTER_PROJECT.md](docs/MASTER_PROJECT.md)         | Single source of truth — vision, architecture, decisions |
| [PROJECT_STATE.md](docs/PROJECT_STATE.md)           | Current sprint status & progress                         |
| [SPRINT_1_TASKS.md](docs/SPRINT_1_TASKS.md)         | Sprint 1 task list & acceptance criteria                 |
| [BRANCHING_STRATEGY.md](docs/BRANCHING_STRATEGY.md) | Detailed Git workflow & branch naming                    |
| [CODING_STANDARDS.md](docs/CODING_STANDARDS.md)     | TypeScript & Python code style guide                     |
| [DEVELOPMENT_RULES.md](docs/DEVELOPMENT_RULES.md)   | Team rules & conventions                                 |
| [GITHUB_SETUP.md](docs/GITHUB_SETUP.md)             | Manual GitHub UI steps (branch protection, secrets)      |
| [SPRINT_1_AUDIT.md](docs/SPRINT_1_AUDIT.md)         | Sprint 1 readiness audit report                          |

---

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

For security vulnerabilities, see [SECURITY.md](.github/SECURITY.md).

---

## License

MIT — see [LICENSE](LICENSE) for details.
