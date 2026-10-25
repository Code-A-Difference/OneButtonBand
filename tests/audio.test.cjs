const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const {join}=require('node:path');
const {MelodyStore}=require('../melodies.js');
test('all eight instruments produce distinct finite audio on the same loop',()=>{
 const source=readFileSync(join(__dirname,'../app.js'),'utf8');
 const body=source.slice(source.indexOf('function makeBuffer(kind)'),source.indexOf('async function ensureAudio'));
 const context={melodies:new MelodyStore(),beatSeconds:60/88,ctx:{sampleRate:8000,createBuffer:(_,length,rate)=>{const samples=new Float32Array(length);return {duration:length/rate,getChannelData:()=>samples};}}};
 vm.createContext(context);vm.runInContext(body,context);
 const buffers=Array.from({length:8},(_,i)=>context.makeBuffer(i));
 for(const buffer of buffers){const samples=buffer.getChannelData(0);assert.equal(buffer.duration,buffers[0].duration);assert.ok(samples.some(x=>Math.abs(x)>.01));assert.ok(samples.every(Number.isFinite));}
 for(let i=0;i<buffers.length;i++)for(let j=i+1;j<buffers.length;j++)assert.notDeepEqual(buffers[i].getChannelData(0),buffers[j].getChannelData(0));
 // An all-rest edit must silence every part, including fractional drum hits.
 for(let i=0;i<8;i++){context.melodies.patterns[i].fill(-1);assert.ok(context.makeBuffer(i).getChannelData(0).every(x=>x===0));}
 // A chosen note/hit produces sound again for every instrument.
 for(let i=0;i<8;i++){context.melodies.set(i,0,i===0||i===7?0:60);const samples=context.makeBuffer(i).getChannelData(0);assert.ok(samples.some(x=>Math.abs(x)>.01));assert.ok(samples.every(Number.isFinite));}
});
