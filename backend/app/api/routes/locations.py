from fastapi import APIRouter, Query, HTTPException
from app.services.kroger_locations import fetch_nearby_stores

router = APIRouter()


@router.get("/")
async def nearby_stores(
    lat: float = Query(43.0731, description="Latitude"),
    lng: float = Query(-89.4012, description="Longitude"),
    radius: int = Query(10, description="Search radius in miles"),
):
    """Return nearby Kroger-family store locations with coordinates."""
    try:
        return await fetch_nearby_stores(lat, lng, radius)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Could not fetch store locations: {e}")
