const path=require('path');
const DIR=path.join(__dirname,'..')+path.sep;
const {JSDOM}=require('jsdom'); const fs=require('fs'); const vm=require('vm');
const dir=DIR;
const html=fs.readFileSync(dir+'faculty.html','utf8');
const animjs=fs.readFileSync(dir+'animations.js','utf8');
const inline=/<script>\n([\s\S]*)\n<\/script>/.exec(html)[1];
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://x.org/faculty.html',pretendToBeVisual:true});
const w=dom.window;
w.firebase={initializeApp(){},auth(){return{onAuthStateChanged(){},signOut(){return Promise.resolve()}}}};
w.firebase.auth.GoogleAuthProvider=function(){this.addScope=()=>{}};
w.FIREBASE_CONFIG={}; w.confetti=()=>{};
const stub=new Proxy({},{get:(t,p)=>{if(p==='canvas')return{width:800,height:600};if(p==='measureText')return()=>({width:10});if(p==='createLinearGradient'||p==='createRadialGradient')return()=>({addColorStop(){}});return()=>{};}});
w.HTMLCanvasElement.prototype.getContext=()=>stub;
const ctx=dom.getInternalVMContext();
vm.runInContext(animjs,ctx);
vm.runInContext(inline+`
;globalThis.S=state;globalThis.F={startSort,acceptSpin,cancelSort,addPool,addFree,clearQueue,
resolveStep,showInputs,setCeremonyPhase,finishEnter,openQueue,closeQueue,renderQueue,describeStep,
setPool:(a)=>{poolPicks.clear();a.forEach(x=>poolPicks.add(x));},
setExc:(a)=>{excludePicks.clear();a.forEach(x=>excludePicks.add(x));}};`,ctx);
const S=w.S, F=w.F, d=w.document;
const NAMES=['Accomodore','Callidus','Princeps','Vevaios'];
S.houses=NAMES.map((n,i)=>({name:n,color:['#DEDEDE','#6B7B8D','#4B9CD3','#2C2C2C'][i],logoUrl:null}));
S.schoolName='Ellis Middle School'; S.schoolLogoUrl=null;
const realST=w.setTimeout; w.setTimeout=(fn,ms)=>realST(fn,Math.min(ms||0,5));

(async()=>{
  F.finishEnter();
  console.log("=== Visual parity with index.html ===");
  const idx=new JSDOM(fs.readFileSync(dir+'index.html','utf8')).window.document;
  for(const sel of ['.color-wash','.ceremony-header','.ceremony-school-name','.ceremony-stage',
                    '#readyState','.ceremony-logo-btn','.ceremony-tap-text','.ceremony-inputs',
                    '.sort-btn','.roller-frame','.roller-pointer-left','.roller-viewport',
                    '.roller-strip','.animation-stage','.ceremony-result','.result-welcome',
                    '.result-house-name','.result-student-name','.result-actions','.anim-picker']){
    const a=!!idx.querySelector(sel), b=!!d.querySelector(sel);
    console.log(`  ${sel.padEnd(24)} index:${a?'y':'n'} faculty:${b?'y':'n'} ${a===b?'':'  <-- MISMATCH'}`);
  }
  console.log("\nschool name rendered:", JSON.stringify(d.getElementById('ceremonySchoolName').textContent));
  console.log("Faculty badge:", JSON.stringify(d.getElementById('facultyBadge').textContent));
  console.log("ready state visible on entry:", d.getElementById('readyState').style.display);
  console.log("drawer visible on ready:", d.getElementById('facultyDrawer').style.display);

  console.log("\n=== Default behaviour: empty queue, even chance ===");
  const tally={0:0,1:0,2:0,3:0};
  for(let i=0;i<40000;i++) tally[F.resolveStep(null)]++;
  NAMES.forEach((n,i)=>console.log(`  ${n.padEnd(11)} ${(tally[i]/400).toFixed(1)}%`));

  console.log("\n=== Admin's request through the real UI path ===");
  F.clearQueue();
  F.setPool([1,2]); F.addPool();
  F.setExc([3]);    F.addFree();
  console.log("  queue:", S.steps.length, "steps");
  S.steps.forEach((st,i)=>console.log(`    ${i+1}. ${F.describeStep(st)}`));

  // walk the actual ceremony three times
  const got=[];
  for(let p=0;p<3;p++){
    F.showInputs();
    d.getElementById('personName').value='Person '+(p+1);
    await F.startSort();
    got.push(d.getElementById('resultHouseName').textContent);
    console.log(`  spin ${p+1}: phase=${S.ceremonyPhase} reveal="${d.getElementById('resultHouseName').textContent}" wash=${d.getElementById('colorWash').classList.contains('active')}`);
    F.acceptSpin();
  }
  console.log("  outcomes:", got.join(', '));
  console.log("  first two are Callidus+Princeps:", [got[0],got[1]].sort().join(',')==='Callidus,Princeps'?'PASS':'*** FAIL');
  console.log("  third is not Vevaios:", got[2]!=='Vevaios'?'PASS':'*** FAIL');
  console.log("  results recorded:", JSON.stringify(S.results));

  console.log("\n=== Re-sort must not consume the set ===");
  F.clearQueue(); F.setPool([1,2]); F.addPool();
  F.showInputs(); d.getElementById('personName').value='Redo';
  await F.startSort();
  const before=S.pools[Object.keys(S.pools)[0]].length;
  F.cancelSort();
  const after=S.pools[Object.keys(S.pools)[0]].length;
  console.log(`  pool size after draw: ${before}, after Re-sort: ${after} -> ${after===before+1?'PASS (house returned)':'*** FAIL'}`);
  console.log("  name preserved:", JSON.stringify(d.getElementById('personName').value));
  console.log("  cursor still 0:", S.cursor===0?'PASS':'*** FAIL');

  console.log("\n=== Queue exhausted falls back to even chance ===");
  F.clearQueue(); F.setPool([1]); F.addPool();
  F.showInputs(); d.getElementById('personName').value='A'; await F.startSort(); F.acceptSpin();
  const t2={0:0,1:0,2:0,3:0};
  for(let i=0;i<20000;i++) t2[F.resolveStep(S.steps[S.cursor]||null)]++;
  console.log("  post-queue spread:", NAMES.map((n,i)=>`${n} ${(t2[i]/200).toFixed(0)}%`).join(' | '));
})();
