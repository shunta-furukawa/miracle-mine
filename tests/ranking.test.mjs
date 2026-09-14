import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';import {schema,service} from '../server/ranking.js';
import {RankingClient,OUTBOX} from '../src/ranking.js';import {normalize,freshSlot} from '../src/save.js';
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}};
test('real SQL: goal order, duplicates, concurrent targets, finalization and snapshot records',async()=>{
 const db=new PGlite();try{for(const sql of schema)await db.exec(sql);const query=async(s,p)=>(await db.query(s,p)).rows,api=service(query),key='a'.repeat(64);
 const uid=(await api('register',{completed:true},key)).uid;assert.equal((await api('register',{completed:true},key)).uid,uid);await assert.rejects(api('register',{completed:false},'b'.repeat(64)),/LOCKED/);
 const runId=randomUUID(),design={paint:2,wing:1,propeller:2,decoration:1};await api('start',{runId,name:'そらいろ号',design,protocol:1},key);
 await assert.rejects(api('goal',{runId,seq:1,level:0,target:81},'f'.repeat(64)),/AUTH/);
 for(const e of [{seq:1,level:0,target:81},{seq:1,level:0,target:81},{seq:2,level:0,target:81},{seq:3,level:2,target:144}])await api('goal',{runId,...e},key);
 assert.equal((await api('board')).entries.length,0);
 await api('finish',{runId,count:3,distance:306,reason:'return'},key);await api('finish',{runId,count:3,distance:306,reason:'return'},key);
 let row=(await api('board')).entries[0];assert.equal(row.distance,306);assert.equal(row.name,'そらいろ号');assert.deepEqual(row.design,design);assert(!('key'in row));assert(!('secret_hash'in row));
 const shorter=randomUUID();await api('start',{runId:shorter,name:'別の名前',design:{},protocol:1},key);await api('goal',{runId:shorter,seq:1,level:0,target:81},key);await api('finish',{runId:shorter,count:1,distance:81,reason:'steam'},key);assert.equal((await api('board')).entries[0].name,'そらいろ号');
 const bad=randomUUID();await api('start',{runId:bad,name:'不正',protocol:1},key);await assert.rejects(api('goal',{runId:bad,seq:1,level:0,target:9999},key),/INVALID/);await assert.rejects(api('finish',{runId:bad,count:0,distance:0,reason:'return'},key),/INVALID/);assert.equal((await api('board')).entries[0].distance,306);
 const missed=randomUUID();await api('start',{runId:missed,name:'未完了',protocol:1},key);await assert.rejects(api('goal',{runId:missed,seq:2,level:1,target:108},key),/INVALID/);
 const inflated=randomUUID();await api('start',{runId:inflated,name:'水増し',protocol:1},key);await assert.rejects(api('finish',{runId:inflated,count:0,distance:999,reason:'return'},key),/INVALID/);
 }finally{await db.close()}
});
test('goal queue never waits for network; final notification follows all acks and survives reload',async()=>{
 const storage=store(),calls=[];let release;const gate=new Promise(r=>release=r);let held=true;
 const request=async(url,options)=>{const action=new URL(url,'https://game.test').searchParams.get('action');calls.push(action);if(action==='goal'&&held){held=false;await gate}return {ok:true,json:async()=>action==='register'?{uid:randomUUID()}:{}}};
 const client=new RankingClient({storage,request}),s={...freshSlot(),cleared:Array.from({length:30},(_,i)=>i),flightName:'テスト号'};const run=await client.begin(s,()=>true);
 client.goal(run,0,81);client.goal(run,1,108);client.finish(run,'return');assert.equal(run.count,2);assert.equal(run.distance,189);assert.equal(run.events.length,3);assert(!calls.includes('finish'));const snapshot=storage.getItem(OUTBOX);release();while(client.running)await new Promise(r=>setTimeout(r,5));assert.equal(run.status,'finished');assert.deepEqual(calls.slice(-3),['goal','goal','finish']);
 storage.setItem(OUTBOX,snapshot);const restarted=new RankingClient({storage,request});await restarted.flush();assert.equal(restarted.runs[0].status,'finished');assert.equal(restarted.runs[0].distance,189);
});
test('invalid online record is isolated from saves; offline retries retain queued goals',async()=>{
 const storage=store(),client=new RankingClient({storage,request:async()=>({ok:false,status:409,json:async()=>({error:'INVALID'})})});const run={runId:randomUUID(),key:'a'.repeat(64),events:[],count:0,distance:0,status:'flying',closed:false};client.runs.push(run);client.goal(run,0,81);while(client.running)await new Promise(r=>setTimeout(r,5));assert.equal(run.status,'excluded');
 const offline=new RankingClient({storage:store(),request:async()=>{throw new TypeError('offline')}});const r={...run,events:[],count:0,distance:0,status:'flying'};offline.runs.push(r);offline.goal(r,0,81);while(offline.running)await new Promise(r=>setTimeout(r,5));clearTimeout(offline.timer);assert.equal(r.events.length,1);assert.equal(r.status,'flying');
});
test('name and per-save identity survive normalization without touching old progress',()=>{const s={...freshSlot(),cleared:[0,1,2],flightName:'そらいろ号',ranking:{key:'a'.repeat(64),uid:randomUUID()},sky:{total:1234,best:999,flights:2}};const n=normalize({version:1,slots:[s,null,null],settings:{sound:false,slow:true},bests:{'score-add':111}});assert.equal(n.slots[0].flightName,s.flightName);assert.deepEqual(n.slots[0].ranking,s.ranking);assert.deepEqual(n.slots[0].cleared,s.cleared);assert.equal(n.slots[0].sky.total,1234);assert.equal(n.bests['score-add'],111);assert.equal(n.slots[1],null)});
test('production API loads safely without a database and returns a setup status',async()=>{const {default:handler}=await import('../api/ranking.js');const old=process.env.DATABASE_URL,oldPostgres=process.env.POSTGRES_URL;delete process.env.DATABASE_URL;delete process.env.POSTGRES_URL;try{let code,body;const res={setHeader(){},status(n){code=n;return this},json(v){body=v}};await handler({url:'/api/ranking?action=status',method:'GET',headers:{}},res);assert.equal(code,503);assert.deepEqual(body,{error:'NOT_CONFIGURED'});}finally{if(old!==undefined)process.env.DATABASE_URL=old;if(oldPostgres!==undefined)process.env.POSTGRES_URL=oldPostgres;}});
