import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { convertCommand } from "../src/commands/convert";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("convert command", () => {
  it("writes a .diagra file with inferred icons", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "diagra-convert-cli-"));
    const input = join(workDir, "flow.mmd");
    const output = join(workDir, "flow.diagra");
    await writeFile(
      input,
      `flowchart LR
  Orders[Orders Service] --> EventBridge[EventBridge Event Bus]`,
      "utf8"
    );

    vi.spyOn(console, "log").mockImplementation(() => {});
    await convertCommand().parseAsync(["node", "diagra", input, "-o", output]);

    const diagra = await readFile(output, "utf8");
    expect(diagra).toContain("%%diagra:icons generic");
    expect(diagra).toContain("Orders[Orders Service]:::generic-server");
    expect(diagra).toContain("EventBridge[EventBridge Event Bus]:::generic-event");

    await rm(workDir, { recursive: true, force: true });
  });
});
