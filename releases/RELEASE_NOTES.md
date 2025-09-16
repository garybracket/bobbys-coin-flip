# Bobby's Coin Flip - Release Files

## Current Production APK
- **bobbys-coin-flip-capacitor-aligned.apk** (v1.3.0 - September 13, 2025)
  - Latest production-ready APK with all recent fixes
  - Fixed critical privateRooms Map declaration bug
  - PWA and TWA support enabled
  - Ready for Google Play Store deployment

## Android Build Files (Current)
Located in `/android/` directory:
- **bobbys-coin-flip-capacitor-signed.apk** - Signed release APK (September 12)
- **bobbys-coin-flip-capacitor-release.aab** - Android App Bundle for Play Store
- **app-release-unsigned.apk** - Unsigned release build

## Previous Releases (Archived)
- **bobbys-coin-flip-capacitor-fixed.apk** - Fixed multiplayer version (September 12)
- **bobbys-coin-flip-multiplayer-fixed.apk** - Multiplayer bug fixes (September 13)
- **bobbys-coin-flip-capacitor-debug.apk** - Debug build (September 12)
- **Bobby's Coin Flip-signed.apk** - Early signed version
- **Bobby's Coin Flip-final.apk** - Early final version
- **universal.apk** - Universal build

## Installation Instructions

### For Android Device Installation
1. Enable "Unknown Sources" in Android settings
2. Use the latest **bobbys-coin-flip-capacitor-aligned.apk**
3. Uninstall any previous versions first
4. Install new APK via ADB or direct transfer

### ADB Installation Commands
```bash
# Check connected devices
adb devices

# Uninstall previous versions
adb uninstall com.no-illusion.bobbyscoinflip

# Install new APK
adb install /path/to/bobbys-coin-flip-capacitor-aligned.apk
```

## Build Information
- **Target SDK**: Android API 34
- **Minimum SDK**: Android API 24 (Android 7.0)
- **Architecture**: Universal (ARM64, ARM32, x86)
- **Package Name**: com.no-illusion.bobbyscoinflip
- **Signing**: Production signed with release keystore

## Features in Current Release (v1.3.0)
- Complete coin flipping game with betting system
- User authentication and profiles
- Real-time leaderboards
- Game history tracking
- PWA support for web installation
- Mobile-optimized responsive design
- Secure user data with PostgreSQL backend
- Admin functionality for user management