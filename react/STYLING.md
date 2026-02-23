# Styling @syncsnap/react

Components use **Tailwind CSS** and **CSS variables** for the theme. You don’t have to copy a full `globals.css`; you can use either approach below.

## Option 1: Minimal setup (recommended)

If your app already uses **Tailwind v4**, add these imports in your main CSS file (e.g. `app/globals.css`):

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "@syncsnap/react/theme";
```

Install peer deps if needed:

```bash
npm install tailwindcss tw-animate-css shadcn
```

The theme file includes an `@source` so Tailwind automatically scans the SDK for class names. No extra config or copy-paste needed.

## Option 2: Copy the full stylesheet

You can copy `globals.css` from the [example-app](../../example-app/app/globals.css) into your project and import it. Use that if you prefer a single self-contained file or need to tweak the theme heavily.

## Requirements

- **Tailwind** (v3 or v4) so utility classes used by the components are generated.
- **Content scanning** of the SDK: Tailwind must see the package source (e.g. via `@source` in Tailwind v4, or `content` in `tailwind.config.js` for v3) so classes like `bg-background`, `rounded-xl`, etc. are included.
