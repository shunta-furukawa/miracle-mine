// A lightweight illustrated prologue: no video download, no save mutations.
export const openingShots=[
 {asset:'sky-world.webp',duration:3400,line:'雲の海に浮かぶ、小さな世界。',label:'A WORLD ABOVE THE CLOUDS'},
 {asset:'dialogue-worlds.webp',cell:1,duration:2300,line:'数字の力が、暮らしを動かす。',label:'THE POWER OF LITTLE NUMBERS'},
 {asset:'dialogue-worlds.webp',cell:2,duration:2300,line:'数字の力が、暮らしを動かす。',label:'THE POWER OF LITTLE NUMBERS'},
 {asset:'dialogue-worlds.webp',cell:3,duration:2300,line:'小さな出会いが、冒険になる。',label:'EVERY ENCOUNTER IS A BEGINNING'},
 {asset:'opening-workshop.webp',duration:7000,line:'いつか、この翼で。',label:'BEYOND THE CLOUDS'}
];
let dismiss;
export function showOpening(onDone=()=>{}){
 dismiss?.(false);const previous=document.activeElement,root=document.createElement('dialog');root.className='opening-film';root.setAttribute('aria-label','オープニング — 雲の向こうへ');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 root.innerHTML=`<div class="opening-shots" aria-hidden="true">${openingShots.map((s,i)=>`<div class="opening-shot" data-shot="${i}"><div class="opening-camera"><div class="opening-art ${s.cell===undefined?'':'opening-atlas'}" style="background-image:url('/assets/${s.asset}');${s.cell===undefined?'':`background-position:${s.cell%3*50}% ${Math.floor(s.cell/3)*100}%;`}"></div></div></div>`).join('')}</div><div class="opening-light" aria-hidden="true"></div><div class="opening-clouds" aria-hidden="true"></div><div class="opening-dust" aria-hidden="true">${Array.from({length:12},(_,i)=>`<i style="--x:${(i*37+9)%100}%;--delay:${-i*.61}s;--time:${5+i%4}s"></i>`).join('')}</div><div class="opening-vignette" aria-hidden="true"></div><div class="opening-top"><span>PROLOGUE</span><div><button class="opening-pause" aria-label="オープニングを一時停止">Ⅱ</button><button class="opening-skip">スキップ ≫</button></div></div><div class="opening-caption" aria-live="polite" aria-atomic="true"><p></p><h2></h2></div><div class="opening-progress" aria-hidden="true">${openingShots.map(()=>'<i></i>').join('')}</div>`;
 let closed=false,paused=false,index=-1,elapsed=0,last=performance.now(),frame,pan=null;
 const shots=[...root.querySelectorAll('.opening-shot')],bars=[...root.querySelectorAll('.opening-progress i')],pause=root.querySelector('.opening-pause');
 const total=openingShots.reduce((n,s)=>n+s.duration,0),fadeDuration=reduced?0:850;
 const veil=document.createElement('div');veil.className='opening-blackout';veil.setAttribute('aria-hidden','true');root.append(veil);
 function finish(run=true){if(closed)return;closed=true;cancelAnimationFrame(frame);pan?.cancel();document.removeEventListener('visibilitychange',visibility);root.close();root.remove();dismiss=null;if(previous?.isConnected)previous.focus({preventScroll:true});if(run)onDone();}
 function visibility(){last=performance.now();const stopped=paused||document.hidden;root.classList.toggle('is-paused',stopped);if(pan)stopped?pan.pause():pan.play();}
 function paint(){let start=0,next=0;for(let i=0;i<openingShots.length;i++){const duration=openingShots[i].duration;bars[i].style.setProperty('--fill',Math.max(0,Math.min(1,(elapsed-start)/duration)));if(elapsed>=start)next=i;start+=duration;}
  if(next===index)return;pan?.cancel();index=next;root.dataset.scene=String(index);shots.forEach((s,i)=>{s.classList.toggle('active',i===index);s.classList.toggle('past',i<index);});
  const shot=openingShots[index];root.querySelector('.opening-caption p').textContent=shot.label;root.querySelector('.opening-caption h2').textContent=shot.line;
  if(!reduced){pan=shots[index].querySelector('.opening-camera').animate([{transform:'scale(1.09) translate(-1%, 1%)'},{transform:'scale(1.015) translate(1%, 0)'}],{duration:shot.duration+700,fill:'forwards',easing:'ease-out'});visibility();}
 }
 function tick(now){if(closed)return;if(!paused&&!document.hidden)elapsed+=Math.min(100,Math.max(0,now-last));last=now;if(elapsed>=total+fadeDuration){finish();return;}
 if(elapsed>=total){veil.style.opacity=String(Math.min(1,(elapsed-total)/fadeDuration));root.classList.add('is-ending');}else paint();frame=requestAnimationFrame(tick);}
 pause.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',paused?'オープニングを再生':'オープニングを一時停止');visibility();});
 root.querySelector('.opening-skip').addEventListener('click',()=>finish());root.addEventListener('cancel',e=>{e.preventDefault();finish();});
 document.addEventListener('visibilitychange',visibility);document.body.append(root);root.showModal();dismiss=finish;paint();root.querySelector('.opening-skip').focus({preventScroll:true});
 // Preload later shots while the first panorama is already visible. Failures never block skipping.
 for(const asset of new Set(openingShots.map(s=>s.asset))){const img=new Image();img.src='/assets/'+asset;}
 frame=requestAnimationFrame(tick);return ()=>finish(false);
}
