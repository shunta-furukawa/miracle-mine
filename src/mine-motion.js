import {modeColor} from './operation-feedback.js';
// Reconstruct each tile's origin using the same bottom-up order as resolve().
export function fallOrigins(path,kind){
 const removed=new Set(path);if(kind==='merge')removed.delete(path.at(-1));
 const origins=Array(25);
 for(let col=0;col<5;col++){
  const kept=[];for(let row=4;row>=0;row--)if(!removed.has(row*5+col))kept.push(row*5+col);
  let fresh=0;for(let row=4;row>=0;row--)origins[row*5+col]=kept.length?kept.shift():col-5*(++fresh);
 }
 return origins;
}
export async function gatherStones({board,path,op='+',result,tileStyle,play,current,apply}){
 const columns=new Set(path.map(i=>i%5));
 const stones=[...board.querySelectorAll('.stone')],bounds=board.getBoundingClientRect();
 const boxes=stones.map(e=>{const r=e.getBoundingClientRect();return {x:r.left-bounds.left-board.clientLeft,y:r.top-bounds.top-board.clientTop,w:r.width,h:r.height}});
 const owned=stones.filter((_,i)=>columns.has(i%5));
 const layer=document.createElement('div');layer.className='mine-motion';layer.style.setProperty('--mode-color',modeColor(op));layer.setAttribute('aria-hidden','true');board.append(layer);
 const animations=new Set();const quiet=()=>document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches;
 const visible=()=>{if(document.hidden)for(const a of animations)try{a.finish()}catch{}};
 document.addEventListener('visibilitychange',visible);
 async function move(el,frames,options){if(!current())return;const a=el.animate(frames,{...options,duration:quiet()?0:options.duration,fill:'forwards'});animations.add(a);try{await a.finished}catch{}finally{if(options.reset){animations.delete(a);a.cancel()}}}
 const at=(el,i)=>{const p=boxes[i];Object.assign(el.style,{left:p.x+'px',top:p.y+'px',width:p.w+'px',height:p.h+'px'})};
 try{
  board.dataset.motions=String(Number(board.dataset.motions||0)+1);board.classList.add('resolving');
  const trace=document.createElementNS('http://www.w3.org/2000/svg','svg');trace.classList.add('gather-trace');trace.setAttribute('viewBox',`0 0 ${board.clientWidth} ${board.clientHeight}`);const line=document.createElementNS(trace.namespaceURI,'polyline');line.setAttribute('points',path.map(i=>`${boxes[i].x+boxes[i].w/2},${boxes[i].y+boxes[i].h/2}`).join(' '));trace.append(line);layer.append(trace);
  const parcel=document.createElement('div');parcel.className='gather-stone';parcel.style.cssText=stones[path[0]].style.cssText;at(parcel,path[0]);layer.append(parcel);stones[path[0]].classList.add('motion-hidden');
  // One accumulating parcel follows every segment, absorbing the next stone.
  for(let k=1;k<path.length;k++){
   if(!current())return;const a=boxes[path[k-1]],b=boxes[path[k]];
   await move(parcel,[{transform:'translate(0,0) scale(1)'},{transform:`translate(${b.x-a.x}px,${b.y-a.y}px) scale(.85)`}],{duration:80,easing:'ease-in',reset:true});
   if(!current())return;at(parcel,path[k]);stones[path[k]].classList.add('motion-hidden');if(!quiet())play('collect');
   parcel.classList.add('gather-charged');
  }
  if(!current())return;
  trace.remove();
  const end=path.at(-1),p=boxes[end],floatY=bounds.top+p.y<80?'70%':'-140%';
  parcel.style.cssText=tileStyle(result.kind==='merge'?result.value:Number(stones[end].firstElementChild.textContent));at(parcel,end);
  const number=document.createElement('div');number.className=`gather-number ${result.kind}`;number.textContent=result.value;number.style.left=(p.x+p.w/2)+'px';number.style.top=(p.y+p.h/2)+'px';layer.append(number);
  if(!quiet())play(result.kind==='success'?'success':result.kind==='merge'?'merge':'discard');
  const jobs=[move(number,[{opacity:0,transform:'translate(-50%,-20%) scale(.6)'},{offset:.25,opacity:1,transform:'translate(-50%,-50%) scale(1.2)'},{offset:.7,opacity:1,transform:`translate(-50%,${floatY}) scale(1)`},{opacity:0,transform:`translate(-50%,${floatY}) scale(1)`}],{duration:520,easing:'ease-out'})];
  if(result.kind==='clear'){
   parcel.style.visibility='hidden';
   for(let n=0;n<8;n++){
    const shard=document.createElement('div');shard.className='gather-shard';shard.style.cssText=tileStyle(Number(stones[end].firstElementChild.textContent));at(shard,end);
    const x=n%4*25,y=Math.floor(n/4)*50;shard.style.clipPath=`polygon(${x}% ${y}%,${x+25}% ${y}%,${x+25}% ${y+50}%,${x}% ${y+50}%)`;layer.append(shard);
    jobs.push(move(shard,[{opacity:1,transform:'translate(0,0) rotate(0)'},{opacity:0,transform:`translate(${(n%4-1.5)*p.w*.6}px,${(Math.floor(n/4)-.5)*p.h*.9+20}px) rotate(${(n-3.5)*18}deg)`}],{duration:420,easing:'ease-out'}));
   }
  }else{
   jobs.push(move(parcel,result.kind==='success'?[{opacity:1,transform:'scale(1)',filter:'brightness(1)'},{offset:.4,opacity:1,transform:'scale(1.25)',filter:'brightness(2)'},{opacity:0,transform:'scale(.2)',filter:'brightness(2)'}]:[{transform:'scale(.65)',filter:'brightness(2)'},{transform:'scale(1)',filter:'brightness(1)'}],{duration:420,easing:'ease-out'}));
   if(result.kind==='success')for(let n=0;n<12;n++){const star=document.createElement('b');star.className='gather-spark';star.textContent='✦';star.style.left=(p.x+p.w/2)+'px';star.style.top=(p.y+p.h/2)+'px';layer.append(star);const angle=n*Math.PI/6;jobs.push(move(star,[{opacity:1,transform:'translate(-50%,-50%) scale(.5)'},{opacity:0,transform:`translate(${Math.cos(angle)*p.w*1.1}px,${Math.sin(angle)*p.h*1.1}px) scale(1)`}],{duration:450,easing:'ease-out'}));}
  }
  await Promise.all(jobs);if(!current())return;
  // Hide real destinations before changing their textures; falling ghosts own
  // the entire transition so neither the old board nor an unanimated new one flashes.
  const origins=fallOrigins(path,result.kind),pitch=boxes[5].y-boxes[0].y;
  const moving=stones.map((_,i)=>i).filter(i=>columns.has(i%5)&&origins[i]!==i);
  moving.forEach(i=>stones[i].classList.add('motion-hidden'));
  apply();
  const falling=document.createElement('div');falling.className='fall-layer';layer.replaceChildren(falling);
  owned.forEach(el=>{const i=stones.indexOf(el);if(origins[i]===i)el.classList.remove('motion-hidden')});
  await Promise.all(moving.map(i=>{
   const origin=origins[i],dy=(Math.floor(origin/5)-Math.floor(i/5))*pitch;
   const ghost=document.createElement('div');ghost.className='fall-stone';ghost.style.cssText=stones[i].style.cssText;at(ghost,i);falling.append(ghost);
   return move(ghost,[{transform:`translateY(${dy}px)`,opacity:origin<0?0:1},{offset:.15,opacity:1},{transform:'translateY(0)',opacity:1}],{duration:Math.min(440,210+Math.abs(dy)/pitch*45),easing:'cubic-bezier(.3,0,.7,1)'});
  }));

 }finally{
  document.removeEventListener('visibilitychange',visible);
  owned.forEach(e=>e.classList.remove('motion-hidden'));
  for(const a of animations)a.cancel();layer.remove();
  board.dataset.motions=String(Math.max(0,Number(board.dataset.motions||0)-1));
  if(Number(board.dataset.motions)===0)board.classList.remove('resolving');
 }
}
