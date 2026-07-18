#!/usr/bin/env bash
# Data downloaden van live Render server naar lokale public/data/
# Gebruik: ./scripts/pull-data.sh <base-url>
# Voorbeeld: ./scripts/pull-data.sh https://kvvi.onrender.com
set -euo pipefail

BASE="${1:-https://kvvi.onrender.com}"
echo "📥 Data ophalen van $BASE/api/data-export ..."

DATA=$(curl -s "$BASE/api/data-export")

if echo "$DATA" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
  echo "$DATA" | python3 -c "
import sys, json, os

data = json.load(sys.stdin)
base = 'public/data'

for path, content in data.items():
    full = os.path.join(base, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'  ✅ {path} ({len(content)} bytes)')
"
  echo ""
  echo "✅ Data opgeslagen in public/data/"
  echo ""
  echo "Controleer wijzigingen met: git diff public/data/"
  echo "Commit met: git add public/data/ && git commit -m \"Sync data from live\" && git push"
else
  echo "❌ Fout: kon data niet ophalen van $BASE"
  echo "Controleer of de server draait en /api/data-export bereikbaar is."
  exit 1
fi
