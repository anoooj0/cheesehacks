from pydantic import BaseModel
from typing import List
from app.models.grocery import CartItem


class Meal(BaseModel):
    name: str
    ingredients: List[str]
    instructions: str
    estimated_cost: float


class DayPlan(BaseModel):
    day: int
    breakfast: Meal
    lunch: Meal
    dinner: Meal


class MealPlanRequest(BaseModel):
    cart: List[CartItem]
    dietary_preferences: List[str] = []
    num_days: int = 7


class MealPlanResponse(BaseModel):
    meal_plan: List[DayPlan]
    total_cost: float
