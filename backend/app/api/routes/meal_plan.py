from fastapi import APIRouter
from app.models.meal import MealPlanRequest, MealPlanResponse
from app.services.ai_meal_planner import generate_meal_plan

router = APIRouter()


@router.post("/", response_model=MealPlanResponse)
async def create_meal_plan(request: MealPlanRequest):
    """
    Given a list of selected grocery items and preferences,
    generate a multi-day meal plan using AI.
    """
    return await generate_meal_plan(request)
