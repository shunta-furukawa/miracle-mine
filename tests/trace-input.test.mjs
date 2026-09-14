import test from 'node:test';
import assert from 'node:assert/strict';
import {traceIndex} from '../src/trace-input.js';
import {extend} from '../src/engine.js';
const rects=Array.from({length:25},(_,i)=>({left:i%5*100,top:Math.floor(i/5)*100,right:i%5*100+94,bottom:Math.floor(i/5)*100+94,width:94,height:94}));
function trace(points,start=12){let path=[start];for(const [x,y] of points){const i=traceIndex(rects,x,y,true);if(i>=0)path=extend(path,i)}return path}
test('off-axis diagonals cross corner strips without picking orthogonal neighbours',()=>{
 for(const sx of [-1,1])for(const sy of [-1,1]){
  const p=[[0,0],[28,21],[54,44],[70,62],[92,84],[100,100]].map(([x,y])=>[247+x*sx,247+y*sy]);
  assert.deepEqual(trace(p),[12,12+sx+5*sy]);
 }
});
test('cardinal strokes, deliberate right-angle turns and backtracking remain available',()=>{
 assert.deepEqual(trace([[310,247],[347,247],[347,310],[347,347]]),[12,13,18]);
 assert.deepEqual(trace([[347,247],[300,251],[247,247]]),[12]);
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])assert.deepEqual(trace([[247+dx*100,247+dy*100]]),[12,12+dx+dy*5]);
});
test('taps keep full targets; drags ignore gaps, outer corners and board exits',()=>{
 assert.equal(traceIndex(rects,202,202),12);assert.equal(traceIndex(rects,202,202,true),-1);
 assert.equal(traceIndex(rects,297,247,true),-1);assert.equal(traceIndex(rects,-5,247,true),-1);
 assert.deepEqual(trace([[447,447]]),[12]);
});
