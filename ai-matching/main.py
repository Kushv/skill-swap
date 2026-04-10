from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from matching_engine import calculate_matches

app = FastAPI(title="SkillSwap AI Matching Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

class MatchRequest(BaseModel):
    userId: str
    skillsToTeach: List[str]
    skillsToLearn: List[str]
    learningStyle: str
    existingConnections: List[str]

@app.post("/match")
async def get_matches(request: MatchRequest):
    try:
        matches = await calculate_matches(
            request.userId,
            request.skillsToTeach,
            request.skillsToLearn,
            request.learningStyle,
            request.existingConnections
        )
        return {"matches": matches}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
