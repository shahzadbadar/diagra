import { escapeXml } from "./escape";
import type { DiagramNode } from "../types";

export class NodeRenderer {
  render(node: DiagramNode, icon?: string): string {
    const lines = this.wrapLabel(node.label);
    const twoLine = lines.length > 1;
    const iconX = node.x + node.width / 2 - 16;
    const iconY = node.y + 12;
    const fill = node.style?.fill ?? "var(--node-bg)";
    const stroke = node.style?.stroke ?? "var(--node-border)";
    const textColor = node.style?.color ?? "var(--node-text)";
    const iconBlock = icon
      ? this.renderIcon(this.sanitizeIconSvg(icon), iconX, iconY)
      : `<circle cx="${node.x + node.width / 2}" cy="${node.y + 28}" r="15" fill="var(--accent)" opacity="0.18"/>`;

    let textEl: string;
    if (twoLine) {
      const baseY = node.y + 62;
      textEl = `<text text-anchor="middle" font-family="var(--font)" font-size="12" font-weight="600" fill="${textColor}">
  <tspan x="${node.x + node.width / 2}" y="${baseY}">${escapeXml(lines[0])}</tspan>
  <tspan x="${node.x + node.width / 2}" dy="18">${escapeXml(lines[1])}</tspan>
</text>`;
    } else {
      textEl = `<text x="${node.x + node.width / 2}" y="${node.y + 68}" text-anchor="middle" font-family="var(--font)" font-size="12" font-weight="600" fill="${textColor}">${escapeXml(lines[0])}</text>`;
    }

    return `<g id="node-${escapeXml(node.id)}" class="diagra-node" data-icon="${escapeXml(node.classes[0] ?? "")}">
  <rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="8" fill="${fill}" stroke="${stroke}"/>
  ${iconBlock}
  ${textEl}
</g>`;
  }

  private wrapLabel(label: string): string[] {
    if (label.length <= 20) return [label];
    const words = label.split(" ");
    const line1: string[] = [];
    for (const word of words) {
      const candidate = line1.length ? `${line1.join(" ")} ${word}` : word;
      if (candidate.length <= 20) {
        line1.push(word);
      } else {
        break;
      }
    }
    if (!line1.length) line1.push(words[0]);
    const line1Text = line1.join(" ");
    const line2Text = label.slice(line1Text.length).trim();
    return line2Text ? [line1Text, line2Text] : [label];
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
