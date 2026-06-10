import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function initCommand(): Command {
  return new Command("init")
    .option("-t, --template <name>", "template name", "simple-flow")
    .option("-o, --output <file>", "output file")
    .action(async (options: { template: string; output?: string }) => {
      const output = options.output ?? `${options.template}.diagra`;
      const templatePath = join(__dirname, "../../../../templates", `${options.template}.diagra`);
      await mkdir(dirname(output), { recursive: true });
      await copyFile(templatePath, output);
      console.log(`Created ${output}`);
    });
}
