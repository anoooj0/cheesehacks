import os
from openai import AsyncOpenAI
from app.models.meal import MealPlanRequest, MealPlanResponse, DayPlan, Meal

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def generate_meal_plan(request: MealPlanRequest) -> MealPlanResponse:
    """
    Use OpenAI to generate a multi-day meal plan from the optimized cart.

    TODO: implement full meal plan generation with structured output
    """
    ingredient_list = ", ".join([ci.item["name"] for ci in request.cart])
    preferences = ", ".join(request.dietary_preferences) or "none"

    prompt = f"""
You are a nutritionist and chef. Given these groceries: {ingredient_list}
Dietary preferences: {preferences}
Create a {request.num_days}-day meal plan (breakfast, lunch, dinner each day).
Reuse ingredients to minimize waste. Keep meals practical and affordable.
Respond in JSON with this structure:
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
}}
"""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )

    import json
    data = json.loads(response.choices[0].message.content)
    return MealPlanResponse(**data)
