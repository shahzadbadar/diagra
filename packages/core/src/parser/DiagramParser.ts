import { DirectiveParser } from "./DirectiveParser";
import type { DiagramAst, DiagramEdge, DiagramNode, ParsedDiagram } from "../types";

type MermaidParserModule = {
  parse?: (diagramType: string, text: string) => unknown | Promise<unknown>;
};

export class DiagramParser {
  private readonly directiveParser = new DirectiveParser();

  async parse(source: string): Promise<ParsedDiagram> {
    const { directives, mermaidSource } = this.directiveParser.parse(source);
    const mermaidAst = await this.parseWithMermaid(mermaidSource);
    const ast = this.parseFlowchartSubset(mermaidSource);
    return { directives, mermaidSource, ast, mermaidAst };
  }

  private async parseWithMermaid(mermaidSource: string): Promise<unknown> {
    void mermaidSource;
    return undefined;
  }

  private parseFlowchartSubset(source: string): DiagramAst {
    const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const header = lines[0]?.match(/^flowchart\s+(TB|TD|BT|LR|RL)\b/i);
    if (!header) {
      throw new Error("Only Mermaid flowchart diagrams are supported in the MVP.");
    }

    const direction = header[1].toUpperCase() as DiagramAst["direction"];
    const nodeMap = new Map<string, Omit<DiagramNode, "x" | "y" | "width" | "height">>();
    const edges: DiagramEdge[] = [];

    for (const line of lines.slice(1)) {
      if (line.startsWith("%%")) continue;
      const parsedEdges = this.parseEdges(line);
      if (parsedEdges.length > 0) {
        for (const edge of parsedEdges) {
          const left = this.parseEndpoint(edge.left);
          const right = this.parseEndpoint(edge.right);
          this.upsertNode(nodeMap, left);
          this.upsertNode(nodeMap, right);
          edges.push({ id: `edge-${edges.length + 1}`, from: left.id, to: right.id, label: edge.label, dashed: edge.dashed });
        }
      } else {
        const node = this.parseEndpoint(line);
        this.upsertNode(nodeMap, node);
      }
    }

    const cycleNodes = this.detectCycle([...nodeMap.values()], edges);
    if (cycleNodes.length > 0) {
      console.warn(`[diagra] Cyclic edges detected (nodes: ${cycleNodes.join(", ")}). Back-edges will be excluded from layout.`);
    }

    const nodes = this.layout([...nodeMap.values()], edges, direction);
    return { type: "flowchart", direction, nodes, edges };
  }

  private detectCycle(
    nodes: Array<Omit<DiagramNode, "x" | "y" | "width" | "height">>,
    edges: DiagramEdge[]
  ): string[] {
    const nodeIds = new Set(nodes.map((n) => n.id));
    const solidEdges = edges.filter((e) => !e.dashed && nodeIds.has(e.from) && nodeIds.has(e.to));
    const indegree = new Map(nodes.map((n) => [n.id, 0]));
    const outgoing = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
    for (const e of solidEdges) {
      indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
      outgoing.get(e.from)!.push(e.to);
    }
    const queue = nodes.filter((n) => (indegree.get(n.id) ?? 0) === 0).map((n) => n.id);
    for (let i = 0; i < queue.length; i++) {
      for (const to of outgoing.get(queue[i]) ?? []) {
        const deg = (indegree.get(to) ?? 0) - 1;
        indegree.set(to, deg);
        if (deg === 0) queue.push(to);
      }
    }
    if (queue.length < nodes.length) {
      return nodes.filter((n) => !queue.includes(n.id)).map((n) => n.id);
    }
    return [];
  }

  private nodeDimensions(label: string): { width: number; height: number } {
    const textWidth = Math.ceil(label.length * 7.5);
    const width = Math.max(120, textWidth + 32);
    const height = label.length > 20 ? 106 : 88;
    return { width, height };
  }

  private parseEdges(raw: string): Array<{ left: string; right: string; label?: string; dashed: boolean }> {
    const arrowPattern = /\s*(-\.->|-->)\s*(?:\|([^|]+)\|\s*)?/g;
    const arrows = [...raw.matchAll(arrowPattern)];
    if (arrows.length === 0) return [];

    return arrows.map((arrow, index) => {
      const nextArrow = arrows[index + 1];
      const leftStart = index === 0 ? 0 : arrows[index - 1].index! + arrows[index - 1][0].length;
      const rightEnd = nextArrow ? nextArrow.index! : raw.length;
      return {
        left: raw.slice(leftStart, arrow.index).trim(),
        right: raw.slice(arrow.index! + arrow[0].length, rightEnd).trim().replace(/;$/, ""),
        label: arrow[2]?.trim(),
        dashed: arrow[1] === "-.->"
      };
    });
  }

  private parseEndpoint(raw: string): Omit<DiagramNode, "x" | "y" | "width" | "height"> {
    const text = raw.trim().replace(/;$/, "");
    const classMatch = text.match(/:::\s*([A-Za-z0-9_-]+)/);
    const withoutClass = text.replace(/:::\s*[A-Za-z0-9_-]+/g, "").trim();
    const nodeMatch = withoutClass.match(/^([A-Za-z0-9_-]+)(?:\[(.+?)\]|\((.+?)\)|\{(.+?)\})?$/);
    if (!nodeMatch) throw new Error(`Unsupported flowchart statement: ${raw}`);
    const id = nodeMatch[1];
    const label = nodeMatch[2] ?? nodeMatch[3] ?? nodeMatch[4] ?? id;
    return { id, label, classes: classMatch ? [classMatch[1]] : [] };
  }

  private upsertNode(
    nodeMap: Map<string, Omit<DiagramNode, "x" | "y" | "width" | "height">>,
    node: Omit<DiagramNode, "x" | "y" | "width" | "height">
  ): void {
    const existing = nodeMap.get(node.id);
    nodeMap.set(node.id, {
      id: node.id,
      label: existing?.label && existing.label !== node.id ? existing.label : node.label,
      classes: [...new Set([...(existing?.classes ?? []), ...node.classes])]
    });
  }

  private layout(
    nodes: Array<Omit<DiagramNode, "x" | "y" | "width" | "height">>,
    edges: DiagramEdge[],
    direction: DiagramAst["direction"]
  ): DiagramNode[] {
    const metrics = {
      padding: 40,
      nodeHeight: 88,
      minHorizontalGap: 80,
      minVerticalGap: 60,
      layerGap: 180,
      observabilityGap: 96
    };

    const dims = new Map(nodes.map((node) => [node.id, this.nodeDimensions(node.label)]));
    const maxNodeWidth = Math.max(...[...dims.values()].map((d) => d.width), 132);

    const horizontal = direction === "LR" || direction === "RL";
    if (!horizontal) {
      return nodes.map((node, index) => ({
        ...node,
        ...dims.get(node.id)!,
        x: metrics.padding,
        y: metrics.padding + index * (metrics.nodeHeight + metrics.minVerticalGap)
      }));
    }

    const nodeIds = new Set(nodes.map((node) => node.id));
    const order = new Map(nodes.map((node, index) => [node.id, index]));
    const primaryEdges = edges.filter((edge) => !edge.dashed && nodeIds.has(edge.from) && nodeIds.has(edge.to));
    const dashedEdges = edges.filter((edge) => edge.dashed && nodeIds.has(edge.from) && nodeIds.has(edge.to));
    const incomingPrimary = this.groupEdges(primaryEdges, "to");
    const incomingDashed = this.groupEdges(dashedEdges, "to");
    const observability = new Set(
      nodes
        .filter((node) => !incomingPrimary.has(node.id) && (incomingDashed.get(node.id)?.length ?? 0) > 0)
        .map((node) => node.id)
    );
    const primaryNodes = nodes.filter((node) => !observability.has(node.id));
    const primaryNodeIds = new Set(primaryNodes.map((node) => node.id));
    const primaryLayoutEdges = primaryEdges.filter((edge) => primaryNodeIds.has(edge.from) && primaryNodeIds.has(edge.to));
    const rank = new Map(primaryNodes.map((node) => [node.id, 0]));
    const primaryIncoming = this.groupEdges(primaryLayoutEdges, "to");
    const primaryOutgoing = this.groupEdges(primaryLayoutEdges, "from");

    // BFS longest-path rank assignment (MAX_RANK caps cycles to prevent infinite loop)
    const MAX_RANK = primaryNodes.length;
    const bfsQueue = primaryNodes.filter((node) => (primaryIncoming.get(node.id)?.length ?? 0) === 0).map((node) => node.id);
    let bfsIndex = 0;
    while (bfsIndex < bfsQueue.length) {
      const id = bfsQueue[bfsIndex++];
      const currentRank = rank.get(id) ?? 0;
      if (currentRank >= MAX_RANK) continue;
      for (const edge of primaryOutgoing.get(id) ?? []) {
        const existingRank = rank.get(edge.to) ?? -1;
        if (existingRank <= currentRank) {
          rank.set(edge.to, currentRank + 1);
          bfsQueue.push(edge.to);
        }
      }
    }

    const layers = new Map<number, Array<Omit<DiagramNode, "x" | "y" | "width" | "height">>>();
    for (const node of primaryNodes) {
      const nodeRank = rank.get(node.id) ?? 0;
      layers.set(nodeRank, [...(layers.get(nodeRank) ?? []), node]);
    }

    const sortedRanks = [...layers.keys()].sort((a, b) => a - b);
    const maxRank = Math.max(...sortedRanks, 0);
    const layerCount = maxRank + 1;
    const columnGaps = Array.from({ length: Math.max(layerCount - 1, 0) }, () => metrics.layerGap);
    for (const edge of primaryLayoutEdges) {
      const fromRank = rank.get(edge.from) ?? 0;
      const toRank = rank.get(edge.to) ?? fromRank + 1;
      if (toRank !== fromRank + 1) continue;
      const labelGap = edge.label ? edge.label.length * 7 : 0;
      columnGaps[fromRank] = Math.max(columnGaps[fromRank], metrics.minHorizontalGap, labelGap);
    }

    const layerX = new Map<number, number>();
    layerX.set(0, metrics.padding);
    for (let layer = 1; layer < layerCount; layer += 1) {
      layerX.set(layer, (layerX.get(layer - 1) ?? metrics.padding) + maxNodeWidth + (columnGaps[layer - 1] ?? metrics.layerGap));
    }

    const rowPitch = metrics.nodeHeight + metrics.minVerticalGap;
    const maxPrimaryLayerSize = Math.max(...[...layers.values()].map((layer) => layer.length), 1);
    const primaryHeight = maxPrimaryLayerSize * metrics.nodeHeight + (maxPrimaryLayerSize - 1) * metrics.minVerticalGap;
    const positioned = new Map<string, DiagramNode>();

    for (const nodeRank of sortedRanks) {
      const layer = [...(layers.get(nodeRank) ?? [])].sort((a, b) => {
        const medianDelta = this.parentMedian(a.id, primaryLayoutEdges, positioned) - this.parentMedian(b.id, primaryLayoutEdges, positioned);
        return medianDelta || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
      });
      const layerHeight = layer.length * metrics.nodeHeight + Math.max(layer.length - 1, 0) * metrics.minVerticalGap;
      const yOffset = metrics.padding + (primaryHeight - layerHeight) / 2;
      layer.forEach((node, index) => {
        const nodeDim = dims.get(node.id)!;
        positioned.set(node.id, {
          ...node,
          width: nodeDim.width,
          height: nodeDim.height,
          x: layerX.get(nodeRank) ?? metrics.padding,
          y: yOffset + index * rowPitch
        });
      });
    }

    const observabilityNodes = nodes
      .filter((node) => observability.has(node.id))
      .sort((a, b) => this.averageSourceRank(a.id, dashedEdges, rank) - this.averageSourceRank(b.id, dashedEdges, rank) || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    const observabilityY = metrics.padding + primaryHeight + metrics.observabilityGap;
    const usedObservationX: number[] = [];
    const obsMetrics = { padding: metrics.padding, nodeWidth: maxNodeWidth, layerGap: metrics.layerGap };

    for (const node of observabilityNodes) {
      const averageRank = this.averageSourceRank(node.id, dashedEdges, rank);
      let x = this.interpolateLayerX(averageRank, layerX, obsMetrics);
      x = this.avoidHorizontalOverlap(x, usedObservationX, maxNodeWidth + metrics.minHorizontalGap);
      usedObservationX.push(x);
      const nodeDim = dims.get(node.id)!;
      positioned.set(node.id, {
        ...node,
        width: nodeDim.width,
        height: nodeDim.height,
        x,
        y: observabilityY
      });
    }

    if (direction === "RL") {
      const maxX = Math.max(...[...positioned.values()].map((node) => node.x), metrics.padding);
      for (const node of positioned.values()) {
        node.x = metrics.padding + maxX - node.x;
      }
    }

    return nodes.map((node) => positioned.get(node.id)).filter((node): node is DiagramNode => Boolean(node));
  }

  private groupEdges(edges: DiagramEdge[], key: "from" | "to"): Map<string, DiagramEdge[]> {
    const grouped = new Map<string, DiagramEdge[]>();
    for (const edge of edges) {
      grouped.set(edge[key], [...(grouped.get(edge[key]) ?? []), edge]);
    }
    return grouped;
  }

  private averageSourceRank(id: string, edges: DiagramEdge[], ranks: Map<string, number>): number {
    const sourceRanks = edges.filter((edge) => edge.to === id).map((edge) => ranks.get(edge.from)).filter((nodeRank): nodeRank is number => nodeRank !== undefined);
    if (!sourceRanks.length) return 0;
    return sourceRanks.reduce((sum, nodeRank) => sum + nodeRank, 0) / sourceRanks.length;
  }

  private interpolateLayerX(rank: number, layerX: Map<number, number>, metrics: { padding: number; nodeWidth: number; layerGap: number }): number {
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    const lowerX = layerX.get(lower) ?? metrics.padding + lower * (metrics.nodeWidth + metrics.layerGap);
    const upperX = layerX.get(upper) ?? metrics.padding + upper * (metrics.nodeWidth + metrics.layerGap);
    return lowerX + (upperX - lowerX) * (rank - lower);
  }

  private avoidHorizontalOverlap(x: number, usedX: number[], minDistance: number): number {
    let nextX = x;
    for (const previousX of usedX.sort((a, b) => a - b)) {
      if (nextX < previousX + minDistance) nextX = previousX + minDistance;
    }
    return nextX;
  }

  private parentMedian(id: string, edges: DiagramEdge[], positioned: Map<string, DiagramNode>): number {
    const parents = edges
      .filter((edge) => edge.to === id)
      .map((edge) => positioned.get(edge.from))
      .filter((node): node is DiagramNode => Boolean(node))
      .map((node) => node.y + node.height / 2)
      .sort((a, b) => a - b);
    if (!parents.length) return Number.MAX_SAFE_INTEGER;
    return parents[Math.floor(parents.length / 2)];
  }
}
