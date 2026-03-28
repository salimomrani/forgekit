#!/usr/bin/env node

import { Command } from "commander";
import { createRequire } from "node:module";
import { newCommand } from "./commands/new.js";
import { addCommand } from "./commands/add.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const program = new Command();

program
  .name("forgekit")
  .description(
    "CLI de scaffolding full-stack (Spring Boot, FastAPI, Laravel, Angular, React)",
  )
  .version(version)
  .addHelpText(
    "after",
    `
Workflow:
  1. forgekit new <name>    Créer un nouveau projet (wizard interactif)
  2. forgekit add <layer>   Ajouter des layers supplémentaires

Layers disponibles:
  Backends    spring-boot | fastapi | laravel
  Frontends   angular | react
  Infra       docker | ci | claude-code | speckit | prettier

Exemples:
  $ forgekit new my-app
  $ forgekit new my-api --spring-boot --no-frontend
  $ forgekit add docker
  $ forgekit add claude-code          (fonctionne sur n'importe quel projet)`,
  );

program.addCommand(newCommand);
program.addCommand(addCommand);

program.parse();
