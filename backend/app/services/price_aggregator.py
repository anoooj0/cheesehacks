import json
from pathlib import Path
from typing import List
from app.models.grocery import GroceryItem

DATA_PATH = Path(__file__).parent.parent / "data" / "stores.json"


def _load_data() -> list:
    with open(DATA_PATH) as f:
        return json.load(f)


def get_all_prices() -> List[dict]:
    """Return all grocery items across all stores."""
    return _load_data()


def get_prices_by_store(store_id: str) -> List[dict]:
    """Return grocery items for a specific store."""
    data = _load_data()
    return [item for item in data if item["store_id"] == store_id]
