---
name: block-npm-publish
enabled: true
event: bash
pattern: npm\s+publish
action: block
---

🚫 **npm publish bloqué**

Ne publie jamais manuellement. Utilise le pipeline :

```bash
git tag vX.Y.Z && git push origin vX.Y.Z
```

GitHub Actions fait : lint → test → build → publish npm → GitHub Release.
