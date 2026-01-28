#!/bin/bash
# dev-reset-app-only.sh - Reset only Sajda app state (not system permissions)
# Usage: ./scripts/dev-reset-app-only.sh
#
# This is safe to run repeatedly without affecting other apps.
# Use this for routine dev testing where you just want fresh app state.

set -e

APP_ID="net.hafizhanif.sajda"
APP_SUPPORT_DIR="$HOME/Library/Application Support/$APP_ID"

echo "=== Sajda App Data Reset ==="

# Remove app settings and cache
if [ -d "$APP_SUPPORT_DIR" ]; then
    echo "Removing: $APP_SUPPORT_DIR"
    rm -rf "$APP_SUPPORT_DIR"
    echo "  ✓ App settings, tracker, and cache removed"
else
    echo "  - Already clean (no app data found)"
fi

# Remove LaunchAgent (autostart)
LAUNCH_AGENT="$HOME/Library/LaunchAgents/${APP_ID}.plist"
if [ -f "$LAUNCH_AGENT" ]; then
    launchctl unload "$LAUNCH_AGENT" 2>/dev/null || true
    rm -f "$LAUNCH_AGENT"
    echo "  ✓ LaunchAgent removed"
fi

echo ""
echo "App data reset complete."
echo ""
echo "Note: macOS Location permission NOT reset."
echo "To also reset location permission, run:"
echo "  tccutil reset LocationServices"
echo ""
