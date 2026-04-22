
from datetime import datetime
import uuid
import json

# --- Database Schema Definitions ---

# 1. probability_config
class ProbabilityConfig:
    def __init__(self, symbol_name, symbol_name_en, symbol_key, weight, payout_3x, payout_4x, payout_5x, is_wild=False, is_scatter=False, is_active=True, color_hex="#FFFFFF", sort_order=0):
        self.symbol_name = symbol_name
        self.symbol_name_en = symbol_name_en
        self.symbol_key = symbol_key
        self.weight = weight
        self.payout_3x = payout_3x
        self.payout_4x = payout_4x
        self.payout_5x = payout_5x
        self.is_wild = is_wild
        self.is_scatter = is_scatter
        self.is_active = is_active
        self.color_hex = color_hex
        self.sort_order = sort_order

    def to_dict(self):
        return self.__dict__

# 2. game_config
class GameConfig:
    def __init__(self, config_key, config_value, description_ms, description_en, value_type, category):
        self.config_key = config_key
        self.config_value = config_value # Stored as string, parsed on read
        self.description_ms = description_ms
        self.description_en = description_en
        self.value_type = value_type
        self.category = category

    def to_dict(self):
        return self.__dict__

# 3. players
class Player:
    def __init__(self, player_id=None, display_name=None, registration_ip=None):
        self.player_id = str(player_id if player_id else uuid.uuid4())
        self.display_name = display_name
        self.credits = 1000 # default from game_config
        self.total_spins = 0
        self.total_wagered = 0.0
        self.total_won = 0.0
        self.biggest_win = 0.0
        self.bonus_spins_remaining = 0
        self.total_bonus_spins_used = 0
        self.created_at = datetime.utcnow()
        self.last_active = datetime.utcnow()
        self.is_active = True
        self.registration_ip = registration_ip

    def to_dict(self):
        data = self.__dict__.copy()
        data["created_at"] = data["created_at"].isoformat() + "Z"
        data["last_active"] = data["last_active"].isoformat() + "Z"
        return data

# 4. spin_history
class SpinHistory:
    def __init__(self, player_id, bet_amount, reel_grid, winning_lines, scatter_positions, payout_amount, win_multiplier, is_bonus_spin, bonus_triggered, rtp_snapshot, credits_before, credits_after, spin_duration_ms):
        self.spin_id = str(uuid.uuid4())
        self.player_id = player_id
        self.bet_amount = bet_amount
        self.reel_grid = json.dumps(reel_grid)
        self.winning_lines = json.dumps(winning_lines)
        self.scatter_positions = json.dumps(scatter_positions)
        self.payout_amount = payout_amount
        self.win_multiplier = win_multiplier
        self.is_bonus_spin = is_bonus_spin
        self.bonus_triggered = bonus_triggered
        self.rtp_snapshot = rtp_snapshot
        self.credits_before = credits_before
        self.credits_after = credits_after
        self.spin_duration_ms = spin_duration_ms
        self.created_at = datetime.utcnow() # Stored in UTC

    def to_dict(self):
        data = self.__dict__.copy()
        data["created_at"] = data["created_at"].isoformat() + "Z"
        return data

# --- Seed Data ---

# Seed data for probability_config
probability_seed_data = [
    ProbabilityConfig("Bunga Emas", "Golden Flower", "bunga_emas", 2, 50, 200, 1000, False, False, "#C9A84C", 1),
    ProbabilityConfig("Mahkota", "Royal Crown", "mahkota", 8, 15, 40, 100, False, False, "#8B0000", 2),
    ProbabilityConfig("Keris", "Traditional Dagger", "keris", 5, 20, 60, 150, True, False, "#1a5c1a", 3),
    ProbabilityConfig("Tudong Saji", "Decorative Cover", "tudong_saji", 18, 8, 20, 50, False, False, "#5a3010", 4),
    ProbabilityConfig("Perahu Brunei", "Bruneian Boat", "perahu_brunei", 22, 5, 15, 30, False, False, "#1a4a6e", 5),
    ProbabilityConfig("Bunga Raya", "Hibiscus", "bunga_raya", 30, 3, 8, 20, False, False, "#cc2244", 6),
    ProbabilityConfig("Limau", "Citrus Fruit", "limau", 32, 2, 6, 15, False, False, "#7a9e1a", 7),
    ProbabilityConfig("Bintang", "Star (Scatter)", "bintang", 6, 0, 0, 0, False, True, "#F7E017", 8),
    ProbabilityConfig("Kosong", "Blank", "kosong", 20, 0, 0, 0, False, False, "#444444", 9)
]

# Seed data for game_config
game_config_seed_data = [
    GameConfig("min_bet", "1", "Pertaruhan minimum setiap putaran", "Minimum bet per spin", "number", "betting"),
    GameConfig("max_bet", "100", "Pertaruhan maksimum setiap putaran", "Maximum bet per spin", "number", "betting"),
    GameConfig("default_bet", "5", "Pertaruhan lalai permulaan", "Default starting bet", "number", "betting"),
    GameConfig("num_reels", "5", "Bilangan gelendong", "Number of reels", "number", "gameplay"),
    GameConfig("num_rows", "3", "Bilangan baris yang kelihatan", "Number of visible rows per reel", "number", "gameplay"),
    GameConfig("starting_credits", "1000", "Kredit diberi kepada pemain baru", "Credits given to new players", "number", "betting"),
    GameConfig("scatter_trigger_count", "3", "Bilangan bintang untuk pencetus bonus", "Scatters needed to trigger bonus", "number", "bonus"),
    GameConfig("bonus_spin_count", "10", "Bilangan pusingan percuma diberikan", "Free spins awarded on bonus trigger", "number", "bonus"),
    GameConfig("house_edge_target", "5", "Sasaran tepi rumah dalam peratus", "Target house edge percentage", "number", "limits"),
    GameConfig("max_win_multiplier", "1000", "Had menang maksimum (gandaan)", "Maximum win cap as a bet multiplier", "number", "limits"),
    GameConfig("currency_code", "BND", "Kod mata wang", "Currency code", "string", "gameplay"),
    GameConfig("currency_symbol", "B$", "Simbol mata wang", "Currency symbol displayed in app", "string", "gameplay"),
    GameConfig("game_name", "Mestika", "Nama permainan", "Game name", "string", "gameplay"),
    GameConfig("timezone", "Asia/Brunei", "Zon masa", "Game server timezone", "string", "gameplay")
]

# Placeholder for database connection and operations
# In a real implementation, these would interact with a database (e.g., PostgreSQL, MongoDB)
class MockDatabase:
    def __init__(self):
        self.probability_configs = {item.symbol_key: item for item in probability_seed_data}
        self.game_configs = {item.config_key: item for item in game_config_seed_data}
        self.players = {} # player_id -> Player object
        self.spin_histories = [] # List of SpinHistory objects

    def get_probability_config(self, symbol_key=None, is_active=None):
        results = list(self.probability_configs.values())
        if symbol_key:
            results = [p for p in results if p.symbol_key == symbol_key]
        if is_active is not None:
            results = [p for p in results if p.is_active == is_active]
        return results

    def get_game_config(self, config_key=None):
        results = list(self.game_configs.values())
        if config_key:
            results = [g for g in results if g.config_key == config_key]
        return results[0] if config_key and results else results

    def get_player(self, player_id=None):
        if player_id:
            return self.players.get(player_id)
        return list(self.players.values())

    def create_player(self, player_data):
        new_player = Player(
            player_id=player_data.get("player_id"),
            display_name=player_data.get("display_name"),
            registration_ip=player_data.get("registration_ip")
        )
        self.players[new_player.player_id] = new_player
        return new_player

    def update_player(self, player_id, updates):
        player = self.players.get(player_id)
        if player:
            for key, value in updates.items():
                if hasattr(player, key):
                    setattr(player, key, value)
            player.last_active = datetime.utcnow()
            return player
        return None

    def add_spin_history(self, spin_record):
        self.spin_histories.append(spin_record)
        return spin_record

    def get_spin_history(self, filters=None):
        # Basic filtering, extend as needed
        results = self.spin_histories
        if filters:
            if filters.get("player_id"):
                results = [s for s in results if s.player_id == filters["player_id"]]
            if filters.get("wins_only"):
                results = [s for s in results if s.payout_amount > 0]
            if filters.get("bonus_only"):
                results = [s for s in results if s.is_bonus_spin]
            # Date filtering would require datetime parsing and comparison
        return results

    def update_probability_config(self, symbol_key, updates):
        if symbol_key in self.probability_configs:
            config_item = self.probability_configs[symbol_key]
            for key, value in updates.items():
                if hasattr(config_item, key):
                    setattr(config_item, key, value)
            return config_item
        return None
    
    def update_game_config(self, config_key, new_value):
        if config_key in self.game_configs:
            config_item = self.game_configs[config_key]
            config_item.config_value = str(new_value) # Always store as string
            return config_item
        return None

# Mock DB instance for development/testing
db = MockDatabase()

# Initialize with seed data
for item in probability_seed_data:
    db.probability_configs[item.symbol_key] = item
for item in game_config_seed_data:
    db.game_configs[item.config_key] = item

def get_config_value(key, default=None):
    config_item = db.get_game_config(key)
    if not config_item:
        return default
    # Parse value based on type
    if config_item.value_type == "number":
        return float(config_item.config_value)
    elif config_item.value_type == "boolean":
        return config_item.config_value.lower() in ("true", "1", "t", "y", "yes")
    else: # string
        return config_item.config_value

def format_currency(amount, symbol=None):
    if symbol is None:
        symbol = get_config_value("currency_symbol")
    return f"{symbol}{amount:,.2f}"

def get_timezone():
    return get_config_value("timezone", "UTC")

def convert_to_brunei_time(dt_utc):
    # In a real app, use pytz or similar for proper timezone conversion
    # For mock purposes, we'll assume UTC is close enough or a fixed offset
    from datetime import timezone, timedelta
    if dt_utc.tzinfo is None or dt_utc.tzinfo.utcoffset(dt_utc) is None:
        dt_utc = dt_utc.replace(tzinfo=timezone.utc)
    
    # Brunei Standard Time is UTC+8
    brunei_tz = timezone(timedelta(hours=8))
    return dt_utc.astimezone(brunei_tz)

