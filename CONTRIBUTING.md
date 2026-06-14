# Contributing to DreamCloud

Thank you for contributing to DreamCloud. This guide covers everything you need before opening a pull request.

---

## Table of Contents

- [Before You Start](#before-you-start)
- [Development Setup](#development-setup)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Code Review](#code-review)
- [Questions](#questions)

---

## Before You Start

1. Check [PROJECT_STATE.md](docs/PROJECT_STATE.md) for the current sprint and in-progress work.
2. Check [SPRINT_1_TASKS.md](docs/SPRINT_1_TASKS.md) (or the current sprint file) to avoid duplicating effort.
3. For bugs or features not already tracked, open an issue first and wait for acknowledgment before starting.
4. For security vulnerabilities, follow [SECURITY.md](.github/SECURITY.md) — do **not** open a public issue.

---

## Development Setup

```bash
git clone git@github.com:ilhncvn-png/dreamcloud.git
cd dreamcloud
nvm use                          # Node 22 LTS
npm install
bash infrastructure/scripts/setup-dev.sh
```

See [README.md](README.md) for full setup instructions.

**Pre-commit hooks run automatically** (Husky + lint-staged):

- ESLint autofix on staged TypeScript files
- commitlint validates your commit message format

If a hook fails, fix the issue before committing — do not use `--no-verify`.

---

## Branch Naming

All work branches are cut from `develop` (except hotfixes, which come from `main`).

| Prefix      | When to use                      | Example                           |
| ----------- | -------------------------------- | --------------------------------- |
| `feature/`  | New functionality                | `feature/dream-feed-pagination`   |
| `fix/`      | Bug fix                          | `fix/auth-token-expiry-edge-case` |
| `chore/`    | Build, deps, config              | `chore/upgrade-nestjs-10.5`       |
| `docs/`     | Documentation only               | `docs/update-api-setup-guide`     |
| `hotfix/`   | Urgent production fix            | `hotfix/otp-bypass-security`      |
| `refactor/` | Code cleanup, no behavior change | `refactor/dreams-service-extract` |

**Rules:**

- Use `kebab-case` for the slug
- Keep it short — describe the change, not the ticket number
- One concern per branch; avoid combining a bug fix with unrelated cleanup

---

## Commit Messages

DreamCloud uses [Conventional Commits](https://www.conventionalcommits.org/). commitlint enforces this on every commit.

**Format:**

```
<type>(<scope>): <short description>

[optional body]

[optional footer: e.g. Closes #42]
```

**Allowed types:**

| Type       | Use for                                 |
| ---------- | --------------------------------------- |
| `feat`     | New feature visible to users or callers |
| `fix`      | Bug fix                                 |
| `chore`    | Build, tooling, dependency updates      |
| `docs`     | Documentation only                      |
| `refactor` | Code change with no behavior change     |
| `test`     | Adding or updating tests                |
| `perf`     | Performance improvement                 |
| `ci`       | CI/CD pipeline changes                  |
| `style`    | Formatting (no logic change)            |

**Allowed scopes:**

`auth`, `dreams`, `users`, `nlp`, `mobile`, `api`, `db`, `infra`, `ci`, `deps`, `docs`

**Examples:**

```
feat(dreams): add mood tag filtering to feed query
fix(auth): handle expired refresh token on concurrent requests
chore(deps): upgrade typeorm to 0.3.21
test(dreams): add integration test for feed pagination
docs(api): update swagger response schema for /dreams
ci: fix turbo filter syntax in ci.yml
```

**Rules:**

- Description: imperative mood (`add`, not `added` or `adds`), lowercase, no period at the end
- Max 72 characters in the subject line
- Breaking changes: add `BREAKING CHANGE:` in the footer and `!` after the scope (`feat(auth)!:`)

---

## Pull Request Process

### 1. Keep PRs small and focused

One logical change per PR. Large PRs slow down review and increase merge risk. If a task is big, split it into sequential PRs on a stack.

### 2. Fill out the PR template

The template ([`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md)) has required sections. Every section must be completed — blank checkboxes block merge.

### 3. CI must pass

All status checks must be green before merge:

- `lint-typecheck` — ESLint + tsc `--noEmit`
- `test` — unit and integration tests with coverage thresholds

### 4. Required reviews

| Target branch | Reviews required    |
| ------------- | ------------------- |
| `develop`     | 1 approving review  |
| `main`        | 2 approving reviews |

### 5. Keep your branch up to date

Before requesting review, rebase on the latest target branch:

```bash
git fetch origin
git rebase origin/develop    # or origin/main for hotfixes
```

Resolve any conflicts locally, then push. Avoid merge commits.

### 6. Merge strategy

- **`develop`**: Squash merge (default) — keeps history clean
- **`main`**: Squash merge only from `develop` (via release or direct merge)
- **`hotfix/*` → `main`**: Merge commit (preserves the hotfix context)

---

## Code Standards

The full style guide is in [CODING_STANDARDS.md](docs/CODING_STANDARDS.md). Key rules:

**TypeScript (API + packages):**

- `strict: true` — no implicit `any`, no unchecked nulls
- No `!` non-null assertions without a comment explaining why it can't be null
- `import type` for type-only imports
- No floating promises — always `void`, `await`, or `return`
- NestJS modules and classes use PascalCase; files use `kebab-case.service.ts` naming

**Python (NLP service):**

- Python 3.11+; type hints on all public functions
- Pydantic models for request/response shapes — no raw `dict` in route handlers
- `async`/`await` throughout; no blocking I/O on the async thread
- Line length: 100 chars; formatter: `ruff format`

**General:**

- No TODO comments in committed code — open an issue instead
- No commented-out code — delete it, git history preserves it
- Env vars only via `.env` files (gitignored) or CI secrets — never hardcoded

---

## Testing Requirements

| App                  | Required threshold                     | Test types                   |
| -------------------- | -------------------------------------- | ---------------------------- |
| `@dreamcloud/api`    | 80% lines, 80% functions, 70% branches | Unit + integration (real DB) |
| `@dreamcloud/mobile` | No threshold yet (Sprint 2)            | Component tests              |
| `apps/nlp`           | No threshold yet (Sprint 2)            | Unit tests                   |

**API integration tests** use a real local PostgreSQL instance — never mock the database. See the note in [SPRINT_1_AUDIT.md](docs/SPRINT_1_AUDIT.md) on why.

New features must include at least:

- One happy-path test
- One error/edge-case test

---

## Code Review

**For reviewers:**

- Review within 24 hours on business days (48 hours is the hard limit)
- Comment on logic, correctness, and security — not style (the linter handles that)
- If you leave blocking feedback, re-review within 24 hours when the author responds
- Approve only when you would feel comfortable defending the change in production

**For authors:**

- Respond to every comment — even if just "done" or "disagree, see below"
- Don't re-request review until all blocking comments are addressed
- Disagreements: discuss in the PR, escalate to async (Slack) only if unresolved after 2 rounds

---

## Questions

- For project context: read [MASTER_PROJECT.md](docs/MASTER_PROJECT.md) first
- For architecture decisions: [docs/](docs/) directory
- For urgent questions: open a GitHub Discussion or reach the project owner via GitHub
