export type ThemeName = "light" | "dark" | "neutral" | "brand";
export type IconPackName = "aws" | "gcp" | "azure" | "generic" | "none";
export type AnimationName = "flow" | "none";
export type OutputFormat = "svg" | "png" | "html" | "drawio" | "mmd" | "all";

export interface DiagraDirectives {
  theme: ThemeName;
  icons: IconPackName;
  animate: AnimationName;
  font: string;
  accent?: string;
  title?: string;
  subtitle?: string;
}

export interface RenderOptions extends Partial<DiagraDirectives> {
  width?: number;
  height?: number;
  transparent?: boolean;
}

export interface DiagramNode {
  id: string;
  label: string;
  classes: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

export interface DiagramAst {
  type: "flowchart";
  direction: "TB" | "TD" | "BT" | "LR" | "RL";
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface ParsedDiagram {
  directives: DiagraDirectives;
  mermaidSource: string;
  ast: DiagramAst;
  mermaidAst?: unknown;
}

export interface ThemeTokens {
  background: string;
  nodeBg: string;
  nodeBorder: string;
  nodeText: string;
  edgeColor: string;
  edgeLabel: string;
  accent: string;
  font: string;
}

export interface RenderResult {
  svg: string;
  html: string;
  drawio: string;
  mmd: string;
  png?: Buffer;
}
