# WebRTC Desktop Host - Signaling Server

A local Python WebSocket server that facilitates WebRTC connection establishment between the host and remote users.

## Setup

1. Install Python 3.8 or higher
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

Start the server:
```bash
python signaling_server.py
```

Options:
- `--host`: Host address to bind to (default: 0.0.0.0)
- `--port`: Port to listen on (default: 8765)
- `--debug`: Enable debug logging

Example:
```bash
python signaling_server.py --port 9000 --debug
```

## Port Forwarding

For remote users to connect from the internet, you need to:

1. Note your local IP address (displayed when server starts)
2. Log into your router's admin panel
3. Set up port forwarding:
   - External port: 8765 (or your chosen port)
   - Internal IP: Your local IP address
   - Internal port: 8765 (or your chosen port)
   - Protocol: TCP

4. Share your public IP address and port with remote users

## Protocol

The server uses JSON messages over WebSocket:

### Messages from Remote Client to Host
- `offer`: SDP offer for WebRTC connection
- `answer`: SDP answer response
- `ice-candidate`: ICE candidate for connection establishment

### Messages from Host to Remote Client
- `offer`: SDP offer (for renegotiation)
- `answer`: SDP answer response
- `ice-candidate`: ICE candidate

### Server Messages
- `welcome`: Sent on connection with client ID
- `user-joined`: Notifies host of new remote user
- `user-left`: Notifies host when remote user disconnects
- `host-disconnected`: Notifies remote users when host disconnects
