#!/bin/bash
# Audio compression script — converts WAV/MP3 to OGG for smaller builds
# Requires: ffmpeg

set -e

SFX_IN="public/sfx"
SFX_OUT="public/sfx-compressed"
MUSIC_IN="public/music"
MUSIC_OUT="public/music-compressed"

if ! command -v ffmpeg &> /dev/null; then
    echo "ERROR: ffmpeg is required but not installed."
    echo "  macOS: brew install ffmpeg"
    echo "  Linux: sudo apt install ffmpeg"
    exit 1
fi

mkdir -p "$SFX_OUT" "$MUSIC_OUT"

echo "=== Compressing SFX (WAV → OGG @ 96kbps) ==="
sfx_before=0
sfx_after=0
for f in "$SFX_IN"/*.wav; do
    [ -f "$f" ] || continue
    name=$(basename "$f" .wav)
    ffmpeg -y -i "$f" -c:a libvorbis -b:a 96k "$SFX_OUT/${name}.ogg" -loglevel error
    before=$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f" 2>/dev/null)
    after=$(stat -f%z "$SFX_OUT/${name}.ogg" 2>/dev/null || stat -c%s "$SFX_OUT/${name}.ogg" 2>/dev/null)
    sfx_before=$((sfx_before + before))
    sfx_after=$((sfx_after + after))
    echo "  $name.wav → $name.ogg  ($(( before / 1024 ))KB → $(( after / 1024 ))KB)"
done

echo ""
echo "=== Compressing Music (MP3 → OGG @ 128kbps) ==="
music_before=0
music_after=0
for f in "$MUSIC_IN"/*.mp3; do
    [ -f "$f" ] || continue
    name=$(basename "$f" .mp3)
    ffmpeg -y -i "$f" -c:a libvorbis -b:a 128k "$MUSIC_OUT/${name}.ogg" -loglevel error
    before=$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f" 2>/dev/null)
    after=$(stat -f%z "$MUSIC_OUT/${name}.ogg" 2>/dev/null || stat -c%s "$MUSIC_OUT/${name}.ogg" 2>/dev/null)
    music_before=$((music_before + before))
    music_after=$((music_after + after))
    echo "  $name.mp3 → $name.ogg  ($(( before / 1024 ))KB → $(( after / 1024 ))KB)"
done

echo ""
echo "=== Summary ==="
total_before=$(( sfx_before + music_before ))
total_after=$(( sfx_after + music_after ))
saved=$(( total_before - total_after ))
echo "SFX:   $(( sfx_before / 1024 ))KB → $(( sfx_after / 1024 ))KB"
echo "Music: $(( music_before / 1024 ))KB → $(( music_after / 1024 ))KB"
echo "Total: $(( total_before / 1024 ))KB → $(( total_after / 1024 ))KB (saved $(( saved / 1024 ))KB)"
echo ""
echo "Compressed files are in $SFX_OUT/ and $MUSIC_OUT/"
echo "To use them, update SoundManager.js and MusicManager.js paths."
