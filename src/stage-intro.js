import {skyChapter} from './sky-voyage.js';
import {chapters} from './data.js';
export function stageBrief(stage,{mode='story',resume=false,remaining=stage.count}={}){
 if(mode==='sky')return {chapter:skyChapter,label:'SECRET CHAPTER 06',name:skyChapter.name,target:stage.target,goal:'完成した数字の分だけ、空を進もう',hint:'同じ石をダブルタップで＋と×を切り替え'};
 const story=mode==='story';
 return {chapter:chapters[stage.chapter],label:story?`STAGE ${stage.chapter+1}-${stage.step+1}`:mode==='score'?'SCORE ATTACK':'ENDLESS',
  name:story?stage.name:mode==='score'?'3分間のチャレンジ':'終わらない冒険',target:stage.target,
  goal:story?`${resume?'あと':''}${remaining}回つくろう`:mode==='score'?'3分間で、たくさんつくろう':'ライフが続くかぎり、つくろう',
  hint:stage.multiply?'同じ石をダブルタップで＋と×を切り替え':'＋で、となりの数字をつなごう'};
}
let dismiss=null;
export function showStageIntro(stage,options={}){
 dismiss?.();const brief=stageBrief(stage,options),previous=document.activeElement;
 const root=document.createElement('dialog');root.className='stage-intro'+(options.mode==='sky'?' sky-intro':'');root.setAttribute('aria-labelledby','stage-intro-name');
 root.style.setProperty('--intro-color',brief.chapter.color);
 root.innerHTML=`<section class="stage-intro-card"><div class="intro-rays" aria-hidden="true"></div><p class="intro-chapter"></p><p class="intro-stage"></p><h2 id="stage-intro-name"></h2><div class="intro-rule" aria-hidden="true"></div><div class="intro-goal"><span class="intro-goal-label">つくる数字</span><strong></strong><span class="intro-count"></span></div><p class="intro-hint"></p><button class="intro-start">${options.resume?'冒険をつづける':'はじめる'} ▸</button><p class="intro-note">準備ができたら、出発しよう</p></section>`;
 root.querySelector('.intro-chapter').textContent=`第${options.mode==='sky'?6:stage.chapter+1}章 · ${brief.chapter.name}`;
 root.querySelector('.intro-stage').textContent=options.resume?'READY TO CONTINUE':brief.label;
 root.querySelector('h2').textContent=brief.name;root.querySelector('.intro-goal strong').textContent=brief.target;
 root.querySelector('.intro-count').textContent=brief.goal;root.querySelector('.intro-hint').textContent=brief.hint;
 let closed=false;
 function close(){if(closed)return;closed=true;root.close();root.remove();dismiss=null;document.dispatchEvent(new CustomEvent('miracle:brief',{detail:{open:false}}));if(previous?.isConnected)previous.focus({preventScroll:true});}
 root.querySelector('button').addEventListener('click',()=>{if(closed)return;close();options.onStart?.();});
 root.addEventListener('cancel',e=>{e.preventDefault();root.querySelector('button').focus();});
 document.body.append(root);root.showModal();dismiss=close;root.querySelector('button').focus();
 document.dispatchEvent(new CustomEvent('miracle:brief',{detail:{open:true}}));
}
