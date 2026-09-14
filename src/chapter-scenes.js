import {victoryEffects} from './celebration.js';
import {assemblyShowcase,assemblyNames,partArt,collectionStrip} from './airplane.js';
import {chapters} from './data.js';

const subtitles=[
 '止まった水車に、もう一度いのちを。',
 '船を送り出す、潮風と水の港へ。',
 '小さな光で、みんなの帰り道を。',
 '小さな工夫が、大きな力になる。',
 'つないだ力を乗せて、雲の向こうへ。'
];
let active=null;

/** A chapter boundary owns focus until an explicit action, never a timer. */
export function showChapterScene(index,{clear=false,resume=false,completed=[],previous=completed,paint=0,design={paint},onNext,onMap}={}){
 active?.();
 const chapter=chapters[index],scene=index+1;
 const previousFocus=document.activeElement;
 const root=document.createElement('dialog');
 root.className=`chapter-dialog ${clear?'chapter-victory':'chapter-arrival'}`;
 root.setAttribute('aria-label',clear?`第${index+1}章 クリア`:`第${index+1}章 ${chapter.name}`);
 root.style.setProperty('--chapter-accent',chapter.color);
 root.innerHTML=`<section class="chapter-cinema">
  <div class="chapter-field-window" aria-hidden="true"><div class="chapter-landscape"></div></div><div class="chapter-shade" aria-hidden="true"></div>
  <div class="chapter-corners" aria-hidden="true"></div>
  <p class="chapter-location">MIRACLE MINE <span>／ ${chapter.tag}</span></p>
  ${clear?victoryEffects():''}
  <div class="chapter-presentation">
   <p class="chapter-kicker">${clear?'CHAPTER CLEAR':`${resume?'WELCOME BACK · ':''}CHAPTER ${String(index+1).padStart(2,'0')}`}</p>
   <h1>${chapter.name}</h1>
   <div class="chapter-rule" aria-hidden="true">✦</div>
   ${clear?`<p class="chapter-complete">第${index+1}章 · 全6ステージ クリア！</p>
   ${assemblyShowcase({completed,previous,paint,design,index,animate:previous.length<completed.length})}<div class="chapter-reward">${partArt(index)}<div><small>飛行機の部品を手に入れた！</small><strong>${chapter.part}</strong><span>${chapter.material}</span></div></div>
   <p class="chapter-thanks">${chapter.guardian}「${chapter.end}」</p>
   <div class="chapter-parts">${collectionStrip(completed)}<small>${completed.length} / 5 部品</small></div>`:`<p class="chapter-subtitle">${subtitles[index]}</p><p class="chapter-destination">出会う守り手 · ${chapter.guardian}</p>`}
   <div class="chapter-controls"><button class="chapter-continue">${clear?(index===4?'おじいちゃんと初飛行へ ▸':`第${index+2}章へ ▸`):resume?'冒険の地図へ ▸':'物語をはじめる ▸'}</button>${clear?'<button class="chapter-map">冒険の地図へ</button>':''}</div>
  </div>
 </section>`;
 root.querySelector('.chapter-landscape').style.backgroundPosition=`${scene%3*50}% ${Math.floor(scene/3)*100}%`;
 let closed=false;const stage=root.querySelector('.assembly-showcase');
 const finishAssembly=()=>{if(!stage||!stage.classList.contains('is-assembling'))return;document.dispatchEvent(new Event('miracle:assembly'));stage.classList.remove('is-assembling');stage.classList.add('assembly-ready');stage.querySelector('.assembly-caption').textContent=assemblyNames[Number(stage.dataset.after)];};
 stage?.addEventListener('animationend',event=>{if(event.animationName==='part-dock')finishAssembly();});
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)finishAssembly();
 function close(){if(closed)return;closed=true;document.dispatchEvent(new CustomEvent('miracle:chapter',{detail:{open:false}}));root.close();root.remove();active=null;if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
 root.addEventListener('click',event=>{const next=event.target.closest('.chapter-continue'),map=event.target.closest('.chapter-map');if(!next&&!map)return;close();(next?onNext:onMap)?.();});
 root.addEventListener('cancel',event=>{event.preventDefault();root.querySelector('.chapter-continue').focus();});
 document.body.append(root);root.showModal();document.dispatchEvent(new CustomEvent('miracle:chapter',{detail:{open:true,clear}}));active=close;root.querySelector('.chapter-continue').focus();
}
