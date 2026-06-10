import { escapeXml } from "./escape";
import type { DiagramNode } from "../types";

export class NodeRenderer {
  render(node: DiagramNode, icon?: string): string {
    const iconBlock = icon
      ? this.renderIcon(this.sanitizeIconSvg(icon), node.x + node.width / 2 - 16, node.y + 12)
      : `<circle cx="${node.x + node.width / 2}" cy="${node.y + 28}" r="15" fill="var(--accent)" opacity="0.18"/>`;

    return `<g id="node-${escapeXml(node.id)}" class="diagra-node" data-icon="${escapeXml(node.classes[0] ?? "")}">
  <rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="8" fill="var(--node-bg)" stroke="var(--node-border)"/>
  ${iconBlock}
  <text x="${node.x + node.width / 2}" y="${node.y + 68}" text-anchor="middle" font-family="var(--font)" font-size="12" font-weight="600" fill="var(--node-text)">${escapeXml(node.label)}</text>
</g>`;
  }

  private sanitizeIconSvg(svg: string): string {
    return svg
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/\s+on\w+="[^"]*"/gi, "")
      .replace(/\s+on\w+='[^']*'/gi, "")
      .replace(/<foreignObject\b[\s\S]*?<\/foreignObject>/gi, "");
  }

  private renderIcon(icon: string, x: number, y: number): string {
    const svgMatch = icon.match(/^<svg\b([^>]*)>/i);
    if (!svgMatch) {
      return `<g transform="translate(${x}, ${y})">${icon}</g>`;
    }

    const attrs = svgMatch[1].replace(/\s(?:x|y|width|height)="[^"]*"/gi, "");
    return icon.replace(/^<svg\b[^>]*>/i, `<svg x="${x}" y="${y}" width="32" height="32"${attrs}>`);
  }
}
