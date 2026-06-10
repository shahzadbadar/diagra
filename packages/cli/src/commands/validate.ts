import { readFile } from "node:fs/promises";
import { Diagra } from "@diagra/core";
import { Command } from "commander";

export function validateCommand(): Command {
  return new Command("validate")
    .argument("<file>", ".diagra file to validate")
    .action(async (file: string) => {
      await new Diagra().render(await readFile(file, "utf8"));
      console.log(`${file} is valid`);
    });
}
