#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

INFO_PLIST="$ROOT_DIR/Xcode/QLExtension/Info.plist"
PREVIEW_SWIFT="$ROOT_DIR/Xcode/QLExtension/PreviewViewController.swift"
CONTENT_SWIFT="$ROOT_DIR/Xcode/QuickLookProtein/ContentView.swift"

if ! plutil -p "$INFO_PLIST" | grep -q "dyn.ah62d4rv4ge81u8p4"; then
  echo "Expected QLSupportedContentTypes to include the macOS dynamic UTI for .xyz files"
  exit 1
fi

if ! plutil -p "$INFO_PLIST" | grep -q "dyn.ah62d4rv4ge80455qgk"; then
  echo "Expected QLSupportedContentTypes to include the macOS dynamic UTI for .mol2 files"
  exit 1
fi

if ! grep -q 'fileExtension == "sdf" || fileExtension == "xyz" || fileExtension == "mol2"' "$PREVIEW_SWIFT"; then
  echo "Expected PreviewViewController to handle xyz and mol2 with the SDF small-molecule settings"
  exit 1
fi

if ! grep -q 'Orient SDF/XYZ/MOL2 to widest face' "$CONTENT_SWIFT"; then
  echo "Expected settings UI to describe the shared SDF/XYZ/MOL2 orientation option"
  exit 1
fi

echo "XYZ/MOL2 support source checks passed"
