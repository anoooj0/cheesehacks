import httpx
from app.services.kroger import _get_token

DEFAULT_LAT = 43.0731
DEFAULT_LNG = -89.4012  # Madison, WI


async def fetch_nearby_stores(
    lat: float = DEFAULT_LAT,
    lng: float = DEFAULT_LNG,
    radius_miles: int = 10,
    limit: int = 10,
) -> list[dict]:
    """Return nearby Kroger-family stores with coordinates via the Kroger Locations API."""
    token = await _get_token()

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://api.kroger.com/v1/locations",
            headers={"Authorization": f"Bearer {token}"},
            params={
                "filter.latLong.near": f"{lat},{lng}",
                "filter.radiusInMiles": radius_miles,
                "filter.limit": limit,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    stores = []
    for loc in data.get("data", []):
        geo = loc.get("geolocation", {})
        address = loc.get("address", {})
        lat_val = geo.get("latitude")
        lng_val = geo.get("longitude")
        if lat_val is None or lng_val is None:
            continue
        stores.append({
            "id": loc.get("locationId"),
            "name": loc.get("name", "Unknown"),
            "address": ", ".join(filter(None, [
                address.get("addressLine1"),
                address.get("city"),
                address.get("state"),
                address.get("zipCode"),
            ])),
            "lat": float(lat_val),
            "lng": float(lng_val),
            "phone": loc.get("phone"),
        })

    return stores
