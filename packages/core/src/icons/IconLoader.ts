/** Loads icon SVGs from the user cache (cloud packs) or bundled generic pack. */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { resolveCanonicalIcon } from "./CanonicalIcons";
import {
  bundledIconManifestCandidates,
  iconManifestPath,
  isResolvableIconPack,
  readIconManifest
} from "./IconPacks";

export class IconLoader {
  async load(className: string): Promise<string | undefined> {
    const [pack, ...serviceParts] = className.split("-");
    const service = serviceParts.join("-");
    if (!isResolvableIconPack(pack) || !service) return undefined;

    for (const manifestPath of this.manifestCandidates(pack)) {
      try {
        const manifest = await readIconManifest(manifestPath);
        const iconPath = resolveCanonicalIcon(pack, service, manifest.icons);
        if (!iconPath) continue;
        return await readFile(join(dirname(manifestPath), iconPath), "utf8");
      } catch {
        continue;
      }
    }

    if (pack !== "generic") {
      console.warn(`[diagra] icon not found: ${pack}-${service}. Run: diagra icons install ${pack}`);
    }
    return this.generatedFallback(pack, service);
  }

  private manifestCandidates(pack: string): string[] {
    if (pack === "generic") return bundledIconManifestCandidates(pack);
    return [iconManifestPath(pack)];
  }

  private generatedFallback(pack: string, service: string): string {
    const colors: Record<string, string> = {
      aws: "#FF9900",
      gcp: "#4285F4",
      azure: "#0078D4",
      generic: "#64748B"
    };
    const label = service.slice(0, 2).toUpperCase();
    return `<svg viewBox="0 0 32 32" role="img" aria-label="${pack}-${service}"><rect x="3" y="3" width="26" height="26" rx="6" fill="${colors[pack] ?? "#64748B"}"/><text x="16" y="20" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#fff">${label}</text></svg>`;
  }
}
