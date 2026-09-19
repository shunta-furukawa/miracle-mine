import {decodeShare,shareCopy,shareUrl,shareImageUrl,kinds,shareEvents,normalizeSnapshot,SITE} from '../src/share-model.js';
import {renderShareCard,renderBoardCard} from '../server/share-card.js';

/* Public share cards. The URL carries only the public snapshot (see docs/SHARING.md); nothing is stored. */
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function landingPage(snapshot,code){
 const copy=shareCopy(snapshot),page=code?shareUrl(snapshot):SITE+'/',image=code?shareImageUrl(snapshot):SITE+'/assets/share-default.png',preview=code?shareImageUrl(snapshot,''):'/assets/share-default.png';
 const mine=snapshot.kind!=='title';
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#143f43"><meta name="robots" content="noindex"><title>${esc(copy.title)}</title><meta name="description" content="${esc(copy.description)}"><link rel="canonical" href="${esc(page)}"><meta property="og:type" content="website"><meta property="og:site_name" content="Miracle Mine | ミラクルマイン"><meta property="og:locale" content="ja_JP"><meta property="og:url" content="${esc(page)}"><meta property="og:title" content="${esc(copy.title)}"><meta property="og:description" content="${esc(copy.description)}"><meta property="og:image" content="${esc(image)}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(copy.headline)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:site" content="@MiracleMine0123"><meta name="twitter:title" content="${esc(copy.title)}"><meta name="twitter:description" content="${esc(copy.description)}"><meta name="twitter:image" content="${esc(image)}"><meta name="twitter:image:alt" content="${esc(copy.headline)}"><link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png"><link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png"><link rel="stylesheet" href="/share-landing.css"><script type="module" src="/share-landing.js"></script></head><body data-kind="${esc(snapshot.kind)}"><main class="share-landing"><section class="share-card parchment"><p class="eyebrow">${mine?'SHARED FROM MIRACLE MINE':'MIRACLE MINE'}</p><h1>${esc(copy.headline)}</h1><p class="share-caption">${esc(copy.caption)}</p><figure class="share-figure"><img class="share-image" src="${esc(preview)}" width="1200" height="630" alt="${esc(copy.headline)}" data-fallback="/assets/share-default.png"></figure>${mine?'<p class="muted share-note">このカードは共有した時点の記録です。ランキングや飛行機の今の状態は、ゲームの中で確認できます。</p>':''}<div class="share-actions"><a class="share-button primary" href="/?via=share&amp;kind=${esc(snapshot.kind)}">自分の飛行機をつくる</a><a class="share-button" href="/?via=share&amp;kind=${esc(snapshot.kind)}">無料で遊ぶ</a></div></section><section class="share-intro parchment"><p class="eyebrow">ABOUT THE GAME</p><h2>Miracle Mine ｜ ミラクルマイン</h2><p>数字をつないで、お題の数をつくる冒険パズル。森・海・洞窟・火山・高原の素材をあつめて、自分だけの蒸気飛行機を組み立てよう。</p><ul><li>となりあう数字を、なぞってつなぐだけ。足し算からはじまり、火山の章で掛け算が解放。</li><li>全30ステージ・5章。章をクリアすると飛行機の部品が手に入る。</li><li>完成した飛行機で隠し第6章「トトじいと空の旅」へ。飛距離ランキングと秘宝あつめ。</li><li>無料・登録不要。スマホ・タブレット・PCのブラウザで遊べて、ホーム画面にも追加できる。</li></ul><p class="muted">冒険の記録はあそぶ端末のブラウザに保存されます。このページから始めても、ほかの人の記録が上書きされることはありません。</p></section><footer class="share-footer"><a href="/">miracle-mine.vercel.app</a><span>数字がつながる、せかいがひろがる。</span></footer></main></body></html>`;
}
export function handleShare(req,url,{body}={}){
 const action=url.searchParams.get('action');
 if(req.method==='POST'){
  if(action!=='event')return {status:405,headers:{'Cache-Control':'no-store'},json:{error:'METHOD'}};
  if(req.headers['sec-fetch-site']==='cross-site')return {status:403,headers:{'Cache-Control':'no-store'},json:{error:'ORIGIN'}};
  let data=body;if(typeof data==='string'){if(data.length>512)return {status:413,headers:{'Cache-Control':'no-store'},json:{error:'SIZE'}};try{data=JSON.parse(data)}catch{return {status:400,headers:{'Cache-Control':'no-store'},json:{error:'INPUT'}}}}
  if(!data||typeof data!=='object'||!shareEvents.includes(data.event)||!kinds.includes(data.kind))return {status:400,headers:{'Cache-Control':'no-store'},json:{error:'INPUT'}};
  const entry=typeof data.entry==='string'&&/^[a-z-]{1,24}$/.test(data.entry)?data.entry:'';
  // Only the event name and the share kind are recorded: no names, UIDs or keys.
  console.log(JSON.stringify({type:'share-event',event:data.event,kind:data.kind,entry}));
  return {status:204,headers:{'Cache-Control':'no-store'}};
 }
 if(req.method!=='GET'&&req.method!=='HEAD')return {status:405,headers:{'Cache-Control':'no-store'},json:{error:'METHOD'}};
 // The weekly leaderboard image. The data is fetched live by the handler, so the card cannot be forged from the URL.
 if(url.searchParams.get('board')==='1')return {status:200,headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=300, s-maxage=900'},board:{season:url.searchParams.get('season')||''}};
 const code=url.searchParams.get('s');
 const snapshot=code?decodeShare(code):normalizeSnapshot({kind:'title'});
 if(!snapshot)return {status:400,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'},text:'この共有リンクは読み取れませんでした。'};
 if(url.searchParams.get('image')==='1')return {status:200,headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=86400, s-maxage=31536000, immutable'},image:snapshot};
 return {status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=300, s-maxage=86400'},html:landingPage(snapshot,code)};
}
export default async function handler(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');
 try{
  const url=new URL(req.url,SITE),result=handleShare(req,url,{body:req.body});
  for(const [k,v] of Object.entries(result.headers))res.setHeader(k,v);
  if(result.json)return res.status(result.status).json(result.json);
  if(result.text)return res.status(result.status).send(result.text);
  if(result.html)return res.status(result.status).send(result.html);
  if(result.board){
   const q=result.board.season?`&season=${encodeURIComponent(result.board.season)}`:'';
   const r=await fetch(`${SITE}/api/ranking?action=board${q}`,{cache:'no-store'});
   if(!r.ok)throw new Error(`ranking board → ${r.status}`);
   const jst=new Date(Date.now()+9*3600e3);
   return res.status(result.status).send(await renderBoardCard(await r.json(),`${jst.getUTCFullYear()}年${jst.getUTCMonth()+1}月${jst.getUTCDate()}日`));
  }
  if(result.image)return res.status(result.status).send(await renderShareCard(result.image));
  return res.status(result.status).end();
 }catch(e){
  console.error('share-error',e?.message||e);
  res.setHeader('Cache-Control','no-store');return res.status(503).json({error:'UNAVAILABLE'});
 }
}
