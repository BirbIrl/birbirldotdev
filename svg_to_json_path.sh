#!/usr/bin/env bash

for file in ./assets/*.svg; do
    if [[ -f "$file" ]]; then
        base=$(basename "$file" .svg)
        out="src/assets/${base}.json"

        d_value=$(grep -oP 'd="\K[^"]+' "$file")
        [[ -z "$d_value" ]] && continue

        json=$(echo "$d_value" \
            | tr ' ' '\n' \
            | grep -E '^[0-9.+-]+,[0-9.+-]+$' \
            | sed -E 's/^([0-9.+-]+),([0-9.+-]+)$/{"x": \1, "y": \2},/' \
            | sed '$ s/,$//')

        echo "[${json}]" > "$out"
    fi
done
