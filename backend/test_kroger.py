import requests
import base64
from dotenv import load_dotenv
import os

# Force load .env from the exact folder
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

CLIENT_ID = os.getenv("KROGER_CLIENT_ID")
CLIENT_SECRET = os.getenv("KROGER_CLIENT_SECRET")

print(f"Client ID found: {CLIENT_ID}")
print(f"Client Secret found: {CLIENT_SECRET[:5]}..." if CLIENT_SECRET else "No secret found")

# Get token
credentials = base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()

token_response = requests.post(
    "https://api.kroger.com/v1/connect/oauth2/token",
    headers={
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": f"Basic {credentials}"
    },
    data="grant_type=client_credentials&scope=product.compact"
)

print(f"Status code: {token_response.status_code}")
token = token_response.json().get("access_token")

if token:
    print(f"Token received successfully!")

    # Find Madison Metro Market locations
    locations = requests.get(
        "https://api.kroger.com/v1/locations",
        headers={"Authorization": f"Bearer {token}"},
        params={
            "filter.zipCode.near": "53703",
            "filter.radiusInMiles": 10,
            "filter.chain": "Metro Market"
        }
    )

    print(f"\nLocations status: {locations.status_code}")
    stores = locations.json().get("data", [])
    for store in stores:
        print(f"Store: {store['name']} - {store['address']['addressLine1']}")
        print(f"Store ID: {store['locationId']}")

    # Search for products at MM Cottage Grove Road
    search_terms = [
        "chicken breast",
        "brown rice",
        "eggs",
        "bananas",
        "spinach",
        "black beans",
        "oats",
        "milk",
        "bread",
        "apples"
    ]

    all_products = []

    for term in search_terms:
        print(f"\nSearching for: {term}")
        products = requests.get(
            "https://api.kroger.com/v1/products",
            headers={"Authorization": f"Bearer {token}"},
            params={
                "filter.term": term,
                "filter.locationId": "53400434",
                "filter.limit": 3
            }
        )

        items = products.json().get("data", [])
        for item in items:
            price = item.get('items', [{}])[0].get('price', {})
            product = {
                "id": f"metromarket-{item.get('productId')}",
                "name": item.get('description'),
                "category": term,
                "price": price.get('regular', 0),
                "store_id": "metro-market",
                "store_name": "Metro Market",
                "unit": item.get('items', [{}])[0].get('size', 'each')
            }
            all_products.append(product)
            print(f"  - {product['name']}: ${product['price']}")

    print(f"\nTotal products found: {len(all_products)}")

else:
    print("Failed to get token")