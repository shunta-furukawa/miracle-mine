import { cp, mkdir, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = new URL('../dist/', import.meta.url);
await rm(root, { recursive: true, force: true });
await mkdir(root, { recursive: true });
await cp(new URL('../src/', import.meta.url), root, { recursive: true });
const { version: appVersion } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
for (const file of ['app.js', 'about.html']) {
  const url = new URL(file, root);
  await writeFile(url, (await readFile(url, 'utf8')).replaceAll('__VERSION__', appVersion));
}
// A stable public build receipt ties the deployed assets to their exact source commit.
let commit = process.env.MM_BUILD_COMMIT || '';
if (!commit) { try { commit = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(); } catch {} }
await writeFile(new URL('build-info.json', root), JSON.stringify({version:appVersion,commit:/^[a-f0-9]{40}$/.test(commit)?commit:null})+'\n');
async function walk(path = '') {
  const entries = await readdir(new URL(path || './', root), {withFileTypes: true});
  const files = [];
  for (const entry of entries) {
    const name = path + entry.name;
    files.push(...(entry.isDirectory() ? await walk(name + '/') : [name]));
  }
  return files.sort();
}
const files = (await walk()).filter(name => name !== 'sw.js');
const template = await readFile(new URL('sw.js', root), 'utf8');
const hash = createHash('sha256').update(template);
for (const file of files) { hash.update(file); hash.update(await readFile(new URL(file, root))); }
const version = hash.digest('hex').slice(0, 16);
await writeFile(new URL('sw.js', root), template.replace('__CACHE__', 'miracle-mine-shell-' + version)
  .replace('__ASSETS__', JSON.stringify(files.map(name => '/' + name))));
console.log('Miracle Mine built → dist/ (offline cache ' + version + ')');
