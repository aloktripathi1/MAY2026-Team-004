# Sangam Design System

This document captures the approved Sangam visual system currently being rolled out across the app. Treat it as the source of truth for new screens and for the remaining role-dashboard migrations.

## Design Intent

Sangam should feel like a nocturnal control room for serious community operations. The product replaces scattered WhatsApp groups, forms, spreadsheets, and informal handovers with one precise system for membership, events, tasks, announcements, resources, approvals, and transparency.

The design should feel premium and product-led: closer to Linear, Arc, Raycast, Cron, or Framer than to a college club noticeboard. Confidence comes from typography, spacing, hierarchy, restrained depth, and purposeful interactions, not from decorative effects.

## Core Principles

- Dark first. The product lives on a near-black warm canvas, not a cream or paper theme.
- Glass is load-bearing. Use glass for navigation, hero preview, dropdowns, mobile overlays, and maybe future command/modals. Do not use glass for every card.
- Dashboard content is flat. Tables, cards, list rows, forms, stats, and board columns use solid dark panels with subtle borders.
- Gold is the primary visible foreground accent. Maroon is a glow/background/border accent, not body text on dark.
- Mono labels create structure. Use mono typography for metadata, IDs, timestamps, counts, labels, and small state indicators.
- Motion should explain state. Use tactile hover/press states and small layout transitions; avoid blanket scroll fade-ups across dashboards.
- Contrast is non-negotiable. Every normal text color on the dark canvas must meet WCAG AA.

## Tokens

The current global tokens live in `app/globals.css` under `:root`.

### Canvas And Surfaces

- Base canvas: `--background: 0.055 0.008 285`
- Primary text: `--foreground: 0.965 0.006 80`
- Solid panel: `--surface: 0.105 0.01 285`
- Raised/hover panel: `--surface-2: 0.14 0.012 285`
- Subtle filled state: `--surface-3: 0.18 0.012 285`
- Hairline border: `--hairline: oklch(1 0 0 / 10%)`

Use `bg-background`, `text-foreground`, `bg-surface`, `bg-surface-2`, and `border-hairline` through Tailwind tokens when possible.

### Accents

- Maroon/wine: `--primary: 0.47 0.16 24`
- Maroon foreground: `--primary-foreground: 0.985 0.006 80`
- Maroon glow: `--primary-glow: 0.54 0.17 24`
- Gold/amber: `--secondary: 0.78 0.13 78`
- Gold foreground: `--secondary-foreground: 0.16 0.018 55`

Rules:

- Use gold (`text-secondary`) for visible links, counts, active nav icons, pinned icons, key section highlights, and primary visible emphasis.
- Use maroon for glow, filled backgrounds, low-opacity borders, or button fills where foreground is white/off-white.
- Do not use `text-primary` for normal text on the dark canvas. It does not meet contrast. If maroon must appear as text, check the exact background and contrast first.

### Semantic Colors

- Success: `--success: 0.72 0.13 155`
- Warning: `--warning: 0.78 0.13 78`
- Destructive: `--destructive: 0.62 0.19 25`

Use semantic colors for status and destructive actions, but keep the styling consistent through shared primitives.

## Typography

Global fonts are set in `app/layout.tsx`:

- Body/display: `Space Grotesk`
- Mono labels/data: `JetBrains Mono`

Do not add page-specific font imports or local font overrides. The old Playfair/cream/editorial direction is retired.

### Hierarchy

- Large marketing headline: oversized, black weight, tight leading and tracking.
- Dashboard page title: `text-4xl sm:text-5xl font-black leading-[0.95] tracking-[-0.05em] text-white`
- Section label/eyebrow: `.text-mono-label`
- Card title: small to medium sans, semibold, white.
- Metadata/timestamps/count labels: mono, uppercase, muted.
- Numerals in stats: mono, large, tight tracking.

Shared page headers are implemented through `PageHeader` in `components/shell/AppShell.tsx`.

## Utility Classes

### `.night-nav`

Used for frosted navigation surfaces.

Current behavior:

- Semi-transparent dark background.
- `backdrop-filter: blur(18px) saturate(135%)`
- `1px` low-opacity white border.
- Used by landing navbar/dropdown, mobile top bar, and persistent dashboard sidebars.

Use for:

- Landing navbar.
- Dashboard sidebar.
- Mobile nav overlay/topbar.
- Dropdowns/menus that float above content.

Avoid for:

- Dashboard cards.
- Tables.
- Stat blocks.
- Repeated list rows.

### `.night-panel`

Used for dashboard content.

Current behavior:

- Solid dark surface with a very subtle top highlight.
- `1px` low-opacity white border.
- No backdrop blur.

Use for:

- Cards.
- Stat blocks.
- Tables.
- Board columns.
- Resource grids.
- Forms.
- Empty states.

### `.gold-cta`

Used for the primary CTA treatment.

Current behavior:

- Gold gradient fill.
- Subtle top radial highlight.
- Small gold glow on hover.
- Slight upward hover movement.

Use for:

- Primary marketing CTA.
- Primary dashboard action when there is exactly one dominant action.
- Confirm/approve buttons where the action should feel positive and primary.

Do not overuse it. Secondary actions should use outline/ghost button variants.

### `.hero-glass`

Used only in the landing hero product preview.

Current behavior:

- Semi-transparent glass surface.
- Backdrop blur.
- Maroon/gold atmospheric shadow.

Do not reuse for normal dashboard cards.

## Components

### `AppShell`

File: `components/shell/AppShell.tsx`

Current behavior:

- Mobile topbar uses `.night-nav`.
- Persistent sidebar uses `.night-nav`.
- Active nav item uses a subtle white fill, gold ring, and gold dot.
- Role card is a flat translucent block inside the frosted sidebar.
- Page content is constrained to `max-w-7xl`.

When applying to new roles, keep navigation structure unchanged unless the role needs different information architecture. Only adapt page content.

### `PageHeader`

File: `components/shell/AppShell.tsx`

Use this on all dashboard pages.

Pattern:

- Eyebrow: mono label.
- Title: bold Space Grotesk, white.
- Highlight words: prefer `text-secondary`.
- Description: muted, max width, readable line height.
- Actions: right aligned on desktop, below/inline on mobile.

Avoid:

- `text-display text-primary italic`
- Playfair-like italic highlights
- Maroon foreground text

### `GlassCard`

File: `components/ui/primitives.tsx`

Despite the historical name, this now renders a flat `.night-panel` card. It should remain the default repeated-content card primitive until renamed later.

Behavior:

- Solid dark panel.
- Low-opacity border.
- Optional subtle hover lift and border shift.
- No blur.

### `Stat`

File: `components/ui/primitives.tsx`

Use for dashboard stat blocks.

Behavior:

- `.night-panel`
- Mono label.
- Large mono value.
- Gold secondary delta.
- Small colored signal dot.

### `Btn`

File: `components/ui/primitives.tsx`

Variants:

- `primary`: gold CTA (`.gold-cta`)
- `hot`: maroon fill with safe off-white foreground
- `outline`: low-opacity dark outline button
- `ghost`: muted text with low-opacity hover fill

Buttons use rounded-lg, not pill styling, except where a control genuinely requires a compact chip.

### `StatusPill`

File: `components/ui/primitives.tsx`

Use consistently for all statuses:

- `green` / `lime`: success or approved/available/done.
- `amber`: pending/booked/doing/warning.
- `slate`: neutral/inactive/todo/logged.
- `magenta`: maroon-backed special state with white text.
- `blue`: currently maps to gold/accent; use sparingly.

The pill uses mono uppercase text, a small current-color dot, and a low-opacity ring.

## Layout Patterns

### Landing Page

The landing page is the marketing reference:

- Full dark canvas.
- Fixed transparent-to-frosted nav.
- Large statement headline.
- Product preview below hero copy.
- One glass hero product panel.
- Flat dark modules, role panels, event cards.
- Large atmospheric maroon/gold radial light only where it supports hero/CTA depth.

### Dashboards

Role dashboards should feel operational and scannable:

- Sidebar glass, content flat.
- Page header first.
- Stats in a compact grid.
- Main work areas use `night-panel` or `GlassCard`.
- Tables/lists use borders and row hover, not heavy shadows.
- Metadata in mono.
- Primary CTA in gold only when there is one obvious main action.

### Forms

Inputs and textareas:

- Dark fill: `bg-white/[0.035]`
- Border: `border-white/12`
- Text: `text-white`
- Placeholder: `placeholder:text-muted-foreground/60`
- Focus: `focus:border-secondary/55`
- Radius: `rounded-xl`

Labels use `.text-mono-label`.

### Tables And Lists

- Container: `.night-panel overflow-hidden rounded-2xl`
- Header row: mono labels, muted.
- Rows: `divide-y divide-hairline` or explicit `border-b border-hairline`.
- Hover: `hover:bg-white/[0.04]`
- Avatars: square rounded-lg with safe text. Maroon-tinted avatar backgrounds are allowed only with white text.

### Boards

Task/status boards:

- Columns: `.night-panel rounded-2xl p-3`
- Cards: `border border-white/10 bg-white/[0.035]`
- Empty states: dashed low-opacity border.
- Status controls: mono, rounded-md, active gold fill.

## Motion And Interaction

Allowed:

- Button hover: slight lift, brightness, or border shift.
- Active nav layout animation.
- Small panel hover translate for clickable cards.
- Count-up metrics when they represent live activity.
- Form/control state transitions.

Avoid:

- Page-wide fade-up animation on every section.
- Excessive parallax in dashboards.
- Blur-heavy repeated cards.
- Decorative particles/orbs that do not explain structure.

Respect `prefers-reduced-motion` for any nonessential motion.

## Contrast Notes

Token-level checks passed:

- Body on background: `18.91:1`
- Muted on background: `8.42:1`
- Body on panel: `18.55:1`
- Muted on panel: `8.26:1`
- Gold on background: `10.31:1`
- Gold button text: `9.58:1`
- Primary foreground on maroon: `7.11:1`
- Success on panel: `8.74:1`
- Destructive on panel: `5.14:1`

Known rule:

- Maroon foreground text on the dark background fails at roughly `2.82:1`. Do not use `text-primary` for normal foreground copy on dark surfaces.

## Branch Rollout Workflow

Keep applying the system role by role, with a dedicated branch and PR for each purpose.

Completed/current stack:

- `landing-page`: approved landing redesign.
- `admin-dashboard`: global tokens/root fonts/shared shell/primitives plus admin reference implementation. PR base: `landing-page`.
- `coordinator-dashboard`: coordinator screens and shared task status controls. PR base: `admin-dashboard`.

Continue with the same pattern:

- Create the next branch from the latest stacked branch if previous PRs are not merged.
- Keep each branch scoped to one role or area.
- Validate before pushing.
- Push branch.
- Open a draft PR against the previous branch in the stack.

Recommended next branches:

- `member-dashboard`
- `volunteer-dashboard`
- `faculty-dashboard`
- `auth-pages`
- `shared-components-polish` if needed after role passes

## Validation Checklist

Before opening each PR:

- Run `npm run lint`.
- Run `npm run build`.
- Smoke-check the role routes locally.
- Run or repeat the token-level contrast check when introducing new color combinations.
- Scan changed files for:
  - `text-primary` used as foreground text.
  - `glass` or `glass-strong` on dashboard content.
  - page-specific font imports.
  - old `text-display text-primary italic` highlight patterns.
  - `bg-surface/60` form fields that should now use dark input styling.

## Do Not Reintroduce

- Cream/paper theme.
- Playfair or serif italic word highlights.
- Maroon as normal foreground text on dark.
- Generic glass cards everywhere.
- Purple/blue gradient blobs.
- Decorative dot/particle backgrounds.
- Generic three-icon feature grids.
- Pill buttons as the default button language.
- Stock people-at-laptop imagery.

