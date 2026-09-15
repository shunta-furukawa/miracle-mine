import {flightName,flightDesign} from './flight-profile.js';
import {SKY_PROTOCOL,validSeed} from './sky-voyage.js';
export const OUTBOX='miracle-mine:ranking:v1';
export const rankStatus=r=>!r?'この旅はランキングに参加していません':r.status==='finished'?'ランキングへの送信が完了しました':r.status==='excluded'?'この旅はランキング対象外です。冒険の記録は保存されています':r.closed?'記録を送信中。画面を閉じても、次に開いたとき再送します':'ランキング参加中 · 通信を待たずに遊べます';
export class RankingClient{
 constructor({storage={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)},request=(...args)=>fetch(...args),onChange=()=>{}}={}){this.storage=storage;this.request=request;this.onChange=onChange;this.running=false;this.timer=null;this.backoff=1500;try{this.runs=JSON.parse(storage.getItem(OUTBOX)||'[]').filter(r=>r&&typeof r.runId==='string'&&Array.isArray(r.events)).slice(-8)}catch{this.runs=[]}for(const r of this.runs)if(!r.closed&&r.status==='flying'){r.status='excluded';r.events=[];}this.save();}
 save(){try{this.storage.setItem(OUTBOX,JSON.stringify(this.runs));return true}catch{return false}}
 async api(action,body={},key){const query=['status','board'].includes(action)&&body.season!==undefined&&body.season!==null?'&season='+encodeURIComponent(body.season):'';const response=await this.request('/api/ranking?action='+action+query,{method:['status','board'].includes(action)?'GET':'POST',headers:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})},...(!['status','board'].includes(action)?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000),cache:'no-store'});let data;try{data=await response.json()}catch{throw Object.assign(new Error('UNAVAILABLE'),{retry:true})}if(!response.ok)throw Object.assign(new Error(data.error||'UNAVAILABLE'),{retry:response.status===429||response.status>=500});return data;}
 async begin(s,persist){
  if(!s.ranking){s.ranking={key:[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join(''),uid:''};if(!persist())throw Error('STORAGE');}
  if(this.runs.filter(r=>!['finished','excluded'].includes(r.status)).length>=8)throw Error('BACKLOG');
  const key=s.ranking.key,registered=await this.api('register',{completed:s.cleared.length===30},key);s.ranking.uid=registered.uid;if(!persist())throw Error('STORAGE');
  const run={runId:crypto.randomUUID(),key,uid:registered.uid,events:[],count:0,distance:0,status:'flying',closed:false,seed:null,season:null};
  const started=await this.api('start',{runId:run.runId,protocol:SKY_PROTOCOL,name:flightName(s.flightName),design:flightDesign(s)},key);
  if(!validSeed(started.seed))throw Error('VERSION');run.seed=started.seed;run.season=started.season?.id??null;
  this.runs=this.runs.filter(r=>r.status!=='finished'&&r.status!=='excluded');this.runs.push(run);if(!this.save()){run.status='excluded';throw Error('STORAGE')}return run;
 }
 goal(run,level,target){if(!run||run.closed||run.status==='excluded')return;run.count++;run.distance+=target;run.events.push({action:'goal',body:{runId:run.runId,seq:run.count,level,target}});if(run.events.length>10000||!this.save()){this.exclude(run);return;}void this.flush();}
 finish(run,reason){if(!run||run.closed||run.status==='excluded')return;run.closed=true;run.events.push({action:'finish',body:{runId:run.runId,count:run.count,distance:run.distance,reason}});if(!this.save()){this.exclude(run);return;}this.onChange(run);void this.flush();}
 exclude(run){run.status='excluded';run.events=[];this.save();this.onChange(run);}
 async flush(){if(this.running)return;clearTimeout(this.timer);this.running=true;let retry=false;
  try{for(const run of this.runs){if(['excluded','finished'].includes(run.status))continue;while(run.events.length){const event=run.events[0];try{await this.api(event.action,event.body,run.key);run.events.shift();if(event.action==='finish')run.status='finished';this.backoff=1500;if(!this.save()){this.exclude(run);break;}this.onChange(run);}catch(e){if(e.retry||e.name==='TimeoutError'||e.name==='AbortError'||e instanceof TypeError){retry=true;break;}this.exclude(run);break;}}}}finally{this.running=false;if(retry){this.timer=setTimeout(()=>void this.flush(),this.backoff);this.backoff=Math.min(30000,this.backoff*2);}}
 }
}
