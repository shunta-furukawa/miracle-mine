// Local QA only. Both APIs share an ephemeral database; production always uses Neon.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {schema as rankingSchema,service as rankingService} from '../server/ranking.js';
import {schema as onlineSchema,service as onlineService} from '../server/online.js';
const db=new PGlite();
for(const sql of [...rankingSchema,...onlineSchema])await db.exec(sql);
const query=async(sql,params)=>(await db.query(sql,params)).rows;
const apis={'/api/ranking':rankingService(query),'/api/online':onlineService(query)};
const root=resolve('dist'),types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg'};
createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),api=apis[url.pathname];
 if(api){try{
  let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>65536)throw Object.assign(new Error('SIZE'),{status:413,code:'SIZE'});}
  const body=raw?JSON.parse(raw):Object.fromEntries(url.searchParams);
  const result=await api(url.searchParams.get('action'),body,(req.headers.authorization||'').replace(/^Bearer /,''));
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(result));
 }catch(e){res.writeHead(e.status||503,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({error:e.code||'UNAVAILABLE'}));}return;}
 try{
  const pathname=url.pathname==='/about'?'/about.html':url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname);
  const file=resolve(root,'.'+pathname);if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  const content=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(content);
 }catch{res.writeHead(404).end('Not found');}
}).listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('http://localhost:'+(Number(process.env.PORT)||3000)+' — temporary QA database; no production writes'));
