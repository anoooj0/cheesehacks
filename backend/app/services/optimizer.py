from app.models.grocery import OptimizeRequest, OptimizeResponse, CartItem
from app.services.price_aggregator import get_all_prices


def optimize_cart(request: OptimizeRequest) -> OptimizeResponse:
    """
    Knapsack-style optimization:
    - Filter items by selected stores and dietary preferences
    - Maximize nutritional value (calories + protein) per dollar
    - Stay within budget

    TODO: implement full optimization logic
    """
    all_items = get_all_prices()

    # Filter by selected stores
    filtered = [
        item for item in all_items
        if item["store_id"] in request.store_ids
    ]

    # TODO: filter by dietary_preferences

    # Greedy approach: sort by nutrition_score / price descending
    def nutrition_score(item):
        return (item["calories_per_unit"] + item["protein_per_unit"] * 4) / max(item["price"], 0.01)

    filtered.sort(key=nutrition_score, reverse=True)

    cart = []
    total_cost = 0.0

    for item in filtered:
        if total_cost + item["price"] <= request.budget:
            cart_item = CartItem(
                item=item,
                quantity=1,
                total_cost=item["price"],
            )
            cart.append(cart_item)
            total_cost += item["price"]

    return OptimizeResponse(
        cart=cart,
        total_cost=total_cost,
        total_savings=0.0,  # TODO: calculate savings vs. most expensive store
        nutrition_summary={},  # TODO: aggregate nutrition totals
    )
