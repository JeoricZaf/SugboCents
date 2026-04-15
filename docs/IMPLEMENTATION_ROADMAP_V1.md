# SugboCents Implementation Roadmap (V1)

Status: In progress (Phase 1 routing slice completed)
Last updated: 2026-04-14

## Goal
Implement the approved routing flow first, then continue with responsive UI, PWA polish, navigation expansion, and Firebase auth migration in controlled phases.

Approved flow:
1. index checks auth state.
2. If logged in, go to dashboard.
3. If not logged in, go to landing.
4. Landing links to login/register.
5. Successful auth goes to dashboard.

## Phase Plan

### Phase 0 - Baseline and docs
- [x] Create roadmap document
- [x] Create UI/UX acceptance document

### Phase 1 - Routing and landing flow
- [x] Add new public landing page
- [x] Update index bootstrap routing to landing/dashboard split
- [x] Add optional return-to-landing links on login/register
- [x] Manual navigation test of Landing -> Login/Register -> Dashboard

### Phase 2 - Landing page polish
- [ ] Add hero, key features, trust section, CTA, footer
- [ ] Add lightweight animations/transitions with reduced-motion support
- [ ] Ensure mobile-first and desktop-ready layout

### Phase 3 - Responsive system updates
- [ ] Add tablet and desktop breakpoints
- [ ] Upgrade dashboard/settings to adaptive layouts
- [ ] Preserve mobile usability and fixed bottom nav behavior

### Phase 4 - PWA completion
- [ ] Ensure manifest is linked on all key pages
- [ ] Add iOS web-app meta tags and touch icon
- [ ] Validate service worker behavior and cache versioning

### Phase 5 - 5-tab bottom navigation
- [ ] Expand nav to Dashboard, Activity, Stats, Tigom, Settings
- [ ] Add placeholder pages for Activity, Stats, Tigom
- [ ] Ensure clear icon+label active state and mobile fit

### Phase 6 - Firebase auth and profile
- [ ] Integrate Firebase Auth (email/password)
- [ ] Add required registration fields: first name, last name, email, password
- [ ] Store username in profile document for personalization
- [ ] Keep no-migration policy for old localStorage accounts

### Phase 7 - Auth UI refinement
- [ ] Keep form minimal and large-input fintech style
- [ ] Full-width primary CTA and inline validation
- [ ] Mobile and desktop QA pass

### Phase 8 - Icon/symbol reliability
- [ ] Fix broken symbols/mojibake issues
- [ ] Standardize icon strategy for consistency

### Phase 9 - React/Node migration readiness
- [ ] Strengthen service boundaries for easier future migration
- [ ] Keep page controllers decoupled from data providers

### Phase 10 - Regression and release checks
- [ ] Route protection and session tests
- [ ] Responsive and navigation tests
- [ ] PWA install and offline shell tests

## Constraints
- Keep within current project scope and avoid non-approved feature expansion.
- Keep implementation incremental to reduce debugging risk.
- Preserve existing dark-green brand direction while improving polish.
- Keep architecture migration-friendly for future React/Node transition.
