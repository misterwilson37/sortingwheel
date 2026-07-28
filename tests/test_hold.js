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
showInputs,finishEnter,closeSummary,resolveStep,toggleQueuePause,finishRunNow,runActive,runExhausted,
setPool:(a)=>{poolPicks.clear();a.forEach(x=>poolPicks.add(x));},
setExc:(a)=>{excludePicks.clear();a.forEach(x=>excludePicks.add(x));}};`,ctx);
const S=w.S,F=w.F,d=w.document;
const NAMES=['Accomodore','Callidus','Princeps','Vevaios'];
S.houses=NAMES.map((n,i)=>({name:n,color:['#DEDEDE','#6B7B8D','#4B9CD3','#2C2C2C'][i],logoUrl:null}));
S.schoolName='Ellis'; F.finishEnter();
const realST=w.setTimeout; w.setTimeout=(fn,ms)=>realST(fn,Math.min(ms||0,5));
async function spinOnly(n){F.showInputs();d.getElementById('personName').value=n;await F.startSort();}
async function spin(n){await spinOnly(n);F.acceptSpin();}
const glyph=()=>{const svg=d.getElementById('queueGlyph').querySelector('svg');if(!svg)return'-';
  const c=svg.querySelectorAll('circle'),l=svg.querySelectorAll('line'),p=svg.querySelector('polygon');
  if(c.length===2)return'∞'; if(l.length===1)return'▍(2)';
  if(p)return`${p.getAttribute('points').trim().split(/\s+/).length}-gon`;
  if(c.length===1)return'●(1)'; return'?';};
const summaryUp=()=>d.getElementById('summaryState').classList.contains('visible');
const rows=()=>[...d.querySelectorAll('#summaryList .summary-row')].map(r=>
  r.querySelector('.summary-person').textContent+'→'+r.querySelector('.summary-house').textContent);

(async()=>{
  console.log("=== Button label matches index.html ===");
  console.log("  ", JSON.stringify(d.getElementById('approveBtn').textContent.trim()));

  console.log("\n=== SCENARIO A: A goes, D crashes the line, then B and C ===");
  F.clearQueue(); S.results=[];
  F.setPool([1,2]); F.addPool(); F.setExc([3]); F.addFree();   // Cal+Pri set, then not-Vevaios
  console.log("  queue built            glyph", glyph());
  await spin('A');
  console.log("  A done                 glyph", glyph());
  F.toggleQueuePause();
  console.log("  clicked glyph (hold)   glyph", glyph(), "| cursor held at", S.cursor);
  await spin('D');
  console.log("  D done (walk-up)       glyph", glyph(), "| cursor still", S.cursor, S.cursor===1?'PASS':'*** FAIL');
  F.toggleQueuePause();
  console.log("  clicked glyph (resume) glyph", glyph());
  await spin('B');
  console.log("  B done                 glyph", glyph());
  await spin('C');
  console.log("  C done                 glyph", glyph(), "| summary:", summaryUp()?'SHOWN':'*** not shown');
  console.log("  celebration:", rows().join('  '));
  const setHouses=rows().filter(r=>/^(A|B)→/.test(r)).map(r=>r.split('→')[1]).sort().join(',');
  console.log("  A+B still hold the reserved pair:", setHouses==='Callidus,Princeps'?'PASS':'*** FAIL '+setHouses);
  console.log("  D included in the celebration:", rows().some(r=>r.startsWith('D→'))?'PASS':'*** FAIL');
  console.log("  C not Vevaios:", !rows().some(r=>r==='C→Vevaios')?'PASS':'*** FAIL');

  console.log("\n=== SCENARIO B: hold mid-reveal so D joins the final tally ===");
  F.closeSummary(); F.clearQueue(); S.results=[];
  F.setPool([1,2]); F.addPool();
  await spin('A2'); 
  await spinOnly('B2');                       // B2's result is on screen, not confirmed
  console.log("  B2 revealed, pre-Confirm  glyph", glyph(), "| phase", S.ceremonyPhase);
  F.toggleQueuePause();                        // hold BEFORE confirming the last one
  console.log("  held mid-reveal           glyph", glyph());
  F.acceptSpin();
  console.log("  confirmed B2              summary:", summaryUp()?'*** fired early':'held back  PASS');
  await spin('D2');
  console.log("  D2 done                   summary:", summaryUp()?'*** fired early':'still held  PASS');
  F.toggleQueuePause();
  console.log("  resumed -> closes run     summary:", summaryUp()?'SHOWN  PASS':'*** not shown');
  console.log("  celebration:", rows().join('  '));
  console.log("  all four present:", rows().length===3?'3 people PASS':'rows='+rows().length);

  console.log("\n=== Walk-ups with NO run open are still excluded ===");
  F.closeSummary(); F.clearQueue(); S.results=[];
  await spin('Nobody1'); await spin('Nobody2');
  console.log("  summary shown:", summaryUp()?'*** YES':'no  PASS', "| glyph", glyph());
  console.log("  glyph click with no run is a no-op:", (F.toggleQueuePause(), S.queuePaused===false)?'PASS':'*** FAIL');

  console.log("\n=== Everyone since the last celebration is one group ===");
  F.clearQueue(); S.results=[];
  await spin('Early');
  F.setPool([1,2]); F.addPool();
  await spin('R1');
  F.toggleQueuePause(); await spin('MidWalkup'); F.toggleQueuePause();
  await spin('R2');
  console.log("  celebration:", rows().join('  '));
  console.log("  includes earlier walk-up 'Early':", rows().some(r=>r.startsWith('Early'))?'PASS':'*** FAIL');
  console.log("  includes in-run 'MidWalkup':", rows().some(r=>r.startsWith('MidWalkup'))?'PASS':'*** FAIL');
})();
