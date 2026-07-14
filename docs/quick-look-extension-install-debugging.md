# Quick Look Extension Install Debugging

This note documents the issue where `QuickLookProtein.app` builds successfully, but Finder Quick Look does not use it, or the preview appears unchanged after installing a new build.

## Symptom

- The macOS app can be built and launched.
- The new app bundle is copied to `~/Applications/QuickLookProtein.app`.
- Pressing Space in Finder on an `.sdf` file still does not show the expected Quick Look preview, or it appears to use an older build.
- `qlmanage -p file.sdf` may return successfully, but that alone does not prove Finder is using the expected extension.

## Root Cause Found

The system was not using the newly installed app in `~/Applications`.

`pluginkit` showed the active Quick Look extension still pointed at an older copy:

```sh
pluginkit -m -A -D -v -i com.jethrohemmann.QuickLookProtein.QLExtension
```

Example bad state:

```text
/Users/ytao/Desktop/QuickLookProtein.app/Contents/PlugIns/QuickLookProtein Extension.appex
```

The newer app in `~/Applications` existed, but macOS had not accepted it as an active `com.apple.quicklook.preview` provider.

The key signing issue was:

```sh
security find-identity -v -p codesigning
```

returned:

```text
0 valid identities found
```

This project uses sandbox/App Group entitlements. Without a valid Apple Developer signing identity and provisioning profile, Xcode cannot produce a fully valid, entitlement-preserving Quick Look extension build. The ad-hoc debug build can launch as an app, but Finder may refuse to register or load the extension.

## Check What Finder Will Use

Check the registered Quick Look extension:

```sh
pluginkit -m -A -D -v -i com.jethrohemmann.QuickLookProtein.QLExtension
```

Check all Quick Look preview providers and filter for this app:

```sh
pluginkit -m -A -D -v -p com.apple.quicklook.preview | rg -i 'QuickLookProtein|jethrohemmann|QLExtension'
```

The expected good state is a `+` entry pointing at:

```text
/Users/ytao/Applications/QuickLookProtein.app/Contents/PlugIns/QuickLookProtein Extension.appex
```

Example:

```text
+    com.jethrohemmann.QuickLookProtein.QLExtension(1.5) ... /Users/ytao/Applications/QuickLookProtein.app/Contents/PlugIns/QuickLookProtein Extension.appex
```

Check whether the installed app contains the latest HTML/JS resources:

```sh
rg -n 'applyWidestFaceOrientation|ORIENT_TO_WIDEST_FACE' \
  /Users/ytao/Applications/QuickLookProtein.app/Contents/PlugIns/QuickLookProtein\ Extension.appex/Contents/Resources/3Dmol_viewer.html
```

Check the SDF UTI:

```sh
mdls -name kMDItemContentType path/to/file.sdf
```

For the tested `PQQ.sdf`, the UTI was:

```text
dyn.ah62d4rv4ge81g3dg
```

This UTI was already included in `QLSupportedContentTypes`, so file type matching was not the problem.

## Reset Old Registrations

If an old copy is registered, remove it:

```sh
pluginkit -r /Users/ytao/Desktop/QuickLookProtein.app/Contents/PlugIns/QuickLookProtein\ Extension.appex
```

Then register the intended app:

```sh
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f /Users/ytao/Applications/QuickLookProtein.app

pluginkit -a /Users/ytao/Applications/QuickLookProtein.app
pluginkit -e use -i com.jethrohemmann.QuickLookProtein.QLExtension
qlmanage -r
qlmanage -r cache
```

Re-check:

```sh
pluginkit -m -A -D -v -i com.jethrohemmann.QuickLookProtein.QLExtension
```

## Temporary Local Fix: Re-sign Installed Debug App

Use this only for local testing when there is no valid Apple Developer signing identity.

This replaces the signature on the installed app in `~/Applications`. It is not a distribution-quality fix, but for local testing it can preserve the App Group entitlement so settings written by the main app are visible to the Quick Look extension.

Create a temporary entitlements file:

```sh
cat > /tmp/quicklookprotein-local-debug.entitlements <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "https://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.app-sandbox</key>
  <true/>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>W3SKSV7VPT.group.com.jethrohemmann.QuickLookProtein</string>
  </array>
  <key>com.apple.security.files.user-selected.read-only</key>
  <true/>
  <key>com.apple.security.network.client</key>
  <true/>
</dict>
</plist>
EOF
```

Re-sign the extension first:

```sh
codesign -f -s - \
  --entitlements /tmp/quicklookprotein-local-debug.entitlements \
  /Users/ytao/Applications/QuickLookProtein.app/Contents/PlugIns/QuickLookProtein\ Extension.appex
```

Then re-sign the host app:

```sh
codesign -f -s - \
  --entitlements /tmp/quicklookprotein-local-debug.entitlements \
  /Users/ytao/Applications/QuickLookProtein.app
```

Verify:

```sh
codesign --verify --deep --strict --verbose=4 /Users/ytao/Applications/QuickLookProtein.app

codesign -d --entitlements :- \
  /Users/ytao/Applications/QuickLookProtein.app/Contents/PlugIns/QuickLookProtein\ Extension.appex
```

Register and reset Quick Look:

```sh
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f /Users/ytao/Applications/QuickLookProtein.app

pluginkit -a /Users/ytao/Applications/QuickLookProtein.app
pluginkit -e use -i com.jethrohemmann.QuickLookProtein.QLExtension
qlmanage -r
qlmanage -r cache
```

Confirm the extension is active:

```sh
pluginkit -m -A -D -v -i com.jethrohemmann.QuickLookProtein.QLExtension
```

Test an SDF preview:

```sh
qlmanage -p /Users/ytao/research/QuickLookProtein/Xcode/QuickLookProtein/Assets/PQQ.sdf
```

## Proper Fix

For a reliable build that Finder will load consistently:

1. Install or configure a valid Apple Developer signing identity.
2. Configure the project's signing team in Xcode.
3. Build with the real entitlements enabled, including the App Group entitlement.
4. Copy the signed app to `/Applications` or `~/Applications`.
5. Launch the app once.
6. Reset Quick Look and confirm registration with `pluginkit`.

The proper build should preserve these entitlements:

```text
com.apple.security.app-sandbox
com.apple.security.application-groups
com.apple.security.files.user-selected.read-only
com.apple.security.network.client
```

## Useful Diagnostics

Inspect the extension Info.plist:

```sh
plutil -p /Users/ytao/Applications/QuickLookProtein.app/Contents/PlugIns/QuickLookProtein\ Extension.appex/Contents/Info.plist
```

Inspect registered LaunchServices entries:

```sh
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -dump | rg -i 'QuickLookProtein|jethrohemmann'
```

Check Gatekeeper policy:

```sh
spctl -a -vvv -t exec /Users/ytao/Applications/QuickLookProtein.app
```

Check Quick Look generator cache:

```sh
qlmanage -m plugins
```
