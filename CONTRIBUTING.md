# Contributing to Diagra

First — thank you. Diagra is early and every contribution matters.

---

## Good first issues

If you're new here, start with one of these:

| Issue | Effort | What to do |
|---|---|---|
| Add missing AWS icons | Low | Drop SVG in `packages/icons/aws/svg/`, update manifest |
| Add GCP icon pack | Low | Same pattern as AWS |
| Add Azure icon pack | Low | Same pattern as AWS |
| Fix edge label positioning | Medium | `EdgeRenderer.ts` |
| Add sequence diagram support | Medium-High | New renderer type |
| Build VS Code extension | High | New package |

Look for issues tagged `good first issue` and `help wanted` on GitHub.

---

## Setup

```bash
git clone https://github.com/shahzadbadar/diagra
cd diagra
pnpm install
pnpm build
```

Test everything works:
```bash
npx diagra render examples/aws/01-serverless-api.diagra
```

---

## How to add icons

This is the most needed contribution right now.

### Adding an AWS icon

1. Get the official SVG from https://aws.amazon.com/architecture/icons/

2. Drop it in `packages/icons/aws/svg/servicename.svg`
   Use lowercase, no spaces: `stepfunctions.svg`, `elasticbeanstalk.svg`

3. Add to `packages/icons/aws/manifest.json`:
   ```json
   "servicename": "svg/servicename.svg"
   ```

4. Test it:
   ```
   %%diagra:theme dark
   %%diagra:icons aws

   flowchart LR
     A[My Service]:::aws-servicename --> B[Lambda]:::aws-lambda
   ```
   ```bash
   npx diagra render test.diagra
   ```

5. Open a PR with title: `feat(icons): add aws-servicename icon`

### Adding a GCP or Azure icon

Same process, different folders:
- `packages/icons/gcp/svg/` and `packages/icons/gcp/manifest.json`
- `packages/icons/azure/svg/` and `packages/icons/azure/manifest.json`

---

## How to add a theme

1. Create `packages/core/src/themes/mytheme.ts`

2. Export a token object — copy `dark.ts` as a starting point:
   ```typescript
   export const mytheme = {
     background: '#your-color',
     nodeBg: '#your-color',
     nodeBorder: '#your-color',
     nodeText: '#your-color',
     edgeColor: '#your-color',
     edgeLabel: '#your-color',
     accent: '#your-color',
     font: 'Inter',
   }
   ```

3. Register in `ThemeEngine.ts`:
   ```typescript
   import { mytheme } from './mytheme'
   const themes = { dark, light, neutral, mytheme }
   ```

4. Test: `npx diagra render test.diagra --theme mytheme`

5. PR title: `feat(themes): add mytheme theme`

---

## How to add a directive

1. Add to the known directives list in `DirectiveParser.ts`
2. Pass through config object
3. Handle in the relevant renderer or exporter
4. Add to `docs/syntax.md` directive reference table
5. Add example to `examples/`

---

## Pull request guidelines

- One feature or fix per PR
- Include a test `.diagra` file that demonstrates the change
- Run `pnpm build` and `pnpm test` before submitting
- PR title format: `feat(scope): description` or `fix(scope): description`
- Screenshots of rendered output are very welcome

---

## Reporting bugs

Use the GitHub issue template. Include:
- Your `.diagra` file (or a minimal reproduction)
- What you expected to see
- What you actually got
- Output of `npx diagra --version`

---

## Project structure

```
packages/
  core/          main renderer library (@diagra/core)
  cli/           CLI tool (diagra)
  icons/         icon packs (aws, gcp, azure, generic)
examples/        .diagra example files
docs/            markdown documentation
templates/       starter templates
scripts/         setup and utility scripts
```

Full architecture → `CLAUDE.md`

---

## Code style

- TypeScript strict mode — no `any`
- No external CDN references in SVG output
- Sanitize all user input before embedding in SVG
- Validate all file paths before reading
- Close all Puppeteer instances in `finally` blocks
- ESLint + Prettier — run `pnpm lint` before committing

---

## Questions?

Open a GitHub Discussion or drop a comment on any issue.

Built with ❤️ by [@shahzadbadar](https://github.com/shahzadbadar)
and contributors.
