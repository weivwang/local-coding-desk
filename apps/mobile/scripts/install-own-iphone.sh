#!/bin/bash
# Build Hearth for your own iPhone, signed with your Apple team, with no hosted services:
# no sign-in service, relay, push or over-the-air updates. The app pairs with Hearth on your Mac
# directly over the local network or a tailnet.
#
#   HEARTH_APPLE_TEAM_ID=ABCDE12345 apps/mobile/scripts/install-own-iphone.sh "My iPhone"
#
# HEARTH_IOS_BUNDLE_ID defaults to app.hearth.ios. Run it from anywhere in the repository.
set -euo pipefail

: "${HEARTH_APPLE_TEAM_ID:?Set HEARTH_APPLE_TEAM_ID to your Apple Developer team ID.}"
DEVICE="${1:?Pass the iPhone name shown by: xcrun devicectl list devices}"

cd "$(dirname "$0")/.."
REPO_ROOT="$(cd ../.. && pwd)"
export PATH="$REPO_ROOT/node_modules/.bin:$PWD/node_modules/.bin:$PATH"

if [ -f "$REPO_ROOT/.env" ] || [ -f "$REPO_ROOT/.env.local" ]; then
  echo "Remove .env/.env.local first: they turn on hosted services." >&2
  exit 1
fi

# The personal-team build drops the widget and share extensions, push, and Sign in with Apple:
# each of them depends on the hosted services this build leaves out.
export APP_VARIANT=production
export T3CODE_IOS_PERSONAL_TEAM=1
export T3CODE_IOS_PERSONAL_TEAM_BUNDLE_ID="${HEARTH_IOS_BUNDLE_ID:-app.hearth.ios}"
export T3CODE_APPLE_TEAM_ID="$HEARTH_APPLE_TEAM_ID"
export EXPO_NO_GIT_STATUS=1

npx expo prebuild --clean --platform ios

# xcodebuild directly: Xcode may create this bundle ID's provisioning profile on first install.
BUILD_DIR="$PWD/ios/build/own-iphone"
xcodebuild -workspace ios/Hearth.xcworkspace -scheme Hearth -configuration Release \
  -destination "platform=iOS,name=$DEVICE" -derivedDataPath "$BUILD_DIR" \
  -allowProvisioningUpdates DEVELOPMENT_TEAM="$HEARTH_APPLE_TEAM_ID" CODE_SIGN_STYLE=Automatic \
  build
xcrun devicectl device install app --device "$DEVICE" \
  "$BUILD_DIR/Build/Products/Release-iphoneos/Hearth.app"
