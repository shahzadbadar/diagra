import type { AnimationName, DiagramEdge, DiagramNode } from "../types";

export class AnimationRenderer {
  render(edges: DiagramEdge[], nodesById: Map<string, DiagramNode>, animate: AnimationName): string {
    if (animate !== "flow") return "";
    return edges
      .filter((edge) => this.pathLength(edge, nodesById) > 50)
      .map((edge, index) => `<circle r="4" fill="var(--accent)" opacity="0.9">
  <animateMotion dur="1.5s" begin="${index * 0.2}s" repeatCount="indefinite">
    <mpath href="#${edge.id}"/>
  </animateMotion>
</circle>`)
      .join("\n");
  }

  private pathLength(edge: DiagramEdge, nodesById: Map<string, DiagramNode>): number {
    const from = nodesById.get(edge.from);
    const to = nodesById.get(edge.to);
    if (!from || !to) return 0;
    const start = this.anchor(from, to);
    const end = this.anchor(to, from);
    if (Math.abs(start.y - end.y) < 1) return this.distance(start, end);

    const curve = Math.max(48, Math.abs(end.x - start.x) * 0.45);
    const c1 = { x: start.x + curve, y: start.y };
    const c2 = { x: end.x - curve, y: end.y };
    let length = 0;
    let previous = start;
    for (let step = 1; step <= 12; step += 1) {
      const point = this.cubicPoint(start, c1, c2, end, step / 12);
      length += this.distance(previous, point);
      previous = point;
    }
    return length;
  }

  private cubicPoint(
    start: { x: number; y: number },
    c1: { x: number; y: number },
    c2: { x: number; y: number },
    end: { x: number; y: number },
    t: number
  ): { x: number; y: number } {
    const mt = 1 - t;
    return {
      x: mt ** 3 * start.x + 3 * mt ** 2 * t * c1.x + 3 * mt * t ** 2 * c2.x + t ** 3 * end.x,
      y: mt ** 3 * start.y + 3 * mt ** 2 * t * c1.y + 3 * mt * t ** 2 * c2.y + t ** 3 * end.y
    };
  }

  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  private anchor(node: DiagramNode, other: DiagramNode): { x: number; y: number } {
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
