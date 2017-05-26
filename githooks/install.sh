#!/bin/bash

# Allow running this from any directory
cd "$(dirname "$0")/.."

source_dir="githooks"
target_dir=".git/hooks"

for hook in applypatch-msg commit-msg post-update pre-applypatch pre-commit prepare-commit-msg pre-push pre-rebase pre-receive update; do
  if [[ -x "$source_dir/$hook" ]]; then
    echo "Installing $hook hook"
    ln -sf "../../$source_dir/$hook" "$target_dir/$hook"
  fi
done
