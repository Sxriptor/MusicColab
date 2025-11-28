#!/usr/bin/env python3
"""
Local WebSocket Signaling Server for WebRTC Desktop Host App

This server facilitates WebRTC connection establishment between the host
and remote users by relaying SDP offers/answers and ICE candidates.
"""

import asyncio
import json
import logging
import argparse
from typing import Dict, Set, Optional
from dataclasses import dataclass, field
from datetime import datetime

try:
    import websockets
    from websockets.server import WebSocketServerProtocol
except ImportError:
    print("Error: websockets library not found. Install with: pip install websockets")
    exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class Client:
    """Represents a connected client (host or remote user)"""
    websocket: WebSocketServerProtocol
    client_id: str
    is_host: bool = False
    connected_at: datetime = field(default_factory=datetime.now)


class SignalingServer:
    """WebSocket signaling server for WebRTC connection establishment"""
    
    def __init__(self, host: str = "0.0.0.0", port: int = 8765):
        self.host = host
        self.port = port
        self.host_client: Optional[Client] = None
        self.remote_clients: Dict[str, Client] = {}
        self.client_counter = 0
    
    def generate_client_id(self) -> str:
        """Generate a unique client ID"""
        self.client_counter += 1
        return f"client_{self.client_counter}"
    
    async def register_host(self, websocket: WebSocketServerProtocol) -> Client:
        """Register the host application"""
        client_id = "host"
        client = Client(websocket=websocket, client_id=client_id, is_host=True)
        self.host_client = client
        logger.info(f"Host registered: {client_id}")
        return client
    
    async def register_remote(self, websocket: WebSocketServerProtocol) -> Client:
        """Register a remote user"""
        client_id = self.generate_client_id()
        client = Client(websocket=websocket, client_id=client_id, is_host=False)
        self.remote_clients[client_id] = client
        logger.info(f"Remote user registered: {client_id}")
        
        # Notify host of new user
        if self.host_client:
            await self.send_to_client(self.host_client, {
                "type": "user-joined",
                "userId": client_id
            })
        
        return client

    
    async def unregister_client(self, client: Client) -> None:
        """Unregister a client and notify others"""
        if client.is_host:
            self.host_client = None
            logger.info("Host disconnected")
            # Notify all remote clients that host disconnected
            for remote in list(self.remote_clients.values()):
                await self.send_to_client(remote, {
                    "type": "host-disconnected"
                })
        else:
            if client.client_id in self.remote_clients:
                del self.remote_clients[client.client_id]
                logger.info(f"Remote user disconnected: {client.client_id}")
                # Notify host of user leaving
                if self.host_client:
                    await self.send_to_client(self.host_client, {
                        "type": "user-left",
                        "userId": client.client_id
                    })
    
    async def send_to_client(self, client: Client, message: dict) -> bool:
        """Send a message to a specific client"""
        try:
            await client.websocket.send(json.dumps(message))
            return True
        except websockets.exceptions.ConnectionClosed:
            logger.warning(f"Failed to send to {client.client_id}: connection closed")
            return False
        except Exception as e:
            logger.error(f"Failed to send to {client.client_id}: {e}")
            return False
    
    async def relay_to_host(self, from_client: Client, message: dict) -> bool:
        """Relay a message from remote client to host"""
        if not self.host_client:
            logger.warning("Cannot relay to host: no host connected")
            return False
        
        message["userId"] = from_client.client_id
        return await self.send_to_client(self.host_client, message)
    
    async def relay_to_remote(self, target_id: str, message: dict) -> bool:
        """Relay a message from host to a specific remote client"""
        if target_id not in self.remote_clients:
            logger.warning(f"Cannot relay to remote: {target_id} not found")
            return False
        
        return await self.send_to_client(self.remote_clients[target_id], message)
    
    async def handle_message(self, client: Client, raw_message: str) -> None:
        """Handle incoming WebSocket message"""
        try:
            message = json.loads(raw_message)
            msg_type = message.get("type", "")
            
            logger.debug(f"Received from {client.client_id}: {msg_type}")
            
            if msg_type == "register-host":
                # Host is registering itself
                client.is_host = True
                self.host_client = client
                await self.send_to_client(client, {
                    "type": "registered",
                    "role": "host"
                })
                
            elif msg_type == "offer":
                # Remote client sending offer to host
                if client.is_host:
                    # Host sending offer to remote (for renegotiation)
                    target_id = message.get("userId")
                    if target_id:
                        await self.relay_to_remote(target_id, {
                            "type": "offer",
                            "data": message.get("data")
                        })
                else:
                    # Remote sending offer to host
                    await self.relay_to_host(client, {
                        "type": "offer",
                        "data": message.get("data")
                    })
                    
            elif msg_type == "answer":
                # Answer to SDP offer
                if client.is_host:
                    # Host sending answer to remote
                    target_id = message.get("userId")
                    if target_id:
                        await self.relay_to_remote(target_id, {
                            "type": "answer",
                            "data": message.get("data")
                        })
                else:
                    # Remote sending answer to host
                    await self.relay_to_host(client, {
                        "type": "answer",
                        "data": message.get("data")
                    })
                    
            elif msg_type == "ice-candidate":
                # ICE candidate exchange
                if client.is_host:
                    target_id = message.get("userId")
                    if target_id:
                        await self.relay_to_remote(target_id, {
                            "type": "ice-candidate",
                            "data": message.get("data")
                        })
                else:
                    await self.relay_to_host(client, {
                        "type": "ice-candidate",
                        "data": message.get("data")
                    })
                    
            elif msg_type == "ping":
                await self.send_to_client(client, {"type": "pong"})
                
            else:
                logger.warning(f"Unknown message type: {msg_type}")
                
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON from {client.client_id}")
        except Exception as e:
            logger.error(f"Error handling message from {client.client_id}: {e}")

    
    async def handle_connection(self, websocket: WebSocketServerProtocol) -> None:
        """Handle a new WebSocket connection"""
        client = None
        try:
            # Register as remote client by default (host will send register-host message)
            client = await self.register_remote(websocket)
            
            # Send welcome message with client ID
            await self.send_to_client(client, {
                "type": "welcome",
                "clientId": client.client_id,
                "hostConnected": self.host_client is not None
            })
            
            # Handle messages
            async for message in websocket:
                await self.handle_message(client, message)
                
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Connection closed for {client.client_id if client else 'unknown'}")
        except Exception as e:
            logger.error(f"Error in connection handler: {e}")
        finally:
            if client:
                await self.unregister_client(client)
    
    async def start(self) -> None:
        """Start the signaling server"""
        logger.info(f"Starting signaling server on {self.host}:{self.port}")
        
        async with websockets.serve(
            self.handle_connection,
            self.host,
            self.port,
            ping_interval=30,
            ping_timeout=10
        ):
            logger.info(f"Signaling server running on ws://{self.host}:{self.port}")
            logger.info("Press Ctrl+C to stop")
            await asyncio.Future()  # Run forever


def get_local_ip() -> str:
    """Get the local IP address of this machine"""
    import socket
    try:
        # Create a socket to determine the local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def main():
    parser = argparse.ArgumentParser(
        description="WebRTC Signaling Server for Desktop Host App"
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="Host address to bind to (default: 0.0.0.0)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8765,
        help="Port to listen on (default: 8765)"
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug logging"
    )
    
    args = parser.parse_args()
    
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    local_ip = get_local_ip()
    print(f"\n{'='*50}")
    print("WebRTC Desktop Host - Signaling Server")
    print(f"{'='*50}")
    print(f"\nLocal IP: {local_ip}")
    print(f"Port: {args.port}")
    print(f"\nRemote users should connect to: ws://{local_ip}:{args.port}")
    print(f"\nMake sure to port forward port {args.port} on your router")
    print(f"to allow connections from the internet.")
    print(f"{'='*50}\n")
    
    server = SignalingServer(host=args.host, port=args.port)
    
    try:
        asyncio.run(server.start())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")


if __name__ == "__main__":
    main()
