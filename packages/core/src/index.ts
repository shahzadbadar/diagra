import { readFile } from "node:fs/promises";
import { DiagramParser } from "./parser/DiagramParser";
import { IconResolver } from "./icons/IconResolver";
import { SVGRenderer } from "./renderer/SVGRenderer";
import { DrawioExporter } from "./exporters/DrawioExporter";
import { HTMLExporter } from "./exporters/HTMLExporter";
import { MmdExporter } from "./exporters/MmdExporter";
import { PNGExporter } from "./exporters/PNGExporter";
import type { RenderOptions, RenderResult } from "./types";

export * from "./types";
export { DiagramParser } from "./parser/DiagramParser";
export { DirectiveParser } from "./parser/DirectiveParser";
export { IconLoader } from "./icons/IconLoader";
export { IconResolver } from "./icons/IconResolver";
export { ThemeEngine } from "./themes/ThemeEngine";
export { NodeRenderer } from "./renderer/NodeRenderer";
export { EdgeRenderer } from "./renderer/EdgeRenderer";
export { AnimationRenderer } from "./renderer/AnimationRenderer";
export { SVGRenderer } from "./renderer/SVGRenderer";
export { SVGExporter } from "./exporters/SVGExporter";
export { PNGExporter } from "./exporters/PNGExporter";
export { HTMLExporter } from "./exporters/HTMLExporter";
export { MmdExporter } from "./exporters/MmdExporter";
export { DrawioExporter } from "./exporters/DrawioExporter";

export class Diagra {
  private readonly parser = new DiagramParser();
  private readonly iconResolver = new IconResolver();
  private readonly svgRenderer = new SVGRenderer();
  private readonly htmlExporter = new HTMLExporter();
  private readonly mmdExporter = new MmdExporter();
  private readonly drawioExporter = new DrawioExporter();
  private readonly pngExporter = new PNGExporter();

  async render(source: string, options: RenderOptions = {}): Promise<RenderResult> {
    const parsed = await this.parser.parse(source);
    const overrides = Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined));
    const directives = { ...parsed.directives, ...overrides };
    const icons = await this.iconResolver.resolve(parsed.ast);
    const svg = this.svgRenderer.render(parsed.ast, directives, icons, options);
    const html = this.htmlExporter.export(svg);
    const drawio = this.drawioExporter.export(parsed.ast);
    const mmd = this.mmdExporter.export(source);
    return { svg, html, drawio, mmd };
  }

  async renderFile(path: string, options: RenderOptions = {}): Promise<RenderResult> {
    return this.render(await readFile(path, "utf8"), options);
  }

  async toSVG(source: string, options: RenderOptions = {}): Promise<string> {
    return (await this.render(source, options)).svg;
  }

  async toPNG(source: string, options: RenderOptions = {}): Promise<Buffer> {
    const rendered = await this.render(source, options);
    return this.pngExporter.export(rendered.svg, options);
  }

  async toHTML(source: string, options: RenderOptions = {}): Promise<string> {
    return (await this.render(source, options)).html;
  }

  async toDrawio(source: string, options: RenderOptions = {}): Promise<string> {
    return (await this.render(source, options)).drawio;
  }

  async toPNGFromSVG(svg: string, options: RenderOptions = {}): Promise<Buffer> {
    return this.pngExporter.export(svg, options);
  }
}
