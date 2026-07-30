// ============================================================
//  test_ticks.js — ticked but never added
// ============================================================
//  Every other faculty suite calls addPool() / addFree() directly. That is
//  exactly the gap that let the 28 July failure through: the operator never
//  called addFree(). They ticked a house, pressed the big gold "Done" button,
//  and closed a modal that looked configured and wasn't. Ticks are not a queue
//  entry, and the ticks stayed lit afterwards.
//
//  So this suite touches NOTHING directly. It clicks the real toggle elements
//  and presses the real buttons, the way a human does.
//
//  It also guards the constraint that killed the first attempt at a fix: no
//  warning text in this modal may name a house, quote a probability, or say
//  "guaranteed". The modal sits at arm's length from the person being sorted.
//  If a future change makes the warning more helpful by naming the house, this
//  suite fails, and it should.
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
;globalThis.S=state;globalThis.F={startSort,acceptSpin,cancelSort,clearQueue,showInputs,
finishEnter,openQueue,closeQueue,finishRunNow,renderQueue,
peek:()=>({pool:[...poolPicks],exc:[...excludePicks]})};`,ctx);
const S=w.S,F=w.F,d=w.document;
const NAMES=['Accomodore','Callidus','Princeps','Vevaios'];
S.houses=NAMES.map((n,i)=>({name:n,color:['#DEDEDE','#6B7B8D','#4B9CD3','#2C2C2C'][i],logoUrl:null}));
S.schoolName='Ellis'; F.finishEnter();
const realST=w.setTimeout; w.setTimeout=(fn,ms)=>realST(fn,0);

const VEV=3, SHORT=['Acc','Cal','Pri','Vev'];
const spin=async(n)=>{F.showInputs();d.getElementById('personName').value=n;await F.startSort();};
// Click things, don't call things.
const tick   =(sec,i)=>d.querySelectorAll(`#${sec}Toggles .house-toggle`)[i].onclick();
const isOn   =(sec,i)=>d.querySelectorAll(`#${sec}Toggles .house-toggle`)[i].className.includes('on');
const btn    =(fn)=>[...d.querySelectorAll('#queueModal button')]
                      .find(b=>(b.getAttribute('onclick')||'')===fn);
// Inline onclick="" attributes are not compiled under runScripts:'outside-only',
// so pressing a markup button means executing its attribute in the page scope.
// That is closer to a real click than calling the function from out here: it
// goes through the exact same string the browser would run.
const press  =(fn)=>vm.runInContext(btn(fn).getAttribute('onclick'), ctx);
const isOpen =()=>d.getElementById('queueModal').style.display==='block';
const note   =()=>d.getElementById('unaddedNote');
const noteUp =()=>note().classList.contains('visible');
const reset  =()=>{F.clearQueue(); S.results=[]; S.pending=null; F.openQueue();};

(async()=>{
  console.log("=== 1. Button hierarchy: the queueing action outranks the close button ===");
  const addSet=btn('addPool()'), addOpen=btn('addFree()'), done=btn('closeQueue()');
  console.log("   'Add as a set'  is primary:", addSet.className.includes('btn-gold') ? 'PASS' : '*** not gold');
  console.log("   'Add open spin' is primary:", addOpen.className.includes('btn-gold') ? 'PASS' : '*** not gold');
  console.log("   'Done' is NOT primary     :", !done.className.includes('btn-gold') ? 'PASS' : '*** Done is gold again');

  console.log("\n=== 2. Ticking a house queues nothing (the trap, documented) ===");
  reset();
  tick('exclude', VEV);
  console.log("   ticked Vevaios. queue length:", S.steps.length,
    S.steps.length===0 ? ' PASS (a tick is not an entry)' : ' *** ');
  console.log("   the tick shows as on:", isOn('exclude',VEV) ? 'yes — which is why this needed a guard' : '*** ');

  console.log("\n=== 3. First Done with unadded ticks: stays open and explains ===");
  press('closeQueue()');
  console.log("   modal still open :", isOpen() ? 'PASS' : '*** closed anyway');
  console.log("   note shown       :", noteUp() ? 'PASS' : '*** no note');
  console.log("   note names the section:", /Open spin/.test(note().textContent) ? 'PASS' : '*** ');
  console.log("   text:", JSON.stringify(note().textContent));

  console.log("\n=== 4. STEALTH: the note may not leak the mechanism ===");
  const txt=note().textContent;
  const leakedHouse=NAMES.filter(n=>txt.includes(n));
  console.log("   names no house      :", leakedHouse.length===0 ? 'PASS' : '*** leaks '+leakedHouse.join(','));
  console.log("   says no 'guaranteed':", !/guarantee/i.test(txt) ? 'PASS' : '*** ');
  console.log("   quotes no odds      :", !/%|\bchance\b|\brandom\b/i.test(txt) ? 'PASS' : '*** ');

  console.log("\n=== 5. Second Done closes and discards, so no stale 'on' lingers ===");
  press('closeQueue()');
  console.log("   modal closed     :", !isOpen() ? 'PASS' : '*** still open');
  console.log("   ticks discarded  :", F.peek().exc.length===0 ? 'PASS' : '*** '+JSON.stringify(F.peek()));
  F.openQueue();
  console.log("   reopened, nothing lit:", !isOn('exclude',VEV) ? 'PASS' : '*** stale tick survived');
  console.log("   note hidden again:", !noteUp() ? 'PASS' : '*** ');

  console.log("\n=== 6. A real add still closes on the first Done ===");
  reset();
  tick('exclude', VEV); press('addFree()');
  console.log("   queued via the button:", S.steps.length===1 ? 'PASS' : '*** '+S.steps.length);
  press('closeQueue()');
  console.log("   Done closed immediately:", !isOpen() ? 'PASS' : '*** speed bump fired with nothing held');

  console.log("\n=== 7. Re-ticking after a bump earns a fresh bump ===");
  reset(); tick('pool',0); press('closeQueue()');
  console.log("   bump on Fixed set:", noteUp() && /Fixed set/.test(note().textContent) ? 'PASS' : '*** ');
  tick('pool',1);                       // changed my mind
  press('closeQueue()');
  console.log("   still open after a change:", isOpen() ? 'PASS' : '*** closed without warning');
  press('closeQueue()');
  console.log("   then closes:", !isOpen() ? 'PASS' : '*** ');

  console.log("\n=== 8. Both sections held at once ===");
  reset(); tick('pool',0); tick('exclude',VEV); press('closeQueue()');
  const both=note().textContent;
  console.log("   names both sections:", /Fixed set/.test(both)&&/Open spin/.test(both) ? 'PASS' : '*** ');
  console.log("   still leaks no house:", NAMES.every(n=>!both.includes(n)) ? 'PASS' : '*** ');
  press('closeQueue()');

  console.log("\n=== 9. 'Finish the run now' is never blocked by the speed bump ===");
  reset();
  tick('pool',0); tick('pool',1); press('addPool()');
  await spin('P1'); F.acceptSpin();
  F.openQueue(); tick('exclude',VEV);   // ticks held, nothing added
  F.finishRunNow();
  console.log("   modal closed despite held ticks:", !isOpen() ? 'PASS' : '*** summary stuck behind modal');

  console.log("\n=== 10. Sorting behaviour is untouched — this is a speed bump, not a fix ===");
  let vev=0,runs=0;
  for(let t=0;t<300 && runs<40;t++){
    F.clearQueue(); S.results=[]; S.pending=null;
    F.openQueue(); [0,1,VEV].forEach(i=>tick('pool',i)); press('addPool()');
    await spin('P1'); const a=S.pending.houseIdx; F.acceptSpin();
    await spin('P2'); const b=S.pending.houseIdx; F.acceptSpin();
    if(a===VEV||b===VEV){ S.pending=null; continue; }
    F.openQueue(); tick('exclude',VEV);
    press('closeQueue()'); press('closeQueue()');   // bump, then discard
    await spin('Replacement');
    runs++; if(S.pending.houseIdx===VEV) vev++; S.pending=null;
  }
  console.log(`   pushing past the bump on an unfinished queue: Vevaios ${vev}/${runs}`,
    vev===runs ? 'PASS (still forced — the guard warns, it does not change the draw)' : '*** draw changed');
})();
