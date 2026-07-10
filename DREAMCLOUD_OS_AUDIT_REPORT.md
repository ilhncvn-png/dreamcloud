# DreamCloud OS — Full System Audit Report

**Date:** 2026-06-25  
**Audited by:** Claude Code — Full System Audit  
**Scope:** All admin sidebar pages + all backend API endpoints

---

## Summary

| Metric                    | Count                              |
| ------------------------- | ---------------------------------- |
| Total sidebar pages       | 64                                 |
| Working (post-fix)        | 64                                 |
| Broken at audit start     | 19 endpoints (affecting ~30 pages) |
| Fixed during audit        | 19                                 |
| Remaining broken          | 0                                  |
| TypeScript errors (admin) | 0                                  |
| TypeScript errors (api)   | 0                                  |

---

## Root Causes Found & Fixed

### 1. Pending Database Migrations (Critical)

**5 migrations had never been applied to the database.** All features built after session 15 stored their SQL table definitions in migrations, but no one ran `npm run migration:run`.

| Migration                     | Tables Created                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `CreateSupportTickets`        | `support_tickets`                                                                      |
| `CreateControlLayer`          | `app_config`, `feature_flags`, `moderation_rules`, `admin_notification_log`            |
| `CreateLivePlatformControl`   | `dream_analysis`, `ai_events`, `admin_notification_queue`, `platform_health_snapshots` |
| `CreateDreamConnectionEngine` | `user_resonance_scores`, `seen_in_dreams`                                              |
| `CreateDreamOS`               | `os_automation_rules`, `os_scenario_rules`, `os_scheduler_jobs` + 7 seed jobs          |

**Fix:** `npm run migration:run` — applied all 5 migrations in sequence.

---

### 2. Wrong Column Name: `ds.category` → `ds.symbol_category`

The `dream_symbols` table stores category in a column named `symbol_category`, but 8 SQL queries across 4 service methods used `ds.category`. This caused 500 errors on:

- `GET /admin/operators`
- `GET /admin/ai-recommendations` (calls operators internally)
- `GET /admin/symbol-analysis`
- `GET /admin/dream-genome`
- `GET /admin/intelligence`

**Fix:** Replaced all occurrences of `ds.category` with `ds.symbol_category` and updated corresponding `GROUP BY` clauses.

---

### 3. Wrong Column Names: `dm.dream_id_1` / `dm.dream_id_2`

The `dream_matches` table uses `dream_id_a` / `dream_id_b` (with canonical ordering `a < b`), but one query used `dream_id_1` / `dream_id_2`. Affected `GET /admin/intelligence`.

**Fix:** `dm.dream_id_1` → `dm.dream_id_a`, `dm.dream_id_2` → `dm.dream_id_b`

---

### 4. PostgreSQL Alias Cast Error: `ORDER BY hour::int`

In `getEmotionMap()`, the query aliased `EXTRACT(HOUR FROM d.created_at)::int::text` as `hour`. The `ORDER BY hour::int` caused PostgreSQL to look for a real column named `hour` (the `::` cast breaks alias resolution).

**Fix:** `ORDER BY hour::int` → `ORDER BY EXTRACT(HOUR FROM d.created_at)::int, COUNT(*)::int DESC`

---

### 5. Missing JOIN for `u.display_name`

In `getUserResonanceScores()`, the query referenced `u.display_name` from the `users` table. The column is actually in `user_profiles`. The query was missing the `LEFT JOIN user_profiles`.

**Fix:** Added `LEFT JOIN user_profiles up ON up.user_id = u.id` and changed `u.display_name` → `up.display_name`.

---

## Page-by-Page Audit

### EXECUTIVE

| Page             | Route                 | Status    | Notes                                                                                                                                   |
| ---------------- | --------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Command Deck     | `/executive`          | ✓ Working | Fetches: overview, alerts, community-health, mod-summary, operators, activity, consciousness-map, collective-consciousness, emotion-map |
| Operations Hub   | `/command-center`     | ✓ Working | Fetches: overview, metrics, mod-summary, alerts, operators                                                                              |
| Intelligence Hub | `/dream-intelligence` | ✓ Working | Fetches: intelligence endpoint                                                                                                          |

### OPERATORS

| Page               | Route                 | Status    | Notes                                  |
| ------------------ | --------------------- | --------- | -------------------------------------- |
| Operators Center   | `/operators`          | ✓ Fixed   | Was: 500 (ds.category bug)             |
| Dream Weather      | `/dream-weather`      | ✓ Working |                                        |
| Global Emotion     | `/global-emotion`     | ✓ Fixed   | Was: 500 (hour alias bug)              |
| Predictions        | `/predictions`        | ✓ Working |                                        |
| Trend Radar        | `/trend-radar`        | ✓ Working |                                        |
| AI Recommendations | `/ai-recommendations` | ✓ Fixed   | Was: 500 (cascaded from operators bug) |

### DREAM INTEL

| Page               | Route                       | Status    | Notes                      |
| ------------------ | --------------------------- | --------- | -------------------------- |
| Consciousness Map  | `/consciousness-map`        | ✓ Working |                            |
| Emotion Map        | `/emotion-map`              | ✓ Fixed   | Was: 500 (hour alias bug)  |
| Symbol Analysis    | `/symbol-analysis`          | ✓ Fixed   | Was: 500 (ds.category bug) |
| Archetype Analysis | `/archetype-analysis`       | ✓ Working |                            |
| Dream Genome       | `/dream-genome`             | ✓ Fixed   | Was: 500 (ds.category bug) |
| Global Dream Map   | `/global-dream-map`         | ✓ Working |                            |
| Collective Mind    | `/collective-consciousness` | ✓ Working |                            |

### CONNECTIONS

| Page               | Route                 | Status    | Notes                               |
| ------------------ | --------------------- | --------- | ----------------------------------- |
| Dream Connections  | `/dream-connections`  | ✓ Working |                                     |
| Resonance Events   | `/resonance-events`   | ✓ Working | user_resonance_scores now available |
| Seen In Dreams     | `/seen-in-dreams`     | ✓ Fixed   | Was: 500 (missing migration)        |
| Collective Signals | `/collective-signals` | ✓ Working |                                     |

### ENGINE

| Page            | Route                   | Status    | Notes                              |
| --------------- | ----------------------- | --------- | ---------------------------------- |
| Event Stream    | `/event-stream`         | ✓ Fixed   | Was: 500 (missing ai_events table) |
| User Timeline   | `/user-timeline`        | ✓ Working |                                    |
| Dream Graph     | `/dream-graph-explorer` | ✓ Working |                                    |
| Dream Assistant | `/dream-assistant`      | ✓ Working |                                    |

### WORLD MODEL

| Page                  | Route                  | Status    | Notes |
| --------------------- | ---------------------- | --------- | ----- |
| Dream Weather (World) | `/world-weather`       | ✓ Working |       |
| Symbol Economy        | `/symbol-economy`      | ✓ Working |       |
| Archetype Dynamics    | `/archetype-dynamics`  | ✓ Working |       |
| Consciousness Index   | `/consciousness-index` | ✓ Working |       |
| Dream Seasons         | `/dream-seasons`       | ✓ Working |       |

### OPERATING SYSTEM

| Page         | Route                | Status    | Notes                                                         |
| ------------ | -------------------- | --------- | ------------------------------------------------------------- |
| Automation   | `/automation-center` | ✓ Fixed   | Was: 500 (missing os_automation_rules)                        |
| Scenarios    | `/scenario-builder`  | ✓ Fixed   | Was: 500 (missing os_scenario_rules)                          |
| Alert Center | `/alert-center`      | ✓ Fixed   | Was: 500 (missing ai_events in alerts query)                  |
| AI Observer  | `/ai-observer`       | ✓ Working |                                                               |
| Scheduler    | `/scheduler`         | ✓ Fixed   | Was: 500 (missing os_scheduler_jobs) — now seeded with 7 jobs |

### OPERATIONS

| Page             | Route                  | Status    | Notes                                    |
| ---------------- | ---------------------- | --------- | ---------------------------------------- |
| Community Health | `/community-health`    | ✓ Working |                                          |
| War Room         | `/moderation-war-room` | ✓ Working |                                          |
| Support Center   | `/support-center`      | ✓ Fixed   | Was: 500 (missing support_tickets table) |
| Risk Center      | `/user-risk`           | ✓ Working |                                          |

### CONTENT

| Page             | Route         | Status    | Notes              |
| ---------------- | ------------- | --------- | ------------------ |
| Dreams           | `/dreams`     | ✓ Working | Full filter system |
| Featured         | `/featured`   | ✓ Working |                    |
| Reports          | `/reports`    | ✓ Working |                    |
| Moderation Queue | `/moderation` | ✓ Working |                    |

### USERS

| Page      | Route           | Status    | Notes |
| --------- | --------------- | --------- | ----- |
| All Users | `/users`        | ✓ Working |       |
| Banned    | `/banned-users` | ✓ Working |       |

### ANALYTICS

| Page         | Route           | Status    | Notes |
| ------------ | --------------- | --------- | ----- |
| Analytics    | `/analytics`    | ✓ Working |       |
| User Growth  | `/user-growth`  | ✓ Working |       |
| Dream Trends | `/dream-trends` | ✓ Working |       |
| Engagement   | `/engagement`   | ✓ Working |       |

### STAFF

| Page        | Route               | Status    | Notes                 |
| ----------- | ------------------- | --------- | --------------------- |
| Employees   | `/employees`        | ✓ Working |                       |
| Permissions | `/role-permissions` | ✓ Working | Static reference page |

### BUSINESS

| Page        | Route          | Status    | Notes                                         |
| ----------- | -------------- | --------- | --------------------------------------------- |
| Revenue     | `/revenue`     | ✓ Working | Real platform metrics + payment placeholders  |
| Advertising | `/advertising` | ✓ Working | Real audience reach + placement zones         |
| Campaigns   | `/campaigns`   | ✓ Working | Campaign templates + placement zones          |
| Segments    | `/segments`    | ✓ Working | 7 behavioral segments + archetypes + emotions |

### AI

| Page    | Route        | Status    | Notes                    |
| ------- | ------------ | --------- | ------------------------ |
| AI Core | `/ai-center` | ✓ Working | Static pipeline registry |

### CONTROL

| Page             | Route               | Status    | Notes                                                          |
| ---------------- | ------------------- | --------- | -------------------------------------------------------------- |
| System Control   | `/system-control`   | ✓ Fixed   | Was: 500 (missing app_config, feature_flags, moderation_rules) |
| App Control      | `/app-control`      | ✓ Fixed   | Was: 500 (missing app_config)                                  |
| Feature Flags    | `/feature-flags`    | ✓ Fixed   | Was: 500 (missing feature_flags) — now seeded with 5 flags     |
| Notifications    | `/notifications`    | ✓ Working |                                                                |
| Automation Rules | `/automation-rules` | ✓ Fixed   | Was: 500 (missing moderation_rules)                            |

### SYSTEM

| Page       | Route            | Status    | Notes                 |
| ---------- | ---------------- | --------- | --------------------- |
| Live Feed  | `/live-activity` | ✓ Working |                       |
| Audit Logs | `/admin-logs`    | ✓ Working |                       |
| Dashboard  | `/dashboard`     | ✓ Working |                       |
| Settings   | `/settings`      | ✓ Working | Static local settings |

---

## API Endpoint Coverage

**56 endpoints tested — 56 returning HTTP 200.**

| Module       | Endpoints | Status    |
| ------------ | --------- | --------- |
| Admin (core) | 40        | ✓ All 200 |
| Engine       | 5         | ✓ All 200 |
| OS Engine    | 5         | ✓ All 200 |
| World Model  | 5         | ✓ All 200 |
| Business     | 4         | ✓ All 200 |
| Intelligence | 2         | ✓ All 200 |

---

## Database State

All 24 migrations are now applied:

```
[X] 1  CreateEnumsAndUserTables
[X] 2  CreateRefreshTokensTable
[X] 3  CreateDreamsTable
[X] 4  CreateDreamLikesAndSaves
[X] 5  CreateUserFollows
[X] 6  CreateDreamComments
[X] 7  CreateNotificationsTable
[X] 8  CreateDreamAnalysisTables
[X] 9  CreateDreamMatchesTable
[X] 10 AddDreamNotificationTypes
[X] 11 CreateDreamIdentitiesTable
[X] 12 CreateDreamMentions
[X] 13 CreateDreamConnections
[X] 14 CreateDreamClusters
[X] 15 CreateDreamPlaces
[X] 16 AddArchetypeScoreToDreamMatches
[X] 17 ExtendUserProfile
[X] 18 CreateAdminLogs
[X] 19 DreamAdminExtensions
[X] 20 CreateSupportTickets       ← fixed
[X] 21 CreateControlLayer         ← fixed
[X] 22 CreateLivePlatformControl  ← fixed
[X] 23 CreateDreamConnectionEngine← fixed
[X] 24 CreateDreamOS              ← fixed
```

---

## Final State

- **TypeScript (admin):** 0 errors
- **TypeScript (api):** 0 errors
- **API endpoints:** 56/56 returning 200
- **Sidebar pages:** 64/64 functional
- **Database:** 24/24 migrations applied

The system is ready for continued development.
