import { AnimationRenderer } from "./AnimationRenderer";
import { EdgeRenderer } from "./EdgeRenderer";
import { NodeRenderer } from "./NodeRenderer";
import { ThemeEngine } from "../themes/ThemeEngine";
import type { DiagramAst, DiagraDirectives, RenderOptions } from "../types";

export class SVGRenderer {
  private readonly nodeRenderer = new NodeRenderer();
  private readonly edgeRenderer = new EdgeRenderer();
  private readonly animationRenderer = new AnimationRenderer();
  private readonly themeEngine = new ThemeEngine();

  render(ast: DiagramAst, directives: DiagraDirectives, icons: Map<string, string>, options: RenderOptions = {}): string {
    const overrides = Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined));
    const tokens = this.themeEngine.resolve({ ...directives, ...overrides });
    const css = this.themeEngine.toCssVariables(tokens);
    const dimensions = this.dimensions(ast, options);
    const nodesById = new Map(ast.nodes.map((node) => [node.id, node]));
    const edges = this.edgeRenderer.renderAll(ast.edges, nodesById);
    const nodes = ast.nodes.map((node) => this.nodeRenderer.render(node, icons.get(node.id))).join("\n");
    const animations = this.animationRenderer.render(ast.edges, nodesById, options.animate ?? directives.animate);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}" role="img">
<style>
${css}
.diagra-node { filter: drop-shadow(0 10px 18px rgba(15, 23, 42, 0.10)); }
.diagra-edge { stroke-linecap: round; }
</style>
<defs>
  <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
    <path d="M0,0 L0,6 L9,3 z" fill="var(--edge-color)"/>
  </marker>
</defs>
<rect width="100%" height="100%" fill="${options.transparent ? "none" : "var(--bg)"}"/>
${edges}
${animations}
${nodes}
</svg>`;
  }

  private dimensions(ast: DiagramAst, options: RenderOptions): { width: number; height: number } {
    const padding = 40;
    const maxX = Math.max(...ast.nodes.map((node) => node.x + node.width), 320) + padding;
    const maxY = Math.max(...ast.nodes.map((node) => node.y + node.height), 220) + padding;
    const rowCount = new Set(ast.nodes.map((node) => node.y)).size;
    const requiredWidth = Math.max(800, 980, ast.nodes.length * 140, maxX);
    const requiredHeight = Math.max(400, 260, rowCount * 160, maxY);
    return {
      width: Math.max(options.width ?? 0, requiredWidth),
      height: Math.max(options.height ?? 0, requiredHeight)
    };
  }
}
