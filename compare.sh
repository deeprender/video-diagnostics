#!/bin/bash

create_symlinks() {
    local source_dir=$1
    local target_dir="/compare"

    find "$source_dir/Console" -type f -path "*/videos/*/*.mp4" | while read -r video_path; do
        relative_path="${video_path#$source_dir/Console/}"
        relative_path="${relative_path/videos\//}"  # Remove the 'videos/' part from the path
        link_path="$target_dir/$relative_path"
        
        mkdir -p "$(dirname "$link_path")"
        ln -sf "$video_path" "$link_path"
    done
}

if [ $# -eq 0 ]; then
    echo "Usage: $0 <path1> [<path2> ...]"
    exit 1
fi

for path in "$@"; do
    create_symlinks "$(realpath "$path")"
done

