#!/usr/bin/env node

import { Command } from "commander";
import { newCommand } from "./commands/new.js";

const program = new Command();

program
  .name("forgekit")
  .description(
    "CLI de scaffolding full-stack pour projets Spring Boot + Angular",
  )
  .version("1.0.0");

program.addCommand(newCommand);

program.parse();
