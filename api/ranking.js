import {neon} from '@neondatabase/serverless';
import {schema,service,RankError} from '../server/ranking.js';
let query,ready;
async function database(){
 const url=process.env.DATABASE_URL||process.env.POSTGRES_URL;
 if(!url)throw new RankError('NOT_CONFIGURED',503);
 if(!query){const sql=neon(url);query=(text,params)=>sql.query(text,params);}
 if(!ready)ready=(async()=>{for(const statement of schema)await query(statement,[]);})().catch(e=>{ready=null;throw e});
 await ready;return query;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const send=(status,body)=>res.status(status).json(body);
 try{
  const url=new URL(req.url,'https://miracle-mine.vercel.app'),action=url.searchParams.get('action');
  if(!['GET','POST'].includes(req.method))return send(405,{error:'METHOD'});
  if((req.method==='GET')!==['status','board'].includes(action))return send(405,{error:'METHOD'});
  if(req.headers['sec-fetch-site']==='cross-site')return send(403,{error:'ORIGIN'});
  if(Number(req.headers['content-length']||0)>4096)return send(413,{error:'SIZE'});
  let body=req.method==='GET'?{season:url.searchParams.get('season')}:req.body||{};if(typeof body==='string'){if(body.length>4096)return send(413,{error:'SIZE'});try{body=JSON.parse(body)}catch{return send(400,{error:'INPUT'})}}
  if(!body||typeof body!=='object'||Array.isArray(body))return send(400,{error:'INPUT'});
  const db=await database(),result=await service(db)(action,body,(req.headers.authorization||'').replace(/^Bearer /,''));return send(200,result);
 }catch(e){return send(e instanceof RankError?e.status:503,{error:e instanceof RankError?e.code:'UNAVAILABLE'});}
}
