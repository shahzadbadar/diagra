# Diagra

**Mermaid diagrams. But actually beautiful.**

> Same syntax you already know. Generic icons built in, official cloud icons installed locally.  
> Animated data flow. Export anywhere. Free and open source.

---

## The problem with Mermaid

You write this:

```
flowchart LR
  A[API Gateway] --> B[Lambda] --> C[DynamoDB]
```

You get this → plain gray boxes. Every time. On every project.

**Diagra renders the same syntax like this:**

![Diagra dark theme with AWS icons and animated flow](docs/assets/flowchart.svg)

Same file. Zero syntax changes. Just better.

---

## Install

**Requirements:** Node.js 18+ on macOS, Linux, or Windows.

### Use the published CLI

```bash
# Global install — then `diagra` works in any terminal
npm install -g diagra

# Or run once without installing
npx diagra render architecture.diagra
```

### Develop from this repo

After `pnpm install` (or `npm install`) in the repo root, the CLI is built to `node_modules/.bin/diagra` but is **not** on your PATH. Use one of:

```bash
# macOS / Linux
./node_modules/.bin/diagra icons install aws --yes
./node_modules/.bin/diagra render examples/aws/01-serverless-api.diagra

# Windows (PowerShell)
.\node_modules\.bin\diagra icons install aws --yes

# Any OS
npx diagra icons install aws --yes
npx diagra render examples/aws/01-serverless-api.diagra
```

Full cross-platform setup, `npm link`, and troubleshooting → [`docs/installation.md`](docs/installation.md)

---

## Quick start

**1. Install cloud icons** (required for AWS/Azure/GCP diagrams):

```bash
npx diagra icons install aws --yes
```

**2. Create** a file `architecture.diagra`:

```
%%diagra:theme dark
%%diagra:icons aws
%%diagra:animate flow

flowchart LR
  user[User]:::generic-user
  apigw[API Gateway]:::aws-apigateway
  lambda[Lambda]:::aws-lambda
  dynamo[DynamoDB]:::aws-dynamodb
  s3[S3]:::aws-s3

  user -->|HTTPS| apigw
  apigw -->|Invoke| lambda
  lambda -->|Read/Write| dynamo
  lambda -->|Store| s3
```

Run it:

```bash
npx diagra render architecture.diagra --format all
```

Generic-only diagrams work without step 1. Examples in `examples/general/` need no cloud icon install.

You get:
```
architecture.svg      ← embed in docs, Notion, wikis
architecture.png      ← drop into README, Confluence
architecture.html     ← animated, shareable, embeddable
architecture.drawio   ← open in Draw.io and keep editing
architecture.mmd      ← standard Mermaid fallback
```

---

## What makes it different

**Icon packs**

```
:::generic-user     :::generic-server   :::generic-database
:::generic-api      :::generic-cloud    :::generic-workflow
:::aws-lambda       :::gcp-cloudrun     :::azure-functions
```

Diagra ships generic icons. Official AWS, Azure, and GCP icons are installed locally with `diagra icons install`.

**Themes that don't look like 2015**

```
%%diagra:theme dark      ← obsidian dark, easy on the eyes
%%diagra:theme light     ← clean white, great for docs
%%diagra:theme neutral   ← gray scale, works in print
```

**Animated data flow**

```
%%diagra:animate flow    ← dots flow along edges
%%diagra:animate pulse   ← nodes pulse softly
%%diagra:animate none    ← static, for export
```

**Observability lanes auto-detected**

Dashed edges `-.->` are recognized as monitoring/observability connections
and their target nodes are automatically grouped in a separate bottom row.
No configuration needed.

**Subgraph support**

```
subgraph compute[Compute Layer]
  lambda[Lambda]:::aws-lambda
  ecs[ECS]:::aws-ecs
end
```

Renders as a labeled swim lane around the grouped nodes.

**Titles and subtitles**

```
%%diagra:title AWS Serverless Architecture
%%diagra:subtitle Event-driven order processing system
```

---

## Directives reference

```
%%diagra:theme       dark | light | neutral
%%diagra:icons       aws | gcp | azure | generic | none
%%diagra:animate     flow | pulse | none
%%diagra:direction   LR | TD
%%diagra:title       Any text
%%diagra:subtitle    Any text
%%diagra:legend      true | false
%%diagra:font        Inter (any Google Font)
%%diagra:accent      #FF6B35 (hex color)
```

All directives are optional. Standard Mermaid files render without them.

---

## Export formats

| Format | Use case |
|---|---|
| `.svg` | Docs sites, Notion, GitHub wikis, email |
| `.png` | README files, Confluence, presentations |
| `.html` | Animated embeds, sharing links, iframes |
| `.drawio` | When you need to keep editing visually |
| `.mmd` | Fallback to standard Mermaid |

---

## CLI

```bash
# Render to SVG (default)
diagra render diagram.diagra

# Export all formats at once
diagra render diagram.diagra --format all

# Override theme
diagra render diagram.diagra --theme light

# Watch mode — re-renders on every save
diagra watch diagram.diagra

# Start from a template
diagra init --template aws-serverless
diagra init --template gcp-data-pipeline
diagra init --template n8n-workflow

# List bundled generic icons
diagra icons list --pack generic

# Check installed icon packs
diagra icons status

# Install official provider icons locally (use --yes to skip prompt)
diagra icons install aws --yes
diagra icons install aws --from ./aws-icons.zip

# Validate syntax before rendering
diagra validate diagram.diagra
```

---

## TypeScript / JavaScript API

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

result.svg      // SVG string — embed anywhere
result.png      // Buffer — write to file
result.html     // Self-contained HTML
result.drawio   // Draw.io XML
result.mmd      // Standard Mermaid

// Export specific format
const svg = await diagra.toSVG(source)
const png = await diagra.toPNG(source, { width: 1200 })
```

---

## Examples

| Example | Description |
|---|---|
| [AWS Serverless API](examples/aws/01-serverless-api.diagra) | API Gateway → Lambda → DynamoDB + S3 |
| [AWS Event-driven](examples/aws/02-event-driven.diagra) | EventBridge → SNS → SQS with DLQ |
| [AWS Data Pipeline](examples/aws/03-data-pipeline.diagra) | S3 → Glue → Athena → Redshift |
| [Azure Microservices](examples/azure/02-microservices.diagra) | API Management + Functions + Service Bus |
| [GCP Data Platform](examples/gcp/02-data-pipeline.diagra) | Pub/Sub → Dataflow → BigQuery |
| [Claude Code Agent Loop](examples/ai/01-claude-code-agent.diagra) | How Claude Code works as an agent |
| [RAG Pipeline](examples/ai/02-rag-pipeline.diagra) | Retrieval Augmented Generation |
| [Multi-Agent System](examples/ai/03-multi-agent.diagra) | Orchestrator + specialist agents |
| [n8n Workflow](examples/ai/04-n8n-workflow.diagra) | AI-powered automation pipeline |
| [CI/CD Pipeline](examples/general/03-cicd-pipeline.diagra) | From commit to production |

View all examples → [`examples/`](examples/)

---

## 🤖 Agent-ready

Diagra is designed to be used by AI coding agents.

Works out of the box with **Claude Code**, **Cursor**, **GitHub Copilot**, and **Codex** — just install Diagra and ask your agent to create a diagram.

- `AGENTS.md` — instructions for any AI agent
- `CLAUDE.md` — Claude Code specific instructions  
- `llms.txt` — LLM discovery file

```bash
# In Claude Code or Cursor, just say:
# "Create an AWS architecture diagram for this service"
# The agent reads AGENTS.md and knows exactly what to do
```

---

## Mermaid compatibility

Diagra renders 100% of standard Mermaid flowcharts without any changes.
Paste your existing Mermaid diagram — it just looks better.

The `%%diagra:` directives are valid Mermaid comments.
Standard Mermaid tools ignore them gracefully.

Currently supported diagram types:
- `flowchart` — full support ✅
- `sequenceDiagram` — coming in v1.5
- `erDiagram` — coming in v2.0
- `classDiagram` — coming in v2.0

---

## Icon packs

Diagra ships a **built-in generic** icon pack (`packages/core/icons/generic/`).

Official **AWS, Azure, and GCP** icons are not bundled. Install them once — they are cached on your machine:

```bash
diagra icons install aws --yes
diagra icons install azure --yes
diagra icons install gcp --yes
```

| OS | Cache path |
|---|---|
| macOS | `~/Library/Caches/diagra/icons/` |
| Linux | `~/.cache/diagra/icons/` |
| Windows | `%LOCALAPPDATA%\diagra\icons\` |

AWS icons download from the [official AWS Architecture Icons zip](https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/architecture/approved/architecture-icons/Icon-package_04302026.4705b90f5aa45b019271a2699e9ce9b97b941ee1.zip). Diagrams use short names like `:::aws-s3` and `:::aws-lambda`; Diagra maps these to the official filenames automatically.

Inspect and troubleshoot:

```bash
diagra icons status
diagra icons list --pack aws
diagra icons install aws --from ./Icon-package.zip   # manual fallback
```

These icons remain on your machine and are subject to each provider's brand and trademark terms.

| Pack | Availability | Source |
|---|---|---|
| Generic | Bundled | Lucide, MIT |
| AWS | Local install | Official AWS Architecture Icons |
| GCP | Local install | Google Cloud Icons |
| Azure | Local install | Microsoft Azure Icons |

Full icon reference → [`docs/icons.md`](docs/icons.md)  
Installation (macOS / Linux / Windows) → [`docs/installation.md`](docs/installation.md)

> AWS, GCP, and Azure icons are property of their respective owners and are subject to each provider's icon usage, brand, and trademark terms.

---

## Contributing

Diagra is early — contributions very welcome.

**Good first issues:**
- Improve official icon installer mappings
- Fix edge routing for complex diagrams
- Add sequence diagram support
- Build VS Code extension

See [`CONTRIBUTING.md`](CONTRIBUTING.md) to get started.

```bash
git clone https://github.com/shahzadq/diagra
cd diagra
pnpm install
pnpm build
npx diagra icons install aws --yes
npx diagra render examples/aws/01-serverless-api.diagra
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/installation.md`](docs/installation.md) for developer setup.

---

## Roadmap

- [x] Flowchart rendering with AWS/GCP/Azure icons
- [x] Dark, light, neutral themes
- [x] SVG, PNG, HTML, Draw.io, Mermaid export
- [x] Animated data flow
- [x] Subgraph swim lanes
- [x] Title and subtitle support
- [ ] `diagra generate --prompt` — describe in English, get a diagram
- [ ] Sequence diagram support
- [ ] VS Code extension with live preview
- [ ] MCP server for Claude/Cursor/Copilot
- [ ] GitHub Action — auto-update diagrams on commit
- [ ] Figma plugin

Full roadmap → [`ROADMAP.md`](ROADMAP.md)

---

## License

MIT — free for personal and commercial use.

---

*If Diagra saved you time, a ⭐ on GitHub goes a long way.*
