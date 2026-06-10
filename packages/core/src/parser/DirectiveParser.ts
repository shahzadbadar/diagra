import type { AnimationName, DiagraDirectives, IconPackName, ThemeName } from "../types";

const DEFAULT_DIRECTIVES: DiagraDirectives = {
  theme: "light",
  icons: "none",
  animate: "none",
  font: "Inter"
};

const themes = new Set<ThemeName>(["light", "dark", "neutral", "brand"]);
const iconPacks = new Set<IconPackName>(["aws", "gcp", "azure", "generic", "none"]);
const animations = new Set<AnimationName>(["flow", "none"]);

export class DirectiveParser {
  parse(source: string): { directives: DiagraDirectives; mermaidSource: string } {
    const directives: DiagraDirectives = { ...DEFAULT_DIRECTIVES };
    const mermaidLines: string[] = [];

    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*%%diagra:([a-z]+)\s+(.+?)\s*$/i);
      if (!match) {
        mermaidLines.push(line);
        continue;
      }

      const key = match[1].toLowerCase();
      const value = match[2].trim();

      if (key === "theme" && themes.has(value as ThemeName)) directives.theme = value as ThemeName;
      if (key === "icons" && iconPacks.has(value as IconPackName)) directives.icons = value as IconPackName;
      if (key === "animate" && animations.has(value as AnimationName)) directives.animate = value as AnimationName;
      if (key === "font") directives.font = value;
      if (key === "accent" && /^#[0-9a-f]{6}$/i.test(value)) directives.accent = value;
      if (key === "title") directives.title = value;
      if (key === "subtitle") directives.subtitle = value;
    }

    return { directives, mermaidSource: mermaidLines.join("\n").trim() };
  }
}
