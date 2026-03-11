---
name: block-force-push
enabled: true
event: bash
pattern: git\s+push\s+.*--force|git\s+push\s+.*-f\b
action: block
---

🚫 **git push --force bloqué**

Le force push est interdit sur ce projet. Utilise `--force-with-lease` si tu sais ce que tu fais, ou ouvre une PR à la place.
