import {normalizeSnapshot,shareUrl,shareImageUrl,shareCopy,xIntentUrl,SITE} from './share-model.js';

/* Shared card dialog. It sits on top of whatever screen or modal opened it, so closing it
   returns the player exactly where they were. Nothing here writes to the save. */
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let active=null;
export function reportShareEvent(event,kind,entry='',request=null){
 try{
  const payload=JSON.stringify({event,kind,entry});
  if(request)return void request('/api/share?action=event',{method:'POST',headers:{'Content-Type':'application/json'},body:payload,keepalive:true}).catch(()=>{});
  if(navigator.sendBeacon?.('/api/share?action=event',new Blob([payload],{type:'application/json'})))return;
  fetch('/api/share?action=event',{method:'POST',headers:{'Content-Type':'application/json'},body:payload,keepalive:true}).catch(()=>{});
 }catch{}
}
export function openShareDialog(value,{entry='',origin=SITE,onClose,share=navigator.share?.bind(navigator),canShare=navigator.canShare?.bind(navigator),request=(...a)=>fetch(...a)}={}){
 const snapshot=normalizeSnapshot(value);if(!snapshot)return null;
 active?.();
 const copy=shareCopy(snapshot),url=shareUrl(snapshot,origin),imageUrl=shareImageUrl(snapshot,origin),intent=xIntentUrl(copy.text,url);
 const previousFocus=document.activeElement,root=document.createElement('dialog');
 root.className='share-dialog';root.setAttribute('aria-label','共有');root.dataset.kind=snapshot.kind;
 root.innerHTML=`<div class="share-inner"><p class="eyebrow">SHARE</p><h2>${esc(copy.headline)}</h2><figure class="share-preview"><img alt="共有カードのプレビュー：${esc(copy.headline)}" width="1200" height="630" decoding="async"><figcaption class="share-status" role="status" aria-live="polite">カードを描いています…</figcaption></figure><p class="share-text">${esc(copy.text)}</p><div class="share-buttons"><a class="share-x primary" href="${esc(intent)}" target="_blank" rel="noopener noreferrer" data-share="x">Xに投稿する</a><button type="button" class="share-save" data-share="save" disabled>画像を保存</button><button type="button" class="share-copy" data-share="copy">リンクをコピー</button>${share?'<button type="button" class="share-native" data-share="native">ほかのアプリで共有</button>':''}</div><label class="share-link"><span>共有リンク</span><input readonly value="${esc(url)}" aria-label="共有リンク"></label><p class="muted">カードには飛行機の名前・デザイン・記録だけが入ります。投稿はXの画面で確認してから送信できます。</p><div class="share-footer"><button type="button" class="share-close subtle" data-share="close">閉じる</button></div></div>`;
 const status=root.querySelector('.share-status'),img=root.querySelector('img'),saveButton=root.querySelector('.share-save'),input=root.querySelector('input');
 let blob=null,objectUrl=null,closed=false;
 const say=text=>{status.textContent=text;};
 const file=()=>blob?new File([blob],'miracle-mine-share.png',{type:'image/png'}):null;
 request(imageUrl,{cache:'force-cache'}).then(async response=>{if(!response.ok)throw new Error('IMAGE');const data=await response.blob();if(closed||!data.size||!/^image\/png/.test(data.type))throw new Error('IMAGE');blob=data;objectUrl=URL.createObjectURL(blob);img.src=objectUrl;img.classList.add('ready');saveButton.disabled=false;say('この画像が、Xの投稿とリンクの先に表示されます。');})
  .catch(()=>{if(closed)return;img.remove();root.querySelector('.share-preview').classList.add('unavailable');say('カード画像を用意できませんでした。リンクの共有はそのまま使えます。');saveButton.hidden=true;});
 function close(){if(closed)return;closed=true;active=null;root.close();root.remove();if(objectUrl)URL.revokeObjectURL(objectUrl);if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});onClose?.();}
 async function copyLink(){
  try{await navigator.clipboard.writeText(url);say('リンクをコピーしました。');}
  catch{input.focus();input.select();let ok=false;try{ok=document.execCommand('copy');}catch{}say(ok?'リンクをコピーしました。':'コピーできませんでした。上のリンクを長押しして選んでね。');}
 }
 async function nativeShare(){
  const data={title:copy.title,text:copy.text,url};
  const f=file();
  try{if(f&&canShare?.({files:[f]}))await share({...data,files:[f]});else await share(data);say('共有しました。');}
  catch(e){if(e?.name!=='AbortError')say('この端末では共有メニューを開けませんでした。リンクをコピーして使ってね。');}
 }
 function saveImage(){
  if(!objectUrl)return;const a=document.createElement('a');a.href=objectUrl;a.download='miracle-mine-share.png';a.rel='noopener';document.body.append(a);a.click();a.remove();say('画像を保存しました。保存されない端末では、開いた画像を長押しして保存してね。');
 }
 root.addEventListener('click',event=>{
  const target=event.target.closest('[data-share]');if(!target)return;const kind=target.dataset.share;
  if(kind==='close'){close();return;}
  reportShareEvent(kind,snapshot.kind,entry,request);
  if(kind==='copy')void copyLink();else if(kind==='save')saveImage();else if(kind==='native')void nativeShare();
 });
 root.addEventListener('cancel',event=>{event.preventDefault();close();});
 root.addEventListener('click',event=>{if(event.target===root)close();});
 document.body.append(root);root.showModal();active=close;root.querySelector('.share-x').focus();
 reportShareEvent('open',snapshot.kind,entry,request);
 return {close,root,url,imageUrl};
}
