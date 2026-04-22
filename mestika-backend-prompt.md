# Mestika Slot Game — Backend Prompt
> Copy and paste this entire prompt into Base44 to generate the backend.

---

## Overview

Build the complete backend for a casino slot machine game called **"Mestika"** (meaning "gemstone" in Malay). This is a Bruneian-themed slot game. All currency is in Brunei Dollar (B$). All symbol names use Bruneian cultural references. The backend must support full admin control over probabilities and game mechanics with zero app updates required.

---

## COLLECTIONS (Database Tables)

### 1. `probability_config`

| Field | Type | Notes |
|---|---|---|
| symbol_name | text, required | Malay cultural name, e.g. "Bunga Emas" |
| symbol_name_en | text | English translation, e.g. "Golden Flower" |
| symbol_key | text, required, unique | Lowercase slug, e.g. "bunga_emas" |
| weight | number, required | Integer 0–100. Higher = more frequent. |
| payout_3x | number | Win multiplier when 3 of this symbol land on a payline |
| payout_4x | number | Win multiplier when 4 of this symbol land on a payline |
| payout_5x | number | Win multiplier when 5 of this symbol land on a payline |
| is_wild | boolean, default false | If true, substitutes for any non-scatter symbol |
| is_scatter | boolean, default false | If true, triggers bonus when 3+ appear anywhere |
| is_active | boolean, default true | Toggle symbol on/off without deleting |
| color_hex | text | Hex colour for admin UI display |
| sort_order | number | Display order in admin panel |

**Seed data (insert on first run):**

| symbol_name | symbol_name_en | symbol_key | weight | payout_3x | payout_4x | payout_5x | is_wild | is_scatter | color_hex |
|---|---|---|---|---|---|---|---|---|---|
| Bunga Emas | Golden Flower | bunga_emas | 2 | 50 | 200 | 1000 | false | false | #C9A84C |
| Mahkota | Royal Crown | mahkota | 8 | 15 | 40 | 100 | false | false | #8B0000 |
| Keris | Traditional Dagger | keris | 5 | 20 | 60 | 150 | true | false | #1a5c1a |
| Tudong Saji | Decorative Cover | tudong_saji | 18 | 8 | 20 | 50 | false | false | #5a3010 |
| Perahu Brunei | Bruneian Boat | perahu_brunei | 22 | 5 | 15 | 30 | false | false | #1a4a6e |
| Bunga Raya | Hibiscus | bunga_raya | 30 | 3 | 8 | 20 | false | false | #cc2244 |
| Limau | Citrus Fruit | limau | 32 | 2 | 6 | 15 | false | false | #7a9e1a |
| Bintang | Star (Scatter) | bintang | 6 | 0 | 0 | 0 | false | true | #F7E017 |
| Kosong | Blank | kosong | 20 | 0 | 0 | 0 | false | false | #444444 |

---

### 2. `game_config`

| Field | Type | Notes |
|---|---|---|
| config_key | text, required, unique | Identifier |
| config_value | text, required | Always stored as string, parsed to correct type on read |
| description_ms | text | Malay description |
| description_en | text | English description |
| value_type | text | "number", "boolean", or "string" |
| category | text | "betting", "gameplay", "bonus", "limits" |

**Seed data:**

| config_key | config_value | description_ms | description_en | value_type | category |
|---|---|---|---|---|---|
| min_bet | 1 | Pertaruhan minimum setiap putaran | Minimum bet per spin | number | betting |
| max_bet | 100 | Pertaruhan maksimum setiap putaran | Maximum bet per spin | number | betting |
| default_bet | 5 | Pertaruhan lalai permulaan | Default starting bet | number | betting |
| num_reels | 5 | Bilangan gelendong | Number of reels | number | gameplay |
| num_rows | 3 | Bilangan baris yang kelihatan | Number of visible rows per reel | number | gameplay |
| starting_credits | 1000 | Kredit diberi kepada pemain baru | Credits given to new players | number | betting |
| scatter_trigger_count | 3 | Bilangan bintang untuk pencetus bonus | Scatters needed to trigger bonus | number | bonus |
| bonus_spin_count | 10 | Bilangan pusingan percuma diberikan | Free spins awarded on bonus trigger | number | bonus |
| house_edge_target | 5 | Sasaran tepi rumah dalam peratus | Target house edge percentage | number | limits |
| max_win_multiplier | 1000 | Had menang maksimum (gandaan) | Maximum win cap as a bet multiplier | number | limits |
| currency_code | BND | Kod mata wang | Currency code | string | gameplay |
| currency_symbol | B$ | Simbol mata wang | Currency symbol displayed in app | string | gameplay |
| game_name | Mestika | Nama permainan | Game name | string | gameplay |
| timezone | Asia/Brunei | Zon masa | Game server timezone | string | gameplay |

---

### 3. `players`

| Field | Type | Notes |
|---|---|---|
| player_id | text, required, unique | UUID generated on creation |
| display_name | text | Optional player alias |
| credits | number, default 1000 | Current B$ credit balance |
| total_spins | number, default 0 | |
| total_wagered | number, default 0 | Lifetime B$ wagered |
| total_won | number, default 0 | Lifetime B$ won |
| biggest_win | number, default 0 | Single spin record win in B$ |
| bonus_spins_remaining | number, default 0 | Active free spins balance |
| total_bonus_spins_used | number, default 0 | |
| created_at | datetime, auto | |
| last_active | datetime, auto-update | Updated on every spin |
| is_active | boolean, default true | |
| registration_ip | text | Optional, for fraud detection |

---

### 4. `spin_history`

| Field | Type | Notes |
|---|---|---|
| spin_id | text, unique, auto UUID | |
| player_id | text, required | Reference to players.player_id |
| bet_amount | number, required | B$ bet for this spin |
| reel_grid | text | JSON string: 3×5 array of symbol_keys |
| winning_lines | text | JSON array of winning line objects |
| scatter_positions | text | JSON array of [row,col] positions where scatters landed |
| payout_amount | number, default 0 | Total B$ won this spin |
| win_multiplier | number, default 0 | Effective multiplier (payout / bet) |
| is_bonus_spin | boolean, default false | Was this a free spin? |
| bonus_triggered | boolean, default false | Did this spin trigger the bonus round? |
| rtp_snapshot | number | Player's cumulative RTP % at time of this spin |
| credits_before | number | |
| credits_after | number | |
| spin_duration_ms | number | Server processing time in milliseconds |
| created_at | datetime, auto | Stored in UTC, displayed in BNT (UTC+8) |

**reel_grid format:**
```json
[
  ["bunga_raya","limau","mahkota","keris","kosong"],
  ["limau","bunga_emas","limau","perahu_brunei","tudong_saji"],
  ["mahkota","limau","bunga_raya","limau","mahkota"]
]
```

**winning_lines format:**
```json
[{"line":1,"symbols":["limau","limau","limau"],"count":3,"multiplier":2,"payout":10}]
```

---

## ACTIONS (Server-side Functions)

### Action 1: `POST /spin`

**Purpose:** Core spin resolver. All outcome logic runs server-side. The client only receives the result — never the RNG state or probability weights.

**Input:**
```json
{
  "player_id": "string (required)",
  "bet_amount": "number (required)",
  "is_bonus_spin": "boolean (optional, default false)"
}
```

**Full logic:**

**STEP 1 — Validate player**
- Fetch player by player_id.
- If not found: return `{ success: false, error: "Pemain tidak dijumpai", error_en: "Player not found" }`
- If is_active = false: return `{ success: false, error: "Akaun tidak aktif", error_en: "Account inactive" }`

**STEP 2 — Validate bet**
- Fetch min_bet and max_bet from game_config.
- If is_bonus_spin = true: set bet_amount = 0 (free spin, no cost). Skip credit check.
- Else:
  - If bet_amount < min_bet or bet_amount > max_bet: return `{ success: false, error: "Jumlah pertaruhan tidak sah", error_en: "Invalid bet amount" }`
  - If player.credits < bet_amount: return `{ success: false, error: "Kredit tidak mencukupi", error_en: "Insufficient credits" }`

**STEP 3 — Deduct bet immediately (before spin resolves)**
- If not bonus spin: `player.credits = player.credits - bet_amount`. Save player.
- Record `credits_before = player.credits + bet_amount`

**STEP 4 — Build weighted symbol pool**
- Fetch all symbols from probability_config where is_active = true.
- Build pool array: for each symbol, push symbol_key into pool repeated `weight` times.
- `total_weight = sum of all active symbol weights`

**STEP 5 — Generate reel grid (3 rows × 5 reels = 15 cells)**
- For each reel (0–4), for each row (0–2):
  - Pick `Math.floor(Math.random() * pool.length)`
  - `reel_grid[row][reel] = pool[random_index]`

**STEP 6 — Resolve paylines**

Evaluate these 5 paylines using `reel_grid[row][reel]` notation:

| Line | Positions |
|---|---|
| Line 1 — Middle row | [1][0], [1][1], [1][2], [1][3], [1][4] |
| Line 2 — Top row | [0][0], [0][1], [0][2], [0][3], [0][4] |
| Line 3 — Bottom row | [2][0], [2][1], [2][2], [2][3], [2][4] |
| Line 4 — Diagonal down | [0][0], [1][1], [2][2], [1][3], [0][4] |
| Line 5 — Diagonal up | [2][0], [1][1], [0][2], [1][3], [2][4] |

For each payline:
- `base_symbol = positions[0]` (leftmost anchor)
- If base_symbol is `keris` (wild): use first non-wild, non-kosong symbol as base
- If base_symbol is `kosong`: line pays 0, skip
- If base_symbol is `bintang` (scatter): scatters don't pay on lines, skip
- Count consecutive matches from left (wilds count as matches)
- If count >= 3: fetch payout multiplier (3x/4x/5x), calculate `line_payout = bet_amount * multiplier`

**STEP 7 — Tally total payout**
- `total_payout = sum of all winning line payouts`
- Fetch max_win_multiplier from game_config
- `total_payout = Math.min(total_payout, bet_amount * max_win_multiplier)`
- `win_multiplier = bet_amount > 0 ? total_payout / bet_amount : 0`

**STEP 8 — Check for scatter bonus**
- Count all cells where symbol_key == "bintang"
- Record scatter_positions = [[row,col], ...]
- If bintang_count >= scatter_trigger_count AND is_bonus_spin = false:
  - `bonus_triggered = true`
  - `player.bonus_spins_remaining += bonus_spin_count`

**STEP 9 — Update player stats**
- `player.credits += total_payout`
- `player.total_spins += 1`
- `player.total_wagered += bet_amount`
- `player.total_won += total_payout`
- If `total_payout > player.biggest_win`: update biggest_win
- If is_bonus_spin: `player.bonus_spins_remaining -= 1`, `player.total_bonus_spins_used += 1`
- `player.last_active = now()`
- Save player.

**STEP 10 — Compute RTP snapshot**
- `rtp_snapshot = player.total_wagered > 0 ? (player.total_won / player.total_wagered) * 100 : 0`

**STEP 11 — Log to spin_history**
- Create record with all fields. Store reel_grid, winning_lines, scatter_positions as JSON strings.
- `spin_duration_ms = Date.now() - request_start_time`

**STEP 12 — Return response:**
```json
{
  "success": true,
  "reel_grid": [["..."]],
  "winning_lines": [{"line": 1, "symbols": ["..."], "count": 3, "multiplier": 2, "payout": 10}],
  "scatter_positions": [[0,2],[1,4]],
  "payout_amount": 0,
  "win_multiplier": 0,
  "bonus_triggered": false,
  "bonus_spins_remaining": 0,
  "credits_before": 0,
  "credits_after": 0,
  "player_rtp": 0,
  "currency": "B$"
}
```

---

### Action 2: `POST /player/create`

**Purpose:** Register a new player and issue starting credits.

**Input:**
```json
{
  "display_name": "string (optional)",
  "registration_ip": "string (optional)"
}
```

**Logic:**
1. Generate UUID for player_id.
2. Fetch starting_credits from game_config.
3. Create player record.

**Return:**
```json
{
  "success": true,
  "player_id": "...",
  "display_name": "...",
  "credits": 1000,
  "currency": "B$",
  "message_ms": "Selamat datang ke Mestika!",
  "message_en": "Welcome to Mestika!"
}
```

---

### Action 3: `GET /player/:player_id`

**Purpose:** Fetch full player state. Called on app launch and resume.

**Return:** Full player object plus:
- `"currency": "B$"`
- `"has_bonus_spins": true/false`
- `"personal_rtp": (total_won / total_wagered * 100) or 0`

---

### Action 4: `GET /game/config`

**Purpose:** Return all config values and active symbol definitions for the Android app on startup.

> **Important:** Do NOT return `weight` values to the client. Weights are server-only.

**Return:**
```json
{
  "config": {
    "min_bet": 1,
    "max_bet": 100,
    "default_bet": 5,
    "num_reels": 5,
    "num_rows": 3,
    "currency_code": "BND",
    "currency_symbol": "B$",
    "game_name": "Mestika",
    "timezone": "Asia/Brunei"
  },
  "symbols": [
    {
      "symbol_key": "bunga_emas",
      "symbol_name": "Bunga Emas",
      "symbol_name_en": "Golden Flower",
      "payout_3x": 50,
      "payout_4x": 200,
      "payout_5x": 1000,
      "is_wild": false,
      "is_scatter": false,
      "color_hex": "#C9A84C",
      "sort_order": 1
    }
  ]
}
```

---

### Action 5: `GET /admin/stats`

**Purpose:** Live dashboard statistics for the admin panel.

**Logic:**
1. Count total active players
2. Sum total_spins, total_wagered, total_won across all players
3. `actual_rtp = (total_won / total_wagered) * 100` if total_wagered > 0, else 0
4. `house_edge_actual = 100 - actual_rtp`
5. Count spin_history records created in last 24 hours
6. Find `max(biggest_win)` across all players
7. Count spin_history records where bonus_triggered = true (all time)

**Return:**
```json
{
  "total_players": 0,
  "total_spins": 0,
  "total_wagered": 0,
  "total_won": 0,
  "actual_rtp": 0,
  "house_edge_actual": 0,
  "spins_last_24h": 0,
  "biggest_win_ever": 0,
  "total_bonus_triggers": 0,
  "currency": "B$"
}
```

---

### Action 6: `POST /admin/probability/update`

**Purpose:** Bulk update symbol weights and payouts. Takes effect immediately on next spin.

**Input:**
```json
[
  {
    "symbol_key": "bunga_emas",
    "weight": 2,
    "payout_3x": 50,
    "payout_4x": 200,
    "payout_5x": 1000,
    "is_active": true
  }
]
```

**Logic:**
1. For each item, find symbol by symbol_key. Update weight, payout fields, and is_active.
2. Compute theoretical RTP estimate:
   - `total_weight = sum of weights for all active non-kosong, non-scatter symbols`
   - For each active symbol (exclude kosong and bintang):
     - `p = weight / total_weight`
     - `contribution = p * (payout_3x * 0.010 + payout_4x * 0.002 + payout_5x * 0.0004) * 5`
     - `theoretical_rtp += contribution * 100`
   - Cap display at 99.9%

**Return:**
```json
{
  "success": true,
  "updated_count": 9,
  "theoretical_rtp": 94.5,
  "house_edge_estimate": 5.5,
  "message_ms": "Kebarangkalian berjaya dikemas kini.",
  "message_en": "Probabilities updated successfully."
}
```

---

### Action 7: `POST /admin/config/update`

**Purpose:** Update a single game config value.

**Input:** `{ "config_key": "min_bet", "config_value": "2" }`

**Validation rules:**
- If config_key is `max_bet`: ensure new max_bet > current min_bet
- If config_key is `min_bet`: ensure new min_bet < current max_bet
- If config_key is `house_edge_target`: value must be between 1 and 25

**Return:** `{ "success": true, "config_key": "...", "new_value": "..." }`

---

### Action 8: `POST /admin/player/add-credits`

**Purpose:** Admin manually adds credits to a player's account.

**Input:** `{ "player_id": "...", "amount": 500, "reason": "Manual top-up by admin" }`

**Return:** `{ "success": true, "player_id": "...", "credits_added": 500, "new_balance": 1500, "currency": "B$" }`

---

### Action 9: `POST /admin/player/deactivate`

**Purpose:** Deactivate a player account.

**Input:** `{ "player_id": "..." }`

**Return:**
```json
{
  "success": true,
  "player_id": "...",
  "message_ms": "Akaun telah dinyahaktifkan.",
  "message_en": "Account deactivated."
}
```

---

### Action 10: `GET /admin/spin-history`

**Purpose:** Paginated spin history for admin panel with filters.

**Query parameters:**

| Parameter | Type | Notes |
|---|---|---|
| player_id | string, optional | Filter by player |
| date_from | string, optional | ISO date string |
| date_to | string, optional | ISO date string |
| wins_only | boolean, optional | Filter payout_amount > 0 |
| bonus_only | boolean, optional | Filter is_bonus_spin = true |
| page | number, default 1 | |
| per_page | number, default 50, max 200 | |

**Return:**
```json
{
  "spins": [],
  "total_count": 0,
  "page": 1,
  "per_page": 50,
  "total_pages": 1
}
```

> All `created_at` values returned in BNT (UTC+8).

---

## Security Rules

- All routes under `/admin/*` require header: `x-admin-key` matching a stored secret
- All `/spin` requests validate player_id server-side — never trust client-supplied outcome data
- Probability `weight` values must **never** be returned to `/game/config` or any non-admin endpoint
- The reel grid is generated entirely server-side — the client has no input into the RNG
- bet_amount is validated against game_config min/max on every spin — client-supplied values are not trusted
- Bonus spin consumption is tracked server-side via `bonus_spins_remaining` — client cannot claim free spins not earned

---

## Localisation Rules

- All error messages include both a Malay key (`error`) and English key (`error_en`)
- All success messages include both `message_ms` and `message_en`
- All datetime values stored in UTC, returned in Brunei Standard Time (UTC+8) in admin endpoints
- Currency in all responses: include `"currency": "B$"` field
- Game name: always **"Mestika"** — never just "slot game"
