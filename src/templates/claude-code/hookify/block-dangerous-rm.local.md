---
name: block-dangerous-rm
enabled: true
event: bash
pattern: rm\s+(-rf|-fr)
action: block
---

⚠️ **`rm -rf` detected**

This command can irreversibly delete files. Double-check the path before proceeding.
