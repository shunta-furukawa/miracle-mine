import {chapters,stages} from './data.js';
import {assemblyNames,collectedParts,assemblyLevel} from './airplane.js';
import {treasures} from './sky-voyage.js';
import {flightName,flightDesign} from './flight-profile.js';
import {publicName} from './name-filter.js';

/* Public snapshot for sharing. Everything here is shown on the card and inside the URL,
   so it never carries the ranking UID, the authentication key or the full save. */
export const SITE='https://miracle-mine.vercel.app';
export const SHARE_PATH='/api/share';
export const kinds=['title','slot','stage','chapter','flight','workshop','sky','voyage','treasure','rank'];
export const shareEvents=['open','x','copy','save','native','visit','start'];
export const MAX_CODE=600;
const paints=['青緑','夕焼け','夜空'],wings=['まっすぐ翼','丸い翼','二段の翼'],props=['二枚羽','三枚羽','四枚羽'],badges=['星','月','葉'];
const count=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max?n:null;
const clamp=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max?n:null;
export const fmt=n=>Number(n).toLocaleString('ja-JP');

export function createSnapshot(kind,slot=null,extra={}){
 const level=slot?assemblyLevel(collectedParts(slot)):0;
 return normalizeSnapshot({kind,name:slot?slot.flightName:'',design:slot?flightDesign(slot):null,level,cleared:slot?slot.cleared.length:0,...extra});
}
export function normalizeSnapshot(value){
 if(!value||typeof value!=='object'||!kinds.includes(value.kind))return null;
 const kind=value.kind,design=flightDesign(value.design||{}),level=clamp(value.level,5)??0;
 const snapshot={kind,name:publicName(flightName(value.name)),design,level,cleared:clamp(value.cleared,30)??0,chapter:clamp(value.chapter,4),stage:clamp(value.stage,5),stars:clamp(value.stars,3)||null,tenths:count(value.tenths,360000),distance:count(value.distance),best:count(value.best),total:count(value.total),rank:count(value.rank),treasures:[...new Set(Array.isArray(value.treasures)?value.treasures.filter(i=>Number.isInteger(i)&&i>=0&&i<treasures.length):[])].sort((a,b)=>a-b)};
 if(['stage','chapter'].includes(kind)&&snapshot.chapter===null)return null;
 if(kind==='stage'&&snapshot.stage===null)return null;
 if(['voyage','rank'].includes(kind)&&snapshot.distance===null)return null;
 if(kind==='rank'&&(snapshot.rank===null||snapshot.rank<1))return null;
 return snapshot;
}
const bytesToBase64=bytes=>btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const base64ToBytes=text=>Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-text.length%4)%4)),c=>c.charCodeAt(0));
export function encodeShare(value){
 const s=normalizeSnapshot(value);if(!s)throw new Error('SHARE_INPUT');
 const compact={v:1,k:s.kind};
 if(s.name)compact.n=s.name;
 if(Object.values(s.design).some(Boolean))compact.d=[s.design.paint,s.design.wing,s.design.propeller,s.design.decoration];
 if(s.level)compact.a=s.level;if(s.cleared)compact.p=s.cleared;
 for(const [key,short] of [['chapter','c'],['stage','s'],['distance','m'],['best','b'],['total','t'],['rank','r'],['stars','q'],['tenths','e']])if(s[key]!==null)compact[short]=s[key];
 if(s.treasures.length)compact.j=s.treasures;
 return bytesToBase64(new TextEncoder().encode(JSON.stringify(compact)));
}
export function decodeShare(code){
 if(typeof code!=='string'||!code||code.length>MAX_CODE||!/^[A-Za-z0-9_-]+$/.test(code))return null;
 let raw;try{raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(base64ToBytes(code)));}catch{return null}
 if(!raw||typeof raw!=='object'||raw.v!==1||!Array.isArray(raw.d)&&raw.d!==undefined)return null;
 const d=raw.d||[];
 return normalizeSnapshot({kind:raw.k,name:raw.n,design:{paint:d[0],wing:d[1],propeller:d[2],decoration:d[3]},level:raw.a??0,cleared:raw.p??0,chapter:raw.c,stage:raw.s,stars:raw.q,tenths:raw.e,distance:raw.m,best:raw.b,total:raw.t,rank:raw.r,treasures:raw.j});
}
export const shareUrl=(snapshot,origin=SITE)=>`${origin}${SHARE_PATH}?s=${encodeShare(snapshot)}`;
export const shareImageUrl=(snapshot,origin=SITE)=>`${shareUrl(snapshot,origin)}&image=1`;
export const designLabel=d=>`${paints[d.paint]}の機体・${wings[d.wing]}・${props[d.propeller]}・${badges[d.decoration]}のエンブレム`;
export const planeName=s=>s.name||'ルカの蒸気飛行機';

/* Card, page and post copy. The same words appear on the PNG, in OGP metadata and in the X post. */
export function shareCopy(value){
 const s=normalizeSnapshot(value)||normalizeSnapshot({kind:'title'});
 const c=s.chapter!==null?chapters[s.chapter]:null,plane=planeName(s),tag='#ミラクルマイン',site='Miracle Mine';
 const intro='数字をつないで、自分だけの蒸気飛行機を組み立てる無料の冒険パズル。';
 const progress=`${assemblyNames[s.level]}（部品 ${s.level} / 5）`;
 const copy={eyebrow:'MIRACLE MINE',title:`${site} | ミラクルマイン`,headline:'数字がつながる、せかいがひろがる。',caption:intro,chips:[],description:intro,text:`数字をつないで蒸気飛行機を組み立てる無料パズル「${site}」で遊んでるよ！ ${tag}`,scene:'workshop'};
 switch(s.kind){
  case 'slot':case 'workshop':
   Object.assign(copy,{title:`${plane}｜${site}`,headline:`${plane}は、${assemblyNames[s.level]}`,caption:`${s.cleared} / 30 ステージクリア・${designLabel(s.design)}`,chips:[progress,`${s.cleared} / 30 ステージ`],description:`${progress}。${intro}`,text:`わたしの蒸気飛行機「${plane}」は、${assemblyNames[s.level]}${assemblyNames[s.level].endsWith('！')?'':'！'} 部品 ${s.level} / 5 ${tag}`});break;
  case 'stage':{const st=stages[s.chapter*6+s.stage],label=`${s.chapter+1}-${s.stage+1}「${st.name}」`,starLine=s.stars?`${'★'.repeat(s.stars)}${'☆'.repeat(3-s.stars)}${s.tenths!==null?` ${(s.tenths/10).toFixed(1)}秒`:''}`:'';
   Object.assign(copy,{title:`第${s.chapter+1}章 ${label} クリア！｜${site}`,headline:`${label}をクリア！`,caption:`第${s.chapter+1}章「${c.name}」・目標の数 ${st.target}${starLine?`・${starLine}`:''}`,chips:[...(starLine?[starLine]:[]),`第${s.chapter+1}章 ${c.name}`,`${s.cleared} / 30 ステージ`],description:`第${s.chapter+1}章「${c.name}」のステージ${label}をクリア${starLine?`（${starLine}）`:''}。${intro}`,text:`Miracle Mine 第${s.chapter+1}章「${c.name}」${label}をクリア！${starLine?` ${starLine}`:''} ${s.cleared} / 30 ステージ ${tag}`,scene:'chapter'});break;}
  case 'chapter':
   Object.assign(copy,{title:`第${s.chapter+1}章「${c.name}」クリア！｜${site}`,headline:`第${s.chapter+1}章「${c.name}」クリア！`,caption:`${c.part}を手に入れた・${assemblyNames[s.level]}`,chips:[c.part,progress],description:`第${s.chapter+1}章「${c.name}」をクリアして、${c.part}を手に入れた。${intro}`,text:`Miracle Mine 第${s.chapter+1}章「${c.name}」クリア！ ${c.part}を手に入れて、${assemblyNames[s.level]} ${tag}`,scene:'chapter'});break;
  case 'flight':
   Object.assign(copy,{title:`蒸気飛行機「${plane}」完成！｜${site}`,headline:`蒸気飛行機「${plane}」完成！`,caption:'5つの部品をあつめて、おじいちゃんと初飛行へ。',chips:['部品 5 / 5','30 ステージ クリア'],description:`5つの部品をあつめて蒸気飛行機が完成。${intro}`,text:`Miracle Mine で蒸気飛行機「${plane}」が完成！ 5つの部品をあつめて、おじいちゃんと初飛行へ ${tag}`,scene:'sky'});break;
  case 'sky':
   Object.assign(copy,{title:`「${plane}」で空の旅へ｜${site}`,headline:`「${plane}」で、空の旅へ出発！`,caption:`第6章 トトじいと空の旅・最長 ${fmt(s.best??0)} m`,chips:[`最長 ${fmt(s.best??0)} m`,`累計 ${fmt(s.total??0)} m`],description:`隠し第6章「トトじいと空の旅」。最長 ${fmt(s.best??0)} m。${intro}`,text:`Miracle Mine 第6章「トトじいと空の旅」に「${plane}」で出発！ 最長 ${fmt(s.best??0)} m ${tag}`,scene:'sky'});break;
  case 'voyage':
   Object.assign(copy,{title:`空の旅で ${fmt(s.distance)} m 飛んだ！｜${site}`,headline:`${fmt(s.distance)} m 飛んだ！`,caption:`「${plane}」の空の旅・最長 ${fmt(s.best??s.distance)} m`,chips:[`今回 ${fmt(s.distance)} m`,`最長 ${fmt(s.best??s.distance)} m`],description:`「${plane}」で空の旅 ${fmt(s.distance)} m。${intro}`,text:`Miracle Mine の空の旅で「${plane}」が ${fmt(s.distance)} m 飛んだ！ 最長 ${fmt(s.best??s.distance)} m ${tag}`,scene:'sky'});break;
  case 'treasure':{const names=s.treasures.map(i=>treasures[i].name);
   Object.assign(copy,{title:`空の秘宝 ${s.treasures.length} / 6 発見！｜${site}`,headline:`空の秘宝を ${s.treasures.length} / 6 発見！`,caption:names.length?names.join('・'):'まだ秘宝は見つかっていない',chips:[`累計 ${fmt(s.total??0)} m`,`秘宝 ${s.treasures.length} / 6`],description:`「${plane}」の空の旅で秘宝 ${s.treasures.length} / 6 を発見。${intro}`,text:`Miracle Mine の空の旅で秘宝 ${s.treasures.length} / 6 を発見！ ${names.length?`「${names.join('・')}」`:''} ${tag}`,scene:'sky'});break;}
  case 'rank':
   Object.assign(copy,{title:`空の旅ランキング ${fmt(s.rank)} 位！｜${site}`,headline:`空の旅ランキング ${fmt(s.rank)} 位！`,caption:`「${plane}」・一度の旅で ${fmt(s.distance)} m`,chips:[`${fmt(s.rank)} 位`,`${fmt(s.distance)} m`],description:`「${plane}」が空の旅ランキング ${fmt(s.rank)} 位（${fmt(s.distance)} m、共有時点）。${intro}`,text:`Miracle Mine 空の旅ランキング ${fmt(s.rank)} 位！ 「${plane}」が ${fmt(s.distance)} m 飛んだよ ${tag}`,scene:'sky'});break;
 }
 return copy;
}
export const xIntentUrl=(text,url)=>`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
