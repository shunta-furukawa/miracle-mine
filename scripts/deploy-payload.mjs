/* Builds the six-file payload for a manual Vercel production deployment. See docs/DEPLOY.md.
   Usage: node scripts/deploy-payload.mjs <full commit sha> [output.json] */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const [sha,out='deploy-payload.json']=process.argv.slice(2);
if(!/^[0-9a-f]{40}$/.test(sha||''))throw new Error('pass the full 40-character commit sha');
const root=new URL('../',import.meta.url);
const read=async path=>readFile(new URL(path,root));
const remote=execFileSync('git',['ls-remote','https://github.com/shunta-furukawa/miracle-mine.git'],{cwd:root}).toString();
if(!remote.includes(sha))throw new Error(`${sha} is not the tip of any branch on GitHub; push first`);
const pkg=JSON.parse(await read('package.json'));
const files=[
 {file:'bootstrap.mjs',data:(await read('scripts/vercel-bootstrap.mjs')).toString().replaceAll('__COMMIT__',sha)},
 {file:'package.json',data:JSON.stringify({name:pkg.name,version:pkg.version,private:true,type:'module',engines:pkg.engines,scripts:{build:'node bootstrap.mjs'},dependencies:pkg.dependencies},null,2)+'\n'},
 {file:'vercel.json',data:(await read('vercel.json')).toString()},
 {file:'api/ranking.js',data:(await read('api/ranking.js')).toString()},
 {file:'api/share.js',data:(await read('api/share.js')).toString()},
].map(f=>({file:f.file,encoding:'base64',data:Buffer.from(f.data).toString('base64')}));
await mkdir(new URL('.',new URL(out,`file://${process.cwd()}/`)),{recursive:true});
await writeFile(out,JSON.stringify(files));
console.log(`${files.length} files for ${sha} → ${out}`);
