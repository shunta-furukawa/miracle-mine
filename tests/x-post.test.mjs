import {test} from 'node:test';
import assert from 'node:assert/strict';
import {oauthHeader,weeklyText,weightOf,cardUrlFor,credsFromEnv,boardCardUrl,BOARD_TOP} from '../scripts/x-post.mjs';

test('OAuth 1.0a signature matches the reference example from the X documentation',()=>{
 const header=oauthHeader({method:'POST',url:'https://api.twitter.com/1.1/statuses/update.json',params:{include_entities:'true',status:'Hello Ladies + Gentlemen, a signed OAuth request!'},
  creds:{apiKey:'xvz1evFS4wEEPTGEFPHBog',apiSecret:'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw',accessToken:'370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb',accessSecret:'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE'},
  nonce:'kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg',timestamp:1318622958});
 assert.ok(header.includes('oauth_signature="hCtSmYh%2BiHYCEqBWrE7C7hYmtUk%3D"'),header);
 assert.ok(header.startsWith('OAuth oauth_consumer_key="xvz1evFS4wEEPTGEFPHBog"'));
});
test('weekly text stays within the limit and hides names that fail the screen',()=>{
 const board={season:{name:'気まぐれな気流'},entries:[{name:'そらいろ号',distance:12345},{name:'ちんちん号',distance:100},{name:'x'.repeat(20),distance:1}]};
 const text=weeklyText(board,'9月20日');
 // The attached card carries the rest of the top ten, so only the leader is named in the text.
 assert.ok(text.includes('🥇 そらいろ号　12,345 m'));assert.ok(text.includes('上位 3 機は画像のとおり。'));
 assert.ok(!text.includes('ちんちん'),'a name that fails the screen never reaches the post');
 assert.ok(text.includes('#ミラクルマイン'));
 assert.ok(weightOf(text)<=280,String(weightOf(text)));
 assert.ok(!/https?:\/\//.test(text),'no link keeps the post at the cheaper rate');
});
test('a blocked leader is replaced by the hidden name, and a single entry needs no image line',()=>{
 const one={season:{name:'気まぐれな気流'},entries:[{name:'ちんちん号',distance:900}]};
 const text=weeklyText(one,'9月20日');
 assert.ok(text.includes('なまえのない飛行機'));assert.ok(!text.includes('ちんちん'));
 assert.ok(!text.includes('画像のとおり'),'one entry: nothing else to show');
 assert.ok(weightOf(text)<=280);
});
test('the card URL is a rank card for the leader and credentials are validated',()=>{
 const url=cardUrlFor({name:'そらいろ号',distance:12345,design:{paint:2,wing:1,propeller:2,decoration:1}});
 assert.ok(url.startsWith('https://miracle-mine.vercel.app/api/share?s=')&&url.endsWith('&image=1'));
 assert.equal(boardCardUrl(),'https://miracle-mine.vercel.app/api/share?board=1');
 assert.equal(boardCardUrl(2),'https://miracle-mine.vercel.app/api/share?board=1&season=2');
 assert.equal(BOARD_TOP,10);
 assert.throws(()=>credsFromEnv({X_API_KEY:'a'}),/missing credentials: X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET/);
});
