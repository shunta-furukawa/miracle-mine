import { cp, mkdir, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../dist/', import.meta.url);
await rm(root, { recursive: true, force: true });
await mkdir(root, { recursive: true });
await cp(new URL('../src/', import.meta.url), root, { recursive: true });
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
