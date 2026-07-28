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
;globalThis.S=state;globalThis.F={startSort,acceptSpin,showInputs,finishEnter,closeSummary,
toggleQueuePause,runActive,runExhausted,queueGlyphSVG,renderQueue};`,ctx);
const S=w.S,F=w.F,d=w.document;
S.houses=['Accomodore','Callidus','Princeps','Vevaios'].map((n,i)=>({name:n,color:['#DEDEDE','#6B7B8D','#4B9CD3','#2C2C2C'][i],logoUrl:null}));
S.schoolName='Ellis'; F.finishEnter();
const realST=w.setTimeout; w.setTimeout=(fn,ms)=>realST(fn,Math.min(ms||0,5));
async function reveal(n){F.showInputs();d.getElementById('personName').value=n;await F.startSort();}
async function spin(n){await reveal(n);F.acceptSpin();}
const glyph=()=>{const svg=d.getElementById('queueGlyph').querySelector('svg');if(!svg)return'-';
  const c=svg.querySelectorAll('circle'),l=svg.querySelectorAll('line'),p=svg.querySelector('polygon');
  if(l.length===2)return'✗'; if(c.length===2)return'∞'; if(l.length===1)return'▍';
  if(p)return p.getAttribute('points').trim().split(/\s+/).length+'-gon';
  if(c.length===1)return'●'; return'?';};
const up=()=>d.getElementById('summaryState').classList.contains('visible');
const rows=()=>[...d.querySelectorAll('#summaryList .summary-row')].map(r=>r.querySelector('.summary-person').textContent);

(async()=>{
  console.log("=== Glyph shapes ===");
  [-1,0,1,2,3,4].forEach(n=>{
    const s=F.queueGlyphSVG(n);
    const lines=(s.match(/<line/g)||[]).length, circles=(s.match(/<circle/g)||[]).length;
    const poly=/points="([^"]+)"/.exec(s);
    const kind = lines===2?'X (two strokes)': circles===2?'infinity': lines===1?'bar':
                 circles===1&&!poly?'filled dot': poly?poly[1].trim().split(/\s+/).length+'-gon':'?';
    console.log(`  n=${String(n).padStart(2)} -> ${kind}`);
  });

  console.log("\n=== Jake's a,1,b,2,c,3,4,5 run ===");
  S.runId++; const id='p1'; S.pools[id]=[1,2];
  S.steps.push({kind:'pool',poolId:id},{kind:'pool',poolId:id},{kind:'free',excluded:[3]});
  S.results=[]; F.renderQueue();
  console.log("  queue of 3 built     ", glyph());
  await spin('a');                        console.log("  a done               ", glyph());
  F.toggleQueuePause(); await spin('1');  console.log("  1 done (held)        ", glyph());
  F.toggleQueuePause();                   console.log("  resumed              ", glyph());
  await spin('b');                        console.log("  b done               ", glyph());
  F.toggleQueuePause(); await spin('2');  console.log("  2 done (held)        ", glyph());
  F.toggleQueuePause();                   console.log("  resumed              ", glyph());
  await reveal('c'); F.toggleQueuePause(); F.acceptSpin();
  console.log("  c done, queue spent  ", glyph(), "<- was infinity before, now distinguishable");
  console.log("  summary held back:", up()?'*** fired':'yes  PASS');
  await spin('3'); console.log("  3 done               ", glyph());
  await spin('4'); console.log("  4 done               ", glyph());
  await spin('5'); console.log("  5 done               ", glyph());
  console.log("  summary still held:", up()?'*** fired':'yes  PASS');
  F.toggleQueuePause();
  console.log("  tapped X -> summary:", up()?'SHOWN  PASS':'*** not shown');
  console.log("  celebration:", rows().join(', '));
  const want=['a','1','b','2','c','3','4','5'];
  console.log("  all eight present:", want.every(x=>rows().includes(x))?'PASS':'*** missing '+want.filter(x=>!rows().includes(x)));

  console.log("\n=== X does not fire while a spin awaits Confirm ===");
  F.closeSummary(); S.steps=[];S.pools={};S.cursor=0;S.queuePaused=false;S.results=[];S.runId++;
  const id2='p2'; S.pools[id2]=[1]; S.steps.push({kind:'pool',poolId:id2}); F.renderQueue();
  await reveal('solo'); F.toggleQueuePause(); F.acceptSpin();
  console.log("  spent, held          ", glyph());
  await reveal('extra');
  console.log("  extra pending        ", glyph());
  F.toggleQueuePause();
  console.log("  tapped X with pending -> summary:", up()?'*** fired, extra lost':'held  PASS');
  console.log("  extra still pending:", S.pending&&S.pending.name==='extra'?'PASS':'*** LOST');
  F.acceptSpin();
  console.log("  confirmed -> summary:", up()?'SHOWN  PASS':'*** no');
  console.log("  one tap was enough (no second tap needed):", up()?'PASS':'*** FAIL');
  console.log("  celebration:", rows().join(', '));
})();
