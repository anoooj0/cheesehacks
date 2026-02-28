from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import prices, optimizer, meal_plan

app = FastAPI(title="Grocery Optimizer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prices.router, prefix="/prices", tags=["prices"])
app.include_router(optimizer.router, prefix="/optimize", tags=["optimizer"])
app.include_router(meal_plan.router, prefix="/meal-plan", tags=["meal-plan"])


@app.get("/")
def root():
    return {"status": "ok", "message": "Grocery Optimizer API"}
