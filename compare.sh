#!/bin/bash

create_symlinks() {
    local source_dir=$1
    local target_dir="/compare"
    local console_path="$source_dir/Console"

    if [ -d "$console_path" ]; then
        find "$console_path" \( -name "*.mp4" -o -name "*.mkv" -o -name "*.avi" -o -name "*.mov" -o -name "*.flv" -o -name "*.wmv" \) -type f -print0 | \
        while IFS= read -r -d '' video_path; do
            relative_path="${video_path#$console_path/}"
            relative_path="${relative_path/videos\//}"
            link_path="$target_dir/$relative_path"
            
            mkdir -p "$(dirname "$link_path")"
            ln -sf "$video_path" "$link_path"
        done
    else
        local last_folder_name=$(basename "$source_dir")
        find "$source_dir" \( -name "*.mp4" -o -name "*.mkv" -o -name "*.avi" -o -name "*.mov" -o -name "*.flv" -o -name "*.wmv" \) -type f -print0 | \
        while IFS= read -r -d '' file_path; do
            relative_path="${file_path#$source_dir/}"
            link_path="$target_dir/$last_folder_name/$relative_path"
            
            mkdir -p "$(dirname "$link_path")"
            ln -sf "$file_path" "$link_path"
        done
    fi
}

if [ $# -eq 0 ]; then
    echo "Usage: $0 <path1> [<path2> ...]"
    exit 1
fi

for path in "$@"; do
    create_symlinks "$(realpath "$path")"
done
