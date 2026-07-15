#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

INFO_PLIST="$ROOT_DIR/Xcode/QLExtension/Info.plist"
PREVIEW_SWIFT="$ROOT_DIR/Xcode/QLExtension/PreviewViewController.swift"
SETTINGS_SWIFT="$ROOT_DIR/Xcode/Shared/Settings.swift"
CONTENT_SWIFT="$ROOT_DIR/Xcode/QuickLookProtein/ContentView.swift"
PROJECT_FILE="$ROOT_DIR/Xcode/QuickLookProtein.xcodeproj/project.pbxproj"

if ! plutil -p "$INFO_PLIST" | grep -q "dyn.ah62d4rv4ge81g5pm"; then
  echo "Expected QLSupportedContentTypes to include the macOS dynamic UTI for .smi files"
  exit 1
fi

if ! plutil -p "$INFO_PLIST" | grep -q "com.jethrohemmann.smiles"; then
  echo "Expected Info.plist to declare a SMILES text document type"
  exit 1
fi

if ! grep -q 'fileExtension == "smi" || fileExtension == "smiles"' "$PREVIEW_SWIFT"; then
  echo "Expected PreviewViewController to route .smi/.smiles files to the SMILES viewer"
  exit 1
fi

if ! grep -q 'cdkDepictBaseURL' "$SETTINGS_SWIFT"; then
  echo "Expected SettingsStorage to persist a configurable CDK Depict base URL"
  exit 1
fi

if ! grep -q 'CDK Depict service URL' "$CONTENT_SWIFT"; then
  echo "Expected the settings UI to expose the CDK Depict service URL"
  exit 1
fi

if ! grep -q 'SMILES_viewer.html' "$PROJECT_FILE"; then
  echo "Expected SMILES_viewer.html to be registered in the Xcode project"
  exit 1
fi

echo "SMILES support source checks passed"
