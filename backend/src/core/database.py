from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from src.core.config import settings

# Engine configuration: Normalize postgresql:// to postgresql+psycopg2:// if using psycopg2 driver
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

try:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        echo=(settings.ENVIRONMENT == "development")
    )
    # Test connection initialization
    with engine.connect() as conn:
        pass
except Exception as e:
    # If postgres driver is missing outside Docker, fallback to SQLite for local testing
    print(f"[Warning] PostgreSQL engine initialization fallback: {e}")
    engine = create_engine(
        "sqlite:///./animal_dev_fallback.db",
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
