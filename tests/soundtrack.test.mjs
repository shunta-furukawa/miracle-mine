import test from 'node:test';
import assert from 'node:assert/strict';
import {Soundtrack,audioSettings,AUDIO_KEY} from '../src/soundtrack.js';

test('legacy mute defaults both channels off; corrupt preferences are bounded',()=>{
 assert.deepEqual(audioSettings(null,false),{music:false,sound:false,musicVolume:.45,soundVolume:.6});
 assert.deepEqual(audioSettings({version:1,music:true,sound:'no',musicVolume:900,soundVolume:-2},false),{music:true,sound:false,musicVolume:1,soundVolume:0});
 assert.equal(audioSettings({version:1,musicVolume:NaN}).musicVolume,.45);
});

const flush=()=>new Promise(r=>setImmediate(r));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
class Parameter{constructor(){this.value=1}cancelAndHoldAtTime(){}linearRampToValueAtTime(v){this.value=v}}
class Context{
 constructor(){this.state='running';this.currentTime=10;this.destination={};this.started=[]}
 createGain(){return {gain:new Parameter(),connect(){},disconnect(){}}}
 createBufferSource(){const context=this;return {connect(){},disconnect(){},start(){context.started.push(this)},stop(){this.onended?.()}}}
 addEventListener(){}async resume(){this.state='running'}async suspend(){this.state='suspended'}
}
test('audio races and preference storage never alter adventure data',async()=>{
 const original={document:globalThis.document,AudioContext:globalThis.AudioContext,localStorage:globalThis.localStorage};
 const slots='{"version":1,"slots":[{"cleared":[0,1,2]},null,null]}';
 const storage=new Map([['miracle-mine:v1',slots]]);
 globalThis.document={hidden:false};globalThis.AudioContext=Context;
 globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 try{
  const audio=new Soundtrack();audio.init();audio.unlocked=true;audio.preloadEffects=()=>{};
  const pending=deferred(),buffer={duration:80};
  audio.buffer=file=>file==='wonder6.mp3'?pending.promise:Promise.resolve(buffer);
  audio.setScene('title');await flush();assert.equal(audio.track.key,'title');
  audio.setScene('game');audio.setScene('title');pending.resolve(buffer);await flush();
  assert.equal(audio.track.key,'title','late puzzle load must not replace the title after returning');
  assert.equal(audio.context.started.length,1);
  audio.setScene('workshop');await flush();assert.equal(audio.track.key,'workshop');
  audio.configure({music:false,musicVolume:.25,soundVolume:.35});
  assert.equal(audio.track,null);assert.equal(storage.get('miracle-mine:v1'),slots);
  assert.equal(JSON.parse(storage.get(AUDIO_KEY)).musicVolume,.25);
  const effect=deferred();audio.buffer=()=>effect.promise;const count=audio.context.started.length;
  const play=audio.play('success');audio.configure({sound:false});effect.resolve(buffer);await play;
  assert.equal(audio.context.started.length,count,'muted pending effects must not play late');
  audio.visibility(true);await flush();assert.equal(audio.context.state,'suspended');
  assert.equal(audio.musicVoices.size,0);
  globalThis.localStorage.setItem=()=>{throw new Error('quota')};
  assert.equal(audio.configure({soundVolume:.1}),false);assert.equal(storage.get('miracle-mine:v1'),slots);
 }finally{Object.assign(globalThis,original)}
});
