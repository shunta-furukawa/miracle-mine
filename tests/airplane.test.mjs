import test from 'node:test';
import assert from 'node:assert/strict';
import {collectedParts,assemblyLevel,assemblyShowcase} from '../src/airplane.js';
test('chapter milestones derive the airplane from existing saves, without counting partial chapters',()=>{
 assert.deepEqual(collectedParts(null),[]);
 assert.deepEqual(collectedParts({cleared:[0,1,2,3,4]}),[]);
 for(let count=0;count<=5;count++){
  const parts=collectedParts({cleared:Array.from({length:count*6},(_,i)=>i)});
  assert.equal(parts.length,count);assert.equal(assemblyLevel(parts),count);
 }
 assert.equal(assemblyLevel([0,2]),1);
});
test('a newly earned part animates, while a replayed clear keeps the assembled plane',()=>{
 assert.match(assemblyShowcase({previous:[0],completed:[0,1],index:1,animate:true}),/is-assembling/);
 assert.doesNotMatch(assemblyShowcase({previous:[0,1],completed:[0,1],index:1,animate:true}),/is-assembling/);
});

test('customization follows earned components and hides saved choices until fitted',async()=>{
 const {canCustomize,visibleDesign,planeArt}=await import('../src/airplane.js');
 const chosen={paint:2,wing:2,propeller:2,decoration:2};
 assert.deepEqual(visibleDesign(0,chosen),{paint:0,wing:0,propeller:null,decoration:null});
 assert.deepEqual(visibleDesign(2,chosen),{...chosen,propeller:null});
 assert.deepEqual(visibleDesign(4,chosen),chosen);
 assert.equal(canCustomize({cleared:[5]},'wing'),true);
 assert.equal(canCustomize({cleared:[5,11,17]},'propeller'),false);
 assert.equal(canCustomize({cleared:[5,11,17,23]},'propeller'),true);
 assert.equal(canCustomize({cleared:[5,11]},'decoration'),true);
 assert.equal(canCustomize({cleared:[5]},'paint'),false);
 assert.doesNotMatch(planeArt(0,chosen),/class="airframe-prop"/);
 assert.match(assemblyShowcase({completed:[0,1,2,3,4],design:chosen}),/data-wing="2" data-propeller="2" data-decoration="2"/);
});
