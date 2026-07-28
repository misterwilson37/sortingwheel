const path=require('path');
const DIR=path.join(__dirname,'..')+path.sep;
const {JSDOM}=require('jsdom'); const fs=require('fs'); const vm=require('vm');
const dir=DIR;
const html=fs.readFileSync(dir+'faculty.html','utf8');
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://x.org/faculty.html',pretendToBeVisual:true});
const w=dom.window;
w.firebase={initializeApp(){},auth(){return{onAuthStateChanged(){},signOut(){return Promise.resolve()}}}};
w.firebase.auth.GoogleAuthProvider=function(){this.addScope=()=>{}};
w.FIREBASE_CONFIG={}; let confettiCalls=0; w.confetti=()=>{confettiCalls++;};
const stub=new Proxy({},{get:(t,p)=>{if(p==='canvas')return{width:800,height:600};if(p==='measureText')return()=>({width:10});if(p==='createLinearGradient'||p==='createRadialGradient')return()=>({addColorStop(){}});return()=>{};}});
w.HTMLCanvasElement.prototype.getContext=()=>stub;
const ctx=dom.getInternalVMContext();
vm.runInContext(fs.readFileSync(dir+'animations.js','utf8'),ctx);
vm.runInContext(/<script>\n([\s\S]*)\n<\/script>/.exec(html)[1]+`
;globalThis.S=state;globalThis.F={startSort,acceptSpin,cancelSort,addPool,addFree,clearQueue,
showInputs,finishEnter,closeSummary,resolveStep,
setPool:(a)=>{poolPicks.clear();a.forEach(x=>poolPicks.add(x));},
setExc:(a)=>{excludePicks.clear();a.forEach(x=>excludePicks.add(x));}};`,ctx);
const S=w.S,F=w.F,d=w.document;
const NAMES=['Accomodore','Callidus','Princeps','Vevaios'];
S.houses=NAMES.map((n,i)=>({name:n,color:['#DEDEDE','#6B7B8D','#4B9CD3','#2C2C2C'][i],logoUrl:null}));
S.schoolName='Ellis Middle School';
const realST=w.setTimeout; w.setTimeout=(fn,ms)=>realST(fn,Math.min(ms||0,5));

async function spin(name){
  F.showInputs();
  d.getElementById('personName').value=name;
  await F.startSort();
  F.acceptSpin();
}
const summaryVisible=()=>d.getElementById('summaryState').classList.contains('visible');

(async()=>{
  F.finishEnter();

  console.log("=== 1. Ad-hoc spins with NO queue must never show the summary ===");
  F.clearQueue();
  for(const n of ['Walk-up A','Walk-up B']) await spin(n);
  console.log("   summary shown:", summaryVisible()?'*** YES, WRONG':'no  PASS');
  console.log("   phase:", S.ceremonyPhase);

  console.log("\n=== 2. Defined queue: summary appears on the LAST spin only ===");
  F.clearQueue(); S.results=[];
  F.setPool([1,2]); F.addPool();     // Callidus + Princeps
  F.setExc([3]);    F.addFree();     // not Vevaios
  confettiCalls=0;
  for(let i=1;i<=3;i++){
    await spin('Person '+i);
    console.log(`   after spin ${i}: phase=${S.ceremonyPhase.padEnd(7)} summary=${summaryVisible()?'SHOWN':'hidden'}`);
  }
  const rows=[...d.querySelectorAll('#summaryList .summary-row')];
  console.log("   summary rows:", rows.length);
  rows.forEach(r=>console.log("     ", r.querySelector('.summary-person').textContent,
                              '->', r.querySelector('.summary-house').textContent));
  console.log("   title:", JSON.stringify(d.getElementById('summaryTitle').textContent));
  console.log("   group confetti fired:", confettiCalls>0?'yes':'*** no');
  console.log("   ready state hidden behind summary:", d.getElementById('readyState').style.display);
  console.log("   drawer hidden during summary:", d.getElementById('facultyDrawer').style.display);

  console.log("\n=== 3. Done returns to ready, and spins are even again ===");
  F.closeSummary();
  console.log("   phase:", S.ceremonyPhase, "| summary:", summaryVisible()?'*** still shown':'hidden');
  console.log("   drawer back:", d.getElementById('facultyDrawer').style.display);
  const t={0:0,1:0,2:0,3:0};
  for(let i=0;i<20000;i++) t[F.resolveStep(S.steps[S.cursor]||null)]++;
  console.log("   spread now:", NAMES.map((n,i)=>`${n} ${(t[i]/200).toFixed(0)}%`).join(' | '));

  console.log("\n=== 4. A group is everyone since the last celebration ===");
  F.clearQueue(); S.results=[];
  await spin('Early bird');            // no queue yet
  F.setPool([1,2]); F.addPool();
  await spin('Queued 1'); await spin('Queued 2');
  const rows2=[...d.querySelectorAll('#summaryList .summary-row')].map(r=>r.querySelector('.summary-person').textContent);
  console.log("   summary lists:", rows2.join(', '));
  // Group model: no celebration happened between the walk-up and the queue,
  // so they are all one group and all get celebrated together.
  console.log("   includes the earlier walk-up:", rows2.includes('Early bird')?'PASS':'*** FAIL');
  console.log("   includes both queued:", rows2.includes('Queued 1')&&rows2.includes('Queued 2')?'PASS':'*** FAIL');

  console.log("\n=== 5. Single-spin queue uses singular wording ===");
  F.closeSummary(); F.clearQueue(); S.results=[];
  F.setExc([3]); F.addFree();
  await spin('Solo');
  console.log("   title:", JSON.stringify(d.getElementById('summaryTitle').textContent));

  console.log("\n=== 6. Re-sort on the final queued spin must NOT trigger the summary ===");
  F.closeSummary(); F.clearQueue(); S.results=[];
  F.setPool([1,2]); F.addPool();
  await spin('P1');
  F.showInputs(); d.getElementById('personName').value='P2';
  await w.F.startSort();
  F.cancelSort();
  console.log("   summary after Re-sort:", summaryVisible()?'*** SHOWN, WRONG':'hidden  PASS');
  console.log("   phase:", S.ceremonyPhase, "| cursor:", S.cursor, "of", S.steps.length);
})();
