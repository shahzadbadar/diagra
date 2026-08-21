import { DirectiveParser } from "../parser/DirectiveParser";
import { DiagramParser } from "../parser/DiagramParser";
import type { AnimationName, IconPackName, ThemeName } from "../types";
import { inferIconClass, inferencePackFromDirective, type IconInferencePack } from "./IconInference";

export interface MermaidConvertOptions {
  theme?: ThemeName;
  icons?: IconPackName;
  animate?: AnimationName;
  font?: string;
  /** Guess icon classes from node labels. Default true. */
  inferIcons?: boolean;
  /** Override which keyword list to use for inference. Defaults from `icons` directive. */
  inferencePack?: IconInferencePack;
}

const DEFAULT_CONVERT_OPTIONS: Required<Pick<MermaidConvertOptions, "theme" | "icons" | "animate" | "font" | "inferIcons">> = {
  theme: "light",
  icons: "generic",
  animate: "flow",
  font: "Inter",
  inferIcons: true
};

export class MermaidConverter {
  private readonly directiveParser = new DirectiveParser();
  private readonly diagramParser = new DiagramParser();

  async convert(source: string, options: MermaidConvertOptions = {}): Promise<string> {
    const opts = { ...DEFAULT_CONVERT_OPTIONS, ...options };
    const { directives, mermaidSource } = this.directiveParser.parse(source);
    const theme = opts.theme ?? directives.theme ?? DEFAULT_CONVERT_OPTIONS.theme;
    const icons = opts.icons ?? directives.icons ?? DEFAULT_CONVERT_OPTIONS.icons;
    const animate = opts.animate ?? directives.animate ?? DEFAULT_CONVERT_OPTIONS.animate;
    const font = opts.font ?? directives.font ?? DEFAULT_CONVERT_OPTIONS.font;
    const inferencePack = opts.inferencePack ?? inferencePackFromDirective(icons);

    const iconByNodeId = opts.inferIcons
      ? await this.buildIconMap(mermaidSource, inferencePack)
      : new Map<string, string>();

    const body = this.annotateMermaidSource(mermaidSource, iconByNodeId);
    const header = this.buildDirectiveHeader({ theme, icons, animate, font }, source);

    return `${header}\n\n${body}`.trimEnd() + "\n";
  }

  private async buildIconMap(mermaidSource: string, pack: IconInferencePack): Promise<Map<string, string>> {
    const parsed = await this.diagramParser.parse(mermaidSource);
    const iconByNodeId = new Map<string, string>();

    for (const node of parsed.ast.nodes) {
      if (node.classes.some((c) => /^(aws|gcp|azure|generic)-/.test(c))) continue;
      iconByNodeId.set(node.id, inferIconClass(node.label, node.id, pack));
    }

    return iconByNodeId;
  }

  private buildDirectiveHeader(
    directives: { theme: ThemeName; icons: IconPackName; animate: AnimationName; font: string },
    originalSource: string
  ): string {
    const existing = new Set<string>();
    for (const line of originalSource.split(/\r?\n/)) {
      const match = line.match(/^\s*%%diagra:([a-z]+)\s+/i);
      if (match) existing.add(match[1].toLowerCase());
    }

    const lines: string[] = [];
    if (!existing.has("theme")) lines.push(`%%diagra:theme ${directives.theme}`);
    if (!existing.has("icons")) lines.push(`%%diagra:icons ${directives.icons}`);
    if (!existing.has("animate")) lines.push(`%%diagra:animate ${directives.animate}`);
    if (!existing.has("font")) lines.push(`%%diagra:font ${directives.font}`);
    return lines.join("\n");
  }

  private annotateMermaidSource(source: string, iconByNodeId: Map<string, string>): string {
    return source
      .split(/\r?\n/)
      .map((line) => this.annotateLine(line, iconByNodeId))
      .join("\n");
  }

  private annotateLine(line: string, iconByNodeId: Map<string, string>): string {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%") || /^flowchart\s/i.test(trimmed) || /^end\s*;?$/i.test(trimmed) || /^subgraph\s/i.test(trimmed)) {
      return line;
    }
    if (/^style\s/i.test(trimmed) || /^linkStyle\s/i.test(trimmed) || /^classDef\s/i.test(trimmed) || /^class\s/i.test(trimmed)) {
      return line;
    }

    if (/-->|-.->/.test(trimmed)) {
      return this.annotateEdgeLine(line, iconByNodeId);
    }

    return this.annotateEndpoint(line.trim(), iconByNodeId);
  }

  private annotateEdgeLine(line: string, iconByNodeId: Map<string, string>): string {
    const arrowPattern = /\s*(-\.->|-->)\s*(?:\|([^|]+)\|\s*)?/g;
    const arrows = [...line.matchAll(arrowPattern)];
    if (!arrows.length) return line;

    let result = "";
    for (let index = 0; index < arrows.length; index++) {
      const arrow = arrows[index];
      const leftStart = index === 0 ? 0 : arrows[index - 1].index! + arrows[index - 1][0].length;
      const rightEnd = arrows[index + 1] ? arrows[index + 1].index! : line.length;
      const left = line.slice(leftStart, arrow.index).trim();
      const right = line.slice(arrow.index! + arrow[0].length, rightEnd).trim();
      result += this.annotateEndpoint(left, iconByNodeId);
      result += arrow[0];
      result += this.annotateEndpoint(right.replace(/;$/, ""), iconByNodeId);
    }

    return result;
  }

  private annotateEndpoint(endpoint: string, iconByNodeId: Map<string, string>): string {
    if (!endpoint || /:::\s*[A-Za-z0-9_-]+/.test(endpoint)) return endpoint;

    const match = endpoint.trim().match(/^([A-Za-z0-9_-]+)(?:\[(.+?)\]|\((.+?)\)|\{(.+?)\})?$/);
    if (!match) return endpoint;

    const icon = iconByNodeId.get(match[1]);
    return icon ? `${endpoint}:::${icon}` : endpoint;
  }
}

export async function convertMermaidToDiagra(source: string, options?: MermaidConvertOptions): Promise<string> {
  return new MermaidConverter().convert(source, options);
}
