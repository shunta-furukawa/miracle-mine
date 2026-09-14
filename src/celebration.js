/** Decorative, finite effects live inside the dialog's top layer. */
export function victoryEffects(){
 const confetti=Array.from({length:64},(_,i)=>`<i class="victory-confetti" style="--x:${(i*37+3)%100}%;--drift:${(i%2?1:-1)*(35+i%7*12)}px;--delay:${(i%16)*.055}s;--fall:${2.2+i%5*.2}s;--turn:${(i%2?1:-1)*(240+i*19)}deg;--color:${['#ffd56a','#fff4c0','#65ded1','#ff9e84'][i%4]}"></i>`).join('');
 const stars=Array.from({length:20},(_,i)=>`<b class="victory-star" style="--angle:${i*18}deg;--reach:${100+i%4*32}px;--delay:${i%4*.08}s">✦</b>`).join('');
 return `<div class="victory-effects" aria-hidden="true"><div class="victory-glow"></div><div class="victory-ring"></div><div class="victory-ring victory-ring-late"></div>${stars}${confetti}</div>`;
}
