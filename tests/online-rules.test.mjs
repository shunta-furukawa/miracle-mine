import test from 'node:test';
import assert from 'node:assert/strict';
import {createRound,applyMove,replay,ONLINE_PROTOCOL,MAX_ROUND_MS,MAX_MOVES,onlineUnlocked,validRoomId} from '../src/online-rules.js';
import {evaluate,solution} from '../src/engine.js';

const solve=state=>solution(state.board,state.target,['×','+']);
test('online protocol: deterministic independent boards, guaranteed varied solutions and 0–9 digits',()=>{
 assert.equal(ONLINE_PROTOCOL,1);const locations=new Set(),targets=new Set();
 for(let seed=0;seed<150;seed++){
  const a=createRound(seed),b=createRound(seed);assert.deepEqual(a,b);assert.notEqual(a.board,b.board);assert.equal(a.board.length,25);assert(a.board.every(n=>Number.isInteger(n)&&n>=0&&n<=9));assert(a.target>=18&&a.target<=81);
  const move=solve(a);assert(move);locations.add(move.path.join(','));targets.add(a.target);const result=applyMove(a,move);assert.equal(result.kind,'success');assert.equal(result.solved,true);assert.deepEqual(createRound(seed),a);
 }
 assert(locations.size>20);assert(targets.size>15);
});
test('deterministic replenishment, merges and clears replay without mutating the original',()=>{
 let a=createRound(54321),b=createRound(54321);const original=structuredClone(a),moves=[];
 for(let turn=0;turn<100;turn++){
  const options=[{path:[0,1],op:'+'},{path:[5,6],op:'×'},{path:[20,21,22],op:'+'}],move=options.find(m=>evaluate(a.board,m.path,m.op,a.target).kind!=='success');assert(move);
  moves.push({...move,at:turn*100});a=applyMove(a,move);b=applyMove(b,move);assert.deepEqual(a,b);assert(a.board.every(n=>Number.isInteger(n)&&n>=0&&n<=9));
 }
 const result=replay(54321,moves);assert.deepEqual(result.board,a.board);assert.equal(result.spawnIndex,a.spawnIndex);assert.equal(result.moves,100);assert.deepEqual(original,createRound(54321));assert(a.spawnIndex>25);
});
test('replay rejects forged paths, invalid state, future/reordered times and play after the first success',()=>{
 const state=createRound(42),win=solve(state);
 for(const move of [{path:[0],op:'+'},{path:[0,24],op:'+'},{path:[0,1,0],op:'+'},{path:[0,1.5],op:'+'},{path:[0,1],op:'-'},{path:[0,25],op:'×'},{path:[0,,],op:'+'}])assert.throws(()=>applyMove(state,move),/MOVE/);
 for(const board of [[],Array(25),Array(25).fill(10),Array(25).fill(-1),Array(25).fill(NaN)])assert.throws(()=>applyMove({...state,board},win),/STATE/);
 assert.throws(()=>createRound(-1),/SEED/);assert.throws(()=>createRound(2**32),/SEED/);assert.throws(()=>createRound('42'),/SEED/);
 for(const at of [-1,0.5,Infinity,MAX_ROUND_MS+1,undefined])assert.throws(()=>replay(42,[{...win,at}]),/TIME/);
 assert.throws(()=>replay(42,[{...win,at:100},{...win,at:101}]),/FINISHED/);
 assert.throws(()=>replay(42,Array(MAX_MOVES+1).fill({...win,at:0})),/MOVES/);
 const harmless=[{path:[0,1],op:'+'},{path:[5,6],op:'+'}].find(m=>evaluate(state.board,m.path,m.op,state.target).kind!=='success');
 assert.throws(()=>replay(42,[{...harmless,at:20},{...harmless,at:10}]),/TIME/);
});
test('online unlock only needs one complete existing story slot and never changes saves',()=>{
 const full={cleared:Array.from({length:30},(_,i)=>i)},data={slots:[null,full,null]},copy=structuredClone(data);assert.equal(onlineUnlocked(data),true);assert.deepEqual(data,copy);
 for(const input of [null,{}, {slots:[]},{slots:[{cleared:Array(30).fill(29)}]},{slots:[{cleared:['0',...full.cleared.slice(1)]}]},{slots:[null,null,null,full]},{slots:[{cleared:{length:30}}]}])assert.equal(onlineUnlocked(input),false);
 assert(validRoomId('12345678-abcd-abcd-abcd-123456789abc'));assert(!validRoomId('../room'));assert(!validRoomId(null));
});
