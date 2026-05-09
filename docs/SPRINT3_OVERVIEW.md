# SugboCents — Sprint 3 Overview

> **Status:** Planning — Sprint 3 starts May 6, 2026
> **Goal:** Layer the full gamification architecture (Infinite Game + Craving Machine + Invisible Scoreboard) on top of the Sprint 2 foundation, then cap the sprint with AI-powered weekly email reports.

---

## Decision Log

### Option A — Sentimos merged into Phase 4 (Firestore)

**Decision made:** May 6, 2026

**Why:** Sentimos (₵) is a spendable currency. A user's balance must survive across devices. Building it as localStorage-only (original Phase 3) would create a real UX bug — log in on a second device and your balance is gone, destroying trust in the currency.

**Resolution:** Sentimos logic (earning, spending, streak freeze) ships together with Firestore in Phase 4. Phase 3 (standalone Sentimos) is removed. There is no Phase 3 in Sprint 3 — the numbering jumps from Phase 2 → Phase 4 to preserve consistency with the original plan doc.

---

## Phase Map

| Phase | Name | Backend? | Depends on |
|---|---|---|---|
| **Phase 1** | Weekly Quests | No — localStorage | Sprint 2 baseline |
| **Phase 2** | Achievement Expansion | No — localStorage | Phase 1 (needs questsCompleted counter) |
| ~~Phase 3~~ | *(Removed — merged into Phase 4)* | — | — |
| **Phase 4** | Sentimos + Friends + Social Leaderboard | **Yes — Firestore** | Phase 2 (earning hooks need quests/missions) |
| **Phase 5** | AI Wrapped Email | **Yes — Resend + Groq** | Can run in parallel with Phase 4 |

---

## File Map (all phases)

| File | Touched in |
|---|---|
| `js/storage.js` | Phases 1, 2, 4, 5 — primary data layer |
| `js/gamification.js` | No changes — reuse celebration modal as-is |
| `js/dashboard.js` | Phases 1, 4 — render layer updates |
| `dashboard.html` | Phase 1 — quest row injection hook |
| `css/style.css` | Phase 4 — Sentimos chip + sheet styles |
| `js/firestore-service.js` | Phase 4 — social graph methods |
| `leaderboard.html` + `js/leaderboard.js` | Phase 4 — new files |
| `profile.html` + `js/profile.js` | Phase 4 — new files |
| `settings.html` + `js/settings.js` | Phase 5 — AI email UI |
| `functions/index.js` | Phase 5 — sendWrappedEmail endpoint |
| `sw.js` | Bump version after every phase |

---

## Psychological Layer Being Built

Each phase adds one layer of the three-mechanism retention architecture (from Gamification transcript series):

| Mechanism | Implemented by |
|---|---|
| **Craving Machine** — unpredictable reward schedule | Phase 1 (quests), Phase 2 (badge proximity effect) |
| **Infinite Game** — no done state, loss aversion | Phase 2 (tiered badges, no ceiling), Phase 4 (streak freeze = loss aversion intensified) |
| **Invisible Scoreboard** — social visibility converts engagement into identity | Phase 4 (friends, leaderboard, public profile) |

> The order matters. The scoreboard only works if the craving machine and infinite game are already solid. Do not build Phase 4 before Phases 1 and 2 are stable.

---

## Verification Checklist (per phase)

- [ ] **Phase 1:** Quest auto-assigns on Monday; progress ticks after each expense log; completion modal fires; quest row appears in Today's Mission card on dashboard
- [ ] **Phase 2:** New badges appear in stats.html badge shelf; `missionsCompleted` and `questsCompleted` counters increment correctly; tiered badge label ("2 of 5") renders
- [ ] **Phase 4:** ₵ chip shows correct Firestore-synced balance; streak freeze consumes on a missed day; friend request round-trip works; leaderboard sorts by streak → missions → quests; `publicProfile` syncs on every XP/streak/sentimos change
- [ ] **Phase 5:** On-demand email arrives with Groq-generated AI insight paragraph; opt-in toggle persists across sessions; rate limit (5/day) blocks repeat sends

---

## Detailed Phase Docs

- [`SPRINT3_PHASE1_WEEKLY_QUESTS.md`](SPRINT3_PHASE1_WEEKLY_QUESTS.md)
- [`SPRINT3_PHASE2_ACHIEVEMENTS.md`](SPRINT3_PHASE2_ACHIEVEMENTS.md)
- [`SPRINT3_PHASE4_SENTIMOS_SOCIAL.md`](SPRINT3_PHASE4_SENTIMOS_SOCIAL.md)
- [`SPRINT3_PHASE5_AI_EMAIL.md`](SPRINT3_PHASE5_AI_EMAIL.md)
