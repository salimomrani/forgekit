import Handlebars from "handlebars";
import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, "..", "templates");

Handlebars.registerHelper("lowerCase", (str: string) => str.toLowerCase());

export function renderTemplate(
  templatePath: string,
  data: Record<string, unknown>,
): string {
  const fullPath = path.join(TEMPLATES_DIR, templatePath);
  const source = fs.readFileSync(fullPath, "utf-8");
  const template = Handlebars.compile(source, { noEscape: true });
  return template(data);
}

export async function renderAndWrite(
  templatePath: string,
  outputPath: string,
  data: Record<string, unknown>,
  options?: { mode?: number },
): Promise<void> {
  const content = renderTemplate(templatePath, data);
  if (options?.mode) {
    await fs.writeFile(outputPath, content, { mode: options.mode });
  } else {
    await fs.writeFile(outputPath, content);
  }
}
