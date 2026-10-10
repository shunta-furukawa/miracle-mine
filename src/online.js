import {ONLINE_PROTOCOL,createRound,applyMove,MAX_ROUND_MS,onlineUnlocked,validRoomId} from './online-rules.js';
import {extend,adjacent,total,evaluate} from './engine.js';
import {traceIndex} from './trace-input.js';
import {isModeDoubleTap,modeColor} from './operation-feedback.js';
import {ONLINE_INTRO_KEY,onlinePrologue} from './online-story.js';

export {onlineUnlocked};
export const SNAPSHOT_LIMIT=12*1024;
const ROOM_KEY='miracle-mine:online:room:v1:';
const TERMINAL=new Set(['finished','cancelled']);
const SNAPSHOT_FIELDS=new Set(['protocol','type','seq','board','path','op','elapsed','moves','solved','finished']);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(text,action,cls='',disabled=false)=>`<button type="button" class="${cls}" data-online="${action}" ${disabled?'disabled':''}>${text}</button>`;
const readSession=id=>{try{const s=JSON.parse(sessionStorage.getItem(ROOM_KEY+id));return /^[a-f0-9]{64}$/.test(s?.token)?s:null;}catch{return null;}};
const writeSession=(id,s)=>{try{sessionStorage.setItem(ROOM_KEY+id,JSON.stringify(s));}catch{}};
const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
const tileStyle=n=>`background-size:500% 200%;background-position:${n%5*25}% ${Math.floor(n/5)*100}%;`;

/** Invite links carry a room ID only. Never accept a different destination or credentials. */
export function parseOnlineInvite(value,origin='https://miracle-mine.vercel.app'){
 if(typeof value!=='string'||value.length>2048)return null;
 const s=value.trim();if(validRoomId(s))return s.toLowerCase();
 try{const u=new URL(s,origin);if(u.origin!==new URL(origin).origin)return null;const id=new URLSearchParams(u.hash.slice(1)).get('online');return validRoomId(id)?id.toLowerCase():null;}catch{return null;}
}
export function validateSnapshot(value,lastSeq=-1){
 if(!value||Array.isArray(value)||Object.keys(value).some(key=>!SNAPSHOT_FIELDS.has(key))||value.protocol!==ONLINE_PROTOCOL||value.type!=='state'||!Number.isSafeInteger(value.seq)||value.seq<=lastSeq)return false;
 if(!Array.isArray(value.board)||value.board.length!==25||value.board.some(n=>!Number.isInteger(n)||n<0||n>9))return false;
 if(!Array.isArray(value.path)||value.path.length>25||new Set(value.path).size!==value.path.length||value.path.some((n,i)=>!Number.isInteger(n)||n<0||n>24||(i&&!adjacent(value.path[i-1],n))))return false;
 return ['+','×'].includes(value.op)&&Number.isInteger(value.elapsed)&&value.elapsed>=0&&value.elapsed<=MAX_ROUND_MS+2000&&Number.isInteger(value.moves)&&value.moves>=0&&value.moves<=300&&typeof value.solved==='boolean'&&typeof value.finished==='boolean'&&(!value.solved||value.finished);
}
export function estimateClock(serverNow,wallStart,rtt){return {offset:serverNow-wallStart-rtt/2,uncertainty:Math.ceil(rtt/2+25)};}
export function resultCopy(result,seat){
 if(result?.kind==='win'&&[0,1].includes(result.winner))return result.winner===seat?['お題、完成！ きみの勝ち！','ふたりの手順とタイムを確認しました。']:['相手のお題が、先に完成！','次はどんなつなぎ方で挑戦する？'];
 if(result?.kind==='draw'&&result.reason==='no_solution')return ['今回は引き分け','ふたりとも、お題は次の勝負へ持ち越し。新しい部屋でまた挑戦しよう。'];
 if(result?.kind==='draw')return ['ほぼ同時に完成！ 引き分け','ふたりとも、すてきなつなぎ方だったね。'];
 if(result?.kind==='cancelled')return ['この勝負は、おあずけ','部屋を出たか、待ち時間が過ぎました。新しい部屋でまた会おう。'];
 return ['今回は勝敗なし','通信やタイムを確かめられませんでした。切断で勝ちにはなりません。新しい部屋でまた会おう。'];
}

/** Owns every online listener, timeout, request and peer. No adventure state is written. */
export class OnlineRoom{
 constructor({root,unlocked,roomId=null,onExit,conversation,play=()=>{}}){
  Object.assign(this,{root,unlocked,invite:roomId||'',onExit,conversation,play});
  this.alive=true;this.ui='entry';this.room=null;this.view=null;this.pc=null;this.channel=null;this.pending=false;
  this.timers=new Set();this.listeners=new AbortController();this.requests=new Set();this.bestRTT=Infinity;this.clockUncertainty=1000;
  this.path=[];this.op='+';this.moves=[];this.seq=0;this.peerSeq=-1;this.lastPeerAt=0;this.lastSent=0;this.round=null;this.peer=null;this.frozen=false;
  this.root.addEventListener('click',e=>{const a=e.target.closest('[data-online]');if(a&&!a.disabled)void this.action(a.dataset.online);},{signal:this.listeners.signal});
  window.addEventListener('pagehide',()=>this.dispose(),{signal:this.listeners.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.round&&!this.terminal){this.path=[];this.paintLocal();this.sendState(true);this.hiddenAt=performance.now();}else if(!document.hidden){if(this.hiddenAt&&performance.now()-this.hiddenAt>=8000&&this.round&&!this.terminal)this.failRound('画面を離れていたため、この勝負は勝敗なしになりました。');this.hiddenAt=0;}},{signal:this.listeners.signal});
  this.renderEntry();
  let seen=false;try{seen=localStorage.getItem(ONLINE_INTRO_KEY)==='1';}catch{}
  if(unlocked&&!seen)this.story();
 }
 later(fn,ms){const id=setTimeout(()=>{this.timers.delete(id);if(this.alive)fn();},ms);this.timers.add(id);return id;}
 cancelTimer(id){clearTimeout(id);this.timers.delete(id);}
 story(){if(this.pending||this.room||!this.unlocked)return;this.conversation(onlinePrologue,()=>{try{localStorage.setItem(ONLINE_INTRO_KEY,'1');}catch{}});}
 header(){return `<header class="online-header">${btn('‹ タイトルへ','exit','subtle')}<div><small>SKY LINK · FRIEND ROOM</small><h2>空の通信室</h2></div><span class="online-unranked">試験版 · フレンド対戦</span></header>`;}
 renderEntry(message=''){
  this.ui='entry';const resume=this.invite&&readSession(this.invite);
  this.root.innerHTML=`<section class="page online-page">${this.header()}<div class="online-entry parchment"><p class="eyebrow">BEYOND THE CLOUDS</p><h1>遠くの友だちと、<br>同じお題に挑もう。</h1><p>同じ石、同じお題で、よーいどん。<br>相手のつなぎ方も、となりの窓で見えるよ。</p>${!this.unlocked?`<div class="online-notice"><strong>冒険をすべてクリアすると開放</strong><p>3つの工房のどれかで、全30ステージをクリアしてね。招待された部屋にも、それから入れます。</p></div>`:`<div class="online-disclosure"><h2>つなぐ前に</h2><p>操作・盤面・進み具合・結果は相手に伝わります。相手と直接通信するため（P2P）、IPアドレスなどの接続情報が相手に伝わる可能性があります。経路の確認にGoogleのSTUNサーバーを利用し、Googleにも送信元IPなどが伝わります。</p><p>部屋・接続情報・準備状態・結果確認用の情報を、接続と勝敗の確認のためVercel／Neonで扱います。待機中は最長30分、終了後は原則2分で期限切れになり、期限後に新しい部屋を作るか、その部屋へアクセスした時に削除され、利用がない間は残る場合があります。名前・チャット・画像の送信はありません。招待リンクは信頼できる友だちだけに送ってね。</p><p>試験版のため接続は保証できません。携帯回線・会社のWi-Fiなどではつながらない場合があります。ランキング対象外で、手順は確認しますが、不正なプログラムを完全には防げません。<a href="/about#online-privacy" target="_blank" rel="noopener">保存期間とプライバシーの詳細</a></p></div><div class="online-entry-actions">${btn('同意して部屋をつくる','create','primary',this.pending)}<div class="online-join"><label for="online-invite">友だちの招待リンク</label><input id="online-invite" type="text" inputmode="url" autocomplete="off" spellcheck="false" maxlength="2048" placeholder="招待リンクを貼り付ける" value="${esc(this.invite?this.inviteURL(this.invite):'')}">${btn(resume?'同意して部屋を確認する':'同意して部屋に入る','join','',this.pending)}</div></div><p class="online-entry-note">開始後の再読み込みは再開できません。次の勝負は新しい部屋で遊びます。</p>${btn('通信室の物語をもう一度','story','subtle',this.pending)}`}<p class="online-status" role="status" aria-live="polite">${esc(message)}</p></div></section>`;
 }
 inviteURL(id=this.room?.id){const u=new URL(location.href);u.search='';u.hash='online='+id;return u.href;}
 notice(message){const el=this.root.querySelector('.online-status');if(el)el.textContent=message;}
 async action(a){
  if(a==='exit'){this.onExit();return;}
  if(a==='story'){this.story();return;}
  if(a==='copy'){try{await navigator.clipboard.writeText(this.inviteURL());if(this.alive)this.notice('招待リンクをコピーしました。友だちに送ってね。');}catch{this.root.querySelector('#online-room-link')?.select();this.notice('リンクを選択しました。コピーして友だちに送ってね。');}return;}
  if(a==='new'){if(this.pending)return;this.resetRoom(true);this.invite='';history.replaceState(null,'',location.pathname+location.search+'#online');this.renderEntry();return;}
  if(a==='retry'){if(this.pending)return;const id=this.room?.id;this.resetRoom(false);this.invite=id||this.invite;this.renderEntry('もう一度入れないときは、友だちと新しい部屋をつくってね。');return;}
  if(a==='create'||a==='join'){
   if(!this.unlocked||this.pending||this.room)return;
   const id=a==='join'?parseOnlineInvite(this.root.querySelector('#online-invite')?.value,location.origin):crypto.randomUUID();
   if(!id){this.notice('このゲームの招待リンクを貼り付けてね。');return;}
   if(typeof RTCPeerConnection==='undefined'){this.notice('このブラウザは対戦の直接通信に対応していません。新しいSafariやChromeで開いてね。');return;}
   this.pending=true;this.setButtonsBusy(true);this.notice('通信室につないでいます…');await this.connect(a,id);return;
  }
  if(a==='ready'){
   if(this.pending||this.channel?.readyState!=='open'||this.ui!=='lobby'||this.view?.ready?.[this.room.seat])return;
   const room=this.room;this.pending=true;this.renderLobby();let error='';try{await this.acceptView(await this.api('ready'));}catch(e){error=this.errorText(e);}finally{if(this.alive&&this.room===room){this.pending=false;if(this.ui==='lobby')this.renderLobby();if(error)this.notice(error);}}return;
  }
  if(a==='cancel'){if(this.canPlay()){this.path=[];this.paintLocal();this.sendState(true);}return;}
  if(a==='confirm'){this.commit();return;}
  if(a==='op:+'||a==='op:×'){if(this.canPlay()){this.op=a.slice(3);this.lastTap=null;this.paintLocal();this.sendState(true);this.play('select');}return;}
 }
 setButtonsBusy(busy){this.root.querySelectorAll('[data-online="create"],[data-online="join"],[data-online="story"]').forEach(el=>el.disabled=busy);}
 errorText(e){const errors={CAPACITY:'通信室が混み合っています。少し待ってから試してね。',FULL:'この部屋には、もう2人入っています。新しい部屋をつくってね。',MISSING:'部屋が見つかりません。新しい部屋をつくってね。',EXPIRED:'この部屋の待ち時間が過ぎました。新しい部屋をつくってね。',LIMIT:'操作が続いたため少し休憩中です。少し待ってから試してね。',AUTH:'この部屋の接続情報を確認できません。新しい部屋をつくってね。',VERSION:'ゲームを更新して、同じバージョンで入りなおしてね。',SIGNAL_CONFLICT:'この部屋の通信は再開できません。新しい部屋をつくってね。',UNAVAILABLE:'通信室はただいま準備中です。少し待ってから、もう一度試してね。',ROOM_FULL:'この部屋には、もう2人入っています。新しい部屋をつくってね。',NOT_FOUND:'部屋が見つかりません。リンクを確かめるか、新しい部屋をつくってね。',ROOM_EXPIRED:'この部屋の待ち時間が過ぎました。新しい部屋をつくってね。',RATE_LIMITED:'操作が続いたため少し休憩中です。少し待ってから試してね。',UNAUTHORIZED:'この部屋の接続情報を確認できません。新しい部屋をつくってね。',PROTOCOL_MISMATCH:'ゲームを更新して、同じバージョンで入りなおしてね。'};return errors[e.code]||'接続を確認できませんでした。少し待つか、新しい部屋で試してね。';}
 async api(action,body={},keepalive=false){
  if(!this.room)throw new Error('NO_ROOM');const room=this.room,controller=new AbortController();this.requests.add(controller);
  const timeout=setTimeout(()=>controller.abort(),12000),p0=performance.now(),w0=Date.now();
  try{const response=await fetch(`/api/online?action=${encodeURIComponent(action)}`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+room.token},body:JSON.stringify({roomId:room.id,...body}),signal:controller.signal,cache:'no-store',keepalive});
   const value=await response.json();if(!response.ok){const error=new Error(value.error||'UNAVAILABLE');error.code=value.error;throw error;}
   if(!this.alive||this.room!==room)throw new Error('STALE_ROOM');
   const rtt=performance.now()-p0;if(Number.isFinite(value.serverNow)&&rtt<this.bestRTT&&!this.round){const c=estimateClock(value.serverNow,w0,rtt);this.bestRTT=rtt;this.clockUncertainty=c.uncertainty;this.serverRef=value.serverNow+rtt/2;this.perfRef=performance.now();}
   return value;
  }finally{clearTimeout(timeout);this.requests.delete(controller);}
 }
 serverNow(){return this.serverRef+(performance.now()-this.perfRef);}
 async connect(action,id){
  const stored=readSession(id);this.room={id,token:stored?.token||randomToken(),seat:stored?.seat??null};const room=this.room;
  this.ui='connecting';this.renderConnecting();
  try{
   const view=await this.api(action,{...(action==='create'?{protocol:ONLINE_PROTOCOL}:{})});
   this.room.seat=view.seat;this.view=view;history.replaceState(null,'',location.pathname+location.search+'#online='+id);
   writeSession(id,{token:room.token,seat:view.seat,phase:view.phase});
   if(TERMINAL.has(view.phase)){this.showResult(view.result);return;}
   if(stored?.signaled||view.phase==='playing'||view.phase==='countdown'||view.reported?.[view.seat]||['playing','countdown','reporting'].includes(stored?.phase)){
    await this.api('leave').catch(()=>{});this.showResult({kind:'uncertain',reason:'reload'});this.notice('前の通信は再開できません。新しい部屋をつくって、招待リンクを送りなおしてね。');return;
   }
   this.createPeer();this.ui='lobby';this.renderLobby();this.armConnectionTimeout(view);
   if(view.seat===0){this.attachChannel(this.pc.createDataChannel('miracle-mine-live-v1',{ordered:false,maxRetransmits:0}));await this.pc.setLocalDescription(await this.pc.createOffer());await this.gatherICE();writeSession(this.room.id,{token:this.room.token,seat:this.room.seat,phase:'waiting',signaled:true});await this.acceptView(await this.api('signal',{description:{type:this.pc.localDescription.type,sdp:this.pc.localDescription.sdp}}));}
   else await this.acceptView(view);
   this.schedulePoll();

  }catch(e){if(this.alive&&this.room===room){this.stopPeer();this.cancelTimer(this.connectionTimer);this.connectionTimer=null;this.cancelTimer(this.pollTimer);this.ui='error';this.renderError(this.errorText(e));}}
  finally{if(this.alive&&this.room===room){this.pending=false;if(this.ui==='lobby')this.renderLobby();}}
 }
 renderConnecting(){this.root.innerHTML=`<section class="page online-page">${this.header()}<div class="online-entry parchment"><p class="eyebrow">CONNECTING</p><h1>結晶をつないでいます…</h1><p class="online-status" role="status">接続の準備には、少し時間がかかることがあります。</p></div></section>`;}
 createPeer(){
  const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});this.pc=pc;
  pc.ondatachannel=e=>{if(this.alive&&this.pc===pc&&!this.channel)this.attachChannel(e.channel);else e.channel.close();};
  pc.onconnectionstatechange=()=>{if(!this.alive||this.pc!==pc||this.terminal)return;if(['disconnected','failed','closed'].includes(pc.connectionState))this.markDisconnected();};
 }
 gatherICE(){
  const pc=this.pc;if(pc.iceGatheringState==='complete')return Promise.resolve();
  return new Promise((resolve,reject)=>{let settled=false;const end=error=>{if(settled)return;settled=true;pc.removeEventListener('icegatheringstatechange',changed);clearTimeout(timeout);this.iceCancel=null;error?reject(error):resolve();};const changed=()=>{if(pc.iceGatheringState==='complete')end();};const timeout=setTimeout(()=>end(new Error('ICE_TIMEOUT')),12000);this.iceCancel=()=>end(new Error('DISPOSED'));pc.addEventListener('icegatheringstatechange',changed);});
 }
 attachChannel(channel){
  this.channel=channel;channel.onopen=()=>{if(!this.alive||this.channel!==channel)return;this.lastPeerAt=performance.now();this.disconnectedAt=0;this.cancelTimer(this.connectionTimer);this.connectionTimer=null;if(this.ui==='lobby')this.renderLobby();this.heartbeat();};
  channel.onmessage=e=>this.receive(e.data);channel.onclose=channel.onerror=()=>{if(this.alive&&!this.terminal)this.markDisconnected();};
 }
 armConnectionTimeout(view){if(this.connectionTimer||this.channel?.readyState==='open'||!view.joined?.[1-this.room.seat])return;this.connectionTimer=this.later(()=>{this.connectionTimer=null;if(!this.terminal&&this.channel?.readyState!=='open')this.connectionFailed();},25000);}
 async acceptView(view){
  if(!this.alive||!this.room||this.terminal)return;this.view=view;
  if(TERMINAL.has(view.phase)){this.showResult(view.result||{kind:'cancelled'});return;}
  this.armConnectionTimeout(view);
  const room=this.room,pc=this.pc,current=()=>this.alive&&this.room===room&&this.pc===pc&&!this.terminal;
  if(view.peerDescription&&!this.remoteSet&&!this.signaling&&pc){
   this.signaling=true;
   try{
    await pc.setRemoteDescription(view.peerDescription);if(!current())return;this.remoteSet=true;
    if(room.seat===1){
     const answer=await pc.createAnswer();if(!current())return;
     await pc.setLocalDescription(answer);if(!current())return;
     await this.gatherICE();if(!current())return;
     writeSession(room.id,{token:room.token,seat:room.seat,phase:'waiting',signaled:true});
     const next=await this.api('signal',{description:{type:pc.localDescription.type,sdp:pc.localDescription.sdp}});if(!current())return;this.view=next;view=next;
    }
   }finally{if(this.room===room&&this.pc===pc)this.signaling=false;}
  }
  if(!current())return;
  if((view.phase==='countdown'||view.phase==='playing')&&!this.round){
   if(this.channel?.readyState!=='open'||!Number.isFinite(view.startAt)||!Number.isFinite(this.serverNow())){this.failRound('開始時の接続を確認できませんでした。');return;}
   if(this.serverNow()>view.startAt+1000){this.failRound('開始の合図に間に合いませんでした。新しい部屋で試してね。');return;}
   this.startRound(view);return;
  }
  if(this.ui==='lobby')this.renderLobby();
 }
 renderLobby(){
  const v=this.view||{},open=this.channel?.readyState==='open',ready=v.ready||[false,false],seat=this.room?.seat??0;
  this.root.innerHTML=`<section class="page online-page">${this.header()}<div class="online-entry online-lobby parchment"><p class="eyebrow">${seat===0?'YOUR ROOM':'FRIEND’S ROOM'}</p><h1>${open?'ふたりの結晶が、つながった！':'友だちと、空で待ち合わせ。'}</h1><label for="online-room-link">この部屋の招待リンク</label><div class="online-invite-copy"><input id="online-room-link" readonly value="${esc(this.inviteURL())}">${btn('コピー','copy')}</div><div class="online-ready-list"><span>きみ <b>${ready[seat]?'準備OK':'準備中'}</b></span><span>友だち <b>${ready[1-seat]?'準備OK':open?'つながりました':v.joined?.[1-seat]?'接続中…':'待っています…'}</b></span></div><p class="online-status" role="status">${open?'ふたりが「準備OK」を押すと、6秒の合図で始まるよ。':'接続を待っています。友だちも同じリンクから部屋に入ってね。'}</p>${btn(ready[seat]?'準備OK · 友だちを待っています':'準備OK！','ready','primary',!open||ready[seat]||this.pending)}<p class="muted">部屋は短時間で閉じます。相手が来ないときや接続できないときは、新しい部屋をつくってね。</p>${btn('部屋を出て、つくりなおす','new','subtle',this.pending)}</div></section>`;
 }
 schedulePoll(delay=this.ui==='reporting'?2000:2500){
  this.cancelTimer(this.pollTimer);if(!this.alive||!this.room||this.terminal||this.ui==='playing'||this.ui==='countdown')return;
  this.pollTimer=this.later(()=>void this.poll(),delay);
 }
 async poll(){
  if(!this.room||this.polling||this.terminal||['playing','countdown'].includes(this.ui))return;const room=this.room;this.polling=true;
  try{const view=await this.api('poll');await this.acceptView(view);if(this.ui==='reporting'&&!this.terminal){if(view.reported?.[this.room.seat])this.reportSent=true;else if(this.reportPayload)await this.submitReport();}}
  catch(e){if(this.room!==room||!this.alive)return;if(this.ui==='reporting')this.notice('結果を確認しています。通信が戻るまで少し待ってね。');else if(this.ui==='lobby')this.notice(this.errorText(e));}
  finally{if(this.room!==room)return;this.polling=false;if(this.alive&&!this.terminal){if(this.ui==='reporting'&&performance.now()>this.resultWaitUntil){this.failRound('結果を確認できなかったため、今回は勝敗なしです。');}else this.schedulePoll();}}
 }
 startRound(view){
  this.round=createRound(view.seed);if(this.round.target!==view.target){this.failRound('お題の一致を確認できませんでした。');return;}
  this.startMono=performance.now()+(view.startAt-this.serverNow());if(document.hidden)this.hiddenAt=performance.now();this.ui='countdown';this.frozen=false;this.moves=[];this.peer={board:[...this.round.board],path:[],op:'+',elapsed:0,moves:0,solved:false,finished:false};
  this.cancelTimer(this.pollTimer);writeSession(this.room.id,{token:this.room.token,seat:this.room.seat,phase:'countdown'});this.renderRound();this.tickRound();
 }
 boardHTML(local){return `<div class="online-board-wrap"><div class="online-board" id="online-${local?'local':'peer'}-board" role="group" aria-label="${local?'きみ':'相手'}の盤面">${Array.from({length:25},(_,i)=>local?`<button type="button" class="stone" data-online-index="${i}" aria-label="石"><span class="sr-only"></span></button>`:`<div class="stone" data-online-index="${i}"><span class="sr-only"></span></div>`).join('')}<svg class="online-trace" viewBox="0 0 500 500" aria-hidden="true"><polyline class="trace-shadow"/><polyline class="trace-line"/></svg></div></div>`;}
 renderRound(){
  this.root.innerHTML=`<section class="page online-page online-play-page online-waiting">${this.header()}<div class="online-mission parchment" data-online-round-content inert aria-hidden="true"><div><small>ふたりに同じお題</small><strong>${this.round.target}</strong><span>を先につくろう！</span></div><div class="online-time"><small>残り時間</small><b id="online-time">3:00</b></div><div class="online-connection" id="online-connection">● つながっています</div></div><div class="online-boards" data-online-round-content inert aria-hidden="true"><section class="online-player online-you"><div class="online-player-heading"><h3>きみの集め機</h3><span id="online-local-state">準備OK</span></div>${this.boardHTML(true)}<div class="online-equation parchment" id="online-local-equation" aria-live="polite">数字をなぞろう</div><div class="online-controls"><div class="online-operation">${btn('＋ 足す','op:+','active')}${btn('× 掛ける','op:×')}</div><div class="online-confirm">${btn('取り消す','cancel','subtle')}${btn('確定する ↵','confirm','primary')}</div></div></section><section class="online-player online-opponent"><div class="online-player-heading"><h3>友だちの集め機</h3><span id="online-peer-state">準備OK</span></div>${this.boardHTML(false)}<div class="online-equation parchment" id="online-peer-equation">友だちのつなぎ方が見えるよ</div><p class="online-peer-caption">同じお題、同じ石からスタート。<br>友だちの道と演算をリアルタイムで表示。</p></section></div><div class="online-round-bottom"><p class="online-status" role="status" aria-live="polite">足して準備、掛けて完成！</p><p>なぞって離すと確定。石をダブルタップすると ＋ / × 切り替え。<br>キーボード: 矢印で移動、Spaceでつなぐ、Enterで確定、Escで取り消し。</p></div><div class="online-countdown" role="status" aria-live="polite"><span>いっしょに、よーい…</span><b id="online-count">6</b>${btn('部屋を出る','exit','subtle')}</div></section>`;
  this.wireBoard();this.paintLocal();this.paintPeer();
 }
 paintBoard(local,state,path,op){
  if(!state)return;const b=this.root.querySelector(`#online-${local?'local':'peer'}-board`);if(!b)return;
  b.style.setProperty('--mode-color',modeColor(op));b.querySelectorAll('.stone').forEach((el,i)=>{el.style.cssText=tileStyle(state.board[i]);el.classList.toggle('selected',path.includes(i));el.firstElementChild.textContent=state.board[i];el.setAttribute('aria-label',`${state.board[i]}、${Math.floor(i/5)+1}行${i%5+1}列`);if(local)el.setAttribute('aria-pressed',String(path.includes(i)));});
  const points=path.map(i=>`${i%5*100+50},${Math.floor(i/5)*100+50}`).join(' ');b.querySelectorAll('polyline').forEach(el=>el.setAttribute('points',points));
  const equation=this.root.querySelector(`#online-${local?'local':'peer'}-equation`);equation.textContent=path.length?path.map(i=>state.board[i]).join(` ${op} `)+' = '+total(state.board,path,op).toLocaleString('ja-JP'):local?'数字をなぞろう':`${op==='+'?'＋ 足す':'× 掛ける'} を選択中`;
 }
 paintLocal(){
  this.paintBoard(true,this.round,this.path,this.op);this.root.querySelectorAll('[data-online^="op:"]').forEach(el=>{const active=el.dataset.online==='op:'+this.op;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});
  this.root.querySelectorAll('.online-controls button').forEach(el=>el.disabled=!this.canPlay());
 }
 paintPeer(){if(this.peer){this.paintBoard(false,this.peer,this.peer.path,this.peer.op);const state=this.root.querySelector('#online-peer-state');if(state)state.textContent=this.peer.solved?'お題、完成！':this.peer.finished?'結果を待っています':this.ui==='countdown'?'準備OK':'挑戦中';}}
 elapsed(){return Math.max(0,Math.min(MAX_ROUND_MS,Math.floor(performance.now()-this.startMono)));}
 canPlay(){return this.alive&&this.ui==='playing'&&!this.frozen&&!!this.round&&performance.now()>=this.startMono&&this.elapsed()<MAX_ROUND_MS&&!document.hidden;}
 tickRound(){
  if(!this.alive||this.terminal)return;const now=performance.now();
  if(this.ui==='countdown'){const remaining=Math.ceil((this.startMono-now)/1000),el=this.root.querySelector('#online-count');if(el&&el.textContent!==String(Math.max(1,remaining)))el.textContent=Math.max(1,remaining);if(now>=this.startMono){this.ui='playing';this.root.querySelector('.online-play-page')?.classList.remove('online-waiting');this.root.querySelectorAll('[data-online-round-content]').forEach(el=>{el.removeAttribute('inert');el.removeAttribute('aria-hidden');});this.root.querySelector('.online-countdown')?.remove();writeSession(this.room.id,{token:this.room.token,seat:this.room.seat,phase:'playing'});this.root.querySelector('#online-local-state').textContent='挑戦中';this.paintLocal();this.sendState(true);this.play('select');}}
  if(this.ui==='playing'){const s=Math.ceil((MAX_ROUND_MS-this.elapsed())/1000),t=this.root.querySelector('#online-time');if(t)t.textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;if(this.elapsed()>=MAX_ROUND_MS||(this.peerFinishDeadline&&now>=this.peerFinishDeadline))void this.finishLocal(false);}
  if(this.hiddenAt&&now-this.hiddenAt>=8000){this.failRound('画面を離れたため、今回は勝敗なしです。');return;}
  if(['countdown','playing','reporting'].includes(this.ui)&&this.lastPeerAt&&now-this.lastPeerAt>=8000){this.failRound('友だちとの通信が途切れたため、今回は勝敗なしです。');return;}
  if(!this.terminal&&['countdown','playing','reporting'].includes(this.ui))this.roundTimer=this.later(()=>this.tickRound(),100);
 }
 wireBoard(){
  this.boardListeners?.abort();this.boardListeners=new AbortController();
  const b=this.root.querySelector('#online-local-board');let pointer=null,gesture=null;
  const index=(e,drag=false)=>traceIndex([...b.querySelectorAll('.stone')].map(el=>el.getBoundingClientRect()),e.clientX,e.clientY,drag);
  const add=i=>{if(!this.canPlay()||i<0)return;const next=extend(this.path,i);if(next!==this.path){this.path=next;this.play('select');this.paintLocal();this.sendState();}};
  b.addEventListener('pointerdown',e=>{if(!this.canPlay()||pointer!==null||e.button!==0)return;const i=index(e);if(i<0)return;e.preventDefault();pointer=e.pointerId;b.setPointerCapture(pointer);gesture={index:i,x:e.clientX,y:e.clientY,time:performance.now(),type:e.pointerType,moved:false};this.path=[];add(i);},{signal:this.boardListeners.signal});
  b.addEventListener('pointermove',e=>{if(pointer!==e.pointerId)return;if(gesture&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>12)gesture.moved=true;add(index(e,true));},{signal:this.boardListeners.signal});
  b.addEventListener('pointerup',e=>{if(pointer!==e.pointerId)return;const down=gesture;pointer=null;gesture=null;if(!this.canPlay())return;add(index(e,true));const now=performance.now(),tap=down&&!down.moved&&now-down.time<=250&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<=12&&index(e)===down.index&&this.path.length===1?{index:down.index,x:e.clientX,y:e.clientY,time:now,type:e.pointerType}:null;if(tap&&isModeDoubleTap(this.lastTap,tap)){this.lastTap=null;this.path=[];this.op=this.op==='+'?'×':'+';this.paintLocal();this.sendState(true);}else{this.lastTap=tap;if(down?.moved&&this.path.length>=2)this.commit();}},{signal:this.boardListeners.signal});
  const cancel=()=>{pointer=null;gesture=null;this.path=[];this.lastTap=null;this.paintLocal();this.sendState(true);};
  b.addEventListener('pointercancel',cancel,{signal:this.boardListeners.signal});b.addEventListener('lostpointercapture',e=>{if(pointer===e.pointerId)cancel();},{signal:this.boardListeners.signal});
  b.addEventListener('keydown',e=>{const i=Number(e.target.dataset.onlineIndex);if(!Number.isInteger(i)||!this.canPlay())return;this.lastTap=null;const offsets={ArrowRight:1,ArrowLeft:-1,ArrowDown:5,ArrowUp:-5};if(e.key in offsets){e.preventDefault();const n=i+offsets[e.key];if(n>=0&&n<25&&(!['ArrowRight','ArrowLeft'].includes(e.key)||Math.floor(i/5)===Math.floor(n/5)))b.querySelector(`[data-online-index="${n}"]`).focus();}else if(e.key===' '){e.preventDefault();add(i);}else if(e.key==='Enter'){e.preventDefault();this.path.length>=2?this.commit():add(i);}else if(e.key==='Escape'){e.preventDefault();cancel();}},{signal:this.boardListeners.signal});
 }
 commit(){
  if(!this.canPlay()||this.moves.length>=300)return;const path=[...this.path],op=this.op,result=evaluate(this.round.board,path,op,this.round.target);if(result.kind==='cancel')return;
  // This applies before any send or await. Latency can never hold up local input.
  try{this.round=applyMove(this.round,{path,op});}catch{this.path=[];this.paintLocal();return;}
  this.moves.push({path,op,at:this.elapsed()});this.path=[];this.lastTap=null;this.paintLocal();this.play(result.kind==='success'?'clear':result.kind==='merge'?'merge':'discard');
  this.notice(result.kind==='success'?'お題、完成！ タイムを確かめています。':result.kind==='merge'?`「${result.value}」に合体したよ。`:'石を整理したよ。次はお題をつくろう。');
  if(this.round.solved||result.kind==='success'){void this.finishLocal(true);return;}
  this.sendState(true);if(this.moves.length>=300)void this.finishLocal(false);
 }
 sendState(force=false){
  if(!this.round||this.channel?.readyState!=='open'||this.terminal)return;
  const now=performance.now();if(!force&&now-this.lastSent<67){if(!this.sendTimer)this.sendTimer=this.later(()=>{this.sendTimer=null;this.sendState(true);},67-(now-this.lastSent));return;}
  if(this.channel.bufferedAmount>65536)return;this.lastSent=now;
  const value={protocol:ONLINE_PROTOCOL,type:'state',seq:++this.seq,board:this.round.board,path:this.path,op:this.op,elapsed:this.elapsed(),moves:this.moves.length,solved:!!this.round.solved,finished:this.frozen};
  const encoded=JSON.stringify(value);if(encoded.length>SNAPSHOT_LIMIT)return;try{this.channel.send(encoded);}catch{this.markDisconnected();}
 }
 receive(raw){
  if(!this.alive||this.terminal||typeof raw!=='string'||raw.length>SNAPSHOT_LIMIT||new TextEncoder().encode(raw).byteLength>SNAPSHOT_LIMIT)return;
  let message;try{message=JSON.parse(raw);}catch{return;}
  if(!validateSnapshot(message,this.peerSeq))return;
  this.peerSeq=message.seq;this.lastPeerAt=performance.now();this.disconnectedAt=0;
  const connection=this.root.querySelector('#online-connection');if(connection)connection.textContent='● つながっています';
  // Before both ready there is no board, so peers exchange a harmless ready heartbeat.
  if(!this.round)return;this.peer=message;this.paintPeer();
  if(message.finished&&message.solved&&!this.peerFinishDeadline&&!this.frozen){this.peerFinishDeadline=performance.now()+1500;this.notice('友だちのお題が完成！ 今の操作を確かめてから、結果を出すよ。');}
 }
 heartbeat(){
  if(!this.alive||this.terminal||this.channel?.readyState!=='open')return;
  if(this.round)this.sendState(true);
  else {const value={protocol:ONLINE_PROTOCOL,type:'state',seq:++this.seq,board:Array(25).fill(0),path:[],op:'+',elapsed:0,moves:0,solved:false,finished:false};try{this.channel.send(JSON.stringify(value));}catch{this.markDisconnected();}}
  if(this.ui==='lobby'&&this.lastPeerAt&&performance.now()-this.lastPeerAt>8000)this.connectionFailed();
  else this.heartbeatTimer=this.later(()=>this.heartbeat(),1000);
 }
 markDisconnected(){
  if(this.terminal)return;this.disconnectedAt ||= performance.now();const connection=this.root.querySelector('#online-connection');if(connection)connection.textContent='△ 通信を確認しています…';
  this.disconnectTimer ||= this.later(()=>{this.disconnectTimer=null;if(this.terminal)return;if(this.channel?.readyState!=='open'||performance.now()-this.lastPeerAt>=8000){if(this.round)this.failRound('通信が戻らなかったため、今回は勝敗なしです。');else this.connectionFailed();}},8000);
 }
 connectionFailed(){if(this.terminal)return;this.leaveBestEffort();this.ui='error';this.stopPeer();for(const id of this.timers)clearTimeout(id);this.timers.clear();this.connectionTimer=null;this.renderError('このネットワークでは直接つながりませんでした。Wi-Fiやブラウザを変えて、新しい部屋で試してね。中継サーバー（TURN）は利用していません。');}
 renderError(message){this.root.innerHTML=`<section class="page online-page">${this.header()}<div class="online-entry parchment"><h1>うまく、つながらなかったみたい。</h1><p class="online-status" role="alert">${esc(message)}</p><div class="online-result-actions">${btn('部屋を確認しなおす','retry')}${btn('新しい部屋へ','new','primary')}</div></div></section>`;}
 async finishLocal(solved){
  if(this.frozen||!this.round||this.terminal)return;this.frozen=true;this.path=[];this.ui='reporting';this.paintLocal();this.sendState(true);this.root.querySelector('#online-local-state').textContent=solved?'お題、完成！':'結果を待っています';
  const elapsed=solved?this.moves.at(-1).at:this.elapsed();this.reportPayload={moves:this.moves.map(m=>({...m,path:[...m.path]})),elapsed,solved,clockUncertainty:this.clockUncertainty};
  this.resultWaitUntil=performance.now()+45000;writeSession(this.room.id,{token:this.room.token,seat:this.room.seat,phase:'reporting'});this.notice('ふたりの手順とタイムを確認しています…');
  await this.submitReport();if(this.alive&&!this.terminal)this.schedulePoll(1500);
 }
 async submitReport(){
  if(this.submitting||this.reportSent||!this.reportPayload||this.terminal)return;this.submitting=true;
  try{const view=await this.api('report',this.reportPayload);this.reportSent=true;await this.acceptView(view);if(Number.isFinite(view.reportDeadline))this.resultWaitUntil=performance.now()+Math.max(2000,Math.min(45000,view.reportDeadline-this.serverNow()+3000));}
  catch{if(this.alive&&!this.terminal)this.notice('結果の送信を確認しています。少し待ってね。');}
  finally{this.submitting=false;}
 }
 failRound(message){
  if(this.terminal)return;this.leaveBestEffort();this.showResult({kind:'uncertain'});this.notice(message);
 }
 showResult(result){
  if(this.terminal)return;this.terminal=true;this.frozen=true;this.ui='finished';this.boardListeners?.abort();for(const id of this.timers)clearTimeout(id);this.timers.clear();this.stopPeer();
  if(this.room)writeSession(this.room.id,{token:this.room.token,seat:this.room.seat,phase:'finished'});
  const [title,detail]=resultCopy(result,this.room?.seat),won=result?.kind==='win'&&result.winner===this.room?.seat;
  this.root.innerHTML=`<section class="page online-page">${this.header()}<div class="online-entry online-result parchment"><p class="eyebrow">SKY LINK · RESULT</p>${won?'<img class="online-victory" src="/assets/luka-victory.webp" alt="よろこぶルカ" width="160" height="160">':''}<h1>${esc(title)}</h1><p>${esc(detail)}</p>${this.round?`<div class="online-result-target">今回のお題 <strong>${this.round.target}</strong></div>`:''}<p class="online-status" role="status">冒険の記録やランキングには入りません。</p><div class="online-result-actions">${btn('新しい部屋でもう一度','new','primary')}${btn('タイトルへ','exit','subtle')}</div><p class="muted">新しい招待リンクを友だちに送ってね。</p></div></section>`;
 }
 leaveBestEffort(){
  const room=this.room;if(!room||this.left)return;this.left=true;
  void fetch('/api/online?action=leave',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+room.token},body:JSON.stringify({roomId:room.id}),cache:'no-store',keepalive:true}).catch(()=>{});
 }
 stopPeer(){
  this.iceCancel?.();this.iceCancel=null;
  if(this.channel){this.channel.onopen=this.channel.onmessage=this.channel.onclose=this.channel.onerror=null;try{this.channel.close();}catch{}this.channel=null;}
  if(this.pc){this.pc.ondatachannel=this.pc.onconnectionstatechange=null;try{this.pc.close();}catch{}this.pc=null;}
 }
 resetRoom(leave){
  this.boardListeners?.abort();if(leave&&!this.terminal)this.leaveBestEffort();for(const id of this.timers)clearTimeout(id);this.timers.clear();for(const request of this.requests)request.abort();this.requests.clear();this.stopPeer();
  Object.assign(this,{room:null,view:null,round:null,peer:null,terminal:false,frozen:false,pending:false,left:false,remoteSet:false,signaling:false,polling:false,submitting:false,reportSent:false,reportPayload:null,peerFinishDeadline:0,lastPeerAt:0,peerSeq:-1,seq:0,lastSent:0,sendTimer:null,disconnectTimer:null,connectionTimer:null,hiddenAt:0,bestRTT:Infinity,clockUncertainty:1000,path:[],op:'+',moves:[]});
 }
 dispose(){
  if(!this.alive)return;if(!this.terminal)this.leaveBestEffort();this.alive=false;this.listeners.abort();this.boardListeners?.abort();for(const id of this.timers)clearTimeout(id);this.timers.clear();for(const request of this.requests)request.abort();this.requests.clear();this.stopPeer();
  // Closing a story through its own skip button releases its observer and typing timer.
  document.querySelector('.story-dialog .story-skip')?.click();
 }
}
