from fastapi import APIRouter

from app.models.nutrition import NutritionLookupResponse
from app.services.nutrition_lookup import lookup_barcode_nutrition

router = APIRouter()


@router.get("/{barcode}", response_model=NutritionLookupResponse)
async def get_nutrition_by_barcode(barcode: str):
    """Return normalized nutrition data for a scanned barcode."""
    return await lookup_barcode_nutrition(barcode)
