import { escapeXml } from "./escape";
import type { DiagramEdge, DiagramNode } from "../types";

type LabelBox = { x: number; y: number; width: number; height: number };
type BoxLike = Pick<DiagramNode, "x" | "y" | "width" | "height">;

export class EdgeRenderer {
  private readonly labelBoxes: LabelBox[] = [];

  renderAll(edges: DiagramEdge[], boxesById: Map<string, BoxLike>): string {
    this.labelBoxes.length = 0;
    return edges.map((edge) => this.render(edge, boxesById)).filter(Boolean).join("\n");
  }

  render(edge: DiagramEdge, boxesById: Map<string, BoxLike>): string {
    const from = boxesById.get(edge.from);
    const to = boxesById.get(edge.to);
    if (!from || !to) return "";
    const start = this.anchor(from, to);
    const end = this.anchor(to, from);
    const dash = edge.dashed ? ` stroke-dasharray="6 5"` : "";
    const opacity = edge.dashed ? ` opacity="0.4"` : "";
    const strokeWidth = edge.dashed ? 1 : 1.7;
    const pathData = this.pathData(start, end);
    const stroke = edge.style?.stroke ?? "var(--edge-color)";
    const labelColor = edge.style?.color ?? "var(--edge-label)";
    const path = `<path id="${edge.id}" class="diagra-edge" d="${pathData}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="none" marker-end="url(#arrow)"${dash}${opacity}/>`;
    if (!edge.label) return path;

    const midX = (from.x + from.width / 2 + to.x + to.width / 2) / 2;
    const midY = (from.y + from.height / 2 + to.y + to.height / 2) / 2 - 12;
    const labelWidth = Math.max(44, edge.label.length * 7 + 8);
    const labelHeight = 16;
    const labelY = this.placeLabel(midX, midY, labelWidth, labelHeight, boxesById);
    return `<g class="diagra-edge-label">
  ${path}
  <rect x="${midX - labelWidth / 2 - 4}" y="${labelY - 10}" width="${labelWidth + 8}" height="${labelHeight}" rx="2" fill="var(--bg)" opacity="0.85"/>
  <text x="${midX}" y="${labelY}" text-anchor="middle" font-family="var(--font)" font-size="10" font-weight="600" fill="${labelColor}">${escapeXml(edge.label)}</text>
</g>`;
  }

  private placeLabel(x: number, y: number, width: number, height: number, boxesById: Map<string, BoxLike>): number {
    let nextY = y;
    let labelBox = this.labelBox(x, nextY, width, height);

    for (let attempts = 0; attempts < 30; attempts += 1) {
      const nearLabel = this.labelBoxes.some((box) => Math.abs(box.y - labelBox.y) < 20);
      const onNode = [...boxesById.values()].some((box) => this.overlaps(labelBox, box));
      if (!nearLabel && !onNode) break;
      nextY += 16;
      labelBox = this.labelBox(x, nextY, width, height);
    }

    this.labelBoxes.push(labelBox);
    return nextY;
  }

  private labelBox(x: number, y: number, width: number, height: number): LabelBox {
    return { x: x - width / 2, y: y - 12, width, height };
  }

  private overlaps(box: LabelBox, target: BoxLike): boolean {
    return box.x < target.x + target.width && box.x + box.width > target.x && box.y < target.y + target.height && box.y + box.height > target.y;
  }

  private pathData(start: { x: number; y: number }, end: { x: number; y: number }): string {
    if (Math.abs(start.y - end.y) < 1) return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    const curve = Math.max(48, Math.abs(end.x - start.x) * 0.45);
    return `M ${start.x} ${start.y} C ${start.x + curve} ${start.y}, ${end.x - curve} ${end.y}, ${end.x} ${end.y}`;
  }

  private anchor(node: BoxLike, other: BoxLike): { x: number; y: number } {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const ox = other.x + other.width / 2;
    const oy = other.y + other.height / 2;
    if (Math.abs(ox - cx) > Math.abs(oy - cy)) {
      return { x: ox > cx ? node.x + node.width : node.x, y: cy };
    }
    return { x: cx, y: oy > cy ? node.y + node.height : node.y };
  }
}
