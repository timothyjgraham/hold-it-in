#!/bin/bash
set -euo pipefail

# Hold It In — macOS code signing and notarization script
# Usage: ./sign-and-notarize.sh /path/to/Hold\ It\ In.app
#
# Mirrors the Polydangerous signing pipeline.
# Requires: Developer ID Application certificate in keychain.

APP_PATH="${1:?Usage: $0 /path/to/Hold It In.app}"
IDENTITY="Developer ID Application: Timothy Graham (3G235T8LSU)"
APPLE_ID="timmaeus@gmail.com"
TEAM_ID="3G235T8LSU"
ENTITLEMENTS="$(dirname "$0")/../../build/entitlements.mac.plist"
CHILD_ENTITLEMENTS="$(dirname "$0")/../../build/entitlements.mac.inherit.plist"

# Prompt for app-specific password
read -sp "Enter Apple app-specific password: " APP_PASSWORD
echo

APP_NAME=$(basename "$APP_PATH" .app)

echo "=== Step 0: Fix Electron framework symlinks ==="
fix_framework_symlinks() {
    local fw_path="$1"
    if [ ! -d "$fw_path/Versions" ]; then
        echo "  No Versions dir in $fw_path, skipping"
        return
    fi
    # Remove flat copies that should be symlinks
    for item in $(ls "$fw_path" | grep -v Versions); do
        if [ ! -L "$fw_path/$item" ]; then
            rm -rf "$fw_path/$item"
        fi
    done
    # Fix Current symlink
    if [ ! -L "$fw_path/Versions/Current" ]; then
        rm -rf "$fw_path/Versions/Current"
        ln -s A "$fw_path/Versions/Current"
    fi
    # Recreate top-level symlinks
    for item in $(ls "$fw_path/Versions/A/"); do
        if [ ! -e "$fw_path/$item" ]; then
            ln -s "Versions/Current/$item" "$fw_path/$item"
        fi
    done
}

FRAMEWORKS_DIR="$APP_PATH/Contents/Frameworks"
for fw in "$FRAMEWORKS_DIR"/*.framework; do
    [ -d "$fw" ] && fix_framework_symlinks "$fw"
done

echo "=== Step 1: Sign dylibs ==="
find "$APP_PATH" -name "*.dylib" -exec codesign --force --sign "$IDENTITY" --timestamp --options runtime --entitlements "$CHILD_ENTITLEMENTS" {} \;

echo "=== Step 2: Sign helper executables ==="
for helper in "$FRAMEWORKS_DIR"/chrome_crashpad_handler "$FRAMEWORKS_DIR"/Squirrel.framework/Versions/A/Resources/ShipIt; do
    [ -f "$helper" ] && codesign --force --sign "$IDENTITY" --timestamp --options runtime --entitlements "$CHILD_ENTITLEMENTS" "$helper"
done

echo "=== Step 3: Sign frameworks (inside-out) ==="
for fw in "$FRAMEWORKS_DIR"/*.framework; do
    [ -d "$fw" ] || continue
    echo "  Signing framework: $(basename "$fw")"
    # Sign the binary inside
    local_bin="$fw/Versions/A/$(basename "$fw" .framework)"
    [ -f "$local_bin" ] && codesign --force --sign "$IDENTITY" --timestamp --options runtime --entitlements "$CHILD_ENTITLEMENTS" "$local_bin"
    # Sign the framework bundle
    codesign --force --sign "$IDENTITY" --timestamp --options runtime --entitlements "$CHILD_ENTITLEMENTS" "$fw"
done

echo "=== Step 4: Sign helper apps ==="
for helper_app in "$FRAMEWORKS_DIR"/*.app; do
    [ -d "$helper_app" ] || continue
    echo "  Signing helper: $(basename "$helper_app")"
    codesign --force --deep --sign "$IDENTITY" --timestamp --options runtime --entitlements "$CHILD_ENTITLEMENTS" "$helper_app"
done

echo "=== Step 5: Sign main app ==="
codesign --force --sign "$IDENTITY" --timestamp --options runtime --entitlements "$ENTITLEMENTS" "$APP_PATH"

echo "=== Step 6: Verify signature ==="
codesign --verify --deep --strict "$APP_PATH"
echo "  Signature valid!"

echo "=== Step 7: Create zip for notarization ==="
ZIP_PATH="/tmp/${APP_NAME}-notarize.zip"
ditto -c -k --keepParent "$APP_PATH" "$ZIP_PATH"

echo "=== Step 8: Submit for notarization ==="
xcrun notarytool submit "$ZIP_PATH" \
    --apple-id "$APPLE_ID" \
    --password "$APP_PASSWORD" \
    --team-id "$TEAM_ID" \
    --wait

echo "=== Step 9: Staple notarization ticket ==="
xcrun stapler staple "$APP_PATH"

echo "=== Step 10: Create distribution zip ==="
DIST_ZIP="$(dirname "$APP_PATH")/${APP_NAME}-macOS.zip"
ditto -c -k --keepParent "$APP_PATH" "$DIST_ZIP"
echo "  Done! Distribution: $DIST_ZIP"

rm "$ZIP_PATH"
echo "=== All done! ==="
