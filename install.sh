#!/usr/bin/bash

echo "====================================="
echo "    Naze Bot Installation Script    "
echo "====================================="
echo ""

detect_platform() {
    if [ -n "$TERMUX_VERSION" ] || [[ "$PREFIX" == *"com.termux"* ]]; then
        echo "termux"
    elif [ -n "$CODESPACE_NAME" ] || [ -n "$CODESPACES" ]; then
        echo "codespace"
    elif [ -f /etc/debian_version ]; then
        echo "debian"
    elif [ -f /etc/alpine-release ]; then
        echo "alpine"
    else
        echo "unknown"
    fi
}

PLATFORM=$(detect_platform)
echo "[Platform] Detected: $PLATFORM"
echo ""

if [ "$PLATFORM" == "termux" ]; then
    echo "[Installing] Termux packages..."
    pkg update -y && pkg upgrade -y
    pkg install -y git nodejs ffmpeg imagemagick yarn libwebp
elif [ "$PLATFORM" == "debian" ] || [ "$PLATFORM" == "codespace" ]; then
    echo "[Installing] Debian/Ubuntu packages..."
    sudo apt-get update -y
    sudo apt-get install -y git nodejs npm ffmpeg imagemagick webp
elif [ "$PLATFORM" == "alpine" ]; then
    echo "[Installing] Alpine packages..."
    apk add --no-cache git nodejs npm ffmpeg imagemagick libwebp
else
    echo "[Warning] Unknown platform. Please install dependencies manually."
fi

echo ""
echo "[Installing] Node.js dependencies..."
npm install

echo ""
echo "[Prisma] Generating Prisma client..."
npx prisma generate

echo ""
echo "====================================="
echo "    Installation Complete!          "
echo "====================================="
echo ""
echo "Before starting the bot, please:"
echo "1. Copy .env.example to .env"
echo "2. Edit .env with your database URL and settings"
echo "3. Run: npx prisma db push"
echo "4. Run: npm start"
echo ""
