Publie une nouvelle version de ForgeKit via le pipeline GitHub Actions.

1. Regarde les commits depuis le dernier tag pour déterminer le type de bump :
   - `fix:` → patch
   - `feat:` → minor
   - breaking change → major
2. Calcule la prochaine version depuis le dernier tag git
3. Crée le tag et pousse :
   ```bash
   git tag vX.Y.Z && git push origin vX.Y.Z
   ```
4. Le pipeline fait tout le reste : lint → test → build → npm publish → GitHub Release

⚠️ Ne jamais utiliser `npm publish` directement. Ne jamais bumper manuellement package.json.
