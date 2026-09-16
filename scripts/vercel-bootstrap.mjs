/* Vercel build command used by scripts/deploy-payload.mjs. Fetches one exact commit from GitHub,
   builds dist/ from it and places src/ and server/ next to the API functions, so production
   always equals that commit. __COMMIT__ is filled in by deploy-payload.mjs. */
import {execFileSync} from 'node:child_process';
import {cp,rm,mkdir,readFile} from 'node:fs/promises';
const COMMIT='__COMMIT__';
const REPO='https://github.com/shunta-furukawa/miracle-mine.git';
const work='.source';
await rm(work,{recursive:true,force:true});await mkdir(work,{recursive:true});
const git=(...args)=>execFileSync('git',args,{cwd:work,stdio:['ignore','pipe','inherit']}).toString().trim();
git('init','-q');git('remote','add','origin',REPO);git('fetch','--depth','1','origin',COMMIT);git('checkout','-q','FETCH_HEAD');
const head=git('rev-parse','HEAD');if(head!==COMMIT)throw new Error(`fetched ${head}, expected ${COMMIT}`);
for(const dir of ['src','server','scripts','api'])await cp(`${work}/${dir}`,dir,{recursive:true,force:true});
const version=JSON.parse(await readFile(`${work}/package.json`,'utf8')).version;
await rm(work,{recursive:true,force:true});
await import('./scripts/build.mjs');
console.log(`Miracle Mine ${version} built from ${COMMIT}`);
