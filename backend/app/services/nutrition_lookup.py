from typing import Any, Optional

import httpx
from fastapi import HTTPException

from app.models.nutrition import NutritionFacts, NutritionLookupResponse

OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/api/v2/product"
OPEN_FOOD_FACTS_HEADERS = {
    "User-Agent": "CheeseHacks/1.0 (nutrition lookup; contact: support@cheesehacks.local)"
}
OPEN_FOOD_FACTS_FIELDS = ",".join(
    [
        "code",
        "product_name",
        "brands",
        "quantity",
        "serving_size",
        "image_url",
        "nutriments",
    ]
)


def _to_float(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _grams_to_milligrams(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    return value * 1000


def _extract_nutrition(nutriments: dict[str, Any], suffix: str) -> NutritionFacts:
    sodium = _to_float(nutriments.get(f"sodium_{suffix}"))
    return NutritionFacts(
        calories=_to_float(nutriments.get(f"energy-kcal_{suffix}")),
        protein_g=_to_float(nutriments.get(f"proteins_{suffix}")),
        carbs_g=_to_float(nutriments.get(f"carbohydrates_{suffix}")),
        fat_g=_to_float(nutriments.get(f"fat_{suffix}")),
        fiber_g=_to_float(nutriments.get(f"fiber_{suffix}")),
        sugars_g=_to_float(nutriments.get(f"sugars_{suffix}")),
        sodium_mg=_grams_to_milligrams(sodium),
    )


async def lookup_barcode_nutrition(barcode: str) -> NutritionLookupResponse:
    async with httpx.AsyncClient(timeout=10.0, headers=OPEN_FOOD_FACTS_HEADERS) as client:
        response = await client.get(
            f"{OPEN_FOOD_FACTS_URL}/{barcode}",
            params={"fields": OPEN_FOOD_FACTS_FIELDS},
        )

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Barcode not found")

    response.raise_for_status()
    payload = response.json()

    if payload.get("status") != 1 or not payload.get("product"):
        raise HTTPException(status_code=404, detail="Barcode not found")

    product = payload["product"]
    nutriments = product.get("nutriments", {})

    return NutritionLookupResponse(
        barcode=barcode,
        product_name=product.get("product_name"),
        brand=product.get("brands"),
        quantity=product.get("quantity"),
        serving_size=product.get("serving_size"),
        image_url=product.get("image_url"),
        nutrition_per_100g=_extract_nutrition(nutriments, "100g"),
        nutrition_per_serving=_extract_nutrition(nutriments, "serving"),
    )
