#!/usr/bin/env bash
# Save the image currently on the macOS clipboard into public/photos/.
#
#   Copy an image, then:  ./scripts/save-photo.sh hospital-glass-facade.jpg
#
# The seed data expects these five names — see public/photos/README.md:
#   hospital-glass-facade.jpg  hospital-childrens.jpg  hospital-street.jpg
#   hospital-logo.png          clinic-interior.jpg
set -euo pipefail

name="${1:-}"
if [ -z "$name" ]; then
  echo "usage: $0 <filename>   (e.g. hospital-glass-facade.jpg)" >&2
  exit 2
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
dest="$root/public/photos/$name"
tmp="$(mktemp -t vvphoto).png"

# The clipboard is always read as PNG; sips converts to JPEG when the target
# name asks for one, so the extensions in the seed data stay honest.
osascript -e "set f to open for access POSIX file \"$tmp\" with write permission" \
          -e "write (the clipboard as «class PNGf») to f" \
          -e "close access f" >/dev/null 2>&1 || {
  echo "No image on the clipboard. Copy one (⌘C on the image) and rerun." >&2
  rm -f "$tmp"
  exit 1
}

case "$name" in
  *.jpg|*.jpeg) sips -s format jpeg "$tmp" --out "$dest" >/dev/null ;;
  *)            mv "$tmp" "$dest" ;;
esac
rm -f "$tmp"

echo "saved $dest"
