import os
import asyncio
import httpx

USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1"

# USDA FoodData Central nutrient IDs
_NUTRIENT_IDS = {
    "cal":     1008,  # Energy (kcal)
    "protein": 1003,  # Protein
    "carbs":   1005,  # Carbohydrate, by difference
    "fat":     1004,  # Total lipid (fat)
}

_EMPTY = {"cal": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}

# Permanent in-process cache — nutrition values don't change
_cache: dict[str, dict] = {}


async def fetch_nutrition_per_100g(term: str) -> dict:
    """Return per-100g nutrition for a food term from USDA FoodData Central.

    Uses Foundation and SR Legacy datasets (most accurate whole-food values).
    Results are cached permanently for the lifetime of the process.
    Falls back to zeros if the API is unavailable or the key is not set.
    """
    if term in _cache:
        return _cache[term]

    api_key = os.getenv("USDA_API_KEY", "").strip()
    if not api_key:
        return _EMPTY

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{USDA_BASE_URL}/foods/search",
                params={
                    "query": term,
                    "api_key": api_key,
                    "dataType": "Foundation,SR Legacy",
                    "pageSize": 1,
                },
            )
            resp.raise_for_status()
            foods = resp.json().get("foods", [])
    except Exception:
        return _EMPTY

    if not foods:
        return _EMPTY

    nutrients_by_id = {
        n["nutrientId"]: n.get("value", 0.0)
        for n in foods[0].get("foodNutrients", [])
    }

    result = {
        key: round(float(nutrients_by_id.get(nid, 0.0)), 1)
        for key, nid in _NUTRIENT_IDS.items()
    }
    _cache[term] = result
    return result


async def prefetch_all(terms: list[str]) -> None:
    """Fetch nutrition for all terms in parallel and warm the cache."""
    await asyncio.gather(*[fetch_nutrition_per_100g(t) for t in terms])
