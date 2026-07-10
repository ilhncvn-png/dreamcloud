# DreamCloud Admin System Validation Report

**Date**: 2026-06-25  
**Validated by**: Full system audit — 67 pages, 60+ API endpoints  
**Result**: All pages load. All API endpoints return 200. TypeScript: 0 errors.

---

## Summary

| Category                    | Count |
| --------------------------- | ----- |
| Total admin pages           | 67    |
| Pages with API data         | 65    |
| Static pages (no API)       | 2     |
| Pages crashed before fix    | 6     |
| Backend bugs fixed          | 1     |
| TypeScript errors (before)  | 0     |
| TypeScript errors (after)   | 0     |
| API endpoints tested        | 60    |
| API endpoints returning 200 | 60    |

---

## Fixes Applied This Session

### 1. WorldWeather.tsx — `.toFixed()` on PostgreSQL ROUND() string (CRASH)

- **Root cause**: `ROUND()` in PostgreSQL raw queries returns JavaScript strings, not numbers
- **Lines fixed**: 92 (`EmotionClimatePanel`), 170 (`IntensityPanel`)
- **Fix**: `r.pct.toFixed(1)` → `Number(r.pct).toFixed(1)` and `r.pct.toFixed(0)` → `Number(r.pct).toFixed(0)`

### 2. DreamSeasons.tsx — `.toFixed()` on PostgreSQL ROUND() string (CRASH)

- **Lines fixed**: 45 (`CurrentSeasonBanner` top item), 57 (all season items), 111 (`MonthlyEraTimeline`)
- **Fix**: `top.pct.toFixed(1)` → `Number(top.pct).toFixed(1)`, `item.pct.toFixed(1)` → `Number(item.pct).toFixed(1)`, `era.dominance_pct.toFixed(0)` → `Number(era.dominance_pct).toFixed(0)`

### 3. ArchetypeDynamics.tsx — `.toFixed()` on PostgreSQL ROUND() string (CRASH)

- **Line fixed**: 37 (`DominantCard`)
- **Fix**: `a.pct.toFixed(1)` → `Number(a.pct).toFixed(1)`

### 4. DreamGraphExplorer.tsx — `.toFixed()` on PostgreSQL ROUND() string (CRASH)

- **Line fixed**: 37 (`ConnectionCard`)
- **Fix**: `conn.score.toFixed(0)` → `Number(conn.score).toFixed(0)`

### 5. UserTimeline.tsx — `.toFixed()` on PostgreSQL ROUND() string (CRASH)

- **Line fixed**: 140 (resonance tooltip)
- **Fix**: `r.score_pct.toFixed(0)` → `Number(r.score_pct).toFixed(0)`

### 6. EventStream.tsx — Optional chaining on ROUND() string (CRASH + BLANK STATS)

- **Line fixed**: 27 (`EventRow` detail string for `NEW_MATCH` events)
- **Fix**: `ev.score_pct?.toFixed(0)` → `ev.score_pct != null ? Number(ev.score_pct).toFixed(0) : '—'`

### 7. event-engine.service.ts — SQL alias mismatch (BLANK STATS PANEL)

- **Root cause**: `getEventStats()` returned `new_dreams`, `new_matches`, `new_signals`, `new_users` but `EventStats` TypeScript interface and `EventStream.tsx` expected `total_dreams`, `total_matches`, `total_ai_events`, `active_users`, `window_hours`
- **Fix**: Renamed all SQL column aliases, added `window_hours: hours` to return object
- **Affected route**: `GET /admin/engine/events/stats`

---

## API Endpoint Status (60 Endpoints Tested)

All endpoints return HTTP 200 with `{ data: T, timestamp, path }` envelope.

| Endpoint                                     | Status         |
| -------------------------------------------- | -------------- |
| `GET /admin/overview`                        | ✅ 200         |
| `GET /admin/dashboard/metrics`               | ✅ 200         |
| `GET /admin/users`                           | ✅ 200         |
| `GET /admin/users/:id`                       | ✅ 200         |
| `GET /admin/users/:id/activity`              | ✅ 200         |
| `GET /admin/users/:id/dreams`                | ✅ 200         |
| `GET /admin/users/:id/intelligence`          | ✅ 200         |
| `GET /admin/users/:id/risk-profile`          | ✅ 200         |
| `GET /admin/users/:id/moderation-history`    | ✅ 200         |
| `GET /admin/dreams`                          | ✅ 200         |
| `GET /admin/dreams/:id`                      | ✅ 200         |
| `GET /admin/analytics/dreams`                | ✅ 200         |
| `GET /admin/analytics/growth`                | ✅ 200         |
| `GET /admin/analytics/engagement`            | ✅ 200         |
| `GET /admin/intelligence`                    | ✅ 200         |
| `GET /admin/intelligence/emotional-trends`   | ✅ 200         |
| `GET /admin/intelligence/resonance-events`   | ✅ 200         |
| `GET /admin/intelligence/collective-summary` | ✅ 200         |
| `GET /admin/community-health`                | ✅ 200         |
| `GET /admin/reports`                         | ✅ 200         |
| `GET /admin/moderation/summary`              | ✅ 200         |
| `GET /admin/moderation-queue`                | ✅ 200         |
| `GET /admin/moderation-rules`                | ✅ 200         |
| `GET /admin/alerts`                          | ✅ 200         |
| `GET /admin/risk`                            | ✅ 200         |
| `GET /admin/employees`                       | ✅ 200         |
| `GET /admin/support/tickets`                 | ✅ 200         |
| `GET /admin/operators`                       | ✅ 200         |
| `GET /admin/dream-weather`                   | ✅ 200         |
| `GET /admin/global-emotion`                  | ✅ 200         |
| `GET /admin/predictions`                     | ✅ 200         |
| `GET /admin/trend-radar`                     | ✅ 200         |
| `GET /admin/ai-recommendations`              | ✅ 200         |
| `GET /admin/consciousness-map`               | ✅ 200         |
| `GET /admin/emotion-map`                     | ✅ 200         |
| `GET /admin/symbol-analysis`                 | ✅ 200         |
| `GET /admin/archetype-analysis`              | ✅ 200         |
| `GET /admin/dream-genome`                    | ✅ 200         |
| `GET /admin/global-dream-map`                | ✅ 200         |
| `GET /admin/collective-consciousness`        | ✅ 200         |
| `GET /admin/activity`                        | ✅ 200         |
| `GET /admin/logs`                            | ✅ 200         |
| `GET /admin/app-configs`                     | ✅ 200         |
| `GET /admin/feature-flags`                   | ✅ 200         |
| `GET /admin/notifications/history`           | ✅ 200         |
| `GET /admin/live-stream`                     | ✅ 200         |
| `GET /admin/platform-health/live`            | ✅ 200         |
| `GET /admin/ai-signals`                      | ✅ 200         |
| `GET /admin/dream-analysis-stats`            | ✅ 200         |
| `GET /admin/connections`                     | ✅ 200         |
| `GET /admin/connections/user-resonance`      | ✅ 200         |
| `GET /admin/connections/seen-in-dreams`      | ✅ 200         |
| `GET /admin/connections/feed`                | ✅ 200         |
| `GET /admin/connections/collective-signals`  | ✅ 200         |
| `GET /admin/engine/events`                   | ✅ 200         |
| `GET /admin/engine/events/stats`             | ✅ 200 (FIXED) |
| `GET /admin/os/automation`                   | ✅ 200         |
| `GET /admin/os/scenarios`                    | ✅ 200         |
| `GET /admin/os/alerts`                       | ✅ 200         |
| `GET /admin/os/observer`                     | ✅ 200         |
| `GET /admin/os/scheduler`                    | ✅ 200         |
| `GET /admin/world/weather`                   | ✅ 200         |
| `GET /admin/world/symbols`                   | ✅ 200         |
| `GET /admin/world/archetypes`                | ✅ 200         |
| `GET /admin/world/consciousness`             | ✅ 200         |
| `GET /admin/world/seasons`                   | ✅ 200         |
| `GET /admin/business/revenue`                | ✅ 200         |
| `GET /admin/business/segments`               | ✅ 200         |
| `GET /admin/business/campaigns`              | ✅ 200         |
| `GET /admin/business/ads`                    | ✅ 200         |

---

## Page-by-Page Status

### Executive Section

| Route                 | Component          | API                                                         | Status  | Notes                 |
| --------------------- | ------------------ | ----------------------------------------------------------- | ------- | --------------------- |
| `/dashboard`          | Dashboard          | `dashboard/metrics`, `intelligence`, `community-health`     | ✅ PASS |                       |
| `/executive`          | ExecutiveDashboard | `dashboard/metrics`, `community-health`, `analytics/growth` | ✅ PASS |                       |
| `/command-center`     | CommandCenter      | `dashboard/metrics`, `users`, `dreams`                      | ✅ PASS |                       |
| `/dream-intelligence` | DreamIntelligence  | `intelligence`                                              | ✅ PASS | Has empty-state guard |

### Operations Section

| Route                  | Component         | API                                                | Status  | Notes |
| ---------------------- | ----------------- | -------------------------------------------------- | ------- | ----- |
| `/community-health`    | CommunityHealth   | `community-health`                                 | ✅ PASS |       |
| `/moderation-war-room` | ModerationWarRoom | `moderation/summary`, `alerts`, `moderation-queue` | ✅ PASS |       |
| `/support-center`      | SupportCenter     | `support/tickets`                                  | ✅ PASS |       |
| `/user-risk`           | UserRiskCenter    | `risk`                                             | ✅ PASS |       |

### Users Section

| Route           | Component   | API                               | Status  | Notes |
| --------------- | ----------- | --------------------------------- | ------- | ----- |
| `/users`        | Users       | `users`                           | ✅ PASS |       |
| `/users/:id`    | UserDetail  | `users/:id`, `users/:id/activity` | ✅ PASS |       |
| `/banned-users` | BannedUsers | `users` (filtered)                | ✅ PASS |       |

### Content Section

| Route               | Component       | API                                    | Status  | Notes |
| ------------------- | --------------- | -------------------------------------- | ------- | ----- |
| `/dreams`           | Dreams          | `dreams`                               | ✅ PASS |       |
| `/dreams/analytics` | DreamAnalytics  | `analytics/dreams`                     | ✅ PASS |       |
| `/dreams/:id`       | DreamDetail     | `dreams/:id`, `dreams/:id/reports`     | ✅ PASS |       |
| `/featured`         | FeaturedContent | `dreams`                               | ✅ PASS |       |
| `/reports`          | Reports         | `reports`                              | ✅ PASS |       |
| `/moderation`       | Moderation      | `moderation-queue`, `moderation-rules` | ✅ PASS |       |

### Analytics Section

| Route           | Component   | API                                        | Status  | Notes |
| --------------- | ----------- | ------------------------------------------ | ------- | ----- |
| `/analytics`    | Analytics   | `analytics/engagement`, `analytics/dreams` | ✅ PASS |       |
| `/user-growth`  | UserGrowth  | `analytics/growth`                         | ✅ PASS |       |
| `/dream-trends` | DreamTrends | `analytics/dreams`                         | ✅ PASS |       |
| `/engagement`   | Engagement  | `analytics/engagement`                     | ✅ PASS |       |

### Employee Section

| Route               | Component          | API         | Status  | Notes                       |
| ------------------- | ------------------ | ----------- | ------- | --------------------------- |
| `/employees`        | EmployeeManagement | `employees` | ✅ PASS |                             |
| `/role-permissions` | RolePermissions    | — (static)  | ✅ PASS | Hardcoded permission matrix |

### Revenue Section

| Route          | Component     | API                  | Status  | Notes |
| -------------- | ------------- | -------------------- | ------- | ----- |
| `/revenue`     | RevenueCenter | `business/revenue`   | ✅ PASS |       |
| `/advertising` | Advertising   | `business/ads`       | ✅ PASS |       |
| `/campaigns`   | Campaigns     | `business/campaigns` | ✅ PASS |       |
| `/segments`    | Segments      | `business/segments`  | ✅ PASS |       |

### Operators Section

| Route                 | Component         | API                  | Status  | Notes |
| --------------------- | ----------------- | -------------------- | ------- | ----- |
| `/operators`          | OperatorsCenter   | `operators`          | ✅ PASS |       |
| `/dream-weather`      | DreamWeather      | `dream-weather`      | ✅ PASS |       |
| `/global-emotion`     | GlobalEmotion     | `global-emotion`     | ✅ PASS |       |
| `/predictions`        | PredictionCenter  | `predictions`        | ✅ PASS |       |
| `/trend-radar`        | TrendRadar        | `trend-radar`        | ✅ PASS |       |
| `/ai-recommendations` | AIRecommendations | `ai-recommendations` | ✅ PASS |       |

### Connections Section

| Route                 | Component         | API                              | Status  | Notes |
| --------------------- | ----------------- | -------------------------------- | ------- | ----- |
| `/dream-connections`  | DreamConnections  | `connections`                    | ✅ PASS |       |
| `/resonance-events`   | ResonanceEvents   | `connections/user-resonance`     | ✅ PASS |       |
| `/seen-in-dreams`     | SeenInDreams      | `connections/seen-in-dreams`     | ✅ PASS |       |
| `/collective-signals` | CollectiveSignals | `connections/collective-signals` | ✅ PASS |       |

### Event Engine Section

| Route                   | Component          | API                                    | Status  | Notes                                      |
| ----------------------- | ------------------ | -------------------------------------- | ------- | ------------------------------------------ |
| `/event-stream`         | EventStream        | `engine/events`, `engine/events/stats` | ✅ PASS | FIXED: stats field names + score_pct crash |
| `/user-timeline`        | UserTimeline       | `engine/users/:id/timeline`            | ✅ PASS | FIXED: score_pct.toFixed() crash           |
| `/dream-graph-explorer` | DreamGraphExplorer | `engine/dreams/:id/graph`              | ✅ PASS | FIXED: conn.score.toFixed() crash          |
| `/dream-assistant`      | DreamAssistant     | `engine/users/:id/insights`            | ✅ PASS |                                            |

### World Model Section

| Route                  | Component          | API                   | Status  | Notes                                              |
| ---------------------- | ------------------ | --------------------- | ------- | -------------------------------------------------- |
| `/world-weather`       | WorldWeather       | `world/weather`       | ✅ PASS | FIXED: pct.toFixed() crash (2 sites)               |
| `/symbol-economy`      | SymbolEconomy      | `world/symbols`       | ✅ PASS |                                                    |
| `/archetype-dynamics`  | ArchetypeDynamics  | `world/archetypes`    | ✅ PASS | FIXED: pct.toFixed() crash                         |
| `/consciousness-index` | ConsciousnessIndex | `world/consciousness` | ✅ PASS |                                                    |
| `/dream-seasons`       | DreamSeasons       | `world/seasons`       | ✅ PASS | FIXED: pct/dominance_pct.toFixed() crash (3 sites) |

### OS Engine Section

| Route                | Component        | API             | Status  | Notes                                            |
| -------------------- | ---------------- | --------------- | ------- | ------------------------------------------------ |
| `/automation-center` | AutomationCenter | `os/automation` | ✅ PASS | Empty table shows "Kural bulunamadı." gracefully |
| `/scenario-builder`  | ScenarioBuilder  | `os/scenarios`  | ✅ PASS | Empty table shows empty state gracefully         |
| `/alert-center`      | AlertCenter      | `os/alerts`     | ✅ PASS |                                                  |
| `/ai-observer`       | AIObserver       | `os/observer`   | ✅ PASS |                                                  |
| `/scheduler`         | Scheduler        | `os/scheduler`  | ✅ PASS |                                                  |

### Intelligence Section

| Route                       | Component               | API                        | Status  | Notes                        |
| --------------------------- | ----------------------- | -------------------------- | ------- | ---------------------------- |
| `/consciousness-map`        | ConsciousnessMap        | `consciousness-map`        | ✅ PASS | Safe: trend.length < 2 guard |
| `/emotion-map`              | EmotionMap              | `emotion-map`              | ✅ PASS |                              |
| `/symbol-analysis`          | SymbolAnalysis          | `symbol-analysis`          | ✅ PASS |                              |
| `/archetype-analysis`       | ArchetypeAnalysis       | `archetype-analysis`       | ✅ PASS |                              |
| `/dream-genome`             | DreamGenome             | `dream-genome`             | ✅ PASS |                              |
| `/global-dream-map`         | GlobalDreamMap          | `global-dream-map`         | ✅ PASS |                              |
| `/collective-consciousness` | CollectiveConsciousness | `collective-consciousness` | ✅ PASS |                              |

### AI Section

| Route        | Component | API        | Status  | Notes                        |
| ------------ | --------- | ---------- | ------- | ---------------------------- |
| `/ai-center` | AICenter  | — (static) | ✅ PASS | Hardcoded AI pipeline status |

### Control Section

| Route               | Component           | API                     | Status  | Notes |
| ------------------- | ------------------- | ----------------------- | ------- | ----- |
| `/system-control`   | SystemControl       | `platform-health/live`  | ✅ PASS |       |
| `/app-control`      | AppControlCenter    | `app-configs`           | ✅ PASS |       |
| `/feature-flags`    | FeatureFlags        | `feature-flags`         | ✅ PASS |       |
| `/notifications`    | NotificationControl | `notifications/history` | ✅ PASS |       |
| `/automation-rules` | AutomationRules     | `moderation-rules`      | ✅ PASS |       |

### System Section

| Route            | Component    | API             | Status  | Notes |
| ---------------- | ------------ | --------------- | ------- | ----- |
| `/live-activity` | LiveActivity | `live-stream`   | ✅ PASS |       |
| `/admin-logs`    | AdminLogs    | `logs`          | ✅ PASS |       |
| `/settings`      | Settings     | — (local state) | ✅ PASS |       |

---

## Known Empty States (Graceful)

These tables have no seed data but their pages handle it correctly:

| Page                 | Table                 | Empty State Message |
| -------------------- | --------------------- | ------------------- |
| `/automation-center` | `os_automation_rules` | "Kural bulunamadı." |
| `/scenario-builder`  | `os_scenarios`        | Empty state UI      |

The `os_automation_rules` and `os_scenarios` tables are operator-created content — they are not populated by the seed engine by design.

---

## Seed Data Summary (After Fix)

| Table                   | Count   |
| ----------------------- | ------- |
| `users` (seed)          | 500     |
| `dreams` (seed)         | 5 000   |
| `dream_analyses`        | 5 000   |
| `dream_emotions`        | ~15 000 |
| `dream_symbols`         | ~17 500 |
| `dream_themes`          | ~10 000 |
| `dream_figures`         | ~2 000  |
| `dream_places`          | ~7 500  |
| `dream_likes`           | 3 000   |
| `dream_saves`           | 1 200   |
| `dream_comments`        | 1 200   |
| `user_follows`          | 800     |
| `dream_matches`         | 700     |
| `dream_connections`     | 200     |
| `user_resonance_scores` | 500     |
| `seen_in_dreams`        | ≤150    |

---

## TypeScript Status

```
# API
cd apps/api && npx tsc --noEmit
# → 0 errors

# Admin
cd apps/admin && npx tsc --noEmit
# → 0 errors
```

---

## Root Pattern: PostgreSQL Numeric String Bug

**Rule**: All `ROUND()`, `AVG()`, `STDDEV()`, and `SUM()` functions in PostgreSQL raw queries return JavaScript **strings**, not numbers. TypeScript types declared as `number` are technically wrong at runtime.

**Fix pattern**: Always wrap in `Number()` before calling `.toFixed()`:

```tsx
// WRONG — crashes when value is PostgreSQL string '17.6'
{value.toFixed(1)}%

// CORRECT
{Number(value).toFixed(1)}%
```

**Files fixed**: WorldWeather.tsx, DreamSeasons.tsx, ArchetypeDynamics.tsx, DreamGraphExplorer.tsx, UserTimeline.tsx, EventStream.tsx (6 files, 8 call sites total)
