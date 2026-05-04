# SugboCents UI/UX Acceptance Checklist (V1)

Status: Active checklist
Last updated: 2026-04-14

## 1) Routing and IA Acceptance
- [ ] index routes authenticated users to dashboard
- [ ] index routes unauthenticated users to landing
- [ ] landing has clear login and signup CTAs
- [ ] login/register success redirects to dashboard
- [ ] no dead links between landing, auth, and dashboard

## 2) Landing Page Acceptance
- [ ] Purpose is clear within first viewport
- [ ] Includes what app is for, who it helps, and key value points
- [ ] Has at least one primary CTA and one secondary CTA
- [ ] Animations/transitions are subtle and purposeful
- [ ] Reduced-motion behavior is supported
- [ ] Layout works on mobile and laptop

## 3) Auth Page Acceptance
- [ ] Login requires only email and password
- [ ] Register requires first name, last name, email, password
- [ ] Inputs are large and easy to scan/tap
- [ ] Primary button is full-width and visually dominant
- [ ] Inline validation messages are clear and minimal

## 4) Responsive Acceptance
- [ ] Mobile layout (<=480px) is readable and touch-friendly
- [ ] Tablet layout (768px) scales spacing and components correctly
- [ ] Laptop layout (>=1024px) uses adaptive composition effectively
- [ ] No clipped content or overlap with fixed nav

## 5) Mobile Navigation Acceptance
- [ ] Bottom nav follows familiar icon+label pattern
- [ ] Active tab is always clear
- [ ] 5 tabs stay usable on narrow devices
- [ ] If scrollable nav is used, active item remains discoverable

## 6) PWA Acceptance
- [ ] Manifest link exists on all main pages
- [ ] Service worker registers successfully
- [ ] App is installable on supported browsers
- [ ] App shell loads when offline after initial load

## 7) Visual Consistency Acceptance
- [ ] Brand green accent is preserved and balanced
- [ ] Broken symbols/icons are removed or fixed
- [ ] Card, button, and input styles are consistent
- [ ] Typography hierarchy is clear and stable

## 8) Gamification Visual Acceptance
- [ ] Level name is the largest text on the dashboard (2rem, Sora weight-800) — not eyebrow text or a subtitle
- [ ] Level name is the first element in the hero section, not preceded by a greeting h1
- [ ] Streak is displayed as a badge element (minimum 56×56px) — not an inline chip
- [ ] Streak badge color reflects streak length: 0 = outlined green, 1–6 = amber, 7–13 = orange, 14–29 = orange + glow ring, 30+ = crimson + pulse
- [ ] XP bar is minimum 14px tall with a gradient fill and ease-out animation on change
- [ ] XP bar right label shows "N XP to next level" with a specific number — never "→ Next level" alone
- [ ] Budget card background shifts color at 65% spend (amber) and 90% spend (dark red)
- [ ] Badge grid uses grid layout — earned = full color, target = glow ring + pulse, locked = greyscale + lock icon overlay
- [ ] No emoji in structural UI chrome — Material Icons or Bootstrap Icons only (Quick Add shortcut labels are the only exception)
- [ ] "Log a one-time expense" entry point exists in the Action Zone, separate from Quick Add shortcuts
- [ ] Inline stats section on dashboard shows top spending categories with mini-bars (not just a link to the stats page)
- [ ] All gamification state changes have CSS transitions or animations (XP bar, budget bar, streak badge)
- [ ] Level-up uses `showCelebrationModal` full-screen — never downgraded to a toast or banner
- [ ] Empty state for new user (0 XP, 0 streak) reads as invitation, not deficit

## 9) Scope Guardrails
- [ ] Placeholder pages stay placeholder-only for now
- [ ] No Sprint 3 backend features implemented prematurely
- [ ] Changes remain in vanilla HTML/CSS/JS — no framework migration
