import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

async function build() {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`Building standalone bundle for v${pkg.version} with esbuild...`);

  await esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    define: {
      '__SERVER_VERSION__': JSON.stringify(pkg.version)
    },
    banner: {
      js: `import { createRequire } from 'module';\nimport { fileURLToPath } from 'url';\nimport { dirname } from 'path';\nconst require = createRequire(import.meta.url);\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = dirname(__filename);`
    },
    outfile: 'dist/index.js',
    sourcemap: false,
    minify: false
  });

  // Playwright needs browsers.json at packageRoot
  const srcBrowsers = path.resolve('node_modules', 'playwright-core', 'browsers.json');
  if (fs.existsSync(srcBrowsers)) {
    fs.copyFileSync(srcBrowsers, path.resolve('browsers.json'));
    fs.copyFileSync(srcBrowsers, path.resolve('dist', 'browsers.json'));
  }

  console.log('Build complete: dist/index.js (standalone executable bundle)');
}

build().catch((err) => {
  console.error('Build error:', err);
  process.exit(1);
});
