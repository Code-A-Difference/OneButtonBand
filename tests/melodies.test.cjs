const {test}=require('node:test');
const assert=require('node:assert/strict');
const {MelodyStore}=require('../melodies.js');
test('edits only the chosen beat and undo restores its previous note',()=>{const store=new MelodyStore();store.set(4,2,67);store.set(4,2,-1);assert.equal(store.patterns[4][2],-1);assert.equal(store.patterns[4][1],null);assert.equal(store.patterns[3][2],null);store.undo();assert.equal(store.patterns[4][2],67);store.undo();assert.equal(store.patterns[4][2],null);});
test('reset restores the original instrument and can be undone',()=>{const store=new MelodyStore();store.set(0,0,1);store.set(1,0,36);store.reset(0);assert.equal(store.patterns[0][0],null);assert.equal(store.patterns[1][0],36);store.undo();assert.equal(store.patterns[0][0],1);});
test('saved patterns restore valid choices and reject malformed notes',()=>{const store=new MelodyStore([[1,-1,999,'bad',null]]);assert.deepEqual(store.patterns[0],[1,-1,null,null,null,null,null,null]);assert.equal(store.patterns.length,8);});
