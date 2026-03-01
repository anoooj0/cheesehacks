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


def _barcode_variants(barcode: str) -> list[str]:
    digits = "".join(char for char in barcode if char.isdigit())
    if not digits:
        return []

    variants = [digits]

    # UPC-A (12) → EAN-13 (prepend 0): OFF stores many US products as EAN-13.
    if len(digits) == 12:
        variants.append(f"0{digits}")

    # EAN-13 (13) → UPC-A (strip leading 0): scanner may return EAN-13 format.
    if len(digits) == 13 and digits.startswith("0"):
        variants.append(digits[1:])

    # Some catalogs expose the same item as GTIN-14 with leading zero padding.
    if len(digits) < 14:
        variants.append(digits.zfill(14))

    return list(dict.fromkeys(variants))


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


def _extract_calories(nutriments: dict[str, Any], suffix: str) -> Optional[float]:
    kcal = _to_float(nutriments.get(f"energy-kcal_{suffix}"))
    if kcal is not None:
        return kcal
    # Fall back to kJ and convert (1 kcal = 4.184 kJ)
    kj = _to_float(nutriments.get(f"energy_{suffix}"))
    if kj is not None:
        return round(kj / 4.184, 1)
    return None


def _extract_nutrition(nutriments: dict[str, Any], suffix: str) -> NutritionFacts:
    sodium = _to_float(nutriments.get(f"sodium_{suffix}"))
    if sodium is None:
        # OFF sometimes only stores salt; sodium is ~40% of salt by mass
        salt = _to_float(nutriments.get(f"salt_{suffix}"))
        if salt is not None:
            sodium = salt * 0.4
    return NutritionFacts(
        calories=_extract_calories(nutriments, suffix),
        protein_g=_to_float(nutriments.get(f"proteins_{suffix}")),
        carbs_g=_to_float(nutriments.get(f"carbohydrates_{suffix}")),
        fat_g=_to_float(nutriments.get(f"fat_{suffix}")),
        fiber_g=_to_float(nutriments.get(f"fiber_{suffix}")),
        sugars_g=_to_float(nutriments.get(f"sugars_{suffix}")),
        sodium_mg=_grams_to_milligrams(sodium),
    )


async def lookup_barcode_nutrition(barcode: str) -> NutritionLookupResponse:
    async with httpx.AsyncClient(timeout=10.0, headers=OPEN_FOOD_FACTS_HEADERS) as client:
        for candidate in _barcode_variants(barcode):
            try:
                response = await client.get(
                    f"{OPEN_FOOD_FACTS_URL}/{candidate}",
                    params={"fields": OPEN_FOOD_FACTS_FIELDS},
                )
            except (httpx.RemoteProtocolError, httpx.ConnectError, httpx.ReadTimeout):
                continue

            if response.status_code == 404:
                continue

            response.raise_for_status()
            payload = response.json()

            if payload.get("status") != 1 or not payload.get("product"):
                continue

            product = payload["product"]
            nutriments = product.get("nutriments", {})

            return NutritionLookupResponse(
                barcode=candidate,
                product_name=product.get("product_name"),
                brand=product.get("brands"),
                quantity=product.get("quantity"),
                serving_size=product.get("serving_size"),
                image_url=product.get("image_url"),
                nutrition_per_100g=_extract_nutrition(nutriments, "100g"),
                nutrition_per_serving=_extract_nutrition(nutriments, "serving"),
            )

    raise HTTPException(status_code=404, detail="Barcode not found")
