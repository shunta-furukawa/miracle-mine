export const adjacent = (a,b) => a !== b && Math.abs(a%5-b%5)<=1 && Math.abs(Math.floor(a/5)-Math.floor(b/5))<=1;
export function extend(path,index) {
  if (!Number.isInteger(index) || index<0 || index>=25) return path;
  if (!path.length) return [index];
  if (path.length>1 && path.at(-2)===index) return path.slice(0,-1);
  if (path.includes(index) || !adjacent(path.at(-1),index)) return path;
  return [...path,index];
}
export const total = (board,path,op) => path.reduce((n,i)=>op==='×'?n*board[i]:n+board[i],op==='×'?1:0);
export function evaluate(board,path,op,target) {
  if(path.length<2 || new Set(path).size!==path.length || path.some((i,k)=>!Number.isInteger(i)||i<0||i>=25||(k>0&&!adjacent(path[k-1],i)))) return {kind:'cancel',value:0};
  const value=total(board,path,op);
  return {value,kind:value===target?'success':value<target && value<10?'merge':'clear'};
}
export function resolve(board,path,op,target,spawn) {
  const result=evaluate(board,path,op,target);
  if(result.kind==='cancel') return {board:[...board],...result};
  const next=[...board]; path.forEach(i=>next[i]=null);
  if(result.kind==='merge') next[path.at(-1)]=result.value;
  for(let col=0;col<5;col++) {
    const keep=[];for(let row=4;row>=0;row--) if(next[row*5+col]!==null)keep.push(next[row*5+col]);
    for(let row=4;row>=0;row--) next[row*5+col]=keep.length?keep.shift():spawn();
  }
  return {board:next,...result};
}
export function solution(board,target,ops=['+'],maxDepth=5) {
  // A bounded search keeps hint requests responsive even on a phone.
  for(const op of ops) {
    let budget=30000;
    function walk(path,value) {
      if(--budget<0)return null;
      if(path.length>=2 && value===target)return {path,op};
      if(path.length>=maxDepth || (value>target && op==='+'))return null;
      if(op==='×' && (value===0 || value>target))return null;
      for(let i=0;i<25;i++)if(!path.includes(i)&&adjacent(path.at(-1),i)) {
        const found=walk([...path,i],op==='+'?value+board[i]:value*board[i]);if(found)return found;
      }
      return null;
    }
    for(let i=0;i<25;i++){const found=walk([i],board[i]);if(found)return found;}
  }
  return null;
}
export function createBoard(stage,rng=Math.random) {
  const spawn=()=>stage.min+Math.floor(rng()*(stage.max-stage.min+1));
  const board=Array.from({length:25},spawn);
  // Introductory boards demonstrate a solution without introducing out-of-range tiles.
  if(stage.target<=10) {
    let remain=stage.target;let i=0;
    while(remain>0 && i<5){const n=Math.min(stage.max,remain);board[10+i++]=n;remain-=n;}
  } else {
    const a=Array.from({length:8},(_,i)=>i+2).find(n=>stage.target%n===0&&stage.target/n<=9);
    if(a){board[11]=a;board[12]=stage.target/a;}
  }
  return board;
}
