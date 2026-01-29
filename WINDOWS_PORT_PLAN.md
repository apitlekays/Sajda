# Sajda Windows Port - Comprehensive Implementation Plan

## Decision Summary

Based on your inputs, here are the confirmed parameters:

| Category | Decision |
|----------|----------|
| **Location Strategy** | Hybrid (Native GPS + IP fallback) |
| **Installer Format** | NSIS (.exe) only |
| **Minimum Windows** | Windows 10 (1809+) |
| **Code Signing** | No signing for now |
| **Release Sync** | Unified releases (same version/tag) |
| **Auto-Update** | Shared latest.json endpoint |
| **CI Strategy** | Single workflow with matrix build |
| **Feature Scope** | Full parity from day one |
| **Tray Behavior** | Tray icon + popup window |
| **Testing** | Dedicated Windows machine |
| **Window Position** | Always near system tray |
| **Autostart** | Registry Run key |
| **Win Permissions** | Silent with in-app guidance |
| **Audio Fallback** | Silent fallback + notification |
| **Analytics** | Track platform property |
| **SmartScreen** | Document in README |
| **Code Organization** | Conditional compilation |
| **GPS Crate** | Official `windows` crate |
| **Portable Option** | No, installer only |
| **Bug Tracking** | GitHub labels |
| **Version UI** | Same format both platforms |
| **Default Zone** | Same (WLY01) |
| **Focus Assist** | Respect system settings |
| **Documentation** | Unified README |
| **Timeline** | 4-6 weeks (balanced) |
| **Release Tag** | Stable release |
| **CLAUDE.md** | Add Windows section |
| **CI Secrets** | Placeholder secrets |

---

## Phase 1: Foundation (Week 1)

### 1.1 Cargo.toml Updates

**File:** `src-tauri/Cargo.toml`

**Changes:**
```toml
# Add Windows GPS dependency (conditional)
[target.'cfg(target_os = "windows")'.dependencies]
windows = { version = "0.58", features = [
    "Devices_Geolocation",
    "Foundation",
    "Foundation_Collections"
]}

# Make swift-rs macOS-only
[target.'cfg(target_os = "macos")'.dependencies]
swift-rs = "1.0.7"

[target.'cfg(target_os = "macos")'.build-dependencies]
swift-rs = { version = "1.0.7", features = ["build"] }

# Conditional Tauri features
[target.'cfg(target_os = "macos")'.dependencies.tauri]
version = "2"
features = ["macos-private-api", "tray-icon"]

[target.'cfg(not(target_os = "macos"))'.dependencies.tauri]
version = "2"
features = ["tray-icon"]
```

**Estimated Lines Changed:** ~25 lines

---

### 1.2 tauri.conf.json Updates

**File:** `src-tauri/tauri.conf.json`

**Changes:**
```json
{
  "bundle": {
    "targets": ["app", "dmg", "nsis"],
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": null,
      "nsis": {
        "installerIcon": "icons/icon.ico",
        "sidebarImage": null,
        "headerImage": null,
        "shortcutName": "Sajda",
        "runAfterInstall": true
      }
    },
    "macOS": {
      // existing config unchanged
    }
  },
  "app": {
    "macOSPrivateApi": true  // Keep for macOS, ignored on Windows
  }
}
```

**Note:** `macOSPrivateApi` is automatically ignored on non-macOS platforms.

**Estimated Lines Changed:** ~20 lines

---

### 1.3 Autostart Plugin Conditional

**File:** `src-tauri/src/lib.rs` (lines 317-320)

**Current:**
```rust
.plugin(tauri_plugin_autostart::init(
    tauri_plugin_autostart::MacosLauncher::LaunchAgent,
    Some(vec![]),
))
```

**Change to:**
```rust
.plugin(tauri_plugin_autostart::init(
    #[cfg(target_os = "macos")]
    tauri_plugin_autostart::MacosLauncher::LaunchAgent,
    #[cfg(target_os = "windows")]
    tauri_plugin_autostart::ManagerArgs::default(),
    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    tauri_plugin_autostart::ManagerArgs::default(),
    Some(vec![]),
))
```

**Estimated Lines Changed:** ~8 lines

---

## Phase 2: Windows Location Service (Week 1-2)

### 2.1 Create Windows Location Module

**File:** `src-tauri/src/location.rs`

**Add Windows implementation alongside existing macOS code:**

```rust
// ============== WINDOWS IMPLEMENTATION ==============

#[cfg(target_os = "windows")]
mod windows_location {
    use windows::Devices::Geolocation::{
        Geolocator, GeolocationAccessStatus, PositionAccuracy,
    };

    pub fn check_authorization() -> i32 {
        // Windows location permission check
        match Geolocator::RequestAccessAsync() {
            Ok(op) => match op.get() {
                Ok(status) => match status {
                    GeolocationAccessStatus::Allowed => 0,
                    GeolocationAccessStatus::Denied => 1,
                    GeolocationAccessStatus::Unspecified => 2,
                    _ => 3,
                },
                Err(_) => 4,
            },
            Err(_) => 4,
        }
    }

    pub fn request_authorization() {
        // Windows handles this automatically on first GPS request
        // No explicit request needed, unlike macOS
    }

    pub fn get_location() -> super::NativeLocationResult {
        let geolocator = match Geolocator::new() {
            Ok(g) => g,
            Err(e) => return super::NativeLocationResult {
                latitude: 0.0,
                longitude: 0.0,
                accuracy: 0.0,
                error_code: 4,
                error_message: format!("Failed to create Geolocator: {}", e),
                source: "unavailable".to_string(),
            },
        };

        let _ = geolocator.SetDesiredAccuracy(PositionAccuracy::High);

        match geolocator.GetGeopositionAsync() {
            Ok(op) => match op.get() {
                Ok(position) => {
                    let coord = position.Coordinate().unwrap();
                    let point = coord.Point().unwrap();
                    let pos = point.Position().unwrap();

                    super::NativeLocationResult {
                        latitude: pos.Latitude,
                        longitude: pos.Longitude,
                        accuracy: coord.Accuracy().unwrap_or(0.0),
                        error_code: 0,
                        error_message: "".to_string(),
                        source: "native".to_string(),
                    }
                },
                Err(e) => super::NativeLocationResult {
                    latitude: 0.0,
                    longitude: 0.0,
                    accuracy: 0.0,
                    error_code: 3,
                    error_message: format!("Location error: {}", e),
                    source: "unavailable".to_string(),
                },
            },
            Err(e) => super::NativeLocationResult {
                latitude: 0.0,
                longitude: 0.0,
                accuracy: 0.0,
                error_code: 3,
                error_message: format!("Failed to get position: {}", e),
                source: "unavailable".to_string(),
            },
        }
    }

    pub fn is_native_location_supported() -> bool {
        // Windows 10 1809+ has Geolocation API
        true
    }

    pub fn get_os_version() -> String {
        // Get Windows version
        if let Ok(version) = sys_info::os_release() {
            version
        } else {
            "10.0".to_string()
        }
    }
}

// Update the public functions to use platform-specific implementations:

#[cfg(target_os = "windows")]
pub fn check_authorization() -> i32 {
    windows_location::check_authorization()
}

#[cfg(target_os = "windows")]
pub fn request_authorization() {
    windows_location::request_authorization()
}

#[cfg(target_os = "windows")]
pub fn get_location() -> NativeLocationResult {
    windows_location::get_location()
}

#[cfg(target_os = "windows")]
pub fn is_native_location_supported() -> bool {
    windows_location::is_native_location_supported()
}

#[cfg(target_os = "windows")]
pub fn get_os_version() -> String {
    windows_location::get_os_version()
}
```

**Estimated Lines Added:** ~150-200 lines

---

### 2.2 Update LocationService.ts for Windows Guidance

**File:** `src/utils/LocationService.ts`

**Add Windows permission guidance:**

```typescript
// Add to LocationService object:

/**
 * Get platform-specific location permission guidance
 */
getLocationPermissionGuidance(): { title: string; message: string; action?: string } {
    // Detect platform (Tauri provides this)
    const isWindows = navigator.userAgent.includes('Windows');

    if (isWindows) {
        return {
            title: "Location Access Required",
            message: "To get accurate prayer times, please enable location access in Windows Settings.",
            action: "Open Settings > Privacy > Location and ensure 'Location services' and app access are enabled."
        };
    }

    // macOS guidance
    return {
        title: "Location Access Required",
        message: "Please allow location access in System Preferences > Security & Privacy > Privacy > Location Services.",
        action: undefined
    };
}
```

**Estimated Lines Added:** ~25 lines

---

## Phase 3: CI/CD Updates (Week 2)

### 3.1 Update Release Workflow

**File:** `.github/workflows/release.yml`

**Add Windows to build matrix:**

```yaml
strategy:
  fail-fast: false
  matrix:
    include:
      # macOS builds (existing)
      - platform: 'macos-latest'
        args: '--target aarch64-apple-darwin'
        arch: 'aarch64'
        target: 'aarch64-apple-darwin'
      - platform: 'macos-latest'
        args: '--target x86_64-apple-darwin'
        arch: 'x64'
        target: 'x86_64-apple-darwin'
      # NEW: Windows build
      - platform: 'windows-latest'
        args: '--target x86_64-pc-windows-msvc'
        arch: 'x64-win'
        target: 'x86_64-pc-windows-msvc'
```

**Add conditional steps for Windows:**

```yaml
- name: Import Apple Certificate
  if: matrix.platform == 'macos-latest'
  env:
    APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
    # ... rest of macOS signing
  run: |
    # ... existing macOS certificate import

- name: Build and Release
  uses: tauri-apps/tauri-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
    # macOS-only env vars
    APPLE_ID: ${{ matrix.platform == 'macos-latest' && secrets.APPLE_ID || '' }}
    APPLE_PASSWORD: ${{ matrix.platform == 'macos-latest' && secrets.APPLE_APP_PASSWORD || '' }}
    APPLE_TEAM_ID: ${{ matrix.platform == 'macos-latest' && secrets.APPLE_TEAM_ID || '' }}
    MACOSX_DEPLOYMENT_TARGET: ${{ matrix.platform == 'macos-latest' && '10.15' || '' }}
  with:
    tagName: v__VERSION__
    releaseName: 'Sajda v__VERSION__'
    releaseBody: 'See release notes for details.'
    releaseDraft: true
    prerelease: false
    includeUpdaterJson: false
    args: ${{ matrix.args }}

- name: Sign macOS artifact
  if: matrix.platform == 'macos-latest'
  # ... existing signature upload for macOS

- name: Sign Windows artifact
  if: matrix.platform == 'windows-latest'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
  run: |
    $VERSION = "${{ github.ref_name }}".TrimStart('v')

    # Download the NSIS installer
    gh release download "v${VERSION}" --pattern "Sajda_${VERSION}_x64-setup.exe" --dir .

    # Create a tar.gz for updater (Tauri expects this format)
    # Note: Windows updater uses .nsis.zip format

    # Sign for updater
    npx tauri signer sign --private-key "$env:TAURI_SIGNING_PRIVATE_KEY" --password "$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD" "Sajda_${VERSION}_x64-setup.nsis.zip"

    # Upload signature
    gh release upload "v${VERSION}" "Sajda_${VERSION}_x64-setup.nsis.zip.sig" --clobber
  shell: pwsh
```

**Estimated Lines Changed:** ~80 lines

---

### 3.2 Update latest.json Generation

**File:** `.github/workflows/release.yml` (publish-updater job)

**Update to include Windows:**

```yaml
- name: Generate and upload latest.json
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    VERSION="${{ steps.version.outputs.version }}"
    REPO="${{ github.repository }}"
    PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Read signatures
    AARCH64_SIG=$(cat ./signatures/Sajda_aarch64.app.tar.gz.sig 2>/dev/null || echo "")
    X64_SIG=$(cat ./signatures/Sajda_x64.app.tar.gz.sig 2>/dev/null || echo "")
    WIN_X64_SIG=$(cat ./signatures/Sajda_${VERSION}_x64-setup.nsis.zip.sig 2>/dev/null || echo "")

    # Generate latest.json with all platforms
    jq -n \
      --arg version "$VERSION" \
      --arg notes "See release notes for details." \
      --arg pub_date "$PUB_DATE" \
      --arg aarch64_sig "$AARCH64_SIG" \
      --arg aarch64_url "https://github.com/${REPO}/releases/download/v${VERSION}/Sajda_aarch64.app.tar.gz" \
      --arg x64_sig "$X64_SIG" \
      --arg x64_url "https://github.com/${REPO}/releases/download/v${VERSION}/Sajda_x64.app.tar.gz" \
      --arg win_x64_sig "$WIN_X64_SIG" \
      --arg win_x64_url "https://github.com/${REPO}/releases/download/v${VERSION}/Sajda_${VERSION}_x64-setup.nsis.zip" \
      '{
        version: $version,
        notes: $notes,
        pub_date: $pub_date,
        platforms: {
          "darwin-aarch64": {
            signature: $aarch64_sig,
            url: $aarch64_url
          },
          "darwin-x86_64": {
            signature: $x64_sig,
            url: $x64_url
          },
          "windows-x86_64": {
            signature: $win_x64_sig,
            url: $win_x64_url
          }
        }
      }' > latest.json

    gh release upload "v${VERSION}" latest.json --clobber
```

**Estimated Lines Changed:** ~40 lines

---

### 3.3 Add Placeholder CI Secrets

**GitHub Repository Settings > Secrets and Variables > Actions**

Add these secrets (can be empty/placeholder for now):

| Secret Name | Purpose | Initial Value |
|-------------|---------|---------------|
| `WINDOWS_CERTIFICATE` | Windows code signing cert (base64) | (empty) |
| `WINDOWS_CERTIFICATE_PASSWORD` | Certificate password | (empty) |

---

## Phase 4: Frontend Updates (Week 3)

### 4.1 Platform Detection Utility

**File:** `src/utils/Platform.ts` (new file)

```typescript
/**
 * Platform detection utilities
 */
export const Platform = {
    isMacOS(): boolean {
        return navigator.userAgent.includes('Mac');
    },

    isWindows(): boolean {
        return navigator.userAgent.includes('Windows');
    },

    getPlatformName(): 'macos' | 'windows' | 'unknown' {
        if (this.isMacOS()) return 'macos';
        if (this.isWindows()) return 'windows';
        return 'unknown';
    }
};
```

**Estimated Lines:** ~20 lines

---

### 4.2 Update Analytics for Platform Tracking

**File:** `src/utils/Analytics.ts`

**Add platform property:**

```typescript
import { Platform } from './Platform';

// In initAnalytics() or wherever user properties are set:
posthog.register({
    platform: Platform.getPlatformName(),
    // ... existing properties
});

// Update trackEvent to include platform:
export function trackEvent(event: string, properties?: Record<string, unknown>) {
    posthog.capture(event, {
        ...properties,
        platform: Platform.getPlatformName(),
    });
}
```

**Estimated Lines Changed:** ~15 lines

---

### 4.3 Location Permission UI (Windows-specific guidance)

**File:** `src/components/Dashboard.tsx`

**Add Windows location guidance in settings drawer:**

```tsx
// In the location toggle section, add platform-specific help text:
{!locationEnabled && Platform.isWindows() && (
    <p className="text-xs text-muted-foreground mt-2">
        To enable GPS location on Windows, ensure Location Services
        is enabled in Windows Settings &gt; Privacy &gt; Location.
    </p>
)}
```

**Estimated Lines Added:** ~10 lines

---

## Phase 5: Documentation Updates (Week 3-4)

### 5.1 Update README.md

**File:** `README.md`

**Add Windows installation section:**

```markdown
## Installation

### macOS

Download the latest `.dmg` from [Releases](https://github.com/apitlekays/Sajda/releases):
- **Apple Silicon (M1/M2/M3):** `Sajda_X.Y.Z_aarch64.dmg`
- **Intel:** `Sajda_X.Y.Z_x64.dmg`

### Windows

Download the latest `.exe` installer from [Releases](https://github.com/apitlekays/Sajda/releases):
- **Windows 10/11 (64-bit):** `Sajda_X.Y.Z_x64-setup.exe`

#### Windows SmartScreen Warning

Since the app is not code-signed, Windows SmartScreen may show a warning:

1. Click "More info"
2. Click "Run anyway"

This is normal for unsigned applications. The app is safe to use.

#### Windows Location Services

For accurate prayer times based on GPS location:

1. Open **Windows Settings**
2. Go to **Privacy & Security** > **Location**
3. Enable **Location services**
4. Ensure **Let apps access your location** is enabled
5. Find Sajda in the app list and allow location access

If location services are unavailable, the app will use IP-based geolocation automatically.
```

**Estimated Lines Added:** ~40 lines

---

### 5.2 Update CLAUDE.md

**File:** `CLAUDE.md`

**Add Windows Development section:**

```markdown
## Windows Development

### Prerequisites

- Windows 10 (1809+) or Windows 11
- Node.js 22.x (via nvm-windows)
- Rust toolchain with `x86_64-pc-windows-msvc` target
- Visual Studio Build Tools 2022 (C++ workload)

### Windows-Specific Commands

```powershell
# Install dependencies
npm ci

# Run in development
npm run tauri dev

# Build for production
npm run tauri build
```

### Platform-Conditional Code

The codebase uses conditional compilation for platform-specific features:

```rust
// Rust: #[cfg(target_os = "windows")]
#[cfg(target_os = "windows")]
fn windows_specific_code() { }

// TypeScript: Platform utility
import { Platform } from './utils/Platform';
if (Platform.isWindows()) { }
```

### Windows Location API

Windows uses `Windows.Devices.Geolocation` via the `windows` crate instead of Swift FFI.

**Key differences from macOS:**
- No explicit authorization request (Windows prompts automatically)
- Permission managed via Windows Settings > Privacy > Location
- Falls back to IP geolocation if GPS unavailable

### Windows Build Artifacts

| Artifact | Description |
|----------|-------------|
| `Sajda_X.Y.Z_x64-setup.exe` | NSIS installer |
| `Sajda_X.Y.Z_x64-setup.nsis.zip` | Updater bundle |
| `Sajda_X.Y.Z_x64-setup.nsis.zip.sig` | Updater signature |

### Testing on Windows

1. Use a dedicated Windows machine or VM
2. Test location services with both GPS and IP fallback
3. Verify tray icon behavior (click to show/hide)
4. Test autostart via Windows Task Manager > Startup apps
5. Verify notifications with Windows Focus Assist both on and off
```

**Estimated Lines Added:** ~60 lines

---

## Phase 6: Testing & Polish (Week 4-5)

### 6.1 Test Matrix

| Feature | macOS Test | Windows Test |
|---------|-----------|--------------|
| App launch | Launch from .app bundle | Launch from Start Menu |
| Tray icon | Menu bar icon visible | System tray icon visible |
| Window show/hide | Click tray, window appears near tray | Same behavior expected |
| Native GPS | Core Location prompt | Windows location prompt (if needed) |
| IP fallback | Disable location services, verify IP works | Same |
| Notifications | Prayer time notification | Same |
| Audio playback | Adhan plays at prayer time | Same |
| Autostart | Verify LaunchAgent created | Verify Registry key created |
| Auto-update | Check for updates, download, install | Same |
| Settings persistence | Restart app, verify settings retained | Same |

### 6.2 Windows-Specific Edge Cases

| Edge Case | Expected Behavior |
|-----------|------------------|
| Location services disabled globally | Fall back to IP geolocation |
| App-specific location denied | Fall back to IP, show guidance |
| No network (IP fallback fails) | Use default zone (WLY01) |
| Focus Assist enabled | Notifications suppressed (Windows behavior) |
| SmartScreen blocks first run | User follows README instructions |
| Audio device unavailable | Silent fallback, notification still shows |
| High DPI display | UI scales correctly (Tauri handles this) |
| Multiple monitors | Tray popup appears on correct monitor |

---

## Phase 7: Release Preparation (Week 5-6)

### 7.1 Pre-Release Checklist

- [ ] All tests pass on Windows machine
- [ ] All tests pass on macOS (no regression)
- [ ] GitHub Actions builds all 3 targets successfully
- [ ] latest.json includes Windows platform
- [ ] README updated with Windows instructions
- [ ] CLAUDE.md updated with Windows section
- [ ] GitHub issue labels created (`platform:windows`, `platform:macos`)
- [ ] Version bumped in all 3 files (package.json, tauri.conf.json, Cargo.toml)

### 7.2 Release Assets (Expected)

| Asset | Platform |
|-------|----------|
| `Sajda_X.Y.Z_aarch64.dmg` | macOS Apple Silicon |
| `Sajda_X.Y.Z_x64.dmg` | macOS Intel |
| `Sajda_aarch64.app.tar.gz` | macOS updater (ARM) |
| `Sajda_x64.app.tar.gz` | macOS updater (Intel) |
| `Sajda_aarch64.app.tar.gz.sig` | macOS signature (ARM) |
| `Sajda_x64.app.tar.gz.sig` | macOS signature (Intel) |
| `Sajda_X.Y.Z_x64-setup.exe` | **Windows installer** |
| `Sajda_X.Y.Z_x64-setup.nsis.zip` | **Windows updater** |
| `Sajda_X.Y.Z_x64-setup.nsis.zip.sig` | **Windows signature** |
| `latest.json` | All platforms |

---

## Summary: Total Changes

| Category | Files | Lines Changed (Est.) |
|----------|-------|---------------------|
| Cargo.toml | 1 | ~25 |
| tauri.conf.json | 1 | ~20 |
| lib.rs (autostart) | 1 | ~8 |
| location.rs (Windows GPS) | 1 | ~150-200 |
| LocationService.ts | 1 | ~25 |
| Platform.ts (new) | 1 | ~20 |
| Analytics.ts | 1 | ~15 |
| Dashboard.tsx | 1 | ~10 |
| release.yml | 1 | ~120 |
| README.md | 1 | ~40 |
| CLAUDE.md | 1 | ~60 |
| **Total** | **11 files** | **~500-550 lines** |

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Foundation | Cargo.toml, tauri.conf.json, lib.rs updates |
| 1-2 | Windows Location | location.rs Windows implementation |
| 2 | CI/CD | release.yml with Windows matrix |
| 3 | Frontend | Platform utils, analytics, UI updates |
| 3-4 | Documentation | README, CLAUDE.md updates |
| 4-5 | Testing | Full test matrix on Windows machine |
| 5-6 | Polish & Release | Bug fixes, release preparation |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Windows GPS API changes | Use official `windows` crate; follow Microsoft docs |
| NSIS installer issues | Test on fresh Windows VM |
| Auto-update fails on Windows | Test update flow thoroughly; keep IP fallback |
| Performance issues | Profile on Windows; Tauri is generally fast |
| SmartScreen blocks downloads | Clear README instructions; consider signing later |

---

## Future Enhancements (Post-Release)

1. **Windows code signing** - Eliminates SmartScreen warnings
2. **ARM64 Windows build** - For Windows on ARM devices
3. **Microsoft Store distribution** - Alternative to direct download
4. **Windows-specific features** - Live tiles, Jump lists, etc.
