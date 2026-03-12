#!/bin/bash
# Hook: PreToolUse (Bash) — ForgeKit project guards.
# Exit 2 = block | Exit 0 = allow

command -v jq >/dev/null 2>&1 || exit 0

COMMAND=$(jq -r '.tool_input.command // ""')

# Strip heredoc bodies so patterns don't match inside commit messages.
COMMAND_STRIPPED=$(echo "$COMMAND" | awk '
  /<</ {
    tmp = $0
    gsub(/^.*<<'"'"'?/, "", tmp)
    gsub(/[^A-Za-z_0-9].*$/, "", tmp)
    delim = tmp
    in_hd = 1; print; next
  }
  in_hd { if ($0 == delim) in_hd = 0; next }
  { print }
')
