"""
Dynamic Port Allocation Utility
FR-2.1.4: Find and claim an available network port
"""

import socket
from config import settings
from utils.logger import logger


class PortFinder:
    """Utility to find available network ports"""
    
    @staticmethod
    def is_port_available(port: int) -> bool:
        """
        Check if a specific port is available
        
        Args:
            port: Port number to check
            
        Returns:
            True if port is available, False otherwise
        """
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                sock.bind((settings.host, port))
                return True
        except OSError:
            return False
    
    @staticmethod
    def find_available_port() -> int:
        """
        Find an available port within the configured range
        FR-2.1.4: Dynamic port allocation
        
        Returns:
            Available port number
            
        Raises:
            RuntimeError: If no available port is found in the range
        """
        logger.info(
            f"Searching for available port in range "
            f"{settings.port_range_start}-{settings.port_range_end}"
        )
        
        for port in range(settings.port_range_start, settings.port_range_end + 1):
            if PortFinder.is_port_available(port):
                logger.info(f"Found available port: {port}")
                return port
        
        error_msg = (
            f"No available ports found in range "
            f"{settings.port_range_start}-{settings.port_range_end}"
        )
        logger.error(error_msg)
        raise RuntimeError(error_msg)
    
    @staticmethod
    def announce_port(port: int) -> None:
        """
        Announce the port to stdout for Electron to capture
        FR-2.1.4: Report port back to Electron shell
        
        Args:
            port: Port number to announce
        """
        # Use a specific format that Electron can parse
        print(f"PORT:{port}", flush=True)
        logger.info(f"Port announced to parent process: {port}")

