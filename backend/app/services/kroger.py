import os
import base64
import time
import asyncio
import httpx
from typing import List
from app.services.usda_nutrition import fetch_nutrition_per_100g, prefetch_all

# Token cache
_token: str | None = None
_token_expires_at: float = 0

# Price cache (refreshes every 30 min)
_price_cache: List[dict] = []
_price_cache_at: float = 0
CACHE_TTL = 1800

SEARCH_TERMS = [
    # Proteins
    "chicken breast",
    "ground beef",
    "salmon",
    "eggs",
    "tuna",
    "turkey",
    "tofu",
    "shrimp",
    # Produce
    "bananas",
    "apples",
    "spinach",
    "broccoli",
    "sweet potato",
    "carrots",
    "tomatoes",
    "avocado",
    "oranges",
    "grapes",
    # Dairy
    "milk",
    "greek yogurt",
    "cheese",
    "butter",
    "cottage cheese",
    # Grains
    "brown rice",
    "oats",
    "bread",
    "pasta",
    "quinoa",
    # Pantry
    "black beans",
    "peanut butter",
    "olive oil",
    "almonds",
    "lentils",
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


async def _fetch_term(client: httpx.AsyncClient, token: str, term: str, location_id: str, limit: int, nutrition: dict) -> List[dict]:
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
                "calories_per_unit": nutrition["cal"],
                "protein_per_unit": nutrition["protein"],
                "carbs_per_unit": nutrition["carbs"],
                "fat_per_unit": nutrition["fat"],
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

    # Fetch Kroger token first, then USDA nutrition in parallel
    token = await _get_token()

    nutrition_results = await asyncio.gather(
        *[fetch_nutrition_per_100g(term) for term in SEARCH_TERMS],
        return_exceptions=True,
    )
    _EMPTY = {"cal": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}
    nutrition_by_term = {
        term: (r if isinstance(r, dict) else _EMPTY)
        for term, r in zip(SEARCH_TERMS, nutrition_results)
    }

    # Throttle Kroger product requests to avoid rate limits
    sem = asyncio.Semaphore(8)

    async def _limited(client: httpx.AsyncClient, term: str) -> List[dict]:
        async with sem:
            return await _fetch_term(client, token, term, location_id, limit_per_term, nutrition_by_term[term])

    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*[
            _limited(client, term) for term in SEARCH_TERMS
        ], return_exceptions=True)

    results = [r if isinstance(r, list) else [] for r in results]

    items = [item for group in results for item in group]
    if items:
        _price_cache = items
        _price_cache_at = time.time()

    return items
