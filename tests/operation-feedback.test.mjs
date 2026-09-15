import test from 'node:test';
import assert from 'node:assert/strict';
import {isModeDoubleTap,modeColor} from '../src/operation-feedback.js';
test('double taps require the same stone, nearby location, pointer kind and a short positive interval',()=>{
 const first={index:3,x:100,y:100,time:1000,type:'touch'};
 assert(isModeDoubleTap(first,{...first,time:1250,x:110}));
 for(const change of [{index:4},{time:1321},{time:999},{x:130},{type:'mouse'}])assert(!isModeDoubleTap(first,{...first,time:1200,...change}));
 assert(!isModeDoubleTap(null,first));assert.notEqual(modeColor('+'),modeColor('×'));
});
