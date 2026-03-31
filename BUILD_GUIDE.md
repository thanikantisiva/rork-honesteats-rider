# HonestEats Rider App - Build & Run Guide

Complete guide for building, compiling, and running the rider application.

---

## 📱 Development Commands

### Start Metro Bundler (Dev Server)

Start the development server:
```bash
cd /Users/user/startup/rork-honesteats-rider
npx expo start
```

Start with clear cache (recommended after config changes):
```bash
npx expo start --clear
```

Start in tunnel mode (for testing on physical devices):
```bash
npx expo start --tunnel
```

### Run on Android

Build and run on Android device/emulator:
```bash
cd /Users/user/startup/rork-honesteats-rider
npx expo run:android
```

Run specific variant:
```bash
npx expo run:android --variant debug
npx expo run:android --variant release
```

### Run on iOS

Build and run on iOS simulator/device:
```bash
cd /Users/user/startup/rork-honesteats-rider
npx expo run:ios
```

Run on specific simulator:
```bash
npx expo run:ios --simulator "iPhone 15 Pro"
```

Run with configuration:
```bash
npx expo run:ios --configuration Debug
npx expo run:ios --configuration Release
```

### Run on Web

Start web development server:
```bash
cd /Users/user/startup/rork-honesteats-rider
npx expo start --web
```

Or using npm script:
```bash
npm run web
```

---

## 🏗️ Build Commands

### Prebuild (Generate Native Projects)

Generate `android/` and `ios/` directories with native configurations:
```bash
npx expo prebuild
```

Clean prebuild (removes existing native directories first):
```bash
npx expo prebuild --clean
```

Platform-specific prebuild:
```bash
npx expo prebuild --platform android
npx expo prebuild --platform ios
```

### Android Builds

#### Debug APK
```bash
cd android
./gradlew assembleDebug
```
**Output**: `android/app/build/outputs/apk/debug/app-debug.apk`

#### Release APK
```bash
cd android
./gradlew assembleRelease
```
**Output**: `android/app/build/outputs/apk/release/app-release.apk`

#### Release App Bundle (for Google Play Store)
```bash
cd android
./gradlew bundleRelease
```
**Output**: `android/app/build/outputs/bundle/release/app-release.aab`

#### Install APK on Device
```bash
cd android
./gradlew installDebug
./gradlew installRelease
```

### iOS Builds

#### Build for Simulator (Debug)
```bash
npx expo run:ios --configuration Debug
```

#### Build for Device (Release)
```bash
npx expo run:ios --configuration Release
```

#### Build with Xcode (Manual)
```bash
cd ios
xcodebuild -workspace RorkHonesteatsRider.xcworkspace \
  -scheme RorkHonesteatsRider \
  -configuration Release \
  -sdk iphoneos \
  -derivedDataPath build
```

---

## 🧹 Maintenance Commands

### Install Dependencies

First time install:
```bash
cd /Users/user/startup/rork-honesteats-rider
npm install --legacy-peer-deps
```

Reinstall (clean install):
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Clear All Caches

Clear Metro bundler, Expo, and build caches:
```bash
rm -rf node_modules/.cache .expo android/app/build ios/build
npx expo start --clear
```

### Clear Metro Bundler Cache Only
```bash
npx expo start --clear
```

### Clear Android Build Cache
```bash
cd android
./gradlew clean
```

### Clear iOS Build Cache
```bash
cd ios
xcodebuild clean
```

### Kill Metro Bundler Process
```bash
lsof -ti:8081 | xargs kill -9
```

---

## 🔧 Common Workflows

### First Time Setup

1. Install dependencies:
```bash
cd /Users/user/startup/rork-honesteats-rider
npm install --legacy-peer-deps
```

2. Generate native projects:
```bash
npx expo prebuild --clean
```

3. Run on Android:
```bash
npx expo run:android
```

### After Making Code Changes

**Option 1**: Just reload the app (fastest)
- Shake device → Press "Reload"
- Press `R` in Metro bundler terminal

**Option 2**: Restart dev server with cache clear
```bash
npx expo start --clear
```

### After Changing Native Configuration

When you modify:
- `app.json`
- Firebase config files (`google-services.json`, `GoogleService-Info.plist`)
- Plugins
- Permissions

Run:
```bash
npx expo prebuild --clean
npx expo run:android
```

### After Adding/Removing Dependencies

1. Install new packages:
```bash
npm install --legacy-peer-deps
```

2. If native dependencies changed:
```bash
npx expo prebuild --clean
```

3. Rebuild:
```bash
npx expo run:android
```

### Full Clean Rebuild

When things are broken or you want a fresh start:
```bash
# 1. Remove all build artifacts and caches
rm -rf node_modules/.cache .expo android ios node_modules package-lock.json

# 2. Reinstall dependencies
npm install --legacy-peer-deps

# 3. Generate native projects
npx expo prebuild --clean

# 4. Rebuild and run
npx expo run:android
```

### Testing on Physical Android Device

1. Enable USB Debugging on your device
2. Connect device via USB
3. Verify device is connected:
```bash
adb devices
```
4. Run the app:
```bash
npx expo run:android
```

### Creating a Production Build

#### Android Production Build

1. Clean build:
```bash
cd android
./gradlew clean
```

2. Build release AAB:
```bash
./gradlew bundleRelease
```

3. Find output at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

4. Upload to Google Play Console

#### iOS Production Build

1. Open Xcode:
```bash
cd ios
open RorkHonesteatsRider.xcworkspace
```

2. In Xcode:
   - Select "Any iOS Device" as target
   - Product → Archive
   - Upload to App Store Connect

---

## 📝 Available NPM Scripts

From `package.json`:

| Command | Description |
|---------|-------------|
| `npm start` | Start Metro bundler |
| `npm run android` | Build and run on Android |
| `npm run ios` | Build and run on iOS |
| `npm run web` | Start web development server |

---

## 🔍 Debugging Commands

### View Android Logs
```bash
adb logcat
```

Filter for React Native logs:
```bash
adb logcat | grep ReactNativeJS
```

### View iOS Logs
```bash
npx react-native log-ios
```

### Open React Native Debugger

In running app:
- Shake device
- Press "Debug" or "Open Debugger"

Or press `j` in Metro bundler terminal

### Inspect Network Requests

Install React Native Debugger or use:
```bash
npx react-devtools
```

---

## ⚠️ Prerequisites & Requirements

### Required Software

#### For Android Development:
- **Node.js**: 20.18.0+ (currently using v20.18.0)
- **JDK**: 17+ (install with `brew install openjdk@17`)
- **Android Studio**: Latest version
- **Android SDK**: API Level 34+
- **Android Emulator** or physical device

#### For iOS Development:
- **macOS**: Required for iOS builds
- **Xcode**: 15+
- **CocoaPods**: Latest version (`brew install cocoapods`)
- **iOS Simulator** or physical device

### Environment Setup

#### Android Setup:

1. Install Java 17:
```bash
brew install openjdk@17
```

2. Set JAVA_HOME:
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

3. Verify Android SDK:
```bash
echo $ANDROID_HOME
# Should output: /Users/user/Library/Android/sdk
```

#### iOS Setup:

1. Install CocoaPods:
```bash
brew install cocoapods
```

2. Install pods (after prebuild):
```bash
cd ios
pod install
```

---

## 🐛 Troubleshooting

### Port 8081 Already in Use
```bash
lsof -ti:8081 | xargs kill -9
```

### Firebase Initialization Error
```bash
npx expo prebuild --clean
npx expo run:android
```

### Module Resolution Errors (`@/contexts/...`)
```bash
rm -rf node_modules/.cache .expo
npx expo start --clear
```

### Metro Bundler Cache Issues
```bash
npx expo start --clear
# Or
watchman watch-del-all (if watchman is installed)
```

### Android Build Fails
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

### iOS Build Fails
```bash
cd ios
pod deintegrate
pod install
cd ..
npx expo run:ios
```

### Permission Denied on Gradlew
```bash
chmod +x android/gradlew
```

---

## 📦 Project Structure

```
rork-honesteats-rider/
├── app/                      # Expo Router app directory
│   ├── (tabs)/              # Tab navigation screens
│   ├── _layout.tsx          # Root layout with providers
│   ├── login.tsx            # Login screen
│   ├── signup.tsx           # Signup screen
│   └── welcome.tsx          # Welcome screen
├── components/              # Reusable components
├── contexts/                # React contexts (Auth, Location, Orders)
├── lib/                     # API and utilities
├── types/                   # TypeScript types
├── assets/                  # Images and static files
├── android/                 # Android native code (generated)
├── ios/                     # iOS native code (generated)
├── node_modules/            # Dependencies
├── app.json                 # Expo configuration
├── babel.config.js          # Babel configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Dependencies and scripts
├── google-services.json     # Firebase Android config
└── GoogleService-Info.plist # Firebase iOS config
```

---

## 🔐 Firebase Configuration

### Android
File: `google-services.json`
- Package: `app.rork.honesteats.rider`
- Project: `appnearbites-85b8c`

### iOS
File: `GoogleService-Info.plist`
- Bundle ID: `app.rork.honesteats.rider`
- Google App ID: `1:910988530845:ios:66e4583695bc037abf3074`

**Important**: After updating Firebase config files, always run:
```bash
npx expo prebuild --clean
```

---

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [Firebase for React Native](https://rnfirebase.io/)
- [Android Developer Guide](https://developer.android.com/)
- [iOS Developer Guide](https://developer.apple.com/documentation/)

---

## 🆘 Need Help?

If you encounter issues not covered in this guide:

1. Check the error message in the terminal
2. Clear all caches and rebuild
3. Check Firebase configuration
4. Verify all prerequisites are installed
5. Review the logs using debugging commands above

---

**Last Updated**: January 21, 2026
**Expo Version**: ~54.0.27
**React Native Version**: 0.81.5
