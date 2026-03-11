---
name: warn-env-edit
enabled: true
event: file
pattern: \.env
action: warn
---

⚠️ **Fichier .env détecté**

Tu es sur le point de modifier un fichier d'environnement. Assure-toi de ne pas committer de secrets — utilise `.env.example` pour les valeurs de référence.
