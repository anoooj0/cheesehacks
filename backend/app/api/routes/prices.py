from fastapi import APIRouter, HTTPException
from app.services.kroger import fetch_kroger_prices

router = APIRouter()


@router.get("/")
async def list_prices():
    """Return live Kroger prices."""
    try:
        return await fetch_kroger_prices()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Could not fetch live prices: {e}")
