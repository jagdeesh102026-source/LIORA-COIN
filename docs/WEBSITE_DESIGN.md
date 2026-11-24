# Liora Coin (LIORA COIN) — Visual Design System & Brand Guidelines

## 1. Visual Identity & Brand Direction

- **Brand Name**: LIORA COIN (`Liora Coin`)
- **Official Tagline**: *"POWERING THE NEXT DIGITAL ERA"*
- **Official Logo Assets**: `/assets/liora-logo-original.png`, `/assets/liora-logo.png`, `/assets/liora-logo-512.png`, `/assets/liora-logo-128.png`, `/favicon.ico`, `/favicon.png`, `/apple-touch-icon.png`
- **Aesthetic**: Futuristic, premium technological, warm gold emblem accents, metallic blue, deep obsidian, clean structure, high-contrast typography.

---

## 2. Design Tokens

### Color Palette
```css
:root {
  --bg-primary: #080D18;
  --bg-secondary: #101827;
  --bg-elevated: #151F30;
  --bg-glass: rgba(21, 31, 48, 0.7);

  --brand-blue: #397BFF;
  --brand-accent: #63B3FF;
  --brand-glow: rgba(57, 123, 255, 0.25);

  --metallic-silver: #C7D2E2;
  --text-primary: #F4F7FC;
  --text-secondary: #A4B1C4;
  --text-muted: #6B7C96;

  --border-subtle: #1E2B3E;
  --border-prominent: #263449;
  --border-accent: rgba(99, 179, 255, 0.4);

  --status-success: #35C991;
  --status-warning: #F4BD5E;
  --status-error: #F47777;
  --status-info: #63B3FF;
}
```

### Typography
- **Primary Font Family**: Inter, system-ui, -apple-system, sans-serif
- **Headings**: Semi-bold to Bold (600 - 700), restrained letter-spacing (`-0.02em`)
- **Uppercase Labels**: Tracking wide (`0.08em`), font size 11px - 13px

### Spacing & Layout
- Page Container: Max width 1280px with fluid horizontal padding
- 8-point spacing system (`p-2`, `p-4`, `p-6`, `p-8`, `p-12`, `p-16`)
- Standard Card Radius: `rounded-xl` (12px) to `rounded-2xl` (16px)
- Border Style: 1px solid with glassmorphism surface backdrop
