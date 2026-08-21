import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { convertMermaidToDiagra, inferIconClass, MermaidConverter } from "../src";

const EVENT_DRIVEN_MMD = await readFile(join(import.meta.dirname, "../../../examples/aws/02-event-driven.mmd"), "utf8");

describe("MermaidConverter", () => {
  it("converts mermaid to diagra with directives and inferred generic icons", async () => {
    const diagra = await convertMermaidToDiagra(EVENT_DRIVEN_MMD, { icons: "generic", theme: "light", animate: "flow" });

    expect(diagra).toContain("%%diagra:theme light");
    expect(diagra).toContain("%%diagra:icons generic");
    expect(diagra).toContain("%%diagra:animate flow");
    expect(diagra).toContain("Orders[Orders Service]:::generic-server");
    expect(diagra).toContain("EventBridge[EventBridge Event Bus]:::generic-event");
    expect(diagra).toContain("SNS[Customer Notification Topic]:::generic-event");
    expect(diagra).toContain("SQS[Fulfillment Queue]:::generic-queue");
    expect(diagra).toContain("CloudWatch[CloudWatch Monitoring]:::generic-monitoring");
  });

  it("infers aws icons when icons directive is aws", async () => {
    const diagra = await convertMermaidToDiagra(EVENT_DRIVEN_MMD, { icons: "aws" });

    expect(diagra).toContain("%%diagra:icons aws");
    expect(diagra).toContain("EmailWorker[Email Lambda Consumer]:::aws-lambda");
    expect(diagra).toContain("EventBridge[EventBridge Event Bus]:::aws-eventbridge");
    expect(diagra).toContain("SQS[Fulfillment Queue]:::aws-sqs");
    expect(diagra).toContain("CloudWatch[CloudWatch Monitoring]:::aws-cloudwatch");
  });

  it("preserves existing icon classes", async () => {
    const source = `flowchart LR
  A[Lambda Worker]:::aws-lambda --> B[Database]`;
    const diagra = await new MermaidConverter().convert(source, { icons: "generic" });

    expect(diagra).toContain("A[Lambda Worker]:::aws-lambda");
    expect(diagra).toContain("B[Database]:::generic-database");
  });

  it("skips icon inference when disabled", async () => {
    const diagra = await convertMermaidToDiagra("flowchart LR\n  A[Orders Service] --> B[Queue]", { inferIcons: false });

    expect(diagra).not.toContain(":::generic-");
    expect(diagra).toContain("A[Orders Service] --> B[Queue]");
  });
});

describe("inferIconClass", () => {
  it("maps common labels to generic icons", () => {
    expect(inferIconClass("Orders DynamoDB Table", "Orders")).toBe("generic-database");
    expect(inferIconClass("Web and Mobile Users", "Users")).toBe("generic-browser");
    expect(inferIconClass("Fulfillment Queue", "SQS")).toBe("generic-queue");
  });

  it("maps aws service names when pack is aws", () => {
    expect(inferIconClass("Order Service Lambda", "Lambda", "aws")).toBe("aws-lambda");
    expect(inferIconClass("EventBridge Event Bus", "EventBridge", "aws")).toBe("aws-eventbridge");
  });
});
