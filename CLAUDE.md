# CLAUDE.md — Diagra for Claude Code

This file configures Claude Code's behavior when working in the Diagra repository.

---

## What this project is

Diagra is an open-source diagram renderer. It takes `.diagra` files
(a Mermaid-compatible superset syntax) and renders beautiful SVG, PNG,
HTML, Draw.io, and standard Mermaid output with AWS/GCP/Azure icons,
themes, and animations.

**Tagline:** Mermaid, but beautiful.

---

## Critical architecture rules — never violate these

- **NEVER rewrite the parser** — we use `@mermaid-js/parser`. Do not replace it.
- **NEVER add external CDN references** to SVG output — output must be self-contained
- **NEVER use `any` type** in TypeScript — use proper types or `unknown`
- **NEVER call shell commands** from the renderer — pure Node.js only
- **ALWAYS sanitize node labels** before embedding in SVG (XSS prevention)
- **ALWAYS validate icon paths** before reading files (path traversal prevention)

---

## How the rendering pipeline works

```
.diagra file
    ↓
DirectiveParser     extracts %%diagra: lines → config object
    ↓
@mermaid-js/parser  parses remaining Mermaid syntax → AST
    ↓
IconResolver        maps :::classname → SVG file content
    ↓
ThemeEngine         returns CSS variable map for theme
    ↓
SVGRenderer         composes final SVG from nodes + edges
    ↓
Exporters           SVG / PNG / HTML / Draw.io / MMD
```

---

## Where things live

```
packages/
  core/
    src/
      parser/
        DirectiveParser.ts    ← extracts %%diagra: directives
        DiagramParser.ts      ← orchestrates parsing
      renderer/
        SVGRenderer.ts        ← main renderer, composes SVG
        NodeRenderer.ts       ← renders individual nodes
        EdgeRenderer.ts       ← renders edges + labels
        AnimationRenderer.ts  ← SMIL animations
      icons/
        IconLoader.ts         ← loads SVG files from disk
        IconResolver.ts       ← maps class names to icons
      themes/
        ThemeEngine.ts        ← returns CSS variable maps
        dark.ts / light.ts / neutral.ts
      exporters/
        SVGExporter.ts
        PNGExporter.ts        ← uses Puppeteer
        HTMLExporter.ts
        MmdExporter.ts        ← strips diagra directives
        DrawioExporter.ts     ← serializes to Draw.io XML
  cli/
    src/
      commands/
        render.ts / watch.ts / init.ts / icons.ts / validate.ts
  icons/
    aws/manifest.json + svg/
    gcp/manifest.json + svg/
    azure/manifest.json + svg/
    generic/manifest.json + svg/

examples/          ← .diagra example files
docs/              ← markdown documentation
templates/         ← starter templates for diagra init
```

---

## Common development tasks

### Test a diagram renders correctly
```bash
npx diagra render examples/aws/01-serverless-api.diagra
npx diagra render examples/aws/01-serverless-api.diagra --format all
```

### Run all examples to check nothing is broken
```bash
for f in examples/**/*.diagra; do
  npx diagra render "$f" --format svg && echo "✅ $f" || echo "❌ $f"
done
```

### Add a new AWS icon
1. Drop the SVG file in `packages/icons/aws/svg/servicename.svg`
2. Add entry to `packages/icons/aws/manifest.json`:
   `"servicename": "svg/servicename.svg"`
3. Test: `npx diagra render test.diagra` with `:::aws-servicename`

### Add a new theme
1. Create `packages/core/src/themes/mytheme.ts`
2. Export a token object matching the shape in `dark.ts`
3. Register it in `ThemeEngine.ts`
4. Test: `npx diagra render test.diagra --theme mytheme`

### Add a new directive
1. Add to `DirectiveParser.ts` known directives list
2. Pass through config object to renderer
3. Handle in relevant renderer/exporter
4. Document in `docs/syntax.md`

### Build the project
```bash
pnpm install
pnpm build
```

### Run tests
```bash
pnpm test
pnpm test:coverage
```

---

## When user asks to create a diagram

If a user asks Claude Code to create an architecture diagram:

1. Check if diagra is installed: `npx diagra --version`
2. If not: `npm install -g diagra`
3. Create a `.diagra` file with appropriate syntax
4. Run: `npx diagra render filename.diagra --format all`
5. Report which output files were created
6. Do NOT write raw SVG manually — always use the CLI

See `AGENTS.md` for full syntax reference and icon classes.

---

## Security — check these when reviewing code

- `IconLoader.ts` — path must be sanitized, no `../` traversal allowed
- `SVGRenderer.ts` — node labels must be HTML-escaped before embedding
- `PNGExporter.ts` — Puppeteer instance must always be closed in finally block
- `DrawioExporter.ts` — node IDs must not contain XML special characters
- CLI render command — input file path must be validated to exist

---

## What NOT to do

- Do not suggest adding a GUI or web editor — out of scope for this project
- Do not replace `@mermaid-js/parser` with a custom parser
- Do not add React or Vue dependencies to `@diagra/core`
- Do not hardcode colors — always use CSS variables from theme tokens
- Do not add CDN script tags to SVG output
- Do not store user data anywhere — Diagra is a pure CLI/library tool
