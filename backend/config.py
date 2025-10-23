"""
Backend Configuration
Manages application configuration and environment variables
"""

from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    app_name: str = "Unsubscriber Backend"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Server
    host: str = "127.0.0.1"
    port_range_start: int = 50000
    port_range_end: int = 50100
    
    # CORS (only allow localhost)
    cors_origins: list[str] = [
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:5173",
    ]
    
    # Paths
    base_dir: Path = Path(__file__).parent
    data_dir: Path = base_dir / "data"
    logs_dir: Path = base_dir / "logs"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = Settings()

# Ensure directories exist
settings.data_dir.mkdir(parents=True, exist_ok=True)
settings.logs_dir.mkdir(parents=True, exist_ok=True)

