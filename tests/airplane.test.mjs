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
