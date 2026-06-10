import { describe, expect, it } from "vitest";
import { AnimationRenderer, Diagra, DiagramParser, DirectiveParser, EdgeRenderer, NodeRenderer } from "../src";

const source = `%%diagra:theme dark
%%diagra:icons aws
%%diagra:animate flow

flowchart LR
  user[User]:::generic-user
  api[API Gateway]:::aws-apigateway
  fn[Lambda]:::aws-lambda
  db[DynamoDB]:::aws-dynamodb
  user --> api
  api --> fn
  fn --> db`;

describe("Diagra", () => {
  it("extracts directives", () => {
    const parsed = new DirectiveParser().parse(source);
    expect(parsed.directives.theme).toBe("dark");
    expect(parsed.directives.animate).toBe("flow");
    expect(parsed.mermaidSource).not.toContain("%%diagra");
  });

  it("renders SVG, HTML, Draw.io, and Mermaid fallback", async () => {
    const result = await new Diagra().render(source);
    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain("--bg: #0F172A");
    expect(result.svg).toContain("animateMotion");
    expect(result.html).toContain("<!doctype html>");
    expect(result.drawio).toContain("<mxfile");
    expect(result.mmd).not.toContain("%%diagra");
    expect(result.mmd).not.toContain(":::aws-lambda");
  });

  it("parses labeled solid and dashed edges", async () => {
    const parsed = await new DiagramParser().parse(`flowchart LR
  A[Source] -->|Request| B[Target]
  B -.->|Metrics| C[Monitor]`);

    expect(parsed.ast.edges).toMatchObject([
      { from: "A", to: "B", label: "Request", dashed: false },
      { from: "B", to: "C", label: "Metrics", dashed: true }
    ]);
  });

  it("lays out branches across vertical lanes", async () => {
    const parsed = await new DiagramParser().parse(`flowchart LR
  A[Source] --> B[Worker]
  B --> C[Fast Path]
  B --> D[Slow Path]
  C --> E[Consumer A]
  D --> F[Consumer B]
  D -.-> G[Monitor]`);

    expect(new Set(parsed.ast.nodes.map((node) => node.y)).size).toBeGreaterThan(1);
    expect(parsed.ast.nodes.find((node) => node.id === "G")?.y).toBeGreaterThan(parsed.ast.nodes.find((node) => node.id === "A")?.y ?? 0);
  });

  it("keeps edge labels readable and observability nodes in a bottom row", async () => {
    const parsed = await new DiagramParser().parse(`flowchart LR
  Client[Client] -->|HTTPS Request| APIGW[API Gateway]
  APIGW --> Lambda[Lambda]
  Lambda --> EventBridge[EventBridge]
  Lambda --> DynamoDB[DynamoDB]
  EventBridge --> SNS[SNS]
  EventBridge --> SQS[SQS]
  APIGW -.->|Trace| XRay[X-Ray]
  Lambda -.->|Logs / Metrics| CloudWatch[CloudWatch]`);

    const nodes = new Map(parsed.ast.nodes.map((node) => [node.id, node]));
    const client = nodes.get("Client");
    const apigw = nodes.get("APIGW");
    const xray = nodes.get("XRay");
    const cloudwatch = nodes.get("CloudWatch");
    const maxPrimaryY = Math.max(...parsed.ast.nodes.filter((node) => node.id !== "XRay" && node.id !== "CloudWatch").map((node) => node.y));

    expect(client && apigw ? apigw.x - (client.x + client.width) : 0).toBeGreaterThanOrEqual("HTTPS Request".length * 7);
    expect(xray?.y).toBeGreaterThan(maxPrimaryY);
    expect(cloudwatch?.y).toBe(xray?.y);
  });

  it("sizes embedded icon SVGs explicitly", () => {
    const svg = new NodeRenderer().render(
      { id: "api", label: "API", classes: ["generic-api"], x: 10, y: 20, width: 120, height: 84 },
      `<svg viewBox="0 0 32 32" role="img"><path d="M0 0h32v32H0z"/></svg>`
    );

    expect(svg).toContain(`<svg x="54" y="32" width="32" height="32" viewBox="0 0 32 32" role="img">`);
    expect(svg).not.toContain(`width="32" height="32"><svg`);
  });

  it("nudges colliding edge labels and keeps labels off nodes", () => {
    const nodes = new Map([
      ["A", { id: "A", label: "A", classes: [], x: 0, y: 0, width: 40, height: 40 }],
      ["B", { id: "B", label: "B", classes: [], x: 160, y: 0, width: 40, height: 40 }]
    ]);
    const svg = new EdgeRenderer().renderAll(
      [
        { id: "edge-1", from: "A", to: "B", label: "First" },
        { id: "edge-2", from: "A", to: "B", label: "Second" }
      ],
      nodes
    );

    const labelYs = [...svg.matchAll(/<text x="[^"]+" y="([^"]+)"/g)].map((match) => Number(match[1]));
    expect(labelYs[1] - labelYs[0]).toBeGreaterThanOrEqual(20);
    expect(svg).not.toContain(`y="12" text-anchor="middle" font-family="var(--font)" font-size="10" font-weight="600" fill="var(--edge-label)">Second</text>`);
  });

  it("skips flow animations for edges shorter than 50px", () => {
    const nodes = new Map([
      ["A", { id: "A", label: "A", classes: [], x: 0, y: 0, width: 40, height: 40 }],
      ["B", { id: "B", label: "B", classes: [], x: 80, y: 0, width: 40, height: 40 }],
      ["C", { id: "C", label: "C", classes: [], x: 260, y: 0, width: 40, height: 40 }]
    ]);
    const svg = new AnimationRenderer().render(
      [
        { id: "short", from: "A", to: "B" },
        { id: "long", from: "A", to: "C" }
      ],
      nodes,
      "flow"
    );

    expect(svg).not.toContain(`#short`);
    expect(svg).toContain(`#long`);
  });
});
