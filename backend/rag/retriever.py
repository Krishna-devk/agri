"""
Retriever: Builds farmer query → Passes full data.json to openai/gpt-oss-120b:free (via OpenRouter)
→ model selects top schemes and synthesises answer → adds Google search URLs.

Vision analysis uses nvidia/nemotron-nano-12b-v2-vl:free (via OpenRouter) for crop disease detection.
"""

from __future__ import annotations

import os
import io
import re
import base64
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus
from PIL import Image

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# ---------------------------------------------------------------------------
# AI clients (Dual Strategy: Groq for Text, OpenRouter for Vision)
# ---------------------------------------------------------------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPEN_ROUTER_API_KEY", "")

# Vision: nvidia/nemotron-nano-12b-v2-vl:free via OpenRouter
VISION_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free"

# Text/Reasoning: openai/gpt-oss-120b via Groq
TEXT_MODEL = "openai/gpt-oss-120b"
FALLBACK_TEXT_MODEL = "llama-3.3-70b-versatile"

# Client for image analysis (OpenRouter)
ai_vision_client = OpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": "https://agrisenseai.com",
        "X-Title": "AgriSense AI",
    },
    timeout=300,
)

# Client for all text reasoning (Groq)
ai_text_client = OpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1",
    timeout=300,
)

# ---------------------------------------------------------------------------
# Data helpers
# ---------------------------------------------------------------------------
DATA_PATH = Path(__file__).parent.parent / "data.json"


def _load_data() -> Dict[str, Any]:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Core LLM helper
# ---------------------------------------------------------------------------
# (Models defined above at module-level)

def _openrouter_chat_completion(
    model: str,
    messages: List[Dict[str, Any]],
    temperature: float = 0.3,
) -> str:
    """Call Groq chat completions with fallback safety."""
    try:
        response = ai_text_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        print(f"[OpenRouter] Error calling {model}: {e}")
        
        # Automatic fallback if the primary or requested model fails
        if model != FALLBACK_TEXT_MODEL:
            print(f"[AI Text] Attempting fallback to {FALLBACK_TEXT_MODEL}...")
            try:
                response = ai_text_client.chat.completions.create(
                    model=FALLBACK_TEXT_MODEL,
                    messages=messages,
                    temperature=temperature,
                )
                return response.choices[0].message.content or ""
            except Exception as fe:
                print(f"[OpenRouter] Fallback failed: {fe}")
        
        return ""


# ---------------------------------------------------------------------------
# Query builder
# ---------------------------------------------------------------------------
def build_query(
    crop_type: str,
    location: str,
    land_size_acres: float,
    disease_or_yield_status: str,
) -> str:
    size_desc = "small/marginal farmer (≤2 ha)" if land_size_acres <= 4.94 else "large farmer (>2 ha)"
    return (
        f"Farmer growing {crop_type} in {location}. "
        f"Land size: {land_size_acres} acres ({size_desc}). "
        f"Current crop status: {disease_or_yield_status}. "
        f"Needs government schemes support."
    )


# ---------------------------------------------------------------------------
# Google search URL builder
# ---------------------------------------------------------------------------
def google_search_urls(
    scheme_names: List[str],
    crop_type: str,
    location: str,
    disease_or_yield_status: str,
) -> List[Dict[str, str]]:
    results = []
    for name in scheme_names[:3]:
        q = f"{name} application steps India"
        results.append({"label": f"Apply — {name}", "url": f"https://www.google.com/search?q={quote_plus(q)}"})
    return results


# ---------------------------------------------------------------------------
# Scheme matching + summarisation
# ---------------------------------------------------------------------------
def _openrouter_match_and_summarize(farmer_query: str, all_schemes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Passes the entire schemes JSON to the LLM for comprehensive matching and summarisation."""
    
    # We pass the full JSON as requested by the user, avoiding any 'heavy' embedding/filtering logic.
    schemes_json = json.dumps(all_schemes, indent=2)

    messages = [
        {
            "role": "system", 
            "content": (
                "You are a Senior Indian Agricultural Policy Advisor. "
                "Analyze the provided JSON of agricultural schemes in detail. "
                "1. Select the most relevant scheme IDs for the farmer. "
                "2. Provide a detailed summary and application guidance. "
                "Return the response in this format:\n"
                "TOP_SCHEME_IDS: [id1, id2, ...]\n"
                "SUMMARY_START\n"
                "[Your detailed guidance here]\n"
                "SUMMARY_END"
            )
        },
        {"role": "user", "content": f"Farmer Profile: {farmer_query}\n\nFull Schemes Data:\n{schemes_json}"}
    ]

    raw_response = _openrouter_chat_completion(TEXT_MODEL, messages)

    if not raw_response:
        return {"summary": _rule_based_summary(farmer_query, all_schemes[:5]), "top_ids": [s["id"] for s in all_schemes[:5]]}

    try:
        id_match = re.search(r"TOP_SCHEME_IDS:\s*\[(.*?)\]", raw_response)
        summary_match = re.search(r"SUMMARY_START\n?(.*?)\n?SUMMARY_END", raw_response, re.DOTALL)
        top_ids = [int(i.strip()) for i in id_match.group(1).split(",") if i.strip()] if id_match else []
        summary = summary_match.group(1).strip() if summary_match else raw_response
        return {"summary": summary, "top_ids": top_ids}
    except Exception:
        return {"summary": raw_response, "top_ids": [s["id"] for s in all_schemes[:5]]}


# ---------------------------------------------------------------------------
# NDVI (pseudo)
# ---------------------------------------------------------------------------
def calculate_pseudo_ndvi(image_bytes: bytes) -> Optional[float]:
    """Visible Atmospherically Resistant Index (VARI) calculation."""
    try:
        import numpy as np
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_np = np.array(img).astype(float)
        R, G = img_np[:, :, 0], img_np[:, :, 1]
        ndvi_map = (G - R) / (G + R + 1e-8)
        veg_pixels = ndvi_map[ndvi_map > 0.05]
        if len(veg_pixels) == 0:
            return 0.5
        mean_ndvi = float(np.mean(veg_pixels))
        return round(min(max((2.5 * mean_ndvi) + 0.375, 0.4), 1.2), 3)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Vision analysis  (nvidia/nemotron-nano-12b-v2-vl:free via OpenRouter)
# ---------------------------------------------------------------------------
def analyze_crop_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> Dict[str, Any]:
    """Vision analysis using OpenRouter multimodal model + text refinement."""
    try:
        ndvi_score = calculate_pseudo_ndvi(image_bytes)

        # Scale down for vision efficiency
        try:
            img = Image.open(io.BytesIO(image_bytes))
            if max(img.size) > 1024:
                img.thumbnail((1024, 1024))
                buf = io.BytesIO()
                img.save(buf, format="JPEG")
                image_bytes = buf.getvalue()
                mime_type = "image/jpeg"
        except Exception:
            pass

        # Encode image to base64 for OpenRouter vision API
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        image_data_url = f"data:{mime_type};base64,{b64_image}"

        # Step 1: Image analysis — nvidia/nemotron-nano-12b-v2-vl:free via OpenRouter
        print(f"[Vision] Sending image to {VISION_MODEL} via OpenRouter...")
        try:
            vision_response = ai_vision_client.chat.completions.create(
                model=VISION_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": (
                                    "You are an expert agronomist examining a crop photograph.\n"
                                    "CRITICAL: You MUST correctly differentiate between Potato and Tomato leaves.\n"
                                    " - Potato leaves are compound with large terminal leaflets and smaller lateral leaflets, often with a rougher texture and entire (smooth) or slightly wavy margins.\n"
                                    " - Tomato leaves are deeply lobed, highly serrated (jagged edges), and have a very distinct jagged/pointed appearance.\n"
                                    "Your task:\n"
                                    "1. Analyze the leaf structure step-by-step (compound vs lobed, margins, texture) before declaring the crop name. State the exact crop categorically (e.g., Potato, Tomato, Rice).\n"
                                    "2. Describe in detail any visible symptoms of disease or pests.\n"
                                    "3. Suggest the most probable disease name based on the symptoms.\n"
                                    "ONLY if the image clearly shows a non-agricultural object, write: NOT_A_PLANT."
                                )
                            },
                            {"type": "image_url", "image_url": {"url": image_data_url}},
                        ],
                    }
                ],
                temperature=0.1,
            )
            vision_analysis = vision_response.choices[0].message.content or ""
            print(f"[Vision] nvidia analysis complete ({len(vision_analysis)} chars).")
        except Exception as e:
            print(f"[Vision] nvidia call failed: {e}")
            # Fallback: ask GPT-OSS on Groq to do a text-only best-effort diagnosis
            vision_analysis = (
                "Vision unavailable. Based on common Indian agricultural diseases, "
                "please provide a best-effort diagnosis and treatment for the most "
                "likely diseases for a common crop."
            )

        # --- SECURITY FILTER: Guard against Non-Plant Hallucinations ---
        agri_keywords = ["leaf", "plant", "crop", "vegetable", "fruit", "disease", "pest", "symptom", "blight", "spot", "wilt", "farm", "agriculture", "herb", "shrub", "tree", "analysis"]
        is_not_plant = "NOT_A_PLANT" in vision_analysis.upper()
        # If it explicitly says it is not a plant, but then mentions leaves/crops, we ignore the rejection.
        has_keywords = any(kw in vision_analysis.lower() for kw in agri_keywords)

        if is_not_plant and not has_keywords:
            return {
                "raw_analysis": (
                    "### 🤖 AgriSense AI Assistant\n\n"
                    "I am your **AgriSense bot**! I've analyzed your photo, but it **doesn't appear to be a crop, plant, or leaf**. \n\n"
                    "I am specialized in agricultural diagnosis. To help you better, please upload a clear, close-up photo of a crop or leaf. ✨"
                ),
                "identified_crop": "None",
                "visual_symptoms": "High confidence: Non-agricultural subject matter.",
                "most_probable_disease": "Non-Crop Image Detected",
                "identified_issues": [], "weather_causes": "N/A", "recommendations": "Provide a plant photo.",
                "confidence_description": "N/A", "ndvi_score": None
            }

        # Step 2: Refinement — openai/gpt-oss-120b via Groq
        # Takes nvidia's raw vision analysis and produces a structured diagnostic report.
        print(f"[Text] Sending nvidia output to {TEXT_MODEL} on Groq for refinement...")
        refinement_messages = [
            {
                "role": "system", 
                "content": (
                    "You are a Senior Plant Pathologist and Agronomist. "
                    "You have received a visual description of a crop image from a vision AI. "
                    "Your job is to produce a professional structured diagnostic report in the exact format below.\n"
                    "CRITICAL: If the vision AI describes characteristics of a Potato (compound, rough, smoother edges) but calls it a Tomato, CORRECT IT to Potato. If it describes a Tomato (deeply lobed, serrated/jagged) but calls it a Potato, CORRECT IT to Tomato. The final crop name MUST logically match the physical description.\n"
                    "Only output 'NOT_A_PLANT' if the vision input explicitly says the image is not a plant."
                )
            },
            {"role": "user", "content": (
                f"Visual Analysis from NVIDIA Vision Model:\n{vision_analysis}\n\n"
                "Now produce the structured report in this EXACT format:\n"
                "**Crop Name:** [specific crop, e.g. Potato, Tomato, Rice]\n"
                "**Symptoms:** [detailed description of visible symptoms]\n"
                "**Most Probable Disease:** [disease name with pathogen in brackets if known]\n"
                "**Health Score:** [decimal 0.0 to 1.0, where 1.0=healthy, 0.0=severely diseased]\n"
                "**Recommendations:** [treatment steps, pesticides, cultural practices]"
            )}
        ]

        reasoning_text = _openrouter_chat_completion(TEXT_MODEL, refinement_messages)
        print(f"[Text] GPT-OSS refinement complete ({len(reasoning_text)} chars).")

        if not reasoning_text or "NOT_A_PLANT" in reasoning_text.upper():
             return {
                "raw_analysis": "Invalid analysis result. Please upload a clear plant photo.",
                "identified_crop": "None", "visual_symptoms": "N/A", "most_probable_disease": "Non-Crop Image Detected",
                "identified_issues": [], "weather_causes": "N/A", "recommendations": "N/A", 
                "confidence_description": "N/A", "ndvi_score": None
            }

        def extract_section(full_text: str, heading: str) -> str:
            pattern = rf"\*\*{heading}\*\*\s*(.*?)(?=\*\*|$)"
            match = re.search(pattern, full_text, re.DOTALL | re.IGNORECASE)
            return match.group(1).strip() if match else ""

        id_crop = extract_section(reasoning_text, "Crop Name:")
        v_symptoms = extract_section(reasoning_text, "Symptoms:")
        m_prob_disease = extract_section(reasoning_text, "Most Probable Disease:")
        h_score_str = extract_section(reasoning_text, "Health Score:")
        recs = extract_section(reasoning_text, "Recommendations:")

        # Parse health score
        try:
            h_score = float(re.findall(r"0\.\d+|1\.0|0", h_score_str)[0])
        except (ValueError, IndexError):
            h_score = 0.5  # Fallback

        return {
            "raw_analysis": reasoning_text,
            "identified_crop": id_crop,
            "visual_symptoms": v_symptoms,
            "crop_health_probability": h_score,
            "most_probable_disease": m_prob_disease,
            "identified_issues": [], "weather_causes": "N/A", "recommendations": recs,
            "confidence_description": "High" if m_prob_disease else "Low",
            "ndvi_score": ndvi_score,
        }

    except Exception as e:
        print(f"[Vision Pipeline Error]: {e}")
        return {
            "raw_analysis": (
                f"❌ **AgriSense Bot Alert**: A pipeline error occurred.\n\n"
                f"**Error:** {str(e)}\n\n"
                "**Pipeline:** NVIDIA Nemotron (OpenRouter) → GPT-OSS 120B (Groq)\n"
                "Please check that both OPEN_ROUTER_API_KEY and GROQ_API_KEY are set in your .env file."
            ),
            "identified_crop": "Error", "visual_symptoms": "N/A",
            "most_probable_disease": "Pipeline Error",
            "identified_issues": [], "confidence_description": "Error", "ndvi_score": None
        }


# ---------------------------------------------------------------------------
# Treatment plan
# ---------------------------------------------------------------------------
def generate_treatment_plan(crop_type: str, disease_info: str) -> Optional[str]:
    """Generates a personalised recovery schedule."""
    messages = [
        {"role": "system", "content": "You are a Senior Plant Pathologist. Generate a professional crop recovery prescription."},
        {"role": "user", "content": f"Crop: {crop_type}\nStatus: {disease_info}"}
    ]
    result = _openrouter_chat_completion(TEXT_MODEL, messages)
    return result if result else None


# ---------------------------------------------------------------------------
# Rule-based fallback
# ---------------------------------------------------------------------------
def _rule_based_summary(farmer_query: str, schemes: List[Dict[str, Any]]) -> str:
    lines = ["## 🌱 Agricultural Support & Schemes\n"]
    for rank, s in enumerate(schemes, 1):
        lines.append(f"\n### {rank}. {s['name']}\n**Purpose:** {s.get('purpose')}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def match_schemes(
    crop_type: str,
    location: str,
    land_size_acres: float,
    disease_or_yield_status: str,
    top_k: int = 5,
) -> Dict[str, Any]:
    query = build_query(crop_type, location, land_size_acres, disease_or_yield_status)
    data = _load_data()
    all_schemes = data.get("schemes", [])
    analysis = _openrouter_match_and_summarize(query, all_schemes)

    top_ids = analysis["top_ids"]
    matched_schemes = []
    id_map = {s["id"]: s for s in all_schemes}
    
    for i, sid in enumerate(top_ids[:top_k]):
        if sid in id_map:
            s_data = dict(id_map[sid])
            # Match the SchemeMatch model fields exactly
            s_data["rank"] = i + 1
            s_data["relevance_score"] = round(1.0 - (i * 0.05), 2)
            matched_schemes.append(s_data)
    
    if not matched_schemes:
        # Fallback to defaults with correct field names
        for i, s in enumerate(all_schemes[:top_k]):
            s_dict = dict(s)
            s_dict["rank"] = i + 1
            s_dict["relevance_score"] = 0.5
            matched_schemes.append(s_dict)

    scheme_names = [s["name"] for s in matched_schemes]
    treatment_plan = generate_treatment_plan(crop_type, disease_or_yield_status)

    return {
        "farmer_profile": {
            "crop_type": crop_type, "location": location,
            "land_size_acres": land_size_acres, "disease_or_yield_status": disease_or_yield_status,
        },
        "query_used": query,
        "matched_schemes": matched_schemes,
        "ai_summary": analysis["summary"],
        "treatment_plan": treatment_plan,
        "google_search_results": google_search_urls(scheme_names, crop_type, location, disease_or_yield_status),
    }


def ask_ai_question(message: str, context: Optional[str] = None) -> Dict[str, Any]:
    """Answers general farming questions."""
    messages = [
        {"role": "system", "content": "You are 'Krishi Sahayak' (Farmer Assistant). Answer ONLY agricultural scheme/MSP questions."},
        {"role": "user", "content": f"Context: {context}\n\nQuestion: {message}" if context else message}
    ]
    try:
        text = _openrouter_chat_completion(TEXT_MODEL, messages)
        if not text:
            raise ValueError("AI engine returned empty response.")
        return {"response": text, "suggested_actions": ["Check official portal"]}
    except Exception as e:
        return {"response": f"Error: {str(e)}", "suggested_actions": []}
