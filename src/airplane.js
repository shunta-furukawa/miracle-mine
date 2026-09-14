import {chapters} from './data.js';
export const assemblyNames=['はじまりの土台','翼と骨組みができた','胴体と尾翼がついた','動力の核が輝いた','エンジンの準備完了','蒸気飛行機、完成！'];
export const collectedParts=slot=>chapters.flatMap((_,i)=>slot?.cleared?.includes(i*6+5)?[i]:[]);
export function assemblyLevel(parts){let level=0;while(level<5&&parts.includes(level))level++;return level;}
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function planeArt(level,paint=0,cls=''){
 level=Math.max(0,Math.min(5,level));
 return `<span class="airplane-render ${cls}" role="img" aria-label="${assemblyNames[level]}" data-level="${level}" style="--plane-x:${level%2*100}%;--plane-y:${Math.floor(level/2)*50}%;--plane-hue:${[0,145,35][paint]||0}deg"></span>`;
}
export function partArt(index,cls=''){
 return `<span class="airplane-part ${cls}" role="img" aria-label="${index<5?chapters[index].part:'工房の道具箱'}" style="--part-x:${index%3*50}%;--part-y:${Math.floor(index/3)*100}%"></span>`;
}
export function collectionStrip(parts){return `<span class="collection-strip" aria-label="部品 ${parts.length} / 5">${chapters.map((c,i)=>`<span class="collection-item ${parts.includes(i)?'owned':'missing'}" title="${esc(c.part)}：${parts.includes(i)?'獲得済み':'まだ集めていない'}">${partArt(i)}<span class="collection-state" aria-hidden="true">${parts.includes(i)?'✓':'？'}</span></span>`).join('')}</span>`;}
export function assemblyShowcase({completed=[],previous=completed,paint=0,index=0,animate=false}){
 const before=assemblyLevel(previous),after=assemblyLevel(completed),changing=animate&&after>before;
 return `<div class="assembly-showcase ${changing?'is-assembling':'assembly-ready'}" data-before="${before}" data-after="${after}" style="--dock-x:${[50,58,56,25,68][index]}%;--dock-y:${[61,47,52,48,32][index]}%">
 <div class="assembly-plane">${changing?planeArt(before,paint,'assembly-before'):''}${planeArt(after,paint,'assembly-after')}</div>
 ${changing?`<div class="assembly-incoming" aria-hidden="true">${partArt(index)}</div><div class="assembly-glow" aria-hidden="true"></div>`:''}
 <p class="assembly-caption" role="status">${changing?'部品を取り付けています…':assemblyNames[after]}</p>
 </div>`;
}
