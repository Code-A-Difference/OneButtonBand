
'use strict';
// Original, dependency-free Web Audio demo. Every part uses the same 8-beat loop.
const names=['Drums','Bass','Keys','Bells','Trumpet','Guitar','Flute','Shaker'];
const pads=[...document.querySelectorAll('.instrument')];
const $=id=>document.getElementById(id);
const beatSeconds=60/88;
const state={selected:Array(names.length).fill(false),running:false,muted:false,scan:true,scanIndex:0,volume:.35,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches};
let ctx,master,compressor,buffers=[],sources=[],gains=[],loopDuration=0,epoch=0,scanTimer,renderFrame,lastBeat=-1,actionVersion=0,initPromise;
const pendingUntil=Array(names.length).fill(0);
let savedMelodies;try{savedMelodies=JSON.parse(localStorage.getItem('cad-band-melodies-v1'));}catch{}
const melodies=new MelodyStore(savedMelodies);
const editor={open:true,screen:'instrument',instrument:0,beat:0};
$('motion').checked=state.motion;
function announce(text){$('announcement').textContent=text;}
function fail(error){$('error').hidden=false;$('error').textContent='Sound could not start. Try Play again, or open this file in an updated Chrome, Safari or Firefox browser.';console.error(error);}
function makeBuffer(kind){
 const length=Math.round(ctx.sampleRate*beatSeconds*8),buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0),rate=ctx.sampleRate;
 let seed=173+kind;const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/2147483648-1;};
 let custom=false;
 function add(at,duration,sound){const beat=Math.floor(at/beatSeconds+.00001);if(!custom&&melodies.patterns[kind][beat]!==null)return;const offset=Math.round(at*rate),n=Math.round(duration*rate);for(let j=0;j<n;j++){const t=j/rate;data[(offset+j)%length]+=sound(t,j);}}
 function note(midi,beat,duration,amp,timbre){const hz=440*2**((midi-69)/12);add(beat*beatSeconds,duration,(t)=>{const attack=Math.min(1,t/.012),release=Math.min(1,Math.max(0,(duration-t)/.08)),env=attack*release*Math.exp(-t*(timbre==='bell'?3.2:1.7));let tone=Math.sin(2*Math.PI*hz*t);if(timbre==='bass')tone+=.20*Math.sin(4*Math.PI*hz*t);if(timbre==='keys')tone+=.18*Math.sin(4*Math.PI*hz*t);if(timbre==='bell')tone+=.30*Math.sin(2*Math.PI*hz*2.006*t);
 if(timbre==='trumpet'){tone=0;for(let h=1;h<=7;h++)tone+=Math.sin(2*Math.PI*hz*h*t)/Math.pow(h,1.2);tone*=Math.min(1,t/.055)*(1+.025*Math.sin(2*Math.PI*5*t));}
 if(timbre==='guitar')tone=(tone+.45*Math.sin(4*Math.PI*hz*t)+.22*Math.sin(6*Math.PI*hz*t))*Math.exp(-t*6);
 if(timbre==='flute')tone=(Math.sin(2*Math.PI*hz*t+.025*Math.sin(2*Math.PI*5*t))+.08*Math.sin(4*Math.PI*hz*t))*Math.min(1,t/.06);return amp*env*tone;});}
 if(kind===0){
  [0,1.5,2,3.5,4,5.5,6,7.5].forEach(b=>add(b*beatSeconds,.32,t=>.39*Math.exp(-t*15)*Math.sin(2*Math.PI*(48*t+80*(1-Math.exp(-t*30))/30))));
  [1,3,5,7].forEach(b=>add(b*beatSeconds,.14,t=>.13*Math.exp(-t*25)*(noise()*.78+Math.sin(2*Math.PI*180*t)*.22)));
  for(let b=0;b<8;b+=.5)add(b*beatSeconds,.055,t=>noise()*.055*Math.exp(-t*70));
 }else if(kind===1){[36,36,43,43,41,41,43,43].forEach((m,i)=>note(m,i,.38,.19,'bass'));}
 else if(kind===2){[[60,64,67],[60,65,69]].forEach((chord,bar)=>[0,1.5,3].forEach(b=>chord.forEach(m=>note(m,bar*4+b,.65,.065,'keys'))));}
 else if(kind===3){[[72,0],[76,1],[79,2],[76,3],[77,4],[81,5],[79,6],[74,7]].forEach(([m,b])=>note(m,b,.70,.15,'bell'));}
 else if(kind===4){[[67,0],[72,1.5],[76,2.5],[74,4],[72,5.5],[67,7]].forEach(([m,b])=>note(m,b,.42,.09,'trumpet'));}
 else if(kind===5){[0,.75,1.5,2.75,4,4.75,5.5,6.75].forEach((b,i)=>note([60,64,67,72,65,69,72,77][i],b,.46,.14,'guitar'));}
 else if(kind===6){[[79,.5],[76,2],[74,3.5],[77,4.5],[81,6],[79,7]].forEach(([m,b])=>note(m,b,.55,.13,'flute'));}
 else if(kind===7){for(let b=.25;b<8;b+=.5)add(b*beatSeconds,.09,t=>noise()*.07*Math.exp(-t*42)*Math.min(1,t/.005));}
 custom=true;
 melodies.patterns[kind].forEach((value,beat)=>{
  if(value===null||value===-1)return;
  if(kind===0){
   if(value===0)add(beat*beatSeconds,.32,t=>.39*Math.exp(-t*15)*Math.sin(2*Math.PI*(48*t+80*(1-Math.exp(-t*30))/30)));
   else if(value===1)add(beat*beatSeconds,.14,t=>.13*Math.exp(-t*25)*(noise()*.78+Math.sin(2*Math.PI*180*t)*.22));
   else add(beat*beatSeconds,.055,t=>noise()*.075*Math.exp(-t*70));
  }else if(kind===7)add(beat*beatSeconds,.09,t=>noise()*.07*Math.exp(-t*42)*Math.min(1,t/.005));
  else note(value,beat,kind===3?.70:kind===6?.55:.46,[0,.19,.14,.15,.09,.14,.13][kind],['','bass','keys','bell','trumpet','guitar','flute'][kind]);
 });
 return buffer;
}
async function ensureAudio(){
 if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Web Audio is unavailable.');ctx=new Audio();master=ctx.createGain();master.gain.value=0;compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-14;compressor.ratio.value=4;compressor.attack.value=.005;compressor.release.value=.15;compressor.connect(master);master.connect(ctx.destination);buffers=names.map((_,i)=>makeBuffer(i));loopDuration=buffers[0].duration;}
 if(ctx.state!=='running')await ctx.resume();
 if(ctx.state!=='running')throw new Error('Audio did not resume.');
}
function targetVolume(){return state.muted?0:state.volume;}
function applyVolume(){if(master){master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setTargetAtTime(state.running?targetVolume():0,ctx.currentTime,.015);}}
async function startBand(){
 const version=++actionVersion;
 try{
  if(!initPromise)initPromise=ensureAudio().finally(()=>{initPromise=null;});
  await initPromise;if(version!==actionVersion||document.hidden)return;
  if(state.running)return;
  $('error').hidden=true;epoch=ctx.currentTime+.06;sources=[];gains=[];
  buffers.forEach((buffer,i)=>{const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=state.selected[i]?1:0;source.connect(gain);gain.connect(compressor);source.start(epoch);sources.push(source);gains.push(gain);pendingUntil[i]=0;});
  state.running=true;lastBeat=-1;applyVolume();draw();paint();announce('Your band is playing.');
 }catch(error){state.running=false;fail(error);paint();}
}
function stopBand(message='Paused. Your sounds are saved.'){
 actionVersion++;state.running=false;if(ctx){applyVolume();sources.forEach(source=>{try{source.stop(ctx.currentTime+.045);}catch{}source.onended=()=>source.disconnect();});}sources=[];gains=[];pendingUntil.fill(0);cancelAnimationFrame(renderFrame);lastBeat=-1;document.querySelectorAll('.beat').forEach(el=>el.classList.remove('on'));pads.forEach(el=>el.classList.remove('playing'));paint();if(message)announce(message);
}
function toggleTrack(i){
 state.selected[i]=!state.selected[i];
 if(state.running){const now=ctx.currentTime,beat=loopDuration/8,when=epoch+Math.max(0,Math.ceil((now+.025-epoch)/beat))*beat;const gain=gains[i].gain;gain.cancelScheduledValues(now);gain.setValueAtTime(gain.value,now);gain.setTargetAtTime(state.selected[i]?1:0,when,.015);pendingUntil[i]=when;announce(names[i]+(state.selected[i]?' joins on the next beat.':' stops on the next beat.'));}
 else if(state.selected[i])startBand();
 paint();if(state.scan)restartScan();
}
function playPause(){if(state.running)stopBand();else{if(!state.selected.some(Boolean))state.selected=names.map((_,i)=>i<2);paint();startBand();}}
function clearBand(){stopBand('Band cleared. Choose a sound to start again.');state.selected.fill(false);paint();if(state.scan)restartScan();}
function draw(){
 if(!state.running)return;const now=ctx.currentTime,beat=Math.floor(Math.max(0,now-epoch)/(loopDuration/8))%8;
 if(beat!==lastBeat){lastBeat=beat;document.querySelectorAll('.beat').forEach((el,i)=>el.classList.toggle('on',state.motion&&i===beat));pads.forEach((el,i)=>el.classList.toggle('playing',state.motion&&state.selected[i]&&beat%2===0));}
 let changed=false;pendingUntil.forEach((t,i)=>{if(t&&now>=t){pendingUntil[i]=0;changed=true;}});if(changed)paint();renderFrame=requestAnimationFrame(draw);
}
function scanText(index){if(index<names.length)return(state.selected[index]?'Remove ':'Add ')+names[index].toLowerCase();if(index===names.length)return state.running?'Pause the band':'Play the band';return'Clear the band';}
function paint(){
 const count=state.selected.filter(Boolean).length;
 pads.forEach((pad,i)=>{pad.setAttribute('aria-pressed',String(state.selected[i]));pad.setAttribute('aria-label',names[i]+(state.selected[i]?', selected':', off'));pad.querySelector('.state-text').textContent=pendingUntil[i]?'Next beat…':state.selected[i]?(state.running?'Playing · tap to remove':'Ready · tap to remove'):'Tap to add';});
 $('play').textContent=state.running?'Pause band':count?'Resume band':'Play a little mix';
 $('stage-copy').textContent=state.running?(count?count+(count===1?' sound, your rhythm.':' sounds, one happy band.'):'A little quiet.'):count?'Taking a pause.':'Your band is ready.';
 $('stage-caption').textContent=state.running?(state.muted||state.volume===0?'Sound is off. Your band is still playing.':count?'Every sound follows the same beat.':'Choose a sound whenever you’re ready.'):count?'Your sounds are saved. Resume whenever you like.':'Choose any sound. There’s no wrong combination.';
 $('mute').textContent=state.muted?'Unmute':'Mute';$('mute').setAttribute('aria-pressed',String(state.muted));$('volume-out').textContent=Math.round(state.volume*100)+'%';document.body.classList.toggle('quiet',!state.motion);
 if($('editor-preview'))$('editor-preview').textContent=state.running?'Pause preview':'Preview with the band';
 updateScan();
}
function noteChoices(instrument){
 const common=[{label:'Original',value:null},{label:'Rest',value:-1}];
 if(instrument===0)return [...common,{label:'Kick',value:0},{label:'Snare',value:1},{label:'Hi-hat',value:2}];
 if(instrument===7)return [...common,{label:'Shaker hit',value:0}];
 const base=instrument===1?36:[3,6].includes(instrument)?72:60;
 return [...common,...[0,2,4,5,7,9,11,12].map((offset,index)=>({label:['C','D','E','F','G','A','B','C'][index]+(Math.floor((base+offset)/12)-1),value:base+offset}))];
}
function valueLabel(instrument,value){return noteChoices(instrument).find(choice=>choice.value===value)?.label||'Original';}
function refreshMelodies(message){
 stopBand('');if(ctx)buffers=names.map((_,i)=>makeBuffer(i));
 try{localStorage.setItem('cad-band-melodies-v1',JSON.stringify(melodies.patterns));$('editor-status').textContent=message+' Saved in this browser.';}
 catch{$('editor-status').textContent=message+' Browser storage is unavailable; keep this page open to retain your changes.';}
 announce(message);
}
function renderEditor(scanIndex=0){
 $('melody-editor').hidden=!editor.open;$('edit-melodies').setAttribute('aria-expanded',String(editor.open));$('edit-melodies').textContent=editor.open?'Close melody editor':'Edit melodies';
 const area=$('editor-choices');area.replaceChildren();
 $('editor-title').textContent=editor.screen==='instrument'?'Choose an instrument to edit':editor.screen==='step'?names[editor.instrument]+': choose a beat':names[editor.instrument]+': beat '+(editor.beat+1)+' — choose a sound';
 const choices=editor.screen==='instrument'?names.map((label,i)=>({label,run:()=>{editor.instrument=i;editor.screen='step';renderEditor();}})):
  editor.screen==='step'?Array.from({length:8},(_,beat)=>({label:'Beat '+(beat+1)+' · '+valueLabel(editor.instrument,melodies.patterns[editor.instrument][beat]),run:()=>{editor.beat=beat;editor.screen='note';renderEditor();}})):
  noteChoices(editor.instrument).map(choice=>({label:choice.label,pressed:melodies.patterns[editor.instrument][editor.beat]===choice.value,run:()=>{
   if(melodies.set(editor.instrument,editor.beat,choice.value))refreshMelodies(names[editor.instrument]+', beat '+(editor.beat+1)+': '+choice.label+'.');
   editor.screen='step';renderEditor((editor.beat+1)%8);
  }}));
 for(const choice of choices){const button=document.createElement('button');button.type='button';button.className='melody-choice';button.textContent=choice.label;if(choice.pressed!==undefined)button.setAttribute('aria-pressed',String(choice.pressed));button.addEventListener('click',choice.run);area.append(button);}
 $('editor-preview').hidden=editor.screen==='instrument';$('editor-reset').hidden=editor.screen==='instrument';$('editor-back').hidden=editor.screen==='instrument';
 $('editor-back').textContent=editor.screen==='note'?'Back to beats':'Choose another instrument';
 $('editor-reset').textContent='Reset '+names[editor.instrument]+' melody';$('editor-undo').disabled=!melodies.history.length;
 $('editor-preview').textContent=state.running?'Pause preview':'Preview with the band';
 state.scanIndex=scanIndex;updateScan();restartScan();
 if(editor.open){$('pick').querySelector('small').textContent='Press Space or Enter, or tap here to choose the highlighted edit';announce($('editor-title').textContent);if(!state.scan)area.querySelector('button')?.focus();}
 else $('pick').querySelector('small').textContent='Press Space or Enter, or tap here to select';
}
function openEditor(){stopBand('');editor.open=true;editor.screen='instrument';renderEditor();if(state.scan)$('pick').focus();else $('editor-choices').querySelector('button').focus();}
function closeEditor(){editor.open=false;renderEditor();if(state.scan)$('pick').focus();else $('edit-melodies').focus();announce('Melody editor closed.');}
function scanChoices(){return editor.open?[...$('editor-choices').querySelectorAll('button'),...$('editor-actions').querySelectorAll('button:not([hidden])')].filter(button=>!button.disabled):[...pads,$('play'),$('clear'),$('edit-melodies')];}
function updateScan(){
 document.querySelectorAll('.scanned').forEach(el=>el.classList.remove('scanned'));
 const choices=scanChoices();state.scanIndex=state.scanIndex%Math.max(1,choices.length);const current=choices[state.scanIndex];
 if(current&&state.scan)current.classList.add('scanned');
 const label=current?(editor.open?current.getAttribute('aria-label')||current.textContent:state.scanIndex<names.length?scanText(state.scanIndex):current.textContent):'Choose an action';
 $('pick-label').textContent=label;$('pick').setAttribute('aria-label',label+'. Press Space or Enter, or tap to select.');
}
function restartScan(){clearTimeout(scanTimer);if(state.scan&&!document.hidden)scanTimer=setTimeout(()=>{state.scanIndex=(state.scanIndex+1)%Math.max(1,scanChoices().length);updateScan();restartScan();},Number($('scan-speed').value));}
function selectScan(){if(!state.scan)return;const choice=scanChoices()[state.scanIndex];if(choice)choice.click();updateScan();restartScan();if(state.scan)$('pick').focus({preventScroll:true});}
pads.forEach((pad,i)=>pad.addEventListener('click',()=>toggleTrack(i)));
$('play').addEventListener('click',playPause);$('clear').addEventListener('click',clearBand);
$('edit-melodies').addEventListener('click',()=>editor.open?closeEditor():openEditor());
$('editor-back').addEventListener('click',()=>{editor.screen=editor.screen==='note'?'step':'instrument';renderEditor();});
$('editor-close').addEventListener('click',closeEditor);
$('editor-preview').addEventListener('click',()=>{if(state.running)stopBand();else{state.selected[editor.instrument]=true;startBand();}renderEditor();});
$('editor-undo').addEventListener('click',()=>{if(melodies.undo())refreshMelodies('Last melody change undone.');renderEditor();});
$('editor-reset').addEventListener('click',()=>{if(melodies.reset(editor.instrument))refreshMelodies(names[editor.instrument]+' melody reset to its original pattern.');renderEditor();});
$('mute').addEventListener('click',()=>{state.muted=!state.muted;applyVolume();paint();announce(state.muted?'Sound muted.':'Sound unmuted.');});
$('volume').addEventListener('input',event=>{state.volume=Number(event.target.value)/100;applyVolume();paint();});
$('motion').addEventListener('change',event=>{state.motion=event.target.checked;lastBeat=-1;paint();if(!state.motion){document.querySelectorAll('.beat').forEach(el=>el.classList.remove('on'));pads.forEach(el=>el.classList.remove('playing'));}});
$('scan-toggle').addEventListener('click',()=>{state.scan=!state.scan;state.scanIndex=0;$('scan-toggle').setAttribute('aria-checked',String(state.scan));$('scan-state').textContent=state.scan?'Deactivate one-button mode':'Activate one-button mode';$('scan-panel').hidden=!state.scan;updateScan();restartScan();if(state.scan){$('pick').focus();announce('One-button mode on. Press Space or Enter to choose the highlighted action.');}else announce('One-button mode off.');});
$('pick').addEventListener('click',selectScan);
$('scan-speed').addEventListener('input',()=>{
 const seconds=Number($('scan-speed').value)/1000;
 const label=seconds+(seconds===1?' second':' seconds');
 $('scan-speed-out').textContent=label;$('scan-speed').setAttribute('aria-valuetext',label);restartScan();
});
document.addEventListener('keydown',event=>{
 if(event.ctrlKey||event.altKey||event.metaKey)return;
 const tag=event.target.tagName;if(['INPUT','SELECT','TEXTAREA'].includes(tag)||event.target.isContentEditable)return;
 const switchKey=event.code==='Space'||event.key==='Enter';
 if(state.scan&&switchKey){event.preventDefault();if(!event.repeat)selectScan();return;}
 if(event.repeat)return;
 if(event.key==='Escape'){event.preventDefault();stopBand();}
 else if(/^[1-8]$/.test(event.key)){event.preventDefault();toggleTrack(Number(event.key)-1);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(state.running)stopBand('Paused while you were away. Press Resume to play again.');clearTimeout(scanTimer);}else restartScan();});
window.addEventListener('pagehide',()=>stopBand(''));
paint();
renderEditor();
