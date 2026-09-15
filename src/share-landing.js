/* Share landing page: swap in the default card when the dynamic image fails and count the visit. */
const kind=document.body.dataset.kind||'title';
const image=document.querySelector('.share-image');
image?.addEventListener('error',()=>{if(image.dataset.fallback&&!image.src.endsWith(image.dataset.fallback)){image.src=image.dataset.fallback;}},{once:true});
try{
 const payload=JSON.stringify({event:'visit',kind});
 if(!navigator.sendBeacon||!navigator.sendBeacon('/api/share?action=event',new Blob([payload],{type:'application/json'})))fetch('/api/share?action=event',{method:'POST',headers:{'Content-Type':'application/json'},body:payload,keepalive:true}).catch(()=>{});
}catch{}
