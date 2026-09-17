/* Weekly ranking post for X (@MiracleMine0123). No dependencies: OAuth 1.0a signing with node:crypto.
   Modes: check (verify credentials), test (one visible test post), dry-run (build text + image, post nothing), post (publish).
   See docs/X-AUTOPOST.md. Secrets come from the environment: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET. */
import {createHmac,randomBytes} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
import {createSnapshot,encodeShare,shareImageUrl} from '../src/share-model.js';
import {nameAllowed,HIDDEN_NAME} from '../src/name-filter.js';

export const SITE='https://miracle-mine.vercel.app';
const API='https://api.x.com/2';
const enc=s=>encodeURIComponent(s).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());

/* OAuth 1.0a HMAC-SHA1 (RFC 5849). `params` are the query/form parameters that take part in the signature. */
export function oauthHeader({method,url,params={},creds,nonce=randomBytes(16).toString('hex'),timestamp=Math.floor(Date.now()/1000)}){
 const oauth={oauth_consumer_key:creds.apiKey,oauth_nonce:nonce,oauth_signature_method:'HMAC-SHA1',oauth_timestamp:String(timestamp),oauth_token:creds.accessToken,oauth_version:'1.0'};
 const all={...params,...oauth};
 const base=[method.toUpperCase(),enc(url),enc(Object.keys(all).sort().map(k=>`${enc(k)}=${enc(all[k])}`).join('&'))].join('&');
 const key=`${enc(creds.apiSecret)}&${enc(creds.accessSecret)}`;
 const signature=createHmac('sha1',key).update(base).digest('base64');
 return 'OAuth '+Object.entries({...oauth,oauth_signature:signature}).sort().map(([k,v])=>`${enc(k)}="${enc(v)}"`).join(', ');
}
const ENV_NAMES={apiKey:'X_API_KEY',apiSecret:'X_API_SECRET',accessToken:'X_ACCESS_TOKEN',accessSecret:'X_ACCESS_TOKEN_SECRET'};
export const credsFromEnv=(env=process.env)=>{const c=Object.fromEntries(Object.entries(ENV_NAMES).map(([k,n])=>[k,(env[n]||'').trim()]));const missing=Object.entries(c).filter(([,v])=>!v).map(([k])=>ENV_NAMES[k]);if(missing.length)throw new Error('missing credentials: '+missing.join(', '));return c;};

async function xFetch(creds,method,url,{query={},json,form}={}){
 const target=new URL(url);for(const [k,v] of Object.entries(query))target.searchParams.set(k,v);
 const headers={Authorization:oauthHeader({method,url,params:form?{}:query,creds})};
 let body;if(json){headers['Content-Type']='application/json';body=JSON.stringify(json);}else if(form){body=form;}
 const res=await fetch(target,{method,headers,body});const text=await res.text();let data;try{data=JSON.parse(text)}catch{data=text}
 if(!res.ok)throw new Error(`${method} ${target.pathname} → ${res.status}: ${typeof data==='string'?data.slice(0,300):JSON.stringify(data).slice(0,300)}`);
 return data;
}

export const fmt=n=>Number(n).toLocaleString('ja-JP');
const medals=['🥇','🥈','🥉'];
/* Post text without a URL (cheaper per X's pay-per-use pricing); the profile carries the link. */
export function weeklyText(board,date){
 const top=board.entries.slice(0,3).map((e,i)=>`${medals[i]} ${nameAllowed(e.name)?e.name:HIDDEN_NAME}　${fmt(e.distance)} m`);
 return [`空の旅ランキング（${date} 時点）`,`シーズン「${board.season.name}」`,'',...top,'',`ランキングは完成した飛行機で挑戦できます。みんなの飛行機、どこまで飛んだ？`,'#ミラクルマイン'].join('\n');
}
export const weightOf=t=>{let w=0;for(const ch of t){const c=ch.codePointAt(0);w+=(c<0x1100||(c>=0x2000&&c<=0x200D)||(c>=0x2010&&c<=0x201F))?1:2;}return w;};
export const jstDate=(d=new Date())=>{const j=new Date(d.getTime()+9*3600e3);return `${j.getUTCMonth()+1}月${j.getUTCDate()}日`;};

/* The #1 plane's own rank card, drawn by the production share renderer. */
export function cardUrlFor(entry){
 const slot={cleared:Array.from({length:30},(_,i)=>i),paint:entry.design?.paint??0,wing:entry.design?.wing??0,propeller:entry.design?.propeller??0,decoration:entry.design?.decoration??0,flightName:nameAllowed(entry.name)?entry.name:'',sky:{total:entry.distance,best:entry.distance,flights:1,treasures:[]}};
 return shareImageUrl(createSnapshot('rank',slot,{rank:1,distance:entry.distance}));
}

export async function main(argv=process.argv.slice(2),env=process.env){
 const mode=(argv.find(a=>a.startsWith('--mode='))||'--mode=dry-run').slice(7);
 const sample=argv.includes('--sample'),force=argv.includes('--force'),outDir=(argv.find(a=>a.startsWith('--out='))||'--out=x-out').slice(6);
 const creds=credsFromEnv(env);
 const me=await xFetch(creds,'GET',`${API}/users/me`);
 console.log(`authenticated as @${me.data.username} (${me.data.id})`);
 if(mode==='check')return;
 if(mode==='test'){
  // One visible post to prove the whole path (media upload + create); delete it from X afterwards if unwanted.
  const text=`自動投稿のテストです（${jstDate()}）。空の旅ランキングを毎週お知らせする予定です。`;
  const r=await fetch(`${SITE}/api/ranking?action=board`,{cache:'no-store'});const board=r.ok?await r.json():{entries:[]};
  let mediaIds=[];
  if(board.entries?.length){const img=await fetch(cardUrlFor(board.entries[0]));if(img.ok){const png=Buffer.from(await img.arrayBuffer());const form=new FormData();form.append('media',new Blob([png],{type:'image/png'}),'card.png');form.append('media_category','tweet_image');form.append('media_type','image/png');const media=await xFetch(creds,'POST',`${API}/media/upload`,{form});const id=media.data?.id||media.media_id_string;if(id)mediaIds=[id];console.log('media uploaded:',id);}}
  const posted=await xFetch(creds,'POST',`${API}/tweets`,{json:{text,...(mediaIds.length?{media:{media_ids:mediaIds}}:{})}});
  console.log(`posted: https://x.com/${me.data.username}/status/${posted.data.id}`);return;
 }
 let board;
 if(sample)board={season:{id:2,name:'気まぐれな気流'},entries:[{name:'かいはつ工房 1号機',distance:7420,design:{paint:0,wing:1,propeller:2,decoration:0}},{name:'そらいろ号',distance:5210,design:{paint:2,wing:0,propeller:1,decoration:1}},{name:'ゆうしゃのひこうき',distance:3980,design:{paint:1,wing:2,propeller:0,decoration:2}}]};
 else{const r=await fetch(`${SITE}/api/ranking?action=board`,{cache:'no-store'});if(!r.ok)throw new Error(`ranking board → ${r.status}`);board=await r.json();}
 if(!board.entries?.length){console.log('ranking is empty: nothing to post');return;}
 const date=jstDate(),text=weeklyText(board,date),weight=weightOf(text);
 if(weight>280)throw new Error(`text too long: ${weight}/280`);
 const imageUrl=cardUrlFor(board.entries[0]);
 const img=await fetch(imageUrl);if(!img.ok)throw new Error(`card image → ${img.status}`);const png=Buffer.from(await img.arrayBuffer());
 await mkdir(outDir,{recursive:true});await writeFile(`${outDir}/post.txt`,text);await writeFile(`${outDir}/card.png`,png);
 console.log(`--- text (${weight}/280) ---\n${text}\n--- image ${png.length} bytes from ${imageUrl.slice(0,80)}… ---`);
 if(mode!=='post'){console.log('dry-run: nothing posted');return;}
 // Skip if a post carrying the same date already exists (a rerun of the same day).
 if(!force){const recent=await xFetch(creds,'GET',`${API}/users/${me.data.id}/tweets`,{query:{max_results:'5','tweet.fields':'text'}});if((recent.data||[]).some(t=>t.text.includes(`（${date} 時点）`))){console.log('already posted today: skipping');return;}}
 const form=new FormData();form.append('media',new Blob([png],{type:'image/png'}),'card.png');form.append('media_category','tweet_image');form.append('media_type','image/png');
 const media=await xFetch(creds,'POST',`${API}/media/upload`,{form});
 const mediaId=media.data?.id||media.media_id_string;if(!mediaId)throw new Error('media upload returned no id: '+JSON.stringify(media).slice(0,200));
 const posted=await xFetch(creds,'POST',`${API}/tweets`,{json:{text,media:{media_ids:[mediaId]}}});
 console.log(`posted: https://x.com/${me.data.username}/status/${posted.data.id}`);
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file://').href)main().catch(e=>{console.error(e.message);process.exit(1);});
