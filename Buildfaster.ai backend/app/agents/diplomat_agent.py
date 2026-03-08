import json
from app.services.gemini_service import ask_gemini

from app.orchestrator.backboard import BackboardSession

def generate_suggestions(session: BackboardSession):
    """
    Agent responsible for converting building violations into helpful a technical memo.
    """
    violations = session.get_all_violations()
    if not violations:
        session.write("suggestions", ["Excellent job! The blueprint looks fully compliant with all known rules."])
        return []
        
    violations_text = "\n".join([f"- {v}" for v in violations])
    
    prompt = f"""
You are the Diplomat Agent, a professional building code consultant. 
Your job is to take a list of building and zoning violations and constructively suggest fixes to the architect.
Provide clear, actionable technical memos recommending how to fix the issues to comply with the Ontario Building Code.

Violations:
{violations_text}

Output format:
Return your suggestions as a strict JSON list of strings exactly in this format per string (with no extra markdown framing):
[
  "Violation:\\nHandrail height = 850mm\\n\\nSuggestion:\\nIncrease handrail height to at least 900mm to comply with the Ontario Building Code."
]
"""
    
    response = ask_gemini(prompt)
    
    try:
        start_idx = response.find('[')
        end_idx = response.rfind(']') + 1
        if start_idx != -1 and end_idx != -1:
            sugs = json.loads(response[start_idx:end_idx])
        else:
            sugs = []
    except Exception as e:
        print(f"Error parsing diplomat suggestions JSON: {e}")
        # Fallback simulation
        sugs = [
            f"Violation:\n{v}\n\nSuggestion:\nPlease address this issue to comply with the Ontario Building Code."
            for v in violations
        ]
        
    session.write("suggestions", sugs)
    return sugs
