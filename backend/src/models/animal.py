import uuid
from sqlalchemy import Column, String, Integer, Text, DateTime
from src.core.database import Base
from src.models.user import GUID, get_utc_now


class Animal(Base):
    __tablename__ = "animals"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    scientific_name = Column(String(150), nullable=True)
    category = Column(String(50), default="Wild", nullable=False)
    default_image_url = Column(String(1024), nullable=True)
    default_story = Column(Text, nullable=True)
    default_fav_food = Column(String(100), nullable=True)
    default_temperament = Column(String(100), nullable=True)
    catalog_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    def to_dict(self):
        return {
            "id": str(self.id),
            "code": self.code,
            "name": self.name,
            "scientificName": self.scientific_name,
            "category": self.category,
            "defaultImageUrl": self.default_image_url,
            "defaultStory": self.default_story,
            "defaultFavFood": self.default_fav_food,
            "defaultTemperament": self.default_temperament,
            "catalogOrder": self.catalog_order,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }

