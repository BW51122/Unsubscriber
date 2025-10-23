"""
Health Check Models
"""

from pydantic import BaseModel
from datetime import datetime


class HealthResponse(BaseModel):
    """Health check response model"""
    status: str
    timestamp: datetime
    version: str
    message: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "timestamp": "2025-10-21T12:00:00",
                "version": "1.0.0",
                "message": "Backend is running normally"
            }
        }


class SystemInfo(BaseModel):
    """System information model"""
    python_version: str
    platform: str
    hostname: str
    process_id: int

