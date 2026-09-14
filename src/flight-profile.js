export const flightName=value=>typeof value==='string'?[...value.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').trim()].slice(0,20).join(''):'';
export const flightDesign=s=>Object.fromEntries(['paint','wing','propeller','decoration'].map(k=>[k,Number.isInteger(s?.[k])&&s[k]>=0&&s[k]<=2?s[k]:0]));
export const identity=value=>value&&/^[a-f0-9]{64}$/.test(value.key)?{key:value.key,uid:typeof value.uid==='string'&&/^[a-f0-9-]{36}$/.test(value.uid)?value.uid:''}:null;
