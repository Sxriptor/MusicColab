# Quick Start: Distribution Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Build for Your Platform
```bash
# All platforms
npm run build:all

# Or specific platform
npm run build:win      # Windows
npm run build:mac      # macOS
npm run build:linux    # Linux
```

### Step 3: Find Your Installers
```
dist/packages/
├── WebRTC Desktop Host-0.1.0.exe (Windows)
├── WebRTC Desktop Host-0.1.0.dmg (macOS)
└── WebRTC Desktop Host-0.1.0.AppImage (Linux)
```

### Step 4: Test Installation
- Download installer from `dist/packages/`
- Run on a clean system
- Verify app launches and works

### Step 5: Create Release
```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions will automatically build and release!

---

## 📚 Documentation Map

```
START HERE
    ↓
DISTRIBUTION_SUMMARY.md (5 min read)
    ↓
    ├─→ Want step-by-step? → DISTRIBUTION_SETUP.md
    ├─→ Want checklist? → DISTRIBUTION_CHECKLIST.md
    ├─→ Want architecture? → DISTRIBUTION_ARCHITECTURE.md
    └─→ Want full plan? → PACKAGING_DISTRIBUTION_PLAN.md
```

---

## 🎯 Common Tasks

### Build for Distribution
```bash
npm run build:all
```
**Output**: `dist/packages/` with all installers

### Create a Release
```bash
npm version minor
git push origin main
git push origin v0.2.0
```
**Result**: GitHub Actions builds and releases automatically

### Test on Clean System
1. Create virtual machine
2. Download installer
3. Install and run
4. Verify functionality

### Update Version
```bash
npm version patch    # v0.1.1
npm version minor    # v0.2.0
npm version major    # v1.0.0
```

### Check Build Status
1. Go to GitHub Actions
2. Click on latest workflow
3. Check build logs

---

## 📋 Implementation Checklist

### Week 1: Setup
- [ ] Create application icons
- [ ] Test GitHub Actions workflow
- [ ] Test local builds

### Week 2: Release
- [ ] Update version
- [ ] Update changelog
- [ ] Create git tag
- [ ] Verify GitHub Actions build
- [ ] Test installers

### Week 3: Distribution
- [ ] Download installers
- [ ] Test on clean systems
- [ ] Announce release
- [ ] Monitor downloads

---

## 🔧 Troubleshooting

### Build Fails
```bash
rm -rf dist node_modules
npm install
npm run build:all
```

### Python Not Found
Users need to install Python 3.8+:
- Windows: https://www.python.org/downloads/
- macOS: `brew install python3`
- Linux: `sudo apt install python3`

### GitHub Actions Not Triggering
1. Check tag format: `v0.1.0`
2. Verify workflow file exists
3. Check repository settings

---

## 📦 What Gets Built

### Windows
- `WebRTC Desktop Host-0.1.0.exe` - NSIS Installer
- `WebRTC Desktop Host 0.1.0.exe` - Portable executable

### macOS
- `WebRTC Desktop Host-0.1.0.dmg` - Disk image
- `WebRTC Desktop Host-0.1.0.zip` - ZIP archive

### Linux
- `WebRTC Desktop Host-0.1.0.AppImage` - AppImage
- `webrtc-desktop-host_0.1.0_amd64.deb` - Debian package

---

## 🌐 Distribution Channels

### GitHub Releases (Primary)
```
https://github.com/yourusername/webrtc-desktop-host/releases
```
- Direct download
- Auto-update support
- Release notes

### Package Managers (Optional)
```bash
# Windows
choco install webrtc-desktop-host

# macOS
brew install webrtc-desktop-host

# Linux
sudo apt install webrtc-desktop-host
```

---

## 📊 Release Timeline

```
Day 1: Prepare
├─ Update version
├─ Update changelog
└─ Run tests

Day 2: Build
├─ Create git tag
├─ GitHub Actions builds
└─ Create release

Day 3: Test
├─ Download installers
├─ Test on clean systems
└─ Verify auto-update

Day 4: Announce
├─ Post release notes
├─ Notify users
└─ Monitor feedback
```

---

## 🎓 Learning Resources

### Quick Reads (5-10 min)
- DISTRIBUTION_SUMMARY.md
- QUICK_START_DISTRIBUTION.md (this file)

### Detailed Guides (30-60 min)
- DISTRIBUTION_SETUP.md
- DISTRIBUTION_README.md

### Complete References (1-2 hours)
- PACKAGING_DISTRIBUTION_PLAN.md
- DISTRIBUTION_ARCHITECTURE.md

### External Resources
- [electron-builder docs](https://www.electron.build/)
- [GitHub Actions docs](https://docs.github.com/en/actions)

---

## ✅ Success Checklist

- [ ] Builds complete without errors
- [ ] Installers created for all platforms
- [ ] GitHub Actions workflow runs successfully
- [ ] Installers work on clean systems
- [ ] Auto-update functions correctly
- [ ] Users can download from GitHub
- [ ] Release notes are clear

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Build fails | Clear cache: `rm -rf dist node_modules` |
| Python not found | Install Python 3.8+ |
| GitHub Actions doesn't trigger | Check tag format: `v0.1.0` |
| Installer won't run | Check Windows Defender/antivirus |
| Update not working | Verify version is higher in package.json |

---

## 📞 Need Help?

1. **Check Documentation**
   - DISTRIBUTION_SETUP.md - Step-by-step
   - DISTRIBUTION_CHECKLIST.md - Task list

2. **Check Logs**
   - GitHub Actions: Check workflow logs
   - Build: Check console output
   - App: Check application logs

3. **External Help**
   - electron-builder: https://www.electron.build/
   - GitHub Actions: https://docs.github.com/en/actions

---

## 🎉 You're Ready!

Everything is set up for distribution. Just:

1. Create icons
2. Test builds
3. Create release
4. Users download and install

That's it! 🚀

---

**Next Step**: Read [DISTRIBUTION_SETUP.md](./DISTRIBUTION_SETUP.md) for detailed instructions.
