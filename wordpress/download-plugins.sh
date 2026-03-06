#!/bin/bash
set -e

PLUGINS_DIR="/var/www/html/wp-content/plugins"
echo "Downloading plugins to $PLUGINS_DIR..."

# Download Elementor
if [ ! -d "$PLUGINS_DIR/elementor" ]; then
    echo "Downloading Elementor..."
    curl -sL https://downloads.wordpress.org/plugin/elementor.latest.zip -o /tmp/elementor.zip
    unzip -o /tmp/elementor.zip -d $PLUGINS_DIR
    rm /tmp/elementor.zip
fi

# Download ElementorKit
if [ ! -d "$PLUGINS_DIR/elementskit-lite" ]; then
    echo "Downloading ElementorKit..."
    curl -sL https://downloads.wordpress.org/plugin/elementskit-lite.latest.zip -o /tmp/elementskit-lite.zip
    unzip -o /tmp/elementskit-lite.zip -d $PLUGINS_DIR
    rm /tmp/elementskit-lite.zip
fi

# Download Elementor Pro (if available)
if [ ! -d "$PLUGINS_DIR/elementskit" ]; then
    echo "Note: Elementor Pro (elementskit) not found in bundled plugins"
fi

echo "Plugin download complete."