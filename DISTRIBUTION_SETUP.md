# Distribution Setup Guide

This guide walks through setting up the WebRTC Desktop Host for packaging and distribution.

## Prerequisites

- Node.js 18+
- Python 3.8+
- Git
- GitHub account (for releases)

## Quick Start

### 1. Install Build Dependencies

```bash
npm install
```

This installs electron-builder and all required dependencies.

### 2. Build for Your Platform

**Windows:**
```bash
npm run build:win
```

**macOS:**
```bash
npm run build:mac
```

**Linux:**
```bash
npm run build:linux
```

**All Platforms:**
```bash
npm run build:all
```

### 3. Find Your Installers

Built packages are in `dist/packages/`:
- Windows: `.exe` (installer) and portable `.exe`
- macOS: `.dmg` (disk image)
- Linux: `.AppImage` and `.deb`

## Python Server Bundling

The Python signaling server is included in the package. Users need Python 3.8+ installed.

### Option 1: Include Python Runtime (Recommended for Enterprise)

Use PyInstaller to bundle Python:

```bash
pip install pyinstaller
pyinstaller --onefile server/signaling_server.py -o server/dist
```

Then update the SignalingServerManager to use the bundled executable.

### Option 2: Require Python Installation (Current)

Users must install Python 3.8+ separately. The app will:
1. Check for Python on startup
2. Display error if not found
3. Provide download link

### Option 3: Download Python During Installation

Create a custom NSIS installer script that downloads Python if needed.

## GitHub Release Setup

### 1. Create GitHub Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Create new token with `repo` scope
3. Copy token

### 2. Add to Repository Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Add new secret: `GITHUB_TOKEN` = your token

### 3. Create Release

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions will automatically:
1. Build for all platforms
2. Create release
3. Upload installers

## Code Signing (Optional but Recommended)

### Windows Code Signing

1. Obtain EV code signing certificate
2. Export as `.pfx` file
3. Add to GitHub Secrets:
   - `WIN_CSC_LINK` = base64 encoded .pfx
   - `WIN_CSC_KEY_PASSWORD` = certificate password

4. Update `package.json`:
```json
{
  "win": {
    "certificateFile": "${WIN_CSC_LINK}",
    "certificatePassword": "${WIN_CSC_KEY_PASSWORD}"
  }
}
```

### macOS Code Signing

1. Create Apple Developer account
2. Generate signing certificates
3. Add to GitHub Secrets:
   - `MAC_CERTS` = base64 encoded certificates
   - `MAC_CERTS_PASSWORD` = certificate password

4. Update workflow to import certificates

### Linux GPG Signing

1. Create GPG key
2. Export public key
3. Sign .deb packages in build process

## Auto-Update Setup

### 1. Configure electron-updater

Update `src/main/index.ts`:

```typescript
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();
```

### 2. Host Update Files

Option A: Use GitHub Releases (automatic)
- electron-updater checks GitHub releases
- Downloads latest version

Option B: Use Custom Server
- Host `latest.yml` and installers on your server
- Configure update URL in app

### 3. Test Updates

```bash
npm run build:dist
# Manually test update flow
```

## Distribution Channels

### GitHub Releases
- Automatic via GitHub Actions
- Direct download links
- Release notes

### Package Managers

#### Windows (Chocolatey)

1. Create Chocolatey account
2. Create package:
```bash
choco new webrtc-desktop-host
```

3. Update `.nuspec` file with installer URL
4. Submit package:
```bash
choco push webrtc-desktop-host.0.1.0.nupkg
```

#### macOS (Homebrew)

1. Create Homebrew formula
2. Host on GitHub
3. Users install with:
```bash
brew tap yourname/webrtc-desktop-host
brew install webrtc-desktop-host
```

#### Linux (apt)

1. Create PPA (Personal Package Archive)
2. Upload .deb packages
3. Users install with:
```bash
sudo add-apt-repository ppa:yourname/webrtc-desktop-host
sudo apt update
sudo apt install webrtc-desktop-host
```

## Testing Distribution

### Test on Clean System

1. Create virtual machine
2. Install only OS
3. Download and install your package
4. Verify app works correctly

### Test Update Flow

1. Install v0.1.0
2. Build v0.1.1
3. Release v0.1.1
4. Check if app detects and installs update

### Test on Different Platforms

- Windows 10/11
- macOS 10.13+
- Ubuntu 18.04+

## Troubleshooting

### Build Fails

```bash
# Clear cache
rm -rf dist node_modules
npm install
npm run build:dist
```

### Python Not Found

Users need to install Python 3.8+:
- Windows: https://www.python.org/downloads/
- macOS: `brew install python3`
- Linux: `sudo apt install python3`

### Update Not Working

1. Check `latest.yml` is accessible
2. Verify version in `package.json` is higher
3. Check app logs for errors

## Release Checklist

- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md`
- [ ] Run tests: `npm test`
- [ ] Build locally: `npm run build:all`
- [ ] Test installers on clean systems
- [ ] Commit changes
- [ ] Create git tag: `git tag v0.1.0`
- [ ] Push tag: `git push origin v0.1.0`
- [ ] Wait for GitHub Actions to complete
- [ ] Verify release on GitHub
- [ ] Test auto-update
- [ ] Announce release

## Maintenance

### Regular Updates

1. Fix bugs and add features
2. Increment version
3. Create release
4. Users get auto-update notification

### Security Updates

1. Fix security issues immediately
2. Release as patch version (v0.1.1)
3. Announce security update

### Breaking Changes

1. Increment major version (v1.0.0)
2. Provide migration guide
3. Support previous version for limited time

## Support

For issues with distribution:
1. Check GitHub Actions logs
2. Review electron-builder documentation
3. Check platform-specific requirements
4. Open GitHub issue with details
