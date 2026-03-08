import json
from app.services.gemini_service import ask_gemini

from app.orchestrator.backboard import BackboardSession

def analyze_compliance(session: BackboardSession):
    """
    Agent responsible for checking building code compliance by parsing blueprint text.
    """
    blueprint_text = session.document_text
    
    prompt = f"""
You are the Compliance Agent. Your job is to analyze the following blueprint text for compliance with building codes.

Specifically detect and check:
- fire exit distance
- window to wall ratio
- stair handrail height
- emergency exit placement

Blueprint Text:
{blueprint_text[:4000]}

Identify any compliance violations based on standard building codes for these parameters. 
Return your findings as a strict JSON object matching this schema exactly:
{{
 "violations":[
   {{
     "rule": "Handrail height",
     "required": "900mm",
     "detected": "850mm"
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
            data = json.loads(response[start_idx:end_idx])
            violations = [f"{v['rule']}: required {v.get('required', '')}, detected {v.get('detected', '')}" for v in data.get("violations", [])]
        else:
            violations = []
    except Exception as e:
        print(f"Error parsing compliance JSON: {e}")
        # Fallback simulation if LLM parse fails or API key is missing
        violations = []
        if "850mm" in blueprint_text or "handrail" in blueprint_text.lower():
            violations.append("Handrail height: required 900mm, detected 850mm (simulated)")
        if "fire exit" in blueprint_text.lower() and "50m" in blueprint_text:
             violations.append("Fire exit distance: required Max 40m, detected 50m (simulated)")
             
    session.write("compliance_violations", violations)
    return violations
