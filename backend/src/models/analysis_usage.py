import uuid
from datetime import date
from sqlalchemy import Column, Integer, Date, ForeignKey, UniqueConstraint
from src.core.database import Base
from src.models.user import GUID


class UserAnalysisUsage(Base):
    __tablename__ = "user_analysis_usages"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    usage_date = Column(Date, default=date.today, nullable=False, index=True)
    count = Column(Integer, default=0, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "usage_date", name="uq_user_analysis_usage_date"),
    )
