import test from 'node:test';
import assert from 'node:assert/strict';
import {stageBrief} from '../src/stage-intro.js';
import {stages} from '../src/data.js';
test('stage announcements use actual goals throughout all five chapters',()=>{
 for(const stage of stages){const brief=stageBrief(stage);assert.equal(brief.target,stage.target);assert.equal(brief.name,stage.name);assert.equal(brief.goal,`${stage.count}回つくろう`);assert.equal(brief.label,`STAGE ${stage.chapter+1}-${stage.step+1}`);}
});
test('resume uses remaining objectives and challenge modes do not show infinite counts',()=>{
 assert.equal(stageBrief(stages[0],{resume:true,remaining:2}).goal,'あと2回つくろう');
 assert.match(stageBrief({...stages[0],count:Infinity},{mode:'score'}).goal,/3分間/);
 assert.match(stageBrief({...stages[0],count:Infinity},{mode:'endless'}).goal,/ライフ/);
});
