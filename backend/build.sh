#!/bin/bash

# Install Node dependencies
npm install

# Install yt-dlp via pip
pip install -U yt-dlp

# Find and save node path for yt-dlp
echo "NODE_PATH=$(which node)" >> /etc/environment
echo "Node found at: $(which node)"

# Download ffmpeg static binary
mkdir -p ./bin
curl -L https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz \
  -o ffmpeg.tar.xz
tar -xf ffmpeg.tar.xz
mv ffmpeg-master-latest-linux64-gpl/bin/ffmpeg ./bin/ffmpeg
mv ffmpeg-master-latest-linux64-gpl/bin/ffprobe ./bin/ffprobe
chmod +x ./bin/ffmpeg ./bin/ffprobe
rm -rf ffmpeg.tar.xz ffmpeg-master-latest-linux64-gpl

echo "✅ Build complete"