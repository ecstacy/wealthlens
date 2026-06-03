#!/usr/bin/env bash
#
# Build (and optionally install) the WealthLens release APK.
#
#   ./build.sh           # build the signed release APK
#   ./build.sh install   # build, then install + launch on the connected device
#
set -euo pipefail

# Toolchain — override by exporting these before running if your paths differ.
export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$PATH:$ANDROID_HOME/platform-tools"

cd "$(dirname "$0")/android"

echo "▶ Building release APK (this is fast after the first build)…"
./gradlew :app:assembleRelease \
  -x lint -x lintVitalRelease -x lintVitalAnalyzeRelease -x test \
  -PreactNativeArchitectures=arm64-v8a

APK="app/build/outputs/apk/release/app-release.apk"
echo "✓ Built: android/$APK"

if [ "${1:-}" = "install" ]; then
  echo "▶ Installing on connected device…"
  SERIAL="$(adb devices | grep -w device | head -1 | sed 's/\tdevice//')"
  if [ -z "$SERIAL" ]; then
    echo "✗ No device connected. Plug in the Pixel (USB) or run 'adb connect <ip:port>'."
    exit 1
  fi
  adb -s "$SERIAL" install -r "$APK"
  adb -s "$SERIAL" shell monkey -p com.anonymous.wealthlens -c android.intent.category.LAUNCHER 1 >/dev/null
  echo "✓ Installed & launched on $SERIAL"
fi
