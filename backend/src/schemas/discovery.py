from pydantic import BaseModel, Field
from typing import Optional, List


class AnimalIdentificationResponse(BaseModel):
    found: bool
    species: str = ""
    story: str = ""
    animalType: Optional[str] = "Unknown"
    habitatTags: Optional[List[str]] = []

    class Config:
        from_attributes = True


class AnalysisUsageResponse(BaseModel):
    used: int
    limit: int
    remaining: int
    resetsAt: str
