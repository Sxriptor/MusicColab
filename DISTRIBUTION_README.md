# WebRTC Desktop Host - Distribution Guide

## Overview

This guide covers everything needed to package, distribute, and maintain the WebRTC Desktop Host application.

## Quick Links

- **[Packaging & Distribution Plan](./PACKAGING_DISTRIBUTION_PLAN.md)** - Strategic overview
- **[Distribution Setup Guide](./DISTRIBUTION_SETUP.md)** - Step-by-step instructions
- **[Changelog](./CHANGELOG.md)** - Version history

## Distribution Strategy

### Current Status: MVP (v0.1.0)

The application is ready for initial distribution with the following components:

1. **Electron Desktop App** - Cross-platform desktop application
2. **Python Signaling Server** - Local WebSocket server
3. **Automated Builds** - GitHub Actions CI/CD
4. **Multiple Installers** - Windows, macOS, Linux

### Supported Platforms

| Platform | Installer | Portable | Package Manager |
|----------|-----------|----------|-----------------|
| Windows  | ✅ NSIS   | ✅ .exe  | Chocolatey      |
| macOS    | ✅ DMG    | ✅ .zip  | Homebrew        |
| Linux    | ✅ .deb   | ✅ AppImage | apt           |

## Getting Started

### For Developers

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/webrtc-desktop-host.git
   cd webrtc-desktop-host
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build for Distribution**
   ```bash
   npm run build:all
   ```

4. **Find Installers**
   ```
   dist/packages/
   ├── WebRTC Desktop Host-0.1.0.exe (Windows installer)
   ├── WebRTC Desktop Host 0.1.0.exe (Windows portable)
   ├── WebRTC Desktop Host-0.1.0.dmg (macOS)
   ├── WebRTC Desktop Host-0.1.0.AppImage (Linux)
   └── webrtc-desktop-host_0.1.0_amd64.deb (Linux)
   ```

### For End Users

#### Windows
1. Download `WebRTC Desktop Host-0.1.0.exe`
2. Run installer
3. Follow installation wizard
4. Launch from Start Menu

#### macOS
1. Download `WebRTC Desktop Host-0.1.0.dmg`
2. Open DMG file
3. Drag app to Applications folder
4. Launch from Applications

#### Linux
```bash
# Using .deb package
sudo apt install ./webrtc-desktop-host_0.1.0_amd64.deb

# Or using AppImage
chmod +x WebRTC\ Desktop\ Host-0.1.0.AppImage
./WebRTC\ Desktop\ Host-0.1.0.AppImage
```

## Release Process

### 1. Prepare Release

```bash
# Update version
npm version minor  # or patch, major

# Update changelog
# Edit CHANGELOG.md with new features/fixes

# Commit changes
git add package.json CHANGELOG.md
git commit -m "Release v0.2.0"
```

### 2. Create Release Tag

```bash
git tag v0.2.0
git push origin main
git push origin v0.2.0
```

### 3. GitHub Actions Builds

- Automatically triggered by tag push
- Builds for Windows, macOS, Linux
- Creates GitHub release
- Uploads installers

### 4. Verify Release

1. Check GitHub Actions workflow
2. Verify all builds completed
3. Download and test installers
4. Verify auto-update works

### 5. Announce Release

- Post on GitHub Discussions
- Update website/documentation
- Notify users of new version

## System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| OS | Windows 10+, macOS 10.13+, Ubuntu 18.04+ |
| RAM | 2GB |
| Disk | 500MB |
| Python | 3.8+ (required for signaling server) |
| Network | Broadband internet connection |

### Recommended Requirements

| Component | Recommendation |
|-----------|----------------|
| OS | Windows 11, macOS 12+, Ubuntu 22.04+ |
| RAM | 4GB+ |
| Disk | 1GB SSD |
| Python | 3.11+ |
| Network | 10+ Mbps upload/download |

## Installation Instructions

### Windows

1. **Download Installer**
   - Visit GitHub Releases
   - Download `WebRTC Desktop Host-0.1.0.exe`

2. **Run Installer**
   - Double-click the .exe file
   - Click "Install"
   - Choose installation directory
   - Wait for installation to complete

3. **Launch Application**
   - Click "Launch" in installer
   - Or find in Start Menu

4. **Install Python (if needed)**
   - Download from https://www.python.org/downloads/
   - Run installer
   - Check "Add Python to PATH"
   - Restart application

### macOS

1. **Download DMG**
   - Visit GitHub Releases
   - Download `WebRTC Desktop Host-0.1.0.dmg`

2. **Install Application**
   - Open DMG file
   - Drag app to Applications folder
   - Wait for copy to complete

3. **Launch Application**
   - Open Applications folder
   - Double-click "WebRTC Desktop Host"
   - Grant permissions if prompted

4. **Install Python (if needed)**
   ```bash
   brew install python3
   ```

### Linux

1. **Download Package**
   - Visit GitHub Releases
   - Download `.deb` or `.AppImage`

2. **Install (deb)**
   ```bash
   sudo apt install ./webrtc-desktop-host_0.1.0_amd64.deb
   ```

3. **Or Run (AppImage)**
   ```bash
   chmod +x WebRTC\ Desktop\ Host-0.1.0.AppImage
   ./WebRTC\ Desktop\ Host-0.1.0.AppImage
   ```

4. **Install Python (if needed)**
   ```bash
   sudo apt install python3 python3-pip
   ```

## Troubleshooting

### Application Won't Start

**Windows:**
- Ensure Python 3.8+ is installed
- Check Windows Defender didn't block app
- Try running as Administrator

**macOS:**
- Check if app is quarantined: `xattr -d com.apple.quarantine /Applications/WebRTC\ Desktop\ Host.app`
- Ensure Python 3.8+ is installed

**Linux:**
- Check dependencies: `ldd ./WebRTC\ Desktop\ Host-0.1.0.AppImage`
- Ensure Python 3.8+ is installed

### Python Not Found

**Windows:**
1. Download Python from https://www.python.org/downloads/
2. Run installer
3. Check "Add Python to PATH"
4. Restart application

**macOS:**
```bash
brew install python3
```

**Linux:**
```bash
sudo apt install python3
```

### Connection Issues

1. Ensure both machines are on same network
2. Check firewall allows port 8765
3. Verify port forwarding on router
4. Check Python server is running

### Performance Issues

1. Reduce video quality in settings
2. Close other applications
3. Check network bandwidth
4. Update graphics drivers

## Auto-Update

The application automatically checks for updates on startup.

### Manual Update Check

1. Open application
2. Go to Help → Check for Updates
3. If update available, click "Install"
4. Application restarts with new version

### Disable Auto-Update

Edit configuration file:
- Windows: `%APPDATA%/WebRTC Desktop Host/config.json`
- macOS: `~/Library/Application Support/WebRTC Desktop Host/config.json`
- Linux: `~/.config/WebRTC Desktop Host/config.json`

Add:
```json
{
  "autoUpdate": false
}
```

## Uninstallation

### Windows
1. Open Settings → Apps → Apps & features
2. Find "WebRTC Desktop Host"
3. Click "Uninstall"
4. Follow uninstall wizard

### macOS
1. Open Applications folder
2. Drag "WebRTC Desktop Host" to Trash
3. Empty Trash

### Linux
```bash
sudo apt remove webrtc-desktop-host
```

## Support & Feedback

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Documentation**: See README.md
- **Email**: support@example.com

## Contributing

Contributions are welcome! See CONTRIBUTING.md for guidelines.

## License

MIT License - See LICENSE file for details

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.

---

**Current Version**: 0.1.0  
**Last Updated**: 2024-01-XX  
**Status**: MVP - Ready for Distribution
