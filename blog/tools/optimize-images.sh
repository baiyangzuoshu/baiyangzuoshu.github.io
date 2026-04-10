#!/bin/zsh
set -euo pipefail

ROOT_DIR="${1:-source}"
JPEG_QUALITY="${JPEG_QUALITY:-75}"
LARGE_JPEG_QUALITY="${LARGE_JPEG_QUALITY:-72}"
MAX_JPEG_EDGE="${MAX_JPEG_EDGE:-1800}"
PNG_QUALITY="${PNG_QUALITY:-65-80}"
GIF_FPS="${GIF_FPS:-8}"
GIF_MAX_WIDTH="${GIF_MAX_WIDTH:-560}"
GIF_MEDIUM_WIDTH="${GIF_MEDIUM_WIDTH:-480}"
WEBP_QUALITY="${WEBP_QUALITY:-80}"

count_jpg=0
count_png=0
count_gif=0
count_webp=0
saved_jpg=0
saved_png=0
saved_gif=0
saved_webp=0

optimize_jpg() {
  local file="$1"
  local old_size new_size width height max_dim quality tmp

  old_size=$(stat -f%z "$file")
  width=$(sips -g pixelWidth "$file" 2>/dev/null | awk '/pixelWidth/{print $2}')
  height=$(sips -g pixelHeight "$file" 2>/dev/null | awk '/pixelHeight/{print $2}')
  max_dim=$(( width > height ? width : height ))
  quality="$JPEG_QUALITY"

  if [ "$max_dim" -gt "$MAX_JPEG_EDGE" ] || [ "$old_size" -gt 800000 ]; then
    quality="$LARGE_JPEG_QUALITY"
  fi

  tmp=$(mktemp /tmp/optimize-jpg.XXXXXX.jpg)

  if [ "$max_dim" -gt "$MAX_JPEG_EDGE" ]; then
    sips -Z "$MAX_JPEG_EDGE" -s format jpeg -s formatOptions "$quality" "$file" --out "$tmp" >/dev/null
  else
    sips -s format jpeg -s formatOptions "$quality" "$file" --out "$tmp" >/dev/null
  fi

  new_size=$(stat -f%z "$tmp")

  if [ "$new_size" -lt "$old_size" ]; then
    mv "$tmp" "$file"
    count_jpg=$((count_jpg + 1))
    saved_jpg=$((saved_jpg + old_size - new_size))
    echo "jpg  $file  $old_size -> $new_size"
  else
    rm -f "$tmp"
  fi
}

optimize_png() {
  local file="$1"
  local old_size new_size tmp

  old_size=$(stat -f%z "$file")
  tmp=$(mktemp /tmp/optimize-png.XXXXXX.png)

  if pngquant --quality="$PNG_QUALITY" --speed 1 --output "$tmp" --force "$file" >/dev/null 2>&1; then
    new_size=$(stat -f%z "$tmp")
    if [ "$new_size" -lt "$old_size" ]; then
      mv "$tmp" "$file"
      count_png=$((count_png + 1))
      saved_png=$((saved_png + old_size - new_size))
      echo "png  $file  $old_size -> $new_size"
    else
      rm -f "$tmp"
    fi
  else
    rm -f "$tmp"
  fi
}

optimize_gif() {
  local file="$1"
  local old_size new_size width target_width tmp palette

  old_size=$(stat -f%z "$file")
  width=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$file" | tr -d '\r')
  target_width="$width"

  if [ "$width" -gt "$GIF_MAX_WIDTH" ]; then
    target_width="$GIF_MAX_WIDTH"
  elif [ "$width" -gt "$GIF_MEDIUM_WIDTH" ]; then
    target_width="$GIF_MEDIUM_WIDTH"
  fi

  tmp=$(mktemp /tmp/optimize-gif.XXXXXX.gif)
  palette=$(mktemp /tmp/optimize-gif-palette.XXXXXX.png)

  if ffmpeg -y -i "$file" -vf "fps=${GIF_FPS},scale=${target_width}:-1:flags=lanczos,palettegen=max_colors=96:reserve_transparent=on" "$palette" >/dev/null 2>&1 && \
     ffmpeg -y -i "$file" -i "$palette" -lavfi "fps=${GIF_FPS},scale=${target_width}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5" "$tmp" >/dev/null 2>&1; then
    new_size=$(stat -f%z "$tmp")
    if [ "$new_size" -lt "$old_size" ]; then
      mv "$tmp" "$file"
      count_gif=$((count_gif + 1))
      saved_gif=$((saved_gif + old_size - new_size))
      echo "gif  $file  $old_size -> $new_size"
    else
      rm -f "$tmp"
    fi
  else
    rm -f "$tmp"
  fi

  rm -f "$palette"
}

optimize_webp() {
  local file="$1"
  local old_size new_size tmp

  old_size=$(stat -f%z "$file")
  tmp=$(mktemp /tmp/optimize-webp.XXXXXX.webp)

  if cwebp -quiet -q "$WEBP_QUALITY" "$file" -o "$tmp"; then
    new_size=$(stat -f%z "$tmp")
    if [ "$new_size" -lt "$old_size" ]; then
      mv "$tmp" "$file"
      count_webp=$((count_webp + 1))
      saved_webp=$((saved_webp + old_size - new_size))
      echo "webp $file  $old_size -> $new_size"
    else
      rm -f "$tmp"
    fi
  else
    rm -f "$tmp"
  fi
}

while IFS= read -r -d '' file; do optimize_jpg "$file"; done < <(
  find "$ROOT_DIR" -type f \( -iname '*.jpg' -o -iname '*.jpeg' \) -print0
)

while IFS= read -r -d '' file; do optimize_png "$file"; done < <(
  find "$ROOT_DIR" -type f -iname '*.png' -print0
)

while IFS= read -r -d '' file; do optimize_gif "$file"; done < <(
  find "$ROOT_DIR" -type f -iname '*.gif' -print0
)

while IFS= read -r -d '' file; do optimize_webp "$file"; done < <(
  find "$ROOT_DIR" -type f -iname '*.webp' -print0
)

printf 'SUMMARY jpg:%d saved:%d png:%d saved:%d gif:%d saved:%d webp:%d saved:%d\n' \
  "$count_jpg" "$saved_jpg" "$count_png" "$saved_png" "$count_gif" "$saved_gif" "$count_webp" "$saved_webp"
