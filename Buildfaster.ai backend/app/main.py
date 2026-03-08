import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from app.services.blueprint_parser import parse_blueprint
from app.agents.zoning_agent import analyze_zoning
from app.agents.compliance_agent import analyze_compliance
from app.agents.diplomat_agent import generate_suggestions

app = FastAPI(title="BuildFaster.ai Multi-Agent Backend")

# Mount a static folder to serve 3D models to the frontend viewer
app.mount("/static", StaticFiles(directory="app/static"), name="static")

class AnalysisResult(BaseModel):
    violations: list[str]
    suggestions: list[str]
    compliance_score: int

class ZoningRequest(BaseModel):
    building_height: float
    num_units: int
    lot_width: float
    lot_depth: float

# In-memory store for parsed blueprints to simulate a database flow
blueprints_store = {}

@app.get("/")
def home():
    return {"message": "Welcome to BuildFaster.ai Backend"}

@app.post("/upload")
async def upload_blueprint(file: UploadFile = File(...)):
    """
    Endpoint 1: Upload blueprint (PDF)
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    # Read PDF content
    content = await file.read()
    
    # Parse PDF text
    parsed_text = parse_blueprint(content)
    
    bp_id = str(uuid.uuid4())
    blueprints_store[bp_id] = parsed_text
    
    return {
        "message": "Blueprint uploaded successfully", 
        "blueprint_id": bp_id, 
        "filename": file.filename
    }

@app.post("/analyze/{blueprint_id}")
async def analyze_blueprint(blueprint_id: str):
    """
    Endpoint 2: Analyze the blueprint
    Starts the multi-agent workflow context without returning full compliance issues immediately.
    """
    if blueprint_id not in blueprints_store:
        raise HTTPException(status_code=404, detail="Blueprint not found")
        
    text = blueprints_store[blueprint_id]
    
    # 1. Zoning check handled by Zoning Agent (mock extracting values for simulation)
    zoning_res = analyze_zoning(building_height=12.0, num_units=5, lot_width=10.0, lot_depth=20.0)
    zoning_violations = [f"{v['rule']}: current {v['current']}, allowed {v['allowed']}" for v in zoning_res.get("violations", [])]
    
    # 2. Compliance check handled by Compliance Agent
    compl_res = analyze_compliance(text)
    compliance_violations = [f"{v['rule']}: required {v['required']}, detected {v['detected']}" for v in compl_res.get("violations", [])]
    
    return {
        "message": "Analysis completed.",
        "zoning_violations_found": len(zoning_violations),
        "compliance_violations_found": len(compliance_violations),
        "next_step": f"Call /compliance/{blueprint_id} to get full details."
    }

@app.get("/compliance/{blueprint_id}", response_model=AnalysisResult)
async def get_compliance_issues(blueprint_id: str):
    """
    Endpoint 3: Return compliance issues
    Follows our Multi-Agent Workflow:
    1. zoning_agent checks zoning rules
    2. compliance_agent checks building compliance
    3. diplomat_agent generates fix suggestions
    """
    if blueprint_id not in blueprints_store:
        raise HTTPException(status_code=404, detail="Blueprint not found")
        
    text = blueprints_store[blueprint_id]
    
    # Multi-agent simulation interaction
    zoning_res = analyze_zoning(building_height=12.0, num_units=5, lot_width=10.0, lot_depth=20.0)
    zoning_violations = [f"{v['rule']}: current {v['current']}, allowed {v['allowed']}" for v in zoning_res.get("violations", [])]
    compl_res = analyze_compliance(text)
    compliance_violations = [f"{v['rule']}: required {v['required']}, detected {v['detected']}" for v in compl_res.get("violations", [])]
    
    all_violations = zoning_violations + compliance_violations
    
    if all_violations:
        # Diplomat Agent generates constructive suggestions
        suggestions = generate_suggestions(all_violations, text)
        
        # Calculate a simulated score
        # Base 100, minus 15 points per violation, bounded to 0-100
        compliance_score = max(0, 100 - (len(all_violations) * 15))
    else:
        suggestions = ["Excellent job! The blueprint looks fully compliant with all known rules."]
        compliance_score = 100
        
    return AnalysisResult(
        violations=all_violations,
        suggestions=suggestions,
        compliance_score=compliance_score
    )

@app.post("/zoning")
def check_zoning_parameters(req: ZoningRequest):
    """
    Direct endpoint to check simplified municipal zoning rules against specific project values.
    """
    return analyze_zoning(
        req.building_height,
        req.num_units,
        req.lot_width,
        req.lot_depth
    )
