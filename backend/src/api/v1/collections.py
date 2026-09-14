import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from src.core.database import get_db
from src.api.deps import get_current_user
from src.models.user import User
from src.models.animal import Animal
from src.models.collection import UserCollection
from src.schemas.collection import (
    UserCollectionCreate,
    UserCollectionUpdate,
    UserCollectionItem,
    CollectionSummaryResponse,
)

router = APIRouter(prefix="/collections", tags=["User Collections"])


@router.get("/summary", response_model=CollectionSummaryResponse)
def get_collection_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns collection statistics for the authenticated user.
    """
    total_catalog = db.query(Animal).count()
    user_records = (
        db.query(UserCollection)
        .filter(UserCollection.user_id == current_user.id)
        .all()
    )
    
    # Distinct animal species caught by the user
    caught_animal_ids = set()
    favorites_count = 0
    for r in user_records:
        if r.animal_id:
            caught_animal_ids.add(str(r.animal_id))
        else:
            caught_animal_ids.add(r.custom_name.lower())
        if r.is_favorite:
            favorites_count += 1

    return CollectionSummaryResponse(
        caughtCount=len(caught_animal_ids),
        totalCatalog=total_catalog,
        favoritesCount=favorites_count,
    )


@router.get("", response_model=List[UserCollectionItem])
def get_user_collections(
    favorite: Optional[bool] = Query(None, description="Filter only favorite animals"),
    search: Optional[str] = Query(None, description="Search by animal or custom name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all caught animal entries for the authenticated user.
    """
    query = (
        db.query(UserCollection)
        .filter(UserCollection.user_id == current_user.id)
    )

    if favorite is not None:
        query = query.filter(UserCollection.is_favorite == favorite)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            (UserCollection.custom_name.ilike(search_pattern))
            | (UserCollection.story.ilike(search_pattern))
        )

    records = query.order_by(UserCollection.caught_at.desc()).all()
    return [UserCollectionItem.model_validate(r.to_dict()) for r in records]


@router.post("", response_model=UserCollectionItem, status_code=status.HTTP_201_CREATED)
def create_collection_entry(
    payload: UserCollectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Save a new caught animal entry for the authenticated user.
    """
    animal = None
    if payload.animalId:
        try:
            animal_uuid = uuid.UUID(str(payload.animalId))
            animal = db.query(Animal).filter(Animal.id == animal_uuid).first()
        except ValueError:
            animal = db.query(Animal).filter(Animal.code == payload.animalId).first()
    
    # Auto-match by name if animalId wasn't found
    if not animal and payload.name:
        animal = (
            db.query(Animal)
            .filter(Animal.name.ilike(payload.name.strip()))
            .first()
        )

    collection = UserCollection(
        user_id=current_user.id,
        animal_id=animal.id if animal else None,
        custom_name=payload.name.strip(),
        photo_url=payload.photoUrl,
        story=payload.story or (animal.default_story if animal else ""),
        fav_food=payload.favFood or (animal.default_fav_food if animal else ""),
        temperament=payload.temperament or (animal.default_temperament if animal else ""),
        is_favorite=bool(payload.isFavorite),
        latitude=payload.latitude,
        longitude=payload.longitude,
    )

    db.add(collection)
    db.commit()
    db.refresh(collection)

    return UserCollectionItem.model_validate(collection.to_dict())


@router.get("/{collection_id}", response_model=UserCollectionItem)
def get_collection_detail(
    collection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific collected animal detail by its ID.
    """
    try:
        coll_uuid = uuid.UUID(collection_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid collection ID")

    record = (
        db.query(UserCollection)
        .filter(UserCollection.id == coll_uuid, UserCollection.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection entry not found")

    return UserCollectionItem.model_validate(record.to_dict())


@router.patch("/{collection_id}", response_model=UserCollectionItem)
def update_collection_entry(
    collection_id: str,
    payload: UserCollectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update notes, snack, temperament, or favorite flag for a caught animal.
    """
    try:
        coll_uuid = uuid.UUID(collection_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid collection ID")

    record = (
        db.query(UserCollection)
        .filter(UserCollection.id == coll_uuid, UserCollection.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection entry not found")

    if payload.name is not None:
        record.custom_name = payload.name.strip()
    if payload.story is not None:
        record.story = payload.story
    if payload.favFood is not None:
        record.fav_food = payload.favFood
    if payload.temperament is not None:
        record.temperament = payload.temperament
    if payload.isFavorite is not None:
        record.is_favorite = payload.isFavorite

    db.commit()
    db.refresh(record)

    return UserCollectionItem.model_validate(record.to_dict())


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection_entry(
    collection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a collected animal entry.
    """
    try:
        coll_uuid = uuid.UUID(collection_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid collection ID")

    record = (
        db.query(UserCollection)
        .filter(UserCollection.id == coll_uuid, UserCollection.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection entry not found")

    db.delete(record)
    db.commit()
    return None

