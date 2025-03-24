#!/bin/bash

# Check if a directory argument is provided
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 directory"
  exit 1
fi

TARGET_DIR="$1"

# Validate that the provided argument is an existing directory
if [ ! -d "$TARGET_DIR" ]; then
  echo "Error: '$TARGET_DIR' is not a valid directory."
  exit 1
fi

OUTPUT_FILE="project.txt"
# Create or clear the output file
> "$OUTPUT_FILE"

# Find all files recursively in the directory and append their contents to project.txt
find "$TARGET_DIR" -type f | while read -r file; do
  echo "Appending contents of: $file"
  cat "$file" >> "$OUTPUT_FILE"
  # Optional: add a newline separator between files
  echo "" >> "$OUTPUT_FILE"
done

echo "All files have been concatenated into $OUTPUT_FILE."