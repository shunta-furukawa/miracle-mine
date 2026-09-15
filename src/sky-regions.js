import {voyageRegion} from './sky-voyage.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let active=null;
/* Full-screen cut-in when the voyage crosses into a new region. The game stays paused until the player continues. */
export function showRegionCutin(stage,{onContinue}={}){
 active?.();
 const region=voyageRegion(stage),previous=document.activeElement,root=document.createElement('dialog');
 root.className='region-dialog';root.dataset.region=region.key;root.setAttribute('aria-label',`${region.lap>1?'さらに奥へ':'新しい領域へ'} ${region.label}`);
 root.innerHTML=`<section class="region-cinema"><div class="region-backdrop" aria-hidden="true"></div><div class="region-shade" aria-hidden="true"></div><div class="region-corners" aria-hidden="true"></div><div class="region-presentation"><p class="region-kicker">${region.lap>1?'さらに奥へ':'新しい領域へ'}</p><p class="region-index">SKY REGION ${['Ⅰ','Ⅱ','Ⅲ','Ⅳ'][region.index]}${region.lap>1?` · ${region.lap}めぐりめ`:''}</p><h1>${esc(region.label)}</h1><div class="region-rule" aria-hidden="true">✦</div><p class="region-tagline">${esc(region.tagline)}</p><p class="region-lore">${esc(region.lore)}</p><p class="region-note">気流が変わった。お題は小さな数から、また高くなっていく。</p><button class="region-continue">進む ▸</button></div></section>`;
 let closed=false;
 function close(){if(closed)return;closed=true;active=null;document.dispatchEvent(new CustomEvent('miracle:region',{detail:{open:false}}));root.close();root.remove();if(previous?.isConnected)previous.focus({preventScroll:true});}
 root.querySelector('.region-continue').addEventListener('click',()=>{close();onContinue?.();});
 root.addEventListener('cancel',e=>{e.preventDefault();root.querySelector('.region-continue').focus();});
 document.body.append(root);root.showModal();active=close;root.querySelector('.region-continue').focus();
 document.dispatchEvent(new CustomEvent('miracle:region',{detail:{open:true,region:region.key}}));
 return {close,root};
}
