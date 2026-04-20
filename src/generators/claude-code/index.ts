import path from "node:path";
import os from "node:os";
import fs from "fs-extra";
import {
  renderAndWrite,
  TEMPLATES_DIR,
  BUNDLED_SKILLS_DIR,
} from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig, SpeckitPreset } from "../../types.js";
import type { ResolvedVersions } from "../../versions.js";

interface SpeckitConfig {
  tests: boolean;
  tdd: boolean;
  testTypes: string;
  codeReview: boolean;
  securityReview: string;
  verification: string;
  planDetail: string;
  skipClarify: boolean;
  fastMode: boolean;
}

const SPECKIT_PRESETS: Record<SpeckitPreset, SpeckitConfig> = {
  rigorous: {
    tests: true,
    tdd: true,
    testTypes: "unit",
    codeReview: true,
    securityReview: "auto",
    verification: "full",
    planDetail: "high",
    skipClarify: false,
    fastMode: false,
  },
  balanced: {
    tests: true,
    tdd: false,
    testTypes: "unit",
    codeReview: true,
    securityReview: "auto",
    verification: "minimal",
    planDetail: "medium",
    skipClarify: false,
    fastMode: false,
  },
  fast: {
    tests: true,
    tdd: false,
    testTypes: "unit",
    codeReview: false,
    securityReview: "auto",
    verification: "minimal",
    planDetail: "low",
    skipClarify: true,
    fastMode: false,
  },
  "bare-metal": {
    tests: false,
    tdd: false,
    testTypes: "unit",
    codeReview: false,
    securityReview: "false",
    verification: "skip",
    planDetail: "low",
    skipClarify: true,
    fastMode: false,
  },
};

class ClaudeCodeGenerator extends BaseGenerator {
  private readonly versions: ResolvedVersions;
  private readonly globalSkillsBase: string;
  private readonly globalCommandsBase: string;
  speckitWorkflowCopied = false;

  constructor(
    projectDir: string,
    config: ProjectConfig,
    versions: ResolvedVersions,
    globalSkillsBase?: string,
    globalCommandsBase?: string,
  ) {
    super(projectDir, config);
    this.versions = versions;
    this.globalSkillsBase =
      globalSkillsBase ?? path.join(os.homedir(), ".claude", "skills");
    this.globalCommandsBase =
      globalCommandsBase ?? path.join(os.homedir(), ".claude", "commands");
  }

  async generate(): Promise<void> {
    const claudeDir = path.join(this.projectDir, ".claude");
    await fs.ensureDir(claudeDir);

    const allowedCommands = this.buildAllowedCommands();

    const springBoot = this.config.backendType === "spring-boot";
    const fastapi = this.config.backendType === "fastapi";
    const laravel = this.config.backendType === "laravel";
    const nextjs = this.config.backendType === "nextjs";
    const backend = this.config.backendType !== null;

    const hooksDir = path.join(claudeDir, "hooks");
    await fs.ensureDir(hooksDir);
    await fs.ensureDir(path.join(this.projectDir, ".specify", "memory"));

    const rulesDir = path.join(claudeDir, "rules");
    if (backend || this.config.frontend !== null) {
      await fs.ensureDir(rulesDir);
    }

    const hasFrontend = this.config.frontend !== null;
    const angular = this.config.frontend === "angular";
    const reactVite = this.config.frontend === "react-vite";
    const vue = this.config.frontend === "vue";

    const parentHooks = await this.readParentHooks();

    const data = {
      name: this.config.name,
      description: this.config.description,
      backend,
      springBoot,
      fastapi,
      laravel,
      nextjs,
      hasFrontend,
      angular,
      reactVite,
      vue,
      frontend: hasFrontend,
      docker: this.config.docker,
      flyway: this.config.flyway,
      ngrx: this.config.ngrx,
      auth: this.config.auth,
      prisma: this.config.prisma,
      versions: this.versions,
      allowedCommands,
      claudeDir: ".claude",
      workflowSpeckit: this.config.workflowMode === "speckit",
      workflowVibe: this.config.workflowMode === "vibe",
      gitStrategy: this.config.gitStrategy,
      gitStrategyNoPr: this.config.gitStrategy === "no-pr",
      hasParentSessionStart: parentHooks.has("SessionStart"),
      hasParentPreCompact: parentHooks.has("PreCompact"),
      ...this.resolveSpeckitData(),
    };

    // Static hookify files (no templating needed)
    const staticHookifyFiles = [
      "block-dangerous-rm.local.md",
      "block-force-push.local.md",
      "block-no-verify.local.md",
      "warn-console-log.local.md",
      "warn-env-edit.local.md",
      "warn-todo-fixme.local.md",
    ];

    await Promise.all([
      // Existing files
      renderAndWrite(
        "claude-code/CLAUDE.md.hbs",
        path.join(this.projectDir, "CLAUDE.md"),
        data,
      ),
      renderAndWrite(
        "claude-code/settings.json.hbs",
        path.join(claudeDir, "settings.json"),
        data,
      ),
      // Hook scripts (templated, then chmod)
      renderAndWrite(
        "claude-code/hooks/pre-bash.sh.hbs",
        path.join(hooksDir, "pre-bash.sh"),
        data,
        { mode: 0o755 },
      ),
      renderAndWrite(
        "claude-code/hooks/session-start.sh.hbs",
        path.join(hooksDir, "session-start.sh"),
        data,
        { mode: 0o755 },
      ),
      // Templated hookify files
      renderAndWrite(
        "claude-code/hookify/stop-verify-tests.local.md.hbs",
        path.join(claudeDir, "hookify.stop-verify-tests.local.md"),
        data,
      ),
      renderAndWrite(
        "claude-code/hookify/warn-no-test-before-commit.local.md.hbs",
        path.join(claudeDir, "hookify.warn-no-test-before-commit.local.md"),
        data,
      ),
      // .specify constitution
      renderAndWrite(
        "claude-code/specify/constitution.md.hbs",
        path.join(this.projectDir, ".specify", "memory", "constitution.md"),
        data,
      ),
      // .claude/rules — scoped per-stack context
      ...(backend
        ? [
            renderAndWrite(
              "claude-code/rules/backend.md.hbs",
              path.join(rulesDir, "backend.md"),
              data,
            ),
          ]
        : []),
      ...(this.config.frontend !== null
        ? [
            renderAndWrite(
              "claude-code/rules/frontend.md.hbs",
              path.join(rulesDir, "frontend.md"),
              data,
            ),
          ]
        : []),
      // Static hookify files
      ...staticHookifyFiles.map((f) =>
        fs.copy(
          path.join(TEMPLATES_DIR, "claude-code", "hookify", f),
          path.join(claudeDir, `hookify.${f}`),
        ),
      ),
    ]);

    await this.generateSkills();
    this.speckitWorkflowCopied = await this.generateCommands();
  }

  private async generateSkills(): Promise<void> {
    const skillsToGenerate: Array<{ name: string; condition: boolean }> = [
      {
        name: "applying-angular-conventions",
        condition: this.config.frontend === "angular",
      },
      {
        name: "applying-react-conventions",
        condition: this.config.frontend === "react-vite",
      },
      {
        name: "applying-python-conventions",
        condition: this.config.backendType === "fastapi",
      },
      {
        name: "applying-java-conventions",
        condition: this.config.backendType === "spring-boot",
      },
      {
        name: "applying-php-laravel-conventions",
        condition: this.config.backendType === "laravel",
      },
    ];

    for (const { name, condition } of skillsToGenerate) {
      if (!condition) continue;

      const globalSrc = path.join(this.globalSkillsBase, name, "SKILL.md");
      const bundledSrc = path.join(BUNDLED_SKILLS_DIR, name, "SKILL.md");
      const dest = path.join(
        this.projectDir,
        ".claude",
        "skills",
        name,
        "SKILL.md",
      );

      const src = (await fs.pathExists(globalSrc)) ? globalSrc : bundledSrc;

      if (await fs.pathExists(src)) {
        await fs.ensureDir(path.dirname(dest));
        await fs.copy(src, dest);
      }
    }
  }

  private async generateCommands(): Promise<boolean> {
    const src = path.join(this.globalCommandsBase, "speckit.workflow.md");
    if (!(await fs.pathExists(src))) return false;

    const dest = path.join(this.projectDir, ".claude", "commands");
    await fs.ensureDir(dest);
    await fs.copy(src, path.join(dest, "speckit.workflow.md"));
    return true;
  }

  private async readParentHooks(): Promise<Set<string>> {
    const parentSettingsPath = path.join(
      os.homedir(),
      ".claude",
      "settings.json",
    );
    try {
      if (await fs.pathExists(parentSettingsPath)) {
        const content = await fs.readFile(parentSettingsPath, "utf-8");
        const settings = JSON.parse(content);
        if (settings.hooks && typeof settings.hooks === "object") {
          return new Set(Object.keys(settings.hooks));
        }
      }
    } catch {
      // Silently ignore parse/read errors
    }
    return new Set();
  }

  private resolveSpeckitData(): Record<string, unknown> {
    if (this.config.workflowMode !== "speckit") {
      return {};
    }
    const cfg = SPECKIT_PRESETS[this.config.speckitPreset ?? "balanced"];
    return {
      speckitTests: cfg.tests,
      speckitTdd: cfg.tdd,
      speckitTestTypes: cfg.testTypes,
      speckitCodeReview: cfg.codeReview,
      speckitSecurityReview: cfg.securityReview,
      speckitVerification: cfg.verification,
      speckitPlanDetail: cfg.planDetail,
      speckitSkipClarify: cfg.skipClarify,
      speckitFastMode: cfg.fastMode,
    };
  }

  private buildAllowedCommands(): string[] {
    const commands: string[] = [];
    const springBoot = this.config.backendType === "spring-boot";
    const fastapi = this.config.backendType === "fastapi";

    if (springBoot) {
      commands.push(
        "Bash(./mvnw spring-boot:run)",
        "Bash(./mvnw test)",
        "Bash(./mvnw package)",
        "Bash(./mvnw clean)",
      );
    }

    if (fastapi) {
      commands.push(
        "Bash(uvicorn app.main:app --reload)",
        "Bash(pytest)",
        "Bash(pip install)",
        "Bash(pip freeze)",
      );
    }

    if (this.config.backendType === "laravel") {
      commands.push(
        "Bash(php artisan serve)",
        "Bash(php artisan test)",
        "Bash(php artisan migrate)",
        "Bash(composer install)",
        "Bash(composer require)",
        "Bash(./vendor/bin/pint)",
      );
    }

    if (this.config.backendType === "nextjs") {
      commands.push(
        "Bash(npm run dev)",
        "Bash(npm run build)",
        "Bash(npm run lint)",
        "Bash(npm install)",
      );
      if (this.config.prisma) {
        commands.push(
          "Bash(npx prisma migrate dev)",
          "Bash(npx prisma generate)",
          "Bash(npx prisma studio)",
        );
      }
    }

    if (this.config.frontend === "angular") {
      commands.push(
        "Bash(ng serve)",
        "Bash(ng build)",
        "Bash(ng test)",
        "Bash(ng generate)",
        "Bash(npm install)",
        "Bash(npm run)",
      );
    }

    if (this.config.frontend === "react-vite") {
      commands.push(
        "Bash(npm run dev)",
        "Bash(npm run build)",
        "Bash(npm run lint)",
        "Bash(npm install)",
        "Bash(npm run)",
      );
    }

    if (this.config.frontend === "vue") {
      commands.push(
        "Bash(npm run dev)",
        "Bash(npm run build)",
        "Bash(npm run lint)",
        "Bash(npm install)",
        "Bash(npm run)",
      );
    }

    if (this.config.docker) {
      commands.push(
        "Bash(docker compose up)",
        "Bash(docker compose down)",
        "Bash(docker compose ps)",
      );
    }

    return commands;
  }
}

export async function generateClaudeCode(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
  globalSkillsBase?: string,
  globalCommandsBase?: string,
): Promise<{ speckitWorkflowCopied: boolean }> {
  const generator = new ClaudeCodeGenerator(
    projectDir,
    config,
    versions,
    globalSkillsBase,
    globalCommandsBase,
  );
  await generator.generate();
  return { speckitWorkflowCopied: generator.speckitWorkflowCopied };
}
