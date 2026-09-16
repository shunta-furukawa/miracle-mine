import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nameIssue,nameAllowed,publicName,normalizeName,nameIssueMessage,HIDDEN_NAME} from '../src/name-filter.js';

test('ordinary aircraft names pass, including words that contain listed fragments',()=>{
 for(const n of ['そらいろ号','Sky Blue 7','ルカ号','ゆうしゃのひこうき','コロ助号','シネマ号','ぶっかけうどん号','Cockpit One','Skill Master','Killer Bee','おかまいなく','ちょんまげ','たいまつ','ブラック号','シンデレラ','かたわら','グレープ','Analog 3','ホテル号','No.7','ばか','','   '])
  assert.equal(nameIssue(n),'',n);
});
test('listed words are caught across katakana, full-width, small kana and spacing',()=>{
 for(const n of ['ちんちん号','ＳＥＸ機','ｾｯｸｽ','エッチ','しねしね','おまえしね','ころしてやる','うんこ号','FUCKYOU','f u c k','porno king','キチガイ','ブス号','きもい','パパ活','ぱんつ号'])
  assert.equal(nameIssue(n),'blocked',n);
});
test('contact details are refused separately',()=>{
 for(const n of ['090-1234-5678','０９０１２３４５６７８','1234567','taro@example.com','line id: abc','www.example.jp','discord:abc','でんわしてね'])
  assert.equal(nameIssue(n),'contact',n);
 assert.match(nameIssueMessage('contact'),/連絡先/);assert.match(nameIssueMessage('blocked'),/別の名前/);assert.equal(nameIssueMessage(''),'');
});
test('normalization and public fallbacks',()=>{
 assert.equal(normalizeName('ソラ イロ　ゴウ！'),'そらいろごう');assert.equal(normalizeName('ＡＢＣ-123'),'abc123');
 assert.equal(publicName('そらいろ号'),'そらいろ号');assert.equal(publicName('ちんちん号'),'');assert.equal(publicName(undefined),'');
 assert.ok(nameAllowed('そらいろ号'));assert.ok(!nameAllowed('sex'));assert.equal(typeof HIDDEN_NAME,'string');
});
