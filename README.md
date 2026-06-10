# Diagra

**Mermaid diagrams. But actually beautiful.**

> Same syntax you already know. Real AWS, GCP, and Azure icons.  
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

```bash
npm install -g diagra
```

```bash
npx diagra render architecture.diagra
```

---

## Quick start

Create a file `architecture.diagra`:

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

**Icon packs built in**

```
:::aws-lambda       :::aws-dynamodb     :::aws-s3
:::aws-apigateway   :::aws-cloudwatch   :::aws-eventbridge
:::gcp-bigquery     :::gcp-cloudrun     :::gcp-pubsub
:::azure-functions  :::azure-cosmosdb   :::azure-blob
:::generic-user     :::generic-server   :::generic-database
```

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

# List available icons
diagra icons list --pack aws

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

| Pack | Services | Source |
|---|---|---|
| AWS | 30 services | Official AWS Architecture Icons |
| GCP | 20 services | Google Cloud Icons |
| Azure | 20 services | Microsoft Azure Icons |
| Generic | 8 icons | user, server, database, cloud, api, browser, mobile, queue |

Full icon reference → [`docs/icons.md`](docs/icons.md)

> AWS, GCP, and Azure icons are property of their respective owners,
> used under their icon usage guidelines for architecture diagrams
> and technical documentation.

---

## Contributing

Diagra is early — contributions very welcome.

**Good first issues:**
- Add missing AWS service icons
- Add GCP icon pack completion  
- Add Azure icon pack completion
- Fix edge routing for complex diagrams
- Add sequence diagram support
- Build VS Code extension

See [`CONTRIBUTING.md`](CONTRIBUTING.md) to get started.

```bash
git clone https://github.com/shahzadq/diagra
cd diagra
pnpm install
pnpm build
npx diagra render examples/aws/01-serverless-api.diagra
```

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
