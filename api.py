from datetime import datetime, timezone, timedelta
import uuid
import json
import math
import random
from models import ProbabilityConfig, GameConfig, Player, SpinHistory, db # Assuming models.py is in the same directory

# --- Global Constants and Configuration ---
NUM_REELS = 6
NUM_ROWS = 3
DEFAULT_PAYLINE_COUNT = 5

# --- Helper Functions ---

def parse_config_value(config_item):
    if not config_item: return None
    if config_item.value_type == "number":
        try: return float(config_item.config_value)
        except ValueError: return 0.0
    elif config_item.value_type == "boolean":
        return config_item.config_value.lower() in ("true", "1", "t", "y", "yes")
    else: return config_item.config_value

def get_config_value(key, default=None):
    config_item = db.get_game_config(key)
    if not config_item: return default
    return parse_config_value(config_item)

def format_currency(amount, symbol=None):
    if symbol is None: symbol = get_config_value("currency_symbol", "B$")
    return f"{symbol}{amount:,.2f}"

def convert_to_brunei_time(dt_utc):
    brunei_tz = timezone(timedelta(hours=8))
    if dt_utc.tzinfo is None or dt_utc.tzinfo.utcoffset(dt_utc) is None:
        dt_utc = dt_utc.replace(tzinfo=timezone.utc)
    return dt_utc.astimezone(brunei_tz)

def get_all_active_symbols():
    active_symbols = db.get_probability_config(is_active=True)
    active_symbols.sort(key=lambda s: s.sort_order)
    return active_symbols

def calculate_total_weight(symbols):
    return sum(s.weight for s in symbols)

def calculate_theoretical_rtp(active_symbols, total_weight, bet_amount_for_scale=1):
    theoretical_rtp = 0.0
    if total_weight == 0: return 0.0
    
    for symbol in active_symbols:
        if symbol.symbol_key == "kosong" or symbol.is_scatter: continue
        
        p = symbol.weight / total_weight
        contribution = p * (symbol.payout_3x * 0.010 + symbol.payout_4x * 0.002 + symbol.payout_5x * 0.0004)
        theoretical_rtp += contribution
        
    return (theoretical_rtp * 100)

def get_symbol_data_map(symbols):
    return {s.symbol_key: s for s in symbols}

def get_wild_symbol_key(symbols):
    for s in symbols:
        if s.is_wild: return s.symbol_key
    return None

def get_scatter_symbol_key(symbols):
    for s in symbols:
        if s.is_scatter: return s.symbol_key
    return None

# --- API Endpoints ---

# Action 4: GET /game/config
def get_game_config_api():
    configs = db.get_game_config()
    active_symbols = get_all_active_symbols()
    
    filtered_symbols = []
    for s in active_symbols:
        filtered_symbols.append({
            "symbol_key": s.symbol_key, "symbol_name": s.symbol_name, "symbol_name_en": s.symbol_name_en,
            "payout_3x": s.payout_3x, "payout_4x": s.payout_4x, "payout_5x": s.payout_5x,
            "is_wild": s.is_wild, "is_scatter": s.is_scatter, "color_hex": s.color_hex, "sort_order": s.sort_order
        })
        
    return {
        "success": True,
        "config": {c.config_key: parse_config_value(c) for c in configs},
        "symbols": filtered_symbols
    }

# Action 2: POST /player/create
def create_player_api(display_name=None, registration_ip=None):
    try:
        new_player = db.create_player({"display_name": display_name, "registration_ip": registration_ip})
        starting_credits = get_config_value("starting_credits", 1000)
        new_player.credits = starting_credits
        db.update_player(new_player.player_id, new_player.to_dict())
        
        return {
            "success": True,
            "player_id": new_player.player_id, "display_name": new_player.display_name,
            "credits": new_player.credits, "currency": get_config_value("currency_symbol", "B$"),
            "message_ms": "Selamat datang ke Mestika!", "message_en": "Welcome to Mestika!"
        }
    except Exception as e:
        return {"success": False, "error": str(e), "error_en": "Failed to create player."}

# Action 3: GET /player/:player_id
def get_player_api(player_id):
    player = db.get_player(player_id)
    if not player:
        return {"success": False, "error": "Pemain tidak dijumpai", "error_en": "Player not found"}
    
    personal_rtp = 0.0
    if player.total_wagered > 0:
        personal_rtp = (player.total_won / player.total_wagered) * 100

    return {
        "success": True,
        "player_id": player.player_id, "display_name": player.display_name,
        "credits": player.credits, "total_spins": player.total_spins,
        "total_wagered": player.total_wagered, "total_won": player.total_won,
        "biggest_win": player.biggest_win, "bonus_spins_remaining": player.bonus_spins_remaining,
        "has_bonus_spins": player.bonus_spins_remaining > 0, "personal_rtp": round(personal_rtp, 2),
        "currency": get_config_value("currency_symbol", "B$"),
        "last_active": convert_to_brunei_time(player.last_active).isoformat(),
        "is_active": player.is_active
    }

# Action 1: POST /spin
def spin_api(player_id, bet_amount, is_bonus_spin=False):
    player = db.get_player(player_id)
    if not player: return {"success": False, "error": "Pemain tidak dijumpai", "error_en": "Player not found"}
    if not player.is_active: return {"success": False, "error": "Akaun tidak aktif", "error_en": "Account inactive"}

    min_bet = get_config_value("min_bet", 1)
    max_bet = get_config_value("max_bet", 100)
    currency_symbol = get_config_value("currency_symbol", "B$")
    
    effective_bet_amount = bet_amount
    if is_bonus_spin:
        effective_bet_amount = 0
    else:
        if not (min_bet <= bet_amount <= max_bet):
            return {"success": False, "error": "Jumlah pertaruhan tidak sah", "error_en": "Invalid bet amount"}
        if player.credits < bet_amount:
            return {"success": False, "error": "Kredit tidak mencukupi", "error_en": "Insufficient credits"}

    credits_before = player.credits
    if not is_bonus_spin: player.credits -= bet_amount
    
    active_symbols = get_all_active_symbols()
    symbol_data_map = get_symbol_data_map(active_symbols)
    wild_symbol_key = get_wild_symbol_key(active_symbols)
    scatter_symbol_key = get_scatter_symbol_key(active_symbols)

    symbol_pool = []
    for symbol in active_symbols:
        if symbol.symbol_key != "kosong":
            symbol_pool.extend([symbol.symbol_key] * symbol.weight)
    
    total_weight = len(symbol_pool)
    if total_weight == 0: return {"success": False, "error": "Tiada simbol aktif untuk putaran", "error_en": "No active symbols for spin"}

    # Generate reel grid (3 rows x 6 reels)
    reel_grid = [[None for _ in range(NUM_REELS)] for _ in range(NUM_ROWS)]
    for r in range(NUM_ROWS):
        for c in range(NUM_REELS):
            random_index = math.floor(random.random() * total_weight)
            reel_grid[r][c] = symbol_pool[random_index]

    # --- Resolve Paylines & Tally Payout ---
    winning_lines_data = []
    total_payout = 0.0
    max_win_multiplier_config = get_config_value("max_win_multiplier", 1000)
    
    # Define Paylines for 3x6 grid (adapting prompt's 5 lines logic)
    payline_configs = [
        {"line": 1, "type": "horizontal_middle", "cells": [(1, c) for c in range(NUM_REELS)]},
        {"line": 2, "type": "horizontal_top", "cells": [(0, c) for c in range(NUM_REELS)]},
        {"line": 3, "type": "horizontal_bottom", "cells": [(2, c) for c in range(NUM_REELS)]},
        # Diagonal lines adapted for 6 reels (example patterns)
        {"line": 4, "type": "diagonal_down", "cells": [(0, 0), (1, 1), (2, 2), (1, 3), (0, 4), (1, 5)]},
        {"line": 5, "type": "diagonal_up", "cells": [(2, 0), (1, 1), (0, 2), (1, 3), (2, 4), (1, 5)]},
    ]

    symbol_payouts = {}
    for s in active_symbols:
        symbol_payouts[s.symbol_key] = {
            3: s.payout_3x, 4: s.payout_4x, 5: s.payout_5x
        }

    # Resolve Paylines
    for config in payline_configs:
        line_symbols_on_grid = []
        base_symbol_key = None
        
        first_cell_row, first_cell_col = config["cells"][0]
        if 0 <= first_cell_row < NUM_ROWS and 0 <= first_cell_col < NUM_REELS:
            base_symbol_key = reel_grid[first_cell_row][first_cell_col]
        
        if not base_symbol_key or base_symbol_key == "kosong": continue

        if base_symbol_key == wild_symbol_key:
            for r, c in config["cells"]:
                symbol = reel_grid[r][c]
                if symbol and symbol != "kosong" and symbol != wild_symbol_key:
                    base_symbol_key = symbol
                    break
            else: continue

        match_count = 0
        for r, c in config["cells"]:
            if 0 <= r < NUM_ROWS and 0 <= c < NUM_REELS:
                symbol_on_reel = reel_grid[r][c]
                if symbol_on_reel == base_symbol_key or symbol_on_reel == wild_symbol_key:
                    match_count += 1
                    line_symbols_on_grid.append(symbol_on_reel)
                else: break
            else: break

        if match_count >= 3:
            payout_info = symbol_payouts.get(base_symbol_key)
            if payout_info:
                multiplier = 0
                if match_count >= 5 and payout_info.get(5) is not None: multiplier = payout_info[5]
                elif match_count == 4 and payout_info.get(4) is not None: multiplier = payout_info[4]
                elif match_count == 3 and payout_info.get(3) is not None: multiplier = payout_info[3]
                
                if multiplier > 0:
                    line_payout = effective_bet_amount * multiplier
                    winning_lines_data.append({
                        "line": config["line"],
                        "symbols_on_line": line_symbols_on_grid,
                        "match_count": match_count,
                        "multiplier_per_symbol": multiplier,
                        "payout": line_payout
                    })
                    total_payout += line_payout
    
    # Apply max win multiplier cap
    max_win_multiplier_val = get_config_value("max_win_multiplier", 1000)
    total_payout = min(total_payout, effective_bet_amount * max_win_multiplier_val)
    
    win_multiplier_display = 0.0
    if effective_bet_amount > 0:
        win_multiplier_display = total_payout / effective_bet_amount

    # --- Check for Scatter Bonus ---
    scatter_positions = []
    if scatter_symbol_key:
        for r in range(NUM_ROWS):
            for c in range(NUM_REELS):
                if reel_grid[r][c] == scatter_symbol_key:
                    scatter_positions.append([r, c])

    bonus_triggered = False
    scatter_trigger_count = int(get_config_value("scatter_trigger_count", 3))
    bonus_spin_count = int(get_config_value("bonus_spin_count", 10))
    
    if len(scatter_positions) >= scatter_trigger_count and not is_bonus_spin:
        bonus_triggered = True
        player.bonus_spins_remaining += bonus_spin_count

    # --- Update Player Stats ---
    credits_after = player.credits
    
    if not is_bonus_spin:
        player.total_wagered += bet_amount
        player.credits -= bet_amount # Deduct bet only for non-free spins
    player.total_won += total_payout
    player.total_spins += 1
    player.biggest_win = max(player.biggest_win, total_payout)
    
    if is_bonus_spin:
        player.bonus_spins_remaining -= 1
        player.total_bonus_spins_used += 1
    
    credits_after = player.credits + total_payout # Final credits after wins
    player.last_active = datetime.utcnow()
    db.update_player(player_id, player.to_dict())

    # --- Compute RTP Snapshot ---
    total_wagered_player = player.total_wagered
    total_won_player = player.total_won
    rtp_snapshot = 0.0
    if total_wagered_player > 0:
        rtp_snapshot = (total_won_player / total_wagered_player) * 100
    
    # --- Log to Spin History ---
    spin_record = SpinHistory(
        player_id=player_id,
        bet_amount=bet_amount if not is_bonus_spin else 0,
        reel_grid=reel_grid, winning_lines=winning_lines_data,
        scatter_positions=scatter_positions, payout_amount=total_payout,
        win_multiplier=win_multiplier_display, is_bonus_spin=is_bonus_spin,
        bonus_triggered=bonus_triggered, rtp_snapshot=rtp_snapshot,
        credits_before=credits_before, credits_after=credits_after,
        spin_duration_ms=100 # Placeholder
    )
    db.add_spin_history(spin_record)

    # --- Return Response ---
    return {
        "success": True,
        "reel_grid": reel_grid, "winning_lines": winning_lines_data,
        "scatter_positions": scatter_positions, "payout_amount": total_payout,
        "win_multiplier": win_multiplier_display, "bonus_triggered": bonus_triggered,
        "bonus_spins_remaining": player.bonus_spins_remaining,
        "credits_before": credits_before, "credits_after": credits_after,
        "player_rtp": round(rtp_snapshot, 2), "currency": currency_symbol
    }

# --- Admin Actions ---

# Action 5: GET /admin/stats
def get_admin_stats_api():
    active_symbols = get_all_active_symbols()
    total_weight = calculate_total_weight(active_symbols)
    theoretical_rtp_pct = calculate_theoretical_rtp(active_symbols, total_weight)
    house_edge_target = get_config_value("house_edge_target", 5)

    total_players = len(db.players)
    total_spins = sum(p.total_spins for p in db.players.values())
    total_wagered = sum(p.total_wagered for p in db.players.values())
    total_won = sum(p.total_won for p in db.players.values())
    
    actual_rtp = 0.0
    if total_wagered > 0: actual_rtp = (total_won / total_wagered) * 100
    house_edge_actual = 100 - actual_rtp
    
    biggest_win_ever = 0.0
    if db.players:
        all_biggest_wins = [p.biggest_win for p in db.players.values() if p.biggest_win is not None]
        if all_biggest_wins: biggest_win_ever = max(all_biggest_wins)

    now_utc = datetime.utcnow()
    yesterday_utc = now_utc - timedelta(hours=24)
    spins_last_24h = len([s for s in db.spin_histories if s.created_at.replace(tzinfo=timezone.utc) >= yesterday_utc])
    total_bonus_triggers = sum(s.bonus_triggered for s in db.spin_histories)

    return {
        "success": True,
        "total_players": total_players, "total_spins": total_spins,
        "total_wagered": total_wagered, "total_won": total_won,
        "actual_rtp": round(actual_rtp, 2), "house_edge_actual": round(house_edge_actual, 2),
        "spins_last_24h": spins_last_24h, "biggest_win_ever": biggest_win_ever,
        "total_bonus_triggers": total_bonus_triggers,
        "currency": get_config_value("currency_symbol", "B$")
    }

# Action 6: POST /admin/probability/update
def update_probability_api(updates_list):
    updated_count = 0
    symbols_to_recalc = set()

    for update in updates_list:
        symbol_key = update.get("symbol_key")
        if not symbol_key: continue

        symbol_item = db.get_probability_config(symbol_key=symbol_key)
        if not symbol_item: continue

        symbol_updates = {}
        if "weight" in update: 
            symbol_updates["weight"] = int(update["weight"])
            symbols_to_recalc.add(symbol_key)
        if "payout_3x" in update: 
            symbol_updates["payout_3x"] = float(update["payout_3x"])
            symbols_to_recalc.add(symbol_key)
        if "payout_4x" in update: 
            symbol_updates["payout_4x"] = float(update["payout_4x"])
            symbols_to_recalc.add(symbol_key)
        if "payout_5x" in update: 
            symbol_updates["payout_5x"] = float(update["payout_5x"])
            symbols_to_recalc.add(symbol_key)
        if "is_active" in update: 
            symbol_updates["is_active"] = bool(update["is_active"])
            symbols_to_recalc.add(symbol_key)

        for key, value in symbol_updates.items():
            setattr(symbol_item, key, value)
        
        updated_count += 1

    active_symbols = db.get_probability_config(is_active=True)
    total_weight = calculate_total_weight(active_symbols)
    new_theoretical_rtp = calculate_theoretical_rtp(active_symbols, total_weight)

    return {
        "success": True,
        "updated_count": updated_count,
        "theoretical_rtp": round(new_theoretical_rtp, 1),
        "house_edge_estimate": round(100 - new_theoretical_rtp, 1),
        "message_ms": "Kebarangkalian berjaya dikemas kini.", "message_en": "Probabilities updated successfully."
    }

# Action 7: POST /admin/config/update
def update_game_config_api(updates):
    validation_errors = []
    updated_keys = []

    for key, value_str in updates.items():
        config_item = db.get_game_config(key)
        if not config_item:
            validation_errors.append(f"Unknown config key: {key}")
            continue

        try:
            if config_item.value_type == "number": value = float(value_str)
            elif config_item.value_type == "boolean": value = bool(value_str)
            else: value = str(value_str)
        except ValueError:
            validation_errors.append(f"Invalid value type for {key}. Expected {config_item.value_type}.")
            continue

        if key == "max_bet":
            min_bet_val = get_config_value("min_bet", 1)
            if value <= min_bet_val: validation_errors.append(f"Max bet ({value}) must be greater than min bet ({min_bet_val}).")
        elif key == "min_bet":
            max_bet_val = get_config_value("max_bet", 100)
            if value >= max_bet_val: validation_errors.append(f"Min bet ({value}) must be less than max bet ({max_bet_val}).")
        elif key == "house_edge_target":
            if not (1 <= value <= 25): validation_errors.append(f"House edge target ({value}) must be between 1 and 25.")

        if validation_errors and key in validation_errors[-1]: continue

        db.update_game_config(key, value)
        updated_keys.append(key)

    if validation_errors: return {"success": False, "errors": validation_errors}
    else: return {"success": True, "updated_configs": updated_keys}

# Action 8: POST /admin/player/add-credits
def add_credits_to_player_api(player_id, amount, reason=None):
    player = db.get_player(player_id)
    if not player: return {"success": False, "error": "Player not found", "error_en": "Pemain tidak dijumpai"}
    
    currency_symbol = get_config_value("currency_symbol", "B$")
    try: amount = float(amount)
    except ValueError: return {"success": False, "error": "Invalid amount format", "error_en": "Format jumlah tidak sah"}
    if amount <= 0: return {"success": False, "error": "Amount must be positive", "error_en": "Jumlah mesti positif"}
    
    original_credits = player.credits
    player.credits += amount
    db.update_player(player_id, player.to_dict())
    
    return {
        "success": True,
        "player_id": player_id, "credits_added": amount,
        "new_balance": player.credits, "original_balance": original_credits,
        "currency": currency_symbol, "reason": reason
    }

# Action 9: POST /admin/player/deactivate
def deactivate_player_api(player_id):
    player = db.get_player(player_id)
    if not player: return {"success": False, "error": "Player not found", "error_en": "Pemain tidak dijumpai"}
    
    player.is_active = False
    db.update_player(player_id, player.to_dict())

    return {
        "success": True,
        "player_id": player_id,
        "message_ms": "Akaun telah dinyahaktifkan.", "message_en": "Account deactivated."
    }

# Action 10: GET /admin/spin-history
def get_spin_history_api(filters=None):
    spin_histories = db.get_spin_history(filters=filters)
    
    formatted_spins = []
    for s in spin_histories:
        spin_data = s.to_dict()
        spin_data["created_at_bnt"] = convert_to_brunei_time(s.created_at).isoformat()
        spin_data["player_id_short"] = s.player_id[:8] + "..." if s.player_id else ""
        spin_data["spin_id_short"] = s.spin_id[:8] + "..." if s.spin_id else ""
        spin_data["bet_amount_formatted"] = format_currency(s.bet_amount)
        spin_data["payout_amount_formatted"] = format_currency(s.payout_amount)
        spin_data["credits_before_formatted"] = format_currency(s.credits_before)
        spin_data["credits_after_formatted"] = format_currency(s.credits_after)
        
        formatted_spins.append(spin_data)

    page = filters.get("page", 1)
    per_page = filters.get("per_page", 50)
    start_index = (page - 1) * per_page
    end_index = start_index + per_page
    paginated_spins = formatted_spins[start_index:end_index]

    return {
        "success": True,
        "spins": paginated_spins,
        "total_count": len(formatted_spins),
        "page": page,
        "per_page": per_page,
        "total_pages": math.ceil(len(formatted_spins) / per_page) if per_page > 0 else 1
    }

# --- Admin Key Check (for middleware) ---
def check_admin_key(api_key):
    return api_key == "your-admin-key-here"

# --- Mock DB Initialization ---
if not hasattr(db, 'initialized') or not db.initialized:
    db.probability_configs = {item.symbol_key: item for item in db.probability_seed_data}
    db.game_configs = {item.config_key: item for item in db.game_config_seed_data}
    db.players = {}
    db.spin_histories = []
    db.initialized = True
    print("Mock DB initialized with seed data.")

# --- Placeholder for Promotion/Bonus Deployment ---
# No specific API endpoints were detailed for "pushing promotions" or "deploying bonuses" beyond config settings.
# These might involve creating special events, applying temporary multipliers, or awarding free spins directly.
# For now, the existing config (`bonus_spin_count`, `scatter_trigger_count`) and player credit adjustments
# cover basic bonus/promotion mechanisms. New endpoints would be needed for more advanced features.

# --- Example Usage for Testing (if run as script) ---
if __name__ == '__main__':
    print("--- Testing Backend API Simulation ---")

    # Test GET /game/config
    game_config_data = get_game_config_api()
    print("\nGET /game/config:")
    print(f"Game Name: {game_config_data['config']['game_name']}, Reels: {game_config_data['config']['num_reels']}, Rows: {game_config_data['config']['num_rows']}")
    print(f"Symbols (first 3 active): {game_config_data['symbols'][:3]}")

    # Test POST /player/create
    player_response = create_player_api(display_name="Geng Mesti", registration_ip="192.168.1.100")
    print("\nPOST /player/create:")
    print(player_response)
    test_player_id = player_response.get("player_id")

    # Test GET /player/:player_id
    if test_player_id:
        player_data = get_player_api(test_player_id)
        print(f"\nGET /player/{test_player_id}:")
        print(player_data)

        # Test POST /spin (non-bonus)
        print("\nPOST /spin (non-bonus bet 5):")
        spin_response_non_bonus = spin_api(player_id=test_player_id, bet_amount=5)
        print(spin_response_non_bonus)
        
        # Test POST /spin (bonus spin)
        test_player_for_bonus = db.get_player(test_player_id)
        if test_player_for_bonus:
            test_player_for_bonus.bonus_spins_remaining = 2
            db.update_player(test_player_id, test_player_for_bonus.to_dict())
            
            print("\nPOST /spin (bonus spin):")
            spin_response_bonus = spin_api(player_id=test_player_id, is_bonus_spin=True)
            print(spin_response_bonus)

    # Test Admin Actions
    print("\n--- Testing Admin Actions ---")
    admin_key = "your-admin-key-here"

    # Test GET /admin/stats
    if check_admin_key(admin_key):
        admin_stats = get_admin_stats_api()
        print("\nGET /admin/stats:")
        print(admin_stats)

    # Test POST /admin/config/update
    if check_admin_key(admin_key):
        update_config_resp = update_game_config_api({"min_bet": "2", "max_bet": "200"})
        print("\nPOST /admin/config/update (min_bet, max_bet):")
        print(update_config_resp)
        
        invalid_config_update = update_game_config_api({"min_bet": "250"}) # max_bet is 200
        print("POST /admin/config/update (validation fail):")
        print(invalid_config_update)
        
        invalid_house_edge = update_game_config_api({"house_edge_target": "30"})
        print("POST /admin/config/update (house_edge_target validation fail):")
        print(invalid_house_edge)

    # Test POST /admin/probability/update
    if check_admin_key(admin_key):
        prob_updates = [
            {"symbol_key": "bunga_emas", "weight": 5, "payout_3x": 60, "is_active": True},
            {"symbol_key": "limau", "weight": 40, "payout_5x": 25, "is_active": False}
        ]
        update_prob_resp = update_probability_api(prob_updates)
        print("\nPOST /admin/probability/update:")
        print(update_prob_resp)
        print(f"New theoretical RTP: {update_prob_resp.get('theoretical_rtp')}%\n")

    # Test POST /admin/player/add-credits
    if test_player_id and check_admin_key(admin_key):
        add_credits_resp = add_credits_to_player_api(test_player_id, 500, "Manual top-up by admin")
        print(f"\nPOST /admin/player/add-credits to {test_player_id}:")
        print(add_credits_resp)

    # Test POST /admin/player/deactivate
    if test_player_id and check_admin_key(admin_key):
        deactivate_resp = deactivate_player_api(test_player_id)
        print(f"\nPOST /admin/player/deactivate {test_player_id}:")
        print(deactivate_resp)

    # Test GET /admin/spin-history
    if check_admin_key(admin_key):
        if test_player_id: # Ensure player exists to add history
            spin_api(player_id=test_player_id, bet_amount=5)
            spin_api(player_id=test_player_id, bet_amount=10)
            spin_api(player_id=test_player_id, bet_amount=0, is_bonus_spin=True)
            
        spin_history_resp = get_spin_history_api(filters={"page": 1, "per_page": 10})
        print("\nGET /admin/spin-history:")
        print(spin_history_resp)

        spin_history_wins_only = get_spin_history_api(filters={"wins_only": True})
        print("\nGET /admin/spin-history (wins_only):")
        print(spin_history_wins_only)
