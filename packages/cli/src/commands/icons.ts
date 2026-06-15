import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import AdmZip from "adm-zip";
import { Command } from "commander";
import {
  applyCanonicalAliases,
  bundledIconManifestPath,
  ensureIconPackDir,
  iconCacheDir,
  iconManifestPath,
  isInstallableIconPack,
  readIconManifest,
  type IconManifest,
  type InstallableIconPack
} from "@diagra/core";

const providerInfo: Record<InstallableIconPack, { source: string; license: string; notice: string; url?: string }> = {
  aws: {
    source: "AWS Architecture Icons",
    license: "AWS icon and trademark terms",
    notice: "AWS icons are owned by Amazon Web Services and are subject to AWS brand and trademark terms.",
    // Official Q2 2026 AWS Architecture Icons package
    url: "https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/architecture/approved/architecture-icons/Icon-package_04302026.4705b90f5aa45b019271a2699e9ce9b97b941ee1.zip"
  },
  azure: {
    source: "Microsoft Azure Architecture Icons",
    license: "Microsoft Azure icon and trademark terms",
    notice: "Azure icons are owned by Microsoft and are subject to Microsoft brand and trademark terms."
  },
  gcp: {
    source: "Google Cloud Architecture Icons",
    license: "Google Cloud icon and trademark terms",
    notice: "Google Cloud icons are owned by Google and are subject to Google brand and trademark terms."
  }
};

export function iconsCommand(): Command {
  const command = new Command("icons").description("Inspect and install icon packs");

  command
    .command("list")
    .option("--pack <pack>", "aws, gcp, azure, generic")
    .action(async (options: { pack?: string }) => {
      const packs = options.pack ? [options.pack] : ["generic", "aws", "azure", "gcp"];
      for (const pack of packs) {
        const manifestPath = pack === "generic" ? bundledIconManifestPath(pack) : iconManifestPath(pack);
        try {
          const manifest = await readIconManifest(manifestPath);
          for (const name of Object.keys(manifest.icons).sort()) console.log(`${pack}-${name}`);
        } catch {
          if (options.pack) {
            console.error(`Icon pack not installed: ${pack}`);
            process.exit(1);
          }
        }
      }
    });

  command.command("status").action(async () => {
    const cacheDir = iconCacheDir();
    await printPackStatus("generic", bundledIconManifestPath("generic"), "bundled");
    for (const pack of ["aws", "azure", "gcp"]) {
      await printPackStatus(pack, iconManifestPath(pack), cacheDir);
    }
  });

  command
    .command("install")
    .argument("<pack>", "aws, azure, or gcp")
    .option("--yes", "skip confirmation")
    .option("--from <path>", "install from a local zip file or directory of SVG files")
    .action(async (pack: string, options: { yes?: boolean; from?: string }) => {
      if (!isInstallableIconPack(pack)) throw new Error(`Unsupported icon pack: ${pack}`);
      const info = providerInfo[pack];
      console.log(info.notice);
      if (!(options.yes || (await confirmInstall(pack)))) {
        console.log("Install cancelled.");
        return;
      }

      const sourcePath = options.from ? resolve(options.from) : await downloadProviderArchive(pack);
      const installed = await installFromSource(pack, sourcePath);
      if (!options.from) await rm(sourcePath, { force: true });
      console.log(`Installed ${installed.count} ${pack} icons to ${installed.path}`);
    });

  return command;
}

async function printPackStatus(pack: string, manifestPath: string, installPath: string): Promise<void> {
  try {
    const manifest = await readIconManifest(manifestPath);
    const count = Object.keys(manifest.icons).length;
    console.log(`${pack}: installed`);
    console.log(`  icons: ${count}`);
    console.log(`  path: ${installPath}`);
    console.log(`  source: ${manifest.source ?? "unknown"}`);
    console.log(`  license: ${manifest.license ?? "unknown"}`);
  } catch {
    console.log(`${pack}: not installed`);
    console.log(`  path: ${installPath}`);
    if (isInstallableIconPack(pack)) {
      console.log(`  source: ${providerInfo[pack].source}`);
      console.log(`  license: ${providerInfo[pack].license}`);
    }
  }
}

async function confirmInstall(pack: InstallableIconPack): Promise<boolean> {
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(`Install ${pack} icons into ${iconCacheDir()}? [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

async function downloadProviderArchive(pack: InstallableIconPack): Promise<string> {
  const url = providerInfo[pack].url;
  if (!url) throw new Error(`No direct ${pack} download is configured yet. Use: diagra icons install ${pack} --from ./icons.zip`);
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`Failed to download ${pack} icons from ${url}`);
  const archivePath = join(await mkdtemp(join(tmpdir(), "diagra-icons-")), `${pack}.zip`);
  await writeFile(archivePath, Buffer.from(await response.arrayBuffer()));
  return archivePath;
}

async function installFromSource(pack: InstallableIconPack, sourcePath: string): Promise<{ count: number; path: string }> {
  const packDir = await ensureIconPackDir(pack);
  const svgDir = join(packDir, "svg");
  await rm(svgDir, { recursive: true, force: true });
  await ensureIconPackDir(pack);

  const icons: Record<string, string> = {};
  if (sourcePath.toLowerCase().endsWith(".zip")) {
    const zip = new AdmZip(sourcePath);
    const pending = new Map<string, Buffer>();
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory || !entry.entryName.toLowerCase().endsWith(".svg")) continue;
      if (isJunkZipEntry(entry.entryName)) continue;
      const data = entry.getData();
      if (!isValidSvgBuffer(data)) continue;
      const name = iconNameFromPath(entry.entryName);
      if (!name) continue;
      const existing = pending.get(name);
      if (existing && existing.length >= data.length) continue;
      pending.set(name, data);
    }
    for (const [name, data] of pending) {
      const target = join(svgDir, `${name}.svg`);
      await writeFile(target, data);
      icons[name] = `svg/${name}.svg`;
      addCompactAlias(icons, name);
    }
  } else {
    for (const svgPath of await findSvgFiles(sourcePath)) {
      if (basename(svgPath).startsWith("._")) continue;
      const data = await readFile(svgPath);
      if (!isValidSvgBuffer(data)) continue;
      const name = iconNameFromPath(svgPath);
      if (!name) continue;
      await writeFile(join(svgDir, `${name}.svg`), data);
      icons[name] = `svg/${name}.svg`;
      addCompactAlias(icons, name);
    }
  }

  applyCanonicalAliases(pack, icons);

  const manifest: IconManifest = {
    pack,
    license: providerInfo[pack].license,
    source: providerInfo[pack].source,
    icons: Object.fromEntries(Object.entries(icons).sort(([a], [b]) => a.localeCompare(b)))
  };
  await writeFile(join(packDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return { count: Object.keys(icons).length, path: packDir };
}

async function findSvgFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await findSvgFiles(path)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".svg")) files.push(path);
  }
  return files;
}

function iconNameFromPath(path: string): string {
  const ignored = new Set(["amazon", "arch", "architecture", "aws", "azure", "gcp", "google", "icon", "service"]);
  return basename(path, extname(path))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .split("-")
    .filter((part) => part && !ignored.has(part) && !/^\d+$/.test(part))
    .join("-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

function addCompactAlias(icons: Record<string, string>, name: string): void {
  const compact = name.replace(/-/g, "");
  if (compact !== name) icons[compact] = icons[name];
}

/** Skip macOS zip metadata sidecars that overwrite real SVG files. */
export function isJunkZipEntry(entryName: string): boolean {
  const normalized = entryName.replace(/\\/g, "/");
  const base = basename(normalized);
  return normalized.includes("__MACOSX/") || base.startsWith("._");
}

/** Reject AppleDouble/binary content; only accept text SVG starting with `<`. */
export function isValidSvgBuffer(data: Buffer): boolean {
  if (data.length < 4) return false;
  if (data.includes(0)) return false;
  const start = data.subarray(0, 256).toString("utf8").trimStart();
  return start.startsWith("<");
}
