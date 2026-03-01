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

    prompt = f"""You are a nutritionist and chef. Given these groceries: {ingredient_list}
Dietary preferences: {preferences}
Create a {request.num_days}-day meal plan (breakfast, lunch, dinner each day).
Reuse ingredients to minimize waste. Keep meals practical and affordable.
Respond ONLY with valid JSON, no markdown, no code fences:
{{
  "meal_plan": [
    {{
      "day": 1,
      "breakfast": {{"name": "...", "ingredients": [...], "instructions": "...", "estimated_cost": 0.0}},
      "lunch": {{"name": "...", "ingredients": [...], "instructions": "...", "estimated_cost": 0.0}},
      "dinner": {{"name": "...", "ingredients": [...], "instructions": "...", "estimated_cost": 0.0}}
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
