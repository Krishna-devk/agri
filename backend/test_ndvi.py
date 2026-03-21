import sys
import asyncio
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from rag.retriever import calculate_pseudo_ndvi
from api.models import CropYieldRequest
from api.routes import get_crop_yield_prediction

async def test():
    try:
        with open("image.jpg", "rb") as f:
            bytes_data = f.read()

        score = calculate_pseudo_ndvi(bytes_data)
        print(f"NDVI Score: {score}")

        req = CropYieldRequest(
            Crop_Type="Wheat",
            Area_Hectares=2.5,
            Season="Rabi",
            Soil_Type="Alluvial",
            Irrigation_Method="Sprinkler",
            Fertilizer_Type="Urea",
            Annual_rainfail=600.0,
            Avg_temp=22.5,
            Humidity=45.0,
            N=120.0,
            P=60.0,
            K=40.0,
            ndvi_score=score if score else 1.0
        )
        res = await get_crop_yield_prediction(req)
        print("Yield Response:", res)
    except Exception as e:
        print(f"Error during testing: {e}")

asyncio.run(test())
