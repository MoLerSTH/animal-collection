import uuid
from sqlalchemy import Column, String, Text, Boolean, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from src.core.database import Base
from src.models.user import GUID, get_utc_now


class UserCollection(Base):
    __tablename__ = "user_collections"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    animal_id = Column(GUID(), ForeignKey("animals.id", ondelete="SET NULL"), nullable=True, index=True)
    
    custom_name = Column(String(100), nullable=False)
    photo_url = Column(String(1024), nullable=False)
    story = Column(Text, nullable=True, default="")
    fav_food = Column(String(100), nullable=True, default="")
    temperament = Column(String(100), nullable=True, default="")
    is_favorite = Column(Boolean, default=False, nullable=False, index=True)
    
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    caught_at = Column(DateTime, default=get_utc_now, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    user = relationship("User", backref="collections")
    animal = relationship("Animal", backref="collections")

    def to_dict(self):
        return {
            "id": str(self.id),
            "userId": str(self.user_id),
            "animalId": str(self.animal_id) if self.animal_id else None,
            "animalCode": self.animal.code if self.animal else None,
            "animalSpecies": self.animal.name if self.animal else self.custom_name,
            "category": self.animal.category if self.animal else "Wild",
            "name": self.custom_name,
            "photoUrl": self.photo_url,
            "story": self.story or "",
            "favFood": self.fav_food or "",
            "temperament": self.temperament or "",
            "isFavorite": self.is_favorite,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "caughtAt": self.caught_at.isoformat() if self.caught_at else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


# Composite index for filtering user favorites
Index("idx_user_collections_user_fav", UserCollection.user_id, UserCollection.is_favorite)

