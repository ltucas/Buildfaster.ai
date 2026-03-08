import json
import os
from app.services.gemini_service import ask_gemini

RULES_FILE = os.path.join(os.path.dirname(__file__), "../data/ontario_building_rules.json")

def load_zoning_rules():
    with open(RULES_FILE, "r") as f:
        rules = json.load(f)
    return [r for r in rules if r.get("category") == "zoning"]

from app.orchestrator.backboard import BackboardSession
import re

def analyze_zoning(session: BackboardSession):
    """
    Agent responsible for checking zoning regulations by extracting specifics from blueprint and applying rules.
    """
    text = session.document_text
    
    extract_prompt = f"""
Extract the following building parameters from the blueprint text. If missing, guess reasonable defaults.
Return JSON with keys: 'building_height' (float), 'num_units' (int), 'lot_width' (float), 'lot_depth' (float).
Text: {text[:2000]}
"""
    extraction_res = ask_gemini(extract_prompt)
    
    # Defaults
    building_height, num_units, lot_width, lot_depth = 12.0, 5, 10.0, 20.0
    try:
        start_idx = extraction_res.find('{')
        end_idx = extraction_res.rfind('}') + 1
        if start_idx != -1 and end_idx != -1:
            data = json.loads(extraction_res[start_idx:end_idx])
            building_height = float(data.get("building_height", building_height))
            num_units = int(data.get("num_units", num_units))
            lot_width = float(data.get("lot_width", lot_width))
            lot_depth = float(data.get("lot_depth", lot_depth))
    except Exception as e:
        print(f"Extraction parsing failed, using defaults. Error: {e}")

    session.write("building_params", {
        "building_height": building_height,
        "num_units": num_units,
        "lot_width": lot_width,
        "lot_depth": lot_depth
    })

    rules = load_zoning_rules()
    rules_context = json.dumps(rules, indent=2)
    
    prompt = f"""
You are the Zoning Agent. Evaluate the following project parameters against the simplified municipal zoning rules.

Rules:
{rules_context}

Inputs:
- Building Height: {building_height}
- Number of Units: {num_units}
- Lot Width: {lot_width}
- Lot Depth: {lot_depth}

Identify any zoning violations (e.g. exceeds height limit, exceeds unit density, insufficient lot width/depth).
Return your findings as a strict JSON object matching this schema:
{{
  "violations":[
    {{
      "rule":"Max Height",
      "current":12,
      "allowed":10
    }}
  ]
}}

If there are no violations, return {{"violations": []}}.
Do NOT output any markdown formatting like ```json, just the pure JSON string.
"""
    
    response = ask_gemini(prompt)
    
    try:
        start_idx = response.find('{')
        end_idx = response.rfind('}') + 1
        if start_idx != -1 and end_idx != -1:
            violations_data = json.loads(response[start_idx:end_idx])
            violations = [f"{v['rule']}: current {v.get('current', '')}, allowed {v.get('allowed', '')}" for v in violations_data.get("violations", [])]
        else:
            violations = []
    except Exception:
        # Fallback simulation if LLM parse fails
        violations = []
        if building_height > 10:
            violations.append(f"Max Height: current {building_height}, allowed 10")
        if num_units > 4:
            violations.append(f"Max Unit Density: current {num_units}, allowed 4")
        if lot_width < 15:
            violations.append(f"Min Lot Width: current {lot_width}, allowed 15")
        if lot_depth < 30:
            violations.append(f"Min Lot Depth: current {lot_depth}, allowed 30")

    session.write("zoning_violations", violations)
    return violations
