import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {schema,service,ROOM_TTL_MS,FINISHED_TTL_MS,COUNTDOWN_MS,REPORT_GRACE_MS,MAX_BODY_BYTES,MAX_SDP_BYTES,MAX_ROOMS} from '../server/online.js';
import {createRound,MAX_ROUND_MS,ONLINE_PROTOCOL} from '../src/online-rules.js';
import {solution} from '../src/engine.js';

const host='a'.repeat(64),guest='b'.repeat(64),third='c'.repeat(64),other='d'.repeat(64);
const offer={type:'offer',sdp:'v=0\r\na=ice-ufrag:host\r\n'},answer={type:'answer',sdp:'v=0\r\na=ice-ufrag:guest\r\n'};
async function fixture(){
 const db=new PGlite();for(const sql of schema)await db.exec(sql);let time=2000000000000,serial=0,writes=0;
 const query=async(sql,params)=>{if(/^(UPDATE|INSERT|DELETE)/.test(sql))writes++;return (await db.query(sql,params)).rows;};
 const api=service(query,{now:()=>time,seed:()=>++serial});
 return {db,api,query,get time(){return time},set time(value){time=value},get writes(){return writes}};
}
async function newRoom(f,key=host){const roomId=randomUUID(),view=await f.api('create',{roomId,protocol:ONLINE_PROTOCOL},key);return {roomId,view};}
async function start(f){
 const {roomId}=await newRoom(f);await f.api('join',{roomId},guest);await f.api('signal',{roomId,description:offer},host);await f.api('signal',{roomId,description:answer},guest);await f.api('ready',{roomId},host);const view=await f.api('ready',{roomId},guest);return {roomId,view};
}
function report(view,at,{solved=true,clockUncertainty=20}={}){
 const round=createRound(view.seed),move=solution(round.board,round.target,['×','+']);return {roomId:view.roomId,moves:solved?[{...move,at}]:[],elapsed:at,solved,clockUncertainty};
}

test('SQL room service: private seed, atomic seats/readiness, bounded signaling and immutable valid outcomes',async()=>{
 const f=await fixture();try{
  const {api,query}=f,{roomId,view}=await newRoom(f);assert.equal(view.seat,0);assert.equal(view.seed,null);assert.equal(view.target,null);assert.equal(view.phase,'waiting');assert.equal(view.expiresAt,f.time+ROOM_TTL_MS);
  assert.deepEqual(await api('create',{roomId,protocol:ONLINE_PROTOCOL},host),view);await assert.rejects(api('create',{roomId,protocol:0},host),/VERSION/);await assert.rejects(api('create',{roomId,protocol:1},guest),/AUTH/);
  await assert.rejects(api('poll',{roomId},guest),/AUTH/);await assert.rejects(api('poll',{roomId},'bad'),/AUTH/);await assert.rejects(api('join',{roomId:'x'},guest),/INPUT/);
  const joined=await Promise.all([api('join',{roomId},guest),api('join',{roomId},guest)]);assert(joined.every(v=>v.seat===1));await assert.rejects(api('join',{roomId},third),/FULL/);assert.equal((await api('join',{roomId},host)).seat,0);
  await assert.rejects(api('ready',{roomId},host),/NOT_CONNECTED/);await assert.rejects(api('signal',{roomId,description:answer},guest),/SIGNAL_ORDER/);await assert.rejects(api('signal',{roomId,description:answer},host),/SIGNAL/);
  await api('signal',{roomId,description:offer},host);await api('signal',{roomId,description:offer},host);await assert.rejects(api('signal',{roomId,description:{...offer,sdp:'different'}},host),/SIGNAL_CONFLICT/);
  await assert.rejects(api('signal',{roomId,description:{...answer,sdp:'x'.repeat(MAX_SDP_BYTES+1)}},guest),/SIGNAL/);await api('signal',{roomId,description:answer},guest);
  assert.deepEqual((await api('poll',{roomId},host)).peerDescription,answer);assert.deepEqual((await api('poll',{roomId},guest)).peerDescription,offer);
  const first=await api('ready',{roomId},host);assert.equal(first.seed,null);const ready=await api('ready',{roomId},guest);assert.equal(ready.phase,'countdown');assert.equal(ready.startAt,f.time+COUNTDOWN_MS);assert.equal(ready.target,createRound(ready.seed).target);assert.deepEqual(await api('ready',{roomId},guest),ready);
  await assert.rejects(api('report',report(ready,100),host),/EARLY/);const writes=f.writes;await api('poll',{roomId},host);await api('poll',{roomId},guest);assert.equal(f.writes,writes,'polls do not write');
  f.time=ready.startAt+2000;const a=report(ready,2000);const waiting=await api('report',a,host);assert.equal(waiting.result,null);assert.equal(waiting.reportDeadline,f.time+REPORT_GRACE_MS);assert.deepEqual(waiting.reported,[true,false]);
  f.time+=100;const finished=await api('report',report(ready,2100,{solved:false}),guest);assert.deepEqual(finished.result,{kind:'win',winner:0,reason:'validated'});assert.equal(finished.phase,'finished');assert.equal(finished.expiresAt,f.time+FINISHED_TTL_MS);assert.equal(finished.peerDescription,null);
  await assert.rejects(api('signal',{roomId,description:offer},host),/CLOSED/);
  assert.deepEqual((await api('report',a,host)).result,finished.result);await assert.rejects(api('report',{...a,elapsed:2001},host),/REPORT_CONFLICT/);assert.deepEqual((await api('leave',{roomId},guest)).result,finished.result);
  const saved=(await query('SELECT room FROM mm_online_rooms WHERE id=$1',[roomId]))[0].room;assert(!JSON.stringify(saved).includes(host));assert(!('moves' in saved.reports[0]));assert.deepEqual(saved.descriptions,[null,null]);
  assert.deepEqual((await query("SELECT tablename FROM pg_tables WHERE schemaname='public'",[])).map(r=>r.tablename),['mm_online_rooms']);
 }finally{await f.db.close()}
});

test('SQL adjudication: close finishes draw, receipt disagreement/poor clocks/missing reports never choose a winner',async()=>{
 const f=await fixture();try{
  for(const mode of ['clear','close','reordered','clock','delayed','missing','timeout','leave','no_solution']){
   const {roomId,view}=await start(f);f.time=view.startAt+(mode==='delayed'?20000:6000);let outcome;
   if(mode==='leave')outcome=await f.api('leave',{roomId},guest);
   else if(mode==='timeout'){f.time=view.startAt+MAX_ROUND_MS+REPORT_GRACE_MS;outcome=await f.api('poll',{roomId},host);}
   else if(mode==='no_solution'){f.time=view.startAt+MAX_ROUND_MS;await f.api('report',report(view,MAX_ROUND_MS,{solved:false}),host);outcome=await f.api('report',report(view,MAX_ROUND_MS,{solved:false}),guest);}
   else{
    await f.api('report',report(view,mode==='reordered'?5000:2000,{clockUncertainty:mode==='clock'?2000:20}),host);f.time+=200;
    if(mode==='missing'){f.time+=REPORT_GRACE_MS;outcome=await f.api('poll',{roomId},guest);await assert.rejects(f.api('report',report(view,5000),guest),/CLOSED/);}
    else outcome=await f.api('report',report(view,mode==='clear'?5000:mode==='close'?3000:2000),guest);
   }
   assert.equal(outcome.result.kind,mode==='clear'?'win':['close','no_solution'].includes(mode)?'draw':'uncertain',mode);assert.equal(outcome.result.winner,mode==='clear'?0:null,mode);assert.equal(outcome.peerDescription,null);assert.deepEqual((await f.query('SELECT room FROM mm_online_rooms WHERE id=$1',[roomId]))[0].room.descriptions,[null,null],mode);
   const writes=f.writes;await f.api('poll',{roomId},host);assert.equal(f.writes,writes);
   f.time=outcome.expiresAt+1; // The next create performs opportunistic expiry cleanup.
  }
 }finally{await f.db.close()}
});

test('SQL validation: replay forgery, future timestamps, contradictory reports and size are rejected',async()=>{
 const f=await fixture();try{
  const {roomId,view}=await start(f);f.time=view.startAt+5000;const good=report(view,3000);
  for(const bad of [{...good,solved:false},{...good,moves:[]},{...good,elapsed:2999},{...good,moves:[{path:[0,24],op:'+',at:3000}]},{...good,moves:[...good.moves,{path:[0,1],op:'+',at:3001}]},{...good,clockUncertainty:-1}])await assert.rejects(f.api('report',bad,host),/REPLAY|REPORT/);
  await assert.rejects(f.api('report',report(view,20000),host),/TIME/);await assert.rejects(f.api('report',{...good,moves:Array(301).fill(good.moves[0])},host),/REPORT/);
  await assert.rejects(f.api('signal',{roomId,description:offer,pad:'x'.repeat(MAX_BODY_BYTES)},host),/SIZE/);
  const forged=await f.api('poll',{roomId,result:{kind:'win',winner:0},seed:123},host);assert.equal(forged.result,null);assert.equal(forged.seed,view.seed);
  await assert.rejects(f.api('ready',{roomId},third),/AUTH/);await assert.rejects(f.api('poll',{roomId:randomUUID()},host),/MISSING/);
 }finally{await f.db.close()}
});

test('SQL races: one guest, common countdown, CAS report settlement, and exact 3-room credential cap',async()=>{
 const f=await fixture();try{
  const {roomId}=await newRoom(f);const results=await Promise.allSettled([f.api('join',{roomId},guest),f.api('join',{roomId},third)]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(results.find(x=>x.status==='rejected').reason.code,'FULL');const peer=results[0].status==='fulfilled'?guest:third;
  await f.api('signal',{roomId,description:offer},host);await f.api('signal',{roomId,description:answer},peer);await Promise.all([f.api('ready',{roomId},host),f.api('ready',{roomId},peer)]);const view=await f.api('poll',{roomId},host);assert.deepEqual(view.ready,[true,true]);assert.equal(view.startAt,f.time+COUNTDOWN_MS);
  f.time=view.startAt+5000;await Promise.all([f.api('report',report(view,4000),host),f.api('report',report(view,4100),peer)]);const final=await f.api('poll',{roomId},host);assert.equal(final.result.kind,'draw');assert.deepEqual(final.reported,[true,true]);
  const rooms=await Promise.allSettled(Array.from({length:8},()=>newRoom(f,other)));assert.equal(rooms.filter(r=>r.status==='fulfilled').length,3);assert(rooms.filter(r=>r.status==='rejected').every(r=>r.reason.code==='LIMIT'||r.reason.code==='RETRY'));
  assert.equal((await f.query('SELECT count(*)::int AS n FROM mm_online_rooms',[]))[0].n,4);
 }finally{await f.db.close()}
});

test('SQL global room cap is exact under concurrent requests and expiry reclaims capacity',async()=>{
 const f=await fixture();try{
  for(let i=0;i<MAX_ROOMS-1;i++)await f.query('INSERT INTO mm_online_rooms(id,host_hash,slot,global_slot,room,expires_at) VALUES($1,$2,0,$3,$4::jsonb,$5)',[randomUUID(),'fixture-'+i,i,'{}',f.time+ROOM_TTL_MS]);
  const outcomes=await Promise.allSettled([newRoom(f,host),newRoom(f,guest),newRoom(f,third)]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert(outcomes.filter(x=>x.status==='rejected').every(x=>x.reason.code==='CAPACITY'));
  assert.equal((await f.query('SELECT count(*)::int AS n FROM mm_online_rooms',[]))[0].n,MAX_ROOMS);
  f.time+=ROOM_TTL_MS+1;assert.equal((await newRoom(f,other)).view.phase,'waiting');assert((await f.query('SELECT count(*)::int AS n FROM mm_online_rooms',[]))[0].n<MAX_ROOMS);
 }finally{await f.db.close()}
});

test('SQL expiry and cancellation: old credentials cannot rejoin, cancellation cannot award a win',async()=>{
 const f=await fixture();try{
  const {roomId,view}=await newRoom(f);await f.api('signal',{roomId,description:offer},host);const ended=await f.api('leave',{roomId},host);assert.deepEqual(ended.result,{kind:'cancelled',winner:null,reason:'left'});assert.deepEqual((await f.query('SELECT room FROM mm_online_rooms WHERE id=$1',[roomId]))[0].room.descriptions,[null,null]);await assert.rejects(f.api('join',{roomId},guest),/CLOSED/);
  f.time=ended.expiresAt;await assert.rejects(f.api('poll',{roomId},host),/EXPIRED/);await assert.rejects(f.api('poll',{roomId},host),/MISSING/);assert.equal((await f.query('SELECT id FROM mm_online_rooms WHERE id=$1',[roomId])).length,0);
  const next=await newRoom(f);assert.equal((await f.query('SELECT id FROM mm_online_rooms WHERE id=$1',[roomId])).length,0);await assert.rejects(f.api('poll',{roomId:next.roomId},guest),/AUTH/);
  await f.api('signal',{roomId:next.roomId,description:offer},host);f.time=next.view.expiresAt;await assert.rejects(f.api('create',{roomId:next.roomId,protocol:1},host),/EXPIRED/);await assert.rejects(f.api('join',{roomId:next.roomId},guest),/MISSING/);assert.equal(view.seed,null);
 }finally{await f.db.close()}
});

test('API checks method/origin/payload before DB and returns a clear missing-configuration status',async()=>{
 const {default:handler}=await import('../api/online.js'),old=process.env.DATABASE_URL,oldPostgres=process.env.POSTGRES_URL;delete process.env.DATABASE_URL;delete process.env.POSTGRES_URL;
 const call=async(req)=>{let status,body;const headers={};await handler({url:'/api/online?action=status',method:'GET',headers:{},...req},{setHeader(k,v){headers[k]=v},status(n){status=n;return this},json(value){body=value}});return {status,body,headers};};
 try{
  assert.equal((await call({})).body.error,'NOT_CONFIGURED');assert.equal((await call({method:'DELETE'})).status,405);assert.equal((await call({url:'/api/online?action=poll'})).status,405);
  assert.equal((await call({headers:{'sec-fetch-site':'cross-site'}})).status,403);assert.equal((await call({headers:{'content-length':MAX_BODY_BYTES+1}})).status,413);
  assert.equal((await call({url:'/api/online?action=create',method:'POST',body:{huge:'x'.repeat(MAX_BODY_BYTES)}})).status,413);assert.equal((await call({url:'/api/online?action=create',method:'POST',body:'oops'})).status,400);assert.equal((await call({url:'/api/online?action=create',method:'POST',body:[]})).status,400);
  assert.equal((await call({})).headers['Cache-Control'],'no-store');
 }finally{if(old!==undefined)process.env.DATABASE_URL=old;if(oldPostgres!==undefined)process.env.POSTGRES_URL=oldPostgres;}
});
