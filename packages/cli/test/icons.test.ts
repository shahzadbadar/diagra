import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";
import AdmZip from "adm-zip";
import { afterEach, describe, expect, it, vi } from "vitest";
import { iconsCommand, isJunkZipEntry, isValidSvgBuffer } from "../src/commands/icons";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("icons command", () => {
  it("lists bundled generic icons", async () => {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line = "") => lines.push(String(line)));

    await iconsCommand().parseAsync(["node", "diagra", "list", "--pack", "generic"]);

    expect(lines).toContain("generic-database");
    expect(lines).toContain("generic-stream");
  });

  it("prints status for bundled and cache icon packs", async () => {
    const home = await mkdtemp(join(tmpdir(), "diagra-cli-home-"));
    process.env.HOME = home;
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line = "") => lines.push(String(line)));

    await iconsCommand().parseAsync(["node", "diagra", "status"]);

    expect(lines).toContain("generic: installed");
    expect(lines).toContain("aws: not installed");
    expect(lines.some((line) => line.includes("AWS Architecture Icons"))).toBe(true);
  });

  it("skips macOS metadata sidecars when installing from zip", async () => {
    const home = await mkdtemp(join(tmpdir(), "diagra-cli-home-"));
    process.env.HOME = home;
    const workDir = await mkdtemp(join(tmpdir(), "diagra-cli-zip-"));
    const zipPath = join(workDir, "aws.zip");
    const goodSvg = Buffer.from(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" aria-label="lambda"></svg>`);
    const badSvg = Buffer.from([0, 5, 22, 7, 0, 2, 0, 0, 0x4d, 0x61, 0x63, 0x20, 0x4f, 0x53, 0x20, 0x58]);

    const zip = new AdmZip();
    zip.addFile("Architecture-Service-Icons/Arch_Compute/48/Arch_AWS-Lambda_48.svg", goodSvg);
    zip.addFile("__MACOSX/Architecture-Service-Icons/Arch_Compute/48/._Arch_AWS-Lambda_48.svg", badSvg);
    zip.writeZip(zipPath);

    vi.spyOn(console, "log").mockImplementation(() => {});
    await iconsCommand().parseAsync(["node", "diagra", "install", "aws", "--yes", "--from", zipPath]);

    const installed = await readFile(join(home, "Library/Caches/diagra/icons/aws/svg/lambda.svg"), "utf8");
    expect(installed).toContain('aria-label="lambda"');
    expect(installed).not.toContain("Mac OS X");
  });

  it("detects junk zip entries and invalid svg buffers", () => {
    expect(isJunkZipEntry("__MACOSX/foo/._Arch_AWS-Lambda_48.svg")).toBe(true);
    expect(isJunkZipEntry("Architecture-Service-Icons/Arch_AWS-Lambda_48.svg")).toBe(false);
    expect(isValidSvgBuffer(Buffer.from("<svg></svg>"))).toBe(true);
    expect(isValidSvgBuffer(Buffer.from([0, 5, 22, 7]))).toBe(false);
  });

  it("installs real aws icons from the official archive when available", async () => {
    const archive = "/tmp/diagra-aws-test/aws.zip";
    if (!existsSync(archive)) return;

    const home = await mkdtemp(join(tmpdir(), "diagra-cli-home-"));
    process.env.HOME = home;
    vi.spyOn(console, "log").mockImplementation(() => {});
    await iconsCommand().parseAsync(["node", "diagra", "install", "aws", "--yes", "--from", archive]);

    const installed = await readFile(join(home, "Library/Caches/diagra/icons/aws/svg/lambda.svg"), "utf8");
    expect(installed.trimStart().startsWith("<")).toBe(true);
    expect(installed).toContain("svg");
  });
});
