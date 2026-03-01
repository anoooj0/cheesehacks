from fastapi import APIRouter
from app.services.price_aggregator import get_all_prices, get_prices_by_store
from app.services.kroger import fetch_kroger_prices

router = APIRouter()


@router.get("/")
async def list_prices():
    """Return live Kroger prices, falling back to static data on error."""
    try:
        kroger_items = await fetch_kroger_prices()
        if kroger_items:
            # Keep static items from non-Kroger stores (walmart, aldi, etc.)
            static = [p for p in get_all_prices() if p["store_id"] not in ("kroger", "metro-market")]
            return static + kroger_items
    except Exception:
        pass
    return get_all_prices()


@router.get("/{store_id}")
def prices_by_store(store_id: str):
    """Return prices for a specific store."""
    return get_prices_by_store(store_id)
