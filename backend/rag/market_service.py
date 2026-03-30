import requests
import os
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional

# Load env in case it's run as standalone, though main.py usually handles it.
load_dotenv()

def get_market_prices(lat: float, lon: float, crop: Optional[str] = None) -> Dict[str, Any]:
    """
    Fetches real-time mandi prices for the nearest markets using Data.gov.in (Agmarknet).
    """
    api_key = os.getenv("DATA_GOV_API_KEY")
    if not api_key:
        return {"status": "error", "message": "Market API key not found", "region": "Unknown", "markets": []}

    try:
        # Step 1: Get the district/state from Reverse Geocoding
        # We reuse Nominatim for this via weather_service
        from rag.weather_service import get_precise_location
        region_info = get_precise_location(lat, lon)
        
        # Fallback if geocoding fails or returns unknown
        if "Unknown" in region_info or "Details Unavailable" in region_info:
             return {"status": "success", "region": "Unknown", "markets": [], "message": "Could not identify region for market prices."}

        # Nominatim usually returns "Place, State"
        parts = [s.strip() for s in region_info.split(",")]
        district = parts[0]
        state = parts[-1] if len(parts) > 1 else ""
        
        # Step 2: Fetch prices from Data.gov.in
        # Resource ID for live Agmarknet data
        resource_id = "9ef273d4-14f7-4962-801a-27474a124443"
        base_url = f"https://api.data.gov.in/resource/{resource_id}?api-key={api_key}&format=json"
        
        # Try finding by district
        # We search with filters. Note: Agmarknet is sensitive to names.
        filters = f"&filters[district]={district}"
        
        # If crop is specific, try filtering by commodity
        # mapping common names to Agmarknet names if needed (e.g. 'Rice' -> 'Paddy(Dhan)')
        search_crop = crop
        if crop:
            mapping = {
                "Rice": "Paddy(Dhan)",
                "Wheat": "Wheat",
                "Potato": "Potato",
                "Tomato": "Tomato",
                "Maize": "Maize",
                "Cotton": "Cotton"
            }
            search_crop = mapping.get(crop, crop)
            # filters += f"&filters[commodity]={search_crop}" # Removing strict filter for better results initially
            
        final_url = base_url + filters + "&limit=20"
        
        response = requests.get(final_url, timeout=10)
        
        if response.status_code != 200:
             return {"status": "error", "message": f"Market API error: {response.status_code}", "region": region_info, "markets": []}
             
        data = response.json()
        raw_records = data.get("records", [])
        
        # If no records for district, try broadening to state
        if not raw_records and state:
            state_url = base_url + f"&filters[state]={state}&limit=30"
            resp = requests.get(state_url, timeout=10)
            if resp.status_code == 200:
                raw_records = resp.json().get("records", [])

        # Process and Filter by specific crop if provided
        final_records = []
        for r in raw_records:
            # If user asked for a crop, prioritize those records
            if search_crop and search_crop.lower() not in r.get("commodity", "").lower():
                continue
                
            final_records.append({
                "state": r.get("state", ""),
                "district": r.get("district", ""),
                "market": r.get("market", ""),
                "commodity": r.get("commodity", ""),
                "variety": r.get("variety", ""),
                "arrival_date": r.get("arrival_date", ""),
                "min_price": float(r.get("min_price", 0)),
                "max_price": float(r.get("max_price", 0)),
                "modal_price": float(r.get("modal_price", 0))
            })
            if len(final_records) >= 10: break

        return {
            "status": "success",
            "region": region_info,
            "markets": final_records
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "region": "Error during lookup",
            "markets": []
        }
