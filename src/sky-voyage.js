import {adjacent,evaluate} from './engine.js';
export const skyChapter={name:'トトじいと空の旅',guardian:'トトじい',color:'#53b6c5',material:'空の秘宝',part:'完成した蒸気飛行機'};
export const treasures=[
 {name:'翼の歯車',at:300,text:'空の遺跡から届いた、最初の贈りもの。'},
 {name:'雲の結晶',at:4000,text:'朝の雲を閉じこめた、澄んだ青い結晶。'},
 {name:'古代の羅針盤',at:20000,text:'まだ知らない島を指す、小さな道しるべ。'},
 {name:'羽根の鍵',at:45000,text:'雲の向こうの扉を開くという黄金の鍵。'},
 {name:'星の天球儀',at:160000,text:'昔の空の旅人たちが残した星図。'},
 {name:'天空の真珠',at:300000,text:'ふたりでたどり着いた、はるかな空の宝。'}
];
export const voyageUnlocked=s=>!!s&&Array.from({length:30},(_,i)=>i).every(i=>s.cleared.includes(i));
export const SKY_PROTOCOL=2;
/* Goal tiers: how many stones multiply to the target and how many goals each tier lasts. The last tier repeats forever. */
export const SKY_TIERS=[{tiles:2,count:10},{tiles:3,count:20},{tiles:4,count:30},{tiles:5,count:30}];
export const SKY_FACTORS=[2,3,4,5,6,7,8,9];
/* Each tier is a region of the sky. Players only ever see these names, never the stone count. */
export const SKY_REGIONS=[
 {key:'clouds',name:'雲の海',tagline:'白い雲のうえを、ゆっくり滑空する。',lore:'旅のはじまり。朝の光が雲海をてらし、道しるべの羅針盤が空のむこうを指している。'},
 {key:'afterglow',name:'夕映えの回廊',tagline:'空が茜色に染まり、気流が速くなる。',lore:'古い石のアーチが連なる回廊。ランタンに灯りがともり、風の筋が長く流れていく。'},
 {key:'stars',name:'星の高み',tagline:'空気がうすく、星が近い。',lore:'結晶が青白く光り、真鍮の天球儀がまわる。星の声が聞こえそうな、しずかな高み。'},
 {key:'farsky',name:'果ての空',tagline:'だれも見たことのない、空のむこう。',lore:'光のカーテンがゆらぎ、見知らぬ島の影が並ぶ。ここから先は、地図のない空。'}
];
const numerals=['','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ','Ⅷ','Ⅸ','Ⅹ'];
/* Region view of a goal or stage: name, lap (the last region repeats) and progress inside the region. */
export function voyageRegion(goal){
 const region=SKY_REGIONS[Math.min(goal.tier,SKY_REGIONS.length-1)],lap=Math.max(1,goal.set-SKY_TIERS.length+2),count=SKY_TIERS[Math.min(goal.set,SKY_TIERS.length-1)].count;
 return {...region,index:Math.min(goal.tier,SKY_REGIONS.length-1),lap,label:lap>1?`${region.name} ${numerals[Math.min(lap-1,numerals.length-1)]}`:region.name,position:goal.position,count};
}
export const FACTOR_BIAS=.35,ZERO_RATE=.08;
export const validSeed=n=>Number.isInteger(n)&&n>=0&&n<=0xFFFFFFFF;
export const randomSeed=()=>globalThis.crypto?.getRandomValues?globalThis.crypto.getRandomValues(new Uint32Array(1))[0]:Math.floor(Math.random()*0x100000000);
/* mulberry32: the same seed gives the same goal sequence on the client and on the ranking server. */
export function seededRandom(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const tierAt=set=>SKY_TIERS[Math.min(set,SKY_TIERS.length-1)];
const plans=new Map();
function goalSet(seed,set){
 const key=seed+':'+set;if(plans.has(key))return plans.get(key);
 const tier=tierAt(set),random=seededRandom((seed^Math.imul(set+1,0x9E3779B1))>>>0),seen=new Set(),picks=[];
 while(picks.length<tier.count){const factors=Array.from({length:tier.tiles},()=>SKY_FACTORS[Math.floor(random()*SKY_FACTORS.length)]).sort((a,b)=>a-b),target=factors.reduce((a,b)=>a*b,1);if(seen.has(target))continue;seen.add(target);picks.push({target,factors});}
 picks.sort((a,b)=>a.target-b.target);
 if(plans.size>=256)plans.delete(plans.keys().next().value);plans.set(key,picks);return picks;
}
/* The goal after `done` successes: tier sets are drawn once per seed, deduplicated by product and sorted ascending. */
export function voyageGoal(seed,done=0){
 if(!validSeed(seed))throw new Error('SEED');let index=Math.max(0,done),set=0;
 while(index>=tierAt(set).count){index-=tierAt(set).count;set++;}
 const pick=goalSet(seed,set)[index];return {target:pick.target,factors:pick.factors,tiles:tierAt(set).tiles,tier:Math.min(set,SKY_TIERS.length-1),set,position:index};
}
export function voyageStage(seed,done=0){const goal=voyageGoal(seed,done);return {chapter:4,step:0,id:30,name:skyChapter.name,target:goal.target,factors:goal.factors,tiles:goal.tiles,tier:goal.tier,set:goal.set,position:goal.position,min:0,max:9,multiply:true,count:Infinity,life:80,recover:18};}
/* New stones lean toward the current goal's factors; existing stones are never rewritten. */
export function skySpawn(stage,random=Math.random){if(random()<FACTOR_BIAS&&stage?.factors?.length)return stage.factors[Math.floor(random()*stage.factors.length)];return random()<ZERO_RATE?0:1+Math.floor(random()*9);}
export const createSkyBoard=(stage,random=Math.random)=>Array.from({length:25},()=>skySpawn(stage,random));
/* A product of zero clears the stones instead of merging into a 0. */
export function voyageEvaluate(board,path,op,target){const result=evaluate(board,path,op,target);return op==='×'&&result.kind==='merge'&&result.value===0?{...result,kind:'clear'}:result;}
export function voyageSolution(board,target){
 let budget=40000;
 function visit(path,value){if(--budget<0)return null;if(value===target&&path.length>=2)return {path,op:'×'};if(path.length>=5||value===0||value>target||target%value)return null;for(let i=0;i<25;i++)if(!path.includes(i)&&adjacent(path.at(-1),i)){const found=visit([...path,i],value*board[i]);if(found)return found}return null}
 for(let i=0;i<25;i++){if(!board[i])continue;const found=visit([i],board[i]);if(found)return found}return null;
}
const safe=n=>Number.isSafeInteger(n)&&n>=0?n:0;
/* Treasures already found stay found even if thresholds rise in a later version. */
export function voyageRecord(v={}){const total=safe(v?.total),best=Math.min(total,safe(v?.best)),kept=Array.isArray(v?.treasures)?v.treasures.filter(i=>Number.isInteger(i)&&i>=0&&i<treasures.length):[];return {total,best,flights:safe(v?.flights),treasures:[...new Set([...kept,...treasures.flatMap((t,i)=>total>=t.at?[i]:[])])].sort((a,b)=>a-b)};}
export function addDistance(record,delta,run){const old=voyageRecord(record),total=Math.min(Number.MAX_SAFE_INTEGER,old.total+delta);return voyageRecord({...old,total,best:Math.max(old.best,run)});}
export const treasureArt=i=>`<i class="treasure-art" aria-hidden="true" style="background-position:${i%3*50}% ${Math.floor(i/3)*100}%"></i>`;
export function treasureCollection(s){const record=voyageRecord(s.sky);return `<section class="treasure-collection parchment"><p class="eyebrow">SKY TREASURES</p><h3>ふたりの秘宝コレクション</h3><p>累計 ${record.total.toLocaleString()} m · 最長 ${record.best.toLocaleString()} m</p><div class="treasure-grid">${treasures.map((t,i)=>`<article class="treasure-item ${record.treasures.includes(i)?'found':'undiscovered'}">${treasureArt(i)}<strong>${record.treasures.includes(i)?t.name:'？？？'}</strong><small>${record.treasures.includes(i)?t.text:`累計 ${t.at.toLocaleString()} mで発見`}</small></article>`).join('')}</div>${record.treasures.length?'<button class="subtle share-entry treasure-share" data-action="share:treasure:treasure">秘宝を共有</button>':''}</section>`;}
