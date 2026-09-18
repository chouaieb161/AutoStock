---
name: Atelier Commerce
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#a73a00'
  on-secondary: '#ffffff'
  secondary-container: '#fd651e'
  on-secondary-container: '#571a00'
  tertiary: '#3d445a'
  on-tertiary: '#ffffff'
  tertiary-container: '#545c72'
  on-tertiary-container: '#cdd5ef'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#ffdbce'
  secondary-fixed-dim: '#ffb599'
  on-secondary-fixed: '#370e00'
  on-secondary-fixed-variant: '#7f2b00'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: 0em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.04em
  price-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: -0.02em
  code-oem:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system serves automotive spare parts retailers, workshop owners, and counter merchants across Tunisia. The environment is fast-paced, tactile, and physically demanding: users interact with screens on grease-stained counter terminals, tablets, and smartphones under direct overhead fluorescent lighting or afternoon glare.

The visual style is **Pragmatic Modern Corporate**: ultra-legible, functional, and high-contrast. It eliminates purely decorative elements, complex gradient meshes, and micro-interactions that degrade perceived utility. It borrows the clarity of industrial diagnostic tools and enterprise logistics consoles while maintaining an approachable, clean human touch. The interface inspires reliability, catalog speed, and commercial trust.

## Colors
The color palette balances deep industrial competence with immediate actionable visual cues.

- **Primary Cobalt Blue (`#1D4ED8`)**: Used for branding, secondary actions, active navigation tabs, table headers, and focused states. Signals structural integrity, institutional stability, and verified catalog items.
- **Secondary Vivid Amber-Orange (`#EA580C`)**: Reserved strictly for high-value conversion elements: "Ajouter au panier", "Commander maintenant", fast stock reservations, and quick-dispatch triggers. High contrast against both white and tinted container backgrounds.
- **Tertiary Deep Navy Slate (`#0F172A`)**: Base text, high-emphasis headings, key reference values (OEM part numbers, VIN search matches).
- **Neutral Blue-Slate (`#64748B`)**: Structural dividers, secondary meta-labels, disabled elements, and subdued table metadata.
- **Surfaces**: Canvas default is `#F8FAFC`, stepping into `#F1F5F9` for secondary card shells and `#FFFFFF` for elevated data panels.

### Semantic Stock Badges
- **En Stock (Available)**: `#047857` (text) on `#DCFCE7` (background) with `#86EFAC` border.
- **Sur Commande (On Order)**: `#B45309` (text) on `#FEF3C7` (background) with `#FCD34D` border.
- **Rupture (Out of Stock)**: `#B91C1C` (text) on `#FEE2E2` (background) with `#FCA5A5` border.
- **Indisponible (Discontinued/Inactive)**: `#475569` (text) on `#F1F5F9` (background) with `#CBD5E1` border.

## Typography
Plus Jakarta Sans is utilized across all text tiers. Its wide aperture, distinct geometric terminals, and generous x-height prevent eye strain in harsh workshop environments.

- **Numerics and Prices**: Rendered in tabular figures (`tnum`) with 3 decimal precision for Tunisian Dinar formatting (e.g., `145.500 TND`). The currency code "TND" is presented in `label-sm` weight directly alongside the integer baseline.
- **OEM & Part Reference Codes**: Rendered in uppercase bold weights (`code-oem`) to simplify cross-checking paper catalogs, physical box labels, and manufacturer stamps.
- **Text Scaling**: Body sizes avoid dropping below `14px` on desktop and mobile viewports to ensure legibility from counter-height viewing distances.

## Layout & Spacing
The layout follows a 12-column responsive fluid grid on desktop (`> 1024px`) shifting to an 8-column layout on tablet (`768px - 1023px`) and a 4-column layout on mobile (`< 768px`).

- **Grid Behavior**: Outer canvas margins collapse from `2rem` (`32px`) down to `1rem` (`16px`) on mobile devices.
- **Data Densities**: Part listings, stock grids, and invoice details maintain an ergonomic minimum row height of `56px` to prevent accidental clicks.
- **Touch Targets**: All interactive targets (buttons, search pickers, stepper buttons) maintain a physical touch clearance of at least `48px` x `48px`.

## Elevation & Depth
Depth is built using clean structural boundaries and subtle tonal separation rather than heavy skeuomorphic drop shadows.

- **Level 0 (Flat Canvas)**: `#F8FAFC` background; provides a calm foundation for data surfaces.
- **Level 1 (Card & Panel Surface)**: Pure `#FFFFFF` surface with a crisp 1px solid border (`#E2E8F0`). Shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)`.
- **Level 2 (Hovered Part Rows & Active Filters)**: `#FFFFFF` surface with elevated focus border (`#CBD5E1`). Shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Quick Order Drawers, Modals & Floating Total Bar)**: `#FFFFFF` elevated container. Shadow: `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)`. Border: `#E2E8F0`.

## Shapes
A roundedness level of `1` (Soft) produces a functional, industrial aesthetic.
- Base interactive elements (buttons, inputs, status badges) use `0.25rem` (`4px`) radii.
- Content containers, cards, and modal dialogs utilize `0.5rem` (`8px`) radii.
- Circular treatment is limited strictly to avatar initial counters, badge alert pips, and standalone circular icons.

## Components

### Buttons
- **Primary Action (Commercial / Checkout)**:
  - Background: `#EA580C`; Text: `#FFFFFF`; Height: `48px`; Font: `label-lg`; Radius: `4px`.
  - Hover: `#C2410C`; Active: `#9A3412`.
- **Secondary Action (Navigation / Filter / Bulk Edits)**:
  - Background: `#1D4ED8`; Text: `#FFFFFF`; Height: `48px`; Font: `label-lg`; Radius: `4px`.
  - Hover: `#1E40AF`; Active: `#1E3A8A`.
- **Outline / Utility**:
  - Background: `#FFFFFF`; Text: `#0F172A`; Border: `1.5px solid #CBD5E1`; Height: `44px`; Font: `label-md`.
  - Hover: Background `#F1F5F9`, Border `#94A3B8`.

### Input Fields & Search Bars
- **Global Search Bar (VIN / OEM Reference / Part Name)**:
  - Height: `52px`; Background: `#FFFFFF`; Border: `2px solid #CBD5E1`; Radius: `4px`; Text: `body-lg`.
  - Leading search icon (`24px`, `#64748B`).
  - Focus state: Border `#1D4ED8`, outline offset with `3px solid rgba(29, 78, 216, 0.15)`.
- **Standard Field**:
  - Height: `44px`; Background: `#FFFFFF`; Border: `1px solid #CBD5E1`; Radius: `4px`; Text: `body-md`.
  - Label: `label-sm` in `#475569`, permanently positioned above the input with `4px` gap.

### Stock Status Badges
- Displayed as compact, high-legibility pills with uppercase tracking.
- Height: `24px`; Padding: `2px 8px`; Font: `label-sm`; Radius: `4px`; Border: `1px solid`.
- Semantic colors applied according to the Section 2 definition:
  - *En stock*: `#DCFCE7` bg / `#047857` text / `#86EFAC` border.
  - *Sur commande*: `#FEF3C7` bg / `#B45309` text / `#FCD34D` border.
  - *Rupture*: `#FEE2E2` bg / `#B91C1C` text / `#FCA5A5` border.
  - *Indisponible*: `#F1F5F9` bg / `#475569` text / `#CBD5E1` border.

### Part Cards & Catalog Table Rows
- **Card**:
  - Background: `#FFFFFF`; Border: `1px solid #E2E8F0`; Padding: `16px`; Radius: `8px`.
  - Header: Part Title (`headline-sm`), OEM Code (`code-oem` in `#64748B`), Brand Badge.
  - Pricing: Large numeric price display (`price-display`, `#0F172A`) paired with `TND`.
  - Quick-quantity stepper: Minimum tap area `40px` x `40px` with `+` and `-` triggers.
- **Table Rows**:
  - Alternate zebra shading on complex lists (`#FFFFFF` to `#F8FAFC`).
  - Bottom border: `1px solid #E2E8F0`. Hover row state: `#F1F5F9`.

### Checkboxes & Radios
- Size: `20px` x `20px` touch frame encased inside a minimum `44px` target container.
- Unchecked: `1.5px solid #94A3B8` on `#FFFFFF`.
- Checked: `#1D4ED8` fill with crisp white glyph.