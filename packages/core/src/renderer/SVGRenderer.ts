import { AnimationRenderer } from "./AnimationRenderer";
import { EdgeRenderer } from "./EdgeRenderer";
import { NodeRenderer } from "./NodeRenderer";
import { ThemeEngine } from "../themes/ThemeEngine";
import { escapeXml } from "./escape";
import type { DiagramAst, DiagraDirectives, DiagramSubgraph, RenderOptions } from "../types";

type BoxLike = Pick<DiagramSubgraph, "x" | "y" | "width" | "height">;

export class SVGRenderer {
  private readonly nodeRenderer = new NodeRenderer();
  private readonly edgeRenderer = new EdgeRenderer();
  private readonly animationRenderer = new AnimationRenderer();
  private readonly themeEngine = new ThemeEngine();

  render(ast: DiagramAst, directives: DiagraDirectives, icons: Map<string, string>, options: RenderOptions = {}): string {
    const overrides = Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined));
    const tokens = this.themeEngine.resolve({ ...directives, ...overrides });
    const css = this.themeEngine.toCssVariables(tokens);
    const titleOffset = directives.title || directives.subtitle ? 70 : 0;
    const dimensions = this.dimensions(ast, options, titleOffset);
    const boxesById = new Map<string, BoxLike>([
      ...ast.nodes.map((node) => [node.id, node] as const),
      ...ast.subgraphs.map((subgraph) => [subgraph.id, subgraph] as const)
    ]);
    const subgraphs = this.renderSubgraphs(ast);
    const edges = this.edgeRenderer.renderAll(ast.edges, boxesById);
    const nodes = ast.nodes.map((node) => this.nodeRenderer.render(node, icons.get(node.id))).join("\n");
    const animations = this.animationRenderer.render(ast.edges, boxesById, options.animate ?? directives.animate);
    const titleElements = this.renderTitle(directives, dimensions.width);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}" role="img">
<style>
${css}
.diagra-node { filter: drop-shadow(0 10px 18px rgba(15, 23, 42, 0.10)); }
.diagra-edge { stroke-linecap: round; }
</style>
<defs>
  <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
    <path d="M0,0 L0,6 L9,3 z" fill="context-stroke"/>
  </marker>
</defs>
<rect width="100%" height="100%" fill="${options.transparent ? "none" : "var(--bg)"}"/>
${titleElements}
<g transform="translate(0, ${titleOffset})">
${subgraphs}
${edges}
${animations}
${nodes}
</g>
</svg>`;
  }

  private renderSubgraphs(ast: DiagramAst): string {
    const levelCache = new Map<string, number>();
    const subgraphById = new Map(ast.subgraphs.map((subgraph) => [subgraph.id, subgraph]));
    const levelFor = (subgraph: DiagramSubgraph): number => {
      const cached = levelCache.get(subgraph.id);
      if (cached !== undefined) return cached;
      const parent = subgraph.parentId ? subgraphById.get(subgraph.parentId) : undefined;
      const level = parent ? 1 + levelFor(parent) : 0;
      levelCache.set(subgraph.id, level);
      return level;
    };

    return ast.subgraphs
      .slice()
      .sort((a, b) => {
        const levelDelta = levelFor(a) - levelFor(b);
        if (levelDelta) return levelDelta;
        return (a.y - b.y) || (a.x - b.x) || (b.width * b.height - a.width * a.height);
      })
      .map((subgraph) => {
        const level = levelFor(subgraph);
        const style = this.subgraphStyle(level, subgraph.style);
        const header = this.subgraphHeader(subgraph, level, style);
        const headerY = header.y + 19;
        return `<g id="subgraph-${escapeXml(subgraph.id)}" class="diagra-subgraph">
  <rect x="${subgraph.x}" y="${subgraph.y}" width="${subgraph.width}" height="${subgraph.height}" rx="8" fill="${style.fill}" fill-opacity="${style.fillOpacity}" stroke="${style.stroke}" stroke-opacity="${style.strokeOpacity}" stroke-width="${style.strokeWidth}"${style.dashArray ? ` stroke-dasharray="${style.dashArray}"` : ""}/>
  <g transform="translate(0, 0)">
    <rect x="${header.x}" y="${header.y}" width="${header.width}" height="${header.height}" rx="${header.radius}" fill="${header.fill}" fill-opacity="${header.fillOpacity}" stroke="${header.stroke}" stroke-opacity="${header.strokeOpacity}" stroke-width="${header.strokeWidth}"/>
    <text x="${header.x + header.width / 2}" y="${headerY}" text-anchor="middle" font-family="var(--font)" font-size="${style.fontSize}" font-weight="700" fill="${style.textColor}">${escapeXml(subgraph.label)}</text>
  </g>
</g>`;
      })
      .join("\n");
  }

  private renderTitle(directives: DiagraDirectives, canvasWidth: number): string {
    if (!directives.title && !directives.subtitle) return "";
    const parts: string[] = [];
    if (directives.title) {
      parts.push(`<text x="24" y="28" font-family="var(--font)" font-size="18" font-weight="700" fill="var(--node-text)">${escapeXml(directives.title)}</text>`);
    }
    if (directives.subtitle) {
      parts.push(`<text x="24" y="50" font-family="var(--font)" font-size="12" font-weight="400" fill="var(--edge-label)">${escapeXml(directives.subtitle)}</text>`);
    }
    parts.push(`<line x1="24" y1="58" x2="${canvasWidth - 24}" y2="58" stroke="var(--node-border)" stroke-width="0.5"/>`);
    return parts.join("\n");
  }

  private dimensions(ast: DiagramAst, options: RenderOptions, titleOffset: number): { width: number; height: number } {
    const padding = 40;
    const bounds = [...ast.nodes, ...ast.subgraphs];
    const maxX = Math.max(...bounds.map((item) => item.x + item.width), 320) + padding;
    const maxY = Math.max(...bounds.map((item) => item.y + item.height), 220) + padding;
    const rowCount = new Set(ast.nodes.map((node) => node.y)).size;
    const requiredWidth = Math.max(980, maxX);
    const requiredHeight = Math.max(400, 260, rowCount * 160, maxY) + titleOffset;
    return {
      width: Math.max(options.width ?? 0, requiredWidth),
      height: Math.max(options.height ?? 0, requiredHeight)
    };
  }

  private subgraphStyle(
    level: number,
    style?: { fill?: string; stroke?: string; color?: string }
  ): { fill: string; fillOpacity: number; stroke: string; strokeOpacity: number; strokeWidth: number; dashArray?: string; fontSize: number; textColor: string; headerFill: string; headerFillOpacity: number; headerStroke: string; headerStrokeOpacity: number; headerStrokeWidth: number; radius: number } {
    if (level <= 0) {
      return {
        fill: style?.fill ?? "var(--accent)",
        fillOpacity: 0.10,
        stroke: style?.stroke ?? "var(--accent)",
        strokeOpacity: 0.6,
        strokeWidth: 1.5,
        fontSize: 13,
        textColor: style?.color ?? "var(--node-text)",
        headerFill: style?.fill ?? "var(--accent)",
        headerFillOpacity: 0.9,
        headerStroke: style?.stroke ?? "var(--accent)",
        headerStrokeOpacity: 0.9,
        headerStrokeWidth: 1.4,
        radius: 18
      };
    }
    if (level === 1) {
      return {
        fill: style?.fill ?? "var(--node-bg)",
        fillOpacity: 0.20,
        stroke: style?.stroke ?? "var(--node-border)",
        strokeOpacity: 0.8,
        strokeWidth: 1.2,
        dashArray: "8 6",
        fontSize: 12,
        textColor: style?.color ?? "var(--node-text)",
        headerFill: style?.fill ?? "var(--node-bg)",
        headerFillOpacity: 0.96,
        headerStroke: style?.stroke ?? "var(--node-border)",
        headerStrokeOpacity: 0.95,
        headerStrokeWidth: 1.1,
        radius: 16
      };
    }
    return {
      fill: style?.fill ?? "var(--node-bg)",
      fillOpacity: 0.12,
      stroke: style?.stroke ?? "var(--node-border)",
      strokeOpacity: 0.5,
      strokeWidth: 0.8,
      dashArray: "5 5",
      fontSize: 11,
      textColor: style?.color ?? "var(--node-text)",
      headerFill: style?.fill ?? "var(--node-bg)",
      headerFillOpacity: 0.94,
      headerStroke: style?.stroke ?? "var(--node-border)",
      headerStrokeOpacity: 0.85,
      headerStrokeWidth: 1,
      radius: 14
    };
  }

  private subgraphHeader(
    subgraph: DiagramSubgraph,
    level: number,
    style: {
      headerFill: string;
      headerFillOpacity: number;
      headerStroke: string;
      headerStrokeOpacity: number;
      headerStrokeWidth: number;
      radius: number;
      fontSize: number;
    }
  ): { x: number; y: number; width: number; height: number; fill: string; fillOpacity: number; stroke: string; strokeOpacity: number; strokeWidth: number; radius: number } {
    const width = Math.min(Math.max(120, subgraph.label.length * 8 + 36), Math.max(120, subgraph.width - 28));
    const x = subgraph.x + Math.max(14, (subgraph.width - width) / 2);
    const y = subgraph.y + (level === 0 ? 4 : level === 1 ? 28 : 44);
    return {
      x,
      y,
      width,
      height: 28,
      fill: style.headerFill,
      fillOpacity: style.headerFillOpacity,
      stroke: style.headerStroke,
      strokeOpacity: style.headerStrokeOpacity,
      strokeWidth: style.headerStrokeWidth,
      radius: style.radius
    };
  }
}
