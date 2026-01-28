#!/bin/bash
# dev-reset.sh - Reset Sajda app state for fresh dev testing
# Usage: ./scripts/dev-reset.sh

set -e

APP_ID="net.hafizhanif.sajda"
APP_SUPPORT_DIR="$HOME/Library/Application Support/$APP_ID"

echo "=== Sajda Dev Reset ==="
echo ""

# 1. Remove app settings and cache
if [ -d "$APP_SUPPORT_DIR" ]; then
    echo "Removing app data from: $APP_SUPPORT_DIR"
    rm -rf "$APP_SUPPORT_DIR"
    echo "  ✓ App settings, tracker, and cache removed"
else
    echo "  - No app data directory found (already clean)"
fi

# 2. Reset macOS Location Services permission for the app
# Note: This resets ALL apps' location permissions, not just Sajda
# There's no way to reset just one app's location permission
echo ""
echo "To reset Location Services permission, run:"
echo "  tccutil reset LocationServices"
echo ""
echo "WARNING: This resets location permissions for ALL apps."
echo "You'll need to re-grant permission to other apps too."
echo ""
read -p "Reset ALL location permissions now? (y/N): " response
if [[ "$response" =~ ^[Yy]$ ]]; then
    tccutil reset LocationServices
    echo "  ✓ Location Services permissions reset"
else
    echo "  - Skipped location reset"
fi

# 3. Remove LaunchAgent (autostart)
LAUNCH_AGENT="$HOME/Library/LaunchAgents/${APP_ID}.plist"
if [ -f "$LAUNCH_AGENT" ]; then
    echo ""
    echo "Removing autostart LaunchAgent..."
    launchctl unload "$LAUNCH_AGENT" 2>/dev/null || true
    rm -f "$LAUNCH_AGENT"
    echo "  ✓ LaunchAgent removed"
fi

echo ""
echo "=== Reset Complete ==="
echo "Run 'npm run tauri dev' for a fresh start."
echo ""
