// Sample playback only. Music and effects are licensed recordings; no synthesis.
export const AUDIO_KEY='miracle-mine:audio:v1';
export const MUSIC={
 title:{file:'breeze.mp3',title:'Breeze',url:'https://peritune.com/blog/2017/03/02/breeze/'},
 workshop:{file:'windmill-village.mp3',title:'Windmill_Village',url:'https://peritune.com/blog/2021/12/29/windmill_village/'},
 puzzle:{file:'wonder6.mp3',title:'Wonder6',url:'https://peritune.com/blog/2019/01/19/wonder6/'}
};
export const EFFECTS=['click','back','select','merge','success','clear','hint','shuffle','assemble','failure','chapter'];
export function audioSettings(value,legacySound=true){
 const result={music:legacySound,sound:legacySound,musicVolume:.45,soundVolume:.6};
 if(value?.version!==1)return result;
 for(const k of ['music','sound'])if(typeof value[k]==='boolean')result[k]=value[k];
 for(const k of ['musicVolume','soundVolume'])if(Number.isFinite(value[k]))result[k]=Math.max(0,Math.min(1,value[k]));
 return result;
}
export class Soundtrack{
 constructor(legacySound=true){
  let saved;try{saved=JSON.parse(localStorage.getItem(AUDIO_KEY));}catch{}
  this.settings=audioSettings(saved,legacySound);this.context=null;this.unlocked=false;this.hidden=document.hidden;
  this.scene='title';this.track=null;this.musicRequest=0;this.effectEpoch=0;this.buffers=new Map();this.pending=new Map();
  this.voices=new Set();this.musicVoices=new Set();this.lastEffect=new Map();this.ducks=new Set();this.offsets=new Map();
  this.onChange=()=>{};
 }
 init(){
  if(this.context)return;
  const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!AudioContext)return;
  this.context=new AudioContext();this.musicBus=this.context.createGain();this.soundBus=this.context.createGain();
  this.musicBus.connect(this.context.destination);this.soundBus.connect(this.context.destination);this.mix(true);
  this.context.addEventListener('statechange',()=>this.onChange());
 }
 // This method must be called directly from a pointer/key/click gesture on iOS.
 unlock(){
  try{
   this.init();if(!this.context||this.hidden)return Promise.resolve(false);
   return this.context.resume().then(()=>{
    this.unlocked=this.context.state==='running';this.onChange();
    if(this.unlocked&&!this.hidden){this.reconcile();this.preloadEffects();}
    return this.unlocked;
   }).catch(()=>false);
  }catch{return Promise.resolve(false);}
 }
 async buffer(file){
  if(this.buffers.has(file))return this.buffers.get(file);
  if(this.pending.has(file))return this.pending.get(file);
  const request=(async()=>{
   const response=await fetch('/assets/audio/'+file,{signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw new Error('Audio unavailable: '+file);
   const buffer=await this.context.decodeAudioData(await response.arrayBuffer());
   this.buffers.set(file,buffer);
   // Retain at most two decoded music tracks (compressed files remain in the SW cache).
   const musicFiles=new Set(Object.values(MUSIC).map(v=>v.file));
   const loaded=[...this.buffers.keys()].filter(k=>musicFiles.has(k));
   while(loaded.length>2)this.buffers.delete(loaded.shift());
   return buffer;
  })();
  this.pending.set(file,request);
  try{return await request;}finally{this.pending.delete(file);}
 }
 preloadEffects(){
  if(!this.context||!this.unlocked||!this.settings.sound||this.effectsPreloaded)return;
  this.effectsPreloaded=true;
  Promise.allSettled(EFFECTS.map(name=>this.buffer(name+'.mp3'))).then(results=>{
   if(results.some(r=>r.status==='rejected'))this.effectsPreloaded=false;
  });
 }
 setScene(scene){this.scene=scene;this.reconcile();}
 wanted(){return this.scene==='game'?'puzzle':['slots','map','workshop'].includes(this.scene)?'workshop':'title';}
 ramp(param,value,seconds=.18){
  const now=this.context.currentTime;
  if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);
  else{param.cancelScheduledValues(now);param.setValueAtTime(param.value,now);}
  param.linearRampToValueAtTime(value,now+seconds);
 }
 mix(immediate=false){
  if(!this.context)return;
  const music=(this.settings.music?this.settings.musicVolume:0)*(this.ducks.size ? .3 : 1);
  const sound=this.settings.sound?this.settings.soundVolume:0;
  if(immediate){this.musicBus.gain.value=music;this.soundBus.gain.value=sound;}
  else{this.ramp(this.musicBus.gain,music);this.ramp(this.soundBus.gain,sound);}
 }
 duck(reason,enabled){if(enabled)this.ducks.add(reason);else this.ducks.delete(reason);this.mix();}
 stopTrack(voice,fade=.65){
  if(!voice||voice.stopping)return;voice.stopping=true;
  this.offsets.set(voice.key,(voice.offset+this.context.currentTime-voice.started)%voice.source.buffer.duration);
  this.ramp(voice.gain.gain,0,fade);
  try{voice.source.stop(this.context.currentTime+fade+.01);}catch{}
  if(this.track===voice)this.track=null;
 }
 async reconcile(){
  if(!this.context||!this.unlocked)return;
  const key=this.wanted();
  if(this.hidden||!this.settings.music||this.settings.musicVolume===0){
   this.musicRequest++;this.loadingTrack=null;this.stopTrack(this.track,this.hidden?0:.18);this.onChange();return;
  }
  if(this.track?.key===key){
   if(this.loadingTrack){this.musicRequest++;this.loadingTrack=null;}
   return;
  }
  if(this.loadingTrack===key)return;
  const request=++this.musicRequest;this.loadingTrack=key;
  try{
   const buffer=await this.buffer(MUSIC[key].file);
   if(request!==this.musicRequest||this.hidden||!this.settings.music||this.context.state!=='running')return;
   const source=this.context.createBufferSource(),gain=this.context.createGain();
   source.buffer=buffer;source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(this.musicBus);
   const voice={key,source,gain,started:this.context.currentTime,offset:this.offsets.get(key)||0};
   source.onended=()=>{source.disconnect();gain.disconnect();this.musicVoices.delete(voice);};
   this.stopTrack(this.track);this.musicVoices.add(voice);this.track=voice;
   source.start(0,voice.offset%buffer.duration);this.ramp(gain.gain,1,.65);
   this.onChange();
  }catch{this.onChange();}finally{if(request===this.musicRequest)this.loadingTrack=null;}
 }
 async play(name){
  if(!EFFECTS.includes(name)||!this.unlocked||this.hidden||!this.settings.sound||!this.settings.soundVolume)return;
  const now=performance.now(),cooldown=name==='select'?65:100;
  if(now-(this.lastEffect.get(name)??-Infinity)<cooldown)return;
  this.lastEffect.set(name,now);const epoch=this.effectEpoch;
  try{
   const buffer=await this.buffer(name+'.mp3');
   // Never replay old input after a slow load, mute or a background transition.
   if(this.hidden||!this.settings.sound||epoch!==this.effectEpoch||performance.now()-now>350||this.context.state!=='running')return;
   const limit=name==='select'?2:8;
   if([...this.voices].filter(v=>name!=='select'||v.name==='select').length>=limit)return;
   const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.soundBus);
   const voice={source,name};this.voices.add(voice);
   const jingle=name==='chapter';if(jingle)this.duck(voice,true);
   source.onended=()=>{source.disconnect();this.voices.delete(voice);if(jingle)this.duck(voice,false);};
   source.start();
  }catch{}
 }
 stopEffects(){this.effectEpoch++;for(const v of this.voices){try{v.source.stop();}catch{}}}
 configure(changes){
  this.settings=audioSettings({version:1,...this.settings,...changes});
  if(!this.settings.sound)this.stopEffects();
  this.mix();this.reconcile();this.preloadEffects();this.onChange();
  try{localStorage.setItem(AUDIO_KEY,JSON.stringify({version:1,...this.settings}));return true;}catch{return false;}
 }
 visibility(hidden){
  this.hidden=hidden;
  if(hidden){
   this.musicRequest++;this.loadingTrack=null;this.stopEffects();
   for(const voice of this.musicVoices){this.stopTrack(voice,0);try{voice.source.stop();}catch{}}
   this.musicVoices.clear();this.track=null;
   this.context?.suspend().catch(()=>{});
  }else if(this.unlocked)this.unlock();
  this.onChange();
 }
}
export const creditsHTML=`<details class="audio-credits"><summary>音楽・効果音のクレジット</summary><p>音楽：PeriTune / むつき醒</p><ul>${Object.values(MUSIC).map(v=>`<li><a href="${v.url}" target="_blank" rel="noopener noreferrer">${v.title}</a></li>`).join('')}</ul><p><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> · 作者配布のループ版を使用。音量調整・MP3再圧縮。</p><p>効果音・ジングル：<a href="https://kenney.nl/assets/interface-sounds" target="_blank" rel="noopener noreferrer">Kenney — Interface Sounds</a> / <a href="https://kenney.nl/assets/music-jingles" target="_blank" rel="noopener noreferrer">Music Jingles</a>（<a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener noreferrer">CC0</a>）。MP3変換。</p></details>`;
