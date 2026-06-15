import { DirectiveParser } from "./DirectiveParser";
import type { DiagramAst, DiagramEdge, DiagramNode, DiagramStyle, DiagramSubgraph, ParsedDiagram } from "../types";

type MermaidParserModule = {
  parse?: (diagramType: string, text: string) => unknown | Promise<unknown>;
};

type BoxLike = { x: number; y: number; width: number; height: number };

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
    const nodeStyles = new Map<string, DiagramStyle>();
    const edgeStyles = new Map<number | "default", DiagramStyle>();
    const subgraphMap = new Map<string, Omit<DiagramSubgraph, "x" | "y" | "width" | "height"> & { nodeIds: string[] }>();
    const nodeParentMap = new Map<string, string | undefined>();
    const subgraphStack: string[] = [];
    const edges: DiagramEdge[] = [];

    for (const line of lines.slice(1)) {
      if (line.startsWith("%%")) continue;
      const subgraph = this.parseSubgraphStart(line);
      if (subgraph) {
        subgraphMap.set(subgraph.id, {
          ...subgraph,
          parentId: subgraphStack.at(-1),
          nodeIds: [...(subgraphMap.get(subgraph.id)?.nodeIds ?? [])]
        });
        subgraphStack.push(subgraph.id);
        continue;
      }
      if (/^end\s*;?$/i.test(line)) {
        subgraphStack.pop();
        continue;
      }
      const nodeStyle = this.parseNodeStyle(line);
      if (nodeStyle) {
        nodeStyles.set(nodeStyle.id, nodeStyle.style);
        continue;
      }
      const edgeStyle = this.parseEdgeStyle(line);
      if (edgeStyle) {
        edgeStyles.set(edgeStyle.index, edgeStyle.style);
        continue;
      }
      const parsedEdges = this.parseEdges(line);
      if (parsedEdges.length > 0) {
        for (const edge of parsedEdges) {
          const left = this.parseEndpoint(edge.left);
          const right = this.parseEndpoint(edge.right);
          if (!subgraphMap.has(left.id)) this.upsertNode(nodeMap, left);
          if (!subgraphMap.has(right.id)) this.upsertNode(nodeMap, right);
          this.assignNodeToSubgraph(subgraphMap, nodeParentMap, subgraphStack, left.id);
          this.assignNodeToSubgraph(subgraphMap, nodeParentMap, subgraphStack, right.id);
          edges.push({ id: `edge-${edges.length + 1}`, from: left.id, to: right.id, label: edge.label, dashed: edge.dashed });
        }
      } else {
        const node = this.parseEndpoint(line);
        this.upsertNode(nodeMap, node);
        this.assignNodeToSubgraph(subgraphMap, nodeParentMap, subgraphStack, node.id);
      }
    }

    for (const [id, style] of nodeStyles) {
      const node = nodeMap.get(id);
      const subgraph = subgraphMap.get(id);
      if (node) nodeMap.set(id, { ...node, style: { ...node.style, ...style } });
      if (subgraph) subgraphMap.set(id, { ...subgraph, style: { ...subgraph.style, ...style } });
    }
    const defaultEdgeStyle = edgeStyles.get("default");
    for (const [index, style] of edgeStyles) {
      if (index === "default") continue;
      const edge = edges[index];
      if (edge) edge.style = { ...defaultEdgeStyle, ...style };
    }
    if (defaultEdgeStyle) {
      for (const edge of edges) edge.style = { ...defaultEdgeStyle, ...edge.style };
    }

    const cycleNodes = this.detectCycle([...nodeMap.values()], edges);
    if (cycleNodes.length > 0) {
      console.warn(`[diagra] Cyclic edges detected (nodes: ${cycleNodes.join(", ")}). Back-edges will be excluded from layout.`);
    }

    const { nodes, subgraphs } = this.layoutHierarchy([...nodeMap.values()], [...subgraphMap.values()], edges, direction, nodeParentMap);
    return { type: "flowchart", direction, nodes, edges, subgraphs };
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

  private parseNodeStyle(raw: string): { id: string; style: DiagramStyle } | undefined {
    const match = raw.match(/^style\s+([A-Za-z0-9_-]+)\s+(.+?)\s*;?$/i);
    if (!match) return undefined;
    const style = this.parseStyleDeclarations(match[2]);
    return Object.keys(style).length ? { id: match[1], style } : undefined;
  }

  private parseEdgeStyle(raw: string): { index: number | "default"; style: DiagramStyle } | undefined {
    const match = raw.match(/^linkStyle\s+(\d+|default)\s+(.+?)\s*;?$/i);
    if (!match) return undefined;
    const style = this.parseStyleDeclarations(match[2]);
    if (!Object.keys(style).length) return undefined;
    return { index: match[1].toLowerCase() === "default" ? "default" : Number.parseInt(match[1], 10), style };
  }

  private parseStyleDeclarations(raw: string): DiagramStyle {
    const style: DiagramStyle = {};
    for (const declaration of raw.split(",")) {
      const [rawKey, ...rawValue] = declaration.split(":");
      const key = rawKey?.trim().toLowerCase();
      const value = rawValue.join(":").trim();
      if (!this.isSafeColor(value)) continue;
      if (key === "fill") style.fill = value;
      if (key === "stroke") style.stroke = value;
      if (key === "color") style.color = value;
    }
    return style;
  }

  private isSafeColor(value: string): boolean {
    return /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value);
  }

  private parseSubgraphStart(raw: string): { id: string; label: string; parentId?: string; style?: DiagramStyle } | undefined {
    const match = raw.match(/^subgraph\s+(.+?)\s*;?$/i);
    if (!match) return undefined;
    const declaration = match[1].trim();
    const idLabel = declaration.match(/^([A-Za-z0-9_-]+)(?:\[(.+?)\]|\((.+?)\)|\{(.+?)\})?$/);
    if (idLabel) {
      const id = idLabel[1];
      return { id, label: idLabel[2] ?? idLabel[3] ?? idLabel[4] ?? id };
    }
    const label = declaration.replace(/^["']|["']$/g, "");
    return { id: this.slugId(label), label };
  }

  private slugId(label: string): string {
    const id = label.trim().replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
    return id || "subgraph";
  }

  private assignNodeToSubgraph(
    subgraphMap: Map<string, Omit<DiagramSubgraph, "x" | "y" | "width" | "height"> & { nodeIds: string[] }>,
    nodeParentMap: Map<string, string | undefined>,
    subgraphStack: string[],
    nodeId: string
  ): void {
    const directParent = subgraphStack.at(-1);
    if (!directParent) return;
    const subgraph = subgraphMap.get(directParent);
    if (!subgraph || subgraph.nodeIds.includes(nodeId)) return;
    subgraph.nodeIds.push(nodeId);
    nodeParentMap.set(nodeId, directParent);
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
    direction: DiagramAst["direction"],
    sizeOverrides: Map<string, { width: number; height: number }> = new Map()
  ): DiagramNode[] {
    const metrics = {
      padding: 40,
      nodeHeight: 88,
      minHorizontalGap: 80,
      minVerticalGap: 60,
      layerGap: 180,
      observabilityGap: 96
    };

    const dims = new Map(
      nodes.map((node) => [
        node.id,
        sizeOverrides.get(node.id) ?? this.nodeDimensions(node.label)
      ])
    );
    const maxNodeWidth = Math.max(...[...dims.values()].map((d) => d.width), 132);

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
    const primaryLayoutEdges = primaryEdges.filter((edge) => {
      if (!primaryNodeIds.has(edge.from) || !primaryNodeIds.has(edge.to)) return false;
      const normalIncoming = (incomingPrimary.get(edge.to) ?? []).some((incoming) => incoming.label?.toLowerCase() !== "replicate");
      return edge.label?.toLowerCase() !== "replicate" || !normalIncoming;
    });
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

    const horizontal = direction === "LR" || direction === "RL";
    if (!horizontal) {
      const positioned = this.layoutVertical(
        nodes,
        primaryLayoutEdges,
        dashedEdges,
        observability,
        layers,
        rank,
        order,
        dims,
        metrics,
        direction
      );
      return nodes.map((node) => positioned.get(node.id)).filter((node): node is DiagramNode => Boolean(node));
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

  private layoutSubgraphs(
    nodes: DiagramNode[],
    subgraphs: Array<Omit<DiagramSubgraph, "x" | "y" | "width" | "height"> & { nodeIds: string[] }>
  ): DiagramSubgraph[] {
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const subgraphById = new Map(subgraphs.map((subgraph) => [subgraph.id, subgraph]));
    const childrenByParent = new Map<string, string[]>();

    for (const subgraph of subgraphs) {
      if (!subgraph.parentId) continue;
      childrenByParent.set(subgraph.parentId, [...(childrenByParent.get(subgraph.parentId) ?? []), subgraph.id]);
    }

    const cache = new Map<string, DiagramSubgraph>();
    const levelCache = new Map<string, number>();

    const levelFor = (subgraphId: string): number => {
      const cached = levelCache.get(subgraphId);
      if (cached !== undefined) return cached;
      const subgraph = subgraphById.get(subgraphId);
      if (!subgraph?.parentId) {
        levelCache.set(subgraphId, 0);
        return 0;
      }
      const level = 1 + levelFor(subgraph.parentId);
      levelCache.set(subgraphId, level);
      return level;
    };

    const compute = (subgraphId: string, trail = new Set<string>()): DiagramSubgraph | undefined => {
      const cached = cache.get(subgraphId);
      if (cached) return cached;
      if (trail.has(subgraphId)) return undefined;

      const source = subgraphById.get(subgraphId);
      if (!source) return undefined;

      trail.add(subgraphId);
      const memberNodes = source.nodeIds
        .map((id) => nodesById.get(id))
        .filter((node): node is DiagramNode => Boolean(node));
      const childBoxes = (childrenByParent.get(subgraphId) ?? [])
        .map((childId) => compute(childId, trail))
        .filter((child): child is DiagramSubgraph => Boolean(child));
      const bounds = [...memberNodes, ...childBoxes];

      if (!bounds.length) {
        trail.delete(subgraphId);
        return undefined;
      }

      const minX = Math.min(...bounds.map((item) => item.x));
      const minY = Math.min(...bounds.map((item) => item.y));
      const maxX = Math.max(...bounds.map((item) => item.x + item.width));
      const maxY = Math.max(...bounds.map((item) => item.y + item.height));
      const level = levelFor(subgraphId);
      const paddingX = level === 0 ? 22 : level === 1 ? 20 : 18;
      const paddingTop = level === 0 ? 42 : level === 1 ? 38 : 34;
      const paddingBottom = 20;
      const x = Math.max(8, minX - paddingX);
      const y = Math.max(8, minY - paddingTop);
      const computed = {
        ...source,
        nodeIds: [...source.nodeIds],
        x,
        y,
        width: maxX - x + paddingX,
        height: maxY - y + paddingBottom
      };

      cache.set(subgraphId, computed);
      trail.delete(subgraphId);
      return computed;
    };

    for (const subgraph of subgraphs) {
      compute(subgraph.id);
    }

    return [...cache.values()].sort((a, b) => {
      const levelDelta = levelFor(a.id) - levelFor(b.id);
      if (levelDelta) return levelDelta;
      return (a.y - b.y) || (a.x - b.x) || (b.width * b.height - a.width * a.height);
    });
  }

  private layoutHierarchy(
    nodes: Array<Omit<DiagramNode, "x" | "y" | "width" | "height">>,
    subgraphs: Array<Omit<DiagramSubgraph, "x" | "y" | "width" | "height"> & { nodeIds: string[] }>,
    edges: DiagramEdge[],
    direction: DiagramAst["direction"],
    nodeParentMap: Map<string, string | undefined>
  ): { nodes: DiagramNode[]; subgraphs: DiagramSubgraph[] } {
    const ROOT = "__root__";
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const subgraphById = new Map(subgraphs.map((subgraph) => [subgraph.id, subgraph]));
    const childrenByParent = new Map<string, string[]>();
    const directNodesByParent = new Map<string, string[]>();
    const ancestorCache = new Map<string, string[]>();

    const parentKey = (id?: string): string => id ?? ROOT;

    for (const node of nodes) {
      const key = parentKey(nodeParentMap.get(node.id));
      directNodesByParent.set(key, [...(directNodesByParent.get(key) ?? []), node.id]);
    }
    for (const subgraph of subgraphs) {
      const key = parentKey(subgraph.parentId);
      childrenByParent.set(key, [...(childrenByParent.get(key) ?? []), subgraph.id]);
    }

    const ancestorChain = (parentId?: string): string[] => {
      const cached = ancestorCache.get(parentId ?? ROOT);
      if (cached) return cached;
      const chain: string[] = [];
      let current = parentId;
      while (current) {
        chain.unshift(current);
        current = subgraphById.get(current)?.parentId;
      }
      ancestorCache.set(parentId ?? ROOT, chain);
      return chain;
    };

    const immediateChild = (containerId: string | undefined, endpointId: string): string | undefined => {
      if (nodeById.has(endpointId)) {
        const parentId = nodeParentMap.get(endpointId);
        const chain = ancestorChain(parentId);
        if (!containerId) return chain[0] ?? endpointId;
        if (parentId === containerId) return endpointId;
        const index = chain.indexOf(containerId);
        if (index === -1) return undefined;
        return chain[index + 1] ?? endpointId;
      }

      const subgraph = subgraphById.get(endpointId);
      if (!subgraph) return undefined;
      const parentId = subgraph.parentId;
      const chain = ancestorChain(parentId);
      if (!containerId) return chain[0] ?? endpointId;
      if (parentId === containerId) return endpointId;
      const index = chain.indexOf(containerId);
      if (index === -1) return undefined;
      return chain[index + 1] ?? endpointId;
    };

    const boundsFor = (items: BoxLike[]): { x: number; y: number; width: number; height: number } => {
      const minX = Math.min(...items.map((item) => item.x));
      const minY = Math.min(...items.map((item) => item.y));
      const maxX = Math.max(...items.map((item) => item.x + item.width));
      const maxY = Math.max(...items.map((item) => item.y + item.height));
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    };

    const shiftSubtree = (result: { nodes: DiagramNode[]; subgraphs: DiagramSubgraph[]; box?: DiagramSubgraph }, dx: number, dy: number): void => {
      for (const node of result.nodes) {
        node.x += dx;
        node.y += dy;
      }
      for (const subgraph of result.subgraphs) {
        subgraph.x += dx;
        subgraph.y += dy;
      }
      if (result.box) {
        result.box.x += dx;
        result.box.y += dy;
      }
    };

    const boxFromSubtree = (
      subgraphId: string,
      subtree: { nodes: DiagramNode[]; subgraphs: DiagramSubgraph[] }
    ): DiagramSubgraph | undefined => {
      const source = subgraphById.get(subgraphId);
      const items: BoxLike[] = [...subtree.nodes, ...subtree.subgraphs].map(({ x, y, width, height }) => ({ x, y, width, height }));
      if (!source || !items.length) return undefined;
      const level = this.nestingLevel(subgraphId, subgraphById);
      const paddingX = level === 0 ? 22 : level === 1 ? 20 : 18;
      const paddingTop = level === 0 ? 42 : level === 1 ? 38 : 34;
      const paddingBottom = 20;
      const bounds = boundsFor(items);
      return {
        ...source,
        nodeIds: [...source.nodeIds],
        x: Math.max(8, bounds.x - paddingX),
        y: Math.max(8, bounds.y - paddingTop),
        width: bounds.width + paddingX * 2,
        height: bounds.height + paddingTop + paddingBottom
      };
    };

    const layoutContainer = (containerId?: string): { nodes: DiagramNode[]; subgraphs: DiagramSubgraph[]; box?: DiagramSubgraph } => {
      const childNodeIds = directNodesByParent.get(parentKey(containerId)) ?? [];
      const childSubgraphIds = childrenByParent.get(parentKey(containerId)) ?? [];
      const childResults = childSubgraphIds.map((subgraphId) => ({
        subgraph: subgraphById.get(subgraphId)!,
        result: layoutContainer(subgraphId)
      }));

      const localItems: Array<Omit<DiagramNode, "x" | "y" | "width" | "height">> = [
        ...childNodeIds.map((nodeId) => nodeById.get(nodeId)!),
        ...childResults.map(({ subgraph }) => ({
          id: subgraph.id,
          label: subgraph.label,
          classes: [] as string[]
        }))
      ];
      const sizeOverrides = new Map<string, { width: number; height: number }>(
        childResults.map(({ subgraph, result }) => [
          subgraph.id,
          { width: result.box?.width ?? 0, height: result.box?.height ?? 0 }
        ])
      );

      const localItemIds = new Set(localItems.map((item) => item.id));
      const localEdges = edges
        .map((edge) => ({
          ...edge,
          from: immediateChild(containerId, edge.from),
          to: immediateChild(containerId, edge.to)
        }))
        .filter((edge) => Boolean(edge.from && edge.to && edge.from !== edge.to && localItemIds.has(edge.from) && localItemIds.has(edge.to)))
        .map((edge) => ({ ...edge, from: edge.from!, to: edge.to! }));

      const positioned = new Map(this.layout(localItems, localEdges, direction, sizeOverrides).map((item) => [item.id, item]));
      const nodesOut: DiagramNode[] = childNodeIds
        .map((nodeId) => positioned.get(nodeId))
        .filter((node): node is DiagramNode => Boolean(node));
      const subgraphsOut: DiagramSubgraph[] = [];

      for (const { subgraph, result } of childResults) {
        const childBox = result.box ?? boxFromSubtree(subgraph.id, result);
        const placed = positioned.get(subgraph.id);
        if (!placed || !childBox) continue;
        if (!result.box) result.box = childBox;
        const dx = placed.x - childBox.x;
        const dy = placed.y - childBox.y;
        shiftSubtree(result, dx, dy);
        nodesOut.push(...result.nodes);
        subgraphsOut.push(...result.subgraphs);
      }

      const level = containerId ? this.nestingLevel(containerId, subgraphById) : 0;
      const headerSpace = containerId ? (level === 0 ? 26 : level === 1 ? 22 : 18) : 0;
      if (headerSpace) {
        for (const node of nodesOut) node.y += headerSpace;
        for (const subgraph of subgraphsOut) subgraph.y += headerSpace;
        for (const { result } of childResults) {
          if (result.box) result.box.y += headerSpace;
        }
      }

      const childBoxes: DiagramSubgraph[] = childResults
        .map(({ result }) => result.box)
        .filter((box): box is DiagramSubgraph => Boolean(box));
      const localBoxes: BoxLike[] = [
        ...nodesOut,
        ...childBoxes.map(({ x, y, width, height }) => ({ x, y, width, height }))
      ];
      if (!localBoxes.length) {
        return { nodes: nodesOut, subgraphs: subgraphsOut };
      }

      const paddingX = level === 0 ? 22 : level === 1 ? 20 : 18;
      const paddingTop = level === 0 ? 42 : level === 1 ? 38 : 34;
      const paddingBottom = 20;
      const bounds = boundsFor(localBoxes);
      const box = containerId
        ? {
            id: containerId,
            label: subgraphById.get(containerId)?.label ?? containerId,
            nodeIds: [...(subgraphById.get(containerId)?.nodeIds ?? [])],
            parentId: subgraphById.get(containerId)?.parentId,
            style: subgraphById.get(containerId)?.style,
            x: Math.max(8, bounds.x - paddingX),
            y: Math.max(8, bounds.y - paddingTop),
            width: bounds.width + paddingX * 2,
            height: bounds.height + paddingTop + paddingBottom
          }
        : undefined;

      if (box) {
        const dx = box.x - bounds.x;
        const dy = box.y - bounds.y;
        for (const node of nodesOut) {
          node.x += dx;
          node.y += dy;
        }
        for (const subgraph of subgraphsOut) {
          subgraph.x += dx;
          subgraph.y += dy;
        }
      }

      return {
        nodes: nodesOut,
        subgraphs: box ? [...subgraphsOut, box] : subgraphsOut
      };
    };

    const root = layoutContainer(undefined);
    return { nodes: root.nodes, subgraphs: root.subgraphs };
  }

  private nestingLevel(
    subgraphId: string,
    subgraphById: Map<string, Omit<DiagramSubgraph, "x" | "y" | "width" | "height"> & { nodeIds: string[] }>
  ): number {
    let level = 0;
    let current = subgraphById.get(subgraphId)?.parentId;
    while (current) {
      level += 1;
      current = subgraphById.get(current)?.parentId;
    }
    return level;
  }

  private layoutVertical(
    nodes: Array<Omit<DiagramNode, "x" | "y" | "width" | "height">>,
    primaryLayoutEdges: DiagramEdge[],
    dashedEdges: DiagramEdge[],
    observability: Set<string>,
    layers: Map<number, Array<Omit<DiagramNode, "x" | "y" | "width" | "height">>>,
    rank: Map<string, number>,
    order: Map<string, number>,
    dims: Map<string, { width: number; height: number }>,
    metrics: {
      padding: number;
      nodeHeight: number;
      minHorizontalGap: number;
      minVerticalGap: number;
      layerGap: number;
      observabilityGap: number;
    },
    direction: DiagramAst["direction"]
  ): Map<string, DiagramNode> {
    const positioned = new Map<string, DiagramNode>();
    const sortedRanks = [...layers.keys()].sort((a, b) => a - b);
    const rowY = new Map<number, number>();
    let nextY = metrics.padding;

    for (const nodeRank of sortedRanks) {
      rowY.set(nodeRank, nextY);
      const rowHeight = Math.max(...(layers.get(nodeRank) ?? []).map((node) => dims.get(node.id)?.height ?? metrics.nodeHeight), metrics.nodeHeight);
      nextY += rowHeight + metrics.layerGap;
    }

    for (const nodeRank of sortedRanks) {
      const layer = [...(layers.get(nodeRank) ?? [])].sort((a, b) => {
        const medianDelta = this.parentMedianX(a.id, primaryLayoutEdges, positioned) - this.parentMedianX(b.id, primaryLayoutEdges, positioned);
        return medianDelta || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
      });
      const layerWidth =
        layer.reduce((sum, node) => sum + (dims.get(node.id)?.width ?? 120), 0) +
        Math.max(layer.length - 1, 0) * metrics.minHorizontalGap;
      let x = metrics.padding + Math.max(0, (this.maxLayerWidth(layers, dims, metrics) - layerWidth) / 2);
      for (const node of layer) {
        const nodeDim = dims.get(node.id)!;
        positioned.set(node.id, {
          ...node,
          width: nodeDim.width,
          height: nodeDim.height,
          x,
          y: rowY.get(nodeRank) ?? metrics.padding
        });
        x += nodeDim.width + metrics.minHorizontalGap;
      }
    }

    const observabilityNodes = nodes
      .filter((node) => observability.has(node.id))
      .sort((a, b) => this.averageSourceRank(a.id, dashedEdges, rank) - this.averageSourceRank(b.id, dashedEdges, rank) || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    if (observabilityNodes.length) {
      const y = nextY + metrics.observabilityGap;
      let x = metrics.padding;
      for (const node of observabilityNodes) {
        const nodeDim = dims.get(node.id)!;
        positioned.set(node.id, {
          ...node,
          width: nodeDim.width,
          height: nodeDim.height,
          x,
          y
        });
        x += nodeDim.width + metrics.minHorizontalGap;
      }
    }

    if (direction === "BT") {
      const maxY = Math.max(...[...positioned.values()].map((node) => node.y), metrics.padding);
      for (const node of positioned.values()) {
        node.y = metrics.padding + maxY - node.y;
      }
    }

    return positioned;
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

  private parentMedianX(id: string, edges: DiagramEdge[], positioned: Map<string, DiagramNode>): number {
    const parents = edges
      .filter((edge) => edge.to === id)
      .map((edge) => positioned.get(edge.from))
      .filter((node): node is DiagramNode => Boolean(node))
      .map((node) => node.x + node.width / 2)
      .sort((a, b) => a - b);
    if (!parents.length) return Number.MAX_SAFE_INTEGER;
    return parents[Math.floor(parents.length / 2)];
  }

  private maxLayerWidth(
    layers: Map<number, Array<Omit<DiagramNode, "x" | "y" | "width" | "height">>>,
    dims: Map<string, { width: number; height: number }>,
    metrics: { minHorizontalGap: number }
  ): number {
    return Math.max(
      ...[...layers.values()].map((layer) =>
        layer.reduce((sum, node) => sum + (dims.get(node.id)?.width ?? 120), 0) +
        Math.max(layer.length - 1, 0) * metrics.minHorizontalGap
      ),
      0
    );
  }
}
