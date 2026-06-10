import { Command } from "commander";
import chokidar from "chokidar";
import { renderFile } from "./render";

export function watchCommand(): Command {
  return new Command("watch")
    .argument("<file>", ".diagra file to watch")
    .option("-f, --format <format>", "render format", "svg")
    .action(async (file: string, options: { format: string }) => {
      const run = async (): Promise<void> => {
        try {
          await renderFile(file, options.format);
          console.log(`Rendered ${file}`);
        } catch (error) {
          console.error(error instanceof Error ? error.message : error);
        }
      };
      await run();
      chokidar.watch(file, { ignoreInitial: true }).on("change", run);
    });
}
