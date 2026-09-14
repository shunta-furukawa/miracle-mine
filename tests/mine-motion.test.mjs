import test from 'node:test';
import assert from 'node:assert/strict';
import {fallOrigins} from '../src/mine-motion.js';
import {resolve} from '../src/engine.js';
test('falling origins reproduce resolver order, including the merged endpoint and fresh stones',()=>{
 const board=Array.from({length:25},(_,i)=>i%10);
 for(const [path,target] of [[[0,6,12,18],50],[[20,21,16],50],[[0,1],6],[[0,1],1],[[0,1,2,3,4],3]]){
  const result=resolve(board,path,'+',target,()=>99),origins=fallOrigins(path,result.kind);
  const reconstructed=origins.map(i=>i<0?99:result.kind==='merge'&&i===path.at(-1)?result.value:board[i]);
  assert.deepEqual(reconstructed,result.board);
  const occupied=origins.filter(i=>i>=0);assert.equal(new Set(occupied).size,occupied.length);
 }
});
