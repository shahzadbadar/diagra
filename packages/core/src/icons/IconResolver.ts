import { IconLoader } from "./IconLoader";
import type { DiagramAst } from "../types";

export class IconResolver {
  constructor(private readonly loader = new IconLoader()) {}

  async resolve(ast: DiagramAst): Promise<Map<string, string>> {
    const icons = new Map<string, string>();
    for (const node of ast.nodes) {
      const iconClass = node.classes.find((className) => /^(aws|gcp|azure|generic)-/.test(className));
      if (!iconClass) continue;
      const svg = await this.loader.load(iconClass);
      if (svg) icons.set(node.id, svg);
    }
    return icons;
  }
}
