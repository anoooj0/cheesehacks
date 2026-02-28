from typing import Optional

from pydantic import BaseModel


class NutritionFacts(BaseModel):
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    fiber_g: Optional[float] = None
    sugars_g: Optional[float] = None
    sodium_mg: Optional[float] = None


class NutritionLookupResponse(BaseModel):
    barcode: str
    product_name: Optional[str] = None
    brand: Optional[str] = None
    quantity: Optional[str] = None
    serving_size: Optional[str] = None
    image_url: Optional[str] = None
    nutrition_per_100g: NutritionFacts
    nutrition_per_serving: NutritionFacts
