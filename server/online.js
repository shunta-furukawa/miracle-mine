import {createHash,randomBytes} from 'node:crypto';
import {ONLINE_PROTOCOL,MAX_ROUND_MS,MAX_MOVES,createRound,replay,validRoomId} from '../src/online-rules.js';

export const ROOM_TTL_MS=30*60*1000;
export const FINISHED_TTL_MS=2*60*1000;
export const REPORT_GRACE_MS=10000;
export const COUNTDOWN_MS=6000;
export const MAX_CLOCK_UNCERTAINTY=1000;
export const FINISH_MARGIN_MS=1500;
export const MAX_BODY_BYTES=65536;
export const MAX_SDP_BYTES=16384;
export const MAX_ROOMS=500;
export const schema=[
 `CREATE TABLE IF NOT EXISTS mm_online_rooms (id uuid PRIMARY KEY, version integer NOT NULL DEFAULT 0, host_hash text NOT NULL, global_slot smallint NOT NULL UNIQUE CHECK(global_slot>=0 AND global_slot<500), slot smallint NOT NULL CHECK(slot>=0 AND slot<3), room jsonb NOT NULL, expires_at bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(host_hash,slot))`,
 `CREATE INDEX IF NOT EXISTS mm_online_rooms_expiry ON mm_online_rooms(expires_at)`
];
export class OnlineError extends Error{constructor(code,status=409){super(code);this.code=code;this.status=status;}}
const fail=(code,status)=>{throw new OnlineError(code,status)};
const hash=value=>createHash('sha256').update(value).digest('hex');
const keyHash=key=>{if(typeof key!=='string'||!/^[a-f0-9]{64}$/.test(key))fail('AUTH',401);return hash(key)};
const terminal=room=>room.result!==null;
const phase=(room,now)=>terminal(room)?room.result.kind==='cancelled'?'cancelled':'finished':room.startAt===null?'waiting':now<room.startAt?'countdown':'playing';
const describe=(row,seat,now)=>{
 const room=row.room,started=room.startAt!==null;
 return {roomId:row.id,protocol:room.protocol,seat,phase:phase(room,now),joined:[true,room.guest!==null],ready:[...room.ready],reported:room.reports.map(Boolean),seed:started?room.seed:null,target:started?createRound(room.seed).target:null,startAt:room.startAt,expiresAt:Number(row.expires_at),reportDeadline:room.reportDeadline,peerDescription:room.descriptions[1-seat],result:room.result,serverNow:now};
};
function conclude(room,now){
 if(terminal(room)||room.startAt===null||now<room.startAt)return false;
 const [a,b]=room.reports;
 if(a&&b){
  if(a.clockUncertainty>MAX_CLOCK_UNCERTAINTY||b.clockUncertainty>MAX_CLOCK_UNCERTAINTY)room.result={kind:'uncertain',winner:null,reason:'clock'};
  else if([a,b].some(report=>report.solved&&report.receivedAt-room.startAt-report.elapsed>REPORT_GRACE_MS+report.clockUncertainty))room.result={kind:'uncertain',winner:null,reason:'delivery_delay'};
  else if(a.solved&&b.solved){
   const delta=a.elapsed-b.elapsed,receiptDelta=a.receivedAt-b.receivedAt,margin=FINISH_MARGIN_MS+a.clockUncertainty+b.clockUncertainty;
   if(Math.abs(delta)<=margin)room.result={kind:'draw',winner:null,reason:'close_finish'};
   else if(receiptDelta===0||Math.sign(delta)!==Math.sign(receiptDelta))room.result={kind:'uncertain',winner:null,reason:'delivery_order'};
   else room.result={kind:'win',winner:delta<0?0:1,reason:'validated'};
  }else if(a.solved||b.solved)room.result={kind:'win',winner:a.solved?0:1,reason:'validated'};
  else room.result={kind:'draw',winner:null,reason:'no_solution'};
 }else if((room.reportDeadline!==null&&now>=room.reportDeadline)||now>=room.startAt+MAX_ROUND_MS+REPORT_GRACE_MS)room.result={kind:'uncertain',winner:null,reason:'missing_report'};
 return terminal(room);
}
function validateReport(body,room,now){
 if(!Array.isArray(body.moves)||body.moves.length>MAX_MOVES||typeof body.solved!=='boolean'||!Number.isInteger(body.elapsed)||body.elapsed<0||body.elapsed>MAX_ROUND_MS||!Number.isFinite(body.clockUncertainty)||body.clockUncertainty<0||body.clockUncertainty>MAX_ROUND_MS)fail('REPORT',400);
 let state;try{state=replay(room.seed,body.moves)}catch{fail('REPLAY',400)}
 if(state.solved!==body.solved||state.lastAt>body.elapsed)fail('REPLAY',400);
 // The transcript's final successful move is the finish timestamp; callers cannot claim an earlier one.
 const elapsed=body.solved?state.lastAt:body.elapsed;
 if(elapsed>now-room.startAt+Math.min(body.clockUncertainty,MAX_CLOCK_UNCERTAINTY)+250)fail('TIME',400);
 return {solved:body.solved,elapsed,clockUncertainty:body.clockUncertainty,receivedAt:now,fingerprint:hash(JSON.stringify({moves:body.moves,elapsed:body.elapsed,solved:body.solved,clockUncertainty:body.clockUncertainty}))};
}

// A JSON snapshot plus version CAS keeps seat allocation, readiness and reports atomic over HTTP SQL.
// No ranking or save table is read or written. The injected clock/seed are only for deterministic tests.
export function service(query,{now=Date.now,seed=()=>randomBytes(4).readUInt32BE(0)}={}){
 return async function dispatch(action,body={},key=''){
  if(!body||typeof body!=='object'||Array.isArray(body))fail('INPUT',400);
  let bytes;try{bytes=Buffer.byteLength(JSON.stringify(body))}catch{fail('INPUT',400)}
  if(bytes>MAX_BODY_BYTES)fail('SIZE',413);
  if(action==='status')return {ready:true,protocol:ONLINE_PROTOCOL,serverNow:now()};
  if(!['create','join','poll','signal','ready','report','leave'].includes(action))fail('ACTION',400);
  const identity=keyHash(key);if(!validRoomId(body.roomId))fail('INPUT',400);
  if(action==='create'){
   if(body.protocol!==ONLINE_PROTOCOL)fail('VERSION');
   const existing=await query('SELECT id FROM mm_online_rooms WHERE id=$1',[body.roomId]);
   if(!existing.length){
    const time=now(),room={protocol:ONLINE_PROTOCOL,host:identity,guest:null,descriptions:[null,null],ready:[false,false],seed:seed(),startAt:null,reports:[null,null],reportDeadline:null,result:null};
    // Cleanup is bounded and occurs only on creation, never on ordinary poll/read requests.
    await query('DELETE FROM mm_online_rooms WHERE host_hash=$1 AND expires_at<=$2',[identity,time]);
    await query('DELETE FROM mm_online_rooms WHERE id IN (SELECT id FROM mm_online_rooms WHERE expires_at<=$1 ORDER BY expires_at LIMIT 40)',[time]);
    // Unique indexed slots enforce both the per-credential and global cap under races.
    // No address/device data is stored; anonymous credentials are not strong abuse prevention.
    for(let attempt=0;attempt<4;attempt++){
     const inserted=await query(`INSERT INTO mm_online_rooms(id,host_hash,slot,global_slot,room,expires_at)
      SELECT $1,$2,s,g,$3::jsonb,$4 FROM
       (SELECT s FROM generate_series(0,2) s WHERE NOT EXISTS(SELECT 1 FROM mm_online_rooms WHERE host_hash=$2 AND slot=s) ORDER BY s LIMIT 1) host_candidate
       CROSS JOIN (SELECT g FROM generate_series(0,499) g WHERE NOT EXISTS(SELECT 1 FROM mm_online_rooms WHERE global_slot=g) ORDER BY g LIMIT 1) global_candidate
      ON CONFLICT DO NOTHING RETURNING id,version,room,expires_at`,[body.roomId,identity,JSON.stringify(room),time+ROOM_TTL_MS]);
     if(inserted.length)return describe(inserted[0],0,time);
     if((await query('SELECT id FROM mm_online_rooms WHERE id=$1',[body.roomId])).length)break;
     const count=await query('SELECT count(*)::int AS n FROM mm_online_rooms WHERE host_hash=$1',[identity]);
     if(count[0].n>=3)fail('LIMIT',429);
     if((await query('SELECT count(*)::int AS n FROM mm_online_rooms',[]))[0].n>=MAX_ROOMS)fail('CAPACITY',429);
     if(attempt===3)fail('RETRY',503);
    }
   }
  }
  for(let attempt=0;attempt<12;attempt++){
   const time=now(),rows=await query('SELECT id,version,room,expires_at FROM mm_online_rooms WHERE id=$1',[body.roomId]);
   if(!rows.length)fail('MISSING',404);
   const row=rows[0],room=row.room;
   if(Number(row.expires_at)<=time){
    // Expiry denies access immediately and this access also physically removes the expired record.
    await query('DELETE FROM mm_online_rooms WHERE id=$1 AND expires_at<=$2',[body.roomId,time]);fail('EXPIRED',410);
   }
   if(room.protocol!==ONLINE_PROTOCOL)fail('VERSION');
   let seat=identity===room.host?0:identity===room.guest?1:-1,dirty=false,expiresAt=Number(row.expires_at);
   if(action==='join'&&seat===-1){
    if(room.guest!==null)fail('FULL');
    if(terminal(room)||room.startAt!==null)fail('CLOSED');
    room.guest=identity;seat=1;dirty=true;
   }
   if(seat<0)fail('AUTH',403);
   if(action==='create'&&seat!==0)fail('AUTH',403);
   const wasTerminal=terminal(room);
   if(conclude(room,time)&&!wasTerminal)dirty=true;
   if(action==='signal'){
    if(terminal(room))fail('CLOSED');
    const description=body.description;
    if(!description||typeof description!=='object'||description.type!==(seat===0?'offer':'answer')||typeof description.sdp!=='string'||!description.sdp.trim()||Buffer.byteLength(description.sdp)>MAX_SDP_BYTES)fail('SIGNAL',400);
    const clean={type:description.type,sdp:description.sdp},previous=room.descriptions[seat];
    if(previous){if(previous.type!==clean.type||previous.sdp!==clean.sdp)fail('SIGNAL_CONFLICT');}
    else{
     if(terminal(room)||room.startAt!==null)fail('CLOSED');
     if(seat===1&&!room.descriptions[0])fail('SIGNAL_ORDER');
     room.descriptions[seat]=clean;dirty=true;
    }
   }
   if(action==='ready'&&!room.ready[seat]){
    if(terminal(room)||room.startAt!==null)fail('CLOSED');
    if(room.guest===null||!room.descriptions.every(Boolean))fail('NOT_CONNECTED');
    room.ready[seat]=true;dirty=true;
    if(room.ready.every(Boolean))room.startAt=time+COUNTDOWN_MS;
   }
   if(action==='report'){
    if(room.startAt===null||time<room.startAt)fail('EARLY');
    const report=validateReport(body,room,time),previous=room.reports[seat];
    if(previous){if(previous.fingerprint!==report.fingerprint)fail('REPORT_CONFLICT');}
    else{
     if(terminal(room))fail('CLOSED');
     room.reports[seat]=report;dirty=true;
     if(room.reportDeadline===null)room.reportDeadline=Math.min(time+REPORT_GRACE_MS,room.startAt+MAX_ROUND_MS+REPORT_GRACE_MS);
     conclude(room,time);
    }
   }
   if(action==='leave'&&!terminal(room)){
    room.result={kind:room.startAt===null||time<room.startAt?'cancelled':'uncertain',winner:null,reason:room.startAt===null||time<room.startAt?'left':'disconnected'};dirty=true;
   }
   // ICE/SDP is no longer needed after adjudication or cancellation; retain only the short result.
   if(terminal(room)&&room.descriptions.some(Boolean)){room.descriptions=[null,null];dirty=true;}
   if(!dirty)return describe(row,seat,time);
   if(terminal(room)&&!wasTerminal)expiresAt=Math.min(expiresAt,time+FINISHED_TTL_MS);
   const updated=await query('UPDATE mm_online_rooms SET room=$2::jsonb,version=version+1,expires_at=$3 WHERE id=$1 AND version=$4 RETURNING id,version,room,expires_at',[body.roomId,JSON.stringify(room),expiresAt,row.version]);
   if(updated.length)return describe(updated[0],seat,time);
  }
  fail('RETRY',503);
 };
}
