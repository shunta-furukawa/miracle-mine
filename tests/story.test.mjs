import test from 'node:test';
import assert from 'node:assert/strict';
import {stages,chapters} from '../src/data.js';
import {stageStory,chapterEnding,prologue,epilogue} from '../src/story.js';
test('every stage has a conversation with its actual goal and chapter partner',()=>{
 for(const stage of stages){const story=stageStory(stage);assert.equal(story.partner,chapters[stage.chapter].guardian);assert.equal(story.scene,stage.chapter+1);assert.ok(story.lines.length>=3);assert.ok(story.lines.at(-1).text.includes(`「${stage.target}」の力を${stage.count}回`));for(const line of story.lines){assert.ok(['ルカ',story.partner].includes(line.who));assert.equal(typeof line.text,'string');assert.ok(line.text.length>0);}}
});
test('all chapter rewards and bookends have valid speakers and scenery',()=>{
 for(const story of [prologue,epilogue,...chapters.map((_,i)=>chapterEnding(i))]){assert.ok(story.lines.length>=4);assert.ok(story.scene>=0&&story.scene<=5);for(const line of story.lines)assert.ok(['ルカ',story.partner].includes(line.who));}
 assert.equal(chapters[4].guardian,'フウ');
});
