# Icons

Attach icons to nodes with Mermaid class syntax:

```
lambda[Order Service]:::aws-lambda
db[Orders Table]:::aws-dynamodb
user[Web Users]:::generic-browser
```

Supported prefixes: `aws-`, `gcp-`, `azure-`, and `generic-`.

---

## Bundled vs installed packs

| Pack | Location | Install required |
|---|---|---|
| `generic` | Bundled in `packages/core/icons/generic/` | No |
| `aws` | User cache (see below) | Yes — `diagra icons install aws` |
| `azure` | User cache | Yes — `diagra icons install azure` |
| `gcp` | User cache | Yes — `diagra icons install gcp` |

Generic icons ship with Diagra (Lucide-based, MIT). Official cloud provider icons are **not** bundled in the repository. They are downloaded once and cached on your machine.

---

## Convert Mermaid to Diagra

Already have a `.mmd` flowchart? Convert it in one step:

```bash
diagra convert examples/aws/02-event-driven.mmd
diagra render examples/aws/02-event-driven.diagra
```

Diagra guesses icon classes from node labels using keyword rules (no AI):

| Label contains | Inferred class (`--icons generic`) | With `--icons aws` |
|---|---|---|
| Lambda, Worker, Service | `:::generic-server` | `:::aws-lambda` if "lambda" in label |
| EventBridge, SNS, Topic | `:::generic-event` | `:::aws-eventbridge`, `:::aws-sns` |
| Queue, SQS, DLQ | `:::generic-queue` | `:::aws-sqs` |
| DynamoDB, Database | `:::generic-database` | `:::aws-dynamodb` |
| CloudWatch, Monitor | `:::generic-monitoring` | `:::aws-cloudwatch` |

Icons are a starting point — edit the `.diagra` file to swap `:::generic-*` for `:::aws-*` after reviewing.

```bash
diagra convert diagram.mmd --icons generic   # safe default, works offline
diagra convert diagram.mmd --icons aws     # needs: diagra icons install aws
diagra convert diagram.mmd --no-infer-icons  # directives only, no ::: classes
```

---

```bash
# Interactive — confirms before downloading
diagra icons install aws

# Non-interactive (CI, scripts)
diagra icons install aws --yes
diagra icons install azure --yes
diagra icons install gcp --yes
```

### AWS source

AWS icons are downloaded from the official AWS Architecture Icons package:

```
https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/architecture/approved/architecture-icons/Icon-package_04302026.4705b90f5aa45b019271a2699e9ce9b97b941ee1.zip
```

### Manual install

If a provider changes its download URL, install from a local zip or folder of SVG files:

```bash
diagra icons install aws --from ./Icon-package_04302026.zip
diagra icons install aws --from ./my-icons/ --yes
```

### Cache locations

| OS | Path |
|---|---|
| macOS | `~/Library/Caches/diagra/icons/{pack}/` |
| Linux | `~/.cache/diagra/icons/{pack}/` (or `$XDG_CACHE_HOME/diagra/icons/`) |
| Windows | `%LOCALAPPDATA%\diagra\icons\{pack}\` |

Each installed pack contains:

```
~/Library/Caches/diagra/icons/aws/
  manifest.json    ← maps short names to SVG paths
  svg/
    lambda.svg
    cloudfront.svg
    res-simple-storage-bucket.svg
    ...
```

### Inspect packs

```bash
diagra icons status
diagra icons list --pack generic
diagra icons list --pack aws
```

---

## Canonical icon names

Diagrams use short, memorable class names. The installer maps official provider filenames to these names automatically.

Examples:

| Class in diagram | Resolved from official pack |
|---|---|
| `:::aws-s3` | `res-simple-storage-bucket` |
| `:::aws-sqs` | `simple-queue` |
| `:::aws-sns` | `simple-notification` |
| `:::aws-iam` | `identity-and-access-management` |
| `:::aws-ecs` | `elastic-container` |
| `:::aws-eks` | `elastic-kubernetes` |
| `:::aws-apigateway` | `api-gateway` |

If an icon is missing, Diagra warns and renders a colored fallback badge:

```
[diagra] icon not found: aws-s3. Run: diagra icons install aws
```

---

## Common AWS icon classes

```
:::aws-lambda          :::aws-apigateway       :::aws-dynamodb
:::aws-s3              :::aws-sqs              :::aws-sns
:::aws-ec2             :::aws-ecs              :::aws-eks
:::aws-rds             :::aws-cloudfront       :::aws-cognito
:::aws-cloudwatch      :::aws-eventbridge      :::aws-kinesis
:::aws-iam             :::aws-kms              :::aws-waf
:::aws-vpc             :::aws-route53          :::aws-elb
:::aws-sagemaker       :::aws-glue             :::aws-athena
:::aws-redshift         :::aws-opensearch       :::aws-stepfunctions
```

## Generic icon classes

```
:::generic-user        :::generic-server       :::generic-database
:::generic-api         :::generic-cloud        :::generic-queue
:::generic-browser     :::generic-mobile       :::generic-workflow
:::generic-agent       :::generic-ai           :::generic-event
:::generic-cache       :::generic-storage      :::generic-stream
:::generic-monitoring  :::generic-security     :::generic-web
```

---

## Rendering pipeline

When Diagra renders a diagram with cloud icons:

1. **Resolve** — `IconLoader` reads the user cache manifest for the pack (e.g. `aws/manifest.json`).
2. **Alias** — short names like `s3` are mapped to official filenames via canonical aliases.
3. **Embed** — SVG content is inlined into the output diagram. XML declarations (`<?xml ...?>`) and DOCTYPE headers are stripped so the combined SVG is valid in browsers.

---

## Troubleshooting

### `command not found: diagra`

See [`docs/installation.md`](installation.md).

### Icons show as colored fallback badges

Install the pack for your `%%diagra:icons` directive:

```bash
npx diagra icons install aws --yes
npx diagra icons status
```

### SVG opens in browser with XML errors

**`Char 0x0 out of allowed range`** — icons were corrupted during install (macOS `__MACOSX/._*` sidecar files). Reinstall:

```bash
diagra icons install aws --yes
```

**`XML declaration allowed only at the start of the document`** — fixed in current Diagra versions (strips `<?xml` when embedding). Rebuild and re-render:

```bash
pnpm build
npx diagra render examples/aws/01-serverless-api.diagra
```

### Verify a cached icon is valid

```bash
head -1 ~/Library/Caches/diagra/icons/aws/svg/lambda.svg
# Good: <?xml version="1.0" ...  or  <svg ...
# Bad:  binary garbage / "Mac OS X"
```

---

## Provider terms

AWS, GCP, and Azure icons are property of their respective owners. Use is subject to each provider's brand, trademark, and icon usage terms. Icons are cached locally on your machine only — they are not redistributed by Diagra.
