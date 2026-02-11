import path from "node:path";
import fs from "fs-extra";
import type { ProjectConfig } from "../../types.js";
import type { ResolvedVersions } from "../../versions.js";

export async function generateClaudeCode(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
): Promise<void> {
  await Promise.all([
    generateClaudeMd(projectDir, config, versions),
    generateClaudeSettings(projectDir, config),
  ]);
}

async function generateClaudeMd(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
): Promise<void> {
  const sections: string[] = [];

  sections.push(`# ${config.name}\n`);
  sections.push(`${config.description}\n`);

  sections.push("## Project Structure\n");
  sections.push("```");
  sections.push(`${config.name}/`);
  if (config.backend) sections.push("├── backend/        # Spring Boot API");
  if (config.frontend) sections.push("├── frontend/       # Angular SPA");
  if (config.docker) sections.push("├── docker-compose.yml");
  sections.push("└── README.md");
  sections.push("```\n");

  if (config.backend) {
    sections.push(`## Backend — Spring Boot ${versions.springBoot}\n`);
    sections.push(
      "- **Java 21** with records, pattern matching, sealed classes",
    );
    sections.push("- **Architecture:** Feature-based package structure");
    sections.push(
      "- **DB:** PostgreSQL, Flyway migrations in `backend/src/main/resources/db/migration/`",
    );
    sections.push(
      "- **Conventions:** Records for DTOs, Lombok where useful, MapStruct for mappings",
    );
    sections.push("- **Validation:** Jakarta Bean Validation");
    sections.push("- **Logging:** SLF4J\n");
    sections.push("### Commands\n");
    sections.push("```bash");
    sections.push("cd backend");
    sections.push("./mvnw spring-boot:run          # Start dev server");
    sections.push("./mvnw test                      # Run tests");
    sections.push("./mvnw package -DskipTests       # Build JAR");
    sections.push("```\n");
  }

  if (config.frontend) {
    sections.push("## Frontend — Angular\n");
    sections.push(
      `- **Angular ${versions.angular}** with strict mode, standalone components, signals`,
    );
    sections.push(
      `- **UI:** PrimeNG ${versions.primeng}, theme Aura, PrimeFlex`,
    );
    sections.push("- **State:** NgRx SignalStore");
    sections.push(
      "- **Conventions:** OnPush change detection, `input()`/`output()` functions, `inject()` for DI",
    );
    sections.push("- **Control flow:** `@if`, `@for` (not *ngIf/*ngFor)");
    sections.push("- **Indentation:** 2 spaces\n");
    sections.push("### Commands\n");
    sections.push("```bash");
    sections.push("cd frontend");
    sections.push("npm install                      # Install dependencies");
    sections.push(
      "ng serve                         # Start dev server (port 4200)",
    );
    sections.push("ng build                         # Production build");
    sections.push("ng test                          # Run tests");
    sections.push("```\n");
  }

  if (config.docker) {
    sections.push("## Infrastructure\n");
    sections.push("```bash");
    sections.push(
      "docker compose up -d             # Start PostgreSQL + pgAdmin",
    );
    sections.push("docker compose down              # Stop services");
    sections.push("```\n");
    sections.push("- **PostgreSQL:** localhost:5432");
    sections.push("- **pgAdmin:** localhost:5050 (admin@admin.com / admin)\n");
  }

  sections.push("## Conventions\n");
  sections.push(
    "- **Git:** Conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`)",
  );
  sections.push("- **Branches:** `feature/`, `fix/`, `refactor/`, `chore/`");
  sections.push("- **DB:** snake_case naming");
  sections.push(
    "- **Security:** Never commit secrets, use environment variables",
  );

  await fs.writeFile(path.join(projectDir, "CLAUDE.md"), sections.join("\n"));
}

async function generateClaudeSettings(
  projectDir: string,
  config: ProjectConfig,
): Promise<void> {
  const claudeDir = path.join(projectDir, ".claude");
  await fs.ensureDir(claudeDir);

  const allowedCommands: string[] = [];

  if (config.backend) {
    allowedCommands.push(
      "bash(./mvnw spring-boot:run)",
      "bash(./mvnw test)",
      "bash(./mvnw package)",
      "bash(./mvnw clean)",
    );
  }

  if (config.frontend) {
    allowedCommands.push(
      "bash(ng serve)",
      "bash(ng build)",
      "bash(ng test)",
      "bash(ng generate)",
      "bash(npm install)",
      "bash(npm run)",
    );
  }

  if (config.docker) {
    allowedCommands.push(
      "bash(docker compose up)",
      "bash(docker compose down)",
      "bash(docker compose ps)",
    );
  }

  const settings = {
    permissions: {
      allow: allowedCommands,
    },
  };

  await fs.writeJson(path.join(claudeDir, "settings.json"), settings, {
    spaces: 2,
  });
}
