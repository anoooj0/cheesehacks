import os
import base64
import time
import asyncio
import httpx
from typing import List

# Token cache
_token: str | None = None
_token_expires_at: float = 0

# Price cache (refreshes every 30 min)
_price_cache: List[dict] = []
_price_cache_at: float = 0
CACHE_TTL = 1800

SEARCH_TERMS = [
    "chicken breast",
    "brown rice",
    "eggs",
    "bananas",
    "spinach",
    "black beans",
    "oats",
    "milk",
    "bread",
    "apples",
    "ground beef",
    "salmon",
    "broccoli",
    "sweet potato",
    "greek yogurt",
]

DEFAULT_LOCATION_ID = os.getenv("KROGER_LOCATION_ID", "53400434")


async def _get_token() -> str:
    global _token, _token_expires_at
    if _token and time.time() < _token_expires_at - 60:
        return _token

    client_id = os.getenv("KROGER_CLIENT_ID", "").strip()
    client_secret = os.getenv("KROGER_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise RuntimeError("KROGER_CLIENT_ID and KROGER_CLIENT_SECRET must be set")

    credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.kroger.com/v1/connect/oauth2/token",
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": f"Basic {credentials}",
            },
            data="grant_type=client_credentials&scope=product.compact",
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

    _token = data["access_token"]
    _token_expires_at = time.time() + data.get("expires_in", 1800)
    return _token


async def _fetch_term(client: httpx.AsyncClient, token: str, term: str, location_id: str, limit: int) -> List[dict]:
    try:
        resp = await client.get(
            "https://api.kroger.com/v1/products",
            headers={"Authorization": f"Bearer {token}"},
            params={
                "filter.term": term,
                "filter.locationId": location_id,
                "filter.limit": limit,
            },
            timeout=10,
        )
        if resp.status_code != 200:
            return []

        items = []
        for product in resp.json().get("data", []):
            product_items = product.get("items", [{}])
            price_info = product_items[0].get("price", {}) if product_items else {}
            price = price_info.get("regular") or price_info.get("promo") or 0
            unit = product_items[0].get("size", "each") if product_items else "each"

            items.append({
                "id": f"kroger-{product.get('productId')}",
                "name": product.get("description", "Unknown"),
                "category": term,
                "price": float(price),
                "store_id": "metro-market",
                "store_name": "Metro Market",
                "unit": unit,
                "calories_per_unit": 0,
                "protein_per_unit": 0,
                "carbs_per_unit": 0,
                "fat_per_unit": 0,
            })
        return items
    except Exception:
        return []


async def fetch_kroger_prices(
    location_id: str = DEFAULT_LOCATION_ID,
    limit_per_term: int = 3,
) -> List[dict]:
    global _price_cache, _price_cache_at

    # Return cached data if fresh
    if _price_cache and time.time() < _price_cache_at + CACHE_TTL:
        return _price_cache

    token = await _get_token()

    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*[
            _fetch_term(client, token, term, location_id, limit_per_term)
            for term in SEARCH_TERMS
        ])

    items = [item for group in results for item in group]
    if items:
        _price_cache = items
        _price_cache_at = time.time()

    return items
