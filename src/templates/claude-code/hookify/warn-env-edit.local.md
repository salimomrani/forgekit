---
name: warn-env-edit
enabled: true
event: file
pattern: (^|/)\.env(\.|$)
action: warn
---

⚠️ **`.env` file detected**

You're about to modify an environment file. Do not commit secrets — use `.env.example` for reference values.
