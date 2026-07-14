# SDF Principal-Axis Orientation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a default-enabled SDF-only setting that orients small molecules with their widest face toward the viewer and their longest axis horizontally.

**Architecture:** Swift stores and passes a boolean setting into the existing HTML template. JavaScript in `3Dmol_viewer.html` reads 3Dmol atom coordinates after model parsing, computes principal axes with small pure helpers, and applies the orientation through `viewer.setView(...)` after `zoomTo()`. PDB and CIF paths pass `false` and keep current behavior.

**Tech Stack:** Swift 5, SwiftUI `@AppStorage`, Quick Look extension, WebKit, embedded 3Dmol.js, plain JavaScript.

---

## File Structure

- Modify `Xcode/Shared/Settings.swift`: add one persisted boolean setting, defaulting to `true`.
- Modify `Xcode/Shared/SharedFunctions.swift`: extend `prepare3DmolHTML` with an orientation flag and inject it into HTML.
- Modify `Xcode/QuickLookProtein/ContentView.swift`: add the checkbox and pass the setting only to the SDF bundled preview.
- Modify `Xcode/QLExtension/PreviewViewController.swift`: pass the setting only when previewing an external SDF file.
- Modify `Xcode/Shared/Assets/3Dmol_viewer.html`: add pure JavaScript math helpers and apply orientation only when the injected flag is `true`.
- Do not modify `Xcode/Shared/Assets/3Dmol.js`.

## Task 1: Add Swift Setting And HTML Flag Plumbing

**Files:**
- Modify: `Xcode/Shared/Settings.swift`
- Modify: `Xcode/Shared/SharedFunctions.swift`

- [ ] **Step 1: Confirm baseline build still succeeds**

Run:

```bash
xcodebuild -project Xcode/QuickLookProtein.xcodeproj \
  -scheme QuickLookProtein \
  -configuration Debug \
  -derivedDataPath build/DerivedDataLocalRun \
  -destination 'platform=macOS' \
  CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= CODE_SIGN_IDENTITY=- \
  CODE_SIGN_ENTITLEMENTS= PROVISIONING_PROFILE_SPECIFIER= \
  build
```

Expected: exit code `0` and `** BUILD SUCCEEDED **`.

- [ ] **Step 2: Add persisted default-enabled SDF orientation setting**

In `Xcode/Shared/Settings.swift`, add this after `atomStyleSDF`:

```swift
    @AppStorage("orientSDFToWidestFace", store: UserDefaults(suiteName: "W3SKSV7VPT.group.com.jethrohemmann.QuickLookProtein"))
    var orientSDFToWidestFace: Bool = true
```

- [ ] **Step 3: Extend `prepare3DmolHTML` signature**

In `Xcode/Shared/SharedFunctions.swift`, change the function declaration from:

```swift
func prepare3DmolHTML(htmlPath: String, pdbPath: String, dataFormat: String, atomStyle: Settings.AtomStyle, rotationSpeed: Settings.RotationSpeed, bgColor: Color) -> String {
```

to:

```swift
func prepare3DmolHTML(htmlPath: String, pdbPath: String, dataFormat: String, atomStyle: Settings.AtomStyle, rotationSpeed: Settings.RotationSpeed, bgColor: Color, orientToWidestFace: Bool = false) -> String {
```

The default value keeps existing call sites compiling until later tasks wire in explicit values.

- [ ] **Step 4: Inject the boolean into the HTML template**

In `Xcode/Shared/SharedFunctions.swift`, after the `{DATA_FORMAT}` replacement, add:

```swift
    html = html.replacingOccurrences(of: "{ORIENT_TO_WIDEST_FACE}", with: orientToWidestFace ? "true" : "false")
```

The final replacement block should be:

```swift
    html = html.replacingOccurrences(of: "{ATOM_STYLE}", with: String(describing: atomStyle))
    html = html.replacingOccurrences(of: "{BG_COLOR}", with: convertColorToRGB(color: bgColor).rgbHex)
    html = html.replacingOccurrences(of: "{BG_ALPHA}", with: convertColorToRGB(color: bgColor).alpha)
    html = html.replacingOccurrences(of: "{ROTATION_SPEED}", with: String(rotationSpeed.rotationSpeedNumber()))
    html = html.replacingOccurrences(of: "{DATA_FORMAT}", with: dataFormat)
    html = html.replacingOccurrences(of: "{ORIENT_TO_WIDEST_FACE}", with: orientToWidestFace ? "true" : "false")
```

- [ ] **Step 5: Build to verify Swift plumbing compiles**

Run the same `xcodebuild` command from Step 1.

Expected: exit code `0` and `** BUILD SUCCEEDED **`.

- [ ] **Step 6: Commit Swift setting plumbing**

Run:

```bash
git add Xcode/Shared/Settings.swift Xcode/Shared/SharedFunctions.swift
git commit -m "Add SDF orientation setting plumbing"
```

## Task 2: Wire Main App UI And Bundled Preview

**Files:**
- Modify: `Xcode/QuickLookProtein/ContentView.swift`

- [ ] **Step 1: Pass explicit orientation flags for bundled previews**

Replace the three `prepare3DmolHTML` calls near the top of `body` with:

```swift
        let htmlPDB = prepare3DmolHTML(htmlPath: htmlPath!, pdbPath: pdbPath!, dataFormat: "pdb", atomStyle: userSettings.atomStylePDB, rotationSpeed: userSettings.rotationSpeed, bgColor: userSettings.bgColor, orientToWidestFace: false)
        let htmlCIF = prepare3DmolHTML(htmlPath: htmlPath!, pdbPath: cifPath!, dataFormat: "cif", atomStyle: userSettings.atomStyleCIF, rotationSpeed: userSettings.rotationSpeed, bgColor: userSettings.bgColor, orientToWidestFace: false)
        let htmlSDF = prepare3DmolHTML(htmlPath: htmlPath!, pdbPath: sdfPath!, dataFormat: "sdf", atomStyle: userSettings.atomStyleSDF, rotationSpeed: userSettings.rotationSpeed, bgColor: userSettings.bgColor, orientToWidestFace: userSettings.orientSDFToWidestFace)
```

- [ ] **Step 2: Add the SDF checkbox in the atom display settings form**

In the first `Form`, immediately after the SDF `Picker`, add:

```swift
                            Toggle("Orient SDF to widest face", isOn: $userSettings.orientSDFToWidestFace)
                                .help("Show SDF molecules face-on with their longest axis horizontal.")
```

The resulting SDF section should be:

```swift
                            Picker("SDF:", selection: $userSettings.atomStyleSDF) {
                                ForEach(Settings.AtomStyle.allCases) { style in
                                    Text(style.rawValue)
                                }
                            }
                            Toggle("Orient SDF to widest face", isOn: $userSettings.orientSDFToWidestFace)
                                .help("Show SDF molecules face-on with their longest axis horizontal.")
```

- [ ] **Step 3: Build to verify SwiftUI compiles**

Run:

```bash
xcodebuild -project Xcode/QuickLookProtein.xcodeproj \
  -scheme QuickLookProtein \
  -configuration Debug \
  -derivedDataPath build/DerivedDataLocalRun \
  -destination 'platform=macOS' \
  CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= CODE_SIGN_IDENTITY=- \
  CODE_SIGN_ENTITLEMENTS= PROVISIONING_PROFILE_SPECIFIER= \
  build
```

Expected: exit code `0` and `** BUILD SUCCEEDED **`.

- [ ] **Step 4: Commit main app UI wiring**

Run:

```bash
git add Xcode/QuickLookProtein/ContentView.swift
git commit -m "Add SDF orientation checkbox"
```

## Task 3: Wire Quick Look Extension

**Files:**
- Modify: `Xcode/QLExtension/PreviewViewController.swift`

- [ ] **Step 1: Compute an SDF-only orientation flag**

In `preparePreviewOfFile`, after the `atomStyle` selection block and before creating `html`, add:

```swift
        let orientToWidestFace = fileExtension == "sdf" && userSettings.orientSDFToWidestFace
```

- [ ] **Step 2: Pass the flag into `prepare3DmolHTML`**

Replace the existing `let html = ...` line with:

```swift
        let html = prepare3DmolHTML(htmlPath: htmlPath!, pdbPath: url.path, dataFormat: fileExtension, atomStyle: atomStyle, rotationSpeed: userSettings.rotationSpeed, bgColor: userSettings.bgColor, orientToWidestFace: orientToWidestFace)
```

- [ ] **Step 3: Build to verify extension compiles**

Run:

```bash
xcodebuild -project Xcode/QuickLookProtein.xcodeproj \
  -scheme QuickLookProtein \
  -configuration Debug \
  -derivedDataPath build/DerivedDataLocalRun \
  -destination 'platform=macOS' \
  CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= CODE_SIGN_IDENTITY=- \
  CODE_SIGN_ENTITLEMENTS= PROVISIONING_PROFILE_SPECIFIER= \
  build
```

Expected: exit code `0` and `** BUILD SUCCEEDED **`.

- [ ] **Step 4: Commit Quick Look wiring**

Run:

```bash
git add Xcode/QLExtension/PreviewViewController.swift
git commit -m "Apply SDF orientation setting in Quick Look"
```

## Task 4: Implement Principal-Axis Orientation In HTML

**Files:**
- Modify: `Xcode/Shared/Assets/3Dmol_viewer.html`

- [ ] **Step 1: Add JavaScript helper functions above `$(function() { ... })`**

In `Xcode/Shared/Assets/3Dmol_viewer.html`, inside `<script>` and before `$(function() {`, add:

```javascript
            function isFinitePoint(atom) {
                return Number.isFinite(atom.x) && Number.isFinite(atom.y) && Number.isFinite(atom.z);
            }

            function normalizeVector(vector) {
                let length = Math.hypot(vector.x, vector.y, vector.z);
                if (!Number.isFinite(length) || length < 1e-8) {
                    return null;
                }
                return {x: vector.x / length, y: vector.y / length, z: vector.z / length};
            }

            function crossProduct(a, b) {
                return {
                    x: a.y * b.z - a.z * b.y,
                    y: a.z * b.x - a.x * b.z,
                    z: a.x * b.y - a.y * b.x
                };
            }

            function covarianceMatrix(points) {
                let center = points.reduce((sum, point) => ({
                    x: sum.x + point.x,
                    y: sum.y + point.y,
                    z: sum.z + point.z
                }), {x: 0, y: 0, z: 0});

                center.x /= points.length;
                center.y /= points.length;
                center.z /= points.length;

                let matrix = [
                    [0, 0, 0],
                    [0, 0, 0],
                    [0, 0, 0]
                ];

                for (let point of points) {
                    let x = point.x - center.x;
                    let y = point.y - center.y;
                    let z = point.z - center.z;

                    matrix[0][0] += x * x;
                    matrix[0][1] += x * y;
                    matrix[0][2] += x * z;
                    matrix[1][1] += y * y;
                    matrix[1][2] += y * z;
                    matrix[2][2] += z * z;
                }

                matrix[0][0] /= points.length;
                matrix[0][1] /= points.length;
                matrix[0][2] /= points.length;
                matrix[1][1] /= points.length;
                matrix[1][2] /= points.length;
                matrix[2][2] /= points.length;

                matrix[1][0] = matrix[0][1];
                matrix[2][0] = matrix[0][2];
                matrix[2][1] = matrix[1][2];

                return matrix;
            }

            function jacobiEigenDecomposition(matrix) {
                let a = matrix.map(row => row.slice());
                let vectors = [
                    [1, 0, 0],
                    [0, 1, 0],
                    [0, 0, 1]
                ];

                for (let iteration = 0; iteration < 32; iteration++) {
                    let p = 0;
                    let q = 1;
                    if (Math.abs(a[0][2]) > Math.abs(a[p][q])) {
                        p = 0;
                        q = 2;
                    }
                    if (Math.abs(a[1][2]) > Math.abs(a[p][q])) {
                        p = 1;
                        q = 2;
                    }

                    if (Math.abs(a[p][q]) < 1e-10) {
                        break;
                    }

                    let app = a[p][p];
                    let aqq = a[q][q];
                    let apq = a[p][q];
                    let theta = (aqq - app) / (2 * apq);
                    let thetaSign = theta < 0 ? -1 : 1;
                    let t = theta === 0 ? 1 : thetaSign / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
                    let c = 1 / Math.sqrt(t * t + 1);
                    let s = t * c;

                    for (let i = 0; i < 3; i++) {
                        if (i !== p && i !== q) {
                            let aip = a[i][p];
                            let aiq = a[i][q];
                            a[i][p] = c * aip - s * aiq;
                            a[p][i] = a[i][p];
                            a[i][q] = s * aip + c * aiq;
                            a[q][i] = a[i][q];
                        }
                    }

                    a[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
                    a[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
                    a[p][q] = 0;
                    a[q][p] = 0;

                    for (let i = 0; i < 3; i++) {
                        let vip = vectors[i][p];
                        let viq = vectors[i][q];
                        vectors[i][p] = c * vip - s * viq;
                        vectors[i][q] = s * vip + c * viq;
                    }
                }

                return [0, 1, 2].map(index => ({
                    value: a[index][index],
                    vector: normalizeVector({
                        x: vectors[0][index],
                        y: vectors[1][index],
                        z: vectors[2][index]
                    })
                }));
            }

            function quaternionFromRotationMatrix(matrix) {
                let trace = matrix[0][0] + matrix[1][1] + matrix[2][2];
                let x;
                let y;
                let z;
                let w;

                if (trace > 0) {
                    let s = Math.sqrt(trace + 1) * 2;
                    w = 0.25 * s;
                    x = (matrix[2][1] - matrix[1][2]) / s;
                    y = (matrix[0][2] - matrix[2][0]) / s;
                    z = (matrix[1][0] - matrix[0][1]) / s;
                }
                else if (matrix[0][0] > matrix[1][1] && matrix[0][0] > matrix[2][2]) {
                    let s = Math.sqrt(1 + matrix[0][0] - matrix[1][1] - matrix[2][2]) * 2;
                    w = (matrix[2][1] - matrix[1][2]) / s;
                    x = 0.25 * s;
                    y = (matrix[0][1] + matrix[1][0]) / s;
                    z = (matrix[0][2] + matrix[2][0]) / s;
                }
                else if (matrix[1][1] > matrix[2][2]) {
                    let s = Math.sqrt(1 + matrix[1][1] - matrix[0][0] - matrix[2][2]) * 2;
                    w = (matrix[0][2] - matrix[2][0]) / s;
                    x = (matrix[0][1] + matrix[1][0]) / s;
                    y = 0.25 * s;
                    z = (matrix[1][2] + matrix[2][1]) / s;
                }
                else {
                    let s = Math.sqrt(1 + matrix[2][2] - matrix[0][0] - matrix[1][1]) * 2;
                    w = (matrix[1][0] - matrix[0][1]) / s;
                    x = (matrix[0][2] + matrix[2][0]) / s;
                    y = (matrix[1][2] + matrix[2][1]) / s;
                    z = 0.25 * s;
                }

                let length = Math.hypot(x, y, z, w);
                if (!Number.isFinite(length) || length < 1e-8) {
                    return null;
                }
                return {x: x / length, y: y / length, z: z / length, w: w / length};
            }

            function applyWidestFaceOrientation(viewer) {
                let points = viewer.selectedAtoms({}).filter(isFinitePoint);
                if (points.length < 3) {
                    return false;
                }

                let eigen = jacobiEigenDecomposition(covarianceMatrix(points));
                if (eigen.some(entry => entry.vector === null || !Number.isFinite(entry.value))) {
                    return false;
                }

                eigen.sort((a, b) => b.value - a.value);

                let horizontalAxis = eigen[0].vector;
                var viewAxis = eigen[2].vector;
                if (eigen[0].value - eigen[2].value < 1e-10) {
                    return false;
                }

                let verticalAxis = normalizeVector(crossProduct(viewAxis, horizontalAxis));
                if (verticalAxis === null) {
                    return false;
                }

                viewAxis = normalizeVector(crossProduct(horizontalAxis, verticalAxis));
                if (viewAxis === null) {
                    return false;
                }

                let rotationMatrix = [
                    [horizontalAxis.x, horizontalAxis.y, horizontalAxis.z],
                    [verticalAxis.x, verticalAxis.y, verticalAxis.z],
                    [viewAxis.x, viewAxis.y, viewAxis.z]
                ];

                let quaternion = quaternionFromRotationMatrix(rotationMatrix);
                if (quaternion === null) {
                    return false;
                }

                let view = viewer.getView();
                view[4] = quaternion.x;
                view[5] = quaternion.y;
                view[6] = quaternion.z;
                view[7] = quaternion.w;
                viewer.setView(view);
                return true;
            }
```

- [ ] **Step 2: Apply the injected flag in the viewer setup**

Replace the existing setup block:

```javascript
                viewer.setBackgroundColor(0x{BG_COLOR}, {BG_ALPHA});
                viewer.addModel(data, "{DATA_FORMAT}");
                viewer.setStyle({{ATOM_STYLE}: {color: 'spectrum'}});
                viewer.zoomTo();
                viewer.render();
                viewer.spin("y", {ROTATION_SPEED})
```

with:

```javascript
                let orientToWidestFace = {ORIENT_TO_WIDEST_FACE};

                viewer.setBackgroundColor(0x{BG_COLOR}, {BG_ALPHA});
                viewer.addModel(data, "{DATA_FORMAT}");
                viewer.setStyle({{ATOM_STYLE}: {color: 'spectrum'}});
                viewer.zoomTo();
                if (orientToWidestFace) {
                    applyWidestFaceOrientation(viewer);
                }
                viewer.render();
                viewer.spin("y", {ROTATION_SPEED})
```

- [ ] **Step 3: Build to verify bundled HTML resource is valid enough for Xcode packaging**

Run:

```bash
xcodebuild -project Xcode/QuickLookProtein.xcodeproj \
  -scheme QuickLookProtein \
  -configuration Debug \
  -derivedDataPath build/DerivedDataLocalRun \
  -destination 'platform=macOS' \
  CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= CODE_SIGN_IDENTITY=- \
  CODE_SIGN_ENTITLEMENTS= PROVISIONING_PROFILE_SPECIFIER= \
  build
```

Expected: exit code `0` and `** BUILD SUCCEEDED **`.

- [ ] **Step 4: Commit HTML orientation implementation**

Run:

```bash
git add Xcode/Shared/Assets/3Dmol_viewer.html
git commit -m "Orient SDF previews by principal axes"
```

## Task 5: Verify End-To-End Behavior

**Files:**
- No source changes expected unless verification reveals a bug.

- [ ] **Step 1: Verify source contains no unresolved template token**

Run:

```bash
rg -n "\{ORIENT_TO_WIDEST_FACE\}" Xcode
```

Expected: one match in `Xcode/Shared/Assets/3Dmol_viewer.html` only.

- [ ] **Step 2: Verify Swift call sites pass explicit values where behavior differs by file type**

Run:

```bash
rg -n "orientToWidestFace" Xcode/Shared Xcode/QuickLookProtein Xcode/QLExtension
```

Expected: matches in `SharedFunctions.swift`, `ContentView.swift`, and `PreviewViewController.swift`. `ContentView.swift` should pass `false` for PDB/CIF and `userSettings.orientSDFToWidestFace` for SDF. `PreviewViewController.swift` should use `fileExtension == "sdf" && userSettings.orientSDFToWidestFace`.

- [ ] **Step 3: Run the final build**

Run:

```bash
xcodebuild -project Xcode/QuickLookProtein.xcodeproj \
  -scheme QuickLookProtein \
  -configuration Debug \
  -derivedDataPath build/DerivedDataLocalRun \
  -destination 'platform=macOS' \
  CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= CODE_SIGN_IDENTITY=- \
  CODE_SIGN_ENTITLEMENTS= PROVISIONING_PROFILE_SPECIFIER= \
  build
```

Expected: exit code `0` and `** BUILD SUCCEEDED **`.

- [ ] **Step 4: Verify app bundle signature**

Run:

```bash
codesign --verify --deep --strict --verbose=2 build/DerivedDataLocalRun/Build/Products/Debug/QuickLookProtein.app
```

Expected: exit code `0`, `valid on disk`, and `satisfies its Designated Requirement`.

- [ ] **Step 5: Launch the app for manual visual verification**

Run:

```bash
open -n build/DerivedDataLocalRun/Build/Products/Debug/QuickLookProtein.app
```

Expected: the app opens. In the settings panel, the `Orient SDF to widest face` checkbox is visible and checked by default.

- [ ] **Step 6: Manually verify SDF behavior**

In the opened app:

1. Confirm the bundled SDF preview renders.
2. With `Orient SDF to widest face` checked, confirm the SDF molecule appears face-on with its longest visible axis horizontal.
3. Uncheck the checkbox and confirm the SDF preview updates to the previous 3Dmol default orientation.
4. Confirm PDB and CIF previews still render and do not visibly change because of the checkbox.

- [ ] **Step 7: Review final diff**

Run:

```bash
git diff --stat
git diff -- Xcode/Shared/Settings.swift Xcode/Shared/SharedFunctions.swift Xcode/QuickLookProtein/ContentView.swift Xcode/QLExtension/PreviewViewController.swift Xcode/Shared/Assets/3Dmol_viewer.html
```

Expected: changes are limited to the five planned source files.

- [ ] **Step 8: Commit final verification fixes if needed**

If Task 5 revealed any fixes, stage only those source files and commit:

```bash
git add Xcode/Shared/Settings.swift Xcode/Shared/SharedFunctions.swift Xcode/QuickLookProtein/ContentView.swift Xcode/QLExtension/PreviewViewController.swift Xcode/Shared/Assets/3Dmol_viewer.html
git commit -m "Verify SDF orientation behavior"
```

If there were no fixes after Task 4, skip this commit.
