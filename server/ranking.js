import {randomUUID,createHash,randomBytes} from 'node:crypto';
import {voyageStage,SKY_PROTOCOL,validSeed} from '../src/sky-voyage.js';
/* Seasons: a rule change starts a new season with its own board. Earlier boards stay in the database and are
   listed unless `hidden` is set, which keeps a season out of the game entirely without deleting its records. */
export const SEASONS=[{id:1,name:'はじまりの空',protocol:1,hidden:true},{id:2,name:'気まぐれな気流',protocol:SKY_PROTOCOL}];
export const CURRENT_SEASON=SEASONS.at(-1);
export const visibleSeasons=()=>SEASONS.filter(s=>!s.hidden||s.id===CURRENT_SEASON.id);
const seasonById=id=>visibleSeasons().find(s=>s.id===id);
import {flightName,flightDesign} from '../src/flight-profile.js';
import {nameAllowed,HIDDEN_NAME} from '../src/name-filter.js';
export const schema=[
 `CREATE TABLE IF NOT EXISTS mm_pilots (uid uuid PRIMARY KEY, secret_hash text UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
 `CREATE TABLE IF NOT EXISTS mm_voyages (id uuid PRIMARY KEY, uid uuid NOT NULL REFERENCES mm_pilots(uid), state text NOT NULL DEFAULT 'open', steps integer NOT NULL DEFAULT 0, last_level integer NOT NULL DEFAULT -1, distance bigint NOT NULL DEFAULT 0, snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
 `CREATE INDEX IF NOT EXISTS mm_voyages_uid ON mm_voyages(uid)`,
 `CREATE TABLE IF NOT EXISTS mm_bests (uid uuid PRIMARY KEY REFERENCES mm_pilots(uid), distance bigint NOT NULL, snapshot jsonb NOT NULL, achieved_at timestamptz NOT NULL DEFAULT now())`,
 `CREATE INDEX IF NOT EXISTS mm_bests_order ON mm_bests(distance DESC, achieved_at ASC, uid ASC)`,
 `CREATE TABLE IF NOT EXISTS mm_season_bests (season integer NOT NULL, uid uuid NOT NULL REFERENCES mm_pilots(uid), distance bigint NOT NULL, snapshot jsonb NOT NULL, achieved_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(season,uid))`,
 `CREATE INDEX IF NOT EXISTS mm_season_bests_order ON mm_season_bests(season, distance DESC, achieved_at ASC, uid ASC)`,
 /* Counts only. One row per day, entry point and event: no uid, name, address or device is stored. */
 `CREATE TABLE IF NOT EXISTS mm_tally (day date NOT NULL, source text NOT NULL, event text NOT NULL, hits integer NOT NULL DEFAULT 0, PRIMARY KEY(day,source,event))`
];
/* JST has no daylight saving, so a fixed offset keeps the days aligned with the reports without a timezone database. */
const TALLY_DAY="(now() AT TIME ZONE 'UTC' + interval '9 hours')::date";
export const TALLY_EVENTS=['visit','start'];
export const TALLY_SOURCE=/^[a-z][a-z-]{0,23}$/;
export const TALLY_DAYS=30;
const hash=s=>createHash('sha256').update(s).digest('hex');
const uuid=s=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(s);
const integer=n=>Number.isSafeInteger(n)&&n>=0;
export class RankError extends Error{constructor(code,status=409){super(code);this.code=code;this.status=status}}
const fail=(code,status)=>{throw new RankError(code,status)};
export function service(query){
 const pilot=async key=>{if(typeof key!=='string'||!/^[a-f0-9]{64}$/.test(key))fail('AUTH',401);const rows=await query('SELECT uid FROM mm_pilots WHERE secret_hash=$1',[hash(key)]);if(!rows.length)fail('AUTH',401);return rows[0].uid;};
 return async function dispatch(action,b={},key=''){
  const seasonInfo=s=>({id:s.id,name:s.name,protocol:s.protocol,current:s.id===CURRENT_SEASON.id});
  if(action==='status')return {ready:true,protocol:CURRENT_SEASON.protocol,season:seasonInfo(CURRENT_SEASON),seasons:visibleSeasons().map(seasonInfo)};
  if(action==='tallies'){
   const rows=await query(`SELECT to_char(day,'YYYY-MM-DD') AS day,source,event,hits FROM mm_tally WHERE day > ${TALLY_DAY} - ($1::int) ORDER BY day DESC,source ASC,event ASC`,[TALLY_DAYS]);
   return {days:TALLY_DAYS,rows:rows.map(r=>({day:r.day,source:r.source,event:r.event,hits:Number(r.hits)}))};
  }
  if(action==='tally'){
   if(!TALLY_EVENTS.includes(b.event))fail('INPUT',400);
   const source=typeof b.source==='string'&&TALLY_SOURCE.test(b.source)?b.source:'direct';
   await query(`INSERT INTO mm_tally (day,source,event,hits) VALUES (${TALLY_DAY},$1,$2,1) ON CONFLICT (day,source,event) DO UPDATE SET hits=mm_tally.hits+1`,[source,b.event]);
   return {counted:true};
  }
  if(action==='board'){
   const season=b.season===undefined||b.season===null||b.season===''?CURRENT_SEASON:seasonById(Number(b.season));if(!season)fail('SEASON',404);
   const rows=season.id===1?await query('SELECT uid,distance,snapshot,achieved_at FROM mm_bests ORDER BY distance DESC,achieved_at ASC,uid ASC LIMIT 100',[]):await query('SELECT uid,distance,snapshot,achieved_at FROM mm_season_bests WHERE season=$1 ORDER BY distance DESC,achieved_at ASC,uid ASC LIMIT 100',[season.id]);
   return {season:seasonInfo(season),seasons:visibleSeasons().map(seasonInfo),entries:rows.map((r,i)=>({rank:i+1,uid:r.uid,distance:Number(r.distance),name:nameAllowed(r.snapshot.name)?r.snapshot.name:HIDDEN_NAME,design:r.snapshot.design,achieved:r.achieved_at}))};
  }
  if(action==='register'){
   if(typeof key!=='string'||!/^[a-f0-9]{64}$/.test(key))fail('AUTH',401);
   if(b.completed!==true)fail('LOCKED',403);
   // Unique credential makes retries reuse the same server-issued UID.
   const rows=await query('INSERT INTO mm_pilots(uid,secret_hash) VALUES($1,$2) ON CONFLICT(secret_hash) DO UPDATE SET secret_hash=EXCLUDED.secret_hash RETURNING uid',[randomUUID(),hash(key)]);return {uid:rows[0].uid};
  }
  const uid=await pilot(key);
  if(action==='standing'){const rows=await query(`SELECT b.distance,1+(SELECT count(*) FROM mm_season_bests x WHERE x.season=b.season AND (x.distance>b.distance OR (x.distance=b.distance AND (x.achieved_at<b.achieved_at OR (x.achieved_at=b.achieved_at AND x.uid<b.uid))))) AS rank FROM mm_season_bests b WHERE b.uid=$1 AND b.season=$2`,[uid,CURRENT_SEASON.id]);return {season:seasonInfo(CURRENT_SEASON),...(rows.length?{rank:Number(rows[0].rank),distance:Number(rows[0].distance)}:{rank:null,distance:0})};}
  if(!uuid(b.runId))fail('INPUT',400);
  if(action==='start'){
   if(!flightName(b.name)||!nameAllowed(flightName(b.name)))fail('NAME',400);if(b.protocol!==CURRENT_SEASON.protocol)fail('VERSION',409);
   await query("DELETE FROM mm_voyages WHERE uid=$1 AND created_at<now()-interval '48 hours'",[uid]);
   const existing=await query('SELECT id,uid,snapshot FROM mm_voyages WHERE id=$1',[b.runId]);if(existing.length){if(existing[0].uid!==uid)fail('AUTH',403);if(existing[0].snapshot.season!==CURRENT_SEASON.id)fail('VERSION',409);return {runId:b.runId,protocol:CURRENT_SEASON.protocol,seed:existing[0].snapshot.seed,season:seasonInfo(CURRENT_SEASON)};}
   await query("DELETE FROM mm_voyages WHERE uid=$1 AND id IN (SELECT id FROM mm_voyages WHERE uid=$1 ORDER BY created_at DESC OFFSET 9)",[uid]);
   // The server chooses the seed, so the goal sequence it validates is the one the player flew.
   const snapshot={name:flightName(b.name),design:flightDesign(b.design),season:CURRENT_SEASON.id,seed:randomBytes(4).readUInt32BE(0)};
   const inserted=await query('INSERT INTO mm_voyages(id,uid,snapshot) VALUES($1,$2,$3::jsonb) ON CONFLICT(id) DO NOTHING RETURNING id',[b.runId,uid,JSON.stringify(snapshot)]);
   if(!inserted.length){const rows=await query('SELECT uid,snapshot FROM mm_voyages WHERE id=$1',[b.runId]);if(rows[0]?.uid!==uid)fail('AUTH',403);return {runId:b.runId,protocol:CURRENT_SEASON.protocol,seed:rows[0].snapshot.seed,season:seasonInfo(CURRENT_SEASON)};}
   return {runId:b.runId,protocol:CURRENT_SEASON.protocol,seed:snapshot.seed,season:seasonInfo(CURRENT_SEASON)};
  }
  const rows=await query('SELECT * FROM mm_voyages WHERE id=$1 AND uid=$2',[b.runId,uid]);if(!rows.length)fail('MISSING',404);const run=rows[0];
  if(new Date(run.created_at).getTime()<Date.now()-48*3600000)fail('EXPIRED',410);
  if(run.state==='invalid')fail('INVALID');
  const season=SEASONS.find(s=>s.id===run.snapshot?.season);if(!season||season.id!==CURRENT_SEASON.id||!validSeed(run.snapshot.seed))fail('VERSION',409);
  const goalTarget=level=>voyageStage(run.snapshot.seed,level).target;
  const invalid=async()=>{await query("UPDATE mm_voyages SET state='invalid',updated_at=now() WHERE id=$1 AND state='open'",[b.runId]);fail('INVALID');};
  if(action==='goal'){
   if(!integer(b.seq)||b.seq<1||!integer(b.level)||b.level>100000||!integer(b.target))return invalid();
   if(b.seq<=run.steps)return {ack:run.steps}; // Acknowledged retries never add distance again.
   if(run.state!=='open')fail('CLOSED');
   // Concurrent animations may complete several traces before the displayed target advances.
   const levelOK=b.level===run.steps||b.level===run.last_level;
   if(b.seq!==run.steps+1||!levelOK||b.target!==goalTarget(b.level))return invalid();
   const updated=await query("UPDATE mm_voyages SET steps=steps+1,last_level=$3,distance=distance+$4,updated_at=now() WHERE id=$1 AND uid=$2 AND state='open' AND steps=$5 RETURNING steps",[b.runId,uid,b.level,goalTarget(b.level),run.steps]);
   if(!updated.length){const latest=await query('SELECT steps,state FROM mm_voyages WHERE id=$1',[b.runId]);if(latest[0]?.state==='invalid')fail('INVALID');if(latest[0]?.steps>=b.seq)return {ack:latest[0].steps};fail('RETRY',503);}
   return {ack:updated[0].steps};
  }
  if(action==='finish'){
   if(!integer(b.count)||!integer(b.distance)||!['return','steam'].includes(b.reason))return invalid();
   if(b.count!==run.steps||b.distance!==Number(run.distance))return invalid();
   // Terminal state and personal best are committed atomically. Snapshot is from departure.
   await query(`WITH finished AS (UPDATE mm_voyages SET state='finished',updated_at=now() WHERE id=$1 AND uid=$2 AND state='open' AND steps=$3 AND distance=$4 RETURNING uid,distance,snapshot)
    INSERT INTO mm_season_bests(season,uid,distance,snapshot) SELECT $5::integer,uid,distance,snapshot-'seed'-'season' FROM finished WHERE distance>0
    ON CONFLICT(season,uid) DO UPDATE SET distance=EXCLUDED.distance,snapshot=EXCLUDED.snapshot,achieved_at=now() WHERE EXCLUDED.distance>mm_season_bests.distance`,[b.runId,uid,b.count,b.distance,season.id]);
   const terminal=await query('SELECT state FROM mm_voyages WHERE id=$1 AND uid=$2',[b.runId,uid]);if(terminal[0]?.state!=='finished')fail('INVALID');return {finished:true,distance:Number(run.distance)};
  }
  fail('ACTION',400);
 };
}
