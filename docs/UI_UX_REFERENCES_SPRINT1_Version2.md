# SugboCents — Sprint 1 UI/UX & Styling Guide (Vanilla HTML)

> Purpose: Give GitHub Copilot clear aesthetic references for Sprint 1 components. We want a modern, clean, student-friendly app, NOT a boring corporate banking app. 
> **CRITICAL RULE:** Do NOT use React or Node.js. All components must be generated using pure HTML, Tailwind CSS (via CDN), and Vanilla JavaScript.

## 1. Overall Aesthetic (The "Vibe")
- **Target Audience:** College students in Cebu (Gen Z).
- **Style Keywords:** Card-based, friendly, colorful, generous whitespace, rounded corners (e.g., `rounded-2xl` or `rounded-3xl` in Tailwind), subtle soft shadows.
- **Color Palette Ideas:** Bold dark green (not too dark) as a primary accent color, mixed with clean white/light-gray backgrounds for readability. 

## 2. Component References for Sprint 1

### A. Dashboard & Budget Cards (Reference: Monzo / Revolut)
**What to emulate:**
- Use a big, clean **Card-based UI** at the top of the dashboard to display the "Remaining Budget".
- The numbers should be large, bold, and easy to read at a glance.
- Do not use dense spreadsheets or tables. Use soft shadows (`shadow-sm` or `shadow-md`) to make the budget card pop off the background.
- Include a small pencil/edit shortcut on the card that routes to the Settings page.

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
When asking Copilot to build Sprint 1 UI features, use these phrases to get the best results using Vanilla HTML and Tailwind CSS:

- **For the Dashboard Budget:** *"Generate the HTML structure for the remaining budget card using Tailwind CSS. Use a modern FinTech aesthetic inspired by Monzo: large bold typography for the PHP amount, rounded-2xl corners, and a clean white card on a light gray background."*
- **For Quick-Add Buttons:** *"Create the HTML and Vanilla JS for a grid of quick-add expense buttons inspired by Spendee. Use pill-shaped buttons with an emoji on the left and text on the right. Make them look highly tappable with a slight hover/active effect using Tailwind."*
- **For Recent Expenses:** *"Generate the HTML and Vanilla JS function to render a recent transactions list. Format each row with an icon on the left, title in the middle, and amount on the right. Add a subtle border-bottom between rows, keeping it clean and spacious."*