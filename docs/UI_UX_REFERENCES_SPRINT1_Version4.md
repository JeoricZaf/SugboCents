# SugboCents — Sprint 1 UI/UX & Styling Guide

> Purpose: Give GitHub Copilot clear aesthetic references for Sprint 1 components. We want a modern, clean, student-friendly app, NOT a boring corporate banking app. 

## 1. Overall Aesthetic (The "Vibe")
- **Target Audience:** College students in Cebu (Gen Z).
- **Style Keywords:** Card-based, friendly, colorful, generous whitespace, rounded corners (e.g., `rounded-2xl` or `rounded-3xl` in Tailwind), subtle soft shadows.
- **Color Palette Ideas:** Bright primary accent color (like a vibrant blue, green, or purple) mixed with clean white/light-gray backgrounds for readability. 

## 2. Component References for Sprint 1

### A. Dashboard & Budget Cards (Reference: Monzo / Revolut)
**What to emulate:**
- Use a big, clean **Card-based UI** at the top of the dashboard to display the "Remaining Budget".
- The numbers should be large, bold, and easy to read at a glance.
- Do not use dense spreadsheets or tables. Use soft shadows (`shadow-sm` or `shadow-md`) to make the budget card pop off the background.

### B. Quick-Add & Expense Logging (Reference: Spendee / Wallet by BudgetBakers)
**What to emulate:**
- **Quick-Add Buttons:** Instead of standard text buttons, use a grid of colorful, pill-shaped or circular buttons with emojis or icons (🚌 Jeep, 🍜 Food, 📱 Load). 
- **Transaction List:** The "Recent Expenses" list should look like a modern feed. Left side: category icon/emoji with a light colored background. Middle: Category name and timestamp. Right side: The amount in bold (e.g., `-₱50.00`).

### C. Login & Register Screens (Reference: Cash App / Modern FinTech Onboarding)
**What to emulate:**
- Extreme simplicity. 
- Large, easy-to-tap text inputs with clear borders or subtle gray backgrounds (`bg-gray-100`).
- A single, prominent, full-width "Login" or "Create Account" button at the bottom.
- Plenty of vertical whitespace so it doesn't feel cluttered on a mobile screen.

### D. Mobile Bottom Navigation (Reference: Standard iOS/Android Modern Apps)
**What to emulate:**
- A fixed bottom bar with evenly spaced icons.
- The "Active" tab should be clearly highlighted (e.g., icon changes to a solid color, or a small dot/pill appears behind it).
- Needs to look native to mobile, sitting cleanly above the phone's bottom edge.

## 3. Recommended Prompt Snippets for Copilot
When asking Copilot to build Sprint 1 UI components, use these phrases to get the best results (assuming Tailwind CSS or similar utility classes):

- **For the Dashboard Budget:** *"Generate a React component for the remaining budget card. Use a modern FinTech aesthetic inspired by Monzo: large bold typography for the PHP amount, rounded-2xl corners, and a clean white card on a light gray background."*
- **For Quick-Add Buttons:** *"Create a grid of quick-add expense buttons inspired by Spendee. Use pill-shaped buttons with an emoji on the left and text on the right. Make them look highly tappable with a slight hover/active effect."*
- **For Recent Expenses:** *"Generate a recent transactions list component. Format each row with an icon on the left, title in the middle, and amount on the right. Add a subtle border-bottom between rows, keeping it clean and spacious."*