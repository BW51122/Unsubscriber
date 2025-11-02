"""
Backend Configuration
Manages application configuration and environment variables
"""

from pydantic_settings import BaseSettings
from pathlib import Path
import os


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
        "http://localhost:5174",  # Alternative Vite port
    ]
    
    # Google OAuth 2.0
    google_client_id: str = ""
    google_client_secret: str = ""
    google_oauth_redirect_uri: str = "http://localhost:8080/callback"
    
    # OAuth Callback Server
    oauth_callback_port: int = 8080
    oauth_timeout_seconds: int = 300  # 5 minutes
    
    # Gmail API Scopes
    gmail_scopes: list[str] = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/userinfo.email",
    ]
    
    # Database
    database_path: str = "data/unsubscriber.db"
    
    # Paths
    base_dir: Path = Path(__file__).parent
    data_dir: Path = base_dir / "data"
    logs_dir: Path = base_dir / "logs"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
    
    def get_database_url(self) -> str:
        """Get SQLAlchemy database URL"""
        db_path = self.data_dir / self.database_path.split('/')[-1]
        return f"sqlite+aiosqlite:///{db_path}"


# Global settings instance
settings = Settings()

# Ensure directories exist
settings.data_dir.mkdir(parents=True, exist_ok=True)
settings.logs_dir.mkdir(parents=True, exist_ok=True)
