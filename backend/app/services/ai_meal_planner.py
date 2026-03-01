import os
import json
from groq import Groq
from app.models.meal import MealPlanRequest, MealPlanResponse


def _get_client():
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set")
    return Groq(api_key=api_key)


async def generate_meal_plan(request: MealPlanRequest) -> MealPlanResponse:
    ingredient_list = ", ".join([ci.item.name for ci in request.cart])
    preferences = ", ".join(request.dietary_preferences) or "none"

    # Per-meal macro targets derived from the user's daily goals
    if request.nutrition_goals:
        g = request.nutrition_goals
        per_meal_cal = round(g.calories / 3)
        per_meal_protein = round(g.protein_g / 3)
        per_meal_carbs = round(g.carbs_g / 3)
        per_meal_fat = round(g.fat_g / 3)
        macro_target_str = (
            f"Daily nutrition targets: {g.calories} kcal, {g.protein_g}g protein, "
            f"{g.carbs_g}g carbs, {g.fat_g}g fat.\n"
            f"Each meal should hit approximately {per_meal_cal} kcal, "
            f"{per_meal_protein}g protein, {per_meal_carbs}g carbs, {per_meal_fat}g fat. "
            f"Scale ingredient portions to achieve these numbers as closely as possible."
        )
    else:
        macro_target_str = "Aim for balanced, nutritious meals."

    # Madison, WI local flavor
    is_madison = "madison" in request.location.lower() or "wisconsin" in request.location.lower()
    location_str = (
        "Location: Madison, WI. Where the available ingredients allow, naturally incorporate "
        "Wisconsin/Madison regional dishes: Wisconsin cheese curds, bratwurst, Friday fish fry "
        "(walleye or perch), cranberries, Door County cherries, local dairy, and hearty Midwest "
        "comfort food. These should feel authentic, not forced."
        if is_madison else f"Location: {request.location}."
    )

    prompt = f"""You are a nutritionist and chef. Available groceries: {ingredient_list}
Dietary preferences: {preferences}
{macro_target_str}
{location_str}

Create a {request.num_days}-day meal plan (breakfast, lunch, dinner each day).
Reuse ingredients across days to minimize waste. Keep meals practical.
For each meal, calculate realistic macros based on the actual portions used to hit the per-meal targets above.
Respond ONLY with valid JSON, no markdown, no code fences:
{{
  "meal_plan": [
    {{
      "day": 1,
      "breakfast": {{"name": "...", "ingredients": [...], "instructions": "...", "estimated_cost": 0.0, "macros": {{"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}}}},
      "lunch": {{"name": "...", "ingredients": [...], "instructions": "...", "estimated_cost": 0.0, "macros": {{"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}}}},
      "dinner": {{"name": "...", "ingredients": [...], "instructions": "...", "estimated_cost": 0.0, "macros": {{"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}}}}
    }}
  ],
  "total_cost": 0.0
}}"""

    response = _get_client().chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )

    data = json.loads(response.choices[0].message.content)
    return MealPlanResponse(**data)
