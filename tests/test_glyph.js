const path=require('path');
const DIR=path.join(__dirname,'..')+path.sep;
const {JSDOM}=require('jsdom'); const fs=require('fs'); const vm=require('vm');
const dir=DIR;
const html=fs.readFileSync(dir+'faculty.html','utf8');
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://x.org/faculty.html',pretendToBeVisual:true});
const w=dom.window;
w.firebase={initializeApp(){},auth(){return{onAuthStateChanged(){},signOut(){return Promise.resolve()}}}};
w.firebase.auth.GoogleAuthProvider=function(){this.addScope=()=>{}};
w.FIREBASE_CONFIG={}; w.confetti=()=>{};
const stub=new Proxy({},{get:(t,p)=>{if(p==='canvas')return{width:800,height:600};if(p==='measureText')return()=>({width:10});if(p==='createLinearGradient'||p==='createRadialGradient')return()=>({addColorStop(){}});return()=>{};}});
w.HTMLCanvasElement.prototype.getContext=()=>stub;
const ctx=dom.getInternalVMContext();
vm.runInContext(fs.readFileSync(dir+'animations.js','utf8'),ctx);
vm.runInContext(/<script>\n([\s\S]*)\n<\/script>/.exec(html)[1]+`
;globalThis.S=state;globalThis.F={startSort,acceptSpin,cancelSort,addPool,addFree,clearQueue,
showInputs,finishEnter,closeSummary,resolveStep,queueGlyphSVG,updateQueueGlyph,renderQueue,
toggleQueuePause,finishRunNow,runActive,
setPool:(a)=>{poolPicks.clear();a.forEach(x=>poolPicks.add(x));},
setExc:(a)=>{excludePicks.clear();a.forEach(x=>excludePicks.add(x));}};`,ctx);
const S=w.S,F=w.F,d=w.document;
const NAMES=['Accomodore','Callidus','Princeps','Vevaios'];
S.houses=NAMES.map((n,i)=>({name:n,color:['#DEDEDE','#6B7B8D','#4B9CD3','#2C2C2C'][i],logoUrl:null}));
S.schoolName='Ellis'; F.finishEnter();
const realST=w.setTimeout; w.setTimeout=(fn,ms)=>realST(fn,Math.min(ms||0,5));
async function spin(n){F.showInputs();d.getElementById('personName').value=n;await F.startSort();F.acceptSpin();}
const glyph=()=>{
  const svg=d.getElementById('queueGlyph').querySelector('svg');
  if(!svg) return 'none';
  const c=svg.querySelectorAll('circle'), l=svg.querySelectorAll('line'), p=svg.querySelector('polygon');
  if(c.length===2) return 'infinity';
  if(l.length===1) return 'bar(2)';
  if(p) return `polygon(${p.getAttribute('points').trim().split(/\s+/).length})${svg.querySelectorAll('circle').length?'+dot':''}`;
  if(c.length===1) return 'dot(1)';
  return '?';
};

(async()=>{
  console.log("=== Glyph shapes ===");
  for(const n of [0,1,2,3,4,5,6,8,12]){
    const svg=F.queueGlyphSVG(n);
    const m=/points="([^"]+)"/.exec(svg);
    const sides=m?m[1].trim().split(/\s+/).length:null;
    let kind = n===0?'infinity (two rings)': n===1?'filled dot': n===2?'vertical bar': `${sides}-gon`+(svg.includes('r="1.5"')?' + centre dot':'');
    console.log(`  n=${String(n).padStart(2)} -> ${kind}`);
  }

  console.log("\n=== Glyph through a real 3-person run ===");
  F.clearQueue(); S.results=[];
  console.log("  no queue yet      ->", glyph());
  F.setPool([1,2]); F.addPool(); F.setExc([3]); F.addFree();
  console.log("  queue of 3 built  ->", glyph(), "(person 1 up next)");
  await spin('P1'); console.log("  after P1          ->", glyph(), "(person 2 up next)");
  await spin('P2'); console.log("  after P2          ->", glyph(), "(person 3 up next)");
  await spin('P3'); console.log("  after P3, queue done ->", glyph());
  F.closeSummary();
  console.log("  back on ready     ->", glyph());

  console.log("\n=== Hold the queue: surprise arrival mid-run ===");
  F.clearQueue(); S.results=[];
  F.setPool([1,2]); F.addPool();          // Callidus + Princeps, 2 spins
  console.log("  queue built       ->", glyph());
  await spin('Real 1');
  console.log("  after Real 1      ->", glyph());
  F.toggleQueuePause();
  console.log("  queue held        ->", glyph(), "<- reads infinity, honestly");
  const poolBefore=S.pools[Object.keys(S.pools)[0]].length;
  const cursorBefore=S.cursor;
  await spin('Surprise');
  console.log("  after surprise    ->", glyph());
  const poolAfter=S.pools[Object.keys(S.pools)[0]].length;
  console.log(`  pool untouched: ${poolBefore} -> ${poolAfter} ${poolBefore===poolAfter?'PASS':'*** FAIL'}`);
  console.log(`  cursor untouched: ${cursorBefore} -> ${S.cursor} ${cursorBefore===S.cursor?'PASS':'*** FAIL'}`);
  console.log("  hold is sticky until clicked again:", S.queuePaused===true?'PASS':'*** FAIL');
  F.toggleQueuePause();
  await spin('Real 2');
  const run=[...d.querySelectorAll('#summaryList .summary-row')].map(r=>r.querySelector('.summary-person').textContent+' -> '+r.querySelector('.summary-house').textContent);
  console.log("  summary:", run.join(' | '));
  const queuedHouses=run.filter(x=>x.startsWith('Real ')).map(x=>x.split(' -> ')[1]).sort().join(',');
  console.log("  reserved pair still honoured (queued people only):", queuedHouses==='Callidus,Princeps'?'PASS':'*** FAIL '+queuedHouses);
  console.log("  surprise INCLUDED in celebration:", run.some(x=>x.startsWith('Surprise'))?'PASS':'*** FAIL');

  console.log("\n=== Finish the run now (only 2 of 3 turned up) ===");
  F.closeSummary(); F.clearQueue(); S.results=[];
  F.setPool([1,2]); F.addPool(); F.setExc([3]); F.addFree();
  await spin('A'); await spin('B');
  console.log("  glyph mid-run     ->", glyph(), "| cursor", S.cursor, "of", S.steps.length);
  F.finishRunNow();
  console.log("  summary shown:", d.getElementById('summaryState').classList.contains('visible')?'yes PASS':'*** no');
  console.log("  rows:", [...d.querySelectorAll('#summaryList .summary-row')].length);
  console.log("  glyph after       ->", glyph(), "<- back to even");
  F.closeSummary();
  const t={0:0,1:0,2:0,3:0};
  for(let i=0;i<20000;i++) t[F.resolveStep(S.steps[S.cursor]||null)]++;
  console.log("  spread:", NAMES.map((n,i)=>`${(t[i]/200).toFixed(0)}%`).join('/'));
})();
