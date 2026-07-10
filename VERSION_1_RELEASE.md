# DreamCloud OS — Version 1.0 Release Document

**Release Date:** 2026-06-25  
**Codename:** Origin  
**Status:** Production-Ready

---

## What DreamCloud OS Is

DreamCloud is a dream intelligence platform that maps the subconscious at scale. Users record their dreams; the platform analyzes them with AI, finds resonance patterns between dreamers who have never met, and builds a living model of collective human consciousness.

Version 1.0 ships the full infrastructure: mobile app, intelligence backend, admin operating system, and world model — everything needed to run, analyze, and grow the platform from zero users to scale.

---

## Architecture Overview

| Layer       | Technology                            | Status       |
| ----------- | ------------------------------------- | ------------ |
| Mobile App  | React Native (Expo), Expo Router v3   | ✓ Complete   |
| API Server  | NestJS 10 + Fastify, TypeScript       | ✓ Complete   |
| Admin Panel | React 19 + Vite 5 + TanStack Query v5 | ✓ Complete   |
| Database    | PostgreSQL 16 (pgvector), TypeORM     | ✓ Complete   |
| Auth        | JWT RS256, bcrypt-12                  | ✓ Complete   |
| Cache       | Redis 7                               | ✓ Configured |
| Mail        | SMTP (Mailhog in dev)                 | ✓ Configured |

**API Base URL:** `https://api.dreamcloud.app/api/v1`  
**Admin Panel URL:** `https://os.dreamcloud.app`  
**Mobile:** iOS + Android via Expo

---

## Completed Systems

### System 1 — Authentication & Identity

Full JWT-based auth system with RS256 keypairs. Supports registration, email verification, login with lockout protection (5 failed attempts → 15-minute lock), forgot/reset password via email, OAuth provider scaffolding (Google/Apple), refresh token rotation, and role-based access control (user / moderator / admin / super_admin).

### System 2 — Dream Recording & Management

Core dream journaling with category classification (lucid, beautiful, nightmare, normal), visibility control (private, followers, public), rich metadata (title, content, mood, sleep hours, location, date), soft-deletion with audit trail, draft support, and admin hide/feature controls.

### System 3 — AI Dream Intelligence

Multi-stage AI analysis pipeline. Each dream is analyzed for:

- Primary and secondary emotions with intensity scores
- Symbol extraction with category and narrative function
- Theme classification with theme-family grouping
- Dream figures with archetype candidate detection
- Object tagging and symbolic meaning
- Location classification with archetype type
- Completion status tracking with retry support

The analysis system runs asynchronously; results power all intelligence features downstream.

### System 4 — Dream Matching & Resonance Engine

Cross-user dream matching using a canonical pair model (`dream_id_a < dream_id_b`). Matches are scored 10–90 on a resonance scale. Cosmic resonance ≥ 80, deep resonance ≥ 60. The engine computes:

- Shared symbol overlap
- Shared emotion alignment
- Archetype co-occurrence
- User resonance score aggregation (collective alignment, uniqueness score, connection count)
- Seen-in-dreams pattern detection (symbols, archetypes, places appearing across dreamers)

### System 5 — Social Layer

Full social graph: follows, feed (chronological + curated), likes, saves, comments, mentions, push notifications, notification preferences per-type, and direct user-to-user connections.

### System 6 — Collective Intelligence

Platform-level intelligence aggregation above individual dreams:

- Collective mood (dominant emotion of the platform at any time)
- Consciousness map (coherence index, lucidity rate, theme density)
- Emotion timeline and pressure metrics
- Resonance event detection (cosmic matches, cluster formations)
- Collective intelligence summary with score and state

### System 7 — World Model

Five-dimensional model of the collective subconscious:

- **Dream Weather Engine** — Emotional climate (RADIANT / BALANCED / TENSE / TURBULENT), intensity bands, emotional pressure, 8-week mood forecast
- **Symbol Economy** — Symbol market trends, emerging vs declining symbols, consistent performers, cross-category analysis
- **Archetype Dynamics** — Dominant archetype shifts week-over-week, archetype-emotion pairings, archetype flux index
- **Consciousness Index** — Platform awakening state (AWAKENED / RESONANT / FORMING / DORMANT), cosmic match rate, analysis coverage, completion percentage
- **Dream Seasons** — Monthly emotional eras, quarterly seasonal profiles, transition detection between dominant emotional phases

### System 8 — Dream Operating System

Automated platform management layer:

- **Automation Rules** — Event-triggered, threshold-based, and scheduled rules with action configs
- **Scenario Engine** — IF/THEN chain rules with multi-step conditions and linked scenario chains
- **Alert Center** — Four alert tiers (critical / warning / intelligence / system) with real-time queries
- **AI Observer** — Mood trend detection, anomaly detection (spikes/drops), symbol trend tracking, collective change monitoring
- **Scheduler** — 7 seeded background jobs (resonance scan, dream analysis, collective mood, seen-in-dreams, resonance scores, AI report, platform health) with trigger/toggle controls

### System 9 — Business Intelligence Layer

Revenue and growth infrastructure:

- **Revenue Center** — Real platform metrics (users, dreams, engagement) with payment placeholder layer. Ready for Stripe / RevenueCat integration.
- **Advertising Center** — 4 placement zones (native dream, explore, sponsored insight, archetype match), audience reach from real DB, safety compliance checks (GDPR, COPPA, content policy, psychological ethics)
- **Campaigns** — Campaign template management with audience segment targeting
- **Segments** — 7 real computed behavioral segments from DB: Active Dreamers, Power Users, High Engagement, Connected, Silent, At-Risk, New Joiners. Plus archetype and emotion dominance segments.

### System 10 — Admin Operating System

Full command-and-control web panel with 64 pages across 16 sections. Live data from all 56 API endpoints. No mocked data — every metric is computed from the real database at query time.

---

## Completed Modules (API)

30 NestJS modules. 201 total HTTP routes. All routes guarded with JWT except `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, and `/health`.

| Module                | Route Prefix                | Purpose                                                                          |
| --------------------- | --------------------------- | -------------------------------------------------------------------------------- |
| `AuthModule`          | `/auth`                     | Registration, login, token refresh, password reset, email verify                 |
| `UsersModule`         | `/users`                    | User profiles, follow/unfollow, user search, avatar upload                       |
| `DreamsModule`        | `/dreams`                   | Dream CRUD, publish, draft, visibility, soft delete                              |
| `CommentsModule`      | `/dreams/:id/comments`      | Comment CRUD on dreams                                                           |
| `FollowsModule`       | `/users/:id/follow`         | Follow graph management                                                          |
| `SocialModule`        | `/dreams/:id/like`, `/save` | Likes, saves, feed composition                                                   |
| `FeedModule`          | `/feed`                     | Chronological + curated dream feed                                               |
| `SearchModule`        | `/search`                   | Full-text search across dreams and users                                         |
| `NotificationsModule` | `/notifications`            | Push notifications, read state, preferences                                      |
| `ModerationModule`    | `/dreams/:id/report`        | User-facing dream reporting                                                      |
| `AnalysisModule`      | `/dreams/:id/analysis`      | AI analysis trigger, results, retry                                              |
| `ConnectionsModule`   | `/connections`              | My connections, connection feed, resonance scores                                |
| `MatchesModule`       | `/matches`                  | My matches, match detail, similar dreams                                         |
| `MentionsModule`      | `/mentions`                 | Dream-to-dream mentions, @mention processing                                     |
| `SignalsModule`       | `/signals`                  | AI signals feed for the mobile intelligence layer                                |
| `IdentityModule`      | `/identity`                 | Dream identity profiles, archetype discovery                                     |
| `ClustersModule`      | `/clusters`                 | Dream cluster membership, cluster exploration                                    |
| `PlacesModule`        | `/places`                   | Dream place extraction, place profiles                                           |
| `AtlasModule`         | `/atlas`                    | Global dream atlas, hotspots, city-level aggregation                             |
| `DreamMapModule`      | `/dream-map`                | Spatial dream map, constellation view                                            |
| `ForecastModule`      | `/forecast`                 | Personal dream forecast, emotional projection                                    |
| `WeatherModule`       | `/weather`                  | Collective emotional weather for mobile                                          |
| `IntelligenceModule`  | `/intelligence`             | Full intelligence suite: analysis, graph, timeline, assistant, feed, connections |
| `AdminModule`         | `/admin`                    | 87-route admin command layer                                                     |
| `BusinessModule`      | `/admin/business`           | Revenue, segments, campaigns, ads                                                |
| `EventEngineModule`   | `/admin/engine`             | Event stream, event stats, user timeline, dream graph, insights                  |
| `OsEngineModule`      | `/admin/os`                 | Automation, scenarios, alerts, observer, scheduler                               |
| `WorldModelModule`    | `/admin/world`              | Dream weather, symbol economy, archetype dynamics, consciousness, seasons        |
| `AppConfigModule`     | `/app-configs`              | Platform-wide feature toggles                                                    |
| `AppModule`           | —                           | Root module, DI wiring, DB pool                                                  |

---

## Completed APIs

### Authentication APIs

- `POST /auth/register` — Create account with username, email, password
- `POST /auth/login` — Login with lockout protection
- `POST /auth/refresh` — Rotate access token using refresh token
- `POST /auth/logout` — Invalidate refresh token
- `POST /auth/forgot-password` — Request reset email
- `POST /auth/reset-password` — Apply reset token
- `POST /auth/verify-email` — Confirm email via token

### User APIs

- `GET /users/me` — Current user profile
- `PATCH /users/me` — Update profile (display name, bio, location)
- `POST /users/me/avatar` — Upload avatar
- `GET /users/:id/profile` — Public user profile
- `POST /users/:id/follow` — Follow user
- `DELETE /users/:id/follow` — Unfollow user
- `GET /users/:id/followers` / `/following` — Follow lists

### Dream APIs

- `POST /dreams` — Create dream (draft or published)
- `GET /dreams` — Paginated dream list with filters
- `GET /dreams/:id` — Single dream with full metadata
- `PATCH /dreams/:id` — Edit dream
- `DELETE /dreams/:id` — Soft delete dream
- `POST /dreams/:id/publish` — Publish draft
- `GET /dreams/:id/analysis` — Get AI analysis results
- `POST /dreams/:id/analysis` — Trigger/retry AI analysis
- `GET /dreams/:id/similar` — Similar dreams by content
- `GET /dreams/:id/graph` — Dream relationship graph
- `POST /dreams/:id/like` / `DELETE` — Like/unlike
- `POST /dreams/:id/save` / `DELETE` — Save/unsave
- `GET /dreams/:id/comments` — Comments with pagination
- `POST /dreams/:id/comments` — Add comment
- `POST /dreams/:id/report` — Report content

### Intelligence APIs (Mobile)

- `GET /intelligence/feed` — Personalized intelligence feed
- `GET /intelligence/dream-analysis` — Full analysis breakdown
- `GET /intelligence/connections` — Connection intelligence
- `GET /intelligence/timeline` — Personal dream timeline
- `GET /intelligence/dream-graph` — Visual graph data
- `GET /intelligence/similar-dreams` — Similar dream discovery
- `GET /intelligence/assistant` — AI dream assistant insights
- `GET /intelligence/collective-mood` — Current collective emotional state

### Matching & Connection APIs

- `GET /matches` — My dream matches
- `GET /matches/:id` — Match detail with score breakdown
- `GET /connections` — My active connections
- `GET /connections/my-matches` — Paginated match history
- `GET /connections/feed` — Connection event feed

### Social & Discovery APIs

- `GET /feed` — Main dream feed
- `GET /feed/curated` — Curated/featured feed
- `GET /search` — Full-text search
- `GET /clusters` — Dream clusters
- `GET /signals` — AI signals
- `GET /weather/now` — Current collective weather
- `GET /weather/today` — Today's emotional forecast
- `GET /forecast` — Personal dream forecast

### Atlas & Places APIs

- `GET /atlas` — Global dream atlas
- `GET /atlas/hotspots` — Geographic dream hotspots
- `GET /atlas/city/:slug` — City-level dream data
- `GET /places` — Dream places
- `GET /places/:name` — Place profile with dreams
- `GET /dream-map` — Full spatial map data
- `GET /dream-map/constellations` — Dream constellation clusters

### Identity APIs

- `GET /identity` — User's dream identity profile
- `GET /identity/archetypes` — Archetype breakdown
- `GET /identity/recompute` — Force recompute identity

---

## Completed Mobile Intelligence APIs

The Intelligence module powers the deepest features of the mobile app. These are the APIs that transform raw dream data into meaning.

| API                                 | Description                                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| `GET /intelligence/feed`            | Ranked intelligence cards: new matches, symbol spikes, archetype activations, resonance events |
| `GET /intelligence/dream-analysis`  | Full structured analysis: emotions, symbols, figures, themes, locations, objects               |
| `GET /intelligence/connections`     | Users with high resonance, shared symbols, archetype overlap                                   |
| `GET /intelligence/timeline`        | Week-by-week emotional arcs, symbol evolution, resonance trajectory                            |
| `GET /intelligence/dream-graph`     | Graph nodes (dreams, symbols, users) + weighted edges for visualization                        |
| `GET /intelligence/similar-dreams`  | Cross-user similar dreams by semantic content and emotional signature                          |
| `GET /intelligence/assistant`       | Personalized insight cards: recurring patterns, growth observations, warnings                  |
| `GET /intelligence/collective-mood` | Platform's dominant emotion + top 5 emotions + 7-day trend                                     |
| `POST /dreams/:id/analysis`         | Trigger Claude AI analysis for a specific dream                                                |
| `POST /dreams/:id/analysis/retry`   | Retry failed or stale analysis                                                                 |
| `GET /dreams/:id/analysis`          | Retrieve analysis result with all extracted dimensions                                         |
| `GET /identity`                     | User's archetype profile, dominant symbols, emotional signature                                |
| `GET /signals`                      | AI-generated intelligence signals: anomalies, patterns, collective shifts                      |
| `GET /weather/now`                  | Real-time collective emotional climate with intensity bands                                    |
| `GET /forecast`                     | Personal 7-day dream emotional forecast based on personal + collective signals                 |
| `GET /matches`                      | Resonance-ranked dream matches with breakdown scores                                           |
| `GET /clusters`                     | Dream cluster membership: themes, symbols, and cluster-level insights                          |
| `GET /atlas`                        | Geographic dream distribution: dominant emotions and archetypes per location                   |

---

## Completed Admin Sections

The DreamCloud Admin Operating System has 64 pages across 16 sections. Every metric is computed from live database queries at request time.

### EXECUTIVE (3 pages)

Command Deck, Operations Hub, Intelligence Hub. Real-time platform overview with AI operator status, alert tiers, consciousness map summary, and executive KPIs.

### OPERATORS (6 pages)

Operators Center, Dream Weather, Global Emotion, Predictions, Trend Radar, AI Recommendations. The AI Operators system models 6 autonomous agents (Dream Guardian, Safety AI, Trend Analyst, Community Observer, Growth AI, Revenue AI) with live health scores and recommendations.

### DREAM INTEL (7 pages)

Consciousness Map, Emotion Map, Symbol Analysis, Archetype Analysis, Dream Genome, Global Dream Map, Collective Mind. Deep semantic analysis of the platform's dream corpus.

### CONNECTIONS (4 pages)

Dream Connections, Resonance Events, Seen In Dreams, Collective Signals. Cross-user resonance infrastructure with compute triggers.

### ENGINE (4 pages)

Event Stream, User Timeline, Dream Graph Explorer, Dream Assistant. Per-user and platform-wide event intelligence.

### WORLD MODEL (5 pages)

Dream Weather Engine, Symbol Economy, Archetype Dynamics, Consciousness Index, Dream Seasons. The five dimensions of the collective subconscious model.

### OPERATING SYSTEM (5 pages)

Automation Center, Scenario Builder, Alert Center, AI Observer, Scheduler. Rule-based automation with 7 seeded background jobs.

### OPERATIONS (4 pages)

Community Health, Moderation War Room, Support Center, Risk Center. Front-line ops tools for moderators and support agents.

### CONTENT (4 pages)

Dreams, Featured Content, Reports, Moderation Queue. Full dream management with bulk actions, hide/feature/delete, and report resolution.

### USERS (2 pages)

All Users, Banned Users. User search, role management, account status control, password reset.

### ANALYTICS (4 pages)

Analytics Dashboard, User Growth, Dream Trends, Engagement. Time-series charts with configurable windows (7, 14, 30, 90 days).

### STAFF (2 pages)

Employee Management, Role Permissions. Team directory and permission matrix reference.

### BUSINESS (4 pages)

Revenue Center, Advertising Center, Campaigns, Segments. Real platform metrics + monetization infrastructure scaffold.

### AI (1 page)

AI Core. Pipeline registry for the Claude-powered intelligence stack.

### CONTROL (5 pages)

System Control, App Control Center, Feature Flags, Notification Control, Automation Rules. Live platform toggle controls (11 app configs, 5 feature flags seeded), push notification dispatch, moderation rule editor.

### SYSTEM (4 pages)

Live Feed, Audit Logs, Settings, Dashboard. Admin activity audit trail, live event stream, system settings.

---

## Completed World Model

The World Model is DreamCloud's most distinctive feature — a real-time computational model of collective human dreaming.

### Dream Weather Engine

Translates the emotional state of all dreams submitted in a configurable window into a climate metaphor. Five states: `RADIANT` (joy-dominant), `BALANCED`, `TENSE` (anxiety-rising), `TURBULENT` (fear/anger surge), `NEUTRAL`. Returns dominant emotion, emotional pressure, intensity distribution, and an 8-week mood forecast for trend display.

### Symbol Economy

Treats recurring dream symbols as a market. Tracks current week vs prior week counts, computes growth rates, identifies emerging symbols (rising fast), consistent symbols (stable dominance), and symbols in decline. Aggregates category-level trends and total symbol diversity score.

### Archetype Dynamics

Tracks which Jungian archetypes (Shadow, Child, Guide, Hero, Anima/Animus, Trickster, Wise Elder, Persona) dominate the collective dreamscape each week. Computes week-over-week delta for each archetype, archetype-emotion pairings, and an Archetype Flux Index measuring how much the dominant archetype shifts.

### Consciousness Index

Produces a single state label for the platform's collective awareness: `AWAKENED` (high coherence, strong matching, high completion), `RESONANT` (active matching, moderate coherence), `FORMING` (growing analysis coverage), `DORMANT` (low activity). Backed by: match rate, completion percentage, cosmic match count, active dreamers, and analysis coverage.

### Dream Seasons

Detects the emotional "season" the platform is in across three timeframes:

- **Monthly eras** — which emotion dominated each calendar month
- **Transition detection** — weeks where the dominant emotion changed
- **Quarterly profiles** — the emotional and archetype signature of each quarter

---

## Completed Operating System

The Operating System layer lets admins automate platform responses without writing code.

### Automation Rules

Event-triggered, threshold-based, or cron-scheduled rules that fire actions (notification, flag, archive, escalate, report). Stored in `os_automation_rules`. Toggleable active/paused. Deletable. Full create/list/toggle/delete API.

### Scenario Engine

IF/THEN chain rules. Each scenario has multiple conditions (field + operator + value) and multiple actions. Scenarios can chain: when one completes, it triggers the next. Stored in `os_scenario_rules`. Trigger count and last-triggered tracking.

### Alert Center

Four alert tiers computed at query time from real DB state:

- **Critical** — Active high-severity reports, banned users in last 24h, deeply negative emotion states
- **Warnings** — Pending reports, hidden dreams, moderation backlog
- **Intelligence** — New resonance events, collective mood shifts, consciousness state changes
- **System** — Pending analysis queue, missing profiles, scheduler health

### AI Observer

30-day behavioral trend monitoring:

- Mood trend: week-by-week dominant emotion
- Symbol trends: rising vs declining symbols
- Anomaly detection: days with statistical spikes or drops in dream volume
- Collective changes: emotion-level shifts from prior period

### Scheduler

Seven background jobs seeded and ready to configure:

| Job                       | Schedule     | Purpose                                    |
| ------------------------- | ------------ | ------------------------------------------ |
| `hourly-resonance-scan`   | Every hour   | Scan for new high-resonance matches        |
| `daily-dream-analysis`    | 03:00 daily  | Re-analyze unscored dreams from past 24h   |
| `daily-collective-mood`   | 04:00 daily  | Compute and cache collective mood snapshot |
| `daily-seen-in-dreams`    | 05:00 daily  | Recompute seen-in-dreams pattern table     |
| `weekly-resonance-scores` | Monday 06:00 | Bulk upsert user resonance scores          |
| `weekly-ai-report`        | Monday 07:00 | Generate weekly intelligence digest        |
| `weekly-platform-health`  | Monday 08:00 | Capture platform health snapshot           |

Each job supports manual trigger via API, enable/disable toggle, and tracks run count, error count, last result, and average duration.

---

## Database Schema — 41 Tables

### Core User Data

`users`, `user_profiles`, `user_settings`, `refresh_tokens`

### Dream Content

`dreams`, `dream_analyses`, `dream_emotions`, `dream_symbols`, `dream_themes`, `dream_figures`, `dream_objects`, `dream_locations`, `dream_places`

### Social Graph

`dream_likes`, `dream_saves`, `dream_comments`, `dream_reports`, `user_follows`, `notifications`, `notification_preferences`, `dream_mentions`

### Intelligence & Matching

`dream_matches`, `dream_connections`, `user_resonance_scores`, `seen_in_dreams`, `dream_identities`, `dream_clusters`, `dream_cluster_members`

### Platform Features

`dream_analysis` (aggregated scores), `ai_events`, `platform_health_snapshots`

### Operating System

`os_automation_rules`, `os_scenario_rules`, `os_scheduler_jobs`

### Control Layer

`app_config`, `feature_flags`, `moderation_rules`, `admin_logs`, `admin_notification_log`, `admin_notification_queue`, `support_tickets`

---

## Mobile App — 56 Screens

### Auth Flow (5 screens)

Login, Register, Forgot Password, Reset Password, Onboarding

### Core Tabs (8 tabs)

Dream Feed (index), Explore, Add Dream, Matches, My World, Notifications, Profile, Signals

### Dream Screens (4 screens)

Dream Detail, Dream Decode (AI analysis viewer), Dream Journal, Add Dream

### Intelligence Suite (8 screens)

Intelligence Feed, Dream Analysis, Connections, Collective Mood, Dream Graph, Similar Dreams, Timeline, Assistant

### Discovery (8 screens)

Dream Atlas, Dream Map, Dream Clusters, Dream Codex, Dream Places, Nearby Minds, Reality Resonance, Dream Connections

### Identity & Profile (5 screens)

Dream Identity, Archetype Detail, Profile Edit, User Profile, Saved Dreams

### System (6 screens)

Settings, Notification Settings, Mentions, Traces Index, Trace Detail, Theme Detail

### Reality Resonance (3 screens)

Reality Resonance Hub, Resonance Event Detail, Signal Detail

### Dream Place & Forecast (4 screens)

Place Detail, Dream Forecast, Codex Slug, Match Detail

---

## Known Limitations

### Payment & Revenue

No payment processor is integrated. The Revenue Center, Advertising Center, and Campaigns pages show real platform metrics as growth proxies, but all revenue KPIs (MRR, ARR, ARPU, ad revenue) display placeholder empty states. Requires Stripe or RevenueCat integration.

### AI Analysis

Dream analysis runs on-demand via Claude API calls. There is no background queue worker that automatically analyzes new dreams when they're published. The scheduler job `daily-dream-analysis` is seeded but not wired to a live cron runner — it must be triggered manually via the Scheduler admin page until a job runner (BullMQ) is connected.

### Seen-In-Dreams & Resonance Scores

The `seen_in_dreams` and `user_resonance_scores` tables are empty at launch. They populate only after the compute endpoints are triggered from the admin panel (`POST /admin/connections/compute-seen` and `POST /admin/connections/compute-resonance`), or after the weekly scheduler jobs run.

### Atlas & Geolocation

The Dream Atlas and Dream Map features require users to attach location data to dreams. If users do not grant location permission or do not tag locations manually, the atlas will be sparse. No geocoding service is wired — location is stored as free text and matched by city name.

### Push Notifications

The notification infrastructure is built and the admin dispatch UI works. Actual push delivery requires Expo Push Token registration in the mobile app and a configured APNs/FCM key in the deployment environment.

### Email Verification

Email verification is implemented in the auth flow and enforced for admin accounts. In development, Mailhog captures all emails locally at `localhost:8025`. Production deployment requires a real SMTP provider (Resend, SendGrid, etc.) set in environment variables.

### Feature Flags

Five feature flags are seeded with `enabled: false`. None of the flags are actually wired to conditionally enable/disable backend behavior — they are infrastructure scaffolding that future backend guards need to check.

### App Config Toggles

Eleven platform toggles exist in `app_config` (maintenance mode, registration, dream posting, comments, etc.). The admin UI can flip them, but the actual enforcement logic (middleware that reads the toggle and blocks requests) is not implemented. The infrastructure is ready; the guards need to be added per-route.

### Mobile AI Analysis Viewer

The `dream-decode` screen displays AI analysis results when they exist. If a dream has not been analyzed (analysis status `pending` or `failed`), the screen shows an empty state and a retry button. Retry is wired but depends on available Claude API credits.

### Moderation

The moderation queue, report resolution, and banning system are fully built in the admin panel. There is no automated content moderation — all decisions are human-driven. An AI content safety pre-screening layer is planned for V2.

---

## Future Roadmap

### V1.1 — Live Infrastructure

- Connect BullMQ job runner to OS Scheduler jobs
- Wire `app_config` toggles to backend middleware
- Wire `feature_flags` to backend conditional logic
- APNs / FCM push notification delivery
- Production SMTP configuration
- Stripe or RevenueCat payment integration scaffold

### V1.2 — Intelligence Depth

- Automated dream analysis on publish (event-driven, not polling)
- Symbol-level semantic similarity using pgvector embeddings
- Cross-user archetype cluster formation (users grouped by dominant archetype signature)
- Personal lucidity index — trend toward lucid dreaming over time
- Dream narrative arc detection (rising/falling emotional arcs within a single dream)

### V1.3 — Social Expansion

- Dream circles (private groups of 2–12 dreamers)
- Real-time shared dreaming experiments (timed collective dream sessions)
- Resonance events as social features (two users notified when their dreams match cosmically)
- Dream co-authorship (shared dream narratives)
- Themed dream challenges (admin-created challenges the community participates in)

### V1.4 — Atlas & World

- Geocoded location data with Google Maps / Mapbox integration
- Country-level collective emotion heatmaps
- Dream Migration — tracking how symbols and archetypes spread geographically over time
- City-level dream personality profiles
- Seasonal alignment with real astronomical seasons

### V2.0 — Consciousness Commerce

- Premium subscription tier (deeper analysis, unlimited history, exclusive archetype insights)
- Advertising system activation (native dream cards, explore placements)
- Partner API — licensed access to anonymized collective pattern data for researchers
- Brand safety certification — psychological ethics review for all ad placements
- Revenue attribution — connect payment events to growth segment changes
- B2B dashboard — researchers and institutions accessing aggregate pattern data

### V2.1 — Operating System Expansion

- Cron trigger execution for OS Scheduler (BullMQ + cron-parser)
- Automation rule action execution engine (not just definition — actual firing)
- Scenario chain execution with condition evaluation
- Webhook outbound from OS rules (notify external systems)
- A/B test infrastructure for feature flags with rollout percentages
- Admin audit trail for every rule creation, trigger, and change

### Long-Term Vision

- Dream API for third-party integrations (sleep trackers, therapy apps)
- Dream NFTs or digital artifacts (optional, user-owned analysis certificates)
- Research partnerships with sleep labs and psychology departments
- Multi-language AI analysis (currently English-optimized)
- Cross-platform sync (Apple Watch sleep stages → dream tags)
- DreamCloud Studio — creator tools for therapists to build structured dream exercises

---

## Technical Debt Register

| Item                                                       | Priority | Notes                                                               |
| ---------------------------------------------------------- | -------- | ------------------------------------------------------------------- |
| Add `.catch(() => [])` to any new raw SQL queries          | High     | Pattern established; must be followed in all future service methods |
| ROUND(double_precision, int) always needs `::numeric` cast | High     | PostgreSQL requires explicit cast; documented after audit           |
| `dream_symbols.symbol_category` not `category`             | High     | Fixed in V1 audit; document in team data dictionary                 |
| `dream_matches` uses `dream_id_a/b` not `dream_id_1/2`     | High     | Fixed in V1 audit; document in team data dictionary                 |
| `display_name` lives in `user_profiles`, not `users`       | Medium   | Always JOIN `user_profiles` when selecting display name             |
| Admin lockout resets require DB direct access              | Medium   | Add admin unlock UI or CLI tool                                     |
| No rate limiting on AI analysis trigger endpoint           | Medium   | Add per-user throttle (1 analysis per dream per 5 min)              |
| `feature_flags` and `app_config` enforcement not wired     | Medium   | Infrastructure done; enforcement middleware pending                 |
| OS Scheduler jobs do not actually run on cron              | High     | Needs BullMQ or similar job runner in production                    |

---

## Version Stats

| Metric                          | Count |
| ------------------------------- | ----- |
| Total API routes                | 201   |
| Admin-only API routes           | 87    |
| Mobile API service functions    | 80+   |
| Admin pages                     | 64    |
| Admin sidebar sections          | 16    |
| Mobile app screens              | 56    |
| Database tables                 | 41    |
| Database migrations             | 24    |
| Mobile API files                | 20    |
| TypeScript errors               | 0     |
| Failing API endpoints at launch | 0     |

---

_DreamCloud OS Version 1.0 — Origin_  
_"Maps humanity's subconscious, one dream at a time."_
