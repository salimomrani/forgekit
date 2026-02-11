import path from "node:path";
import fs from "fs-extra";
import type { ProjectConfig } from "../../types.js";

export async function generateDocker(
  projectDir: string,
  config: ProjectConfig,
): Promise<void> {
  const dbName = config.name.toLowerCase().replace(/[^a-z0-9]/g, "_");

  const compose = `services:
  postgres:
    image: postgres:17
    container_name: ${dbName}_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${dbName}
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: ${dbName}_pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@admin.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
`;

  await fs.writeFile(path.join(projectDir, "docker-compose.yml"), compose);
}
