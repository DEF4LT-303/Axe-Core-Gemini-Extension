import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const extPath = 'gemini-extension.json';

if (fs.existsSync(extPath)) {
  const ext = JSON.parse(fs.readFileSync(extPath, 'utf8'));
  ext.version = pkg.version;
  fs.writeFileSync(extPath, JSON.stringify(ext, null, 2) + '\n');
  console.log(`Synced gemini-extension.json to version ${pkg.version}`);
} else {
  console.warn(`Warning: ${extPath} does not exist.`);
}
