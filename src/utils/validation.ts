export function validateProjectName(name: string): string | true {
  if (!name.trim()) return "Le nom du projet est requis";
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    return "Le nom doit commencer par une lettre et ne contenir que des lettres, chiffres, tirets et underscores";
  }
  if (name.length > 50) return "Le nom ne doit pas dépasser 50 caractères";
  return true;
}

export function validateGroupId(groupId: string): string | true {
  if (!groupId.trim()) return "Le Group ID est requis";
  if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/.test(groupId)) {
    return "Le Group ID doit être au format Java (ex: com.example)";
  }
  return true;
}
