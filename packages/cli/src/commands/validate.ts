import { readFile } from "node:fs/promises";
import { Diagra } from "@diagra/core";
import { Command } from "commander";

export function validateCommand(): Command {
  return new Command("validate")
    .argument("<file>", ".diagra file to validate")
    .action(async (file: string) => {
      try {
        await new Diagra().render(await readFile(file, "utf8"));
        console.log(`${file} is valid`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
