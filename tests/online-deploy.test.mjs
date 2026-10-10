import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('online production deployment retains Neon, includes all APIs and excludes QA fixtures',async()=>{
 const api=await read('api/online.js'),payload=await read('scripts/deploy-payload.mjs'),bootstrap=await read('scripts/vercel-bootstrap.mjs');
 assert(api.includes("import {neon} from '@neondatabase/serverless'"));
 assert(!api.includes('PGlite'));assert(!bootstrap.includes('QA-ONLY'));assert(!bootstrap.includes('qa.html'));
 assert(payload.includes("readdir(new URL('api/',root))"));assert(payload.includes("name.endsWith('.js')"));
 assert(bootstrap.includes('process.env.MM_BUILD_COMMIT=COMMIT'));
 const names=await readdir(new URL('../src/',import.meta.url));assert(!names.some(n=>/^qa[-.]/.test(n)));
 const pkg=JSON.parse(await read('package.json'));assert(!pkg.dependencies['@electric-sql/pglite']);assert(!pkg.dependencies['@playwright/test']);
});
test('build receipt and permanent online disclosure match the isolated prototype',async()=>{
 const build=await read('scripts/build.mjs'),about=await read('src/about.html');
 assert(build.includes('build-info.json'));assert(build.includes('MM_BUILD_COMMIT'));
 for(const text of ['online-privacy','Google','Vercel','Neon','30 分','2 分','TURN','IP アドレス','バックアップ'])assert(about.includes(text),text);
 assert(about.includes('操作列そのものは保存せず'));
});
