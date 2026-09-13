export const chapters=[
 {name:'芽吹きの森',tag:'FOREST',material:'かるい木材',part:'翼と骨組み',guardian:'モス',color:'#5b8b4a',intro:'森の水車が止まっちゃった。鉱石の力で、もう一度まわしてくれる？',end:'ありがとう！ この木なら、空を飛ぶ翼がつくれるよ。'},
 {name:'潮風の入り江',tag:'OCEAN',material:'潮に強い合金',part:'胴体と尾翼',guardian:'シェル',color:'#409cad',intro:'港のポンプに力が足りないんだ。8のエネルギーを集めてほしいな。',end:'港が元気になったよ！ この合金を飛行機に使ってね。'},
 {name:'ひびきの洞窟',tag:'CAVERN',material:'蓄光結晶',part:'計器と動力の核',guardian:'クリム',color:'#8b74b8',intro:'奥の坑道がまっくら。10の光で、みんなの帰り道を照らそう。',end:'洞窟に明かりが戻った！ この結晶は、空でもきっと役立つよ。'},
 {name:'火山の鍛冶場',tag:'VOLCANO',material:'耐熱金属',part:'ボイラーとプロペラ',guardian:'フレア',color:'#ca6b3c',intro:'大きな炉を動かすには、掛け算の力が必要だ。「×」を試してみて！',end:'炉が動いた！ 熱に強いボイラーで、どこまでも飛んでいけるよ。'},
 {name:'雲へ続く高原',tag:'SKY',material:'飛行用パーツ',part:'最後の飛行装置',guardian:'トトじい',color:'#74adbd',intro:'いよいよ試験飛行じゃ。足し算で準備して、掛け算で大きな力を作ろう。',end:'よくやった、ルカ。さあ、一緒に雲の向こうを見にいこう！'}
];
const names=['はじめの一歩','小さな発見','つなぐ工夫','新しいひらめき','力をあわせて','守り手のお願い'];
export const stages=Array.from({length:30},(_,id)=>{
 const chapter=Math.floor(id/6),step=id%6;
 return {id,chapter,step,name:names[step],target:chapter===0?6:chapter===1?8:chapter===2?10:chapter===3?[12,12,18,24,36,36][step]:[20,28,32,36,48,64][step],
 min:id===0?1:0,max:id===0?3:chapter===0?5:chapter===1?7:9,
 life:[60,55,50,65,60][chapter],recover:[10,8,8,12,10][chapter],count:[[3,4,5,6,7,8],[8,8,9,10,11,12],[10,10,11,12,13,14],[6,6,7,8,9,10],[8,8,9,10,11,12]][chapter][step],multiply:chapter>=3};
});
export const hints=[
 '上下・左右・ななめにつながる数字をなぞって、6をつくろう。',
 '目標より小さい一桁の数は、指を離したところで合体するよ。',
 '1＋1＋2＝4。できた4と、となりの2をつなげよう。',
 '0をつないでも足し算の答えは同じ。遠くの石への橋になるよ。',
 '合体させる場所が大切。次につなぐ数字を探してみよう。',
 '目標を超えた石は消えるけれど、ライフは回復しないよ。'
];
export const palette=['#e8eee7','#2463a6','#f1d45c','#c65332','#176650','#e6a04b','#8dd5df','#373669','#ab517f','#c2afe3'];
