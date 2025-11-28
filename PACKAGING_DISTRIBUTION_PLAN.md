# WebRTC Desktop Host - Packaging & Distribution Plan

## Overview
This document outlines the strategy for packaging and distributing the WebRTC Desktop Host application across Windows, macOS, and Linux platforms.

## Architecture

### Components to Package
1. **Electron App** - Main desktop application (TypeScript/React)
2. **Python Signaling Server** - WebSocket server for connection establishment
3. **Dependencies** - Node modules and Python packages
4. **Assets** - Icons, configuration files

### Distribution Channels
1. **GitHub Releases** - Direct download of installers
2. **Standalone Executables** - Portable versions
3. **Package Managers** - Chocolatey (Windows), Homebrew (macOS)
4. **Auto-Update** - Built-in update mechanism

## Build & Packaging Strategy

### Phase 1: Build Configuration (electron-builder)
- Use `electron-builder` for cross-platform packaging
- Generate installers for Windows (.exe, .msi)
- Generate DMG for macOS
- Generate AppImage/deb for Linux
- Include Python runtime or bundle Python server

### Phase 2: Python Server Bundling
- **Option A**: Bundle Python interpreter with app (larger but no dependencies)
- **Option B**: Require Python 3.8+ installation (smaller, user responsibility)
- **Option C**: Use PyInstaller to create standalone Python executable

### Phase 3: Release Management
- Semantic versioning (v0.1.0, v0.2.0, etc.)
- GitHub Actions for automated builds
- Code signing for Windows and macOS
- Release notes and changelog

### Phase 4: Auto-Update
- Implement electron-updater
- Delta updates for smaller downloads
- Staged rollout capability

## Implementation Steps

### Step 1: Install electron-builder
```bash
npm install --save-dev electron-builder
```

### Step 2: Configure electron-builder in package.json
- Define build targets (win, mac, linux)
- Set up code signing
- Configure auto-update

### Step 3: Create Build Scripts
- `npm run build:dist` - Build for distribution
- `npm run build:win` - Windows only
- `npm run build:mac` - macOS only
- `npm run build:linux` - Linux only

### Step 4: Python Server Handling
- Option A: Bundle with PyInstaller
- Option B: Include Python source + requirements.txt
- Option C: Download Python runtime during installation

### Step 5: GitHub Actions Workflow
- Trigger on version tag
- Build for all platforms
- Create GitHub release
- Upload artifacts

### Step 6: Code Signing
- Windows: Obtain code signing certificate
- macOS: Apple Developer account + certificates
- Linux: GPG signing for packages

## Detailed Implementation

### electron-builder Configuration

```json
{
  "build": {
    "appId": "com.webrtcdesktophost.app",
    "productName": "WebRTC Desktop Host",
    "directories": {
      "buildResources": "assets",
      "output": "dist/packages"
    },
    "files": [
      "dist/**/*",
      "server/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "win": {
      "target": ["nsis", "portable"],
      "certificateFile": null,
      "certificatePassword": null
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    },
    "mac": {
      "target": ["dmg", "zip"],
      "category": "public.app-category.utilities"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "category": "Utility"
    }
  }
}
```

### Python Server Bundling Strategy

**Recommended: Option B (Include Python source)**
- Pros: Smaller app size, transparent, easy to debug
- Cons: Requires Python installation on user machine
- Solution: Provide Python installer link in setup

**Alternative: Option C (PyInstaller)**
- Pros: No Python dependency
- Cons: Larger app size (~100MB+)
- Solution: Use PyInstaller to create standalone executable

### GitHub Actions Workflow

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - run: npm install
      - run: npm run build
      - run: npm run build:dist
      
      - uses: softprops/action-gh-release@v1
        with:
          files: dist/packages/**/*
```

## Distribution Channels

### 1. GitHub Releases
- Direct download links
- Release notes
- Automatic updates via electron-updater

### 2. Standalone Executables
- Windows: `.exe` (NSIS installer) + portable `.exe`
- macOS: `.dmg` (disk image)
- Linux: `.AppImage` + `.deb`

### 3. Package Managers

**Windows (Chocolatey)**
```bash
choco install webrtc-desktop-host
```

**macOS (Homebrew)**
```bash
brew install webrtc-desktop-host
```

**Linux (apt)**
```bash
sudo apt install webrtc-desktop-host
```

## Auto-Update Implementation

### electron-updater Configuration
```typescript
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();
```

### Update Flow
1. App checks for updates on startup
2. Downloads update in background
3. Notifies user when ready
4. Restarts app to apply update

## Code Signing

### Windows
- Obtain EV code signing certificate
- Configure in electron-builder
- Sign all executables

### macOS
- Apple Developer account ($99/year)
- Create signing certificates
- Notarize app with Apple

### Linux
- GPG key for package signing
- Sign .deb packages

## Deployment Checklist

- [ ] Install electron-builder
- [ ] Configure build settings
- [ ] Create build scripts
- [ ] Set up GitHub Actions
- [ ] Test builds on all platforms
- [ ] Obtain code signing certificates
- [ ] Configure auto-update
- [ ] Create release documentation
- [ ] Test installation on clean systems
- [ ] Set up package manager submissions

## Version Management

### Semantic Versioning
- MAJOR: Breaking changes
- MINOR: New features
- PATCH: Bug fixes

### Release Process
1. Update version in package.json
2. Update CHANGELOG.md
3. Commit changes
4. Create git tag (v0.1.0)
5. Push tag to trigger build
6. GitHub Actions builds and releases
7. Announce release

## Post-Release

### Monitoring
- Track download statistics
- Monitor crash reports
- Collect user feedback

### Support
- GitHub Issues for bug reports
- Discussions for feature requests
- Documentation for troubleshooting

## Future Enhancements

1. **Staged Rollout** - Release to 10% of users first
2. **Beta Channel** - Separate beta releases
3. **Portable Version** - USB-friendly standalone
4. **Docker Image** - For server deployments
5. **Web Version** - Browser-based client
