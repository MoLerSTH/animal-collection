from pydantic import BaseModel, Field
from typing import Optional, List


class AnimalCatalogItem(BaseModel):
    id: str
    code: str
    name: str
    scientificName: Optional[str] = None
    category: str = "Wild"
    defaultImageUrl: Optional[str] = None
    defaultStory: Optional[str] = None
    defaultFavFood: Optional[str] = None
    defaultTemperament: Optional[str] = None
    catalogOrder: int = 0
    # User-specific computed fields (when queried with auth)
    isCaught: bool = False
    userPhotoUrl: Optional[str] = None
    caughtCount: int = 0
    isFavorite: bool = False

    class Config:
        from_attributes = True


class UserCollectionCreate(BaseModel):
    animalId: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=100)
    photoUrl: str = Field(..., min_length=1)
    story: Optional[str] = ""
    favFood: Optional[str] = ""
    temperament: Optional[str] = ""
    isFavorite: Optional[bool] = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class UserCollectionUpdate(BaseModel):
    name: Optional[str] = None
    story: Optional[str] = None
    favFood: Optional[str] = None
    temperament: Optional[str] = None
    isFavorite: Optional[bool] = None


class UserCollectionItem(BaseModel):
    id: str
    userId: str
    animalId: Optional[str] = None
    animalCode: Optional[str] = None
    animalSpecies: str
    category: str = "Wild"
    name: str
    photoUrl: str
    story: str = ""
    favFood: str = ""
    temperament: str = ""
    isFavorite: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    caughtAt: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        from_attributes = True


class CollectionSummaryResponse(BaseModel):
    caughtCount: int
    totalCatalog: int
    favoritesCount: int


class PhotoUploadResponse(BaseModel):
    photoUrl: str
    fileName: str
    fileSize: int
    contentType: str

