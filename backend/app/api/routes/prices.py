from fastapi import APIRouter, HTTPException
from app.services.kroger import fetch_kroger_prices, fetch_price_by_upc

router = APIRouter()


@router.get("/")
async def list_prices():
    """Return live Kroger prices."""
    try:
        return await fetch_kroger_prices()
    except Exception as e:
        import traceback
        print(f"[prices] ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=503, detail=f"Could not fetch live prices: {type(e).__name__}: {e}")


@router.get("/barcode/{barcode}")
async def price_by_barcode(barcode: str):
    """Look up the Metro Market price for a scanned barcode (UPC)."""
    try:
        result = await fetch_price_by_upc(barcode)
        if not result or result.get("price") is None:
            raise HTTPException(status_code=404, detail="Price not found for this barcode")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Could not fetch price: {e}")
