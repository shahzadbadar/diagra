import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bundledIconManifestPath,
  iconCacheDir,
  iconManifestPath,
  IconLoader,
  IconResolver,
  readIconManifest
} from "../src";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("icon packs", () => {
  it("resolves bundled generic icons", async () => {
    const icons = await new IconResolver().resolve({
      type: "flowchart",
      direction: "LR",
      nodes: [{ id: "db", label: "Database", classes: ["generic-database"], x: 0, y: 0, width: 120, height: 84 }],
      edges: [],
      subgraphs: []
    });

    expect(icons.get("db")).toContain(`aria-label="database"`);
  });

  it("falls back gracefully when a cloud icon is missing", async () => {
    const home = await mkdtemp(join(tmpdir(), "diagra-icons-home-"));
    process.env.HOME = home;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const svg = await new IconLoader().load("aws-lambda");

    expect(svg).toContain(`aria-label="aws-lambda"`);
    expect(warn).toHaveBeenCalledWith("[diagra] icon not found: aws-lambda. Run: diagra icons install aws");
  });

  it("parses bundled generic manifests", async () => {
    const manifest = await readIconManifest(bundledIconManifestPath("generic"));

    expect(manifest.pack).toBe("generic");
    expect(manifest.license).toBe("MIT");
    expect(manifest.icons.database).toBe("svg/database.svg");
    expect(Object.keys(manifest.icons)).toContain("stream");
  });

  it("generates OS-specific cache paths", () => {
    expect(iconCacheDir("darwin", {}, "/Users/alex")).toBe("/Users/alex/Library/Caches/diagra/icons");
    expect(iconCacheDir("linux", {}, "/home/alex")).toBe("/home/alex/.cache/diagra/icons");
    expect(iconCacheDir("win32", { LOCALAPPDATA: "C:\\Users\\alex\\AppData\\Local" }, "")).toBe(
      "C:\\Users\\alex\\AppData\\Local/diagra/icons"
    );
  });

  it("resolves user-installed cache icons before fallback", async () => {
    const home = await mkdtemp(join(tmpdir(), "diagra-icons-home-"));
    process.env.HOME = home;
    const manifestPath = iconManifestPath("aws");
    await mkdir(join(home, "Library", "Caches", "diagra", "icons", "aws", "svg"), { recursive: true });
    await writeFile(join(home, "Library", "Caches", "diagra", "icons", "aws", "svg", "lambda.svg"), `<svg aria-label="cached-lambda"></svg>`);
    await writeFile(
      manifestPath,
      JSON.stringify({ pack: "aws", source: "test", license: "test", icons: { lambda: "svg/lambda.svg" } })
    );

    await expect(new IconLoader().load("aws-lambda")).resolves.toContain("cached-lambda");
  });

  it("resolves canonical aliases from installed aws cache manifests", async () => {
    const home = await mkdtemp(join(tmpdir(), "diagra-icons-home-"));
    process.env.HOME = home;
    const manifestPath = iconManifestPath("aws");
    const svgDir = join(home, "Library", "Caches", "diagra", "icons", "aws", "svg");
    await mkdir(svgDir, { recursive: true });
    await writeFile(join(svgDir, "res-simple-storage-bucket.svg"), `<svg aria-label="cached-s3"></svg>`);
    await writeFile(
      manifestPath,
      JSON.stringify({
        pack: "aws",
        source: "test",
        license: "test",
        icons: { "res-simple-storage-bucket": "svg/res-simple-storage-bucket.svg" }
      })
    );

    await expect(new IconLoader().load("aws-s3")).resolves.toContain("cached-s3");
  });
});
