# AGENTS.md — Diagra for AI Agents

This file tells AI coding agents (Claude Code, Cursor, Copilot, Codex)
how to use Diagra to create beautiful architecture diagrams.

---

## What is Diagra

Diagra is a CLI tool that renders beautiful architecture diagrams from
a Mermaid-compatible syntax with AWS/GCP/Azure icons, themes, animations,
and multiple export formats.

**Install:**
```bash
npm install -g diagra
```

**Render a diagram:**
```bash
npx diagra render diagram.diagra
npx diagra render diagram.diagra --format all
```

---

## How to create a diagram — step by step

### Step 1: Create a .diagra file

```
%%diagra:theme dark
%%diagra:icons aws
%%diagra:animate flow
%%diagra:title My Architecture

flowchart LR
  user[User]:::generic-user
  api[API Gateway]:::aws-apigateway
  fn[Lambda]:::aws-lambda
  db[DynamoDB]:::aws-dynamodb

  user -->|HTTPS| api
  api -->|Invoke| fn
  fn -->|Read/Write| db
```

### Step 2: Render it
```bash
npx diagra render architecture.diagra --format all
```

### Step 3: Output files created
```
architecture.svg      ← embed in docs, Notion, wikis
architecture.png      ← README, Confluence, presentations
architecture.html     ← animated, shareable, embeddable
architecture.drawio   ← edit further in Draw.io
architecture.mmd      ← standard Mermaid fallback
```

---

## Directives reference

```
%%diagra:theme       dark | light | neutral
%%diagra:icons       aws | gcp | azure | generic | none
%%diagra:animate     flow | pulse | none
%%diagra:direction   LR | TD
%%diagra:title       Diagram title (shown above diagram)
%%diagra:subtitle    Subtitle text
%%diagra:legend      true | false
%%diagra:font        Inter (any Google Font name)
%%diagra:accent      #FF6B35 (hex color override)
```

All directives are optional. Standard Mermaid files render without them.

---

## Icon class reference

### AWS icons (use with %%diagra:icons aws)
```
:::aws-lambda          :::aws-s3              :::aws-dynamodb
:::aws-apigateway      :::aws-cloudwatch      :::aws-eventbridge
:::aws-sns             :::aws-sqs             :::aws-ec2
:::aws-rds             :::aws-fargate         :::aws-ecs
:::aws-eks             :::aws-cloudfront      :::aws-cognito
:::aws-route53         :::aws-elb             :::aws-iam
:::aws-kms             :::aws-waf             :::aws-xray
:::aws-kinesis         :::aws-redshift        :::aws-opensearch
:::aws-sagemaker       :::aws-glue            :::aws-athena
:::aws-cloudformation  :::aws-secretsmanager  :::aws-stepfunctions
```

### GCP icons (use with %%diagra:icons gcp)
```
:::gcp-bigquery        :::gcp-cloudrun        :::gcp-pubsub
:::gcp-cloudstorage    :::gcp-cloudfunction   :::gcp-gke
:::gcp-cloudspanner    :::gcp-firestore       :::gcp-dataflow
:::gcp-vertexai        :::gcp-cloudsql        :::gcp-cloudmonitoring
```

### Azure icons (use with %%diagra:icons azure)
```
:::azure-functions     :::azure-cosmosdb      :::azure-blob
:::azure-servicebus    :::azure-apim          :::azure-aks
:::azure-appservice    :::azure-sqldb         :::azure-monitor
:::azure-keyvault      :::azure-openai        :::azure-search
```

### Generic icons (use with any icon pack or alone)
```
:::generic-user        :::generic-server      :::generic-database
:::generic-api         :::generic-cloud       :::generic-browser
:::generic-mobile      :::generic-queue
```

---

## Common patterns

### AWS Serverless API
```
%%diagra:theme dark
%%diagra:icons aws
%%diagra:animate flow
%%diagra:title Serverless API

flowchart LR
  user[User]:::generic-user
  cdn[CloudFront]:::aws-cloudfront
  api[API Gateway]:::aws-apigateway
  fn[Lambda]:::aws-lambda
  db[DynamoDB]:::aws-dynamodb
  store[S3]:::aws-s3
  auth[Cognito]:::aws-cognito

  user --> cdn --> api
  api -->|Auth| auth
  api -->|Invoke| fn
  fn --> db
  fn --> store
```

### Microservices with observability
```
%%diagra:theme dark
%%diagra:icons aws
%%diagra:animate flow

flowchart LR
  gw[API Gateway]:::aws-apigateway
  svc1[Auth Service]:::aws-lambda
  svc2[Order Service]:::aws-lambda
  db1[Users DB]:::aws-dynamodb
  db2[Orders DB]:::aws-rds
  monitor[CloudWatch]:::aws-cloudwatch

  gw --> svc1 --> db1
  gw --> svc2 --> db2
  svc1 -.->|Logs| monitor
  svc2 -.->|Logs| monitor
```

### Event-driven with fanout
```
%%diagra:theme dark
%%diagra:icons aws
%%diagra:animate flow

flowchart LR
  api[API Gateway]:::aws-apigateway
  fn[Lambda]:::aws-lambda
  eb[EventBridge]:::aws-eventbridge
  sns[SNS]:::aws-sns
  sqs[SQS]:::aws-sqs
  dlq[DLQ]:::aws-sqs

  api --> fn
  fn -->|Publish| eb
  eb --> sns
  eb --> sqs
  sqs -->|Failed| dlq
```

---

## Rules for agents

- NEVER write raw SVG manually — always use diagra CLI
- ALWAYS use short node labels (1-3 words max)
- ALWAYS use :::icon-class for AWS/GCP/Azure nodes
- Use `-->` for main flow edges
- Use `-.->` for monitoring/observability edges
- Use `-->|label|` for important edge labels (keep labels short)
- Keep diagrams focused — 8-15 nodes for clarity
- Dashed edge targets (CloudWatch, XRay etc) auto-group to bottom row
- Run `npx diagra validate filename.diagra` if render fails

## If render fails
```bash
# Validate syntax
npx diagra validate diagram.diagra

# Check with verbose output
npx diagra render diagram.diagra --verbose

# Try without icons first
# Remove %%diagra:icons line and retry
```

---

## CLI reference
```bash
diagra render <file>                    # render to SVG
diagra render <file> --format all       # all formats
diagra render <file> --format svg,png   # specific formats
diagra render <file> --theme dark       # override theme
diagra watch <file>                     # watch + re-render
diagra init --template aws-serverless   # start from template
diagra icons list --pack aws            # list available icons
diagra validate <file>                  # validate syntax
```
