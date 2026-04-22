# Mestika Slot Game — Frontend Prompt (Bruneian Theme)
> Copy and paste this entire prompt into Base44 to generate the admin panel frontend.
> Build the backend first using the backend prompt before running this.

---

## Overview

Build a web-based admin panel for a casino slot machine game called **"Mestika"** (meaning "gemstone" in Malay). The panel connects to the Base44 backend actions already created. The design must be authentically Bruneian in theme, using royal court aesthetics, traditional Malay motifs, and the national flag colours of Brunei Darussalam.

---

## Design System — Bruneian Royal Theme

### Colour Palette

| Variable | Hex | Usage |
|---|---|---|
| Background deep | `#1a0a00` | Page background (dark wengé wood) |
| Background dark | `#2b1400` | Sidebar, secondary surfaces |
| Card background | `#3a1c00` | Panel surfaces |
| Border | `#5a3010` | All borders — warm brown, songket-inspired |
| Gold primary | `#C9A84C` | Bruneian royal gold — nav active, icons |
| Gold light | `#E8C97A` | Headings, large stat values |
| Gold dim | `#8a6e2f` | Labels, secondary text |
| Accent yellow | `#F7E017` | Brunei flag yellow — used sparingly for badges |
| White warm | `#FFF8E7` | Body text on dark |
| White dim | `#C4B89A` | Secondary body text |
| Red royal | `#8B0000` | Brunei flag red — alerts, danger states |
| Green forest | `#1a5c1a` | Positive RTP, win states |
| Green light | `#2a8c2a` | Progress bar fills |

### Typography

- Font: `system-ui, "Segoe UI", sans-serif`
- Headings: gold (`#C9A84C` or `#E8C97A`), font-weight 600
- Body text: warm white (`#FFF8E7`), font-weight 400
- Labels / secondary: gold-dim (`#8a6e2f`)
- All section labels must be **bilingual** — Malay first, English subtitle beneath

### Bilingual Label Reference

| English | Malay |
|---|---|
| Dashboard | Papan Pemuka |
| Probability Tuner | Kawalan Kebarangkalian |
| Game Config | Tetapan Permainan |
| Spin History | Sejarah Putar |
| Players | Pemain |
| Save Changes | Simpan Perubahan |
| Reset to Defaults | Tetapkan Semula |
| Save Settings | Simpan Tetapan |
| Total Spins | Jumlah Putaran |
| House Edge | Kelebihan Rumah |
| Symbol | Simbol |
| Weight | Berat |
| Search player... | Cari pemain... |
| Add Credits | Tambah Kredit |
| Deactivate | Nyahaktifkan |
| Export CSV | Eksport CSV |
| Date Range | Tarikh |
| Win Only | Menang Sahaja |
| Bonus Spins Only | Pusingan Bonus |

### Symbol Names (Bruneian Cultural Replacements)

| English Name | Malay Name | symbol_key | Color |
|---|---|---|---|
| Golden Flower (Jackpot) | Bunga Emas | bunga_emas | `#C9A84C` |
| Royal Crown (Seven) | Mahkota | mahkota | `#8B0000` |
| Traditional Dagger (Wild) | Keris | keris | `#1a5c1a` |
| Decorative Cover (Bell) | Tudong Saji | tudong_saji | `#5a3010` |
| Bruneian Boat (Bar) | Perahu Brunei | perahu_brunei | `#1a4a6e` |
| Hibiscus (Cherry) | Bunga Raya | bunga_raya | `#cc2244` |
| Citrus Fruit (Lemon) | Limau | limau | `#7a9e1a` |
| Star (Scatter) | Bintang | bintang | `#F7E017` |
| Blank | Kosong | kosong | `#444444` |

---

## Decorative Elements (Use Consistently on Every Page)

### 1. Songket Bar
A thin repeating horizontal stripe at the very top of the page and sidebar header:
```css
background: repeating-linear-gradient(
  90deg,
  #C9A84C 0, #C9A84C 6px,
  #8B0000 6px, #8B0000 12px,
  #C9A84C 12px, #C9A84C 18px,
  #000 18px, #000 22px
);
height: 4px;
```
Use at the very top of the sidebar header and above the main topbar.

### 2. Flag Strip
A 6px strip in Brunei flag colours (yellow / white / black), placed directly below the topbar:
```css
background: repeating-linear-gradient(
  90deg,
  #F7E017 0, #F7E017 33%,
  #fff 33%, #fff 66%,
  #000 66%, #000 100%
);
height: 6px;
```

### 3. Ornament Divider
Between every major content section:
```html
<div style="display:flex;align-items:center;gap:6px;margin:12px 0">
  <div style="flex:1;height:1px;background:#5a3010"></div>
  <div style="width:6px;height:6px;background:#C9A84C;transform:rotate(45deg)"></div>
  <div style="flex:1;height:1px;background:#5a3010"></div>
</div>
```

### 4. Card Top Accent
Every stat card has a `2px` top border in the relevant accent colour (gold, green, red, amber).

### 5. App Identity
- App name: **★ Mestika** (gold star before name)
- Subtitle: *Konsol Pentadbiran Slot* (Slot Admin Console)

### 6. Live Clock
Show live Brunei Standard Time (UTC+8) in sidebar footer, labeled **"Waktu Brunei"**.

### 7. Page Footer
Every page ends with:
```
Mestika Slot Admin · Negara Brunei Darussalam · ◆
```

---

## Layout Structure

### Sidebar (200px wide, fixed left)
- Background: `#2b1400`
- Top: songket bar (4px) → logo area with ★ Mestika + subtitle
- Navigation with Malay section headers:
  - **Operasi** (Operations): Dashboard, Kawalan Kebarangkalian, Tetapan Permainan
  - **Pemain** (Players): Pemain, Sejarah Putar
- Active item: gold left border (`3px solid #C9A84C`) + gold text + subtle gold tint background
- Bottom: live Waktu Brunei clock (updates every second)

### Top Bar
- Songket bar (4px) → Flag strip (6px yellow/white/black) → topbar content
- Topbar content: page title in Malay/English, **Live** badge (red `#8B0000`), admin key indicator
- Background: `#2b1400`, border-bottom: `1px solid #5a3010`

### Main Content Area
- Background: `#1a0a00`
- Padding: `20px`
- Section headings: uppercase gold-dim (`#8a6e2f`), small letter-spacing, bottom border `1px solid #5a3010`

---

## Page Specifications

### Page 1: Papan Pemuka (Dashboard)

**Stat cards — 4 across, each with 2px top accent:**
- Jumlah Putaran (Total Spins) — gold accent
- Jumlah Diwageri (Total Wagered) — amber accent, value in B$
- RTP Sebenar (Actual RTP %) — green if ≤ 97%, yellow if 97–99%, red if > 99%
- Kelebihan Rumah (House Edge %) — colour coded opposite to RTP

**Alert banner** (red-tinted, shown when RTP > 98% or house edge < 2%):
> Amaran: RTP melebihi had sasaran. Semak semula tetapan kebarangkalian.
> Warning: RTP exceeds target threshold. Review probability settings.

**Two-panel row:**

Left panel — **Kebarangkalian Simbol** (Symbol Probabilities):
- List each active symbol with: colour swatch circle, Malay name, horizontal weight bar, probability percentage
- Percentage = `(symbol_weight / total_weight * 100).toFixed(1) + "%"`

Right panel — **Meter RTP**:
- Large RTP percentage (32px, gold)
- Progress bar from 85% to 100%
- Comparison grid: Theoretical RTP vs Actual RTP, Biggest Win Today

**Recent spins table — Sejarah Putar Terkini:**
- Columns: Masa (Time), Pemain (Player ID truncated), Pertaruhan (Bet), Bayaran (Payout), Gandaan (Multiplier), Bonus, Keputusan (Result)
- Result pills: Win (green), Loss (red), Big Win (gold)
- All amounts prefixed with **B$**
- Auto-refresh every 30 seconds

---

### Page 2: Kawalan Kebarangkalian (Probability Tuner)

**Warning banner (always visible at top):**
> Perubahan berkuat kuasa serta-merta pada putaran seterusnya. Pantau RTP selepas setiap pelarasan.
> Changes take effect immediately on the next spin. Monitor RTP after every adjustment.

**Sticky RTP Calculator panel (top right):**
- Shows: Theoretical RTP %, House Edge %
- Updates live as sliders move (no save needed to preview)
- Colour coding: green ≤ 96%, yellow 96–98%, red > 98%
- Formula:
  ```
  total_weight = sum of active non-kosong non-scatter weights
  For each active symbol:
    p = weight / total_weight
    contribution = p * (payout_3x * 0.010 + payout_4x * 0.002 + payout_5x * 0.0004) * 5
    theoretical_rtp += contribution * 100
  ```

**Symbol rows table — one row per symbol:**

| Column | Details |
|---|---|
| Colour swatch | Filled circle using symbol's color_hex |
| Name | Malay name bold, English name smaller below |
| Active toggle | Gold when on, dark grey when off |
| Weight slider | Range 0–100, shows live value beside slider |
| Probability % | Auto-computed: `(weight / total_weight * 100).toFixed(1) + "%"` — updates live |
| Payout 3× | Number input field |
| Payout 4× | Number input field |
| Payout 5× | Number input field |
| Wild badge | Shown only if is_wild = true: gold outlined pill "Liar" |
| Scatter badge | Shown only if is_scatter = true: yellow outlined pill "Bintang" |

**Action buttons:**
- **Simpan Perubahan** — primary gold button, calls `POST /admin/probability/update`
- **Tetapkan Semula** — outlined secondary button, restores seed data weights
- On save success: show toast with updated theoretical RTP value

---

### Page 3: Tetapan Permainan (Game Config)

Form layout with labeled rows — Malay label above, English subtitle below, input on right:

| config_key | Malay Label | English Label |
|---|---|---|
| min_bet | Pertaruhan Minimum | Minimum bet per spin |
| max_bet | Pertaruhan Maksimum | Maximum bet per spin |
| default_bet | Pertaruhan Lalai | Default starting bet |
| starting_credits | Kredit Permulaan | Starting credits for new players |
| scatter_trigger_count | Pencetus Bonus Bintang | Scatters required for bonus round |
| bonus_spin_count | Pusingan Percuma | Number of free spins awarded |
| house_edge_target | Sasaran Tepi Rumah % | Target house edge percentage |
| max_win_multiplier | Had Menang Maksimum | Maximum win cap (multiplier) |

**Validation:**
- max_bet must be > min_bet (show inline error if not)
- house_edge_target must be between 1 and 25
- All values must be positive numbers

**Button:** Simpan Tetapan — calls `POST /admin/config/update` for each changed field

---

### Page 4: Pemain (Players)

- Search bar: placeholder "Cari pemain..." — filters by player_id or display_name
- Table with Malay column headers:

| Column (Malay) | Column (English) | Notes |
|---|---|---|
| ID Pemain | Player ID | Truncated with copy button |
| Nama | Name | display_name |
| Kredit | Credits | B$ prefixed |
| Jumlah Putar | Total Spins | |
| Diwageri | Total Wagered | B$ prefixed |
| Menang | Total Won | B$ prefixed |
| RTP Peribadi | Personal RTP | `(total_won/total_wagered*100).toFixed(1)+"%"` — colour coded |
| Menang Terbesar | Biggest Win | B$ prefixed |
| Aktif Terakhir | Last Active | BNT timezone |
| Status | Status | Active/Inactive pill |

- Row click: opens side panel with last 10 spins for that player
- Per-row actions:
  - **Tambah Kredit** — opens modal with amount input, calls `POST /admin/player/add-credits`
  - **Nyahaktifkan** — confirmation dialog, calls `POST /admin/player/deactivate`

---

### Page 5: Sejarah Putar (Spin History)

**Filter bar:**
- Tarikh dari (Date from) / Tarikh hingga (Date to)
- Checkbox: Menang Sahaja (Win Only)
- Checkbox: Pusingan Bonus (Bonus Spins Only)
- Player ID text input
- Apply Filters button

**Table columns:**

| Column (Malay) | Notes |
|---|---|
| ID Putar | Spin ID (truncated) |
| Pemain | Player ID (truncated) |
| Masa | Timestamp in BNT |
| Pertaruhan | Bet in B$ |
| Keputusan Gelendong | Reel result as compact symbol grid |
| Bayaran | Payout in B$ |
| Gandaan | Win multiplier |
| Bonus | Yes/No pill |
| RTP Snapshot | Percentage |

**Export button:** Eksport CSV — downloads filtered results as CSV

---

## Component Specifications

### Buttons

| Type | Style |
|---|---|
| Primary | background `#C9A84C`, color `#1a0a00`, font-weight 600, border-radius 6px |
| Secondary | background transparent, border `1px solid #5a3010`, color `#C9A84C` |
| Danger | background transparent, border `1px solid #8B0000`, color `#ef5350` |
| Hover | Lighten gold by 10% or brighten border |

### Inputs

```css
background: #2b1400;
border: 1px solid #5a3010;
color: #FFF8E7;
border-radius: 6px;
padding: 8px 12px;
/* Focus: */
border-color: #C9A84C;
outline: none;
```

### Toggle Switch

- Off state: track `#3a1c00`, thumb `#5a3010`
- On state: track `#C9A84C`, thumb `#FFF8E7`

### Tables

```css
/* Header row */
background: #2b1400;
color: #8a6e2f;

/* Data rows — alternating */
background: #1a0a00 / #221000;

/* Hover */
background: #3a1c00;

/* Border */
border: 1px solid #5a3010;
```

### Pills / Badges

| Type | Background | Text colour |
|---|---|---|
| Win | `rgba(26,92,26,0.25)` | `#4caf50` |
| Loss | `rgba(139,0,0,0.2)` | `#ef5350` |
| Big Win | `rgba(201,168,76,0.2)` | `#E8C97A` |
| Live | `#8B0000` solid | `#ffffff` |
| Wild (Liar) | `rgba(201,168,76,0.15)`, border `1px solid #C9A84C` | `#C9A84C` |
| Scatter (Bintang) | `rgba(247,224,23,0.15)`, border `1px solid #F7E017` | `#F7E017` |
| Active | `rgba(26,92,26,0.2)` | `#4caf50` |
| Inactive | `rgba(139,0,0,0.15)` | `#ef5350` |

### Toast Notifications

```css
/* Success */
border-left: 3px solid #C9A84C;
background: #2b1400;
color: #FFF8E7;

/* Error */
border-left: 3px solid #8B0000;
background: #2b1400;
color: #FFF8E7;
```

---

## Currency & Localisation

- All monetary values: **`B$X,XXX.XX`** (Brunei Dollar, comma thousands separator)
- Percentages: always 1 decimal place, e.g. `94.5%`
- Date/time: Brunei Standard Time (UTC+8), format `DD/MM/YYYY HH:mm BNT`
- Primary language: Malay labels with English subtitles throughout

---

## API Configuration

Place at the top of the frontend file:

```javascript
const ADMIN_KEY = "your-admin-key-here";
const API_BASE = "https://your-base44-project.base44.app";

const adminHeaders = {
  "Content-Type": "application/json",
  "x-admin-key": ADMIN_KEY
};
```

All requests to `/admin/*` routes must include the `x-admin-key` header.

---

## Implementation Notes

- The songket bar and flag strip must appear on **every page** at the top
- The ornament divider `——◆——` separates every major content section on every page
- Dashboard auto-refreshes every 30 seconds (use `setInterval`)
- Loading states: show a gold-tinted skeleton loader (`background: #3a1c00`) while data fetches
- The Probability Tuner's theoretical RTP calculator must update live on every slider move — no save required to preview
- All number inputs must use `toLocaleString()` or `.toFixed(2)` — never display raw JS floats
- The admin key is hardcoded in config for now — no login UI required
- Currency symbol `B$` always prefixes the number with no space: `B$1,250.00`
