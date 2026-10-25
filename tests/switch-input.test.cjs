const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
function keyboardHarness(){
 const source=readFileSync(join(__dirname,'../app.js'),'utf8');
 const start=source.indexOf("document.addEventListener('keydown'");
 const end=source.indexOf("document.addEventListener('visibilitychange'",start);
 const handlers={};let selections=0;
 const context={state:{scan:true},document:{body:{},documentElement:{},addEventListener:(name,callback)=>handlers[name]=callback},selectScan:()=>selections++,stopBand:()=>{},toggleTrack:()=>{}};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 return {context,press:(key,target={tagName:'BUTTON'})=>{let prevented=false;handlers.keydown({key,code:key===' '?'Space':key,target,preventDefault:()=>prevented=true});return {selections,prevented};}};
}
test('Space selects the scanned edit while another button has focus',()=>{const harness=keyboardHarness();const result=harness.press(' ');assert.equal(result.selections,1);assert.equal(result.prevented,true);});
test('Enter selects the scanned edit without requiring Tab',()=>{const harness=keyboardHarness();const result=harness.press('Enter');assert.equal(result.selections,1);assert.equal(result.prevented,true);});
test('text fields and disabled scanning retain native keyboard behavior',()=>{const harness=keyboardHarness();assert.equal(harness.press('Enter',{tagName:'INPUT'}).selections,0);harness.context.state.scan=false;assert.equal(harness.press('Enter').selections,0);});
