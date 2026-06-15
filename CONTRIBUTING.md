# Contributing

Thanks for helping improve Diagra.

## Setup

```bash
git clone https://github.com/shahzadq/diagra
cd diagra
pnpm install
pnpm build
```

The CLI is available at `node_modules/.bin/diagra` (not on PATH by default). Use `npx diagra …` or see [`docs/installation.md`](docs/installation.md).

## Run tests

```bash
pnpm test
```

## AWS example diagrams

Cloud examples need installed icon packs:

```bash
npx diagra icons install aws --yes
npx diagra render examples/aws/01-serverless-api.diagra
```

## Project layout

```
packages/
  core/          @diagra/core — parser, renderer, icon loader, exporters
    icons/
      generic/   bundled generic icon pack (MIT)
  cli/           diagra CLI — render, watch, icons install
docs/            user documentation
examples/        sample .diagra files
```

Official AWS/Azure/GCP icons are **not** in the repo. They are downloaded to the user cache via `diagra icons install`.

## Icon system

- **Generic icons** — bundled at `packages/core/icons/generic/`
- **Cloud icons** — cached at `~/Library/Caches/diagra/icons/` (macOS), see [`docs/icons.md`](docs/icons.md)
- **Canonical aliases** — `packages/core/src/icons/CanonicalIcons.ts` maps `aws-s3` → official filenames
- **Install filtering** — `packages/cli/src/commands/icons.ts` skips `__MACOSX/._*` junk and validates SVG content
- **Embed sanitization** — `packages/core/src/renderer/NodeRenderer.ts` strips `<?xml` declarations when inlining icons

## Good first issues

- Improve canonical icon alias mappings for AWS/Azure/GCP
- Add direct download URLs for Azure and GCP icon packs
- Fix edge routing for complex diagrams
- Add sequence diagram support
- Build VS Code extension with live preview
