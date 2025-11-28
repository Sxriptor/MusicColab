# Distribution Architecture

## Build Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Workflow                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Code Changes                                            │
│     └─> npm run build:all                                  │
│                                                              │
│  2. Create Release                                          │
│     └─> git tag v0.2.0                                     │
│     └─> git push origin v0.2.0                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              GitHub Actions CI/CD Pipeline                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Trigger: Tag push (v0.2.0)                                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Build Matrix (Parallel)                              │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                      │  │
│  │  Windows Build          macOS Build    Linux Build  │  │
│  │  ├─ npm install         ├─ npm install ├─ npm install
│  │  ├─ npm test            ├─ npm test    ├─ npm test  │  │
│  │  ├─ npm run build       ├─ npm run     ├─ npm run   │  │
│  │  ├─ npm run build:win   │   build:mac  │   build:linux
│  │  └─ Upload artifacts    └─ Upload      └─ Upload    │  │
│  │                            artifacts      artifacts  │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Create GitHub Release                                      │
│  Upload all artifacts                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Distribution Channels                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  GitHub Releases          Package Managers                  │
│  ├─ Direct Download       ├─ Chocolatey (Windows)          │
│  ├─ Auto-Update           ├─ Homebrew (macOS)              │
│  └─ Release Notes         └─ apt/PPA (Linux)               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    End Users                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Windows Users           macOS Users      Linux Users       │
│  ├─ Download .exe        ├─ Download .dmg ├─ apt install   │
│  ├─ Run installer        ├─ Drag to Apps  ├─ AppImage      │
│  └─ Launch app           └─ Launch app    └─ Launch app    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## File Organization

```
dist/packages/
│
├── Windows
│   ├── WebRTC Desktop Host-0.2.0.exe          (NSIS Installer)
│   ├── WebRTC Desktop Host 0.2.0.exe          (Portable)
│   ├── WebRTC Desktop Host-0.2.0.exe.blockmap (Update info)
│   └── latest.yml                             (Update manifest)
│
├── macOS
│   ├── WebRTC Desktop Host-0.2.0.dmg          (DMG Image)
│   ├── WebRTC Desktop Host-0.2.0.zip          (ZIP Archive)
│   ├── WebRTC Desktop Host-0.2.0.dmg.blockmap (Update info)
│   └── latest-mac.yml                         (Update manifest)
│
└── Linux
    ├── WebRTC Desktop Host-0.2.0.AppImage     (AppImage)
    ├── webrtc-desktop-host_0.2.0_amd64.deb    (Debian Package)
    ├── WebRTC Desktop Host-0.2.0.AppImage.blockmap
    └── latest-linux.yml                       (Update manifest)
```

## Application Structure

```
WebRTC Desktop Host Application
│
├── Electron Main Process
│   ├── Window Management
│   ├── IPC Handlers
│   ├── File System Access
│   └── Native Module Integration
│
├── Renderer Process (React UI)
│   ├── Host Tab
│   │   ├── Connection Info Display
│   │   ├── Display Selector
│   │   ├── Control Panel
│   │   ├── Connected Users List
│   │   └── Stream Statistics
│   │
│   └── Join Tab
│       ├── IP Address Input
│       ├── Port Input
│       └── Connect Button
│
├── Services
│   ├── SignalingServerManager
│   │   └── Spawns Python server
│   ├── SignalingClient
│   │   └── WebSocket communication
│   ├── DesktopCaptureService
│   │   └── Screen recording
│   ├── AudioCaptureService
│   │   └── Audio recording
│   ├── WebRTCConnectionManager
│   │   └── Peer connections
│   └── ConnectionTracker
│       └── User management
│
└── Python Signaling Server
    ├── WebSocket Server
    ├── Connection Management
    ├── Message Relay
    └── Client Tracking
```

## Update Flow

```
┌──────────────────────────────────────────────────────────┐
│              User Launches Application                    │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│         electron-updater Checks for Updates              │
│         (Queries GitHub Releases API)                    │
└──────────────────────────────────────────────────────────┘
                        ↓
                   ┌────┴────┐
                   ↓         ↓
            ┌──────────┐  ┌──────────┐
            │ Update   │  │ No Update│
            │ Available│  │ Available│
            └──────────┘  └──────────┘
                   ↓              ↓
            ┌──────────┐    ┌──────────┐
            │ Download │    │ Continue │
            │ Update   │    │ Running  │
            └──────────┘    └──────────┘
                   ↓
            ┌──────────┐
            │ Notify   │
            │ User     │
            └──────────┘
                   ↓
            ┌──────────┐
            │ User     │
            │ Clicks   │
            │ Install  │
            └──────────┘
                   ↓
            ┌──────────┐
            │ Restart  │
            │ App      │
            └──────────┘
                   ↓
            ┌──────────┐
            │ New      │
            │ Version  │
            │ Running  │
            └──────────┘
```

## Release Timeline

```
Week 1: Preparation
├─ Update version
├─ Update changelog
├─ Run tests
└─ Create git tag

Week 2: Build & Release
├─ GitHub Actions builds
├─ Create GitHub release
├─ Test installers
└─ Announce release

Week 3: Distribution
├─ Submit to package managers
├─ Monitor downloads
└─ Collect feedback

Week 4+: Maintenance
├─ Fix reported issues
├─ Plan next release
└─ Engage community
```

## Platform-Specific Details

### Windows Distribution

```
Windows User
    ↓
Download .exe from GitHub
    ↓
Run NSIS Installer
    ├─ Extract files
    ├─ Create shortcuts
    ├─ Register app
    └─ Launch app
    ↓
Application Running
    ├─ Check for Python
    ├─ Start signaling server
    └─ Display UI
```

### macOS Distribution

```
macOS User
    ↓
Download .dmg from GitHub
    ↓
Open DMG File
    ├─ Mount disk image
    └─ Show contents
    ↓
Drag App to Applications
    ├─ Copy app bundle
    └─ Verify signature
    ↓
Launch from Applications
    ├─ Check for Python
    ├─ Start signaling server
    └─ Display UI
```

### Linux Distribution

```
Linux User
    ↓
    ├─ Option A: apt install
    │   ├─ Add PPA
    │   ├─ apt update
    │   └─ apt install
    │
    └─ Option B: AppImage
        ├─ Download .AppImage
        ├─ chmod +x
        └─ Run directly
    ↓
Application Running
    ├─ Check for Python
    ├─ Start signaling server
    └─ Display UI
```

## Dependency Graph

```
WebRTC Desktop Host
│
├─ Electron 27.3.11
│   ├─ Chromium
│   ├─ Node.js
│   └─ Native APIs
│
├─ React 18.0.0
│   ├─ React DOM
│   └─ React Hooks
│
├─ TypeScript 5.0.0
│   └─ Type Definitions
│
├─ Vite 5.0.0
│   └─ Build Tool
│
├─ electron-builder 24.6.4
│   ├─ NSIS (Windows)
│   ├─ DMG (macOS)
│   └─ AppImage/deb (Linux)
│
└─ Python 3.8+
    ├─ websockets 12.0+
    └─ Standard Library
```

## Security Considerations

```
┌─────────────────────────────────────────────────────────┐
│              Security Architecture                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Code Signing                                           │
│  ├─ Windows: EV Certificate                            │
│  ├─ macOS: Apple Developer Certificate                 │
│  └─ Linux: GPG Signature                               │
│                                                         │
│  Update Verification                                    │
│  ├─ HTTPS for downloads                                │
│  ├─ Signature verification                             │
│  └─ Delta update validation                            │
│                                                         │
│  Runtime Security                                       │
│  ├─ Sandboxed renderer process                         │
│  ├─ IPC validation                                     │
│  └─ Python server isolation                            │
│                                                         │
│  Network Security                                       │
│  ├─ WebSocket over WSS (optional)                      │
│  ├─ User-controlled port forwarding                    │
│  └─ No external backend required                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Monitoring & Analytics

```
┌─────────────────────────────────────────────────────────┐
│           Post-Release Monitoring                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  GitHub Metrics                                         │
│  ├─ Release downloads                                  │
│  ├─ Star count                                         │
│  └─ Issue reports                                      │
│                                                         │
│  Application Metrics                                    │
│  ├─ Crash reports                                      │
│  ├─ Error logs                                         │
│  └─ Performance data                                   │
│                                                         │
│  User Feedback                                          │
│  ├─ GitHub Issues                                      │
│  ├─ Discussions                                        │
│  └─ Email support                                      │
│                                                         │
│  Package Manager Stats                                  │
│  ├─ Chocolatey downloads                               │
│  ├─ Homebrew installs                                  │
│  └─ apt repository stats                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

This architecture ensures:
- ✅ Automated, reliable builds
- ✅ Cross-platform compatibility
- ✅ Seamless updates
- ✅ User-friendly installation
- ✅ Secure distribution
- ✅ Easy maintenance
