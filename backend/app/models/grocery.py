from pydantic import BaseModel
from typing import List, Optional


class GroceryItem(BaseModel):
    id: str
    name: str
    category: str
    price: float
    store_id: str
    store_name: str
    unit: str               # e.g. "lb", "each", "oz"
    calories_per_unit: float
    protein_per_unit: float
    carbs_per_unit: float
    fat_per_unit: float


class OptimizeRequest(BaseModel):
    budget: float
    store_ids: List[str]
    dietary_preferences: Optional[List[str]] = []   # e.g. ["vegetarian", "gluten-free"]
    num_days: int = 7


class CartItem(BaseModel):
    item: GroceryItem
    quantity: float
    total_cost: float


class OptimizeResponse(BaseModel):
    cart: List[CartItem]
    total_cost: float
    total_savings: float
    nutrition_summary: dict
