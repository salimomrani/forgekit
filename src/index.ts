#!/usr/bin/env node

import { Command } from "commander";
import { createRequire } from "node:module";
import { newCommand } from "./commands/new.js";
import { addCommand } from "./commands/add.js";
import { serveCommand } from "./commands/serve.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const program = new Command();

program
  .name("forgekit")
  .description(
    "CLI de scaffolding full-stack pour projets Spring Boot + Angular",
  )
  .version(version);

program.addCommand(newCommand);
program.addCommand(addCommand);
program.addCommand(serveCommand);

program.parse();
