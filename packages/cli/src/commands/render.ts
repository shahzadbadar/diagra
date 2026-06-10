import { readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, basename } from "node:path";
import { Diagra, type OutputFormat, type RenderOptions } from "@diagra/core";
import { Command } from "commander";

const textFormats = new Set(["svg", "html", "drawio", "mmd"]);

export function renderCommand(): Command {
  return new Command("render")
    .argument("<file>", ".diagra file to render")
    .option("-f, --format <format>", "svg, png, html, drawio, mmd, all, or comma-separated values", "svg")
    .option("--theme <theme>", "theme override")
    .option("--icons <icons>", "icon pack override")
    .option("--animate <animate>", "animation override")
    .option("--font <font>", "font override")
    .option("--accent <hex>", "accent color override")
    .option("--width <px>", "PNG/SVG width", (value) => Number.parseInt(value, 10))
    .option("--transparent", "transparent background")
    .action(async (file: string, rawOptions: RenderOptions & { format: string }) => {
      await renderFile(file, rawOptions.format, rawOptions);
    });
}

export async function renderFile(file: string, format: string, options: RenderOptions = {}): Promise<void> {
  const diagra = new Diagra();
  const source = await readFile(file, "utf8");
  const result = await diagra.render(source, options);
  const formats = normalizeFormats(format);
  const base = join(dirname(file), basename(file, extname(file)));

  for (const item of formats) {
    if (item === "png") {
      const png = await diagra.toPNG(source, options);
      await writeFile(`${base}.png`, png);
      continue;
    }
    if (textFormats.has(item)) {
      await writeFile(`${base}.${item}`, result[item as "svg" | "html" | "drawio" | "mmd"], "utf8");
    }
  }
}

function normalizeFormats(format: string): Array<Exclude<OutputFormat, "all">> {
  if (format === "all") return ["svg", "png", "html", "drawio", "mmd"];
  return format.split(",").map((item) => item.trim()).filter(Boolean) as Array<Exclude<OutputFormat, "all">>;
}
