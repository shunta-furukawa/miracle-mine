import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {solution} from '/home/user/miracle-mine/src/engine.js';
import {decodeShare} from '/home/user/miracle-mine/src/share-model.js';
const require=createRequire('/opt/node22/lib/node_modules/playwright/package.json');
const {chromium}=require('playwright');
const OUT=process.env.OUT,PORT=3111,BASE=`http://localhost:${PORT}`;
const server=spawn('node',['scripts/preview.mjs'],{cwd:'/home/user/miracle-mine',env:{...process.env,PORT:String(PORT)},stdio:['ignore','pipe','pipe']});
await new Promise(r=>server.stdout.once('data',r));
const results=[];const check=(name,ok,detail='')=>{results.push([ok?'PASS':'FAIL',name,detail]);console.log((ok?'PASS ':'FAIL ')+name+(detail?' — '+detail:''));};
const all=Array.from({length:30},(_,i)=>i),UID='123e4567-e89b-12d3-a456-426614174000';
const seed={version:1,slots:[
 {cleared:all,paint:2,wing:1,propeller:2,decoration:1,failures:0,flightName:'そらいろ号',ranking:{key:'a'.repeat(64),uid:UID},sky:{total:36000,best:12345,flights:4,treasures:[0,1,2,3]},stars:{},updated:1},
 {cleared:[0,1,2,3,4],paint:0,wing:0,propeller:0,decoration:0,failures:0,flightName:'',ranking:null,sky:{total:0,best:0,flights:0,treasures:[]},stars:{},updated:1},
 null],bests:{},settings:{sound:false,slow:false}};
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const events=[];
async function makePage(viewport){
 const context=await browser.newContext({viewport,reducedMotion:'reduce',locale:'ja-JP'});
 await context.addInitScript(seed=>{localStorage.setItem('miracle-mine:v1',JSON.stringify(seed));localStorage.setItem('miracle-mine:audio:v1',JSON.stringify({version:1,music:false,sound:false}));window.__shares=[];navigator.share=async d=>{window.__shares.push({title:d.title,text:d.text,url:d.url,files:(d.files||[]).map(f=>({name:f.name,type:f.type,size:f.size}))});};navigator.canShare=d=>true;},seed);
 await context.route(/\/api\/ranking\?action=(\w+)/,route=>{const a=new URL(route.request().url()).searchParams.get('action');const body=a==='board'?{entries:[{rank:1,uid:'other',distance:20000,name:'ほし号',design:{paint:1,wing:0,propeller:1,decoration:0}},{rank:2,uid:UID,distance:12345,name:'そらいろ号',design:{paint:2,wing:1,propeller:2,decoration:1}}]}:a==='standing'?{rank:2,distance:12345}:a==='status'?{ready:true,protocol:1}:{error:'MOCK'};route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
 await context.route('https://x.com/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<title>x stub</title>'}));
 await context.route(/\/api\/share\?action=event/,route=>{events.push(JSON.parse(route.request().postData()||'{}'));route.fulfill({status:204});});
 const page=await context.newPage();page.on('pageerror',e=>console.log('PAGEERROR',e.message));
 return page;
}
const dialogSel='dialog.share-dialog[open]';
async function openShare(page,selector,expectKind){
 await page.click(selector);await page.waitForSelector(dialogSel);
 const url=await page.inputValue(dialogSel+' input');const code=new URL(url).searchParams.get('s');const snap=decodeShare(code);
 const ready=await page.waitForSelector(dialogSel+' img.ready',{timeout:20000}).then(()=>true).catch(()=>false);
 const size=ready?await page.$eval(dialogSel+' img',i=>[i.naturalWidth,i.naturalHeight]):null;
 const x=new URL(await page.getAttribute(dialogSel+' .share-x','href'));
 check(`share ${expectKind}: dialog opened with kind`,snap?.kind===expectKind,JSON.stringify(snap));
 check(`share ${expectKind}: preview PNG 1200×630`,ready&&size[0]===1200&&size[1]===630,String(size));
 check(`share ${expectKind}: X intent has text and url`,x.hostname==='x.com'&&x.pathname==='/intent/post'&&x.searchParams.get('url')===url&&(x.searchParams.get('text')||'').includes('#ミラクルマイン'),x.searchParams.get('text'));
 return {snap,url,code};
}
async function closeShare(page,how='button'){if(how==='button')await page.click(dialogSel+' .share-close');else await page.keyboard.press('Escape');await page.waitForSelector('dialog.share-dialog',{state:'detached'});}
async function clearStage(page,stageId,count,started=false){
 if(!started){await page.click(`[data-action="stage:${stageId}"]`);
 await page.waitForSelector('.story-skip',{timeout:10000});await page.click('.story-skip');
 await page.waitForSelector('.intro-start',{timeout:10000});await page.click('.intro-start');
 await page.waitForFunction(()=>!document.querySelector('.stage-intro-card, .stage-intro'));}
 const target=Number(await page.textContent('#target'));
 for(let round=0;round<60;round++){
  if(await page.$('#dialog[open], dialog.chapter-dialog[open]'))break;
  await page.waitForFunction(()=>!document.querySelector('.stone.motion-locked')&&!document.querySelector('[data-action="hint"]:disabled'));
  const board=await page.$$eval('#board .stone .sr-only',els=>els.map(e=>Number(e.textContent)));
  const found=solution(board,target,['+']);
  if(!found){await page.click('[data-action="shuffle"]');await page.click('[data-action="do-shuffle"]');await page.waitForTimeout(150);continue;}
  for(const i of found.path){await page.focus(`#board .stone[data-index="${i}"]`);await page.keyboard.press('Space');}
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
 }
 await page.waitForSelector('#dialog[open], dialog.chapter-dialog[open]',{timeout:15000});
}
try{
 const page=await makePage({width:1280,height:800});
 await page.goto(BASE+'/');await page.waitForSelector('.title-screen');
 const before=await page.evaluate(()=>localStorage.getItem('miracle-mine:v1'));
 // 1. title
 await openShare(page,'[data-action="share:title:title"]','title');
 await page.screenshot({path:OUT+'/share-title.png'});
 await closeShare(page,'escape');check('title: back on title after Escape',!!await page.$('.title-screen'));
 // 2. settings
 await page.click('.title-bottom [data-action="settings"]');await page.waitForSelector('#dialog[open]');
 await openShare(page,'[data-action="share:title:settings"]','title');await closeShare(page);
 check('settings: settings modal still open after closing share',!!await page.$('#dialog[open] #slow'));await page.click('[data-action="save-settings"]');
 // 3. slots
 await page.click('[data-action="slots"]');await page.waitForSelector('.slot-grid');
 check('slots: share buttons only on occupied slots',(await page.$$('.slot-share')).length===2);check('slots show star totals',(await page.textContent('.slot-grid')).includes('/ 90'));
 const slotShare=await openShare(page,'[data-action="share:slot:slots:0"]','slot');
 check('slot snapshot has name, design, level',slotShare.snap.name==='そらいろ号'&&slotShare.snap.level===5&&slotShare.snap.design.paint===2&&slotShare.snap.design.wing===1&&slotShare.snap.design.propeller===2&&slotShare.snap.design.decoration===1&&slotShare.snap.cleared===30);
 check('slot snapshot excludes uid/key',!slotShare.url.includes(UID)&&!slotShare.url.includes('aaaa'));
 // copy link
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);await page.click(dialogSel+' .share-copy');await page.waitForFunction(()=>document.querySelector('dialog.share-dialog .share-status')?.textContent.includes('コピー'));
 const clip=await page.evaluate(()=>navigator.clipboard.readText()).catch(()=>'');check('copy link writes share url',clip===slotShare.url,clip.slice(0,60));
 // native share with file
 await page.click(dialogSel+' .share-native');await page.waitForFunction(()=>window.__shares.length>0);
 const shares=await page.evaluate(()=>window.__shares);check('native share receives PNG File and url',shares[0].url===slotShare.url&&shares[0].files[0]?.type==='image/png'&&shares[0].files[0].size>10000,JSON.stringify(shares[0]));
 // save image
 const [download]=await Promise.all([page.waitForEvent('download',{timeout:5000}).catch(()=>null),page.click(dialogSel+' .share-save')]);check('save image triggers PNG download',!!download&&download.suggestedFilename()==='miracle-mine-share.png',download?.suggestedFilename());
 const [popup]=await Promise.all([page.waitForEvent('popup',{timeout:5000}).catch(()=>null),page.click(dialogSel+' .share-x')]);check('X button opens intent in new tab',!!popup&&popup.url().startsWith('https://x.com/intent/post?'),popup?.url().slice(0,60));await popup?.close();
 await closeShare(page);check('slots: still on slots after close',!!await page.$('.slot-grid'));
 // 4. workshop / treasure / sky deck / ranking
 await page.click('[data-action="slot:0"]');await page.waitForSelector('.map-page');await page.click('[data-action="workshop"]');await page.waitForSelector('.rich-workshop');
 const ws=await openShare(page,'[data-action="share:workshop:workshop"]','workshop');await page.screenshot({path:OUT+'/share-workshop.png'});await closeShare(page);
 const tr=await openShare(page,'.treasure-share','treasure');check('treasure snapshot lists found treasures',JSON.stringify(tr.snap.treasures)==='[0,1,2,3]'&&tr.snap.total===36000);await closeShare(page);
 await page.click('[data-action="sky-deck"]');await page.waitForSelector('.sky-deck');
 const sky=await openShare(page,'[data-action="share:sky:deck"]','sky');check('sky snapshot has best/total',sky.snap.best===12345&&sky.snap.total===36000);await closeShare(page);
 await page.click('[data-action="rankings"]');await page.waitForSelector('.ranking-row.is-mine');
 check('ranking: share button only on own row',(await page.$$('.ranking-share')).length===1&&!!await page.$('.ranking-row.is-mine .ranking-share'));
 const rk=await openShare(page,'.ranking-share','rank');check('rank snapshot from board row',rk.snap.rank===2&&rk.snap.distance===12345&&rk.snap.name==='そらいろ号');await page.screenshot({path:OUT+'/share-rank.png'});await closeShare(page);
 check('ranking page still shown',!!await page.$('.ranking-page'));
 // 5. sky return result
 await page.click('.ranking-page header [data-action="sky-deck"]');await page.waitForSelector('.sky-deck');await page.click('[data-action="sky-start"]');
 await page.waitForSelector('.intro-start',{timeout:10000});await page.click('.intro-start');await page.waitForSelector('.sky-voyage');
 await page.click('[data-action="pause"]');await page.waitForSelector('#dialog[open]');await page.click('[data-action="quit"]');await page.waitForSelector('[data-action="sky-return-confirm"]');await page.click('[data-action="sky-return-confirm"]');await page.waitForSelector('[data-action^="share:voyage:return"]');
 const vy=await openShare(page,'[data-action^="share:voyage:return"]','voyage');check('voyage snapshot has distance and best',vy.snap.distance===0&&vy.snap.best===12345);await closeShare(page);
 check('return result modal still open',!!await page.$('#dialog[open] .result-score'));await page.click('[data-action="workshop"]');
 // 6. stage clear + chapter clear (slot 1)
 await page.click('.rich-workshop header [data-action="map"]');await page.waitForSelector('.map-page');await page.click('.map-page header [data-action="slots"]');await page.waitForSelector('.slot-grid');
 await page.click('[data-action="slot:1"]');await page.waitForSelector('dialog.chapter-dialog[open]');await page.click('.chapter-continue');await page.waitForSelector('.map-page');
 await clearStage(page,4,7);
 check('stage clear modal shown',!!await page.$('#dialog[open] [data-action^="share:stage:clear"]'));
 const starBlock=await page.$eval('#dialog[open] .star-result',el=>({stars:Number(el.dataset.stars),text:el.textContent})).catch(()=>null);
 check('stage clear shows star rating, time, breaks and retry',!!starBlock&&starBlock.stars>=1&&starBlock.stars<=3&&/タイム [0-9.]+秒/.test(starBlock.text)&&/割った回数 \d+/.test(starBlock.text)&&!!await page.$('#dialog[open] [data-action="retry:4"]'),JSON.stringify(starBlock));
 const savedStar=JSON.parse(await page.evaluate(()=>localStorage.getItem('miracle-mine:v1'))).slots[1].stars;
 await page.screenshot({path:OUT+'/clear-stars.png'});
 check('star record saved for stage 4',savedStar&&savedStar[4]&&savedStar[4].stars===starBlock.stars&&savedStar[4].time>0,JSON.stringify(savedStar));
 const st=await openShare(page,'[data-action^="share:stage:clear"]','stage');check('stage snapshot chapter/stage + stars',st.snap.chapter===0&&st.snap.stage===4&&st.snap.stars===starBlock.stars&&st.snap.tenths>0,JSON.stringify(st.snap));await page.screenshot({path:OUT+'/share-stage.png'});await closeShare(page);
 check('stage clear modal still open after share close',!!await page.$('#dialog[open] [data-action="stage:5"]'));
 // retry: no chapter scene, no dialogue — straight to the intro, with the record panel
 await page.click('#dialog [data-action="retry:4"]');await page.waitForSelector('.intro-start',{timeout:10000});
 check('retry skips dialogue and chapter scene',!await page.$('.story-skip')&&!await page.$('dialog.chapter-dialog[open]'));
 const introRows=await page.$$eval('.intro-stars .intro-star-row',rows=>rows.map(r=>r.textContent));
 check('retry intro shows record row + goal row',introRows.length===2&&/きみの記録/.test(introRows[0])&&/★/.test(introRows[0])&&/秒/.test(introRows[0])&&/割った回数 \d/.test(introRows[0])&&/3つ星の条件/.test(introRows[1])&&/秒以内/.test(introRows[1])&&/割らない/.test(introRows[1]),JSON.stringify(introRows));
 const introColor=await page.$eval('.intro-star-row',e=>getComputedStyle(e).color);check('intro star rows use light text',introColor==='rgb(255, 242, 208)',introColor);
 await page.screenshot({path:OUT+'/intro-stars-record.png'});
 await page.click('.intro-start');await page.waitForFunction(()=>!document.querySelector('.stage-intro'));await page.click('[data-action="pause"]');await page.waitForSelector('#dialog[open]');await page.click('[data-action="quit"]');await page.waitForSelector('#dialog[open] [data-action="map"]');await page.click('#dialog[open] [data-action="map"]');await page.waitForSelector('.map-page');
 check('quitting the retry keeps the star record',JSON.parse(await page.evaluate(()=>localStorage.getItem('miracle-mine:v1'))).slots[1].stars[4].stars===starBlock.stars);
 check('map shows stars on the cleared stage and totals',(await page.$eval('[data-action="stage:4"] small',e=>e.textContent)).includes('★')&&(await page.textContent('.map-page')).includes('/ 90')&&(await page.$$eval('.chapter-star-count',els=>els.length))===5);
 await page.click('[data-action="stage:5"]');await page.waitForSelector('.story-skip',{timeout:10000});await page.click('.story-skip');await page.waitForSelector('.intro-start',{timeout:10000});
 check('stage intro shows the three-star condition',(await page.textContent('.intro-stars')).includes('3つ星の条件')&&(await page.$$eval('.intro-stars .intro-star-row',r=>r.length))===1);
 await page.screenshot({path:OUT+'/intro-stars-fresh.png'});
 await page.click('.intro-start');await page.waitForFunction(()=>!document.querySelector('.stage-intro-card, .stage-intro'));
 await clearStage(page,5,8,true);
 await page.waitForSelector('dialog.chapter-dialog[open] .chapter-share');
 check('chapter clear scene shows the star record',/★|☆/.test(await page.textContent('dialog.chapter-dialog .chapter-stars')));
 const ch=await openShare(page,'.chapter-share','chapter');check('chapter snapshot',ch.snap.chapter===0&&ch.snap.level===1);await page.screenshot({path:OUT+'/share-chapter.png'});await closeShare(page);
 check('chapter scene still open',!!await page.$('dialog.chapter-dialog[open]'));
 // chapter-final retry: skips the chapter scene and dialogue, lands on the intro with the record
 await page.screenshot({path:OUT+'/chapter-clear-retry.png'});await page.click('.chapter-retry');await page.waitForSelector('.intro-start',{timeout:10000});
 check('chapter clear retry goes straight to the stage 1-6 intro',!await page.$('dialog.chapter-dialog[open]')&&!await page.$('.story-skip')&&(await page.textContent('.intro-stage'))==='STAGE 1-6'&&/きみの記録/.test(await page.textContent('.intro-stars')));
 await page.click('.intro-start');await page.waitForFunction(()=>!document.querySelector('.stage-intro'));await page.click('[data-action="pause"]');await page.waitForSelector('#dialog[open]');await page.click('[data-action="quit"]');await page.waitForSelector('#dialog[open] [data-action="map"]');await page.click('#dialog[open] [data-action="map"]');await page.waitForSelector('.map-page');
 const after=JSON.parse(await page.evaluate(()=>localStorage.getItem('miracle-mine:v1')));const b=JSON.parse(before);
 const strip=s=>JSON.stringify({...s,updated:0,sky:{...s.sky,flights:0}});check('save: slot 0 unchanged apart from the voyage departure counter',strip(after.slots[0])===strip(b.slots[0])&&after.slots[0].sky.flights===b.slots[0].sky.flights+1);
 check('save: slot 1 gained stage 5 only',JSON.stringify(after.slots[1].cleared)==='[0,1,2,3,4,5]'&&after.slots[2]===null&&JSON.stringify(after.settings)===JSON.stringify(b.settings));
 // 7. image failure
 await page.route(/\/api\/share\?.*image=1/,route=>route.abort());
 await page.click('[data-action="workshop"]');await page.waitForSelector('.rich-workshop');await page.click('[data-action="share:workshop:workshop"]');await page.waitForSelector(dialogSel+' .share-preview.unavailable',{timeout:15000});
 check('image failure keeps link + X sharing',(await page.inputValue(dialogSel+' input')).includes('/api/share?s=')&&!!await page.$(dialogSel+' .share-x')&&await page.$eval(dialogSel+' .share-save',b=>b.hidden));
 await page.screenshot({path:OUT+'/share-image-failure.png'});await closeShare(page);await page.unroute(/\/api\/share\?.*image=1/);
 // 8. landing page
 await page.goto(BASE+'/api/share?s='+rk.code);
 const og=await page.$$eval('meta[property^="og:"],meta[name^="twitter:"]',m=>Object.fromEntries(m.map(e=>[e.getAttribute('property')||e.getAttribute('name'),e.content])));
 check('landing: OGP + twitter card',og['og:image']?.includes('&image=1')&&og['twitter:card']==='summary_large_image'&&og['og:title'].includes('2 位')&&og['og:image:width']==='1200',JSON.stringify(og).slice(0,200));
 await page.waitForFunction(()=>document.querySelector('.share-image')?.naturalWidth===1200,null,{timeout:20000});check('landing: dynamic card image renders (not the fallback)',(await page.$eval('.share-image',i=>i.currentSrc)).includes('&image=1'),await page.$eval('.share-image',i=>i.currentSrc));
 await page.screenshot({path:OUT+'/share-landing.png',fullPage:true});
 const links=await page.$$eval('.share-actions a',a=>a.map(x=>x.getAttribute('href')));check('landing: play links',links.length===2&&links.every(l=>l==='/?via=share&kind=rank'),links.join());
 await page.click('.share-actions a.primary');await page.waitForSelector('.title-screen');
 check('landing → title with clean url',page.url()===BASE+'/');
 await page.click('[data-action="slots"]');await page.click('[data-action="slot:2"]');await page.waitForSelector('.opening-skip',{timeout:10000});
 const stored=JSON.parse(await page.evaluate(()=>localStorage.getItem('miracle-mine:v1')));
 check('landing start creates new slot only',!!stored.slots[2]&&JSON.stringify(stored.slots[0])===JSON.stringify(b.slots[0]));
 await page.waitForTimeout(300);
 check('events: open/x/copy/save/native/visit/start recorded',['open','x','copy','save','native','visit','start'].every(e=>events.some(v=>v.event===e))&&events.some(v=>v.event==='start'&&v.kind==='rank'),JSON.stringify(events.map(e=>e.event+':'+e.kind)));
 check('events: no names or ids',!JSON.stringify(events).includes('そらいろ')&&!JSON.stringify(events).includes(UID));
 const bad=await page.goto(BASE+'/api/share?s=%21%21');check('invalid share url → 400',bad.status()===400);
 await page.context().close();
 // 9. portrait / landscape
 for(const [name,viewport] of [['portrait',{width:390,height:844}],['landscape',{width:852,height:393}]]){
  const p=await makePage(viewport);await p.goto(BASE+'/');await p.waitForSelector('.title-screen');await p.click('[data-action="slots"]');await p.click('[data-action="slot:0"]');await p.waitForSelector('.map-page');await p.click('[data-action="workshop"]');await p.waitForSelector('.rich-workshop');
  await openShare(p,'[data-action="share:workshop:workshop"]',
 'workshop');
  const box=await p.$eval(dialogSel,d=>{const r=d.getBoundingClientRect();return {w:r.width,h:r.height,scroll:d.scrollHeight,client:d.clientHeight,vw:innerWidth,vh:innerHeight};});
  const inside=await p.$$eval(dialogSel+' .share-buttons a, '+dialogSel+' .share-buttons button, '+dialogSel+' .share-close',els=>els.every(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth;}));
  const overlap=await p.$eval(dialogSel,d=>{const f=d.querySelector('.share-preview').getBoundingClientRect(),x=d.querySelector('.share-x').getBoundingClientRect();return !(f.right>x.left+1&&f.left<x.right&&f.bottom>x.top&&f.top<x.bottom);});check(`${name}: dialog fits viewport width and controls visible`,box.w<=box.vw&&inside&&overlap,JSON.stringify(box)+' nooverlap='+overlap);
  await p.screenshot({path:OUT+'/share-'+name+'.png'});await closeShare(p);await p.context().close();
 }
}catch(e){check('script completed',false,e.stack);}
await browser.close();server.kill();
const failed=results.filter(r=>r[0]==='FAIL');console.log(`\n${results.length-failed.length}/${results.length} checks passed`);
writeFileSync(OUT+'/verify-sharing.json',JSON.stringify(results,null,1));
process.exit(failed.length?1:0);
