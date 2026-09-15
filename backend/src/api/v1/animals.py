from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.core.database import get_db
from src.api.deps import get_optional_current_user
from src.models.user import User
from src.models.animal import Animal
from src.models.collection import UserCollection
from src.schemas.collection import AnimalCatalogItem

router = APIRouter(prefix="/animals", tags=["Animals Catalog"])


@router.get("", response_model=List[AnimalCatalogItem])
def get_animals_catalog(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Retrieve master animal catalog.
    If authenticated, returns dynamic `isCaught`, `userPhotoUrl`, `caughtCount`, and `isFavorite` status.
    """
    query = db.query(Animal)
    if category:
        query = query.filter(Animal.category.ilike(category))

    catalog_animals = query.order_by(Animal.catalog_order.asc()).all()

    # Pre-fetch user's collections if user is authenticated
    user_collections_by_animal = {}
    if current_user:
        user_colls = (
            db.query(UserCollection)
            .filter(UserCollection.user_id == current_user.id)
            .order_by(UserCollection.caught_at.desc())
            .all()
        )
        for c in user_colls:
            target_aid = None
            if c.animal_id:
                aid = str(c.animal_id)
                if aid not in user_collections_by_animal:
                    user_collections_by_animal[aid] = []
                user_collections_by_animal[aid].append(c)
                target_aid = str(c.animal_id)
            elif c.custom_name:
                name_clean = c.custom_name.strip().lower()
                for a in catalog_animals:
                    a_name = a.name.lower()
                    a_code = a.code.lower().replace("_", " ")
                    if (
                        a_name == name_clean
                        or a_code == name_clean
                        or (len(name_clean) >= 3 and (name_clean in a_name or a_name in name_clean))
                    ):
                        target_aid = str(a.id)
                        break
            if target_aid:
                if target_aid not in user_collections_by_animal:
                    user_collections_by_animal[target_aid] = []
                user_collections_by_animal[target_aid].append(c)

    results = []
    for a in catalog_animals:
        aid = str(a.id)
        user_records = user_collections_by_animal.get(aid, [])
        is_caught = len(user_records) > 0
        latest_photo = user_records[0].photo_url if is_caught else None
        is_favorite = any(r.is_favorite for r in user_records)

        item = AnimalCatalogItem(
            id=aid,
            code=a.code,
            name=a.name,
            scientificName=a.scientific_name,
            category=a.category,
            defaultImageUrl=a.default_image_url,
            defaultStory=a.default_story,
            defaultFavFood=a.default_fav_food,
            defaultTemperament=a.default_temperament,
            catalogOrder=a.catalog_order,
            isCaught=is_caught,
            userPhotoUrl=latest_photo,
            caughtCount=len(user_records),
            isFavorite=is_favorite,
        )
        results.append(item)

    return results

