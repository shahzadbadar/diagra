import { writeFile } from "node:fs/promises";

export class SVGExporter {
  export(svg: string): string {
    return svg;
  }

  async write(svg: string, outputPath: string): Promise<void> {
    await writeFile(outputPath, svg, "utf8");
  }
}
