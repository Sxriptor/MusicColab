# Design Document: WebRTC Desktop Host App

## Overview

The WebRTC Desktop Host App is an Electron-based desktop application that captures the Windows desktop and streams it to remote users via WebRTC peer connections. The design prioritizes low latency, efficient resource usage, and reliable connection management. The architecture separates concerns into distinct layers: UI, WebRTC management, desktop capture, and signaling communication.

## Architecture

The application follows a layered architecture:

```
┌─────────────────────────────────────────────────────┐
│                   Electron Main Process              │
│  (Window Management, App Lifecycle, Native Modules) │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│              WebRTC Connection Manager               │
│  (Peer Management, SDP/ICE Handling, Stream Control)│
└─────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────┬──────────────────────────────┐
│  Desktop Capture     │    Audio Capture             │
│  (Screen Recording)  │    (System Audio)            │
└──────────────────────┴──────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│         Signaling Server Communication              │
│  (Room Registration, ICE Candidate Exchange)        │
└─────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Main Application Controller
- **Responsibility**: Manage application lifecycle, window creation, and initialization
- **Key Methods**:
  - `initialize()`: Set up Electron window, WebRTC infrastructure, and event listeners
  - `startCapture()`: Begin desktop and audio capture
  - `stopCapture()`: Stop all capture and close connections
  - `shutdown()`: Clean up resources and exit

### 2. WebRTC Connection Manager
- **Responsibility**: Manage peer connections, handle SDP/ICE exchange, and stream control
- **Key Methods**:
  - `createPeerConnection(userId)`: Create a new peer connection for a remote user
  - `addLocalStream(stream)`: Add desktop/audio stream to peer connection
  - `handleRemoteOffer(userId, offer)`: Process incoming SDP offer from remote user
  - `handleICECandidate(userId, candidate)`: Add ICE candidate to peer connection
  - `closePeerConnection(userId)`: Close connection with specific user
  - `getConnectionStats()`: Retrieve connection quality metrics
  - `broadcastStream(stream)`: Send stream to all connected peers

### 3. Desktop Capture Module
- **Responsibility**: Capture Windows desktop frames and encode them
- **Key Methods**:
  - `startCapture(displayId)`: Begin capturing specified display
  - `stopCapture()`: Stop desktop capture
  - `getAvailableDisplays()`: List all connected displays
  - `switchDisplay(displayId)`: Change capture source to different display
  - `getFrameRate()`: Return current capture frame rate
  - **Output**: MediaStream with video track (H.264/H.265 encoded)

### 4. Audio Capture Module
- **Responsibility**: Capture system audio from desktop speakers
- **Key Methods**:
  - `startAudioCapture()`: Begin capturing system audio
  - `stopAudioCapture()`: Stop audio capture
  - `getAudioLevel()`: Return current audio level for UI display
  - **Output**: MediaStream with audio track (Opus encoded)

### 5. Signaling Client
- **Responsibility**: Communicate with signaling server for connection establishment
- **Key Methods**:
  - `connect(serverUrl)`: Connect to signaling server
  - `registerRoom(roomCode)`: Register host with room code
  - `sendOffer(userId, offer)`: Send SDP offer to remote user via server
  - `sendICECandidate(userId, candidate)`: Send ICE candidate to remote user
  - `notifyUserConnected(userId)`: Inform server of new connection
  - `notifyUserDisconnected(userId)`: Inform server of disconnection
  - `disconnect()`: Close connection to signaling server

### 6. UI Controller
- **Responsibility**: Manage user interface and display state
- **Key Methods**:
  - `displayRoomCode(code)`: Show room code to user
  - `updateConnectionCount(count)`: Update connected users display
  - `updateConnectionList(users)`: Display list of connected users
  - `displayError(message)`: Show error message to user
  - `updateStreamStats(stats)`: Display bitrate, latency, FPS metrics
  - `showDisplaySelector()`: Present display selection interface

## Data Models

### PeerConnection Model
```
{
  userId: string,
  peerConnection: RTCPeerConnection,
  dataChannel: RTCDataChannel,
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'failed',
  createdAt: timestamp,
  stats: {
    bitrate: number,
    latency: number,
    frameRate: number,
    packetsLost: number
  }
}
```

### Room Model
```
{
  roomCode: string,
  hostId: string,
  createdAt: timestamp,
  connectedUsers: PeerConnection[],
  displayId: string,
  isCapturing: boolean,
  stats: {
    totalConnections: number,
    averageBitrate: number,
    averageLatency: number
  }
}
```

### Display Model
```
{
  displayId: string,
  displayName: string,
  width: number,
  height: number,
  refreshRate: number,
  isPrimary: boolean
}
```

### StreamStats Model
```
{
  timestamp: number,
  videoStats: {
    frameRate: number,
    bitrate: number,
    resolution: { width: number, height: number },
    codec: string
  },
  audioStats: {
    bitrate: number,
    codec: string,
    sampleRate: number
  },
  connectionStats: {
    latency: number,
    packetsLost: number,
    jitter: number
  }
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Desktop Capture Initialization
*For any* host app instance, when desktop capture is started, the system should produce a valid video stream with frames at the specified frame rate.
**Validates: Requirements 1.2, 1.3**

### Property 2: Peer Connection Establishment
*For any* remote user providing a valid room code, the system should establish a WebRTC peer connection and begin streaming video within 5 seconds.
**Validates: Requirements 2.1, 2.2**

### Property 3: Stream Delivery Consistency
*For any* connected peer, the video stream received should contain frames from the same source display without gaps or duplication.
**Validates: Requirements 2.3, 2.4**

### Property 4: Connection Cleanup
*For any* disconnected peer, the system should release all associated resources and remove the peer from the active connections list.
**Validates: Requirements 2.5, 3.2**

### Property 5: Active Connections Accuracy
*For any* sequence of user connections and disconnections, the active connections count displayed should match the actual number of connected peers.
**Validates: Requirements 3.1, 3.3**

### Property 6: Latency Bounds
*For any* video frame captured, the end-to-end latency from capture to remote display should not exceed 150 milliseconds under normal network conditions.
**Validates: Requirements 4.1**

### Property 7: Bitrate Adaptation
*For any* change in network conditions, the system should adjust video bitrate within 2 seconds to maintain minimum 24 FPS.
**Validates: Requirements 4.2, 4.3**

### Property 8: Multi-User Stream Independence
*For any* set of connected peers, the video quality delivered to each peer should be independent of the number of other connected peers.
**Validates: Requirements 4.5**

### Property 9: Audio Capture and Transmission
*For any* active peer connection, audio captured from the host desktop should be encoded and transmitted to the remote user.
**Validates: Requirements 5.1, 5.2, 5.3**

### Property 10: Audio Delivery Consistency
*For any* connected peer, the audio stream received should contain continuous audio data without gaps.
**Validates: Requirements 5.4, 5.5**

### Property 11: Display Selection Persistence
*For any* selected display, the system should continue streaming from that display until explicitly changed by the user.
**Validates: Requirements 6.2, 6.3**

### Property 12: Display Switch Continuity
*For any* display switch operation, existing peer connections should remain active and begin receiving frames from the new display.
**Validates: Requirements 6.4**

### Property 13: Connection Error Recovery
*For any* failed connection attempt, the system should retry up to 3 times before notifying the user.
**Validates: Requirements 7.2, 7.3**

### Property 14: Resource Cleanup on Shutdown
*For any* application shutdown, all WebRTC peer connections should be closed and all capture resources should be released.
**Validates: Requirements 8.1, 8.2, 8.4, 8.5**

## Error Handling

### Connection Failures
- **Scenario**: WebRTC connection fails to establish
- **Handling**: Log error, attempt automatic reconnection up to 3 times, display user-friendly error message
- **Recovery**: Allow manual reconnection attempt

### Signaling Server Unreachable
- **Scenario**: Cannot reach signaling server for SDP/ICE exchange
- **Handling**: Display error message, queue operations for retry when server becomes available
- **Recovery**: Automatic retry with exponential backoff

### Desktop Capture Failure
- **Scenario**: Cannot access desktop capture API
- **Handling**: Log error, display error message, prevent streaming
- **Recovery**: User can restart app or check system permissions

### Audio Capture Failure
- **Scenario**: Cannot access system audio
- **Handling**: Log error, continue video streaming without audio
- **Recovery**: User can check audio device settings

### Display Disconnection
- **Scenario**: Selected display is disconnected
- **Handling**: Automatically switch to primary display, notify user
- **Recovery**: User can select alternative display

## Testing Strategy

### Unit Testing
- Test desktop capture initialization and frame generation
- Test peer connection creation and lifecycle management
- Test display selection and switching logic
- Test connection statistics calculation
- Test error handling and recovery mechanisms
- Test room code generation and validation

### Property-Based Testing
Property-based tests will use **fast-check** (JavaScript) to generate random inputs and verify that correctness properties hold across all valid scenarios:

- **Property 1 (Desktop Capture)**: Generate random display configurations and verify video stream validity
- **Property 2 (Peer Connection)**: Generate random room codes and verify connection establishment within time bounds
- **Property 3 (Stream Delivery)**: Generate random frame sequences and verify consistency
- **Property 4 (Connection Cleanup)**: Generate random connection/disconnection sequences and verify resource cleanup
- **Property 5 (Active Connections)**: Generate random connection events and verify count accuracy
- **Property 6 (Latency Bounds)**: Generate random network conditions and verify latency constraints
- **Property 7 (Bitrate Adaptation)**: Generate random network bandwidth changes and verify adaptation
- **Property 8 (Multi-User Independence)**: Generate random peer counts and verify quality independence
- **Property 9 & 10 (Audio)**: Generate random audio capture scenarios and verify transmission
- **Property 11 & 12 (Display Selection)**: Generate random display switch sequences and verify persistence/continuity
- **Property 13 (Error Recovery)**: Generate random failure scenarios and verify retry logic
- **Property 14 (Resource Cleanup)**: Generate random shutdown scenarios and verify complete cleanup

**Configuration**: Each property-based test will run a minimum of 100 iterations to ensure robust coverage.

