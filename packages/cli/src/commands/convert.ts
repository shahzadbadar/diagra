import { readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, basename } from "node:path";
import { convertMermaidToDiagra, type MermaidConvertOptions } from "@diagra/core";
import { Command } from "commander";

export function convertCommand(): Command {
  return new Command("convert")
    .description("Convert standard Mermaid flowchart to a .diagra file with inferred icons")
    .argument("<file>", ".mmd or .mermaid file (or existing .diagra without icons)")
    .option("-o, --output <file>", "output .diagra path")
    .option("--theme <theme>", "dark | light | neutral")
    .option("--icons <pack>", "generic | aws | gcp | azure | none", "generic")
    .option("--animate <mode>", "flow | none", "flow")
    .option("--font <name>", "font family", "Inter")
    .option("--no-infer-icons", "keep nodes without icon classes")
    .action(async (file: string, options: MermaidConvertOptions & { output?: string; inferIcons?: boolean }) => {
      try {
        const source = await readFile(file, "utf8");
        const inferIcons = options.inferIcons !== false;
        const diagra = await convertMermaidToDiagra(source, {
          theme: options.theme,
          icons: options.icons,
          animate: options.animate,
          font: options.font,
          inferIcons
        });

        const output = options.output ?? join(dirname(file), `${basename(file, extname(file))}.diagra`);
        await writeFile(output, diagra, "utf8");
        console.log(`Wrote ${output}`);
        if (inferIcons) {
          console.log("Icons were inferred from node labels. Edit :::classes in the file to swap generic icons for aws-* / azure-* / gcp-*.");
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
