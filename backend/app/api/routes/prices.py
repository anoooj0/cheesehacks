from fastapi import APIRouter
from app.services.price_aggregator import get_all_prices, get_prices_by_store

router = APIRouter()


@router.get("/")
def list_prices():
    """Return all grocery items with prices across all stores."""
    return get_all_prices()


@router.get("/{store_id}")
def prices_by_store(store_id: str):
    """Return prices for a specific store."""
    return get_prices_by_store(store_id)
