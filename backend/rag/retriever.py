"""
Retriever: Builds farmer query → Passes full data.json to deepseek-v3.1:671b-cloud
→ model selects top schemes and synthesises answer → adds Google search URLs.
"""

from __future__ import annotations

import os
import textwrap
import io
import re
import base64
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus
from PIL import Image
import ollama

import json





DATA_PATH = Path(__file__).parent.parent / "data.json"

def _load_data() -> Dict[str, Any]:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def _ollama_chat_completion(model: str, messages: List[Dict[str, Any]], temperature: float = 0.3) -> str:
    """Helper to call Ollama chat completion."""
    try:
        response = ollama.chat(
            model=model,
            messages=messages,
            options={'temperature': temperature}
        )
        return response['message']['content']
    except Exception as e:
        print(f"[Ollama] Error calling {model}: {e}")
        return ""


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
        f"Needs government schemes for insurance, financial aid, "
        f"input subsidies, mechanisation, irrigation, and disease/yield support."
    )


def google_search_urls(
    scheme_names: List[str],
    crop_type: str,
    location: str,
    disease_or_yield_status: str,
) -> List[Dict[str, str]]:
    results = []

    for name in scheme_names[:3]:
        q = f"{name} how to apply online India 2025"
        results.append({"label": f"Apply — {name}", "url": f"https://www.google.com/search?q={quote_plus(q)}"})

    extra = [
        f"{crop_type} crop disease {disease_or_yield_status} government scheme India",
        f"farm subsidy {location} India 2025",
        f"{crop_type} PM Fasal Bima crop insurance apply",
        "PM-KISAN eligibility apply online India",
        f"Kisan Credit Card {crop_type} {location}",
    ]
    for q in extra:
        results.append({"label": q, "url": f"https://www.google.com/search?q={quote_plus(q)}"})

    return results


_schemes_cache: List[Dict[str, Any]] = []

def _ollama_match_and_summarize(farmer_query: str, all_schemes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Passes all schemes to the LLM. 
    The LLM selects the top matched schemes AND provides the summary.
    """
    global _schemes_cache
    if not _schemes_cache:
        # Minify schemes for context efficiency
        for s in all_schemes:
            _schemes_cache.append({
                "id": s["id"],
                "name": s["name"],
                "purpose": s.get("purpose", ""),
                "eligibility": s.get("eligibility", ""),
                "category": s.get("category", ""),
                "application_process": s.get("application_process", ""),
                "documents_required": s.get("documents_required", []),
                "coverage_risks": s.get("coverage_risks", ""),
                "mandatory_requirements": s.get("mandatory_requirements", ""),
                "links": s.get("where_to_apply_links", [])
            })

    schemes_json = json.dumps(_schemes_cache, indent=2)

    messages = [
        {
            "role": "system",
            "content": (
                "You are a Senior Indian Agricultural Policy Advisor. "
                "You will be given a farmer's profile and a list of all available government schemes. "
                "Your task is twofold:\n"
                "1. Select the top 5 most relevant schemes for this farmer.\n"
                "2. Provide a personalized, empathetic summary and actionable guide.\n\n"
                "Return your response in the following format:\n"
                "TOP_SCHEME_IDS: [id1, id2, id3, id4, id5]\n"
                "SUMMARY_START\n"
                "[Your detailed markdown summary here]\n"
                "SUMMARY_END"
            )
        },
        {
            "role": "user",
            "content": (
                f"### Farmer Profile:\n{farmer_query}\n\n"
                f"### All Available Schemes:\n{schemes_json}\n\n"
                "Requirements for the summary:\n"
                "1. **General Introduction**: 2-3 sentences on how these schemes help their specific situation.\n"
                "2. **Ranked Schemes**: List the top 5 schemes by name with a brief intro.\n"
                "3. **Actionable Guide**: For the top 3, provide a step-by-step 'how-to-apply'.\n"
                "4. **Documents**: List exact paper documents needed.\n"
                "5. **Eligibility Risks**: Flag any potential disqualifiers.\n\n"
                "Important: You MUST provide the TOP_SCHEME_IDS list first."
            )
        }
    ]

    raw_response = _ollama_chat_completion("deepseek-v3.1:671b-cloud", messages, temperature=0.3)
    
    if not raw_response:
        return {"summary": _rule_based_summary(farmer_query, all_schemes[:5]), "top_ids": [s["id"] for s in all_schemes[:5]]}

    # Parse IDs and Summary
    try:
        id_match = re.search(r"TOP_SCHEME_IDS:\s*\[(.*?)\]", raw_response)
        summary_match = re.search(r"SUMMARY_START\n?(.*?)\n?SUMMARY_END", raw_response, re.DOTALL)
        
        top_ids = []
        if id_match:
            id_str = id_match.group(1)
            top_ids = [int(i.strip()) for i in id_str.split(",") if i.strip()]
        
        summary = summary_match.group(1).strip() if summary_match else raw_response
        # Clean up tags if they leaked into summary
        summary = re.sub(r"TOP_SCHEME_IDS:.*?\n", "", summary)
        summary = re.sub(r"SUMMARY_START", "", summary)
        summary = re.sub(r"SUMMARY_END", "", summary).strip()

        return {"summary": summary, "top_ids": top_ids}
    except Exception as e:
        print(f"[Retriever] Parsing error: {e}")
        return {"summary": raw_response, "top_ids": [s["id"] for s in all_schemes[:5]]}


def generate_treatment_plan(crop_type: str, disease_info: str) -> Optional[str]:
    """Generates a personalized recovery schedule (prescription) for a crop disease."""
    messages = [
        {
            "role": "system",
            "content": (
                "You are a Senior Plant Pathologist and Agricultural Scientist. "
                "Your job is to provide specific, science-backed 'Crop Recovery Prescriptions'. "
                "Your advice should be structured like a professional medical prescription for a farm. "
                "Focus on both organic and chemical interventions, safety, and long-term soil health."
            )
        },
        {
            "role": "user",
            "content": (
                f"Generate a personalized 'Recovery Schedule' (Prescription) for this crop.\n\n"
                f"### Crop: {crop_type}\n"
                f"### Symptoms/Situation: {disease_info}\n\n"
                f"Include:\n"
                f"1. **Identification**: Precise diagnosis.\n"
                f"2. **Daily/Weekly Recovery Plan**: Actionable steps on specific days.\n"
                f"3. **Required Inputs**: Tools, fertilizers, or pesticides needed.\n"
                f"4. **Safety & Prevention**: Critical warnings and hygiene tips.\n\n"
                f"Format as markdown with the title: 🌱 **Professional Crop Recovery Prescription**"
            )
        }
    ]

    result = _ollama_chat_completion("deepseek-v3.1:671b-cloud", messages, temperature=0.2)
    return result if result else None


def calculate_pseudo_ndvi(image_bytes: bytes) -> Optional[float]:
    """Calculates a Visible Atmospherically Resistant Index (VARI) or pseudo-NDVI from Green and Red channels."""
    try:
        import numpy as np
        
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_np = np.array(img).astype(float)
        
        R = img_np[:, :, 0]
        G = img_np[:, :, 1]
        
        ndvi_map = (G - R) / (G + R + 1e-8)
        
        veg_pixels = ndvi_map[ndvi_map > 0.05]
        
        if len(veg_pixels) == 0:
            return 0.5
            
        mean_ndvi = float(np.mean(veg_pixels))
        
        mapped_score = (2.5 * mean_ndvi) + 0.375
        
        return round(min(max(mapped_score, 0.4), 1.2), 3)
    except Exception as e:
        print(f"[calculate_pseudo_ndvi] Error: {e}")
        return None

def analyze_crop_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> Dict[str, Any]:
    """Uses OpenAI vision model to describe crop issues and suggest treatments."""
    try:
        ndvi_score = calculate_pseudo_ndvi(image_bytes)

        try:
            img = Image.open(io.BytesIO(image_bytes))
            max_size = 1024
            if max(img.size) > max_size:
                img.thumbnail((max_size, max_size))
                buffer = io.BytesIO()
                img.save(buffer, format=img.format or "JPEG")
                image_bytes = buffer.getvalue()
        except Exception as img_err:
            print(f"[Vision] Pillow could not open image: {img_err}")
            return {
                "raw_analysis": "The uploaded file is not a valid image or is corrupted.",
                "identified_issues": [],
                "confidence_description": "Error",
                "ndvi_score": None
            }

        try:
            ollama_response = ollama.chat(
                model='qwen3-vl:235b-cloud',
                messages=[{
                    'role': 'user',
                    'content': 'Analyze this crop/plant image in detail. Identify the crop name, any diseases, and specific visual symptoms.',
                    'images': [image_bytes]
                }]
            )
            ollama_analysis = ollama_response['message']['content']
        except Exception as oll_err:
            print(f"[Ollama] Analysis failed: {oll_err}")
            ollama_analysis = f"Ollama vision analysis could not be completed. Error: {str(oll_err)}"

        try:
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are a master agronomist and plant pathologist. "
                        "You will receive an initial vision analysis of a crop image. "
                        "Your job is to refine this information, ensure agricultural technical accuracy, "
                        "and format it into a strictly structured diagnosis for a downstream engine."
                    )
                },
                {
                    "role": "user",
                    "content": (
                        f"Initial Vision Analysis from Qwen3-VL:\n{ollama_analysis}\n\n"
                        "Refine this analysis and provide a professional agricultural diagnosis. "
                        "If the input indicates the image is not a plant, crop, or leaf, strictly respond with 'NOT_A_PLANT'.\n\n"
                        "Otherwise, follow this exact structure:\n"
                        "**Crop Name:** [Common Name]\n"
                        "**Symptoms:** [Detailed visual signs identified in the analysis]\n"
                        "**Crop Health Probability:** [A decimal between 0.1 and 1.0]\n"
                        "**Most Probable Disease:** [The single most likely identification]\n"
                        "**Suggested Diseases:**\n- [Optional alternate 1]\n- [Optional alternate 2]\n"
                        "**Weather Causes:** [Environmental triggers]\n"
                        "**Recommendations:** [2-3 clear actionable steps]"
                    )
                }
            ]
            reasoning_text = _ollama_chat_completion("deepseek-v3.1:671b-cloud", messages, temperature=0.2)
            if not reasoning_text:
                raise ValueError("Ollama refinement failed")
        except Exception as e:
            print(f"[Vision] Ollama refinement error: {e}")
            raise e

        if "NOT_A_PLANT" in reasoning_text.upper():
            return {
                "raw_analysis": "I am specialized in agricultural diagnosis. This image does not appear to be a plant, crop, or leaf. Please upload a clear photo of your crop to get a diagnosis.",
                "identified_crop": "None",
                "visual_symptoms": "N/A - Image is not a plant.",
                "most_probable_disease": "None",
                "identified_issues": [],
                "weather_causes": "N/A",
                "recommendations": "Please provide a plant photo.",
                "confidence_description": "Low",
                "ndvi_score": None
            }

        def extract_section(full_text, heading):
            pattern = rf"\*\*{heading}\*\*\s*(.*?)(?=\*\*|$)"
            match = re.search(pattern, full_text, re.DOTALL | re.IGNORECASE)
            return match.group(1).strip() if match else ""

        identified_crop = extract_section(reasoning_text, "Crop Name:")
        visual_symptoms = extract_section(reasoning_text, "Symptoms:")
        crop_health_raw = extract_section(reasoning_text, "Crop Health Probability:")
        most_probable_disease = extract_section(reasoning_text, "Most Probable Disease:")
        suggested_diseases_raw = extract_section(reasoning_text, "Suggested Diseases:")
        weather_causes = extract_section(reasoning_text, "Weather Causes:")
        recommendations = extract_section(reasoning_text, "Recommendations:")

        crop_health_probability = 0.3
        try:
            prob_match = re.search(r"(\d+\.\d+)", crop_health_raw)
            if prob_match:
                crop_health_probability = float(prob_match.group(1))
        except:
            pass

        identified_issues = []
        if suggested_diseases_raw:
            lines = suggested_diseases_raw.split('\n')
            for line in lines:
                cleaned_line = re.sub(r'^[\*\-\d\.]+\s*', '', line).strip()
                if cleaned_line:
                    identified_issues.append(cleaned_line)

        return {
            "raw_analysis": reasoning_text,
            "identified_crop": identified_crop,
            "visual_symptoms": visual_symptoms,
            "crop_health_probability": crop_health_probability,
            "most_probable_disease": most_probable_disease,
            "identified_issues": identified_issues,
            "weather_causes": weather_causes,
            "recommendations": recommendations,
            "confidence_description": "High" if most_probable_disease else "Low",
            "ndvi_score": ndvi_score
        }

    except Exception as e:
        print(f"[Vision/Reasoning] Pipeline error: {e}")
        return {
            "raw_analysis": f"Error in analysis pipeline: {str(e)}",
            "identified_issues": [],
            "confidence_description": "Error",
            "ndvi_score": None
        }


def _rule_based_summary(farmer_query: str, schemes: List[Dict[str, Any]]) -> str:
    lines = [
        "## 🌱 Agricultural Support & Schemes\n",
        "Based on your profile, we have identified several government schemes designed to provide financial, technical, or insurance support to help your farming operations thrive.\n",
        f"**Your Profile Data:** {farmer_query}\n",
        "---\n",
    ]
    for rank, s in enumerate(schemes, 1):
        lines.append(f"\n### {rank}. {s['name']}")
        lines.append(f"**About this Scheme:** {s.get('purpose', 'Government assistance for eligible farmers.')}")
        lines.append(f"**Category:** {s.get('category', 'N/A')}")
        lines.append(f"**Eligibility:** {s.get('eligibility', 'N/A')}")
        lines.append(f"\n**How to Apply:**\n{s.get('application_process', 'N/A')}")
        docs = s.get("documents_required", [])
        if docs:
            lines.append("\n**Documents Required:**")
            for d in docs:
                lines.append(f"  - {d}")
        links = s.get("where_to_apply_links", [])
        if links:
            lines.append("\n**Official Links:**")
            for lnk in links:
                lines.append(f"  - {lnk}")
        lines.append(f"\n**Coverage/Risks Addressed:** {s.get('coverage_risks', 'N/A')}")
        lines.append(f"**Mandatory Requirements:** {s.get('mandatory_requirements', 'N/A')}")
        lines.append("\n---")
    return "\n".join(lines)


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
    
    # Use LLM to match and summarize in one go
    analysis = _ollama_match_and_summarize(query, all_schemes)
    
    summary = analysis["summary"]
    top_ids = analysis["top_ids"]
    
    # Filter and preserve order from LLM
    matched_schemes = []
    id_map = {s["id"]: s for s in all_schemes}
    for i, sid in enumerate(top_ids[:top_k]):
        if sid in id_map:
            s = dict(id_map[sid])
            s["_score"] = 1.0 - (i * 0.05) # Pseudo score for UI
            matched_schemes.append(s)
            
    # Fallback if LLM failed to give IDs
    if not matched_schemes:
        matched_schemes = all_schemes[:top_k]

    scheme_names = [s["name"] for s in matched_schemes]
    treatment_plan = generate_treatment_plan(crop_type, disease_or_yield_status)
    google_links = google_search_urls(scheme_names, crop_type, location, disease_or_yield_status)

    return {
        "farmer_profile": {
            "crop_type": crop_type,
            "location": location,
            "land_size_acres": land_size_acres,
            "disease_or_yield_status": disease_or_yield_status,
        },
        "query_used": query,
        "matched_schemes": [
            {
                "rank": i + 1,
                "id": s["id"],
                "name": s["name"],
                "category": s.get("category"),
                "purpose": s.get("purpose"),
                "eligibility": s.get("eligibility"),
                "application_process": s.get("application_process"),
                "documents_required": s.get("documents_required", []),
                "coverage_risks": s.get("coverage_risks"),
                "mandatory_requirements": s.get("mandatory_requirements"),
                "where_to_apply_links": s.get("where_to_apply_links", []),
                "relevance_score": round(s.get("_score", 0), 4),
            }
            for i, s in enumerate(matched_schemes)
        ],
        "ai_summary": summary,
        "treatment_plan": treatment_plan,
        "google_search_results": google_links,
    }


def ask_ai_question(message: str, context: Optional[str] = None) -> Dict[str, Any]:
    """Answers general-purpose farming questions using a specialized system prompt."""
    system_instruction = textwrap.dedent("""
        You are 'Krishi Sahayak' (Farmer Assistant), a highly specialized AI consultant for Indian agriculture.
        Your sole purpose is to assist farmers, FPOs, and agri-entrepreneurs with accurate information on:
        1. Government Schemes (Central & State level e.g., PM-KISAN, PMFBY, KCC, NAM).
        2. Minimum Support Price (MSP) for various crops and historical trends.
        3. Subsidies (Machinery, Seeds, Fertilizers, Irrigation).
        4. Crop Insurance and Disaster Compensation.
        5. Post-harvest management and Mandi related information.

        Strict Constraints:
        - ONLY answer questions related to the topics above. If a user asks about anything else (e.g., entertainment, general history, programming, non-agri health), politely decline by saying: "I am specialized only in Indian agricultural schemes, MSP, and farming support. I cannot help with that topic."
        - Use simple, clear language. If the question mentions a specific state or crop, tailor your answer accordingly.
        - provide actionable steps (e.g., 'Visit the nearest CSC', 'Apply on the PMFBY portal').
        - Always mention that the farmer should verify the latest details from official government websites.
        - Be empathetic and supportive.

        Response Format:
        - Use clear headings and bullet points.
        - Keep it concise but comprehensive.
    """).strip()

    full_query = message
    if context:
        full_query = f"Context: {context}\n\nQuestion: {message}"

    messages = [
        {
            "role": "system",
            "content": (
                "You are 'Krishi Sahayak' (Farmer Assistant), a highly specialized AI consultant for Indian agriculture. "
                "Your expertise covers: \n"
                "1. Government Schemes (PM-KISAN, PMFBY, KCC, etc.)\n"
                "2. Minimum Support Price (MSP) & Market Trends\n"
                "3. Agricultural Subsidies (Machinery, Seeds, Irrigation)\n"
                "4. Crop Insurance & Disaster Support\n\n"
                "STRICT RULES:\n"
                "- Decline non-agricultural questions immediately.\n"
                "- Provide clear, actionable steps for every answer (e.g., 'Go to the nearest Taluka office').\n"
                "- Always recommend verifying with official 'gov.in' portals.\n"
                "- Be supportive, professional, and concise."
            )
        },
        {"role": "user", "content": full_query}
    ]

    try:
        text = _ollama_chat_completion("deepseek-v3.1:671b-cloud", messages, temperature=0.4)
        if not text:
            raise ValueError("Ollama chat failed")

        suggested = ["Check official portal", "Visit local Agriculture Office"]
        if "PM-KISAN" in text:
            suggested.append("Register on PM-KISAN Portal")
        if "MSP" in text:
            suggested.append("Check nearest Mandi rates")

        return {
            "response": text,
            "suggested_actions": list(set(suggested)),
        }
    except Exception as e:
        print(f"[Chat] Ollama generation error: {e}")
        return {
            "response": f"Sorry, I encountered an error while processing your request: {str(e)}",
            "suggested_actions": ["Try again later"],
        }

