import fs from 'node:fs';
import { createPathJoiner } from '../src/pathJoiner';

const pRoot = createPathJoiner();
const pDist = pRoot.sub('dist');
const pScanner = pDist.sub('resources', 'ripgrep-scanner');

//MARK: Clean & prepare dist
if (fs.existsSync(pDist.base)) {
    fs.rmSync(pDist.base, { recursive: true });
}
fs.mkdirSync(pScanner.base, { recursive: true });

//MARK: Copy server.cfg
fs.copyFileSync(pRoot('server.cfg'), pDist('server.cfg'));

//MARK: Copy resource files
const resourceFiles = fs.readdirSync(pRoot('resource'));
for (const file of resourceFiles) {
    fs.copyFileSync(pRoot('resource', file), pScanner(file));
}

//MARK: Copy ripgrep binaries
fs.copyFileSync(pRoot('temp', 'rg-windows.exe'), pScanner('rg-windows.exe'));
fs.copyFileSync(pRoot('temp', 'rg-linux'), pScanner('rg-linux'));

//MARK: Build main.js
const result = await Bun.build({
    entrypoints: [pRoot('src', 'index.ts')],
    outdir: pScanner.base,
    naming: 'main.js',
    target: 'node',
    format: 'cjs',
    minify: false,
    sourcemap: 'none',
});

if (!result.success) {
    console.error('Build failed:');
    for (const log of result.logs) {
        console.error(log);
    }
    process.exit(1);
}

//MARK: Prepare dist folder
// NOTE: `.yarn.installed` must to be older than the package.json
await Bun.write(pScanner('.yarn.installed'), '');
await Bun.write(pScanner('package.json'), '{"type":"commonjs"}');

console.log(`✓ Built to ${pDist.base}`);
