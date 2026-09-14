import {adjacent,evaluate} from './engine.js';
export const skyChapter={name:'トトじいと空の旅',guardian:'トトじい',color:'#53b6c5',material:'空の秘宝',part:'完成した蒸気飛行機'};
const routes=[[3,3,9],[3,4,9],[2,8,9],[3,8,9],[4,9,9],[8,8,8],[9,9,9],[4,4,8,8],[6,6,6,6],[7,7,7,7],[8,8,8,8],[9,9,9,9]];
export const treasures=[
 {name:'翼の歯車',at:500,text:'空の遺跡から届いた、最初の贈りもの。'},
 {name:'雲の結晶',at:2500,text:'朝の雲を閉じこめた、澄んだ青い結晶。'},
 {name:'古代の羅針盤',at:10000,text:'まだ知らない島を指す、小さな道しるべ。'},
 {name:'羽根の鍵',at:30000,text:'雲の向こうの扉を開くという黄金の鍵。'},
 {name:'星の天球儀',at:75000,text:'昔の空の旅人たちが残した星図。'},
 {name:'天空の真珠',at:150000,text:'ふたりでたどり着いた、はるかな空の宝。'}
];
export const voyageUnlocked=s=>!!s&&Array.from({length:30},(_,i)=>i).every(i=>s.cleared.includes(i));
export function voyageStage(done=0){const n=done<routes.length?done:7+(done-7)%5,factors=routes[n];return {chapter:4,step:0,id:30,name:skyChapter.name,target:factors.reduce((a,b)=>a*b,1),factors,min:2,max:9,multiply:true,count:Infinity,life:80,recover:18};}
export const voyageEvaluate=evaluate;
export function voyageSolution(board,target){
 function visit(path,value){if(value===target&&path.length>=2)return {path,op:'×'};if(path.length>=4||value>=target||target%value)return null;for(let i=0;i<25;i++)if(!path.includes(i)&&adjacent(path.at(-1),i)){const found=visit([...path,i],value*board[i]);if(found)return found}return null}
 for(let i=0;i<25;i++){const found=visit([i],board[i]);if(found)return found}return null;
}
export function prepareVoyageBoard(board,stage){if(voyageSolution(board,stage.target))return board;const next=[...board];stage.factors.forEach((n,i)=>next[10+i]=n);return next;}
const safe=n=>Number.isSafeInteger(n)&&n>=0?n:0;
export function voyageRecord(v={}){const total=safe(v?.total),best=Math.min(total,safe(v?.best));return {total,best,flights:safe(v?.flights),treasures:treasures.flatMap((t,i)=>total>=t.at?[i]:[])};}
export function addDistance(record,delta,run){const old=voyageRecord(record),total=Math.min(Number.MAX_SAFE_INTEGER,old.total+delta);return voyageRecord({...old,total,best:Math.max(old.best,run)});}
export const treasureArt=i=>`<i class="treasure-art" aria-hidden="true" style="background-position:${i%3*50}% ${Math.floor(i/3)*100}%"></i>`;
export function treasureCollection(s){const record=voyageRecord(s.sky);return `<section class="treasure-collection parchment"><p class="eyebrow">SKY TREASURES</p><h3>ふたりの秘宝コレクション</h3><p>累計 ${record.total.toLocaleString()} m · 最長 ${record.best.toLocaleString()} m</p><div class="treasure-grid">${treasures.map((t,i)=>`<article class="treasure-item ${record.treasures.includes(i)?'found':'undiscovered'}">${treasureArt(i)}<strong>${record.treasures.includes(i)?t.name:'？？？'}</strong><small>${record.treasures.includes(i)?t.text:`累計 ${t.at.toLocaleString()} mで発見`}</small></article>`).join('')}</div></section>`;}
