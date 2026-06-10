import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Command } from "commander";

export function iconsCommand(): Command {
  const command = new Command("icons").description("Inspect available icon packs");
  command
    .command("list")
    .option("--pack <pack>", "aws, gcp, azure, generic", "generic")
    .action(async (options: { pack: string }) => {
      const manifest = JSON.parse(await readFile(join(process.cwd(), "packages/icons", options.pack, "manifest.json"), "utf8")) as { icons: Record<string, string> };
      for (const name of Object.keys(manifest.icons).sort()) console.log(`${options.pack}-${name}`);
    });
  return command;
}
