import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { IconPackName } from "../types";

interface IconManifest {
  prefix: string;
  icons: Record<string, string>;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

export class IconLoader {
  async load(className: string): Promise<string | undefined> {
    const [pack, ...serviceParts] = className.split("-");
    const service = serviceParts.join("-");
    if (!this.isPack(pack) || !service) return undefined;

    for (const manifestPath of this.manifestCandidates(pack)) {
      try {
        const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as IconManifest;
        const iconPath = manifest.icons[service];
        if (!iconPath) return this.generatedFallback(pack, service);
        return await readFile(join(dirname(manifestPath), iconPath), "utf8");
      } catch {
        continue;
      }
    }

    return this.generatedFallback(pack, service);
  }

  private manifestCandidates(pack: string): string[] {
    return [
      join(process.cwd(), "packages/icons", pack, "manifest.json"),
      join(process.cwd(), "icons", pack, "manifest.json"),
      join(__dirname, "../../../icons", pack, "manifest.json"),
      join(__dirname, "../../icons", pack, "manifest.json")
    ];
  }

  private isPack(value: string): value is Exclude<IconPackName, "none"> {
    return value === "aws" || value === "gcp" || value === "azure" || value === "generic";
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
