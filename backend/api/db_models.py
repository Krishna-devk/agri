from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.dialects.mysql import MEDIUMTEXT
from sqlalchemy.sql import func
from .database import Base

class FarmerProfile(Base):
    __tablename__ = "farmer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String(128), unique=True, index=True, nullable=True) # Optional for now
    email = Column(String(128), unique=True, index=True)
    full_name = Column(String(128), nullable=True)
    phone = Column(String(16), nullable=True)
    
    # Farming related data
    location = Column(String(128), nullable=True)
    crop_type = Column(String(64), nullable=True)
    land_size_acres = Column(Float, nullable=True)
    soil_type = Column(String(64), nullable=True)
    irrigation_method = Column(String(64), nullable=True)
    
    photo_url = Column(MEDIUMTEXT, nullable=True) # For base64 or long image URLs
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def to_dict(self):
        return {
            "email": self.email,
            "full_name": self.full_name,
            "phone": self.phone,
            "location": self.location,
            "crop_type": self.crop_type,
            "land_size_acres": self.land_size_acres,
            "soil_type": self.soil_type,
            "irrigation_method": self.irrigation_method,
            "photo_url": self.photo_url,
        }
