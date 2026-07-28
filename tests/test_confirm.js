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
toggleQueuePause,renderQueue,endsOnNextConfirm};`,ctx);
const S=w.S,F=w.F,d=w.document;
S.houses=['Accomodore','Callidus','Princeps','Vevaios'].map((n,i)=>({name:n,color:['#DEDEDE','#6B7B8D','#4B9CD3','#2C2C2C'][i],logoUrl:null}));
S.schoolName='Ellis'; F.finishEnter();
const realST=w.setTimeout; w.setTimeout=(fn,ms)=>realST(fn,Math.min(ms||0,5));
async function reveal(n){F.showInputs();d.getElementById('personName').value=n;await F.startSort();}
async function spin(n){await reveal(n);F.acceptSpin();}
function g(){const svg=d.getElementById('queueGlyph').querySelector('svg');if(!svg)return'-';
  const L=(svg.innerHTML.match(/<line/g)||[]).length,C=(svg.innerHTML.match(/<circle/g)||[]).length;
  const p=svg.querySelector('polygon');
  if(L===2)return'✗'; if(C===2)return'∞'; if(L===1)return'▍';
  if(p)return p.getAttribute('points').trim().split(/\s+/).length+'-gon';
  if(C===1)return'●'; return'?';}
const up=()=>d.getElementById('summaryState').classList.contains('visible');
const rows=()=>[...d.querySelectorAll('#summaryList .summary-row')].map(r=>r.querySelector('.summary-person').textContent);
function queue3(){S.steps=[];S.pools={};S.cursor=0;S.queuePaused=false;S.endOverride=null;
  const id='q'+Math.random(); S.pools[id]=[1,2];
  S.steps.push({kind:'pool',poolId:id},{kind:'pool',poolId:id},{kind:'free',excluded:[3]});
  F.renderQueue();}

(async()=>{
  console.log("=== Uninterrupted queue of 3 — Jake's stated sequence ===");
  S.results=[]; queue3();
  console.log("  ready            ", g(), "(expect ●)");
  await reveal('A');  console.log("  A revealed       ", g(), "(expect ▍)");
  F.acceptSpin();     console.log("  confirmed        ", g(), "(expect ▍)");
  await reveal('B');  console.log("  B revealed       ", g(), "(expect 3-gon)");
  F.acceptSpin();     console.log("  confirmed        ", g(), "(expect 3-gon)");
  await reveal('C');  console.log("  C revealed       ", g(), "(expect ✗)");
  F.acceptSpin();     console.log("  confirmed        -> celebration:", up()?'SHOWN  PASS':'*** not shown');
  console.log("  no X spam, no tap needed:", rows().join(', '));

  console.log("\n=== Hold for a walk-up mid-queue ===");
  F.closeSummary(); S.results=[]; queue3();
  await spin('A');       console.log("  after A          ", g());
  F.toggleQueuePause();  console.log("  tapped -> held   ", g(), "(expect ∞)");
  await spin('D');       console.log("  D done           ", g(), "(expect ∞)");
  F.toggleQueuePause();  console.log("  tapped -> resumed", g(), "(expect ▍)");
  await spin('B');
  await reveal('C');     console.log("  C revealed       ", g(), "(expect ✗)");
  F.acceptSpin();
  console.log("  celebration:", rows().join(', '), up()?'PASS':'*** not shown');

  console.log("\n=== X means 'not yet': extend past the last queued person ===");
  F.closeSummary(); S.results=[]; queue3();
  await spin('A'); await spin('B');
  await reveal('C');     console.log("  C revealed       ", g(), "(expect ✗)");
  F.toggleQueuePause();  console.log("  tapped X         ", g(), "(expect ∞ — not yet)");
  F.acceptSpin();        console.log("  confirmed C      ", g(), "| celebrated:", up()?'*** yes, too early':'no  PASS');
  await spin('D');       console.log("  D done           ", g(), "(expect ∞)");
  await reveal('E');     console.log("  E revealed       ", g(), "(expect ∞)");
  F.toggleQueuePause();  console.log("  tapped -> arm    ", g(), "(expect ✗)");
  F.acceptSpin();        console.log("  confirmed E      -> celebration:", up()?'SHOWN  PASS':'*** no');
  console.log("  celebration:", rows().join(', '));
  console.log("  all five:", ['A','B','C','D','E'].every(x=>rows().includes(x))?'PASS':'*** missing');

  console.log("\n=== No queue at all: gather walk-ups and celebrate them ===");
  F.closeSummary(); S.results=[]; S.steps=[];S.pools={};S.cursor=0;S.queuePaused=false;S.endOverride=null;
  F.renderQueue();
  console.log("  no queue         ", g(), "(expect ∞)");
  await spin('w1'); await spin('w2'); await spin('w3');
  console.log("  3 walk-ups done  ", g(), "| celebrated:", up()?'*** prematurely':'no  PASS');
  F.toggleQueuePause();
  console.log("  tapped with nothing pending -> celebration:", up()?'SHOWN  PASS':'*** no');
  console.log("  celebration:", rows().join(', '));

  console.log("\n=== Arming mid-reveal in infinity mode keeps that person ===");
  F.closeSummary(); S.results=[];
  await spin('x1');
  await reveal('x2');   console.log("  x2 revealed      ", g());
  F.toggleQueuePause(); console.log("  tapped -> arm    ", g(), "(expect ✗)");
  F.acceptSpin();
  console.log("  celebration:", rows().join(', '), up()?'PASS':'*** no');
  console.log("  x2 included:", rows().includes('x2')?'PASS':'*** LOST');

  console.log("\n=== Groups are independent ===");
  F.closeSummary();
  await spin('next1'); F.toggleQueuePause();
  console.log("  new group only:", rows().join(', '), rows().length===1?'PASS':'*** leaked '+rows().length);

  console.log("\n=== Layout scales with headcount ===");
  F.closeSummary(); S.results=[];
  for(let i=1;i<=16;i++) await spin('p'+i);
  F.toggleQueuePause();
  const list=d.getElementById('summaryList');
  console.log("  16 people -> rows", rows().length,
              "| two-col:", list.classList.contains('two-col')?'yes PASS':'*** no',
              "| compact:", list.classList.contains('compact')?'yes PASS':'*** no');
})();
