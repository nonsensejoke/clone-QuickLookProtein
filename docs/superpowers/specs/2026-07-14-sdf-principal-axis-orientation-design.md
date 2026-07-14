# SDF Principal-Axis Orientation Design

## Goal

Add an SDF-only display option that automatically chooses a more chemically useful initial orientation for small molecules. When enabled, the SDF preview should show the molecule's widest face toward the user and place the molecule's longest axis horizontally. For planar fused-ring molecules such as purine, the ring plane should face the user and the fused-ring system should run left to right.

## Scope

This feature applies only to SDF files.

The setting is exposed in the main app as a checkbox near the SDF atom-style setting. The checkbox defaults to enabled. PDB and CIF rendering behavior remains unchanged.

## User Experience

The settings panel gets a new SDF-specific checkbox:

`Orient SDF to widest face`

When checked, SDF previews use the automatic initial orientation. When unchecked, SDF previews keep the current 3Dmol default orientation after `zoomTo()`.

The option affects both the main app's bundled SDF preview and Quick Look previews of external SDF files. Existing atom style, background color, and rotation speed settings continue to work.

## Architecture

Swift remains responsible for storing settings and preparing the HTML template.

JavaScript in `3Dmol_viewer.html` handles the orientation because it already has direct access to the parsed 3Dmol atom coordinates and viewer camera state. This avoids adding a separate SDF parser in Swift and keeps the coordinate transformation close to the renderer.

Changes are expected in:

- `Xcode/Shared/Settings.swift`: add persisted SDF orientation setting.
- `Xcode/QuickLookProtein/ContentView.swift`: add the checkbox and pass the setting to preview HTML.
- `Xcode/QLExtension/PreviewViewController.swift`: pass the setting for SDF previews only.
- `Xcode/Shared/SharedFunctions.swift`: add an orientation parameter and substitute it into the HTML template.
- `Xcode/Shared/Assets/3Dmol_viewer.html`: compute and apply the SDF orientation when requested.

## Data Flow

1. The user toggles the SDF orientation checkbox in the main app.
2. Swift persists the value through `@AppStorage` in the existing app-group-backed settings storage.
3. The main app and Quick Look extension call `prepare3DmolHTML`.
4. `prepare3DmolHTML` injects a boolean orientation flag into the HTML.
5. The HTML adds the model through 3Dmol, applies styles, calls `zoomTo()`, optionally applies the PCA-based orientation, renders, then starts the existing spin behavior.

Quick Look passes `true` for the flag only when the file extension is `sdf` and the stored checkbox is enabled.

## Orientation Algorithm

The HTML/JavaScript code will:

1. Read all atoms from `viewer.selectedAtoms({})`.
2. Ignore atoms without finite `x`, `y`, and `z` coordinates.
3. Center coordinates by subtracting their centroid.
4. Compute the 3x3 covariance matrix.
5. Compute orthonormal principal axes:
   - The largest-variance axis becomes the screen horizontal axis.
   - The smallest-variance axis becomes the view direction, so the widest face is shown.
   - The remaining axis is derived by cross product to keep a right-handed basis.
6. Convert that basis to the viewer rotation expected by 3Dmol and apply it through `viewer.setView(...)`.
7. Render and continue existing rotation-speed behavior.

For a planar molecule, the smallest-variance axis corresponds to the molecular plane normal, so the molecule is viewed face-on. For a non-planar molecule, this still maximizes the visible projection according to the principal axes.

## Fallback Behavior

The feature keeps the current 3Dmol view when:

- The file is not SDF.
- The setting is disabled.
- Fewer than three valid atoms are available.
- The covariance matrix is degenerate enough that stable principal axes cannot be computed.
- Any numeric calculation produces non-finite values.

Fallbacks should fail quietly and leave the molecule visible.

## Error Handling

Orientation is a best-effort visual enhancement. It should not block rendering. If calculation fails, the viewer should still display the molecule with the current default `zoomTo()` behavior.

## Testing And Verification

Verification should include:

- Building the macOS app with the existing local ad-hoc signing command.
- Confirming the setting appears in the main app and defaults to enabled.
- Confirming SDF previews pass the orientation flag while PDB and CIF do not.
- Confirming the bundled SDF preview still renders.
- Confirming disabling the checkbox preserves the previous SDF orientation behavior.
- Manually checking a planar SDF such as purine-like fused rings or the bundled PQQ sample for a face-on, horizontal longest-axis initial pose.

No JavaScript test harness exists in this project today, so this feature does not require adding new automated JavaScript tests. Keep the PCA and orientation math in small helper functions so the implementation can be inspected directly, and rely on build verification plus manual visual checks for this feature.

## Non-Goals

- Do not change PDB or CIF behavior.
- Do not modify `3Dmol.js`.
- Do not rotate or rewrite the source SDF file data.
- Do not add export or save behavior.
- Do not change rotation-speed semantics.
