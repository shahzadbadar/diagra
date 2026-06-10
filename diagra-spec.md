# Diagra — Full Product Specification
**Version:** MVP 1.0  
**Tagline:** Mermaid, but beautiful.  
**Package:** `@diagra/core`  
**CLI:** `npx diagra`  
**File extension:** `.diagra` (superset of `.mmd`)

---

## 1. What is Diagra?

Diagra is an open-source diagram renderer that takes Mermaid-compatible syntax extended with icons, themes, and animations — and produces beautiful SVG, PNG, HTML, and Draw.io output. It is a **renderer**, not an editor. Users write `.diagra` files (a superset of Mermaid syntax), run the CLI or use the JavaScript library, and get beautiful output.

**Core principle:** Same Mermaid syntax you already know. Add icon and theme directives on top. Export to any format.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (Node.js) |
| Parser | `@mermaid-js/parser` (reuse, do not rewrite) |
| Renderer | Custom SVG renderer built from AST |
| Icon packs | AWS / GCP / Azure official SVG icon sets |
| Animations | CSS keyframes + SMIL `animateMotion` |
| CLI | Commander.js |
| PNG export | Sharp or Puppeteer (headless Chrome) |
| Draw.io export | Custom XML serializer |
| HTML export | Self-contained HTML with embedded JS |
| Testing | Vitest |
| Build | tsup |

---

## 3. Diagra Syntax — Superset of Mermaid

Diagra files are 100% valid Mermaid with optional Diagra directives in comments. Standard Mermaid tools ignore them gracefully.

### 3.1 Directives (top of file)

```
%%diagra:theme dark
%%diagra:icons aws
%%diagra:animate flow
%%diagra:font Inter
%%diagra:accent #FF6B35
```

| Directive | Values | Default |
|---|---|---|
| `theme` | `light`, `dark`, `neutral`, `brand` | `light` |
| `icons` | `aws`, `gcp`, `azure`, `generic`, `none` | `none` |
| `animate` | `flow`, `pulse`, `none` | `none` |
| `font` | any Google Font name | `Inter` |
| `accent` | hex color | theme default |

### 3.2 Icon assignment via Mermaid class syntax

Uses Mermaid's existing `:::classname` syntax — already valid Mermaid, ignored by other tools.

```
flowchart LR
  A[Lambda]:::aws-lambda
  B[DynamoDB]:::aws-dynamodb
  C[API Gateway]:::aws-apigateway
  D[S3 Bucket]:::aws-s3
  
  A --> B
  C --> A
  A --> D
```

### 3.3 Supported icon class prefixes

```
aws-{service}     e.g. aws-lambda, aws-s3, aws-ec2, aws-rds
gcp-{service}     e.g. gcp-bigquery, gcp-cloudrun, gcp-pubsub
azure-{service}   e.g. azure-functions, azure-cosmosdb, azure-blob
generic-{type}    e.g. generic-server, generic-database, generic-user, generic-cloud, generic-api
```

### 3.4 Full example `.diagra` file

```
%%diagra:theme dark
%%diagra:icons aws
%%diagra:animate flow
%%diagra:font Inter

flowchart LR
  user[User]:::generic-user
  apigw[API Gateway]:::aws-apigateway
  lambda[Lambda]:::aws-lambda
  dynamo[DynamoDB]:::aws-dynamodb
  s3[S3]:::aws-s3

  user --> apigw
  apigw --> lambda
  lambda --> dynamo
  lambda --> s3
```

---

## 4. Renderer Architecture

### 4.1 Pipeline

```
.diagra file
    ↓
DiagramParser
  - Extract %%diagra directives
  - Pass remaining content to @mermaid-js/parser
  - Returns: { directives, ast }
    ↓
IconResolver
  - Map :::classname to SVG icon path
  - Load SVG icon content from icon pack
  - Returns: Map<nodeId, svgIconContent>
    ↓
LayoutEngine
  - Use Mermaid AST node/edge positions
  - Calculate bounding boxes per node
  - Returns: { nodes[], edges[], dimensions }
    ↓
ThemeEngine
  - Load theme tokens (colors, fonts, spacing)
  - Apply accent overrides
  - Returns: { cssVariables, tokenMap }
    ↓
SVGRenderer
  - Render nodes with icons embedded
  - Render edges with routing
  - Apply CSS animations
  - Returns: SVG string
    ↓
Exporters
  - SVGExporter    → .svg file
  - PNGExporter    → .png file (via Sharp/Puppeteer)
  - HTMLExporter   → self-contained .html with animations
  - MmdExporter    → .mmd (standard Mermaid, strips directives)
  - DrawioExporter → .drawio XML
```

### 4.2 Node rendering

Each node is rendered as an SVG group:

```svg
<g id="node-lambda" class="diagra-node" data-icon="aws-lambda">
  <!-- Background rect -->
  <rect width="120" height="80" rx="8" 
        fill="var(--node-bg)" stroke="var(--node-border)"/>
  
  <!-- Icon (embedded SVG, 32x32, centered top) -->
  <g transform="translate(44, 12)" width="32" height="32">
    <!-- AWS Lambda SVG icon content here -->
  </g>
  
  <!-- Label -->
  <text x="60" y="68" text-anchor="middle" 
        font-family="var(--font)" font-size="12"
        fill="var(--node-text)">Lambda</text>
</g>
```

### 4.3 Edge rendering

```svg
<!-- Static edge -->
<path id="edge-1" d="M 120 40 L 200 40" 
      stroke="var(--edge-color)" stroke-width="1.5" fill="none"
      marker-end="url(#arrow)"/>

<!-- Animated flow edge (when animate:flow is set) -->
<path id="edge-1" d="M 120 40 L 200 40" 
      stroke="var(--edge-color)" stroke-width="1.5" fill="none"
      marker-end="url(#arrow)"/>
<circle r="4" fill="var(--accent)">
  <animateMotion dur="1.5s" repeatCount="indefinite">
    <mpath href="#edge-1"/>
  </animateMotion>
</circle>
```

---

## 5. Theme System

### 5.1 Built-in themes

**Light theme:**
```json
{
  "background": "#FFFFFF",
  "nodeBg": "#F8F9FA",
  "nodeBorder": "#E2E8F0",
  "nodeText": "#1A202C",
  "edgeColor": "#94A3B8",
  "accent": "#6366F1",
  "font": "Inter"
}
```

**Dark theme:**
```json
{
  "background": "#0F172A",
  "nodeBg": "#1E293B",
  "nodeBorder": "#334155",
  "nodeText": "#F1F5F9",
  "edgeColor": "#475569",
  "accent": "#818CF8",
  "font": "Inter"
}
```

**Neutral theme:** Gray-scale, works in print/docs.  
**Brand theme:** Uses `%%diagra:accent` color as primary, derives palette.

### 5.2 CSS variable output

Every rendered SVG includes:
```svg
<style>
  :root {
    --bg: #0F172A;
    --node-bg: #1E293B;
    --node-border: #334155;
    --node-text: #F1F5F9;
    --edge-color: #475569;
    --accent: #818CF8;
    --font: 'Inter', sans-serif;
  }
</style>
```

---

## 6. Icon Pack Structure

```
packages/
  icons/
    aws/
      manifest.json        ← maps class names to file paths
      svg/
        lambda.svg
        s3.svg
        dynamodb.svg
        apigateway.svg
        ec2.svg
        rds.svg
        cloudfront.svg
        sqs.svg
        sns.svg
        cognito.svg
        ... (top 30 services for MVP)
    gcp/
      manifest.json
      svg/
        bigquery.svg
        cloudrun.svg
        pubsub.svg
        cloudstorage.svg
        ... (top 20 services for MVP)
    azure/
      manifest.json
      svg/
        functions.svg
        cosmosdb.svg
        blobstorage.svg
        servicebus.svg
        ... (top 20 services for MVP)
    generic/
      manifest.json
      svg/
        server.svg
        database.svg
        user.svg
        cloud.svg
        api.svg
        mobile.svg
        browser.svg
        queue.svg
```

### 6.1 manifest.json format

```json
{
  "prefix": "aws",
  "icons": {
    "lambda": "svg/lambda.svg",
    "s3": "svg/s3.svg",
    "dynamodb": "svg/dynamodb.svg",
    "apigateway": "svg/apigateway.svg"
  }
}
```

---

## 7. Export Formats

### 7.1 SVG export
- Fully self-contained SVG
- Embedded fonts via Google Fonts `@import`
- Embedded icon SVGs (no external references)
- CSS animations included
- Works in browser, Notion, docs sites

### 7.2 PNG export
- Uses Puppeteer to render SVG in headless Chrome
- Default resolution: 2x (retina)
- Configurable width via `--width` flag
- Transparent background option via `--transparent`

### 7.3 HTML export
- Self-contained single HTML file
- Full CSS animations
- JavaScript hover interactions
- Click-to-highlight nodes
- Embeddable via `<iframe>`

### 7.4 Standard Mermaid `.mmd` export
- Strips all `%%diagra:` directives
- Strips `:::iconclass` assignments
- Outputs clean standard Mermaid syntax
- Editable in Mermaid Live Editor, VS Code, Draw.io

### 7.5 Draw.io `.drawio` export
- Serializes to Draw.io XML format
- Maps icon classes to Draw.io shape references
- Preserves node labels and edge connections
- Opens directly in Draw.io desktop or web

---

## 8. CLI

### 8.1 Installation

```bash
npm install -g diagra
# or
npx diagra
```

### 8.2 Commands

```bash
# Render to SVG (default)
diagra render diagram.diagra

# Render with specific theme
diagra render diagram.diagra --theme dark

# Export to PNG
diagra render diagram.diagra --format png --width 1200

# Export to all formats
diagra render diagram.diagra --format all

# Export to specific formats
diagra render diagram.diagra --format svg,png,html

# Export to Draw.io
diagra render diagram.diagra --format drawio

# Export to standard Mermaid
diagra render diagram.diagra --format mmd

# Watch mode (re-render on file change)
diagra watch diagram.diagra

# Init a new diagram file
diagra init --template aws-serverless

# List available icons
diagra icons list --pack aws

# Validate a .diagra file
diagra validate diagram.diagra
```

### 8.3 Output files

```bash
# Input: architecture.diagra
# Output files created in same directory:
architecture.svg
architecture.png
architecture.html
architecture.drawio
architecture.mmd     ← standard Mermaid fallback
```

---

## 9. JavaScript / TypeScript Library API

```typescript
import { Diagra } from '@diagra/core'

const diagra = new Diagra()

// Render from string
const result = await diagra.render(`
  %%diagra:theme dark
  %%diagra:icons aws
  
  flowchart LR
    A[Lambda]:::aws-lambda --> B[DynamoDB]:::aws-dynamodb
`)

result.svg      // SVG string
result.png      // Buffer (PNG)
result.html     // HTML string
result.drawio   // Draw.io XML string
result.mmd      // Standard Mermaid string

// Render from file
const result = await diagra.renderFile('./architecture.diagra')

// With options (override directives)
const result = await diagra.render(source, {
  theme: 'dark',
  icons: 'aws',
  animate: 'flow',
  width: 1200,
  font: 'Inter'
})

// Export specific format
const svg = await diagra.toSVG(source)
const png = await diagra.toPNG(source, { width: 800 })
const html = await diagra.toHTML(source)
const drawio = await diagra.toDrawio(source)
```

---

## 10. Project / Repo Structure

```
diagra/
├── packages/
│   ├── core/                    ← main renderer library
│   │   ├── src/
│   │   │   ├── index.ts         ← main export
│   │   │   ├── parser/
│   │   │   │   ├── DiagramParser.ts
│   │   │   │   └── DirectiveParser.ts
│   │   │   ├── renderer/
│   │   │   │   ├── SVGRenderer.ts
│   │   │   │   ├── NodeRenderer.ts
│   │   │   │   ├── EdgeRenderer.ts
│   │   │   │   └── AnimationRenderer.ts
│   │   │   ├── icons/
│   │   │   │   ├── IconResolver.ts
│   │   │   │   └── IconLoader.ts
│   │   │   ├── themes/
│   │   │   │   ├── ThemeEngine.ts
│   │   │   │   ├── light.ts
│   │   │   │   ├── dark.ts
│   │   │   │   └── neutral.ts
│   │   │   └── exporters/
│   │   │       ├── SVGExporter.ts
│   │   │       ├── PNGExporter.ts
│   │   │       ├── HTMLExporter.ts
│   │   │       ├── MmdExporter.ts
│   │   │       └── DrawioExporter.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/                     ← CLI tool
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── commands/
│   │   │   │   ├── render.ts
│   │   │   │   ├── watch.ts
│   │   │   │   ├── init.ts
│   │   │   │   └── icons.ts
│   │   └── package.json
│   │
│   └── icons/                   ← icon packs
│       ├── aws/
│       │   ├── manifest.json
│       │   └── svg/
│       ├── gcp/
│       │   ├── manifest.json
│       │   └── svg/
│       ├── azure/
│       │   ├── manifest.json
│       │   └── svg/
│       └── generic/
│           ├── manifest.json
│           └── svg/
│
├── examples/
│   ├── aws-serverless.diagra
│   ├── gcp-dataflow.diagra
│   ├── azure-microservices.diagra
│   └── generic-api.diagra
│
├── templates/
│   ├── aws-serverless.diagra
│   ├── microservices.diagra
│   └── simple-flow.diagra
│
├── docs/
│   ├── syntax.md
│   ├── icons.md
│   ├── themes.md
│   └── export-formats.md
│
├── package.json                 ← monorepo root (pnpm workspaces)
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## 11. README Structure (for GitHub)

```markdown
# Diagra — Mermaid, but beautiful.

[before/after screenshot showing plain Mermaid vs Diagra output]

## Install
npm install -g diagra

## Quick start
[5-line example with AWS icons]

## Features
- All Mermaid diagram types supported
- AWS, GCP, Azure icon packs built-in
- Dark, light, neutral themes
- Animated data flow
- Export to SVG, PNG, HTML, Draw.io, Mermaid

## Syntax
[syntax guide]

## Export formats
[format guide]
```

---

## 12. MVP Scope (what to build first)

### In scope for MVP
- [ ] Flowchart diagram type only (most common)
- [ ] `%%diagra:theme` directive (light, dark)
- [ ] `%%diagra:icons` directive (aws, gcp, azure, generic)
- [ ] `%%diagra:animate flow` directive
- [ ] Top 30 AWS icons
- [ ] Top 20 GCP icons
- [ ] Top 20 Azure icons
- [ ] 8 generic icons
- [ ] SVG export
- [ ] PNG export
- [ ] HTML export (animated)
- [ ] Standard `.mmd` export
- [ ] Draw.io export
- [ ] CLI: `render`, `watch`, `init`, `validate`
- [ ] TypeScript library API
- [ ] 5 example templates

### Out of scope for MVP
- Sequence diagrams
- ER diagrams
- Gantt charts
- GUI / web editor
- MCP server
- VS Code extension
- Custom icon upload
- Prompt-to-diagram (LLM layer)
- SaaS / hosted version

---

## 13. Build Order for Claude Code

Build in this exact order — each step produces something testable:

1. **Project scaffolding** — monorepo, tsconfig, package.json files
2. **DirectiveParser** — extract `%%diagra:` lines, return config object
3. **IconLoader** — load SVG files from icon packs, return SVG string by class name
4. **ThemeEngine** — return CSS variable map for given theme name
5. **NodeRenderer** — render single node SVG group with icon + label
6. **EdgeRenderer** — render edge path between two nodes
7. **AnimationRenderer** — add SMIL animation dots to edges when animate:flow
8. **SVGRenderer** — compose full SVG from nodes + edges + styles
9. **SVGExporter** — write SVG to file
10. **PNGExporter** — use Puppeteer to render SVG → PNG
11. **HTMLExporter** — wrap SVG in self-contained HTML
12. **MmdExporter** — strip directives, return clean Mermaid
13. **DrawioExporter** — serialize to Draw.io XML
14. **CLI render command** — wire everything together
15. **CLI watch command** — file watcher + re-render
16. **CLI init command** — copy template to current directory
17. **Example files** — 5 working `.diagra` examples
18. **README** — with before/after screenshots

---

## 14. Key Constraints for Claude Code

- Use `@mermaid-js/parser` for parsing — do NOT write a custom parser
- All icon SVGs must be embedded inline in output — no external file references
- SVG output must be self-contained — works offline, no CDN dependencies
- TypeScript strict mode throughout
- Each exporter is a standalone class with a single `export(ast, options): string` method
- No React, no Vue — pure TypeScript/Node.js
- Monorepo managed with pnpm workspaces
- Each package has its own `package.json` and builds independently

---

*End of spec. Feed this document to Claude Code with the instruction: "Implement this spec fully, building in the order specified in section 13."*
