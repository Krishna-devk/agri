from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class MatchRequest(BaseModel):
    crop_type: str = Field(..., example="Rice", description="The primary crop being grown.")
    location: str = Field(..., example="Punjab, India", description="State or district of the farmer.")
    land_size_acres: float = Field(..., gt=0, example=2.5, description="Total cultivable land in acres.")
    disease_or_yield_status: str = Field(
        ...,
        example="Blast disease detected, 30% yield loss expected",
        description="Current crop health or yield situation.",
    )
    top_k: Optional[int] = Field(5, ge=1, le=15, description="Number of top schemes to return.")


class SchemeMatch(BaseModel):
    rank: int
    id: int
    name: str
    category: Optional[str]
    purpose: Optional[str]
    eligibility: Optional[str]
    application_process: Optional[str]
    documents_required: List[str]
    coverage_risks: Optional[str]
    mandatory_requirements: Optional[str]
    where_to_apply_links: List[str]
    relevance_score: float


class GoogleSearchResult(BaseModel):
    label: str
    url: str


class MatchResponse(BaseModel):
    farmer_profile: Dict[str, Any]
    query_used: str
    matched_schemes: List[SchemeMatch]
    ai_summary: str
    treatment_plan: Optional[str] = None
    google_search_results: List[GoogleSearchResult]


class ChatRequest(BaseModel):
    message: str = Field(..., example="What is the current MSP for Wheat?")
    context: Optional[str] = Field(None, description="Optional context if any previous conversation or profile data is relevant.")


class ChatResponse(BaseModel):
    response: str
    suggested_actions: List[str] = Field(default_factory=list)


class TreatmentPlanRequest(BaseModel):
    crop_type: str = Field(..., example="Pomegranate")
    disease_info: str = Field(..., example="Bacterial Blight detected, 20% yield loss")


class TreatmentPlanResponse(BaseModel):
    treatment_plan: str
    crop_type: str
    disease_info: str


class VisionAnalysisResponse(BaseModel):
    raw_analysis: str
    identified_crop: Optional[str] = None
    visual_symptoms: Optional[str] = None
    crop_health_probability: Optional[float] = None
    most_probable_disease: Optional[str] = None
    identified_issues: List[str]
    weather_causes: Optional[str] = None
    recommendations: Optional[str] = None
    confidence_description: str
    ndvi_score: Optional[float] = Field(None, description="Calculated NDVI score from the image if available.")


class CropYieldRequest(BaseModel):
    Crop_Type: str
    Area_Hectares: float
    Season: str
    Soil_Type: str
    Irrigation_Method: str
    Fertilizer_Type: str
    Annual_rainfall: Optional[float] = None
    Annual_rainfail: Optional[float] = None
    Avg_temp: float
    Humidity: float
    N: float
    P: float
    K: float
    ndvi_score: float = Field(1.0, description="NDVI score multiplier to adjust the final yield.")


class CropYieldResponse(BaseModel):
    status: str
    predicted_yield_tonnes_per_ha: float = Field(..., description="Estimated yield in tonnes per hectare.")
    inputs_received: Optional[Dict[str, Any]] = None
