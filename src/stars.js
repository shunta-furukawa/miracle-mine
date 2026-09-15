import {stages} from './data.js';
/* Three-star ratings for story stages: play time since the stage became playable and how many
   times stones were broken (a trace that neither hit the goal nor merged). Pace is seconds per goal. */
export const STAR_PACE=[8,9,10,12,14];
export const TWO_STAR_FACTOR=1.6,TWO_STAR_BREAKS=2;
export const starGoal=stage=>({time:Math.round(stage.count*STAR_PACE[stage.chapter]),twoTime:Math.round(stage.count*STAR_PACE[stage.chapter]*TWO_STAR_FACTOR),breaks:0,twoBreaks:TWO_STAR_BREAKS});
export function rateRun(stage,{time,breaks}){
 const goal=starGoal(stage),t=Math.round(Math.max(0,time)*10)/10,b=Math.max(0,Math.floor(breaks));
 const stars=b<=goal.breaks&&t<=goal.time?3:b<=goal.twoBreaks&&t<=goal.twoTime?2:1;
 return {stars,time:t,breaks:b,goal};
}
export const starText=n=>'★'.repeat(Math.max(0,Math.min(3,n)))+'☆'.repeat(3-Math.max(0,Math.min(3,n)));
export function formatTime(seconds){const t=Math.max(0,Number(seconds)||0),m=Math.floor(t/60),s=t-m*60;return m?`${m}分${s.toFixed(1)}秒`:`${s.toFixed(1)}秒`;}
export const goalText=goal=>`${goal.time}秒以内・割らない`;
/* More stars win; then fewer breaks; then the faster time. */
export function betterRecord(a,b){if(!a)return b||null;if(!b)return a;if(b.stars!==a.stars)return b.stars>a.stars?b:a;if(b.breaks!==a.breaks)return b.breaks<a.breaks?b:a;return b.time<a.time?b:a;}
export function normalizeStars(value){
 const out={};if(!value||typeof value!=='object')return out;
 for(const t of stages){const r=value[t.id];if(r&&typeof r==='object'&&Number.isInteger(r.stars)&&r.stars>=1&&r.stars<=3&&Number.isFinite(r.time)&&r.time>=0&&Number.isInteger(r.breaks)&&r.breaks>=0)out[t.id]={stars:r.stars,time:Math.round(r.time*10)/10,breaks:r.breaks};}
 return out;
}
export const totalStars=slot=>Object.values(slot?.stars||{}).reduce((sum,r)=>sum+r.stars,0);
export const chapterStars=(slot,chapter)=>stages.slice(chapter*6,chapter*6+6).reduce((sum,t)=>sum+(slot?.stars?.[t.id]?.stars||0),0);
export const MAX_STARS=stages.length*3;
