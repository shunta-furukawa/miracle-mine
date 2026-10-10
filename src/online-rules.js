import {adjacent,resolve} from './engine.js';

// Increment this when any board generation, replenishment or adjudication rule changes.
export const ONLINE_PROTOCOL=1;
export const MAX_ROUND_MS=180000;
export const MAX_MOVES=300;
export const validRoomId=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
export const validSeed=value=>Number.isInteger(value)&&value>=0&&value<=0xFFFFFFFF;
export const onlineUnlocked=data=>Array.isArray(data?.slots)&&data.slots.slice(0,3).some(slot=>Array.isArray(slot?.cleared)&&Array.from({length:30},(_,i)=>i).every(i=>slot.cleared.includes(i)));

// Indexed mulberry32 lets every independent board resume the same stream without hidden RNG state.
function randomAt(seed,index){let t=(seed+Math.imul(index+1,0x6D2B79F5))>>>0;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
const digit=(seed,index)=>Math.floor(randomAt(seed,index)*10);
const targets=[18,20,21,24,25,27,28,30,32,35,36,40,42,45,48,49,54,56,63,64,72,81];
function goal(seed){const random=index=>randomAt((seed^0xA511E9B3)>>>0,index),target=targets[Math.floor(random(0)*targets.length)],pairs=[];for(let a=2;a<=9;a++)for(let b=2;b<=9;b++)if(a*b===target)pairs.push([a,b]);return {target,pair:pairs[Math.floor(random(1)*pairs.length)],random};}
const fail=code=>{throw new Error(code)};
const boardOK=board=>Array.isArray(board)&&board.length===25&&Array.from(board).every(n=>Number.isInteger(n)&&n>=0&&n<=9);

export function createRound(seed){
 if(!validSeed(seed))fail('SEED');
 const {target,pair,random}=goal(seed),board=Array.from({length:25},(_,i)=>digit(seed,i)),first=Math.floor(random(2)*25),neighbors=Array.from({length:25},(_,i)=>i).filter(i=>adjacent(first,i)),second=neighbors[Math.floor(random(3)*neighbors.length)];
 // Guarantee one solution at a different adjacent pair each game, never fixed central indices.
 board[first]=pair[0];board[second]=pair[1];
 return {seed,target,board,spawnIndex:25,moves:0,solved:false,kind:'start',value:0};
}

export function applyMove(state,move){
 if(!state||!validSeed(state.seed)||!boardOK(state.board)||state.target!==goal(state.seed).target||!Number.isInteger(state.spawnIndex)||state.spawnIndex<25||state.spawnIndex>25+MAX_MOVES*25||!Number.isInteger(state.moves)||state.moves<0||state.moves>=MAX_MOVES)fail('STATE');
 if(state.solved)fail('FINISHED');
 if(!move||!['+','×'].includes(move.op)||!Array.isArray(move.path)||move.path.length<2||move.path.length>25||new Set(move.path).size!==move.path.length||Array.from(move.path).some((i,k)=>!Number.isInteger(i)||i<0||i>=25||(k>0&&!adjacent(move.path[k-1],i))))fail('MOVE');
 let spawnIndex=state.spawnIndex;
 const result=resolve(state.board,move.path,move.op,state.target,()=>digit(state.seed,spawnIndex++));
 return {...state,...result,spawnIndex,moves:state.moves+1,solved:result.kind==='success'};
}

export function replay(seed,moves){
 if(!Array.isArray(moves)||moves.length>MAX_MOVES)fail('MOVES');
 let state=createRound(seed),lastAt=0;
 for(const move of moves){
  if(!move||!Number.isInteger(move.at)||move.at<lastAt||move.at<0||move.at>MAX_ROUND_MS)fail('TIME');
  state=applyMove(state,move);lastAt=move.at;
 }
 return {...state,lastAt};
}
