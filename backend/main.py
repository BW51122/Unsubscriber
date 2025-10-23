"""
FastAPI Backend Main Entry Point
FR-2.1.2: Embedded Python backend
FR-2.1.4: Dynamic port allocation and announcement
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from utils.logger import logger
from utils.port_finder import PortFinder
from api.health import router as health_router


# ============================================================================
# Application Factory
# ============================================================================

def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application
    
    Returns:
        Configured FastAPI application instance
    """
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Backend API for Unsubscriber - AI-powered email subscription manager",
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
    )
    
    # Configure CORS - only allow localhost
    # NFR-1.2: Backend only accepts connections from localhost
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Register routers
    app.include_router(health_router, tags=["Health"])
    
    # Startup event
    @app.on_event("startup")
    async def startup_event():
        logger.info(f"{settings.app_name} v{settings.app_version} starting up")
        logger.info(f"Debug mode: {settings.debug}")
    
    # Shutdown event
    @app.on_event("shutdown")
    async def shutdown_event():
        logger.info("Backend shutting down")
    
    return app


# ============================================================================
# Main Entry Point
# ============================================================================

def main():
    """
    Main entry point for the backend
    FR-2.1.4: Find available port and announce it to Electron
    """
    logger.info("=" * 60)
    logger.info(f"{settings.app_name} v{settings.app_version}")
    logger.info("=" * 60)
    
    try:
        # FR-2.1.4: Find an available port
        port = PortFinder.find_available_port()
        
        # Create the FastAPI app
        app = create_app()
        
        # FR-2.1.4: Announce port to Electron parent process
        PortFinder.announce_port(port)
        
        # Configure uvicorn
        config = uvicorn.Config(
            app=app,
            host=settings.host,
            port=port,
            log_level="info" if settings.debug else "warning",
            access_log=settings.debug,
            loop="asyncio",
        )
        
        server = uvicorn.Server(config)
        
        logger.info(f"Starting server on {settings.host}:{port}")
        server.run()
        
    except Exception as e:
        logger.error(f"Failed to start backend: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    main()

