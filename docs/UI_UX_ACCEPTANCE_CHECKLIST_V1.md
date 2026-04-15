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

## 8) Scope Guardrails
- [ ] Placeholder pages stay placeholder-only for now
- [ ] No Sprint 2/3 logic is implemented prematurely
- [ ] Changes remain modular for future React/Node migration
