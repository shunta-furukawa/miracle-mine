export const modeName=op=>op==='×'?'掛ける':'足す';
export const modeColor=op=>op==='×'?'#ce9aff':'#64ffe1';
export function isModeDoubleTap(previous,tap){
 return !!previous&&previous.index===tap.index&&previous.type===tap.type&&tap.time>=previous.time&&tap.time-previous.time<=320&&Math.hypot(tap.x-previous.x,tap.y-previous.y)<=24;
}
const displayValue=value=>Math.abs(value)<1e12?value.toLocaleString('ja-JP'):value.toExponential(2);
export function operationFeedback(board,index,op,value,switching=false){
 const stone=board?.querySelector(`[data-index="${index}"]`);if(!stone||document.hidden)return;
 let layer=board.querySelector('.operation-effects');
 if(!layer){layer=document.createElement('div');layer.className='operation-effects';layer.setAttribute('aria-hidden','true');board.append(layer);}
 layer.querySelectorAll('.trace-value,.mode-burst').forEach(el=>el.remove());
 const bounds=board.getBoundingClientRect(),r=stone.getBoundingClientRect(),x=r.left-bounds.left-board.clientLeft+r.width/2,y=r.top-bounds.top-board.clientTop+r.height/2;
 const fx=document.createElement('div');fx.className=switching?'mode-burst':'trace-value';fx.dataset.op=op;fx.style.setProperty('--mode-color',modeColor(op));
 const label=document.createElement('b');label.textContent=switching?`${op} ${modeName(op)}`:`${op} ${displayValue(value)}`;fx.append(label);
 fx.style.left=Math.max(58,Math.min(board.clientWidth-58,x))+'px';fx.style.top=Math.max(35,y-8)+'px';layer.append(fx);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(switching&&!reduced){
  const ring=document.createElement('i');ring.className='mode-ring';ring.style.left=(x-parseFloat(fx.style.left))+'px';ring.style.top=(y-parseFloat(fx.style.top))+'px';fx.append(ring);
  for(let i=0;i<10;i++){const spark=document.createElement('i');spark.className='mode-spark';const angle=i*Math.PI/5;spark.style.setProperty('--dx',Math.cos(angle)*r.width+'px');spark.style.setProperty('--dy',Math.sin(angle)*r.height+'px');fx.append(spark);}
 }
 const duration=reduced?450:switching?650:540;
 if(reduced){setTimeout(()=>fx.remove(),duration);return;}
 const animation=fx.animate([{opacity:0,transform:'translate(-50%,0) scale(.8)'},{offset:.15,opacity:1,transform:'translate(-50%,-8px) scale(1.08)'},{offset:.65,opacity:1,transform:'translate(-50%,-18px) scale(1)'},{opacity:0,transform:'translate(-50%,-28px) scale(.95)'}],{duration,easing:'ease-out'});
 animation.finished.catch(()=>{}).finally(()=>fx.remove());
}
