#!/bin/bash

set -e

TEMP_DIR="./temp"
API_URL="https://api.github.com/repos/microsoft/ripgrep-prebuilt/releases/latest"

# Clean up previous files
rm -f "$TEMP_DIR/rg-windows.exe"
rm -f "$TEMP_DIR/rg-linux"
rm -f "$TEMP_DIR/ripgrep-windows.zip"
rm -f "$TEMP_DIR/ripgrep-linux.tar.gz"

# Create temp folder if it doesn't exist
mkdir -p "$TEMP_DIR"

echo "Fetching latest release info from GitHub..."
RELEASE_JSON=$(curl -s "$API_URL")

# Extract download URLs using jq
WINDOWS_URL=$(echo "$RELEASE_JSON" | jq -r '.assets[] | select(.name | test("-x86_64-pc-windows-msvc\\.zip$")) | .browser_download_url')
LINUX_URL=$(echo "$RELEASE_JSON" | jq -r '.assets[] | select(.name | test("-x86_64-unknown-linux-musl\\.tar\\.gz$")) | .browser_download_url')

if [ -z "$WINDOWS_URL" ]; then
    echo "Error: Could not find Windows download URL"
    exit 1
fi

if [ -z "$LINUX_URL" ]; then
    echo "Error: Could not find Linux download URL"
    exit 1
fi

echo "Found Windows URL: $WINDOWS_URL"
echo "Found Linux URL: $LINUX_URL"

echo ""
echo "Downloading Windows binary..."
curl -L -o "$TEMP_DIR/ripgrep-windows.zip" "$WINDOWS_URL"

echo ""
echo "Downloading Linux binary..."
curl -L -o "$TEMP_DIR/ripgrep-linux.tar.gz" "$LINUX_URL"

echo ""
echo "Extracting binaries..."
unzip -o "$TEMP_DIR/ripgrep-windows.zip" -d "$TEMP_DIR/"
mv "$TEMP_DIR/rg.exe" "$TEMP_DIR/rg-windows.exe"
tar -xzf "$TEMP_DIR/ripgrep-linux.tar.gz" -C "$TEMP_DIR/"
mv "$TEMP_DIR/rg" "$TEMP_DIR/rg-linux"

echo ""
echo "Done! Extracted binaries:"
ls -la "$TEMP_DIR/"
