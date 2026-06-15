/**
 * Icon pack paths and manifests.
 * Generic icons are bundled under packages/core/icons/.
 * Cloud packs (aws, azure, gcp) are installed to the per-user cache via the CLI.
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { IconPackName } from "../types";

export type InstallableIconPack = "aws" | "azure" | "gcp";
export type ResolvableIconPack = Exclude<IconPackName, "none">;

export interface IconManifest {
  pack: string;
  license?: string;
  source?: string;
  prefix?: string;
  icons: Record<string, string>;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const bundledIconDirs = [
  resolve(process.cwd(), "packages/core/icons"),
  resolve(process.cwd(), "icons"),
  resolve(__dirname, "../../icons"),
  resolve(__dirname, "../icons")
];
const installablePacks = new Set(["aws", "azure", "gcp"]);
const resolvablePacks = new Set(["aws", "azure", "gcp", "generic"]);

export function iconCacheDir(platform = process.platform, env: NodeJS.ProcessEnv = process.env, home = env.HOME ?? env.USERPROFILE ?? ""): string {
  if (platform === "darwin") return join(home, "Library", "Caches", "diagra", "icons");
  if (platform === "win32") return join(env.LOCALAPPDATA ?? join(home, "AppData", "Local"), "diagra", "icons");
  return join(env.XDG_CACHE_HOME ?? join(home, ".cache"), "diagra", "icons");
}

export function iconPackDir(pack: string, cacheDir = iconCacheDir()): string {
  return join(cacheDir, pack);
}

export function iconManifestPath(pack: string, cacheDir = iconCacheDir()): string {
  return join(iconPackDir(pack, cacheDir), "manifest.json");
}

export function bundledIconManifestPath(pack: string): string {
  return bundledIconManifestCandidates(pack).find((candidate) => existsSync(candidate)) ?? join(bundledIconDirs[0], pack, "manifest.json");
}

export function bundledIconManifestCandidates(pack: string): string[] {
  return bundledIconDirs.map((dir) => join(dir, pack, "manifest.json"));
}

export function isInstallableIconPack(value: string): value is InstallableIconPack {
  return installablePacks.has(value);
}

export function isResolvableIconPack(value: string): value is ResolvableIconPack {
  return resolvablePacks.has(value);
}

export async function readIconManifest(manifestPath: string): Promise<IconManifest> {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as IconManifest;
  if (!manifest || typeof manifest !== "object" || !manifest.icons || typeof manifest.icons !== "object") {
    throw new Error(`Invalid icon manifest: ${manifestPath}`);
  }
  return manifest;
}

export async function listInstalledIconPacks(cacheDir = iconCacheDir()): Promise<IconManifest[]> {
  try {
    const entries = await readdir(cacheDir, { withFileTypes: true });
    const manifests: IconManifest[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        manifests.push(await readIconManifest(iconManifestPath(entry.name, cacheDir)));
      } catch {
        // Ignore malformed or incomplete cache entries.
      }
    }
    return manifests.sort((a, b) => a.pack.localeCompare(b.pack));
  } catch {
    return [];
  }
}

export async function ensureIconPackDir(pack: string, cacheDir = iconCacheDir()): Promise<string> {
  const dir = iconPackDir(pack, cacheDir);
  await mkdir(join(dir, "svg"), { recursive: true });
  return dir;
}

export function hasInstalledIconPack(pack: string, cacheDir = iconCacheDir()): boolean {
  return existsSync(iconManifestPath(pack, cacheDir));
}
