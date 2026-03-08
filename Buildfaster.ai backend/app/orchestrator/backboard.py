from typing import Any, Dict, List

class BackboardSession:
    """
    Implements the Backboard orchestration pattern where multiple agents
    read and write to a shared memory space.
    """
    def __init__(self, session_id: str, document_text: str):
        self.session_id = session_id
        self.document_text = document_text
        self.memory: Dict[str, Any] = {}
        
    def write(self, key: str, data: Any):
        """Agents write findings to shared memory."""
        self.memory[key] = data

    def read(self, key: str) -> Any:
        """Agents read dependencies from shared memory."""
        return self.memory.get(key)
        
    def get_all_violations(self) -> List[str]:
        """Aggregate all violations posted to the backboard."""
        v = []
        if self.read("zoning_violations"):
            v.extend(self.read("zoning_violations"))
        if self.read("compliance_violations"):
            v.extend(self.read("compliance_violations"))
        return v
