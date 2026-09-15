import {flightName,identity} from './flight-profile.js';
import {voyageRecord} from './sky-voyage.js';
import {normalizeStars} from './stars.js';
export const KEY='miracle-mine:v1';
export const freshSlot=()=>({cleared:[],paint:0,wing:0,propeller:0,decoration:0,failures:0,flightName:'',ranking:null,sky:voyageRecord(),stars:{},updated:Date.now()});
export const fresh=()=>({version:1,slots:[null,null,null],bests:{},settings:{sound:true,slow:false}});
export function normalize(value) {
 if(!value||value.version!==1)return fresh();
 const data=fresh();
 if(Array.isArray(value.slots))data.slots=data.slots.map((_,i)=>{
   const s=value.slots[i];if(!s||!Array.isArray(s.cleared))return null;
   const result=freshSlot();result.cleared=[...new Set(s.cleared.filter(n=>Number.isInteger(n)&&n>=0&&n<30))];
   for(const k of ['paint','wing','propeller','decoration'])result[k]=Number.isInteger(s[k])&&s[k]>=0&&s[k]<=2?s[k]:0;
   result.failures=Number.isInteger(s.failures)&&s.failures>0?s.failures:0;
   result.flightName=flightName(s.flightName);result.ranking=identity(s.ranking);result.sky=voyageRecord(s.sky);result.stars=normalizeStars(s.stars);
   result.updated=Number.isFinite(s.updated)?s.updated:Date.now();return result;
 });
 for(const k of ['score-add','score-mix','endless-add','endless-mix'])if(Number.isFinite(value.bests?.[k])&&value.bests[k]>=0)data.bests[k]=value.bests[k];
 for(const k of ['sound','slow'])if(typeof value.settings?.[k]==='boolean')data.settings[k]=value.settings[k];
 return data;
}
export function load(){try{return normalize(JSON.parse(localStorage.getItem(KEY)))}catch{return fresh()}}
export function save(data){try{localStorage.setItem(KEY,JSON.stringify(data));return true}catch{return false}}
