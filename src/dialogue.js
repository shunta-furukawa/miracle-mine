const portraits={'ルカ':0,'トトじい':1,'モス':2,'シェル':3,'クリム':4,'フレア':5,'フウ':6};
let dismiss=null;
export function showDialogue(story,onDone){
 dismiss?.(false);
 const previous=document.activeElement;
 const root=document.createElement('dialog');root.className='story-dialog';
 root.setAttribute('aria-label',story.title);
 root.innerHTML=`<section class="story-scene"><div class="story-background-window"><div class="story-backdrop"></div></div><div class="story-wash"></div><header class="story-header"><h2></h2><button class="story-skip">スキップ ≫</button></header><div class="story-actor story-left" aria-hidden="true"></div><div class="story-actor story-right" aria-hidden="true"></div><div class="story-goal"></div><div class="story-box"><div class="story-speaker"></div><p class="story-words" aria-hidden="true"></p><p class="sr-only story-accessible" aria-live="polite" aria-atomic="true"></p><div class="story-footer"><span class="story-count"></span><button class="story-next">全文を表示 ▸</button></div></div></section>`;
 const q=s=>root.querySelector(s);q('h2').textContent=story.title;
 const bg=q('.story-backdrop');bg.style.backgroundPosition=`${story.scene%3*50}% ${Math.floor(story.scene/3)*100}%`;
 q('.story-goal').textContent=story.goal||'数字がつながる、せかいがひろがる';
 let index=0,chars=[],visible=0,timer=null,closed=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function sprite(el,n){el.classList.remove('expression-portrait');el.style.backgroundPosition=`${n%4/3*100}% ${Math.floor(n/4)*100}%`;}
 function paint(){q('.story-words').textContent=chars.slice(0,visible).join('');const typing=visible<chars.length;root.classList.toggle('is-typing',typing);q('.story-next').textContent=typing?'全文を表示 ▸':index===story.lines.length-1?(story.goal?'パズルをはじめる ▸':'つづける ▸'):'次へ ▸';}
 function draw(){clearInterval(timer);const line=story.lines[index];chars=Array.from(line.text);visible=reduced?chars.length:0;q('.story-speaker').textContent=line.who;q('.story-accessible').textContent=`${line.who}。${line.text}`;q('.story-count').textContent=`${index+1} / ${story.lines.length} · タップ / Enter で進む`;
 const left=line.who==='ルカ';sprite(q('.story-left'),left?0:7);const right=q('.story-right'),base=portraits[story.partner]-1;
 if(left||line.expression==='emotion'){const n=base+(left?0:6);right.classList.add('expression-portrait');right.style.backgroundPosition=`${n%3*50}% ${Math.floor(n/3)/3*100}%`;}else sprite(right,portraits[story.partner]);
 right.dataset.expression=left?'listen':line.expression||'talk';q('.story-left').classList.toggle('speaking',left);q('.story-right').classList.toggle('speaking',!left);paint();if(!reduced)timer=setInterval(()=>{visible=Math.min(chars.length,visible+1);paint();if(visible===chars.length)clearInterval(timer);},32);}
 function end(run=true){if(closed)return;closed=true;clearInterval(timer);root.close();root.remove();dismiss=null;if(previous?.isConnected)previous.focus({preventScroll:true});if(run)onDone();}
 function advance(){if(visible<chars.length){clearInterval(timer);visible=chars.length;paint();}else if(index+1<story.lines.length){index++;draw();}else end();}
 root.addEventListener('click',e=>{if(e.target.closest('.story-skip'))end();else if(e.target.closest('.story-box'))advance();});
 root.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){if(e.target.closest('.story-skip'))return;e.preventDefault();advance();}});
 root.addEventListener('cancel',e=>{e.preventDefault();if(visible<chars.length){clearInterval(timer);visible=chars.length;paint();}});
 document.body.append(root);root.showModal();dismiss=end;draw();q('.story-next').focus();
}
