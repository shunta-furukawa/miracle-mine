import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {OnlineRoom,onlineUnlocked,parseOnlineInvite,validateSnapshot,estimateClock,resultCopy,SNAPSHOT_LIMIT} from '../src/online.js';
import {createRound,MAX_ROUND_MS} from '../src/online-rules.js';
import {solution,evaluate} from '../src/engine.js';
const id='12345678-1234-1234-1234-123456789abc';
const state=()=>({protocol:1,type:'state',seq:1,board:Array(25).fill(3),path:[0,6,12],op:'×',elapsed:23,moves:1,solved:false,finished:false});

test('room link parsing accepts only current origin + UUID, never a credential or external URL',()=>{
 const origin='https://example.com';assert.equal(parseOnlineInvite(id,origin),id);assert.equal(parseOnlineInvite(origin+'/#online='+id,origin),id);assert.equal(parseOnlineInvite('#online='+id,origin),id);
 for(const value of ['https://evil.test/#online='+id,'javascript:alert(1)','../../other','#online=abc',null,'x'.repeat(2049)])assert.equal(parseOnlineInvite(value,origin),null);
});
test('all thirty stage IDs in one of the three slots are required',()=>{
 assert.equal(onlineUnlocked({slots:[{cleared:Array.from({length:29},(_,i)=>i)}]}),false);
 assert.equal(onlineUnlocked({slots:[null,null,{cleared:Array.from({length:30},(_,i)=>i)}]}),true);
 assert.equal(onlineUnlocked({slots:[null,null,null,{cleared:Array.from({length:30},(_,i)=>i)}]}),false);
 assert.equal(onlineUnlocked({slots:[{cleared:Array(30).fill(29)}]}),false);
});
test('snapshot whitelist rejects duplicate or stale sequence, invalid digits, path, operator and arbitrary content',()=>{
 assert.equal(validateSnapshot(state()),true);assert.equal(validateSnapshot(state(),1),false);
 const invalid=[{seq:-1},{seq:1.5},{protocol:2},{board:Array(25).fill(10)},{board:[1]},{path:[0,0]},{path:[0,24]},{path:[0,-1]},{op:'/'},{elapsed:MAX_ROUND_MS+2001},{moves:301},{solved:true},{chat:'hello'},{type:'signal'}];
 for(const change of invalid)assert.equal(validateSnapshot({...state(),...change}),false,JSON.stringify(change));
 assert.equal(validateSnapshot({...state(),solved:true,finished:true}),true);assert.ok(JSON.stringify(state()).length<SNAPSHOT_LIMIT);
});
test('clock estimate is the request midpoint plus a conservative margin',()=>{
 assert.deepEqual(estimateClock(1200,1000,100),{offset:150,uncertainty:75});
});
test('no-solution draws and uncertain results never claim successful completion or a win',()=>{
 assert.match(resultCopy({kind:'draw',reason:'no_solution'},0)[0],/引き分け/);
 assert.doesNotMatch(resultCopy({kind:'draw',reason:'no_solution'},0).join(''),/同時に完成/);
 for(const kind of ['uncertain','cancelled'])assert.doesNotMatch(resultCopy({kind,winner:0},0)[0],/きみの勝ち/);
 assert.match(resultCopy({kind:'win',winner:0},0)[0],/きみの勝ち/);
});
test('committing a move updates local board and full replay before touching transport',()=>{
 const client=Object.create(OnlineRoom.prototype);client.round=createRound(71);client.path=[0,1];client.op='+';
 if(evaluate(client.round.board,client.path,client.op,client.round.target).kind==='success')client.op='×';
 client.moves=[];client.canPlay=()=>true;client.elapsed=()=>125;client.paintLocal=()=>{};client.play=()=>{};client.notice=()=>{};
 let sent=false;client.sendState=()=>{sent=true;assert.equal(client.round.moves,1);assert.equal(client.moves.length,1);assert.deepEqual(client.moves[0],{path:[0,1],op:client.op,at:125});};
 client.finishLocal=()=>{throw new Error('unexpected solve');};client.commit();assert.equal(sent,true);assert.deepEqual(client.path,[]);
});
test('a solved move is recorded synchronously and finishes locally without awaiting server',()=>{
 const client=Object.create(OnlineRoom.prototype);client.round=createRound(99);const found=solution(client.round.board,client.round.target,['+','×']);assert.ok(found);
 client.path=found.path;client.op=found.op;client.moves=[];client.canPlay=()=>true;client.elapsed=()=>220;client.paintLocal=()=>{};client.play=()=>{};client.notice=()=>{};
 let finished=false;client.finishLocal=solved=>{finished=solved;assert.equal(client.round.solved,true);assert.equal(client.moves.at(-1).at,220);};client.sendState=()=>{throw new Error('must finish first');};client.commit();assert.equal(finished,true);
});
test('peer finish grants one bounded grace period; malformed and repeated packets cannot extend it',()=>{
 const client=Object.create(OnlineRoom.prototype);Object.assign(client,{alive:true,terminal:false,round:createRound(1),peerSeq:-1,root:{querySelector:()=>null},paintPeer:()=>{},notice:()=>{}});
 const packet={...state(),solved:true,finished:true};client.receive(JSON.stringify(packet));const deadline=client.peerFinishDeadline;assert.ok(deadline>performance.now()+1400);assert.ok(deadline<=performance.now()+1500);
 client.receive(JSON.stringify({...packet,seq:2}));assert.equal(client.peerFinishDeadline,deadline);assert.equal(client.peerSeq,2);
 client.receive(JSON.stringify({...packet,seq:3,chat:'injected'}));assert.equal(client.peerSeq,2);client.receive('x'.repeat(SNAPSHOT_LIMIT+1));assert.equal(client.peerSeq,2);
});
function globals(values,run){const old=new Map();for(const [key,value] of Object.entries(values)){old.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});}try{return run();}finally{for(const [key,descriptor] of old){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}}
test('opening a room link renders disclosure but does not create a peer, send API calls or change saves',()=>{
 let network=0,peers=0,writes=0;const root={innerHTML:'',addEventListener:()=>{}};
 globals({window:{addEventListener:()=>{}},document:{hidden:false,addEventListener:()=>{},querySelector:()=>null},localStorage:{getItem:()=> '1',setItem:()=>writes++},sessionStorage:{getItem:()=>null},location:{href:'https://example.com/#online='+id},fetch:()=>{network++;},RTCPeerConnection:class {constructor(){peers++;}}},()=>{
  const client=new OnlineRoom({root,unlocked:true,roomId:id,onExit:()=>{},conversation:()=>{}});assert.match(root.innerHTML,/IPアドレス/);assert.match(root.innerHTML,/Google/);assert.match(root.innerHTML,/同意して部屋に入る/);assert.equal(network,0);assert.equal(peers,0);assert.equal(writes,0);client.dispose();assert.equal(network,0);
 });
});
test('locked invite stays locked and exit cleans timers, requests and RTC callbacks',()=>{
 const root={innerHTML:'',addEventListener:()=>{}};let aborted=0,closed=0;
 globals({window:{addEventListener:()=>{}},document:{addEventListener:()=>{},querySelector:()=>null},localStorage:{getItem:()=>null},sessionStorage:{getItem:()=>null},location:{href:'https://example.com/#online='+id}},()=>{
  const client=new OnlineRoom({root,unlocked:false,roomId:id,onExit:()=>{},conversation:()=>{throw new Error('locked story');}});assert.match(root.innerHTML,/全30ステージ/);assert.doesNotMatch(root.innerHTML,/data-online="join"/);client.requests.add({abort:()=>aborted++});client.channel={close:()=>closed++};client.pc={close:()=>closed++};client.later(()=>{throw new Error('leaked timeout');},5000);client.dispose();client.dispose();assert.equal(aborted,1);assert.equal(closed,2);assert.equal(client.timers.size,0);assert.equal(client.channel,null);assert.equal(client.pc,null);
 });
});
test('online UI integrates below adventure without modifying the adventure save or ranking client',async()=>{
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');assert.match(app,/'slots'\)\}\$\{onlineTitleButton\(\)\}/);assert.match(app,/window.addEventListener\('popstate',onlineRoute\)/);
 const online=await readFile(new URL('../src/online.js',import.meta.url),'utf8');assert.doesNotMatch(online,/from ['"]\.\/save\.js|RankingClient|miracle-mine:v1/);assert.match(online,/sessionStorage/);assert.match(online,/stun:stun.l.google.com:19302/);
});
test('host can wait for the invite; connection deadline starts only when the other seat joins',()=>{
 const client=Object.create(OnlineRoom.prototype);client.room={seat:0};let timers=0;client.later=(fn,ms)=>{assert.equal(ms,25000);timers++;return 1;};
 client.armConnectionTimeout({joined:[true,false]});assert.equal(timers,0);client.armConnectionTimeout({joined:[true,true]});assert.equal(timers,1);client.armConnectionTimeout({joined:[true,true]});assert.equal(timers,1);
});
test('late signaling completion cannot alter a replacement room after navigation',async()=>{
 let resolveRemote;const remote=new Promise(resolve=>resolveRemote=resolve),client=Object.create(OnlineRoom.prototype);
 Object.assign(client,{alive:true,terminal:false,room:{seat:1,id:'old'},pc:{setRemoteDescription:()=>remote},remoteSet:false,armConnectionTimeout:()=>{}});
 const pending=client.acceptView({phase:'waiting',peerDescription:{type:'offer',sdp:'test'}});client.room={seat:0,id:'new'};client.pc={};client.remoteSet=false;client.signaling=false;client.view=null;resolveRemote();await pending;
 assert.equal(client.remoteSet,false);assert.equal(client.signaling,false);assert.equal(client.view,null);
});
test('countdown hides target and boards from visual and accessible UI until the synchronized start',async()=>{
 const [js,css]=await Promise.all([readFile(new URL('../src/online.js',import.meta.url),'utf8'),readFile(new URL('../src/online.css',import.meta.url),'utf8')]);
 assert.match(js,/online-play-page online-waiting/);assert.equal((js.match(/data-online-round-content inert aria-hidden="true"/g)||[]).length,2);assert.match(css,/\.online-waiting \[data-online-round-content\]\{visibility:hidden\}/);assert.match(js,/if\(now>=this.startMono\)\{this.ui='playing';/);
});

// Unit-only clock/peer doubles. Browser E2E keeps the native WebRTC transport.
function gatheringFixture({sdp='',complete=false}={}){
 const pc=new EventTarget(),client=Object.create(OnlineRoom.prototype),listeners=new Set(),timers=new Map(),cleared=[];
 const add=pc.addEventListener.bind(pc),remove=pc.removeEventListener.bind(pc);let timerId=0,closed=0;
 Object.assign(pc,{iceGatheringState:complete?'complete':'gathering',localDescription:{type:'offer',sdp},close:()=>{closed++;}});
 pc.addEventListener=(type,fn)=>{listeners.add(fn);add(type,fn);};
 pc.removeEventListener=(type,fn)=>{listeners.delete(fn);remove(type,fn);};
 client.pc=pc;
 return {pc,client,listeners,timers,cleared,get closed(){return closed;},run:fn=>globals({
  setTimeout:(callback,ms)=>{const id=++timerId;timers.set(id,{callback,ms});return id;},
  clearTimeout:id=>{cleared.push(id);timers.delete(id);}
 },fn)};
}
const hostCandidate='v=0\r\na=candidate:1 1 udp 2122260223 192.0.2.1 50000 typ host\r\n';
test('ICE bounded wait keeps real gathered candidates when STUN completion is delayed',async()=>{
 const f=gatheringFixture({sdp:hostCandidate});let pending;
 f.run(()=>{pending=f.client.gatherICE();assert.equal(f.listeners.size,1);const timer=[...f.timers.values()][0];assert.equal(timer.ms,8000);timer.callback();assert.equal(f.listeners.size,0);assert.equal(f.timers.size,0);assert.equal(f.client.iceCancel,null);});
 await pending;assert.equal(f.pc.iceGatheringState,'gathering');assert.equal(f.closed,0);assert.equal(f.pc.localDescription.sdp,hostCandidate);
});
test('ICE bounded wait rejects missing candidates and cleans its listener and timeout',async()=>{
 const f=gatheringFixture({sdp:'v=0\r\na=ice-options:trickle\r\n'});let pending;
 f.run(()=>{pending=f.client.gatherICE();[...f.timers.values()][0].callback();assert.equal(f.listeners.size,0);assert.equal(f.timers.size,0);assert.equal(f.client.iceCancel,null);});
 await assert.rejects(pending,{message:'ICE_TIMEOUT'});
});
test('ICE normal completion resolves early with current candidates and cancels the bounded wait',async()=>{
 const f=gatheringFixture();let pending;
 f.run(()=>{pending=f.client.gatherICE();f.pc.localDescription.sdp=hostCandidate;f.pc.iceGatheringState='complete';f.pc.dispatchEvent(new Event('icegatheringstatechange'));assert.equal(f.listeners.size,0);assert.equal(f.timers.size,0);assert.equal(f.client.iceCancel,null);});
 await pending;
 const done=gatheringFixture({sdp:hostCandidate,complete:true});await done.run(()=>done.client.gatherICE());assert.equal(done.timers.size,0);assert.equal(done.listeners.size,0);
});
test('ICE disposal rejects pending gathering and ignores late completion without leaking listeners',async()=>{
 const f=gatheringFixture({sdp:hostCandidate});let pending,lateTimeout;
 f.run(()=>{pending=f.client.gatherICE();lateTimeout=[...f.timers.values()][0].callback;f.client.stopPeer();assert.equal(f.listeners.size,0);assert.equal(f.timers.size,0);assert.equal(f.client.iceCancel,null);assert.equal(f.client.pc,null);f.pc.iceGatheringState='complete';f.pc.dispatchEvent(new Event('icegatheringstatechange'));lateTimeout();});
 await assert.rejects(pending,{message:'DISPOSED'});assert.equal(f.closed,1);assert.equal(f.cleared.length,1);
});
test('ICE completion without any candidate fails explicitly without allocating a new wait',async()=>{
 const f=gatheringFixture({sdp:'v=0\r\n',complete:true});await assert.rejects(f.run(()=>f.client.gatherICE()),{message:'ICE_TIMEOUT'});assert.equal(f.timers.size,0);assert.equal(f.listeners.size,0);
});
