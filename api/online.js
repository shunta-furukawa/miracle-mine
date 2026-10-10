import {neon} from '@neondatabase/serverless';
import {schema,service,OnlineError,MAX_BODY_BYTES} from '../server/online.js';
let query,ready;
async function database(){
 const url=process.env.DATABASE_URL||process.env.POSTGRES_URL;
 if(!url)throw new OnlineError('NOT_CONFIGURED',503);
 if(!query){const sql=neon(url);query=(text,params)=>sql.query(text,params);}
 if(!ready)ready=(async()=>{for(const statement of schema)await query(statement,[]);})().catch(error=>{ready=null;throw error});
 await ready;return query;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const send=(status,body)=>res.status(status).json(body);
 try{
  const url=new URL(req.url,'https://miracle-mine.vercel.app'),action=url.searchParams.get('action');
  if(!['GET','POST'].includes(req.method)||(req.method==='GET')!==(action==='status'))return send(405,{error:'METHOD'});
  if(req.headers['sec-fetch-site']==='cross-site')return send(403,{error:'ORIGIN'});
  if(Number(req.headers['content-length']||0)>MAX_BODY_BYTES)return send(413,{error:'SIZE'});
  let body=req.method==='GET'?{}:req.body||{};
  if(typeof body==='string'){
   if(Buffer.byteLength(body)>MAX_BODY_BYTES)return send(413,{error:'SIZE'});
   try{body=JSON.parse(body)}catch{return send(400,{error:'INPUT'})}
  }
  if(!body||typeof body!=='object'||Array.isArray(body))return send(400,{error:'INPUT'});
  if(Buffer.byteLength(JSON.stringify(body))>MAX_BODY_BYTES)return send(413,{error:'SIZE'});
  // Strict bearer syntax avoids accidentally accepting another authentication scheme.
  const authorization=req.headers.authorization||'',key=/^Bearer [a-f0-9]{64}$/.test(authorization)?authorization.slice(7):'';
  const db=await database(),result=await service(db)(action,body,key);return send(200,result);
 }catch(error){return send(error instanceof OnlineError?error.status:503,{error:error instanceof OnlineError?error.code:'UNAVAILABLE'});}
}
