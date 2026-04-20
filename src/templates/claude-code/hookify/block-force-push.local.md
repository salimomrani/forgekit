---
name: block-force-push
enabled: true
event: bash
pattern: git\s+push\s+.*--force(?!-with-lease)|git\s+push\s+.*\s-f\b
action: block
---

🚫 **`git push --force` blocked**

Force push is not allowed on this project. Use `--force-with-lease` if you know what you're doing, or open a PR instead.
