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
;globalThis.S=state;globalThis.F={startSort,acceptSpin,addPool,addFree,clearQueue,showInputs,
finishEnter,closeSummary,toggleQueuePause,runActive,runExhausted};`,ctx);
const S=w.S,F=w.F,d=w.document;
S.houses=['Accomodore','Callidus','Princeps','Vevaios'].map((n,i)=>({name:n,color:['#DEDEDE','#6B7B8D','#4B9CD3','#2C2C2C'][i],logoUrl:null}));
S.schoolName='Ellis'; F.finishEnter();
const realST=w.setTimeout; w.setTimeout=(fn,ms)=>realST(fn,Math.min(ms||0,5));
async function reveal(n){F.showInputs();d.getElementById('personName').value=n;await F.startSort();}
async function spin(n){await reveal(n);F.acceptSpin();}
const rows=()=>[...d.querySelectorAll('#summaryList .summary-row')].map(r=>r.querySelector('.summary-person').textContent);
const up=()=>d.getElementById('summaryState').classList.contains('visible');

(async()=>{
  console.log("=== Jake's live sequence: A,pause,D,resume,B,pause,E,resume,C,pause,F,resume ===");
  F.clearQueue(); S.results=[];
  F.setPoolDirect=null;
  // queue of three
  const mk=(a)=>{const id='p'+Math.random();S.pools[id]=a.slice();a.forEach(()=>S.steps.push({kind:'pool',poolId:id}));};
  S.runId++; mk([1,2]); S.steps.push({kind:'free',excluded:[3]});
  console.log("  queue:", S.steps.length, "steps");

  await spin('A');                       console.log("  A confirmed        cursor",S.cursor,"summary",up());
  F.toggleQueuePause(); await spin('D'); console.log("  D confirmed (held) cursor",S.cursor,"summary",up());
  F.toggleQueuePause();                  console.log("  resumed            cursor",S.cursor,"summary",up());
  await spin('B');                       console.log("  B confirmed        cursor",S.cursor,"summary",up());
  F.toggleQueuePause(); await spin('E'); console.log("  E confirmed (held) cursor",S.cursor,"summary",up());
  F.toggleQueuePause();                  console.log("  resumed            cursor",S.cursor,"summary",up());
  await reveal('C');
  F.toggleQueuePause();                  console.log("  held during C's reveal");
  F.acceptSpin();                        console.log("  C confirmed        cursor",S.cursor,"summary",up(),"(held back)");
  await reveal('F');                     console.log("  F revealed, pending:", S.pending? S.pending.name : 'none');
  F.toggleQueuePause();                  // <-- this is the tap that used to eat F
  console.log("  resumed with F pending -> summary:", up()?'*** FIRED EARLY (F lost)':'held  PASS');
  console.log("  F still pending:", S.pending && S.pending.name==='F' ? 'PASS' : '*** LOST');
  F.acceptSpin();
  console.log("  F confirmed        summary:", up()?'SHOWN  PASS':'*** not shown');
  console.log("  celebration:", rows().join(', '));
  const ok = ['A','D','B','E','C','F'].every(n=>rows().includes(n));
  console.log("  all six present:", ok?'PASS':'*** FAIL — missing '+['A','D','B','E','C','F'].filter(n=>!rows().includes(n)).join(','));
  console.log("  nobody duplicated:", rows().length===6?'PASS':'*** FAIL len='+rows().length);

  console.log("\n=== Resuming with nothing pending still closes out immediately ===");
  F.closeSummary(); F.clearQueue(); S.results=[]; S.runId++;
  const id='q1'; S.pools[id]=[1,2]; S.steps.push({kind:'pool',poolId:id},{kind:'pool',poolId:id});
  await spin('X1'); 
  F.toggleQueuePause();
  await spin('X2');   // held, so cursor stays at 1... 
  console.log("  cursor",S.cursor,"of",S.steps.length,"| paused",S.queuePaused);
  F.toggleQueuePause();
  console.log("  resumed (nothing pending) -> summary:", up()?'shown':'not shown', "| exhausted:", F.runExhausted());
})();
