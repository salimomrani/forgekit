---
name: block-dangerous-rm
enabled: true
event: bash
pattern: rm\s+(-rf|-fr)
action: block
---

⚠️ **Commande rm -rf détectée**

Cette commande peut supprimer des fichiers de façon irréversible. Vérifie bien le chemin avant de continuer.
