(function(root){
 const empty=()=>Array.from({length:8},()=>Array(8).fill(null));
 class MelodyStore{
  constructor(saved){this.patterns=empty();this.history=[];if(Array.isArray(saved))for(let i=0;i<8;i++)for(let beat=0;beat<8;beat++){const value=saved[i]?.[beat];if(value===null||Number.isInteger(value)&&value>=-1&&value<=96)this.patterns[i][beat]=value;}}
  set(instrument,beat,value){if(this.patterns[instrument][beat]===value)return false;this.remember();this.patterns[instrument][beat]=value;return true;}
  remember(){this.history.push(this.patterns.map(row=>[...row]));if(this.history.length>100)this.history.shift();}
  reset(instrument){if(this.patterns[instrument].every(x=>x===null))return false;this.remember();this.patterns[instrument].fill(null);return true;}
  undo(){if(!this.history.length)return false;this.patterns=this.history.pop();return true;}
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={MelodyStore};else root.MelodyStore=MelodyStore;
})(typeof window!=='undefined'?window:globalThis);
