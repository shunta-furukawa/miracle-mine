import test from 'node:test';import assert from 'node:assert/strict';
import {voyageStage,voyageGoal,voyageEvaluate,voyageSolution,voyageUnlocked,voyageRecord,addDistance,skySpawn,createSkyBoard,seededRandom,SKY_TIERS,SKY_FACTORS,SKY_REGIONS,voyageRegion,treasures,validSeed,randomSeed} from '../src/sky-voyage.js';
import {freshSlot,normalize} from '../src/save.js';import {stageBrief} from '../src/stage-intro.js';
const tierSpan=set=>SKY_TIERS[Math.min(set,SKY_TIERS.length-1)].count;
test('goal tiers: 2×10, 3×20, 4×30, then 5-stone sets of 30 forever, distinct and ascending within a set',()=>{
 const seed=20260915;let level=0;
 for(let set=0;set<6;set++){const tiles=SKY_TIERS[Math.min(set,3)].tiles,targets=[];
  for(let i=0;i<tierSpan(set);i++,level++){const g=voyageGoal(seed,level);assert.equal(g.tiles,tiles);assert.equal(g.set,set);assert.equal(g.position,i);assert.equal(g.factors.length,tiles);assert(g.factors.every(f=>SKY_FACTORS.includes(f)));assert.equal(g.factors.reduce((a,b)=>a*b,1),g.target);targets.push(g.target);}
  assert.equal(new Set(targets).size,targets.length);assert.deepEqual(targets,[...targets].sort((a,b)=>a-b));}
 assert.deepEqual(voyageGoal(seed,7),voyageGoal(seed,7));assert.notDeepEqual([0,1,2,3].map(i=>voyageGoal(1,i).target),[0,1,2,3].map(i=>voyageGoal(2,i).target));
 assert.throws(()=>voyageGoal(-1,0),/SEED/);assert(validSeed(randomSeed()));assert(!validSeed(2**32));assert(!validSeed(1.5));
});
test('stages carry the goal, the stone count and 0–9 spawns; new stones lean toward the goal factors without touching the board',()=>{
 const stage=voyageStage(7,40);assert.equal(stage.tiles,4);assert.equal(stage.min,0);assert.equal(stage.max,9);assert(stage.multiply);
 const random=seededRandom(5);const drawn=Array.from({length:4000},()=>skySpawn(stage,random));assert(drawn.every(n=>n>=0&&n<=9));
 const factorShare=drawn.filter(n=>stage.factors.includes(n)).length/drawn.length;assert(factorShare>.4,'factor share '+factorShare);assert(drawn.includes(0)&&drawn.includes(1));
 const board=createSkyBoard(stage,seededRandom(9));assert.equal(board.length,25);assert.deepEqual(createSkyBoard(stage,seededRandom(9)),board);
});
test('multiplying through 0 clears instead of merging; 1 is a neutral link; hints search up to five stones',()=>{
 const b=Array(25).fill(3);b[0]=0;b[1]=9;assert.equal(voyageEvaluate(b,[0,1],'×',81).kind,'clear');assert.equal(voyageEvaluate(b,[1,2],'×',27).kind,'success');assert.equal(voyageEvaluate(b,[2,3],'+',9).kind,'merge');
 const five=Array(25).fill(2);five[0]=five[1]=five[2]=five[3]=five[4]=7;assert.deepEqual(voyageSolution(five,7**5),{path:[0,1,2,3,4],op:'×'});
 const ones=Array(25).fill(1);ones[0]=9;ones[1]=1;ones[2]=9;assert.deepEqual(voyageSolution(ones,81),{path:[0,1,2],op:'×'});
 assert.equal(voyageSolution(Array(25).fill(0),81),null);assert.equal(voyageEvaluate(b,[0],'×',81).kind,'cancel');
});
test('old saves preserve all slots and designs; only all 30 clears unlock the voyage',()=>{const slots=[{...freshSlot(),cleared:Array.from({length:30},(_,i)=>i),paint:2,wing:1,propeller:2,decoration:1,updated:123},{...freshSlot(),cleared:[0,1,29]},null];slots.forEach(s=>{if(s)delete s.sky});const old={version:1,slots,settings:{sound:false,slow:true},bests:{'endless-mix':1234}};const n=normalize(old);assert(voyageUnlocked(n.slots[0]));assert(!voyageUnlocked(n.slots[1]));assert(!voyageUnlocked(n.slots[2]));n.slots.forEach((s,i)=>{if(s){const {sky,...rest}=s;assert.deepEqual(rest,slots[i]);assert.deepEqual(sky,voyageRecord())}else assert.equal(slots[i],null)});assert.deepEqual(n.settings,old.settings);assert.deepEqual(n.bests,old.bests)});
test('distance and treasures persist; raised thresholds never take an earned treasure away',()=>{
 let r=voyageRecord(),run=0;for(const n of [81,108,144]){run+=n;r=addDistance(r,n,run)}assert.equal(r.total,333);assert.equal(r.best,333);assert.deepEqual(r.treasures,[0]);
 r=addDistance(r,81,81);assert.equal(r.total,414);assert.equal(r.best,333);assert.deepEqual(voyageRecord(r),r);
 assert.deepEqual(treasures.map(t=>t.at),[300,4000,20000,45000,160000,300000]);
 assert.deepEqual(voyageRecord({total:2600,best:2600,treasures:[0,1]}).treasures,[0,1]);
 assert.deepEqual(voyageRecord({total:-1,best:Infinity,flights:'2',treasures:['x',9,-1]}),voyageRecord());
 assert.deepEqual(voyageRecord({total:300000,best:999999}).treasures,[0,1,2,3,4,5]);
 const n=normalize({version:1,slots:[{...freshSlot(),cleared:[],sky:{total:2600,best:1000,flights:1,treasures:[0,1]}},null,null],bests:{},settings:{}});assert.deepEqual(n.slots[0].sky.treasures,[0,1]);
});
test('regions name each tier, count progress and number repeat laps of the far sky',()=>{
 assert.deepEqual(SKY_REGIONS.map(r=>r.name),['雲の海','夕映えの回廊','星の高み','果ての空']);
 const r0=voyageRegion(voyageStage(3,0));assert.equal(r0.label,'雲の海');assert.equal(r0.position,0);assert.equal(r0.count,10);assert.equal(r0.lap,1);
 const r1=voyageRegion(voyageStage(3,13));assert.equal(r1.label,'夕映えの回廊');assert.equal(r1.position,3);assert.equal(r1.count,20);
 assert.equal(voyageRegion(voyageStage(3,30)).label,'星の高み');assert.equal(voyageRegion(voyageStage(3,60)).label,'果ての空');
 const lap2=voyageRegion(voyageStage(3,90));assert.equal(lap2.label,'果ての空 Ⅱ');assert.equal(lap2.lap,2);assert.equal(lap2.position,0);assert.equal(voyageRegion(voyageStage(3,149)).label,'果ての空 Ⅲ');
 assert(!JSON.stringify(SKY_REGIONS).match(/[0-9０-９]つの石|枚/));
});
test('sky intro names the region and distance without an infinite count or a stone count',()=>{const b=stageBrief(voyageStage(3,0),{mode:'sky'});assert.equal(b.target,voyageGoal(3,0).target);assert.equal(b.label,'SECRET CHAPTER 06');assert.match(b.goal,/雲の海/);assert(!/つの石/.test(b.goal));assert.match(b.hint,/＋と×/);assert(!JSON.stringify(b).includes('Infinity'))});
