import json
import os
from app.services.gemini_service import ask_gemini

RULES_FILE = os.path.join(os.path.dirname(__file__), "../data/ontario_building_rules.json")

def load_zoning_rules():
    with open(RULES_FILE, "r") as f:
        rules = json.load(f)
    return [r for r in rules if r.get("category") == "zoning"]

def analyze_zoning(building_height: float, num_units: int, lot_width: float, lot_depth: float):
    """
    Agent responsible for checking zoning regulations based on specific inputs.
    """
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
            return json.loads(response[start_idx:end_idx])
        return {"violations": []}
    except Exception:
        # Fallback simulation if LLM parse fails
        violations = []
        if building_height > 10:
            violations.append({"rule": "Max Height", "current": building_height, "allowed": 10})
        if num_units > 4:
            violations.append({"rule": "Max Unit Density", "current": num_units, "allowed": 4})
        if lot_width < 15:
            violations.append({"rule": "Min Lot Width", "current": lot_width, "allowed": 15})
        if lot_depth < 30:
            violations.append({"rule": "Min Lot Depth", "current": lot_depth, "allowed": 30})
        return {"violations": violations}
