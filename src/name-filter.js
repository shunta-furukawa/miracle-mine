/* Public-name screening for aircraft names. Names appear on the ranking board and on share cards,
   so the client (before saving) and the server (before recording or rendering) run the same check.
   The lists are deliberately short: obvious sexual, violent, discriminatory and scatological words,
   plus contact details. They are a safety net for a children's game, not a complete profanity filter,
   and every entry was chosen to avoid ordinary words (コロ助, シネマ, ぶっかけうどん, cockpit, skill…). */
const kataToHira=s=>s.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
const smallKana={'ぁ':'あ','ぃ':'い','ぅ':'う','ぇ':'え','ぉ':'お','っ':'つ','ゃ':'や','ゅ':'ゆ','ょ':'よ','ゎ':'わ'};
/* Kana unified to hiragana, small kana enlarged, symbols/spaces removed, Latin lowercased. */
export const normalizeName=value=>kataToHira(String(value??'').normalize('NFKC').toLowerCase())
 .replace(/[ぁぃぅぇぉっゃゅょゎ]/g,c=>smallKana[c]).replace(/[゛゜ー〜~]/g,'')
 .replace(/[^\p{L}\p{N}]/gu,'');
const latinTokens=value=>String(value??'').normalize('NFKC').toLowerCase().split(/[^a-z]+/).filter(Boolean);
const digitsOnly=value=>String(value??'').normalize('NFKC').replace(/[^0-9]/g,'');

/* Japanese entries are matched inside the normalized name; regular expressions guard the ambiguous ones. */
export const BLOCKED_PATTERNS=[
 // sexual
 'せつくす','せくす','ちんこ','ちんぽ','ちんちん','まんこ','おめこ','おつぱい','うんこ','うんち','ちくび','きんたま','ふえらちお','ふあつく','えつち','やりまん','やりちん','ぽるの','ぺにす','ばぎな','おなにい','れいぷ','ごうかん','ろりこん','ぱいずり','なかだし','はめどり','せいこうい','ぱんつ',
 // violent
 /ころ(す(?!け)|せ$|して)/,/しね$|しねよ|しねしね|しんでしまえ|くたばれ|ぶつころ|じさつ/,
 // discriminatory
 'きちがい','ちょんこ','しなじん','くろんぼ',/かたわ(?!ら)/,'つんぼ','めくら','びつこ',/がいじ(?!ん)/,'れずびあん',/^おかま$|おかまやろう/,'ほもやろう','きもい',/^ぶす(ごう|号)?$|ぶすやろう/,
 // adult / illegal
 'ふうぞく','えんじょこうさい','ぱぱかつ','ぱぱ活','ままかつ','まま活','かくせいざい','おおあさ',
];
/* Latin words are matched as whole tokens, so cockpit, skill, grape and analog pass. */
export const BLOCKED_TOKENS=new Set(['sex','fuck','fuk','cock','dick','pussy','cunt','porn','porno','penis','vagina','boob','boobs','tits','anal','rape','blowjob','hentai','orgasm','slut','whore','bitch','asshole','shit','nigger','nigga','faggot','fag','retard','kill','murder','drug','drugs','weed','cocaine','nazi']);
/* Latin fragments that are unambiguous even inside longer words. */
export const BLOCKED_FRAGMENTS=['fuck','porn','nigg','fagg','blowjob','hentai','asshole'];
const contactPattern=/(https?:|www\.|\.com|\.jp|\.net|\.org|\.io\b|@|line ?id|discord|tiktok|instagram|twitter|youtube|snapchat|e-?mail|めーる|メール|でんわ|電話|じゅうしょ|住所)/i;

/* '' when the name may be shown publicly, 'blocked' for a listed word, 'contact' for contact details. */
export function nameIssue(value){
 const raw=String(value??'').normalize('NFKC'),normalized=normalizeName(raw);
 if(!normalized)return '';
 if(digitsOnly(raw).length>=7||contactPattern.test(raw)||/[\w.+-]+@[\w-]+\.[\w.-]+/.test(raw))return 'contact';
 for(const p of BLOCKED_PATTERNS)if(typeof p==='string'?normalized.includes(p):p.test(normalized))return 'blocked';
 const latin=normalized.replace(/[^a-z]/g,'');
 for(const f of BLOCKED_FRAGMENTS)if(latin.includes(f))return 'blocked';
 for(const t of latinTokens(raw))if(BLOCKED_TOKENS.has(t))return 'blocked';
 return '';
}
export const nameAllowed=value=>nameIssue(value)==='';
export const nameIssueMessage=issue=>issue==='contact'?'名前に電話番号・住所・メール・SNSなどの連絡先は入れられません。':issue==='blocked'?'この名前はランキングに載せられません。別の名前をつけてね。':'';
/* Shown in place of a stored name that fails the current check. */
export const HIDDEN_NAME='なまえのない飛行機';
export const publicName=value=>nameAllowed(value)?String(value??''):'';
