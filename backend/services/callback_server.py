"""
Temporary HTTP server for OAuth callback
Runs only during OAuth flow to capture authorization code
"""

import asyncio
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from threading import Thread
import time

from config import settings
from utils.logger import logger


class CallbackHandler(BaseHTTPRequestHandler):
    """HTTP request handler for OAuth callback"""
    
    # Class variable to store received code
    received_code: str | None = None
    received_state: str | None = None
    received_error: str | None = None
    
    def do_GET(self):
        """Handle GET request from OAuth redirect"""
        # Parse URL
        parsed_path = urlparse(self.path)
        params = parse_qs(parsed_path.query)
        
        # Check for error
        if 'error' in params:
            CallbackHandler.received_error = params['error'][0]
            self.send_success_response("Authorization denied. You can close this window.")
            logger.warn(f"OAuth error received: {CallbackHandler.received_error}")
            return
        
        # Extract code and state
        code = params.get('code', [None])[0]
        state = params.get('state', [None])[0]
        
        if code and state:
            CallbackHandler.received_code = code
            CallbackHandler.received_state = state
            self.send_success_response("Success! You can close this window and return to Unsubscriber.")
            logger.info("OAuth callback received successfully")
        else:
            CallbackHandler.received_error = "Missing code or state parameter"
            self.send_error_response("Invalid callback parameters")
            logger.error("OAuth callback missing required parameters")
    
    def send_success_response(self, message: str):
        """Send HTML success response"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authorization Successful</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }}
                .container {{
                    background: white;
                    padding: 40px;
                    border-radius: 10px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    text-align: center;
                }}
                h1 {{ color: #28a745; margin-bottom: 20px; }}
                p {{ color: #666; font-size: 16px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>✓ {message}</h1>
                <p>You may now close this window.</p>
            </div>
        </body>
        </html>
        """
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(html.encode())
    
    def send_error_response(self, message: str):
        """Send HTML error response"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authorization Failed</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                }}
                .container {{
                    background: white;
                    padding: 40px;
                    border-radius: 10px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    text-align: center;
                }}
                h1 {{ color: #dc3545; margin-bottom: 20px; }}
                p {{ color: #666; font-size: 16px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>✗ {message}</h1>
                <p>Please try again.</p>
            </div>
        </body>
        </html>
        """
        self.send_response(400)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(html.encode())
    
    def log_message(self, format: str, *args):
        """Override to use our logger instead of printing to stderr"""
        logger.debug(f"Callback server: {format % args}")


class OAuthCallbackServer:
    """Temporary server to capture OAuth callback"""
    
    def __init__(self):
        self.server: HTTPServer | None = None
        self.thread: Thread | None = None
        self.is_running = False
    
    def start(self) -> None:
        """Start the callback server"""
        if self.is_running:
            logger.warn("Callback server is already running")
            return
        
        # Reset class variables
        CallbackHandler.received_code = None
        CallbackHandler.received_state = None
        CallbackHandler.received_error = None
        
        # Create server
        self.server = HTTPServer(('localhost', settings.oauth_callback_port), CallbackHandler)
        
        # Run in separate thread so it doesn't block
        self.thread = Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        
        self.is_running = True
        logger.info(f"OAuth callback server started on port {settings.oauth_callback_port}")
    
    def stop(self) -> None:
        """Stop the callback server"""
        if not self.is_running:
            return
        
        if self.server:
            self.server.shutdown()
            self.server.server_close()
        
        self.is_running = False
        logger.info("OAuth callback server stopped")
    
    async def wait_for_callback(self, expected_state: str, timeout_seconds: int = 300) -> tuple[str, str]:
        """
        Wait for OAuth callback with authorization code
        
        Args:
            expected_state: Expected state value for CSRF protection
            timeout_seconds: Maximum time to wait (default 5 minutes per SRS)
            
        Returns:
            Tuple of (code, state)
            
        Raises:
            TimeoutError: If callback not received within timeout
            ValueError: If error received or state mismatch
        """
        logger.info(f"Waiting for OAuth callback (timeout: {timeout_seconds}s)")
        
        start_time = time.time()
        
        while time.time() - start_time < timeout_seconds:
            # Check if code received
            if CallbackHandler.received_code and CallbackHandler.received_state:
                code = CallbackHandler.received_code
                state = CallbackHandler.received_state
                
                # Verify state matches (CSRF protection)
                if state != expected_state:
                    raise ValueError("State mismatch - possible CSRF attack")
                
                logger.info("OAuth callback received and validated")
                return code, state
            
            # Check if error received
            if CallbackHandler.received_error:
                error = CallbackHandler.received_error
                raise ValueError(f"OAuth error: {error}")
            
            # Wait a bit before checking again
            await asyncio.sleep(0.5)
        
        # Timeout
        logger.error(f"OAuth callback timeout after {timeout_seconds} seconds")
        raise TimeoutError(f"OAuth callback not received within {timeout_seconds} seconds")


# Global instance
callback_server = OAuthCallbackServer()

