# DreamCloud

**Dream-sharing social media platform** — A place where people share their dreams and discover others who dream the same.

## Quick Start

```bash
# First-time setup (installs deps, creates .env files, starts Docker, generates JWT keys)
bash infrastructure/scripts/setup-dev.sh

# Run database migrations
npm run db:migrate

# Start all services in parallel
npm run dev

# Or start individually
cd apps/api && npm run dev         # NestJS API → http://localhost:3000
cd apps/mobile && npm run dev      # Expo → exp://localhost:8081
cd apps/nlp && uvicorn app.main:app --reload  # FastAPI → http://localhost:8000
```

## Repository Structure

```
dreamcloud/
├── apps/
│   ├── api/          NestJS (TypeScript) — REST API
│   ├── mobile/       React Native + Expo — iOS & Android
│   ├── nlp/          Python FastAPI — NLP matching service
│   └── web/          Next.js (V2 placeholder)
├── packages/
│   ├── shared-types/ Common TypeScript types & enums
│   ├── eslint-config/ Shared ESLint rules
│   ├── typescript-config/ Shared tsconfig bases
│   └── utils/        Shared utility functions
├── infrastructure/
│   ├── docker/       Docker Compose (dev + test)
│   ├── terraform/    AWS infrastructure (ECS, RDS, etc.)
│   └── scripts/      Dev & deploy scripts
├── .github/
│   └── workflows/    CI/CD pipelines
└── docs/             Project documentation
```

## Tech Stack

| Layer       | Technology                             |
| ----------- | -------------------------------------- |
| Backend API | NestJS 10 + TypeScript                 |
| Mobile      | React Native + Expo SDK 52             |
| NLP Service | Python FastAPI + sentence-transformers |
| Database    | PostgreSQL 16 + pgvector + pg_trgm     |
| Cache       | Redis 7                                |
| Auth        | JWT RS256 + refresh token rotation     |
| Queue       | Bull (Redis-backed)                    |
| IaC         | Terraform (AWS)                        |
| CI/CD       | GitHub Actions                         |
| Build       | Turborepo                              |

## Development Docs

- [MASTER_PROJECT.md](docs/MASTER_PROJECT.md) — Single source of truth
- [PROJECT_STATE.md](docs/PROJECT_STATE.md) — Current sprint status
- [SPRINT_1_TASKS.md](docs/SPRINT_1_TASKS.md) — Current sprint task list
- [BRANCHING_STRATEGY.md](docs/BRANCHING_STRATEGY.md) — Git workflow
- [CODING_STANDARDS.md](docs/CODING_STANDARDS.md) — Code style guide
- [DEVELOPMENT_RULES.md](docs/DEVELOPMENT_RULES.md) — Team rules
