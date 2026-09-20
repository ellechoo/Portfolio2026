#!/bin/bash
# Double-click this file to push your latest portfolio changes to GitHub.
# First time: right-click -> Open (macOS blocks unsigned scripts by default).
cd "$(dirname "$0")"
echo "Publishing Portfolio2026..."
git add -A
if git diff --cached --quiet; then
  echo "Nothing new to publish — everything is already up to date."
else
  git commit -m "Update portfolio"
  git push
  echo ""
  echo "Done. If you have GitHub Pages set up, the live site will update in a minute or two."
fi
echo ""
echo "Press any key to close this window..."
read -n 1 -s
