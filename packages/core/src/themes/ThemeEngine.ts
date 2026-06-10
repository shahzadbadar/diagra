import { dark } from "./dark";
import { light } from "./light";
import { neutral } from "./neutral";
import type { DiagraDirectives, ThemeName, ThemeTokens } from "../types";

export class ThemeEngine {
  resolve(directives: DiagraDirectives): ThemeTokens {
    const base = this.baseTheme(directives.theme);
    const accent = directives.accent ?? base.accent;
    const brand = directives.theme === "brand";
    return {
      ...base,
      nodeBorder: brand ? accent : base.nodeBorder,
      edgeColor: brand ? accent : base.edgeColor,
      edgeLabel: brand ? accent : base.edgeLabel,
      accent,
      font: directives.font || base.font
    };
  }

  toCssVariables(tokens: ThemeTokens): string {
    const safeFont = tokens.font.replace(/[^A-Za-z0-9 \-]/g, "");
    return `:root {
  --bg: ${tokens.background};
  --node-bg: ${tokens.nodeBg};
  --node-border: ${tokens.nodeBorder};
  --node-text: ${tokens.nodeText};
  --edge-color: ${tokens.edgeColor};
  --edge-label: ${tokens.edgeLabel};
  --accent: ${tokens.accent};
  --font: '${safeFont}', sans-serif;
}`;
  }

  private baseTheme(theme: ThemeName): ThemeTokens {
    if (theme === "dark") return dark;
    if (theme === "neutral") return neutral;
    if (theme === "brand") return light;
    return light;
  }
}
