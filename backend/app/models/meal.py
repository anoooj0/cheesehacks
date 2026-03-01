from pydantic import BaseModel
from typing import List, Optional
from app.models.grocery import CartItem


class MealMacros(BaseModel):
    calories: float = 0
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0


class Meal(BaseModel):
    name: str
    ingredients: List[str]
    instructions: str
    estimated_cost: float
    macros: Optional[MealMacros] = None


class DayPlan(BaseModel):
    day: int
    breakfast: Meal
    lunch: Meal
    dinner: Meal


class NutritionGoalsInput(BaseModel):
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float


class MealPlanRequest(BaseModel):
    cart: List[CartItem]
    dietary_preferences: List[str] = []
    num_days: int = 7
    nutrition_goals: Optional[NutritionGoalsInput] = None
    location: str = "Madison, WI"


class MealPlanResponse(BaseModel):
    meal_plan: List[DayPlan]
    total_cost: float
