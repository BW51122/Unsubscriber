"""
Health Check API Endpoints
FR-2.1.3: Health endpoint for heartbeat checks
"""

from fastapi import APIRouter
from datetime import datetime
import sys
import platform
import socket
import os

from models.health import HealthResponse, SystemInfo
from config import settings
from utils.logger import logger

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint
    FR-2.1.3: Used by Electron for heartbeat checks every 5 seconds
    
    Returns:
        HealthResponse indicating backend is healthy
    """
    logger.debug("Health check requested")
    
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(),
        version=settings.app_version,
        message="Backend is running normally"
    )


@router.get("/health/detailed", response_model=dict)
async def detailed_health_check():
    """
    Detailed health check with system information
    
    Returns:
        Detailed system and health information
    """
    logger.debug("Detailed health check requested")
    
    system_info = SystemInfo(
        python_version=sys.version,
        platform=platform.platform(),
        hostname=socket.gethostname(),
        process_id=os.getpid()
    )
    
    return {
        "status": "healthy",
        "timestamp": datetime.now(),
        "version": settings.app_version,
        "system": system_info.model_dump(),
        "uptime": "N/A"  # Will be implemented later with actual tracking
    }


@router.get("/ping")
async def ping():
    """
    Simple ping endpoint for connectivity tests
    
    Returns:
        Simple pong response
    """
    return {"message": "pong"}

