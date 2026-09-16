import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('the about page carries the contact, privacy and credit sections and the version placeholder',async()=>{
 const html=await read('src/about.html');
 for(const needle of ['@MiracleMine0123','id="privacy"','id="contact"','id="developer"','id="credits"','id="terms"','__VERSION__','CC BY 4.0','Kenney','数字と遊ぶ感覚'])assert.ok(html.includes(needle),needle);
 assert.ok(!/0\.\d+\.\d+/.test(html.replace(/CC BY 4\.0|1\.1/g,'')),'no hard-coded version');
});
test('the app reads its version from the build instead of a literal',async()=>{
 const app=await read('src/app.js');
 assert.ok(app.includes("const APP_VERSION='__VERSION__'"));
 assert.ok(!app.includes('PROTOTYPE 0.'),'title version is generated');
 assert.ok(app.includes('x.com/MiracleMine0123'));
});
test('vercel serves /about and the service worker caches it for offline use',async()=>{
 const vercel=JSON.parse(await read('vercel.json'));
 assert.deepEqual(vercel.rewrites,[{source:'/about',destination:'/about.html'}]);
 assert.ok((await read('src/sw.js')).includes("'/about': '/about.html'"));
});
test('the deploy bootstrap template exposes exactly one commit placeholder in code',async()=>{
 const src=await read('scripts/vercel-bootstrap.mjs');
 assert.ok(src.includes("const COMMIT='__COMMIT__'"));
 assert.ok((await read('scripts/deploy-payload.mjs')).includes("replaceAll('__COMMIT__'"),'every placeholder is filled');
});
test('the game and the share landing name the X account for cards',async()=>{
 assert.ok((await read('src/index.html')).includes('name="twitter:site" content="@MiracleMine0123"'));
 assert.ok((await read('api/share.js')).includes('name="twitter:site" content="@MiracleMine0123"'));
 const app=await read('src/app.js');assert.ok(app.includes("reportShareEvent('visit','title',via)")&&app.includes("reportShareEvent('start','title',arrivedFrom)"));
});
