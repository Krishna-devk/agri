from fastapi import APIRouter, HTTPException, File, UploadFile
from api.models import (
    MatchRequest, MatchResponse, ChatRequest, ChatResponse,
    TreatmentPlanRequest, TreatmentPlanResponse, VisionAnalysisResponse,
    CropYieldRequest, CropYieldResponse
)
from rag.retriever import match_schemes, ask_ai_question, generate_treatment_plan, analyze_crop_image
from rag.yield_predictor import predict_crop_yield
from rag.embedder import initialise

router = APIRouter()


@router.post("/match", response_model=MatchResponse, summary="Match farmer to government schemes")
async def match_farmer_to_schemes(request: MatchRequest):
    """
    Given a farmer's profile, returns:
    - Top matched government schemes with eligibility & application steps
    - An AI-generated summary (Ollama if available, else rule-based)
    - Curated Google search links for further research
    """
    try:
        result = match_schemes(
            crop_type=request.crop_type,
            location=request.location,
            land_size_acres=request.land_size_acres,
            disease_or_yield_status=request.disease_or_yield_status,
            top_k=request.top_k,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat", response_model=ChatResponse, summary="Ask general farming or scheme questions")
async def general_farming_chat(request: ChatRequest):
    """
    General-purpose AI assistant specifically for:
    - Farming crop government schemes
    - Minimum Support Price (MSP)
    - Agricultural subsidies, insurance, and support
    """
    try:
        result = ask_ai_question(message=request.message, context=request.context)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/treatment-plan", response_model=TreatmentPlanResponse, summary="Generate a recovery schedule for a crop disease")
async def get_treatment_plan(request: TreatmentPlanRequest):
    """
    Dedicated endpoint to generate a personalized recovery schedule (prescription)
    for a specific crop and disease/health status.
    """
    try:
        plan = generate_treatment_plan(crop_type=request.crop_type, disease_info=request.disease_info)
        if not plan:
            raise HTTPException(status_code=500, detail="Failed to generate treatment plan.")
        return {
            "treatment_plan": plan,
            "crop_type": request.crop_type,
            "disease_info": request.disease_info,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-leaf", response_model=VisionAnalysisResponse, summary="Analyze a leaf photo to describe disease/pest issues")
async def analyze_leaf_photo(file: UploadFile = File(...)):
    """
    Upload a photo of a crop/leaf to get a visual explanation of the detected issues.
    This helps farmers with low literacy understand the visual signs of common diseases.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        image_bytes = await file.read()

        result = analyze_crop_image(image_bytes=image_bytes, mime_type=file.content_type)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict-yield", response_model=CropYieldResponse, summary="Predict crop yield based on climate, soil, and fertilizer data")
async def get_crop_yield_prediction(data: CropYieldRequest):
    """Predict crop yield based on climate, soil, and fertilizer data."""
    try:
        data_dict = data.dict()
        
        rf1 = data_dict.pop("Annual_rainfall", None)
        rf2 = data_dict.pop("Annual_rainfail", None)
        actual_rf = rf1 if rf1 is not None else (rf2 if rf2 is not None else 0.0)
        data_dict["Annual_rainfail"] = actual_rf
            
        result = predict_crop_yield(data_dict)

        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["message"])

        base_yield = result["predicted_yield_tonnes_per_ha"]
        real_yield = base_yield * data.ndvi_score

        return {
            "status": result["status"],
            "predicted_yield_tonnes_per_ha": round(real_yield, 2),
            "inputs_received": data.dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schemes", summary="List all available schemes")
async def list_all_schemes():
    """Returns every scheme in the knowledge base (without embeddings)."""
    import json
    from pathlib import Path

    data_path = Path(__file__).parent.parent / "data.json"
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {
        "total": len(data["schemes"]),
        "ministry": data.get("ministry"),
        "source": data.get("source"),
        "schemes": data["schemes"],
    }


@router.get("/health", summary="Health check")
async def health():
    return {"status": "ok"}
