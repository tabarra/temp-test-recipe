# Ripgrep Scanner Recipe

A txAdmin recipe that scans your server data folder for potential backdoor files using ripgrep.

## What is this?

This is **not** a resource you install directly into your server. It's a [txAdmin recipe](https://docs.fivem.net/docs/server-manual/setting-up-a-server-txadmin/#deploying-a-recipe) that creates an isolated, temporary server specifically for scanning files.

When you deploy this recipe through txAdmin:
1. A minimal FiveM server is created
2. The `ripgrep-scanner` resource runs and scans your server data path
3. Player connections are blocked (this is a debug server)
4. Results are output to the console/logs

## Usage

1. In txAdmin, go to **Setup** → **Recipe Deployer**
2. Select "Remote URL" and paste the recipe URL
3. Follow the deployment steps
4. Check the server console for scan results

## Development

### Folder Structure

| Folder | Runtime | Purpose |
|--------|---------|---------|
| `src/` | Node.js (FiveM) | Scanner logic — bundled to single JS |
| `scripts/` | Bun | Build tooling |
| `resource/` | — | Static FiveM resource files |
| `dist/` | — | Release output |

The `src/` and `scripts/` folders have separate `tsconfig.json` files:
- **scripts/** uses `bun-types` — build tooling runs in Bun
- **src/** uses `@types/node` — scanner code runs in FiveM's Node-based runtime

### Building

```bash
bun install
bun run build
```

Output goes to `dist/` containing the complete recipe files ready for release.
