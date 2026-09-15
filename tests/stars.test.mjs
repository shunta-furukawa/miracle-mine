import test from 'node:test';import assert from 'node:assert/strict';
import {rateRun,starGoal,betterRecord,normalizeStars,totalStars,chapterStars,starText,formatTime,MAX_STARS,STAR_PACE} from '../src/stars.js';
import {stages} from '../src/data.js';import {normalize,freshSlot} from '../src/save.js';import {stageBrief} from '../src/stage-intro.js';
test('ratings: three stars need the pace and no breaks, two stars allow a slower time and two breaks',()=>{
 const stage=stages[2];const goal=starGoal(stage);assert.equal(goal.time,stage.count*STAR_PACE[0]);
 assert.equal(rateRun(stage,{time:goal.time,breaks:0}).stars,3);assert.equal(rateRun(stage,{time:goal.time+0.1,breaks:0}).stars,2);assert.equal(rateRun(stage,{time:goal.time,breaks:1}).stars,2);
 assert.equal(rateRun(stage,{time:goal.twoTime,breaks:2}).stars,2);assert.equal(rateRun(stage,{time:goal.twoTime+1,breaks:0}).stars,1);assert.equal(rateRun(stage,{time:5,breaks:3}).stars,1);
 assert.equal(rateRun(stage,{time:12.345,breaks:-2}).time,12.3);assert.equal(rateRun(stage,{time:12.345,breaks:-2}).breaks,0);
 for(const t of stages)assert(starGoal(t).time>=t.count*8&&starGoal(t).twoTime>starGoal(t).time);
 assert.equal(starText(2),'★★☆');assert.equal(formatTime(41.26),'41.3秒');assert.equal(formatTime(75),'1分15.0秒');assert.equal(MAX_STARS,90);
});
test('best record keeps more stars, then fewer breaks, then the faster time',()=>{
 const a={stars:2,time:30,breaks:1},b={stars:3,time:50,breaks:0},c={stars:2,time:20,breaks:2},d={stars:2,time:25,breaks:1};
 assert.equal(betterRecord(null,a),a);assert.equal(betterRecord(a,null),a);assert.equal(betterRecord(a,b),b);assert.equal(betterRecord(a,c),a);assert.equal(betterRecord(a,d),d);assert.equal(betterRecord(d,a),d);
});
test('saves store per-stage records safely and old saves get an empty star map',()=>{
 const slot={...freshSlot(),cleared:[0,1,2],stars:{0:{stars:3,time:12.34,breaks:0},1:{stars:9,time:1,breaks:0},2:{stars:2,time:'x',breaks:0},3:{stars:1,time:80.5,breaks:4},40:{stars:3,time:1,breaks:0},junk:5}};
 const n=normalize({version:1,slots:[slot,{cleared:[5]},null],bests:{},settings:{}});
 assert.deepEqual(n.slots[0].stars,{0:{stars:3,time:12.3,breaks:0},3:{stars:1,time:80.5,breaks:4}});assert.deepEqual(n.slots[1].stars,{});assert.equal(totalStars(n.slots[0]),4);assert.equal(chapterStars(n.slots[0],0),4);assert.equal(chapterStars(n.slots[0],1),0);
 assert.deepEqual(normalizeStars(null),{});assert.deepEqual(normalizeStars('x'),{});
});
test('stage intro shows the three-star condition and the personal record',()=>{
 const stage=stages[7];const fresh=stageBrief(stage,{mode:'story'});assert.equal(fresh.stars.record,null);assert.deepEqual(fresh.stars.goal,{time:`${starGoal(stage).time}秒以内`,breaks:'割らない'});
 const withRecord=stageBrief(stage,{mode:'story',record:{stars:2,time:41.2,breaks:1}});assert.deepEqual(withRecord.stars.record,{marks:'★★☆',stars:2,time:'41.2秒',breaks:'割った回数 1'});
 assert.equal(stageBrief(stage,{mode:'score'}).stars,null);
});
