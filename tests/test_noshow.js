// ============================================================
//  test_noshow.js — the live failure of 28 July 2026
// ============================================================
//  A three-person set was queued. The third person didn't show. A new
//  "any house EXCEPT Vevaios" open spin was added for the replacement.
//  She got Vevaios. Re-sort gave Vevaios again.
//
//  Cause: adding an entry APPENDS to the running queue — it does not start a
//  new one — so the abandoned third slot was still next in line. A set with
//  one house left is a 100% determined draw, so the replacement got the one
//  house that had just been ruled out, and Re-sort could not escape it.
//
//  The exclusion logic itself was never wrong, and this suite does not assert
//  on any UI. It asserts on WHICH QUEUE ENTRY RUNS, which is the thing that was
//  actually broken and the thing a future change could quietly alter.
//
//  Read section 1 before concluding "works on my machine". The house you get is
//  a coincidence on top of the bug; the wrong-entry-ran part is deterministic.
// ============================================================
const path=require('path');
const DIR=path.join(__dirname,'..')+path.sep;
const {JSDOM}=require('jsdom'); const fs=require('fs'); const vm=require('vm');
const html=fs.readFileSync(DIR+'faculty.html','utf8');
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://x.org/faculty.html',pretendToBeVisual:true});
const w=dom.window;
w.firebase={initializeApp(){},auth(){return{onAuthStateChanged(){},signOut(){return Promise.resolve()}}}};
w.firebase.auth.GoogleAuthProvider=function(){this.addScope=()=>{}};
w.FIREBASE_CONFIG={}; w.confetti=()=>{};
const stub=new Proxy({},{get:(t,p)=>{if(p==='canvas')return{width:800,height:600};if(p==='measureText')return()=>({width:10});if(p==='createLinearGradient'||p==='createRadialGradient')return()=>({addColorStop(){}});return()=>{};}});
w.HTMLCanvasElement.prototype.getContext=()=>stub;
const ctx=dom.getInternalVMContext();
vm.runInContext(fs.readFileSync(DIR+'animations.js','utf8'),ctx);
vm.runInContext(/<script>\n([\s\S]*)\n<\/script>/.exec(html)[1]+`
;globalThis.S=state;globalThis.F={startSort,acceptSpin,cancelSort,addPool,addFree,clearQueue,
showInputs,finishEnter,resolveStep,describeStep,renderQueue,removeStep,
setPool:(a)=>{poolPicks.clear();a.forEach(x=>poolPicks.add(x));},
setExc:(a)=>{excludePicks.clear();a.forEach(x=>excludePicks.add(x));}};`,ctx);
const S=w.S,F=w.F,d=w.document;
const NAMES=['Accomodore','Callidus','Princeps','Vevaios'];
S.houses=NAMES.map((n,i)=>({name:n,color:['#DEDEDE','#6B7B8D','#4B9CD3','#2C2C2C'][i],logoUrl:null}));
S.schoolName='Ellis'; F.finishEnter();
// Collapse animation timing. Honest timing puts this suite in the tens of minutes.
const realST=w.setTimeout; w.setTimeout=(fn,ms)=>realST(fn,0);

const VEV=3, SHORT=['Acc','Cal','Pri','Vev'];
const spin=async(n)=>{F.showInputs();d.getElementById('personName').value=n;await F.startSort();};
const reset=()=>{F.clearQueue(); S.results=[]; S.pending=null;};

// Jake's live shape: 3-house set, first two spun and confirmed, third a no-show.
// Only keep runs where the leftover really is Vevaios — the other two thirds of
// the time the leftover is harmless, which is exactly why hand-testing missed it.
async function setUpNoShow(){
  for(let attempt=0; attempt<400; attempt++){
    reset();
    F.setPool([0,1,VEV]); F.addPool();
    await spin('Person 1'); const a=S.pending.houseIdx; F.acceptSpin();
    await spin('Person 2'); const b=S.pending.houseIdx; F.acceptSpin();
    if(a===VEV||b===VEV) continue;
    return true;
  }
  return false;
}

(async()=>{
  let vev, T;

  console.log("=== 1. THE LUCK-FREE REPRO — no coincidence required ===");
  console.log("    set containing ONLY Vevaios (1 person), then an open spin excluding Vevaios.");
  vev=0; T=300;
  for(let t=0;t<T;t++){
    reset();
    F.setPool([VEV]); F.addPool();      // entry 1: set{Vevaios}
    F.setExc([VEV]); F.addFree();       // entry 2: anything BUT Vevaios
    await spin('someone');
    if(S.pending.houseIdx===VEV) vev++; S.pending=null;
  }
  console.log(`    Vevaios came out ${vev}/${T}:`,
    vev===T ? 'entry 1 ran, not entry 2. Deterministic.  PASS'
            : '*** entry 2 ran — queue order has changed, re-read this suite');
  console.log("    Do this by hand in a browser to settle any 'works on my machine'.");

  console.log("\n=== 2. CONTROL: exclusion is correct when the entry actually runs ===");
  vev=0; T=400;
  for(let t=0;t<T;t++){
    reset(); F.setExc([VEV]); F.addFree();
    await spin('X'); if(S.pending.houseIdx===VEV) vev++; S.pending=null;
  }
  console.log(`    fresh queue, one "not Vevaios" spin x${T}:`,
    vev===0 ? 'Vevaios never returned  PASS' : `*** Vevaios returned ${vev} times`);

  console.log("\n=== 3. Which entry runs after a no-show ===");
  if(!await setUpNoShow()) { console.log('    *** could not build the scenario'); return; }
  F.setExc([VEV]); F.addFree();
  const nextIsMine = S.cursor === S.steps.length - 1;
  console.log("    queue:", S.steps.map(x=>x.kind==='pool'?'set':'open').join(' > '), '| cursor', S.cursor);
  console.log("    the entry just added is the one that runs next:",
    nextIsMine ? '*** it is (queue order changed)' : 'no — it is at the back  PASS (documents the trap)');
  await spin('Replacement');
  const got=S.pending.houseIdx;
  console.log("    spinning gives:", SHORT[got],
    got===VEV ? '— the forced set house, NOT the open spin  PASS' : '*** set draw did not happen');
  F.cancelSort(); await spin('Replacement'); const again=S.pending.houseIdx;
  F.cancelSort(); await spin('Replacement'); const third=S.pending.houseIdx;
  console.log("    Re-sort x2:", SHORT[again], SHORT[third],
    (again===got&&third===got) ? '— forced, so Re-sort cannot escape it  PASS' : '*** not deterministic');
  S.pending=null;

  console.log("\n=== 4. Both existing escape hatches work ===");
  vev=0; T=200;
  for(let t=0;t<T;t++){
    if(!await setUpNoShow()) break;
    F.clearQueue();                     // "Clear queue" before adding
    F.setExc([VEV]); F.addFree();
    await spin('Replacement'); if(S.pending.houseIdx===VEV) vev++; S.pending=null;
  }
  console.log(`    Clear queue, then "not Vevaios" x${T}:`,
    vev===0 ? 'Vevaios never returned  PASS' : `*** Vevaios returned ${vev} times`);
  vev=0;
  for(let t=0;t<T;t++){
    if(!await setUpNoShow()) break;
    F.removeStep(S.cursor);             // Remove just the no-show's slot
    F.setExc([VEV]); F.addFree();
    await spin('Replacement'); if(S.pending.houseIdx===VEV) vev++; S.pending=null;
  }
  console.log(`    Remove the slot, then "not Vevaios" x${T}:`,
    vev===0 ? 'Vevaios never returned  PASS' : `*** Vevaios returned ${vev} times`);
})();
