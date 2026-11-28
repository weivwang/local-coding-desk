#!/bin/bash
# Archive the self-hosted Hearth build (the same one install-own-iphone.sh installs) and upload it
# to App Store Connect for TestFlight. Upload uses the Apple ID signed in to Xcode. The bundle ID
# must be an explicit App ID registered to your team, with an app record in App Store Connect;
# bundle IDs are unique across all of Apple, so app.hearth.ios (the local-install default) is not
# yours to register.
#
#   HEARTH_APPLE_TEAM_ID=ABCDE12345 HEARTH_IOS_BUNDLE_ID=com.example.hearth \
#     apps/mobile/scripts/upload-testflight.sh
#
# HEARTH_APP_VERSION defaults to 1.0.0.
set -euo pipefail

: "${HEARTH_APPLE_TEAM_ID:?Set HEARTH_APPLE_TEAM_ID to your Apple Developer team ID.}"
: "${HEARTH_IOS_BUNDLE_ID:?Set HEARTH_IOS_BUNDLE_ID to an App ID registered to your team.}"

cd "$(dirname "$0")/.."
REPO_ROOT="$(cd ../.. && pwd)"
export PATH="$REPO_ROOT/node_modules/.bin:$PWD/node_modules/.bin:$PATH"

if [ -f "$REPO_ROOT/.env" ] || [ -f "$REPO_ROOT/.env.local" ]; then
  echo "Remove .env/.env.local first: they turn on hosted services." >&2
  exit 1
fi

export APP_VARIANT=production
export T3CODE_IOS_PERSONAL_TEAM=1
export T3CODE_IOS_PERSONAL_TEAM_BUNDLE_ID="$HEARTH_IOS_BUNDLE_ID"
export T3CODE_APPLE_TEAM_ID="$HEARTH_APPLE_TEAM_ID"
export T3CODE_MOBILE_VERSION="${HEARTH_APP_VERSION:-1.0.0}"
export EXPO_NO_GIT_STATUS=1

npx expo prebuild --clean --platform ios

# Every upload needs a build number App Store Connect has not seen; the UTC minute only grows.
BUILD_NUMBER="$(date -u +%Y%m%d%H%M)"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" ios/Hearth/Info.plist

OUT="$PWD/ios/build/testflight"
rm -rf "$OUT"
xcodebuild -workspace ios/Hearth.xcworkspace -scheme Hearth -configuration Release \
  -destination "generic/platform=iOS" -archivePath "$OUT/Hearth.xcarchive" \
  -allowProvisioningUpdates DEVELOPMENT_TEAM="$HEARTH_APPLE_TEAM_ID" CODE_SIGN_STYLE=Automatic \
  archive

cat >"$OUT/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string>$HEARTH_APPLE_TEAM_ID</string>
  <key>signingStyle</key><string>automatic</string>
  <key>manageAppVersionAndBuildNumber</key><false/>
  <key>uploadSymbols</key><true/>
</dict>
</plist>
PLIST

xcodebuild -exportArchive -archivePath "$OUT/Hearth.xcarchive" \
  -exportOptionsPlist "$OUT/ExportOptions.plist" -exportPath "$OUT/export" \
  -allowProvisioningUpdates
echo "uploaded $T3CODE_MOBILE_VERSION ($BUILD_NUMBER)"
