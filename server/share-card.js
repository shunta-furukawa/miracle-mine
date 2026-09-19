import {readFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {ImageResponse} from '@vercel/og';
import {normalizeSnapshot,shareCopy,planeName,fmt} from '../src/share-model.js';
import {assemblyNames} from '../src/airplane.js';
import {treasures} from '../src/sky-voyage.js';
import {nameAllowed,HIDDEN_NAME} from '../src/name-filter.js';

/* 1200×630 share cards drawn from the game's own sprite sheets. The bundled Noto Sans JP Bold
   (SIL OFL, see server/assets/OFL.txt) avoids any font download at request time. */
export const WIDTH=1200,HEIGHT=630;
const here=fileURLToPath(new URL('.',import.meta.url));
const candidates={
 assets:[resolve(process.cwd(),'dist/assets'),resolve(here,'../dist/assets'),resolve(process.cwd(),'src/assets'),resolve(here,'../src/assets')],
 fonts:[resolve(process.cwd(),'server/assets'),resolve(here,'assets')]
};
const located={};
async function locate(kind,file){
 if(!located[kind]){located[kind]=(async()=>{for(const dir of candidates[kind]){try{await access(resolve(dir,file));return dir;}catch{}}throw new Error(`SHARE_ASSETS_MISSING:${kind}`);})();}
 return resolve(await located[kind],file);
}
const cache=new Map();
const memo=(key,make)=>{if(!cache.has(key))cache.set(key,make().catch(e=>{cache.delete(key);throw e;}));return cache.get(key);};
const asset=name=>memo('asset:'+name,async()=>readFile(await locate('assets',name)));
export const fontData=()=>memo('font',async()=>readFile(await locate('fonts','NotoSansJP-Bold.woff')));
const dataUri=(buffer,type='image/png')=>`data:${type};base64,${buffer.toString('base64')}`;

/* Same matrix as the CSS hue-rotate() filter used by .airframe-sheet. */
export function hueMatrix(deg){
 const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return [[0.213+c*0.787-s*0.213,0.715-c*0.715-s*0.715,0.072-c*0.072+s*0.928],[0.213-c*0.213+s*0.143,0.715+c*0.285+s*0.140,0.072-c*0.072-s*0.283],[0.213-c*0.213-s*0.787,0.715-c*0.715+s*0.715,0.072+c*0.928+s*0.072]];
}
export const paintHue=[0,145,35];
const airframes=['straight','round','biplane'];
const PLANE_W=724,PLANE_H=362,CELL=512;

/* Mirrors planeArt(): sprite cell, edge clipping, hue rotation and multiplied accessories. */
export const planeImage=(level,design,background='#fff8e9')=>memo(`plane:${level}:${design.paint}:${design.wing}:${design.propeller}:${design.decoration}:${background}`,async()=>{
 level=Math.max(0,Math.min(5,level));
 const sheet=sharp(await asset(`airframe-${airframes[design.wing]}.webp`)).extract({left:level%2*PLANE_W+Math.round(PLANE_W*.01),top:Math.floor(level/2)*PLANE_H,width:PLANE_W-2*Math.round(PLANE_W*.01),height:PLANE_H-Math.round(PLANE_H*.08)});
 const body=await (design.paint?sheet.recomb(hueMatrix(paintHue[design.paint])):sheet).png().toBuffer();
 const layers=[{input:body,left:Math.round(PLANE_W*.01),top:0,blend:'multiply'}];
 if(level>=4){
  const size=Math.round(PLANE_W*.36),inset=Math.round(CELL*.03),insetX=Math.round(CELL*.02);
  const prop=await sharp(await asset('airframe-accessories.webp')).extract({left:design.propeller*CELL+insetX,top:inset,width:CELL-2*insetX,height:CELL-2*inset}).resize({width:size-2*Math.round(size*.02),height:size-2*Math.round(size*.03),fit:'fill'}).png().toBuffer();
  layers.push({input:prop,left:Math.round(PLANE_W*.235-size/2)+Math.round(size*.02),top:Math.round(PLANE_H*.43-size/2)+Math.round(size*.03),blend:'multiply'});
 }
 if(level>=2){
  const size=Math.round(PLANE_W*.13);
  const badge=await sharp(await asset('airframe-accessories.webp')).extract({left:design.decoration*CELL,top:CELL,width:CELL,height:CELL}).resize(size,size).png().toBuffer();
  const mask=Buffer.from(`<svg width="${size}" height="${size}"><ellipse cx="${size/2}" cy="${size*.44}" rx="${size*.36}" ry="${size*.36}" fill="#fff"/></svg>`);
  const clipped=await sharp(badge).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
  layers.push({input:clipped,left:Math.round(PLANE_W*.66-size/2),top:Math.round(PLANE_H*.45-size/2),blend:'multiply'});
 }
 return sharp({create:{width:PLANE_W,height:PLANE_H,channels:3,background}}).composite(layers).png().toBuffer();
});
const scenery=(name,w=WIDTH,h=HEIGHT)=>memo(`scene:${name}:${w}x${h}`,async()=>dataUri(await sharp(await asset(name)).resize(w,h,{fit:'cover'}).jpeg({quality:72}).toBuffer(),'image/jpeg'));
/* Character-free scenery cells (workshop, forest, harbor, cavern, forge, sky) so the card panel never covers the cast. */
const worldScene=cell=>memo('world:'+cell,async()=>dataUri(await sharp(await asset('dialogue-worlds.webp')).extract({left:cell%3*724,top:Math.floor(cell/3)*362,width:724,height:362}).resize(WIDTH,HEIGHT,{fit:'cover'}).jpeg({quality:78}).toBuffer(),'image/jpeg'));
const logo=()=>memo('logo',async()=>dataUri(await sharp(await asset('title-logo.webp')).resize({width:540}).png().toBuffer()));
const treasureImage=i=>memo('treasure:'+i,async()=>dataUri(await sharp(await asset('sky-treasures.webp')).extract({left:i%3*256,top:Math.floor(i/3)*256,width:256,height:256}).resize(150,150).png().toBuffer()));

const h=(type,style,children)=>({type,props:{style,children}});
const text=(value,style)=>h('div',{display:'flex',...style},value);
export async function shareCardElement(value){
 const s=normalizeSnapshot(value)||normalizeSnapshot({kind:'title'}),copy=shareCopy(s);
 // The title card keeps Luka, Toto and Mos visible on the right; every other card uses an empty scenery cell.
 const scene=s.kind==='title'?await scenery('workshop.webp'):copy.scene==='sky'?await scenery('sky-world.webp'):await worldScene(copy.scene==='chapter'?s.chapter+1:0);
 const ink='#fff8e6',gold='#f6d27a',panel='#fff8e9';
 const headlineSize=copy.headline.length>22?36:copy.headline.length>13?44:Math.min(62,Math.floor(620/copy.headline.length));
 const chips=copy.chips.map(label=>text(label,{padding:'8px 18px',borderRadius:999,background:'rgba(255,248,230,0.16)',border:'2px solid rgba(246,210,122,0.7)',color:ink,fontSize:24,marginRight:12}));
 let visual;
 if(s.kind==='title'){
  visual=h('div',{display:'flex',width:10},undefined);
 }else if(s.kind==='treasure'){
  const cells=treasures.map((t,i)=>h('div',{display:'flex',flexDirection:'column',alignItems:'center',width:130,margin:'6px 4px',opacity:s.treasures.includes(i)?1:0.28},[
   {type:'img',props:{src:'',width:96,height:96,style:{filter:s.treasures.includes(i)?'none':'grayscale(1)'}}},
   text(s.treasures.includes(i)?t.name:'？？？',{fontSize:18,color:'#3b2a12',marginTop:4})]));
  for(let i=0;i<cells.length;i++)cells[i].props.children[0].props.src=await treasureImage(i);
  visual=h('div',{display:'flex',flexWrap:'wrap',justifyContent:'center',width:440,padding:'14px 8px',borderRadius:24,background:panel,border:'6px solid #d9b56d'},cells);
 }else{
  const plane=dataUri(await planeImage(s.level,s.design,panel));
  visual=h('div',{display:'flex',flexDirection:'column',alignItems:'center',width:470,padding:'18px 12px 14px',borderRadius:24,background:panel,border:'6px solid #d9b56d',boxShadow:'0 18px 40px rgba(0,0,0,0.35)'},[
   {type:'img',props:{src:plane,width:446,height:223}},
   text(s.kind==='rank'?`${fmt(s.rank)} 位 ・ ${planeName(s)}`:s.kind==='stage'||s.kind==='chapter'?assemblyNames[s.level]:planeName(s),{fontSize:24,lineHeight:1.4,color:'#3b2a12',marginTop:6,maxWidth:440,justifyContent:'center',textAlign:'center'})]);
 }
 return h('div',{display:'flex',width:WIDTH,height:HEIGHT,position:'relative',fontFamily:'Noto Sans JP',color:ink},[
  {type:'img',props:{src:scene,width:WIDTH,height:HEIGHT,style:{position:'absolute',top:0,left:0,objectFit:'cover'}}},
  h('div',{position:'absolute',top:0,left:0,width:WIDTH,height:HEIGHT,background:s.kind==='title'?'linear-gradient(90deg, rgba(10,38,44,0.94) 0%, rgba(10,38,44,0.88) 42%, rgba(10,38,44,0.30) 58%, rgba(10,38,44,0.05) 75%, rgba(10,38,44,0) 100%)':'linear-gradient(100deg, rgba(10,38,44,0.93) 0%, rgba(10,38,44,0.80) 52%, rgba(10,38,44,0.35) 100%)'},undefined),
  h('div',{display:'flex',position:'absolute',top:0,left:0,width:WIDTH,height:HEIGHT,padding:'54px 60px',alignItems:'center',justifyContent:'space-between'},[
   h('div',{display:'flex',flexDirection:'column',width:s.kind==='title'?600:640,paddingRight:20},[
    s.kind==='title'?{type:'img',props:{src:await logo(),width:540,height:360,style:{marginLeft:-30,marginTop:-40,marginBottom:-30,filter:'drop-shadow(0 10px 20px rgba(0,0,0,0.5))'}}}:text(copy.eyebrow,{fontSize:24,letterSpacing:6,color:gold}),
    text(copy.headline,{fontSize:s.kind==='title'?40:headlineSize,lineHeight:1.3,marginTop:18,textShadow:'0 4px 14px rgba(0,0,0,0.45)',...(copy.headline.length>13?{lineClamp:2}:{whiteSpace:'nowrap'})}),
    text(copy.caption,{fontSize:26,lineHeight:1.55,marginTop:22,color:'#ffeec9',maxWidth:600}),
    chips.length?h('div',{display:'flex',flexWrap:'wrap',marginTop:26},chips):h('div',{display:'flex'},undefined),
    text('miracle-mine.vercel.app ・ 無料で遊べる数字パズル',{fontSize:22,marginTop:34,color:gold})
   ]),
   visual
  ])
 ]);
}
export async function renderShareCard(value){
 const element=await shareCardElement(value);
 const response=new ImageResponse(element,{width:WIDTH,height:HEIGHT,fonts:[{name:'Noto Sans JP',data:await fontData(),weight:700,style:'normal'}]});
 // resvg writes an uncompressed PNG; re-encode so OGP crawlers fetch a few hundred kilobytes.
 return sharp(Buffer.from(await response.arrayBuffer())).png({compressionLevel:9,adaptiveFiltering:true,palette:true,colours:256,dither:0.8}).toBuffer();
}

/* Weekly leaderboard card: a landscape image of the top ten for the X post.
   Ranking planes are always fully assembled, so every row draws the level 5 airframe. */
export const BOARD_W=1600,BOARD_H=900,BOARD_TOP=10;
const ROW_PLANE_W=150,ROW_PLANE_H=75;
export async function boardCardElement(board,date=''){
 const ink='#fff8e6',gold='#f6d27a',panel='#fff8e9';
 const entries=(board?.entries||[]).slice(0,BOARD_TOP);
 const columns=entries.length>5?2:1,perColumn=Math.ceil(entries.length/columns)||1;
 // Plain numerals keep every row the same weight; the top three are told apart by colour, not by an emoji of another size.
 const rankInk=['#f6d27a','#e4e7ec','#e0a46a'];
 const rows=[];
 for(const e of entries){
  const plane=dataUri(await planeImage(5,e.design||{paint:0,wing:0,propeller:0,decoration:0},panel));
  // The board endpoint already masks names that fail the screen; mask again here so nothing unscreened can reach a public post.
  const name=nameAllowed(e.name)?e.name:HIDDEN_NAME;
  const nameSize=columns===1?34:name.length>11?20:name.length>9?24:name.length>7?27:30;
  rows.push(h('div',{display:'flex',alignItems:'center',height:96,marginBottom:12,paddingRight:16,borderRadius:20,
    background:e.rank<=3?'rgba(246,210,122,0.16)':'rgba(255,248,230,0.08)',border:`2px solid ${e.rank<=3?'rgba(246,210,122,0.65)':'rgba(255,248,230,0.18)'}`},[
   text(`${e.rank}`,{width:88,fontSize:e.rank<=3?46:38,color:rankInk[e.rank-1]||ink,justifyContent:'center',alignItems:'center'}),
   h('div',{display:'flex',width:ROW_PLANE_W+16,justifyContent:'center'},[{type:'img',props:{src:plane,width:ROW_PLANE_W,height:ROW_PLANE_H,style:{borderRadius:10}}}]),
   text(name,{flexGrow:1,fontSize:nameSize,lineHeight:1.2,marginLeft:14,paddingRight:12,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}),
   text(`${Number(e.distance||0).toLocaleString('en-US')} m`,{fontSize:32,color:gold,justifyContent:'flex-end',whiteSpace:'nowrap'})
  ]));
 }
 const columnWidth=columns===2?710:1460;
 const lanes=[];
 for(let c=0;c<columns;c++)lanes.push(h('div',{display:'flex',flexDirection:'column',width:columnWidth,marginRight:c===0&&columns===2?40:0},rows.slice(c*perColumn,(c+1)*perColumn)));
 return h('div',{display:'flex',width:BOARD_W,height:BOARD_H,position:'relative',fontFamily:'Noto Sans JP',color:ink},[
  {type:'img',props:{src:await scenery('sky-world.webp',BOARD_W,BOARD_H),width:BOARD_W,height:BOARD_H,style:{position:'absolute',top:0,left:0,objectFit:'cover'}}},
  h('div',{position:'absolute',top:0,left:0,width:BOARD_W,height:BOARD_H,background:'linear-gradient(180deg, rgba(10,38,44,0.95) 0%, rgba(10,38,44,0.88) 55%, rgba(10,38,44,0.94) 100%)'},undefined),
  h('div',{display:'flex',flexDirection:'column',position:'absolute',top:0,left:0,width:BOARD_W,height:BOARD_H,padding:'52px 70px 44px'},[
   h('div',{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:30},[
    h('div',{display:'flex',flexDirection:'column'},[
     text('MIRACLE MINE ・ 空の旅ランキング',{fontSize:26,letterSpacing:6,color:gold}),
     text(`シーズン「${board?.season?.name||''}」`,{fontSize:52,lineHeight:1.2,marginTop:12,textShadow:'0 4px 14px rgba(0,0,0,0.45)'})
    ]),
    text(date,{fontSize:30,color:'#ffeec9'})
   ]),
   entries.length?h('div',{display:'flex'},lanes):text('まだ記録がありません',{fontSize:40,justifyContent:'center',marginTop:120}),
   h('div',{display:'flex',flexGrow:1},undefined),
   text('miracle-mine.vercel.app ・ 無料で遊べる数字パズル',{fontSize:26,color:gold})
  ])
 ]);
}
export async function renderBoardCard(board,date=''){
 const element=await boardCardElement(board,date);
 const response=new ImageResponse(element,{width:BOARD_W,height:BOARD_H,fonts:[{name:'Noto Sans JP',data:await fontData(),weight:700,style:'normal'}]});
 return sharp(Buffer.from(await response.arrayBuffer())).png({compressionLevel:9,adaptiveFiltering:true,palette:true,colours:256,dither:0.8}).toBuffer();
}
