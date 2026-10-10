import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {KEY,fresh,freshSlot} from '../../src/save.js';
import {AUDIO_KEY} from '../../src/soundtrack.js';
import {ONLINE_INTRO_KEY} from '../../src/online-story.js';
import {createRound,applyMove} from '../../src/online-rules.js';
import {adjacent,evaluate} from '../../src/engine.js';

const action=(page,name)=>page.locator(`[data-online="${name}"]`);
const titleEntry=page=>page.locator('[data-action="online"]');
const localBoard=page=>page.locator('#online-local-board');
const peerBoard=page=>page.locator('#online-peer-board');
const boardDigits=locator=>locator.locator('.stone .sr-only').allTextContents().then(values=>values.map(Number));
const selected=locator=>locator.locator('.stone.selected').evaluateAll(stones=>stones.map(el=>Number(el.dataset.onlineIndex)));

function savedAdventure(unlocked=true){
 const value=fresh();value.settings.sound=false;
 value.slots=[{...freshSlot(),cleared:Array.from({length:unlocked?30:29},(_,i)=>i),paint:2,wing:1,flightName:'試験用の飛行機',updated:1700000000000,futureField:'keep this existing slot byte-for-byte'},
  {...freshSlot(),cleared:[0,1,2],paint:1,updated:1700000000001},null];
 value.bests={'score-add':1234,'endless-mix':567};value.futureField='preserve unknown existing fields too';
 return JSON.stringify(value,null,2);
}

async function player(browser,{mobile=false,unlocked=true,introSeen=true}={}){
 const context=await browser.newContext({
  viewport:mobile?{width:390,height:844}:{width:1280,height:900},
  isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce',serviceWorkers:'block'
 });
 const original=savedAdventure(unlocked);
 await context.addInitScript(({original,key,audioKey,introKey,introSeen})=>{
  if(localStorage.getItem(key)===null)localStorage.setItem(key,original);
  localStorage.setItem(audioKey,JSON.stringify({version:1,music:false,sound:false,musicVolume:0,soundVolume:0}));
  if(introSeen)localStorage.setItem(introKey,'1');
  // Observe real native peers without changing configuration, ICE, methods or transport.
  // The test must fail if Chromium cannot open an actual data channel.
  const NativePeer=window.RTCPeerConnection;
  window.__qaPeers=[];window.__qaIceErrors=[];
  window.RTCPeerConnection=new Proxy(NativePeer,{
   construct(Target,args){
    const peer=Reflect.construct(Target,args,Target);window.__qaPeers.push(peer);
    peer.addEventListener('icecandidateerror',event=>window.__qaIceErrors.push({code:event.errorCode}));
    return peer;
   }
  });
 },{original,key:KEY,audioKey:AUDIO_KEY,introKey:ONLINE_INTRO_KEY,introSeen});
 const page=await context.newPage(),requests=[],views=[],errors=[];
 page.on('request',request=>{
  const url=new URL(request.url());if(url.pathname==='/api/online')requests.push({action:url.searchParams.get('action'),at:Date.now()});
 });
 page.on('response',async response=>{
  const url=new URL(response.url());if(url.pathname!=='/api/online')return;
  try{const data=await response.json();views.push({action:url.searchParams.get('action'),status:response.status(),data});}catch{}
 });
 page.on('pageerror',error=>errors.push(error.message));
 return {context,page,mobile,original,requests,views,errors};
}
async function preserveSave(p){
 if(p.page.isClosed())return;
 expect(await p.page.evaluate(key=>localStorage.getItem(key),KEY)).toBe(p.original);
 expect(p.errors).toEqual([]);
}
async function visible(p){expect(await p.page.evaluate(()=>document.visibilityState)).toBe('visible');}
async function rtcConnected(p){
 await expect.poll(()=>p.page.evaluate(()=>window.__qaPeers.some(peer=>
  peer.connectionState==='connected'&&['connected','completed'].includes(peer.iceConnectionState)&&peer.sctp?.state==='connected'
 )),{timeout:45000,message:'The native ICE/DTLS/SCTP connection must open; no RTC mock is used.'}).toBe(true);
}
async function diagnostics(players){
 for(const [index,p] of players.entries()){
  if(p.page.isClosed())continue;
  // Intentionally omit SDP, IP addresses, ICE usernames, room keys and bearer headers.
  const safe=await p.page.evaluate(()=>({
   visibility:document.visibilityState,
   peers:window.__qaPeers.map(peer=>({
    connection:peer.connectionState,ice:peer.iceConnectionState,gathering:peer.iceGatheringState,
    signaling:peer.signalingState,sctp:peer.sctp?.state||null,
    localType:peer.localDescription?.type||null,remoteType:peer.remoteDescription?.type||null,
    localCandidateCount:(peer.localDescription?.sdp.match(/^a=candidate:/gm)||[]).length,
    remoteCandidateCount:(peer.remoteDescription?.sdp.match(/^a=candidate:/gm)||[]).length
   })),iceErrors:window.__qaIceErrors
  })).catch(()=>({unavailable:true}));
  console.error(`RTC diagnostics for player ${index+1}: ${JSON.stringify(safe)}`);
  console.error(`Online API statuses for player ${index+1}: ${JSON.stringify(p.views.map(v=>({action:v.action,status:v.status,error:v.data.error||null})))}`);
 }
}
async function withPlayers(browser,run,options={}){
 const host=await player(browser,options.host),guest=await player(browser,{mobile:true,...options.guest}),players=[host,guest];
 try{await run(host,guest);}catch(error){await diagnostics(players);throw error;}
 finally{for(const p of players)await p.context.close().catch(()=>{});}
}
async function enter(p){
 await p.page.goto('/');await expect(titleEntry(p.page)).toBeEnabled();await titleEntry(p.page).click();
 await expect(action(p.page,'create')).toBeVisible();await visible(p);
}
async function room(host,guest,{fresh=true}={}){
 if(fresh)await Promise.all([enter(host),enter(guest)]);
 await action(host.page,'create').click();
 const link=host.page.locator('#online-room-link');await expect(link).toBeVisible();const invite=await link.inputValue();
 expect(new URL(invite).hash).toMatch(/^#online=[a-f0-9-]{36}$/);
 await guest.page.locator('#online-invite').fill(invite);await action(guest.page,'join').click();
 await Promise.all([
  expect(action(host.page,'ready')).toBeEnabled({timeout:45000}),
  expect(action(guest.page,'ready')).toBeEnabled({timeout:45000}),
  rtcConnected(host),rtcConnected(guest)
 ]);
 await Promise.all([visible(host),visible(guest)]);
 return invite;
}
async function start(host,guest){
 await action(host.page,'ready').click();await action(guest.page,'ready').click();
 // The host may learn the start time one poll later. Both still get the same startAt.
 await Promise.all([host,guest].map(async p=>{
  await expect(p.page.locator('.online-countdown')).toBeVisible();
  await expect(p.page.locator('.online-mission')).toHaveCSS('visibility','hidden');
  await expect(p.page.locator('.online-boards')).toHaveAttribute('aria-hidden','true');
  await expect(p.page.locator('.online-boards')).toHaveAttribute('inert','');
  await expect(localBoard(p.page)).toBeHidden();
  expect(await p.page.getByRole('button',{name:/、[1-5]行[1-5]列/}).count()).toBe(0);
 }));
 await Promise.all([host,guest].map(async p=>{
  await expect(p.page.locator('.online-countdown')).toHaveCount(0,{timeout:15000});
  await expect(localBoard(p.page)).toBeVisible();
  await expect(p.page.locator('.online-boards')).not.toHaveAttribute('aria-hidden');
  await expect(action(p.page,'op:+')).toBeEnabled();
 }));
 await expect.poll(()=>host.views.find(v=>Number.isInteger(v.data.seed))?.data.seed).not.toBeUndefined();
 await expect.poll(()=>guest.views.find(v=>Number.isInteger(v.data.seed))?.data.seed).not.toBeUndefined();
 const hostView=host.views.find(v=>Number.isInteger(v.data.seed)).data,guestView=guest.views.find(v=>Number.isInteger(v.data.seed)).data;
 expect(guestView.seed).toBe(hostView.seed);expect(guestView.startAt).toBe(hostView.startAt);expect(guestView.target).toBe(hostView.target);
 const initial=createRound(hostView.seed);
 expect(await boardDigits(localBoard(host.page))).toEqual(initial.board);
 expect(await boardDigits(localBoard(guest.page))).toEqual(initial.board);
 expect(await boardDigits(peerBoard(host.page))).toEqual(initial.board);
 expect(await boardDigits(peerBoard(guest.page))).toEqual(initial.board);
 await Promise.all([visible(host),visible(guest)]);
 return initial;
}
function solutionPair(round){
 for(let a=0;a<25;a++)for(let b=a+1;b<25;b++)if(adjacent(a,b)&&round.board[a]*round.board[b]===round.target)return [a,b];
 throw new Error('Seeded starting board should have an adjacent multiplication solution.');
}
function preparation(round,preserve){
 const protectedColumns=new Set(preserve.map(i=>i%5));
 for(const kind of ['merge','clear'])for(let a=0;a<20;a++){
  const path=[a,a+5];if(!protectedColumns.has(a%5)&&evaluate(round.board,path,'+',round.target).kind===kind)return path;
 }
 throw new Error('A non-winning preparation move must exist outside the solution columns.');
}
async function selectKeyboard(p,path,op){
 await action(p.page,`op:${op}`).click();await action(p.page,'cancel').click();
 for(const index of path){const stone=localBoard(p.page).locator(`[data-online-index="${index}"]`);await stone.focus();await p.page.keyboard.press('Space');}
}
async function point(p,index){
 const stone=localBoard(p.page).locator(`[data-online-index="${index}"]`),box=await stone.boundingBox();
 if(!box)throw new Error('The local stone must be visible for touch input.');return {x:box.x+box.width/2,y:box.y+box.height/2};
}
async function touchTrace(p,path,whileHeld){
 await localBoard(p.page).scrollIntoViewIfNeeded();const cdp=await p.context.newCDPSession(p.page);let last=await point(p,path[0]);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...last,id:0,radiusX:1,radiusY:1,force:1}]});
 try{
  for(const index of path.slice(1)){
   const next=await point(p,index);
   for(let step=1;step<=8;step++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:last.x+(next.x-last.x)*step/8,y:last.y+(next.y-last.y)*step/8,id:0,radiusX:1,radiusY:1,force:1}]});
   last=next;
  }
  await whileHeld();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]}).catch(()=>{});await cdp.detach();}
}
async function exitToTitle(p){
 await action(p.page,'exit').first().click();await expect(p.page.locator('.title-screen')).toBeVisible();
 expect(new URL(p.page.url()).hash).toBe('');await expect(titleEntry(p.page)).toBeEnabled();await preserveSave(p);
}

test('unlock, story, disclosure and direct mobile exit never connect without consent',async({browser})=>{
 await withPlayers(browser,async(host,guest)=>{
  await host.page.goto('/');await expect(titleEntry(host.page)).toBeDisabled();
  await host.page.goto('/#online='+randomUUID());await expect(host.page.getByText('冒険をすべてクリアすると開放')).toBeVisible();
  await expect(action(host.page,'create')).toHaveCount(0);await expect(action(host.page,'join')).toHaveCount(0);
  expect(host.requests).toHaveLength(0);expect(await host.page.evaluate(()=>window.__qaPeers.length)).toBe(0);
  await guest.page.goto('/#online='+randomUUID());
  await expect(guest.page.locator('.story-dialog')).toBeVisible();await guest.page.locator('.story-skip').click();
  await expect(guest.page.locator('.online-disclosure')).toContainText('IPアドレス');
  await expect(guest.page.locator('.online-disclosure')).toContainText('Google');
  await expect(guest.page.locator('.online-disclosure')).toContainText('Vercel／Neon');
  await action(guest.page,'story').click();await expect(guest.page.locator('.story-dialog')).toBeVisible();await guest.page.locator('.story-skip').click();
  await guest.page.waitForTimeout(400);
  expect(guest.requests).toHaveLength(0);expect(await guest.page.evaluate(()=>window.__qaPeers.length)).toBe(0);
  await preserveSave(host);await exitToTitle(guest);
 },{host:{unlocked:false},guest:{introSeen:false}});
});

test('native desktop/mobile peers exchange operations, traces and boards, then validate a result and a new room',async({browser})=>{
 await withPlayers(browser,async(host,guest)=>{
  const firstInvite=await room(host,guest),initial=await start(host,guest),winningPath=solutionPair(initial),path=preparation(initial,winningPath);
  const pollCounts=[host,guest].map(p=>p.requests.filter(r=>r.action==='poll').length);
  await selectKeyboard(host,path,'×');
  await expect.poll(()=>selected(peerBoard(guest.page))).toEqual(path);
  await expect(guest.page.locator('#online-peer-equation')).toContainText('×');
  await action(host.page,'op:+').click();await expect(guest.page.locator('#online-peer-equation')).toContainText('+');
  const prepared=applyMove(initial,{path,op:'+'});
  // A real DOM click must update local digits in this same JavaScript task,
  // before a promise, fetch response or remote acknowledgement can run.
  const synchronous=await host.page.evaluate(()=>{
   document.querySelector('[data-online="confirm"]').click();
   return [...document.querySelectorAll('#online-local-board .stone .sr-only')].map(el=>Number(el.textContent));
  });
  expect(synchronous).toEqual(prepared.board);
  await expect.poll(()=>boardDigits(peerBoard(guest.page))).toEqual(prepared.board);
  expect(await boardDigits(localBoard(guest.page))).toEqual(initial.board);
  await action(guest.page,'op:+').click();
  await touchTrace(guest,path,async()=>{
   await expect.poll(()=>selected(peerBoard(host.page))).toEqual(path);
   await expect(host.page.locator('#online-peer-equation')).toContainText('+');
  });
  await expect.poll(()=>boardDigits(localBoard(guest.page))).toEqual(prepared.board);
  await expect.poll(()=>boardDigits(peerBoard(host.page))).toEqual(prepared.board);
  // A lobby polling interval passes while play is active, with native heartbeat traffic only.
  await host.page.waitForTimeout(2800);
  expect([host,guest].map(p=>p.requests.filter(r=>r.action==='poll').length)).toEqual(pollCounts);
  await selectKeyboard(host,winningPath,'×');await action(host.page,'confirm').click();
  await expect(host.page.getByRole('heading',{name:'お題、完成！ きみの勝ち！',exact:true})).toBeVisible({timeout:20000});
  await expect(guest.page.getByRole('heading',{name:'相手のお題が、先に完成！',exact:true})).toBeVisible({timeout:20000});
  for(const p of [host,guest]){await preserveSave(p);expect(p.requests.filter(r=>r.action==='report')).toHaveLength(1);}
  await Promise.all([action(host.page,'new').click(),action(guest.page,'new').click()]);
  const nextInvite=await room(host,guest,{fresh:false});expect(nextInvite).not.toBe(firstInvite);
  // Reload ends negotiated RTC. The hash may open a lobby, but nothing reconnects eagerly.
  await preserveSave(guest);await guest.page.reload();await expect(action(guest.page,'join')).toBeVisible();
  const afterReload=guest.requests.length;await guest.page.waitForTimeout(400);expect(guest.requests.length).toBe(afterReload);
  expect(await guest.page.evaluate(()=>window.__qaPeers.length)).toBe(0);
  await action(guest.page,'join').click();await expect(guest.page.locator('.online-result')).toBeVisible();
  await expect(guest.page.locator('.online-result')).not.toContainText('きみの勝ち');
  await expect(host.page.locator('.online-result')).toBeVisible({timeout:12000});
  await Promise.all([action(host.page,'new').click(),action(guest.page,'new').click()]);
  await Promise.all([exitToTitle(host),exitToTitle(guest)]);
 });
});

test('near-simultaneous native finishes are a draw for both clients',async({browser})=>{
 await withPlayers(browser,async(host,guest)=>{
  await room(host,guest);const initial=await start(host,guest),path=solutionPair(initial);
  await Promise.all([selectKeyboard(host,path,'×'),selectKeyboard(guest,path,'×')]);
  await Promise.all([action(host.page,'confirm').click(),action(guest.page,'confirm').click()]);
  for(const p of [host,guest]){await expect(p.page.getByRole('heading',{name:'ほぼ同時に完成！ 引き分け',exact:true})).toBeVisible({timeout:20000});await preserveSave(p);}
 });
});

test('closing the remote browser during play yields no contest, never an automatic win',async({browser})=>{
 await withPlayers(browser,async(host,guest)=>{
  await room(host,guest);await start(host,guest);await preserveSave(guest);
  await guest.context.close();
  await expect(host.page.getByRole('heading',{name:'今回は勝敗なし',exact:true})).toBeVisible({timeout:20000});
  await expect(host.page.locator('.online-result')).not.toContainText('きみの勝ち');await preserveSave(host);
  await action(host.page,'new').click();await expect(action(host.page,'create')).toBeVisible();
  await exitToTitle(host);
 });
});

test('reloading a live match cannot resume or award a win and leaves the original save untouched',async({browser})=>{
 await withPlayers(browser,async(host,guest)=>{
  await room(host,guest);await start(host,guest);await preserveSave(guest);
  await guest.page.reload();await expect(action(guest.page,'join')).toBeVisible();
  const afterReload=guest.requests.length;await guest.page.waitForTimeout(400);
  expect(guest.requests.length).toBe(afterReload);expect(await guest.page.evaluate(()=>window.__qaPeers.length)).toBe(0);
  await preserveSave(guest);await action(guest.page,'join').click();
  await expect(guest.page.getByRole('heading',{name:'今回は勝敗なし',exact:true})).toBeVisible();
  expect(await guest.page.evaluate(()=>window.__qaPeers.length)).toBe(0);
  await expect(host.page.getByRole('heading',{name:'今回は勝敗なし',exact:true})).toBeVisible({timeout:20000});
  await Promise.all([preserveSave(host),preserveSave(guest)]);
  await Promise.all([action(host.page,'new').click(),action(guest.page,'new').click()]);
  await Promise.all([exitToTitle(host),exitToTitle(guest)]);
 });
});
