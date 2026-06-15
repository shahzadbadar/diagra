# Installation

Diagra runs anywhere Node.js runs: macOS, Linux, and Windows.

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **npm**, **pnpm**, or **yarn** (npm ships with Node.js)

Check your setup:

```bash
node --version   # should be v18 or newer
npm --version
```

---

## Option 1: Install from npm (recommended)

Use this if you just want the CLI — you are not hacking on the Diagra source repo.

### Global install

```bash
npm install -g diagra
```

After that, `diagra` is on your PATH in any terminal:

```bash
diagra render architecture.diagra
diagra icons install aws --yes
```

### Run without installing

```bash
npx diagra render architecture.diagra
npx diagra icons install aws --yes
```

`npx` downloads and runs the published package. No global install needed.

---

## Option 2: Run from a local clone (contributors)

Use this when you cloned the [Diagra repo](https://github.com/shahzadq/diagra) and want to run the CLI from source.

### 1. Install dependencies

From the repo root:

```bash
pnpm install
# or
npm install
```

The `postinstall` script builds `@diagra/core` and the CLI automatically.

If you ever need to rebuild manually:

```bash
pnpm build
# or
npm run build
```

### 2. Run the CLI

The `diagra` binary is created at `node_modules/.bin/diagra`. It is **not** added to your global PATH automatically, so typing `diagra` alone will fail with `command not found`.

Use one of these instead:

| Method | macOS / Linux | Windows (PowerShell / cmd) |
|---|---|---|
| Local binary | `./node_modules/.bin/diagra …` | `.\node_modules\.bin\diagra …` |
| npx (cross-platform) | `npx diagra …` | `npx diagra …` |
| pnpm script (dev) | `pnpm diagra …` | `pnpm diagra …` |

**Examples from the repo root:**

```bash
# macOS / Linux
./node_modules/.bin/diagra icons install aws --yes
./node_modules/.bin/diagra render examples/aws/01-serverless-api.diagra

# Windows (PowerShell)
.\node_modules\.bin\diagra icons install aws --yes
.\node_modules\.bin\diagra render examples\aws\01-serverless-api.diagra

# Any OS
npx diagra icons install aws --yes
npx diagra render examples/aws/01-serverless-api.diagra
```

### 3. Optional: add `diagra` to your PATH from source

If you want to type `diagra` globally while developing locally:

```bash
cd packages/cli
npm link
```

Then open a **new** terminal and run:

```bash
diagra icons install aws --yes
```

To unlink later:

```bash
npm unlink -g diagra
```

---

## AWS / Azure / GCP diagrams

Examples under `examples/aws/`, `examples/azure/`, and `examples/gcp/` use official provider icons. Install the matching pack **before** rendering:

```bash
npx diagra icons install aws --yes
npx diagra icons status
npx diagra render examples/aws/01-serverless-api.diagra
```

Generic-only diagrams (e.g. `examples/general/`) work without installing cloud packs.

Full icon details → [`docs/icons.md`](icons.md)

---

## Platform notes

### macOS

- Global install via `npm install -g diagra` works in Terminal and iTerm.
- If `diagra` is not found after a global install, ensure npm's global bin directory is on your PATH. Run `npm config get prefix` and add `<prefix>/bin` to your shell profile (`~/.zshrc` or `~/.bash_profile`).

### Linux

- Same as macOS. You may need `sudo npm install -g diagra` depending on your npm prefix, or configure npm to use a user-writable prefix to avoid `sudo`.
- Local clone: `./node_modules/.bin/diagra` or `npx diagra`.

### Windows

- Use **PowerShell** or **cmd** from the repo root.
- Local binary path uses backslashes: `.\node_modules\.bin\diagra`.
- `npx diagra` is the easiest cross-shell option.
- After `npm install -g diagra`, restart the terminal so PATH updates are picked up.

---

## Troubleshooting

### `zsh: command not found: diagra` (or equivalent on Linux/Windows)

You are trying to run `diagra` without it being on your PATH. Fix:

1. **Published package** — install globally: `npm install -g diagra`, or use `npx diagra …`.
2. **Local clone** — use `./node_modules/.bin/diagra …`, `npx diagra …`, or `npm link` from `packages/cli`.

### `Cannot find module` or build errors after `git pull`

Rebuild from the repo root:

```bash
pnpm install && pnpm build
```

### Icon install needs network access

`diagra icons install aws` downloads official provider icon packs over HTTPS. Use `--yes` to skip the confirmation prompt.

Installed icons are cached per user:

| OS | Cache location |
|---|---|
| macOS | `~/Library/Caches/diagra/icons` |
| Linux | `~/.cache/diagra/icons` (or `$XDG_CACHE_HOME/diagra/icons`) |
| Windows | `%LOCALAPPDATA%\diagra\icons` |

Check status:

```bash
npx diagra icons status
```

### Broken or missing icons in rendered SVG

1. **Fallback badges instead of icons** — install the pack: `npx diagra icons install aws --yes`
2. **Browser XML error when opening `.svg`** — reinstall icons (corrupted cache) and re-render. See [`docs/icons.md`](icons.md#troubleshooting).
