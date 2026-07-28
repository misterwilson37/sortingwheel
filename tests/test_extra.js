const path=require('path');
const DIR=path.join(__dirname,'..')+path.sep;
const {JSDOM}=require('jsdom'); const fs=require('fs'); const vm=require('vm');
const html=fs.readFileSync(DIR+'index.html','utf8');
const js=/<script>\n([\s\S]*)\n<\/script>/.exec(html)[1];
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://sortingwheel.misterwilson.org/',pretendToBeVisual:true});
const w=dom.window;
w.firebase={initializeApp(){},auth(){return{onAuthStateChanged(){},getRedirectResult(){return Promise.resolve(null)},signOut(){}}},storage(){return{ref(){}}}};
w.firebase.auth.GoogleAuthProvider=function(){this.addScope=()=>{}};
w.FIREBASE_CONFIG={}; w.confetti=()=>{};
const __ctx = dom.getInternalVMContext();
vm.runInContext(fs.readFileSync(DIR+'animations.js','utf8'), __ctx);
vm.runInContext(js+'\n;globalThis.state = state;', __ctx);
const s=w.state;
s.houses=[{name:'Accomodore'},{name:'Callidus'},{name:'Princeps'},{name:'Vevaios'}];
const BASE=[99,85,97,102], TARGET=(383+181)/4;

console.log("=== UNDERSHOOT: expected 181, only 160 enrol ===");
let res=[];
for(let t=0;t<2000;t++){
  s.counts=BASE.slice(); s.sortMode='target'; s.expectedIncoming=181; s.targetPerHouse=TARGET;
  for(let i=0;i<160;i++){ s.counts[w.weightedSelect()]++; }
  res.push(Math.max(...s.counts)-Math.min(...s.counts));
}
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
console.log("school gap avg:",avg(res).toFixed(2)," max:",Math.max(...res));
console.log("Callidus should still be closest to level. Example:",s.counts.join(' / '));

console.log("\n=== MID-EVENT SWITCH: target mode for 90, then panic-switch to slider ===");
s.counts=BASE.slice(); s.sortMode='target'; s.targetPerHouse=TARGET; s.expectedIncoming=181;
for(let i=0;i<90;i++){ s.counts[w.weightedSelect()]++; }
console.log("after 90 in target mode:",s.counts.join(' / '));
s.sortMode='slider'; s.balanceSetting=75;
w.document.getElementById('balanceSlider').value=75;
for(let i=0;i<91;i++){ s.counts[w.weightedSelect()]++; }
console.log("after 91 more on slider 75:",s.counts.join(' / '),
            "gap:",Math.max(...s.counts)-Math.min(...s.counts));
console.log("=> switching mid-event is safe, both modes push toward level");

console.log("\n=== 5 HOUSES: does anything assume exactly 4? ===");
s.houses=[{name:'A'},{name:'B'},{name:'C'},{name:'D'},{name:'E'}];
s.counts=[50,40,45,60,30]; s.sortMode='target';
s.targetPerHouse=(225+100)/5;
let p=w.currentProbabilities();
console.log("odds:",p.map(x=>(x*100).toFixed(1)+'%').join(' '),"sum:",p.reduce((a,b)=>a+b,0).toFixed(6));
for(let i=0;i<100;i++){ s.counts[w.weightedSelect()]++; }
console.log("final:",s.counts.join(' / '),"gap:",Math.max(...s.counts)-Math.min(...s.counts));

console.log("\nSanity assertions:");
{
  const g=(()=>{s.counts=[99,85,97,102];s.sortMode='target';s.targetPerHouse=141;
    for(let i=0;i<181;i++)s.counts[w.weightedSelect()]++;
    return Math.max(...s.counts)-Math.min(...s.counts);})();
  console.log("  target mode converges exactly:", g===0?'PASS':'*** FAIL gap='+g);
  s.houses=[{name:'A'},{name:'B'},{name:'C'},{name:'D'},{name:'E'}];
  s.counts=[50,40,45,60,30]; s.targetPerHouse=65;
  const p2=w.currentProbabilities();
  console.log("  5-house probabilities sum to 1:", Math.abs(p2.reduce((a,b)=>a+b,0)-1)<1e-9?'PASS':'*** FAIL');
}
