import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createSnapshot,encodeShare,decodeShare,shareUrl,shareImageUrl,shareCopy,xIntentUrl,kinds,MAX_CODE,normalizeSnapshot} from '../src/share-model.js';
import {handleShare,landingPage} from '../api/share.js';
import {renderShareCard,hueMatrix} from '../server/share-card.js';

const finished={cleared:Array.from({length:30},(_,i)=>i),paint:2,wing:1,propeller:2,decoration:1,failures:0,flightName:'そらいろ号',ranking:{key:'a'.repeat(64),uid:'123e4567-e89b-12d3-a456-426614174000'},sky:{total:36000,best:12345,flights:4,treasures:[0,1,2,3]},updated:1};

test('snapshots carry only public fields and survive a URL round trip',()=>{
 const s=createSnapshot('rank',finished,{rank:3,distance:12345});
 assert.deepEqual(Object.keys(s).sort(),['best','chapter','cleared','design','distance','kind','level','name','rank','stage','stars','tenths','total','treasures']);
 const code=encodeShare(s),json=Buffer.from(code.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8');
 assert.match(code,/^[A-Za-z0-9_-]+$/);assert.ok(code.length<MAX_CODE);
 assert.ok(!json.includes(finished.ranking.key)&&!json.includes(finished.ranking.uid)&&!json.includes('cleared'));
 assert.deepEqual(decodeShare(code),s);
 assert.equal(shareUrl(s),'https://miracle-mine.vercel.app/api/share?s='+code);
 assert.equal(shareImageUrl(s),shareUrl(s)+'&image=1');
});
test('a blocked or contact-like name never reaches a card, page or post',()=>{
 for(const name of ['ちんちん号','090-1234-5678']){const s=createSnapshot('workshop',{...finished,flightName:name});assert.equal(s.name,'');const decoded=decodeShare(encodeShare({...s,name}));assert.equal(decoded.name,'');const copy=shareCopy(decoded);for(const v of [copy.title,copy.headline,copy.text,copy.description])assert.ok(!v.includes(name),v);assert.ok(!landingPage(decoded,'x').includes(name));}
});
test('stage shares carry the star rating and time',()=>{
 const s=createSnapshot('stage',{...finished,cleared:[0,1,2]},{chapter:0,stage:2,stars:3,tenths:412});assert.equal(s.stars,3);assert.equal(s.tenths,412);assert.deepEqual(decodeShare(encodeShare(s)),s);
 const copy=shareCopy(s);assert.match(copy.text,/★★★ 41\.2秒/);assert.equal(copy.chips[0],'★★★ 41.2秒');
 assert.equal(createSnapshot('stage',finished,{chapter:0,stage:2,stars:0}).stars,null);assert.equal(createSnapshot('stage',finished,{chapter:0,stage:2,stars:7}).stars,null);
 assert.equal(shareCopy(createSnapshot('stage',finished,{chapter:0,stage:2})).chips.length,2);
});
test('every kind encodes and decodes',()=>{
 for(const kind of kinds){const s=createSnapshot(kind,finished,{chapter:1,stage:4,distance:8765,best:12345,total:36000,rank:12,treasures:[0,2]});assert.ok(s,kind);assert.deepEqual(decodeShare(encodeShare(s)),s,kind);const copy=shareCopy(s);assert.ok(copy.title&&copy.description&&copy.text&&copy.headline,kind);assert.ok(copy.text.length<=140,kind+' text length '+copy.text.length);}
});
test('invalid or tampered codes are rejected',()=>{
 for(const bad of ['','!!','e30','eyJ2IjoyfQ','a'.repeat(MAX_CODE+1),Buffer.from('{"v":1,"k":"hack"}').toString('base64url'),Buffer.from('{"v":1,"k":"rank"}').toString('base64url'),Buffer.from('{"v":1,"k":"stage","c":9,"s":0}').toString('base64url'),Buffer.from('[1]').toString('base64url'),Buffer.from('{"v":1,"k":"voyage","m":-1}').toString('base64url')])assert.equal(decodeShare(bad),null,bad.slice(0,20));
 assert.equal(normalizeSnapshot({kind:'rank',rank:0,distance:1}),null);
 const s=decodeShare(Buffer.from('{"v":1,"k":"slot","n":"'+'あ'.repeat(40)+'","d":[7,-1,"x",2],"a":9,"j":[0,0,9,1]}').toString('base64url'));
 assert.equal(s.name.length,20);assert.deepEqual(s.design,{paint:0,wing:0,propeller:0,decoration:2});assert.equal(s.level,0);assert.deepEqual(s.treasures,[0,1]);
});
test('copy is fixed at share time and the X intent carries text plus url',()=>{
 const s=createSnapshot('voyage',finished,{distance:8765,best:12345});
 const copy=shareCopy(s);assert.match(copy.text,/8,765 m/);assert.match(copy.description,/そらいろ号/);
 const intent=new URL(xIntentUrl(copy.text,shareUrl(s)));assert.equal(intent.origin+intent.pathname,'https://x.com/intent/post');assert.equal(intent.searchParams.get('text'),copy.text);assert.equal(intent.searchParams.get('url'),shareUrl(s));
});
test('share endpoint serves landing html, image and events, rejecting bad input',async()=>{
 const s=createSnapshot('chapter',{...finished,cleared:finished.cleared.slice(0,12)},{chapter:1}),code=encodeShare(s);
 const get=(query,method='GET',body)=>handleShare({method,headers:{}},new URL('https://miracle-mine.vercel.app/api/share'+query),{body});
 const page=get('?s='+code);assert.equal(page.status,200);assert.match(page.headers['Content-Type'],/text\/html/);
 assert.match(page.html,/<meta property="og:image" content="https:\/\/miracle-mine\.vercel\.app\/api\/share\?s=[A-Za-z0-9_-]+&amp;image=1">/);
 assert.match(page.html,/<meta name="twitter:card" content="summary_large_image">/);assert.match(page.html,/<img class="share-image" src="\/api\/share\?s=[A-Za-z0-9_-]+&amp;image=1"/);assert.match(page.html,/第2章「潮風の入り江」クリア！/);assert.match(page.html,/href="\/\?via=share&amp;kind=chapter"/);
 assert.ok(!page.html.includes(finished.ranking.uid));
 const image=get('?s='+code+'&image=1');assert.equal(image.status,200);assert.equal(image.headers['Content-Type'],'image/png');assert.deepEqual(image.image,s);
 assert.equal(get('?s=%21%21').status,400);assert.equal(get('?s='+Buffer.from('{"v":1,"k":"nope"}').toString('base64url')).status,400);
 assert.equal(get('').status,200);assert.match(get('').html,/share-default\.png/);
 assert.equal(get('?action=event','POST','{"event":"x","kind":"chapter","entry":"clear"}').status,204);
 assert.equal(get('?action=event','POST','{"event":"nope","kind":"chapter"}').status,400);
 assert.equal(get('?action=event','POST','{"event":"x","kind":"chapter"}'.padEnd(600,' ')).status,413);
 assert.equal(get('?s='+code,'POST','{}').status,405);assert.equal(get('?s='+code,'DELETE').status,405);
 assert.equal(handleShare({method:'POST',headers:{'sec-fetch-site':'cross-site'}},new URL('https://miracle-mine.vercel.app/api/share?action=event'),{body:{event:'x',kind:'chapter'}}).status,403);
 const escaped=landingPage(createSnapshot('slot',{...finished,flightName:'<b>"x"</b>'}),code);assert.ok(!escaped.includes('<b>"x"</b>')&&escaped.includes('&lt;b&gt;'));
});
test('hue matrix leaves white and grey untouched like CSS hue-rotate',()=>{
 for(const deg of [0,35,145]){const m=hueMatrix(deg);for(const row of m)assert.ok(Math.abs(row[0]+row[1]+row[2]-1)<1e-9);}
 assert.deepEqual(hueMatrix(0).map(r=>r.map(v=>Math.round(v*1000)/1000)),[[1,0,0],[0,1,0],[0,0,1]]);
});
test('cards render as 1200×630 PNG with bundled Japanese font',async()=>{
 for(const s of [createSnapshot('title'),createSnapshot('rank',finished,{rank:3,distance:12345}),createSnapshot('treasure',finished,{treasures:[0,1,2,3],total:36000}),createSnapshot('stage',{...finished,cleared:[0]},{chapter:0,stage:0})]){
  const png=await renderShareCard(s),meta=await sharp(png).metadata();
  assert.equal(meta.format,'png');assert.equal(meta.width,1200);assert.equal(meta.height,630);assert.ok(png.length>50000&&png.length<1500000,'size '+png.length);
 }
});

import {boardCardElement,BOARD_W,BOARD_H,BOARD_TOP,renderBoardCard} from '../server/share-card.js';

const shareGet = query => handleShare({method:'GET',headers:{}}, new URL('https://miracle-mine.vercel.app/api/share'+query));

test('board=1 asks for the live leaderboard card instead of decoding a snapshot',()=>{
 const plain = shareGet('?board=1');
 assert.deepEqual(plain.board, {season:''});
 assert.equal(plain.headers['Content-Type'], 'image/png');
 // Short cache: the leaderboard changes, unlike the immutable per-plane cards.
 assert.match(plain.headers['Cache-Control'], /max-age=300/);
 assert.deepEqual(shareGet('?board=1&season=2').board, {season:'2'});
 // Everything else keeps its existing behaviour.
 assert.equal(shareGet('?board=0').board, undefined);
 assert.equal(shareGet('').board, undefined);
});

const sampleBoard = count => ({season:{id:2,name:'気まぐれな気流'},entries:Array.from({length:count},(_,i)=>({
 rank:i+1, name:`ひこうき${i+1}`, distance:9000-i*700, design:{wing:i%3,paint:i%3,propeller:i%3,decoration:i%3}}))});

test('the leaderboard card lays out one column up to five planes and two beyond',async()=>{
 const one = await boardCardElement(sampleBoard(4),'9月19日');
 const two = await boardCardElement(sampleBoard(9),'9月19日');
 const lanes = el => el.props.children[2].props.children[1].props.children;
 assert.equal(lanes(one).length, 1);
 assert.equal(lanes(two).length, 2);
 assert.deepEqual(lanes(two).map(l=>l.props.children.length), [5,4]);
});

test('the leaderboard card stops at ten planes and masks a name that fails the screen',async()=>{
 const many = sampleBoard(14);
 many.entries[1].name = 'ちんちん号';
 const el = await boardCardElement(many,'9月19日');
 const lanes = el.props.children[2].props.children[1].props.children;
 const rows = lanes.flatMap(l=>l.props.children);
 assert.equal(rows.length, BOARD_TOP);
 const names = rows.map(r=>r.props.children[2].props.children);
 assert.ok(!names.some(n=>String(n).includes('ちんちん')));
 assert.ok(names.includes('なまえのない飛行機'));
});

test('an empty board still renders a landscape card',async()=>{
 const png = await renderBoardCard({season:{name:'気まぐれな気流'},entries:[]},'9月19日');
 const meta = await sharp(png).metadata();
 assert.equal(meta.width, BOARD_W);
 assert.equal(meta.height, BOARD_H);
 assert.equal(BOARD_W/BOARD_H, 16/9);
});
