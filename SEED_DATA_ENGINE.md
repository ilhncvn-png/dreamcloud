# DreamCloud Seed Data Engine

Generates realistic Turkish test data so every admin dashboard shows rich, live platform activity.

---

## Quick Start

```bash
cd apps/api

# Run seed (idempotent — safe to run multiple times)
npm run seed:dreamcloud

# Reset all seeded data
npm run seed:reset
```

---

## What Gets Generated

| Table                   | Count   | Notes                                              |
| ----------------------- | ------- | -------------------------------------------------- |
| `users`                 | 500     | Turkish names, unique usernames, verified accounts |
| `user_profiles`         | 500     | Display names, bios, Turkish cities                |
| `user_settings`         | 500     | Default settings per user                          |
| `dreams`                | 5 000   | 4 categories, varied visibility                    |
| `dream_analyses`        | 5 000   | status=completed, Claude model                     |
| `dream_emotions`        | ~15 000 | 2–4 per dream, category-weighted                   |
| `dream_symbols`         | ~17 500 | 2–5 per dream, 50 unique symbols                   |
| `dream_themes`          | ~10 000 | 1–3 per dream, 15 themes                           |
| `dream_figures`         | ~2 000  | 40 % of dreams, 1–2 figures                        |
| `dream_locations`       | ~7 500  | 1–2 per dream, 15 archetypes                       |
| `dream_likes`           | 3 000   | Cross-user, no self-likes                          |
| `dream_saves`           | 1 200   | ~40 % of likes                                     |
| `dream_comments`        | 1 200   | 40 realistic Turkish comments                      |
| `user_follows`          | 800     | Cross-user, no self-follows                        |
| `dream_matches`         | 700     | Canonical UUID ordering, weighted resonance        |
| `dream_connections`     | 200     | Derived from match pairs                           |
| `user_resonance_scores` | 500     | One per seed user                                  |
| `seen_in_dreams`        | ≤150    | Top symbols, archetypes, places                    |

---

## Dream Categories

| Category    | Weight | Emotional Profile             |
| ----------- | ------ | ----------------------------- |
| `normal`    | 30 %   | peace, joy, curiosity         |
| `beautiful` | 30 %   | joy, love, peace, excitement  |
| `nightmare` | 25 %   | fear, anxiety, sadness, anger |
| `lucid`     | 15 %   | curiosity, excitement, joy    |

---

## Data Quality

- **Names**: 40 male + 40 female Turkish first names × 40 last names → unique usernames
- **Dream texts**: 80 unique Turkish narratives (20 per category) — no repeated one-liners
- **Comments**: 40 natural Turkish community responses
- **Dates**: spread across last 180 days (users and dreams)
- **PRNG**: deterministic LCG seeded at `0xDEADBEEF` — same data every run

---

## Identification

All seeded records are marked for safe cleanup:

| Field         | Value                            |
| ------------- | -------------------------------- |
| `users.email` | ends with `@seed.dreamcloud.app` |
| `dreams.tags` | includes `dc-seed-v1`            |

---

## Demo Credentials

Any seed user can log in with:

```
Password: Seed2024!
Email:    <username>@seed.dreamcloud.app
```

---

## Reset

```bash
npm run seed:reset
```

- Deletes all `seen_in_dreams` rows (recomputed patterns)
- Deletes resonance scores and connections for seed users
- Deletes seed users → cascades dreams, likes, comments, follows, matches, analyses

Does **not** touch:

- Real users, admin accounts, or `super_admin`
- Non-seed dreams or platform configuration

---

## Safety Rules

- Disabled in `NODE_ENV=production` (exits with error code 1)
- Idempotent: re-running seed after 500 users exist prints counts and exits
- No `DELETE` on real data — only `INSERT ... ON CONFLICT DO NOTHING`
- Batch inserts of 100 rows keep memory flat during generation

---

## Admin Dashboards Populated

After seeding, these admin pages show live data:

- **Dream Intelligence** — emotion distributions, symbol frequencies, theme analysis
- **World Model** — collective archetypes, seen-in-dreams patterns
- **AI Observer** — mood timelines, trend detection, anomaly detection
- **Symbol Economy** — rising/falling/emerging/consistent symbols
- **Resonance Engine** — dream matches, connection graph, resonance levels
- **Analytics** — user growth, dream activity, engagement metrics
- **Connections** — user resonance scores, connection depth distribution
