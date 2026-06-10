#!/usr/bin/env node
import { Command } from "commander";
import { iconsCommand } from "./commands/icons";
import { initCommand } from "./commands/init";
import { renderCommand } from "./commands/render";
import { validateCommand } from "./commands/validate";
import { watchCommand } from "./commands/watch";

const program = new Command();

program.name("diagra").description("Mermaid, but beautiful.").version("0.1.0");
program.addCommand(renderCommand());
program.addCommand(watchCommand());
program.addCommand(initCommand());
program.addCommand(iconsCommand());
program.addCommand(validateCommand());

await program.parseAsync();
