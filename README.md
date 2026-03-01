# ShopSmart

## 🥗 Inspiration

As college students in Madison, we are on a tight budget due to high costs of living while still wanting to prioritize eating healthy. We wanted to maximize our nutrition while minimizing grocery costs, so we built an app that helps users see what’s in their food, compare prices with similar products, and plan meals around what they can actually afford.

---

## 🛒 What It Does

ShopSmart pulls live grocery prices from stores in your area such as **Kroger** and **Metro Market**.

Users enter:
- Height  
- Weight  
- Nutritional goals  

Based on the items in the cart, the model:
- Builds a meal plan  
- Details the cost of each meal  
- Calculates macronutrient breakdowns  

### 📦 Barcode Scanning

The app can scan barcodes so users can:
- View complete nutritional information  
- Add items directly to their cart  

Barcode normalization ensures that **UPC-A, EAN-13, and similar formats** all resolve to the same product.

---

## ⚙️ How We Built It

**Frontend:** React Native (Expo)  
**Backend:** FastAPI  

The app:
- Displays live Kroger prices (Madison / Dane County)
- Shows a dynamic cart
- Maps nearby stores with directions
- Includes a barcode scanner

The backend handles:
- Data fusion
- Optimization logic
- Meal plan generation

---

### 🔌 APIs & Data Sources

- **Kroger API** – Live grocery pricing  
- **USDA API** – Nutrition and macronutrient data  
- **Open Food Facts** – Barcode lookup  
- **Groq API** – Meal plan generation  

We fuse pricing and nutrition data by search term so each product contains both price and macro data for scoring.

---

### 🧠 Optimization Logic

- Items are scored by **nutrition per dollar**
- A **greedy budget-fill algorithm** selects high-value items within a budget
- Meal plans are generated using Groq based on:
  - Cart contents  
  - User preferences  

To ensure reliability:
- Strict JSON schema constraints keep responses grounded and parseable
- REST endpoints expose:
  - Prices  
  - Nutrition  
  - Store locations  
  - Optimization  
  - Meal-plan generation  

The mobile client interacts with a single clean backend pipeline.

---

## 🚧 Challenges We Ran Into

- Combining features from apps like MyFitnessPal and Instacart into one unified system  
- Ensuring reliability across multiple APIs  
- Grounding LLM-generated meal plans to actual cart contents  
- Structuring a multi-service architecture with many moving components  

### 💡 Solutions

- Implemented token and price caching to prevent rate-limit failures  
- Constrained the LLM with:
  - Actual cart contents  
  - A strict JSON schema  
- Carefully planned system architecture before full implementation  

---

## 🏆 Accomplishments We’re Proud Of

- Successfully integrated:
  - Kroger  
  - Open Food Facts  
  - USDA  
  - Groq  
- Built custom barcode normalization logic  
- Designed a nutrition-per-dollar scoring system  
- Implemented a greedy budget-fill optimizer that maximizes value within a budget  

Instead of simply listing the cheapest items, ShopSmart intelligently compares nutritional value relative to cost.

---

## 📚 What We Learned

- Effective collaboration using Git  
- Importance of communication and shared architectural planning  
- How to handle API inconsistencies  
- Barcode format differences (UPC-A, EAN-13)  
- Implementing caching and throttling to prevent cascading system failures  

---

## 🚀 What’s Next for ShopSmart

Planned improvements include:

- 🥕 Adding support for nearby farmers markets to promote local businesses  
- 🚚 Integrating delivery platforms like DoorDash or Uber Eats  
- 👥 Adding social features:
  - Friends  
  - Recipe sharing  
  - Nutrition goal posting  
  - Comments and reactions  
- 🏪 Expanding beyond Kroger to include more Madison-area stores  
- 🔄 Wiring the optimizer to live multi-store data  
- 🥗 Adding dietary filters and advanced nutrition goals  

---

## 💡 Our Vision

ShopSmart aims to empower students and budget-conscious shoppers to make smarter, healthier grocery decisions — without sacrificing affordability.
