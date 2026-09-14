import {chapters} from './data.js';
export const assemblyNames=['はじまりの土台','翼と骨組みができた','胴体と尾翼がついた','動力の核が輝いた','エンジンの準備完了','蒸気飛行機、完成！'];
export const collectedParts=slot=>chapters.flatMap((_,i)=>slot?.cleared?.includes(i*6+5)?[i]:[]);
export function assemblyLevel(parts){let level=0;while(level<5&&parts.includes(level))level++;return level;}
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const customizationOptions=[
 {key:'paint',label:'機体の色',options:['青緑','夕焼け','夜空'],part:1},
 {key:'wing',label:'翼のかたち',options:['まっすぐ翼','丸い翼','二段の翼'],part:0},
 {key:'propeller',label:'プロペラ',options:['二枚羽','三枚羽','四枚羽'],part:3},
 {key:'decoration',label:'エンブレム',options:['星','月','葉'],part:1}
];
export function canCustomize(slot,key){const option=customizationOptions.find(o=>o.key===key);return !!option&&collectedParts(slot).includes(option.part);}
export function visibleDesign(level,value={}){
 const input=typeof value==='number'?{paint:value}:value||{};
 const option=key=>Number.isInteger(input[key])&&input[key]>=0&&input[key]<=2?input[key]:0;
 return {paint:level>=2?option('paint'):0,wing:level>=1?option('wing'):0,propeller:level>=4?option('propeller'):null,decoration:level>=2?option('decoration'):null};
}
export function planeArt(level,design=0,cls=''){
 level=Math.max(0,Math.min(5,level));const d=visibleDesign(level,design);
 const wingNames=['まっすぐ翼','丸い翼','二段の翼'];
 const label=[assemblyNames[level],level>=1?wingNames[d.wing]:'',d.propeller!==null?`${d.propeller+2}枚羽`:'',d.decoration!==null?`${['星','月','葉'][d.decoration]}のエンブレム`:''].filter(Boolean).join('、');
 return `<span class="airplane-render customized-plane ${cls}" role="img" aria-label="${label}" data-level="${level}" data-wing="${d.wing}" data-propeller="${d.propeller??'none'}" data-decoration="${d.decoration??'none'}" style="--plane-x:${level%2*100}%;--plane-y:${Math.floor(level/2)*50}%;--plane-hue:${[0,145,35][d.paint]}deg;--airframe:url('./assets/airframe-${['straight','round','biplane'][d.wing]}.webp')"><span class="airframe-sheet" aria-hidden="true"></span>${d.propeller!==null?`<span class="airframe-prop" aria-hidden="true" style="--accessory-x:${d.propeller*50}%"></span>`:''}${d.decoration!==null?`<span class="airframe-badge" aria-hidden="true" style="--accessory-x:${d.decoration*50}%"></span>`:''}</span>`;
}
export function partArt(index,cls=''){
 return `<span class="airplane-part ${cls}" role="img" aria-label="${index<5?chapters[index].part:'工房の道具箱'}" style="--part-x:${index%3*50}%;--part-y:${Math.floor(index/3)*100}%"></span>`;
}
export function collectionStrip(parts){return `<span class="collection-strip" aria-label="部品 ${parts.length} / 5">${chapters.map((c,i)=>`<span class="collection-item ${parts.includes(i)?'owned':'missing'}" title="${esc(c.part)}：${parts.includes(i)?'獲得済み':'まだ集めていない'}">${partArt(i)}<span class="collection-state" aria-hidden="true">${parts.includes(i)?'✓':'？'}</span></span>`).join('')}</span>`;}
export function assemblyShowcase({completed=[],previous=completed,paint=0,design={paint},index=0,animate=false}){
 const before=assemblyLevel(previous),after=assemblyLevel(completed),changing=animate&&after>before;
 return `<div class="assembly-showcase ${changing?'is-assembling':'assembly-ready'}" data-before="${before}" data-after="${after}" style="--dock-x:${[50,58,56,25,68][index]}%;--dock-y:${[61,47,52,48,32][index]}%">
 <div class="assembly-plane">${changing?planeArt(before,design,'assembly-before'):''}${planeArt(after,design,'assembly-after')}</div>
 ${changing?`<div class="assembly-incoming" aria-hidden="true">${partArt(index)}</div><div class="assembly-glow" aria-hidden="true"></div>`:''}
 <p class="assembly-caption" role="status">${changing?'部品を取り付けています…':assemblyNames[after]}</p>
 </div>`;
}
