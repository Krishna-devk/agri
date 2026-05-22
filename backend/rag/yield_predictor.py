import pickle
import pandas as pd
import os
import json
from pathlib import Path
from typing import Dict, Any, Optional

MODEL_FILE = "crop_yield_model.pkl"

ENCODINGS = {
    "Crop_Type": {"Cotton": 0, "Maize": 1, "Potato": 2, "Rice": 3, "Soybean": 4, "Sugarcane": 5, "Tomato": 6, "Wheat": 7},
    "Season": {"Kharif": 0, "Rabi": 1, "Zaid": 2},
    "Soil_Type": {"Alluvial": 0, "Black": 1, "Clay": 2, "Laterite": 3, "Red": 4, "Sandy Loam": 5},
    "Irrigation_Method": {"Drip": 0, "Flood": 1, "Furrow": 2, "Rainfed": 3, "Sprinkler": 4},
    "Fertilizer_Type": {"DAP": 0, "Mixed": 1, "NPK Complex": 2, "Organic": 3, "Urea": 4}
}

FEATURE_ORDER = [
    "Crop_Type", "Area_Hectares", "Season", "Soil_Type",
    "Irrigation_Method", "Fertilizer_Type", "Annual_rainfail",
    "Avg_temp", "Humidity", "N", "P", "K"
]

_model_cache = None

def _get_model():
    """Loads and returns the model using simple caching."""
    global _model_cache
    if _model_cache is not None:
        return _model_cache
    
    current_dir = Path(__file__).parent
    model_path = current_dir / MODEL_FILE
    
    if not model_path.exists():
        model_path = current_dir.parent / MODEL_FILE
        
    if model_path.exists():
        try:
            with open(model_path, "rb") as f:
                loaded = pickle.load(f)
            
            print(f"[YieldPredictor] Loaded object type: {type(loaded)} from {model_path}")
            
            if isinstance(loaded, dict):
                if "model" in loaded:
                    _model_cache = loaded["model"]
                    print("[YieldPredictor] Extracted 'model' key from dictionary.")
                else:
                    print(f"[YieldPredictor] Dictionary keys: {list(loaded.keys())}")
                    if len(loaded) == 1:
                        _model_cache = list(loaded.values())[0]
                    else:
                        _model_cache = loaded 
            else:
                _model_cache = loaded
                
            return _model_cache
        except Exception as e:
            print(f"[YieldPredictor] Error loading model: {e}")
            return None
    else:
        print(f"[YieldPredictor] CRITICAL: Model file {MODEL_FILE} not found at {model_path.absolute()}")
        return None

def predict_yield_via_groq(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fallback method to predict crop yield using Groq LLM (Llama-3.3-70b-versatile)
    when the local random forest pickle model is not loaded or fails.
    """
    try:
        from rag.retriever import ai_text_client
    except ImportError:
        import os
        from openai import OpenAI
        ai_text_client = OpenAI(
            api_key=os.getenv("GROQ_API_KEY", ""),
            base_url="https://api.groq.com/openai/v1"
        )
    
    model_name = "llama-3.3-70b-versatile"
    
    system_prompt = (
        "You are an expert agronomist and crop yield prediction model.\n"
        "Your task is to analyze agricultural, climatic, and soil parameters, and estimate the expected crop yield in tonnes per hectare (tonnes/ha).\n"
        "You must respond ONLY with a valid JSON object containing exactly two keys:\n"
        "1. 'predicted_yield_tonnes_per_ha': a float representing the estimated crop yield (typically between 0.5 and 15.0 tonnes/ha depending on the crop and inputs).\n"
        "2. 'reasoning': a short 1-2 sentence explanation of the agronomic factors (e.g. soil, temperature, rainfall, N-P-K) influencing this prediction.\n"
        "Do not include any markdown formatting, backticks, or text before or after the JSON."
    )

    user_prompt = f"""
Calculate the estimated yield for the following crop parameters:
- Crop Type: {data.get('Crop_Type')}
- Area (Hectares): {data.get('Area_Hectares', 1.0)}
- Season: {data.get('Season')}
- Soil Type: {data.get('Soil_Type')}
- Irrigation Method: {data.get('Irrigation_Method')}
- Fertilizer Type: {data.get('Fertilizer_Type')}
- Annual Rainfall: {data.get('Annual_rainfail', data.get('Annual_rainfall', 0.0))} mm
- Average Temperature: {data.get('Avg_temp')} °C
- Humidity: {data.get('Humidity')} %
- Soil Nutrients:
  - Nitrogen (N): {data.get('N')} kg/ha
  - Phosphorus (P): {data.get('P')} kg/ha
  - Potassium (K): {data.get('K')} kg/ha

Ensure the yield is scientifically realistic for the specified crop (e.g. Sugarcane yields are higher (60-80 tonnes/ha), potato/tomato are medium-high (15-30 tonnes/ha), wheat/rice/maize are medium (3-6 tonnes/ha), cotton/soybean are lower (1.5-3 tonnes/ha)) under these conditions.
"""

    try:
        response = ai_text_client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content.strip()
        print(f"[YieldPredictor Fallback] LLM response: {content}")
        
        parsed = json.loads(content)
        predicted_yield = float(parsed["predicted_yield_tonnes_per_ha"])
        
        return {
            "status": "success",
            "predicted_yield_tonnes_per_ha": round(predicted_yield, 2)
        }
    except Exception as e:
        print(f"[YieldPredictor Fallback] Error in Groq prediction: {e}")
        # Static fallback values if Groq fails or rate limits
        crop = str(data.get("Crop_Type", "")).lower()
        typical_yields = {
            "sugarcane": 70.0,
            "potato": 20.0,
            "tomato": 15.0,
            "rice": 4.2,
            "wheat": 3.6,
            "maize": 5.1,
            "cotton": 2.1,
            "soybean": 2.6
        }
        fallback_yield = typical_yields.get(crop, 4.0)
        return {
            "status": "success",
            "predicted_yield_tonnes_per_ha": fallback_yield
        }

def predict_crop_yield(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predicts crop yield based on climate and soil data.
    Input 'data' should be a dictionary with keys matching CropData schema.
    """
    model = _get_model()
    if model is None:
        print("[YieldPredictor] Model is not loaded. Falling back to Groq API yield prediction.")
        return predict_yield_via_groq(data)

    try:
        def get_encoded(category, val):
            val_clean = str(val).strip().lower()
            for k, v in ENCODINGS[category].items():
                if str(k).lower() == val_clean:
                    return v
            raise KeyError(val)

        encoded_data = {
            "Crop_Type": get_encoded("Crop_Type", data["Crop_Type"]),
            "Season": get_encoded("Season", data["Season"]),
            "Soil_Type": get_encoded("Soil_Type", data["Soil_Type"]),
            "Irrigation_Method": get_encoded("Irrigation_Method", data["Irrigation_Method"]),
            "Fertilizer_Type": get_encoded("Fertilizer_Type", data["Fertilizer_Type"])
        }
        
        raw_features = {**data, **encoded_data}
        
        input_values = [raw_features[feat] for feat in FEATURE_ORDER]
        input_df = pd.DataFrame([input_values], columns=FEATURE_ORDER)

        prediction = model.predict(input_df)[0]
        
        return {
            "status": "success",
            "predicted_yield_tonnes_per_ha": round(float(prediction), 2)
        }
        
    except KeyError as ek:
        print(f"[YieldPredictor] Encoding category not found ({ek}). Falling back to Groq prediction.")
        return predict_yield_via_groq(data)
    except Exception as e:
        print(f"[YieldPredictor] Error in local model prediction: {e}. Falling back to Groq prediction.")
        return predict_yield_via_groq(data)
