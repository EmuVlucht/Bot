#!/bin/bash

echo "=========================================="
echo "       Ciel Bot - WhatsApp Bot"
echo "=========================================="

cd "$(dirname "$0")"

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js tidak ditemukan!"
    echo "Install Node.js terlebih dahulu (v18+)"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "[ERROR] Node.js versi $NODE_VERSION terdeteksi"
    echo "Diperlukan Node.js v18 atau lebih tinggi"
    exit 1
fi

echo "[INFO] Node.js $(node -v) terdeteksi"

if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Gagal install dependencies"
        exit 1
    fi
fi

echo "[INFO] Generating Prisma client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "[ERROR] Gagal generate Prisma client"
    exit 1
fi

mkdir -p logs
mkdir -p ciel_session

echo "[INFO] Starting Ciel Bot..."
echo "=========================================="

if command -v pm2 &> /dev/null; then
    echo "[INFO] PM2 terdeteksi, menggunakan PM2..."
    pm2 start ecosystem.config.js
    pm2 logs ciel-bot
else
    echo "[INFO] Menjalankan dengan Node.js..."
    node src/index.js
fi
