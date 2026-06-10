import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function iconsCommand(): Command {
  const command = new Command("icons").description("Inspect available icon packs");
  command
    .command("list")
    .option("--pack <pack>", "aws, gcp, azure, generic", "generic")
    .action(async (options: { pack: string }) => {
      try {
        const manifestPath = join(__dirname, "../../icons", options.pack, "manifest.json");
        const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { icons: Record<string, string> };
        for (const name of Object.keys(manifest.icons).sort()) console.log(`${options.pack}-${name}`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
  return command;
}
