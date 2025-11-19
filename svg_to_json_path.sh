#!/usr/bin/env bash


out="./assets/jsonified.txt"
rm $out
touch $out
echo "(\`[" >> "$out"
for file in ./assets/*.svg; do
    if [[ -f "$file" ]]; then
        base=$(basename "$file" .svg)

        d_value=$(grep -oP 'd="\K[^"]+' "$file")
        [[ -z "$d_value" ]] && continue

        # Process coordinates without splitting into newlines
        json=$(echo "$d_value" \
            | grep -oE '[0-9.+-]+,[0-9.+-]+' \
            | sed -E 's/^([0-9.+-]+),([0-9.+-]+)$/{"x": \1, "y": \2}/' \
            | paste -sd "," -)

        echo "[${json}]," >> "$out"
    fi
done
sed -i '$ s/.$//' "$out"
echo "]\`)" >> "$out"
