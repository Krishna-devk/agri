import pickle
import pandas as pd
import os
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

def predict_crop_yield(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predicts crop yield based on climate and soil data.
    Input 'data' should be a dictionary with keys matching CropData schema.
    """
    model = _get_model()
    if model is None:
        return {"status": "error", "message": "Model not loaded."}

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
        return {"status": "error", "message": f"Invalid category: {str(ek)}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
