from fastapi import APIRouter
from app.models.grocery import OptimizeRequest, OptimizeResponse
from app.services.optimizer import optimize_cart

router = APIRouter()


@router.post("/", response_model=OptimizeResponse)
def run_optimizer(request: OptimizeRequest):
    """
    Given a budget, dietary preferences, and nearby stores,
    return an optimized grocery cart that maximizes nutritional value.
    """
    return optimize_cart(request)
